"""Phase D — Online Orientation Settings backend tests.

Covers:
- Default settings synthesised when no doc exists
- Premium tier toggles: not_enabled → included_in_plan / disabled_by_admin
- Basic tier toggles: add-on off → not_available, add-on on + enabled=False → disabled_by_admin, add-on + enabled → addon_enabled
- Inactive clinic short-circuits to clinic_inactive
- Availability create / update / delete + invalid time-range
- Invalid category rejected (422)
- Clinic read-only endpoint hides internal_admin_notes and reasons
"""

from __future__ import annotations
import os
import asyncio
import uuid
from contextlib import asynccontextmanager
import requests

API_URL = os.environ.get("API_URL", "http://localhost:8001")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin@zubite.bg")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "password")


_TOKEN_CACHE: str | None = None


def _admin_token() -> str:
    """Log in once per module run. `/api/admin/login` is rate-limited to
    5 calls per 300s per client, so a login per test made the suite fail
    itself with 429s once it grew past five tests."""
    global _TOKEN_CACHE
    if _TOKEN_CACHE is None:
        r = requests.post(
            f"{API_URL}/api/admin/login",
            json={"username": ADMIN_USER, "password": ADMIN_PASS},
            timeout=10,
        )
        r.raise_for_status()
        _TOKEN_CACHE = r.json()["access_token"]
    return _TOKEN_CACHE


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@asynccontextmanager
async def _mongo():
    """Yield a Motor handle bound to the *currently running* loop.

    `database.db` is a module-global client created at import time, so it
    binds to whichever loop touches it first. Every test here runs its own
    `asyncio.run(...)`, which closes that loop on exit — so the second test
    onwards died with "Event loop is closed" and the file could only ever
    be run one test at a time. Production is unaffected (uvicorn keeps a
    single long-lived loop), so the fix belongs here, not in database.py.
    """
    from motor.motor_asyncio import AsyncIOMotorClient  # type: ignore
    from config import MONGO_URL, DB_NAME  # type: ignore
    client = AsyncIOMotorClient(MONGO_URL)
    try:
        yield client[DB_NAME]
    finally:
        client.close()


async def _new_clinic(
    partner_tier: str | None = None,
    clinic_status: str | None = None,
    base_package: str | None = None,
) -> str:
    """Insert a fresh clinic doc straight into Mongo to keep tests
    isolated (the admin create-clinic endpoint requires more fields and
    triggers email logic).

    Pass `partner_tier` for the legacy pre-Feb-2026 shape, or
    `base_package` for the shape every clinic written since carries —
    the two are mutually exclusive on purpose, because a modern doc
    leaves `partner_tier` unset entirely.
    """
    if (partner_tier is None) == (base_package is None):
        raise ValueError("pass exactly one of partner_tier / base_package")
    cid = str(uuid.uuid4())
    doc = {
        "id": cid,
        "clinic_name": f"PHD-Test {cid[:6]}",
        "city": "София",
        "city_slug": "sofia",
        "email": f"phd-{cid[:8]}@example.bg",
        "phone": "+359888000000",
        "treatments_supported": ["orthodontics"],
        "treatments_offered": ["orthodontics"],
        "clinic_status": "active_partner" if clinic_status is None else clinic_status,
        "subscription_status": "active",
        "status": "active",
        "password_hash": "x",
        "created_at": "2026-06-01T00:00:00+00:00",
        "updated_at": "2026-06-01T00:00:00+00:00",
        "is_active": True,
    }
    if partner_tier is not None:
        doc["partner_tier"] = partner_tier
    else:
        doc["base_package"] = base_package
    async with _mongo() as db:
        await db.clinics.insert_one(doc)
    return cid


async def _drop_clinic(cid: str) -> None:
    async with _mongo() as db:
        await db.clinics.delete_one({"id": cid})
        await db.clinic_online_orientation_settings.delete_many({"clinic_id": cid})
        await db.clinic_online_orientation_availability.delete_many({"clinic_id": cid})
        await db.auth_sessions.delete_many({"user_id": cid})


