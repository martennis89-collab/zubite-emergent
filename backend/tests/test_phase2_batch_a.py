"""Phase 2 — Batch A regression suite (in-process, isolated test DB).

Tests four hardening areas using httpx.AsyncClient against the FastAPI app
in-process via ASGITransport. There are NO real HTTP calls over the network
and NO real external provider invocations (Resend, Twilio, ElevenLabs, storage).

Safety contract:
- Refuses to run unless DB_NAME starts with `zubite_test` or `test_`.
- Refuses to run if APP_ENV=production (or ENVIRONMENT/NODE_ENV=production).
- The chosen test DB is fully wiped before the module runs and dropped at the
  end.

Run with:
    cd /app/backend
    DB_NAME=zubite_test_phase2_batch_a APP_ENV=test \\
        python -m pytest tests/test_phase2_batch_a.py -v
"""
from __future__ import annotations

import asyncio
import importlib
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest

# ── 0. Force test-isolated env BEFORE any backend import ──────────
# A fresh, throw-away DB. Never the production/preview DB.
os.environ.setdefault("DB_NAME", "zubite_test_phase2_batch_a")
os.environ.setdefault("APP_ENV", "test")
# In-process ASGI: every request comes from the same client. Don't trust
# forwarded-for so the rate-limiter keys reliably to one bucket.
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"

# ── Hard safety guard — fail loud, never green ────────────────────
_db_name = os.environ.get("DB_NAME", "")
if not (_db_name.startswith("zubite_test") or _db_name.startswith("test_")):
    raise RuntimeError(
        f"Refusing to run: DB_NAME={_db_name!r} is not an isolated test DB. "
        "Set DB_NAME=zubite_test_phase2_batch_a before invoking pytest."
    )
_env_flag = (
    os.environ.get("APP_ENV")
    or os.environ.get("ENVIRONMENT")
    or os.environ.get("NODE_ENV")
    or "development"
).lower().strip()
if _env_flag == "production":
    raise RuntimeError(
        f"Refusing to run hardening tests with APP_ENV/ENVIRONMENT/NODE_ENV=production."
    )

# Make `from config import ...`, `import server`, etc. resolve to /app/backend.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# Patch external-network startup BEFORE server imports it.
import storage as _storage_mod  # noqa: E402

_storage_mod.init_storage = lambda: None  # type: ignore[assignment]

from httpx import ASGITransport, AsyncClient  # noqa: E402

# Single module-wide event loop. Motor binds its IOLoop on first await; using
# one loop for the whole module keeps the AsyncIOMotorClient stable.
_LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(_LOOP)


def _run(coro):
    """Drive an async helper on the shared module loop."""
    return _LOOP.run_until_complete(coro)


# ── Test fixtures' seed credentials ───────────────────────────────
ADMIN_USERNAME = "admin@zubite.bg"
ADMIN_PASSWORD = "TestAdminPass1!"
CLINIC_EMAIL = "clinic-batch-a@example.com"
CLINIC_PASSWORD = "ClinicTest1!"


# ── App + client helpers ──────────────────────────────────────────
@pytest.fixture(scope="module")
def app():
    # Import server lazily so env vars are honoured.
    import server as _server

    return _server.app


def _client(app):
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://testserver")


# ── DB bootstrap: seed admin + clinic; teardown drops the test DB ─
@pytest.fixture(scope="module", autouse=True)
def _bootstrap(app):  # noqa: ARG001 — app forces import order
    import database as _database
    from auth import hash_password

    async def setup():
        db = _database.db
        # Wipe the test DB clean before we start (defence in depth).
        for coll_name in await db.list_collection_names():
            await db[coll_name].delete_many({})

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
                "clinic_name": "Phase2 Batch A Test Clinic",
                "city": "Sofia",
                "email": CLINIC_EMAIL,
                "phone": "+359888000000",
                "password_hash": hash_password(CLINIC_PASSWORD),
                "status": "active",
                "address": "Test",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    async def teardown():
        await _database.client.drop_database(os.environ["DB_NAME"])
        _database.client.close()

    _run(setup())
    yield
    _run(teardown())


# ── Reset in-memory rate-limit state between every test ──────────
@pytest.fixture(autouse=True)
def _reset_rate_limit_state():
    import rate_limit as _rl

    _rl._buckets.clear()
    yield
    _rl._buckets.clear()


