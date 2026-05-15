"""Phase 3 — Batch D1 audit foundation tests.

Tests the helper, sanitiser, action allow-list, severity allow-list,
metadata truncation, and feature-flag kill switch. NO router wiring is
tested here; that's Batch D2.

Safety contract identical to Batch A/B/C: in-process only, isolated test
DB, refuse production, drop DB on teardown.
"""
from __future__ import annotations

import asyncio
import importlib
import os
import sys
import uuid
from pathlib import Path

import pytest

# ── 0. Force test-isolated env BEFORE any backend import ──────────
os.environ.setdefault("DB_NAME", "zubite_test_phase3_d1_audit")
os.environ.setdefault("APP_ENV", "test")
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"

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

# Single shared event loop so motor's IOLoop binds once for the whole module.
_LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(_LOOP)


def _run(coro):
    return _LOOP.run_until_complete(coro)


@pytest.fixture(scope="module", autouse=True)
def _bootstrap():
    """Wipe the test DB up-front and drop it at teardown."""
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
def _wipe_audit_collection():
    """Each test starts with an empty `admin_audit_logs` collection so
    assertions like `count_documents({})` are deterministic."""
    import database as _database

    _run(_database.db.admin_audit_logs.delete_many({}))
    yield


@pytest.fixture(autouse=True)
def _no_backup_artifacts():
    """The D1 suite must not produce backup files."""
    backup_dir = _REPO_ROOT / "test_reports" / "backups"
    before = set(backup_dir.glob("leads_*.json")) if backup_dir.exists() else set()
    yield
    after = set(backup_dir.glob("leads_*.json")) if backup_dir.exists() else set()
    created = after - before
    for p in created:
        p.unlink(missing_ok=True)
    assert not created, f"Unexpected backup artefacts: {created}"