async def _clinic_token(cid: str) -> str:
    """Mint a clinic session token without going through /clinic/login.

    Two reasons: the endpoint is rate-limited to 5/300s per client and
    these tests need several distinct clinics, and `create_clinic_token`
    writes its auth_sessions row through the loop-bound module-global
    client (see `_mongo`). This produces the same JWT + E5 session row
    the endpoint would, using a loop-local client.
    """
    import jwt  # type: ignore
    from datetime import datetime, timedelta, timezone as _tz
    from auth import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS  # type: ignore

    jti = str(uuid.uuid4())
    now = datetime.now(_tz.utc)
    expires_at = now + timedelta(hours=JWT_EXPIRATION_HOURS)
    token = jwt.encode(
        {
            "sub": cid, "email": f"phd-{cid[:8]}@example.bg", "role": "clinic",
            "jti": jti, "iat": int(now.timestamp()), "exp": expires_at,
        },
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )
    async with _mongo() as db:
        await db.auth_sessions.insert_one({
            "id": str(uuid.uuid4()), "user_id": cid, "user_type": "clinic",
            "jti": jti, "created_at": now.isoformat(),
            "last_seen_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "revoked_at": None, "revoked_reason": None,
        })
    return token


async def _enable_orientation(cid: str) -> None:
    """Turn the feature on for a clinic without an admin round-trip."""
    async with _mongo() as db:
        await db.clinic_online_orientation_settings.update_one(
            {"clinic_id": cid},
            {"$set": {
                "id": str(uuid.uuid4()), "clinic_id": cid, "enabled": True,
                "slot_duration_minutes": 30, "booking_buffer_minutes": 0,
                "max_bookings_per_day": 4, "monthly_free_slot_limit": 20,
                "created_at": "2026-06-01T00:00:00+00:00",
                "updated_at": "2026-06-01T00:00:00+00:00",
            }},
            upsert=True,
        )


def test_premium_default_then_enable():
    token = _admin_token()

    async def runner():
        cid = await _new_clinic("premium")
        try:
            r = requests.get(f"{API_URL}/api/admin/clinics/{cid}/orientation-settings", headers=_h(token), timeout=10)
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["is_default"] is True
            assert body["access"]["status"] == "disabled_by_admin", body["access"]
            # Legacy partner_tier="premium" resolves to the growth_partner
            # base package (see LEGACY_PARTNER_TIER_TO_BASE_PACKAGE).
            assert body["access"]["plan_category"] == "growth"
            assert body["access"]["base_package"] == "growth_partner"

            r = requests.put(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-settings",
                headers=_h(token),
                json={"enabled": True, "monthly_free_slot_limit": 25, "slot_duration_minutes": 30},
                timeout=10,
            )
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["access"]["status"] == "included_in_plan", body["access"]
            assert body["settings"]["enabled"] is True
            assert body["settings"]["monthly_free_slot_limit"] == 25
            assert body["settings"]["slot_duration_minutes"] == 30
            assert body["is_default"] is False
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


def test_growth_partner_without_legacy_tier_is_included_in_plan():
    """Regression: every clinic written since the Feb-2026 revamp carries
    `base_package` and leaves `partner_tier` unset. Access resolution used
    to read `partner_tier` directly, defaulting those docs to "standard"
    → "basic" → `not_available`, so Growth Partners were locked out of the
    orientation feature their package includes and admins could only
    unblock them via the Verified add-on toggle."""
    token = _admin_token()

    async def runner():
        cid = await _new_clinic(base_package="growth_partner")
        try:
            r = requests.put(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-settings",
                headers=_h(token), json={"enabled": True}, timeout=10,
            )
            assert r.status_code == 200, r.text
            access = r.json()["access"]
            assert access["plan_category"] == "growth", access
            assert access["base_package"] == "growth_partner", access
            # Included in the package — NOT contingent on the add-on flag.
            assert access["status"] == "included_in_plan", access
            assert access["addon_enabled_for_basic"] is False, access
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


