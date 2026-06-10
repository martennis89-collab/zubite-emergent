"""Online Orientation slot generation + lazy expiry (Phase E — June 2026).

Pure helpers — no FastAPI. Used by both patient-facing endpoints
(eligible-clinics list + slots) and tests.

Behaviour summary
─────────────────
- 14-day horizon, Europe/Sofia timezone.
- Slots are generated from `ClinicOnlineOrientationAvailability` rows
  using `slot_duration_minutes` and `booking_buffer_minutes` from
  `ClinicOnlineOrientationSettings`.
- Filtered out: past slots, slots within 2-hour minimum patient notice,
  slots overlapping with active-lock bookings (pending / confirmed /
  scheduled), slots that would exceed `max_bookings_per_day` on that
  day, slots that would exceed `monthly_free_slot_limit` for the
  current calendar month.

Lazy expiry
───────────
- `expire_pending_bookings()` flips `pending_clinic_confirmation` →
  `expired_pending_confirmation` for any booking whose `expires_at`
  is in the past. Called on every read-side endpoint that touches
  the bookings collection.
"""

from __future__ import annotations
from datetime import datetime, timezone, timedelta, date
from typing import Any, Dict, List, Optional, Tuple
import logging

try:
    from zoneinfo import ZoneInfo  # Python 3.9+
    SOFIA_TZ: Any = ZoneInfo("Europe/Sofia")
except Exception:  # pragma: no cover — fallback if tzdata is missing
    SOFIA_TZ = timezone(timedelta(hours=2))

logger = logging.getLogger(__name__)


# Days in the upcoming window (inclusive of today).
SLOT_HORIZON_DAYS = 14
# Minimum notice between "now" and the slot start (hours).
MIN_NOTICE_HOURS = 2

# Booking statuses that block another patient from picking the same slot.
ACTIVE_LOCK_STATUSES = (
    "pending_clinic_confirmation",
    "confirmed_by_clinic",
    "scheduled",
)

# python weekday() index → day_of_week string used in the availability docs.
_PY_WEEKDAY_TO_NAME = {
    0: "monday", 1: "tuesday", 2: "wednesday", 3: "thursday",
    4: "friday", 5: "saturday", 6: "sunday",
}


def _parse_hhmm(s: str) -> Tuple[int, int]:
    h, m = s.split(":")
    return int(h), int(m)


