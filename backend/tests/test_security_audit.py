"""Security audit regression tests (iteration 32).

Validates 17 security fixes across:
- JWT_SECRET fail-fast (config inspection)
- CORS strictness
- Rate limiting (admin/clinic login, leads, clinic-applications, verify)
- NoSQL injection guards
- PII reduction on public lead endpoints
- Pydantic strict validation (EmailStr, length limits)
- ElevenLabs webhook signature enforcement
- Clinic password change min_length
- Regression: existing admin/clinic flows still work
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ortho-preview-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@zubite.bg"
ADMIN_PASSWORD = "password"


def _xff(suffix: str) -> dict:
    """Each test uses a unique X-Forwarded-For so rate-limit buckets are isolated."""
    return {"X-Forwarded-For": suffix}


# ─── Fixtures ─────────────────────────────────────────────

@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      headers=_xff("9.9.0.1"))
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def seed_lead(admin_headers):
    """Create a lead via public endpoint for downstream tests."""
    payload = {
        "city_slug": "sofia", "treatment_type": "invisalign",
        "answers": {"q1": "a"}, "name": "TEST_SecLead", "phone": "+359888111222",
        "email": "TEST_seclead@example.com", "consent": True,
    }
    r = requests.post(f"{API}/leads", json=payload, headers=_xff("9.9.0.2"))
    assert r.status_code == 200, r.text
    return r.json()["id"]


# ─── 1. JWT_SECRET fail-fast (logic check) ────────────────

class TestConfig:
    def test_jwt_secret_failfast_logic_present(self):
        cfg = open("/app/backend/config.py").read()
        assert "JWT_SECRET must be set" in cfg
        assert "len(JWT_SECRET) < 24" in cfg


# ─── 2. CORS strictness ───────────────────────────────────

class TestCORS:
    """Validate backend CORS directly (localhost:8001) since the K8s ingress
    overrides Access-Control-Allow-Origin with '*' at the proxy layer."""
    INTERNAL = "http://localhost:8001"

    def test_cors_blocks_evil_origin_at_backend(self):
        r = requests.options(f"{self.INTERNAL}/api/cities", headers={
            "Origin": "https://evil.com",
            "Access-Control-Request-Method": "GET",
        })
        allowed = r.headers.get("access-control-allow-origin", "")
        assert allowed != "https://evil.com" and allowed != "*", f"Backend allowed evil origin: {allowed}"

    def test_cors_allows_preview_url_via_regex_at_backend(self):
        origin = "https://ortho-preview-2.preview.emergentagent.com"
        r = requests.options(f"{self.INTERNAL}/api/cities", headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        })
        assert r.headers.get("access-control-allow-origin") == origin


# ─── 3-7. Rate limiting ───────────────────────────────────

class TestRateLimits:
    def test_admin_login_rate_limit(self):
        ip = "10.1.0.1"
        last = None
        for i in range(6):
            last = requests.post(f"{API}/admin/login",
                                 json={"username": "x@x.com", "password": "wrong"},
                                 headers=_xff(ip))
        assert last.status_code == 429, f"6th admin login should be 429, got {last.status_code}"

    def test_clinic_login_rate_limit(self):
        ip = "10.1.0.2"
        last = None
        for i in range(6):
            last = requests.post(f"{API}/clinic/login",
                                 json={"email": "x@x.com", "password": "wrong"},
                                 headers=_xff(ip))
        assert last.status_code == 429, f"6th clinic login should be 429, got {last.status_code}"

    def test_create_lead_rate_limit(self):
        ip = "10.1.0.3"
        payload = {"city_slug": "sofia", "treatment_type": "invisalign", "answers": {}, "consent": False}
        last = None
        for i in range(6):
            last = requests.post(f"{API}/leads", json=payload, headers=_xff(ip))
        assert last.status_code == 429, f"6th create_lead should be 429, got {last.status_code}"

    def test_clinic_application_rate_limit(self):
        ip = "10.1.0.4"
        payload = {
            "clinic_name": "TEST_RL Clinic", "city": "Sofia", "address": "Some str 1",
            "contact_name": "Test Person", "phone": "+359000111222",
            "email": "TEST_rl@example.com",
        }
        last = None
        for i in range(4):
            last = requests.post(f"{API}/clinic-applications", json=payload, headers=_xff(ip))
        assert last.status_code == 429, f"4th clinic-application should be 429, got {last.status_code}"

    def test_verify_token_rate_limit(self):
        ip = "10.1.0.5"
        last = None
        # Use a clearly-invalid-but-correctly-shaped token; rate-limit dep runs before route logic
        token = "a" * 40
        for i in range(21):
            last = requests.get(f"{API}/verify/{token}?response=yes", headers=_xff(ip))
        assert last.status_code == 429, f"21st verify call should be 429, got {last.status_code}"


# ─── 8-9. NoSQL injection guards ──────────────────────────

class TestNoSQLInjection:
    def test_assign_clinic_rejects_operator(self, admin_headers):
        h = {**admin_headers, **_xff("10.2.0.1")}
        r = requests.patch(f"{API}/admin/leads/some-id/assign-clinic",
                           json={"clinic_id": {"$ne": ""}}, headers=h)
        assert r.status_code == 400, f"NoSQL injection on assign-clinic should return 400, got {r.status_code}"

    def test_update_clinic_application_rejects_operator(self, admin_headers):
        h = {**admin_headers, **_xff("10.2.0.2")}
        r = requests.patch(f"{API}/admin/clinic-applications/some-id",
                           json={"status": {"$ne": ""}}, headers=h)
        assert r.status_code == 400, f"NoSQL injection on clinic-applications should return 400, got {r.status_code}"


# ─── 10-11. PII reduction on public endpoints ────────────

class TestPIIReduction:
    PII_FIELDS = {"name", "phone", "email"}

    def test_get_lead_excludes_pii(self, seed_lead):
        r = requests.get(f"{API}/leads/{seed_lead}", headers=_xff("10.3.0.1"))
        assert r.status_code == 200, r.text
        body = r.json()
        leaked = self.PII_FIELDS & set(body.keys())
        assert not leaked, f"PII leaked on GET /leads/{{id}}: {leaked}"
        # Confirm allowed minimal set is present
        for f in ("id", "city_slug", "treatment_type", "band", "score_total"):
            assert f in body, f"Missing expected field {f}"

    def test_patch_lead_contact_excludes_pii(self, seed_lead):
        r = requests.patch(f"{API}/leads/{seed_lead}/contact",
                           json={"name": "TEST_NewName", "phone": "+359888333444",
                                 "email": "TEST_new@example.com", "consent": True},
                           headers=_xff("10.3.0.2"))
        assert r.status_code == 200, r.text
        body = r.json()
        leaked = self.PII_FIELDS & set(body.keys())
        assert not leaked, f"PII leaked on PATCH /leads/{{id}}/contact: {leaked}"


# ─── 12-13. Pydantic strict validation ───────────────────

class TestPydanticValidation:
    def test_invalid_email_returns_422(self):
        payload = {"city_slug": "sofia", "treatment_type": "invisalign",
                   "answers": {}, "email": "not-an-email", "consent": False}
        r = requests.post(f"{API}/leads", json=payload, headers=_xff("10.4.0.1"))
        assert r.status_code == 422, f"invalid email should be 422, got {r.status_code}: {r.text[:200]}"

    def test_name_too_long_returns_422(self):
        payload = {"city_slug": "sofia", "treatment_type": "invisalign",
                   "answers": {}, "name": "X" * 250, "consent": False}
        r = requests.post(f"{API}/leads", json=payload, headers=_xff("10.4.0.2"))
        assert r.status_code == 422, f"long name should be 422, got {r.status_code}"

    def test_page_path_too_long_returns_422(self):
        payload = {"city_slug": "sofia", "treatment_type": "invisalign",
                   "answers": {}, "page_path": "/" + ("x" * 600), "consent": False}
        r = requests.post(f"{API}/leads", json=payload, headers=_xff("10.4.0.3"))
        assert r.status_code == 422, f"long page_path should be 422, got {r.status_code}"


# ─── 14. ElevenLabs webhook signature ─────────────────────

class TestWebhookSignature:
    def test_missing_signature_rejected(self):
        # Secret is set in .env => unsigned requests must be 401
        r = requests.post(f"{API}/webhooks/elevenlabs/post-call",
                          json={"type": "post_call_transcription", "data": {}},
                          headers=_xff("10.5.0.1"))
        assert r.status_code == 401, f"unsigned webhook should be 401, got {r.status_code}"

    def test_invalid_signature_rejected(self):
        r = requests.post(f"{API}/webhooks/elevenlabs/post-call",
                          json={"type": "post_call_transcription", "data": {}},
                          headers={**_xff("10.5.0.2"),
                                   "ElevenLabs-Signature": "t=1,v0=deadbeef"})
        assert r.status_code == 401, f"invalid signature webhook should be 401, got {r.status_code}"


# ─── 15. Clinic change-password validation ────────────────

class TestClinicPasswordChange:
    def test_short_password_returns_422(self, admin_headers):
        # Fetch a clinic account credential by creating one fresh via approved application path
        # Simpler path: try existing seed creds first.
        login = requests.post(f"{API}/clinic/login",
                              json={"email": "contact@orthobg.bg", "password": "dPRN_ZXjuANYzw"},
                              headers=_xff("10.6.0.1"))
        if login.status_code != 200:
            pytest.skip(f"Clinic seed login failed; cannot test password change ({login.status_code})")
        token = login.json()["access_token"]
        r = requests.post(f"{API}/clinic/change-password",
                          json={"current_password": "dPRN_ZXjuANYzw", "new_password": "short"},
                          headers={"Authorization": f"Bearer {token}", **_xff("10.6.0.2")})
        assert r.status_code == 422, f"<8 char password should be 422, got {r.status_code}"


# ─── 16. Admin regression ─────────────────────────────────

class TestAdminRegression:
    def test_admin_leads(self, admin_headers):
        r = requests.get(f"{API}/admin/leads", headers={**admin_headers, **_xff("10.7.0.1")})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_stats(self, admin_headers):
        r = requests.get(f"{API}/admin/stats", headers={**admin_headers, **_xff("10.7.0.2")})
        assert r.status_code == 200
        body = r.json()
        assert "total_leads" in body and "by_band" in body and "by_city" in body

    def test_admin_clinic_applications_list(self, admin_headers):
        r = requests.get(f"{API}/admin/clinic-applications", headers={**admin_headers, **_xff("10.7.0.3")})
        assert r.status_code == 200
        assert "applications" in r.json()


# ─── 17. Clinic dashboard regression ──────────────────────

class TestClinicRegression:
    @pytest.fixture(scope="class")
    def clinic_token(self):
        r = requests.post(f"{API}/clinic/login",
                          json={"email": "contact@orthobg.bg", "password": "dPRN_ZXjuANYzw"},
                          headers=_xff("10.8.0.1"))
        if r.status_code != 200:
            pytest.skip(f"Clinic login failed: {r.status_code}")
        return r.json()["access_token"]

    def test_clinic_dashboard(self, clinic_token):
        r = requests.get(f"{API}/clinic/dashboard",
                         headers={"Authorization": f"Bearer {clinic_token}", **_xff("10.8.0.2")})
        assert r.status_code == 200
        body = r.json()
        for k in ("total_leads", "leads_contacted", "leads_pending", "leads_no_response"):
            assert k in body

    def test_clinic_leads(self, clinic_token):
        r = requests.get(f"{API}/clinic/leads",
                         headers={"Authorization": f"Bearer {clinic_token}", **_xff("10.8.0.3")})
        assert r.status_code == 200
        assert "leads" in r.json()

    def test_clinic_profile_patch(self, clinic_token):
        r = requests.patch(f"{API}/clinic/profile", json={"description": "TEST_sec_desc"},
                           headers={"Authorization": f"Bearer {clinic_token}", **_xff("10.8.0.4")})
        assert r.status_code == 200


# ─── 18. Public lead create regression ───────────────────

class TestPublicLeadCreate:
    def test_create_lead_with_valid_data(self):
        payload = {
            "city_slug": "varna", "treatment_type": "implants",
            "answers": {"q1": "yes"}, "name": "TEST_RegLead",
            "phone": "+359888999000", "email": "TEST_reglead@example.com", "consent": True,
        }
        r = requests.post(f"{API}/leads", json=payload, headers=_xff("10.9.0.1"))
        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body and body["city_slug"] == "varna"
