"""Phase 3 — Batch D3: admin read API for audit logs.

In-process tests against `GET /api/admin/audit-logs` covering:
  - auth gate (no token, clinic JWT, admin JWT)
  - pagination (limit/skip/total, clamp to 200)
  - sort (created_at desc)
  - filters: action (incl. comma-separated $in), actor_id, actor_type,
    target_type, target_id, severity, date_from, date_to
  - input validation: invalid date / severity / actor_type → 400
  - defensive read-side masking: a hand-seeded row with password / token /
    notes / answers / etc. is stripped/redacted in the response
  - `_id` never present in the response
  - rate limit returns 429 after threshold (30/60s)

Safety contract identical to prior phases: refuses production, drops the
test DB on teardown, autouse rate-limit reset, no real external provider IO,
no backup artefacts created.
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

os.environ.setdefault("DB_NAME", "zubite_test_phase3_d3")
os.environ.setdefault("APP_ENV", "test")
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"
os.environ.setdefault("RESEND_API_KEY", "test_resend_key_no_network")
os.environ.setdefault("ADMIN_EMAIL", "admin-alerts@example.com")

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

# Neutralise external providers BEFORE server import.
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
CLINIC_EMAIL = "clinic-d3@example.com"
CLINIC_PASSWORD = "ClinicD3Pass1!"


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
                "clinic_name": "Clinic D3",
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

    # Pre-warm token cache BEFORE clearing audit_logs so the login row
    # written by the first call doesn't pollute test assertions.
    _run(_admin_token(app))
    _run(_clinic_token(app))

    _rl._buckets.clear()
    _run(_database.db.admin_audit_logs.delete_many({}))
    yield
    _rl._buckets.clear()


@pytest.fixture(autouse=True)
def _no_backup_artifacts():
    backup_dir = _REPO_ROOT / "test_reports" / "backups"
    before = set(backup_dir.glob("leads_*.json")) if backup_dir.exists() else set()
    yield
    if backup_dir.exists():
        for p in backup_dir.glob("leads_*.json"):
            if p not in before:
                p.unlink(missing_ok=True)


# ── helpers ───────────────────────────────────────────────────────


_TOKEN_CACHE: dict[str, str] = {}


async def _admin_token(app) -> str:
    if "admin" in _TOKEN_CACHE:
        return _TOKEN_CACHE["admin"]
    async with _client(app) as c:
        r = await c.post(
            "/api/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        )
    r.raise_for_status()
    _TOKEN_CACHE["admin"] = r.json()["access_token"]
    return _TOKEN_CACHE["admin"]


async def _clinic_token(app) -> str:
    if "clinic" in _TOKEN_CACHE:
        return _TOKEN_CACHE["clinic"]
    async with _client(app) as c:
        r = await c.post(
            "/api/clinic/login",
            json={"email": CLINIC_EMAIL, "password": CLINIC_PASSWORD},
        )
    r.raise_for_status()
    _TOKEN_CACHE["clinic"] = r.json()["access_token"]
    return _TOKEN_CACHE["clinic"]


def _iso(dt: datetime) -> str:
    return dt.isoformat()


async def _seed_rows(rows: list[dict]) -> None:
    import database as _database
    if rows:
        await _database.db.admin_audit_logs.insert_many(rows)


def _row(
    *,
    created_at: datetime | None = None,
    action: str = "lead.status_changed",
    actor_id: str = "admin-1",
    actor_type: str = "admin",
    target_type: str = "lead",
    target_id: str = "lead-x",
    severity: str = "info",
    before_state: dict | None = None,
    after_state: dict | None = None,
    metadata: dict | None = None,
) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "created_at": _iso(created_at or datetime.now(timezone.utc)),
        "actor_type": actor_type,
        "actor_id": actor_id,
        "actor_label": "admin@zubite.bg",
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "target_summary": None,
        "before_state": before_state,
        "after_state": after_state,
        "metadata": metadata,
        "ip_address": "127.0.0.1",
        "user_agent": "pytest",
        "severity": severity,
    }


# ── 1. Auth gate ──────────────────────────────────────────────────


class TestAuthGate:
    def test_no_token_rejected(self, app):
        async def go():
            async with _client(app) as c:
                return await c.get("/api/admin/audit-logs")

        r = _run(go())
        assert r.status_code in (401, 403), r.text

    def test_clinic_jwt_rejected(self, app):
        async def go():
            token = await _clinic_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        # `get_current_user` raises 403 when role=="clinic".
        assert r.status_code == 403, r.text

    def test_admin_jwt_accepted(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 200, r.text
        body = r.json()
        assert set(body.keys()) >= {"total", "limit", "skip", "logs"}
        assert body["total"] == 0
        assert body["logs"] == []


# ── 2. Pagination & sort ──────────────────────────────────────────


class TestPaginationAndSort:
    def test_total_limit_skip_and_desc_order(self, app):
        async def go():
            now = datetime.now(timezone.utc)
            rows = [
                _row(
                    created_at=now - timedelta(minutes=i),
                    target_id=f"lead-{i:02d}",
                )
                for i in range(5)
            ]
            await _seed_rows(rows)
            token = await _admin_token(app)
            async with _client(app) as c:
                page1 = await c.get(
                    "/api/admin/audit-logs?limit=2&skip=0",
                    headers={"Authorization": f"Bearer {token}"},
                )
                page2 = await c.get(
                    "/api/admin/audit-logs?limit=2&skip=2",
                    headers={"Authorization": f"Bearer {token}"},
                )
            return page1.json(), page2.json()

        p1, p2 = _run(go())
        assert p1["total"] == 5
        assert p1["limit"] == 2
        assert p1["skip"] == 0
        assert len(p1["logs"]) == 2
        # desc by created_at: lead-00 is newest, then lead-01.
        assert p1["logs"][0]["target_id"] == "lead-00"
        assert p1["logs"][1]["target_id"] == "lead-01"
        assert len(p2["logs"]) == 2
        assert p2["logs"][0]["target_id"] == "lead-02"
        assert p2["logs"][1]["target_id"] == "lead-03"

    def test_limit_clamped_to_200(self, app):
        async def go():
            # Seed 3 rows and request limit=9999 — endpoint should clamp.
            await _seed_rows([_row(target_id=f"l-{i}") for i in range(3)])
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs?limit=9999",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 200
        body = r.json()
        assert body["limit"] == 200
        assert len(body["logs"]) == 3

    def test_limit_zero_rejected(self, app):
        # ge=1 enforced by FastAPI Query → 422.
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs?limit=0",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 422

    def test_negative_skip_rejected(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs?skip=-1",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 422


# ── 3. Filters ────────────────────────────────────────────────────


class TestFilters:
    def test_filter_by_action_exact(self, app):
        async def go():
            await _seed_rows([
                _row(action="lead.deleted", target_id="l-1"),
                _row(action="lead.status_changed", target_id="l-2"),
                _row(action="lead.status_changed", target_id="l-3"),
            ])
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs?action=lead.deleted",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        body = r.json()
        assert body["total"] == 1
        assert body["logs"][0]["action"] == "lead.deleted"

    def test_filter_by_action_comma_in(self, app):
        async def go():
            await _seed_rows([
                _row(action="lead.deleted", target_id="l-1"),
                _row(action="lead.status_changed", target_id="l-2"),
                _row(action="blog_post.created", target_id="b-1", target_type="blog_post"),
            ])
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs?action=lead.deleted,blog_post.created",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        body = r.json()
        assert body["total"] == 2
        actions = {row["action"] for row in body["logs"]}
        assert actions == {"lead.deleted", "blog_post.created"}

    def test_filter_by_actor_id(self, app):
        async def go():
            await _seed_rows([
                _row(actor_id="admin-A", target_id="l-1"),
                _row(actor_id="admin-B", target_id="l-2"),
            ])
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs?actor_id=admin-A",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        body = r.json()
        assert body["total"] == 1
        assert body["logs"][0]["actor_id"] == "admin-A"

    def test_filter_by_actor_type(self, app):
        async def go():
            await _seed_rows([
                _row(actor_type="admin", target_id="l-1"),
                _row(actor_type="system", target_id="l-2"),
                _row(actor_type="public", target_id="l-3"),
            ])
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs?actor_type=system",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        body = r.json()
        assert body["total"] == 1
        assert body["logs"][0]["actor_type"] == "system"

    def test_filter_by_target_type_and_target_id(self, app):
        async def go():
            await _seed_rows([
                _row(target_type="lead", target_id="l-1"),
                _row(target_type="clinic", target_id="c-1"),
                _row(target_type="clinic", target_id="c-2"),
            ])
            token = await _admin_token(app)
            async with _client(app) as c:
                tt = await c.get(
                    "/api/admin/audit-logs?target_type=clinic",
                    headers={"Authorization": f"Bearer {token}"},
                )
                tid = await c.get(
                    "/api/admin/audit-logs?target_id=c-1",
                    headers={"Authorization": f"Bearer {token}"},
                )
            return tt.json(), tid.json()

        by_type, by_id = _run(go())
        assert by_type["total"] == 2
        assert {r["target_type"] for r in by_type["logs"]} == {"clinic"}
        assert by_id["total"] == 1
        assert by_id["logs"][0]["target_id"] == "c-1"

    def test_filter_by_severity(self, app):
        async def go():
            await _seed_rows([
                _row(severity="info", target_id="l-1"),
                _row(severity="warning", target_id="l-2"),
                _row(severity="critical", target_id="l-3"),
            ])
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs?severity=critical",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        body = r.json()
        assert body["total"] == 1
        assert body["logs"][0]["severity"] == "critical"

    def test_filter_by_date_range(self, app):
        async def go():
            today = datetime(2026, 2, 15, 12, 0, 0, tzinfo=timezone.utc)
            await _seed_rows([
                _row(created_at=today - timedelta(days=5), target_id="old"),
                _row(created_at=today - timedelta(days=2), target_id="mid"),
                _row(created_at=today, target_id="new"),
            ])
            token = await _admin_token(app)
            async with _client(app) as c:
                r = await c.get(
                    "/api/admin/audit-logs?date_from=2026-02-13&date_to=2026-02-15",
                    headers={"Authorization": f"Bearer {token}"},
                )
            return r

        r = _run(go())
        body = r.json()
        assert body["total"] == 2
        ids = {row["target_id"] for row in body["logs"]}
        assert ids == {"mid", "new"}


# ── 4. Input validation ───────────────────────────────────────────


class TestInputValidation:
    def test_invalid_date_returns_400(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs?date_from=not-a-date",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 400, r.text

    def test_invalid_severity_returns_400(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs?severity=meh",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 400, r.text

    def test_invalid_actor_type_returns_400(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs?actor_type=alien",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 400, r.text


# ── 5. Defensive read-side masking ────────────────────────────────


class TestDefensiveMasking:
    """Hand-seed an unsafe audit row (simulating a future buggy writer) and
    verify the read endpoint strips/redacts every forbidden key."""

    def test_unsafe_seed_is_masked(self, app):
        async def go():
            import database as _database
            unsafe = _row(target_id="lead-unsafe")
            # Inject forbidden keys at multiple levels.
            unsafe["after_state"] = {
                "status": "contacted",
                "password": "shouldnotleak",
                "token": "tok_xyz",
                "notes": "private note",
                "answers": [1, 2, 3],
                "attribution": {"utm_source": "fb"},
                "nested": {
                    "api_key": "AKIA...",
                    "score_breakdown": {"x": 1},
                    "ok_field": "ok",
                },
            }
            unsafe["before_state"] = {
                "status": "new",
                "password_hash": "$2b$12$abc",
                "call_transcript": "...",
            }
            unsafe["metadata"] = {
                "ip": "1.2.3.4",
                "verification_token": "vt_123",
                "answers": [4, 5],
            }
            await _database.db.admin_audit_logs.insert_one(unsafe)
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["total"] == 1
        row = body["logs"][0]

        after = row["after_state"]
        # Redacted keys: present but with sentinel.
        assert after["password"] == "[REDACTED]"
        assert after["token"] == "[REDACTED]"
        assert after["nested"]["api_key"] == "[REDACTED]"
        # Dropped keys: gone entirely.
        assert "notes" not in after
        assert "answers" not in after
        assert "attribution" not in after
        assert "score_breakdown" not in after["nested"]
        # Surviving safe keys untouched.
        assert after["status"] == "contacted"
        assert after["nested"]["ok_field"] == "ok"

        before = row["before_state"]
        assert before["status"] == "new"
        assert before["password_hash"] == "[REDACTED]"
        assert "call_transcript" not in before

        meta = row["metadata"]
        assert meta["verification_token"] == "[REDACTED]"
        assert "answers" not in meta
        assert meta["ip"] == "1.2.3.4"

        # Full response serialised: forbidden values must not appear.
        import json as _json
        enc = _json.dumps(body)
        assert "shouldnotleak" not in enc
        assert "tok_xyz" not in enc
        assert "private note" not in enc
        assert "AKIA..." not in enc
        assert "$2b$12$abc" not in enc
        assert "vt_123" not in enc


# ── 6. _id never returned ─────────────────────────────────────────


class TestNoMongoId:
    def test_no_underscore_id_in_response(self, app):
        async def go():
            await _seed_rows([_row(target_id="l-1"), _row(target_id="l-2")])
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/admin/audit-logs",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        body = r.json()
        assert body["total"] == 2
        for row in body["logs"]:
            assert "_id" not in row


# ── 7. Rate limiting ──────────────────────────────────────────────


class TestRateLimit:
    def test_429_after_threshold(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                last = None
                for _ in range(30):
                    last = await c.get(
                        "/api/admin/audit-logs",
                        headers={"Authorization": f"Bearer {token}"},
                    )
                # 31st call within the window → 429.
                blocked = await c.get(
                    "/api/admin/audit-logs",
                    headers={"Authorization": f"Bearer {token}"},
                )
            return last, blocked

        last, blocked = _run(go())
        assert last.status_code == 200, last.text
        assert blocked.status_code == 429, blocked.text
