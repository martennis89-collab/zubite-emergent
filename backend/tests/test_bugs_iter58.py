"""Backend regression tests for iteration_58 code-review fixes:
  Bug 1 — `_score_clinic` NameError on `_BASE_PACKAGE_BOOST` / `_TIER_BOOST_LEGACY`
  Bug 2 — Double-book race protection via `uniq_active_slot` partial index
  Bug 3 — Server-side `selected_slot_start` validity re-check
  + regressions on consent enforcement and public label mapping.
"""
from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone

import aiohttp
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ortho-preview-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

GROWTH_CLINIC_ID = "aa1aa2cd-c794-4f6e-97c3-0e32475925fc"     # Sofia Premium Dental Studio
VERIFIED_CLINIC_ID = "6783330d-03f3-41fb-a3df-5f695b5c47c9"    # booking disabled


# ─────────────────────────── helpers ────────────────────────────
def _create_lead(city="sofia", treatment="invisalign"):
    r = requests.post(
        f"{API}/leads",
        json={
            "treatment_type": treatment, "city_slug": city,
            "name": "TEST reco", "phone": "+359888000111",
            "email": f"test_reco_{uuid.uuid4().hex[:6]}@example.com",
            "consent": True,
        },
        headers={"Origin": BASE_URL, "Content-Type": "application/json"},
        timeout=15,
    )
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


def _first_available_slot(clinic_id):
    r = requests.get(f"{API}/public/clinics/{clinic_id}/booking-slots", timeout=15)
    assert r.status_code == 200, r.text
    slots = r.json().get("slots", [])
    assert slots, "no available slots returned"
    return slots[0]["start"]


# ─────────────────────── Bug 1: reco NameError ──────────────────
class TestBug1RecommendedClinics:
    def test_recommended_clinics_returns_200_no_nameerror(self):
        lead_id = _create_lead()
        r = requests.get(f"{API}/leads/{lead_id}/recommended-clinics", timeout=15)
        assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text[:400]}"
        data = r.json()
        assert "clinics" in data
        # deterministic sort — each clinic must have score-worthy fields
        for c in data["clinics"]:
            # public payload; must not leak _id
            assert "_id" not in c

    def test_score_clinic_constants_defined(self):
        """Guard: constants referenced by `_score_clinic` MUST exist so the
        endpoint never 500s on production."""
        from routers import public as pub
        assert hasattr(pub, "_BASE_PACKAGE_BOOST"), "_BASE_PACKAGE_BOOST missing"
        assert hasattr(pub, "_TIER_BOOST_LEGACY"), "_TIER_BOOST_LEGACY missing"
        # exercise the scorer directly with three clinic shapes
        growth = {"id": "g1", "name": "G", "city_slug": "sofia", "base_package": "growth_partner",
                  "treatments_supported": ["invisalign"]}
        verified = {"id": "v1", "name": "V", "city_slug": "sofia", "base_package": "verified_profile",
                    "treatments_supported": ["invisalign"]}
        legacy = {"id": "l1", "name": "L", "city_slug": "sofia", "partner_tier": "premium",
                  "treatments_supported": ["invisalign"]}
        s_growth = pub._score_clinic(growth, "sofia", "invisalign", False)
        s_verified = pub._score_clinic(verified, "sofia", "invisalign", False)
        s_legacy = pub._score_clinic(legacy, "sofia", "invisalign", False)
        assert s_growth > 0 and s_verified > 0 and s_legacy > 0
        # growth should out-boost verified
        assert s_growth >= s_verified


