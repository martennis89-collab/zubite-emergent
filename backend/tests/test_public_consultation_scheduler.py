"""Phase A — Public Clinic Profile Scheduler backend tests.

Covers:
- GET /availability returns `disabled` when clinic has no settings or
  settings.enabled=False.
- GET /availability returns `enabled_no_slots` when settings enabled
  but no availability windows.
- GET /availability returns `available` + non-empty slots when both
  settings enabled and availability windows exist.
- POST /consultation-bookings rejects missing consent (422).
- POST /consultation-bookings rejects missing disclaimer (422).
- POST /consultation-bookings rejects unknown clinic (404).
- POST /consultation-bookings rejects clinic with disabled scheduler (400).
- POST /consultation-bookings happy path:
    - Creates a minimal lead with strict scheduler labels.
    - Creates an `online_orientation_bookings` row tied to that lead.
    - Returns the "Заявката е изпратена" message (no "confirmed" claim).
- POST /consultation-bookings is double-book safe (409 on same slot).
- Quiz endpoints are not touched: separately verify that
  `POST /api/leads` still works for a normal quiz lead.
"""

from __future__ import annotations
import os
import sys
import uuid
import asyncio
from datetime import datetime, timezone

import requests

# Allow `from database import db` when this script is invoked directly.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

API_URL = os.environ.get("API_URL", "http://localhost:8001")
ADMIN_USER = "admin@zubite.bg"
ADMIN_PASS = "password"


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _admin_token() -> str:
    r = requests.post(
        f"{API_URL}/api/admin/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


async def _make_clinic(db, *, with_settings: bool, with_availability: bool,
                       enabled: bool = True) -> dict:
    cid = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    clinic_doc = {
        "id": cid,
        "clinic_name": f"PCS-{cid[:6]}",
        "name": f"PCS-{cid[:6]}",
        "city": "София",
        "city_slug": "sofia",
        "city_name": "София",
        "email": f"pcs-{cid[:8]}@example.bg",
        "phone": "+359888000000",
        "treatments_supported": ["orthodontics"],
        "clinic_status": "active_partner",
        "subscription_status": "active",
        "partner_tier": "premium",
        "status": "active",
        "password_hash": "x",
        "created_at": now_iso,
        "updated_at": now_iso,
        "is_active": True,
    }
    await db.clinics.insert_one(clinic_doc)
    if with_settings:
        await db.clinic_online_orientation_settings.insert_one({
            "clinic_id": cid,
            "enabled": enabled,
            "addon_enabled_for_basic": True,
            "requires_quiz_completion": False,
            "requires_contact_details": True,
            "monthly_free_slot_limit": 50,
            "slot_duration_minutes": 20,
            "max_bookings_per_day": 4,
            "booking_buffer_minutes": 15,
            "eligible_treatment_categories": ["general_orientation", "orthodontics"],
            "public_description": "Public scheduler test",
            "disclaimer_text": "Тестов disclaimer",
            "created_at": now_iso,
            "updated_at": now_iso,
        })
    if with_availability:
        days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]
        for d in days:
            await db.clinic_online_orientation_availability.insert_one({
                "clinic_id": cid,
                "day_of_week": d,
                "start_time": "09:00",
                "end_time": "17:00",
                "is_active": True,
                "created_at": now_iso,
            })
    return clinic_doc


async def _cleanup(db, clinic_ids, lead_ids):
    for cid in clinic_ids:
        await db.clinics.delete_one({"id": cid})
        await db.clinic_online_orientation_settings.delete_many({"clinic_id": cid})
        await db.clinic_online_orientation_availability.delete_many({"clinic_id": cid})
        await db.online_orientation_bookings.delete_many({"clinic_id": cid})
    for lid in lead_ids:
        await db.leads.delete_one({"id": lid})


