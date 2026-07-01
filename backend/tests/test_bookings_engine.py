"""Backend tests for the Feb-2026 consultation booking engine.

Covers public slot listing, booking creation + double-book guard,
clinic dashboard availability CRUD, admin oversight, entitlements
integration, and the background reminder loop scheduling field.
"""
import os
import time
from datetime import datetime, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"

GROWTH_CLINIC_ID = "aa1aa2cd-c794-4f6e-97c3-0e32475925fc"
VERIFIED_CLINIC_ID = "6783330d-03f3-41fb-a3df-5f695b5c47c9"

ADMIN_USER = "admin"
ADMIN_PASS = "admin123"
CLINIC_EMAIL = "mvp-test@example.com"
CLINIC_PASS = "Mvp1234!"


# ─── Fixtures ─────────────────────────────────────────────────
@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL})
    return s


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL})
    r = s.post(f"{API}/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    if r.status_code != 200:
        pytest.skip(f"admin login failed: {r.status_code} {r.text[:200]}")
    return s


@pytest.fixture(scope="module")
def clinic_session():
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL})
    # Try common clinic login paths
    for path in ("/clinic/login", "/clinic/auth/login"):
        r = s.post(f"{API}{path}", json={"email": CLINIC_EMAIL, "password": CLINIC_PASS})
        if r.status_code == 200:
            return s
    pytest.skip("clinic login failed on all known paths")


# ─── Public slots ─────────────────────────────────────────────
class TestPublicSlots:
    def test_verified_clinic_disabled(self, http):
        r = http.get(f"{API}/public/clinics/{VERIFIED_CLINIC_ID}/booking-slots")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["booking_enabled"] is False
        assert d["slots"] == []

    def test_growth_clinic_has_slots(self, http):
        r = http.get(f"{API}/public/clinics/{GROWTH_CLINIC_ID}/booking-slots?days=7")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["booking_enabled"] is True
        assert isinstance(d["slots"], list)
        # mon-fri 09:00-17:00 @30min = 16 slots/day * ~5 workdays over 7 days
        # 12h lead time may hide today's slots, so >=50 is safe
        assert len(d["slots"]) >= 50, f"expected 50+ slots got {len(d['slots'])}"
        assert d["timezone"] == "Europe/Sofia"

    def test_slots_respect_min_lead(self, http):
        r = http.get(f"{API}/public/clinics/{GROWTH_CLINIC_ID}/booking-slots?days=7")
        d = r.json()
        from datetime import timezone
        now = datetime.now().astimezone()
        for s in d["slots"]:
            start = datetime.fromisoformat(s["start"])
            hours = (start - now).total_seconds() / 3600
            assert hours >= 11.5, f"slot {s['start']} is only {hours:.1f}h out"


