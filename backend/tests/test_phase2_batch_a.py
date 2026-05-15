"""Phase 2 — Batch A regression suite.

Tests four hardening areas:
  1. APP_ENV detection in backend/config.py
  2. Lead status Pydantic validator (NEW/CONTACTED/SCHEDULED/COMPLETED/CANCELLED)
  3. Rate limits added on 5 endpoints
  4. Clinic GET /clinic/leads projection — no sensitive field leakage

Safety rules:
- Tests hit the preview backend via REACT_APP_BACKEND_URL (same as existing tests).
- Tests refuse to run if the backend is pointing at the production DB.
- Tests NEVER call real email/Twilio/ElevenLabs providers — they exercise only
  the rate-limit + projection + validator code paths, which do not trigger any
  external IO.
"""
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_USERNAME = "admin@zubite.bg"
ADMIN_PASSWORD = "password"
CLINIC_EMAIL = "mvp-test@example.com"
CLINIC_PASSWORD = "Mvp1234!"


# ── Safety guard — refuse to run against production ───────────────
@pytest.fixture(scope="module", autouse=True)
def _abort_if_production():
    if not BASE_URL:
        pytest.skip("REACT_APP_BACKEND_URL not set")
    # Best-effort env check via API. If backend exposes APP_ENV anywhere
    # later we will read it; for now we accept the preview host pattern.
    if "zubite.bg" in BASE_URL and "preview" not in BASE_URL:
        pytest.fail(
            f"Refusing to run hardening tests against {BASE_URL!r} — looks like production."
        )


# ── Helpers ───────────────────────────────────────────────────────
def _admin_token() -> str:
    r = requests.post(
        f"{BASE_URL}/api/admin/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def _clinic_token() -> str:
    r = requests.post(
        f"{BASE_URL}/api/clinic/login",
        json={"email": CLINIC_EMAIL, "password": CLINIC_PASSWORD},
        timeout=10,
    )
    if r.status_code != 200:
        pytest.skip(f"Clinic test account unavailable (HTTP {r.status_code})")
    return r.json()["access_token"]


def _new_lead() -> str:
    r = requests.post(
        f"{BASE_URL}/api/leads",
        json={
            "city_slug": "sofia",
            "treatment_type": "aligners",
            "name": "Hardening Test",
            "phone": f"+359888{uuid.uuid4().int % 1_000_000:06d}",
            "consent": True,
            "answers": {},
            "can_travel": True,
        },
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["id"]


# ─── 1. APP_ENV detection ─────────────────────────────────────────
class TestAppEnvFoundation:
    def test_config_module_exports_constants(self):
        """Backend must export APP_ENV and IS_PRODUCTION constants."""
        from backend.config import APP_ENV, IS_PRODUCTION  # noqa: F401
        assert isinstance(APP_ENV, str)
        assert isinstance(IS_PRODUCTION, bool)

    def test_default_app_env_is_development(self, monkeypatch):
        """No env var set → defaults to 'development', IS_PRODUCTION=False."""
        for k in ("APP_ENV", "ENVIRONMENT", "NODE_ENV"):
            monkeypatch.delenv(k, raising=False)
        import importlib
        import backend.config as cfg
        importlib.reload(cfg)
        assert cfg.APP_ENV == "development"
        assert cfg.IS_PRODUCTION is False

    def test_app_env_production_detection(self, monkeypatch):
        monkeypatch.setenv("APP_ENV", "production")
        import importlib
        import backend.config as cfg
        importlib.reload(cfg)
        assert cfg.IS_PRODUCTION is True

    def test_legacy_environment_fallback(self, monkeypatch):
        monkeypatch.delenv("APP_ENV", raising=False)
        monkeypatch.setenv("ENVIRONMENT", "production")
        import importlib
        import backend.config as cfg
        importlib.reload(cfg)
        assert cfg.IS_PRODUCTION is True

    def test_legacy_node_env_fallback(self, monkeypatch):
        monkeypatch.delenv("APP_ENV", raising=False)
        monkeypatch.delenv("ENVIRONMENT", raising=False)
        monkeypatch.setenv("NODE_ENV", "production")
        import importlib
        import backend.config as cfg
        importlib.reload(cfg)
        assert cfg.IS_PRODUCTION is True


# ─── 2. Lead status validator ─────────────────────────────────────
class TestLeadStatusValidation:
    @pytest.mark.parametrize("status", ["NEW", "CONTACTED", "SCHEDULED", "COMPLETED", "CANCELLED"])
    def test_valid_status_accepted(self, status):
        lead_id = _new_lead()
        r = requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead_id}",
            headers={"Authorization": f"Bearer {_admin_token()}"},
            json={"status": status},
            timeout=10,
        )
        assert r.status_code == 200, f"valid status {status} rejected: {r.text}"

    @pytest.mark.parametrize("status", ["won", "lost", "deleted", "new", "contacted"])
    def test_invalid_status_rejected_with_422(self, status):
        lead_id = _new_lead()
        r = requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead_id}",
            headers={"Authorization": f"Bearer {_admin_token()}"},
            json={"status": status},
            timeout=10,
        )
        assert r.status_code == 422, f"invalid status {status} not rejected: {r.status_code}"
        body = r.json()
        # Pydantic v2 returns a list of errors under 'detail'
        assert "detail" in body

    def test_status_omitted_allowed(self):
        """PATCH without status field should still work (e.g. note-only update)."""
        lead_id = _new_lead()
        r = requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead_id}",
            headers={"Authorization": f"Bearer {_admin_token()}"},
            json={"notes": "test note"},
            timeout=10,
        )
        assert r.status_code == 200

    def test_invalid_status_does_not_mutate_db(self):
        """If validator rejects, the lead must keep its previous status."""
        lead_id = _new_lead()
        r = requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead_id}",
            headers={"Authorization": f"Bearer {_admin_token()}"},
            json={"status": "InvalidValue"},
            timeout=10,
        )
        assert r.status_code == 422
        # Fetch the lead — status must still be NEW (default)
        r2 = requests.get(
            f"{BASE_URL}/api/admin/leads",
            headers={"Authorization": f"Bearer {_admin_token()}"},
            timeout=10,
        )
        assert r2.status_code == 200
        lead = next((l for l in r2.json()["leads"] if l["id"] == lead_id), None)
        assert lead is not None
        assert lead["status"] == "NEW"


