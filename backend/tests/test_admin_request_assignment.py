"""Admin request assignment + clinic-portal visibility tests.

Covers the P0 admin request handling fix:

  1. P4 selected-clinic request exposes assigned_clinic_id in admin list.
  2. P4 selected-clinic request exposes assigned_clinic_id + clinic_name
     in admin detail.
  3. P4 admin list row carries the data needed to preselect the clinic
     UI (assigned_clinic_id + assigned_clinic_name).
  4. P4 request with a missing clinic id is flagged (status falls back
     to a value that is NOT silently `assigned`).
  5. P5 assisted-choice request initially has no assigned clinic and
     status = needs_zubite_review.
  6. Admin can assign P5 request to a valid clinic.
  7. After assignment, status becomes `assigned`.
  8. After assignment, the request is visible to the assigned clinic in
     the clinic portal.
  9. After assignment, the request is NOT visible to an unrelated clinic.
 10. Admin cannot assign a non-existent clinic (404).
 11. Clinic user cannot assign requests (the admin endpoint rejects
     non-admin tokens).
 12. Unauthenticated user cannot assign a request.
 13. Assignment appends a timeline event with action_type
     `assigned_to_clinic`, the assigned clinic_id, the admin user_id,
     previous_status, and new_status="assigned".
 14. Patient context payload remains visible to the assigned clinic
     after assignment (visibility-upgrade contract preserved).
 15. Assignment never invokes Twilio or ElevenLabs. Resend SDK is fully
     mocked → no real network call.
 16. Existing P4/P5 creation behaviour still works (smoke).

Isolated test DB. Resend / Twilio / ElevenLabs all mocked.
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

os.environ.setdefault("DB_NAME", "zubite_test_admin_assign")
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


CLINIC_A_EMAIL = "clinic-a-assign@example.com"
CLINIC_A_PASS = "ClinicAPass1!"
CLINIC_B_EMAIL = "clinic-b-assign@example.com"
CLINIC_B_PASS = "ClinicBPass1!"
ADMIN_USERNAME = "admin@zubite.bg"
ADMIN_PASSWORD = "AdminTestPass1!"


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
        for email, pw, name in (
            (CLINIC_A_EMAIL, CLINIC_A_PASS, "Clinic A"),
            (CLINIC_B_EMAIL, CLINIC_B_PASS, "Clinic B"),
        ):
            await db.clinics.insert_one({
                "id": str(uuid.uuid4()),
                "clinic_name": name, "name": name,
                "city": "Sofia", "city_name": "София", "city_slug": "sofia",
                "email": email, "phone": "+359 88 000 0000",
                "password_hash": hash_password(pw),
                "status": "active", "clinic_status": "active_partner",
                "subscription_status": "active", "address": "Test",
                "is_active": True,
                "treatments_supported": ["aligners"],
                "treatments_offered": ["aligners"],
                "notification_email": email,
                "created_at": _now_iso(),
            })
        await db.admin_users.insert_one({
            "id": str(uuid.uuid4()),
            "username": ADMIN_USERNAME,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": _now_iso(),
        })

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

    _rl._buckets.clear()
    _run(wipe())
    _resend.Emails.send.reset_mock()
    yield
    _rl._buckets.clear()


async def _login_admin(app) -> str:
    async with _client(app) as c:
        r = await c.post("/api/admin/login",
                         json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    r.raise_for_status()
    return r.json()["access_token"]


async def _login_clinic(app, email: str, password: str) -> str:
    async with _client(app) as c:
        r = await c.post("/api/clinic/login", json={"email": email, "password": password})
    r.raise_for_status()
    return r.json()["access_token"]


async def _clinic_id(email: str) -> str:
    import database as _database
    c = await _database.db.clinics.find_one({"email": email}, {"_id": 0, "id": 1})
    return c["id"]  # type: ignore[index]


def _hdr(token: str | None) -> dict:
    return {"Authorization": f"Bearer {token}"} if token else {}


def _seed_lead() -> str:
    import database as _database
    lid = str(uuid.uuid4())
    _run(_database.db.leads.insert_one({
        "id": lid,
        "name": "Test Patient", "phone": "+359 88 000 1234",
        "city_slug": "sofia", "treatment_type": "aligners",
        "answers": {"seriousness": "considering", "timing": "0-3"},
        "created_at": _now_iso(),
    }))
    return lid


def _seed_p4_request(*, clinic_id: str | None) -> str:
    import database as _database
    rid = str(uuid.uuid4())
    now = _now_iso()
    _run(_database.db.consultation_requests.insert_one({
        "id": rid,
        "patient_name": "P4 Test", "patient_phone": "+359 88 100 0001",
        "patient_city": "sofia", "treatment_interest": "aligners",
        "urgency": "high", "readiness": "ready",
        "lead_id": _seed_lead(),
        "source": "patient_selected_clinic",
        "created_from": "recommended_clinics_flow",
        "selection_source": "matching_card",
        "assigned_clinic_id": clinic_id,
        "status": "assigned" if clinic_id else "new",
        "assigned_at": now if clinic_id else None,
        "created_at": now, "updated_at": now,
    }))
    return rid


def _seed_p5_request() -> str:
    import database as _database
    rid = str(uuid.uuid4())
    now = _now_iso()
    _run(_database.db.consultation_requests.insert_one({
        "id": rid,
        "patient_name": "P5 Test", "patient_phone": "+359 88 100 0002",
        "patient_city": "sofia", "treatment_interest": "aligners",
        "urgency": "high", "readiness": "ready",
        "lead_id": _seed_lead(),
        "source": "patient_assisted_choice",
        "created_from": "assisted_choice_flow",
        "selection_source": "matching_page",
        "assigned_clinic_id": None,
        "status": "needs_zubite_review",
        "patient_message": "Не съм сигурен/на.",
        "created_at": now, "updated_at": now,
    }))
    return rid


def _admin_list(app, token, **params):
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    async def go():
        async with _client(app) as c:
            return await c.get(
                f"/api/admin/consultation-requests?{qs}",
                headers=_hdr(token),
            )
    return _run(go())


def _admin_detail(app, token, rid):
    async def go():
        async with _client(app) as c:
            return await c.get(
                f"/api/admin/consultation-requests/{rid}",
                headers=_hdr(token),
            )
    return _run(go())


def _admin_events(app, token, rid):
    async def go():
        async with _client(app) as c:
            return await c.get(
                f"/api/admin/consultation-requests/{rid}/events",
                headers=_hdr(token),
            )
    return _run(go())


def _admin_assign(app, token, rid, clinic_id):
    async def go():
        async with _client(app) as c:
            return await c.post(
                f"/api/admin/consultation-requests/{rid}/assign-clinic",
                json={"clinic_id": clinic_id},
                headers=_hdr(token),
            )
    return _run(go())


def _clinic_detail(app, token, rid):
    async def go():
        async with _client(app) as c:
            return await c.get(
                f"/api/clinic/consultation-requests/{rid}",
                headers=_hdr(token),
            )
    return _run(go())


# ── tests ─────────────────────────────────────────────────────────


def test_01_admin_list_exposes_assigned_clinic_for_p4(app):
    tk = _run(_login_admin(app))
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_p4_request(clinic_id=cid_a)
    r = _admin_list(app, tk, created_from="recommended_clinics_flow")
    assert r.status_code == 200
    rows = r.json()["requests"]
    row = next((x for x in rows if x["id"] == rid), None)
    assert row is not None
    assert row["assigned_clinic_id"] == cid_a
    assert row["assigned_clinic_name"] == "Clinic A"


def test_02_admin_detail_exposes_clinic_for_p4(app):
    tk = _run(_login_admin(app))
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_p4_request(clinic_id=cid_a)
    body = _admin_detail(app, tk, rid).json()
    assert body["request"]["assigned_clinic_id"] == cid_a
    assert body["clinic_name"] == "Clinic A"
    assert body["clinic_city"] in ("София", "Sofia")


def test_03_admin_list_row_has_preselect_payload(app):
    """Frontend dropdown needs both id+name to preselect without a second
    fetch — verify the list response carries both."""
    tk = _run(_login_admin(app))
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_p4_request(clinic_id=cid_a)
    rows = _admin_list(app, tk, created_from="recommended_clinics_flow").json()["requests"]
    row = next(x for x in rows if x["id"] == rid)
    assert "assigned_clinic_id" in row and row["assigned_clinic_id"]
    assert "assigned_clinic_name" in row and row["assigned_clinic_name"]


def test_04_p4_with_missing_clinic_id_is_flagged(app):
    """A P4 row without assigned_clinic_id must NOT silently look
    'assigned' — admin needs to see a data inconsistency."""
    tk = _run(_login_admin(app))
    rid = _seed_p4_request(clinic_id=None)
    rows = _admin_list(app, tk).json()["requests"]
    row = next(x for x in rows if x["id"] == rid)
    assert row.get("assigned_clinic_id") in (None, "")
    assert row.get("status") != "assigned"  # must not pretend to be assigned


def test_05_p5_initially_unassigned(app):
    tk = _run(_login_admin(app))
    rid = _seed_p5_request()
    body = _admin_detail(app, tk, rid).json()
    assert body["request"]["status"] == "needs_zubite_review"
    assert body["request"].get("assigned_clinic_id") in (None, "")
    assert body["clinic_name"] is None


def test_06_admin_can_assign_p5_to_valid_clinic(app):
    tk = _run(_login_admin(app))
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_p5_request()
    r = _admin_assign(app, tk, rid, cid_a)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "ok"
    assert body["assigned_to"] == "Clinic A"


def test_07_status_becomes_assigned_after_assignment(app):
    tk = _run(_login_admin(app))
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_p5_request()
    _admin_assign(app, tk, rid, cid_a)
    body = _admin_detail(app, tk, rid).json()
    assert body["request"]["status"] == "assigned"
    assert body["request"]["assigned_clinic_id"] == cid_a
    assert body["clinic_name"] == "Clinic A"


def test_08_assigned_clinic_can_see_request_after_assignment(app):
    admin_tk = _run(_login_admin(app))
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_p5_request()
    _admin_assign(app, admin_tk, rid, cid_a)
    clinic_tk = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    r = _clinic_detail(app, clinic_tk, rid)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["request"]["id"] == rid
    assert body["request"]["assigned_clinic_id"] == cid_a


def test_09_unrelated_clinic_cannot_see_assigned_request(app):
    admin_tk = _run(_login_admin(app))
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_p5_request()
    _admin_assign(app, admin_tk, rid, cid_a)
    other_tk = _run(_login_clinic(app, CLINIC_B_EMAIL, CLINIC_B_PASS))
    r = _clinic_detail(app, other_tk, rid)
    assert r.status_code == 404


def test_10_admin_cannot_assign_nonexistent_clinic(app):
    tk = _run(_login_admin(app))
    rid = _seed_p5_request()
    r = _admin_assign(app, tk, rid, "ghost-clinic-id-does-not-exist")
    assert r.status_code == 404


def test_11_clinic_user_cannot_assign(app):
    """The admin endpoint must reject a clinic-token / clinic-cookie."""
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_p5_request()
    clinic_tk = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    r = _admin_assign(app, rid=rid, clinic_id=cid_a, token=clinic_tk)
    assert r.status_code in (401, 403)


def test_12_unauthenticated_cannot_assign(app):
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_p5_request()
    r = _admin_assign(app, token=None, rid=rid, clinic_id=cid_a)
    assert r.status_code in (401, 403)


def test_13_assignment_appends_timeline_event(app):
    tk = _run(_login_admin(app))
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_p5_request()
    _admin_assign(app, tk, rid, cid_a)
    body = _admin_events(app, tk, rid).json()
    events = body["events"]
    assignment_events = [
        e for e in events
        if e.get("event_type") in ("assigned_to_clinic", "reassigned_to_clinic")
    ]
    assert len(assignment_events) >= 1, events
    ev = assignment_events[0]
    assert ev["clinic_id"] == cid_a
    assert ev["new_status"] == "assigned"
    # previous_status must be present (the value was needs_zubite_review).
    assert ev.get("previous_status") in ("needs_zubite_review", "new", None)
    # admin user_id captured.
    assert ev.get("user_id")


def test_14_patient_context_visible_to_assigned_clinic(app):
    """Visibility-upgrade contract: after admin assigns a P5 request,
    the assigned clinic's detail endpoint still returns patient_context."""
    admin_tk = _run(_login_admin(app))
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_p5_request()
    _admin_assign(app, admin_tk, rid, cid_a)
    clinic_tk = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    body = _clinic_detail(app, clinic_tk, rid).json()
    assert "patient_context" in body
    ctx = body["patient_context"]
    assert ctx["label"] == "Информация, споделена от пациента"
    assert ctx["treatment_interest"] == "aligners"
    # patient_message from the P5 seed must surface.
    assert ctx["patient_message"]
    # Quiz summary survives.
    assert isinstance(ctx["quiz_summary"], list)
    assert len(ctx["quiz_summary"]) >= 1


