"""Admin Rich Clinic Profile Editor — R1 backend tests.

Verifies:
  • Tier control (1–6): admin sets partner_tier=standard/featured/premium;
    invalid values rejected; clinic/anonymous access denied.
  • Profile validation (7–15): basic field updates, rating/review-count
    bounds, text-length bounds, treatment_focus/case_library counts,
    case publish-without-consent rejection, draft case w/o consent
    allowed, unknown fields ignored.
  • Public tier gating (16–24): recommended-clinics response surfaces
    `partner_tier`, tier-gated published profile fields, draft content
    excluded, unsafe case rows excluded, downgrade preserves data.

Isolated DB. No network egress.
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

os.environ.setdefault("DB_NAME", "zubite_test_admin_clinic_profile_r1")
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
CLINIC_EMAIL = "clinic-r1-profile-editor@example.com"
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
                "id": "test-clinic-r1",
                "clinic_name": "Тестова Клиника R1",
                "name": "Тестова Клиника R1",
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
                "partner_tier": "standard",
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

    async def wipe_partial():
        db = _database.db
        await db.leads.delete_many({})
        await db.consultation_requests.delete_many({})
        await db.consultation_events.delete_many({})
        await db.admin_audit_logs.delete_many({})
        # Reset clinic back to standard tier + drop profile for clean tests.
        await db.clinics.update_one(
            {"id": "test-clinic-r1"},
            {"$set": {"partner_tier": "standard"},
             "$unset": {"clinic_profile": "", "is_featured": "", "is_premium": ""}},
        )

    _rl._buckets.clear()
    _run(wipe_partial())
    yield
    _rl._buckets.clear()


# ── auth helpers ──────────────────────────────────────────────────


async def _admin_cookies(app) -> dict:
    async with _client(app) as c:
        r = await c.post(
            "/api/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        )
    r.raise_for_status()
    return dict(r.cookies)


async def _clinic_cookies(app) -> dict:
    async with _client(app) as c:
        r = await c.post(
            "/api/clinic/login",
            json={"email": CLINIC_EMAIL, "password": CLINIC_PASSWORD},
        )
    r.raise_for_status()
    return dict(r.cookies)


def _patch(app, body: dict, cookies: dict | None = None):
    async def go():
        async with _client(app) as c:
            return await c.patch(
                "/api/admin/clinics/test-clinic-r1",
                json=body,
                cookies=cookies or {},
                headers={"Origin": "https://zubite.bg"},
            )
    return _run(go())


def _seed_lead() -> str:
    """Create a fresh lead in Sofia for aligners — exercises the
    /recommended-clinics endpoint with our test clinic in scope."""
    import database as _database
    lid = str(uuid.uuid4())
    _run(_database.db.leads.insert_one({
        "id": lid,
        "city_slug": "sofia",
        "city": "Sofia",
        "treatment_type": "aligners",
        "answers": {},
        "consent": True,
        "created_at": _now_iso(),
        "name": "T", "phone": "+359888000000",
    }))
    return lid


def _recos(app, lead_id: str) -> dict:
    async def go():
        async with _client(app) as c:
            return await c.get(f"/api/leads/{lead_id}/recommended-clinics")
    r = _run(go())
    assert r.status_code == 200, r.text
    return r.json()


# ── 1–6: tier control ─────────────────────────────────────────────


def test_01_admin_sets_partner_tier_standard(app):
    admin = _run(_admin_cookies(app))
    r = _patch(app, {"partner_tier": "standard"}, admin)
    assert r.status_code == 200, r.text
    assert r.json()["clinic"]["partner_tier"] == "standard"


def test_02_admin_sets_partner_tier_featured(app):
    admin = _run(_admin_cookies(app))
    r = _patch(app, {"partner_tier": "featured"}, admin)
    assert r.status_code == 200, r.text
    assert r.json()["clinic"]["partner_tier"] == "featured"


def test_03_admin_sets_partner_tier_premium(app):
    admin = _run(_admin_cookies(app))
    r = _patch(app, {"partner_tier": "premium"}, admin)
    assert r.status_code == 200, r.text
    assert r.json()["clinic"]["partner_tier"] == "premium"


def test_04_invalid_partner_tier_rejected(app):
    admin = _run(_admin_cookies(app))
    r = _patch(app, {"partner_tier": "gold"}, admin)
    assert r.status_code == 400, r.text


def test_05_clinic_jwt_cannot_change_partner_tier(app):
    clinic = _run(_clinic_cookies(app))
    r = _patch(app, {"partner_tier": "premium"}, clinic)
    assert r.status_code in (401, 403)


def test_06_unauthenticated_cannot_change_partner_tier(app):
    r = _patch(app, {"partner_tier": "premium"}, None)
    assert r.status_code in (401, 403)


# ── 7–15: profile validation ──────────────────────────────────────


def test_07_admin_updates_basic_profile_fields(app):
    admin = _run(_admin_cookies(app))
    r = _patch(app, {
        "clinic_profile": {
            "profile_status": "draft",
            "short_description": "Кратко описание на клиниката.",
            "patient_intro": "Кратко обръщение към пациента.",
            "treatment_focus": ["aligners", "implants"],
            "review_sources": {
                "google_rating": 4.6,
                "google_review_count": 120,
                "google_url": "https://maps.google.com/x",
            },
        },
    }, admin)
    assert r.status_code == 200, r.text
    p = r.json()["clinic"]["clinic_profile"]
    assert p["short_description"] == "Кратко описание на клиниката."
    assert p["treatment_focus"] == ["aligners", "implants"]
    assert p["review_sources"]["google_rating"] == 4.6
    assert "updated_at" in p


def test_08_rating_above_5_rejected(app):
    admin = _run(_admin_cookies(app))
    r = _patch(app, {
        "clinic_profile": {
            "review_sources": {"google_rating": 5.5},
        },
    }, admin)
    assert r.status_code == 422, r.text


def test_09_negative_review_count_rejected(app):
    admin = _run(_admin_cookies(app))
    r = _patch(app, {
        "clinic_profile": {
            "review_sources": {"google_review_count": -3},
        },
    }, admin)
    assert r.status_code == 422


def test_10_overlong_text_rejected(app):
    admin = _run(_admin_cookies(app))
    r = _patch(app, {
        "clinic_profile": {"short_description": "x" * 501},
    }, admin)
    assert r.status_code == 422


def test_11_treatment_focus_max_enforced(app):
    admin = _run(_admin_cookies(app))
    r = _patch(app, {
        "clinic_profile": {"treatment_focus": [f"t{i}" for i in range(13)]},
    }, admin)
    assert r.status_code == 400, r.text


def test_12_case_library_max_enforced(app):
    admin = _run(_admin_cookies(app))
    cases = [
        {"title": f"Case {i}", "category": "aligners", "summary": "x"}
        for i in range(13)
    ]
    r = _patch(app, {"clinic_profile": {"case_library": cases}}, admin)
    assert r.status_code == 400, r.text


def test_13_published_case_without_consent_rejected(app):
    admin = _run(_admin_cookies(app))
    r = _patch(app, {
        "clinic_profile": {
            "case_library": [{
                "title": "Случай 1",
                "category": "aligners",
                "summary": "Описание на случая.",
                "status": "published",
                "consent_confirmed": False,
            }],
        },
    }, admin)
    assert r.status_code == 400, r.text


def test_14_draft_case_without_consent_allowed(app):
    admin = _run(_admin_cookies(app))
    r = _patch(app, {
        "clinic_profile": {
            "case_library": [{
                "title": "Случай 1",
                "category": "aligners",
                "summary": "Описание на случая.",
                "status": "draft",
                "consent_confirmed": False,
            }],
        },
    }, admin)
    assert r.status_code == 200, r.text
    cases = r.json()["clinic"]["clinic_profile"]["case_library"]
    assert len(cases) == 1
    assert cases[0]["status"] == "draft"
    assert cases[0]["consent_confirmed"] is False
    assert cases[0]["id"]  # auto-assigned uuid


def test_15_unknown_fields_do_not_create_unsafe_keys(app):
    admin = _run(_admin_cookies(app))
    r = _patch(app, {
        "clinic_profile": {
            "short_description": "OK",
            "patient_name": "Иван",          # forbidden — PII
            "patient_phone": "+359888...",   # forbidden — PII
            "secret_admin_only": "x",
        },
    }, admin)
    assert r.status_code == 200, r.text
    p = r.json()["clinic"]["clinic_profile"]
    for forbidden in ("patient_name", "patient_phone", "secret_admin_only"):
        assert forbidden not in p


# ── 16–24: public tier-gating ─────────────────────────────────────


def _published_profile_body() -> dict:
    return {
        "profile_status": "published",
        "short_description": "Premium short description.",
        "patient_intro": "Patient intro paragraph.",
        "treatment_focus": ["aligners", "veneers"],
        "hero_image_url": "https://example.com/hero.jpg",
        "clinic_video_url": "https://example.com/v.mp4",
        "doctor_video_url": "https://example.com/dr.mp4",
        "doctor_spotlight_name": "Д-р Иванов",
        "doctor_spotlight_role": "Главен ортодонт",
        "doctor_spotlight_bio": "10 години опит в ортодонтия.",
        "team_note": "Екип от 5 специалиста.",
        "clinic_story": "Основана 2010 г. ...",
        "environment_description": "Модерна апаратура и комфортна среда.",
        "consultation_process": "Преглед, план, опции.",
        "case_library": [
            {
                "title": "Невидими алайнери — 12 месеца",
                "category": "aligners",
                "summary": "Лечение на лек кросбайт.",
                "status": "published",
                "consent_confirmed": True,
            },
            {
                "title": "Без съгласие — draft",
                "category": "aligners",
                "summary": "Не трябва да се появи публично.",
                "status": "draft",
                "consent_confirmed": False,
            },
        ],
    }


def test_16_recos_response_includes_partner_tier(app):
    admin = _run(_admin_cookies(app))
    _patch(app, {"partner_tier": "featured"}, admin)
    lead = _seed_lead()
    data = _recos(app, lead)
    assert data["clinics"], data
    c = [c for c in data["clinics"] if c["id"] == "test-clinic-r1"][0]
    assert c["partner_tier"] == "featured"


def test_17_published_standard_exposes_only_standard_fields(app):
    admin = _run(_admin_cookies(app))
    _patch(app, {
        "partner_tier": "standard",
        "clinic_profile": _published_profile_body(),
    }, admin)
    lead = _seed_lead()
    data = _recos(app, lead)
    c = [c for c in data["clinics"] if c["id"] == "test-clinic-r1"][0]
    p = c.get("clinic_profile")
    assert p is not None
    assert p["short_description"]
    assert p["treatment_focus"]
    # Standard must NOT expose any of these:
    for forbidden in (
        "patient_intro", "hero_image_url", "clinic_video_url",
        "doctor_video_url", "doctor_spotlight_name", "doctor_spotlight_role",
        "doctor_spotlight_bio", "team_note", "clinic_story",
        "environment_description", "consultation_process", "case_library",
    ):
        assert forbidden not in p, f"standard tier leaked {forbidden!r}"


def test_18_published_featured_exposes_no_premium_stack(app):
    admin = _run(_admin_cookies(app))
    _patch(app, {
        "partner_tier": "featured",
        "clinic_profile": _published_profile_body(),
    }, admin)
    lead = _seed_lead()
    data = _recos(app, lead)
    c = [c for c in data["clinics"] if c["id"] == "test-clinic-r1"][0]
    p = c["clinic_profile"]
    assert p["short_description"]
    assert p["patient_intro"]  # featured-allowed
    assert p["treatment_focus"]
    # Premium-only fields must NOT appear:
    for forbidden in (
        "hero_image_url", "clinic_video_url", "doctor_video_url",
        "doctor_spotlight_name", "team_note", "clinic_story",
        "environment_description", "consultation_process", "case_library",
    ):
        assert forbidden not in p, f"featured tier leaked {forbidden!r}"


def test_19_published_premium_exposes_full_stack(app):
    admin = _run(_admin_cookies(app))
    _patch(app, {
        "partner_tier": "premium",
        "clinic_profile": _published_profile_body(),
    }, admin)
    lead = _seed_lead()
    data = _recos(app, lead)
    c = [c for c in data["clinics"] if c["id"] == "test-clinic-r1"][0]
    p = c["clinic_profile"]
    assert p["short_description"]
    assert p["patient_intro"]
    assert p["hero_image_url"]
    assert p["clinic_video_url"]
    assert p["doctor_video_url"]
    assert p["doctor_spotlight_name"] == "Д-р Иванов"
    assert p["doctor_spotlight_role"] == "Главен ортодонт"
    assert p["clinic_story"]
    assert p["environment_description"]
    assert p["consultation_process"]
    assert isinstance(p["case_library"], list)
    # Only published + consent-confirmed should survive (1 of 2).
    assert len(p["case_library"]) == 1
    assert p["case_library"][0]["title"].startswith("Невидими")


def test_20_draft_profile_is_excluded_publicly(app):
    admin = _run(_admin_cookies(app))
    draft = dict(_published_profile_body())
    draft["profile_status"] = "draft"
    _patch(app, {
        "partner_tier": "premium",
        "clinic_profile": draft,
    }, admin)
    lead = _seed_lead()
    data = _recos(app, lead)
    c = [c for c in data["clinics"] if c["id"] == "test-clinic-r1"][0]
    assert c.get("clinic_profile") is None, (
        "draft profile must NOT be exposed publicly"
    )


def test_21_premium_case_without_consent_excluded(app):
    """A case set to status=published but with consent_confirmed=False
    is impossible to create (test_13). But if such a row ever sneaks
    in via legacy data, the read-time filter must still drop it.
    We simulate by writing the doc directly to Mongo.
    """
    import database as _database
    _run(_database.db.clinics.update_one(
        {"id": "test-clinic-r1"},
        {"$set": {
            "partner_tier": "premium",
            "clinic_profile": {
                "profile_status": "published",
                "short_description": "x",
                "treatment_focus": ["aligners"],
                "case_library": [
                    {"id": "c1", "title": "Sneaky", "category": "aligners",
                     "summary": "...", "status": "published",
                     "consent_confirmed": False},
                ],
            },
        }},
    ))
    lead = _seed_lead()
    data = _recos(app, lead)
    c = [c for c in data["clinics"] if c["id"] == "test-clinic-r1"][0]
    # case_library either missing or empty — the row must NOT leak.
    cases = (c.get("clinic_profile") or {}).get("case_library")
    assert cases is None, cases


def test_22_downgrade_preserves_saved_data(app):
    admin = _run(_admin_cookies(app))
    _patch(app, {
        "partner_tier": "premium",
        "clinic_profile": _published_profile_body(),
    }, admin)
    # Downgrade
    r = _patch(app, {"partner_tier": "standard"}, admin)
    assert r.status_code == 200
    # Admin endpoint still returns the full saved blob.
    saved = r.json()["clinic"]["clinic_profile"]
    assert saved["hero_image_url"] == "https://example.com/hero.jpg"
    assert saved["clinic_story"].startswith("Основана")
    assert isinstance(saved["case_library"], list)
    # Public response now hides the premium stack but keeps the
    # standard-tier slice.
    lead = _seed_lead()
    data = _recos(app, lead)
    c = [c for c in data["clinics"] if c["id"] == "test-clinic-r1"][0]
    p = c["clinic_profile"]
    assert p["short_description"]
    assert "hero_image_url" not in p
    assert "case_library" not in p


def test_23_existing_behavior_without_clinic_profile(app):
    """A clinic with no clinic_profile blob must still appear in
    recommended-clinics with the legacy payload shape.
    """
    lead = _seed_lead()
    data = _recos(app, lead)
    c = [c for c in data["clinics"] if c["id"] == "test-clinic-r1"][0]
    assert c["partner_tier"] == "standard"
    assert c.get("clinic_profile") is None
    # Legacy keys still present:
    for k in ("name", "city_name", "treatments", "reason",
              "response_expectation", "placement_label",
              "placement_disclosure"):
        assert k in c


def test_24_public_excludes_internal_fields(app):
    """Public payload must not include `email`, `password_hash`,
    `notification_email`, internal status fields, etc. — even if the
    admin saved a profile.
    """
    admin = _run(_admin_cookies(app))
    _patch(app, {
        "partner_tier": "premium",
        "clinic_profile": _published_profile_body(),
    }, admin)
    lead = _seed_lead()
    data = _recos(app, lead)
    c = [c for c in data["clinics"] if c["id"] == "test-clinic-r1"][0]
    import json
    blob = json.dumps(c, ensure_ascii=False)
    for forbidden in (
        "password_hash", "ClinicPass1!", "notification_email",
        "clinic_status", "subscription_status",
    ):
        assert forbidden not in blob, f"public leaked {forbidden!r}"
