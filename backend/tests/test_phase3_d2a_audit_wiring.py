"""Phase 3 — Batch D2a audit wiring tests (in-process, isolated test DB).

Asserts that the critical governance/security endpoints emit the right
audit rows with NO PII / secrets / patient data in them.

Safety contract identical to A/B/C/D1: refuses production, drops the test
DB on teardown, autouse rate-limit reset, no real external provider IO.

Run with:
    cd /app/backend
    DB_NAME=zubite_test_phase3_d2a APP_ENV=test \\
        python -m pytest tests/test_phase3_d2a_audit_wiring.py -v
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ── 0. Force test-isolated env BEFORE any backend import ──────────
os.environ.setdefault("DB_NAME", "zubite_test_phase3_d2a")
os.environ.setdefault("APP_ENV", "test")
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"
os.environ.setdefault("SEED_ADMIN_PASSWORD", "Sup3rStr0ng!Pass-2026")
os.environ.setdefault("RESEND_API_KEY", "test_resend_key_no_network")
os.environ.setdefault("ADMIN_EMAIL", "admin-alerts@example.com")

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

import storage as _storage_mod  # noqa: E402
_storage_mod.init_storage = lambda: None  # type: ignore[assignment]

# Neutralise Resend at module level so nothing can leave the process.
import resend as _resend  # noqa: E402
_resend.Emails.send = MagicMock(return_value={"id": "test-no-send"})  # type: ignore[assignment]

from httpx import ASGITransport, AsyncClient  # noqa: E402

_LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(_LOOP)


def _run(coro):
    return _LOOP.run_until_complete(coro)


ADMIN_USERNAME = "admin@zubite.bg"
ADMIN_PASSWORD = "TestAdminPass1!"
CLINIC_A_EMAIL = "clinic-a-d2a@example.com"
CLINIC_A_PASSWORD = "ClinicAPass1!"
CLINIC_B_EMAIL = "clinic-b-d2a@example.com"
CLINIC_B_PASSWORD = "ClinicBPass1!"


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
        for email, pwd, name in (
            (CLINIC_A_EMAIL, CLINIC_A_PASSWORD, "Clinic A"),
            (CLINIC_B_EMAIL, CLINIC_B_PASSWORD, "Clinic B"),
        ):
            await db.clinics.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "clinic_name": name,
                    "city": "Sofia",
                    "email": email,
                    "phone": "+359888000000",
                    "password_hash": hash_password(pwd),
                    "status": "active",
                    "address": "Test",
                    "notification_email": email,
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
    """Clear rate-limit buckets, the audit collection, and the leads
    collection between tests so each test starts from a clean slate."""
    import rate_limit as _rl
    import database as _database

    _rl._buckets.clear()
    _run(_database.db.admin_audit_logs.delete_many({}))
    _run(_database.db.leads.delete_many({}))
    _run(_database.db.lead_verifications.delete_many({}))
    _run(_database.db.lead_call_logs.delete_many({}))
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


def _set_is_production(value: bool) -> None:
    import config as cfg
    import routers.admin as _admin

    cfg.IS_PRODUCTION = value
    _admin.IS_PRODUCTION = value


@pytest.fixture
def production_mode():
    _set_is_production(True)
    yield
    _set_is_production(False)


# ── Helpers ───────────────────────────────────────────────────────
async def _admin_token(app) -> str:
    async with _client(app) as c:
        r = await c.post(
            "/api/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        )
    r.raise_for_status()
    return r.json()["access_token"]


async def _get_clinic_id(email: str) -> str:
    import database as _database
    c = await _database.db.clinics.find_one({"email": email}, {"_id": 0, "id": 1})
    assert c is not None
    return c["id"]


async def _seed_lead(**overrides) -> str:
    """Insert a lead directly into the DB; bypasses the rate-limited public
    POST. Returns the lead id."""
    import database as _database
    doc = {
        "id": str(uuid.uuid4()),
        "city_slug": "sofia",
        "treatment_type": "invisalign",
        "name": "Patient Z",
        "phone": "+359888777SECRET-PHONE",
        "email": "leak@example.com",
        "consent": True,
        "answers": {"q1": "yes"},
        "can_travel": True,
        "score_total": 5,
        "band": "YELLOW",
        "status": "NEW",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    doc.update(overrides)
    await _database.db.leads.insert_one(doc)
    return doc["id"]


async def _all_audit_rows():
    import database as _database
    return await _database.db.admin_audit_logs.find(
        {}, {"_id": 0}
    ).sort("created_at", 1).to_list(1000)


async def _audit_actions():
    rows = await _all_audit_rows()
    return [r["action"] for r in rows]


# ─── 1. Admin login audit ─────────────────────────────────────────
class TestAdminLoginAudit:
    def test_successful_login_audited(self, app):
        async def go():
            async with _client(app) as c:
                r = await c.post(
                    "/api/admin/login",
                    json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
                )
            return r, await _all_audit_rows()

        r, rows = _run(go())
        assert r.status_code == 200
        success_rows = [x for x in rows if x["action"] == "auth.admin_login_succeeded"]
        assert len(success_rows) == 1
        row = success_rows[0]
        assert row["actor_type"] == "admin"
        assert row["actor_label"] == ADMIN_USERNAME
        # password MUST NOT appear anywhere in the stored row
        enc = json.dumps(row, default=str)
        assert ADMIN_PASSWORD not in enc

    def test_failed_login_audited_with_masked_username(self, app):
        async def go():
            async with _client(app) as c:
                r = await c.post(
                    "/api/admin/login",
                    json={"username": "ghost@example.com", "password": "wrong"},
                )
            return r, await _all_audit_rows()

        r, rows = _run(go())
        assert r.status_code == 401
        failed_rows = [x for x in rows if x["action"] == "auth.admin_login_failed"]
        assert len(failed_rows) == 1
        row = failed_rows[0]
        assert row["actor_type"] == "public"
        assert row["severity"] == "warning"
        # target_summary is the masked username; the FULL username MUST NOT
        # appear as a literal.
        enc = json.dumps(row, default=str)
        assert "ghost@example.com" not in enc
        # masked form: first char + "***" + @ + domain
        assert "g***@example.com" in enc
        assert "wrong" not in enc  # no password
        assert row["metadata"]["reason_code"] == "invalid_credentials"


# ─── 2. Lead admin actions ────────────────────────────────────────
class TestLeadAdminAudit:
    def test_patch_status_emits_status_changed_only(self, app):
        async def go():
            token = await _admin_token(app)
            lid = await _seed_lead()
            async with _client(app) as c:
                r = await c.patch(
                    f"/api/admin/leads/{lid}",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"status": "CONTACTED"},
                )
            return lid, r, await _all_audit_rows()

        lid, r, rows = _run(go())
        assert r.status_code == 200
        actions = [x["action"] for x in rows]
        # Login row from _admin_token + status change row
        assert "lead.status_changed" in actions
        sc = next(x for x in rows if x["action"] == "lead.status_changed")
        assert sc["target_id"] == lid
        assert sc["before_state"] == {"status": "NEW"}
        assert sc["after_state"] == {"status": "CONTACTED"}

    def test_patch_with_same_status_does_not_audit(self, app):
        async def go():
            token = await _admin_token(app)
            lid = await _seed_lead(status="NEW")
            async with _client(app) as c:
                r = await c.patch(
                    f"/api/admin/leads/{lid}",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"status": "NEW"},
                )
            return r, await _all_audit_rows()

        r, rows = _run(go())
        assert r.status_code == 200
        assert not any(x["action"] == "lead.status_changed" for x in rows)

    def test_patch_notes_emits_notes_changed_with_length_only(self, app):
        async def go():
            token = await _admin_token(app)
            lid = await _seed_lead()
            async with _client(app) as c:
                r = await c.patch(
                    f"/api/admin/leads/{lid}",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"notes": "Long internal note containing private follow-up plan"},
                )
            return r, await _all_audit_rows()

        r, rows = _run(go())
        assert r.status_code == 200
        notes_rows = [x for x in rows if x["action"] == "lead.notes_changed"]
        assert len(notes_rows) == 1
        meta = notes_rows[0]["metadata"]
        assert meta["notes_changed"] is True
        assert meta["notes_length_before"] == 0
        assert isinstance(meta["notes_length_after"], int)
        assert meta["notes_length_after"] > 10
        # Note body must NOT appear in any audit row.
        enc = json.dumps(rows, default=str)
        assert "follow-up plan" not in enc

    def test_put_profile_update_emits_changed_fields_only(self, app):
        async def go():
            token = await _admin_token(app)
            lid = await _seed_lead()
            async with _client(app) as c:
                r = await c.put(
                    f"/api/admin/leads/{lid}",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "name": "New Name Should Not Leak",
                        "phone": "+359SECRET999",
                        "email": "secret@example.com",
                        "status": "CONTACTED",
                    },
                )
            return r, await _all_audit_rows()

        r, rows = _run(go())
        assert r.status_code == 200
        prof = next(x for x in rows if x["action"] == "lead.profile_updated")
        # changed_fields lists keys only, never values.
        assert set(prof["metadata"]["changed_fields"]) == {"name", "phone", "email", "status"}
        # status changed → status_changed row also emitted
        assert any(x["action"] == "lead.status_changed" for x in rows)
        # Defence in depth: no PII values in any audit row
        enc = json.dumps(rows, default=str)
        for forbidden in (
            "New Name Should Not Leak", "+359SECRET999", "secret@example.com",
        ):
            assert forbidden not in enc, f"PII leaked into audit: {forbidden}"

    def test_delete_lead_emits_warning_with_no_pii(self, app):
        async def go():
            token = await _admin_token(app)
            lid = await _seed_lead()
            async with _client(app) as c:
                r = await c.delete(
                    f"/api/admin/leads/{lid}",
                    headers={"Authorization": f"Bearer {token}"},
                )
            return lid, r, await _all_audit_rows()

        lid, r, rows = _run(go())
        assert r.status_code == 200
        dl = next(x for x in rows if x["action"] == "lead.deleted")
        assert dl["severity"] == "warning"
        assert dl["target_id"] == lid
        # before_state is allow-listed → no name/phone/email/answers
        bs = dl.get("before_state") or {}
        forbidden = {"name", "phone", "email", "answers", "score_breakdown",
                     "notes", "admin_notes"}
        leaked = forbidden & set(bs.keys())
        assert not leaked, f"lead.deleted leaks {sorted(leaked)}"
        # Full row check
        enc = json.dumps(rows, default=str)
        assert "+359888777SECRET-PHONE" not in enc
        assert "leak@example.com" not in enc

    def test_csv_export_emits_row_count_no_data(self, app):
        async def go():
            token = await _admin_token(app)
            # Seed two leads with identical schema (CSV writer uses the first
            # row's keys as fieldnames; differing keys would crash an
            # unrelated pre-existing bug in the endpoint, out of D2a scope).
            await _seed_lead()
            await _seed_lead()
            async with _client(app) as c:
                r = await c.get(
                    "/api/admin/leads/export/csv?band=YELLOW",
                    headers={"Authorization": f"Bearer {token}"},
                )
            return r, await _all_audit_rows()

        r, rows = _run(go())
        assert r.status_code == 200
        exp = next(x for x in rows if x["action"] == "lead.exported_csv")
        assert exp["metadata"]["row_count"] >= 2
        assert exp["metadata"]["filters"] == {"band": "YELLOW"}
        # No exported PII in audit row
        enc = json.dumps(exp, default=str)
        assert "+359888777SECRET-PHONE" not in enc
        assert "+359OTHER1234" not in enc
        assert "leak@example.com" not in enc


# ─── 3. Lead assignment audit ─────────────────────────────────────
class TestLeadAssignmentAudit:
    def test_first_assignment_audited(self, app):
        async def go():
            token = await _admin_token(app)
            lid = await _seed_lead()
            clinic_a = await _get_clinic_id(CLINIC_A_EMAIL)
            async with _client(app) as c:
                r = await c.patch(
                    f"/api/admin/leads/{lid}/assign-clinic",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"clinic_id": clinic_a},
                )
            return lid, clinic_a, r, await _all_audit_rows()

        lid, clinic_a, r, rows = _run(go())
        assert r.status_code == 200
        actions = [x["action"] for x in rows]
        assert "lead.assigned_to_clinic" in actions
        assert "lead.reassigned_to_clinic" not in actions
        a = next(x for x in rows if x["action"] == "lead.assigned_to_clinic")
        assert a["target_id"] == lid
        assert a["before_state"] == {"assigned_clinic_id": None}
        assert a["after_state"] == {"assigned_clinic_id": clinic_a}
        assert a["metadata"]["new_clinic_id"] == clinic_a
        assert a["severity"] == "info"

    def test_idempotent_same_clinic_does_not_audit(self, app):
        async def go():
            token = await _admin_token(app)
            lid = await _seed_lead()
            clinic_a = await _get_clinic_id(CLINIC_A_EMAIL)
            async with _client(app) as c:
                await c.patch(
                    f"/api/admin/leads/{lid}/assign-clinic",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"clinic_id": clinic_a},
                )
                await c.patch(
                    f"/api/admin/leads/{lid}/assign-clinic",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"clinic_id": clinic_a},
                )
            return await _all_audit_rows()

        rows = _run(go())
        assigned = [x for x in rows if x["action"] == "lead.assigned_to_clinic"]
        reassigned = [x for x in rows if x["action"] == "lead.reassigned_to_clinic"]
        assert len(assigned) == 1
        assert len(reassigned) == 0

    def test_reassignment_audited_with_warning_severity(self, app):
        async def go():
            token = await _admin_token(app)
            lid = await _seed_lead()
            clinic_a = await _get_clinic_id(CLINIC_A_EMAIL)
            clinic_b = await _get_clinic_id(CLINIC_B_EMAIL)
            async with _client(app) as c:
                await c.patch(
                    f"/api/admin/leads/{lid}/assign-clinic",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"clinic_id": clinic_a},
                )
                await c.patch(
                    f"/api/admin/leads/{lid}/assign-clinic",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"clinic_id": clinic_b},
                )
            return clinic_a, clinic_b, await _all_audit_rows()

        clinic_a, clinic_b, rows = _run(go())
        re = [x for x in rows if x["action"] == "lead.reassigned_to_clinic"]
        assert len(re) == 1
        assert re[0]["severity"] == "warning"
        assert re[0]["before_state"] == {"assigned_clinic_id": clinic_a}
        assert re[0]["after_state"] == {"assigned_clinic_id": clinic_b}
        assert re[0]["metadata"]["previous_clinic_id"] == clinic_a
        assert re[0]["metadata"]["new_clinic_id"] == clinic_b


# ─── 4. Destructive endpoints audit ───────────────────────────────
class TestDestructiveEndpointAudit:
    def test_reset_analytics_blocked_in_production(self, app, production_mode):  # noqa: ARG002
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                r = await c.post(
                    "/api/admin/reset-analytics",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"confirmation_token": "CONFIRM_RESET_ANALYTICS"},
                )
            return r, await _all_audit_rows()

        r, rows = _run(go())
        assert r.status_code == 403
        assert any(x["action"] == "reset_analytics.blocked_production" for x in rows)
        # No "executed" row in prod-block path
        assert not any(x["action"] == "reset_analytics.executed" for x in rows)

    def test_reset_analytics_executed_in_non_production(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                r = await c.post(
                    "/api/admin/reset-analytics",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"confirmation_token": "CONFIRM_RESET_ANALYTICS"},
                )
            return r, await _all_audit_rows()

        r, rows = _run(go())
        assert r.status_code == 200
        ex = next(x for x in rows if x["action"] == "reset_analytics.executed")
        assert ex["severity"] == "critical"
        assert ex["metadata"]["confirmation_token_ok"] is True

    def test_reset_blog_views_audited(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                # Bad confirmation first
                bad = await c.post(
                    "/api/admin/reset-blog-views",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"confirmation_token": "WRONG"},
                )
                good = await c.post(
                    "/api/admin/reset-blog-views",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"confirmation_token": "CONFIRM_RESET_BLOG_VIEWS"},
                )
            return bad, good, await _all_audit_rows()

        bad, good, rows = _run(go())
        assert bad.status_code == 400
        assert good.status_code == 200
        actions = [x["action"] for x in rows]
        assert "reset_blog_views.attempted" in actions
        assert "reset_blog_views.executed" in actions
        # Confirmation token VALUE must not appear in any audit row
        enc = json.dumps(rows, default=str)
        assert "CONFIRM_RESET_BLOG_VIEWS" not in enc
        assert "WRONG" not in enc

    def test_cleanup_leads_blocked_production(self, app, production_mode):  # noqa: ARG002
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                r = await c.post(
                    "/api/admin/cleanup-leads",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "confirmation_token": "CONFIRM_DELETE_NON_MATCHING_LEADS",
                        "keep_ids": ["a", "b", "c"],
                    },
                )
            return r, await _all_audit_rows()

        r, rows = _run(go())
        assert r.status_code == 403
        cb = next(x for x in rows if x["action"] == "cleanup_leads.blocked_production")
        assert cb["metadata"]["keep_ids_count"] == 3
        # keep_ids VALUES must NOT appear (only count)
        enc = json.dumps(rows, default=str)
        for v in ("\"a\"", "\"b\"", "\"c\""):
            assert v not in enc

    def test_cleanup_leads_blocked_majority(self, app):
        async def go():
            token = await _admin_token(app)
            ids = [await _seed_lead() for _ in range(10)]
            async with _client(app) as c:
                r = await c.post(
                    "/api/admin/cleanup-leads",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "confirmation_token": "CONFIRM_DELETE_NON_MATCHING_LEADS",
                        "keep_ids": ids[:3],
                    },
                )
            import database as _database
            await _database.db.leads.delete_many({})
            return r, await _all_audit_rows(), ids

        r, rows, ids = _run(go())
        assert r.status_code == 400
        bm = next(x for x in rows if x["action"] == "cleanup_leads.blocked_majority")
        assert bm["metadata"]["n_to_delete"] == 7
        assert bm["metadata"]["total_before"] == 10
        assert bm["metadata"]["force"] is False
        # keep_ids list values must not be in row
        enc = json.dumps(rows, default=str)
        for lid in ids:
            assert lid not in enc, f"lead id {lid} leaked into audit"

    def test_cleanup_leads_executed(self, app):
        async def go():
            token = await _admin_token(app)
            ids = [await _seed_lead() for _ in range(4)]
            async with _client(app) as c:
                r = await c.post(
                    "/api/admin/cleanup-leads",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "confirmation_token": "CONFIRM_DELETE_NON_MATCHING_LEADS",
                        "keep_ids": ids[:3],
                    },
                )
            import database as _database
            await _database.db.leads.delete_many({})
            return r, await _all_audit_rows()

        r, rows = _run(go())
        assert r.status_code == 200
        ex = next(x for x in rows if x["action"] == "cleanup_leads.executed")
        assert ex["severity"] == "critical"
        assert ex["metadata"]["deleted_count"] == 1
        assert ex["metadata"]["total_before"] == 4
        assert ex["metadata"]["confirmation_token_ok"] is True

    def test_no_audit_row_contains_confirmation_token_values(self, app):
        async def go():
            token = await _admin_token(app)
            async with _client(app) as c:
                await c.post(
                    "/api/admin/reset-analytics",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"confirmation_token": "CONFIRM_RESET_ANALYTICS"},
                )
            return await _all_audit_rows()

        rows = _run(go())
        enc = json.dumps(rows, default=str)
        for token_val in (
            "CONFIRM_RESET_ANALYTICS",
            "CONFIRM_RESET_BLOG_VIEWS",
            "CONFIRM_DELETE_NON_MATCHING_LEADS",
        ):
            assert token_val not in enc, (
                f"confirmation token VALUE {token_val!r} leaked into audit"
            )


# ─── 5. Seed audit ────────────────────────────────────────────────
class TestSeedAudit:
    async def _wipe_seed(self):
        import database as _database
        await _database.db.clinics.delete_many({})
        await _database.db.admin_users.delete_many({})

    async def _restore_admin(self):
        """Restore the bootstrap admin AND the two test clinics A/B that the
        module-scoped bootstrap fixture seeded. Necessary because some seed
        tests wipe `clinics` and `admin_users` (and `test_seed_executed`
        reseeds with city-directory clinics, not our test clinics)."""
        import database as _database
        from auth import hash_password
        # Clear ALL admin users so we don't end up with stale rows whose
        # password hashes don't match ADMIN_PASSWORD.
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
        # Restore the two test clinics if they're missing (a previous seed
        # test may have wiped the clinics collection).
        for email, pwd, name in (
            (CLINIC_A_EMAIL, CLINIC_A_PASSWORD, "Clinic A"),
            (CLINIC_B_EMAIL, CLINIC_B_PASSWORD, "Clinic B"),
        ):
            if await _database.db.clinics.find_one({"email": email}, {"_id": 0, "id": 1}):
                continue
            await _database.db.clinics.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "clinic_name": name,
                    "city": "Sofia",
                    "email": email,
                    "phone": "+359888000000",
                    "password_hash": hash_password(pwd),
                    "status": "active",
                    "address": "Test",
                    "notification_email": email,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )

    def test_seed_blocked_in_production(self, app, production_mode):  # noqa: ARG002
        async def go():
            await self._wipe_seed()
            async with _client(app) as c:
                r = await c.post("/api/seed")
            return r, await _all_audit_rows()

        try:
            r, rows = _run(go())
            assert r.status_code == 403
            sb = next(x for x in rows if x["action"] == "seed.blocked_production")
            assert sb["actor_type"] == "system"
            assert sb["metadata"]["reason_code"] == "production_blocked"
        finally:
            _run(self._restore_admin())

    @pytest.mark.parametrize(
        "password,expected_reason", [
            ("", "missing"),
            ("password", "weak"),
            ("admin", "weak"),
            ("Short1!", "short"),
            (ADMIN_USERNAME, "username_equal"),
        ],
    )
    def test_seed_rejected_password_emits_reason_code(self, app, monkeypatch, password, expected_reason):
        async def go():
            await self._wipe_seed()
            if password == "":
                monkeypatch.delenv("SEED_ADMIN_PASSWORD", raising=False)
            else:
                monkeypatch.setenv("SEED_ADMIN_PASSWORD", password)
            async with _client(app) as c:
                r = await c.post("/api/seed")
            return r, await _all_audit_rows()

        try:
            r, rows = _run(go())
            assert r.status_code == 400, r.text
            sw = next(x for x in rows if x["action"] == "seed.rejected_weak_password")
            assert sw["metadata"]["reason_code"] == expected_reason
            # Password VALUE must never appear as a JSON-quoted field value
            # in any audit row. We can't assert the literal substring isn't
            # present (e.g. "password" is part of the action name itself), so
            # we look for the JSON-quoted forms a leaked value would take.
            if password:
                enc = json.dumps(rows, default=str)
                for q in (f'"{password}"', f"'{password}'"):
                    assert q not in enc, (
                        f"password value {password!r} leaked into audit row as {q!r}"
                    )
        finally:
            _run(self._restore_admin())

    def test_seed_executed_in_non_production(self, app, monkeypatch):
        async def go():
            await self._wipe_seed()
            monkeypatch.setenv("SEED_ADMIN_PASSWORD", "Sup3rStr0ng!Pass-2026")
            async with _client(app) as c:
                r = await c.post("/api/seed")
            return r, await _all_audit_rows()

        try:
            r, rows = _run(go())
            assert r.status_code == 200, r.text
            ex = next(x for x in rows if x["action"] == "seed.executed")
            assert ex["severity"] == "critical"
            # Password value never appears
            enc = json.dumps(rows, default=str)
            assert "Sup3rStr0ng!Pass-2026" not in enc
        finally:
            # The seed actually created admin@zubite.bg with the strong
            # password — restore the bootstrap admin so later tests can log in.
            _run(self._restore_admin())


# ─── 6. Verification audit ────────────────────────────────────────
class TestVerificationAudit:
    async def _setup(self, app) -> tuple[str, str]:
        import database as _database
        import secrets as _secrets
        await _database.db.lead_verifications.delete_many({})
        lid = await _seed_lead()
        clinic_a = await _get_clinic_id(CLINIC_A_EMAIL)
        await _database.db.leads.update_one(
            {"id": lid}, {"$set": {"assigned_clinic_id": clinic_a}}
        )
        token = _secrets.token_urlsafe(32)
        await _database.db.lead_verifications.insert_one(
            {
                "id": str(uuid.uuid4()),
                "lead_id": lid,
                "clinic_id": clinic_a,
                "token": token,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        return lid, token

    def test_response_yes_emits_responded_only(self, app):
        async def go():
            lid, token = await self._setup(app)
            async with _client(app) as c:
                r = await c.get(f"/api/verify/{token}", params={"response": "yes"})
            return lid, token, r, await _all_audit_rows()

        lid, token, r, rows = _run(go())
        assert r.status_code == 200
        actions = [x["action"] for x in rows]
        assert "verification.responded" in actions
        assert "verification.flagged" not in actions
        responded = next(x for x in rows if x["action"] == "verification.responded")
        assert responded["actor_type"] == "public"
        assert responded["metadata"]["response"] == "yes"
        # Token VALUE must NEVER appear in audit row
        enc = json.dumps(rows, default=str)
        assert token not in enc

    def test_response_no_emits_responded_and_flagged(self, app):
        async def go():
            lid, token = await self._setup(app)
            async with _client(app) as c:
                r = await c.get(f"/api/verify/{token}", params={"response": "no"})
            return token, r, await _all_audit_rows()

        token, r, rows = _run(go())
        assert r.status_code == 200
        actions = [x["action"] for x in rows]
        assert "verification.responded" in actions
        assert "verification.flagged" in actions
        flagged = next(x for x in rows if x["action"] == "verification.flagged")
        assert flagged["severity"] == "warning"
        assert flagged["metadata"]["response"] == "no"
        assert "alert_email_attempted" in flagged["metadata"]
        enc = json.dumps(rows, default=str)
        assert token not in enc


# ─── 8. Resilience ────────────────────────────────────────────────
class TestAuditResilience:
    """The audit helper wraps its entire body in try/except — so an
    `insert_one` failure inside the helper must NEVER propagate to the
    business endpoint. We simulate the real failure mode (DB outage)
    rather than patching the helper itself, which would bypass the
    helper's own safety net."""

    def test_lead_status_change_succeeds_when_audit_db_fails(self, app):
        import database as _database

        async def go():
            token = await _admin_token(app)
            lid = await _seed_lead()
            # Patch the actual insert call inside the helper to raise.
            with patch.object(
                _database.db.admin_audit_logs, "insert_one",
                new=AsyncMock(side_effect=RuntimeError("simulated audit DB outage")),
            ):
                async with _client(app) as c:
                    r = await c.patch(
                        f"/api/admin/leads/{lid}",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"status": "CONTACTED"},
                    )
            refetch = await _database.db.leads.find_one(
                {"id": lid}, {"_id": 0, "status": 1}
            )
            return r, refetch

        r, refetch = _run(go())
        assert r.status_code == 200, r.text
        assert refetch["status"] == "CONTACTED", (
            "lead status update was rolled back by an audit DB failure"
        )

    def test_destructive_endpoint_blocks_correctly_when_audit_db_fails(self, app):
        """Even if the audit DB is down, the destructive endpoint MUST still
        return the correct security response (400 for bad confirmation)."""
        import database as _database

        async def go():
            token = await _admin_token(app)
            with patch.object(
                _database.db.admin_audit_logs, "insert_one",
                new=AsyncMock(side_effect=RuntimeError("simulated audit DB outage")),
            ):
                async with _client(app) as c:
                    r = await c.post(
                        "/api/admin/reset-analytics",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"confirmation_token": "WRONG"},
                    )
            return r

        r = _run(go())
        assert r.status_code == 400, r.text
        # No analytics_events were deleted because the security guard fired.
        body = r.json()
        assert "CONFIRM_RESET_ANALYTICS" in body.get("detail", "")


