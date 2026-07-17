"""Online Orientation Settings router (Phase D — June 2026).

Ownership split
───────────────
Admin owns the commercial and trust knobs: whether orientation is on at
all, the Verified add-on flag, the free-slot allowance, the quiz/contact
prerequisites, and the disclaimer. Those decide what Zubite promises
patients, so a clinic must not be able to move them.

The clinic owns its own availability — only it knows when its doctors are
free. Phase D shipped availability as admin-only, which meant Zubite staff
hand-entered windows for every partner; the clinic-side CRUD below closes
that, mirroring `/clinic/availability/rules` in bookings.py.

Endpoints
─────────
Admin (require admin session):
  GET    /api/admin/clinics/{clinic_id}/orientation-settings
  PUT    /api/admin/clinics/{clinic_id}/orientation-settings
  GET    /api/admin/clinics/{clinic_id}/orientation-availability
  POST   /api/admin/clinics/{clinic_id}/orientation-availability
  PATCH  /api/admin/clinics/{clinic_id}/orientation-availability/{row_id}
  DELETE /api/admin/clinics/{clinic_id}/orientation-availability/{row_id}

Clinic dashboard (require clinic session):
  GET    /api/clinic/orientation-settings       (read-only)
  GET    /api/clinic/orientation-availability
  POST   /api/clinic/orientation-availability
  PATCH  /api/clinic/orientation-availability/{row_id}
  DELETE /api/clinic/orientation-availability/{row_id}

Collections used
────────────────
  - clinic_online_orientation_settings    (one doc per clinic_id)
  - clinic_online_orientation_availability (multi-row per clinic_id)

Audit
─────
Every write emits an `audit_log` event:
  - admin_online_orientation_settings_updated
  - admin_online_orientation_enabled / _disabled
  - admin_online_orientation_addon_enabled / _disabled
  - admin_online_orientation_availability_created / _updated / _deleted
  - clinic_online_orientation_availability_created / _updated / _deleted
"""

from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import uuid
import logging

from database import db
from schemas import (
    AdminUser,
    ClinicOnlineOrientationSettings,
    ClinicOnlineOrientationSettingsUpdate,
    ClinicOnlineOrientationAvailabilityCreate,
    ClinicOnlineOrientationAvailabilityUpdate,
    ORIENTATION_DEFAULTS,
    ORIENTATION_TREATMENT_CATEGORIES,
    ORIENTATION_DAY_OF_WEEK_VALUES,
)
from auth import get_current_user, get_current_clinic
from audit import audit_log
from orientation_access import get_online_orientation_access_status

logger = logging.getLogger(__name__)

router = APIRouter()


SETTINGS_COL = "clinic_online_orientation_settings"
AVAIL_COL = "clinic_online_orientation_availability"


# ─── Helpers ──────────────────────────────────────────────

def _now_iso_dt() -> datetime:
    return datetime.now(timezone.utc)


def _strip_mongo(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in doc.items() if k != "_id"}


def _serialise_dt(doc: Dict[str, Any]) -> Dict[str, Any]:
    """JSON-friendly clone: datetimes → ISO strings."""
    out: Dict[str, Any] = {}
    for k, v in doc.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


async def _load_clinic_or_404(clinic_id: str) -> Dict[str, Any]:
    if not isinstance(clinic_id, str) or not clinic_id.strip():
        raise HTTPException(status_code=400, detail="Invalid clinic_id")
    clinic = await db.clinics.find_one({"id": clinic_id}, {"_id": 0, "password_hash": 0})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return clinic


async def _load_or_default_settings(clinic_id: str) -> Dict[str, Any]:
    """Return the saved settings doc OR a synthesised default. The default
    is NEVER persisted — admin must hit PUT to commit."""
    doc = await db.get_collection(SETTINGS_COL).find_one(
        {"clinic_id": clinic_id}, {"_id": 0}
    )
    if doc:
        return doc
    now = _now_iso_dt()
    return {
        "id": str(uuid.uuid4()),
        "clinic_id": clinic_id,
        "enabled": False,
        "addon_enabled_for_basic": False,
        "requires_quiz_completion": True,
        "requires_contact_details": True,
        "monthly_free_slot_limit": ORIENTATION_DEFAULTS["monthly_free_slot_limit"],
        "slot_duration_minutes": ORIENTATION_DEFAULTS["slot_duration_minutes"],
        "max_bookings_per_day": ORIENTATION_DEFAULTS["max_bookings_per_day"],
        "booking_buffer_minutes": ORIENTATION_DEFAULTS["booking_buffer_minutes"],
        "eligible_treatment_categories": list(ORIENTATION_DEFAULTS["eligible_treatment_categories"]),
        "public_description": None,
        "disclaimer_text": None,
        "internal_admin_notes": None,
        "created_at": now,
        "updated_at": now,
        "_default": True,
    }


