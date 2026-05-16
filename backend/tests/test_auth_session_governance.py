"""Auth Batch E5 — Session Governance tests (Feb 2026).

Validates the server-side `auth_sessions` machinery:
- jti is added to admin/clinic JWTs
- a matching session row is created on login
- protected routes look up the session by jti and reject revoked /
  expired / cross-role / mismatched-user tokens
- /admin/logout and /clinic/logout revoke the current jti
- /admin/logout-all and /clinic/logout-all revoke every active session
  for that user
- legacy pre-E5 tokens (no jti) are rejected
- public routes remain public
"""
from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta

import httpx
import jwt as _jwt
import pytest

os.environ.setdefault("DB_NAME", "zubite_test_e5_session_gov")

from server import app as _app  # noqa: E402
from auth import hash_password, create_token, create_clinic_token  # noqa: E402
from config import JWT_SECRET, JWT_ALGORITHM  # noqa: E402
import database as _database  # noqa: E402


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@pytest.fixture(autouse=True)
def _wipe():
    async def go():
        await _database.db.clinics.delete_many({})
        await _database.db.admin_users.delete_many({})
        await _database.db.auth_sessions.delete_many({})
        await _database.db.audit_log.delete_many({})
        await _database.db.leads.delete_many({})
    _run(go())
    yield
    _run(go())


@pytest.fixture
def app():
    return _app


def _client(app):
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t")


# ─── Seeders ────────────────────────────────────────────────

