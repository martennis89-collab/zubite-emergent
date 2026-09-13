"""Consultation booking API — patient-facing + clinic dashboard +
admin oversight. See `bookings_core.py` for slot generation + email
templates. Feb 2026 booking engine.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field, ConfigDict

try:
    import resend
except Exception:  # pragma: no cover
    resend = None  # type: ignore

from database import db
from auth import get_current_user, get_current_clinic, get_current_patient_optional
from audit import audit_log
from config import RESEND_API_KEY, SENDER_EMAIL, PRODUCTION_URL
from schemas import AdminUser
from entitlements import compute_entitlements
from bookings_core import (
    BOOKING_COL, AVAILABILITY_COL, EXCEPTION_COL,
    BOOKING_STATUSES, BOOKING_SOURCES, CONSULTATION_TYPES,
    DAYS_OF_WEEK, EXCEPTION_TYPES,
    DEFAULT_MIN_LEAD_HOURS, DEFAULT_HORIZON_DAYS,
    DEFAULT_SLOT_MIN, DEFAULT_BUFFER_MIN,
    SOFIA, now_sofia, iso_sofia, parse_hhmm,
    generate_slots,
    patient_confirmation_email, clinic_notification_email,
    patient_reminder_email, clinic_cancellation_email,
)

logger = logging.getLogger("bookings")
router = APIRouter()


# ─── Schemas ────────────────────────────────────────────────────
class AvailabilityRuleCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    doctor_id: Optional[str] = None
    location_id: Optional[str] = None
    day_of_week: str
    start_time: str
    end_time: str
    slot_duration_minutes: int = DEFAULT_SLOT_MIN
    buffer_minutes: int = DEFAULT_BUFFER_MIN
    consultation_type: str = "initial_consultation"
    is_active: bool = True
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None


class ExceptionCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    doctor_id: Optional[str] = None
    date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    type: str = "full_day_block"
    reason: Optional[str] = Field(default=None, max_length=400)


class BookingCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    selected_slot_start: str
    selected_slot_end: Optional[str] = None
    patient_name: str = Field(min_length=1, max_length=200)
    patient_email: EmailStr
    patient_phone: str = Field(min_length=4, max_length=40)
    patient_city: Optional[str] = Field(default=None, max_length=80)
    treatment_category: Optional[str] = Field(default=None, max_length=80)
    patient_concern_summary: Optional[str] = Field(default=None, max_length=1000)
    quiz_context_snapshot: Optional[Dict[str, Any]] = None
    lead_id: Optional[str] = None
    doctor_id: Optional[str] = None
    source: str = "clinic_profile"
    consent_confirmed: bool = False
    not_emergency_confirmed: bool = False


class BookingStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    status: str
    cancel_reason: Optional[str] = Field(default=None, max_length=500)
    internal_notes: Optional[str] = Field(default=None, max_length=2000)


# ─── Helpers ────────────────────────────────────────────────────
async def _load_clinic(clinic_id: str) -> Dict[str, Any]:
    if not clinic_id or not isinstance(clinic_id, str):
        raise HTTPException(status_code=400, detail="Invalid clinic_id")
    c = await db.clinics.find_one({"id": clinic_id}, {"_id": 0, "password_hash": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return c


async def _clinic_addons(clinic_id: str) -> List[Dict[str, Any]]:
    return await db.clinic_addons.find({"clinic_id": clinic_id}, {"_id": 0}).to_list(200)


async def _booking_enabled(clinic: Dict[str, Any]) -> bool:
    addons = await _clinic_addons(clinic["id"])
    ents = compute_entitlements(clinic, addons=addons)
    return bool(ents.get("booking_enabled"))


async def _load_booked_starts(clinic_id: str) -> set[str]:
    """Set of ISO-Sofia start times that are already pending/confirmed."""
    docs = await db.clinic_bookings.find(
        {
            "clinic_id": clinic_id,
            "status": {"$in": ["pending_confirmation", "confirmed", "rescheduled"]},
        },
        {"_id": 0, "selected_slot_start": 1},
    ).to_list(2000)
    return {d.get("selected_slot_start") for d in docs if d.get("selected_slot_start")}


def _fmt_slot(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso).astimezone(SOFIA)
        return dt.strftime("%d.%m.%Y %H:%M")
    except Exception:
        return iso


def _send_email(*, to: str, subject: str, html: str, tag: str) -> bool:
    """Send via Resend if configured. Silent-skip in dev. Returns
    whether the send actually happened."""
    if not RESEND_API_KEY or not resend or not to:
        logger.info(f"[booking-email] skipped ({tag}) — no key / no recipient")
        return False
    try:
        resend.Emails.send({"from": SENDER_EMAIL, "to": to, "subject": subject, "html": html})
        return True
    except Exception as exc:
        logger.warning(f"[booking-email] {tag} send failed: {exc}")
        return False


def _emit_track(name: str, **fields: Any) -> None:
    """Fire-and-forget tracking event. Persisted in the existing
    `analytics_events` collection so it shows up in the admin funnel."""
    doc = {
        "event": name,
        "at": datetime.now(SOFIA).isoformat(),
        **{k: v for k, v in fields.items() if v is not None},
    }
    async def _insert():
        try:
            await db.analytics_events.insert_one(doc)
        except Exception as exc:
            logger.warning(f"[track] {name} insert failed: {exc}")
    asyncio.create_task(_insert())


# ═══════════════════════════════════════════════════════════════
#  Public — slot listing + booking creation
# ═══════════════════════════════════════════════════════════════
@router.get("/public/clinics/{clinic_id}/booking-slots")
async def public_get_availability(
    clinic_id: str,
    days: int = Query(default=DEFAULT_HORIZON_DAYS, ge=1, le=60),
    lead_id: Optional[str] = None,
    treatment_category: Optional[str] = None,
):
    """Materialise `days` worth of slots for the given clinic."""
    clinic = await _load_clinic(clinic_id)
    if not await _booking_enabled(clinic):
        return {"clinic_id": clinic_id, "booking_enabled": False, "slots": []}

    rules = await db.clinic_availability_rules.find({"clinic_id": clinic_id}, {"_id": 0}).to_list(200)
    exceptions = await db.clinic_booking_exceptions.find(
        {"clinic_id": clinic_id},
        {"_id": 0},
    ).to_list(500)
    booked = await _load_booked_starts(clinic_id)
    slots = generate_slots(
        rules=rules, exceptions=exceptions, booked_starts=booked,
        horizon_days=days,
    )
    _emit_track("booking_calendar_opened",
                clinicId=clinic_id, leadId=lead_id,
                treatmentCategory=treatment_category,
                city=clinic.get("city"))
    return {
        "clinic_id": clinic_id,
        "booking_enabled": True,
        "timezone": "Europe/Sofia",
        "min_lead_hours": DEFAULT_MIN_LEAD_HOURS,
        "clinic_name": clinic.get("clinic_name") or clinic.get("name"),
        "city": clinic.get("city"),
        "address": clinic.get("address"),
        "slots": slots,
    }


@router.post("/public/clinics/{clinic_id}/bookings")
async def public_create_booking(
    clinic_id: str,
    body: BookingCreate,
    request: Request,
    patient: Optional[Dict[str, Any]] = Depends(get_current_patient_optional),
):
    clinic = await _load_clinic(clinic_id)
    if not await _booking_enabled(clinic):
        raise HTTPException(status_code=403, detail="Booking is not enabled for this clinic")

    if not body.consent_confirmed:
        raise HTTPException(status_code=400, detail="Consent is required")
    if not body.not_emergency_confirmed:
        raise HTTPException(status_code=400, detail="Not-emergency confirmation is required")
    if body.source not in BOOKING_SOURCES:
        raise HTTPException(status_code=400, detail="Invalid source")

    # Server-side slot validity — re-generate concrete slots and
    # require the submitted `selected_slot_start` to be one of them.
    # Rejects payloads for outside-working-hours, blocked days, or
    # under the min-lead-time; also gives us a defence-in-depth
    # check against a stale client (booking form open across
    # midnight etc.).
    rules = await db.clinic_availability_rules.find({"clinic_id": clinic_id}, {"_id": 0}).to_list(200)
    exceptions = await db.clinic_booking_exceptions.find({"clinic_id": clinic_id}, {"_id": 0}).to_list(500)
    booked = await _load_booked_starts(clinic_id)
    valid_slots = generate_slots(
        rules=rules, exceptions=exceptions, booked_starts=booked,
        horizon_days=60,
    )
    valid_starts = {s["start"] for s in valid_slots}
    if body.selected_slot_start not in valid_starts:
        # If the slot is taken → 409; otherwise it was never offered → 400.
        if body.selected_slot_start in booked:
            raise HTTPException(status_code=409, detail="Slot no longer available")
        raise HTTPException(status_code=400, detail="Slot is not offered by this clinic")

    # Compute end if not supplied — default 30 minutes.
    end_iso = body.selected_slot_end
    if not end_iso:
        try:
            start_dt = datetime.fromisoformat(body.selected_slot_start).astimezone(SOFIA)
            end_iso = iso_sofia(start_dt + timedelta(minutes=DEFAULT_SLOT_MIN))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid selected_slot_start")

    now = datetime.now(SOFIA)
    booking = {
        "id": str(uuid.uuid4()),
        "clinic_id": clinic_id,
        "doctor_id": body.doctor_id,
        "lead_id": body.lead_id,
        # Auto-linked to the logged-in patient account, if any — never
        # trusted from the client (BookingCreate has no patient_id field).
        "patient_id": patient["id"] if patient else None,
        "patient_name": body.patient_name.strip(),
        "patient_email": body.patient_email,
        "patient_phone": body.patient_phone.strip(),
        "patient_city": (body.patient_city or "").strip() or None,
        "treatment_category": (body.treatment_category or "").strip() or None,
        "patient_concern_summary": (body.patient_concern_summary or "").strip() or None,
        "quiz_context_snapshot": body.quiz_context_snapshot or None,
        "selected_slot_start": body.selected_slot_start,
        "selected_slot_end": end_iso,
        "selected_slot_start_display": _fmt_slot(body.selected_slot_start),
        "timezone": "Europe/Sofia",
        "status": "pending_confirmation",
        "source": body.source,
        "confirmation_email_sent_at": None,
        "reminder_email_sent_at": None,
        "clinic_email_sent_at": None,
        "reminder_email_scheduled_for": None,
        "cancel_reason": None,
        "internal_notes": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    # Reminder = start - 24h; skip if the booking is already within 24h.
    try:
        start_dt = datetime.fromisoformat(body.selected_slot_start).astimezone(SOFIA)
        reminder_at = start_dt - timedelta(hours=24)
        if reminder_at > now:
            booking["reminder_email_scheduled_for"] = reminder_at.isoformat()
    except Exception:
        pass

    # Atomic write — the unique partial index on
    # (clinic_id, selected_slot_start) for active statuses is the
    # single source of truth for double-booking prevention. The
    # read-then-write check above catches most collisions early;
    # DuplicateKeyError catches the residual race window.
    try:
        await db.clinic_bookings.insert_one(dict(booking))
    except Exception as exc:  # pragma: no cover — motor raises pymongo.errors.DuplicateKeyError
        from pymongo.errors import DuplicateKeyError
        if isinstance(exc, DuplicateKeyError):
            raise HTTPException(status_code=409, detail="Slot no longer available")
        raise
    _emit_track("booking_submitted",
                clinicId=clinic_id, leadId=body.lead_id, bookingId=booking["id"],
                treatmentCategory=body.treatment_category,
                source=body.source, city=clinic.get("city"),
                packageType=clinic.get("base_package"))

    # Send emails (best-effort).
    subj, html = patient_confirmation_email(booking=booking, clinic=clinic)
    if _send_email(to=body.patient_email, subject=subj, html=html, tag="patient_confirmation"):
        await db.clinic_bookings.update_one(
            {"id": booking["id"]}, {"$set": {"confirmation_email_sent_at": datetime.now(SOFIA).isoformat()}},
        )
        booking["confirmation_email_sent_at"] = datetime.now(SOFIA).isoformat()
        _emit_track("booking_confirmation_email_sent", clinicId=clinic_id, bookingId=booking["id"])

    clinic_email = clinic.get("notification_email") or clinic.get("email")
    if clinic_email:
        booking_url = f"{PRODUCTION_URL}/clinic/dashboard/bookings/{booking['id']}" if PRODUCTION_URL else None
        subj2, html2 = clinic_notification_email(booking=booking, clinic=clinic, booking_url=booking_url)
        if _send_email(to=clinic_email, subject=subj2, html=html2, tag="clinic_notification"):
            await db.clinic_bookings.update_one(
                {"id": booking["id"]}, {"$set": {"clinic_email_sent_at": datetime.now(SOFIA).isoformat()}},
            )
            booking["clinic_email_sent_at"] = datetime.now(SOFIA).isoformat()
            _emit_track("booking_clinic_email_sent", clinicId=clinic_id, bookingId=booking["id"])

    return {"booking": booking}


# ═══════════════════════════════════════════════════════════════
#  Clinic dashboard — availability
# ═══════════════════════════════════════════════════════════════
@router.get("/clinic/availability")
async def clinic_get_availability(clinic: Dict[str, Any] = Depends(get_current_clinic)):
    rules = await db.clinic_availability_rules.find({"clinic_id": clinic["id"]}, {"_id": 0}).to_list(200)
    exceptions = await db.clinic_booking_exceptions.find({"clinic_id": clinic["id"]}, {"_id": 0}).to_list(500)
    addons = await _clinic_addons(clinic["id"])
    ents = compute_entitlements(clinic, addons=addons)
    return {"rules": rules, "exceptions": exceptions, "booking_enabled": bool(ents.get("booking_enabled"))}


@router.post("/clinic/availability/rules")
async def clinic_create_rule(body: AvailabilityRuleCreate, request: Request, clinic: Dict[str, Any] = Depends(get_current_clinic)):
    if not await _booking_enabled(clinic):
        raise HTTPException(status_code=403, detail="Booking not enabled for this clinic")
    if body.day_of_week.lower() not in DAYS_OF_WEEK:
        raise HTTPException(status_code=400, detail="Invalid day_of_week")
    if body.consultation_type not in CONSULTATION_TYPES:
        raise HTTPException(status_code=400, detail="Invalid consultation_type")
    if not parse_hhmm(body.start_time) or not parse_hhmm(body.end_time):
        raise HTTPException(status_code=400, detail="Invalid time")
    if body.slot_duration_minutes < 5 or body.slot_duration_minutes > 240:
        raise HTTPException(status_code=400, detail="Invalid slot duration")
    row = {
        "id": str(uuid.uuid4()),
        "clinic_id": clinic["id"],
        "doctor_id": body.doctor_id,
        "location_id": body.location_id,
        "day_of_week": body.day_of_week.lower(),
        "start_time": body.start_time,
        "end_time": body.end_time,
        "slot_duration_minutes": body.slot_duration_minutes,
        "buffer_minutes": max(0, body.buffer_minutes),
        "consultation_type": body.consultation_type,
        "is_active": body.is_active,
        "valid_from": body.valid_from,
        "valid_until": body.valid_until,
        "timezone": "Europe/Sofia",
        "created_at": datetime.now(SOFIA).isoformat(),
    }
    await db.clinic_availability_rules.insert_one(dict(row))
    await audit_log("availability_rule_created", actor=clinic, actor_type="clinic",
                    target_type="clinic", target_id=clinic["id"],
                    metadata={"day": row["day_of_week"], "consultation_type": row["consultation_type"]},
                    severity="info", request=request)
    return {"rule": row}


@router.patch("/clinic/availability/rules/{rule_id}")
async def clinic_update_rule(rule_id: str, patch: Dict[str, Any], clinic: Dict[str, Any] = Depends(get_current_clinic)):
    existing = await db.clinic_availability_rules.find_one({"id": rule_id, "clinic_id": clinic["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Rule not found")
    allowed = {"start_time", "end_time", "slot_duration_minutes", "buffer_minutes",
               "consultation_type", "is_active", "valid_from", "valid_until",
               "day_of_week", "doctor_id", "location_id"}
    upd = {k: v for k, v in patch.items() if k in allowed}
    if "day_of_week" in upd and upd["day_of_week"] not in DAYS_OF_WEEK:
        raise HTTPException(status_code=400, detail="Invalid day_of_week")
    if "consultation_type" in upd and upd["consultation_type"] not in CONSULTATION_TYPES:
        raise HTTPException(status_code=400, detail="Invalid consultation_type")
    if not upd:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.clinic_availability_rules.update_one({"id": rule_id}, {"$set": upd})
    return {"ok": True}


@router.delete("/clinic/availability/rules/{rule_id}")
async def clinic_delete_rule(rule_id: str, clinic: Dict[str, Any] = Depends(get_current_clinic)):
    r = await db.clinic_availability_rules.delete_one({"id": rule_id, "clinic_id": clinic["id"]})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"ok": True}


@router.post("/clinic/availability/exceptions")
async def clinic_create_exception(body: ExceptionCreate, clinic: Dict[str, Any] = Depends(get_current_clinic)):
    if not await _booking_enabled(clinic):
        raise HTTPException(status_code=403, detail="Booking not enabled for this clinic")
    if body.type not in EXCEPTION_TYPES:
        raise HTTPException(status_code=400, detail="Invalid exception type")
    row = {
        "id": str(uuid.uuid4()),
        "clinic_id": clinic["id"],
        "doctor_id": body.doctor_id,
        "date": body.date,
        "start_time": body.start_time,
        "end_time": body.end_time,
        "type": body.type,
        "reason": body.reason,
        "created_at": datetime.now(SOFIA).isoformat(),
    }
    await db.clinic_booking_exceptions.insert_one(dict(row))
    return {"exception": row}


@router.delete("/clinic/availability/exceptions/{exception_id}")
async def clinic_delete_exception(exception_id: str, clinic: Dict[str, Any] = Depends(get_current_clinic)):
    r = await db.clinic_booking_exceptions.delete_one({"id": exception_id, "clinic_id": clinic["id"]})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Exception not found")
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════
#  Clinic dashboard — bookings
# ═══════════════════════════════════════════════════════════════
@router.get("/clinic/bookings")
async def clinic_list_bookings(clinic: Dict[str, Any] = Depends(get_current_clinic)):
    docs = await db.clinic_bookings.find({"clinic_id": clinic["id"]}, {"_id": 0}).sort("selected_slot_start", 1).to_list(500)
    return {"bookings": docs}


@router.patch("/clinic/bookings/{booking_id}")
async def clinic_update_booking(booking_id: str, patch: BookingStatusUpdate, request: Request, clinic: Dict[str, Any] = Depends(get_current_clinic)):
    b = await db.clinic_bookings.find_one({"id": booking_id, "clinic_id": clinic["id"]}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    if patch.status not in BOOKING_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    upd: Dict[str, Any] = {"status": patch.status, "updated_at": datetime.now(SOFIA).isoformat()}
    if patch.cancel_reason:
        upd["cancel_reason"] = patch.cancel_reason
    await db.clinic_bookings.update_one({"id": booking_id}, {"$set": upd})
    # Fire tracking event.
    _emit_track(f"booking_{patch.status}", clinicId=clinic["id"], bookingId=booking_id)
    # Cancellation email if clinic cancelled.
    if patch.status == "cancelled_by_clinic":
        subj, html = clinic_cancellation_email(booking={**b, **upd}, clinic=clinic)
        _send_email(to=b.get("patient_email"), subject=subj, html=html, tag="patient_cancellation")
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════
#  Admin
# ═══════════════════════════════════════════════════════════════
@router.get("/admin/bookings")
async def admin_list_bookings(
    clinic_id: Optional[str] = None,
    city: Optional[str] = None,
    status: Optional[str] = None,
    treatment_category: Optional[str] = None,
    source: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    reminder_sent: Optional[str] = None,
    user: AdminUser = Depends(get_current_user),
):
    q: Dict[str, Any] = {}
    if clinic_id:
        q["clinic_id"] = clinic_id
    if status:
        q["status"] = status
    if treatment_category:
        q["treatment_category"] = treatment_category
    if source:
        q["source"] = source
    if date_from:
        q.setdefault("selected_slot_start", {})["$gte"] = date_from
    if date_to:
        q.setdefault("selected_slot_start", {})["$lte"] = date_to
    if reminder_sent == "yes":
        q["reminder_email_sent_at"] = {"$ne": None}
    if reminder_sent == "no":
        q["reminder_email_sent_at"] = None
    if city and not clinic_id:
        # City filter joins on the clinic — resolve clinic ids first.
        # If clinic_id is ALSO passed we prefer the explicit id and
        # ignore city (previous logic accidentally overwrote clinic_id
        # with itself, causing an inert filter; documented in review).
        cids = [c["id"] async for c in db.clinics.find({"city": city}, {"_id": 0, "id": 1})]
        q["clinic_id"] = {"$in": cids}
    docs = await db.clinic_bookings.find(q, {"_id": 0}).sort("selected_slot_start", -1).to_list(500)
    return {"bookings": docs}


@router.post("/admin/bookings/{booking_id}/resend-confirmation")
async def admin_resend_confirmation(booking_id: str, user: AdminUser = Depends(get_current_user)):
    b = await db.clinic_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    clinic = await _load_clinic(b["clinic_id"])
    subj, html = patient_confirmation_email(booking=b, clinic=clinic)
    _send_email(to=b.get("patient_email"), subject=subj, html=html, tag="patient_confirmation_resend")
    return {"ok": True}


@router.post("/admin/bookings/{booking_id}/resend-clinic")
async def admin_resend_clinic_email(booking_id: str, user: AdminUser = Depends(get_current_user)):
    b = await db.clinic_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    clinic = await _load_clinic(b["clinic_id"])
    subj, html = clinic_notification_email(booking=b, clinic=clinic)
    _send_email(to=clinic.get("notification_email") or clinic.get("email"), subject=subj, html=html, tag="clinic_notification_resend")
    return {"ok": True}


@router.post("/admin/bookings/{booking_id}/send-reminder")
async def admin_send_reminder(booking_id: str, user: AdminUser = Depends(get_current_user)):
    b = await db.clinic_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    clinic = await _load_clinic(b["clinic_id"])
    subj, html = patient_reminder_email(booking=b, clinic=clinic)
    ok = _send_email(to=b.get("patient_email"), subject=subj, html=html, tag="patient_reminder_manual")
    if ok:
        await db.clinic_bookings.update_one({"id": booking_id}, {"$set": {"reminder_email_sent_at": datetime.now(SOFIA).isoformat()}})
    return {"ok": ok}


# ═══════════════════════════════════════════════════════════════
#  Background reminder loop — 24h before appointment
# ═══════════════════════════════════════════════════════════════
_REMINDER_LOOP_STARTED = False


async def reminder_loop(interval_seconds: int = 300):
    """Poll every `interval_seconds` (default 5m) for bookings whose
    reminder is due and not yet sent. Runs forever."""
    global _REMINDER_LOOP_STARTED
    if _REMINDER_LOOP_STARTED:
        return
    _REMINDER_LOOP_STARTED = True
    logger.info(f"[reminder-loop] started; interval={interval_seconds}s")
    while True:
        try:
            now_iso = datetime.now(SOFIA).isoformat()
            due = await db.clinic_bookings.find({
                "reminder_email_scheduled_for": {"$ne": None, "$lte": now_iso},
                "reminder_email_sent_at": None,
                # Don't spam-retry a send that already failed once —
                # admins can trigger a manual resend via the admin
                # bookings action button.
                "reminder_email_status": {"$ne": "send_failed"},
                "status": {"$in": ["pending_confirmation", "confirmed"]},
            }, {"_id": 0}).to_list(200)
            for b in due:
                clinic = await db.clinics.find_one({"id": b["clinic_id"]}, {"_id": 0, "password_hash": 0})
                if not clinic:
                    continue
                subj, html = patient_reminder_email(booking=b, clinic=clinic)
                ok = _send_email(to=b.get("patient_email"), subject=subj, html=html, tag="patient_reminder_auto")
                # Keep the ISO field pure — write a datetime iff sent
                # ok. Failures are tracked in a separate status field
                # so admin `reminder_sent=yes` filter (which tests
                # for `reminder_email_sent_at != null`) is not
                # polluted by broken sends.
                update: Dict[str, Any] = {}
                if ok:
                    update["reminder_email_sent_at"] = datetime.now(SOFIA).isoformat()
                    update["reminder_email_status"] = "sent"
                else:
                    update["reminder_email_status"] = "send_failed"
                    update["reminder_email_last_error_at"] = datetime.now(SOFIA).isoformat()
                await db.clinic_bookings.update_one({"id": b["id"]}, {"$set": update})
                if ok:
                    _emit_track("booking_reminder_email_sent",
                                clinicId=b["clinic_id"], bookingId=b["id"])
        except Exception as exc:
            logger.warning(f"[reminder-loop] iteration error: {exc}")
        await asyncio.sleep(interval_seconds)
