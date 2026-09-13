"""Patient accounts — passwordless OTP login (Общност Phase 1).

Zubite has no patient password store: a patient proves ownership of an email
by entering a 6-digit code we mail them, and we mint a cookie session that
rides the same E5 `auth_sessions` governance as admin/clinic.

Public:
    POST /api/patient/auth/request-otp   → email a 6-digit code
    POST /api/patient/auth/verify-otp    → exchange code for a session

Patient (auth=patient):
    POST /api/patient/auth/logout        → revoke current session
    GET  /api/patient/me                 → current profile
    PATCH /api/patient/me                → update display_name / city_slug

Design notes:
- Codes are stored as SHA-256 hashes only (never plaintext), 5-minute TTL,
  single-use, with an attempts cap to stop online guessing.
- request-otp is rate-limited per IP; verify-otp is rate-limited per IP.
- Enumeration-safe: request-otp returns the same {status:"sent"} whether or
  not the email already has an account (account is created lazily on first
  successful verify).
- No password is ever stored for patients.
"""
from __future__ import annotations

import hashlib
import os
import re
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from auth import (
    create_patient_token,
    get_current_patient,
    revoke_session_by_jti,
    hash_password,
    verify_password,
    _decode_jwt,
)
from audit import audit_log
from config import (
    AUTH_COOKIE_NAME_PATIENT, AUTH_COOKIE_SECURE, AUTH_COOKIE_SAMESITE,
    AUTH_COOKIE_MAX_AGE_SECONDS_PATIENT,
)
from database import db
from emails import send_patient_otp_email
from rate_limit import rate_limit
from schemas import (
    PatientOtpRequest, PatientOtpVerify, PatientProfileUpdate,
    PatientPasswordLogin, PatientPasswordSet,
    PatientOut, PatientTokenResponse,
)

router = APIRouter()

# ─── OTP config ───────────────────────────────────────────────────

_OTP_TTL_SECONDS = 300          # 5 minutes
_OTP_MAX_ATTEMPTS = 5           # wrong guesses before the code is burned


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _hash_code(email: str, code: str) -> str:
    """Bind the hash to the email so a leaked hash can't be replayed for
    another address. Not a password — a short-lived single-use token."""
    return hashlib.sha256(f"{email.lower()}:{code}".encode()).hexdigest()


def _patient_out(doc: dict) -> PatientOut:
    return PatientOut(
        id=doc["id"],
        email=doc["email"],
        email_verified=bool(doc.get("email_verified", True)),
        display_name=doc.get("display_name"),
        city_slug=doc.get("city_slug"),
        reputation=int(doc.get("reputation", 0)),
        created_at=doc.get("created_at"),
        has_password=bool(doc.get("password_hash")),
    )


# ─── Step 1: request a code ───────────────────────────────────────

@router.post(
    "/patient/auth/request-otp",
    dependencies=[Depends(rate_limit("patient_otp_request", max_calls=5, window_seconds=300))],
)
async def patient_request_otp(data: PatientOtpRequest, request: Request):
    email = data.email.strip().lower()
    code = f"{secrets.randbelow(1_000_000):06d}"
    now = _now_utc()

    # One live code per email: supersede any prior unconsumed code.
    await db.patient_otps.delete_many({"email": email, "consumed": False})
    await db.patient_otps.insert_one({
        "id": str(uuid.uuid4()),
        "email": email,
        "code_hash": _hash_code(email, code),
        "attempts": 0,
        "consumed": False,
        "created_at": now.isoformat(),
        "expires_at": now + timedelta(seconds=_OTP_TTL_SECONDS),
    })

    await send_patient_otp_email(email, code)
    # Enumeration-safe: identical response regardless of account existence.
    return {"status": "sent"}


# ─── Step 2: verify and open a session ────────────────────────────

