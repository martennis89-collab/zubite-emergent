"""Phase 2 — Batch B regression suite (in-process, isolated test DB).

Tests four hardening areas:
  1. backup_leads.py — exports to gitignored path, prints no PII, blocks prod
  2. /api/seed — refuses missing/weak/username-equal passwords; blocks prod
  3. Destructive admin endpoints — 403 in prod, confirmation phrase required,
     cleanup-leads requires non-empty keep_ids and force=true for >50%
  4. /api/admin/calls/cleanup-stuck — still available, returns reset_count

Safety contract:
- Refuses to run unless DB_NAME starts with `zubite_test` or `test_`.
- Refuses to run if APP_ENV/ENVIRONMENT/NODE_ENV=production.
- The test DB is fully wiped before the module and dropped at teardown.
- No real HTTP, no real provider IO.

Run with:
    cd /app/backend
    DB_NAME=zubite_test_phase2_batch_b APP_ENV=test \\
        python -m pytest tests/test_phase2_batch_b.py -v
"""
from __future__ import annotations

import asyncio
import importlib
import json
import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest

# ── 0. Force test-isolated env BEFORE any backend import ──────────
os.environ.setdefault("DB_NAME", "zubite_test_phase2_batch_b")
os.environ.setdefault("APP_ENV", "test")
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"

# ── Hard safety guard ─────────────────────────────────────────────
_db_name = os.environ.get("DB_NAME", "")
if not (_db_name.startswith("zubite_test") or _db_name.startswith("test_")):
    raise RuntimeError(
        f"Refusing to run: DB_NAME={_db_name!r} is not an isolated test DB."
    )
_env_flag = (
    os.environ.get("APP_ENV")
    or os.environ.get("ENVIRONMENT")
    or os.environ.get("NODE_ENV")
    or "development"
).lower().strip()
if _env_flag == "production":
    raise RuntimeError("Refusing to run with APP_ENV=production.")

_BACKEND_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _BACKEND_DIR.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# Neutralise external storage init before server import.
import storage as _storage_mod  # noqa: E402

_storage_mod.init_storage = lambda: None  # type: ignore[assignment]

from httpx import ASGITransport, AsyncClient  # noqa: E402

# Single shared event loop for the entire module so motor IOLoop binds once.
_LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(_LOOP)


def _run(coro):
    return _LOOP.run_until_complete(coro)


# ── Seed credentials ──────────────────────────────────────────────
ADMIN_USERNAME = "admin@zubite.bg"
ADMIN_PASSWORD = "TestAdminPass1!"


# ── App fixtures ──────────────────────────────────────────────────
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

    async def teardown():
        await _database.client.drop_database(os.environ["DB_NAME"])
        _database.client.close()

    _run(setup())
    yield
    _run(teardown())


@pytest.fixture(autouse=True)
def _reset_rate_limit_state():
    import rate_limit as _rl

    _rl._buckets.clear()
    yield
    _rl._buckets.clear()