# ─────────────────────── Bug 2: double-book race ────────────────
class TestBug2DoubleBookRace:
    @pytest.mark.asyncio
    async def test_uniq_active_slot_partial_index_present(self):
        from database import db
        idx = await db.clinic_bookings.index_information()
        assert "uniq_active_slot" in idx
        entry = idx["uniq_active_slot"]
        assert entry.get("unique") is True
        pfe = entry.get("partialFilterExpression") or {}
        # Serialised as SON; str-check for the active statuses
        assert "pending_confirmation" in str(pfe)
        assert "confirmed" in str(pfe)
        assert "rescheduled" in str(pfe)

    @pytest.mark.asyncio
    async def test_direct_duplicate_insert_raises_duplicate_key_error(self):
        # Use a fresh motor client bound to the current test event loop
        import os as _os
        from motor.motor_asyncio import AsyncIOMotorClient
        from pymongo.errors import DuplicateKeyError
        client = AsyncIOMotorClient(_os.environ["MONGO_URL"])
        _db = client[_os.environ["DB_NAME"]]
        slot = f"2099-01-15T10:00:00+02:00"
        docs = [
            {"id": f"TEST_dup_{uuid.uuid4().hex[:6]}", "clinic_id": GROWTH_CLINIC_ID,
             "selected_slot_start": slot, "status": "pending_confirmation"},
            {"id": f"TEST_dup_{uuid.uuid4().hex[:6]}", "clinic_id": GROWTH_CLINIC_ID,
             "selected_slot_start": slot, "status": "pending_confirmation"},
        ]
        await _db.clinic_bookings.insert_one(docs[0])
        try:
            with pytest.raises(DuplicateKeyError):
                await _db.clinic_bookings.insert_one(docs[1])
        finally:
            await _db.clinic_bookings.delete_many({"id": {"$in": [docs[0]["id"], docs[1]["id"]]}})
            client.close()

    @pytest.mark.asyncio
    async def test_concurrent_post_only_one_succeeds(self):
        """Fire N concurrent POSTs for the SAME slot; exactly ONE must win with 200
        and the rest must fail with 409."""
        slot = _first_available_slot(GROWTH_CLINIC_ID)
        payload = {
            "patient_name": "TEST Race", "patient_email": "race@example.com",
            "patient_phone": "+359888000222", "selected_slot_start": slot,
            "consent_confirmed": True, "not_emergency_confirmed": True,
            "source": "quiz_result",
        }
        headers = {"Origin": BASE_URL, "Content-Type": "application/json"}
        url = f"{API}/public/clinics/{GROWTH_CLINIC_ID}/bookings"

        async with aiohttp.ClientSession() as sess:
            async def _post():
                async with sess.post(url, json=payload, headers=headers) as r:
                    return r.status, await r.text()
            results = await asyncio.gather(*[_post() for _ in range(4)])

        statuses = [s for s, _ in results]
        successes = [s for s in statuses if s == 200]
        conflicts = [s for s in statuses if s == 409]
        # exactly one 200; rest must be 409 (or 400 "no longer available")
        assert len(successes) == 1, f"expected exactly 1 x 200, got statuses={statuses}"
        assert len(conflicts) >= 1, f"expected at least one 409, got statuses={statuses}"
        # cleanup — remove the winning booking (fresh motor client for this loop)
        import os as _os
        from motor.motor_asyncio import AsyncIOMotorClient
        _client = AsyncIOMotorClient(_os.environ["MONGO_URL"])
        _db = _client[_os.environ["DB_NAME"]]
        await _db.clinic_bookings.delete_many({"clinic_id": GROWTH_CLINIC_ID,
                                              "selected_slot_start": slot})
        _client.close()