# ─── Sanitiser tests (pure functions, no IO) ──────────────────────
class TestSanitizer:
    def test_redacts_top_level_secrets(self):
        import audit

        out = audit._sanitize({
            "password": "hunter2",
            "password_hash": "$2b$abc",
            "token": "eyJ.foo.bar",
            "access_token": "x",
            "refresh_token": "y",
            "jwt": "z",
            "api_key": "sk-abc",
            "apikey": "sk-DEF",
            "resend_api_key": "re_secret",
            "twilio_auth_token": "twk",
            "elevenlabs_api_key": "elk",
            "revalidate_secret": "rs",
            "jwt_secret": "js",
            "webhook_secret": "ws",
            "signing_secret": "ss",
            "verification_token": "vt",
            "secret": "s",
            "secret_key": "sk",
            "private_key": "pk",
            "authorization": "Bearer abc",
            "bearer": "tok",
            "kept": "ok",
        })
        for k in (
            "password", "password_hash", "token", "access_token", "refresh_token",
            "jwt", "api_key", "apikey", "resend_api_key", "twilio_auth_token",
            "elevenlabs_api_key", "revalidate_secret", "jwt_secret",
            "webhook_secret", "signing_secret", "verification_token",
            "secret", "secret_key", "private_key", "authorization", "bearer",
        ):
            assert out[k] == "[REDACTED]", f"{k} not redacted"
        assert out["kept"] == "ok"

    def test_redacts_case_insensitively(self):
        import audit

        out = audit._sanitize({
            "Password": "x", "PASSWORD_HASH": "y", "API_Key": "z", "JWT": "j",
        })
        assert out["Password"] == "[REDACTED]"
        assert out["PASSWORD_HASH"] == "[REDACTED]"
        assert out["API_Key"] == "[REDACTED]"
        assert out["JWT"] == "[REDACTED]"

    def test_redacts_nested_secrets_in_dicts_and_lists(self):
        import audit

        payload = {
            "outer": {
                "inner": {"password": "p1", "api_key": "k1"},
                "list": [
                    {"token": "t1", "ok": 1},
                    "literal",
                    [{"jwt": "j2"}, {"webhook_secret": "ws2"}],
                ],
            },
            "siblings": [{"refresh_token": "rt"}],
        }
        out = audit._sanitize(payload)
        assert out["outer"]["inner"]["password"] == "[REDACTED]"
        assert out["outer"]["inner"]["api_key"] == "[REDACTED]"
        assert out["outer"]["list"][0]["token"] == "[REDACTED]"
        assert out["outer"]["list"][0]["ok"] == 1
        assert out["outer"]["list"][1] == "literal"
        assert out["outer"]["list"][2][0]["jwt"] == "[REDACTED]"
        assert out["outer"]["list"][2][1]["webhook_secret"] == "[REDACTED]"
        assert out["siblings"][0]["refresh_token"] == "[REDACTED]"

    def test_drops_forbidden_keys(self):
        import audit

        payload = {
            "answers": {"q1": "yes"},
            "score_breakdown": {"a": 1},
            "content_path_before_conversion": [{"page": "/x"}],
            "attribution": {"src": "fb"},
            "call_transcript": "long…",
            "call_outcome_json": {"k": "v"},
            "call_outcome_summary": "summary",
            "raw_webhook_body": "bytes",
            "webhook_payload": "p",
            "notes": "internal",
            "admin_notes": "more",
            "internal_notes": "yet more",
            "kept": "ok",
        }
        out = audit._sanitize(payload)
        for forbidden in (
            "answers", "score_breakdown", "content_path_before_conversion",
            "attribution", "call_transcript", "call_outcome_json",
            "call_outcome_summary", "raw_webhook_body", "webhook_payload",
            "notes", "admin_notes", "internal_notes",
        ):
            assert forbidden not in out, f"{forbidden} not dropped"
        assert out["kept"] == "ok"

    def test_drops_forbidden_keys_nested(self):
        import audit

        payload = {
            "lead": {
                "answers": {"q1": "yes"},
                "call_transcript": "secret call",
                "notes": "internal",
                "id": "abc",
            },
            "list": [{"answers": {"x": 1}}, {"id": "xyz"}],
        }
        out = audit._sanitize(payload)
        assert "answers" not in out["lead"]
        assert "call_transcript" not in out["lead"]
        assert "notes" not in out["lead"]
        assert out["lead"]["id"] == "abc"
        assert "answers" not in out["list"][0]
        assert out["list"][1]["id"] == "xyz"

    def test_lead_target_type_keeps_only_allowed(self):
        import audit

        payload = {
            "status": "CONTACTED",
            "clinic_lead_status": "contacted",
            "assigned_clinic_id": "clinic-uuid",
            "band": "YELLOW",
            "city_slug": "sofia",
            "treatment_type": "invisalign",
            "is_potential_duplicate": True,
            "duplicate_reason": "phone",
            # Forbidden on the lead allow-list:
            "name": "Patient X",
            "phone": "+359...",
            "email": "p@example.com",
            "answers": {"q1": "yes"},
            "score_breakdown": {"a": 1},
            "first_utm_source": "fb",
            "first_utm_campaign": "spring",
            "latest_utm_source": "google",
            "content_path_before_conversion": [{"page": "/x"}],
            "notes": "internal",
            "verification_token": "should redact then drop",
        }
        out = audit._sanitize(payload, target_type="lead")
        allowed = {
            "status", "clinic_lead_status", "assigned_clinic_id", "band",
            "city_slug", "treatment_type",
            "is_potential_duplicate", "duplicate_reason",
        }
        assert set(out.keys()) <= allowed
        # The bulk-leak fields must not be present
        for forbidden in (
            "name", "phone", "email", "answers", "score_breakdown",
            "first_utm_source", "first_utm_campaign", "latest_utm_source",
            "content_path_before_conversion", "notes", "verification_token",
        ):
            assert forbidden not in out

    def test_unknown_target_type_drops_everything(self):
        import audit

        out = audit._sanitize({"status": "X", "anything": 1}, target_type="not_a_type")
        assert out == {}

    def test_user_agent_truncated_to_200(self):
        """`_extract_request_meta` truncates UA. Mock a request-like object."""
        import audit

        class _Req:
            def __init__(self, ua: str, ip: str = "1.2.3.4"):
                self.headers = {"user-agent": ua}
                self.client = type("C", (), {"host": ip})()

        long_ua = "x" * 1000
        ip, ua = audit._extract_request_meta(_Req(long_ua))
        assert ip == "1.2.3.4"
        assert len(ua) == 200
        assert ua == "x" * 200

    def test_request_meta_handles_none(self):
        import audit

        ip, ua = audit._extract_request_meta(None)
        assert ip is None
        assert ua is None

    def test_request_meta_uses_xff_first_hop(self):
        import audit

        class _Req:
            headers = {"x-forwarded-for": "9.9.9.9, 10.0.0.1", "user-agent": "ua"}
            client = type("C", (), {"host": "127.0.0.1"})()

        ip, _ = audit._extract_request_meta(_Req())
        assert ip == "9.9.9.9"


