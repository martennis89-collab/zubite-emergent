"""Doctor roster router (Multi-doctor booking system — Phase 1 + 3).

A clinic-owned roster of doctors, plus staff-internal doctor assignment
on existing bookings (Phase 3). Availability stays clinic-wide throughout
— patients (and the online-orientation slot picker) never choose a
doctor or a doctor's slot. A clinic staffer assigns a doctor to a
booking that already exists, purely as a label for internal routing.
Because assignment is decoupled from slot generation, nothing upstream
prevents a doctor being assigned to two overlapping bookings — the
assign-doctor endpoints below return a non-blocking `conflicts` list so
staff can see and knowingly proceed anyway.

Endpoints
─────────
Clinic dashboard (require clinic session):
  GET    /api/clinic/doctors
  POST   /api/clinic/doctors
  PATCH  /api/clinic/doctors/{doctor_id}
  DELETE /api/clinic/doctors/{doctor_id}   (soft — sets active=False)
  PATCH  /api/clinic/appointments/{appointment_id}/assign-doctor
  PATCH  /api/clinic/online-orientation-bookings/{booking_id}/assign-doctor

Collections used
────────────────
  - doctors                     (multi-row per clinic_id)
  - clinic_appointments          (doctor_id written here, physical flow)
  - online_orientation_bookings  (doctor_id written here, online flow)

Audit
─────
Every write emits an `audit_log` event:
  - clinic_doctor_created / _updated / _deactivated
  - clinic_appointment_doctor_assigned
  - clinic_orientation_booking_doctor_assigned
"""

from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from database import db
from schemas import DoctorCreate, DoctorUpdate, DoctorAssignmentBody, ORIENTATION_TREATMENT_CATEGORIES
from auth import get_current_clinic
from audit import audit_log

logger = logging.getLogger(__name__)

router = APIRouter()

DOCTORS_COL = "doctors"

# Mirrors consultations.py's `_ORIENTATION_CALENDAR_TERMINAL_STATUSES` —
# bookings in these statuses are finished/dead and shouldn't count as a
# scheduling conflict for a doctor.
_ORIENTATION_TERMINAL_STATUSES = frozenset({
    "completed", "no_show", "converted_to_in_clinic", "not_suitable",
    "cancelled_by_patient", "cancelled_by_clinic", "rejected_by_clinic",
    "expired_pending_confirmation",
})
_APPOINTMENT_TERMINAL_STATUSES = frozenset({"cancelled"})


def _now_iso_dt() -> datetime:
    return datetime.now(timezone.utc)


