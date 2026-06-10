"""Online Orientation Bookings router (Phase E — June 2026).

Patient-facing booking-request flow + clinic-side actions + admin
overview. Care Pass is NEVER unlocked here — that's Phase F. Care Pass
lead fields are left untouched in Phase E (`lead.consultation_booked_through_zubite`
is set to `True` on first patient submit so we can render an "we're
waiting on the clinic" badge, but `care_pass_unlocked` stays `False`).

Endpoints
─────────
Patient (no auth, lead-id gated):
  GET  /api/leads/{lead_id}/eligible-orientation-clinics
  POST /api/leads/{lead_id}/online-orientation-bookings
  POST /api/leads/{lead_id}/online-orientation-bookings/{booking_id}/cancel

Clinic (clinic session):
  GET  /api/clinic/online-orientation-bookings
  POST /api/clinic/online-orientation-bookings/{booking_id}/action

Admin (admin session):
  GET  /api/admin/online-orientation-bookings
  POST /api/admin/online-orientation-bookings/{booking_id}/action

Collections
───────────
  - online_orientation_bookings
  - clinic_online_orientation_settings  (Phase D)
  - clinic_online_orientation_availability  (Phase D)
"""

from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from database import db
from schemas import (
    AdminUser,
    OnlineOrientationBookingCreate,
    OnlineOrientationBookingClinicAction,
    OnlineOrientationBookingAdminAction,
    ORIENTATION_BOOKING_STATUS_VALUES,
    ORIENTATION_BOOKING_ACTIVE_LOCK_STATUSES,
    ORIENTATION_TOPIC_LABELS_BG,
    ORIENTATION_TREATMENT_CATEGORIES,
)
from auth import get_current_user, get_current_clinic
from audit import audit_log
from orientation_access import get_online_orientation_access_status
from orientation_slots import (
    expire_pending_bookings, generate_slots_for_clinic,
    SLOT_HORIZON_DAYS, SOFIA_TZ,
)
from care_pass import unlock_care_pass_for_lead
from emails import _send_email
from config import RESEND_API_KEY, ADMIN_EMAIL, PRODUCTION_URL, SENDER_EMAIL
from rate_limit import rate_limit

logger = logging.getLogger(__name__)

router = APIRouter()

SETTINGS_COL = "clinic_online_orientation_settings"
AVAIL_COL = "clinic_online_orientation_availability"
BOOKING_COL = "online_orientation_bookings"


# ─── Helpers ──────────────────────────────────────────────

def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


def _strip_mongo(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in doc.items() if k != "_id"}


def _clinic_active_for_routing(clinic: Dict[str, Any], settings: Dict[str, Any]) -> bool:
    """Reuse Phase D access helper — clinic is patient-routable only if
    `included_in_plan` or `addon_enabled`."""
    rep = get_online_orientation_access_status(clinic, settings)
    return rep["status"] in ("included_in_plan", "addon_enabled")


async def _load_lead_or_404(lead_id: str) -> Dict[str, Any]:
    if not isinstance(lead_id, str) or not lead_id.strip():
        raise HTTPException(status_code=400, detail="Invalid lead_id")
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


async def _guard_lead_unlocked(lead: Dict[str, Any]) -> None:
    """Booking flow is gated on the same MVP unlock invariants as
    Phase B: contact submitted + full result unlocked. PII still lives
    server-side and is never echoed back to the patient browser."""
    if not lead.get("contact_details_submitted") or not lead.get("full_result_unlocked"):
        raise HTTPException(
            status_code=403,
            detail={"code": "lead_not_unlocked",
                    "message": "Заявката изисква завършен куиз и попълнени контакти."},
        )


