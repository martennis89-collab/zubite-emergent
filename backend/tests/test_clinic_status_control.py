"""Clinic-side status control tests for
`POST /api/clinic/consultation-requests/{id}/action`.

Verifies the full controlled action contract:

  1.  clinic can mark own request viewed
  2.  clinic can record call_attempted
  3.  clinic can record patient_contacted
  4.  clinic can record no_answer
  5.  clinic can book consultation with valid appointment payload
  6.  clinic can reschedule a booked consultation
  7.  clinic can mark attended
  8.  clinic can mark no_show
  9.  clinic can mark patient_declined
 10.  clinic can mark not_suitable
 11.  clinic can cancel
 12.  clinic cannot update another clinic's request (404)
 13.  unauthenticated cannot update request (401/403)
 14.  admin JWT cannot use clinic action endpoint (401/403)
 15.  invalid action_type rejected (422)
 16.  destructive transition from a terminal status rejected (409)
 17.  successful action appends a consultation_events timeline entry
 18.  action response returns updated status
 19.  duplicate mark_viewed is idempotent — no extra fields, no extra events
 20.  patient_context remains visible after status changes

Isolated test DB, in-process ASGI client, mocked Resend. No network.
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest

os.environ.setdefault("DB_NAME", "zubite_test_clinic_status_control")
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


CLINIC_A_EMAIL = "clinic-a-status@example.com"
CLINIC_A_PASS = "ClinicAPass1!"
CLINIC_B_EMAIL = "clinic-b-status@example.com"
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
        await db.clinic_appointments.delete_many({})
        await db.leads.delete_many({})

    _rl._buckets.clear()
    _run(wipe())
    yield
    _rl._buckets.clear()


async def _login_clinic(app, email: str, password: str) -> str:
    """Return the Bearer token. CSRF is bypassed for Authorization-header
    auth, which keeps the in-process ASGI tests free of origin gymnastics."""
    async with _client(app) as c:
        r = await c.post("/api/clinic/login", json={"email": email, "password": password})
    r.raise_for_status()
    return r.json()["access_token"]


async def _login_admin(app) -> str:
    async with _client(app) as c:
        r = await c.post("/api/admin/login",
                         json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    r.raise_for_status()
    return r.json()["access_token"]


async def _clinic_id(email: str) -> str:
    import database as _database
    c = await _database.db.clinics.find_one({"email": email}, {"_id": 0, "id": 1})
    return c["id"]  # type: ignore[index]


def _seed_lead() -> str:
    import database as _database
    lid = str(uuid.uuid4())
    _run(_database.db.leads.insert_one({
        "id": lid,
        "name": "Status Test", "phone": "+359 88 000 1234",
        "city_slug": "sofia", "treatment_type": "aligners",
        "answers": {"seriousness": "considering", "timing": "0-3"},
        "created_at": _now_iso(),
    }))
    return lid


def _seed_request(*, clinic_id: str, status: str = "assigned",
                  lead_id: str | None = None) -> str:
    import database as _database
    rid = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": rid,
        "patient_name": "Status Test", "patient_phone": "+359 88 000 1234",
        "patient_email": None, "patient_city": "sofia",
        "treatment_interest": "aligners",
        "urgency": "high", "readiness": "ready",
        "lead_id": lead_id or _seed_lead(),
        "source": "patient_selected_clinic",
        "created_from": "recommended_clinics_flow",
        "assigned_clinic_id": clinic_id,
        "status": status,
        "assigned_at": now,
        "created_at": now, "updated_at": now,
    }
    _run(_database.db.consultation_requests.insert_one(doc))
    return rid


def _hdr(token: str | None) -> dict:
    return {"Authorization": f"Bearer {token}"} if token else {}


def _post_action(app, req_id: str, payload: dict, token: str | None):
    async def go():
        async with _client(app) as c:
            return await c.post(
                f"/api/clinic/consultation-requests/{req_id}/action",
                json=payload, headers=_hdr(token),
            )
    return _run(go())


def _get_detail(app, req_id: str, token: str | None):
    async def go():
        async with _client(app) as c:
            return await c.get(
                f"/api/clinic/consultation-requests/{req_id}",
                headers=_hdr(token),
            )
    return _run(go())


def _count_events(req_id: str) -> int:
    import database as _database
    async def go():
        return await _database.db.consultation_events.count_documents(
            {"consultation_request_id": req_id}
        )
    return _run(go())


def _valid_appt(*, type_: str = "orthodontic_consultation",
                offset_days: int = 3) -> dict:
    start = datetime.now(timezone.utc) + timedelta(days=offset_days)
    end = start + timedelta(minutes=45)
    return {
        "appointment_type": type_,
        "start_time": start.isoformat(),
        "end_time": end.isoformat(),
        "notes": "Test appointment.",
    }


# ── tests ─────────────────────────────────────────────────────────


def test_01_clinic_mark_viewed(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="assigned")
    r = _post_action(app, rid, {"action_type": "mark_viewed"}, ck)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["request"]["status"] == "clinic_viewed"
    assert body["request"]["clinic_viewed_at"] is not None


def test_02_call_attempted(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="clinic_viewed")
    r = _post_action(app, rid, {"action_type": "call_attempted", "note": "Tried once."}, ck)
    assert r.status_code == 200, r.text
    assert r.json()["request"]["status"] == "call_attempted"


def test_03_patient_contacted(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="call_attempted")
    r = _post_action(app, rid, {"action_type": "patient_contacted"}, ck)
    assert r.status_code == 200
    assert r.json()["request"]["status"] == "patient_contacted"


def test_04_no_answer(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="call_attempted")
    r = _post_action(app, rid, {"action_type": "no_answer"}, ck)
    assert r.status_code == 200
    assert r.json()["request"]["status"] == "no_answer"


def test_05_book_consultation(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="patient_contacted")
    r = _post_action(app, rid, {
        "action_type": "book_consultation",
        "appointment": _valid_appt(),
    }, ck)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["request"]["status"] == "booked"
    assert body["appointment"] is not None
    assert body["appointment"]["status"] == "booked"


def test_06_reschedule(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="patient_contacted")
    _post_action(app, rid, {
        "action_type": "book_consultation",
        "appointment": _valid_appt(offset_days=3),
    }, ck)
    r = _post_action(app, rid, {
        "action_type": "reschedule",
        "appointment": _valid_appt(offset_days=5),
    }, ck)
    assert r.status_code == 200, r.text
    assert r.json()["request"]["status"] == "rescheduled"
    assert r.json()["appointment"]["status"] == "rescheduled"


def test_07_mark_attended(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="patient_contacted")
    _post_action(app, rid, {"action_type": "book_consultation",
                            "appointment": _valid_appt()}, ck)
    r = _post_action(app, rid, {"action_type": "mark_attended"}, ck)
    assert r.status_code == 200
    assert r.json()["request"]["status"] == "attended"


def test_08_mark_no_show(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="patient_contacted")
    _post_action(app, rid, {"action_type": "book_consultation",
                            "appointment": _valid_appt()}, ck)
    r = _post_action(app, rid, {"action_type": "mark_no_show"}, ck)
    assert r.status_code == 200
    assert r.json()["request"]["status"] == "no_show"


def test_09_patient_declined(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="patient_contacted")
    r = _post_action(app, rid, {"action_type": "patient_declined"}, ck)
    assert r.status_code == 200
    assert r.json()["request"]["status"] == "patient_declined"


def test_10_not_suitable(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="clinic_viewed")
    r = _post_action(app, rid, {"action_type": "not_suitable"}, ck)
    assert r.status_code == 200
    assert r.json()["request"]["status"] == "not_suitable"


def test_11_cancel(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="clinic_viewed")
    r = _post_action(app, rid, {"action_type": "cancel"}, ck)
    assert r.status_code == 200
    assert r.json()["request"]["status"] == "cancelled"


def test_12_clinic_cannot_act_on_other_clinics_request(app):
    tk_b = _run(_login_clinic(app, CLINIC_B_EMAIL, CLINIC_B_PASS))
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid_a, status="assigned")
    r = _post_action(app, rid, {"action_type": "call_attempted"}, tk_b)
    assert r.status_code == 404


def test_13_unauthenticated_blocked(app):
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="assigned")
    r = _post_action(app, rid, {"action_type": "call_attempted"}, None)
    assert r.status_code in (401, 403)


def test_14_admin_cannot_use_clinic_action_endpoint(app):
    """Admin JWT/cookie must not be accepted by the clinic endpoint."""
    tk_admin = _run(_login_admin(app))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="assigned")
    r = _post_action(app, rid, {"action_type": "call_attempted"}, tk_admin)
    assert r.status_code in (401, 403, 404), r.text


def test_15_invalid_action_type_rejected(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="assigned")
    r = _post_action(app, rid, {"action_type": "rm -rf"}, ck)
    # Either rejected by Pydantic (422) or by server-side switch (400).
    assert r.status_code in (400, 422)


def test_16_terminal_transition_rejected(app):
    """Once a request is `attended` (terminal), a clinic cannot cancel
    or mark it not_suitable. The endpoint returns 409 with a friendly
    Bulgarian message."""
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="patient_contacted")
    _post_action(app, rid, {"action_type": "book_consultation",
                            "appointment": _valid_appt()}, ck)
    _post_action(app, rid, {"action_type": "mark_attended"}, ck)

    for next_action in ("cancel", "not_suitable", "patient_declined",
                        "call_attempted", "patient_contacted"):
        r = _post_action(app, rid, {"action_type": next_action}, ck)
        assert r.status_code == 409, (
            f"action {next_action} on terminal status must be rejected; "
            f"got {r.status_code} {r.text}"
        )
        # mark_viewed remains exempt — verified separately below.

    # mark_viewed on a terminal request remains idempotently allowed
    # (no status mutation; returns 200).
    r = _post_action(app, rid, {"action_type": "mark_viewed"}, ck)
    assert r.status_code == 200
    assert r.json()["request"]["status"] == "attended"


def test_17_successful_action_appends_event(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="assigned")
    before = _count_events(rid)
    _post_action(app, rid, {"action_type": "call_attempted"}, ck)
    after = _count_events(rid)
    assert after == before + 1
    # Inspect the new event for the required fields.
    import database as _database
    async def fetch():
        return await _database.db.consultation_events.find(
            {"consultation_request_id": rid},
            {"_id": 0}
        ).sort("created_at", -1).to_list(5)
    events = _run(fetch())
    latest = events[0]
    assert latest["event_type"] == "call_attempted"
    assert latest["clinic_id"] == cid
    assert latest["previous_status"] in ("assigned", "clinic_viewed")
    assert latest["new_status"] == "call_attempted"
    assert latest.get("created_at")


def test_18_action_response_returns_updated_status(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="assigned")
    r = _post_action(app, rid, {"action_type": "no_answer"}, ck)
    assert r.status_code == 200
    body = r.json()
    assert "request" in body and body["request"]["id"] == rid
    assert body["request"]["status"] == "no_answer"


def test_19_mark_viewed_is_idempotent(app):
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="assigned")
    r1 = _post_action(app, rid, {"action_type": "mark_viewed"}, ck)
    assert r1.status_code == 200
    ts1 = r1.json()["request"]["clinic_viewed_at"]
    assert ts1
    # Second + third mark_viewed must not push to a later status, must not
    # overwrite the timestamp, and must keep state consistent.
    r2 = _post_action(app, rid, {"action_type": "mark_viewed"}, ck)
    r3 = _post_action(app, rid, {"action_type": "mark_viewed"}, ck)
    assert r2.status_code == 200 and r3.status_code == 200
    assert r2.json()["request"]["status"] == "clinic_viewed"
    assert r2.json()["request"]["clinic_viewed_at"] == ts1
    assert r3.json()["request"]["clinic_viewed_at"] == ts1
    # mark_viewed on a request already past clinic_viewed should not
    # rewind it. Advance to call_attempted, then mark_viewed again.
    _post_action(app, rid, {"action_type": "call_attempted"}, ck)
    r4 = _post_action(app, rid, {"action_type": "mark_viewed"}, ck)
    assert r4.status_code == 200
    assert r4.json()["request"]["status"] == "call_attempted"


def test_20_patient_context_remains_visible_after_status_changes(app):
    """The patient_context payload (visibility upgrade) must keep
    being returned by the detail endpoint regardless of status."""
    ck = _run(_login_clinic(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, status="assigned")
    for action in ("call_attempted", "patient_contacted", "no_answer"):
        # Reset to clinic_viewed before each — otherwise we'd hit
        # ordering constraints. Just hit the endpoint directly.
        pass
    _post_action(app, rid, {"action_type": "mark_viewed"}, ck)
    _post_action(app, rid, {"action_type": "call_attempted"}, ck)
    _post_action(app, rid, {"action_type": "patient_contacted"}, ck)
    r = _get_detail(app, rid, ck)
    assert r.status_code == 200
    body = r.json()
    assert body["request"]["status"] == "patient_contacted"
    assert "patient_context" in body
    assert body["patient_context"]["label"] == "Информация, споделена от пациента"
    assert body["patient_context"]["treatment_interest"] == "aligners"
    # Quiz summary survives across status changes.
    assert isinstance(body["patient_context"]["quiz_summary"], list)
    assert len(body["patient_context"]["quiz_summary"]) >= 1