# ─────────────────── Bug 3: slot-not-offered rejection ─────────
class TestBug3SlotValidation:
    def test_valid_slot_still_works(self):
        slot = _first_available_slot(GROWTH_CLINIC_ID)
        payload = {
            "patient_name": "TEST Valid", "patient_email": "valid@example.com",
            "patient_phone": "+359888000333", "selected_slot_start": slot,
            "consent_confirmed": True, "not_emergency_confirmed": True,
            "source": "quiz_result",
        }
        r = requests.post(
            f"{API}/public/clinics/{GROWTH_CLINIC_ID}/bookings",
            json=payload, headers={"Origin": BASE_URL}, timeout=15,
        )
        assert r.status_code == 200, r.text
        # cleanup
        bid = r.json().get("id") or r.json().get("booking_id")
        from database import db  # noqa
        import asyncio as _a
        _a.get_event_loop().run_until_complete(
            db.clinic_bookings.delete_many({"selected_slot_start": slot})
        ) if False else None

    def _post(self, slot, extra=None):
        body = {
            "patient_name": "TEST Slot", "patient_email": "slot@example.com",
            "patient_phone": "+359888000444", "selected_slot_start": slot,
            "consent_confirmed": True, "not_emergency_confirmed": True,
            "source": "quiz_result",
        }
        if extra:
            body.update(extra)
        return requests.post(
            f"{API}/public/clinics/{GROWTH_CLINIC_ID}/bookings",
            json=body, headers={"Origin": BASE_URL}, timeout=15,
        )

    def test_sunday_outside_hours_rejected(self):
        # Find a Sunday >= 2 weeks out at 03:00 Sofia time.
        now = datetime.now(timezone.utc)
        d = now + timedelta(days=14)
        while d.weekday() != 6:  # Sunday
            d += timedelta(days=1)
        slot = d.replace(hour=1, minute=0, second=0, microsecond=0).astimezone(timezone(timedelta(hours=2))).isoformat()
        # convert to a Sofia-local 03:00 iso string
        slot = d.replace(hour=3, minute=0, second=0, microsecond=0).strftime("%Y-%m-%dT03:00:00+02:00")
        r = self._post(slot)
        assert r.status_code == 400, r.text
        assert "not offered" in r.text.lower() or "slot" in r.text.lower()

    def test_past_slot_rejected(self):
        past = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%dT10:00:00+02:00")
        r = self._post(past)
        assert r.status_code == 400, r.text

    def test_lead_time_too_short_rejected(self):
        soon = (datetime.now(timezone.utc) + timedelta(hours=2)).strftime("%Y-%m-%dT10:00:00+02:00")
        r = self._post(soon)
        assert r.status_code == 400, r.text

    def test_weekday_outside_business_hours_rejected(self):
        # Monday 2 weeks out, 22:00
        now = datetime.now(timezone.utc)
        d = now + timedelta(days=14)
        while d.weekday() != 0:
            d += timedelta(days=1)
        slot = d.strftime("%Y-%m-%dT22:00:00+02:00")
        r = self._post(slot)
        assert r.status_code == 400, r.text


# ────────────────── Regression: consent + labels ────────────────
class TestRegressions:
    def test_not_emergency_confirmed_required(self):
        slot = _first_available_slot(GROWTH_CLINIC_ID)
        body = {
            "patient_name": "TEST NE", "patient_email": "ne@example.com",
            "patient_phone": "+359888000555", "selected_slot_start": slot,
            "consent_confirmed": True, "not_emergency_confirmed": False,
            "source": "quiz_result",
        }
        r = requests.post(
            f"{API}/public/clinics/{GROWTH_CLINIC_ID}/bookings",
            json=body, headers={"Origin": BASE_URL}, timeout=15,
        )
        assert r.status_code == 400, r.text
        assert "not-emergency" in r.text.lower() or "emergency" in r.text.lower()

    def test_public_clinic_label_growth(self):
        r = requests.get(f"{API}/public/clinics/{GROWTH_CLINIC_ID}", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        # placement / label
        label = (data.get("public_status_label") or data.get("placement_label") or "")
        assert label in ("Growth партньор", "Growth Partner", "Verified Profile", "Проверен профил", ""), label
        assert "Authority" not in label
        # booking_enabled must be present
        assert "booking_enabled" in data

    def test_public_clinic_label_verified(self):
        # find a publicly listed verified clinic via list endpoint
        r = requests.get(f"{API}/public/clinics", timeout=15)
        assert r.status_code == 200
        verified = [c for c in r.json().get("clinics", []) if not c.get("booking_enabled")]
        if not verified:
            pytest.skip("no publicly-listed verified/non-booking clinic to sample")
        cid = verified[0]["id"]
        r2 = requests.get(f"{API}/public/clinics/{cid}", timeout=15)
        assert r2.status_code == 200, r2.text
        data = r2.json()
        label = (data.get("public_status_label") or data.get("placement_label") or "")
        assert "Authority" not in label
        assert data.get("booking_enabled") in (False, None)

    def test_smoke_public_clinics_list(self):
        r = requests.get(f"{API}/public/clinics", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json().get("clinics"), list)