def _to_minutes(hhmm: str) -> int:
    h, m = (int(p) for p in hhmm.split(":"))
    return h * 60 + m


def _validate_times(start: str, end: str) -> None:
    """Reject `end_time <= start_time`. The HH:MM regex / range is
    already enforced in the schema validator."""
    if _to_minutes(end) <= _to_minutes(start):
        raise HTTPException(
            status_code=400,
            detail={"code": "invalid_time_range", "message": "end_time трябва да е след start_time."},
        )


async def _reject_overlap(
    clinic_id: str,
    day_of_week: str,
    start_time: str,
    end_time: str,
    *,
    exclude_id: Optional[str] = None,
) -> None:
    """Reject a window overlapping an existing one on the same weekday.

    `generate_slots_for_clinic` walks each window independently and never
    dedupes across them, so two overlapping windows emit the same
    `scheduled_at` twice — same `slot_id` — and the patient is offered a
    duplicate time. Admin-only data entry made that unlikely; self-serve
    makes it easy to do by accident.

    Inactive rows are checked too: they generate nothing today, but an
    overlap parked behind `is_active=False` becomes a duplicate the moment
    someone toggles it back on.
    """
    new_start, new_end = _to_minutes(start_time), _to_minutes(end_time)
    rows = await db.get_collection(AVAIL_COL).find(
        {"clinic_id": clinic_id, "day_of_week": day_of_week}, {"_id": 0}
    ).to_list(200)
    for row in rows:
        if exclude_id and row.get("id") == exclude_id:
            continue
        if _to_minutes(row["start_time"]) < new_end and new_start < _to_minutes(row["end_time"]):
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "overlapping_window",
                    "message": (
                        "Периодът се застъпва със съществуващ период "
                        f"({row['start_time']} – {row['end_time']})."
                    ),
                },
            )


async def _list_availability(clinic_id: str) -> List[Dict[str, Any]]:
    cur = db.get_collection(AVAIL_COL).find({"clinic_id": clinic_id}, {"_id": 0})
    rows = await cur.to_list(200)
    # Stable order: by day of week, then start_time
    order = {d: i for i, d in enumerate(ORIENTATION_DAY_OF_WEEK_VALUES)}
    rows.sort(key=lambda r: (order.get(r.get("day_of_week", "sunday"), 99), r.get("start_time", "00:00")))
    return [_serialise_dt(r) for r in rows]