def _public_booking(b: Dict[str, Any], *, audience: str) -> Dict[str, Any]:
    """audience ∈ {patient, clinic, admin}.

    - patient: NEVER receives phone/email/internal_clinic_note/quiz_summary.
    - clinic: receives full PII (their own booking).
    - admin:  receives everything.
    """
    out = {
        "id": b.get("id"),
        "clinic_id": b.get("clinic_id"),
        "lead_id": b.get("lead_id"),
        "status": b.get("status"),
        "topic": b.get("topic"),
        "topic_label_bg": ORIENTATION_TOPIC_LABELS_BG.get(b.get("topic") or "", b.get("topic")),
        "treatment_category": b.get("treatment_category"),
        "scheduled_at": b.get("scheduled_at"),
        "duration_minutes": b.get("duration_minutes"),
        "created_at": b.get("created_at"),
        "updated_at": b.get("updated_at"),
        "expires_at": b.get("expires_at"),
        "expired_at": b.get("expired_at"),
        "clinic_confirmed_at": b.get("clinic_confirmed_at"),
    }
    if audience == "patient":
        return out
    out.update({
        "patient_name": b.get("patient_name"),
        "patient_phone": b.get("patient_phone"),
        "patient_email": b.get("patient_email"),
        "patient_note": b.get("patient_note"),
        "quiz_summary": b.get("quiz_summary"),
        "internal_clinic_note": b.get("internal_clinic_note"),
        "confirmed_by_clinic_user_id": b.get("confirmed_by_clinic_user_id"),
    })
    if audience == "admin":
        out["clinic_name"] = b.get("_clinic_name")
    return out


async def _enrich_with_clinic_name(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    ids = list({r["clinic_id"] for r in rows if r.get("clinic_id")})
    if not ids:
        return rows
    cur = db.clinics.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "clinic_name": 1, "name": 1})
    by_id = {c["id"]: (c.get("clinic_name") or c.get("name")) async for c in cur}
    for r in rows:
        r["_clinic_name"] = by_id.get(r.get("clinic_id"))
    return rows


# ─── Patient: eligible clinics + slots ────────────────────

@router.get("/leads/{lead_id}/eligible-orientation-clinics")
async def patient_list_eligible_clinics(lead_id: str, request: Request):
    """Return every patient-routable clinic with available slots in the
    next 14 days. Never exposes PII or admin reasons. Lazy-expires
    pending bookings before recomputing slot availability."""
    lead = await _load_lead_or_404(lead_id)
    await _guard_lead_unlocked(lead)
    await expire_pending_bookings(db)  # global sweep — cheap

    # All clinics that have a settings doc with `enabled=True` are
    # candidates. We then filter by Phase D access helper.
    candidates = await db.get_collection(SETTINGS_COL).find(
        {"enabled": True}, {"_id": 0},
    ).to_list(500)

    out: List[Dict[str, Any]] = []
    for s in candidates:
        clinic = await db.clinics.find_one(
            {"id": s["clinic_id"]},
            {"_id": 0, "password_hash": 0},
        )
        if not clinic:
            continue
        if not _clinic_active_for_routing(clinic, s):
            continue
        # Conservative category match (Phase E rule from spec): show
        # only clinics that have `general_orientation` in eligible
        # categories — Phase F/G will refine to per-treatment matching.
        cats = s.get("eligible_treatment_categories") or []
        if "general_orientation" not in cats:
            continue
        avail = await db.get_collection(AVAIL_COL).find(
            {"clinic_id": clinic["id"]}, {"_id": 0},
        ).to_list(200)
        slots = await generate_slots_for_clinic(
            db, clinic["id"], s, avail,
            horizon_days=SLOT_HORIZON_DAYS, max_slots=18,
        )
        if not slots:
            continue
        out.append({
            "clinic_id": clinic["id"],
            "clinic_name": clinic.get("clinic_name") or clinic.get("name") or "Клиника",
            "city": clinic.get("city") or clinic.get("city_slug"),
            "city_slug": clinic.get("city_slug"),
            "public_description": s.get("public_description") or None,
            "disclaimer_text": s.get("disclaimer_text") or None,
            "slot_duration_minutes": s.get("slot_duration_minutes") or 20,
            "eligible_treatment_categories": cats,
            "slots": slots,
        })

    return {
        "lead_id": lead_id,
        "clinics": out,
        "topic_options": [
            {"value": k, "label": v} for k, v in ORIENTATION_TOPIC_LABELS_BG.items()
        ],
        "allowed_treatment_categories": list(ORIENTATION_TREATMENT_CATEGORIES),
    }