# ── Helpers ───────────────────────────────────────────────────────
async def _admin_token(app) -> str:
    async with _client(app) as c:
        r = await c.post(
            "/api/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        )
    r.raise_for_status()
    return r.json()["access_token"]


async def _seed_leads(n: int) -> list[str]:
    """Insert `n` lightweight leads directly into the test DB. Returns ids."""
    import database as _database

    ids: list[str] = []
    docs = []
    for _ in range(n):
        lid = str(uuid.uuid4())
        ids.append(lid)
        docs.append(
            {
                "id": lid,
                "city_slug": "sofia",
                "treatment_type": "invisalign",
                "name": "Patient",
                "phone": "+359888000000",
                "email": "p@example.com",
                "consent": True,
                "answers": {},
                "can_travel": True,
                "score_total": 5,
                "band": "YELLOW",
                "status": "NEW",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
    if docs:
        await _database.db.leads.insert_many(docs)
    return ids


def _set_is_production(value: bool) -> None:
    """Flip config.IS_PRODUCTION at runtime without restarting the app.

    The router functions look up `IS_PRODUCTION` via `from config import
    IS_PRODUCTION` (admin.py) and `from config import IS_PRODUCTION` inside
    the seed() handler (public.py). admin.py imports at module load — so we
    must monkey-patch the *bound* name in `routers.admin`, and the
    `config.IS_PRODUCTION` value the seed() handler re-reads.
    """
    import config as cfg
    import routers.admin as _admin

    cfg.IS_PRODUCTION = value
    _admin.IS_PRODUCTION = value


@pytest.fixture
def production_mode():
    """Context fixture: app behaves as production for the duration of a test."""
    _set_is_production(True)
    yield
    _set_is_production(False)


# ─── 1. backup_leads.py ───────────────────────────────────────────
class TestBackupScript:
    SCRIPT = _BACKEND_DIR / "scripts" / "backup_leads.py"
    BACKUP_DIR = _REPO_ROOT / "test_reports" / "backups"

    @pytest.fixture(autouse=True)
    def _cleanup_backup_files(self):
        """Remove every backup file the test class produces. Backups are
        gitignored but still hold PII on local disk; we never want them to
        survive past the test run."""
        before = set(self.BACKUP_DIR.glob("leads_*.json")) if self.BACKUP_DIR.exists() else set()
        yield
        if self.BACKUP_DIR.exists():
            for path in self.BACKUP_DIR.glob("leads_*.json"):
                if path not in before:
                    path.unlink(missing_ok=True)

    def _run_script(self, env_override: dict | None = None, extra_args: list[str] | None = None):
        env = os.environ.copy()
        env.update(env_override or {})
        return subprocess.run(
            [sys.executable, str(self.SCRIPT), *(extra_args or [])],
            cwd=str(_BACKEND_DIR),
            env=env,
            capture_output=True,
            text=True,
            timeout=30,
        )

    def test_backup_exports_test_db_leads_to_gitignored_path(self):
        async def seed():
            return await _seed_leads(3)

        ids = _run(seed())
        try:
            proc = self._run_script()
            assert proc.returncode == 0, (
                f"script failed rc={proc.returncode} stdout={proc.stdout!r} stderr={proc.stderr!r}"
            )
            # Locate the backup file path from stdout
            line = next(
                (ln for ln in proc.stdout.splitlines() if ln.startswith("backup_file:")),
                None,
            )
            assert line is not None, f"no backup_file line in stdout: {proc.stdout!r}"
            backup_path = Path(line.split(":", 1)[1].strip())
            assert backup_path.exists(), backup_path
            # The output directory must sit under the gitignored test_reports tree.
            assert str(backup_path).startswith(str(self.BACKUP_DIR)), backup_path

            with backup_path.open() as fh:
                data = json.load(fh)
            assert len(data) == len(ids)
            assert {d["id"] for d in data} == set(ids)
            # Defence in depth: file contains PII fields — verify they made it.
            assert all("phone" in d for d in data)
        finally:
            # Wipe so subsequent tests aren't affected by these rows.
            import database as _database

            _run(_database.db.leads.delete_many({}))

    def test_backup_does_not_print_pii(self):
        async def seed():
            import database as _database

            await _database.db.leads.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "name": "Pii Patient Unique",
                    "phone": "+359888XYZ123",
                    "email": "pii.unique@example.com",
                    "city_slug": "sofia",
                    "treatment_type": "invisalign",
                    "answers": {"q1": "yes"},
                    "score_total": 7,
                    "band": "GREEN",
                    "status": "NEW",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )

        _run(seed())
        try:
            proc = self._run_script()
            assert proc.returncode == 0
            combined = proc.stdout + "\n" + proc.stderr
            for needle in ("Pii Patient Unique", "+359888XYZ123", "pii.unique@example.com"):
                assert needle not in combined, (
                    f"PII leaked to script output: {needle!r}"
                )
        finally:
            import database as _database

            _run(_database.db.leads.delete_many({}))

    def test_backup_blocks_production_without_override(self):
        proc = self._run_script(env_override={"APP_ENV": "production"})
        assert proc.returncode != 0
        assert "production" in proc.stderr.lower()

    def test_backup_allows_production_with_explicit_flag(self):
        proc = self._run_script(
            env_override={"APP_ENV": "production"},
            extra_args=["--allow-production-backup"],
        )
        assert proc.returncode == 0, proc.stderr

    def test_backup_aborts_on_empty_db_name(self):
        # dotenv won't overwrite a variable that already exists in os.environ,
        # so explicitly export DB_NAME="" — that beats the value in backend/.env.
        proc = self._run_script(env_override={"DB_NAME": ""})
        assert proc.returncode != 0, f"unexpected success: {proc.stdout!r}"
        assert "DB_NAME" in proc.stderr


# ─── 2. /api/seed guards ──────────────────────────────────────────
class TestSeedGuards:
    """Each test wipes admin_users/clinics first so the seed endpoint runs
    the validation path (otherwise it short-circuits with 'Already seeded')."""

    async def _wipe_seed_collections(self) -> None:
        import database as _database

        await _database.db.clinics.delete_many({})
        await _database.db.admin_users.delete_many({})

    def test_seed_rejects_missing_password(self, app, monkeypatch):
        async def go():
            await self._wipe_seed_collections()
            monkeypatch.delenv("SEED_ADMIN_PASSWORD", raising=False)
            async with _client(app) as c:
                return await c.post("/api/seed")

        try:
            r = _run(go())
            assert r.status_code == 400, r.text
            assert "SEED_ADMIN_PASSWORD" in r.text
        finally:
            # Restore the seeded admin so other tests can authenticate.
            _run(self._restore_admin())

    @pytest.mark.parametrize(
        "weak", ["password", "admin", "123456", "changeme", "zubite", "letmein", "PASSWORD", "Admin"]
    )
    def test_seed_rejects_weak_passwords(self, app, monkeypatch, weak):
        async def go():
            await self._wipe_seed_collections()
            monkeypatch.setenv("SEED_ADMIN_PASSWORD", weak)
            async with _client(app) as c:
                return await c.post("/api/seed")

        try:
            r = _run(go())
            assert r.status_code == 400, f"expected 400 for weak={weak!r}, got {r.status_code} {r.text}"
            # Defence in depth: the user-supplied value must not appear in the
            # response body as a literal token. The natural-English phrase
            # "known-weak password list" intentionally contains generic words
            # like "password" and "admin", so we only assert that the response
            # body does NOT echo the value via JSON quoting / explicit echo.
            quoted_forms = [f'"{weak}"', f"'{weak}'", f"value={weak}"]
            for q in quoted_forms:
                assert q not in r.text, f"input echoed back as {q!r}: {r.text!r}"
        finally:
            _run(self._restore_admin())

    def test_seed_rejects_too_short_password(self, app, monkeypatch):
        async def go():
            await self._wipe_seed_collections()
            monkeypatch.setenv("SEED_ADMIN_PASSWORD", "Short1!")  # 7 chars
            async with _client(app) as c:
                return await c.post("/api/seed")

        try:
            r = _run(go())
            assert r.status_code == 400, r.text
            assert "12 characters" in r.text or "least" in r.text.lower()
        finally:
            _run(self._restore_admin())

    def test_seed_rejects_password_equal_to_username(self, app, monkeypatch):
        async def go():
            await self._wipe_seed_collections()
            monkeypatch.setenv("SEED_ADMIN_PASSWORD", ADMIN_USERNAME)
            async with _client(app) as c:
                return await c.post("/api/seed")

        try:
            r = _run(go())
            assert r.status_code == 400, r.text
            assert "username" in r.text.lower()
        finally:
            _run(self._restore_admin())

    def test_seed_accepts_strong_password_in_non_production(self, app, monkeypatch):
        async def go():
            await self._wipe_seed_collections()
            monkeypatch.setenv("SEED_ADMIN_PASSWORD", "Sup3rStr0ng!Pass-2026")
            async with _client(app) as c:
                return await c.post("/api/seed")

        try:
            r = _run(go())
            assert r.status_code == 200, r.text
            assert r.json()["message"] == "Seeded successfully"
        finally:
            _run(self._restore_admin())

    def test_seed_blocked_in_production(self, app, monkeypatch, production_mode):  # noqa: ARG002
        async def go():
            await self._wipe_seed_collections()
            monkeypatch.setenv("SEED_ADMIN_PASSWORD", "Sup3rStr0ng!Pass-2026")
            async with _client(app) as c:
                return await c.post("/api/seed")

        try:
            r = _run(go())
            assert r.status_code == 403, r.text
            assert "production" in r.text.lower()
        finally:
            _run(self._restore_admin())

    async def _restore_admin(self) -> None:
        import database as _database
        from auth import hash_password

        await _database.db.admin_users.delete_many({})
        await _database.db.admin_users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "username": ADMIN_USERNAME,
                "password_hash": hash_password(ADMIN_PASSWORD),
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )


# ─── 3. Destructive endpoint guards ───────────────────────────────
class TestDestructiveEndpointGuards:
    # ── reset-analytics ────────────────────────────────────────────
    def test_reset_analytics_403_in_production(self, app, production_mode):  # noqa: ARG002
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/reset-analytics",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"confirmation_token": "CONFIRM_RESET_ANALYTICS"},
                )

        r = _run(go())
        assert r.status_code == 403, r.text
        assert "production" in r.text.lower()

    def test_reset_analytics_requires_confirmation_token_in_dev(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                bad = await c.post(
                    "/api/admin/reset-analytics",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"confirmation_token": "WRONG"},
                )
                good = await c.post(
                    "/api/admin/reset-analytics",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"confirmation_token": "CONFIRM_RESET_ANALYTICS"},
                )
            return bad, good

        bad, good = _run(go())
        assert bad.status_code == 400
        assert "CONFIRM_RESET_ANALYTICS" in bad.text
        assert good.status_code == 200
        assert good.json()["success"] is True

    # ── reset-blog-views ───────────────────────────────────────────
    def test_reset_blog_views_403_in_production(self, app, production_mode):  # noqa: ARG002
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/reset-blog-views",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"confirmation_token": "CONFIRM_RESET_BLOG_VIEWS"},
                )

        r = _run(go())
        assert r.status_code == 403

    def test_reset_blog_views_requires_confirmation_in_dev(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                bad = await c.post(
                    "/api/admin/reset-blog-views",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"confirmation_token": "nope"},
                )
                good = await c.post(
                    "/api/admin/reset-blog-views",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"confirmation_token": "CONFIRM_RESET_BLOG_VIEWS"},
                )
            return bad, good

        bad, good = _run(go())
        assert bad.status_code == 400
        assert good.status_code == 200

    # ── cleanup-leads ──────────────────────────────────────────────
    def test_cleanup_leads_403_in_production(self, app, production_mode):  # noqa: ARG002
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/cleanup-leads",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "confirmation_token": "CONFIRM_DELETE_NON_MATCHING_LEADS",
                        "keep_ids": ["x"],
                    },
                )

        r = _run(go())
        assert r.status_code == 403

    def test_cleanup_leads_rejects_empty_keep_ids(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/cleanup-leads",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "confirmation_token": "CONFIRM_DELETE_NON_MATCHING_LEADS",
                        "keep_ids": [],
                    },
                )

        r = _run(go())
        assert r.status_code == 422, r.text

    def test_cleanup_leads_rejects_wrong_confirmation(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/cleanup-leads",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "confirmation_token": "WRONG",
                        "keep_ids": ["any"],
                    },
                )

        r = _run(go())
        assert r.status_code == 400
        assert "CONFIRM_DELETE_NON_MATCHING_LEADS" in r.text

    def test_cleanup_leads_refuses_majority_without_force(self, app):
        """If >50% of leads would be deleted, the endpoint must refuse unless
        force=true is passed explicitly."""

        async def refuse_phase():
            await _ensure_no_leftover_leads()
            ids = await _seed_leads(10)
            token = await _admin_token(app)
            keep = ids[:3]  # would delete 7/10 = 70% > 50%
            async with _client(app) as c:
                refused = await c.post(
                    "/api/admin/cleanup-leads",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "confirmation_token": "CONFIRM_DELETE_NON_MATCHING_LEADS",
                        "keep_ids": keep,
                    },
                )
            import database as _database

            still = await _database.db.leads.count_documents({})
            return ids, refused, still

        ids, refused, still = _run(refuse_phase())
        try:
            assert refused.status_code == 400, refused.text
            body = refused.json()["detail"]
            assert body["error"] == "would_delete_majority"
            assert body["total"] == 10
            assert body["n_to_delete"] == 7
            # No leads should have been deleted on refusal.
            assert still == 10

            async def force_phase():
                token = await _admin_token(app)
                async with _client(app) as c:
                    return await c.post(
                        "/api/admin/cleanup-leads",
                        headers={"Authorization": f"Bearer {token}"},
                        json={
                            "confirmation_token": "CONFIRM_DELETE_NON_MATCHING_LEADS",
                            "keep_ids": ids[:3],
                            "force": True,
                        },
                    )

            forced = _run(force_phase())
            assert forced.status_code == 200, forced.text
            j = forced.json()
            assert j["deleted_count"] == 7
            assert j["n_to_delete"] == 7
            assert j["total_before"] == 10
        finally:
            _run(_ensure_no_leftover_leads())

    def test_cleanup_leads_allows_minor_deletion_without_force(self, app):
        """≤50% deletion should succeed without force=true."""

        async def go():
            await _ensure_no_leftover_leads()
            ids = await _seed_leads(10)
            keep = ids[:7]  # delete 3/10 = 30%
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/cleanup-leads",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "confirmation_token": "CONFIRM_DELETE_NON_MATCHING_LEADS",
                        "keep_ids": keep,
                    },
                )

        try:
            r = _run(go())
            assert r.status_code == 200, r.text
            j = r.json()
            assert j["deleted_count"] == 3
        finally:
            _run(_ensure_no_leftover_leads())

    def test_cleanup_leads_response_has_no_lead_ids(self, app):
        """Defence in depth: response payload must NOT echo patient identifiers."""

        async def go():
            await _ensure_no_leftover_leads()
            ids = await _seed_leads(4)
            token = await _admin_token(app)
            async with _client(app) as c:
                r = await c.post(
                    "/api/admin/cleanup-leads",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "confirmation_token": "CONFIRM_DELETE_NON_MATCHING_LEADS",
                        "keep_ids": ids[:3],
                    },
                )
            return ids, r

        try:
            ids, r = _run(go())
            assert r.status_code == 200
            body_text = r.text
            for lid in ids:
                assert lid not in body_text, "lead id leaked into response body"
        finally:
            _run(_ensure_no_leftover_leads())


# ─── 4. cleanup-stuck (operational, not destructive) ──────────────
class TestCleanupStuck:
    def test_cleanup_stuck_returns_reset_count_for_admin(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/calls/cleanup-stuck",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert "reset_count" in body
        assert isinstance(body["reset_count"], int)
        assert body["reset_count"] >= 0

    def test_cleanup_stuck_still_available_in_production(self, app, production_mode):  # noqa: ARG002
        """Operational recovery — must NOT be 403'd in production."""

        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.post(
                    "/api/admin/calls/cleanup-stuck",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 200
        assert r.json()["success"] is True

    def test_cleanup_stuck_requires_admin_auth(self, app):
        async def go():
            async with _client(app) as c:
                return await c.post("/api/admin/calls/cleanup-stuck")

        r = _run(go())
        assert r.status_code in (401, 403)


# ── shared cleanup helper for cleanup-leads tests ─────────────────
async def _ensure_no_leftover_leads() -> None:
    import database as _database

    await _database.db.leads.delete_many({})