def _availability_summary(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Lightweight summary suitable for the clinic dashboard card."""
    active = [r for r in rows if r.get("is_active")]
    days = sorted(
        {r.get("day_of_week") for r in active if r.get("day_of_week")},
        key=lambda d: list(ORIENTATION_DAY_OF_WEEK_VALUES).index(d) if d in ORIENTATION_DAY_OF_WEEK_VALUES else 99,
    )
    return {
        "active_windows": len(active),
        "total_windows": len(rows),
        "active_days": days,
    }


async def _build_settings_response(clinic: Dict[str, Any]) -> Dict[str, Any]:
    settings = await _load_or_default_settings(clinic["id"])
    access = get_online_orientation_access_status(clinic, settings)
    availability = await _list_availability(clinic["id"])
    return {
        "clinic_id": clinic["id"],
        "clinic_name": clinic.get("clinic_name") or clinic.get("name"),
        "partner_tier": clinic.get("partner_tier") or "standard",
        "clinic_status": clinic.get("clinic_status"),
        "subscription_status": clinic.get("subscription_status"),
        "settings": _serialise_dt({k: v for k, v in settings.items() if k != "_default"}),
        "is_default": bool(settings.get("_default")),
        "access": dict(access),
        "availability": availability,
        "availability_summary": _availability_summary(availability),
        "defaults": ORIENTATION_DEFAULTS,
        "allowed_treatment_categories": list(ORIENTATION_TREATMENT_CATEGORIES),
        "allowed_days_of_week": list(ORIENTATION_DAY_OF_WEEK_VALUES),
    }


# ─── Admin: Settings ──────────────────────────────────────

@router.get("/admin/clinics/{clinic_id}/orientation-settings")
async def admin_get_orientation_settings(
    clinic_id: str,
    user: AdminUser = Depends(get_current_user),
):
    clinic = await _load_clinic_or_404(clinic_id)
    return await _build_settings_response(clinic)


@router.put("/admin/clinics/{clinic_id}/orientation-settings")
async def admin_put_orientation_settings(
    clinic_id: str,
    payload: ClinicOnlineOrientationSettingsUpdate,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    clinic = await _load_clinic_or_404(clinic_id)
    before = await _load_or_default_settings(clinic_id)
    # Strip the marker before persisting.
    before_clean = {k: v for k, v in before.items() if k != "_default"}

    patch: Dict[str, Any] = payload.model_dump(exclude_none=True)
    if not patch and not before.get("_default"):
        # Nothing to do — but still return the latest snapshot so the
        # admin UI can refresh deterministically.
        return await _build_settings_response(clinic)

    now = _now_iso_dt()
    merged = {**before_clean, **patch, "updated_at": now}
    if before.get("_default"):
        merged["created_at"] = now

    # Persist via upsert keyed by clinic_id (one doc per clinic).
    await db.get_collection(SETTINGS_COL).update_one(
        {"clinic_id": clinic_id},
        {"$set": merged},
        upsert=True,
    )

    # Emit fine-grained audit events for the toggle transitions admins
    # actually care about.
    events: List[str] = []
    if "enabled" in patch and patch["enabled"] != before_clean.get("enabled"):
        events.append("admin_online_orientation_enabled" if patch["enabled"] else "admin_online_orientation_disabled")
    if "addon_enabled_for_basic" in patch and patch["addon_enabled_for_basic"] != before_clean.get("addon_enabled_for_basic"):
        events.append(
            "admin_online_orientation_addon_enabled" if patch["addon_enabled_for_basic"]
            else "admin_online_orientation_addon_disabled"
        )
    if not events:
        events.append("admin_online_orientation_settings_updated")
    for ev in events:
        try:
            await audit_log(
                ev,
                actor=user, actor_type="admin",
                target_type="clinic", target_id=clinic_id,
                target_summary=clinic.get("clinic_name") or clinic.get("name"),
                before_state=before_clean if not before.get("_default") else None,
                after_state=merged,
                severity="info", request=request,
            )
        except Exception as exc:  # never block on audit failure
            logger.warning(f"audit_log({ev}) failed: {exc}")

    return await _build_settings_response(clinic)


# ─── Admin: Availability rows ─────────────────────────────

@router.get("/admin/clinics/{clinic_id}/orientation-availability")
async def admin_list_orientation_availability(
    clinic_id: str,
    user: AdminUser = Depends(get_current_user),
):
    await _load_clinic_or_404(clinic_id)
    rows = await _list_availability(clinic_id)
    return {"availability": rows, "allowed_days_of_week": list(ORIENTATION_DAY_OF_WEEK_VALUES)}


@router.post("/admin/clinics/{clinic_id}/orientation-availability")
async def admin_create_orientation_availability(
    clinic_id: str,
    payload: ClinicOnlineOrientationAvailabilityCreate,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    clinic = await _load_clinic_or_404(clinic_id)
    _validate_times(payload.start_time, payload.end_time)
    now = _now_iso_dt()
    doc = {
        "id": str(uuid.uuid4()),
        "clinic_id": clinic_id,
        "day_of_week": payload.day_of_week,
        "start_time": payload.start_time,
        "end_time": payload.end_time,
        "is_active": payload.is_active,
        "created_at": now,
        "updated_at": now,
    }
    await db.get_collection(AVAIL_COL).insert_one({**doc})
    try:
        await audit_log(
            "admin_online_orientation_availability_created",
            actor=user, actor_type="admin",
            target_type="clinic", target_id=clinic_id,
            target_summary=clinic.get("clinic_name") or clinic.get("name"),
            after_state=doc, severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"audit_log(availability_created) failed: {exc}")
    return _serialise_dt(doc)


@router.patch("/admin/clinics/{clinic_id}/orientation-availability/{row_id}")
async def admin_update_orientation_availability(
    clinic_id: str,
    row_id: str,
    payload: ClinicOnlineOrientationAvailabilityUpdate,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    clinic = await _load_clinic_or_404(clinic_id)
    before = await db.get_collection(AVAIL_COL).find_one(
        {"clinic_id": clinic_id, "id": row_id}, {"_id": 0}
    )
    if not before:
        raise HTTPException(status_code=404, detail="Availability row not found")
    patch = payload.model_dump(exclude_none=True)
    if "start_time" in patch or "end_time" in patch:
        new_start = patch.get("start_time", before["start_time"])
        new_end = patch.get("end_time", before["end_time"])
        _validate_times(new_start, new_end)
    if not patch:
        return _serialise_dt(before)
    patch["updated_at"] = _now_iso_dt()
    await db.get_collection(AVAIL_COL).update_one(
        {"clinic_id": clinic_id, "id": row_id},
        {"$set": patch},
    )
    after = {**before, **patch}
    try:
        await audit_log(
            "admin_online_orientation_availability_updated",
            actor=user, actor_type="admin",
            target_type="clinic", target_id=clinic_id,
            target_summary=clinic.get("clinic_name") or clinic.get("name"),
            before_state=before, after_state=after,
            severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"audit_log(availability_updated) failed: {exc}")
    return _serialise_dt(after)


@router.delete("/admin/clinics/{clinic_id}/orientation-availability/{row_id}")
async def admin_delete_orientation_availability(
    clinic_id: str,
    row_id: str,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    clinic = await _load_clinic_or_404(clinic_id)
    before = await db.get_collection(AVAIL_COL).find_one(
        {"clinic_id": clinic_id, "id": row_id}, {"_id": 0}
    )
    if not before:
        raise HTTPException(status_code=404, detail="Availability row not found")
    await db.get_collection(AVAIL_COL).delete_one(
        {"clinic_id": clinic_id, "id": row_id}
    )
    try:
        await audit_log(
            "admin_online_orientation_availability_deleted",
            actor=user, actor_type="admin",
            target_type="clinic", target_id=clinic_id,
            target_summary=clinic.get("clinic_name") or clinic.get("name"),
            before_state=before, severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"audit_log(availability_deleted) failed: {exc}")
    return {"deleted": True, "id": row_id}


# ─── Clinic dashboard: read-only ──────────────────────────

@router.get("/clinic/orientation-settings")
async def clinic_get_orientation_settings(
    clinic=Depends(get_current_clinic),
):
    """Read-only view of the *settings* for the clinic's own dashboard.

    The commercial and trust knobs (enabled, add-on, free-slot limit,
    quiz/contact requirements, disclaimer) stay admin-owned. The clinic
    owns its own availability — see the endpoints below."""
    payload = await _build_settings_response(clinic)
    # Strip internal admin notes — they are NOT for clinic eyes.
    settings = payload.get("settings") or {}
    if "internal_admin_notes" in settings:
        settings.pop("internal_admin_notes", None)
    payload["settings"] = settings
    # Also strip the admin-only reason strings from the access report.
    access = payload.get("access") or {}
    access.pop("reasons", None)
    payload["access"] = access
    return payload


# ─── Clinic dashboard: self-serve availability ────────────
#
# Availability is the one part of online orientation the clinic must own:
# only they know when their doctors are free. Everything commercial stays
# with admin. This mirrors `/clinic/availability/rules` in bookings.py,
# which has been self-serve for the in-person booking engine since Feb
# 2026 — the online-orientation engine shipped admin-only, which meant
# Zubite staff had to hand-enter slots for every partner.

# Statuses where the clinic's package actually grants the feature.
_ORIENTATION_ACTIVE_STATUSES = frozenset({"included_in_plan", "addon_enabled"})


async def _require_orientation_access(clinic: Dict[str, Any]) -> Dict[str, Any]:
    """403 unless online orientation is currently live for this clinic.

    Gating writes on the same status the patient funnel reads keeps a
    clinic from publishing windows that would never surface to anyone.
    """
    settings = await _load_or_default_settings(clinic["id"])
    access = get_online_orientation_access_status(clinic, settings)
    if access.get("status") not in _ORIENTATION_ACTIVE_STATUSES:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "orientation_not_available",
                "message": "Онлайн ориентацията не е активна за вашия профил.",
                "access_status": access.get("status"),
            },
        )
    return settings


@router.get("/clinic/orientation-availability")
async def clinic_list_orientation_availability(
    clinic=Depends(get_current_clinic),
):
    """List own windows. Deliberately NOT access-gated: a clinic whose
    orientation was switched off should still see what it had configured
    rather than an empty screen it cannot explain."""
    settings = await _load_or_default_settings(clinic["id"])
    access = get_online_orientation_access_status(clinic, settings)
    rows = await _list_availability(clinic["id"])
    return {
        "availability": rows,
        "availability_summary": _availability_summary(rows),
        "allowed_days_of_week": list(ORIENTATION_DAY_OF_WEEK_VALUES),
        "can_edit": access.get("status") in _ORIENTATION_ACTIVE_STATUSES,
        "access_status": access.get("status"),
        "slot_duration_minutes": settings.get("slot_duration_minutes"),
    }


@router.post("/clinic/orientation-availability")
async def clinic_create_orientation_availability(
    payload: ClinicOnlineOrientationAvailabilityCreate,
    request: Request,
    clinic=Depends(get_current_clinic),
):
    await _require_orientation_access(clinic)
    _validate_times(payload.start_time, payload.end_time)
    await _reject_overlap(clinic["id"], payload.day_of_week, payload.start_time, payload.end_time)
    now = _now_iso_dt()
    doc = {
        "id": str(uuid.uuid4()),
        "clinic_id": clinic["id"],
        "day_of_week": payload.day_of_week,
        "start_time": payload.start_time,
        "end_time": payload.end_time,
        "is_active": payload.is_active,
        "created_at": now,
        "updated_at": now,
    }
    await db.get_collection(AVAIL_COL).insert_one({**doc})
    try:
        await audit_log(
            "clinic_online_orientation_availability_created",
            actor=clinic, actor_type="clinic",
            target_type="clinic", target_id=clinic["id"],
            target_summary=clinic.get("clinic_name") or clinic.get("name"),
            after_state=doc, severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"audit_log(clinic availability_created) failed: {exc}")
    return _serialise_dt(doc)


@router.patch("/clinic/orientation-availability/{row_id}")
async def clinic_update_orientation_availability(
    row_id: str,
    payload: ClinicOnlineOrientationAvailabilityUpdate,
    request: Request,
    clinic=Depends(get_current_clinic),
):
    await _require_orientation_access(clinic)
    before = await db.get_collection(AVAIL_COL).find_one(
        {"clinic_id": clinic["id"], "id": row_id}, {"_id": 0}
    )
    if not before:
        raise HTTPException(status_code=404, detail="Availability row not found")
    patch = payload.model_dump(exclude_none=True)
    if not patch:
        return _serialise_dt(before)
    new_start = patch.get("start_time", before["start_time"])
    new_end = patch.get("end_time", before["end_time"])
    new_day = patch.get("day_of_week", before["day_of_week"])
    if "start_time" in patch or "end_time" in patch:
        _validate_times(new_start, new_end)
    if {"start_time", "end_time", "day_of_week"} & set(patch):
        await _reject_overlap(clinic["id"], new_day, new_start, new_end, exclude_id=row_id)
    patch["updated_at"] = _now_iso_dt()
    await db.get_collection(AVAIL_COL).update_one(
        {"clinic_id": clinic["id"], "id": row_id},
        {"$set": patch},
    )
    after = {**before, **patch}
    try:
        await audit_log(
            "clinic_online_orientation_availability_updated",
            actor=clinic, actor_type="clinic",
            target_type="clinic", target_id=clinic["id"],
            target_summary=clinic.get("clinic_name") or clinic.get("name"),
            before_state=before, after_state=after,
            severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"audit_log(clinic availability_updated) failed: {exc}")
    return _serialise_dt(after)


@router.delete("/clinic/orientation-availability/{row_id}")
async def clinic_delete_orientation_availability(
    row_id: str,
    request: Request,
    clinic=Depends(get_current_clinic),
):
    await _require_orientation_access(clinic)
    before = await db.get_collection(AVAIL_COL).find_one(
        {"clinic_id": clinic["id"], "id": row_id}, {"_id": 0}
    )
    if not before:
        raise HTTPException(status_code=404, detail="Availability row not found")
    await db.get_collection(AVAIL_COL).delete_one(
        {"clinic_id": clinic["id"], "id": row_id}
    )
    try:
        await audit_log(
            "clinic_online_orientation_availability_deleted",
            actor=clinic, actor_type="clinic",
            target_type="clinic", target_id=clinic["id"],
            target_summary=clinic.get("clinic_name") or clinic.get("name"),
            before_state=before, severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"audit_log(clinic availability_deleted) failed: {exc}")
    return {"deleted": True, "id": row_id}
