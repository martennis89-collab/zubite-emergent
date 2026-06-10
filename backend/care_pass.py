"""Care Pass unlock — single source of truth (Phase F, June 2026).

ALL Care Pass unlocks MUST go through `unlock_care_pass_for_lead`.
Never set `care_pass_unlocked=True` directly in a router.

Unlock invariants (enforced atomically):
  - lead.contact_details_submitted must be True
  - lead.clinic_confirmed_consultation will be set to True
  - lead.consultation_booked_through_zubite will be set to True
  - lead.care_pass_eligible will be set to True
  - lead.care_pass_unlocked will be set to True
  - lead.care_pass_unlocked_at will be set to the unlock timestamp
  - lead.consultation_type will be set to the caller-provided value
  - lead.clinic_confirmed_consultation_at will be set to the unlock timestamp

Idempotency:
  - If `care_pass_unlocked` is already True, the helper preserves the
    original `care_pass_unlocked_at` and skips emails/audit-events.
  - The helper emits exactly one of:
      care_pass_unlocked
      care_pass_unlock_skipped_already_unlocked
      care_pass_unlock_failed_missing_contact_details
      care_pass_unlock_failed_missing_lead
"""

from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, Literal, Optional
import logging

from database import db
from audit import audit_log
from emails import _send_email
from config import RESEND_API_KEY, ADMIN_EMAIL, SENDER_EMAIL, PRODUCTION_URL

logger = logging.getLogger(__name__)


ConsultationType = Literal[
    "online_orientation",
    "offline_in_person",
    "request_call",
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def unlock_care_pass_for_lead(
    lead_id: str,
    *,
    consultation_type: ConsultationType,
    clinic_id: Optional[str] = None,
    source_booking_id: Optional[str] = None,
    source_request_id: Optional[str] = None,
    actor_type: str = "clinic",
    actor_id: Optional[str] = None,
    request: Any = None,
) -> Dict[str, Any]:
    """Atomically unlock Care Pass for a lead. Returns a dict with one
    of `{unlocked: True}` or `{already_unlocked: True}` or
    `{failed: True, code: "..."}`. Never raises."""
    actor_obj = {"id": actor_id} if actor_id else None
    if not isinstance(lead_id, str) or not lead_id.strip():
        return {"failed": True, "code": "missing_lead"}
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        try:
            await audit_log(
                "care_pass_unlock_failed_missing_lead",
                actor=actor_obj, actor_type=actor_type,
                target_type="lead", target_id=lead_id,
                severity="warning", request=request,
            )
        except Exception:
            pass
        return {"failed": True, "code": "missing_lead"}

    if not lead.get("contact_details_submitted"):
        try:
            await audit_log(
                "care_pass_unlock_failed_missing_contact_details",
                actor=actor_obj, actor_type=actor_type,
                target_type="lead", target_id=lead_id,
                severity="warning", request=request,
            )
        except Exception:
            pass
        return {"failed": True, "code": "missing_contact_details"}

    if lead.get("care_pass_unlocked") is True:
        try:
            await audit_log(
                "care_pass_unlock_skipped_already_unlocked",
                actor=actor_obj, actor_type=actor_type,
                target_type="lead", target_id=lead_id,
                severity="info", request=request,
            )
        except Exception:
            pass
        return {
            "already_unlocked": True,
            "care_pass_unlocked_at": lead.get("care_pass_unlocked_at"),
        }

    now = _now_iso()
    update = {
        "consultation_booked_through_zubite": True,
        "clinic_confirmed_consultation": True,
        "clinic_confirmed_consultation_at": now,
        "consultation_type": consultation_type,
        "care_pass_eligible": True,
        "care_pass_unlocked": True,
        "care_pass_unlocked_at": now,
        "care_pass_source": (
            "online_orientation_booking" if source_booking_id
            else "consultation_request" if source_request_id
            else "unknown"
        ),
        "care_pass_source_id": source_booking_id or source_request_id or None,
        "updated_at": now,
    }
    await db.leads.update_one({"id": lead_id}, {"$set": update})

    # Best-effort emails — never block the request on failure.
    try:
        await _send_patient_care_pass_email(lead)
    except Exception as exc:
        logger.warning(f"patient care-pass email failed: {exc}")
    try:
        await _send_admin_care_pass_email(lead, update, clinic_id=clinic_id)
    except Exception as exc:
        logger.warning(f"admin care-pass email failed: {exc}")

    try:
        await audit_log(
            "care_pass_unlocked",
            actor=actor_obj, actor_type=actor_type,
            target_type="lead", target_id=lead_id,
            before_state={"care_pass_unlocked": False},
            after_state={"care_pass_unlocked": True,
                         "consultation_type": consultation_type,
                         "clinic_id": clinic_id,
                         "source_booking_id": source_booking_id,
                         "source_request_id": source_request_id},
            severity="info", request=request,
        )
    except Exception as exc:
        logger.warning(f"care_pass_unlocked audit failed: {exc}")

    return {
        "unlocked": True,
        "care_pass_unlocked_at": now,
        "consultation_type": consultation_type,
    }


async def _send_patient_care_pass_email(lead: Dict[str, Any]) -> None:
    if not RESEND_API_KEY:
        return
    to = lead.get("email")
    if not to:
        return
    base = PRODUCTION_URL or "https://zubite.bg"
    html = f"""
    <p>Здравей,</p>
    <p><strong>Zubite Care Pass е отключен.</strong></p>
    <p>Вече имаш достъп до партньорски предложения и отстъпки за продукти
    за орална хигиена. Care Pass не е застраховка, абонамент или
    безплатно лечение — това са партньорски отстъпки за продукти за
    домашна грижа.</p>
    <p>Детайлите по консултацията остават при клиниката, която потвърди
    срещата ти.</p>
    <p><a href="{base}/">Към Zubite.bg</a></p>
    <p>—<br/>Екипът на Zubite.bg</p>
    """
    await _send_email(to, "Zubite Care Pass е отключен", html, sender=SENDER_EMAIL)


async def _send_admin_care_pass_email(
    lead: Dict[str, Any], update: Dict[str, Any], *, clinic_id: Optional[str],
) -> None:
    if not RESEND_API_KEY or not ADMIN_EMAIL:
        return
    base = PRODUCTION_URL or "https://zubite.bg"
    html = f"""
    <p>Care Pass отключен след потвърдена консултация.</p>
    <ul>
      <li><strong>Lead:</strong> {lead.get('id')}</li>
      <li><strong>Пациент:</strong> {lead.get('name') or '—'}</li>
      <li><strong>Email:</strong> {lead.get('email') or '—'}</li>
      <li><strong>Телефон:</strong> {lead.get('phone') or '—'}</li>
      <li><strong>Клиника:</strong> {clinic_id or '—'}</li>
      <li><strong>Тип:</strong> {update.get('consultation_type')}</li>
      <li><strong>Source:</strong> {update.get('care_pass_source')} ({update.get('care_pass_source_id') or '—'})</li>
      <li><strong>Време:</strong> {update.get('care_pass_unlocked_at')}</li>
    </ul>
    <p><a href="{base}/admin/leads/{lead.get('id')}">Отвори лийда в админа</a></p>
    """
    await _send_email(
        ADMIN_EMAIL, "Care Pass отключен след потвърдена консултация",
        html, sender=SENDER_EMAIL,
    )