async def expire_pending_bookings(db, clinic_id: Optional[str] = None) -> int:
    """Lazy expiry. Returns the number of rows transitioned.

    Idempotent: callers can invoke this on every read.
    """
    now = datetime.now(timezone.utc)
    query: Dict[str, Any] = {
        "status": "pending_clinic_confirmation",
        "expires_at": {"$lte": now.isoformat()},
    }
    if clinic_id:
        query["clinic_id"] = clinic_id
    res = await db.online_orientation_bookings.update_many(
        query,
        {"$set": {
            "status": "expired_pending_confirmation",
            "expired_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }},
    )
    return getattr(res, "modified_count", 0) or 0


async def _load_clinic_bookings_for_window(
    db, clinic_id: str, start: datetime, end: datetime,
) -> List[Dict[str, Any]]:
    """All bookings for the given clinic with `scheduled_at` between
    `start` and `end` (inclusive) and a status that locks the slot."""
    cur = db.online_orientation_bookings.find(
        {
            "clinic_id": clinic_id,
            "status": {"$in": list(ACTIVE_LOCK_STATUSES)},
            "scheduled_at": {
                "$gte": start.isoformat(),
                "$lte": end.isoformat(),
            },
        },
        {"_id": 0, "scheduled_at": 1, "duration_minutes": 1, "status": 1, "id": 1},
    )
    return await cur.to_list(2000)


async def _count_monthly_bookings(db, clinic_id: str, ref_now: datetime) -> int:
    """Count active-lock bookings for the clinic in the current calendar
    month (UTC reference)."""
    month_start = ref_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if ref_now.month == 12:
        next_month = month_start.replace(year=ref_now.year + 1, month=1)
    else:
        next_month = month_start.replace(month=ref_now.month + 1)
    return await db.online_orientation_bookings.count_documents({
        "clinic_id": clinic_id,
        "status": {"$in": list(ACTIVE_LOCK_STATUSES)},
        "scheduled_at": {
            "$gte": month_start.isoformat(),
            "$lt": next_month.isoformat(),
        },
    })


async def generate_slots_for_clinic(
    db,
    clinic_id: str,
    settings: Dict[str, Any],
    availability_rows: List[Dict[str, Any]],
    *,
    horizon_days: int = SLOT_HORIZON_DAYS,
    min_notice_hours: int = MIN_NOTICE_HOURS,
    max_slots: int = 100,
) -> List[Dict[str, Any]]:
    """Return a list of `{slot_id, scheduled_at_utc_iso, label_local_bg}`
    for the given clinic. Caller decides whether to expose them.

    The shape is intentionally minimal — no clinic copy / pricing /
    treatment-category fan-out happens here.
    """
    duration = int(settings.get("slot_duration_minutes") or 20)
    buffer = int(settings.get("booking_buffer_minutes") or 15)
    max_per_day = int(settings.get("max_bookings_per_day") or 2)
    monthly_limit = int(settings.get("monthly_free_slot_limit") or 10)

    if duration <= 0 or not availability_rows:
        return []

    # First, lazily expire stale bookings so the counts below are correct.
    await expire_pending_bookings(db, clinic_id=clinic_id)

    now_utc = datetime.now(timezone.utc)
    now_sofia = now_utc.astimezone(SOFIA_TZ)
    min_slot_start_utc = now_utc + timedelta(hours=min_notice_hours)
    horizon_end_utc = now_utc + timedelta(days=horizon_days + 1)

    # Bulk-load existing locked bookings for the window.
    existing = await _load_clinic_bookings_for_window(
        db, clinic_id, now_utc, horizon_end_utc,
    )
    booked_starts = set(b["scheduled_at"] for b in existing if b.get("scheduled_at"))

    # Monthly cap check
    month_count = await _count_monthly_bookings(db, clinic_id, now_utc)
    if month_count >= monthly_limit:
        return []
    remaining_month = monthly_limit - month_count

    # Build per-day windows lookup
    by_day: Dict[str, List[Dict[str, Any]]] = {}
    for row in availability_rows:
        if not row.get("is_active"):
            continue
        by_day.setdefault(row["day_of_week"], []).append(row)

    out: List[Dict[str, Any]] = []
    today_sofia = now_sofia.date()
    for day_offset in range(0, horizon_days):
        day_sofia: date = today_sofia + timedelta(days=day_offset)
        weekday_name = _PY_WEEKDAY_TO_NAME[day_sofia.weekday()]
        windows = by_day.get(weekday_name, [])
        if not windows:
            continue

        # Daily cap — count active-lock bookings already on this day.
        day_lock_count = sum(
            1 for b in existing
            if _utc_iso_to_sofia_date(b.get("scheduled_at")) == day_sofia
        )
        if day_lock_count >= max_per_day:
            continue
        remaining_day = max_per_day - day_lock_count

        for w in windows:
            sh, sm = _parse_hhmm(w["start_time"])
            eh, em = _parse_hhmm(w["end_time"])
            # Build a Sofia-aware datetime for the slot start cursor.
            cursor = datetime(day_sofia.year, day_sofia.month, day_sofia.day, sh, sm, tzinfo=SOFIA_TZ)
            end_dt = datetime(day_sofia.year, day_sofia.month, day_sofia.day, eh, em, tzinfo=SOFIA_TZ)
            while cursor + timedelta(minutes=duration) <= end_dt:
                slot_start_utc = cursor.astimezone(timezone.utc)
                slot_iso = slot_start_utc.isoformat()
                # Past / min-notice filter
                if slot_start_utc < min_slot_start_utc:
                    cursor += timedelta(minutes=duration + buffer)
                    continue
                # Already booked / locked
                if slot_iso in booked_starts:
                    cursor += timedelta(minutes=duration + buffer)
                    continue
                # Within daily cap?
                if remaining_day <= 0:
                    break
                # Within monthly cap?
                if remaining_month <= 0:
                    return out
                # Emit
                local = cursor
                out.append({
                    "slot_id": f"{clinic_id}_{slot_iso}",
                    "clinic_id": clinic_id,
                    "scheduled_at": slot_iso,
                    "scheduled_at_local": local.isoformat(),
                    "duration_minutes": duration,
                    "day_of_week": weekday_name,
                    "label_local_bg": _format_label_bg(local),
                })
                remaining_day -= 1
                remaining_month -= 1
                if len(out) >= max_slots:
                    return out
                cursor += timedelta(minutes=duration + buffer)
    return out


_BG_WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"]
_BG_MONTHS = ["", "януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"]


def _format_label_bg(dt_sofia: datetime) -> str:
    """`Сряда, 12 юни · 09:00` style label."""
    return f"{_BG_WEEKDAYS[dt_sofia.weekday()]}, {dt_sofia.day} {_BG_MONTHS[dt_sofia.month]} · {dt_sofia.hour:02d}:{dt_sofia.minute:02d}"


def _utc_iso_to_sofia_date(iso: Optional[str]) -> Optional[date]:
    if not iso:
        return None
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(SOFIA_TZ).date()
    except Exception:
        return None