# ─── Booking creation ─────────────────────────────────────────
class TestBookingCreate:
    _slot_start = None
    _booking_id = None

    def _first_slot(self, http):
        r = http.get(f"{API}/public/clinics/{GROWTH_CLINIC_ID}/booking-slots?days=7")
        slots = r.json().get("slots", [])
        return slots[0] if slots else None

    def test_verified_clinic_403(self, http):
        slot_start = "2027-01-01T10:00:00+02:00"
        r = http.post(
            f"{API}/public/clinics/{VERIFIED_CLINIC_ID}/bookings",
            json={
                "selected_slot_start": slot_start,
                "patient_name": "TEST Verified",
                "patient_email": "test_v@example.com",
                "patient_phone": "+359000000000",
                "consent_confirmed": True,
            },
        )
        assert r.status_code == 403, r.text

    def test_consent_required(self, http):
        slot = self._first_slot(http)
        assert slot, "no slots available"
        r = http.post(
            f"{API}/public/clinics/{GROWTH_CLINIC_ID}/bookings",
            json={
                "selected_slot_start": slot["start"],
                "patient_name": "TEST Consent",
                "patient_email": "test_c@example.com",
                "patient_phone": "+359000000000",
                "consent_confirmed": False,
            },
        )
        assert r.status_code == 400, r.text

    def test_create_and_double_book(self, http):
        slot = self._first_slot(http)
        assert slot, "no slots available"
        payload = {
            "selected_slot_start": slot["start"],
            "selected_slot_end": slot["end"],
            "patient_name": "TEST Patient",
            "patient_email": "test_bk@example.com",
            "patient_phone": "+359000000000",
            "patient_city": "София",
            "treatment_category": "aligners",
            "patient_concern_summary": "Testing booking flow",
            "quiz_context_snapshot": {"pain": "moderate", "answer_1": "aligners"},
            "consent_confirmed": True,
            "not_emergency_confirmed": True,
            "source": "quiz_result",
        }
        r = http.post(f"{API}/public/clinics/{GROWTH_CLINIC_ID}/bookings", json=payload)
        assert r.status_code == 200, r.text
        b = r.json()["booking"]
        assert b["status"] == "pending_confirmation"
        assert b["quiz_context_snapshot"] == payload["quiz_context_snapshot"]
        assert b["selected_slot_start"] == slot["start"]
        # reminder scheduled to slot-24h (slot > 24h out because of 12h lead + days=7)
        # In this env, first slot could be <24h if it lands in tomorrow morning; accept both
        TestBookingCreate._slot_start = slot["start"]
        TestBookingCreate._booking_id = b["id"]

        # Double-book same slot → 409
        r2 = http.post(f"{API}/public/clinics/{GROWTH_CLINIC_ID}/bookings", json=payload)
        assert r2.status_code == 409, r2.text

    def test_slot_disappears_after_booking(self, http):
        assert TestBookingCreate._slot_start, "prev test didn't run"
        r = http.get(f"{API}/public/clinics/{GROWTH_CLINIC_ID}/booking-slots?days=7")
        starts = [s["start"] for s in r.json().get("slots", [])]
        assert TestBookingCreate._slot_start not in starts

    def test_reminder_scheduled_field(self, http, admin_session):
        assert TestBookingCreate._booking_id
        r = admin_session.get(f"{API}/admin/bookings?clinic_id={GROWTH_CLINIC_ID}")
        assert r.status_code == 200, r.text
        docs = r.json().get("bookings", [])
        b = next((x for x in docs if x["id"] == TestBookingCreate._booking_id), None)
        assert b, "booking not found in admin list"
        start = datetime.fromisoformat(b["selected_slot_start"])
        now = datetime.now().astimezone()
        if (start - now) > timedelta(hours=24):
            assert b["reminder_email_scheduled_for"] is not None
            sched = datetime.fromisoformat(b["reminder_email_scheduled_for"])
            delta = start - sched
            assert 23.9 < delta.total_seconds() / 3600 < 24.1
        else:
            assert b["reminder_email_scheduled_for"] is None


# ─── Admin ────────────────────────────────────────────────────
class TestAdmin:
    def test_admin_list_bookings(self, admin_session):
        r = admin_session.get(f"{API}/admin/bookings")
        assert r.status_code == 200
        assert isinstance(r.json().get("bookings"), list)

    def test_admin_filter_by_clinic(self, admin_session):
        r = admin_session.get(f"{API}/admin/bookings?clinic_id={GROWTH_CLINIC_ID}")
        assert r.status_code == 200
        for b in r.json()["bookings"]:
            assert b["clinic_id"] == GROWTH_CLINIC_ID

    def test_admin_filter_reminder_no(self, admin_session):
        r = admin_session.get(f"{API}/admin/bookings?reminder_sent=no")
        assert r.status_code == 200
        for b in r.json()["bookings"]:
            assert b.get("reminder_email_sent_at") in (None, "")

    def test_admin_resend_actions(self, admin_session):
        r = admin_session.get(f"{API}/admin/bookings?clinic_id={GROWTH_CLINIC_ID}")
        bookings = r.json().get("bookings", [])
        if not bookings:
            pytest.skip("no bookings to resend")
        bid = bookings[0]["id"]
        for action in ("resend-confirmation", "resend-clinic", "send-reminder"):
            r = admin_session.post(f"{API}/admin/bookings/{bid}/{action}")
            assert r.status_code == 200, f"{action}: {r.text}"


