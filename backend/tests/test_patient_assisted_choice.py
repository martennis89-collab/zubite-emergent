"""Patient layer P5 — `POST /api/leads/{lead_id}/request-zubite-help` tests.

Covers the assisted-choice flow's hard product rule: a lead can be on
AT MOST one choice path (selected clinic OR Zubite-help). Both flows
share the same `leads` document for the atomic CAS guard.

Conventions mirror the P4 tests: in-process ASGI, isolated test DB,
no network.
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

os.environ.setdefault("DB_NAME", "zubite_test_p5_assisted_choice")
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

_resend.Emails.send = MagicMock(return_value={"id": "test-no-send"})

import emails as _emails_mod  # noqa: E402

_emails_mod.send_lead_notification_email = MagicMock(return_value=None)
_emails_mod.send_lead_confirmation_email = MagicMock(return_value=None)

from httpx import ASGITransport, AsyncClient  # noqa: E402

_LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(_LOOP)


def _run(coro):
    return _LOOP.run_until_complete(coro)


@pytest.fixture(scope="module")
def app():
    import server as _server
    return _server.app


def _client(app):
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


@pytest.fixture(scope="module", autouse=True)
def _bootstrap(app):  # noqa: ARG001
    import database as _database

    async def setup():
        db = _database.db
        for coll in await db.list_collection_names():
            await db[coll].delete_many({})

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
        await db.leads.delete_many({})
        await db.clinics.delete_many({})
        await db.consultation_requests.delete_many({})

    _rl._buckets.clear()
    _run(wipe())
    yield
    _rl._buckets.clear()


# ── helpers ──────────────────────────────────────────────────────


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_lead(*, city: str = "sofia", treatment: str = "aligners",
               name: str = "Test Patient",
               phone: str = "+359888000111",
               age_days: int = 0) -> str:
    import database as _database
    lead_id = str(uuid.uuid4())
    created_at = (datetime.now(timezone.utc) - timedelta(days=age_days)).isoformat()

    async def insert():
        await _database.db.leads.insert_one({
            "id": lead_id,
            "city_slug": city, "treatment_type": treatment,
            "answers": {"urgency": "high"},
            "consent": True,
            "name": name, "phone": phone,
            "band": "high",
            "created_at": created_at,
        })

    _run(insert())
    return lead_id


def _make_clinic() -> str:
    import database as _database
    cid = str(uuid.uuid4())

    async def insert():
        await _database.db.clinics.insert_one({
            "id": cid, "name": "Test Clinic",
            "city_slug": "sofia", "city_name": "София",
            "treatments_supported": ["aligners"],
            "is_active": True, "created_at": _now_iso(),
        })

    _run(insert())
    return cid


def _post_help(app, lead_id: str, body: dict):
    async def go():
        async with _client(app) as c:
            return await c.post(f"/api/leads/{lead_id}/request-zubite-help", json=body)
    r = _run(go())
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, {"_raw": r.text}


def _post_call(app, lead_id: str, body: dict):
    async def go():
        async with _client(app) as c:
            return await c.post(f"/api/leads/{lead_id}/request-call", json=body)
    r = _run(go())
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, {"_raw": r.text}


def _get_state(app, lead_id: str):
    async def go():
        async with _client(app) as c:
            return await c.get(f"/api/leads/{lead_id}/selection-state")
    r = _run(go())
    return r.status_code, r.json()


def _valid_help_body(source: str = "matching_page", **overrides) -> dict:
    body = {
        "phone": "+359888000111",
        "consent_to_share": True,
        "message": "Не съм сигурен коя клиника е подходяща.",
        "source": source,
    }
    body.update(overrides)
    return body


def _valid_call_body(clinic_id: str) -> dict:
    return {
        "clinic_id": clinic_id,
        "phone": "+359888000111",
        "consent_to_share": True,
        "source": "matching_card",
    }


CONSENT_TEXT = (
    "Съгласен/съгласна съм Zubite да използва информацията от оценката ми, "
    "за да ми помогне да избера подходяща следваща стъпка."
)


# ─────────────── Tests ────────────────────────────────────────────


# 1. Valid lead + consent creates exactly one assisted-choice request.
def test_01_valid_creates_one_assisted_request(app):
    import database as _database
    lead = _make_lead()
    status, body = _post_help(app, lead, _valid_help_body())
    assert status == 200, body
    assert body["success"] is True
    assert "request_id" in body and body["request_id"]
    # Exactly one consultation request, created_from=assisted_choice_flow.
    count = _run(_database.db.consultation_requests.count_documents(
        {"lead_id": lead, "created_from": "assisted_choice_flow"}
    ))
    assert count == 1


# 2. Lead updated with assisted-choice fields.
def test_02_updates_lead_fields(app):
    import database as _database
    lead = _make_lead()
    _post_help(app, lead, _valid_help_body(source="clinic_profile"))
    saved = _run(_database.db.leads.find_one({"id": lead}, {"_id": 0}))
    assert saved["assisted_choice_request_id"]
    assert saved["assisted_choice_status"] == "requested"
    assert saved["assisted_choice_source"] == "clinic_profile"
    assert saved["consent_to_share_zubite"] is True
    assert isinstance(saved["consent_to_share_zubite_at"], str)
    # P4 fields must NOT be set.
    assert "selected_clinic_id" not in saved or not saved.get("selected_clinic_id")


# 3. Consent timestamp & text stored on the consultation_request.
def test_03_consent_stored_on_request(app):
    import database as _database
    lead = _make_lead()
    _post_help(app, lead, _valid_help_body())
    cr = _run(_database.db.consultation_requests.find_one({"lead_id": lead}, {"_id": 0}))
    assert cr["consent_to_share_zubite"] is True
    assert cr["consent_to_share_zubite_at"]
    assert cr["consent_to_share_zubite_text"] == CONSENT_TEXT
    assert cr["source"] == "patient_requested_zubite_help"
    assert cr["created_from"] == "assisted_choice_flow"
    assert cr["assigned_clinic_id"] is None  # critical: no clinic assignment
    assert cr["status"] == "needs_zubite_review"


# 4. Second assisted-choice request for same lead does NOT create duplicate.
def test_04_second_request_idempotent(app):
    import database as _database
    lead = _make_lead()
    s1, b1 = _post_help(app, lead, _valid_help_body())
    s2, b2 = _post_help(app, lead, _valid_help_body())
    assert s1 == 200 and s2 == 200
    assert b1["request_id"] == b2["request_id"]
    assert b2.get("already_requested") is True
    count = _run(_database.db.consultation_requests.count_documents({"lead_id": lead}))
    assert count == 1


# 5. Lead with selected clinic returns 409 already_requested_clinic.
def test_05_clinic_first_blocks_help(app):
    lead = _make_lead()
    clinic = _make_clinic()
    _post_call(app, lead, _valid_call_body(clinic))
    s, b = _post_help(app, lead, _valid_help_body())
    assert s == 409, b
    assert b["detail"]["code"] == "already_requested_clinic"
    assert b["detail"]["clinic"]["id"] == clinic


# 6. Pre-existing recommended_clinics_flow consultation_request blocks help
#    (even if lead.selected_clinic_id is somehow missing — partial write).
def test_06_existing_flow_request_blocks_help(app):
    import database as _database
    lead = _make_lead()
    clinic = _make_clinic()
    _run(_database.db.consultation_requests.insert_one({
        "id": str(uuid.uuid4()), "lead_id": lead,
        "assigned_clinic_id": clinic,
        "created_from": "recommended_clinics_flow",
        "source": "patient_selected_clinic",
        "status": "assigned", "created_at": _now_iso(),
    }))
    s, b = _post_help(app, lead, _valid_help_body())
    assert s == 409
    assert b["detail"]["code"] == "already_requested_clinic"


# 7. After assisted-choice, request-call returns 409 with help code.
def test_07_help_first_blocks_clinic(app):
    lead = _make_lead()
    clinic = _make_clinic()
    s1, _ = _post_help(app, lead, _valid_help_body())
    assert s1 == 200
    s2, b2 = _post_call(app, lead, _valid_call_body(clinic))
    assert s2 == 409, b2
    assert b2["detail"]["code"] == "already_requested_zubite_help"


# 8. Missing consent → 422.
def test_08_missing_consent(app):
    lead = _make_lead()
    body = _valid_help_body()
    body["consent_to_share"] = False
    s, b = _post_help(app, lead, body)
    assert s == 422
    assert b["detail"]["code"] == "consent_required"


# 9. Invalid phone → 422 / 400.
@pytest.mark.parametrize("bad_phone", ["", "    ", "abc", "12"])
def test_09_invalid_phone(app, bad_phone):
    lead = _make_lead()
    body = _valid_help_body(phone=bad_phone)
    s, _ = _post_help(app, lead, body)
    assert s in (422, 400)


# 10. Missing/expired lead returns safe error.
def test_10a_missing_lead(app):
    s, _ = _post_help(app, str(uuid.uuid4()), _valid_help_body())
    assert s == 404


def test_10b_expired_lead(app):
    lead = _make_lead(age_days=30)
    s, _ = _post_help(app, lead, _valid_help_body())
    assert s == 410


# 11. Response excludes unsafe fields.
def test_11_response_excludes_unsafe_fields(app):
    lead = _make_lead()
    s, b = _post_help(app, lead, _valid_help_body(message="My secret note"))
    assert s == 200
    import json
    blob = json.dumps(b)
    for forbidden in ("password_hash", "patient_email", "patient_phone",
                      "patient_message", "consent_to_share_zubite_text",
                      "assigned_clinic_id", "secret note"):
        assert forbidden not in blob, forbidden
    assert '"_id"' not in blob


# 12. Endpoint rate limit works.
def test_12_rate_limit(app):
    lead = _make_lead()
    last = None
    for i in range(6):
        last, _ = _post_help(app, lead, _valid_help_body())
        if i < 5 and last == 429:
            pytest.fail(f"Rate-limited too early at i={i}")
    assert last == 429


# 13. Assisted-choice request is NOT visible to any clinic portal query.
#     Clinic portal endpoints all filter by assigned_clinic_id; null means
#     no clinic ever sees the row.
def test_13_assisted_request_invisible_to_clinics(app):
    import database as _database
    lead = _make_lead()
    clinic = _make_clinic()
    _post_help(app, lead, _valid_help_body())
    # Any query with assigned_clinic_id filter returns nothing.
    seen = _run(_database.db.consultation_requests.find_one(
        {"assigned_clinic_id": clinic, "lead_id": lead}, {"_id": 0}
    ))
    assert seen is None
    seen_any = _run(_database.db.consultation_requests.find_one(
        {"assigned_clinic_id": {"$ne": None}, "lead_id": lead}, {"_id": 0}
    ))
    assert seen_any is None


# 14. No external provider invoked.
def test_14_no_external_provider(app):
    lead = _make_lead()
    _resend.Emails.send.reset_mock()
    _post_help(app, lead, _valid_help_body())
    _emails_mod.send_lead_notification_email.assert_not_called()
    _emails_mod.send_lead_confirmation_email.assert_not_called()
    # Admin alert via Resend → ADMIN_EMAIL is allowed and tested
    # separately in test_p4_p5_admin_notifications.py.
    assert _resend.Emails.send.call_count <= 1
    for call in _resend.Emails.send.mock_calls:
        params = call.args[0] if call.args else {}
        assert params.get("to") == [os.environ.get("ADMIN_EMAIL")]


# 15. Source matching_page/clinic_profile stored.
@pytest.mark.parametrize("src", ["matching_page", "clinic_profile"])
def test_15_source_stored(app, src):
    import database as _database
    lead = _make_lead()
    _post_help(app, lead, _valid_help_body(source=src))
    cr = _run(_database.db.consultation_requests.find_one({"lead_id": lead}, {"_id": 0}))
    assert cr["selection_source"] == src
    saved = _run(_database.db.leads.find_one({"id": lead}, {"_id": 0}))
    assert saved["assisted_choice_source"] == src


def test_15b_invalid_source_rejected(app):
    lead = _make_lead()
    body = _valid_help_body(source="hacker_payload")
    s, _ = _post_help(app, lead, body)
    assert s == 422


# 16. Double-click / concurrent submits → single row only.
def test_16_concurrent_submit_no_duplicate(app):
    import database as _database
    lead = _make_lead()

    async def submit():
        async with _client(app) as c:
            return await c.post(
                f"/api/leads/{lead}/request-zubite-help",
                json=_valid_help_body(),
            )

    r1, r2 = _run(asyncio.gather(submit(), submit()))
    assert 200 in (r1.status_code, r2.status_code)
    count = _run(_database.db.consultation_requests.count_documents(
        {"lead_id": lead, "created_from": "assisted_choice_flow"}
    ))
    assert count == 1


# 17. Optional patient_message stored safely.
def test_17_message_stored(app):
    import database as _database
    lead = _make_lead()
    msg = "Изпитвам болка от години и не знам какво лечение е подходящо."
    _post_help(app, lead, _valid_help_body(message=msg))
    cr = _run(_database.db.consultation_requests.find_one({"lead_id": lead}, {"_id": 0}))
    assert cr["patient_message"] == msg


# 18. Long patient message → rejected by Pydantic max_length.
def test_18_long_message_rejected(app):
    lead = _make_lead()
    too_long = "A" * 2000  # > 1000 cap
    s, _ = _post_help(app, lead, _valid_help_body(message=too_long))
    assert s == 422


# 19. Unrelated lead fields preserved.
def test_19_unrelated_fields_preserved(app):
    import database as _database
    lead = _make_lead(name="Иван Иванов")
    _run(_database.db.leads.update_one(
        {"id": lead},
        {"$set": {"score_total": 42, "band": "high", "answers.q1": "yes"}},
    ))
    _post_help(app, lead, _valid_help_body())
    saved = _run(_database.db.leads.find_one({"id": lead}, {"_id": 0}))
    assert saved["name"] == "Иван Иванов"
    assert saved["score_total"] == 42
    assert saved["band"] == "high"
    assert saved["answers"]["q1"] == "yes"


# 20. selection-state returns assisted-choice flags.
def test_20_state_returns_assisted_flags(app):
    lead = _make_lead()
    _post_help(app, lead, _valid_help_body(source="clinic_profile"))
    s, b = _get_state(app, lead)
    assert s == 200
    assert b["has_requested_zubite_help"] is True
    assert b["has_selected_clinic"] is False
    assert b["assisted_choice_request_id"]
    assert b["assisted_choice_status"] == "requested"
    assert b["assisted_choice_source"] == "clinic_profile"


def test_state_neither_path(app):
    lead = _make_lead()
    s, b = _get_state(app, lead)
    assert s == 200
    assert b["has_selected_clinic"] is False
    assert b["has_requested_zubite_help"] is False


# Bonus: empty/whitespace message normalised to None.
def test_empty_message_normalised(app):
    import database as _database
    lead = _make_lead()
    _post_help(app, lead, _valid_help_body(message="   "))
    cr = _run(_database.db.consultation_requests.find_one({"lead_id": lead}))
    assert cr["patient_message"] is None
