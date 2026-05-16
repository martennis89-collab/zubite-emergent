"""Clinic review collection + moderation (R1).

Covers public submission, clinic-portal listing/link, and admin
moderation queue. No QR generation in R1 — pure URL.
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

os.environ.setdefault("DB_NAME", "zubite_test_clinic_reviews_r1")
os.environ.setdefault("APP_ENV", "test")
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"
os.environ.setdefault("RESEND_API_KEY", "test_resend_key_no_network")
os.environ.setdefault("ADMIN_EMAIL", "admin-alerts@example.com")
os.environ["AUTH_COOKIE_SECURE"] = "0"
os.environ.setdefault("PUBLIC_BASE_URL", "https://zubite.bg")

_db = os.environ.get("DB_NAME", "")
if not (_db.startswith("zubite_test") or _db.startswith("test_")):
    raise RuntimeError(f"Refusing: DB_NAME={_db!r}")

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
        await _database.db.clinic_reviews.delete_many({})
        await _database.db.clinics.delete_many({})
        await _database.db.admin_users.delete_many({})

    _rl._buckets.clear()
    _run(wipe())
    yield


# ─── Helpers ──────────────────────────────────────────────────────

async def _seed_clinic(cid="c-rev-1", name="Тест Ревю Клиника"):
    import auth as _auth
    import database as _database
    await _database.db.clinics.insert_one({
        "id": cid,
        "clinic_name": name,
        "name": name,
        "city": "Sofia",
        "city_name": "София",
        "city_slug": "sofia",
        "is_active": True,
        "clinic_status": "active_partner",
        "subscription_status": "active",
        "status": "active",
        "phone": "+359888000000",
        "email": f"{cid}@example.com",
        "password_hash": _auth.hash_password("Clinic1234!"),
    })
    return cid


def _admin_login(app):
    import auth as _auth
    import database as _database

    async def ensure():
        await _database.db.admin_users.update_one(
            {"username": "admin@zubite.bg"},
            {"$set": {
                "id": "admin-1", "username": "admin@zubite.bg",
                "password_hash": _auth.hash_password("password"),
                "role": "admin", "is_active": True,
            }}, upsert=True,
        )
    _run(ensure())

    async def go():
        async with _client(app) as c:
            return await c.post("/api/admin/login", json={
                "username": "admin@zubite.bg", "password": "password",
            })
    r = _run(go())
    assert r.status_code == 200, r.text
    return r.json().get("token") or r.json().get("access_token")


def _clinic_login(app, email):
    async def go():
        async with _client(app) as c:
            return await c.post("/api/clinic/login", json={
                "email": email, "password": "Clinic1234!",
            })
    r = _run(go())
    assert r.status_code == 200, r.text
    return r.json().get("token") or r.json().get("access_token")


# ─── PUBLIC submission ────────────────────────────────────────────

def test_public_review_info_returns_clinic(app):
    _run(_seed_clinic())
    async def go():
        async with _client(app) as c:
            return await c.get("/api/public/clinics/c-rev-1/review-info")
    r = _run(go())
    assert r.status_code == 200
    d = r.json()
    assert d["clinic_id"] == "c-rev-1"
    assert d["clinic_name"] == "Тест Ревю Клиника"
    assert d["review_url"].endswith("/review/clinic/c-rev-1")


def test_public_review_info_404_for_unknown(app):
    async def go():
        async with _client(app) as c:
            return await c.get("/api/public/clinics/no-such/review-info")
    r = _run(go())
    assert r.status_code == 404


def test_public_review_submission_success(app):
    _run(_seed_clinic())
    async def go():
        async with _client(app) as c:
            return await c.post("/api/public/clinics/c-rev-1/reviews", json={
                "rating_overall": 5,
                "feedback_text": "Много добро отношение и обяснение.",
                "consent_public_display": True,
            })
    r = _run(go())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert "прегледана" in body["message"]

    import database as _database
    doc = _run(_database.db.clinic_reviews.find_one({"id": body["review_id"]}))
    assert doc["status"] == "pending"
    assert doc["display_permission"] is False
    assert doc["clinic_id"] == "c-rev-1"
    assert doc["rating_overall"] == 5


def test_public_review_required_fields_validation(app):
    _run(_seed_clinic())
    async def go(body):
        async with _client(app) as c:
            return await c.post("/api/public/clinics/c-rev-1/reviews", json=body)
    # too short feedback
    r = _run(go({"rating_overall": 5, "feedback_text": "ok", "consent_public_display": True}))
    assert r.status_code == 422
    # rating out of range
    r = _run(go({"rating_overall": 6, "feedback_text": "validvalidvalid", "consent_public_display": True}))
    assert r.status_code == 422
    # rating below 1
    r = _run(go({"rating_overall": 0, "feedback_text": "validvalidvalid", "consent_public_display": True}))
    assert r.status_code == 422


def test_public_review_for_unknown_clinic_404(app):
    async def go():
        async with _client(app) as c:
            return await c.post("/api/public/clinics/missing/reviews", json={
                "rating_overall": 4, "feedback_text": "Nice clinic experience", "consent_public_display": True,
            })
    r = _run(go())
    assert r.status_code == 404


def test_public_review_html_is_escaped(app):
    _run(_seed_clinic())
    payload = {
        "rating_overall": 4,
        "feedback_text": "<script>alert(1)</script> Хубаво беше всичко наред.",
        "patient_name_optional": "<b>Иван</b> Петров",
        "consent_public_display": True,
    }
    async def go():
        async with _client(app) as c:
            return await c.post("/api/public/clinics/c-rev-1/reviews", json=payload)
    r = _run(go())
    assert r.status_code == 200, r.text
    import database as _database
    doc = _run(_database.db.clinic_reviews.find_one({"id": r.json()["review_id"]}))
    assert "<script>" not in doc["feedback_text"]
    assert "&lt;script&gt;" in doc["feedback_text"]
    # initials computed even though name had HTML
    assert doc["patient_initials_public"]


def test_public_review_consent_false_still_stored_pending(app):
    """We do not block submission when public-display consent is false —
    the patient may still want to send a private note. The review will
    simply never be eligible for public display."""
    _run(_seed_clinic())
    async def go():
        async with _client(app) as c:
            return await c.post("/api/public/clinics/c-rev-1/reviews", json={
                "rating_overall": 3,
                "feedback_text": "Без публикуване, но искам да споделя нещо.",
                "consent_public_display": False,
            })
    r = _run(go())
    assert r.status_code == 200
    import database as _database
    doc = _run(_database.db.clinic_reviews.find_one({"id": r.json()["review_id"]}))
    assert doc["status"] == "pending"
    assert doc["consent_public_display"] is False


def test_public_review_optional_contact_fields(app):
    _run(_seed_clinic())
    async def go():
        async with _client(app) as c:
            return await c.post("/api/public/clinics/c-rev-1/reviews", json={
                "rating_overall": 4,
                "feedback_text": "Преглед мина добре, благодаря на екипа.",
                "consent_public_display": True,
                "patient_contact_optional": "+359888999111",
                "consent_contact_if_needed": True,
            })
    r = _run(go())
    assert r.status_code == 200
    import database as _database
    doc = _run(_database.db.clinic_reviews.find_one({"id": r.json()["review_id"]}))
    assert doc["patient_contact_optional"] == "+359888999111"
    assert doc["consent_contact_if_needed"] is True


def test_public_review_rate_limit(app):
    _run(_seed_clinic())
    async def submit(i):
        async with _client(app) as c:
            return await c.post("/api/public/clinics/c-rev-1/reviews", json={
                "rating_overall": 5,
                "feedback_text": f"Review number {i} is detailed enough text.",
                "consent_public_display": True,
            })
    for i in range(3):
        r = _run(submit(i))
        assert r.status_code == 200, f"#{i} {r.text}"
    r4 = _run(submit(4))
    assert r4.status_code == 429


# ─── CLINIC portal ────────────────────────────────────────────────

def test_clinic_collection_link(app):
    _run(_seed_clinic("c-link-1", name="Linkclinic"))
    token = _clinic_login(app, "c-link-1@example.com")
    async def go():
        async with _client(app) as c:
            return await c.get("/api/clinic/reviews/collection-link",
                               headers={"Authorization": f"Bearer {token}"})
    r = _run(go())
    assert r.status_code == 200
    body = r.json()
    assert body["clinic_id"] == "c-link-1"
    assert body["review_url"].endswith("/review/clinic/c-link-1")
    assert body["qr_status"] == "pending_dependency_decision"
    assert body["counts"] == {"pending": 0, "approved": 0, "rejected": 0}


def test_clinic_only_sees_own_reviews(app):
    import database as _database
    _run(_seed_clinic("c-a", name="A"))
    _run(_seed_clinic("c-b", name="B"))
    _run(_database.db.clinic_reviews.insert_many([
        {"id": "r-a", "clinic_id": "c-a", "status": "pending", "feedback_text": "A1", "submitted_at": "2026-01-01T00:00:00+00:00"},
        {"id": "r-b", "clinic_id": "c-b", "status": "pending", "feedback_text": "B1", "submitted_at": "2026-01-02T00:00:00+00:00"},
    ]))
    token = _clinic_login(app, "c-a@example.com")
    async def go():
        async with _client(app) as c:
            return await c.get("/api/clinic/reviews",
                               headers={"Authorization": f"Bearer {token}"})
    r = _run(go())
    assert r.status_code == 200
    ids = [x["id"] for x in r.json()["reviews"]]
    assert ids == ["r-a"]


def test_clinic_cannot_moderate(app):
    _run(_seed_clinic("c-mod-1"))
    token = _clinic_login(app, "c-mod-1@example.com")
    async def go():
        async with _client(app) as c:
            return await c.post("/api/admin/reviews/r-x/approve", json={},
                                headers={"Authorization": f"Bearer {token}"})
    r = _run(go())
    assert r.status_code in (401, 403)


def test_unauthenticated_cannot_list_clinic_reviews(app):
    async def go():
        async with _client(app) as c:
            return await c.get("/api/clinic/reviews")
    r = _run(go())
    assert r.status_code in (401, 403)


# ─── ADMIN moderation ─────────────────────────────────────────────

def test_admin_list_pending(app):
    import database as _database
    _run(_seed_clinic("c-m1", name="ModClinic"))
    _run(_database.db.clinic_reviews.insert_many([
        {"id": "rp1", "clinic_id": "c-m1", "status": "pending", "feedback_text": "p", "submitted_at": "2026-01-01T00:00:00+00:00"},
        {"id": "ra1", "clinic_id": "c-m1", "status": "approved", "feedback_text": "a", "submitted_at": "2026-01-02T00:00:00+00:00"},
        {"id": "rr1", "clinic_id": "c-m1", "status": "rejected", "feedback_text": "r", "submitted_at": "2026-01-03T00:00:00+00:00"},
    ]))
    token = _admin_login(app)
    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/reviews?status=pending",
                               headers={"Authorization": f"Bearer {token}"})
    r = _run(go())
    assert r.status_code == 200, r.text
    body = r.json()
    assert [x["id"] for x in body["reviews"]] == ["rp1"]
    assert body["counts"] == {"pending": 1, "approved": 1, "rejected": 1}
    # clinic_name attached
    assert body["reviews"][0]["clinic_name"] == "ModClinic"


def test_admin_approve_sets_metadata(app):
    import database as _database
    _run(_seed_clinic("c-app", name="AppClinic"))
    _run(_database.db.clinic_reviews.insert_one({
        "id": "rid-app", "clinic_id": "c-app", "status": "pending",
        "feedback_text": "Хубава клиника.", "submitted_at": "2026-01-04T00:00:00+00:00",
        "consent_public_display": True,
    }))
    token = _admin_login(app)
    async def go():
        async with _client(app) as c:
            return await c.post("/api/admin/reviews/rid-app/approve",
                                json={"moderation_notes": "Изглежда автентично"},
                                headers={"Authorization": f"Bearer {token}"})
    r = _run(go())
    assert r.status_code == 200, r.text
    rev = r.json()["review"]
    assert rev["status"] == "approved"
    assert rev["moderated_by"] == "admin-1"
    assert rev["moderated_at"]
    assert rev["display_permission"] is True


def test_admin_reject_sets_metadata(app):
    import database as _database
    _run(_seed_clinic("c-rej", name="RejClinic"))
    _run(_database.db.clinic_reviews.insert_one({
        "id": "rid-rej", "clinic_id": "c-rej", "status": "pending",
        "feedback_text": "...", "submitted_at": "2026-01-05T00:00:00+00:00",
        "consent_public_display": True,
    }))
    token = _admin_login(app)
    async def go():
        async with _client(app) as c:
            return await c.post("/api/admin/reviews/rid-rej/reject",
                                json={"moderation_notes": "Spam"},
                                headers={"Authorization": f"Bearer {token}"})
    r = _run(go())
    assert r.status_code == 200
    rev = r.json()["review"]
    assert rev["status"] == "rejected"
    assert rev["moderated_by"] == "admin-1"
    assert rev["display_permission"] is False


def test_admin_approve_without_consent_no_display_permission(app):
    import database as _database
    _run(_seed_clinic("c-noconsent"))
    _run(_database.db.clinic_reviews.insert_one({
        "id": "rid-nc", "clinic_id": "c-noconsent", "status": "pending",
        "feedback_text": "...", "submitted_at": "2026-01-06T00:00:00+00:00",
        "consent_public_display": False,
    }))
    token = _admin_login(app)
    async def go():
        async with _client(app) as c:
            return await c.post("/api/admin/reviews/rid-nc/approve", json={},
                                headers={"Authorization": f"Bearer {token}"})
    r = _run(go())
    assert r.status_code == 200
    assert r.json()["review"]["display_permission"] is False


def test_admin_filter_by_clinic(app):
    import database as _database
    _run(_seed_clinic("c-x"))
    _run(_seed_clinic("c-y"))
    _run(_database.db.clinic_reviews.insert_many([
        {"id": "rxx", "clinic_id": "c-x", "status": "pending", "feedback_text": ".", "submitted_at": "2026-01-01T00:00:00+00:00"},
        {"id": "ryy", "clinic_id": "c-y", "status": "pending", "feedback_text": ".", "submitted_at": "2026-01-02T00:00:00+00:00"},
    ]))
    token = _admin_login(app)
    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/reviews?clinic_id=c-y",
                               headers={"Authorization": f"Bearer {token}"})
    r = _run(go())
    assert r.status_code == 200
    assert [x["id"] for x in r.json()["reviews"]] == ["ryy"]


def test_admin_unauth_cannot_moderate(app):
    async def go():
        async with _client(app) as c:
            return await c.post("/api/admin/reviews/anything/approve", json={})
    r = _run(go())
    assert r.status_code in (401, 403)


def test_admin_get_single_review(app):
    import database as _database
    _run(_seed_clinic("c-get", name="GetClinic"))
    _run(_database.db.clinic_reviews.insert_one({
        "id": "rid-get", "clinic_id": "c-get", "status": "pending",
        "feedback_text": "detailed feedback text here", "submitted_at": "2026-01-09T00:00:00+00:00",
        "patient_contact_optional": "+359111", "consent_public_display": True,
    }))
    token = _admin_login(app)
    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/reviews/rid-get",
                               headers={"Authorization": f"Bearer {token}"})
    r = _run(go())
    assert r.status_code == 200
    body = r.json()
    assert body["clinic_name"] == "GetClinic"
    assert body["patient_contact_optional"] == "+359111"


def test_admin_invalid_status_filter_400(app):
    token = _admin_login(app)
    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/reviews?status=weird",
                               headers={"Authorization": f"Bearer {token}"})
    r = _run(go())
    assert r.status_code == 400


def test_review_not_found_404(app):
    token = _admin_login(app)
    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/reviews/no-such-id",
                               headers={"Authorization": f"Bearer {token}"})
    r = _run(go())
    assert r.status_code == 404