def test_verified_profile_without_legacy_tier_needs_addon():
    """The mirror of the above: a modern Verified Profile doc must still
    be gated behind the add-on, so the fix above didn't simply open the
    feature to everyone."""
    token = _admin_token()

    async def runner():
        cid = await _new_clinic(base_package="verified_profile")
        try:
            r = requests.put(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-settings",
                headers=_h(token), json={"enabled": True}, timeout=10,
            )
            assert r.status_code == 200, r.text
            access = r.json()["access"]
            assert access["plan_category"] == "verified", access
            assert access["status"] == "not_available", access
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


def test_basic_addon_flow():
    token = _admin_token()

    async def runner():
        cid = await _new_clinic("standard")
        try:
            r = requests.get(f"{API_URL}/api/admin/clinics/{cid}/orientation-settings", headers=_h(token), timeout=10)
            assert r.json()["access"]["status"] == "not_available"
            # add-on on, but operational off → disabled_by_admin
            r = requests.put(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-settings",
                headers=_h(token),
                json={"addon_enabled_for_basic": True},
                timeout=10,
            )
            assert r.json()["access"]["status"] == "disabled_by_admin"
            # operational on → addon_enabled
            r = requests.put(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-settings",
                headers=_h(token), json={"enabled": True}, timeout=10,
            )
            assert r.json()["access"]["status"] == "addon_enabled"
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


def test_inactive_clinic_short_circuits():
    token = _admin_token()

    async def runner():
        cid = await _new_clinic("premium", clinic_status="inactive")
        try:
            # Even a Premium plan + enabled toggle cannot route an
            # inactive clinic.
            requests.put(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-settings",
                headers=_h(token), json={"enabled": True}, timeout=10,
            )
            r = requests.get(f"{API_URL}/api/admin/clinics/{cid}/orientation-settings", headers=_h(token), timeout=10)
            body = r.json()
            assert body["access"]["status"] == "clinic_inactive"
            assert body["access"]["is_active"] is False
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


def test_availability_crud_and_validation():
    token = _admin_token()

    async def runner():
        cid = await _new_clinic("premium")
        try:
            # Create a valid row
            r = requests.post(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-availability",
                headers=_h(token),
                json={"day_of_week": "monday", "start_time": "09:00", "end_time": "12:00"},
                timeout=10,
            )
            assert r.status_code == 200, r.text
            row = r.json()
            assert row["day_of_week"] == "monday"
            row_id = row["id"]
            # Invalid time range
            r = requests.post(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-availability",
                headers=_h(token),
                json={"day_of_week": "tuesday", "start_time": "15:00", "end_time": "14:00"},
                timeout=10,
            )
            assert r.status_code == 400, r.text
            assert r.json()["detail"]["code"] == "invalid_time_range"
            # Patch row
            r = requests.patch(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-availability/{row_id}",
                headers=_h(token),
                json={"end_time": "13:30"},
                timeout=10,
            )
            assert r.status_code == 200
            assert r.json()["end_time"] == "13:30"
            # Patch with broken range
            r = requests.patch(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-availability/{row_id}",
                headers=_h(token),
                json={"start_time": "14:00"},
                timeout=10,
            )
            assert r.status_code == 400
            # List
            r = requests.get(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-availability",
                headers=_h(token), timeout=10,
            )
            assert r.status_code == 200
            assert len(r.json()["availability"]) == 1
            # Delete
            r = requests.delete(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-availability/{row_id}",
                headers=_h(token), timeout=10,
            )
            assert r.status_code == 200
            assert r.json()["deleted"] is True
            # 404 on next delete
            r = requests.delete(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-availability/{row_id}",
                headers=_h(token), timeout=10,
            )
            assert r.status_code == 404
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


def test_invalid_category_rejected():
    token = _admin_token()

    async def runner():
        cid = await _new_clinic("premium")
        try:
            r = requests.put(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-settings",
                headers=_h(token),
                json={"eligible_treatment_categories": ["does-not-exist"]},
                timeout=10,
            )
            assert r.status_code == 422
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


