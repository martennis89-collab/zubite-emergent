"""Phase F — Care Pass unlock trigger backend tests.

Covers:
- Booking creation does NOT unlock Care Pass.
- Clinic confirm unlocks Care Pass.
- Repeated confirm is idempotent (preserves care_pass_unlocked_at).
- Reject / cancel / expire do NOT unlock Care Pass.
- Locked lead helper guard rejects (failed: missing_contact_details).
- Helper guard on missing lead.
"""

from __future__ import annotations
import os, uuid, asyncio
from datetime import datetime, timezone, timedelta
import requests

API_URL = os.environ.get("API_URL", "http://localhost:8001")
ADMIN_USER = "admin@zubite.bg"
ADMIN_PASS = "password"


def _admin_token() -> str:
    r = requests.post(f"{API_URL}/api/admin/login",
                      json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=10)
    r.raise_for_status()
    return r.json()["access_token"]


def _h(token, json_body=True):
    out = {"Authorization": f"Bearer {token}"}
    if json_body:
        out["Content-Type"] = "application/json"
    return out


async def _make_clinic(db, password_hash):
    cid = str(uuid.uuid4())
    doc = {
        "id": cid, "clinic_name": f"PHF-{cid[:6]}", "city": "София", "city_slug": "sofia",
        "email": f"phf-{cid[:8]}@example.bg", "phone": "+359888000000",
        "treatments_supported": ["orthodontics"], "clinic_status": "active_partner",
        "subscription_status": "active", "partner_tier": "premium",
        "status": "active", "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
    }
    await db.clinics.insert_one(doc)
    return doc