@router.post(
    "/leads/{lead_id}/online-orientation-bookings",
    dependencies=[Depends(rate_limit("orient_book_create", 6, 600))],
)
async def patient_create_booking(
    lead_id: str,
    payload: OnlineOrientationBookingCreate,
    request: Request,
):
    """Create a booking request in `pending_clinic_confirmation`.
    Holds a soft lock on the slot for 24h. NO Care Pass change."""
    lead = await _load_lead_or_404(lead_id)
    await _guard_lead_unlocked(lead)

    if not payload.consent_confirmed:
        raise HTTPException(
            status_code=422,
            detail={"code": "consent_required",
                    "message": "Моля, потвърди съгласието си преди да изпратиш заявката."},
        )
    if not payload.disclaimer_acknowledged:
        raise HTTPException(
            status_code=422,
            detail={"code": "disclaimer_required",
                    "message": "Моля, потвърди, че онлайн ориентацията не замества физически преглед."},
        )

    clinic = await db.clinics.find_one(
        {"id": payload.clinic_id}, {"_id": 0, "password_hash": 0},
    )
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    settings = await db.get_collection(SETTINGS_COL).find_one(
        {"clinic_id": clinic["id"]}, {"_id": 0},
    )
    if not settings or not _clinic_active_for_routing(clinic, settings):
        raise HTTPException(
            status_code=400,
            detail={"code": "clinic_not_eligible",
                    "message": "Тази клиника не приема онлайн заявки в момента."},
        )

    # Validate scheduled_at format
    try:
        slot_dt = datetime.fromisoformat(payload.scheduled_at.replace("Z", "+00:00"))
        if slot_dt.tzinfo is None:
            slot_dt = slot_dt.replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(status_code=422, detail={"code": "invalid_scheduled_at"})

    slot_iso = slot_dt.astimezone(timezone.utc).isoformat()
    # Lazy expiry so the "still locked?" check sees current truth.
    await expire_pending_bookings(db, clinic_id=clinic["id"])
    locked = await db.get_collection(BOOKING_COL).find_one({
        "clinic_id": clinic["id"],
        "scheduled_at": slot_iso,
        "status": {"$in": list(ORIENTATION_BOOKING_ACTIVE_LOCK_STATUSES)},
    }, {"_id": 0, "id": 1})
    if locked:
        raise HTTPException(
            status_code=409,
            detail={"code": "slot_already_locked",
                    "message": "Този час е вече зает. Моля, избери друг."},
        )

    # Build quiz_summary safely (no PII).
    answers = lead.get("answers") or {}
    quiz_summary = {
        "band": lead.get("band"),
        "score_total": lead.get("score_total"),
        "segment": answers.get("segment"),
        "primary_concern": answers.get("primary_concern") or answers.get("q1_concern"),
    }

    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=24)
    duration = int(settings.get("slot_duration_minutes") or 20)
    doc = {
        "id": _new_id(),
        "clinic_id": clinic["id"],
        "lead_id": lead_id,
        # PII pulled server-side from the lead — never accepted in the
        # POST body (defence-in-depth).
        "patient_name": lead.get("name"),
        "patient_phone": lead.get("phone"),
        "patient_email": lead.get("email"),
        "topic": payload.topic,
        "treatment_category": payload.treatment_category,
        "scheduled_at": slot_iso,
        "duration_minutes": duration,
        "status": "pending_clinic_confirmation",
        "quiz_summary": quiz_summary,
        "internal_clinic_note": None,
        "patient_note": payload.patient_note,
        "clinic_confirmed_at": None,
        "confirmed_by_clinic_user_id": None,
        "expires_at": expires.isoformat(),
        "expired_at": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.get_collection(BOOKING_COL).insert_one({**doc})

    # Mark on the lead (Phase E only — does NOT touch care_pass_*).
    try:
        await db.leads.update_one(
            {"id": lead_id},
            {"$set": {
                "consultation_booked_through_zubite": True,
                "consultation_type": "online_orientation",
                "updated_at": now.isoformat(),
            }},
        )
    except Exception as exc:
        logger.warning(f"lead.consultation_booked_through_zubite update failed: {exc}")

    # Emails — best-effort, never block on failure.
    if RESEND_API_KEY:
        try:
            await _send_clinic_new_booking_email(clinic, doc)
        except Exception as exc:
            logger.warning(f"clinic email failed: {exc}")
        try:
            await _send_patient_booking_received_email(lead, clinic, doc)
        except Exception as exc:
            logger.warning(f"patient email failed: {exc}")
        try:
            if ADMIN_EMAIL:
                await _send_admin_booking_email(clinic, doc)
        except Exception as exc:
            logger.warning(f"admin email failed: {exc}")

    return {
        "booking": _public_booking(doc, audience="patient"),
        "message": "Заявката за онлайн час е изпратена. Клиниката ще я прегледа и потвърди.",
    }


@router.post("/leads/{lead_id}/online-orientation-bookings/{booking_id}/cancel")
async def patient_cancel_booking(lead_id: str, booking_id: str, request: Request):
    """Patient can cancel their own pending or confirmed booking."""
    lead = await _load_lead_or_404(lead_id)
    await _guard_lead_unlocked(lead)
    b = await db.get_collection(BOOKING_COL).find_one(
        {"id": booking_id, "lead_id": lead_id}, {"_id": 0},
    )
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    if b["status"] not in ORIENTATION_BOOKING_ACTIVE_LOCK_STATUSES:
        return {"booking": _public_booking(b, audience="patient")}
    now = _now_utc_iso()
    await db.get_collection(BOOKING_COL).update_one(
        {"id": booking_id},
        {"$set": {"status": "cancelled_by_patient", "updated_at": now}},
    )
    b["status"] = "cancelled_by_patient"
    b["updated_at"] = now
    return {"booking": _public_booking(b, audience="patient")}


# ─── Clinic: list + action ────────────────────────────────

@router.get("/clinic/online-orientation-bookings")
async def clinic_list_bookings(
    request: Request,
    clinic: Dict[str, Any] = Depends(get_current_clinic),
):
    await expire_pending_bookings(db, clinic_id=clinic["id"])
    cur = db.get_collection(BOOKING_COL).find(
        {"clinic_id": clinic["id"]}, {"_id": 0},
    ).sort("scheduled_at", 1)
    rows = await cur.to_list(500)
    return {
        "bookings": [_public_booking(r, audience="clinic") for r in rows],
    }


_ACTION_TRANSITIONS: Dict[str, str] = {
    "confirm": "confirmed_by_clinic",
    "reject": "rejected_by_clinic",
    "cancel": "cancelled_by_clinic",
    "mark_completed": "completed",
    "mark_no_show": "no_show",
    "mark_converted_to_in_clinic": "converted_to_in_clinic",
    "mark_not_suitable": "not_suitable",
}


def _apply_action(b: Dict[str, Any], action: str, *, actor_id: Optional[str], note: Optional[str]) -> Dict[str, Any]:
    """Pure update-builder. Returns the `$set` dict; never mutates `b`."""
    now = _now_utc_iso()
    upd: Dict[str, Any] = {"updated_at": now}
    if action == "add_note":
        if note is None:
            return upd
        upd["internal_clinic_note"] = note
        return upd
    new_status = _ACTION_TRANSITIONS.get(action)
    if not new_status:
        return upd
    upd["status"] = new_status
    if action == "confirm":
        upd["clinic_confirmed_at"] = now
        if actor_id:
            upd["confirmed_by_clinic_user_id"] = actor_id
    if note is not None:
        upd["internal_clinic_note"] = note
    return upd


@router.post("/clinic/online-orientation-bookings/{booking_id}/action")
async def clinic_booking_action(
    booking_id: str,
    payload: OnlineOrientationBookingClinicAction,
    request: Request,
    clinic: Dict[str, Any] = Depends(get_current_clinic),
):
    b = await db.get_collection(BOOKING_COL).find_one(
        {"id": booking_id, "clinic_id": clinic["id"]}, {"_id": 0},
    )
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    if b["status"] in {"completed", "no_show", "converted_to_in_clinic", "not_suitable",
                       "cancelled_by_patient", "rejected_by_clinic", "expired_pending_confirmation"}:
        if payload.action != "add_note":
            raise HTTPException(
                status_code=400,
                detail={"code": "terminal_status",
                        "message": "Заявката е във финален статус и не може да бъде променяна."},
            )
    upd = _apply_action(b, payload.action, actor_id=clinic.get("id"), note=payload.note)
    await db.get_collection(BOOKING_COL).update_one(
        {"id": booking_id}, {"$set": upd},
    )
    new_doc = {**b, **upd}

    # Phase F — Care Pass unlock trigger.
    # On the FIRST clinic `confirm` we unlock Care Pass via the
    # centralised helper. Helper is idempotent: a repeated confirm
    # (e.g. clinic double-click, admin override re-confirm) returns
    # `already_unlocked` without sending duplicate emails or moving
    # the original `care_pass_unlocked_at` timestamp.
    if payload.action == "confirm" and b.get("lead_id"):
        try:
            await unlock_care_pass_for_lead(
                b["lead_id"],
                consultation_type="online_orientation",
                clinic_id=clinic.get("id"),
                source_booking_id=booking_id,
                actor_type="clinic", actor_id=clinic.get("id"),
                request=request,
            )
        except Exception as exc:
            logger.warning(f"care_pass unlock failed: {exc}")

    # Patient-side notifications on key transitions.
    if RESEND_API_KEY and payload.action in {"confirm", "reject", "cancel"}:
        try:
            await _send_patient_status_email(new_doc)
        except Exception as exc:
            logger.warning(f"patient status email failed: {exc}")

    try:
        await audit_log(
            f"orientation_booking_{payload.action}",
            actor_type="clinic", actor_id=clinic.get("id"),
            target_type="online_orientation_booking", target_id=booking_id,
            before_state={"status": b["status"]},
            after_state={"status": new_doc["status"]},
            severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"audit failed: {exc}")

    return {"booking": _public_booking(new_doc, audience="clinic")}


# ─── Admin: list + override action ────────────────────────

@router.get("/admin/online-orientation-bookings")
async def admin_list_bookings(
    status: Optional[str] = None,
    clinic_id: Optional[str] = None,
    user: AdminUser = Depends(get_current_user),
):
    await expire_pending_bookings(db)
    q: Dict[str, Any] = {}
    if status:
        if status not in ORIENTATION_BOOKING_STATUS_VALUES:
            raise HTTPException(status_code=400, detail="Invalid status")
        q["status"] = status
    if clinic_id:
        q["clinic_id"] = clinic_id
    rows = await db.get_collection(BOOKING_COL).find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    rows = await _enrich_with_clinic_name(rows)
    return {
        "bookings": [_public_booking(r, audience="admin") for r in rows],
        "allowed_statuses": list(ORIENTATION_BOOKING_STATUS_VALUES),
    }


@router.post("/admin/online-orientation-bookings/{booking_id}/action")
async def admin_booking_action(
    booking_id: str,
    payload: OnlineOrientationBookingAdminAction,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    b = await db.get_collection(BOOKING_COL).find_one(
        {"id": booking_id}, {"_id": 0},
    )
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    upd = _apply_action(b, payload.action, actor_id=None, note=payload.note)
    # Admin-only manual slot release (e.g. stuck pending).
    if payload.release_slot and b.get("status") in ORIENTATION_BOOKING_ACTIVE_LOCK_STATUSES:
        upd["status"] = "cancelled_by_clinic"  # treat as released
    await db.get_collection(BOOKING_COL).update_one(
        {"id": booking_id}, {"$set": upd},
    )
    new_doc = {**b, **upd}
    # Phase F — admin override confirm also unlocks Care Pass (idempotent).
    if payload.action == "confirm" and b.get("lead_id"):
        try:
            await unlock_care_pass_for_lead(
                b["lead_id"],
                consultation_type="online_orientation",
                clinic_id=b.get("clinic_id"),
                source_booking_id=booking_id,
                actor_type="admin", actor_id=getattr(user, "id", None),
                request=request,
            )
        except Exception as exc:
            logger.warning(f"care_pass unlock (admin) failed: {exc}")
    try:
        await audit_log(
            f"admin_orientation_booking_{payload.action}",
            actor=user, actor_type="admin",
            target_type="online_orientation_booking", target_id=booking_id,
            before_state={"status": b["status"]},
            after_state={"status": new_doc["status"]},
            severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"audit failed: {exc}")
    new_doc = (await _enrich_with_clinic_name([new_doc]))[0]
    return {"booking": _public_booking(new_doc, audience="admin")}


# ─── Email helpers (best-effort) ──────────────────────────

def _booking_summary_html(booking: Dict[str, Any], clinic: Dict[str, Any]) -> str:
    return f"""
    <ul>
      <li><strong>Клиника:</strong> {clinic.get('clinic_name') or clinic.get('name') or '—'}</li>
      <li><strong>Тема:</strong> {ORIENTATION_TOPIC_LABELS_BG.get(booking.get('topic') or '', booking.get('topic'))}</li>
      <li><strong>Час (UTC):</strong> {booking.get('scheduled_at')}</li>
      <li><strong>Статус:</strong> {booking.get('status')}</li>
    </ul>
    """


async def _send_clinic_new_booking_email(clinic: Dict[str, Any], booking: Dict[str, Any]) -> None:
    to = clinic.get("notification_email") or clinic.get("email")
    if not to:
        return
    base = PRODUCTION_URL or "https://zubite.bg"
    html = f"""
    <p>Здравейте,</p>
    <p>Получихте нова заявка за безплатна онлайн ориентация чрез Zubite.bg.</p>
    {_booking_summary_html(booking, clinic)}
    <p><a href="{base}/clinic/dashboard/online-orientation">Отвори таблото</a></p>
    """
    await _send_email(to, "Нова заявка за онлайн ориентация — Zubite.bg", html, sender=SENDER_EMAIL)


async def _send_patient_booking_received_email(lead: Dict[str, Any], clinic: Dict[str, Any], booking: Dict[str, Any]) -> None:
    to = lead.get("email")
    if not to:
        return
    html = f"""
    <p>Здравей,</p>
    <p>Получихме твоята заявка за безплатна онлайн ориентация. Клиниката ще я прегледа и потвърди.</p>
    {_booking_summary_html(booking, clinic)}
    <p>—<br/>Екипът на Zubite.bg</p>
    """
    await _send_email(to, "Заявка за онлайн ориентация изпратена — Zubite.bg", html, sender=SENDER_EMAIL)


async def _send_patient_status_email(booking: Dict[str, Any]) -> None:
    to = booking.get("patient_email")
    if not to:
        return
    status = booking.get("status")
    subject = {
        "confirmed_by_clinic": "Заявката ти е потвърдена — Zubite.bg",
        "rejected_by_clinic": "Заявката ти не може да бъде приета — Zubite.bg",
        "cancelled_by_clinic": "Заявката ти беше отменена — Zubite.bg",
    }.get(status, "Промяна по заявката — Zubite.bg")
    html = f"<p>Статусът на твоята заявка е обновен: <strong>{status}</strong>.</p>"
    await _send_email(to, subject, html, sender=SENDER_EMAIL)


async def _send_admin_booking_email(clinic: Dict[str, Any], booking: Dict[str, Any]) -> None:
    if not ADMIN_EMAIL:
        return
    html = f"<p>Нова заявка за онлайн ориентация.</p>{_booking_summary_html(booking, clinic)}"
    await _send_email(ADMIN_EMAIL, "Нова заявка за онлайн ориентация (admin)", html, sender=SENDER_EMAIL)
