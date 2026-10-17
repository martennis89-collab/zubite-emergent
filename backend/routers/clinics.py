from fastapi import APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from datetime import datetime, timezone, timedelta
import asyncio
import os
import uuid
import secrets
import hashlib
import html
import logging
import resend

from database import db
from schemas import (
    ClinicApplicationCreate, ClinicIntakeInviteCreate, ClinicIntakeInviteSend,
    ClinicIntakeInviteResend,
    ClinicWebsitePrefillRequest,
    ClinicLogin, ClinicUserOut, ClinicTokenResponse,
    ClinicProfileUpdate, ClinicPasswordChange, ClinicLeadStatusUpdate, AdminUser
)
from auth import (
    get_current_user, get_current_clinic, get_current_clinic_pending_password,
    hash_password, verify_password,
    create_clinic_token, revoke_session_by_jti, revoke_all_sessions_for_user,
)
from config import (
    RESEND_API_KEY, SENDER_EMAIL, ADMIN_EMAIL, APP_NAME, PRODUCTION_URL,
    CLINIC_ONBOARDING_SENDER_EMAIL,
    AUTH_COOKIE_NAME_CLINIC, AUTH_COOKIE_SECURE, AUTH_COOKIE_SAMESITE,
    AUTH_COOKIE_MAX_AGE_SECONDS,
)
from emails import send_clinic_intake_invite_email
from rate_limit import rate_limit
from audit import audit_log
from entitlements import compute_entitlements
from phone_utils import normalize_msisdn_bg
from storage import put_object, ALLOWED_IMAGE_TYPES
from routers.public import _is_clinic_visible
from aligner_brands import ALIGNER_BRAND_LABELS
from clinic_website_prefill import crawl_clinic_site, draft_profile_from_site, prefill_enabled

router = APIRouter()


def _hash_intake_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _invite_expired(invite: dict, now: datetime | None = None) -> bool:
    raw = invite.get("expires_at")
    if not raw:
        return False
    try:
        expires_at = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return True
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= (now or datetime.now(timezone.utc))


def _safe_invite(invite: dict) -> dict:
    return {
        key: invite.get(key)
        for key in (
            "id",
            "clinic_label",
            "contact_email",
            "status",
            "token_hint",
            "created_at",
            "expires_at",
            "submitted_at",
            "application_id",
            "revoked_at",
            "email_sent_at",
            "email_sent_to",
            "email_send_count",
        )
    }


def _intake_link(token: str) -> str:
    """Public URL a clinic opens to fill in its intake form.

    Built from PRODUCTION_URL rather than from anything the caller sends, so
    an official email can never carry a link to somewhere else.
    """
    base = (PRODUCTION_URL or "https://zubite.bg").rstrip("/")
    return f"{base}/clinic-intake/{token}"


async def _deliver_intake_invite_email(
    *,
    invite: dict,
    token: str,
    to_email: str,
    actor: AdminUser,
    request: Request | None = None,
) -> bool:
    """Email one intake link and record the delivery on the invite.

    Returns True when Resend accepted the message. Failures are recorded as a
    False return rather than an exception — creating the link must succeed even
    when mail delivery does not, because the admin can still copy it.
    """
    sent = await send_clinic_intake_invite_email(
        to_email=to_email,
        clinic_label=invite.get("clinic_label") or "",
        intake_url=_intake_link(token),
        expires_at=invite.get("expires_at"),
    )
    if not sent:
        return False
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.clinic_intake_invites.update_one(
        {"id": invite["id"]},
        {
            "$set": {"email_sent_at": now_iso, "email_sent_to": to_email},
            "$inc": {"email_send_count": 1},
        },
    )
    invite["email_sent_at"] = now_iso
    invite["email_sent_to"] = to_email
    invite["email_send_count"] = (invite.get("email_send_count") or 0) + 1
    await audit_log(
        "clinic_intake_invite.emailed",
        actor=actor,
        target_type="clinic_application",
        target_id=invite["id"],
        target_summary=invite.get("clinic_label") or "Private clinic intake invite",
        metadata={"recipient": to_email},
        request=request,
    )
    return True


def _application_profile(application: dict) -> dict:
    """Project clinic-authored intake data into a draft rich profile.

    Commercial status, verification, ratings and publication remain admin
    decisions. Empty values are omitted so the admin editor keeps clean
    defaults and legacy applications remain compatible.
    """
    profile_keys = (
        "short_description",
        "patient_intro",
        "founded_year",
        "treatment_focus",
        "treatment_case_counts",
        "hero_image_url",
        "clinic_video_url",
        "doctor_video_url",
        "doctor_spotlight_image_url",
        "team_image_url",
        "environment_image_url",
        "doctor_spotlight_name",
        "doctor_spotlight_kind",
        "doctor_spotlight_role",
        "doctor_spotlight_specialties",
        "assessment_approaches",
        "doctor_spotlight_bio",
        "team_note",
        "clinic_story",
        "environment_description",
        "consultation_process",
    )
    profile = {"profile_status": "draft"}
    for key in profile_keys:
        value = application.get(key)
        if value not in (None, "", []):
            profile[key] = value

    review_sources = {
        "google_url": application.get("google_url"),
        "facebook_url": application.get("facebook_url"),
        "superdoc_url": application.get("superdoc_url"),
    }
    review_sources = {key: value for key, value in review_sources.items() if value}
    if review_sources:
        profile["review_sources"] = review_sources
    return profile


def _application_aligner_brands(application: dict) -> list[dict]:
    """Create safe, unverified brand declarations from public intake."""
    claimed_official = set(application.get("claimed_official_provider_brands") or [])
    rows: list[dict] = []
    for slug in application.get("aligner_brands") or []:
        if slug not in ALIGNER_BRAND_LABELS:
            continue
        relationship = "official_provider" if slug in claimed_official else "offered"
        rows.append({
            "brand": slug,
            "label": ALIGNER_BRAND_LABELS[slug],
            "relationship": relationship,
            "verification_status": "pending_verification" if relationship == "official_provider" else "unverified",
            "visible": True,
        })
    return rows


# ─── Private clinic intake invitations ─────────────────────────────