class TestMetadataTruncation:
    def test_small_metadata_kept(self):
        import audit

        meta = {"count": 5, "force": True, "reason": "weak"}
        out = audit._sanitize_metadata(meta)
        assert out == meta

    def test_oversized_metadata_truncated(self):
        import audit

        big = {"blob": "x" * 5000}
        out = audit._sanitize_metadata(big)
        assert out == {"_truncated": True}

    def test_non_dict_metadata_truncated(self):
        import audit

        out = audit._sanitize_metadata(["not", "a", "dict"])
        assert out == {"_truncated": True}

    def test_metadata_drops_forbidden_and_redacts_secrets(self):
        import audit

        out = audit._sanitize_metadata({
            "password": "x",
            "notes": "internal",
            "count": 3,
            "answers": {"q": "y"},
        })
        assert out.get("password") == "[REDACTED]"
        assert "notes" not in out
        assert "answers" not in out
        assert out["count"] == 3


# ─── diff_fields tests ────────────────────────────────────────────
class TestDiffFields:
    def test_returns_only_changed_keys(self):
        import audit

        before, after = audit.diff_fields(
            {"status": "NEW", "band": "RED", "city_slug": "sofia"},
            {"status": "CONTACTED", "band": "RED", "city_slug": "sofia"},
            ["status", "band", "city_slug"],
        )
        assert before == {"status": "NEW"}
        assert after == {"status": "CONTACTED"}

    def test_ignores_keys_outside_list(self):
        import audit

        before, after = audit.diff_fields(
            {"status": "NEW", "password_hash": "old"},
            {"status": "CONTACTED", "password_hash": "new"},
            ["status"],  # password_hash NOT in keys list
        )
        assert "password_hash" not in before
        assert "password_hash" not in after
        assert before == {"status": "NEW"}
        assert after == {"status": "CONTACTED"}

    def test_handles_missing_values(self):
        import audit

        before, after = audit.diff_fields(
            None, {"status": "NEW"}, ["status"]
        )
        assert before == {"status": None}
        assert after == {"status": "NEW"}

    def test_returns_empty_when_nothing_changed(self):
        import audit

        b, a = audit.diff_fields(
            {"status": "NEW"}, {"status": "NEW"}, ["status"]
        )
        assert b == {} and a == {}


