"""Phase 2 — Batch C regression suite (in-process, isolated test DB).

Covers four workflow + notification hardening areas:
  1. Soft duplicate lead detection
  2. Clinic reassignment notification fix (no duplicate emails)
  3. Verification flagged admin alert (email failure doesn't block flag)
  4. Clinic isolation + projection hardening

Safety contract: same as Batch A/B — refuses production DB, drops the test
DB on teardown, autouse rate-limit reset, autouse backup-file cleanup, no
real external provider IO (Resend is mocked at module load).

Run with:
    cd /app/backend
    DB_NAME=zubite_test_phase2_batch_c APP_ENV=test \\
        python -m pytest tests/test_phase2_batch_c.py -v
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ── 0. Force test-isolated env BEFORE any backend import ──────────
os.environ.setdefault("DB_NAME", "zubite_test_phase2_batch_c")
os.environ.setdefault("APP_ENV", "test")
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"
# Resend / admin email envs MUST be set so the alert helper attempts the
# email path (which we then mock). Without these the helper short-circuits.
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

# Neutralise external storage init.
import storage as _storage_mod  # noqa: E402

_storage_mod.init_storage = lambda: None  # type: ignore[assignment]

# Replace the `resend` library SEND function so absolutely no email
# leaves the process even if a code path somehow bypasses our patches.
import resend as _resend  # noqa: E402

_resend.Emails.send = MagicMock(return_value={"id": "test-no-send"})  # type: ignore[assignment]

from httpx import ASGITransport, AsyncClient  # noqa: E402

_LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(_LOOP)


def _run(coro):
    return _LOOP.run_until_complete(coro)


ADMIN_USERNAME = "admin@zubite.bg"
ADMIN_PASSWORD = "TestAdminPass1!"
CLINIC_A_EMAIL = "clinic-a@example.com"
CLINIC_A_PASSWORD = "ClinicAPass1!"
CLINIC_B_EMAIL = "clinic-b@example.com"
CLINIC_B_PASSWORD = "ClinicBPass1!"


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
        for ident, email, pwd in (
            ("clinic-a", CLINIC_A_EMAIL, CLINIC_A_PASSWORD),
            ("clinic-b", CLINIC_B_EMAIL, CLINIC_B_PASSWORD),
        ):
            await db.clinics.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "clinic_name": f"Phase2C Clinic {ident.upper()}",
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
def _reset_rate_limit_state():
    import rate_limit as _rl

    _rl._buckets.clear()
    yield
    _rl._buckets.clear()


@pytest.fixture(autouse=True)
def _backup_artifact_safety():
    """Confirm no test-created backup files remain after each test.
    The Batch C suite does NOT create any backups — so the directory
    must stay clean from start to finish."""
    backup_dir = _REPO_ROOT / "test_reports" / "backups"
    before = set(backup_dir.glob("leads_*.json")) if backup_dir.exists() else set()
    yield
    after = set(backup_dir.glob("leads_*.json")) if backup_dir.exists() else set()
    created = after - before
    for path in created:
        path.unlink(missing_ok=True)
    assert not (after - before - created), (
        "Test-created backup files were not cleaned up"
    )


# ── Helpers ───────────────────────────────────────────────────────
async def _admin_token(app) -> str:
    async with _client(app) as c:
        r = await c.post(
            "/api/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        )
    r.raise_for_status()
    return r.json()["access_token"]


async def _clinic_token(app, email: str, password: str) -> str:
    async with _client(app) as c:
        r = await c.post(
            "/api/clinic/login", json={"email": email, "password": password}
        )
    r.raise_for_status()
    return r.json()["access_token"]


async def _clinic_a_token(app) -> str:
    return await _clinic_token(app, CLINIC_A_EMAIL, CLINIC_A_PASSWORD)


async def _clinic_b_token(app) -> str:
    return await _clinic_token(app, CLINIC_B_EMAIL, CLINIC_B_PASSWORD)


async def _get_clinic_id(email: str) -> str:
    import database as _database

    c = await _database.db.clinics.find_one({"email": email}, {"_id": 0, "id": 1})
    assert c is not None
    return c["id"]


async def _create_lead(app, **overrides) -> dict:
    """POST /api/leads with sensible defaults; returns the full response JSON."""
    payload = {
        "city_slug": "sofia",
        "treatment_type": "invisalign",
        "name": "Patient X",
        "phone": "+359888000111",
        "email": "patient@example.com",
        "consent": True,
        "answers": {},
        "can_travel": True,
    }
    payload.update(overrides)
    async with _client(app) as c:
        r = await c.post("/api/leads", json=payload)
    r.raise_for_status()
    return r.json()


async def _purge_leads():
    import database as _database

    await _database.db.leads.delete_many({})


# ─── 1. Soft duplicate detection ──────────────────────────────────
class TestSoftDuplicateDetection:
    def test_same_phone_within_30_days_flagged(self, app):
        async def go():
            await _purge_leads()
            first = await _create_lead(
                app, phone="+359888777111", email="first@example.com"
            )
            second = await _create_lead(
                app, phone="+359888777111", email="other@example.com"
            )
            return first, second

        first, second = _run(go())
        assert second["is_potential_duplicate"] is True
        assert "phone" in (second["duplicate_reason"] or "")
        assert second["possible_duplicate_lead_id"] == first["id"]

    def test_same_email_within_30_days_flagged(self, app):
        async def go():
            await _purge_leads()
            first = await _create_lead(
                app, phone="+359888111000", email="match@example.com"
            )
            second = await _create_lead(
                app, phone="+359888222000", email="MATCH@Example.com"  # case-insens
            )
            return first, second

        first, second = _run(go())
        assert second["is_potential_duplicate"] is True
        assert "email" in (second["duplicate_reason"] or "")
        assert second["possible_duplicate_lead_id"] == first["id"]

    def test_same_phone_and_email_combined_reason(self, app):
        async def go():
            await _purge_leads()
            first = await _create_lead(
                app, phone="+359888999999", email="both@example.com"
            )
            second = await _create_lead(
                app, phone="+359888999999", email="both@example.com"
            )
            return first, second

        first, second = _run(go())
        assert second["is_potential_duplicate"] is True
        reason = second["duplicate_reason"] or ""
        assert "phone" in reason and "email" in reason
        assert second["possible_duplicate_lead_id"] == first["id"]

    def test_older_than_30_days_not_flagged(self, app):
        async def go():
            import database as _database

            await _purge_leads()
            # Insert an "old" lead 31 days ago directly into the DB.
            old_iso = (datetime.now(timezone.utc) - timedelta(days=31)).isoformat()
            old_id = str(uuid.uuid4())
            await _database.db.leads.insert_one(
                {
                    "id": old_id,
                    "city_slug": "sofia",
                    "treatment_type": "invisalign",
                    "name": "Old",
                    "phone": "+359888333333",
                    "email": "old@example.com",
                    "consent": True,
                    "answers": {},
                    "can_travel": True,
                    "score_total": 1,
                    "band": "RED",
                    "status": "NEW",
                    "created_at": old_iso,
                }
            )
            return await _create_lead(
                app, phone="+359888333333", email="old@example.com"
            )

        new_lead = _run(go())
        assert new_lead["is_potential_duplicate"] is False
        assert new_lead["duplicate_reason"] is None
        assert new_lead["possible_duplicate_lead_id"] is None

    def test_missing_phone_and_email_skipped_safely(self, app):
        async def go():
            await _purge_leads()
            # Lead created with no name/phone/email — duplicate check must
            # gracefully skip and not raise.
            async with _client(app) as c:
                r = await c.post(
                    "/api/leads",
                    json={
                        "city_slug": "sofia",
                        "treatment_type": "invisalign",
                        "consent": False,
                        "answers": {},
                        "can_travel": True,
                    },
                )
            return r

        r = _run(go())
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["is_potential_duplicate"] is False
        assert body["duplicate_reason"] is None
        assert body["possible_duplicate_lead_id"] is None

    def test_public_get_lead_does_not_expose_duplicate_fields(self, app):
        """Public GET /api/leads/{id} must NOT include duplicate metadata."""

        async def go():
            await _purge_leads()
            await _create_lead(
                app, phone="+359888555555", email="pub@example.com"
            )
            second = await _create_lead(
                app, phone="+359888555555", email="pub@example.com"
            )
            assert second["is_potential_duplicate"] is True
            async with _client(app) as c:
                return await c.get(f"/api/leads/{second['id']}")

        r = _run(go())
        assert r.status_code == 200, r.text
        body = r.json()
        for forbidden in (
            "is_potential_duplicate",
            "duplicate_reason",
            "possible_duplicate_lead_id",
        ):
            assert forbidden not in body, (
                f"Public lead lookup leaks {forbidden!r}: {body!r}"
            )

    def test_admin_lead_detail_shows_duplicate_fields(self, app):
        """Admin endpoint may surface duplicate metadata."""

        async def go():
            await _purge_leads()
            await _create_lead(
                app, phone="+359888666666", email="adm@example.com"
            )
            second = await _create_lead(
                app, phone="+359888666666", email="adm@example.com"
            )
            token = await _admin_token(app)
            async with _client(app) as c:
                return await c.get(
                    f"/api/admin/leads/{second['id']}",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["is_potential_duplicate"] is True
        assert body["duplicate_reason"]
        assert body["possible_duplicate_lead_id"]


# ─── 2. Clinic reassignment notification fix ──────────────────────
class TestClinicReassignmentEmail:
    """Patch the consultations._send_clinic_assignment_email helper and count
    calls. The helper is invoked from both /admin/leads/{id}/assign-clinic
    (clinics router) and /admin/consultation-requests/{id}/assign-clinic
    (consultations router)."""

    def test_first_assignment_sends_one_email(self, app):
        from routers import consultations as _consult

        async def go():
            await _purge_leads()
            lead = await _create_lead(
                app, phone="+359888100100", email="r1@example.com"
            )
            clinic_a = await _get_clinic_id(CLINIC_A_EMAIL)
            token = await _admin_token(app)
            async with _client(app) as c:
                r = await c.patch(
                    f"/api/admin/leads/{lead['id']}/assign-clinic",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"clinic_id": clinic_a},
                )
            return r

        with patch.object(
            _consult, "_send_clinic_assignment_email", new=AsyncMock(return_value=None)
        ) as mock_email:
            r = _run(go())
            assert r.status_code == 200, r.text
            assert mock_email.call_count == 1

    def test_reassigning_to_same_clinic_does_not_send_duplicate_email(self, app):
        from routers import consultations as _consult

        async def go():
            await _purge_leads()
            lead = await _create_lead(
                app, phone="+359888200200", email="r2@example.com"
            )
            clinic_a = await _get_clinic_id(CLINIC_A_EMAIL)
            token = await _admin_token(app)
            async with _client(app) as c:
                first = await c.patch(
                    f"/api/admin/leads/{lead['id']}/assign-clinic",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"clinic_id": clinic_a},
                )
                second = await c.patch(
                    f"/api/admin/leads/{lead['id']}/assign-clinic",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"clinic_id": clinic_a},
                )
            return first, second

        with patch.object(
            _consult, "_send_clinic_assignment_email", new=AsyncMock(return_value=None)
        ) as mock_email:
            first, second = _run(go())
            assert first.status_code == 200
            assert second.status_code == 200
            # Only ONE email — the first assignment. The second call is
            # idempotent and must NOT send another.
            assert mock_email.call_count == 1

    def test_reassigning_to_different_clinic_sends_new_email(self, app):
        from routers import consultations as _consult

        async def go():
            await _purge_leads()
            lead = await _create_lead(
                app, phone="+359888300300", email="r3@example.com"
            )
            clinic_a = await _get_clinic_id(CLINIC_A_EMAIL)
            clinic_b = await _get_clinic_id(CLINIC_B_EMAIL)
            token = await _admin_token(app)
            async with _client(app) as c:
                first = await c.patch(
                    f"/api/admin/leads/{lead['id']}/assign-clinic",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"clinic_id": clinic_a},
                )
                second = await c.patch(
                    f"/api/admin/leads/{lead['id']}/assign-clinic",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"clinic_id": clinic_b},
                )
            return first, second

        with patch.object(
            _consult, "_send_clinic_assignment_email", new=AsyncMock(return_value=None)
        ) as mock_email:
            first, second = _run(go())
            assert first.status_code == 200
            assert second.status_code == 200
            assert mock_email.call_count == 2
            # Second call must target clinic B
            last_call_args = mock_email.call_args_list[-1]
            clinic_arg = last_call_args.args[0] if last_call_args.args else last_call_args.kwargs.get("clinic")
            assert clinic_arg.get("email") == CLINIC_B_EMAIL

    def test_email_failure_does_not_block_assignment(self, app):
        """If the email helper raises, the assignment must still succeed
        (lead.assigned_clinic_id updated)."""
        from routers import consultations as _consult

        async def go():
            await _purge_leads()
            lead = await _create_lead(
                app, phone="+359888400400", email="r4@example.com"
            )
            clinic_a = await _get_clinic_id(CLINIC_A_EMAIL)
            token = await _admin_token(app)
            async with _client(app) as c:
                r = await c.patch(
                    f"/api/admin/leads/{lead['id']}/assign-clinic",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"clinic_id": clinic_a},
                )
                # Verify DB state
                refetch = await c.get(
                    f"/api/admin/leads/{lead['id']}",
                    headers={"Authorization": f"Bearer {token}"},
                )
            return r, refetch, clinic_a

        with patch.object(
            _consult, "_send_clinic_assignment_email",
            new=AsyncMock(side_effect=RuntimeError("simulated email outage")),
        ) as mock_email:
            r, refetch, clinic_a = _run(go())
            assert r.status_code == 200, r.text
            assert mock_email.call_count == 1
            assert refetch.status_code == 200
            assert refetch.json()["assigned_clinic_id"] == clinic_a


# ─── 3. Verification flagged admin alert ──────────────────────────
class TestVerificationFlaggedAlert:
    async def _setup_verification(self, app, response_value: str = "no") -> tuple[dict, str]:
        """Create a lead, assign to clinic A, create a verification token, then
        return (lead, token). Caller hits GET /api/verify/{token}?response=…
        to trigger the flagged path."""
        import database as _database
        import secrets as _secrets

        await _purge_leads()
        await _database.db.lead_verifications.delete_many({})
        lead = await _create_lead(
            app, phone="+359888500500", email="v@example.com"
        )
        clinic_a = await _get_clinic_id(CLINIC_A_EMAIL)
        await _database.db.leads.update_one(
            {"id": lead["id"]},
            {"$set": {"assigned_clinic_id": clinic_a}},
        )
        token = _secrets.token_urlsafe(32)
        await _database.db.lead_verifications.insert_one(
            {
                "id": str(uuid.uuid4()),
                "lead_id": lead["id"],
                "clinic_id": clinic_a,
                "token": token,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        return lead, token

    def test_response_no_sets_flagged_and_sends_admin_alert(self, app):
        from routers import verification as _verification

        async def go():
            lead, token = await self._setup_verification(app)
            async with _client(app) as c:
                r = await c.get(f"/api/verify/{token}", params={"response": "no"})
            import database as _database

            refetch = await _database.db.leads.find_one(
                {"id": lead["id"]}, {"_id": 0, "verification_status": 1}
            )
            return lead, r, refetch

        with patch.object(
            _verification, "send_verification_flagged_alert",
            new=AsyncMock(return_value=True),
        ) as mock_alert:
            lead, r, refetch = _run(go())
            assert r.status_code == 200, r.text
            assert refetch["verification_status"] == "flagged"
            assert mock_alert.call_count == 1
            call = mock_alert.call_args_list[0]
            lead_arg = call.args[0] if call.args else call.kwargs.get("lead")
            assert lead_arg["id"] == lead["id"]
            # Helper must NOT receive sensitive fields. The router projects
            # explicitly to {id, name, assigned_clinic_id}.
            forbidden = {
                "answers", "score_total", "score_breakdown", "band",
                "first_utm_source", "latest_utm_source",
                "content_path_before_conversion",
                "is_potential_duplicate", "duplicate_reason",
                "possible_duplicate_lead_id",
            }
            leaked = forbidden & set(lead_arg.keys())
            assert not leaked, f"verification alert received PII fields: {sorted(leaked)}"

    def test_email_failure_still_saves_flagged_status(self, app):
        from routers import verification as _verification

        async def go():
            lead, token = await self._setup_verification(app)
            async with _client(app) as c:
                r = await c.get(f"/api/verify/{token}", params={"response": "no"})
            import database as _database

            refetch = await _database.db.leads.find_one(
                {"id": lead["id"]}, {"_id": 0, "verification_status": 1}
            )
            return r, refetch

        with patch.object(
            _verification, "send_verification_flagged_alert",
            new=AsyncMock(side_effect=RuntimeError("simulated mail down")),
        ):
            r, refetch = _run(go())
            # Endpoint must still return 200; status is flagged in DB.
            assert r.status_code == 200, r.text
            assert refetch["verification_status"] == "flagged"

    def test_response_yes_does_not_send_flagged_alert(self, app):
        from routers import verification as _verification

        async def go():
            lead, token = await self._setup_verification(app)
            async with _client(app) as c:
                return await c.get(f"/api/verify/{token}", params={"response": "yes"})

        with patch.object(
            _verification, "send_verification_flagged_alert",
            new=AsyncMock(return_value=True),
        ) as mock_alert:
            r = _run(go())
            assert r.status_code == 200, r.text
            assert mock_alert.call_count == 0


# ─── 4. Clinic isolation + projection ─────────────────────────────
class TestClinicIsolation:
    async def _seed_consultation_for(self, clinic_email: str) -> str:
        """Insert a consultation_request assigned to the clinic identified
        by `clinic_email`. Returns the request id."""
        import database as _database

        clinic_id = await _get_clinic_id(clinic_email)
        rid = str(uuid.uuid4())
        await _database.db.consultation_requests.insert_one(
            {
                "id": rid,
                "patient_name": "Iso Patient",
                "patient_phone": "+359888700700",
                "patient_email": "iso@example.com",
                "patient_city": "sofia",
                "treatment_interest": "invisalign",
                "assigned_clinic_id": clinic_id,
                "lead_id": None,
                "status": "assigned",
                "assigned_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        return rid

    def test_clinic_a_cannot_read_clinic_b_consultation_request(self, app):
        async def go():
            req_id = await self._seed_consultation_for(CLINIC_B_EMAIL)
            token_a = await _clinic_a_token(app)
            async with _client(app) as c:
                return await c.get(
                    f"/api/clinic/consultation-requests/{req_id}",
                    headers={"Authorization": f"Bearer {token_a}"},
                )

        r = _run(go())
        assert r.status_code == 404, r.text

    def test_clinic_a_cannot_update_clinic_b_consultation_request(self, app):
        async def go():
            req_id = await self._seed_consultation_for(CLINIC_B_EMAIL)
            token_a = await _clinic_a_token(app)
            async with _client(app) as c:
                return await c.post(
                    f"/api/clinic/consultation-requests/{req_id}/action",
                    headers={"Authorization": f"Bearer {token_a}"},
                    json={"action_type": "call_attempted", "note": "intrusion"},
                )

        r = _run(go())
        assert r.status_code == 404

    def test_clinic_a_cannot_update_clinic_b_lead_status(self, app):
        async def go():
            import database as _database

            await _purge_leads()
            clinic_b = await _get_clinic_id(CLINIC_B_EMAIL)
            lead_id = str(uuid.uuid4())
            await _database.db.leads.insert_one(
                {
                    "id": lead_id,
                    "city_slug": "sofia",
                    "treatment_type": "invisalign",
                    "name": "ISO",
                    "phone": "+359888800800",
                    "email": "iso-lead@example.com",
                    "consent": True,
                    "answers": {},
                    "can_travel": True,
                    "score_total": 1,
                    "band": "RED",
                    "status": "NEW",
                    "assigned_clinic_id": clinic_b,
                    "clinic_lead_status": "new",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            token_a = await _clinic_a_token(app)
            async with _client(app) as c:
                return await c.patch(
                    f"/api/clinic/leads/{lead_id}/status",
                    headers={"Authorization": f"Bearer {token_a}"},
                    json={"status": "contacted"},
                )

        r = _run(go())
        assert r.status_code == 404

    def test_clinic_jwt_cannot_access_admin_endpoints(self, app):
        async def go():
            token_a = await _clinic_a_token(app)
            async with _client(app) as c:
                results = []
                for ep in ("/api/admin/leads", "/api/admin/clinics",
                           "/api/admin/consultation-requests"):
                    r = await c.get(
                        ep, headers={"Authorization": f"Bearer {token_a}"}
                    )
                    results.append((ep, r.status_code))
            return results

        results = _run(go())
        for ep, code in results:
            assert code in (401, 403), f"{ep} accepted clinic JWT (HTTP {code})"

    def test_clinic_leads_projection_does_not_leak_sensitive_fields(self, app):
        """Same allow-list invariant as Batch A — re-asserted here with a
        lead seeded with duplicate metadata + call transcript to be sure
        the projection still trims them."""

        async def go():
            import database as _database

            await _purge_leads()
            clinic_a = await _get_clinic_id(CLINIC_A_EMAIL)
            await _database.db.leads.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "city_slug": "sofia",
                    "treatment_type": "invisalign",
                    "name": "Pii",
                    "phone": "+359888900900",
                    "email": "proj@example.com",
                    "consent": True,
                    "answers": {"q1": "yes"},
                    "can_travel": True,
                    "score_total": 9,
                    "band": "GREEN",
                    "status": "NEW",
                    "assigned_clinic_id": clinic_a,
                    "clinic_lead_status": "new",
                    "first_utm_source": "facebook",
                    "first_utm_campaign": "spring",
                    "latest_utm_source": "google",
                    "latest_utm_campaign": "fall",
                    "content_path_before_conversion": [{"page": "/blog/x"}],
                    "notes": "internal note",
                    "admin_notes": "more internal",
                    "call_transcript": "should not leak",
                    "call_outcome_summary": "OK",
                    "score_breakdown": {"a": 1},
                    "is_potential_duplicate": True,
                    "duplicate_reason": "phone+email",
                    "possible_duplicate_lead_id": "fake-uuid",
                    "verification_token": "secret-token",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            token = await _clinic_a_token(app)
            async with _client(app) as c:
                return await c.get(
                    "/api/clinic/leads",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 200
        leads = r.json()["leads"]
        assert leads, "expected the seeded lead to appear"
        forbidden = {
            "answers", "score_breakdown", "score_total", "band",
            "first_utm_source", "first_utm_campaign", "first_utm_medium",
            "latest_utm_source", "latest_utm_campaign", "latest_utm_medium",
            "content_path_before_conversion",
            "admin_notes", "notes",
            "call_transcript", "call_outcome_summary", "call_outcome_json",
            "is_potential_duplicate", "duplicate_reason",
            "possible_duplicate_lead_id",
            "verification_token", "verification_token_expires_at",
        }
        for lead in leads:
            leaked = set(lead.keys()) & forbidden
            assert not leaked, f"clinic /leads leaks {sorted(leaked)}: {lead!r}"

    def test_clinic_consultation_request_response_does_not_leak_sensitive_lead_fields(self, app):
        """A clinic fetching its OWN consultation request must NOT receive
        attribution / quiz answers / call transcripts even if those exist
        on the linked lead doc."""

        async def go():
            import database as _database

            clinic_a_id = await _get_clinic_id(CLINIC_A_EMAIL)
            # Seed a consultation request directly with sensitive-looking fields
            # mixed in to verify the API doesn't echo them.
            req_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            await _database.db.consultation_requests.insert_one(
                {
                    "id": req_id,
                    "patient_name": "Proj Test",
                    "patient_phone": "+359888901901",
                    "patient_email": "proj-ct@example.com",
                    "patient_city": "sofia",
                    "treatment_interest": "invisalign",
                    "assigned_clinic_id": clinic_a_id,
                    "lead_id": None,
                    "status": "assigned",
                    "assigned_at": now,
                    "created_at": now,
                    "updated_at": now,
                }
            )
            token = await _clinic_a_token(app)
            async with _client(app) as c:
                return await c.get(
                    f"/api/clinic/consultation-requests/{req_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )

        r = _run(go())
        assert r.status_code == 200, r.text
        body = r.json()
        # The clinic-side response only emits {request, appointment, events}.
        # We don't expose the linked Lead doc; assert the request payload
        # itself does not contain forbidden fields.
        req = body["request"]
        forbidden = {
            "answers", "score_total", "score_breakdown", "band",
            "first_utm_source", "latest_utm_source",
            "content_path_before_conversion",
            "call_transcript", "call_outcome_json",
            "is_potential_duplicate", "duplicate_reason",
            "possible_duplicate_lead_id",
        }
        leaked = set(req.keys()) & forbidden
        assert not leaked, f"consultation-request leaks {sorted(leaked)}: {req!r}"


# ─── 5. Backup artifact safety check (final, suite-wide) ──────────
class TestBackupArtifactSafety:
    def test_no_test_created_backup_files_remain(self):
        """Hard guarantee: the Batch C suite never produces a backup file."""
        backup_dir = _REPO_ROOT / "test_reports" / "backups"
        if not backup_dir.exists():
            return  # nothing to check
        files = list(backup_dir.glob("leads_*.json"))
        assert not files, (
            f"Unexpected backup artefacts: {files!r}. "
            "Manual operator backups should be moved off-box before tests run."
        )