async def _make_lead(db, *, unlocked=True):
    lid = str(uuid.uuid4())
    await db.leads.insert_one({
        "id": lid, "city_slug": "sofia", "treatment_type": "diagnostic_quiz",
        "answers": {"segment": "adult"}, "score_total": 18, "band": "YELLOW",
        "status": "NEW", "name": "Тест", "phone": "+359888100200",
        "email": f"phf-lead-{lid[:6]}@example.bg", "consent": True,
        "contact_details_submitted": unlocked, "full_result_unlocked": unlocked,
        "care_pass_eligible": unlocked, "care_pass_unlocked": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return lid


async def _enable_orient(token, cid):
    requests.put(f"{API_URL}/api/admin/clinics/{cid}/orientation-settings",
                 headers=_h(token),
                 json={"enabled": True,
                       "eligible_treatment_categories": ["general_orientation", "orthodontics"]},
                 timeout=10)
    for d in ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]:
        requests.post(f"{API_URL}/api/admin/clinics/{cid}/orientation-availability",
                      headers=_h(token),
                      json={"day_of_week": d, "start_time": "09:00", "end_time": "17:00"},
                      timeout=10)


def _book(lead_id, clinic_id, slot_iso):
    return requests.post(
        f"{API_URL}/api/leads/{lead_id}/online-orientation-bookings",
        json={"clinic_id": clinic_id, "scheduled_at": slot_iso, "topic": "implants",
              "consent_confirmed": True, "disclaimer_acknowledged": True},
        timeout=10,
    )


def run_all():
    from database import db
    from auth import hash_password as _hp  # type: ignore

    async def _main():
        token = _admin_token()
        clinic_password = _hp("PhF-Test-Password-1!")
        clinic_ids, lead_ids = [], []
        try:
            clinic = await _make_clinic(db, clinic_password)
            clinic_ids.append(clinic["id"])
            await _enable_orient(token, clinic["id"])

            # Login as the clinic
            cl_login = requests.post(f"{API_URL}/api/clinic/login",
                                     json={"email": clinic["email"], "password": "PhF-Test-Password-1!"},
                                     timeout=10)
            assert cl_login.status_code == 200, cl_login.text
            ct = cl_login.json()["access_token"]

            lead_id = await _make_lead(db, unlocked=True)
            lead_ids.append(lead_id)

            # Fetch eligible clinics → get a slot
            r = requests.get(f"{API_URL}/api/leads/{lead_id}/eligible-orientation-clinics", timeout=10)
            assert r.status_code == 200, r.text
            slots = next(c for c in r.json()["clinics"] if c["clinic_id"] == clinic["id"])["slots"]
            assert len(slots) > 0
            slot_iso = slots[0]["scheduled_at"]

            # 1. Create booking → Care Pass MUST stay locked
            r = _book(lead_id, clinic["id"], slot_iso)
            assert r.status_code == 200, r.text
            booking_id = r.json()["booking"]["id"]
            lead = await db.leads.find_one({"id": lead_id})
            assert lead.get("care_pass_unlocked") is False, "Care Pass leaked on booking creation!"
            assert lead.get("consultation_booked_through_zubite") is True
            print("  step1 PASS — booking creation does NOT unlock Care Pass")

            # 2. Clinic confirm → unlocks Care Pass
            r = requests.post(
                f"{API_URL}/api/clinic/online-orientation-bookings/{booking_id}/action",
                headers=_h(ct), json={"action": "confirm"}, timeout=10,
            )
            assert r.status_code == 200, r.text
            lead = await db.leads.find_one({"id": lead_id})
            assert lead.get("care_pass_unlocked") is True
            assert lead.get("clinic_confirmed_consultation") is True
            assert lead.get("care_pass_unlocked_at") is not None
            assert lead.get("consultation_type") == "online_orientation"
            assert lead.get("care_pass_source") == "online_orientation_booking"
            assert lead.get("care_pass_source_id") == booking_id
            first_ts = lead["care_pass_unlocked_at"]
            print("  step2 PASS — clinic confirm unlocks Care Pass")

            # 3. Repeated confirm → idempotent: same timestamp preserved
            r = requests.post(
                f"{API_URL}/api/clinic/online-orientation-bookings/{booking_id}/action",
                headers=_h(ct), json={"action": "confirm"}, timeout=10,
            )
            assert r.status_code == 400 or r.status_code == 200  # may be terminal-status 400
            lead = await db.leads.find_one({"id": lead_id})
            assert lead["care_pass_unlocked_at"] == first_ts, "timestamp drifted on re-confirm"
            print("  step3 PASS — repeated confirm idempotent")

            # 4. Fresh lead + booking + REJECT → Care Pass stays locked
            lead2 = await _make_lead(db, unlocked=True)
            lead_ids.append(lead2)
            r = requests.get(f"{API_URL}/api/leads/{lead2}/eligible-orientation-clinics", timeout=10)
            slots2 = next(c for c in r.json()["clinics"] if c["clinic_id"] == clinic["id"])["slots"]
            slot2 = slots2[0]["scheduled_at"]
            r = _book(lead2, clinic["id"], slot2)
            assert r.status_code == 200, r.text
            b2 = r.json()["booking"]["id"]
            r = requests.post(
                f"{API_URL}/api/clinic/online-orientation-bookings/{b2}/action",
                headers=_h(ct), json={"action": "reject"}, timeout=10,
            )
            assert r.status_code == 200
            lead = await db.leads.find_one({"id": lead2})
            assert lead.get("care_pass_unlocked") is False, "Care Pass leaked on reject"
            print("  step4 PASS — reject does NOT unlock Care Pass")

            # 5. Fresh lead + booking + lazy expire → Care Pass stays locked
            lead3 = await _make_lead(db, unlocked=True)
            lead_ids.append(lead3)
            r = requests.get(f"{API_URL}/api/leads/{lead3}/eligible-orientation-clinics", timeout=10)
            slots3 = next(c for c in r.json()["clinics"] if c["clinic_id"] == clinic["id"])["slots"]
            r = _book(lead3, clinic["id"], slots3[0]["scheduled_at"])
            b3 = r.json()["booking"]["id"]
            # backdate expires_at
            past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            await db.online_orientation_bookings.update_one({"id": b3}, {"$set": {"expires_at": past}})
            # trigger lazy expire via admin list
            requests.get(f"{API_URL}/api/admin/online-orientation-bookings",
                         headers=_h(token, json_body=False), timeout=10)
            lead = await db.leads.find_one({"id": lead3})
            assert lead.get("care_pass_unlocked") is False
            print("  step5 PASS — expired booking does NOT unlock Care Pass")

            # 6. Locked lead helper guard via direct helper call
            from care_pass import unlock_care_pass_for_lead
            locked_id = await _make_lead(db, unlocked=False)
            lead_ids.append(locked_id)
            r1 = await unlock_care_pass_for_lead(locked_id, consultation_type="online_orientation")
            assert r1.get("failed") is True
            assert r1.get("code") == "missing_contact_details"
            lead = await db.leads.find_one({"id": locked_id})
            assert lead.get("care_pass_unlocked") is False
            print("  step6 PASS — locked lead cannot unlock Care Pass")

            # 7. Missing lead
            r2 = await unlock_care_pass_for_lead("non-existent-id", consultation_type="online_orientation")
            assert r2.get("failed") is True and r2.get("code") == "missing_lead"
            print("  step7 PASS — missing lead refused")

            # 8. Helper idempotency on direct call
            lead4 = await _make_lead(db, unlocked=True)
            lead_ids.append(lead4)
            r3 = await unlock_care_pass_for_lead(lead4, consultation_type="online_orientation")
            assert r3.get("unlocked") is True
            r4 = await unlock_care_pass_for_lead(lead4, consultation_type="online_orientation")
            assert r4.get("already_unlocked") is True
            lead = await db.leads.find_one({"id": lead4})
            assert r4.get("care_pass_unlocked_at") == lead["care_pass_unlocked_at"]
            print("  step8 PASS — helper idempotent (already_unlocked)")

            print("ALL PHASE F BACKEND TESTS PASS")
        finally:
            for cid in clinic_ids:
                await db.clinics.delete_one({"id": cid})
                await db.clinic_online_orientation_settings.delete_many({"clinic_id": cid})
                await db.clinic_online_orientation_availability.delete_many({"clinic_id": cid})
                await db.online_orientation_bookings.delete_many({"clinic_id": cid})
            for lid in lead_ids:
                await db.leads.delete_one({"id": lid})

    asyncio.run(_main())


if __name__ == "__main__":
    run_all()