@router.post(
    "/patient/auth/verify-otp",
    response_model=PatientTokenResponse,
    response_model_exclude_none=True,
    dependencies=[Depends(rate_limit("patient_otp_verify", max_calls=10, window_seconds=300))],
)
async def patient_verify_otp(data: PatientOtpVerify, request: Request, response: Response):
    email = data.email.strip().lower()
    now = _now_utc()

    otp = await db.patient_otps.find_one({"email": email, "consumed": False})
    if not otp:
        raise HTTPException(status_code=400, detail="Невалиден или изтекъл код")

    # TTL check (expires_at is stored as a real datetime by insert_one).
    exp = otp.get("expires_at")
    if isinstance(exp, str):
        try:
            exp = datetime.fromisoformat(exp)
        except Exception:
            exp = None
    if exp is not None and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp is None or exp < now:
        await db.patient_otps.delete_one({"id": otp["id"]})
        raise HTTPException(status_code=400, detail="Невалиден или изтекъл код")

    if otp.get("attempts", 0) >= _OTP_MAX_ATTEMPTS:
        await db.patient_otps.delete_one({"id": otp["id"]})
        raise HTTPException(status_code=429, detail="Твърде много опити. Поискайте нов код.")

    if not secrets.compare_digest(otp["code_hash"], _hash_code(email, data.code)):
        await db.patient_otps.update_one({"id": otp["id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Невалиден или изтекъл код")

    # Correct code — burn it (single use).
    await db.patient_otps.update_one({"id": otp["id"]}, {"$set": {"consumed": True}})

    # Lazily create the patient account on first successful verify.
    patient = await db.patients.find_one({"email": email}, {"_id": 0})
    if not patient:
        patient = {
            "id": str(uuid.uuid4()),
            "email": email,
            "email_verified": True,
            "display_name": None,
            "city_slug": None,
            "reputation": 0,
            "status": "active",
            "created_at": now.isoformat(),
        }
        await db.patients.insert_one(dict(patient))
        await audit_log(
            "patient.registered",
            actor_type="patient",
            target_type="patient",
            target_id=patient["id"],
            severity="info",
            request=request,
        )
    else:
        await db.patients.update_one(
            {"id": patient["id"]},
            {"$set": {"email_verified": True, "last_login_at": now.isoformat()}},
        )

    # ── Persistent lead access: link this patient to their past quiz
    # results (see PRODUCT_QA_PLAN.md-adjacent "persistent patient access"
    # feature) ──
    #
    # 1. Retroactive: any lead whose `email` matches this account and isn't
    #    already claimed by someone else. Lead.email is not lowercased at
    #    write time (unlike patients.email), so match case-insensitively.
    #    The `patient_id: None` filter means this can never steal a lead
    #    already claimed by a different account.
    await db.leads.update_many(
        {
            "email": {"$regex": f"^{re.escape(email)}$", "$options": "i"},
            "patient_id": None,
        },
        {"$set": {"patient_id": patient["id"]}},
    )
    # Same retroactive-link pattern, extended to the two patient-initiated
    # booking collections. Field is `patient_email` there, not `email`.
    # The `patient_id: None` guard is load-bearing here too — never
    # overwrite a booking already linked to a different account.
    await db.clinic_bookings.update_many(
        {
            "patient_email": {"$regex": f"^{re.escape(email)}$", "$options": "i"},
            "patient_id": None,
        },
        {"$set": {"patient_id": patient["id"]}},
    )
    await db.online_orientation_bookings.update_many(
        {
            "patient_email": {"$regex": f"^{re.escape(email)}$", "$options": "i"},
            "patient_id": None,
        },
        {"$set": {"patient_id": patient["id"]}},
    )

    # 2. Explicit: a specific lead the frontend asked to claim (e.g. the
    # /results/[leadId] save banner) — covers leads with no email yet
    # (pre-contact-capture). Never raises on a conflict; login must always
    # succeed even if this particular claim couldn't be applied.
    claim_result: Optional[str] = None
    if data.claim_lead_id:
        target = await db.leads.find_one(
            {"id": data.claim_lead_id}, {"_id": 0, "id": 1, "patient_id": 1},
        )
        if not target:
            claim_result = "lead_not_found"
        elif target.get("patient_id") == patient["id"]:
            claim_result = "already_mine"
        elif target.get("patient_id") is None:
            await db.leads.update_one(
                {"id": data.claim_lead_id}, {"$set": {"patient_id": patient["id"]}},
            )
            claim_result = "claimed"
        else:
            claim_result = "already_claimed_by_other"

    token, _jti = await create_patient_token(patient["id"], email)
    response.set_cookie(
        key=AUTH_COOKIE_NAME_PATIENT,
        value=token,
        max_age=AUTH_COOKIE_MAX_AGE_SECONDS_PATIENT,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        path="/",
    )

    cookie_required = os.environ.get('AUTH_REQUIRE_COOKIE', '0') == '1'
    if cookie_required:
        return PatientTokenResponse(user=_patient_out(patient), claim_result=claim_result)
    return PatientTokenResponse(
        access_token=token, token_type="bearer", user=_patient_out(patient), claim_result=claim_result,
    )


# ─── Password login (additive — OTP remains the permanent fallback) ──

@router.post(
    "/patient/auth/login",
    response_model=PatientTokenResponse,
    response_model_exclude_none=True,
    dependencies=[Depends(rate_limit("patient_password_login", max_calls=5, window_seconds=300))],
)
async def patient_password_login(data: PatientPasswordLogin, request: Request, response: Response):
    email = data.email.strip().lower()
    patient = await db.patients.find_one({"email": email}, {"_id": 0})
    if not patient or not patient.get("password_hash"):
        raise HTTPException(status_code=401, detail="Невалиден имейл или парола")
    if not verify_password(data.password, patient["password_hash"]):
        raise HTTPException(status_code=401, detail="Невалиден имейл или парола")
    if patient.get("status") == "banned":
        raise HTTPException(status_code=403, detail="Акаунтът е спрян")

    token, _jti = await create_patient_token(patient["id"], email)
    response.set_cookie(
        key=AUTH_COOKIE_NAME_PATIENT,
        value=token,
        max_age=AUTH_COOKIE_MAX_AGE_SECONDS_PATIENT,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        path="/",
    )
    cookie_required = os.environ.get('AUTH_REQUIRE_COOKIE', '0') == '1'
    if cookie_required:
        return PatientTokenResponse(user=_patient_out(patient))
    return PatientTokenResponse(access_token=token, token_type="bearer", user=_patient_out(patient))


# ─── Session teardown ─────────────────────────────────────────────

@router.post("/patient/auth/logout")
async def patient_logout(request: Request, response: Response):
    """Idempotent patient logout — revoke the session jti + clear the cookie."""
    revoked = False
    try:
        token = None
        auth_h = request.headers.get("authorization") or ""
        if auth_h.lower().startswith("bearer "):
            token = auth_h[7:].strip()
        if not token:
            token = request.cookies.get(AUTH_COOKIE_NAME_PATIENT)
        if token:
            payload = _decode_jwt(token)
            jti = payload.get("jti")
            if jti and payload.get("role") == "patient":
                revoked = await revoke_session_by_jti(jti, reason="patient_logout")
    except HTTPException:
        pass
    response.delete_cookie(
        key=AUTH_COOKIE_NAME_PATIENT,
        path="/",
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        httponly=True,
    )
    return {"status": "ok", "revoked": bool(revoked)}


# ─── Profile ──────────────────────────────────────────────────────

@router.get("/patient/me", response_model=PatientOut)
async def patient_me(patient=Depends(get_current_patient)):
    return _patient_out(patient)


@router.patch("/patient/me", response_model=PatientOut)
async def patient_update_me(
    data: PatientProfileUpdate,
    request: Request,
    patient=Depends(get_current_patient),
):
    updates: dict = {}
    if data.display_name is not None:
        updates["display_name"] = data.display_name.strip()
    if data.city_slug is not None:
        updates["city_slug"] = data.city_slug.strip().lower() or None

    if updates:
        await db.patients.update_one({"id": patient["id"]}, {"$set": updates})
        patient = {**patient, **updates}

    return _patient_out(patient)


@router.patch("/patient/password", response_model=PatientOut)
async def patient_set_password(
    data: PatientPasswordSet,
    patient=Depends(get_current_patient),
):
    password_hash = hash_password(data.password)
    await db.patients.update_one({"id": patient["id"]}, {"$set": {"password_hash": password_hash}})
    return _patient_out({**patient, "password_hash": password_hash})