def test_admin_auth_required():
    cid = "00000000-0000-0000-0000-000000000000"
    r = requests.get(f"{API_URL}/api/admin/clinics/{cid}/orientation-settings", timeout=10)
    assert r.status_code in (401, 403), r.text


# ─── Clinic self-serve availability ───────────────────────

def test_clinic_availability_crud():
    """A Growth Partner manages its own orientation windows end to end."""
    async def runner():
        cid = await _new_clinic(base_package="growth_partner")
        try:
            await _enable_orientation(cid)
            h = _h(await _clinic_token(cid))

            r = requests.get(f"{API_URL}/api/clinic/orientation-availability", headers=h, timeout=10)
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["can_edit"] is True, body
            assert body["access_status"] == "included_in_plan", body
            assert body["availability"] == []

            r = requests.post(
                f"{API_URL}/api/clinic/orientation-availability", headers=h,
                json={"day_of_week": "monday", "start_time": "09:00", "end_time": "12:00"},
                timeout=10,
            )
            assert r.status_code == 200, r.text
            row_id = r.json()["id"]

            r = requests.patch(
                f"{API_URL}/api/clinic/orientation-availability/{row_id}", headers=h,
                json={"end_time": "13:30"}, timeout=10,
            )
            assert r.status_code == 200, r.text
            assert r.json()["end_time"] == "13:30"

            r = requests.get(f"{API_URL}/api/clinic/orientation-availability", headers=h, timeout=10)
            assert r.json()["availability_summary"]["active_days"] == ["monday"]

            r = requests.delete(
                f"{API_URL}/api/clinic/orientation-availability/{row_id}", headers=h, timeout=10)
            assert r.status_code == 200, r.text
            r = requests.delete(
                f"{API_URL}/api/clinic/orientation-availability/{row_id}", headers=h, timeout=10)
            assert r.status_code == 404
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


def test_clinic_availability_rejects_overlap():
    """Overlapping windows would make `generate_slots_for_clinic` emit the
    same slot twice, so the patient sees a duplicate time."""
    async def runner():
        cid = await _new_clinic(base_package="growth_partner")
        try:
            await _enable_orientation(cid)
            h = _h(await _clinic_token(cid))
            r = requests.post(
                f"{API_URL}/api/clinic/orientation-availability", headers=h,
                json={"day_of_week": "monday", "start_time": "09:00", "end_time": "12:00"},
                timeout=10,
            )
            assert r.status_code == 200, r.text
            first_id = r.json()["id"]

            # Overlaps 09:00–12:00.
            r = requests.post(
                f"{API_URL}/api/clinic/orientation-availability", headers=h,
                json={"day_of_week": "monday", "start_time": "11:00", "end_time": "14:00"},
                timeout=10,
            )
            assert r.status_code == 400, r.text
            assert r.json()["detail"]["code"] == "overlapping_window"

            # Same times on a different weekday are fine.
            r = requests.post(
                f"{API_URL}/api/clinic/orientation-availability", headers=h,
                json={"day_of_week": "tuesday", "start_time": "11:00", "end_time": "14:00"},
                timeout=10,
            )
            assert r.status_code == 200, r.text

            # Abutting (not overlapping) is fine.
            r = requests.post(
                f"{API_URL}/api/clinic/orientation-availability", headers=h,
                json={"day_of_week": "monday", "start_time": "12:00", "end_time": "14:00"},
                timeout=10,
            )
            assert r.status_code == 200, r.text

            # A PATCH must not be able to slide a window into an overlap.
            r = requests.patch(
                f"{API_URL}/api/clinic/orientation-availability/{first_id}", headers=h,
                json={"end_time": "13:00"}, timeout=10,
            )
            assert r.status_code == 400, r.text
            assert r.json()["detail"]["code"] == "overlapping_window"
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