@router.post("/admin/clinic-intake-invites")
async def create_clinic_intake_invite(
    body: ClinicIntakeInviteCreate,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    invite = {
        "id": str(uuid.uuid4()),
        "clinic_label": body.clinic_label.strip(),
        "contact_email": str(body.contact_email) if body.contact_email else None,
        "status": "pending",
        "token_hash": _hash_intake_token(token),
        "token_hint": token[-6:],
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=body.expires_in_days)).isoformat(),
        "created_by": user.username,
    }
    await db.clinic_intake_invites.insert_one(invite)
    await audit_log(
        "clinic_intake_invite.created",
        actor=user,
        target_type="clinic_application",
        target_id=invite["id"],
        target_summary=invite["clinic_label"],
        metadata={"expires_in_days": body.expires_in_days},
        request=request,
    )

    # Optional delivery. A failed send never fails the request — the admin
    # still gets the token back and can copy the link or retry the send.
    email_sent = False
    email_error: str | None = None
    if body.send_email:
        if not invite["contact_email"]:
            email_error = "missing_contact_email"
        else:
            email_sent = await _deliver_intake_invite_email(
                invite=invite,
                token=token,
                to_email=invite["contact_email"],
                actor=user,
                request=request,
            )
            if not email_sent:
                email_error = "send_failed"

    return {
        "invite": _safe_invite(invite),
        "token": token,
        "email_sent": email_sent,
        "email_error": email_error,
    }


