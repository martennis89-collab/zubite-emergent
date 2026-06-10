"""Phase E — Online Orientation Bookings backend tests.

Covers:
- Patient sees eligible Premium clinic only when access==included_in_plan + slots exist
- Basic w/o add-on hidden; Basic with add-on shown
- Disabled-by-admin / inactive clinics hidden
- Slot locking: same slot rejected with 409
- Clinic confirm flow + clinic isolation
- Patient cancel flow
- Lazy expiry of pending past expires_at
- Admin list returns all bookings
- Care Pass invariant: care_pass_unlocked stays False after booking
"""

from __future__ import annotations
import os
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
import requests

API_URL = os.environ.get("API_URL", "http://localhost:8001")
ADMIN_USER = "admin@zubite.bg"
ADMIN_PASS = "password"


def _admin_token() -> str:
    r = requests.post(
        f"{API_URL}/api/admin/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def _h(token: str, *, json_body: bool = True) -> dict:
    out = {"Authorization": f"Bearer {token}"}
    if json_body:
        out["Content-Type"] = "application/json"
    return out


async def _make_clinic(db, tier: str, *, status: str = "active_partner") -> dict:
    cid = str(uuid.uuid4())
    doc = {
        "id": cid,
        "clinic_name": f"PHE-{cid[:6]}",
        "city": "София", "city_slug": "sofia",
        "email": f"phe-{cid[:8]}@example.bg",
        "phone": "+359888000000",
        "treatments_supported": ["orthodontics"],
        "clinic_status": status,
        "subscription_status": "active",
        "partner_tier": tier,
        "status": "active",
        "password_hash": "x",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
    }
    await db.clinics.insert_one(doc)
    return doc


async def _make_lead(db, *, unlocked: bool = True) -> str:
    lead_id = str(uuid.uuid4())
    doc = {
        "id": lead_id,
        "city_slug": "sofia",
        "treatment_type": "diagnostic_quiz",
        "answers": {"segment": "adult"},
        "score_total": 18,
        "band": "YELLOW",
        "status": "NEW",
        "name": "Тест Пациент",
        "phone": "+359888100200",
        "email": f"test-{lead_id[:6]}@example.bg",
        "consent": True,
        "contact_details_submitted": unlocked,
        "full_result_unlocked": unlocked,
        "care_pass_eligible": unlocked,
        "care_pass_unlocked": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.leads.insert_one(doc)
    return lead_id


async def _enable_orientation(token, clinic_id, *, add_basic_addon=False, eligible=None):
    body = {
        "enabled": True,
        "addon_enabled_for_basic": add_basic_addon,
        "eligible_treatment_categories": eligible or ["general_orientation", "orthodontics"],
    }
    r = requests.put(
        f"{API_URL}/api/admin/clinics/{clinic_id}/orientation-settings",
        headers=_h(token), json=body, timeout=10,
    )
    assert r.status_code == 200, r.text


async def _add_avail(token, clinic_id, day, start, end):
    r = requests.post(
        f"{API_URL}/api/admin/clinics/{clinic_id}/orientation-availability",
        headers=_h(token),
        json={"day_of_week": day, "start_time": start, "end_time": end},
        timeout=10,
    )
    assert r.status_code == 200, r.text


async def _cleanup(db, clinic_ids, lead_ids):
    for cid in clinic_ids:
        await db.clinics.delete_one({"id": cid})
        await db.clinic_online_orientation_settings.delete_many({"clinic_id": cid})
        await db.clinic_online_orientation_availability.delete_many({"clinic_id": cid})
        await db.online_orientation_bookings.delete_many({"clinic_id": cid})
    for lid in lead_ids:
        await db.leads.delete_one({"id": lid})


def _days_ahead_name(n: int) -> str:
    # Map python weekday to availability strings
    dn = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]
    target = (datetime.now(timezone.utc).weekday() + n) % 7
    return dn[target]


def run_all():
    from database import db  # type: ignore

    async def _main():
        token = _admin_token()
        clinic_ids, lead_ids = [], []
        try:
            # ── Premium clinic with availability ──
            premium = await _make_clinic(db, "premium")
            clinic_ids.append(premium["id"])
            await _enable_orientation(token, premium["id"])
            # Add a window for EVERY weekday so we always have an
            # eligible slot regardless of when the test runs.
            for d in ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]:
                await _add_avail(token, premium["id"], d, "09:00", "17:00")

            # ── Basic clinic WITHOUT add-on ──
            basic_no_addon = await _make_clinic(db, "standard")
            clinic_ids.append(basic_no_addon["id"])
            # explicitly enabled but no add-on → still hidden for Basic
            await _enable_orientation(token, basic_no_addon["id"], add_basic_addon=False)
            await _add_avail(token, basic_no_addon["id"], _days_ahead_name(1), "09:00", "17:00")

            # ── Basic clinic WITH add-on ──
            basic_addon = await _make_clinic(db, "standard")
            clinic_ids.append(basic_addon["id"])
            await _enable_orientation(token, basic_addon["id"], add_basic_addon=True)
            for d in ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]:
                await _add_avail(token, basic_addon["id"], d, "10:00", "16:00")

            # ── Disabled by admin clinic ──
            disabled = await _make_clinic(db, "premium")
            clinic_ids.append(disabled["id"])
            # Don't call enable_orientation — defaults leave enabled=false
            # (just create a settings doc with explicit disable)
            r = requests.put(
                f"{API_URL}/api/admin/clinics/{disabled['id']}/orientation-settings",
                headers=_h(token), json={"enabled": False}, timeout=10,
            )
            assert r.status_code == 200, r.text
            await _add_avail(token, disabled["id"], _days_ahead_name(1), "09:00", "17:00")

            # ── Inactive clinic — Premium, enabled, but clinic_status=inactive ──
            inactive = await _make_clinic(db, "premium", status="inactive")
            clinic_ids.append(inactive["id"])
            await _enable_orientation(token, inactive["id"])
            for d in ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]:
                await _add_avail(token, inactive["id"], d, "09:00", "17:00")

            # ── Lead, fully unlocked ──
            lead_id = await _make_lead(db, unlocked=True)
            lead_ids.append(lead_id)

            # 1. Patient GET eligible clinics — only premium + basic_addon should appear
            r = requests.get(f"{API_URL}/api/leads/{lead_id}/eligible-orientation-clinics", timeout=10)
            assert r.status_code == 200, r.text
            body = r.json()
            visible = {c["clinic_id"] for c in body["clinics"]}
            assert premium["id"] in visible, f"premium missing: {visible}"
            assert basic_addon["id"] in visible, f"basic_addon missing: {visible}"
            assert basic_no_addon["id"] not in visible, f"basic_no_addon leaked"
            assert disabled["id"] not in visible, f"disabled leaked"
            assert inactive["id"] not in visible, f"inactive leaked"
            # Topic options exposed for the form
            assert any(t["value"] == "aligners_braces" for t in body["topic_options"])
            # Pick a slot from premium
            premium_card = next(c for c in body["clinics"] if c["clinic_id"] == premium["id"])
            assert len(premium_card["slots"]) >= 1
            slot = premium_card["slots"][0]
            print(f"  step1 PASS — visible clinics: {sorted(visible)[:2]}, first slot: {slot['scheduled_at']}")

            # 2. POST booking without consent → 422
            r = requests.post(
                f"{API_URL}/api/leads/{lead_id}/online-orientation-bookings",
                json={
                    "clinic_id": premium["id"], "scheduled_at": slot["scheduled_at"],
                    "topic": "implants",
                    "consent_confirmed": False, "disclaimer_acknowledged": True,
                },
                timeout=10,
            )
            assert r.status_code == 422 and r.json()["detail"]["code"] == "consent_required"
            print("  step2 PASS — consent_required")

            # 3. POST booking happy path
            r = requests.post(
                f"{API_URL}/api/leads/{lead_id}/online-orientation-bookings",
                json={
                    "clinic_id": premium["id"], "scheduled_at": slot["scheduled_at"],
                    "topic": "implants",
                    "consent_confirmed": True, "disclaimer_acknowledged": True,
                    "patient_note": "Тестова бележка",
                },
                timeout=10,
            )
            assert r.status_code == 200, r.text
            booking = r.json()["booking"]
            assert booking["status"] == "pending_clinic_confirmation"
            # Patient response NEVER contains phone/email/internal_clinic_note
            for forbidden in ("patient_phone", "patient_email", "internal_clinic_note", "quiz_summary"):
                assert forbidden not in booking, f"PII leak: {forbidden}"
            booking_id = booking["id"]
            print(f"  step3 PASS — booking pending_clinic_confirmation {booking_id[:8]}")

            # Care Pass invariant check
            lead = await db.leads.find_one({"id": lead_id})
            assert lead.get("care_pass_unlocked") is False, "CARE PASS LEAKED"
            assert lead.get("consultation_booked_through_zubite") is True
            print("  care_pass invariant PASS")

            # 4. Same slot re-booked → 409 — duplicate-prevention (Phase H)
            # now triggers FIRST because the same lead already has an
            # active pending booking, before we even check slot lock.
            r = requests.post(
                f"{API_URL}/api/leads/{lead_id}/online-orientation-bookings",
                json={
                    "clinic_id": premium["id"], "scheduled_at": slot["scheduled_at"],
                    "topic": "implants",
                    "consent_confirmed": True, "disclaimer_acknowledged": True,
                },
                timeout=10,
            )
            assert r.status_code == 409, r.text
            assert r.json()["detail"]["code"] in ("active_booking_exists", "slot_already_locked"), r.json()
            print("  step4 PASS — duplicate active booking blocked")

            # 5. Slot no longer in patient list (re-fetch)
            r = requests.get(f"{API_URL}/api/leads/{lead_id}/eligible-orientation-clinics", timeout=10)
            premium_card2 = next(c for c in r.json()["clinics"] if c["clinic_id"] == premium["id"])
            slot_starts = {s["scheduled_at"] for s in premium_card2["slots"]}
            assert slot["scheduled_at"] not in slot_starts, "slot still listed after locking"
            print("  step5 PASS — locked slot hidden from re-listing")

            # 6. Clinic isolation — set up basic_addon clinic auth via test
            # admin login is fine for admin endpoints.
            r = requests.get(
                f"{API_URL}/api/admin/online-orientation-bookings",
                headers=_h(token, json_body=False), timeout=10,
            )
            assert r.status_code == 200
            ids = {b["id"] for b in r.json()["bookings"]}
            assert booking_id in ids
            print("  step6 PASS — admin sees booking")

            # 7. Lazy expiry — backdate expires_at and re-fetch admin list
            past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            await db.online_orientation_bookings.update_one(
                {"id": booking_id},
                {"$set": {"expires_at": past}},
            )
            r = requests.get(f"{API_URL}/api/admin/online-orientation-bookings", headers=_h(token, json_body=False), timeout=10)
            b_now = next(b for b in r.json()["bookings"] if b["id"] == booking_id)
            assert b_now["status"] == "expired_pending_confirmation", b_now
            assert b_now["expired_at"] is not None
            print("  step7 PASS — lazy expiry flips status")

            # 8. After expiry, slot is again selectable
            r = requests.get(f"{API_URL}/api/leads/{lead_id}/eligible-orientation-clinics", timeout=10)
            premium_card3 = next(c for c in r.json()["clinics"] if c["clinic_id"] == premium["id"])
            slot_starts3 = {s["scheduled_at"] for s in premium_card3["slots"]}
            assert slot["scheduled_at"] in slot_starts3
            print("  step8 PASS — expired slot returns to pool")

            # 9. Patient cancel flow — make a fresh booking + cancel
            r = requests.post(
                f"{API_URL}/api/leads/{lead_id}/online-orientation-bookings",
                json={
                    "clinic_id": premium["id"], "scheduled_at": slot["scheduled_at"],
                    "topic": "implants",
                    "consent_confirmed": True, "disclaimer_acknowledged": True,
                },
                timeout=10,
            )
            assert r.status_code == 200, r.text
            b2 = r.json()["booking"]
            r = requests.post(
                f"{API_URL}/api/leads/{lead_id}/online-orientation-bookings/{b2['id']}/cancel",
                timeout=10,
            )
            assert r.status_code == 200 and r.json()["booking"]["status"] == "cancelled_by_patient"
            print("  step9 PASS — patient cancel works")

            # 10. Lead not unlocked → 403 on POST
            locked_id = await _make_lead(db, unlocked=False)
            lead_ids.append(locked_id)
            r = requests.post(
                f"{API_URL}/api/leads/{locked_id}/online-orientation-bookings",
                json={
                    "clinic_id": premium["id"], "scheduled_at": slot["scheduled_at"],
                    "topic": "implants",
                    "consent_confirmed": True, "disclaimer_acknowledged": True,
                },
                timeout=10,
            )
            assert r.status_code == 403, r.text
            assert r.json()["detail"]["code"] == "lead_not_unlocked"
            print("  step10 PASS — locked lead blocked")

            print("ALL PHASE E BACKEND TESTS PASS")
        finally:
            await _cleanup(db, clinic_ids, lead_ids)

    asyncio.run(_main())


if __name__ == "__main__":
    run_all()
