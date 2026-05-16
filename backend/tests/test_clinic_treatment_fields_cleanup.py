"""Clinic treatment fields cleanup (Feb 2026).

Verifies the read/write bridge between the canonical
`treatments_supported` field and the legacy `treatments_offered`
mirror. No destructive migration: legacy data must keep working,
new writes must always populate the canonical field, and the public
response must surface a single clean normalized list.
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

os.environ.setdefault("DB_NAME", "zubite_test_clinic_treatment_cleanup")
os.environ.setdefault("APP_ENV", "test")
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"
os.environ.setdefault("RESEND_API_KEY", "test_resend_key_no_network")
os.environ.setdefault("ADMIN_EMAIL", "admin-alerts@example.com")
os.environ["AUTH_COOKIE_SECURE"] = "0"

_db_name = os.environ.get("DB_NAME", "")
if not (_db_name.startswith("zubite_test") or _db_name.startswith("test_")):
    raise RuntimeError(f"Refusing: DB_NAME={_db_name!r}")
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


# ────────────────────────────────────────────────────────────
# Direct tests on the helper
# ────────────────────────────────────────────────────────────

def test_normalize_prefers_treatments_supported():
    from routers.public import _normalize_clinic_treatments
    out = _normalize_clinic_treatments({
        "treatments_supported": ["aligners"],
        "treatments_offered": ["braces"],
    })
    assert out == ["aligners"]


def test_normalize_falls_back_when_supported_missing():
    from routers.public import _normalize_clinic_treatments
    out = _normalize_clinic_treatments({"treatments_offered": ["aligners"]})
    assert out == ["aligners"]


def test_normalize_falls_back_when_supported_empty_list():
    from routers.public import _normalize_clinic_treatments
    out = _normalize_clinic_treatments({
        "treatments_supported": [],
        "treatments_offered": ["aligners"],
    })
    assert out == ["aligners"]


def test_normalize_drops_empty_strings_and_whitespace():
    from routers.public import _normalize_clinic_treatments
    out = _normalize_clinic_treatments({
        "treatments_supported": ["aligners", " ", "", "  braces  "],
    })
    assert out == ["aligners", "braces"]


def test_normalize_dedup_and_lowercase():
    from routers.public import _normalize_clinic_treatments
    out = _normalize_clinic_treatments({
        "treatments_supported": ["Aligners", "ALIGNERS", "braces"],
    })
    assert out == ["aligners", "braces"]


def test_normalize_drops_non_strings():
    from routers.public import _normalize_clinic_treatments
    out = _normalize_clinic_treatments({
        "treatments_supported": ["aligners", 123, None, {"x": 1}, "braces"],
    })
    assert out == ["aligners", "braces"]


def test_normalize_empty_when_both_empty():
    from routers.public import _normalize_clinic_treatments
    assert _normalize_clinic_treatments({}) == []
    assert _normalize_clinic_treatments({"treatments_supported": [], "treatments_offered": []}) == []


# ────────────────────────────────────────────────────────────
# End-to-end: recommended-clinics endpoint
# ────────────────────────────────────────────────────────────

async def _seed_clinic(**fields):
    import database as _database
    base = {
        "id": fields.pop("id", "clinic-test"),
        "name": fields.pop("name", "Test Clinic"),
        "city_slug": fields.pop("city_slug", "sofia"),
        "city_name": fields.pop("city_name", "София"),
        "is_active": True,
        "clinic_status": "active_partner",
    }
    base.update(fields)
    await _database.db.clinics.insert_one(base)
    return base


async def _seed_lead(**fields):
    import database as _database
    base = {
        "id": fields.pop("id", "lead-test"),
        "city_slug": fields.pop("city_slug", "sofia"),
        "treatment_type": fields.pop("treatment_type", "aligners"),
        "band": "GREEN",
        "consent": True,
    }
    base.update(fields)
    await _database.db.leads.insert_one(base)
    return base


def test_recommended_returns_canonical_for_supported_only(app):
    async def go():
        await _seed_clinic(id="c-supp", name="Supp Only",
                           treatments_supported=["aligners"])
        await _seed_lead(id="lead-1", treatment_type="aligners")
        async with _client(app) as c:
            return await c.get("/api/leads/lead-1/recommended-clinics")
    r = _run(go())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["clinic_count"] == 1
    clinic = body["clinics"][0]
    assert clinic["name"] == "Supp Only"
    # Canonical and legacy alias both surface the same list.
    assert clinic["treatments_supported"] == ["aligners"]
    assert clinic["treatments"] == ["aligners"]


def test_recommended_returns_canonical_for_legacy_offered_only(app):
    async def go():
        await _seed_clinic(id="c-leg", name="Legacy Only",
                           treatments_offered=["aligners"])
        await _seed_lead(id="lead-2", treatment_type="aligners")
        async with _client(app) as c:
            return await c.get("/api/leads/lead-2/recommended-clinics")
    r = _run(go())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["clinic_count"] == 1
    clinic = body["clinics"][0]
    assert clinic["treatments_supported"] == ["aligners"]
    assert clinic["treatments"] == ["aligners"]


def test_recommended_prefers_supported_when_both_present(app):
    async def go():
        await _seed_clinic(id="c-both", name="Both Fields",
                           treatments_supported=["aligners"],
                           treatments_offered=["braces"])
        await _seed_lead(id="lead-3", treatment_type="aligners")
        async with _client(app) as c:
            return await c.get("/api/leads/lead-3/recommended-clinics")
    r = _run(go())
    assert r.status_code == 200
    clinic = r.json()["clinics"][0]
    assert clinic["treatments_supported"] == ["aligners"]
    # Legacy `braces` from `treatments_offered` is NOT in the response —
    # canonical wins.
    assert "braces" not in clinic["treatments_supported"]


def test_recommended_dedupes_whitespace(app):
    async def go():
        await _seed_clinic(id="c-dirty", name="Dirty Data",
                           treatments_supported=[" Aligners ", "aligners", "", " "])
        await _seed_lead(id="lead-4", treatment_type="aligners")
        async with _client(app) as c:
            return await c.get("/api/leads/lead-4/recommended-clinics")
    r = _run(go())
    clinic = r.json()["clinics"][0]
    assert clinic["treatments_supported"] == ["aligners"]


def test_matching_finds_legacy_only_clinic(app):
    """Regression for the pre-cleanup union behaviour: a legacy clinic
    with ONLY `treatments_offered` must still surface in matching when
    its treatment matches the lead."""
    async def go():
        await _seed_clinic(id="c-leg2", name="Legacy Aligners",
                           treatments_offered=["aligners"])
        await _seed_lead(id="lead-5", treatment_type="aligners")
        async with _client(app) as c:
            return await c.get("/api/leads/lead-5/recommended-clinics")
    r = _run(go())
    assert r.status_code == 200
    names = [c["name"] for c in r.json()["clinics"]]
    assert "Legacy Aligners" in names


# ────────────────────────────────────────────────────────────
# End-to-end: admin write paths
# ────────────────────────────────────────────────────────────

def _admin_login(app):
    import database as _database
    import auth as _auth

    async def ensure_admin():
        await _database.db.admin_users.update_one(
            {"username": "admin@zubite.bg"},
            {"$set": {
                "id": "admin-1",
                "username": "admin@zubite.bg",
                "password_hash": _auth.hash_password("password"),
                "role": "admin",
                "is_active": True,
            }},
            upsert=True,
        )
    _run(ensure_admin())

    async def do_login():
        async with _client(app) as c:
            r = await c.post("/api/admin/login", json={
                "username": "admin@zubite.bg",
                "password": "password",
            })
            return r
    r = _run(do_login())
    assert r.status_code == 200, r.text
    return r.json().get("token") or r.json().get("access_token")


def test_admin_create_clinic_writes_canonical_and_mirror(app):
    token = _admin_login(app)

    async def go():
        async with _client(app) as c:
            return await c.post(
                "/api/admin/clinics",
                json={
                    "clinic_name": "New Canonical Clinic",
                    "city": "Sofia",
                    "email": "canon@example.com",
                    "phone": "+359888000111",
                    # Frontend now sends canonical field.
                    "treatments_supported": ["aligners", "braces"],
                    "clinic_status": "active_partner",
                    "subscription_status": "active",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
    r = _run(go())
    assert r.status_code == 200, r.text
    clinic = r.json()["clinic"]
    assert clinic["treatments_supported"] == ["aligners", "braces"]
    # Legacy mirror also written.
    import database as _database
    doc = _run(_database.db.clinics.find_one({"id": clinic["id"]}))
    assert doc["treatments_supported"] == ["aligners", "braces"]
    assert doc["treatments_offered"] == ["aligners", "braces"]


def test_admin_create_clinic_accepts_legacy_field_too(app):
    """Backwards-compat: an old admin frontend that still sends only
    `treatments_offered` must still produce a doc with both fields
    populated."""
    token = _admin_login(app)

    async def go():
        async with _client(app) as c:
            return await c.post(
                "/api/admin/clinics",
                json={
                    "clinic_name": "Legacy Field Clinic",
                    "city": "Sofia",
                    "email": "legacy@example.com",
                    "phone": "+359888000222",
                    "treatments_offered": ["aligners"],
                    "clinic_status": "active_partner",
                    "subscription_status": "active",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
    r = _run(go())
    assert r.status_code == 200, r.text
    clinic = r.json()["clinic"]
    assert clinic["treatments_supported"] == ["aligners"]
    import database as _database
    doc = _run(_database.db.clinics.find_one({"id": clinic["id"]}))
    assert doc["treatments_supported"] == ["aligners"]
    assert doc["treatments_offered"] == ["aligners"]


def test_admin_patch_clinic_writes_to_both_fields(app):
    token = _admin_login(app)
    import database as _database

    async def seed():
        await _database.db.clinics.insert_one({
            "id": "c-patch", "clinic_name": "Patch Me", "city": "Sofia",
            "email": "patchme@example.com", "phone": "x",
            "is_active": True, "clinic_status": "active_partner",
            "subscription_status": "active",
            "treatments_offered": ["braces"],
        })
    _run(seed())

    async def go():
        async with _client(app) as c:
            return await c.patch(
                "/api/admin/clinics/c-patch",
                json={"treatments_supported": ["aligners", "implants"]},
                headers={"Authorization": f"Bearer {token}"},
            )
    r = _run(go())
    assert r.status_code == 200, r.text
    clinic = r.json()["clinic"]
    assert clinic["treatments_supported"] == ["aligners", "implants"]
    doc = _run(_database.db.clinics.find_one({"id": "c-patch"}))
    assert doc["treatments_supported"] == ["aligners", "implants"]
    assert doc["treatments_offered"] == ["aligners", "implants"]


def test_admin_patch_with_legacy_field_still_writes_both(app):
    token = _admin_login(app)
    import database as _database

    async def seed():
        await _database.db.clinics.insert_one({
            "id": "c-patch2", "clinic_name": "Legacy Patch", "city": "Sofia",
            "email": "legpatch@example.com", "phone": "x",
            "is_active": True, "clinic_status": "active_partner",
            "subscription_status": "active",
            "treatments_supported": ["braces"],
        })
    _run(seed())

    async def go():
        async with _client(app) as c:
            return await c.patch(
                "/api/admin/clinics/c-patch2",
                json={"treatments_offered": ["aligners"]},
                headers={"Authorization": f"Bearer {token}"},
            )
    r = _run(go())
    assert r.status_code == 200, r.text
    doc = _run(_database.db.clinics.find_one({"id": "c-patch2"}))
    assert doc["treatments_supported"] == ["aligners"]
    assert doc["treatments_offered"] == ["aligners"]


def test_admin_get_clinic_returns_normalized(app):
    token = _admin_login(app)
    import database as _database

    async def seed():
        await _database.db.clinics.insert_one({
            "id": "c-get", "clinic_name": "Read Me", "city": "Sofia",
            "email": "readme@example.com", "phone": "x",
            "is_active": True, "clinic_status": "active_partner",
            "subscription_status": "active",
            # Legacy-only doc → canonical must surface from fallback.
            "treatments_offered": ["aligners", "Aligners", "BRACES"],
        })
    _run(seed())

    async def go():
        async with _client(app) as c:
            return await c.get(
                "/api/admin/clinics/c-get",
                headers={"Authorization": f"Bearer {token}"},
            )
    r = _run(go())
    assert r.status_code == 200, r.text
    clinic = r.json()["clinic"]
    assert clinic["treatments_supported"] == ["aligners", "braces"]


def test_admin_list_clinics_returns_normalized(app):
    token = _admin_login(app)
    import database as _database

    async def seed():
        await _database.db.clinics.insert_one({
            "id": "c-l1", "clinic_name": "List Legacy", "city": "Sofia",
            "email": "listleg@example.com", "phone": "x",
            "is_active": True, "clinic_status": "active_partner",
            "subscription_status": "active",
            "treatments_offered": ["aligners"],
        })
        await _database.db.clinics.insert_one({
            "id": "c-l2", "clinic_name": "List Canonical", "city": "Sofia",
            "email": "listcanon@example.com", "phone": "x",
            "is_active": True, "clinic_status": "active_partner",
            "subscription_status": "active",
            "treatments_supported": ["braces"],
        })
    _run(seed())

    async def go():
        async with _client(app) as c:
            return await c.get(
                "/api/admin/clinics",
                headers={"Authorization": f"Bearer {token}"},
            )
    r = _run(go())
    assert r.status_code == 200
    by_id = {c["id"]: c for c in r.json()["clinics"]}
    assert by_id["c-l1"]["treatments_supported"] == ["aligners"]
    assert by_id["c-l2"]["treatments_supported"] == ["braces"]