# ─── audit_log writes ─────────────────────────────────────────────
class TestAuditLogWrites:
    def test_writes_valid_row(self):
        import audit
        import database as _database

        async def go():
            await audit.audit_log(
                "lead.status_changed",
                actor=None,
                actor_type="admin",
                target_type="lead",
                target_id="lead-123",
                target_summary="Lead status NEW → CONTACTED",
                before_state={"status": "NEW"},
                after_state={"status": "CONTACTED"},
                metadata={"changed_by": "admin@zubite.bg"},
                severity="info",
            )
            return await _database.db.admin_audit_logs.find_one(
                {"target_id": "lead-123"}, {"_id": 0}
            )

        row = _run(go())
        assert row is not None
        assert row["action"] == "lead.status_changed"
        assert row["actor_type"] == "admin"
        assert row["target_type"] == "lead"
        assert row["target_id"] == "lead-123"
        assert row["severity"] == "info"
        assert row["before_state"] == {"status": "NEW"}
        assert row["after_state"] == {"status": "CONTACTED"}
        assert row["metadata"]["changed_by"] == "admin@zubite.bg"
        # Required fields
        assert isinstance(row["id"], str)
        assert isinstance(row["created_at"], str)

    def test_actor_extracted_from_admin_user(self):
        import audit
        from schemas import AdminUser
        import database as _database

        actor = AdminUser(id="admin-1", username="admin@zubite.bg")

        async def go():
            await audit.audit_log(
                "auth.admin_login_succeeded",
                actor=actor,
                target_type="system",
                target_id=None,
            )
            return await _database.db.admin_audit_logs.find_one(
                {"action": "auth.admin_login_succeeded"}, {"_id": 0}
            )

        row = _run(go())
        assert row["actor_id"] == "admin-1"
        assert row["actor_label"] == "admin@zubite.bg"

    def test_failure_does_not_raise(self, monkeypatch):
        import audit
        import database as _database

        async def boom(*args, **kwargs):
            raise RuntimeError("simulated DB outage")

        monkeypatch.setattr(_database.db.admin_audit_logs, "insert_one", boom)

        async def go():
            # If this raises, the test fails. It must not.
            await audit.audit_log(
                "lead.status_changed",
                target_type="lead",
                target_id="x",
            )

        _run(go())

    def test_disabled_flag_skips_write(self, monkeypatch):
        import audit
        import database as _database

        monkeypatch.setattr(audit, "AUDIT_LOGS_ENABLED", False)

        async def go():
            await audit.audit_log(
                "lead.status_changed",
                target_type="lead",
                target_id="disabled-test",
            )
            return await _database.db.admin_audit_logs.count_documents(
                {"target_id": "disabled-test"}
            )

        n = _run(go())
        assert n == 0

    def test_unknown_action_still_writes_and_warns(self, caplog):
        import audit
        import database as _database

        async def go():
            with caplog.at_level("WARNING", logger="zubite.audit"):
                await audit.audit_log(
                    "lead.not_a_real_action",
                    target_type="lead",
                    target_id="ua-test",
                )
            return await _database.db.admin_audit_logs.find_one(
                {"target_id": "ua-test"}, {"_id": 0}
            )

        row = _run(go())
        assert row is not None
        assert row["action"] == "lead.not_a_real_action"
        assert any("unknown_audit_action" in r.message for r in caplog.records)

    @pytest.mark.parametrize("sev", ["info", "warning", "critical"])
    def test_valid_severity_accepted(self, sev):
        import audit
        import database as _database

        async def go():
            await audit.audit_log(
                "lead.status_changed",
                target_type="lead",
                target_id=f"sev-{sev}",
                severity=sev,
            )
            return await _database.db.admin_audit_logs.find_one(
                {"target_id": f"sev-{sev}"}, {"_id": 0}
            )

        row = _run(go())
        assert row["severity"] == sev

    def test_invalid_severity_coerced_to_info(self, caplog):
        import audit
        import database as _database

        async def go():
            with caplog.at_level("WARNING", logger="zubite.audit"):
                await audit.audit_log(
                    "lead.status_changed",
                    target_type="lead",
                    target_id="sev-bogus",
                    severity="EXTREME",
                )
            return await _database.db.admin_audit_logs.find_one(
                {"target_id": "sev-bogus"}, {"_id": 0}
            )

        row = _run(go())
        assert row["severity"] == "info"
        assert any("invalid severity" in r.message for r in caplog.records)

    def test_invalid_actor_type_coerced_to_system(self):
        import audit
        import database as _database

        async def go():
            await audit.audit_log(
                "system.something",
                actor_type="rogue",
                target_type="system",
                target_id="actor-test",
            )
            return await _database.db.admin_audit_logs.find_one(
                {"target_id": "actor-test"}, {"_id": 0}
            )

        row = _run(go())
        assert row["actor_type"] == "system"

    def test_secrets_in_metadata_redacted_on_write(self):
        """Defence in depth: if a caller accidentally puts secrets in metadata,
        the stored row must not contain them."""
        import audit
        import database as _database

        async def go():
            await audit.audit_log(
                "lead.status_changed",
                target_type="lead",
                target_id="meta-secret",
                metadata={
                    "password": "leaked",
                    "api_key": "sk-x",
                    "answers": {"q": "y"},
                    "count": 1,
                },
            )
            return await _database.db.admin_audit_logs.find_one(
                {"target_id": "meta-secret"}, {"_id": 0}
            )

        row = _run(go())
        assert row["metadata"]["password"] == "[REDACTED]"
        assert row["metadata"]["api_key"] == "[REDACTED]"
        assert "answers" not in row["metadata"]
        assert row["metadata"]["count"] == 1
        # Raw value should not appear anywhere in the stored row.
        import json as _json
        encoded = _json.dumps(row, default=str)
        assert "leaked" not in encoded
        assert "sk-x" not in encoded


class TestActionKeysAllowList:
    def test_all_known_actions_documented_in_plan(self):
        """Smoke: must have at least the destructive / governance keys we'll
        wire up in Batch D2."""
        import audit

        required = {
            "lead.deleted", "lead.status_changed", "lead.assigned_to_clinic",
            "lead.reassigned_to_clinic", "lead.exported_csv",
            "cleanup_leads.executed", "cleanup_leads.blocked_production",
            "reset_analytics.executed", "reset_blog_views.executed",
            "clinic.created", "clinic.password_reset",
            "verification.flagged", "verification.responded",
            "auth.admin_login_succeeded", "auth.admin_login_failed",
            "seed.blocked_production", "seed.rejected_weak_password",
        }
        missing = required - set(audit.ACTION_KEYS)
        assert not missing, f"missing audit action keys: {sorted(missing)}"
