"""POST /api/leads/{lead_id}/clinic-recommendation-preference — step 3 of
the re-sequenced quiz funnel (concern -> where to send results -> "want
recommendations? which city?" -> clinics).

Covers:
- Lead creation with no city_slug at all now succeeds (LeadCreate.city_slug
  is Optional as of the re-sequenced funnel).
- The endpoint requires contact details to already be unlocked.
- wants_recommendations=False needs no city and just records the decline.
- wants_recommendations=True requires city_slug (400 without it).
- A successful "yes" (re)runs clinic auto-matching for GREEN-band leads
  that had no city at creation time, without overriding an
  already-assigned clinic.

Conventions mirror test_strict_quiz_contact.py: single shared event loop,
isolated DB, in-process ASGI, no network.
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

os.environ.setdefault("DB_NAME", "zubite_test_clinic_reco_pref")
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
        await _database.db.clinics.delete_many({})

    _rl._buckets.clear()
    _run(wipe())
    yield
    _rl._buckets.clear()


async def _make_lead(app, *, treatment_type="diagnostic_quiz", city_slug=None):
    async with _client(app) as c:
        payload = {
            "treatment_type": treatment_type,
            "answers": {},
            "source": "diagnostic_quiz_v1",
        }
        if city_slug:
            payload["city_slug"] = city_slug
        r = await c.post("/api/leads", json=payload)
        assert r.status_code == 200, r.text
        return r.json()


async def _unlock(app, lead_id):
    async with _client(app) as c:
        r = await c.post(
            f"/api/leads/{lead_id}/unlock-result",
            json={"name": "Test Patient", "phone": "0888123456", "email": "test@example.com", "consent": True},
        )
        assert r.status_code == 200, r.text


async def _make_clinic(*, city_slug="sofia", treatments_supported=None, extra=None):
    import database as _database
    doc = {
        "id": str(uuid.uuid4()),
        "name": "Test Clinic",
        "city_slug": city_slug,
        "city_name": "Sofia",
        "treatments_supported": treatments_supported or [],
        "is_active": True,
        "archived": False,
    }
    if extra:
        doc.update(extra)
    await _database.db.clinics.insert_one(doc)
    return doc


def test_lead_can_be_created_with_no_city(app):
    """The re-sequenced funnel creates leads before city is ever asked."""
    lead = _run(_make_lead(app))
    assert lead["city_slug"] is None


def test_preference_requires_unlock_first(app):
    lead = _run(_make_lead(app))

    async def go():
        async with _client(app) as c:
            return await c.post(
                f"/api/leads/{lead['id']}/clinic-recommendation-preference",
                json={"wants_recommendations": False},
            )
    r = _run(go())
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "contact_not_submitted"


def test_decline_needs_no_city(app):
    lead = _run(_make_lead(app))
    _run(_unlock(app, lead["id"]))

    async def go():
        async with _client(app) as c:
            return await c.post(
                f"/api/leads/{lead['id']}/clinic-recommendation-preference",
                json={"wants_recommendations": False},
            )
    r = _run(go())
    assert r.status_code == 200, r.text
    assert r.json() == {"success": True, "wants_recommendations": False}

    async def fetch():
        async with _client(app) as c:
            return await c.get(f"/api/leads/{lead['id']}")
    body = _run(fetch()).json()
    assert body["wants_clinic_recommendations"] is False
    assert body.get("city_slug") is None


def test_accept_without_city_rejected(app):
    lead = _run(_make_lead(app))
    _run(_unlock(app, lead["id"]))

    async def go():
        async with _client(app) as c:
            return await c.post(
                f"/api/leads/{lead['id']}/clinic-recommendation-preference",
                json={"wants_recommendations": True},
            )
    r = _run(go())
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "city_required"


def test_accept_sets_city_and_reruns_automatch_for_green_band(app):
    _run(_make_clinic(city_slug="sofia", treatments_supported=["implants"]))
    lead = _run(_make_lead(app, treatment_type="implants"))
    _run(_unlock(app, lead["id"]))

    import database as _database

    async def force_green():
        await _database.db.leads.update_one({"id": lead["id"]}, {"$set": {"band": "GREEN"}})
    _run(force_green())

    async def go():
        async with _client(app) as c:
            return await c.post(
                f"/api/leads/{lead['id']}/clinic-recommendation-preference",
                json={"wants_recommendations": True, "city_slug": "sofia"},
            )
    r = _run(go())
    assert r.status_code == 200, r.text
    assert r.json() == {"success": True, "wants_recommendations": True}

    async def fetch():
        return await _database.db.leads.find_one({"id": lead["id"]}, {"_id": 0})
    doc = _run(fetch())
    assert doc["city_slug"] == "sofia"
    assert doc["wants_clinic_recommendations"] is True
    assert doc["assigned_clinic_id"] is not None


def test_accept_does_not_override_existing_assignment(app):
    """An explicit-clinic-choice lead (assigned_clinic_id already set)
    must not be reassigned by the auto-match re-run."""
    _run(_make_clinic(city_slug="sofia", treatments_supported=["implants"]))
    lead = _run(_make_lead(app, treatment_type="implants"))
    _run(_unlock(app, lead["id"]))

    import database as _database
    preset_clinic_id = str(uuid.uuid4())

    async def force_assignment():
        await _database.db.leads.update_one(
            {"id": lead["id"]}, {"$set": {"band": "GREEN", "assigned_clinic_id": preset_clinic_id}},
        )
    _run(force_assignment())

    async def go():
        async with _client(app) as c:
            return await c.post(
                f"/api/leads/{lead['id']}/clinic-recommendation-preference",
                json={"wants_recommendations": True, "city_slug": "sofia"},
            )
    r = _run(go())
    assert r.status_code == 200, r.text

    async def fetch():
        return await _database.db.leads.find_one({"id": lead["id"]}, {"_id": 0})
    doc = _run(fetch())
    assert doc["assigned_clinic_id"] == preset_clinic_id


def test_accept_no_matching_clinic_leaves_unassigned(app):
    lead = _run(_make_lead(app, treatment_type="a_treatment_nobody_offers"))
    _run(_unlock(app, lead["id"]))

    import database as _database

    async def force_green():
        await _database.db.leads.update_one({"id": lead["id"]}, {"$set": {"band": "GREEN"}})
    _run(force_green())

    async def go():
        async with _client(app) as c:
            return await c.post(
                f"/api/leads/{lead['id']}/clinic-recommendation-preference",
                json={"wants_recommendations": True, "city_slug": "sofia"},
            )
    r = _run(go())
    assert r.status_code == 200, r.text

    async def fetch():
        return await _database.db.leads.find_one({"id": lead["id"]}, {"_id": 0})
    doc = _run(fetch())
    assert doc["assigned_clinic_id"] is None


def test_legacy_city_upfront_lead_creation_still_works(app):
    """Other quiz variants (OrthodonticsQuiz etc.) still send city_slug at
    creation time — the relaxed schema must stay backwards compatible."""
    lead = _run(_make_lead(app, treatment_type="orthodontics", city_slug="plovdiv"))
    assert lead["city_slug"] == "plovdiv"