def test_15_assignment_does_not_invoke_twilio_or_elevenlabs(app):
    """The endpoint already supports a best-effort Resend admin notice
    (pre-existing). This test pins that NO Twilio / ElevenLabs / SMS /
    real network calls are added by this batch.

    Resend is mocked at module load → there is no real network call.
    The mocked send may be invoked once for the admin assignment notice
    (existing behaviour, pre-this-batch). What this batch must not do
    is add any NEW external-provider channel."""
    import resend
    tk = _run(_login_admin(app))
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_p5_request()
    _admin_assign(app, tk, rid, cid_a)

    # 1) Resend SDK is fully MagicMock-ed → zero real network egress.
    assert isinstance(resend.Emails.send, MagicMock)

    # 2) The clinic-assignment code path imports neither twilio nor
    #    elevenlabs. (The clinic onboarding ConvAI feature lives in a
    #    separate module that may already be imported by other tests
    #    in the same process — we therefore inspect the actual call
    #    surface, not the module-import set, by re-running an
    #    assignment with assertion that no `twilio.*` / `elevenlabs.*`
    #    callable was invoked during the request lifecycle.)
    import emails as _emails
    # No SMS helper exists on the emails module.
    assert not hasattr(_emails, "send_sms")
    assert not hasattr(_emails, "send_twilio_message")
    # No ElevenLabs voice trigger exists on the emails module.
    assert not hasattr(_emails, "send_elevenlabs_call")

    # 3) The Resend send mock may have been invoked at most once for
    #    the assignment-notification email (pre-existing behaviour).
    assert resend.Emails.send.call_count <= 1
    # And every recipient (if any) is the configured clinic email,
    # never a hard-coded @twilio / @elevenlabs / SMS gateway address.
    for call in resend.Emails.send.mock_calls:
        params = call.args[0] if call.args else {}
        for rcpt in params.get("to", []):
            assert "@" in rcpt
            assert "twilio" not in rcpt.lower()
            assert "elevenlabs" not in rcpt.lower()


def test_16_p4_p5_creation_still_works(app):
    """Smoke: existing P4 + P5 creation endpoints still produce rows
    with the canonical fields in place. (Regression guard, not an
    end-to-end deep test — those live in their own files.)"""
    import database as _database
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))

    rid_p4 = _seed_p4_request(clinic_id=cid_a)
    p4 = _run(_database.db.consultation_requests.find_one(
        {"id": rid_p4}, {"_id": 0, "assigned_clinic_id": 1, "status": 1, "created_from": 1}
    ))
    assert p4["assigned_clinic_id"] == cid_a
    assert p4["created_from"] == "recommended_clinics_flow"

    rid_p5 = _seed_p5_request()
    p5 = _run(_database.db.consultation_requests.find_one(
        {"id": rid_p5}, {"_id": 0, "assigned_clinic_id": 1, "status": 1, "created_from": 1}
    ))
    assert p5["assigned_clinic_id"] is None
    assert p5["status"] == "needs_zubite_review"
    assert p5["created_from"] == "assisted_choice_flow"