async def _seed_admin(username: str = "admin-e5", password: str = "Pass1234!") -> str:
    aid = str(uuid.uuid4())
    await _database.db.admin_users.insert_one({
        "id": aid,
        "username": username,
        "email": f"{username}@example.com",
        "password_hash": hash_password(password),
        "role": "admin",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return aid


async def _seed_clinic(email: str = "clinic-e5@example.com", password: str = "Pass1234!") -> str:
    cid = str(uuid.uuid4())
    await _database.db.clinics.insert_one({
        "id": cid,
        "clinic_name": "E5 Clinic",
        "name": "E5 Clinic",
        "city": "Sofia", "city_slug": "sofia", "city_name": "София",
        "email": email, "phone": "+35920000000",
        "password_hash": hash_password(password),
        "treatments_supported": ["alaynery"],
        "treatments_offered": ["alaynery"],
        "status": "active", "is_active": True,
        "clinic_status": "evaluation_partner",
        "subscription_status": "trial",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return cid


def _decode(token: str) -> dict:
    return _jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


# ─── Login & session creation ────────────────────────────────────

def test_admin_login_creates_session_and_jti(app):
    _run(_seed_admin())
    async def go():
        async with _client(app) as c:
            return await c.post("/api/admin/login", json={"username": "admin-e5", "password": "Pass1234!"})
    r = _run(go())
    assert r.status_code == 200
    token = r.json()["access_token"]
    jti = _decode(token).get("jti")
    assert jti
    sess = _run(_database.db.auth_sessions.find_one({"jti": jti}))
    assert sess is not None
    assert sess["user_type"] == "admin"
    assert sess["revoked_at"] is None


def test_clinic_login_creates_session_and_jti(app):
    _run(_seed_clinic())
    async def go():
        async with _client(app) as c:
            return await c.post("/api/clinic/login", json={"email": "clinic-e5@example.com", "password": "Pass1234!"})
    r = _run(go())
    assert r.status_code == 200
    token = r.json()["access_token"]
    jti = _decode(token).get("jti")
    assert jti
    sess = _run(_database.db.auth_sessions.find_one({"jti": jti}))
    assert sess is not None
    assert sess["user_type"] == "clinic"
    assert sess["revoked_at"] is None


# ─── Protected route validation ──────────────────────────────────

def test_valid_admin_session_can_call_protected(app):
    aid = _run(_seed_admin())
    token, _ = _run(create_token(aid, "admin-e5"))
    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/me", headers={"Authorization": f"Bearer {token}"})
    assert _run(go()).status_code == 200


def test_valid_clinic_session_can_call_protected(app):
    cid = _run(_seed_clinic())
    token, _ = _run(create_clinic_token(cid, "clinic-e5@example.com"))
    async def go():
        async with _client(app) as c:
            return await c.get("/api/clinic/profile", headers={"Authorization": f"Bearer {token}"})
    r = _run(go())
    assert r.status_code == 200, r.text


def test_token_without_jti_is_rejected(app):
    aid = _run(_seed_admin())
    payload = {
        "sub": aid, "username": "admin-e5", "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    legacy = _jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/me", headers={"Authorization": f"Bearer {legacy}"})
    assert _run(go()).status_code == 401


def test_unknown_jti_is_rejected(app):
    aid = _run(_seed_admin())
    payload = {
        "sub": aid, "username": "admin-e5", "role": "admin",
        "jti": "no-such-jti",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    bogus = _jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/me", headers={"Authorization": f"Bearer {bogus}"})
    assert _run(go()).status_code == 401


def test_revoked_session_is_rejected(app):
    aid = _run(_seed_admin())
    token, jti = _run(create_token(aid, "admin-e5"))
    _run(_database.db.auth_sessions.update_one(
        {"jti": jti}, {"$set": {"revoked_at": datetime.now(timezone.utc).isoformat(),
                                 "revoked_reason": "manual"}},
    ))
    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/me", headers={"Authorization": f"Bearer {token}"})
    assert _run(go()).status_code == 401


def test_expired_session_is_rejected(app):
    aid = _run(_seed_admin())
    token, jti = _run(create_token(aid, "admin-e5"))
    past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    _run(_database.db.auth_sessions.update_one(
        {"jti": jti}, {"$set": {"expires_at": past}},
    ))
    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/me", headers={"Authorization": f"Bearer {token}"})
    assert _run(go()).status_code == 401


# ─── Cross-role rejection ────────────────────────────────────────

def test_admin_token_cannot_access_clinic_route(app):
    aid = _run(_seed_admin())
    _run(_seed_clinic())
    token, _ = _run(create_token(aid, "admin-e5"))
    async def go():
        async with _client(app) as c:
            return await c.get("/api/clinic/profile", headers={"Authorization": f"Bearer {token}"})
    assert _run(go()).status_code == 403


def test_clinic_token_cannot_access_admin_route(app):
    cid = _run(_seed_clinic())
    _run(_seed_admin())
    token, _ = _run(create_clinic_token(cid, "clinic-e5@example.com"))
    async def go():
        async with _client(app) as c:
            return await c.get("/api/admin/me", headers={"Authorization": f"Bearer {token}"})
    assert _run(go()).status_code == 403


# ─── Logout (single session) ─────────────────────────────────────

def test_admin_logout_revokes_current_session(app):
    aid = _run(_seed_admin())
    token, jti = _run(create_token(aid, "admin-e5"))
    async def go():
        async with _client(app) as c:
            r1 = await c.post("/api/admin/logout", headers={"Authorization": f"Bearer {token}"})
            r2 = await c.get("/api/admin/me", headers={"Authorization": f"Bearer {token}"})
            return r1, r2
    r1, r2 = _run(go())
    assert r1.status_code == 200
    assert r1.json().get("revoked") is True
    assert r2.status_code == 401
    sess = _run(_database.db.auth_sessions.find_one({"jti": jti}))
    assert sess["revoked_at"] is not None


def test_clinic_logout_revokes_current_session(app):
    cid = _run(_seed_clinic())
    token, jti = _run(create_clinic_token(cid, "clinic-e5@example.com"))
    async def go():
        async with _client(app) as c:
            r1 = await c.post("/api/clinic/logout", headers={"Authorization": f"Bearer {token}"})
            r2 = await c.get("/api/clinic/profile", headers={"Authorization": f"Bearer {token}"})
            return r1, r2
    r1, r2 = _run(go())
    assert r1.status_code == 200
    assert r1.json().get("revoked") is True
    assert r2.status_code == 401


# ─── Logout-all ──────────────────────────────────────────────────

def test_admin_logout_all_revokes_all_sessions_for_user(app):
    aid = _run(_seed_admin())
    t1, j1 = _run(create_token(aid, "admin-e5"))
    t2, j2 = _run(create_token(aid, "admin-e5"))
    t3, j3 = _run(create_token(aid, "admin-e5"))
    # Another admin — should NOT be touched.
    other_id = _run(_seed_admin(username="other-admin"))
    t_other, j_other = _run(create_token(other_id, "other-admin"))

    async def go():
        async with _client(app) as c:
            r = await c.post("/api/admin/logout-all", headers={"Authorization": f"Bearer {t1}"})
            r2 = await c.get("/api/admin/me", headers={"Authorization": f"Bearer {t2}"})
            r_other = await c.get("/api/admin/me", headers={"Authorization": f"Bearer {t_other}"})
            return r, r2, r_other
    r, r2, r_other = _run(go())
    assert r.status_code == 200
    assert r.json()["revoked_count"] >= 3
    # All three of this admin's tokens are dead.
    for t in (t1, t2, t3):
        sess = _run(_database.db.auth_sessions.find_one(
            {"jti": _decode(t)["jti"]}
        ))
        assert sess["revoked_at"] is not None
    # The other admin's session is still alive.
    assert r2.status_code == 401
    assert r_other.status_code == 200


def test_clinic_logout_all_isolates_per_clinic(app):
    cid_a = _run(_seed_clinic(email="clinic-a@example.com"))
    cid_b = _run(_seed_clinic(email="clinic-b@example.com"))
    ta1, _ = _run(create_clinic_token(cid_a, "clinic-a@example.com"))
    ta2, _ = _run(create_clinic_token(cid_a, "clinic-a@example.com"))
    tb1, _ = _run(create_clinic_token(cid_b, "clinic-b@example.com"))

    async def go():
        async with _client(app) as c:
            r = await c.post("/api/clinic/logout-all", headers={"Authorization": f"Bearer {ta1}"})
            r2 = await c.get("/api/clinic/profile", headers={"Authorization": f"Bearer {ta2}"})
            r_b = await c.get("/api/clinic/profile", headers={"Authorization": f"Bearer {tb1}"})
            return r, r2, r_b
    r, r2, r_b = _run(go())
    assert r.status_code == 200
    assert r.json()["revoked_count"] >= 2
    assert r2.status_code == 401
    assert r_b.status_code == 200


# ─── Cleanup helper ──────────────────────────────────────────────

def test_cleanup_expired_sessions(app):
    aid = _run(_seed_admin())
    _t1, j1 = _run(create_token(aid, "admin-e5"))
    _t2, j2 = _run(create_token(aid, "admin-e5"))
    # Force one session to have already expired
    past = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    _run(_database.db.auth_sessions.update_one({"jti": j1}, {"$set": {"expires_at": past}}))

    # Use the still-valid token to call the cleanup endpoint.
    fresh_token, _ = _run(create_token(aid, "admin-e5"))
    async def go():
        async with _client(app) as c:
            return await c.post(
                "/api/admin/auth-sessions/cleanup-expired",
                headers={"Authorization": f"Bearer {fresh_token}"},
            )
    r = _run(go())
    assert r.status_code == 200
    assert r.json()["revoked_count"] >= 1
    sess = _run(_database.db.auth_sessions.find_one({"jti": j1}))
    assert sess["revoked_at"] is not None
    assert sess["revoked_reason"] == "expired"


# ─── Public routes remain public ─────────────────────────────────

def test_public_routes_do_not_require_session(app):
    async def go():
        async with _client(app) as c:
            r1 = await c.get("/api/public/clinics/no-such-clinic/review-info")
            r2 = await c.get("/api/public/clinics/no-such-clinic/reviews")
            return r1, r2
    r1, r2 = _run(go())
    # Both return safe statuses (404), proving no auth gate.
    assert r1.status_code == 404
    assert r2.status_code == 404