@router.post("/admin/clinic-intake-invites/{invite_id}/send")
async def send_clinic_intake_invite(
    invite_id: str,
    body: ClinicIntakeInviteSend,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    """Email (or re-email) an intake link the admin still holds.

    The stored record only has the token hash, so the caller supplies the raw
    token and it is matched against this invite before anything is sent.
    """
    if not isinstance(invite_id, str) or len(invite_id) > 100:
        raise HTTPException(status_code=400, detail="Invalid invite id")
    invite = await db.clinic_intake_invites.find_one({"id": invite_id}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if not secrets.compare_digest(
        _hash_intake_token(body.token), invite.get("token_hash", "")
    ):
        raise HTTPException(status_code=403, detail="Token does not match this invite")
    if invite.get("status") != "pending":
        raise HTTPException(status_code=409, detail="Intake link is no longer active")
    if _invite_expired(invite):
        await db.clinic_intake_invites.update_one(
            {"id": invite_id, "status": "pending"},
            {"$set": {"status": "expired"}},
        )
        raise HTTPException(status_code=410, detail="Intake link has expired")

    to_email = str(body.contact_email) if body.contact_email else invite.get("contact_email")
    if not to_email:
        raise HTTPException(status_code=400, detail="No recipient email for this invite")

    sent = await _deliver_intake_invite_email(
        invite=invite,
        token=body.token,
        to_email=to_email,
        actor=user,
        request=request,
    )
    if not sent:
        raise HTTPException(status_code=502, detail="Email could not be sent")

    # A corrected address becomes the invite's contact email, so the record and
    # the prefilled form agree with where the link actually went.
    if to_email != invite.get("contact_email"):
        await db.clinic_intake_invites.update_one(
            {"id": invite_id}, {"$set": {"contact_email": to_email}}
        )
        invite["contact_email"] = to_email

    return {"status": "ok", "invite": _safe_invite(invite)}


@router.post("/admin/clinic-intake-invites/{invite_id}/resend")
async def resend_clinic_intake_invite(
    invite_id: str,
    body: ClinicIntakeInviteResend,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    """Re-issue an intake link from the invite list and email it.

    Only the token hash is stored, so the original link cannot be sent again.
    A fresh token replaces it on the same invite (the old link stops working)
    and an expired invite is renewed. The new token is returned too, so the
    admin can still copy the link when mail delivery fails.
    """
    if not isinstance(invite_id, str) or len(invite_id) > 100:
        raise HTTPException(status_code=400, detail="Invalid invite id")
    invite = await db.clinic_intake_invites.find_one({"id": invite_id}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    # Submitted, revoked or mid-submission invites must never get a live link back.
    if invite.get("status") not in ("pending", "expired"):
        raise HTTPException(status_code=409, detail="Intake link can no longer be resent")

    to_email = str(body.contact_email) if body.contact_email else invite.get("contact_email")
    if not to_email:
        raise HTTPException(status_code=400, detail="No recipient email for this invite")

    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    updates = {
        "status": "pending",
        "token_hash": _hash_intake_token(token),
        "token_hint": token[-6:],
        "contact_email": to_email,
        "reissued_at": now.isoformat(),
    }
    if invite.get("status") == "expired" or _invite_expired(invite, now):
        updates["expires_at"] = (now + timedelta(days=body.expires_in_days)).isoformat()

    result = await db.clinic_intake_invites.update_one(
        {"id": invite_id, "status": {"$in": ["pending", "expired"]}},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=409, detail="Intake link can no longer be resent")
    invite.update(updates)
    await audit_log(
        "clinic_intake_invite.reissued",
        actor=user,
        target_type="clinic_application",
        target_id=invite_id,
        target_summary=invite.get("clinic_label") or "Private clinic intake invite",
        metadata={"recipient": to_email, "renewed": "expires_at" in updates},
        request=request,
    )

    email_sent = await _deliver_intake_invite_email(
        invite=invite,
        token=token,
        to_email=to_email,
        actor=user,
        request=request,
    )
    return {
        "invite": _safe_invite(invite),
        "token": token,
        "email_sent": email_sent,
    }


@router.get("/admin/clinic-intake-invites")
async def list_clinic_intake_invites(user: AdminUser = Depends(get_current_user)):
    rows = await db.clinic_intake_invites.find(
        {},
        {"_id": 0, "token_hash": 0},
    ).sort("created_at", -1).to_list(500)
    now = datetime.now(timezone.utc)
    for row in rows:
        if row.get("status") == "pending" and _invite_expired(row, now):
            row["status"] = "expired"
    return {"invites": rows}


@router.patch("/admin/clinic-intake-invites/{invite_id}/revoke")
async def revoke_clinic_intake_invite(
    invite_id: str,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(invite_id, str) or len(invite_id) > 100:
        raise HTTPException(status_code=400, detail="Invalid invite id")
    now_iso = datetime.now(timezone.utc).isoformat()
    result = await db.clinic_intake_invites.update_one(
        {"id": invite_id, "status": {"$in": ["pending", "submitting"]}},
        {"$set": {"status": "revoked", "revoked_at": now_iso, "revoked_by": user.username}},
    )
    if result.matched_count == 0:
        invite = await db.clinic_intake_invites.find_one({"id": invite_id}, {"_id": 0})
        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found")
        raise HTTPException(status_code=409, detail="Invite can no longer be revoked")
    await audit_log(
        "clinic_intake_invite.revoked",
        actor=user,
        target_type="clinic_application",
        target_id=invite_id,
        target_summary="Private clinic intake invite",
        severity="warning",
        request=request,
    )
    return {"status": "ok"}


@router.get(
    "/clinic-intake/{token}",
    dependencies=[Depends(rate_limit("clinic_intake_view", 60, 600))],
)
async def get_clinic_intake_invite(token: str, response: Response):
    response.headers["Cache-Control"] = "private, no-store, max-age=0"
    if not isinstance(token, str) or len(token) < 32 or len(token) > 100:
        raise HTTPException(status_code=404, detail="Intake link not found")
    invite = await db.clinic_intake_invites.find_one(
        {"token_hash": _hash_intake_token(token)},
        {"_id": 0, "token_hash": 0, "created_by": 0},
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Intake link not found")
    status = invite.get("status", "pending")
    if status == "pending" and _invite_expired(invite):
        status = "expired"
        await db.clinic_intake_invites.update_one(
            {"id": invite["id"], "status": "pending"},
            {"$set": {"status": "expired"}},
        )
    if status == "submitting":
        status = "pending"
    return {
        "invite": {
            "clinic_label": invite.get("clinic_label"),
            "contact_email": invite.get("contact_email"),
            "status": status,
            "expires_at": invite.get("expires_at"),
        }
    }


@router.post(
    "/clinic-intake/{token}",
    dependencies=[Depends(rate_limit("clinic_intake_submit", 5, 600))],
)
async def submit_clinic_intake(
    token: str,
    application: ClinicApplicationCreate,
    response: Response,
    request: Request,
):
    response.headers["Cache-Control"] = "private, no-store, max-age=0"
    if not isinstance(token, str) or len(token) < 32 or len(token) > 100:
        raise HTTPException(status_code=404, detail="Intake link not found")
    token_hash = _hash_intake_token(token)
    invite = await db.clinic_intake_invites.find_one({"token_hash": token_hash}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Intake link not found")
    if _invite_expired(invite):
        await db.clinic_intake_invites.update_one(
            {"id": invite["id"], "status": "pending"},
            {"$set": {"status": "expired"}},
        )
        raise HTTPException(status_code=410, detail="Intake link has expired")
    if invite.get("status") != "pending":
        raise HTTPException(status_code=409, detail="Intake link has already been used or revoked")

    claimed = await db.clinic_intake_invites.update_one(
        {"id": invite["id"], "status": "pending"},
        {"$set": {"status": "submitting"}},
    )
    if claimed.modified_count != 1:
        raise HTTPException(status_code=409, detail="Intake link has already been used")

    try:
        created = await create_clinic_application(application)
        application_id = created["id"]
        await db.clinic_applications.update_one(
            {"id": application_id},
            {"$set": {
                "source": "private_intake",
                "intake_invite_id": invite["id"],
                "intake_label": invite.get("clinic_label"),
            }},
        )
        await db.clinic_intake_invites.update_one(
            {"id": invite["id"], "status": "submitting"},
            {"$set": {
                "status": "submitted",
                "submitted_at": datetime.now(timezone.utc).isoformat(),
                "application_id": application_id,
            }},
        )
        await audit_log(
            "clinic_intake_invite.submitted",
            actor_type="public",
            target_type="clinic_application",
            target_id=application_id,
            target_summary=application.clinic_name,
            metadata={"invite_id": invite["id"]},
            request=request,
        )
        return {"status": "ok", "application_id": application_id}
    except HTTPException:
        await db.clinic_intake_invites.update_one(
            {"id": invite["id"], "status": "submitting"},
            {"$set": {"status": "pending"}},
        )
        raise
    except Exception:
        await db.clinic_intake_invites.update_one(
            {"id": invite["id"], "status": "submitting"},
            {"$set": {"status": "pending"}},
        )
        raise


def _clinic_to_out(clinic: dict) -> ClinicUserOut:
    logo_file_id = clinic.get("logo_file_id")
    return ClinicUserOut(
        id=clinic["id"], clinic_name=clinic["clinic_name"], city=clinic["city"],
        email=clinic["email"], phone=clinic["phone"], status=clinic["status"],
        address=clinic.get("address"), website=clinic.get("website"),
        company_name=clinic.get("company_name"), eik=clinic.get("eik"),
        mol=clinic.get("mol"), description=clinic.get("description"),
        viber_enabled=bool(clinic.get("viber_enabled")),
        viber_phone=clinic.get("viber_phone"),
        logo_url=f"/api/files/{logo_file_id}" if logo_file_id else None,
        must_change_password=clinic.get("must_change_password") is True,
    )


# ─── Public Application ───────────────────────────────────

@router.post("/clinic-applications", dependencies=[Depends(rate_limit("clinic_apply", 3, 600))])
async def create_clinic_application(application: ClinicApplicationCreate):
    doc = {
        "id": str(uuid.uuid4()),
        **application.model_dump(),
        "status": "pending",
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.clinic_applications.insert_one(doc)

    services = []
    if application.offers_aligners: services.append("Алайнери")
    if application.offers_braces: services.append("Брекети")
    if application.offers_implants: services.append("Импланти")
    treats = []
    if application.treats_adults: treats.append("Възрастни")
    if application.treats_children: treats.append("Деца")

    if RESEND_API_KEY and ADMIN_EMAIL:
        try:
            resend.Emails.send({
                "from": SENDER_EMAIL, "to": ADMIN_EMAIL,
                "subject": f"Нова кандидатура от клиника: {application.clinic_name}",
                "html": f"""
                <h2>Нова кандидатура за партньорство</h2>
                <h3>Клиника</h3>
                <p><strong>Име:</strong> {application.clinic_name}</p>
                <p><strong>Град:</strong> {application.city}</p>
                <p><strong>Адрес:</strong> {application.address or '—'}</p>
                <p><strong>Уебсайт:</strong> {application.website or '—'}</p>
                <p><strong>Размер:</strong> {application.clinic_size or '—'}</p>
                <h3>Контакт</h3>
                <p><strong>Лице:</strong> {application.contact_name}</p>
                <p><strong>Телефон:</strong> {application.phone}</p>
                <p><strong>Имейл:</strong> {application.email}</p>
                <h3>Услуги</h3>
                <p><strong>Предлага:</strong> {', '.join(services) or '—'}</p>
                <p><strong>Третира:</strong> {', '.join(treats) or '—'}</p>
                <h3>Квалификация</h3>
                <p><strong>Години опит:</strong> {application.years_experience or '—'}</p>
                <p><strong>Случаи/месец:</strong> {application.number_of_cases_per_month or '—'}</p>
                <p><strong>Дигитални сканове:</strong> {'Да' if application.do_you_use_digital_scans else 'Не' if application.do_you_use_digital_scans is not None else '—'}</p>
                <h3>Позициониране</h3>
                <p><strong>Основна цел:</strong> {application.partnership_goal or '—'}</p>
                <p><strong>Мотивация:</strong> {application.partnership_motivation or '—'}</p>
                <p>{application.what_types_of_patients_are_best_for_you or '—'}</p>
                <h3>Операции</h3>
                <p><strong>Средно време за отговор:</strong> {application.average_response_time or '—'}</p>
                """
            })
        except Exception as e:
            logging.error(f"Failed to send clinic application email: {e}")

    return {"status": "ok", "id": doc["id"]}


# ─── Admin Clinic Applications ────────────────────────────

@router.get("/admin/clinic-applications")
async def get_clinic_applications(user: AdminUser = Depends(get_current_user)):
    apps = await db.clinic_applications.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Approved applications link to the clinic they created, and to its public
    # profile once that is live.
    approved_ids = [a["id"] for a in apps if a.get("status") == "approved" and a.get("id")]
    if approved_ids:
        from routers.public_clinics import public_profile_paths
        clinic_by_app = {
            c["application_id"]: c["id"]
            async for c in db.clinics.find(
                {"application_id": {"$in": approved_ids}}, {"_id": 0, "id": 1, "application_id": 1})
        }
        paths = await public_profile_paths(list(clinic_by_app.values()))
        for a in apps:
            cid = clinic_by_app.get(a.get("id"))
            if cid:
                a["clinic_id"] = cid
                a["clinic_public_profile_path"] = paths.get(cid)
    return {"applications": apps}


@router.get("/admin/clinic-applications/prefill-status")
async def clinic_prefill_status(user: AdminUser = Depends(get_current_user)):
    """Whether the 'Попълни от уебсайт' AI-prefill action is available —
    lets the admin UI hide/disable it cleanly when ANTHROPIC_API_KEY isn't
    configured, instead of the button just failing on click."""
    return {"enabled": prefill_enabled()}


@router.post(
    "/admin/clinic-applications/prefill-from-website",
    # Tight on purpose — this triggers a paid Anthropic API call. 5/hour/IP
    # comfortably covers a real onboarding pace while capping worst-case
    # spend if the button gets spammed (accidentally or otherwise).
    dependencies=[Depends(rate_limit("admin_clinic_prefill", 5, 3600))],
)
async def prefill_clinic_application_from_website(
    body: ClinicWebsitePrefillRequest, user: AdminUser = Depends(get_current_user),
):
    """Crawl a clinic's own website and draft an application from it —
    never persisted here. The admin reviews/edits the returned draft in
    the UI, then calls POST /admin/clinic-applications to actually submit
    it. Doctors with no website keep using the existing intake-link flow
    (POST /admin/clinic-intake-invites) unaffected by any of this."""
    if not prefill_enabled():
        raise HTTPException(
            status_code=503,
            detail="AI попълването не е конфигурирано (липсва ANTHROPIC_API_KEY).",
        )
    website_url = body.website_url.strip()
    if not website_url.startswith(("http://", "https://")):
        website_url = f"https://{website_url}"

    try:
        site_text, crawled_pages, warnings = await crawl_clinic_site(website_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        draft = await draft_profile_from_site(site_text, website_url=website_url)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    await audit_log(
        "clinic_application.ai_prefill_generated",
        actor=user,
        actor_type="admin",
        target_type="clinic_application_draft",
        metadata={"website_url": website_url, "crawled_pages": len(crawled_pages)},
        severity="info",
    )
    return {
        "draft": draft.model_dump(),
        "crawled_pages": crawled_pages,
        "warnings": warnings,
    }


@router.post("/admin/clinic-applications")
async def admin_create_clinic_application(
    application: ClinicApplicationCreate, request: Request, user: AdminUser = Depends(get_current_user),
):
    """Admin-authenticated counterpart to the public create endpoint above
    — used once an admin has reviewed/edited an AI-drafted (or manually
    typed) application and is ready to submit it into the normal
    moderation queue. Not rate-limited like the public endpoint (admin is
    already authenticated); tagged with source for provenance."""
    doc = {
        "id": str(uuid.uuid4()),
        **application.model_dump(),
        "status": "pending",
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if not doc.get("source"):
        doc["source"] = "admin_manual"
    await db.clinic_applications.insert_one(doc)
    await audit_log(
        "clinic_application.created_by_admin",
        actor=user,
        actor_type="admin",
        target_type="clinic_application",
        target_id=doc["id"],
        metadata={"clinic_name": application.clinic_name, "source": doc["source"]},
        severity="info",
        request=request,
    )
    return {"status": "ok", "id": doc["id"]}


@router.patch("/admin/clinic-applications/{app_id}")
async def update_clinic_application(app_id: str, body: dict, request: Request, user: AdminUser = Depends(get_current_user)):
    allowed = {"status", "notes", "district_slug"}
    update_data = {}
    for k, v in body.items():
        if k not in allowed:
            continue
        # Reject any operator-style or non-primitive values to prevent NoSQL injection
        if not isinstance(v, (str, type(None))):
            raise HTTPException(status_code=400, detail=f"Invalid value for {k}")
        update_data[k] = v
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    application = await db.clinic_applications.find_one({"id": app_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Checked before anything is written. The old order approved the application
    # first and then quietly skipped creating the clinic when the email was taken,
    # leaving an "approved" application with no clinic behind it and nothing on
    # screen to say so.
    if update_data.get("status") == "approved" and application.get("status") != "approved":
        taken = await db.clinics.find_one(
            {"email": str(application.get("email") or "").strip().lower()},
            {"_id": 0, "id": 1, "clinic_name": 1, "name": 1})
        if taken:
            holder = taken.get("clinic_name") or taken.get("name") or taken["id"]
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Имейлът {application.get('email')} вече се използва от клиника „{holder}“. "
                    "Архивирайте я или сменете нейния имейл, преди да одобрите кандидатурата."
                ),
            )

    await db.clinic_applications.update_one({"id": app_id}, {"$set": update_data})
    response = {"status": "ok"}

    new_status = update_data.get("status")
    created_clinic_id: str | None = None
    if new_status == "approved" and application.get("status") != "approved":
        existing = await db.clinics.find_one({"email": str(application["email"]).strip().lower()})
        if not existing:
            temp_password = secrets.token_urlsafe(10)
            # `application` was fetched before update_one() above wrote this
            # request's own update_data — merge so a district_slug set in
            # the SAME PATCH as status="approved" isn't silently dropped.
            approved_data = {**application, **update_data}
            treatments_supported = list(application.get("treatments_supported") or [])
            for enabled, treatment in (
                (application.get("offers_aligners"), "aligners"),
                (application.get("offers_braces"), "braces"),
                (application.get("offers_implants"), "implants"),
            ):
                if enabled and treatment not in treatments_supported:
                    treatments_supported.append(treatment)
            clinic_doc = {
                "id": str(uuid.uuid4()),
                "clinic_name": application["clinic_name"],
                "city": application["city"],
                "district_slug": approved_data.get("district_slug"),
                "email": str(application["email"]).strip().lower(),
                "phone": application["phone"],
                "password_hash": hash_password(temp_password),
                # The emailed password is temporary: first login must replace it.
                "must_change_password": True,
                "status": "active",
                "application_id": app_id,
                "address": application.get("address", ""),
                "website": application.get("website"),
                "contact_person": application.get("contact_name"),
                "notification_email": application.get("email"),
                "treatments_supported": treatments_supported,
                "treatments_offered": treatments_supported,
                # Approval creates the safest base package. The submitted
                # package is an interest signal, never an entitlement grant.
                "base_package": "verified_profile",
                "partner_tier": "standard",
                "clinic_profile": _application_profile(application),
                "aligner_brands_supported": _application_aligner_brands(application),
                "onboarding_intake": {
                    "package_interest": application.get("package_interest", "unsure"),
                    "treats_adults": bool(application.get("treats_adults")),
                    "treats_children": bool(application.get("treats_children")),
                    "years_experience": application.get("years_experience"),
                    "number_of_cases_per_month": application.get("number_of_cases_per_month"),
                    "do_you_use_digital_scans": application.get("do_you_use_digital_scans"),
                    "patient_fit": application.get("what_types_of_patients_are_best_for_you"),
                    "average_response_time": application.get("average_response_time"),
                    "wants_online_booking": application.get("wants_online_booking"),
                    "wants_viber_contact": application.get("wants_viber_contact"),
                    "viber_phone": application.get("viber_phone"),
                    "case_library_summary": application.get("case_library_summary"),
                    "case_media_url": application.get("case_media_url"),
                    "patient_consent_available": application.get("patient_consent_available"),
                },
                "company_name": None, "eik": None, "mol": None, "description": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.clinics.insert_one(clinic_doc)
            created_clinic_id = clinic_doc["id"]
            # An approved application is a new clinic, so it is enrolled in
            # Clear Advance exactly like one created by an admin. Never allowed
            # to fail the approval.
            try:
                from clear_advance import enrol_clinic, queue_clinic_enrolment
                if await queue_clinic_enrolment(db, clinic_doc):
                    asyncio.create_task(enrol_clinic(db, clinic_doc["id"]))
            except Exception as exc:
                logging.warning(
                    f"Clear Advance enrolment could not be queued for {clinic_doc['id']}: {exc}")
            response["clinic_account_created"] = True
            response["clinic_credentials"] = {"email": application["email"], "temporary_password": temp_password}

            response["email_sent"] = _send_clinic_credentials_email(
                clinic_name=application["clinic_name"],
                email=application["email"],
                password=temp_password,
                kind="welcome",
            )

    # ── Audit (Phase 3 D2b) ────────────────────────────────────────
    prev_status = application.get("status")
    if new_status == "approved" and prev_status != "approved":
        await audit_log(
            "clinic_application.approved",
            actor=user, actor_type="admin",
            target_type="clinic_application", target_id=app_id,
            target_summary=application.get("clinic_name"),
            metadata={"created_clinic_id": created_clinic_id},
            severity="info", request=request,
        )
    elif new_status == "rejected" and prev_status != "rejected":
        await audit_log(
            "clinic_application.rejected",
            actor=user, actor_type="admin",
            target_type="clinic_application", target_id=app_id,
            target_summary=application.get("clinic_name"),
            severity="info", request=request,
        )
    if "notes" in update_data:
        # Notes change always emits a notes_updated row regardless of any
        # accompanying status change — length-only metadata, body NEVER stored.
        old_notes_len = len(application.get("notes") or "") if isinstance(application.get("notes"), str) else 0
        new_notes_len = len(update_data.get("notes") or "") if isinstance(update_data.get("notes"), str) else 0
        await audit_log(
            "clinic_application.notes_updated",
            actor=user, actor_type="admin",
            target_type="clinic_application", target_id=app_id,
            metadata={
                "notes_changed": True,
                "notes_length_before": old_notes_len,
                "notes_length_after": new_notes_len,
            },
            severity="info", request=request,
        )

    return response


def _portal_url() -> str:
    """Clinic portal login URL for emails.

    Built from PRODUCTION_URL, never from request headers, so a spoofed Host
    header can't put a link to somewhere else into a credentials email.
    """
    return f"{(PRODUCTION_URL or 'https://zubite.bg').rstrip('/')}/clinic"


_CREDENTIAL_EMAILS = {
    "welcome": {
        "subject": "Добре дошли в Zubite.bg — вашият акаунт е одобрен",
        "title": "Добре дошли в Zubite.bg",
        "intro": "Кандидатурата на <strong>{name}</strong> е одобрена. Ето данните за първото влизане в партньорския портал.",
    },
    "reset": {
        "subject": "Нова временна парола за Zubite.bg",
        "title": "Нова временна парола",
        "intro": "Екипът на Zubite.bg издаде нова временна парола за акаунта на <strong>{name}</strong>.",
    },
}


def _clinic_credentials_email_html(*, kind: str, clinic_name: str, email: str, password: str) -> str:
    copy = _CREDENTIAL_EMAILS[kind]
    name = html.escape(clinic_name or "")
    return f"""
    <div style="font-family: Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0; color: #1B1C1B;">
        <p style="font-size: 20px; font-weight: 700; letter-spacing: -0.04em; margin: 0 0 24px; color: #0A0A0A;">Zubite<span style="color: #007956;">.bg</span></p>
        <h1 style="font-size: 24px; color: #073B36; margin: 0 0 8px;">{copy["title"]}</h1>
        <p style="color: #45514F; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">{copy["intro"].format(name=name)}</p>
        <div style="background: #F3F7F6; border: 1px solid #C8D8D4; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px;">
            <p style="color: #45514F; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 12px;">Данни за вход</p>
            <p style="font-size: 15px; margin: 0 0 8px;"><strong>Имейл:</strong> {html.escape(email or "")}</p>
            <p style="font-size: 15px; margin: 0;"><strong>Временна парола:</strong> <code style="background: #FFFFFF; border: 1px solid #C8D8D4; padding: 3px 8px; border-radius: 6px; font-size: 15px;">{html.escape(password)}</code></p>
        </div>
        <p style="color: #1B1C1B; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">При първото влизане ще ви помолим да зададете своя парола. Временната спира да работи веднага щом го направите.</p>
        <a href="{_portal_url()}" style="display: inline-block; background: #073B36; color: #FFFFFF; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 15px;">Влез и задай парола</a>
        <p style="color: #6B7875; font-size: 13px; line-height: 1.6; margin-top: 32px;">Не споделяйте временната парола. Ако не сте очаквали този имейл, отговорете ни и ще проверим.<br><br>С уважение,<br>Екипът на Zubite.bg</p>
    </div>
    """


def _send_clinic_credentials_email(*, kind: str, clinic_name: str, email: str, password: str) -> bool:
    """Email a clinic its temporary login. Returns True when Resend accepted it.

    Never raises: a mail outage must not fail approval or a reset — the admin
    still sees the password on screen and can pass it on.
    """
    if not RESEND_API_KEY or not email:
        return False
    try:
        resend.Emails.send({
            # Onboarding sender: credentials and the intake invite are the
            # emails that bring a clinic onto the platform.
            "from": CLINIC_ONBOARDING_SENDER_EMAIL,
            "to": email,
            "subject": _CREDENTIAL_EMAILS[kind]["subject"],
            "html": _clinic_credentials_email_html(
                kind=kind, clinic_name=clinic_name, email=email, password=password),
        })
        logging.info(f"Clinic credentials email ({kind}) sent to {email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send clinic credentials email ({kind}): {e}")
        return False


@router.post("/admin/clinic-applications/{app_id}/regenerate-password")
async def regenerate_clinic_password_by_app(app_id: str, request: Request, user: AdminUser = Depends(get_current_user)):
    clinic = await db.clinics.find_one({"application_id": app_id}, {"_id": 0})
    if not clinic:
        raise HTTPException(status_code=404, detail="Няма създаден акаунт за тази кандидатура")
    if clinic.get("archived") is True:
        raise HTTPException(status_code=409, detail="Клиниката е архивирана. Възстановете я, преди да сменяте паролата.")
    new_password = secrets.token_urlsafe(10)
    await db.clinics.update_one(
        {"id": clinic["id"]},
        {"$set": {"password_hash": hash_password(new_password), "must_change_password": True}},
    )
    email_sent = _send_clinic_credentials_email(
        kind="reset", clinic_name=clinic.get("clinic_name"), email=clinic.get("email"), password=new_password)
    # Audit: warning severity. Generated password is NEVER stored in audit row
    # (we only pass flags + clinic_id — never new_password / password_hash).
    await audit_log(
        "clinic.password_regenerated_via_app",
        actor=user, actor_type="admin",
        target_type="clinic", target_id=clinic.get("id"),
        target_summary=clinic.get("clinic_name"),
        metadata={
            "application_id": app_id,
            "email_attempted": True,
            "email_success": bool(email_sent),
            "password_reset_sent": bool(email_sent),
        },
        severity="warning", request=request,
    )
    return {"status": "ok", "credentials": {"email": clinic["email"], "password": new_password}, "email_sent": email_sent}


# ─── Admin Clinic Accounts ────────────────────────────────

@router.get("/admin/clinic-accounts")
async def admin_list_clinic_accounts(user: AdminUser = Depends(get_current_user)):
    clinics = await db.clinics.find({"password_hash": {"$exists": True}}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(100)
    return {"clinics": clinics}


@router.post("/admin/clinic-accounts/{clinic_id}/reset-password")
async def admin_reset_clinic_password(clinic_id: str, request: Request, user: AdminUser = Depends(get_current_user)):
    clinic = await db.clinics.find_one({"id": clinic_id, "password_hash": {"$exists": True}}, {"_id": 0})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic account not found")
    if clinic.get("archived") is True:
        raise HTTPException(status_code=409, detail="Клиниката е архивирана. Възстановете я, преди да сменяте паролата.")
    new_password = secrets.token_urlsafe(10)
    await db.clinics.update_one(
        {"id": clinic_id},
        {"$set": {"password_hash": hash_password(new_password), "must_change_password": True}},
    )
    email_sent = _send_clinic_credentials_email(
        kind="reset", clinic_name=clinic.get("clinic_name"), email=clinic.get("email"), password=new_password)
    # Audit: warning severity; generated password NEVER stored in audit row.
    await audit_log(
        "clinic.password_reset",
        actor=user, actor_type="admin",
        target_type="clinic", target_id=clinic_id,
        target_summary=clinic.get("clinic_name"),
        metadata={
            "email_attempted": True,
            "email_success": bool(email_sent),
            "password_reset_sent": bool(email_sent),
        },
        severity="warning", request=request,
    )
    return {"status": "ok", "credentials": {"email": clinic["email"], "password": new_password}, "email_sent": email_sent}


# ─── Admin Lead → Clinic Assignment ───────────────────────

@router.patch("/admin/leads/{lead_id}/assign-clinic")
async def admin_assign_lead_to_clinic(lead_id: str, body: dict, request: Request, user: AdminUser = Depends(get_current_user)):
    clinic_id = body.get("clinic_id")
    # Strict type check to prevent NoSQL injection via {"clinic_id": {"$ne": ""}}
    if not clinic_id or not isinstance(clinic_id, str):
        raise HTTPException(status_code=400, detail="clinic_id is required and must be a string")
    clinic = await db.clinics.find_one(
        {"id": clinic_id, "password_hash": {"$exists": True}},
        {"_id": 0, "clinic_name": 1, "email": 1, "notification_email": 1, "id": 1,
         "clinic_status": 1, "status": 1, "is_active": 1, "archived": 1, "is_demo": 1},
    )
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic account not found")
    if not _is_clinic_visible(clinic):
        raise HTTPException(
            status_code=409,
            detail=(
                "Clinic is not currently eligible for new lead assignment "
                f"(clinic_status={clinic.get('clinic_status')!r}, status={clinic.get('status')!r}). "
                "Reactivate the clinic before assigning."
            ),
        )

    # Phase 2C: detect "is this a new/different clinic?" so we only notify
    # the new clinic on actual (re)assignments, not on idempotent re-saves.
    existing_lead = await db.leads.find_one(
        {"id": lead_id}, {"_id": 0, "id": 1, "assigned_clinic_id": 1}
    )
    if not existing_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    prev_clinic_id = existing_lead.get("assigned_clinic_id")
    is_new_assignment = prev_clinic_id != clinic_id

    lead_update = {"assigned_clinic_id": clinic_id, "clinic_lead_status": "new"}
    if is_new_assignment and prev_clinic_id:
        # Moving to a different clinic — clear the outgoing clinic's
        # internal note (clinic_patients.py "Пациенти" section) so it
        # never becomes visible to the new clinic.
        lead_update["clinic_internal_note"] = None
        lead_update["clinic_internal_note_updated_at"] = None

    await db.leads.update_one(
        {"id": lead_id},
        {"$set": lead_update},
    )

    # Auto-create a ConsultationRequest linked to this lead (idempotent).
    notification_attempted = False
    notification_success: bool | None = None
    try:
        from routers.consultations import _ensure_consultation_for_lead, _send_clinic_assignment_email
        lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        if lead:
            req = await _ensure_consultation_for_lead(lead, clinic_id)
            # Only notify the new clinic if it's actually a (re)assignment.
            if is_new_assignment:
                notification_attempted = True
                try:
                    await _send_clinic_assignment_email(clinic, req)
                    notification_success = True
                except Exception as email_exc:
                    notification_success = False
                    logging.warning(
                        f"Clinic assignment email failed for lead {lead_id}: {email_exc}"
                    )
    except Exception as exc:
        logging.warning(f"Auto-create consultation_request failed for lead {lead_id}: {exc}")

    # Audit AFTER the update so the lead's prior state is captured.
    if is_new_assignment:
        action = "lead.reassigned_to_clinic" if prev_clinic_id else "lead.assigned_to_clinic"
        severity = "warning" if prev_clinic_id else "info"
        await audit_log(
            action,
            actor=user, actor_type="admin",
            target_type="lead", target_id=lead_id,
            before_state={"assigned_clinic_id": prev_clinic_id},
            after_state={"assigned_clinic_id": clinic_id},
            metadata={
                "previous_clinic_id": prev_clinic_id,
                "new_clinic_id": clinic_id,
                "notification_attempted": notification_attempted,
                "notification_success": notification_success,
            },
            severity=severity, request=request,
        )

    return {"status": "ok", "assigned_to": clinic.get("clinic_name")}


# ─── Clinic Auth & Dashboard ──────────────────────────────

@router.post("/clinic/login", response_model=ClinicTokenResponse, response_model_exclude_none=True, dependencies=[Depends(rate_limit("clinic_login", 5, 300))])
async def clinic_login(data: ClinicLogin, request: Request, response: Response):
    email = data.email.strip().lower()
    clinic = await db.clinics.find_one({"email": email}, {"_id": 0})
    if not clinic or not clinic.get("password_hash"):
        raise HTTPException(status_code=401, detail="Невалидни данни за вход")
    if not verify_password(data.password, clinic["password_hash"]):
        raise HTTPException(status_code=401, detail="Невалидни данни за вход")
    if clinic.get("status") == "paused":
        raise HTTPException(status_code=403, detail="Акаунтът е спрян")
    if clinic.get("archived") is True:
        raise HTTPException(status_code=403, detail="Акаунтът е архивиран")
    token, _jti = await create_clinic_token(clinic["id"], clinic["email"])
    # Always set httpOnly clinic session cookie.
    response.set_cookie(
        key=AUTH_COOKIE_NAME_CLINIC,
        value=token,
        max_age=AUTH_COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        path="/",
    )
    # Omit access_token in cookie-only mode (response_model_exclude_none).
    cookie_required = os.environ.get('AUTH_REQUIRE_COOKIE', '0') == '1'
    if cookie_required:
        return ClinicTokenResponse(user=_clinic_to_out(clinic))
    return ClinicTokenResponse(access_token=token, token_type="bearer", user=_clinic_to_out(clinic))


@router.post("/clinic/logout")
async def clinic_logout(request: Request, response: Response):
    """Idempotent clinic logout (E1 + E5)."""
    had_cookie = bool(request.cookies.get(AUTH_COOKIE_NAME_CLINIC))
    revoked_jti = None
    try:
        from auth import _decode_jwt  # type: ignore
        token = None
        auth_h = request.headers.get("authorization") or ""
        if auth_h.lower().startswith("bearer "):
            token = auth_h[7:].strip()
        if not token:
            token = request.cookies.get(AUTH_COOKIE_NAME_CLINIC)
        if token:
            payload = _decode_jwt(token)
            jti = payload.get("jti")
            if jti and payload.get("role") == "clinic":
                if await revoke_session_by_jti(jti, reason="clinic_logout"):
                    revoked_jti = jti
    except HTTPException:
        pass
    response.delete_cookie(
        key=AUTH_COOKIE_NAME_CLINIC,
        path="/",
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        httponly=True,
    )
    if had_cookie or revoked_jti:
        await audit_log(
            "auth.clinic_logout",
            actor_type="clinic",
            target_type="system",
            target_id=None,
            metadata={"revoked": bool(revoked_jti)},
            severity="info",
            request=request,
        )
    return {"status": "ok", "revoked": bool(revoked_jti)}


@router.post("/clinic/logout-all")
async def clinic_logout_all(
    request: Request, response: Response,
    clinic=Depends(get_current_clinic),
):
    """Revoke EVERY active session for the current clinic (E5)."""
    revoked = await revoke_all_sessions_for_user(
        clinic["id"], "clinic", reason="logout_all",
    )
    response.delete_cookie(
        key=AUTH_COOKIE_NAME_CLINIC,
        path="/",
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        httponly=True,
    )
    await audit_log(
        "auth.clinic_logout_all",
        actor_type="clinic",
        target_type="system", target_id=None,
        metadata={"revoked_count": revoked, "clinic_id": clinic["id"]},
        severity="info", request=request,
    )
    return {"status": "ok", "revoked_count": revoked}


@router.get("/clinic/profile")
async def clinic_profile(clinic=Depends(get_current_clinic)):
    from routers.public_clinics import public_profile_paths
    out = _clinic_to_out(clinic).model_dump()
    # The clinic's own page on zubite.bg; null until it is publicly listed.
    out["public_profile_path"] = (await public_profile_paths([clinic["id"]])).get(clinic["id"])
    return out


@router.patch("/clinic/profile")
async def update_clinic_profile(
    data: ClinicProfileUpdate,
    request: Request,
    clinic=Depends(get_current_clinic),
):
    update_fields = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "viber_enabled" in update_fields or "viber_phone" in update_fields:
        await _apply_viber_update(clinic, data, update_fields)

    await db.clinics.update_one({"id": clinic["id"]}, {"$set": update_fields})
    updated = await db.clinics.find_one({"id": clinic["id"]}, {"_id": 0, "password_hash": 0})
    return _clinic_to_out(updated)


@router.post("/clinic/logo")
async def upload_clinic_logo(
    request: Request,
    file: UploadFile = File(...),
    clinic=Depends(get_current_clinic),
):
    """Logo for co-branding clinic-facing exports (the review poster).
    Mirrors the admin blog-image upload pattern (storage.py + uploaded_files
    + /api/files/{id}) rather than clinic_files (that collection is
    medical-record-shaped — see consultation_chat.py — a logo isn't)."""
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Невалиден тип файл. Позволени: {', '.join(ALLOWED_IMAGE_TYPES.keys())}",
        )
    ext = ALLOWED_IMAGE_TYPES[content_type]
    file_data = await file.read()
    if len(file_data) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файлът е твърде голям. Максимум 2MB.")

    file_id = str(uuid.uuid4())
    storage_path = f"{APP_NAME}/clinic-logos/{file_id}.{ext}"
    result = put_object(storage_path, file_data, content_type)
    file_record = {
        "id": file_id, "storage_path": result["path"], "original_filename": file.filename,
        "content_type": content_type, "size": result["size"],
        "uploaded_by": clinic["id"], "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.uploaded_files.insert_one(file_record)

    previous_logo_file_id = clinic.get("logo_file_id")
    await db.clinics.update_one({"id": clinic["id"]}, {"$set": {"logo_file_id": file_id}})
    if previous_logo_file_id:
        # Superseded, not referenced by anything else — soft-delete rather
        # than leaving an orphaned object in the bucket indefinitely.
        await db.uploaded_files.update_one(
            {"id": previous_logo_file_id}, {"$set": {"is_deleted": True}},
        )

    await audit_log(
        "clinic.logo_uploaded",
        actor_type="clinic",
        target_type="clinic", target_id=clinic["id"],
        target_summary=clinic.get("clinic_name"),
        metadata={"file_id": file_id, "size": result["size"], "content_type": content_type},
        severity="info", request=request,
    )
    return {"logo_url": f"/api/files/{file_id}"}


@router.delete("/clinic/logo")
async def delete_clinic_logo(request: Request, clinic=Depends(get_current_clinic)):
    logo_file_id = clinic.get("logo_file_id")
    if not logo_file_id:
        return {"status": "ok"}
    await db.clinics.update_one({"id": clinic["id"]}, {"$unset": {"logo_file_id": ""}})
    await db.uploaded_files.update_one({"id": logo_file_id}, {"$set": {"is_deleted": True}})
    await audit_log(
        "clinic.logo_removed",
        actor_type="clinic",
        target_type="clinic", target_id=clinic["id"],
        target_summary=clinic.get("clinic_name"),
        severity="info", request=request,
    )
    return {"status": "ok"}


async def _apply_viber_update(
    clinic: dict,
    data: ClinicProfileUpdate,
    update_fields: dict,
) -> None:
    """Validate + normalise the Viber channel fields in place.

    Two rules the clinic cannot talk its way around:
      • the channel belongs to the Growth package, so a Verified profile
        cannot switch it on by POSTing the flag directly;
      • the stored number must be E.164, because it is fed to a
        `viber://chat?number=` deep link that cannot parse the free-text
        phone formats the rest of the platform accepts.
    """
    addons = await db.clinic_addons.find({"clinic_id": clinic["id"]}, {"_id": 0}).to_list(200)
    ents = compute_entitlements(clinic, addons=addons)
    if not ents.get("patient_chat_channels"):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "chat_channels_not_in_package",
                "message": "Viber каналът е част от пакета Growth Partner.",
            },
        )

    if "viber_phone" in update_fields:
        normalised = normalize_msisdn_bg(update_fields["viber_phone"])
        if not normalised:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "invalid_viber_phone",
                    "message": "Въведете валиден номер, напр. 0888 123 456 или +359 88 123 4567.",
                },
            )
        update_fields["viber_phone"] = normalised

    # Turning the channel on requires a number to point it at — either one
    # arriving in this request or one already stored.
    if update_fields.get("viber_enabled") is True:
        number = update_fields.get("viber_phone") or clinic.get("viber_phone")
        if not number:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "viber_phone_required",
                    "message": "Добавете Viber номер, преди да включите канала.",
                },
            )


@router.post("/clinic/change-password")
async def clinic_change_password(
    data: ClinicPasswordChange,
    request: Request,
    clinic=Depends(get_current_clinic_pending_password),
):
    # `get_current_clinic` already validates the JWT, role, and account status.
    # It returns the clinic dict without password_hash, so re-fetch for verification.
    full_clinic = await db.clinics.find_one({"id": clinic["id"]}, {"_id": 0})
    if not full_clinic:
        raise HTTPException(status_code=401, detail="Clinic not found")
    if not verify_password(data.current_password, full_clinic["password_hash"]):
        raise HTTPException(status_code=400, detail="Текущата парола е грешна")
    # Minimum length now enforced by Pydantic (8 chars)
    if data.new_password == data.current_password:
        raise HTTPException(status_code=400, detail="Новата парола трябва да е различна от текущата")
    was_temporary = full_clinic.get("must_change_password") is True
    await db.clinics.update_one(
        {"id": clinic["id"]},
        {"$set": {
            "password_hash": hash_password(data.new_password),
            "must_change_password": False,
            "password_changed_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    await audit_log(
        "clinic.password_changed",
        actor=clinic, actor_type="clinic",
        target_type="clinic", target_id=clinic["id"],
        target_summary=full_clinic.get("clinic_name"),
        metadata={"replaced_temporary_password": was_temporary},
        severity="info", request=request,
    )
    return {"status": "ok", "message": "Паролата е променена успешно"}


@router.get("/clinic/dashboard")
async def clinic_dashboard(clinic=Depends(get_current_clinic)):
    clinic_id = clinic["id"]
    total = await db.leads.count_documents({"assigned_clinic_id": clinic_id})
    contacted = await db.leads.count_documents({"assigned_clinic_id": clinic_id, "clinic_lead_status": "contacted"})
    no_response = await db.leads.count_documents({"assigned_clinic_id": clinic_id, "clinic_lead_status": "no_response"})
    return {"total_leads": total, "leads_contacted": contacted, "leads_pending": total - contacted - no_response, "leads_no_response": no_response}


@router.get("/clinic/leads")
async def clinic_leads(clinic=Depends(get_current_clinic)):
    """Return minimal operational fields only — clinics are partners, not admins.
    DO NOT expose: answers, score_total, band, attribution, utm_*, content_path,
    admin notes, call transcripts, duplicate-detection metadata, internal scoring.
    """
    leads = await db.leads.find(
        {"assigned_clinic_id": clinic["id"]},
        {
            "_id": 0,
            "id": 1,
            "name": 1,
            "phone": 1,
            "email": 1,
            "city_slug": 1,
            "treatment_type": 1,
            "clinic_lead_status": 1,
            "verification_status": 1,
            "created_at": 1,
        },
    ).sort("created_at", -1).to_list(500)
    for lead in leads:
        if not lead.get("clinic_lead_status"):
            lead["clinic_lead_status"] = "new"
    return {"leads": leads}


@router.patch("/clinic/leads/{lead_id}/status")
async def update_clinic_lead_status(lead_id: str, data: ClinicLeadStatusUpdate, clinic=Depends(get_current_clinic)):
    if data.status not in ("new", "contacted", "no_response"):
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.leads.update_one(
        {"id": lead_id, "assigned_clinic_id": clinic["id"]},
        {"$set": {"clinic_lead_status": data.status}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found or not assigned to your clinic")
    return {"status": "ok"}
