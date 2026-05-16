"""Tests for clinic Aligner Brand Tags / Provider Badges (Feb 2026).

Covers:
- Whitelist / enum validation in admin write path
- Public projection downgrade rule (no "official" without verified)
- Visibility filter
- Backwards compatibility for clinics without the field
- Recommended-clinics endpoint includes safe public chips
- Public clinic profile endpoint includes safe public chips
"""
from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timezone

import httpx
import pytest

os.environ.setdefault("DB_NAME", "zubite_test_aligner_brands")

from server import app as _app  # noqa: E402
from auth import hash_password, create_token  # noqa: E402
import database as _database  # noqa: E402


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@pytest.fixture(autouse=True)
def _wipe():
    async def go():
        await _database.db.clinics.delete_many({})
        await _database.db.admin_users.delete_many({})
        await _database.db.leads.delete_many({})
        await _database.db.audit_log.delete_many({})
    _run(go())
    yield
    _run(go())


@pytest.fixture
def app():
    return _app


# ─── Helpers ────────────────────────────────────────────────

def _admin_token() -> str:
    """Seed an admin and return a bearer token."""
    aid = str(uuid.uuid4())
    _run(_database.db.admin_users.insert_one({
        "id": aid,
        "username": "admin-brand-tests",
        "email": "admin-brand@example.com",
        "password_hash": hash_password("Pass1234!"),
        "role": "admin",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }))
    return create_token(aid, "admin-brand-tests")


