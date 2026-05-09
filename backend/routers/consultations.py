"""Consultation Workflow Router (Feb 2026).

Implements the clinic-side consultation management MVP described in the spec:
- Clinic-isolated workflow on top of `consultation_requests` collection
- Internal Zubite calendar (`clinic_appointments`)
- Immutable event log (`consultation_events`)
- Auto-creation of ConsultationRequest when admin assigns a Lead to a clinic
- Admin endpoints for clinics CRUD + consultation request management

Lead workflow (existing) is preserved — this router adds a parallel
consultation workflow that is *linked back* to leads via `lead_id`.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from database import db
from schemas import (
    AdminUser,
    ClinicCreate, ClinicAdminUpdate,
    ConsultationRequestCreate, ConsultationAssignClinic, ConsultationAdminPatch,
    ConsultationActionRequest,
    ClinicAppointmentCreate, ClinicAppointmentPatch,
    CLINIC_STATUS_VALUES, SUBSCRIPTION_STATUS_VALUES,
    CONSULTATION_STATUS_VALUES, APPOINTMENT_STATUS_VALUES,
    APPOINTMENT_TYPE_VALUES, ACTION_TYPE_VALUES,
)
from auth import get_current_user, get_current_clinic, hash_password
from emails import _send_email  # internal helper; safe wrapper
from config import RESEND_API_KEY, SENDER_EMAIL, PRODUCTION_URL

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Helpers ──────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


def _public_clinic_dict(c: Dict[str, Any]) -> Dict[str, Any]:
    """Return a clinic doc without password_hash and without _id."""
    out = {k: v for k, v in c.items() if k not in ("_id", "password_hash")}
    return out


async def _log_event(
    request_id: str,
    event_type: str,
    *,
    clinic_id: Optional[str] = None,
    user_id: Optional[str] = None,
    previous_status: Optional[str] = None,
    new_status: Optional[str] = None,
    note: Optional[str] = None,
) -> None:
    doc = {
        "id": _new_id(),
        "consultation_request_id": request_id,
        "clinic_id": clinic_id,
        "user_id": user_id,
        "event_type": event_type,
        "previous_status": previous_status,
        "new_status": new_status,
        "note": note,
        "created_at": _now_iso(),
    }
    await db.consultation_events.insert_one(doc)


def _treatment_interest_from_lead(lead: Dict[str, Any]) -> str:
    """Best-effort mapping: lead.treatment_type → human-readable interest."""
    t = (lead.get("treatment_type") or "").lower()
    return t or "general"


async def _build_consultation_from_lead(lead: Dict[str, Any], clinic_id: str) -> Dict[str, Any]:
    """Construct a ConsultationRequest document from a Lead doc.
    Copies patient info + UTM/source attribution. Marks status as 'assigned'.
    """
    now = _now_iso()
    doc: Dict[str, Any] = {
        "id": _new_id(),
        "patient_name": lead.get("name") or "",
        "patient_phone": lead.get("phone") or "",
        "patient_email": lead.get("email"),
        "patient_city": lead.get("city_slug") or lead.get("city"),
        "preferred_contact_time": None,
        "treatment_interest": _treatment_interest_from_lead(lead),
        "urgency": (lead.get("answers") or {}).get("urgency"),
        "readiness": (lead.get("answers") or {}).get("readiness")
                     or lead.get("band"),
        "quiz_result_id": (lead.get("answers") or {}).get("session_id"),
        "lead_id": lead.get("id"),
        "source": lead.get("source"),
        "utm_source": lead.get("utm_source") or lead.get("first_utm_source"),
        "utm_campaign": lead.get("utm_campaign") or lead.get("first_utm_campaign"),
        "utm_adset": lead.get("utm_adset") or lead.get("first_utm_adset"),
        "utm_ad": lead.get("utm_ad") or lead.get("first_utm_ad"),
        "assigned_clinic_id": clinic_id,
        "status": "assigned",
        "assigned_at": now,
        "clinic_viewed_at": None,
        "first_action_at": None,
        "call_attempted_at": None,
        "patient_contacted_at": None,
        "appointment_booked_at": None,
        "attended_at": None,
        "no_show_at": None,
        "cancelled_at": None,
        "notes": None,
        "created_at": now,
        "updated_at": now,
    }
    return doc


async def _ensure_consultation_for_lead(lead: Dict[str, Any], clinic_id: str) -> Dict[str, Any]:
    """Idempotent: return existing consultation_request linked to this lead/clinic
    or create one. Used by both the explicit assign endpoint and the lazy
    backfill path on /clinic/consultation-requests."""
    existing = await db.consultation_requests.find_one(
        {"lead_id": lead["id"], "assigned_clinic_id": clinic_id},
        {"_id": 0},
    )
    if existing:
        return existing
    doc = await _build_consultation_from_lead(lead, clinic_id)
    await db.consultation_requests.insert_one({**doc})
    await _log_event(
        doc["id"],
        "assigned_to_clinic",
        clinic_id=clinic_id,
        new_status="assigned",
        note="auto-created from lead assignment",
    )
    return doc


async def _send_clinic_assignment_email(clinic: Dict[str, Any], req: Dict[str, Any]) -> None:
    if not RESEND_API_KEY or not clinic.get("notification_email") and not clinic.get("email"):
        logger.info("Skipping clinic assignment email — no RESEND_API_KEY or email")
        return
    to_email = clinic.get("notification_email") or clinic.get("email")
    if not to_email:
        return
    base_url = PRODUCTION_URL or "https://zubite.bg"
    detail_url = f"{base_url}/clinic/dashboard/requests/{req['id']}"
    subject = "Нова заявка за консултация — Zubite.bg"
    html = f"""
    <p>Здравейте,</p>
    <p>Получихте нова заявка за консултация в платформата Zubite.bg.</p>
    <ul>
      <li><strong>Пациент:</strong> {req.get('patient_name') or '—'}</li>
      <li><strong>Лечение:</strong> {req.get('treatment_interest') or '—'}</li>
      <li><strong>Град:</strong> {req.get('patient_city') or '—'}</li>
    </ul>
    <p><a href="{detail_url}">Отвори заявката в клиничното табло</a></p>
    <p>—<br/>Zubite.bg</p>
    """
    try:
        await _send_email(to_email, subject, html, sender=SENDER_EMAIL)
    except Exception as exc:
        # MVP: never block on email failure
        logger.warning(f"Clinic assignment email failed: {exc}")


# ─── Admin: Clinic Management ─────────────────────────────

@router.get("/admin/clinics")
async def admin_list_clinics(user: AdminUser = Depends(get_current_user)):
    clinics = await db.clinics.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    # Augment with simple counts for the listing table
    for c in clinics:
        cid = c.get("id")
        c["assigned_requests_count"] = await db.consultation_requests.count_documents(
            {"assigned_clinic_id": cid}
        )
        c["booked_count"] = await db.consultation_requests.count_documents(
            {"assigned_clinic_id": cid, "status": "booked"}
        )
    return {"clinics": clinics}


@router.post("/admin/clinics")
async def admin_create_clinic(
    data: ClinicCreate,
    user: AdminUser = Depends(get_current_user),
):
    if data.clinic_status not in CLINIC_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid clinic_status")
    if data.subscription_status not in SUBSCRIPTION_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid subscription_status")
    email = data.email.strip().lower()
    existing = await db.clinics.find_one({"email": email}, {"_id": 0, "id": 1})
    if existing:
        raise HTTPException(status_code=400, detail="Clinic with this email already exists")

    # Auto-generate temporary password (admin can reset later via existing endpoint)
    import secrets as _secrets
    temp_password = _secrets.token_urlsafe(12)
    now = _now_iso()
    doc = {
        "id": _new_id(),
        "clinic_name": data.clinic_name,
        "city": data.city,
        "email": email,
        "phone": data.phone,
        "address": data.address,
        "website": data.website,
        "contact_person": data.contact_person,
        "treatments_offered": data.treatments_offered,
        "clinic_status": data.clinic_status,
        "subscription_status": data.subscription_status,
        "monthly_plan": data.monthly_plan,
        "notification_email": data.notification_email or email,
        "status": "active",  # legacy flag for clinic_login compatibility
        "password_hash": hash_password(temp_password),
        "created_at": now,
        "updated_at": now,
    }
    await db.clinics.insert_one({**doc})
    return {
        "clinic": _public_clinic_dict(doc),
        "temporary_password": temp_password,
    }


@router.get("/admin/clinics/{clinic_id}")
async def admin_get_clinic(
    clinic_id: str,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(clinic_id, str):
        raise HTTPException(status_code=400, detail="Invalid clinic_id")
    clinic = await db.clinics.find_one({"id": clinic_id}, {"_id": 0, "password_hash": 0})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    # Performance metrics
    cid = clinic_id
    assigned = await db.consultation_requests.count_documents({"assigned_clinic_id": cid})
    booked = await db.consultation_requests.count_documents({"assigned_clinic_id": cid, "status": "booked"})
    attended = await db.consultation_requests.count_documents({"assigned_clinic_id": cid, "status": "attended"})
    no_show = await db.consultation_requests.count_documents({"assigned_clinic_id": cid, "status": "no_show"})
    return {
        "clinic": clinic,
        "metrics": {
            "assigned": assigned, "booked": booked,
            "attended": attended, "no_show": no_show,
        },
    }


@router.patch("/admin/clinics/{clinic_id}")
async def admin_update_clinic(
    clinic_id: str,
    data: ClinicAdminUpdate,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(clinic_id, str):
        raise HTTPException(status_code=400, detail="Invalid clinic_id")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "clinic_status" in update and update["clinic_status"] not in CLINIC_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid clinic_status")
    if "subscription_status" in update and update["subscription_status"] not in SUBSCRIPTION_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid subscription_status")
    update["updated_at"] = _now_iso()
    result = await db.clinics.update_one({"id": clinic_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Clinic not found")
    clinic = await db.clinics.find_one({"id": clinic_id}, {"_id": 0, "password_hash": 0})
    return {"clinic": clinic}


# ─── Admin: Consultation Requests ─────────────────────────

@router.get("/admin/consultation-requests")
async def admin_list_consultation_requests(
    status: Optional[str] = None,
    clinic_id: Optional[str] = None,
    user: AdminUser = Depends(get_current_user),
):
    q: Dict[str, Any] = {}
    if isinstance(status, str) and status:
        q["status"] = status
    if isinstance(clinic_id, str) and clinic_id:
        q["assigned_clinic_id"] = clinic_id
    requests = await db.consultation_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    # attach clinic name for the listing table
    clinic_ids = list({r.get("assigned_clinic_id") for r in requests if r.get("assigned_clinic_id")})
    name_map: Dict[str, str] = {}
    if clinic_ids:
        clinics = await db.clinics.find({"id": {"$in": clinic_ids}}, {"_id": 0, "id": 1, "clinic_name": 1}).to_list(500)
        name_map = {c["id"]: c.get("clinic_name", "") for c in clinics}
    for r in requests:
        r["assigned_clinic_name"] = name_map.get(r.get("assigned_clinic_id") or "")
    return {"requests": requests}


@router.get("/admin/consultation-requests/{req_id}")
async def admin_get_consultation_request(
    req_id: str,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(req_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    req = await db.consultation_requests.find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    clinic_name = None
    if req.get("assigned_clinic_id"):
        c = await db.clinics.find_one(
            {"id": req["assigned_clinic_id"]}, {"_id": 0, "clinic_name": 1}
        )
        clinic_name = (c or {}).get("clinic_name")
    appointment = await db.clinic_appointments.find_one(
        {"consultation_request_id": req_id}, {"_id": 0}
    )

    # Attached lead snapshot (for admin view of quiz answers, attribution)
    lead = None
    if req.get("lead_id"):
        lead = await db.leads.find_one(
            {"id": req["lead_id"]},
            {"_id": 0, "answers": 1, "first_utm_source": 1, "first_utm_campaign": 1,
             "latest_utm_source": 1, "latest_utm_campaign": 1, "band": 1, "score_total": 1,
             "first_landing_page": 1, "first_referrer": 1},
        )
    return {
        "request": req,
        "clinic_name": clinic_name,
        "appointment": appointment,
        "lead": lead,
    }


@router.patch("/admin/consultation-requests/{req_id}")
async def admin_patch_consultation_request(
    req_id: str,
    data: ConsultationAdminPatch,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(req_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "status" in update and update["status"] not in CONSULTATION_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid status")
    update["updated_at"] = _now_iso()
    existing = await db.consultation_requests.find_one({"id": req_id}, {"_id": 0, "status": 1, "assigned_clinic_id": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Request not found")
    await db.consultation_requests.update_one({"id": req_id}, {"$set": update})
    if "status" in update and update["status"] != existing.get("status"):
        await _log_event(
            req_id, "admin_status_change",
            clinic_id=existing.get("assigned_clinic_id"),
            user_id=user.id,
            previous_status=existing.get("status"),
            new_status=update["status"],
            note=update.get("notes"),
        )
    elif "notes" in update:
        await _log_event(
            req_id, "admin_note_added",
            clinic_id=existing.get("assigned_clinic_id"),
            user_id=user.id, note=update["notes"],
        )
    return {"status": "ok"}


@router.post("/admin/consultation-requests/{req_id}/assign-clinic")
async def admin_assign_consultation_to_clinic(
    req_id: str,
    body: ConsultationAssignClinic,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(req_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    clinic = await db.clinics.find_one(
        {"id": body.clinic_id}, {"_id": 0, "id": 1, "clinic_name": 1, "email": 1, "notification_email": 1}
    )
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    req = await db.consultation_requests.find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    prev_status = req.get("status")
    prev_clinic = req.get("assigned_clinic_id")
    now = _now_iso()
    await db.consultation_requests.update_one(
        {"id": req_id},
        {"$set": {
            "assigned_clinic_id": body.clinic_id,
            "status": "assigned",
            "assigned_at": now if not req.get("assigned_at") else req["assigned_at"],
            "updated_at": now,
        }},
    )
    await _log_event(
        req_id,
        "reassigned_to_clinic" if prev_clinic and prev_clinic != body.clinic_id else "assigned_to_clinic",
        clinic_id=body.clinic_id, user_id=user.id,
        previous_status=prev_status, new_status="assigned",
    )
    # Best-effort email
    refreshed = await db.consultation_requests.find_one({"id": req_id}, {"_id": 0})
    await _send_clinic_assignment_email(clinic, refreshed or req)
    return {"status": "ok", "assigned_to": clinic.get("clinic_name")}


@router.get("/admin/consultation-requests/{req_id}/events")
async def admin_consultation_events(
    req_id: str,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(req_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    events = await db.consultation_events.find(
        {"consultation_request_id": req_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"events": events}


@router.post("/admin/consultation-requests")
async def admin_create_consultation_request(
    data: ConsultationRequestCreate,
    user: AdminUser = Depends(get_current_user),
):
    """Manual creation — rare. Auto-creation happens via lead assign flow."""
    now = _now_iso()
    if data.assigned_clinic_id:
        clinic = await db.clinics.find_one({"id": data.assigned_clinic_id}, {"_id": 0, "id": 1})
        if not clinic:
            raise HTTPException(status_code=404, detail="Clinic not found")
    doc = {
        "id": _new_id(),
        **data.model_dump(),
        "status": "assigned" if data.assigned_clinic_id else "new",
        "assigned_at": now if data.assigned_clinic_id else None,
        "clinic_viewed_at": None,
        "first_action_at": None,
        "call_attempted_at": None,
        "patient_contacted_at": None,
        "appointment_booked_at": None,
        "attended_at": None,
        "no_show_at": None,
        "cancelled_at": None,
        "notes": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.consultation_requests.insert_one({**doc})
    if data.assigned_clinic_id:
        await _log_event(
            doc["id"], "assigned_to_clinic",
            clinic_id=data.assigned_clinic_id, user_id=user.id,
            new_status="assigned", note="manual admin creation",
        )
    return {"request": doc}


# ─── Admin: Appointments ──────────────────────────────────

@router.get("/admin/appointments")
async def admin_list_appointments(
    user: AdminUser = Depends(get_current_user),
    clinic_id: Optional[str] = None,
):
    q: Dict[str, Any] = {}
    if isinstance(clinic_id, str) and clinic_id:
        q["clinic_id"] = clinic_id
    appts = await db.clinic_appointments.find(q, {"_id": 0}).sort("start_time", 1).to_list(2000)
    return {"appointments": appts}


@router.get("/admin/clinics/{clinic_id}/appointments")
async def admin_clinic_appointments(
    clinic_id: str,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(clinic_id, str):
        raise HTTPException(status_code=400, detail="Invalid clinic_id")
    appts = await db.clinic_appointments.find(
        {"clinic_id": clinic_id}, {"_id": 0}
    ).sort("start_time", 1).to_list(2000)
    return {"appointments": appts}


# ─── Clinic: Consultation Requests ────────────────────────

async def _backfill_legacy_assigned_leads(clinic_id: str) -> None:
    """Idempotently create consultation_requests for any leads that are
    `assigned_clinic_id == clinic_id` but have no consultation_request yet.
    Runs on every list call — cheap because the existing-doc check is
    indexed by (lead_id, assigned_clinic_id)."""
    legacy_leads = await db.leads.find(
        {"assigned_clinic_id": clinic_id},
        {"_id": 0},
    ).to_list(1000)
    if not legacy_leads:
        return
    existing_lead_ids = set()
    cursor = db.consultation_requests.find(
        {"assigned_clinic_id": clinic_id, "lead_id": {"$in": [ld["id"] for ld in legacy_leads]}},
        {"_id": 0, "lead_id": 1},
    )
    async for r in cursor:
        if r.get("lead_id"):
            existing_lead_ids.add(r["lead_id"])
    for lead in legacy_leads:
        if lead["id"] in existing_lead_ids:
            continue
        if not lead.get("name") and not lead.get("phone"):
            continue  # skip incomplete leads
        await _ensure_consultation_for_lead(lead, clinic_id)


@router.get("/clinic/consultation-requests")
async def clinic_list_consultation_requests(clinic=Depends(get_current_clinic)):
    cid = clinic["id"]
    await _backfill_legacy_assigned_leads(cid)
    requests = await db.consultation_requests.find(
        {"assigned_clinic_id": cid}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return {"requests": requests}


@router.get("/clinic/consultation-requests/{req_id}")
async def clinic_get_consultation_request(
    req_id: str,
    clinic=Depends(get_current_clinic),
):
    if not isinstance(req_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    req = await db.consultation_requests.find_one(
        {"id": req_id, "assigned_clinic_id": clinic["id"]}, {"_id": 0}
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    appointment = await db.clinic_appointments.find_one(
        {"consultation_request_id": req_id, "clinic_id": clinic["id"]}, {"_id": 0}
    )
    events = await db.consultation_events.find(
        {"consultation_request_id": req_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)

    # Lazy: mark_viewed if first time seen and still in 'assigned' state
    if req.get("status") == "assigned" and not req.get("clinic_viewed_at"):
        now = _now_iso()
        await db.consultation_requests.update_one(
            {"id": req_id, "assigned_clinic_id": clinic["id"]},
            {"$set": {
                "clinic_viewed_at": now,
                "status": "clinic_viewed",
                "updated_at": now,
            }},
        )
        await _log_event(
            req_id, "clinic_viewed_request",
            clinic_id=clinic["id"],
            previous_status="assigned",
            new_status="clinic_viewed",
        )
        req["clinic_viewed_at"] = now
        req["status"] = "clinic_viewed"
        # Re-fetch events to include the new one
        events = await db.consultation_events.find(
            {"consultation_request_id": req_id}, {"_id": 0}
        ).sort("created_at", 1).to_list(500)

    return {"request": req, "appointment": appointment, "events": events}


# Action types that count as a "first meaningful action" for time_to_first_action
_FIRST_ACTION_TYPES = {
    "call_attempted", "patient_contacted", "no_answer",
    "book_consultation", "patient_declined", "not_suitable",
}

# Maps action_type → (event_type, new_status, timestamp_field)
_ACTION_TO_STATUS: Dict[str, Dict[str, Any]] = {
    "mark_viewed":         {"event": "clinic_viewed_request",  "status": "clinic_viewed",     "ts_field": "clinic_viewed_at"},
    "call_attempted":      {"event": "call_attempted",         "status": "call_attempted",    "ts_field": "call_attempted_at"},
    "patient_contacted":   {"event": "patient_contacted",      "status": "patient_contacted", "ts_field": "patient_contacted_at"},
    "no_answer":           {"event": "no_answer",              "status": "no_answer",         "ts_field": None},
    "book_consultation":   {"event": "appointment_booked",     "status": "booked",            "ts_field": "appointment_booked_at"},
    "reschedule":          {"event": "appointment_rescheduled","status": "rescheduled",       "ts_field": None},
    "patient_declined":    {"event": "patient_declined",       "status": "patient_declined",  "ts_field": None},
    "not_suitable":        {"event": "marked_not_suitable",    "status": "not_suitable",      "ts_field": None},
    "mark_attended":       {"event": "marked_attended",        "status": "attended",          "ts_field": "attended_at"},
    "mark_no_show":        {"event": "marked_no_show",         "status": "no_show",           "ts_field": "no_show_at"},
    "cancel":              {"event": "cancelled",              "status": "cancelled",         "ts_field": "cancelled_at"},
    "admin_note":          {"event": "admin_note_added",       "status": None,                "ts_field": None},
}


@router.post("/clinic/consultation-requests/{req_id}/action")
async def clinic_perform_action(
    req_id: str,
    body: ConsultationActionRequest,
    clinic=Depends(get_current_clinic),
):
    if not isinstance(req_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    if body.action_type not in ACTION_TYPE_VALUES:
        raise HTTPException(status_code=400, detail="Invalid action_type")
    spec = _ACTION_TO_STATUS.get(body.action_type)
    if not spec:
        raise HTTPException(status_code=400, detail="Unhandled action_type")

    req = await db.consultation_requests.find_one(
        {"id": req_id, "assigned_clinic_id": clinic["id"]}, {"_id": 0}
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    now = _now_iso()
    update: Dict[str, Any] = {"updated_at": now}
    prev_status = req.get("status")
    new_status = spec["status"]

    # Status transition (skip for 'admin_note' or for 'mark_viewed' if already past)
    if body.action_type == "mark_viewed":
        if prev_status == "assigned":
            update["status"] = new_status
        if not req.get("clinic_viewed_at"):
            update["clinic_viewed_at"] = now
    elif new_status:
        update["status"] = new_status

    # Specific timestamp field
    ts_field = spec.get("ts_field")
    if ts_field and not req.get(ts_field):
        update[ts_field] = now

    # First action time
    if body.action_type in _FIRST_ACTION_TYPES and not req.get("first_action_at"):
        update["first_action_at"] = now

    # Note
    if body.note:
        existing_notes = req.get("notes") or ""
        sep = "\n" if existing_notes else ""
        update["notes"] = f"{existing_notes}{sep}[{now}] {body.note}".strip()

    appointment_doc: Optional[Dict[str, Any]] = None

    # Booking / Reschedule require appointment payload
    if body.action_type == "book_consultation":
        if not body.appointment:
            raise HTTPException(status_code=400, detail="appointment required for book_consultation")
        appt = body.appointment
        if appt.appointment_type not in APPOINTMENT_TYPE_VALUES:
            raise HTTPException(status_code=400, detail="Invalid appointment_type")
        appointment_doc = {
            "id": _new_id(),
            "clinic_id": clinic["id"],
            "consultation_request_id": req_id,
            "patient_name": req.get("patient_name") or "",
            "patient_phone": req.get("patient_phone") or "",
            "treatment_category": req.get("treatment_interest"),
            "appointment_type": appt.appointment_type,
            "start_time": appt.start_time,
            "end_time": appt.end_time,
            "status": "booked",
            "notes": appt.notes,
            "created_at": now,
            "updated_at": now,
        }
        await db.clinic_appointments.insert_one({**appointment_doc})

    elif body.action_type == "reschedule":
        if not body.appointment:
            raise HTTPException(status_code=400, detail="appointment required for reschedule")
        appt = body.appointment
        if appt.appointment_type not in APPOINTMENT_TYPE_VALUES:
            raise HTTPException(status_code=400, detail="Invalid appointment_type")
        existing_appt = await db.clinic_appointments.find_one(
            {"consultation_request_id": req_id, "clinic_id": clinic["id"]}, {"_id": 0}
        )
        if existing_appt:
            await db.clinic_appointments.update_one(
                {"id": existing_appt["id"]},
                {"$set": {
                    "appointment_type": appt.appointment_type,
                    "start_time": appt.start_time,
                    "end_time": appt.end_time,
                    "notes": appt.notes,
                    "status": "rescheduled",
                    "updated_at": now,
                }},
            )
            appointment_doc = {**existing_appt,
                "appointment_type": appt.appointment_type,
                "start_time": appt.start_time, "end_time": appt.end_time,
                "notes": appt.notes, "status": "rescheduled", "updated_at": now,
            }
        else:
            # Create a new appointment if there was no prior booking
            appointment_doc = {
                "id": _new_id(),
                "clinic_id": clinic["id"],
                "consultation_request_id": req_id,
                "patient_name": req.get("patient_name") or "",
                "patient_phone": req.get("patient_phone") or "",
                "treatment_category": req.get("treatment_interest"),
                "appointment_type": appt.appointment_type,
                "start_time": appt.start_time,
                "end_time": appt.end_time,
                "status": "rescheduled",
                "notes": appt.notes,
                "created_at": now,
                "updated_at": now,
            }
            await db.clinic_appointments.insert_one({**appointment_doc})
        # On reschedule, also bump booking timestamp if missing
        if not req.get("appointment_booked_at"):
            update["appointment_booked_at"] = now

    elif body.action_type == "mark_attended":
        await db.clinic_appointments.update_many(
            {"consultation_request_id": req_id, "clinic_id": clinic["id"]},
            {"$set": {"status": "attended", "updated_at": now}},
        )
    elif body.action_type == "mark_no_show":
        await db.clinic_appointments.update_many(
            {"consultation_request_id": req_id, "clinic_id": clinic["id"]},
            {"$set": {"status": "no_show", "updated_at": now}},
        )
    elif body.action_type == "cancel":
        await db.clinic_appointments.update_many(
            {"consultation_request_id": req_id, "clinic_id": clinic["id"]},
            {"$set": {"status": "cancelled", "updated_at": now}},
        )

    await db.consultation_requests.update_one({"id": req_id}, {"$set": update})

    await _log_event(
        req_id,
        spec["event"],
        clinic_id=clinic["id"],
        previous_status=prev_status,
        new_status=update.get("status"),
        note=body.note,
    )

    refreshed = await db.consultation_requests.find_one({"id": req_id}, {"_id": 0})
    return {"request": refreshed, "appointment": appointment_doc}


# ─── Clinic: Calendar / Appointments ──────────────────────

@router.get("/clinic/appointments")
async def clinic_list_appointments(
    clinic=Depends(get_current_clinic),
    status: Optional[str] = None,
    appointment_type: Optional[str] = None,
):
    q: Dict[str, Any] = {"clinic_id": clinic["id"]}
    if isinstance(status, str) and status:
        q["status"] = status
    if isinstance(appointment_type, str) and appointment_type:
        q["appointment_type"] = appointment_type
    appts = await db.clinic_appointments.find(q, {"_id": 0}).sort("start_time", 1).to_list(2000)
    return {"appointments": appts}


@router.post("/clinic/appointments")
async def clinic_create_appointment(
    data: ClinicAppointmentCreate,
    clinic=Depends(get_current_clinic),
):
    if data.appointment_type not in APPOINTMENT_TYPE_VALUES:
        raise HTTPException(status_code=400, detail="Invalid appointment_type")
    # If linked to a consultation_request, ensure it belongs to this clinic
    if data.consultation_request_id:
        req = await db.consultation_requests.find_one(
            {"id": data.consultation_request_id, "assigned_clinic_id": clinic["id"]},
            {"_id": 0, "id": 1},
        )
        if not req:
            raise HTTPException(status_code=404, detail="Linked consultation request not found")
    now = _now_iso()
    doc = {
        "id": _new_id(),
        "clinic_id": clinic["id"],
        "consultation_request_id": data.consultation_request_id,
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "treatment_category": data.treatment_category,
        "appointment_type": data.appointment_type,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "status": "booked",
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }
    await db.clinic_appointments.insert_one({**doc})
    return {"appointment": doc}


@router.patch("/clinic/appointments/{appt_id}")
async def clinic_update_appointment(
    appt_id: str,
    data: ClinicAppointmentPatch,
    clinic=Depends(get_current_clinic),
):
    if not isinstance(appt_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "appointment_type" in update and update["appointment_type"] not in APPOINTMENT_TYPE_VALUES:
        raise HTTPException(status_code=400, detail="Invalid appointment_type")
    if "status" in update and update["status"] not in APPOINTMENT_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid status")
    update["updated_at"] = _now_iso()
    result = await db.clinic_appointments.update_one(
        {"id": appt_id, "clinic_id": clinic["id"]}, {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt = await db.clinic_appointments.find_one({"id": appt_id}, {"_id": 0})
    return {"appointment": appt}


@router.delete("/clinic/appointments/{appt_id}")
async def clinic_cancel_appointment(
    appt_id: str,
    clinic=Depends(get_current_clinic),
):
    """Soft-cancel: status='cancelled'. Does not delete the row."""
    if not isinstance(appt_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    result = await db.clinic_appointments.update_one(
        {"id": appt_id, "clinic_id": clinic["id"]},
        {"$set": {"status": "cancelled", "updated_at": _now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"status": "ok"}


# ─── Clinic: Dashboard Overview / Performance ─────────────

def _avg_seconds(diffs: List[float]) -> Optional[float]:
    if not diffs:
        return None
    return sum(diffs) / len(diffs)


def _iso_diff_seconds(a: Optional[str], b: Optional[str]) -> Optional[float]:
    if not a or not b:
        return None
    try:
        ta = datetime.fromisoformat(a)
        tb = datetime.fromisoformat(b)
        return (tb - ta).total_seconds()
    except Exception:
        return None


@router.get("/clinic/dashboard-overview")
async def clinic_dashboard_overview(clinic=Depends(get_current_clinic)):
    """KPI cards for the clinic dashboard landing."""
    cid = clinic["id"]
    await _backfill_legacy_assigned_leads(cid)

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    new_count = await db.consultation_requests.count_documents(
        {"assigned_clinic_id": cid, "status": {"$in": ["new", "assigned"]}}
    )
    awaiting_action = await db.consultation_requests.count_documents(
        {"assigned_clinic_id": cid, "status": {"$in": [
            "assigned", "clinic_viewed", "call_attempted", "no_answer", "rescheduled",
        ]}}
    )
    booked_this_month = await db.consultation_requests.count_documents(
        {"assigned_clinic_id": cid, "appointment_booked_at": {"$gte": month_start}}
    )
    attended_this_month = await db.consultation_requests.count_documents(
        {"assigned_clinic_id": cid, "attended_at": {"$gte": month_start}}
    )
    no_show_this_month = await db.consultation_requests.count_documents(
        {"assigned_clinic_id": cid, "no_show_at": {"$gte": month_start}}
    )

    # Avg response/booking times — across all requests for this clinic
    all_requests = await db.consultation_requests.find(
        {"assigned_clinic_id": cid},
        {"_id": 0, "assigned_at": 1, "first_action_at": 1, "appointment_booked_at": 1, "clinic_viewed_at": 1},
    ).to_list(2000)
    response_diffs = [d for r in all_requests if (d := _iso_diff_seconds(r.get("assigned_at"), r.get("first_action_at"))) is not None]
    book_diffs = [d for r in all_requests if (d := _iso_diff_seconds(r.get("assigned_at"), r.get("appointment_booked_at"))) is not None]

    return {
        "new_requests": new_count,
        "awaiting_action": awaiting_action,
        "booked_this_month": booked_this_month,
        "attended_this_month": attended_this_month,
        "no_show_this_month": no_show_this_month,
        "avg_response_seconds": _avg_seconds(response_diffs),
        "avg_time_to_book_seconds": _avg_seconds(book_diffs),
    }


@router.get("/clinic/performance")
async def clinic_performance(clinic=Depends(get_current_clinic)):
    cid = clinic["id"]
    requests = await db.consultation_requests.find(
        {"assigned_clinic_id": cid}, {"_id": 0}
    ).to_list(5000)
    total_assigned = len(requests)
    viewed = sum(1 for r in requests if r.get("clinic_viewed_at"))
    contact_attempted = sum(1 for r in requests if r.get("call_attempted_at"))
    contacted = sum(1 for r in requests if r.get("patient_contacted_at"))
    booked = sum(1 for r in requests if r.get("appointment_booked_at"))
    attended = sum(1 for r in requests if r.get("attended_at"))
    no_show = sum(1 for r in requests if r.get("no_show_at"))

    response_diffs = [
        d for r in requests
        if (d := _iso_diff_seconds(r.get("assigned_at"), r.get("first_action_at"))) is not None
    ]
    book_diffs = [
        d for r in requests
        if (d := _iso_diff_seconds(r.get("assigned_at"), r.get("appointment_booked_at"))) is not None
    ]

    booking_conversion = (booked / total_assigned * 100) if total_assigned > 0 else 0
    attendance_rate = (attended / booked * 100) if booked > 0 else 0

    return {
        "total_assigned": total_assigned,
        "viewed": viewed,
        "contact_attempted": contact_attempted,
        "contacted": contacted,
        "booked": booked,
        "attended": attended,
        "no_show": no_show,
        "avg_time_to_first_action_seconds": _avg_seconds(response_diffs),
        "avg_time_to_book_seconds": _avg_seconds(book_diffs),
        "booking_conversion_rate": round(booking_conversion, 1),
        "attendance_rate": round(attendance_rate, 1),
    }
