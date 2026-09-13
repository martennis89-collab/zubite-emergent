"""The reverse Clear Advance feed is tenant-scoped, resumable and idempotent."""
import asyncio
import os
import sys

import pytest
from cryptography.fernet import Fernet

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import clear_advance  # noqa: E402

SECRET = Fernet.generate_key().decode()


class Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _limit):
        return list(self.docs)


class Collection:
    def __init__(self, docs):
        self.docs = docs
        self.updates = []
        self.find_queries = []

    def find(self, query, _projection=None):
        self.find_queries.append(query)
        return Cursor(self.docs)

    async def update_one(self, query, update, **_kwargs):
        self.updates.append((query, update))


class DB:
    def __init__(self, integrations):
        self.clinic_integrations = Collection(integrations)


def integration():
    return {
        "clinic_id": "clinic-a",
        "provider": "clear_advance",
        "connected_at": "2026-09-13T00:00:00+00:00",
        "api_key": Fernet(SECRET.encode()).encrypt(b"ca_sk_key").decode(),
    }


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("CLEAR_ADVANCE_KEY_SECRET", SECRET)
    monkeypatch.setenv("CLEAR_ADVANCE_API_URL", "https://example.invalid")


def test_imported_document_preserves_attribution_and_separates_origin():
    doc = clear_advance._imported_lead_doc({
        "id": "remote-1",
        "created_at": "2026-09-13T10:00:00+00:00",
        "name": "Maria",
        "phone_e164": "+359888000000",
        "consent_privacy": True,
        "source": "landing_page",
        "first_touch": {"utm_source": "facebook", "utm_campaign": "spring"},
        "last_touch": {
            "utm_source": "google", "utm_medium": "cpc",
            "utm_campaign": "brand", "utm_term": "aligners",
            "campaign_id": "cmp-1", "adset_id": "set-1", "ad_id": "ad-1",
            "landing_page": "/aligners", "referrer": "https://google.com",
        },
        "qualification": {"timing": "soon"},
    }, "clinic-a", "local-1")
    assert doc["origin_system"] == "clear_advance"
    assert doc["clear_advance_lead_id"] == "remote-1"
    assert doc["status"] == "NEW"
    assert doc["consent_marketing"] is False
    assert doc["first_utm_source"] == "facebook"
    assert doc["latest_utm_campaign"] == "brand"
    assert doc["latest_utm_medium"] == "cpc"
    assert doc["latest_utm_term"] == "aligners"
    assert doc["latest_utm_campaign_id"] == "cmp-1"
    assert doc["latest_utm_adset_id"] == "set-1"
    assert doc["latest_utm_ad_id"] == "ad-1"
    assert doc["latest_landing_page"] == "/aligners"
    assert doc["latest_referrer"] == "https://google.com"
    assert doc["answers"] == {"timing": "soon"}


def test_import_sweep_stores_cursor_only_after_a_successful_page(monkeypatch):
    db = DB([integration()])
    calls = []

    async def fake_get(path, key, params):
        calls.append((path, key, params))
        return {"leads": [{"id": "remote-1"}], "next_cursor": "cursor-2"}

    imported = []

    async def fake_import(_db, remote, clinic_id):
        imported.append((remote["id"], clinic_id))
        return True

    monkeypatch.setattr(clear_advance, "_get", fake_get)
    monkeypatch.setattr(clear_advance, "import_clear_advance_lead", fake_import)
    assert asyncio.run(clear_advance.import_pending_leads(db)) == 1
    assert imported == [("remote-1", "clinic-a")]
    assert calls[0][2]["since"] == "2026-09-13T00:00:00+00:00"
    cursor_updates = [u for u in db.clinic_integrations.updates
                      if "clear_advance_import_cursor" in u[1].get("$set", {})]
    assert cursor_updates == [
        ({"clinic_id": "clinic-a", "provider": "clear_advance"},
         {"$set": {"clear_advance_import_cursor": "cursor-2"}})
    ]
    health_updates = [u for u in db.clinic_integrations.updates
                      if "clear_advance_last_sync_kind" in u[1].get("$set", {})]
    assert health_updates[-1][1]["$set"]["clear_advance_last_sync_kind"] == "import"
    assert health_updates[-1][1]["$set"]["clear_advance_last_sync_ok"] is True


def test_manual_import_sync_is_scoped_to_the_current_clinic(monkeypatch):
    db = DB([integration()])

    async def fake_get(_path, _key, _params):
        return {"leads": [], "next_cursor": None}

    monkeypatch.setattr(clear_advance, "_get", fake_get)
    assert asyncio.run(clear_advance.import_pending_leads(db, clinic_id="clinic-a")) == 0
    assert db.clinic_integrations.find_queries[0]["clinic_id"] == "clinic-a"


def test_historical_reconciliation_pages_without_moving_live_cursor(monkeypatch):
    db = DB([integration()])
    calls = []

    async def fake_get(_path, _key, params):
        calls.append(dict(params))
        if len(calls) == 1:
            return {"leads": [{"id": "remote-1"}], "next_cursor": "history-2", "has_more": True}
        return {"leads": [{"id": "remote-2"}], "next_cursor": "history-3", "has_more": False}

    async def fake_import(_db, _remote, _clinic_id):
        return True

    monkeypatch.setattr(clear_advance, "_get", fake_get)
    monkeypatch.setattr(clear_advance, "import_clear_advance_lead", fake_import)
    assert asyncio.run(clear_advance.import_pending_leads(
        db, clinic_id="clinic-a", since="2026-01-01T00:00:00+00:00")) == 2
    assert calls == [
        {"limit": "50", "since": "2026-01-01T00:00:00+00:00"},
        {"limit": "50", "cursor": "history-2"},
    ]
    assert not any("clear_advance_import_cursor" in update.get("$set", {})
                   for _, update in db.clinic_integrations.updates)
