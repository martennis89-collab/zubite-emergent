"""Clinic "Пациенти" (Patients) dashboard section.

Aggregates every lead assigned to a clinic (`leads.assigned_clinic_id`)
into a single patient list with a stable, platform-wide numeric ID and a
per-patient mini profile (contact info, Care Pass status, quiz/source
context, and history across consultation_requests / clinic_bookings /
online_orientation_bookings), plus one clinic-editable free-text note.

This is a CLINIC-facing view of ITS OWN leads — unrelated to the separate
patient self-service login subsystem (`db.patients`, `patient_id` field,
`get_current_patient()` in auth.py). Do not confuse the two: this router
never touches `db.patients` or patient accounts.

Endpoints
─────────
  GET /api/clinic/patients
  GET /api/clinic/patients/{patient_number}
  PUT /api/clinic/patients/{patient_number}/note
"""

from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from typing import Any, Dict, List
from datetime import datetime, timezone

from database import db
from schemas import ClinicPatientNoteUpdate
from auth import get_current_clinic
from routers.consultations import (
    _backfill_legacy_assigned_leads,
    _build_patient_context,
    _list_source_badge,
    SOURCE_CONTEXT_LEAD_FIELDS,
)
from routers.orientation_bookings import _public_booking

router = APIRouter()