def test_clinic_without_orientation_access_cannot_write():
    """A Verified Profile without the add-on may look but not touch."""
    async def runner():
        cid = await _new_clinic(base_package="verified_profile")
        try:
            h = _h(await _clinic_token(cid))
            r = requests.get(f"{API_URL}/api/clinic/orientation-availability", headers=h, timeout=10)
            assert r.status_code == 200, r.text
            assert r.json()["can_edit"] is False
            assert r.json()["access_status"] == "not_available"

            r = requests.post(
                f"{API_URL}/api/clinic/orientation-availability", headers=h,
                json={"day_of_week": "monday", "start_time": "09:00", "end_time": "12:00"},
                timeout=10,
            )
            assert r.status_code == 403, r.text
            assert r.json()["detail"]["code"] == "orientation_not_available"
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


def test_clinic_cannot_touch_another_clinics_window():
    async def runner():
        owner = await _new_clinic(base_package="growth_partner")
        other = await _new_clinic(base_package="growth_partner")
        try:
            await _enable_orientation(owner)
            await _enable_orientation(other)
            r = requests.post(
                f"{API_URL}/api/clinic/orientation-availability",
                headers=_h(await _clinic_token(owner)),
                json={"day_of_week": "monday", "start_time": "09:00", "end_time": "12:00"},
                timeout=10,
            )
            assert r.status_code == 200, r.text
            row_id = r.json()["id"]

            h_other = _h(await _clinic_token(other))
            r = requests.patch(
                f"{API_URL}/api/clinic/orientation-availability/{row_id}",
                headers=h_other, json={"end_time": "18:00"}, timeout=10,
            )
            assert r.status_code == 404, r.text
            r = requests.delete(
                f"{API_URL}/api/clinic/orientation-availability/{row_id}",
                headers=h_other, timeout=10,
            )
            assert r.status_code == 404, r.text
        finally:
            await _drop_clinic(owner)
            await _drop_clinic(other)

    asyncio.run(runner())


def test_clinic_availability_auth_required():
    r = requests.get(f"{API_URL}/api/clinic/orientation-availability", timeout=10)
    assert r.status_code in (401, 403), r.text


# ─── Slot generation: zero is a real value ────────────────

def test_setting_int_treats_zero_as_a_value():
    """`settings.get(k) or default` silently promoted a deliberate 0 to the
    default. The schema allows ge=0 for the free-slot limit, the daily cap
    and the buffer, and 0 means something specific for each."""
    from orientation_slots import _setting_int  # type: ignore

    assert _setting_int({"k": 0}, "k", 15) == 0
    assert _setting_int({"k": 7}, "k", 15) == 7
    assert _setting_int({}, "k", 15) == 15
    assert _setting_int({"k": None}, "k", 15) == 15
    assert _setting_int({"k": "nonsense"}, "k", 15) == 15
    # bool is an int subclass — a stray True must not read as 1.
    assert _setting_int({"k": True}, "k", 15) == 15


def test_zero_free_slot_limit_offers_no_slots():
    """Admin setting the monthly free allowance to 0 must actually stop the
    free slots, not hand out the default 10."""
    from orientation_slots import generate_slots_for_clinic  # type: ignore

    async def runner():
        cid = await _new_clinic(base_package="growth_partner")
        try:
            await _enable_orientation(cid)
            rows = [{
                "id": str(uuid.uuid4()), "clinic_id": cid, "day_of_week": d,
                "start_time": "09:00", "end_time": "17:00", "is_active": True,
            } for d in ("monday", "tuesday", "wednesday", "thursday", "friday")]
            base = {
                "clinic_id": cid, "enabled": True, "slot_duration_minutes": 30,
                "booking_buffer_minutes": 0, "max_bookings_per_day": 4,
                "monthly_free_slot_limit": 20,
            }
            async with _mongo() as db:
                open_slots = await generate_slots_for_clinic(db, cid, base, rows)
                assert len(open_slots) > 0, "sanity: baseline should offer slots"

                none_left = await generate_slots_for_clinic(
                    db, cid, {**base, "monthly_free_slot_limit": 0}, rows)
                assert none_left == [], f"expected no slots, got {len(none_left)}"

                capped = await generate_slots_for_clinic(
                    db, cid, {**base, "max_bookings_per_day": 0}, rows)
                assert capped == [], f"expected no slots, got {len(capped)}"
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())

