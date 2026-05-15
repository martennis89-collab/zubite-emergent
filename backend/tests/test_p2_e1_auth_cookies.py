"""P2 — Batch E1: cookie-or-Bearer auth tests.

In-process tests against the auth additions:
  - admin/clinic login sets httpOnly cookie (Secure, SameSite=Lax)
  - cookie auth works on admin/clinic protected endpoints
  - Bearer auth still works (backward compat)
  - Bearer takes precedence when both are present
  - cross-role cookie usage is rejected
  - tampered/expired cookies → 401
  - admin/clinic logout endpoints clear cookie + emit audit
  - CSRF Origin guard applies only to cookie-auth state-changing requests
  - Bearer-auth bypasses CSRF
  - safe GET routes do not require CSRF
  - public endpoints (lead submit / analytics / blog view) unaffected
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

os.environ.setdefault("DB_NAME", "zubite_test_p2_e1")
os.environ.setdefault("APP_ENV", "test")
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"
os.environ.setdefault("RESEND_API_KEY", "test_resend_key_no_network")
os.environ.setdefault("ADMIN_EMAIL", "admin-alerts@example.com")
# Disable Secure flag so the in-process ASGI client (http://testserver)
# can receive the cookie without TLS shenanigans.
os.environ["AUTH_COOKIE_SECURE"] = "0"

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
CLINIC_EMAIL = "clinic-e1@example.com"
CLINIC_PASSWORD = "ClinicE1Pass1!"
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
                "clinic_name": "Clinic E1",
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
def _reset_state():
    import rate_limit as _rl
    import database as _database

    _rl._buckets.clear()
    _run(_database.db.admin_audit_logs.delete_many({}))
    yield
    _rl._buckets.clear()


# ── helpers ───────────────────────────────────────────────────────


async def _admin_login(app) -> tuple[str, dict]:
    """Returns (bearer_token, set_cookies_dict)."""
    async with _client(app) as c:
        r = await c.post(
            "/api/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        )
    r.raise_for_status()
    return r.json()["access_token"], dict(r.cookies)


async def _clinic_login(app) -> tuple[str, dict]:
    async with _client(app) as c:
        r = await c.post(
            "/api/clinic/login",
            json={"email": CLINIC_EMAIL, "password": CLINIC_PASSWORD},
        )
    r.raise_for_status()
    return r.json()["access_token"], dict(r.cookies)


def _cookie_header(name: str, value: str) -> dict:
    return {"Cookie": f"{name}={value}"}


def _origin(host: str = ALLOWED_ORIGIN) -> dict:
    return {"Origin": host}


# ── 1. Admin cookie login ─────────────────────────────────────────


class TestAdminCookieLogin:
    def test_login_sets_httponly_cookie_with_lax_samesite(self, app):
        async def go():
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/login",
                    json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
                )

        r = _run(go())
        assert r.status_code == 200, r.text
        # httpx exposes Set-Cookie as list under 'set-cookie' (case-insensitive).
        raw = r.headers.get("set-cookie", "")
        assert ADMIN_COOKIE in raw
        assert "HttpOnly" in raw
        assert "SameSite=lax" in raw or "SameSite=Lax" in raw
        # AUTH_COOKIE_SECURE=0 was set at module load → Secure must NOT appear.
        assert "Secure" not in raw
        # Path should be /
        assert "Path=/" in raw

    def test_login_response_still_returns_access_token_in_e1(self, app):
        async def go():
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/login",
                    json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
                )

        r = _run(go())
        body = r.json()
        assert "access_token" in body and isinstance(body["access_token"], str) and len(body["access_token"]) > 20
        assert "user" in body and body["user"]["username"] == ADMIN_USERNAME

    def test_admin_endpoint_works_with_cookie_only(self, app):
        async def go():
            _, cookies = await _admin_login(app)
            cookie = cookies[ADMIN_COOKIE]
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers=_cookie_header(ADMIN_COOKIE, cookie),
                )

        r = _run(go())
        assert r.status_code == 200, r.text

    def test_admin_endpoint_works_with_bearer_only(self, app):
        async def go():
            token, _ = await _admin_login(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 200, r.text

    def test_bearer_precedence_when_both_present(self, app):
        """If Bearer header is present, it must win even if a (different)
        cookie is also sent. Verified by sending a junk cookie + a valid Bearer
        — the endpoint must succeed."""
        async def go():
            token, _ = await _admin_login(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Cookie": f"{ADMIN_COOKIE}=not.a.valid.jwt",
                    },
                )

        r = _run(go())
        assert r.status_code == 200, r.text

    def test_missing_credentials_returns_401(self, app):
        async def go():
            async with _client(app) as c:
                return await c.get("/api/admin/audit-logs")

        r = _run(go())
        assert r.status_code == 401, r.text


# ── 2. Clinic cookie login ────────────────────────────────────────


class TestClinicCookieLogin:
    def test_login_sets_httponly_cookie(self, app):
        async def go():
            async with _client(app) as c:
                return await c.post(
                    "/api/clinic/login",
                    json={"email": CLINIC_EMAIL, "password": CLINIC_PASSWORD},
                )

        r = _run(go())
        assert r.status_code == 200, r.text
        raw = r.headers.get("set-cookie", "")
        assert CLINIC_COOKIE in raw
        assert "HttpOnly" in raw
        assert "SameSite=lax" in raw or "SameSite=Lax" in raw
        assert "Secure" not in raw

    def test_clinic_endpoint_works_with_cookie_only(self, app):
        async def go():
            _, cookies = await _clinic_login(app)
            cookie = cookies[CLINIC_COOKIE]
            async with _client(app) as c:
                return await c.get(
                    "/api/clinic/dashboard",
                    headers=_cookie_header(CLINIC_COOKIE, cookie),
                )

        r = _run(go())
        assert r.status_code == 200, r.text

    def test_clinic_endpoint_works_with_bearer_only(self, app):
        async def go():
            token, _ = await _clinic_login(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/clinic/dashboard",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 200, r.text


# ── 3. Role separation across cookies ─────────────────────────────


class TestRoleSeparation:
    def test_clinic_cookie_cannot_access_admin_endpoint(self, app):
        async def go():
            _, cookies = await _clinic_login(app)
            clinic_cookie = cookies[CLINIC_COOKIE]
            async with _client(app) as c:
                # Send clinic cookie under the admin cookie NAME → admin route
                # should reject (clinic JWT has role="clinic" → 403). We also
                # test the natural case: clinic cookie sent under its own name
                # has no effect on admin route (no admin cookie → 401).
                impersonation = await c.get(
                    "/api/admin/audit-logs",
                    headers=_cookie_header(ADMIN_COOKIE, clinic_cookie),
                )
                clinic_only = await c.get(
                    "/api/admin/audit-logs",
                    headers=_cookie_header(CLINIC_COOKIE, clinic_cookie),
                )
            return impersonation, clinic_only

        impersonation, clinic_only = _run(go())
        # Even if a clinic JWT is shoved into the admin cookie slot, the role
        # check still fires.
        assert impersonation.status_code == 403, impersonation.text
        # No admin cookie present → 401.
        assert clinic_only.status_code == 401, clinic_only.text

    def test_admin_cookie_cannot_access_clinic_endpoint(self, app):
        async def go():
            _, cookies = await _admin_login(app)
            admin_cookie = cookies[ADMIN_COOKIE]
            async with _client(app) as c:
                impersonation = await c.get(
                    "/api/clinic/dashboard",
                    headers=_cookie_header(CLINIC_COOKIE, admin_cookie),
                )
                admin_only = await c.get(
                    "/api/clinic/dashboard",
                    headers=_cookie_header(ADMIN_COOKIE, admin_cookie),
                )
            return impersonation, admin_only

        impersonation, admin_only = _run(go())
        # Admin JWT shoved into clinic cookie slot → role check rejects (403).
        assert impersonation.status_code == 403, impersonation.text
        # No clinic cookie → 401.
        assert admin_only.status_code == 401, admin_only.text


# ── 4. Invalid / expired / tampered ───────────────────────────────


class TestInvalidSessions:
    def test_expired_jwt_in_cookie_returns_401(self, app):
        import jwt as _jwt
        from config import JWT_SECRET, JWT_ALGORITHM

        async def go():
            payload = {
                "sub": "admin-x",
                "username": ADMIN_USERNAME,
                "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            }
            expired = _jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers=_cookie_header(ADMIN_COOKIE, expired),
                )

        r = _run(go())
        assert r.status_code == 401, r.text

    def test_tampered_jwt_in_cookie_returns_401(self, app):
        async def go():
            _, cookies = await _admin_login(app)
            cookie = cookies[ADMIN_COOKIE]
            # Flip a char in the signature segment.
            parts = cookie.split(".")
            assert len(parts) == 3
            sig = parts[2]
            tampered_sig = ("A" if sig[0] != "A" else "B") + sig[1:]
            tampered = ".".join([parts[0], parts[1], tampered_sig])
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers=_cookie_header(ADMIN_COOKIE, tampered),
                )

        r = _run(go())
        assert r.status_code == 401, r.text


# ── 5. Logout ─────────────────────────────────────────────────────


class TestLogout:
    def test_admin_logout_clears_cookie(self, app):
        async def go():
            _, cookies = await _admin_login(app)
            async with _client(app) as c:
                r = await c.post(
                    "/api/admin/logout",
                    headers={"Cookie": f"{ADMIN_COOKIE}={cookies[ADMIN_COOKIE]}",
                             **_origin()},
                )
            return r

        r = _run(go())
        assert r.status_code == 200, r.text
        raw = r.headers.get("set-cookie", "")
        # Delete carries the cookie name + Max-Age=0 (or an Expires far in the
        # past). httpx uses Max-Age=0 via Starlette's delete_cookie.
        assert ADMIN_COOKIE in raw
        assert ("Max-Age=0" in raw) or ('Max-Age="0"' in raw) or ("expires=" in raw.lower())

    def test_clinic_logout_clears_cookie(self, app):
        async def go():
            _, cookies = await _clinic_login(app)
            async with _client(app) as c:
                r = await c.post(
                    "/api/clinic/logout",
                    headers={"Cookie": f"{CLINIC_COOKIE}={cookies[CLINIC_COOKIE]}",
                             **_origin()},
                )
            return r

        r = _run(go())
        assert r.status_code == 200, r.text
        raw = r.headers.get("set-cookie", "")
        assert CLINIC_COOKIE in raw

    def test_logout_is_idempotent_without_session(self, app):
        async def go():
            async with _client(app) as c:
                return await c.post("/api/admin/logout")

        r = _run(go())
        # Idempotent — no auth required, returns 200.
        assert r.status_code == 200, r.text

    def test_logout_emits_audit_event(self, app):
        async def go():
            import database as _database
            _, cookies = await _admin_login(app)
            async with _client(app) as c:
                await c.post(
                    "/api/admin/logout",
                    headers={"Cookie": f"{ADMIN_COOKIE}={cookies[ADMIN_COOKIE]}",
                             **_origin()},
                )
            rows = await _database.db.admin_audit_logs.find(
                {"action": "auth.admin_logout"}, {"_id": 0},
            ).to_list(50)
            return rows

        rows = _run(go())
        assert len(rows) == 1
        assert rows[0]["actor_type"] == "admin"
        assert rows[0]["severity"] == "info"

    def test_logout_no_audit_without_cookie(self, app):
        async def go():
            import database as _database
            async with _client(app) as c:
                await c.post("/api/admin/logout")
            return await _database.db.admin_audit_logs.find({}, {"_id": 0}).to_list(50)

        rows = _run(go())
        assert all(r["action"] != "auth.admin_logout" for r in rows)


# ── 6. CSRF Origin guard ──────────────────────────────────────────


class TestCsrfGuard:
    def test_cookie_auth_post_with_allowed_origin_succeeds(self, app):
        async def go():
            _, cookies = await _admin_login(app)
            cookie = cookies[ADMIN_COOKIE]
            # Use POST /api/admin/calls/cleanup-stuck — admin-only, idempotent,
            # available in every env, no destructive side-effects when there
            # are no stuck calls.
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/calls/cleanup-stuck",
                    headers={
                        "Cookie": f"{ADMIN_COOKIE}={cookie}",
                        **_origin(ALLOWED_ORIGIN),
                    },
                )

        r = _run(go())
        assert r.status_code == 200, r.text

    def test_cookie_auth_post_with_preview_origin_succeeds(self, app):
        async def go():
            _, cookies = await _admin_login(app)
            cookie = cookies[ADMIN_COOKIE]
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/calls/cleanup-stuck",
                    headers={
                        "Cookie": f"{ADMIN_COOKIE}={cookie}",
                        "Origin": "https://abc-123.preview.emergentagent.com",
                    },
                )

        r = _run(go())
        assert r.status_code == 200, r.text

    def test_cookie_auth_post_without_origin_returns_403(self, app):
        async def go():
            _, cookies = await _admin_login(app)
            cookie = cookies[ADMIN_COOKIE]
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/calls/cleanup-stuck",
                    headers={"Cookie": f"{ADMIN_COOKIE}={cookie}"},
                )

        r = _run(go())
        assert r.status_code == 403, r.text

    def test_cookie_auth_post_with_evil_origin_returns_403(self, app):
        async def go():
            _, cookies = await _admin_login(app)
            cookie = cookies[ADMIN_COOKIE]
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/calls/cleanup-stuck",
                    headers={
                        "Cookie": f"{ADMIN_COOKIE}={cookie}",
                        "Origin": "https://evil.example.com",
                    },
                )

        r = _run(go())
        assert r.status_code == 403, r.text

    def test_bearer_auth_post_bypasses_csrf_during_transition(self, app):
        async def go():
            token, _ = await _admin_login(app)
            async with _client(app) as c:
                # No Origin header, Bearer-only — must NOT be CSRF-blocked.
                return await c.post(
                    "/api/admin/calls/cleanup-stuck",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 200, r.text

    def test_cookie_auth_safe_get_no_csrf_required(self, app):
        async def go():
            _, cookies = await _admin_login(app)
            cookie = cookies[ADMIN_COOKIE]
            async with _client(app) as c:
                # GET, no Origin header → must succeed.
                return await c.get(
                    "/api/admin/audit-logs",
                    headers={"Cookie": f"{ADMIN_COOKIE}={cookie}"},
                )

        r = _run(go())
        assert r.status_code == 200, r.text

    def test_csrf_violation_emits_audit_event(self, app):
        async def go():
            import database as _database
            _, cookies = await _admin_login(app)
            cookie = cookies[ADMIN_COOKIE]
            async with _client(app) as c:
                await c.post(
                    "/api/admin/calls/cleanup-stuck",
                    headers={"Cookie": f"{ADMIN_COOKIE}={cookie}"},
                )
            rows = await _database.db.admin_audit_logs.find(
                {"action": "auth.csrf_origin_mismatch"}, {"_id": 0},
            ).to_list(50)
            return rows

        rows = _run(go())
        assert len(rows) == 1
        assert rows[0]["severity"] == "warning"
        # Audit must contain reason_code, must NOT contain cookie/authorization
        # values.
        meta = rows[0].get("metadata") or {}
        assert meta.get("reason_code") == "missing_origin"
        import json as _json
        enc = _json.dumps(rows)
        assert ADMIN_COOKIE + "=" not in enc
        assert "Bearer" not in enc

    def test_cookie_auth_clinic_patch_without_origin_returns_403(self, app):
        """Verify CSRF also gates clinic-side PATCH/POST mutations."""
        async def go():
            _, cookies = await _clinic_login(app)
            cookie = cookies[CLINIC_COOKIE]
            async with _client(app) as c:
                return await c.post(
                    "/api/clinic/change-password",
                    headers={"Cookie": f"{CLINIC_COOKIE}={cookie}"},
                    json={"current_password": CLINIC_PASSWORD, "new_password": "NewClinicE1Pass!"},
                )

        r = _run(go())
        assert r.status_code == 403, r.text


# ── 7. Public endpoints unaffected by CSRF guard ──────────────────


class TestPublicEndpointsUnaffected:
    def test_public_lead_submit_unaffected(self, app):
        async def go():
            payload = {
                "name": "Тестов Потребител",
                "email": "lead-e1@example.com",
                "phone": "+359888111000",
                "city_slug": "sofia",
                "treatment_type": "orthodontics",
                "answers": {"q1": "a"},
                "score": 5,
                "band": "GREEN",
                "form_version": "v1",
            }
            async with _client(app) as c:
                return await c.post("/api/leads", json=payload)

        r = _run(go())
        # Public endpoint — must not be CSRF-gated. Accept 200/201/422
        # (422 only if schema rejects payload — which would still prove CSRF
        # didn't fire because the rejection comes from Pydantic, not auth).
        assert r.status_code in (200, 201, 422), r.text

    def test_public_analytics_event_unaffected(self, app):
        async def go():
            async with _client(app) as c:
                return await c.post(
                    "/api/analytics/events",
                    json={"event": "quiz_started", "session_id": str(uuid.uuid4())},
                )

        r = _run(go())
        assert r.status_code in (200, 201, 422), r.text

    def test_public_blog_track_view_unaffected(self, app):
        async def go():
            async with _client(app) as c:
                return await c.post(
                    "/api/blog/track-view",
                    json={"slug": "some-slug", "visitor_id": str(uuid.uuid4())},
                )

        r = _run(go())
        # 200 / 201 / 404 (slug doesn't exist) / 422 — all prove CSRF didn't fire.
        assert r.status_code in (200, 201, 404, 422), r.text
