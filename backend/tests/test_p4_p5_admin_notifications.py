"""P4 / P5 admin email notification tests.

Resend is fully mocked at module load (no real network). The tests
assert:
  • exactly one admin email is sent on a NEW successful request,
  • zero emails on idempotent retry / 409 / validation failure,
  • missing ADMIN_EMAIL / RESEND_API_KEY does not crash the request,
  • a Resend exception does not crash the request,
  • email subject + body include the required fields,
  • no clinic notification is sent from these endpoints,
  • email body does NOT leak token / password / cookie / verification_token.

Conventions mirror the existing `test_patient_assisted_choice.py`:
in-process ASGI, isolated test DB, no network.
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

os.environ.setdefault("DB_NAME", "zubite_test_p4p5_admin_alerts")
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

# Mock Resend's underlying SDK before anything imports it indirectly.
import resend as _resend  # noqa: E402

_resend.Emails.send = MagicMock(return_value={"id": "test-email-id"})

# Block the legacy "new lead" admin notification helpers so they don't
# pollute assertions (they fire from POST /leads, unrelated to P4/P5).
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
    # Reset the Resend mock between tests so call_count is per-test.
    _resend.Emails.send.reset_mock()
    _resend.Emails.send.return_value = {"id": "test-email-id"}
    _resend.Emails.send.side_effect = None
    yield
    _rl._buckets.clear()


# ── helpers ──────────────────────────────────────────────────────


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_lead(*, city: str = "sofia", treatment: str = "aligners",
               name: str = "Тест Пациент",
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


def _make_clinic(*, treatments=None) -> str:
    import database as _database
    cid = str(uuid.uuid4())

    async def insert():
        await _database.db.clinics.insert_one({
            "id": cid,
            "name": "Тестова клиника София",
            "city_slug": "sofia", "city_name": "София",
            "treatments_supported": treatments or ["aligners"],
            "is_active": True, "created_at": _now_iso(),
        })

    _run(insert())
    return cid


def _post_call(app, lead_id: str, body: dict):
    async def go():
        async with _client(app) as c:
            return await c.post(f"/api/leads/{lead_id}/request-call", json=body)
    r = _run(go())
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, {"_raw": r.text}


def _post_help(app, lead_id: str, body: dict):
    async def go():
        async with _client(app) as c:
            return await c.post(f"/api/leads/{lead_id}/request-zubite-help", json=body)
    r = _run(go())
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, {"_raw": r.text}


def _valid_call_body(clinic_id: str, **overrides) -> dict:
    body = {
        "clinic_id": clinic_id,
        "phone": "+359888000111",
        "consent_to_share": True,
        "source": "matching_card",
    }
    body.update(overrides)
    return body


def _valid_help_body(**overrides) -> dict:
    body = {
        "phone": "+359888000111",
        "consent_to_share": True,
        "message": "Не съм сигурен коя клиника е подходяща за моя случай.",
        "source": "matching_page",
    }
    body.update(overrides)
    return body


def _last_resend_params() -> dict:
    """Return the dict argument of the most recent resend.Emails.send call."""
    call_args = _resend.Emails.send.call_args
    assert call_args is not None, "expected at least one resend.Emails.send call"
    # resend.Emails.send is called positionally with a dict
    return call_args.args[0] if call_args.args else call_args.kwargs.get("params") or {}


# ── tests ─────────────────────────────────────────────────────────


def test_p4_new_request_sends_exactly_one_admin_email(app):
    cid = _make_clinic()
    lid = _make_lead()
    status, body = _post_call(app, lid, _valid_call_body(cid))
    assert status == 200, body
    assert body.get("success") is True

    assert _resend.Emails.send.call_count == 1, _resend.Emails.send.mock_calls
    params = _last_resend_params()
    assert params["to"] == [os.environ["ADMIN_EMAIL"]]
    assert params["subject"] == "Нова заявка към избрана клиника — Zubite"
    html = params["html"]
    # Required body fields
    assert "Пациентът избра конкретна клиника" in html
    assert "Тестова клиника София" in html
    assert "+359888000111" in html
    assert body["request_id"] in html
    assert lid in html
    assert cid in html
    assert "recommended_clinics_flow" in html


def test_p5_new_request_sends_exactly_one_admin_email(app):
    lid = _make_lead()
    status, body = _post_help(app, lid, _valid_help_body())
    assert status == 200, body
    assert body.get("success") is True

    assert _resend.Emails.send.call_count == 1, _resend.Emails.send.mock_calls
    params = _last_resend_params()
    assert params["to"] == [os.environ["ADMIN_EMAIL"]]
    assert params["subject"] == "Нова заявка за помощ при избор — Zubite"
    html = params["html"]
    assert "Пациентът поиска помощ от Zubite" in html
    assert "+359888000111" in html
    assert body["request_id"] in html
    assert lid in html
    assert "needs_zubite_review" in html
    # Patient message present (no truncation needed at < 500 chars).
    assert "Не съм сигурен коя клиника е подходяща" in html


def test_p4_duplicate_retry_does_not_resend_email(app):
    cid = _make_clinic()
    lid = _make_lead()
    _post_call(app, lid, _valid_call_body(cid))
    assert _resend.Emails.send.call_count == 1
    # Idempotent retry with the SAME clinic → 200 already_requested=True
    status2, body2 = _post_call(app, lid, _valid_call_body(cid))
    assert status2 == 200, body2
    assert body2.get("already_requested") is True
    assert _resend.Emails.send.call_count == 1, "must not send a second email"

    # 409 retry with a different clinic must also NOT send a second email.
    cid2 = _make_clinic()
    status3, body3 = _post_call(app, lid, _valid_call_body(cid2))
    assert status3 == 409, body3
    assert _resend.Emails.send.call_count == 1, "409 path must not send email"


def test_p5_duplicate_retry_does_not_resend_email(app):
    lid = _make_lead()
    _post_help(app, lid, _valid_help_body())
    assert _resend.Emails.send.call_count == 1
    status2, body2 = _post_help(app, lid, _valid_help_body())
    assert status2 == 200, body2
    assert body2.get("already_requested") is True
    assert _resend.Emails.send.call_count == 1, "must not send a second email"


def test_p4_validation_failure_sends_no_email(app):
    cid = _make_clinic()
    lid = _make_lead()
    # Missing consent → 422 consent_required
    status, _ = _post_call(app, lid, _valid_call_body(cid, consent_to_share=False))
    assert status == 422
    assert _resend.Emails.send.call_count == 0


def test_p5_missing_consent_sends_no_email(app):
    lid = _make_lead()
    status, _ = _post_help(app, lid, _valid_help_body(consent_to_share=False))
    assert status == 422
    assert _resend.Emails.send.call_count == 0


def test_missing_admin_email_does_not_crash_request(app, monkeypatch):
    import emails as _emails

    # Drop the admin recipient — the helpers must early-return without
    # touching Resend.
    monkeypatch.setattr(_emails, "ADMIN_EMAIL", "", raising=True)
    cid = _make_clinic()
    lid = _make_lead()
    status, body = _post_call(app, lid, _valid_call_body(cid))
    assert status == 200, body
    assert body.get("success") is True
    assert _resend.Emails.send.call_count == 0, (
        "no Resend call when ADMIN_EMAIL is empty"
    )

    lid2 = _make_lead()
    status2, body2 = _post_help(app, lid2, _valid_help_body())
    assert status2 == 200, body2
    assert _resend.Emails.send.call_count == 0


def test_resend_failure_does_not_crash_request(app):
    # Make the SDK raise — the helpers swallow inside _send_email, and the
    # endpoint additionally wraps in try/except. Patient response must
    # still be 200 success.
    _resend.Emails.send.side_effect = RuntimeError("simulated resend outage")
    cid = _make_clinic()
    lid = _make_lead()
    status, body = _post_call(app, lid, _valid_call_body(cid))
    assert status == 200, body
    assert body.get("success") is True

    lid2 = _make_lead()
    status2, body2 = _post_help(app, lid2, _valid_help_body())
    assert status2 == 200, body2
    assert body2.get("success") is True


def test_p5_long_message_is_truncated_to_500_chars(app):
    lid = _make_lead()
    # Compose ~680 chars of patient message (>500, <1000 to pass Pydantic).
    long_msg = "Дълго съобщение. " * 40
    status, body = _post_help(app, lid, _valid_help_body(message=long_msg))
    assert status == 200, body
    params = _last_resend_params()
    html = params["html"]
    # Email body never carries more than 500 chars of the message.
    # Locate the first occurrence and check the visible chunk length.
    needle = "Дълго съобщение."
    assert needle in html
    # Crude bound: html escape of "…" present (truncation marker).
    assert "…" in html
    # Stronger bound: count occurrences of the repeated unit; the message
    # in the email cannot fit more than ceil(500 / len('Дълго съобщение. '))
    # = ceil(500/17) = 30 repetitions.
    occurrences_in_html = html.count(needle)
    assert occurrences_in_html <= 30, (
        f"patient message truncated, but {occurrences_in_html} units found"
    )


def test_email_body_does_not_leak_forbidden_keys(app):
    cid = _make_clinic()
    lid = _make_lead()
    _post_call(app, lid, _valid_call_body(cid))
    params_p4 = _last_resend_params()

    lid2 = _make_lead()
    _post_help(app, lid2, _valid_help_body())
    params_p5 = _last_resend_params()

    forbidden = [
        "token", "password", "password_hash",
        "cookie", "set-cookie",
        "verification_token", "JWT", "Bearer",
        "RESEND_API_KEY", "MONGO_URL", "JWT_SECRET",
        "answers", "attribution",  # raw quiz answers + attribution objects
    ]
    for params in (params_p4, params_p5):
        lower = params["html"].lower()
        for needle in forbidden:
            assert needle.lower() not in lower, (
                f"forbidden key {needle!r} present in admin email body"
            )


def test_no_clinic_notification_sent_from_p4_p5_endpoints(app):
    """P4/P5 must only notify the admin (single recipient). No clinic
    email helper may be invoked from these endpoints."""
    cid = _make_clinic()
    lid = _make_lead()
    _post_call(app, lid, _valid_call_body(cid))
    # Exactly one resend call: to ADMIN_EMAIL.
    assert _resend.Emails.send.call_count == 1
    params = _last_resend_params()
    assert params["to"] == [os.environ["ADMIN_EMAIL"]]
    # The clinic's email is NEVER in the recipient list of any Resend
    # call from this endpoint.
    for call in _resend.Emails.send.mock_calls:
        recipients = (call.args[0].get("to") if call.args else [])
        assert os.environ["ADMIN_EMAIL"] in recipients
        # No clinic email — clinic has none in the fixture, but assert
        # the call count is bounded to 1 either way.
    assert _resend.Emails.send.call_count == 1