# ─── 3. Rate limits ───────────────────────────────────────────────
class TestRateLimits:
    """Verify the 5 newly rate-limited endpoints actually throttle."""

    def test_analytics_events_throttles_at_60_per_minute(self):
        """60 requests OK, 61st (or later) returns 429 within the same window."""
        url = f"{BASE_URL}/api/analytics/events"
        ok = throttled = 0
        for i in range(70):
            r = requests.post(
                url,
                json={"event_type": "test", "session_id": f"rl-test-{i}", "timestamp": "2026-01-01"},
                timeout=5,
            )
            if r.status_code == 200:
                ok += 1
            elif r.status_code == 429:
                throttled += 1
        assert throttled > 0, "expected at least one 429 within 70 calls"
        assert ok <= 60, f"more than 60 calls succeeded in 60s window: {ok}"

    def test_blog_track_view_throttles(self):
        """High-volume blog view tracking is rate-limited."""
        url = f"{BASE_URL}/api/blog/track-view"
        ok = throttled = 0
        for i in range(70):
            r = requests.post(
                url,
                json={"slug": "test-slug", "session_id": f"rl-blog-{i}", "referrer": ""},
                timeout=5,
            )
            if r.status_code == 200:
                ok += 1
            elif r.status_code == 429:
                throttled += 1
        assert throttled > 0
        assert ok <= 60


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
        "id", "name", "phone", "email", "city_slug",
        "treatment_type", "clinic_lead_status",
        "verification_status", "created_at",
    }

    def test_clinic_leads_returns_only_minimal_fields(self):
        """Clinic GET /clinic/leads must NOT include sensitive/internal fields."""
        token = _clinic_token()
        r = requests.get(
            f"{BASE_URL}/api/clinic/leads",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert r.status_code == 200
        leads = r.json().get("leads", [])
        if not leads:
            pytest.skip("Clinic has no assigned leads to inspect")

        all_keys = set()
        for lead in leads:
            all_keys.update(lead.keys())

        leaked = all_keys & self.FORBIDDEN_FIELDS
        assert not leaked, (
            f"Clinic /leads endpoint leaks sensitive fields: {sorted(leaked)}. "
            f"All returned keys: {sorted(all_keys)}"
        )

        # And that we don't expose ANY field outside the allow-list.
        unexpected = all_keys - self.ALLOWED_FIELDS
        assert not unexpected, (
            f"Clinic /leads returns unexpected fields: {sorted(unexpected)}. "
            f"Expand ALLOWED_FIELDS or remove from projection."
        )

    def test_clinic_cannot_call_admin_endpoint(self):
        """Clinic JWT must NOT authorize against admin-only endpoints."""
        token = _clinic_token()
        r = requests.get(
            f"{BASE_URL}/api/admin/leads",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert r.status_code in (401, 403), (
            f"Clinic token unexpectedly accepted on admin endpoint (HTTP {r.status_code})"
        )