# ─── 9. Sanitisation integration sweep ────────────────────────────
class TestSanitisationSweep:
    def test_full_suite_audit_collection_contains_no_secrets_or_pii(self, app):
        """Run a representative set of endpoints, then sweep every audit row
        for forbidden strings."""

        async def go():
            token = await _admin_token(app)  # login + token
            lid = await _seed_lead(
                phone="+359SWEEP-PHONE", email="sweep@example.com",
                name="Sweep Patient",
            )
            clinic_a = await _get_clinic_id(CLINIC_A_EMAIL)
            async with _client(app) as c:
                # 1. status change
                await c.patch(
                    f"/api/admin/leads/{lid}",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"status": "CONTACTED"},
                )
                # 2. profile update (sensitive values)
                await c.put(
                    f"/api/admin/leads/{lid}",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"name": "Renamed Pii", "phone": "+359RENAMED",
                          "email": "renamed@example.com"},
                )
                # 3. assign clinic
                await c.patch(
                    f"/api/admin/leads/{lid}/assign-clinic",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"clinic_id": clinic_a},
                )
                # 4. destructive (with bad token to exercise blocked path)
                await c.post(
                    "/api/admin/reset-analytics",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"confirmation_token": "BadTokenLOL"},
                )
                # 5. csv export
                await c.get(
                    "/api/admin/leads/export/csv",
                    headers={"Authorization": f"Bearer {token}"},
                )
            return await _all_audit_rows()

        rows = _run(go())
        enc = json.dumps(rows, default=str)
        forbidden_strings = [
            # Submitted PII values
            "+359SWEEP-PHONE", "sweep@example.com", "Sweep Patient",
            "+359RENAMED", "renamed@example.com", "Renamed Pii",
            # Auth credentials
            ADMIN_PASSWORD,
            # Confirmation tokens
            "CONFIRM_RESET_ANALYTICS", "CONFIRM_RESET_BLOG_VIEWS",
            "CONFIRM_DELETE_NON_MATCHING_LEADS",
            "BadTokenLOL",
            # Quiz / attribution markers (none seeded, but verify absence)
            "score_breakdown", "answers",
        ]
        # Note: "score_breakdown" / "answers" appear as keys ONLY if a
        # caller mistakenly sent them; we never include them.
        for needle in forbidden_strings:
            assert needle not in enc, (
                f"Audit collection leaks {needle!r}. Full encoded preview:\n"
                f"{enc[:1000]}"
            )

        # All rows must carry a valid action string
        for r in rows:
            assert isinstance(r["action"], str) and len(r["action"]) > 0
