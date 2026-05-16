"""Strict required-contact validation for quiz-source leads.

Tests `_validate_quiz_contact()` triggered inside `POST /api/leads`:
- Quiz-source lead missing name/phone/email → 422 with code
  `missing_required_contact` and a friendly Bulgarian message.
- Phone format / digit-count rules.
- Non-quiz sources keep the previous Optional/coerce-to-None behaviour
  (no regression for legacy / soft lead forms).

Conventions mirror test_patient_request_call.py: single shared event
loop, isolated DB, in-process ASGI, no network.
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

os.environ.setdefault("DB_NAME", "zubite_test_strict_quiz_contact")
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
_emails_mod.send_lead_notification_email = AsyncMock(return_value=None)
_emails_mod.send_lead_confirmation_email = AsyncMock(return_value=None)

# `routers.public` does `from emails import ...` so we must patch the
# already-imported references too.
import routers.public as _public_mod  # noqa: E402
_public_mod.send_lead_notification_email = _emails_mod.send_lead_notification_email
_public_mod.send_lead_confirmation_email = _emails_mod.send_lead_confirmation_email

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
        for coll in await _database.db.list_collection_names():
            await _database.db[coll].delete_many({})

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
        await _database.db.leads.delete_many({})

    _rl._buckets.clear()
    _run(wipe())
    yield
    _rl._buckets.clear()


_DELETE = object()


def _quiz_payload(**overrides):
    base = {
        "city_slug": "sofia",
        "treatment_type": "diagnostic_quiz",
        "answers": {"a1": "yes"},
        "consent": True,
        "source": "diagnostic_quiz_v1",
        "name": "Иван Иванов",
        "phone": "+359 888 123 456",
        "email": "ivan@example.com",
    }
    base.update(overrides)
    return {k: v for k, v in base.items() if v is not _DELETE}


def test_quiz_source_happy_path(app):
    async def go():
        async with _client(app) as c:
            return await c.post("/api/leads", json=_quiz_payload())
    r = _run(go())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "Иван Иванов"
    assert body["phone"] == "+359 888 123 456"
    assert body["email"] == "ivan@example.com"


def test_quiz_source_missing_name_rejected(app):
    async def go():
        async with _client(app) as c:
            return await c.post("/api/leads", json=_quiz_payload(name=""))
    r = _run(go())
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert detail["code"] == "missing_required_contact"
    assert "name" in detail["missing"]
    assert "име" in detail["message"]


def test_quiz_source_missing_phone_rejected(app):
    async def go():
        async with _client(app) as c:
            return await c.post("/api/leads", json=_quiz_payload(phone=""))
    r = _run(go())
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert detail["code"] == "missing_required_contact"
    assert "phone" in detail["missing"]


def test_quiz_source_missing_email_rejected(app):
    async def go():
        async with _client(app) as c:
            return await c.post("/api/leads", json=_quiz_payload(email=""))
    r = _run(go())
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert detail["code"] == "missing_required_contact"
    assert "email" in detail["missing"]


def test_quiz_source_all_three_missing(app):
    async def go():
        async with _client(app) as c:
            return await c.post("/api/leads", json=_quiz_payload(name="", phone="", email=""))
    r = _run(go())
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert set(detail["missing"]) == {"name", "phone", "email"}


def test_quiz_source_phone_too_short_rejected(app):
    async def go():
        async with _client(app) as c:
            return await c.post("/api/leads", json=_quiz_payload(phone="+359"))
    r = _run(go())
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert detail["code"] == "invalid_phone"
    assert "phone" in detail["missing"]


def test_quiz_source_phone_invalid_chars_rejected(app):
    async def go():
        async with _client(app) as c:
            return await c.post("/api/leads", json=_quiz_payload(phone="abc123!@#"))
    r = _run(go())
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert detail["code"] == "invalid_phone_format"


def test_quiz_source_phone_with_allowed_chars_accepted(app):
    """Phone like `(02) 123-4567` (10 digits) should pass."""
    async def go():
        async with _client(app) as c:
            return await c.post("/api/leads", json=_quiz_payload(phone="(02) 123-4567"))
    r = _run(go())
    assert r.status_code == 200, r.text


def test_quiz_source_invalid_email_format_rejected(app):
    """EmailStr already enforces; we just verify it doesn't sneak past."""
    async def go():
        async with _client(app) as c:
            return await c.post("/api/leads", json=_quiz_payload(email="not-an-email"))
    r = _run(go())
    assert r.status_code == 422


def test_non_quiz_source_with_blank_email_still_works(app):
    """Legacy form path: source != quiz → blank email coerces to None,
    no name/phone strict requirement."""
    async def go():
        async with _client(app) as c:
            return await c.post("/api/leads", json={
                "city_slug": "sofia",
                "treatment_type": "invisalign",
                "answers": {},
                "consent": False,
                "source": "treatment_first_quiz",
                "name": "",
                "phone": "0888111222",
                "email": "",
            })
    r = _run(go())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["email"] is None
    assert body["name"] is None


def test_non_quiz_source_no_source_provided_no_strict(app):
    """No source field at all → backwards-compatible: no strict check."""
    async def go():
        async with _client(app) as c:
            return await c.post("/api/leads", json={
                "city_slug": "sofia",
                "treatment_type": "implants",
                "answers": {},
                "consent": False,
            })
    r = _run(go())
    assert r.status_code == 200


def test_quiz_source_aliases_also_strict(app):
    """All three quiz aliases trigger the same strict check."""
    for src in ("diagnostic_quiz", "diagnostic_quiz_v1", "quiz"):
        async def go(_src=src):
            async with _client(app) as c:
                return await c.post("/api/leads", json=_quiz_payload(source=_src, name=""))
        r = _run(go())
        assert r.status_code == 422, f"source={src} should be strict"
        assert r.json()["detail"]["code"] == "missing_required_contact"


def test_quiz_source_whitespace_only_treated_as_missing(app):
    """Whitespace-only name/phone should be rejected."""
    async def go():
        async with _client(app) as c:
            return await c.post("/api/leads", json=_quiz_payload(name="   ", phone="\t  "))
    r = _run(go())
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert "name" in detail["missing"]
    assert "phone" in detail["missing"]
