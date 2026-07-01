"""Zubite.bg Consultation Booking Engine — Feb 2026.

Own module (not the existing `online_orientation_bookings`) because
this is a distinct product: full clinic consultation booking driven
by patient-reported quiz context.

Collections
-----------
• `clinic_bookings`               — one document per booking
• `clinic_availability_rules`     — weekly recurring rules
• `clinic_booking_exceptions`     — one-off blocks / extra slots

Timezone
--------
All persisted `_start`/`_end` fields are ISO strings in
`Europe/Sofia` local time. Slot generation treats naive "HH:MM"
weekly rules as Sofia local. Historical UTC offset is baked into
the ISO string (Sofia is UTC+2 winter, UTC+3 summer). This is
intentional — patients see local times, clinics see local times,
audit sees local times, no timezone acrobatics anywhere in the UI.

Guardrails
----------
• Verified Profile clinics have `booking_enabled=False` unless an
  explicit admin `entitlement_overrides` entry flips it — same path
  as any other entitlement override (persisted + audit-logged).
• Double-booking prevented at write time via a Mongo query on
  `(clinic_id, selected_slot_start, status IN [pending_confirmation,
  confirmed])`.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone as _tz
from typing import Any, Dict, List, Optional
try:
    from zoneinfo import ZoneInfo
    SOFIA = ZoneInfo("Europe/Sofia")
except Exception:  # pragma: no cover
    SOFIA = _tz(timedelta(hours=2))  # crude fallback

BOOKING_COL = "clinic_bookings"
AVAILABILITY_COL = "clinic_availability_rules"
EXCEPTION_COL = "clinic_booking_exceptions"

# ─── Enums ──────────────────────────────────────────────────────
BOOKING_STATUSES = (
    "pending_confirmation", "confirmed", "cancelled_by_patient",
    "cancelled_by_clinic", "rescheduled", "completed", "no_show",
)
BOOKING_SOURCES = (
    "quiz_result", "clinic_profile", "article",
    "admin_manual", "campaign",
)
CONSULTATION_TYPES = (
    "initial_consultation", "orthodontic_consultation",
    "implant_consultation", "hygiene_consultation",
    "aesthetic_consultation", "other",
)
DAYS_OF_WEEK = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
EXCEPTION_TYPES = ("full_day_block", "partial_block", "extra_available_slot")

# ─── Defaults ───────────────────────────────────────────────────
DEFAULT_MIN_LEAD_HOURS = 12
DEFAULT_HORIZON_DAYS = 30
DEFAULT_SLOT_MIN = 30
DEFAULT_BUFFER_MIN = 0


# ─── Helpers ────────────────────────────────────────────────────
def now_sofia() -> datetime:
    return datetime.now(SOFIA)


def parse_hhmm(s: str) -> Optional[tuple[int, int]]:
    """Parse 'HH:MM' → (hh, mm) or None on error."""
    if not isinstance(s, str) or len(s) < 4 or ":" not in s:
        return None
    try:
        h, m = s.split(":", 1)
        hh, mm = int(h), int(m)
        if 0 <= hh <= 23 and 0 <= mm <= 59:
            return hh, mm
    except (TypeError, ValueError):
        return None
    return None


def iso_sofia(dt: datetime) -> str:
    """Return an ISO-8601 string in Sofia local time (with offset)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=SOFIA)
    else:
        dt = dt.astimezone(SOFIA)
    return dt.isoformat()


