from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime, timezone
import asyncio
import csv
import os
from decimal import Decimal, ROUND_HALF_UP
from io import StringIO

from database import db
from schemas import (
    AdminLogin, AdminUser, TokenResponse, LeadStatusUpdate, LeadUpdate,
    ConfirmationBody, CleanupLeadsBody, ClinicIntegration, LeadRevenue,
    RESET_ANALYTICS_TOKEN, RESET_BLOG_VIEWS_TOKEN, CLEANUP_LEADS_TOKEN,
    ClearAdvanceStatusMappings,
)
from auth import (
    verify_password, create_token, get_current_user,
    revoke_session_by_jti, revoke_all_sessions_for_user,
    cleanup_expired_auth_sessions, get_current_clinic,
)
from config import (
    IS_PRODUCTION, logger,
    AUTH_COOKIE_NAME_ADMIN, AUTH_COOKIE_SECURE, AUTH_COOKIE_SAMESITE,
    AUTH_COOKIE_MAX_AGE_SECONDS,
)
from rate_limit import rate_limit
from audit import audit_log, diff_fields
from clear_advance import (
    DEFAULT_STATUS_MAPPINGS, encrypt_api_key, import_pending_leads,
    process_pending_outcomes, report_pending_leads, report_revenue, report_status,
)


def _mask_username(value: str | None) -> str | None:
    """Mask submitted username for auth.admin_login_failed audit rows.
    Keeps first char and domain (if email-shaped) — enough to triage attempts
    without leaking enumerable identifiers. Total length capped at 60."""
    if not value or not isinstance(value, str):
        return None
    v = value.strip()[:60]
    if "@" in v:
        local, _, domain = v.partition("@")
        if local:
            local = local[0] + "***" if len(local) > 1 else local + "***"
        return f"{local}@{domain}"
    if len(v) <= 1:
        return v + "***"
    return v[0] + "***"

router = APIRouter()