# ── Auth helpers (run async on the shared loop) ───────────────────
async def _admin_token(app) -> str:
    async with _client(app) as c:
        r = await c.post(
            "/api/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        )
    r.raise_for_status()
    return r.json()["access_token"]


async def _clinic_token(app) -> str:
    async with _client(app) as c:
        r = await c.post(
            "/api/clinic/login",
            json={"email": CLINIC_EMAIL, "password": CLINIC_PASSWORD},
        )
    r.raise_for_status()
    return r.json()["access_token"]


async def _create_lead(app) -> str:
    """Create a lead via the public endpoint. Caller MUST reset rate-limit
    state first (autouse fixture does this between tests)."""
    async with _client(app) as c:
        r = await c.post(
            "/api/leads",
            json={
                "city_slug": "sofia",
                "treatment_type": "invisalign",
                "name": "Test",
                "phone": f"+359888{uuid.uuid4().int % 1_000_000:06d}",
                "consent": True,
                "answers": {},
                "can_travel": True,
            },
        )
    r.raise_for_status()
    return r.json()["id"]


# ─── 1. APP_ENV detection ─────────────────────────────────────────
class TestAppEnvFoundation:
    """Reload `config` under controlled env vars to confirm detection logic."""

    @staticmethod
    def _reload_config_with(env: dict) -> "object":
        # Snapshot then mutate env, reload, return the reloaded module.
        # The caller is responsible for restoring env afterwards.
        for k in ("APP_ENV", "ENVIRONMENT", "NODE_ENV"):
            os.environ.pop(k, None)
        for k, v in env.items():
            os.environ[k] = v
        import config as cfg

        return importlib.reload(cfg)

    def test_config_module_exports_constants(self):
        from config import APP_ENV, IS_PRODUCTION  # noqa: F401

        assert isinstance(APP_ENV, str)
        assert isinstance(IS_PRODUCTION, bool)

    def test_default_app_env_is_development(self):
        try:
            cfg = self._reload_config_with({})
            assert cfg.APP_ENV == "development"
            assert cfg.IS_PRODUCTION is False
        finally:
            self._reload_config_with({"APP_ENV": "test"})

    def test_app_env_production_detection(self):
        try:
            cfg = self._reload_config_with({"APP_ENV": "production"})
            assert cfg.APP_ENV == "production"
            assert cfg.IS_PRODUCTION is True
        finally:
            self._reload_config_with({"APP_ENV": "test"})

    def test_legacy_environment_fallback(self):
        try:
            cfg = self._reload_config_with({"ENVIRONMENT": "production"})
            assert cfg.IS_PRODUCTION is True
        finally:
            self._reload_config_with({"APP_ENV": "test"})

    def test_legacy_node_env_fallback(self):
        try:
            cfg = self._reload_config_with({"NODE_ENV": "production"})
            assert cfg.IS_PRODUCTION is True
        finally:
            self._reload_config_with({"APP_ENV": "test"})


# ─── 2. Lead status validator ─────────────────────────────────────
class TestLeadStatusValidation:
    @pytest.mark.parametrize(
        "status", ["NEW", "CONTACTED", "SCHEDULED", "COMPLETED", "CANCELLED"]
    )
    def test_valid_status_accepted(self, app, status):
        async def go():
            token = await _admin_token(app)
            lead_id = await _create_lead(app)
            async with _client(app) as c:
                return await c.patch(
                    f"/api/admin/leads/{lead_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"status": status},
                )

        r = _run(go())
        assert r.status_code == 200, f"valid status {status} rejected: {r.text}"

    @pytest.mark.parametrize(
        "status", ["won", "lost", "deleted", "new", "contacted"]
    )
    def test_invalid_status_rejected_with_422(self, app, status):
        async def go():
            token = await _admin_token(app)
            lead_id = await _create_lead(app)
            async with _client(app) as c:
                return await c.patch(
                    f"/api/admin/leads/{lead_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"status": status},
                )

        r = _run(go())
        assert r.status_code == 422, (
            f"invalid status {status} not rejected: HTTP {r.status_code} {r.text}"
        )
        assert "detail" in r.json()

    def test_status_omitted_allowed(self, app):
        """PATCH without status should still work (e.g. note-only update)."""

        async def go():
            token = await _admin_token(app)
            lead_id = await _create_lead(app)
            async with _client(app) as c:
                return await c.patch(
                    f"/api/admin/leads/{lead_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"notes": "test note"},
                )

        r = _run(go())
        assert r.status_code == 200, r.text

    def test_invalid_status_does_not_mutate_db(self, app):
        """If validator rejects, the lead must keep its previous status."""

        async def go():
            token = await _admin_token(app)
            lead_id = await _create_lead(app)
            async with _client(app) as c:
                bad = await c.patch(
                    f"/api/admin/leads/{lead_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"status": "InvalidValue"},
                )
                refetch = await c.get(
                    f"/api/admin/leads/{lead_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
            return bad, refetch

        bad, refetch = _run(go())
        assert bad.status_code == 422
        assert refetch.status_code == 200
        assert refetch.json()["status"] == "NEW"


# ─── 3. Rate limits ───────────────────────────────────────────────
class TestRateLimits:
    """Verify the rate-limited endpoints actually throttle.

    The endpoints under test:
      - /api/analytics/events       (60 / 60s)
      - /api/blog/track-view        (60 / 60s)
      - /api/leads                  (5  / 300s)  — POST
      - /api/admin/login            (5  / 300s)
      - /api/clinic/login           (5  / 300s)
    """

    def test_analytics_events_throttles_at_60_per_minute(self, app):
        async def go():
            ok = throttled = 0
            async with _client(app) as c:
                for i in range(70):
                    r = await c.post(
                        "/api/analytics/events",
                        json={
                            "event_type": "test",
                            "session_id": f"rl-test-{i}",
                            "timestamp": "2026-01-01",
                        },
                    )
                    if r.status_code == 200:
                        ok += 1
                    elif r.status_code == 429:
                        throttled += 1
            return ok, throttled

        ok, throttled = _run(go())
        assert ok == 60, f"expected exactly 60 OKs in window, got {ok}"
        assert throttled == 10, f"expected 10 × 429, got {throttled}"

    def test_blog_track_view_throttles(self, app):
        async def go():
            ok = throttled = 0
            async with _client(app) as c:
                for i in range(70):
                    r = await c.post(
                        "/api/blog/track-view",
                        json={
                            "post_slug": "test-slug",
                            "visitor_id": f"rl-blog-{i}",
                        },
                    )
                    if r.status_code == 200:
                        ok += 1
                    elif r.status_code == 429:
                        throttled += 1
            return ok, throttled

        ok, throttled = _run(go())
        assert ok == 60
        assert throttled == 10

    def test_create_lead_throttles_at_5_per_window(self, app):
        async def go():
            ok = throttled = 0
            async with _client(app) as c:
                for _ in range(8):
                    r = await c.post(
                        "/api/leads",
                        json={
                            "city_slug": "sofia",
                            "treatment_type": "invisalign",
                            "name": "RL",
                            "phone": f"+359888{uuid.uuid4().int % 1_000_000:06d}",
                            "consent": False,
                            "answers": {},
                            "can_travel": True,
                        },
                    )
                    if r.status_code == 200:
                        ok += 1
                    elif r.status_code == 429:
                        throttled += 1
            return ok, throttled

        ok, throttled = _run(go())
        assert ok == 5
        assert throttled == 3

    def test_admin_login_throttles_invalid_attempts(self, app):
        async def go():
            ok_attempts = unauth = throttled = 0
            async with _client(app) as c:
                for _ in range(8):
                    r = await c.post(
                        "/api/admin/login",
                        json={"username": "nobody@example.com", "password": "wrong"},
                    )
                    if r.status_code == 401:
                        unauth += 1
                    elif r.status_code == 429:
                        throttled += 1
                    elif r.status_code == 200:
                        ok_attempts += 1
            return ok_attempts, unauth, throttled

        ok_attempts, unauth, throttled = _run(go())
        assert ok_attempts == 0  # never auth a fake user
        assert unauth == 5  # five failed auths consume the bucket
        assert throttled == 3  # rest get 429

    def test_clinic_login_throttles_invalid_attempts(self, app):
        async def go():
            unauth = throttled = 0
            async with _client(app) as c:
                for _ in range(8):
                    r = await c.post(
                        "/api/clinic/login",
                        json={"email": "ghost@example.com", "password": "wrong"},
                    )
                    if r.status_code == 401:
                        unauth += 1
                    elif r.status_code == 429:
                        throttled += 1
            return unauth, throttled

        unauth, throttled = _run(go())
        assert unauth == 5
        assert throttled == 3


# ─── 4. Clinic /leads projection ──────────────────────────────────
class TestClinicLeadsProjection:
    FORBIDDEN_FIELDS = {
        "answers",
        "band",
        "score_total",
        "score_breakdown",
        "first_utm_source",
        "first_utm_campaign",
        "first_utm_medium",
        "first_utm_term",
        "first_utm_content",
        "latest_utm_source",
        "latest_utm_campaign",
        "latest_utm_medium",
        "latest_utm_term",
        "latest_utm_content",
        "content_path_before_conversion",
        "first_referrer",
        "first_landing_page",
        "attribution",
        "call_outcome_json",
        "call_transcript",
        "call_outcome_summary",
        "call_status",
        "is_potential_duplicate",
        "duplicate_reason",
        "possible_duplicate_lead_id",
        "verification_token",
        "verification_token_expires_at",
        "admin_notes",
        "internal_notes",
        "notes",
        "consent",
        "can_travel",
        "score_color",
    }

    ALLOWED_FIELDS = {
        "id",
        "name",
        "phone",
        "email",
        "city_slug",
        "treatment_type",
        "clinic_lead_status",
        "verification_status",
        "created_at",
    }

    def test_clinic_leads_returns_only_minimal_fields(self, app):
        """Clinic GET /clinic/leads MUST omit every sensitive/internal field."""

        async def go():
            import database as _database

            clinic = await _database.db.clinics.find_one(
                {"email": CLINIC_EMAIL}, {"_id": 0, "id": 1}
            )
            assert clinic is not None, "test clinic was not seeded"

            # Insert a lead with the maximum amount of forbidden fields populated,
            # so the test fails loudly if any of them are leaked.
            lead_doc = {
                "id": str(uuid.uuid4()),
                "city_slug": "sofia",
                "treatment_type": "invisalign",
                "name": "Patient X",
                "phone": "+359888111222",
                "email": "x@example.com",
                "consent": True,
                "answers": {"q1": "yes"},
                "can_travel": True,
                "score_total": 7,
                "band": "GREEN",
                "status": "NEW",
                "assigned_clinic_id": clinic["id"],
                "clinic_lead_status": "new",
                "verification_status": "pending",
                "notes": "internal note",
                "admin_notes": "admin only",
                "first_utm_source": "facebook",
                "first_utm_campaign": "launch",
                "latest_utm_campaign": "spring2026",
                "latest_utm_source": "google",
                "content_path_before_conversion": [{"page": "/blog/x"}],
                "first_referrer": "https://google.com",
                "call_transcript": "internal call notes",
                "call_outcome_summary": "interested",
                "score_breakdown": {"a": 1, "b": 2},
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await _database.db.leads.insert_one(lead_doc)

            token = await _clinic_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/clinic/leads",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 200, r.text
        leads = r.json()["leads"]
        assert leads, "expected our seeded lead to appear"

        all_keys: set[str] = set()
        for lead in leads:
            all_keys.update(lead.keys())

        leaked = all_keys & self.FORBIDDEN_FIELDS
        assert not leaked, (
            f"Clinic /leads endpoint leaks sensitive fields: {sorted(leaked)}. "
            f"All returned keys: {sorted(all_keys)}"
        )

        unexpected = all_keys - self.ALLOWED_FIELDS
        assert not unexpected, (
            f"Clinic /leads returns unexpected fields: {sorted(unexpected)}. "
            f"Expand ALLOWED_FIELDS or remove from projection."
        )

    def test_clinic_cannot_call_admin_endpoint(self, app):
        """A clinic JWT must NOT authorize against admin-only endpoints."""

        async def go():
            token = await _clinic_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/leads",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code in (401, 403), (
            f"Clinic token unexpectedly accepted on admin endpoint (HTTP {r.status_code})"
        )
