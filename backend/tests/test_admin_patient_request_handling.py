"""Admin handling tests for P4 (selected clinic) and P5 (assisted choice)
patient-flow consultation_requests.

Verifies:
1. Admin can list selected-clinic requests (P4).
2. Admin can list assisted-choice requests (P5).
3. `created_from` filter works (selected vs. assisted vs. unknown).
4. `status` filter works (assigned vs. needs_zubite_review).
5. Admin detail includes the selected clinic info for P4 rows.
6. Admin detail includes `patient_message` for P5 rows.
7. Clinic JWT cannot access the admin list endpoint.
8. Unauthenticated requests cannot access the admin list endpoint.
9. Unsafe fields (password_hash, etc.) never leak through admin endpoints.
10. Admin PATCH still works for status transitions on P4 rows.
11. Admin PATCH accepts the new `needs_zubite_review` status value.

Pattern mirrors the other isolated-DB suites: in-process ASGI client,
test-only DB name, no network egress.
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest

os.environ.setdefault("DB_NAME", "zubite_test_admin_p4_p5_handling")
os.environ.setdefault("APP_ENV", "test")
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"
os.environ.setdefault("RESEND_API_KEY", "test_resend_key_no_network")
os.environ.setdefault("ADMIN_EMAIL", "admin-alerts@example.com")
os.environ["AUTH_COOKIE_SECURE"] = "0"

_db_name = os.environ.get("DB_NAME", "")
if not (_db_name.startswith("zubite_test") or _db_name.startswith("test_")):
    raise RuntimeError(f"Refusing to run: DB_NAME={_db_name!r}")
if (os.environ.get("APP_ENV") or "").lower() == "production":
    raise RuntimeError("Refusing APP_ENV=production")

_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import storage as _storage_mod  # noqa: E402
_storage_mod.init_storage = lambda: None  # type: ignore[assignment]

import resend as _resend  # noqa: E402
_resend.Emails.send = MagicMock(return_value={"id": "test-no-send"})  # type: ignore[assignment]

import emails as _emails_mod  # noqa: E402
_emails_mod.send_lead_notification_email = MagicMock(return_value=None)
_emails_mod.send_lead_confirmation_email = MagicMock(return_value=None)

from httpx import ASGITransport, AsyncClient  # noqa: E402

_LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(_LOOP)


def _run(coro):
    return _LOOP.run_until_complete(coro)


ADMIN_USERNAME = "admin@zubite.bg"
ADMIN_PASSWORD = "AdminTestPass1!"
CLINIC_EMAIL = "clinic-admin-handling@example.com"
CLINIC_PASSWORD = "ClinicPass1!"


@pytest.fixture(scope="module")
def app():
    import server as _server
    return _server.app


def _client(app):
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@pytest.fixture(scope="module", autouse=True)
def _bootstrap(app):  # noqa: ARG001
    import database as _database
    from auth import hash_password

    async def setup():
        db = _database.db
        for coll in await db.list_collection_names():
            await db[coll].delete_many({})
        await db.admin_users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "username": ADMIN_USERNAME,
                "password_hash": hash_password(ADMIN_PASSWORD),
                "role": "admin",
                "created_at": _now_iso(),
            }
        )
        await db.clinics.insert_one(
            {
                "id": str(uuid.uuid4()),
                "clinic_name": "AdminTest Clinic",
                "name": "AdminTest Clinic",
                "city": "Sofia",
                "city_name": "София",
                "city_slug": "sofia",
                "email": CLINIC_EMAIL,
                "phone": "+359 88 555 0000",
                "password_hash": hash_password(CLINIC_PASSWORD),
                "status": "active",
                "clinic_status": "active_partner",
                "subscription_status": "active",
                "address": "Test addr",
                "is_active": True,
                "treatments_supported": ["aligners"],
                "treatments_offered": ["aligners"],
                "notification_email": CLINIC_EMAIL,
                "created_at": _now_iso(),
            }
        )

    async def teardown():
        await _database.client.drop_database(os.environ["DB_NAME"])
        _database.client.close()

    _run(setup())
    yield
    _run(teardown())


@pytest.fixture(autouse=True)
def _reset_state():
    import database as _database
    import rate_limit as _rl

    async def wipe():
        db = _database.db
        await db.consultation_requests.delete_many({})
        await db.consultation_events.delete_many({})
        await db.leads.delete_many({})
        await db.admin_audit_logs.delete_many({})

    _rl._buckets.clear()
    _run(wipe())
    yield
    _rl._buckets.clear()


# ── auth helpers ──────────────────────────────────────────────────


async def _admin_login(app) -> dict:
    async with _client(app) as c:
        r = await c.post(
            "/api/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        )
    r.raise_for_status()
    return dict(r.cookies)


async def _clinic_login(app) -> dict:
    async with _client(app) as c:
        r = await c.post(
            "/api/clinic/login",
            json={"email": CLINIC_EMAIL, "password": CLINIC_PASSWORD},
        )
    r.raise_for_status()
    return dict(r.cookies)


async def _clinic_id() -> str:
    import database as _database
    c = await _database.db.clinics.find_one({"email": CLINIC_EMAIL}, {"_id": 0, "id": 1})
    return c["id"]  # type: ignore[index]


# ── seed helpers ──────────────────────────────────────────────────


def _seed_p4(clinic_id: str, *, patient_name: str = "P4 Patient",
             status: str = "assigned") -> str:
    """Insert a P4 (selected-clinic) consultation_request."""
    import database as _database
    rid = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": rid,
        "patient_name": patient_name,
        "patient_phone": "+359888111222",
        "patient_email": "p4@example.com",
        "patient_city": "sofia",
        "treatment_interest": "aligners",
        "urgency": "high",
        "readiness": "ready",
        "lead_id": str(uuid.uuid4()),
        "source": "patient_selected_clinic",
        "created_from": "recommended_clinics_flow",
        "selection_source": "matching_card",
        "assigned_clinic_id": clinic_id,
        "status": status,
        "assigned_at": now,
        "consent_to_share_clinic": True,
        "consent_to_share_clinic_at": now,
        "consent_to_share_clinic_text": "Съгласен/на съм Zubite да сподели данните…",
        "created_at": now,
        "updated_at": now,
    }
    _run(_database.db.consultation_requests.insert_one(doc))
    return rid


def _seed_p5(*, patient_message: str = "Не съм сигурен коя клиника е подходяща.") -> str:
    """Insert a P5 (assisted-choice) consultation_request — assigned_clinic_id=null."""
    import database as _database
    rid = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": rid,
        "patient_name": "P5 Patient",
        "patient_phone": "+359888333444",
        "patient_email": "p5@example.com",
        "patient_city": "sofia",
        "treatment_interest": "aligners",
        "urgency": "normal",
        "readiness": "exploring",
        "lead_id": str(uuid.uuid4()),
        "source": "patient_requested_zubite_help",
        "created_from": "assisted_choice_flow",
        "selection_source": "matching_page",
        "assigned_clinic_id": None,
        "status": "needs_zubite_review",
        "assigned_at": None,
        "patient_message": patient_message,
        "consent_to_share_zubite": True,
        "consent_to_share_zubite_at": now,
        "consent_to_share_zubite_text": "Съгласен/на съм Zubite да получи и обработи моите данни…",
        "created_at": now,
        "updated_at": now,
    }
    _run(_database.db.consultation_requests.insert_one(doc))
    return rid


def _seed_legacy_admin_row(clinic_id: str) -> str:
    """Insert a non-P4/P5 row (admin-created / legacy) for filter tests."""
    import database as _database
    rid = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": rid,
        "patient_name": "Legacy Row",
        "patient_phone": "+359888555666",
        "treatment_interest": "braces",
        "assigned_clinic_id": clinic_id,
        "status": "assigned",
        "assigned_at": now,
        # No created_from -> "other" kind on the frontend.
        "created_at": now,
        "updated_at": now,
    }
    _run(_database.db.consultation_requests.insert_one(doc))
    return rid


# ── tests ─────────────────────────────────────────────────────────


def test_01_admin_lists_selected_clinic_request(app):
    """P4 row appears in admin list with created_from=recommended_clinics_flow."""
    cid = _run(_clinic_id())
    rid = _seed_p4(cid)
    admin_cookies = _run(_admin_login(app))

    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/consultation-requests", cookies=admin_cookies)

    r = _run(go())
    assert r.status_code == 200, r.text
    data = r.json()
    ids = [x["id"] for x in data["requests"]]
    assert rid in ids
    row = next(x for x in data["requests"] if x["id"] == rid)
    assert row["created_from"] == "recommended_clinics_flow"
    assert row["assigned_clinic_id"] == cid
    assert row["assigned_clinic_name"] == "AdminTest Clinic"
    assert row["assigned_clinic_city"] == "София"


def test_02_admin_lists_assisted_choice_request(app):
    """P5 row appears in admin list with created_from=assisted_choice_flow."""
    rid = _seed_p5()
    admin_cookies = _run(_admin_login(app))

    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/consultation-requests", cookies=admin_cookies)

    r = _run(go())
    assert r.status_code == 200, r.text
    data = r.json()
    ids = [x["id"] for x in data["requests"]]
    assert rid in ids
    row = next(x for x in data["requests"] if x["id"] == rid)
    assert row["created_from"] == "assisted_choice_flow"
    assert row["assigned_clinic_id"] is None
    assert row["status"] == "needs_zubite_review"
    assert row["patient_message"] == "Не съм сигурен коя клиника е подходяща."


def test_03_filter_by_created_from(app):
    cid = _run(_clinic_id())
    p4 = _seed_p4(cid)
    p5 = _seed_p5()
    leg = _seed_legacy_admin_row(cid)
    admin_cookies = _run(_admin_login(app))

    async def fetch(qs: str):
        async with _client(app) as c:
            return await c.get(f"/api/admin/consultation-requests?{qs}", cookies=admin_cookies)

    r1 = _run(fetch("created_from=recommended_clinics_flow"))
    ids1 = [x["id"] for x in r1.json()["requests"]]
    assert p4 in ids1
    assert p5 not in ids1
    assert leg not in ids1

    r2 = _run(fetch("created_from=assisted_choice_flow"))
    ids2 = [x["id"] for x in r2.json()["requests"]]
    assert p5 in ids2
    assert p4 not in ids2
    assert leg not in ids2

    # Unknown / not-whitelisted value -> filter ignored, returns all.
    r3 = _run(fetch("created_from=not_a_real_flow"))
    assert r3.status_code == 200
    ids3 = [x["id"] for x in r3.json()["requests"]]
    assert p4 in ids3 and p5 in ids3 and leg in ids3


def test_04_filter_by_status_needs_zubite_review(app):
    cid = _run(_clinic_id())
    p4 = _seed_p4(cid, status="assigned")
    p5 = _seed_p5()
    admin_cookies = _run(_admin_login(app))

    async def fetch(qs: str):
        async with _client(app) as c:
            return await c.get(f"/api/admin/consultation-requests?{qs}", cookies=admin_cookies)

    r_needs = _run(fetch("status=needs_zubite_review"))
    ids = [x["id"] for x in r_needs.json()["requests"]]
    assert p5 in ids
    assert p4 not in ids

    r_assigned = _run(fetch("status=assigned"))
    ids2 = [x["id"] for x in r_assigned.json()["requests"]]
    assert p4 in ids2
    assert p5 not in ids2


def test_05_admin_detail_for_selected_clinic_request(app):
    cid = _run(_clinic_id())
    rid = _seed_p4(cid)
    admin_cookies = _run(_admin_login(app))

    async def go():
        async with _client(app) as c:
            return await c.get(f"/api/admin/consultation-requests/{rid}", cookies=admin_cookies)

    r = _run(go())
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["request"]["id"] == rid
    assert data["request"]["created_from"] == "recommended_clinics_flow"
    assert data["request"]["selection_source"] == "matching_card"
    assert data["request"]["consent_to_share_clinic"] is True
    assert data["request"]["consent_to_share_clinic_at"]
    assert data["request"]["consent_to_share_clinic_text"]
    assert data["clinic_name"] == "AdminTest Clinic"
    assert data["clinic_city"] == "София"


def test_06_admin_detail_for_assisted_choice_request(app):
    rid = _seed_p5(patient_message="Бих искал съвет за избор на клиника в София.")
    admin_cookies = _run(_admin_login(app))

    async def go():
        async with _client(app) as c:
            return await c.get(f"/api/admin/consultation-requests/{rid}", cookies=admin_cookies)

    r = _run(go())
    assert r.status_code == 200, r.text
    data = r.json()
    req = data["request"]
    assert req["created_from"] == "assisted_choice_flow"
    assert req["selection_source"] == "matching_page"
    assert req["patient_message"] == "Бих искал съвет за избор на клиника в София."
    assert req["consent_to_share_zubite"] is True
    assert req["consent_to_share_zubite_at"]
    assert req["consent_to_share_zubite_text"]
    assert req["assigned_clinic_id"] is None
    # No clinic attached -> clinic_name and clinic_city are null.
    assert data["clinic_name"] is None
    assert data["clinic_city"] is None


def test_07_clinic_jwt_cannot_access_admin_list(app):
    _seed_p5()
    clinic_cookies = _run(_clinic_login(app))

    async def go():
        async with _client(app) as c:
            return await c.get(
                "/api/admin/consultation-requests",
                cookies=clinic_cookies,
                headers={"Origin": "https://zubite.bg"},
            )

    r = _run(go())
    assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}: {r.text}"


def test_08_unauthenticated_cannot_access_admin_list(app):
    _seed_p5()

    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/consultation-requests")

    r = _run(go())
    assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"


def test_09_no_unsafe_fields_leak(app):
    """Whatever is stored on the doc, no clinic password_hash / tokens
    should leak through the list or detail endpoints. Patient PII is
    expected (admin is privileged), but clinic secrets must never appear.
    """
    cid = _run(_clinic_id())
    rid = _seed_p4(cid)
    _seed_p5()
    admin_cookies = _run(_admin_login(app))

    async def go_list():
        async with _client(app) as c:
            return await c.get("/api/admin/consultation-requests", cookies=admin_cookies)

    async def go_detail():
        async with _client(app) as c:
            return await c.get(f"/api/admin/consultation-requests/{rid}", cookies=admin_cookies)

    list_body = _run(go_list()).json()
    detail_body = _run(go_detail()).json()

    import json
    blob_list = json.dumps(list_body, ensure_ascii=False)
    blob_detail = json.dumps(detail_body, ensure_ascii=False)
    for forbidden in ("password_hash", "ClinicPass1!", "access_token",
                       "session_token", "jwt_secret", "notification_email"):
        assert forbidden not in blob_list, f"{forbidden!r} leaked in list response"
        assert forbidden not in blob_detail, f"{forbidden!r} leaked in detail response"


def test_10_admin_patch_status_still_works(app):
    """Admin can still PATCH a P4 row's status — regression."""
    cid = _run(_clinic_id())
    rid = _seed_p4(cid, status="assigned")
    admin_cookies = _run(_admin_login(app))

    async def go():
        async with _client(app) as c:
            return await c.patch(
                f"/api/admin/consultation-requests/{rid}",
                json={"status": "patient_contacted"},
                cookies=admin_cookies,
                headers={"Origin": "https://zubite.bg"},
            )

    r = _run(go())
    assert r.status_code == 200, r.text

    import database as _database
    doc = _run(_database.db.consultation_requests.find_one({"id": rid}, {"_id": 0}))
    assert doc["status"] == "patient_contacted"


