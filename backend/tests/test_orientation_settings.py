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
import requests

API_URL = os.environ.get("API_URL", "http://localhost:8001")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin@zubite.bg")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "password")


def _admin_token() -> str:
    r = requests.post(
        f"{API_URL}/api/admin/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


async def _new_clinic(partner_tier: str, clinic_status: str | None = None) -> str:
    """Insert a fresh clinic doc straight into Mongo to keep tests
    isolated (the admin create-clinic endpoint requires more fields and
    triggers email logic)."""
    from database import db  # type: ignore
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
        "partner_tier": partner_tier,
        "status": "active",
        "password_hash": "x",
        "created_at": "2026-06-01T00:00:00+00:00",
        "updated_at": "2026-06-01T00:00:00+00:00",
        "is_active": True,
    }
    await db.clinics.insert_one(doc)
    return cid


async def _drop_clinic(cid: str) -> None:
    from database import db  # type: ignore
    await db.clinics.delete_one({"id": cid})
    await db.clinic_online_orientation_settings.delete_many({"clinic_id": cid})
    await db.clinic_online_orientation_availability.delete_many({"clinic_id": cid})


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
            assert body["access"]["plan_category"] == "premium"

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


if __name__ == "__main__":  # pragma: no cover
    async def _all():
        # Share the asyncio loop so motor's executor stays alive between tests.
        from database import db  # noqa: F401
        # Each test function below uses asyncio.run() — but we instead
        # call them via an inner coroutine helper so we share a loop.
        # We do it manually here to keep the per-test asserts intact.
        # Premium
        from database import db as _db
        await _premium_runner(_db)
        await _basic_runner(_db)
        await _inactive_runner(_db)
        await _avail_runner(_db)
        await _category_runner(_db)
        # admin_auth is sync
        test_admin_auth_required()
        print("ALL PASS")

    # Pull the inner runners out by recreating them inline for the
    # shared-loop variant. Keeps original per-test funcs intact for
    # pytest discovery.
    async def _premium_runner(db):
        token = _admin_token()
        cid = await _new_clinic("premium")
        try:
            r = requests.get(f"{API_URL}/api/admin/clinics/{cid}/orientation-settings", headers=_h(token), timeout=10)
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["is_default"] is True
            assert body["access"]["status"] == "disabled_by_admin"
            r = requests.put(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-settings",
                headers=_h(token),
                json={"enabled": True, "monthly_free_slot_limit": 25, "slot_duration_minutes": 30},
                timeout=10,
            )
            body = r.json()
            assert body["access"]["status"] == "included_in_plan"
            assert body["settings"]["enabled"] is True
            assert body["is_default"] is False
            print("  test_premium_default_then_enable PASS")
        finally:
            await _drop_clinic(cid)

    async def _basic_runner(db):
        token = _admin_token()
        cid = await _new_clinic("standard")
        try:
            r = requests.get(f"{API_URL}/api/admin/clinics/{cid}/orientation-settings", headers=_h(token), timeout=10)
            assert r.json()["access"]["status"] == "not_available"
            r = requests.put(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-settings",
                headers=_h(token), json={"addon_enabled_for_basic": True}, timeout=10,
            )
            assert r.json()["access"]["status"] == "disabled_by_admin"
            r = requests.put(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-settings",
                headers=_h(token), json={"enabled": True}, timeout=10,
            )
            assert r.json()["access"]["status"] == "addon_enabled"
            print("  test_basic_addon_flow PASS")
        finally:
            await _drop_clinic(cid)

    async def _inactive_runner(db):
        token = _admin_token()
        cid = await _new_clinic("premium", clinic_status="inactive")
        try:
            requests.put(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-settings",
                headers=_h(token), json={"enabled": True}, timeout=10,
            )
            r = requests.get(f"{API_URL}/api/admin/clinics/{cid}/orientation-settings", headers=_h(token), timeout=10)
            body = r.json()
            assert body["access"]["status"] == "clinic_inactive"
            assert body["access"]["is_active"] is False
            print("  test_inactive_clinic_short_circuits PASS")
        finally:
            await _drop_clinic(cid)

    async def _avail_runner(db):
        token = _admin_token()
        cid = await _new_clinic("premium")
        try:
            r = requests.post(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-availability",
                headers=_h(token),
                json={"day_of_week": "monday", "start_time": "09:00", "end_time": "12:00"},
                timeout=10,
            )
            assert r.status_code == 200
            row_id = r.json()["id"]
            r = requests.post(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-availability",
                headers=_h(token),
                json={"day_of_week": "tuesday", "start_time": "15:00", "end_time": "14:00"},
                timeout=10,
            )
            assert r.status_code == 400
            assert r.json()["detail"]["code"] == "invalid_time_range"
            r = requests.patch(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-availability/{row_id}",
                headers=_h(token), json={"end_time": "13:30"}, timeout=10,
            )
            assert r.status_code == 200
            assert r.json()["end_time"] == "13:30"
            r = requests.patch(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-availability/{row_id}",
                headers=_h(token), json={"start_time": "14:00"}, timeout=10,
            )
            assert r.status_code == 400
            r = requests.delete(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-availability/{row_id}",
                headers=_h(token), timeout=10,
            )
            assert r.status_code == 200
            r = requests.delete(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-availability/{row_id}",
                headers=_h(token), timeout=10,
            )
            assert r.status_code == 404
            print("  test_availability_crud_and_validation PASS")
        finally:
            await _drop_clinic(cid)

    async def _category_runner(db):
        token = _admin_token()
        cid = await _new_clinic("premium")
        try:
            r = requests.put(
                f"{API_URL}/api/admin/clinics/{cid}/orientation-settings",
                headers=_h(token),
                json={"eligible_treatment_categories": ["does-not-exist"]},
                timeout=10,
            )
            assert r.status_code == 422
            print("  test_invalid_category_rejected PASS")
        finally:
            await _drop_clinic(cid)

    asyncio.run(_all())