async def _seed_clinic(cid: str, **overrides):
    doc = {
        "id": cid,
        "clinic_name": "Brand Test Clinic",
        "name": "Brand Test Clinic",
        "city": "Sofia",
        "city_slug": "sofia",
        "city_name": "София",
        "email": f"{cid}@example.com",
        "phone": "+35920000000",
        "treatments_supported": ["alaynery"],
        "treatments_offered": ["alaynery"],
        "clinic_status": "evaluation_partner",
        "subscription_status": "trial",
        "status": "active",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    doc.update(overrides)
    await _database.db.clinics.insert_one(doc)
    return doc


def _client(app):
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t")


def _admin_headers():
    return {"Authorization": f"Bearer {_admin_token()}"}


# ─── 1. Helper: unit tests for the validator ─────────────────────

def test_brand_helper_unit_valid_entry():
    from aligner_brands import normalize_aligner_brand_entries
    out = normalize_aligner_brand_entries([
        {"brand": "invisalign", "relationship": "offered"},
    ])
    assert out == [{
        "brand": "invisalign", "label": "Invisalign",
        "relationship": "offered", "verification_status": "unverified",
        "visible": True,
    }]


def test_brand_helper_unit_invalid_brand_raises():
    from aligner_brands import normalize_aligner_brand_entries, AlignerBrandValidationError
    with pytest.raises(AlignerBrandValidationError):
        normalize_aligner_brand_entries([{"brand": "fake"}])


def test_brand_helper_unit_invalid_relationship_raises():
    from aligner_brands import normalize_aligner_brand_entries, AlignerBrandValidationError
    with pytest.raises(AlignerBrandValidationError):
        normalize_aligner_brand_entries([{"brand": "spark", "relationship": "BOGUS"}])


def test_brand_helper_unit_invalid_verification_raises():
    from aligner_brands import normalize_aligner_brand_entries, AlignerBrandValidationError
    with pytest.raises(AlignerBrandValidationError):
        normalize_aligner_brand_entries([{"brand": "spark", "verification_status": "wrong"}])


def test_brand_helper_unit_other_requires_label():
    from aligner_brands import normalize_aligner_brand_entries, AlignerBrandValidationError
    with pytest.raises(AlignerBrandValidationError):
        normalize_aligner_brand_entries([{"brand": "other"}])


def test_brand_helper_unit_other_label_is_escaped_and_capped():
    from aligner_brands import normalize_aligner_brand_entries
    out = normalize_aligner_brand_entries([{
        "brand": "other",
        "other_label": "<script>x</script>" + "a" * 200,
    }])
    assert "<script>" not in out[0]["other_label"]
    assert "&lt;script&gt;" in out[0]["other_label"]
    # Capped at 60 chars
    assert len(out[0]["other_label"]) <= 60


def test_brand_helper_unit_dedupe_by_brand_last_wins():
    from aligner_brands import normalize_aligner_brand_entries
    out = normalize_aligner_brand_entries([
        {"brand": "invisalign", "relationship": "offered"},
        {"brand": "invisalign", "relationship": "official_provider", "verification_status": "verified"},
    ])
    assert len(out) == 1
    assert out[0]["relationship"] == "official_provider"
    assert out[0]["verification_status"] == "verified"


def test_brand_helper_unit_max_entries_cap():
    from aligner_brands import normalize_aligner_brand_entries, AlignerBrandValidationError
    too_many = [{"brand": "invisalign", "relationship": "offered"}] * 13
    with pytest.raises(AlignerBrandValidationError):
        normalize_aligner_brand_entries(too_many)


# ─── 2. Public projection downgrade rule ─────────────────────────

def test_brand_public_chips_downgrades_unverified_official():
    from aligner_brands import public_aligner_brand_chips
    chips = public_aligner_brand_chips([
        {"brand": "invisalign", "relationship": "official_provider",
         "verification_status": "pending_verification", "visible": True},
    ])
    assert len(chips) == 1
    assert chips[0]["relationship"] == "offered"
    assert chips[0]["verified_official"] is False


def test_brand_public_chips_keeps_verified_official():
    from aligner_brands import public_aligner_brand_chips
    chips = public_aligner_brand_chips([
        {"brand": "spark", "relationship": "official_provider",
         "verification_status": "verified", "visible": True},
    ])
    assert chips[0]["relationship"] == "official_provider"
    assert chips[0]["verified_official"] is True


def test_brand_public_chips_strips_invisible():
    from aligner_brands import public_aligner_brand_chips
    chips = public_aligner_brand_chips([
        {"brand": "invisalign", "visible": False},
        {"brand": "spark", "visible": True},
    ])
    assert [c["brand"] for c in chips] == ["spark"]


def test_brand_public_chips_uses_other_label():
    from aligner_brands import public_aligner_brand_chips
    chips = public_aligner_brand_chips([
        {"brand": "other", "relationship": "offered", "other_label": "MyBrand X",
         "visible": True, "verification_status": "unverified"},
    ])
    assert chips[0]["label"] == "MyBrand X"


def test_brand_public_chips_safe_for_none_or_garbage():
    from aligner_brands import public_aligner_brand_chips
    assert public_aligner_brand_chips(None) == []
    assert public_aligner_brand_chips("bogus") == []
    assert public_aligner_brand_chips([{"brand": "fake"}]) == []


# ─── 3. Admin endpoints (write path) ─────────────────────────────

def test_admin_create_clinic_with_brands(app):
    headers = _admin_headers()
    payload = {
        "clinic_name": "Sofia Aligner Test",
        "city": "Sofia",
        "email": "sofia-aligner@example.com",
        "phone": "+35920000000",
        "treatments_supported": ["alaynery"],
        "aligner_brands_supported": [
            {"brand": "invisalign", "relationship": "offered"},
            {"brand": "spark", "relationship": "official_provider", "verification_status": "verified"},
        ],
    }
    async def go():
        async with _client(app) as c:
            return await c.post("/api/admin/clinics", json=payload, headers=headers)
    r = _run(go())
    assert r.status_code == 200, r.text
    body = r.json()["clinic"]
    brands = body["aligner_brands_supported"]
    assert len(brands) == 2
    assert {b["brand"] for b in brands} == {"invisalign", "spark"}


def test_admin_create_rejects_invalid_brand(app):
    headers = _admin_headers()
    payload = {
        "clinic_name": "Bad Brand",
        "city": "Sofia",
        "email": "bad-brand@example.com",
        "phone": "+35920000000",
        "treatments_supported": ["alaynery"],
        "aligner_brands_supported": [{"brand": "definitely_not_a_brand"}],
    }
    async def go():
        async with _client(app) as c:
            return await c.post("/api/admin/clinics", json=payload, headers=headers)
    r = _run(go())
    assert r.status_code == 400


def test_admin_patch_brands_replaces_list(app):
    cid = str(uuid.uuid4())
    _run(_seed_clinic(cid, aligner_brands_supported=[]))
    headers = _admin_headers()
    payload = {
        "aligner_brands_supported": [
            {"brand": "invisalign", "relationship": "offered"},
            {"brand": "clearcorrect", "relationship": "offered"},
        ]
    }
    async def go():
        async with _client(app) as c:
            return await c.patch(f"/api/admin/clinics/{cid}", json=payload, headers=headers)
    r = _run(go())
    assert r.status_code == 200, r.text
    brands = r.json()["clinic"]["aligner_brands_supported"]
    assert {b["brand"] for b in brands} == {"invisalign", "clearcorrect"}


def test_admin_patch_rejects_bad_relationship(app):
    cid = str(uuid.uuid4())
    _run(_seed_clinic(cid))
    headers = _admin_headers()
    payload = {
        "aligner_brands_supported": [
            {"brand": "invisalign", "relationship": "loool"},
        ]
    }
    async def go():
        async with _client(app) as c:
            return await c.patch(f"/api/admin/clinics/{cid}", json=payload, headers=headers)
    r = _run(go())
    assert r.status_code == 400


def test_admin_patch_rejects_bad_verification_status(app):
    cid = str(uuid.uuid4())
    _run(_seed_clinic(cid))
    headers = _admin_headers()
    payload = {
        "aligner_brands_supported": [
            {"brand": "invisalign", "verification_status": "guess"},
        ]
    }
    async def go():
        async with _client(app) as c:
            return await c.patch(f"/api/admin/clinics/{cid}", json=payload, headers=headers)
    r = _run(go())
    assert r.status_code == 400


def test_admin_patch_other_brand_requires_label(app):
    cid = str(uuid.uuid4())
    _run(_seed_clinic(cid))
    headers = _admin_headers()
    payload = {
        "aligner_brands_supported": [{"brand": "other"}],
    }
    async def go():
        async with _client(app) as c:
            return await c.patch(f"/api/admin/clinics/{cid}", json=payload, headers=headers)
    r = _run(go())
    assert r.status_code == 400


def test_admin_get_clinic_returns_brands(app):
    cid = str(uuid.uuid4())
    _run(_seed_clinic(
        cid,
        aligner_brands_supported=[{
            "brand": "invisalign", "label": "Invisalign",
            "relationship": "offered", "verification_status": "unverified",
            "visible": True,
        }],
    ))
    headers = _admin_headers()
    async def go():
        async with _client(app) as c:
            return await c.get(f"/api/admin/clinics/{cid}", headers=headers)
    r = _run(go())
    assert r.status_code == 200
    brands = r.json()["clinic"]["aligner_brands_supported"]
    assert len(brands) == 1
    # Admin response keeps verification_status (UI needs it)
    assert brands[0]["verification_status"] == "unverified"


def test_admin_get_clinic_without_brands_returns_empty_list(app):
    cid = str(uuid.uuid4())
    _run(_seed_clinic(cid))  # no aligner_brands_supported field
    headers = _admin_headers()
    async def go():
        async with _client(app) as c:
            return await c.get(f"/api/admin/clinics/{cid}", headers=headers)
    r = _run(go())
    assert r.status_code == 200
    assert r.json()["clinic"]["aligner_brands_supported"] == []


# ─── 4. Public read path (recommended-clinics + clinic profile) ──

def _seed_lead_and_clinic_match(clinic_id: str, **brand_overrides):
    """Seed a lead and a matching clinic so /recommended-clinics returns
    the clinic; also stamp the clinic with the given brand entries."""
    lead_id = str(uuid.uuid4())
    _run(_database.db.leads.insert_one({
        "id": lead_id,
        "city_slug": "sofia",
        "treatment_type": "alaynery",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }))
    _run(_seed_clinic(
        clinic_id,
        treatments_supported=["alaynery"],
        treatments_offered=["alaynery"],
        partner_tier="standard",
        **brand_overrides,
    ))
    return lead_id


def test_public_recommended_clinics_returns_safe_chips(app):
    cid = str(uuid.uuid4())
    lead_id = _seed_lead_and_clinic_match(cid, aligner_brands_supported=[
        {"brand": "invisalign", "label": "Invisalign",
         "relationship": "offered", "verification_status": "unverified",
         "visible": True},
        {"brand": "spark", "label": "Spark",
         "relationship": "official_provider", "verification_status": "verified",
         "visible": True},
    ])
    async def go():
        async with _client(app) as c:
            return await c.get(f"/api/leads/{lead_id}/recommended-clinics")
    r = _run(go())
    assert r.status_code == 200, r.text
    body = r.json()
    target = next((c for c in body["clinics"] if c["id"] == cid), None)
    assert target is not None
    chips = target.get("aligner_brands_supported")
    assert chips is not None
    by_brand = {c["brand"]: c for c in chips}
    assert by_brand["invisalign"]["relationship"] == "offered"
    assert by_brand["invisalign"]["verified_official"] is False
    assert by_brand["spark"]["relationship"] == "official_provider"
    assert by_brand["spark"]["verified_official"] is True
    # Public chips MUST NOT expose verification_status / visible flags
    for c in chips:
        assert "verification_status" not in c
        assert "visible" not in c


def test_public_downgrades_unverified_official(app):
    cid = str(uuid.uuid4())
    lead_id = _seed_lead_and_clinic_match(cid, aligner_brands_supported=[
        {"brand": "invisalign", "label": "Invisalign",
         "relationship": "official_provider",
         "verification_status": "pending_verification",
         "visible": True},
    ])
    async def go():
        async with _client(app) as c:
            return await c.get(f"/api/leads/{lead_id}/recommended-clinics")
    body = _run(go()).json()
    target = next((c for c in body["clinics"] if c["id"] == cid), None)
    chips = target["aligner_brands_supported"]
    # Downgraded — public can never see "official_provider" without verified
    assert chips[0]["relationship"] == "offered"
    assert chips[0]["verified_official"] is False


def test_public_hides_invisible_brand(app):
    cid = str(uuid.uuid4())
    lead_id = _seed_lead_and_clinic_match(cid, aligner_brands_supported=[
        {"brand": "invisalign", "visible": False, "label": "Invisalign",
         "relationship": "offered", "verification_status": "unverified"},
        {"brand": "spark", "visible": True, "label": "Spark",
         "relationship": "offered", "verification_status": "unverified"},
    ])
    async def go():
        async with _client(app) as c:
            return await c.get(f"/api/leads/{lead_id}/recommended-clinics")
    body = _run(go()).json()
    target = next((c for c in body["clinics"] if c["id"] == cid), None)
    brands = [c["brand"] for c in (target.get("aligner_brands_supported") or [])]
    assert brands == ["spark"]


def test_public_response_omits_field_when_no_brands(app):
    cid = str(uuid.uuid4())
    lead_id = _seed_lead_and_clinic_match(cid)  # no brand overrides
    async def go():
        async with _client(app) as c:
            return await c.get(f"/api/leads/{lead_id}/recommended-clinics")
    body = _run(go()).json()
    target = next((c for c in body["clinics"] if c["id"] == cid), None)
    # Backwards compat: clinic without the field is fully valid; key
    # is omitted from response (frontend guards on truthiness).
    assert "aligner_brands_supported" not in target