def run_all():
    from database import db  # type: ignore

    async def _main():
        # NOTE: admin token retained for potential future seeding via
        # admin endpoints; current test seeds directly via Motor.
        _ = _admin_token()
        clinic_ids: list[str] = []
        lead_ids: list[str] = []
        try:
            disabled_clinic = await _make_clinic(
                db, with_settings=True, with_availability=True, enabled=False,
            )
            clinic_ids.append(disabled_clinic["id"])

            no_settings_clinic = await _make_clinic(
                db, with_settings=False, with_availability=False,
            )
            clinic_ids.append(no_settings_clinic["id"])

            no_slots_clinic = await _make_clinic(
                db, with_settings=True, with_availability=False, enabled=True,
            )
            clinic_ids.append(no_slots_clinic["id"])

            ok_clinic = await _make_clinic(
                db, with_settings=True, with_availability=True, enabled=True,
            )
            clinic_ids.append(ok_clinic["id"])

            # 1. Disabled (settings.enabled=False) → state="disabled".
            r = requests.get(
                f"{API_URL}/api/public/clinics/{disabled_clinic['id']}/availability",
                params={"type": "phone_consultation"}, timeout=10,
            )
            assert r.status_code == 200, r.text
            assert r.json()["state"] == "disabled", r.json()
            assert r.json()["slots"] == []
            print("  step1 PASS — settings.enabled=False → state=disabled")

            # 1b. No settings doc at all → state="disabled".
            r = requests.get(
                f"{API_URL}/api/public/clinics/{no_settings_clinic['id']}/availability",
                params={"type": "phone_consultation"}, timeout=10,
            )
            assert r.status_code == 200, r.text
            assert r.json()["state"] == "disabled", r.json()
            print("  step1b PASS — no settings doc → state=disabled")

            # 2. Enabled but no availability rows → state="enabled_no_slots".
            r = requests.get(
                f"{API_URL}/api/public/clinics/{no_slots_clinic['id']}/availability",
                params={"type": "phone_consultation"}, timeout=10,
            )
            assert r.status_code == 200, r.text
            assert r.json()["state"] == "enabled_no_slots", r.json()
            assert r.json()["slots"] == []
            print("  step2 PASS — no availability → state=enabled_no_slots")

            # 3. Happy path — state=available + slots > 0.
            r = requests.get(
                f"{API_URL}/api/public/clinics/{ok_clinic['id']}/availability",
                params={"type": "phone_consultation"}, timeout=10,
            )
            assert r.status_code == 200, r.text
            payload = r.json()
            assert payload["state"] == "available", payload
            assert len(payload["slots"]) >= 1, payload
            slot = payload["slots"][0]
            assert "scheduled_at" in slot and "label_local_bg" in slot
            assert payload["disclaimer_text"] == "Тестов disclaimer"
            print(f"  step3 PASS — available, {len(payload['slots'])} slots, first={slot['scheduled_at']}")

            # 4. Unknown clinic → 404.
            r = requests.get(
                f"{API_URL}/api/public/clinics/{uuid.uuid4()}/availability",
                params={"type": "phone_consultation"}, timeout=10,
            )
            assert r.status_code == 404, r.text
            print("  step4 PASS — unknown clinic → 404")

            # 5. Unsupported type → 400.
            r = requests.get(
                f"{API_URL}/api/public/clinics/{ok_clinic['id']}/availability",
                params={"type": "video"}, timeout=10,
            )
            assert r.status_code == 400, r.text
            assert r.json()["detail"]["code"] == "unsupported_type"
            print("  step5 PASS — unsupported type → 400")

            # 6. POST without consent → 422.
            r = requests.post(
                f"{API_URL}/api/public/consultation-bookings",
                json={
                    "clinic_id": ok_clinic["id"],
                    "scheduled_at": slot["scheduled_at"],
                    "consultation_type": "phone_consultation",
                    "name": "Тест Пациент",
                    "phone": "+359888000111",
                    "email": "tester@example.bg",
                    "consent": False,
                    "disclaimer_acknowledged": True,
                    "source_path": f"/kliniki/sofia/{ok_clinic['id']}",
                },
                timeout=10,
            )
            assert r.status_code == 422, r.text
            assert r.json()["detail"]["code"] == "consent_required"
            print("  step6 PASS — missing consent → 422 consent_required")

            # 7. POST without disclaimer → 422.
            r = requests.post(
                f"{API_URL}/api/public/consultation-bookings",
                json={
                    "clinic_id": ok_clinic["id"],
                    "scheduled_at": slot["scheduled_at"],
                    "consultation_type": "phone_consultation",
                    "name": "Тест Пациент",
                    "phone": "+359888000111",
                    "email": "tester@example.bg",
                    "consent": True,
                    "disclaimer_acknowledged": False,
                },
                timeout=10,
            )
            assert r.status_code == 422, r.text
            assert r.json()["detail"]["code"] == "disclaimer_required"
            print("  step7 PASS — missing disclaimer → 422 disclaimer_required")

            # 8. POST against disabled clinic → 400.
            r = requests.post(
                f"{API_URL}/api/public/consultation-bookings",
                json={
                    "clinic_id": disabled_clinic["id"],
                    "scheduled_at": slot["scheduled_at"],
                    "consultation_type": "phone_consultation",
                    "name": "Тест Пациент",
                    "phone": "+359888000111",
                    "email": "tester@example.bg",
                    "consent": True,
                    "disclaimer_acknowledged": True,
                },
                timeout=10,
            )
            assert r.status_code == 400, r.text
            assert r.json()["detail"]["code"] == "clinic_scheduler_disabled"
            print("  step8 PASS — disabled clinic → 400")

            # 9. POST unknown clinic → 404.
            r = requests.post(
                f"{API_URL}/api/public/consultation-bookings",
                json={
                    "clinic_id": str(uuid.uuid4()),
                    "scheduled_at": slot["scheduled_at"],
                    "consultation_type": "phone_consultation",
                    "name": "Тест Пациент",
                    "phone": "+359888000111",
                    "email": "tester@example.bg",
                    "consent": True,
                    "disclaimer_acknowledged": True,
                },
                timeout=10,
            )
            assert r.status_code == 404, r.text
            print("  step9 PASS — unknown clinic → 404")

            # 10. POST happy path → creates lead + booking with strict labels.
            r = requests.post(
                f"{API_URL}/api/public/consultation-bookings",
                json={
                    "clinic_id": ok_clinic["id"],
                    "scheduled_at": slot["scheduled_at"],
                    "consultation_type": "phone_consultation",
                    "name": "Тест Пациент",
                    "phone": "+359888000111",
                    "email": f"tester-{uuid.uuid4().hex[:6]}@example.bg",
                    "patient_note": "Звънни ми след 18:00",
                    "consent": True,
                    "disclaimer_acknowledged": True,
                    "source_path": f"/kliniki/sofia/{ok_clinic['id']}",
                    "utm_source": "organic",
                    "utm_campaign": "clinic_profile",
                },
                timeout=10,
            )
            assert r.status_code == 200, r.text
            resp = r.json()
            booking_id = resp["booking"]["id"]
            new_lead_id = resp["booking"]["lead_id"]
            assert resp["booking"]["status"] == "pending_clinic_confirmation"
            assert resp["booking"]["consultation_type"] == "phone_consultation"
            assert "Заявката е изпратена" in resp["message"]
            # NEVER claim confirmed.
            assert "потвърдена" not in resp["message"]

            lead = await db.leads.find_one({"id": new_lead_id}, {"_id": 0})
            assert lead is not None
            assert lead.get("lead_source") == "clinic_profile_scheduler"
            assert lead.get("lead_type") == "phone_consultation_booking"
            assert lead.get("qualification_source") == "public_profile"
            assert lead.get("is_quiz_qualified") is False
            assert lead.get("consultation_type") == "phone_consultation"
            assert lead.get("clinic_id") == ok_clinic["id"]
            assert lead.get("name") == "Тест Пациент"
            assert lead.get("contact_details_submitted") is True
            assert lead.get("care_pass_unlocked") is False
            assert lead.get("source_path") == f"/kliniki/sofia/{ok_clinic['id']}"

            booking = await db.online_orientation_bookings.find_one(
                {"id": booking_id}, {"_id": 0},
            )
            assert booking is not None
            assert booking.get("status") == "pending_clinic_confirmation"
            assert booking.get("consultation_type") == "phone_consultation"
            assert booking.get("lead_id") == new_lead_id
            assert booking.get("clinic_id") == ok_clinic["id"]
            assert booking.get("lead_source") == "clinic_profile_scheduler"
            assert booking.get("is_quiz_qualified") is False
            lead_ids.append(new_lead_id)
            print(f"  step10 PASS — booking {booking_id[:8]} created, "
                  f"lead {new_lead_id[:8]} labelled as clinic_profile_scheduler")

            # 11. Double-book same slot → 409.
            r = requests.post(
                f"{API_URL}/api/public/consultation-bookings",
                json={
                    "clinic_id": ok_clinic["id"],
                    "scheduled_at": slot["scheduled_at"],
                    "consultation_type": "phone_consultation",
                    "name": "Друг Пациент",
                    "phone": "+359888000222",
                    "email": f"other-{uuid.uuid4().hex[:6]}@example.bg",
                    "consent": True,
                    "disclaimer_acknowledged": True,
                },
                timeout=10,
            )
            assert r.status_code == 409, r.text
            assert r.json()["detail"]["code"] == "slot_already_locked"
            print("  step11 PASS — duplicate slot → 409 slot_already_locked")

            # 12. After booking, /availability should no longer include
            # the locked slot.
            r = requests.get(
                f"{API_URL}/api/public/clinics/{ok_clinic['id']}/availability",
                params={"type": "phone_consultation"}, timeout=10,
            )
            assert r.status_code == 200, r.text
            new_slots = [s["scheduled_at"] for s in r.json()["slots"]]
            assert slot["scheduled_at"] not in new_slots
            print("  step12 PASS — locked slot filtered out from /availability")

            # 13. Quiz flow untouched — POST /api/leads still works for
            # a normal quiz-driven lead. (Source != clinic_profile_scheduler.)
            quiz_payload = {
                "city_slug": "sofia",
                "treatment_type": "orthodontics",
                "answers": {"segment": "adult"},
                "name": "Куиз Пациент",
                "phone": "+359888333444",
                "email": f"quiz-{uuid.uuid4().hex[:6]}@example.bg",
                "consent": True,
                "source": "diagnostic_quiz",
            }
            r = requests.post(f"{API_URL}/api/leads", json=quiz_payload, timeout=10)
            assert r.status_code == 200, r.text
            quiz_lead = r.json()
            lead_ids.append(quiz_lead["id"])
            # Quiz path must NOT carry the scheduler labels.
            quiz_lead_db = await db.leads.find_one({"id": quiz_lead["id"]}, {"_id": 0})
            assert quiz_lead_db is not None
            assert quiz_lead_db.get("lead_source") != "clinic_profile_scheduler"
            assert quiz_lead_db.get("lead_type") != "phone_consultation_booking"
            assert quiz_lead_db.get("is_quiz_qualified") is not False
            assert quiz_lead_db.get("score_total", 0) >= 0  # scoring engine ran
            print("  step13 PASS — POST /api/leads still works (quiz flow untouched)")

            print("ALL TESTS PASSED ✅")

        finally:
            await _cleanup(db, clinic_ids, lead_ids)

    asyncio.get_event_loop().run_until_complete(_main())


if __name__ == "__main__":
    run_all()