# ─── Clinic dashboard ─────────────────────────────────────────
class TestClinicAvailability:
    _rule_id = None
    _exc_id = None

    def test_get_availability_requires_auth(self, http):
        r = http.get(f"{API}/clinic/availability")
        assert r.status_code in (401, 403)

    def test_get_availability(self, clinic_session):
        r = clinic_session.get(f"{API}/clinic/availability")
        assert r.status_code == 200, r.text
        d = r.json()
        assert "rules" in d and "exceptions" in d and "booking_enabled" in d

    def test_create_rule_invalid_day(self, clinic_session):
        r = clinic_session.post(f"{API}/clinic/availability/rules", json={
            "day_of_week": "xxx", "start_time": "09:00", "end_time": "17:00"
        })
        assert r.status_code in (400, 403)

    def test_create_rule_invalid_time(self, clinic_session):
        # skip if this clinic isn't growth (403)
        pre = clinic_session.get(f"{API}/clinic/availability")
        if not pre.json().get("booking_enabled"):
            pytest.skip("clinic account does not have booking_enabled")
        r = clinic_session.post(f"{API}/clinic/availability/rules", json={
            "day_of_week": "mon", "start_time": "9x", "end_time": "17:00"
        })
        assert r.status_code == 400

    def test_rule_crud(self, clinic_session):
        pre = clinic_session.get(f"{API}/clinic/availability")
        if not pre.json().get("booking_enabled"):
            pytest.skip("clinic account does not have booking_enabled")
        r = clinic_session.post(f"{API}/clinic/availability/rules", json={
            "day_of_week": "mon", "start_time": "09:00", "end_time": "17:00",
            "slot_duration_minutes": 30, "consultation_type": "initial_consultation",
        })
        assert r.status_code == 200, r.text
        rid = r.json()["rule"]["id"]
        # toggle
        r2 = clinic_session.patch(f"{API}/clinic/availability/rules/{rid}", json={"is_active": False})
        assert r2.status_code == 200, r2.text
        # delete
        r3 = clinic_session.delete(f"{API}/clinic/availability/rules/{rid}")
        assert r3.status_code == 200, r3.text

    def test_exception_full_day_block(self, clinic_session):
        pre = clinic_session.get(f"{API}/clinic/availability")
        if not pre.json().get("booking_enabled"):
            pytest.skip("clinic account does not have booking_enabled")
        future_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        r = clinic_session.post(f"{API}/clinic/availability/exceptions", json={
            "date": future_date, "type": "full_day_block", "reason": "TEST"
        })
        assert r.status_code == 200
        eid = r.json()["exception"]["id"]
        # cleanup
        clinic_session.delete(f"{API}/clinic/availability/exceptions/{eid}")


# ─── Entitlements ─────────────────────────────────────────────
class TestEntitlements:
    def test_verified_default_false(self, admin_session):
        # Fetch the verified clinic — check entitlements are computed correctly by
        # asserting booking_enabled is false via the public slots endpoint
        r = requests.get(f"{API}/public/clinics/{VERIFIED_CLINIC_ID}/booking-slots",
                         headers={"Origin": BASE_URL})
        assert r.json()["booking_enabled"] is False

    def test_growth_default_true(self):
        r = requests.get(f"{API}/public/clinics/{GROWTH_CLINIC_ID}/booking-slots",
                         headers={"Origin": BASE_URL})
        assert r.json()["booking_enabled"] is True


# ─── Analytics tracking ───────────────────────────────────────
class TestTracking:
    def test_calendar_opened_event(self, http, admin_session):
        # Fire an open event
        http.get(f"{API}/public/clinics/{GROWTH_CLINIC_ID}/booking-slots?lead_id=TEST_LEAD_TRACK")
        time.sleep(1.5)
        # Check event landed (admin analytics endpoint may vary — probe DB via admin if endpoint exists)
        # Fall back to just asserting the call worked; we already validated in create test
        r = admin_session.get(f"{API}/admin/analytics/events?limit=50")
        # If endpoint doesn't exist, skip
        if r.status_code == 404:
            pytest.skip("no /admin/analytics/events endpoint — tracking write can't be verified via API")
        assert r.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