def test_11_admin_patch_accepts_needs_zubite_review_status(app):
    """The new `needs_zubite_review` value must be a valid status for
    admin PATCH transitions (e.g., admin re-routes a request manually).
    """
    cid = _run(_clinic_id())
    rid = _seed_p4(cid, status="assigned")
    admin_cookies = _run(_admin_login(app))

    async def go():
        async with _client(app) as c:
            return await c.patch(
                f"/api/admin/consultation-requests/{rid}",
                json={"status": "needs_zubite_review"},
                cookies=admin_cookies,
                headers={"Origin": "https://zubite.bg"},
            )

    r = _run(go())
    assert r.status_code == 200, r.text


def test_12_admin_can_add_note_on_assisted_choice_row(app):
    """Sanity check that admin note flow works on P5 rows where the
    `assigned_clinic_id` is null (no clinic to event-log against).
    """
    rid = _seed_p5()
    admin_cookies = _run(_admin_login(app))

    async def go():
        async with _client(app) as c:
            return await c.patch(
                f"/api/admin/consultation-requests/{rid}",
                json={"notes": "Свързах се с пациента телефонно — насочих го към 2 клиники."},
                cookies=admin_cookies,
                headers={"Origin": "https://zubite.bg"},
            )

    r = _run(go())
    assert r.status_code == 200, r.text

    import database as _database
    doc = _run(_database.db.consultation_requests.find_one({"id": rid}, {"_id": 0}))
    assert doc["notes"].startswith("Свързах се")
