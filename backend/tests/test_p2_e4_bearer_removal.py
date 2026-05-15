"""P2 — Batch E4: cookie-only mode tests (AUTH_REQUIRE_COOKIE=1).

Asserts that when AUTH_REQUIRE_COOKIE=1:
  - admin and clinic login responses do NOT contain access_token / token_type
  - cookies are still set
  - Bearer-only auth is rejected on protected endpoints (401)
  - cookie-only auth works
  - cross-role cookies are rejected
  - logout still clears cookies
  - CSRF Origin guard applies (Bearer cannot bypass)
  - public endpoints unaffected
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

os.environ.setdefault("DB_NAME", "zubite_test_p2_e4")
os.environ.setdefault("APP_ENV", "test")
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"
os.environ.setdefault("RESEND_API_KEY", "test_resend_key_no_network")
os.environ.setdefault("ADMIN_EMAIL", "admin-alerts@example.com")
os.environ["AUTH_COOKIE_SECURE"] = "0"
# Cookie-only mode for this entire suite.
os.environ["AUTH_REQUIRE_COOKIE"] = "1"

_db_name = os.environ.get("DB_NAME", "")
if not (_db_name.startswith("zubite_test") or _db_name.startswith("test_")):
    raise RuntimeError(
        f"Refusing to run: DB_NAME={_db_name!r} is not an isolated test DB."
    )
_env_flag = (
    os.environ.get("APP_ENV") or os.environ.get("ENVIRONMENT")
    or os.environ.get("NODE_ENV") or "development"
).lower().strip()
if _env_flag == "production":
    raise RuntimeError("Refusing to run with APP_ENV=production.")

_BACKEND_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _BACKEND_DIR.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import storage as _storage_mod  # noqa: E402

_storage_mod.init_storage = lambda: None  # type: ignore[assignment]

import resend as _resend  # noqa: E402

_resend.Emails.send = MagicMock(return_value={"id": "test-no-send"})  # type: ignore[assignment]

from httpx import ASGITransport, AsyncClient  # noqa: E402

_LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(_LOOP)


def _run(coro):
    return _LOOP.run_until_complete(coro)


ADMIN_USERNAME = "admin@zubite.bg"
ADMIN_PASSWORD = "TestAdminPass1!"
CLINIC_EMAIL = "clinic-e4@example.com"
CLINIC_PASSWORD = "ClinicE4Pass1!"
ALLOWED_ORIGIN = "https://zubite.bg"

ADMIN_COOKIE = "zubite_admin_session"
CLINIC_COOKIE = "zubite_clinic_session"


@pytest.fixture(scope="module")
def app():
    import server as _server
    return _server.app


def _client(app):
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


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
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        await db.clinics.insert_one(
            {
                "id": str(uuid.uuid4()),
                "clinic_name": "Clinic E4",
                "city": "Sofia",
                "email": CLINIC_EMAIL,
                "phone": "+359888000000",
                "password_hash": hash_password(CLINIC_PASSWORD),
                "status": "active",
                "clinic_status": "active_partner",
                "subscription_status": "active",
                "address": "Test",
                "notification_email": CLINIC_EMAIL,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    async def teardown():
        await _database.client.drop_database(os.environ["DB_NAME"])
        _database.client.close()

    _run(setup())
    yield
    _run(teardown())


@pytest.fixture(autouse=True)
def _reset_state(app):
    import rate_limit as _rl
    import database as _database

    # Re-affirm cookie-only mode for every test (defensive — another file might
    # have flipped the env if pytest is somehow running them together).
    os.environ["AUTH_REQUIRE_COOKIE"] = "1"
    # Pre-warm token cache BEFORE clearing audit_logs so login audit rows
    # don't pollute assertions.
    _run(_admin_creds(app))
    _run(_clinic_creds(app))

    _rl._buckets.clear()
    _run(_database.db.admin_audit_logs.delete_many({}))
    yield
    _rl._buckets.clear()


# ── helpers ───────────────────────────────────────────────────────


_CRED_CACHE: dict[str, tuple[dict, dict]] = {}


async def _admin_creds(app) -> tuple[dict, dict]:
    """Returns (body, cookies_dict) for an admin login. Cached."""
    if "admin" in _CRED_CACHE:
        return _CRED_CACHE["admin"]
    async with _client(app) as c:
        r = await c.post(
            "/api/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        )
    r.raise_for_status()
    _CRED_CACHE["admin"] = (r.json(), dict(r.cookies))
    return _CRED_CACHE["admin"]


async def _clinic_creds(app) -> tuple[dict, dict]:
    if "clinic" in _CRED_CACHE:
        return _CRED_CACHE["clinic"]
    async with _client(app) as c:
        r = await c.post(
            "/api/clinic/login",
            json={"email": CLINIC_EMAIL, "password": CLINIC_PASSWORD},
        )
    r.raise_for_status()
    _CRED_CACHE["clinic"] = (r.json(), dict(r.cookies))
    return _CRED_CACHE["clinic"]


def _cookie(name: str, value: str) -> dict:
    return {"Cookie": f"{name}={value}"}


def _origin(host: str = ALLOWED_ORIGIN) -> dict:
    return {"Origin": host}


# Also issue a clinic JWT manually to test impersonation paths.
def _make_clinic_jwt(sub: str = "clinic-fake") -> str:
    import jwt as _jwt
    from config import JWT_SECRET, JWT_ALGORITHM
    payload = {
        "sub": sub,
        "email": CLINIC_EMAIL,
        "role": "clinic",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return _jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _make_admin_jwt(sub: str = "admin-fake") -> str:
    import jwt as _jwt
    from config import JWT_SECRET, JWT_ALGORITHM
    payload = {
        "sub": sub,
        "username": ADMIN_USERNAME,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return _jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ── 1. Login response shape in cookie-only mode ───────────────────


class TestLoginResponseShape:
    def test_admin_login_omits_access_token(self, app):
        body, cookies = _run(_admin_creds(app))
        assert "access_token" not in body, body
        assert body.get("token_type") != "bearer"
        # `token_type` may either be absent or "cookie" — both are acceptable
        # per spec. Our implementation omits it (exclude_none).
        assert body.get("user", {}).get("username") == ADMIN_USERNAME
        assert ADMIN_COOKIE in cookies

    def test_clinic_login_omits_access_token(self, app):
        body, cookies = _run(_clinic_creds(app))
        assert "access_token" not in body, body
        assert body.get("token_type") != "bearer"
        assert body.get("user", {}).get("email") == CLINIC_EMAIL
        assert CLINIC_COOKIE in cookies

    def test_admin_login_set_cookie_attrs(self, app):
        async def go():
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/login",
                    json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
                )

        r = _run(go())
        raw = r.headers.get("set-cookie", "")
        assert ADMIN_COOKIE in raw
        assert "HttpOnly" in raw
        assert "SameSite=lax" in raw or "SameSite=Lax" in raw

    def test_clinic_login_set_cookie_attrs(self, app):
        async def go():
            async with _client(app) as c:
                return await c.post(
                    "/api/clinic/login",
                    json={"email": CLINIC_EMAIL, "password": CLINIC_PASSWORD},
                )

        r = _run(go())
        raw = r.headers.get("set-cookie", "")
        assert CLINIC_COOKIE in raw
        assert "HttpOnly" in raw


# ── 2. Bearer rejection in cookie-only mode ───────────────────────


class TestBearerRejected:
    def test_admin_endpoint_rejects_bearer_only(self, app):
        """A valid admin JWT supplied via Authorization: Bearer must be
        IGNORED when AUTH_REQUIRE_COOKIE=1. No cookie → 401."""
        async def go():
            tok = _make_admin_jwt()
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers={"Authorization": f"Bearer {tok}"},
                )

        r = _run(go())
        assert r.status_code == 401, r.text

    def test_clinic_endpoint_rejects_bearer_only(self, app):
        async def go():
            tok = _make_clinic_jwt()
            async with _client(app) as c:
                return await c.get(
                    "/api/clinic/dashboard",
                    headers={"Authorization": f"Bearer {tok}"},
                )

        r = _run(go())
        assert r.status_code == 401, r.text

    def test_admin_endpoint_accepts_cookie_only(self, app):
        async def go():
            _, cookies = await _admin_creds(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers=_cookie(ADMIN_COOKIE, cookies[ADMIN_COOKIE]),
                )

        r = _run(go())
        assert r.status_code == 200, r.text

    def test_clinic_endpoint_accepts_cookie_only(self, app):
        async def go():
            _, cookies = await _clinic_creds(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/clinic/dashboard",
                    headers=_cookie(CLINIC_COOKIE, cookies[CLINIC_COOKIE]),
                )

        r = _run(go())
        assert r.status_code == 200, r.text

    def test_bearer_and_cookie_present_cookie_wins_bearer_ignored(self, app):
        """When BOTH are present in cookie-only mode, the cookie path is used
        and Bearer is silently ignored. We assert the request still succeeds
        with the cookie even if Bearer is a junk string."""
        async def go():
            _, cookies = await _admin_creds(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers={
                        "Authorization": "Bearer not.a.valid.jwt.at.all",
                        "Cookie": f"{ADMIN_COOKIE}={cookies[ADMIN_COOKIE]}",
                    },
                )

        r = _run(go())
        assert r.status_code == 200, r.text


# ── 3. Cross-role cookie rejection ────────────────────────────────


class TestRoleSeparation:
    def test_clinic_cookie_cannot_access_admin_endpoint(self, app):
        async def go():
            _, cookies = await _clinic_creds(app)
            async with _client(app) as c:
                impersonation = await c.get(
                    "/api/admin/audit-logs",
                    headers=_cookie(ADMIN_COOKIE, cookies[CLINIC_COOKIE]),
                )
                clinic_only = await c.get(
                    "/api/admin/audit-logs",
                    headers=_cookie(CLINIC_COOKIE, cookies[CLINIC_COOKIE]),
                )
            return impersonation, clinic_only

        impersonation, clinic_only = _run(go())
        assert impersonation.status_code == 403, impersonation.text
        assert clinic_only.status_code == 401, clinic_only.text

    def test_admin_cookie_cannot_access_clinic_endpoint(self, app):
        async def go():
            _, cookies = await _admin_creds(app)
            async with _client(app) as c:
                impersonation = await c.get(
                    "/api/clinic/dashboard",
                    headers=_cookie(CLINIC_COOKIE, cookies[ADMIN_COOKIE]),
                )
                admin_only = await c.get(
                    "/api/clinic/dashboard",
                    headers=_cookie(ADMIN_COOKIE, cookies[ADMIN_COOKIE]),
                )
            return impersonation, admin_only

        impersonation, admin_only = _run(go())
        assert impersonation.status_code == 403, impersonation.text
        assert admin_only.status_code == 401, admin_only.text


# ── 4. Invalid sessions ───────────────────────────────────────────


class TestInvalidSessions:
    def test_expired_cookie_returns_401(self, app):
        import jwt as _jwt
        from config import JWT_SECRET, JWT_ALGORITHM

        async def go():
            expired = _jwt.encode(
                {
                    "sub": "x",
                    "username": ADMIN_USERNAME,
                    "exp": datetime.now(timezone.utc) - timedelta(hours=1),
                },
                JWT_SECRET,
                algorithm=JWT_ALGORITHM,
            )
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers=_cookie(ADMIN_COOKIE, expired),
                )

        r = _run(go())
        assert r.status_code == 401, r.text

    def test_tampered_cookie_returns_401(self, app):
        async def go():
            _, cookies = await _admin_creds(app)
            cookie = cookies[ADMIN_COOKIE]
            parts = cookie.split(".")
            assert len(parts) == 3
            sig = parts[2]
            tampered = ".".join([parts[0], parts[1], ("A" if sig[0] != "A" else "B") + sig[1:]])
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers=_cookie(ADMIN_COOKIE, tampered),
                )

        r = _run(go())
        assert r.status_code == 401, r.text


# ── 5. Logout ─────────────────────────────────────────────────────


class TestLogout:
    def test_admin_logout_clears_cookie(self, app):
        async def go():
            _, cookies = await _admin_creds(app)
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/logout",
                    headers={"Cookie": f"{ADMIN_COOKIE}={cookies[ADMIN_COOKIE]}",
                             **_origin()},
                )

        r = _run(go())
        assert r.status_code == 200, r.text
        raw = r.headers.get("set-cookie", "")
        assert ADMIN_COOKIE in raw
        assert "Max-Age=0" in raw or "expires=" in raw.lower()

    def test_clinic_logout_clears_cookie(self, app):
        async def go():
            _, cookies = await _clinic_creds(app)
            async with _client(app) as c:
                return await c.post(
                    "/api/clinic/logout",
                    headers={"Cookie": f"{CLINIC_COOKIE}={cookies[CLINIC_COOKIE]}",
                             **_origin()},
                )

        r = _run(go())
        assert r.status_code == 200, r.text
        raw = r.headers.get("set-cookie", "")
        assert CLINIC_COOKIE in raw


# ── 6. CSRF guard cannot be bypassed in cookie-only mode ──────────


class TestCsrf:
    def test_cookie_auth_post_with_allowed_origin_succeeds(self, app):
        async def go():
            _, cookies = await _admin_creds(app)
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/calls/cleanup-stuck",
                    headers={
                        "Cookie": f"{ADMIN_COOKIE}={cookies[ADMIN_COOKIE]}",
                        **_origin(),
                    },
                )

        r = _run(go())
        assert r.status_code == 200, r.text

    def test_cookie_auth_post_without_origin_returns_403(self, app):
        async def go():
            _, cookies = await _admin_creds(app)
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/calls/cleanup-stuck",
                    headers={"Cookie": f"{ADMIN_COOKIE}={cookies[ADMIN_COOKIE]}"},
                )

        r = _run(go())
        assert r.status_code == 403, r.text

    def test_cookie_auth_post_with_evil_origin_returns_403(self, app):
        async def go():
            _, cookies = await _admin_creds(app)
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/calls/cleanup-stuck",
                    headers={
                        "Cookie": f"{ADMIN_COOKIE}={cookies[ADMIN_COOKIE]}",
                        "Origin": "https://evil.example.com",
                    },
                )

        r = _run(go())
        assert r.status_code == 403, r.text

    def test_bearer_only_post_cannot_bypass_csrf_in_cookie_only_mode(self, app):
        """E1 had a Bearer-bypass for CSRF. In E4 cookie-only mode the Bearer
        path is ignored at the auth gate FIRST → 401 BEFORE CSRF logic runs.
        This proves there is no bypass available."""
        async def go():
            tok = _make_admin_jwt()
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/calls/cleanup-stuck",
                    headers={"Authorization": f"Bearer {tok}"},
                )

        r = _run(go())
        assert r.status_code == 401, r.text


# ── 7. Public endpoints unaffected ────────────────────────────────


class TestPublicUnaffected:
    def test_lead_submit_unaffected(self, app):
        async def go():
            async with _client(app) as c:
                return await c.post(
                    "/api/leads",
                    json={
                        "name": "E4 Test",
                        "email": "e4-lead@example.com",
                        "phone": "+359888222000",
                        "city_slug": "sofia",
                        "treatment_type": "orthodontics",
                        "answers": {"q1": "a"},
                        "score": 5,
                        "band": "GREEN",
                        "form_version": "v1",
                    },
                )

        r = _run(go())
        assert r.status_code in (200, 201, 422), r.text

    def test_analytics_event_unaffected(self, app):
        async def go():
            async with _client(app) as c:
                return await c.post(
                    "/api/analytics/events",
                    json={"event": "quiz_started", "session_id": str(uuid.uuid4())},
                )

        r = _run(go())
        assert r.status_code in (200, 201, 422), r.text


# ── 8. Sanity — flipping the flag mid-process exposes Bearer again ─


class TestEnvFlagSemantics:
    def test_flag_off_restores_bearer(self, app):
        """Confirm the auth gate re-reads AUTH_REQUIRE_COOKIE each call —
        this is the rollback semantics. We flip it off, hit a protected admin
        endpoint with a valid Bearer JWT (no cookie), expect 200. Flip back on."""
        async def go():
            try:
                tok = _make_admin_jwt(sub="rollback-admin")
                # We need a real admin user matching the JWT sub for AdminUser
                # construction to succeed. The sub is decoded but not verified
                # against the DB on the admin path, so any sub works.
                os.environ["AUTH_REQUIRE_COOKIE"] = "0"
                async with _client(app) as c:
                    r = await c.get(
                        "/api/admin/audit-logs",
                        headers={"Authorization": f"Bearer {tok}"},
                    )
                return r
            finally:
                os.environ["AUTH_REQUIRE_COOKIE"] = "1"

        r = _run(go())
        assert r.status_code == 200, r.text