def _serialise_dt(doc: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k, v in doc.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


async def _list_doctors(clinic_id: str) -> List[Dict[str, Any]]:
    cur = db.get_collection(DOCTORS_COL).find({"clinic_id": clinic_id}, {"_id": 0})
    rows = await cur.to_list(500)
    rows.sort(key=lambda r: (not r.get("active", True), (r.get("name") or "").lower()))
    return [_serialise_dt(r) for r in rows]


@router.get("/clinic/doctors")
async def clinic_list_doctors(clinic=Depends(get_current_clinic)):
    rows = await _list_doctors(clinic["id"])
    return {
        "doctors": rows,
        "allowed_specialties": list(ORIENTATION_TREATMENT_CATEGORIES),
    }


@router.post("/clinic/doctors")
async def clinic_create_doctor(
    payload: DoctorCreate,
    request: Request,
    clinic=Depends(get_current_clinic),
):
    now = _now_iso_dt()
    doc = {
        "id": str(uuid.uuid4()),
        "clinic_id": clinic["id"],
        "name": payload.name.strip(),
        "title": payload.title,
        "specialties": payload.specialties,
        "accepts_online": payload.accepts_online,
        "accepts_in_person": payload.accepts_in_person,
        "active": True,
        "photo_url": payload.photo_url,
        "bio": payload.bio,
        "created_at": now,
        "updated_at": now,
    }
    await db.get_collection(DOCTORS_COL).insert_one({**doc})
    try:
        await audit_log(
            "clinic_doctor_created",
            actor=clinic, actor_type="clinic",
            target_type="clinic", target_id=clinic["id"],
            target_summary=clinic.get("clinic_name") or clinic.get("name"),
            after_state=doc, severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"audit_log(doctor_created) failed: {exc}")
    return _serialise_dt(doc)


@router.patch("/clinic/doctors/{doctor_id}")
async def clinic_update_doctor(
    doctor_id: str,
    payload: DoctorUpdate,
    request: Request,
    clinic=Depends(get_current_clinic),
):
    before = await db.get_collection(DOCTORS_COL).find_one(
        {"clinic_id": clinic["id"], "id": doctor_id}, {"_id": 0}
    )
    if not before:
        raise HTTPException(status_code=404, detail="Doctor not found")
    patch = payload.model_dump(exclude_none=True)
    if not patch:
        return _serialise_dt(before)
    if "name" in patch:
        patch["name"] = patch["name"].strip()
    patch["updated_at"] = _now_iso_dt()
    await db.get_collection(DOCTORS_COL).update_one(
        {"clinic_id": clinic["id"], "id": doctor_id},
        {"$set": patch},
    )
    after = {**before, **patch}
    try:
        await audit_log(
            "clinic_doctor_updated",
            actor=clinic, actor_type="clinic",
            target_type="clinic", target_id=clinic["id"],
            target_summary=clinic.get("clinic_name") or clinic.get("name"),
            before_state=before, after_state=after,
            severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"audit_log(doctor_updated) failed: {exc}")
    return _serialise_dt(after)


@router.delete("/clinic/doctors/{doctor_id}")
async def clinic_deactivate_doctor(
    doctor_id: str,
    request: Request,
    clinic=Depends(get_current_clinic),
):
    """Soft-delete: sets active=False. Never hard-deletes — historical
    bookings must keep a valid doctor reference."""
    before = await db.get_collection(DOCTORS_COL).find_one(
        {"clinic_id": clinic["id"], "id": doctor_id}, {"_id": 0}
    )
    if not before:
        raise HTTPException(status_code=404, detail="Doctor not found")
    now = _now_iso_dt()
    await db.get_collection(DOCTORS_COL).update_one(
        {"clinic_id": clinic["id"], "id": doctor_id},
        {"$set": {"active": False, "updated_at": now}},
    )
    try:
        await audit_log(
            "clinic_doctor_deactivated",
            actor=clinic, actor_type="clinic",
            target_type="clinic", target_id=clinic["id"],
            target_summary=clinic.get("clinic_name") or clinic.get("name"),
            before_state=before, severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"audit_log(doctor_deactivated) failed: {exc}")
    return {"deactivated": True, "id": doctor_id}


# ─── Doctor assignment (Phase 3 — staff-internal, non-blocking) ───

def _parse_dt(value: Any) -> Optional[datetime]:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _ranges_overlap(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and b_start < a_end


async def _find_doctor_conflicts(
    clinic_id: str,
    doctor_id: str,
    start_dt: datetime,
    end_dt: datetime,
    *,
    exclude_appointment_id: Optional[str] = None,
    exclude_booking_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Other bookings already assigned to this doctor that overlap
    [start_dt, end_dt), across BOTH the physical and online collections.
    Purely informational — callers never block on this."""
    conflicts: List[Dict[str, Any]] = []

    appt_q: Dict[str, Any] = {
        "clinic_id": clinic_id, "doctor_id": doctor_id,
        "status": {"$nin": list(_APPOINTMENT_TERMINAL_STATUSES)},
    }
    if exclude_appointment_id:
        appt_q["id"] = {"$ne": exclude_appointment_id}
    async for row in db.clinic_appointments.find(appt_q, {"_id": 0}):
        r_start = _parse_dt(row.get("start_time"))
        r_end = _parse_dt(row.get("end_time")) or r_start
        if r_start and r_end and _ranges_overlap(r_start, r_end, start_dt, end_dt):
            conflicts.append({
                "source": "physical", "id": row.get("id"),
                "patient_name": row.get("patient_name"),
                "start_time": row.get("start_time"), "end_time": row.get("end_time"),
            })

    booking_q: Dict[str, Any] = {
        "clinic_id": clinic_id, "doctor_id": doctor_id,
        "status": {"$nin": list(_ORIENTATION_TERMINAL_STATUSES)},
    }
    if exclude_booking_id:
        booking_q["id"] = {"$ne": exclude_booking_id}
    async for row in db.online_orientation_bookings.find(booking_q, {"_id": 0}):
        r_start = _parse_dt(row.get("scheduled_at"))
        duration = int(row.get("duration_minutes") or 20)
        r_end = (r_start + timedelta(minutes=duration)) if r_start else None
        if r_start and r_end and _ranges_overlap(r_start, r_end, start_dt, end_dt):
            conflicts.append({
                "source": "online", "id": row.get("id"),
                "patient_name": row.get("patient_name"),
                "start_time": row.get("scheduled_at"), "end_time": r_end.isoformat(),
            })

    return conflicts


async def _load_active_doctor_or_400(clinic_id: str, doctor_id: str) -> Dict[str, Any]:
    doctor = await db.get_collection(DOCTORS_COL).find_one(
        {"id": doctor_id, "clinic_id": clinic_id, "active": True}, {"_id": 0}
    )
    if not doctor:
        raise HTTPException(status_code=400, detail="Invalid or inactive doctor")
    return doctor


@router.patch("/clinic/appointments/{appointment_id}/assign-doctor")
async def clinic_assign_doctor_to_appointment(
    appointment_id: str,
    payload: DoctorAssignmentBody,
    request: Request,
    clinic=Depends(get_current_clinic),
):
    appt = await db.clinic_appointments.find_one(
        {"id": appointment_id, "clinic_id": clinic["id"]}, {"_id": 0}
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    conflicts: List[Dict[str, Any]] = []
    if payload.doctor_id:
        await _load_active_doctor_or_400(clinic["id"], payload.doctor_id)
        start_dt = _parse_dt(appt.get("start_time"))
        end_dt = _parse_dt(appt.get("end_time")) or start_dt
        if start_dt and end_dt:
            conflicts = await _find_doctor_conflicts(
                clinic["id"], payload.doctor_id, start_dt, end_dt,
                exclude_appointment_id=appointment_id,
            )

    now = _now_iso_dt()
    await db.clinic_appointments.update_one(
        {"id": appointment_id},
        {"$set": {"doctor_id": payload.doctor_id, "updated_at": now}},
    )
    try:
        await audit_log(
            "clinic_appointment_doctor_assigned",
            actor=clinic, actor_type="clinic",
            target_type="clinic_appointment", target_id=appointment_id,
            target_summary=appt.get("patient_name"),
            before_state={"doctor_id": appt.get("doctor_id")},
            after_state={"doctor_id": payload.doctor_id},
            severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"audit_log(appointment_doctor_assigned) failed: {exc}")
    return {"id": appointment_id, "doctor_id": payload.doctor_id, "conflicts": conflicts}


@router.patch("/clinic/online-orientation-bookings/{booking_id}/assign-doctor")
async def clinic_assign_doctor_to_orientation_booking(
    booking_id: str,
    payload: DoctorAssignmentBody,
    request: Request,
    clinic=Depends(get_current_clinic),
):
    booking = await db.get_collection("online_orientation_bookings").find_one(
        {"id": booking_id, "clinic_id": clinic["id"]}, {"_id": 0}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    conflicts: List[Dict[str, Any]] = []
    if payload.doctor_id:
        await _load_active_doctor_or_400(clinic["id"], payload.doctor_id)
        start_dt = _parse_dt(booking.get("scheduled_at"))
        duration = int(booking.get("duration_minutes") or 20)
        end_dt = (start_dt + timedelta(minutes=duration)) if start_dt else None
        if start_dt and end_dt:
            conflicts = await _find_doctor_conflicts(
                clinic["id"], payload.doctor_id, start_dt, end_dt,
                exclude_booking_id=booking_id,
            )

    now = _now_iso_dt()
    await db.get_collection("online_orientation_bookings").update_one(
        {"id": booking_id},
        {"$set": {"doctor_id": payload.doctor_id, "updated_at": now}},
    )
    try:
        await audit_log(
            "clinic_orientation_booking_doctor_assigned",
            actor=clinic, actor_type="clinic",
            target_type="online_orientation_booking", target_id=booking_id,
            target_summary=booking.get("patient_name"),
            before_state={"doctor_id": booking.get("doctor_id")},
            after_state={"doctor_id": payload.doctor_id},
            severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"audit_log(orientation_booking_doctor_assigned) failed: {exc}")
    return {"id": booking_id, "doctor_id": payload.doctor_id, "conflicts": conflicts}