# ─── Slot generation ────────────────────────────────────────────
def generate_slots(
    *,
    rules: List[Dict[str, Any]],
    exceptions: List[Dict[str, Any]],
    booked_starts: set[str],
    horizon_days: int = DEFAULT_HORIZON_DAYS,
    min_lead_hours: int = DEFAULT_MIN_LEAD_HOURS,
    now: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """Materialise concrete slots from weekly rules for the next
    `horizon_days` in Sofia local time.

    Args:
      rules: active weekly rules (day_of_week, start_time HH:MM,
             end_time HH:MM, slot_duration_minutes, buffer_minutes,
             consultation_type, doctor_id optional, valid_from/until).
      exceptions: rows from `clinic_booking_exceptions` — full-day
                  blocks, partial blocks, and extra_available_slot.
      booked_starts: set of ISO-Sofia start strings that are already
                     confirmed / pending — those are removed.
      horizon_days: how many days ahead to generate (default 30).
      min_lead_hours: hide slots that begin sooner than N hours
                      from `now`. Default 12h.
      now: optional injected `datetime` for testability.

    Returns:
      Sorted list of `{start, end, consultation_type, doctor_id?}`.
    """
    now_dt = (now or now_sofia())
    if now_dt.tzinfo is None:
        now_dt = now_dt.replace(tzinfo=SOFIA)
    else:
        now_dt = now_dt.astimezone(SOFIA)
    cutoff_dt = now_dt + timedelta(hours=max(0, min_lead_hours))

    # Build exception maps.
    full_day_blocks: set[str] = set()  # 'YYYY-MM-DD'
    partial_blocks: List[tuple[str, str, str]] = []  # (date, start_hhmm, end_hhmm)
    extras: List[Dict[str, Any]] = []
    for ex in exceptions or []:
        ex_type = (ex.get("type") or "").lower()
        ex_date = (ex.get("date") or "").strip()
        if not ex_date:
            continue
        if ex_type == "full_day_block":
            full_day_blocks.add(ex_date)
        elif ex_type == "partial_block":
            partial_blocks.append((ex_date, ex.get("start_time") or "00:00", ex.get("end_time") or "23:59"))
        elif ex_type == "extra_available_slot":
            extras.append(ex)

    out: List[Dict[str, Any]] = []
    horizon_end = (now_dt + timedelta(days=max(1, horizon_days))).date()
    d = now_dt.date()
    while d <= horizon_end:
        dow_key = DAYS_OF_WEEK[d.weekday()]
        date_str = d.isoformat()
        if date_str in full_day_blocks:
            d += timedelta(days=1)
            continue
        for r in rules or []:
            if not r.get("is_active", True):
                continue
            if (r.get("day_of_week") or "").lower() != dow_key:
                continue
            # Validity window (loose ISO date compare).
            vf, vu = r.get("valid_from"), r.get("valid_until")
            if vf and date_str < vf:
                continue
            if vu and date_str > vu:
                continue
            sh_mm = parse_hhmm(r.get("start_time") or "")
            eh_mm = parse_hhmm(r.get("end_time") or "")
            if not sh_mm or not eh_mm:
                continue
            slot_min = int(r.get("slot_duration_minutes") or DEFAULT_SLOT_MIN)
            buffer_min = int(r.get("buffer_minutes") or DEFAULT_BUFFER_MIN)
            if slot_min <= 0:
                continue
            step_min = slot_min + buffer_min

            slot_start = datetime(d.year, d.month, d.day, sh_mm[0], sh_mm[1], tzinfo=SOFIA)
            day_end = datetime(d.year, d.month, d.day, eh_mm[0], eh_mm[1], tzinfo=SOFIA)
            while slot_start + timedelta(minutes=slot_min) <= day_end:
                slot_end = slot_start + timedelta(minutes=slot_min)
                if slot_start >= cutoff_dt:
                    # Skip if inside a partial block on the same date.
                    blocked = False
                    for ex_date, bs, be in partial_blocks:
                        if ex_date != date_str:
                            continue
                        bs_hm = parse_hhmm(bs); be_hm = parse_hhmm(be)
                        if not bs_hm or not be_hm:
                            continue
                        bs_dt = datetime(d.year, d.month, d.day, bs_hm[0], bs_hm[1], tzinfo=SOFIA)
                        be_dt = datetime(d.year, d.month, d.day, be_hm[0], be_hm[1], tzinfo=SOFIA)
                        # Overlap check
                        if slot_start < be_dt and slot_end > bs_dt:
                            blocked = True
                            break
                    start_iso = iso_sofia(slot_start)
                    if not blocked and start_iso not in booked_starts:
                        out.append({
                            "start": start_iso,
                            "end": iso_sofia(slot_end),
                            "consultation_type": r.get("consultation_type") or "initial_consultation",
                            "doctor_id": r.get("doctor_id") or None,
                        })
                slot_start += timedelta(minutes=step_min)
        d += timedelta(days=1)

    # Layer in explicit extras (one-off available slots).
    for ex in extras:
        ex_date = (ex.get("date") or "").strip()
        st = parse_hhmm(ex.get("start_time") or "")
        en = parse_hhmm(ex.get("end_time") or "")
        if not ex_date or not st or not en:
            continue
        try:
            y, mo, dd = [int(x) for x in ex_date.split("-")]
        except (TypeError, ValueError):
            continue
        s_dt = datetime(y, mo, dd, st[0], st[1], tzinfo=SOFIA)
        e_dt = datetime(y, mo, dd, en[0], en[1], tzinfo=SOFIA)
        if s_dt < cutoff_dt:
            continue
        start_iso = iso_sofia(s_dt)
        if start_iso in booked_starts:
            continue
        out.append({
            "start": start_iso,
            "end": iso_sofia(e_dt),
            "consultation_type": "other",
            "doctor_id": ex.get("doctor_id") or None,
        })

    out.sort(key=lambda x: x["start"])
    return out


# ─── Email helpers ──────────────────────────────────────────────
def patient_confirmation_email(*, booking: Dict[str, Any], clinic: Dict[str, Any]) -> tuple[str, str]:
    """Return (subject, html_body). Copy is exactly as specified in
    the product brief."""
    subject = "Потвърждение за консултация чрез Zubite.bg"
    lines = [
        f"<p>Здравей {booking.get('patient_name', '')},</p>",
        "<p>Твоята консултация е успешно заявена чрез Zubite.bg.</p>",
        "<ul>",
        f"<li><b>Клиника:</b> {clinic.get('clinic_name') or clinic.get('name') or ''}</li>",
        f"<li><b>Дата и час:</b> {booking.get('selected_slot_start_display', booking.get('selected_slot_start'))}</li>",
    ]
    if clinic.get("address"):
        lines.append(f"<li><b>Адрес:</b> {clinic.get('address')}</li>")
    if booking.get("treatment_category"):
        lines.append(f"<li><b>Тип консултация:</b> {booking.get('treatment_category')}</li>")
    lines += [
        "</ul>",
        "<p><i>Zubite.bg не е клиника и не поставя диагноза. Информацията служи за ориентация и подготовка за консултация.</i></p>",
        "<p>Ще получиш напомняне 1 ден преди часа. Ако не можеш да присъстваш, моля свържи се директно с клиниката.</p>",
        "<p>— Екипът на Zubite.bg</p>",
    ]
    return subject, "\n".join(lines)


def clinic_notification_email(*, booking: Dict[str, Any], clinic: Dict[str, Any], booking_url: Optional[str] = None) -> tuple[str, str]:
    subject = "Нова консултация от Zubite.bg"
    quiz_ctx = booking.get("quiz_context_snapshot") or {}
    quiz_html = ""
    if quiz_ctx:
        rows = "".join(f"<li><b>{k}:</b> {v}</li>" for k, v in list(quiz_ctx.items())[:12])
        quiz_html = f"<p><b>Контекст от въпросника (patient-reported):</b></p><ul>{rows}</ul>"
    lines = [
        f"<p>Нова консултация е заявена през Zubite.bg.</p>",
        "<ul>",
        f"<li><b>Пациент:</b> {booking.get('patient_name', '')}</li>",
        f"<li><b>Телефон:</b> {booking.get('patient_phone', '')}</li>",
        f"<li><b>Имейл:</b> {booking.get('patient_email', '')}</li>",
        f"<li><b>Дата и час:</b> {booking.get('selected_slot_start_display', booking.get('selected_slot_start'))}</li>",
    ]
    if booking.get("treatment_category"):
        lines.append(f"<li><b>Тип консултация:</b> {booking.get('treatment_category')}</li>")
    if booking.get("patient_concern_summary"):
        lines.append(f"<li><b>Кратко описание:</b> {booking.get('patient_concern_summary')}</li>")
    if booking.get("source"):
        lines.append(f"<li><b>Източник:</b> {booking.get('source')}</li>")
    lines.append("</ul>")
    if quiz_html:
        lines.append(quiz_html)
    if booking_url:
        lines.append(f'<p><a href="{booking_url}">Виж резервацията в клиничния панел</a></p>')
    lines.append("<p><i>Zubite.bg не е клиника и не поставя диагноза. Информацията служи за ориентация и подготовка за консултация.</i></p>")
    return subject, "\n".join(lines)


def patient_reminder_email(*, booking: Dict[str, Any], clinic: Dict[str, Any]) -> tuple[str, str]:
    subject = "Напомняне за консултация утре"
    lines = [
        f"<p>Здравей {booking.get('patient_name', '')},</p>",
        "<p>Това е напомняне за твоята консултация утре.</p>",
        "<ul>",
        f"<li><b>Клиника:</b> {clinic.get('clinic_name') or clinic.get('name') or ''}</li>",
        f"<li><b>Дата и час:</b> {booking.get('selected_slot_start_display', booking.get('selected_slot_start'))}</li>",
    ]
    if clinic.get("address"):
        lines.append(f"<li><b>Адрес:</b> {clinic.get('address')}</li>")
    lines += [
        "</ul>",
        "<p>Ако не можеш да присъстваш, моля свържи се директно с клиниката.</p>",
        "<p><i>Zubite.bg не е клиника и не поставя диагноза. Информацията служи за ориентация и подготовка за консултация.</i></p>",
        "<p>— Екипът на Zubite.bg</p>",
    ]
    return subject, "\n".join(lines)


def clinic_cancellation_email(*, booking: Dict[str, Any], clinic: Dict[str, Any]) -> tuple[str, str]:
    subject = "Отмяна на консултация чрез Zubite.bg"
    lines = [
        f"<p>Здравей {booking.get('patient_name', '')},</p>",
        f"<p>Твоята консултация с <b>{clinic.get('clinic_name') or clinic.get('name') or ''}</b> "
        f"на {booking.get('selected_slot_start_display', booking.get('selected_slot_start'))} беше отменена.</p>",
    ]
    if booking.get("cancel_reason"):
        lines.append(f"<p>Причина: {booking.get('cancel_reason')}</p>")
    lines += [
        "<p>Можеш да избереш друг час или да провериш други клиники през Zubite.bg.</p>",
        "<p>— Екипът на Zubite.bg</p>",
    ]
    return subject, "\n".join(lines)


TRUST_DISCLAIMER_HTML = (
    "<i>Zubite.bg не е клиника и не поставя диагноза. Информацията служи за "
    "ориентация и подготовка за консултация.</i>"
)