# ─── Helpers ──────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _next_patient_number() -> int:
    """Atomically increment the single global patient-number counter.
    Safe across concurrent clinics — Mongo's find_one_and_update is
    atomic regardless of which clinic's request triggers it."""
    doc = await db.counters.find_one_and_update(
        {"_id": "patient_number"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return doc["seq"]


async def _backfill_patient_numbers(clinic_id: str) -> None:
    """Idempotently assign patient_number to any lead assigned to this
    clinic that doesn't have one yet. Mirrors the existing
    `_backfill_legacy_assigned_leads` self-healing pattern (consultations.py)
    instead of hooking into every code path that can set assigned_clinic_id."""
    cursor = db.leads.find(
        {"assigned_clinic_id": clinic_id, "patient_number": None},
        {"_id": 0, "id": 1},
    )
    async for lead in cursor:
        seq = await _next_patient_number()
        # Re-check patient_number is still None in the filter to guard
        # against a race between two near-simultaneous backfill calls —
        # worst case a counter value is wasted (a harmless gap), never
        # a double-assignment.
        await db.leads.update_one(
            {"id": lead["id"], "patient_number": None},
            {"$set": {"patient_number": seq, "patient_number_assigned_at": _now_iso()}},
        )


def _care_pass_status(lead: Dict[str, Any]) -> str:
    if lead.get("care_pass_unlocked"):
        return "unlocked"
    if lead.get("care_pass_eligible"):
        return "eligible"
    return "none"


async def _count_by_lead_ids(collection, clinic_field: str, clinic_id: str, lead_ids: List[str]) -> Dict[str, int]:
    if not lead_ids:
        return {}
    counts: Dict[str, int] = {}
    cursor = collection.find(
        {clinic_field: clinic_id, "lead_id": {"$in": lead_ids}},
        {"_id": 0, "lead_id": 1},
    )
    async for doc in cursor:
        lid = doc.get("lead_id")
        if lid:
            counts[lid] = counts.get(lid, 0) + 1
    return counts


def _row_for_list(
    lead: Dict[str, Any],
    consult_counts: Dict[str, int],
    booking_counts: Dict[str, int],
    orientation_counts: Dict[str, int],
) -> Dict[str, Any]:
    lid = lead["id"]
    note = lead.get("clinic_internal_note")
    return {
        "patient_number": lead.get("patient_number"),
        "lead_id": lid,
        "name": lead.get("name"),
        "phone": lead.get("phone"),
        "email": lead.get("email"),
        "city": lead.get("city_slug"),
        "created_at": lead.get("created_at"),
        "care_pass_status": _care_pass_status(lead),
        "consultation_count": consult_counts.get(lid, 0),
        "booking_count": booking_counts.get(lid, 0),
        "orientation_count": orientation_counts.get(lid, 0),
        "clinic_internal_note_preview": (note[:80] if note else None),
        "source_badge": _list_source_badge(lead, lead.get("created_at")),
    }


# ─── Endpoints ────────────────────────────────────────────

@router.get("/clinic/patients")
async def clinic_list_patients(clinic=Depends(get_current_clinic)):
    cid = clinic["id"]
    await _backfill_legacy_assigned_leads(cid)
    await _backfill_patient_numbers(cid)

    leads = await db.leads.find(
        {"assigned_clinic_id": cid},
        {
            "_id": 0, "id": 1, "patient_number": 1, "name": 1, "phone": 1,
            "email": 1, "city_slug": 1, "created_at": 1,
            "care_pass_eligible": 1, "care_pass_unlocked": 1,
            "clinic_internal_note": 1,
            **SOURCE_CONTEXT_LEAD_FIELDS,
        },
    ).sort("created_at", -1).to_list(2000)

    lead_ids = [ld["id"] for ld in leads]
    consult_counts = await _count_by_lead_ids(db.consultation_requests, "assigned_clinic_id", cid, lead_ids)
    booking_counts = await _count_by_lead_ids(db.clinic_bookings, "clinic_id", cid, lead_ids)
    orientation_counts = await _count_by_lead_ids(db.online_orientation_bookings, "clinic_id", cid, lead_ids)

    patients = [
        _row_for_list(ld, consult_counts, booking_counts, orientation_counts)
        for ld in leads
    ]
    return {"patients": patients}


@router.get("/clinic/patients/{patient_number}")
async def clinic_get_patient(patient_number: int, clinic=Depends(get_current_clinic)):
    cid = clinic["id"]
    lead = await db.leads.find_one(
        {"patient_number": patient_number, "assigned_clinic_id": cid}, {"_id": 0}
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Patient not found")

    lead_id = lead["id"]
    consultations = await db.consultation_requests.find(
        {"lead_id": lead_id, "assigned_clinic_id": cid}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    bookings = await db.clinic_bookings.find(
        {"lead_id": lead_id, "clinic_id": cid}, {"_id": 0}
    ).sort("selected_slot_start", -1).to_list(100)
    orientation_rows = await db.online_orientation_bookings.find(
        {"lead_id": lead_id, "clinic_id": cid}, {"_id": 0}
    ).sort("scheduled_at", -1).to_list(100)

    return {
        "patient_number": lead["patient_number"],
        "contact": {
            "name": lead.get("name"),
            "phone": lead.get("phone"),
            "email": lead.get("email"),
            "city": lead.get("city_slug"),
        },
        "care_pass": {
            "status": _care_pass_status(lead),
            "eligible": lead.get("care_pass_eligible", False),
            "unlocked": lead.get("care_pass_unlocked", False),
            "unlocked_at": lead.get("clinic_confirmed_consultation_at"),
        },
        # Stub `req` — only lead-derived fields (quiz_summary, source_context,
        # stage_label, signal_flags) populate; request-specific fields
        # (treatment_interest/readiness/urgency/patient_message) resolve to
        # null here since there's no single "the" request for a patient —
        # those already appear per-item in `consultations` below.
        "quiz_context": await _build_patient_context({"lead_id": lead_id}),
        "consultations": consultations,
        "bookings": bookings,
        "orientation_bookings": [_public_booking(b, audience="clinic") for b in orientation_rows],
        "clinic_internal_note": lead.get("clinic_internal_note"),
        "clinic_internal_note_updated_at": lead.get("clinic_internal_note_updated_at"),
    }


@router.put("/clinic/patients/{patient_number}/note")
async def clinic_update_patient_note(
    patient_number: int, body: ClinicPatientNoteUpdate, clinic=Depends(get_current_clinic)
):
    cid = clinic["id"]
    now = _now_iso()
    note = body.note.strip()
    result = await db.leads.update_one(
        {"patient_number": patient_number, "assigned_clinic_id": cid},
        {"$set": {"clinic_internal_note": note, "clinic_internal_note_updated_at": now}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"clinic_internal_note": note, "clinic_internal_note_updated_at": now}