@router.post(
    "/admin/login",
    response_model=TokenResponse,
    response_model_exclude_none=True,
    dependencies=[Depends(rate_limit("admin_login", 5, 300))],
)
async def admin_login(data: AdminLogin, request: Request, response: Response):
    user = await db.admin_users.find_one({"username": data.username}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        await audit_log(
            "auth.admin_login_failed",
            actor_type="public",
            target_type="system",
            target_id=None,
            target_summary=_mask_username(data.username),
            metadata={"reason_code": "invalid_credentials"},
            severity="warning",
            request=request,
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token, _jti = await create_token(user["id"], user["username"])
    admin_user = AdminUser(id=user["id"], username=user["username"])
    # Always set the httpOnly admin session cookie.
    response.set_cookie(
        key=AUTH_COOKIE_NAME_ADMIN,
        value=token,
        max_age=AUTH_COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        path="/",
    )
    await audit_log(
        "auth.admin_login_succeeded",
        actor=admin_user,
        actor_type="admin",
        target_type="system",
        target_id=None,
        severity="info",
        request=request,
    )
    # In cookie-only mode the access_token field is omitted from the body
    # (response_model_exclude_none drops the None values).
    cookie_required = os.environ.get('AUTH_REQUIRE_COOKIE', '0') == '1'
    if cookie_required:
        return TokenResponse(user=admin_user)
    return TokenResponse(access_token=token, token_type="bearer", user=admin_user)


@router.post("/admin/logout")
async def admin_logout(request: Request, response: Response):
    """Idempotent admin logout (E1 + E5).

    E5: extracts jti from the presented Bearer/cookie token (best-effort,
    no exception if the token is malformed) and revokes that single
    session row in `auth_sessions`. Cookie is always cleared.
    """
    had_cookie = bool(request.cookies.get(AUTH_COOKIE_NAME_ADMIN))
    # Best-effort jti extraction — never fail the logout.
    revoked_jti: Optional[str] = None
    try:
        from auth import _decode_jwt  # type: ignore
        token: Optional[str] = None
        auth_h = request.headers.get("authorization") or ""
        if auth_h.lower().startswith("bearer "):
            token = auth_h[7:].strip()
        if not token:
            token = request.cookies.get(AUTH_COOKIE_NAME_ADMIN)
        if token:
            payload = _decode_jwt(token)
            jti = payload.get("jti")
            if jti and payload.get("role") != "clinic":
                if await revoke_session_by_jti(jti, reason="admin_logout"):
                    revoked_jti = jti
    except HTTPException:
        # Expired/invalid token at logout time — still clear the cookie.
        pass
    response.delete_cookie(
        key=AUTH_COOKIE_NAME_ADMIN,
        path="/",
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        httponly=True,
    )
    if had_cookie or revoked_jti:
        await audit_log(
            "auth.admin_logout",
            actor_type="admin",
            target_type="system",
            target_id=None,
            metadata={"revoked": bool(revoked_jti)},
            severity="info",
            request=request,
        )
    return {"status": "ok", "revoked": bool(revoked_jti)}


@router.post("/admin/logout-all")
async def admin_logout_all(
    request: Request, response: Response,
    user: AdminUser = Depends(get_current_user),
):
    """Revoke EVERY active admin session for the current admin (E5)."""
    revoked = await revoke_all_sessions_for_user(user.id, "admin", reason="logout_all")
    response.delete_cookie(
        key=AUTH_COOKIE_NAME_ADMIN,
        path="/",
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        httponly=True,
    )
    await audit_log(
        "auth.admin_logout_all",
        actor=user, actor_type="admin",
        target_type="system", target_id=None,
        metadata={"revoked_count": revoked},
        severity="info", request=request,
    )
    return {"status": "ok", "revoked_count": revoked}


@router.post("/admin/auth-sessions/cleanup-expired")
async def admin_cleanup_expired_sessions(
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    """Mark expired auth sessions as revoked. Admin-only (E5)."""
    n = await cleanup_expired_auth_sessions()
    await audit_log(
        "auth.cleanup_expired_sessions",
        actor=user, actor_type="admin",
        target_type="system", target_id=None,
        metadata={"revoked_count": n},
        severity="info", request=request,
    )
    return {"status": "ok", "revoked_count": n}


@router.get("/admin/me")
async def admin_me(user: AdminUser = Depends(get_current_user)):
    return user


@router.get("/admin/leads")
async def admin_leads(
    city_slug: Optional[str] = None,
    treatment_type: Optional[str] = None,
    band: Optional[str] = None,
    status: Optional[str] = None,
    user: AdminUser = Depends(get_current_user)
):
    query = {}
    if city_slug: query["city_slug"] = city_slug
    if treatment_type: query["treatment_type"] = treatment_type
    if band: query["band"] = band
    if status: query["status"] = status

    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for lead in leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return leads


@router.get("/admin/leads/{lead_id}")
async def admin_lead(lead_id: str, user: AdminUser = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead


@router.post("/admin/clinics/{clinic_id}/clear-advance")
async def admin_connect_clear_advance(clinic_id: str, data: ClinicIntegration, request: Request,
                                      user: AdminUser = Depends(get_current_user)):
    """Connect one clinic to its own Clear Advance organisation.

    Zubite serves many clinics; a Clear Advance API key identifies exactly one.
    So the key belongs to the clinic, not to the deployment, and there is no
    environment-wide default -- a shared key would eventually report one clinic's
    patient into another clinic's ad account.

    The key is encrypted before it is stored and is never returned by any
    endpoint, including this one.
    """
    clinic = await db.clinics.find_one({"id": clinic_id}, {"_id": 0, "id": 1, "name": 1})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")

    encrypted = encrypt_api_key(data.api_key)
    if not encrypted:
        raise HTTPException(status_code=503,
                            detail="CLEAR_ADVANCE_KEY_SECRET is not configured")

    hint = f"...{data.api_key[-4:]}"
    now = datetime.now(timezone.utc).isoformat()
    await db.clinic_integrations.update_one(
        {"clinic_id": clinic_id, "provider": "clear_advance"},
        {"$set": {"clinic_id": clinic_id, "provider": "clear_advance",
                  "api_key": encrypted, "key_hint": hint, "updated_at": now},
         # Set once and never touched again -- this is the line the background
         # sweep draws between "leads this clinic had before us", which are not
         # ours to report, and everything after. Rotating the key must not move
         # it, or a rotation would silently re-scope the backlog.
         "$setOnInsert": {"connected_at": now}},
        upsert=True,
    )
    # Audit the connection, never the key. `key_hint` is the last four
    # characters only -- enough to tell two keys apart when someone asks which
    # one is installed, useless to anyone who obtains the audit log.
    await audit_log(
        "clinic.clear_advance_connected",
        actor=user,
        actor_type="admin",
        target_type="clinic",
        target_id=clinic_id,
        metadata={"key_hint": hint},
        severity="warning",
        request=request,
    )
    return {"ok": True, "clinic_id": clinic_id, "connected": True, "key_hint": hint}


@router.get("/admin/clinics/{clinic_id}/clear-advance")
async def admin_clear_advance_status(clinic_id: str,
                                     user: AdminUser = Depends(get_current_user)):
    """Whether a clinic is connected, and enough of the key to tell which one."""
    record = await db.clinic_integrations.find_one(
        {"clinic_id": clinic_id, "provider": "clear_advance"},
        {"_id": 0, "key_hint": 1, "updated_at": 1, "connected_at": 1,
         "clear_advance_last_sync_at": 1, "clear_advance_last_sync_kind": 1,
         "clear_advance_last_sync_ok": 1, "clear_advance_sync_failure_streak": 1,
         "status_mappings": 1, "clear_advance_import_cursor": 1})
    outbox = getattr(db, "clear_advance_outbox", None)
    pending = await outbox.count_documents(
        {"clinic_id": clinic_id, "status": {"$in": ["pending", "failed"]}}) if outbox else 0
    succeeded = await outbox.count_documents(
        {"clinic_id": clinic_id, "status": "succeeded"}) if outbox else 0
    return {"connected": bool(record), "pending_outbox": pending,
            "succeeded_outbox": succeeded,
            "status_mappings": {**DEFAULT_STATUS_MAPPINGS,
                                 **((record or {}).get("status_mappings") or {})},
            **(record or {})}


async def _clinic_clear_advance_status(clinic: dict) -> dict:
    record = await db.clinic_integrations.find_one(
        {"clinic_id": clinic["id"], "provider": "clear_advance"},
        {"_id": 0, "key_hint": 1, "updated_at": 1, "connected_at": 1,
         "clear_advance_last_sync_at": 1, "clear_advance_last_sync_kind": 1,
         "clear_advance_last_sync_ok": 1, "clear_advance_sync_failure_streak": 1,
         "status_mappings": 1, "clear_advance_import_cursor": 1})
    outbox = getattr(db, "clear_advance_outbox", None)
    pending = await outbox.count_documents(
        {"clinic_id": clinic["id"], "status": {"$in": ["pending", "failed"]}}) if outbox else 0
    succeeded = await outbox.count_documents(
        {"clinic_id": clinic["id"], "status": "succeeded"}) if outbox else 0
    return {"connected": bool(record), "pending_outbox": pending,
            "succeeded_outbox": succeeded,
            "status_mappings": {**DEFAULT_STATUS_MAPPINGS,
                                 **((record or {}).get("status_mappings") or {})},
            **(record or {})}


@router.get("/clinic/clear-advance")
async def clinic_clear_advance_status(clinic=Depends(get_current_clinic)):
    """Clinic-safe connection, mapping and delivery-health summary."""
    return await _clinic_clear_advance_status(clinic)


@router.patch("/clinic/clear-advance/mappings")
async def clinic_update_clear_advance_mappings(
    data: ClearAdvanceStatusMappings,
    request: Request,
    clinic=Depends(get_current_clinic),
):
    """Save only this clinic's allowed status-to-outcome mappings."""
    if not await db.clinic_integrations.find_one(
        {"clinic_id": clinic["id"], "provider": "clear_advance"}, {"_id": 1}
    ):
        raise HTTPException(status_code=409, detail="Clear Advance is not connected")
    await db.clinic_integrations.update_one(
        {"clinic_id": clinic["id"], "provider": "clear_advance"},
        {"$set": {"status_mappings": data.mappings,
                   "status_mappings_updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    await audit_log(
        "clinic.clear_advance_mappings_updated", actor_type="clinic",
        target_type="clinic", target_id=clinic["id"],
        metadata={"mapping_keys": sorted(data.mappings.keys())}, severity="info",
        request=request,
    )
    return await _clinic_clear_advance_status(clinic)


@router.post("/clinic/clear-advance/sync")
async def clinic_run_clear_advance_sync(
    request: Request,
    clinic=Depends(get_current_clinic),
):
    """Run one bounded sync for this clinic and return its health snapshot."""
    if not await db.clinic_integrations.find_one(
        {"clinic_id": clinic["id"], "provider": "clear_advance"}, {"_id": 1}
    ):
        raise HTTPException(status_code=409, detail="Clear Advance is not connected")
    reported = await report_pending_leads(db, clinic_id=clinic["id"])
    imported = await import_pending_leads(db, clinic_id=clinic["id"])
    outcomes = await process_pending_outcomes(db, clinic_id=clinic["id"])
    await audit_log(
        "clinic.clear_advance_sync_triggered", actor_type="clinic",
        target_type="clinic", target_id=clinic["id"],
        metadata={"reported": reported, "imported": imported,
                  "outcomes_processed": outcomes["processed"],
                  "outcomes_succeeded": outcomes["succeeded"],
                  "outcomes_failed": outcomes["failed"]}, severity="info",
        request=request,
    )
    return {"reported": reported, "imported": imported,
            "outcomes": outcomes,
            "sync": await _clinic_clear_advance_status(clinic)}


@router.post("/admin/leads/{lead_id}/revenue")
async def admin_record_revenue(lead_id: str, data: LeadRevenue, request: Request,
                               user: AdminUser = Depends(get_current_user)):
    """Record what a patient paid, and report it as a conversion.

    This is the fact the whole tracking chain exists to deliver: an attended
    appointment says the marketing worked, but only the money says how well.

    Stored as a list rather than a single field because a treatment plan can be
    paid in stages, and overwriting would silently discard the earlier payment.
    """
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    exponent = 0 if data.currency.upper() in ("JPY", "ISK") else 2
    minor = int((Decimal(str(data.amount)) * (10 ** exponent)).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP))

    entry = {
        "reference": data.reference,
        "amount_minor": minor,
        "currency": data.currency.upper(),
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }
    # The same reference twice is the same payment, not a second one.
    existing = [r for r in (lead.get("revenue") or []) if r.get("reference") == data.reference]
    if not existing:
        await db.leads.update_one({"id": lead_id}, {"$push": {"revenue": entry}})
        await audit_log(
            "lead.revenue_recorded",
            actor=user,
            actor_type="admin",
            target_type="lead",
            target_id=lead_id,
            metadata={"amount_minor": minor, "currency": data.currency.upper()},
            severity="info",
            request=request,
        )

    queued = await report_revenue(
        db, lead, minor, data.currency.upper(), data.reference, deliver=False)
    if queued and lead.get("assigned_clinic_id"):
        asyncio.create_task(process_pending_outcomes(
            db, clinic_id=lead["assigned_clinic_id"]))

    return {"ok": True, "amount_minor": minor, "currency": data.currency.upper(),
            "deduplicated": bool(existing)}


@router.patch("/admin/leads/{lead_id}")
async def admin_update_lead(lead_id: str, data: LeadStatusUpdate, request: Request, user: AdminUser = Depends(get_current_user)):
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data")
    before = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if (
        before is not None
        and "assigned_clinic_id" in update_dict
        and update_dict["assigned_clinic_id"] != before.get("assigned_clinic_id")
    ):
        # Reassigning to a different clinic — clear the outgoing clinic's
        # internal note so it never becomes visible to the new clinic via
        # the "Пациенти" section (clinic_patients.py).
        update_dict["clinic_internal_note"] = None
        update_dict["clinic_internal_note_updated_at"] = None
    await db.leads.update_one({"id": lead_id}, {"$set": update_dict})
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})

    if before is not None:
        # Audit status change if it actually changed.
        if "status" in update_dict and (before.get("status") != update_dict["status"]):
            b, a = diff_fields(before, lead, ["status"])
            await audit_log(
                "lead.status_changed",
                actor=user,
                actor_type="admin",
                target_type="lead",
                target_id=lead_id,
                before_state=b,
                after_state=a,
                severity="info",
                request=request,
            )
            # Persist before responding; only network delivery is backgrounded.
            queued = await report_status(
                db, lead, update_dict["status"], deliver=False)
            if queued and lead.get("assigned_clinic_id"):
                asyncio.create_task(process_pending_outcomes(
                    db, clinic_id=lead["assigned_clinic_id"]))
        # Audit notes change with length-only metadata; NEVER store note bodies.
        if "notes" in update_dict:
            old_len = len(before.get("notes") or "") if isinstance(before.get("notes"), str) else 0
            new_len = len(update_dict.get("notes") or "") if isinstance(update_dict.get("notes"), str) else 0
            await audit_log(
                "lead.notes_changed",
                actor=user,
                actor_type="admin",
                target_type="lead",
                target_id=lead_id,
                metadata={
                    "notes_changed": True,
                    "notes_length_before": old_len,
                    "notes_length_after": new_len,
                },
                severity="info",
                request=request,
            )

    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead


@router.get("/admin/seed-clinics")
async def admin_seed_clinics(user: AdminUser = Depends(get_current_user)):
    """Legacy endpoint: returns the static city-directory clinics seeded at install
    time. Distinct from the partner clinics in /api/admin/clinics."""
    return await db.clinics.find({"name": {"$exists": True}}, {"_id": 0}).to_list(100)


@router.get("/admin/stats")
async def admin_stats(user: AdminUser = Depends(get_current_user)):
    total = await db.leads.count_documents({})
    new = await db.leads.count_documents({"status": "NEW"})
    green = await db.leads.count_documents({"band": "GREEN"})
    yellow = await db.leads.count_documents({"band": "YELLOW"})
    red = await db.leads.count_documents({"band": "RED"})
    return {
        "total_leads": total, "new_leads": new,
        "by_band": {"green": green, "yellow": yellow, "red": red},
        "by_city": {
            "sofia": await db.leads.count_documents({"city_slug": "sofia"}),
            "plovdiv": await db.leads.count_documents({"city_slug": "plovdiv"}),
            "varna": await db.leads.count_documents({"city_slug": "varna"}),
            "haskovo": await db.leads.count_documents({"city_slug": "haskovo"})
        }
    }


@router.get("/admin/leads/export/csv")
async def export_csv(
    request: Request,
    city_slug: Optional[str] = None,
    treatment_type: Optional[str] = None,
    band: Optional[str] = None,
    status: Optional[str] = None,
    user: AdminUser = Depends(get_current_user),
):
    query = {}
    if city_slug: query["city_slug"] = city_slug
    if treatment_type: query["treatment_type"] = treatment_type
    if band: query["band"] = band
    if status: query["status"] = status
    leads = await db.leads.find(query, {"_id": 0}).to_list(10000)
    output = StringIO()
    if leads:
        # Union of all keys across all rows — some leads carry fields
        # (e.g. verification_status, assigned_clinic_id) that others
        # don't, and csv.DictWriter would otherwise raise ValueError.
        fieldnames: list[str] = []
        seen: set[str] = set()
        for lead in leads:
            for k in lead.keys():
                if k not in seen:
                    seen.add(k)
                    fieldnames.append(k)
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for lead in leads:
            flat = {k: str(v) if isinstance(v, dict) else v for k, v in lead.items()}
            writer.writerow(flat)
    output.seek(0)
    # Audit: counts + filter keys only. NEVER include exported data / PII.
    await audit_log(
        "lead.exported_csv",
        actor=user,
        actor_type="admin",
        target_type="lead",
        target_id=None,
        metadata={
            "row_count": len(leads),
            "filters": {k: v for k, v in {
                "city_slug": city_slug, "treatment_type": treatment_type,
                "band": band, "status": status,
            }.items() if v is not None},
        },
        severity="info",
        request=request,
    )
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                            headers={"Content-Disposition": "attachment; filename=leads.csv"})


@router.put("/admin/leads/{lead_id}")
async def update_lead(lead_id: str, update: LeadUpdate, request: Request, user: AdminUser = Depends(get_current_user)):
    existing = await db.leads.find_one({"id": lead_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})

    if update_data:
        # Profile audit — changed field NAMES only (never values for name/phone/email).
        changed = sorted(k for k in update_data.keys() if k != "updated_at")
        await audit_log(
            "lead.profile_updated",
            actor=user,
            actor_type="admin",
            target_type="lead",
            target_id=lead_id,
            metadata={"changed_fields": changed},
            severity="info",
            request=request,
        )
        # If status changed inside PUT, also emit lead.status_changed.
        if "status" in update_data and existing.get("status") != update_data["status"]:
            b, a = diff_fields(existing, updated, ["status"])
            await audit_log(
                "lead.status_changed",
                actor=user,
                actor_type="admin",
                target_type="lead",
                target_id=lead_id,
                before_state=b,
                after_state=a,
                severity="info",
                request=request,
            )
            queued = await report_status(
                db, updated, update_data["status"], deliver=False)
            if queued and updated.get("assigned_clinic_id"):
                asyncio.create_task(process_pending_outcomes(
                    db, clinic_id=updated["assigned_clinic_id"]))

    return updated


@router.delete("/admin/leads/{lead_id}")
async def delete_lead(lead_id: str, request: Request, user: AdminUser = Depends(get_current_user)):
    existing = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    # Safe before_state via the lead allow-list (status / band / city_slug etc.).
    await audit_log(
        "lead.deleted",
        actor=user,
        actor_type="admin",
        target_type="lead",
        target_id=lead_id,
        before_state=existing,  # sanitiser will allow-list this to safe keys only
        severity="warning",
        request=request,
    )
    return {"success": True, "message": "Lead deleted"}


@router.post(
    "/admin/reset-analytics",
    dependencies=[Depends(rate_limit("admin_reset_analytics", max_calls=5, window_seconds=600))],
)
async def reset_analytics(
    body: ConfirmationBody,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    """Wipe `analytics_events`. Disabled in production; requires confirmation
    phrase to guard against accidental fat-finger calls in dev/staging."""
    if IS_PRODUCTION:
        await audit_log(
            "reset_analytics.blocked_production",
            actor=user, actor_type="admin",
            target_type="system", target_id=None,
            metadata={"reason_code": "production_blocked"},
            severity="warning", request=request,
        )
        raise HTTPException(status_code=403, detail="Disabled in production.")
    ok = body.confirmation_token == RESET_ANALYTICS_TOKEN
    if not ok:
        await audit_log(
            "reset_analytics.attempted",
            actor=user, actor_type="admin",
            target_type="system", target_id=None,
            metadata={"reason_code": "bad_confirmation", "confirmation_token_ok": False},
            severity="warning", request=request,
        )
        raise HTTPException(
            status_code=400,
            detail=f"confirmation_token must equal {RESET_ANALYTICS_TOKEN!r}.",
        )
    result = await db.analytics_events.delete_many({})
    logger.warning(
        "reset_analytics by admin=%s deleted_count=%d",
        user.username, result.deleted_count,
    )
    await audit_log(
        "reset_analytics.executed",
        actor=user, actor_type="admin",
        target_type="system", target_id=None,
        metadata={
            "deleted_count": result.deleted_count,
            "confirmation_token_ok": True,
        },
        severity="critical", request=request,
    )
    return {"success": True, "deleted_count": result.deleted_count}


@router.post(
    "/admin/reset-blog-views",
    dependencies=[Depends(rate_limit("admin_reset_blog_views", max_calls=5, window_seconds=600))],
)
async def reset_blog_views(
    body: ConfirmationBody,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    """Wipe `blog_views`. Disabled in production; requires confirmation
    phrase to guard against accidental fat-finger calls in dev/staging."""
    if IS_PRODUCTION:
        await audit_log(
            "reset_blog_views.blocked_production",
            actor=user, actor_type="admin",
            target_type="system", target_id=None,
            metadata={"reason_code": "production_blocked"},
            severity="warning", request=request,
        )
        raise HTTPException(status_code=403, detail="Disabled in production.")
    if body.confirmation_token != RESET_BLOG_VIEWS_TOKEN:
        await audit_log(
            "reset_blog_views.attempted",
            actor=user, actor_type="admin",
            target_type="system", target_id=None,
            metadata={"reason_code": "bad_confirmation", "confirmation_token_ok": False},
            severity="warning", request=request,
        )
        raise HTTPException(
            status_code=400,
            detail=f"confirmation_token must equal {RESET_BLOG_VIEWS_TOKEN!r}.",
        )
    result = await db.blog_views.delete_many({})
    logger.warning(
        "reset_blog_views by admin=%s deleted_count=%d",
        user.username, result.deleted_count,
    )
    await audit_log(
        "reset_blog_views.executed",
        actor=user, actor_type="admin",
        target_type="system", target_id=None,
        metadata={
            "deleted_count": result.deleted_count,
            "confirmation_token_ok": True,
        },
        severity="critical", request=request,
    )
    return {"success": True, "deleted_count": result.deleted_count}


@router.post(
    "/admin/cleanup-leads",
    dependencies=[Depends(rate_limit("admin_cleanup_leads", max_calls=3, window_seconds=600))],
)
async def cleanup_leads(
    body: CleanupLeadsBody,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    """Delete every lead whose `id` is NOT in `keep_ids`.

    Phase 2B guards:
      - Disabled in production (use the backup script + a manual mongo
        operation if absolutely required).
      - Requires `confirmation_token == CLEANUP_LEADS_TOKEN`.
      - `keep_ids` MUST be a non-empty list of strings.
      - Refuses to proceed if it would delete more than 50% of all leads
        unless `force=true` is passed explicitly.
      - Returns counts only; never echoes lead identifiers or PII.
    """
    keep_ids_count = len(body.keep_ids)
    if IS_PRODUCTION:
        await audit_log(
            "cleanup_leads.blocked_production",
            actor=user, actor_type="admin",
            target_type="system", target_id=None,
            metadata={
                "reason_code": "production_blocked",
                "keep_ids_count": keep_ids_count,
                # confirmation_token VALUE never stored; only its match flag:
                "confirmation_token_ok": body.confirmation_token == CLEANUP_LEADS_TOKEN,
            },
            severity="warning", request=request,
        )
        raise HTTPException(status_code=403, detail="Disabled in production.")
    if body.confirmation_token != CLEANUP_LEADS_TOKEN:
        await audit_log(
            "cleanup_leads.attempted",
            actor=user, actor_type="admin",
            target_type="system", target_id=None,
            metadata={
                "reason_code": "bad_confirmation",
                "keep_ids_count": keep_ids_count,
                "confirmation_token_ok": False,
            },
            severity="warning", request=request,
        )
        raise HTTPException(
            status_code=400,
            detail=f"confirmation_token must equal {CLEANUP_LEADS_TOKEN!r}.",
        )

    total = await db.leads.count_documents({})
    n_to_delete = await db.leads.count_documents({"id": {"$nin": body.keep_ids}})

    if total > 0 and n_to_delete > total / 2 and not body.force:
        # Big blast radius — bail and require explicit force=true.
        logger.warning(
            "cleanup_leads refused by admin=%s: would delete %d/%d (>50%%) without force",
            user.username, n_to_delete, total,
        )
        await audit_log(
            "cleanup_leads.blocked_majority",
            actor=user, actor_type="admin",
            target_type="system", target_id=None,
            metadata={
                "reason_code": "would_delete_majority",
                "keep_ids_count": keep_ids_count,
                "n_to_delete": n_to_delete,
                "total_before": total,
                "force": False,
                "confirmation_token_ok": True,
            },
            severity="warning", request=request,
        )
        raise HTTPException(
            status_code=400,
            detail={
                "error": "would_delete_majority",
                "total": total,
                "n_to_delete": n_to_delete,
                "hint": "pass force=true to proceed",
            },
        )

    result = await db.leads.delete_many({"id": {"$nin": body.keep_ids}})
    logger.warning(
        "cleanup_leads by admin=%s deleted_count=%d total_before=%d",
        user.username, result.deleted_count, total,
    )
    await audit_log(
        "cleanup_leads.executed",
        actor=user, actor_type="admin",
        target_type="system", target_id=None,
        metadata={
            "keep_ids_count": keep_ids_count,
            "n_to_delete": n_to_delete,
            "total_before": total,
            "deleted_count": result.deleted_count,
            "force": bool(body.force),
            "confirmation_token_ok": True,
        },
        severity="critical", request=request,
    )
    return {
        "success": True,
        "deleted_count": result.deleted_count,
        "n_to_delete": n_to_delete,
        "total_before": total,
    }


# ─── Attribution Summary Endpoints ─────────────────────────────────────

@router.get("/admin/attribution/summary")
async def attribution_summary(user: AdminUser = Depends(get_current_user)):
    """Aggregated counts per source-type and per campaign (latest-touch)."""
    leads = await db.leads.find(
        {},
        {"_id": 0, "first_lead_source_type": 1, "latest_lead_source_type": 1,
         "latest_utm_source": 1, "latest_utm_medium": 1, "latest_utm_campaign": 1,
         "latest_utm_adset": 1, "latest_utm_ad": 1, "blog_assisted_conversion": 1,
         "internal_content_assisted_conversion": 1, "status": 1, "band": 1,
         "first_article_slug": 1, "first_article_title": 1,
         "latest_article_slug": 1, "latest_article_title": 1,
         "content_path_before_conversion": 1}
    ).to_list(10000)

    # Source type counts
    src_counts: dict[str, int] = {}
    for L in leads:
        t = L.get("latest_lead_source_type") or L.get("first_lead_source_type") or "unknown"
        src_counts[t] = src_counts.get(t, 0) + 1

    blog_assisted = sum(1 for L in leads if L.get("blog_assisted_conversion"))
    internal_assisted = sum(1 for L in leads if L.get("internal_content_assisted_conversion"))

    # Campaign breakdown by latest-touch
    campaigns: dict[str, dict] = {}
    for L in leads:
        key = (
            (L.get("latest_lead_source_type") or "unknown"),
            (L.get("latest_utm_source") or "—"),
            (L.get("latest_utm_medium") or "—"),
            (L.get("latest_utm_campaign") or "—"),
            (L.get("latest_utm_adset") or "—"),
            (L.get("latest_utm_ad") or "—"),
        )
        c = campaigns.setdefault("|".join(key), {
            "source_type": key[0], "source": key[1], "medium": key[2],
            "campaign": key[3], "adset": key[4], "ad": key[5],
            "total_leads": 0, "qualified": 0, "contacted": 0,
            "sent_to_clinic": 0, "booked": 0, "unqualified": 0,
        })
        c["total_leads"] += 1
        status = (L.get("status") or "").upper()
        band = (L.get("band") or "").upper()
        if band == "GREEN" or status in {"QUALIFIED", "BOOKED"}:
            c["qualified"] += 1
        if status == "CONTACTED":
            c["contacted"] += 1
        if status in {"ASSIGNED", "SENT_TO_CLINIC", "VERIFIED"}:
            c["sent_to_clinic"] += 1
        if status == "BOOKED":
            c["booked"] += 1
        if status == "UNQUALIFIED" or band == "RED":
            c["unqualified"] += 1

    # Content / article breakdown
    articles: dict[str, dict] = {}
    for L in leads:
        # First-touch article
        if L.get("first_article_slug"):
            slug = L["first_article_slug"]
            a = articles.setdefault(slug, {
                "slug": slug, "title": L.get("first_article_title") or slug,
                "first_touch": 0, "latest_touch": 0, "assisted": 0,
                "direct_conv": 0, "organic_search_conv": 0, "paid_assisted": 0,
            })
            a["first_touch"] += 1
        if L.get("latest_article_slug"):
            slug = L["latest_article_slug"]
            a = articles.setdefault(slug, {
                "slug": slug, "title": L.get("latest_article_title") or slug,
                "first_touch": 0, "latest_touch": 0, "assisted": 0,
                "direct_conv": 0, "organic_search_conv": 0, "paid_assisted": 0,
            })
            a["latest_touch"] += 1
        # Assisted: article appeared anywhere in the path
        path = L.get("content_path_before_conversion") or []
        seen_in_path: set[str] = set()
        for p in path:
            if isinstance(p, dict) and p.get("article_slug"):
                seen_in_path.add(p["article_slug"])
        for slug in seen_in_path:
            a = articles.setdefault(slug, {
                "slug": slug, "title": slug,
                "first_touch": 0, "latest_touch": 0, "assisted": 0,
                "direct_conv": 0, "organic_search_conv": 0, "paid_assisted": 0,
            })
            a["assisted"] += 1
            # Categorise the conversion
            t = L.get("latest_lead_source_type") or "unknown"
            if t == "direct": a["direct_conv"] += 1
            elif t == "organic_search": a["organic_search_conv"] += 1
            elif t == "paid": a["paid_assisted"] += 1

    return {
        "total_leads": len(leads),
        "source_type_counts": src_counts,
        "blog_assisted_count": blog_assisted,
        "internal_content_assisted_count": internal_assisted,
        "campaigns": list(campaigns.values()),
        "articles": list(articles.values()),
        "note": "Attribution summary is based on latest-touch attribution by default.",
    }
