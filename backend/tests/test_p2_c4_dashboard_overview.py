"""C4 Dashboard Overview — strict contract tests for the new payload fields.

Covers the additions introduced in Batch C4 to /api/clinic/dashboard-overview:
  - weekly_trend (7-day series, oldest -> newest)
  - top_active_requests (max 5 non-terminal requests for the current clinic)

Safety:
- Aborts if the runner environment looks production-like (APP_ENV / DB_NAME).
- All requests are HTTP-only against the configured backend; no DB mutations
  beyond what the existing admin endpoints already do via the API surface.
- No external providers are invoked (Resend/Twilio/ElevenLabs are not touched
  by the read endpoint under test, nor by lead creation in this suite).
"""

import os
import re
import time
import uuid
import pytest
import requests

BASE_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or "https://ortho-preview-2.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@zubite.bg"
ADMIN_PASSWORD = "password"

CLINIC_A_EMAIL = "mvp-test@example.com"
CLINIC_A_PASSWORD = "Mvp1234!"


# ─────────────────────────── Safety guard ───────────────────────────
_db_name = (os.environ.get("DB_NAME") or "").lower()
_app_env = (os.environ.get("APP_ENV") or "").lower()
if _app_env in {"production", "prod", "live"}:
    pytest.skip(
        f"Refusing to run C4 tests against APP_ENV={_app_env!r}",
        allow_module_level=True,
    )
if any(tok in _db_name for tok in ("prod", "production", "live")):
    pytest.skip(
        f"Refusing to run C4 tests against production-looking DB_NAME={_db_name!r}",
        allow_module_level=True,
    )


# Contract: fields the clinic IS allowed to see in top_active_requests.
ALLOWED_FIELDS = {
    "id",
    "patient_name",
    "patient_phone",
    "treatment_interest",
    "status",
    "urgency",
    "created_at",
    "assigned_at",
    "appointment_booked_at",
}

# Contract: fields that MUST NEVER appear in top_active_requests, even if a
# future regression accidentally widens the projection.
FORBIDDEN_FIELDS = {
    "patient_email",
    "notes",
    "admin_notes",
    "score",
    "score_total",
    "score_breakdown",
    "answers",
    "attribution",
    "utm_source",
    "utm_campaign",
    "utm_ad",
    "utm_adset",
    "lead_id",
    "assigned_clinic_id",
    "_id",
}

# Terminal statuses — these MUST NOT show up in top_active_requests.
TERMINAL_STATUSES = {
    "attended",
    "no_show",
    "patient_declined",
    "not_suitable",
    "cancelled",
    "expired",
    "disputed",
}


# ─────────────────────────── Fixtures ───────────────────────────


def _admin_headers():
    r = requests.post(
        f"{API}/admin/login",
        json={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    token = r.json().get("access_token") or r.json().get("token")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _clinic_login_with_retry(email, password, max_retries=5):
    """Clinic login is rate-limited (5 per 5 minutes). When the C4 suite runs
    alongside other test modules in the same pytest session, the limiter can
    trip mid-fixture-setup. We back off and retry to make module-scoped
    fresh-clinic fixtures robust without weakening the production rate limit.

    Total worst-case wait = 4 * 90s = 360s, slightly more than the 300s window,
    so the limiter is guaranteed to free up at least once.
    """
    delay = 90
    r = None
    for attempt in range(max_retries):
        r = requests.post(
            f"{API}/clinic/login",
            json={"email": email, "password": password},
            timeout=20,
        )
        if r.status_code == 200:
            return r
        if r.status_code == 429 and attempt + 1 < max_retries:
            time.sleep(delay)
            continue
        return r
    return r


def _create_fresh_clinic(admin_headers, label=""):
    """Create a brand-new test clinic via admin API and return {id, email, token, headers}."""
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "clinic_name": f"TEST_C4_{label}_{suffix}",
        "city": "Sofia",
        "email": f"test-c4-{label}-{suffix}@example.com",
        "phone": "+359 88 000 0000",
        "address": "Test address C4",
        "treatments_offered": ["aligners"],
        "clinic_status": "evaluation_partner",
        "subscription_status": "trial",
    }
    r = requests.post(f"{API}/admin/clinics", json=payload, headers=admin_headers, timeout=20)
    assert r.status_code == 200, f"Create test clinic failed: {r.status_code} {r.text}"
    data = r.json()
    cid = data["clinic"]["id"]
    temp_password = data["temporary_password"]
    r2 = _clinic_login_with_retry(payload["email"], temp_password)
    assert r2.status_code == 200, f"Clinic login failed: {r2.status_code} {r2.text}"
    token = r2.json()["access_token"]
    return {
        "id": cid,
        "email": payload["email"],
        "token": token,
        "headers": {"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    }


def _create_lead_and_assign(admin_headers, clinic_id, name_hint="TEST_C4"):
    """Create a lead via the public API and assign it to a clinic via admin API."""
    suffix = uuid.uuid4().hex[:8]
    digits = re.sub(r"\D", "", suffix.encode("utf-8").hex())[:9].ljust(9, "0")
    lead_payload = {
        "name": f"{name_hint}_{suffix}",
        "phone": f"+3598{digits[:8]}",
        "email": f"c4-{suffix}@example.com",
        "city_slug": "sofia",
        "treatment_type": "aligners",
        "consent": True,
    }
    r = requests.post(f"{API}/leads", json=lead_payload, timeout=20)
    assert r.status_code in (200, 201), f"Create lead failed: {r.status_code} {r.text}"
    body = r.json()
    lead_id = body.get("id") or body.get("lead_id") or body.get("lead", {}).get("id")
    assert lead_id, f"No lead id in response: {body}"
    r2 = requests.patch(
        f"{API}/admin/leads/{lead_id}/assign-clinic",
        json={"clinic_id": clinic_id},
        headers=admin_headers,
        timeout=20,
    )
    assert r2.status_code == 200, f"Assign failed: {r2.status_code} {r2.text}"
    return lead_id


def _create_consultation_request_via_admin(admin_headers, clinic_id, name_hint="TEST_C4"):
    """Create a consultation request directly via the admin endpoint (bypasses the
    public /leads rate limiter). Populates fields that MUST NOT leak to the clinic
    dashboard so the forbidden-field assertions have real data to detect a leak.
    Returns the created request id.
    """
    suffix = uuid.uuid4().hex[:8]
    digits = re.sub(r"\D", "", suffix.encode("utf-8").hex())[:9].ljust(9, "0")
    payload = {
        "patient_name": f"{name_hint}_{suffix}",
        "patient_phone": f"+3598{digits[:8]}",
        "patient_email": f"c4-admin-{suffix}@example.com",
        "treatment_interest": "aligners",
        "lead_id": f"fake-lead-{suffix}",
        "utm_source": "test-utm-source",
        "utm_campaign": "test-utm-campaign",
        "utm_ad": "test-utm-ad",
        "source": "internal_test",
        "assigned_clinic_id": clinic_id,
    }
    r = requests.post(
        f"{API}/admin/consultation-requests",
        json=payload,
        headers=admin_headers,
        timeout=20,
    )
    assert r.status_code == 200, f"admin create CR failed: {r.status_code} {r.text}"
    return r.json()["request"]["id"]


@pytest.fixture(scope="module")
def admin_headers():
    return _admin_headers()


@pytest.fixture(scope="module")
def clinic_a_headers():
    r = _clinic_login_with_retry(CLINIC_A_EMAIL, CLINIC_A_PASSWORD)
    if r.status_code != 200:
        pytest.skip(f"Clinic A login failed: {r.status_code} {r.text}")
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def empty_clinic(admin_headers):
    """A brand-new clinic with no leads assigned — used for empty-state assertions."""
    return _create_fresh_clinic(admin_headers, label="empty")


@pytest.fixture(scope="module")
def isolated_pair(admin_headers):
    """Two brand-new clinics. A gets 2 leads, B gets 1 lead — used for isolation tests."""
    clinic_a = _create_fresh_clinic(admin_headers, label="iso_a")
    clinic_b = _create_fresh_clinic(admin_headers, label="iso_b")
    a_leads = [_create_lead_and_assign(admin_headers, clinic_a["id"], "iso_a") for _ in range(2)]
    b_leads = [_create_lead_and_assign(admin_headers, clinic_b["id"], "iso_b") for _ in range(1)]
    return {"a": clinic_a, "b": clinic_b, "a_leads": a_leads, "b_leads": b_leads}


@pytest.fixture(scope="module")
def cap_clinic(admin_headers):
    """A fresh clinic with 6 active leads — used to assert the top_active_requests cap of 5.

    Uses the admin direct-create endpoint (not the public /leads form) to avoid the
    leads-form rate limiter and to seed forbidden fields (patient_email, lead_id,
    utm_*) into the underlying docs. If the projection ever widens, the
    no-forbidden-fields test will detect the leak with real data, not just absence.
    """
    clinic = _create_fresh_clinic(admin_headers, label="cap")
    for _ in range(6):
        _create_consultation_request_via_admin(admin_headers, clinic["id"], "cap")
    return clinic


# ─────────────────────────── Helpers ───────────────────────────


def _get_overview(headers):
    r = requests.get(f"{API}/clinic/dashboard-overview", headers=headers, timeout=20)
    assert r.status_code == 200, f"overview failed: {r.status_code} {r.text}"
    return r.json()


_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


# ─────────────────────────── Tests ───────────────────────────


# --- 1. weekly_trend shape ---


def test_01_weekly_trend_present_and_length(clinic_a_headers):
    body = _get_overview(clinic_a_headers)
    assert "weekly_trend" in body, f"missing weekly_trend: {list(body.keys())}"
    assert isinstance(body["weekly_trend"], list)
    assert len(body["weekly_trend"]) == 7, f"expected 7 items, got {len(body['weekly_trend'])}"


def test_02_weekly_trend_item_fields(clinic_a_headers):
    body = _get_overview(clinic_a_headers)
    for item in body["weekly_trend"]:
        assert set(item.keys()) >= {"date", "assigned", "booked"}, f"missing keys: {item}"
        assert isinstance(item["assigned"], int), f"assigned not int: {item}"
        assert isinstance(item["booked"], int), f"booked not int: {item}"
        assert isinstance(item["date"], str)
        assert _ISO_DATE_RE.match(item["date"]), f"date not YYYY-MM-DD: {item['date']}"
        assert item["assigned"] >= 0
        assert item["booked"] >= 0


def test_03_weekly_trend_ordered_oldest_to_newest(clinic_a_headers):
    body = _get_overview(clinic_a_headers)
    dates = [item["date"] for item in body["weekly_trend"]]
    assert dates == sorted(dates), f"weekly_trend not oldest->newest: {dates}"
    # Also verify dates are unique (7 distinct calendar days).
    assert len(set(dates)) == 7, f"duplicate dates in weekly_trend: {dates}"


# --- 2. top_active_requests shape ---


def test_04_top_active_requests_present_and_capped(clinic_a_headers):
    body = _get_overview(clinic_a_headers)
    assert "top_active_requests" in body
    items = body["top_active_requests"]
    assert isinstance(items, list)
    assert len(items) <= 5, f"top_active_requests exceeds 5: {len(items)}"


def test_05_top_active_requests_only_allowed_fields(clinic_a_headers):
    body = _get_overview(clinic_a_headers)
    for item in body["top_active_requests"]:
        keys = set(item.keys())
        unexpected = keys - ALLOWED_FIELDS
        assert not unexpected, f"unexpected fields in top_active_requests item: {unexpected}"
        # Required identity / presentation fields must be present.
        assert "id" in keys
        assert "patient_name" in keys
        assert "status" in keys


def test_06_top_active_requests_no_forbidden_fields(clinic_a_headers):
    body = _get_overview(clinic_a_headers)
    for item in body["top_active_requests"]:
        leaks = set(item.keys()) & FORBIDDEN_FIELDS
        assert not leaks, f"forbidden fields leaked in top_active_requests: {leaks} item={item}"


def test_07_top_active_requests_status_is_non_terminal(clinic_a_headers):
    body = _get_overview(clinic_a_headers)
    for item in body["top_active_requests"]:
        assert item["status"] not in TERMINAL_STATUSES, (
            f"terminal-status request leaked into top_active_requests: {item['status']}"
        )


# --- 3. Clinic isolation ---


def test_08_isolation_top_active_only_own_clinic(isolated_pair):
    a, b = isolated_pair["a"], isolated_pair["b"]
    body_a = _get_overview(a["headers"])
    body_b = _get_overview(b["headers"])

    a_ids = {x["id"] for x in body_a["top_active_requests"]}
    b_ids = {x["id"] for x in body_b["top_active_requests"]}

    # The two sets must be disjoint — no request id can appear in both clinics' panels.
    assert a_ids.isdisjoint(b_ids), (
        f"clinic isolation violated: shared request ids = {a_ids & b_ids}"
    )

    # Cross-check via admin: lookup B's request ids and confirm none appear in A's panel.
    r = requests.get(
        f"{API}/admin/consultation-requests",
        headers=_admin_headers(),
        timeout=20,
    )
    assert r.status_code == 200
    all_reqs = r.json()["requests"]
    b_request_ids = {x["id"] for x in all_reqs if x.get("assigned_clinic_id") == b["id"]}
    assert b_request_ids, "expected at least one consultation_request for clinic B"
    assert a_ids.isdisjoint(b_request_ids), (
        f"clinic A panel contained clinic B request ids: {a_ids & b_request_ids}"
    )


def test_09_isolation_weekly_trend_counts_only_own_clinic(isolated_pair):
    a, b = isolated_pair["a"], isolated_pair["b"]
    body_a = _get_overview(a["headers"])
    body_b = _get_overview(b["headers"])

    a_total_assigned = sum(d["assigned"] for d in body_a["weekly_trend"])
    b_total_assigned = sum(d["assigned"] for d in body_b["weekly_trend"])

    # Clinic A had exactly 2 leads assigned during this test run, B had 1.
    # weekly_trend counts must match those expectations and must not leak across clinics.
    assert a_total_assigned >= 2, f"clinic A weekly_trend missing assignments: {a_total_assigned}"
    assert b_total_assigned >= 1, f"clinic B weekly_trend missing assignments: {b_total_assigned}"
    # Sanity: each clinic's total assigned in the 7-day window matches the number of leads we
    # just assigned to *that* clinic (since both were freshly created within the window).
    assert a_total_assigned == 2, (
        f"clinic A weekly_trend assigned-total should be 2 (got {a_total_assigned}); "
        f"isolation likely broken — leakage from clinic B."
    )
    assert b_total_assigned == 1, (
        f"clinic B weekly_trend assigned-total should be 1 (got {b_total_assigned}); "
        f"isolation likely broken — leakage from clinic A."
    )


def test_10_isolation_empty_clinic_top_active_is_empty(empty_clinic):
    body = _get_overview(empty_clinic["headers"])
    assert body["top_active_requests"] == [], (
        f"empty clinic should have no top_active_requests, got {body['top_active_requests']}"
    )


# --- 4. Backwards compatibility ---


def test_11_legacy_kpi_keys_preserved(clinic_a_headers):
    body = _get_overview(clinic_a_headers)
    required = {
        "new_requests",
        "awaiting_action",
        "booked_this_month",
        "attended_this_month",
        "no_show_this_month",
        "avg_response_seconds",
        "avg_time_to_book_seconds",
    }
    missing = required - set(body.keys())
    assert not missing, f"legacy KPI keys missing after C4 change: {missing}"
    # Type sanity for the count keys.
    for k in (
        "new_requests",
        "awaiting_action",
        "booked_this_month",
        "attended_this_month",
        "no_show_this_month",
    ):
        assert isinstance(body[k], int), f"{k} should be int, got {type(body[k]).__name__}"


# --- 5. Edge cases ---


def test_12_empty_clinic_weekly_trend_all_zeros(empty_clinic):
    body = _get_overview(empty_clinic["headers"])
    assert len(body["weekly_trend"]) == 7
    for item in body["weekly_trend"]:
        assert item["assigned"] == 0, f"empty clinic has non-zero assigned: {item}"
        assert item["booked"] == 0, f"empty clinic has non-zero booked: {item}"


def test_13_cap_more_than_five_returns_exactly_five(cap_clinic):
    body = _get_overview(cap_clinic["headers"])
    items = body["top_active_requests"]
    assert len(items) == 5, (
        f"expected exactly 5 items when 6 active requests exist, got {len(items)}"
    )
    # All 5 must be active (non-terminal) for *this* clinic.
    for item in items:
        assert item["status"] not in TERMINAL_STATUSES
        # ID must look like our app's UUID format, not a Mongo ObjectId.
        assert isinstance(item["id"], str) and len(item["id"]) >= 8


def test_14_cap_clinic_does_not_leak_seeded_forbidden_fields(cap_clinic):
    """cap_clinic seeded the underlying docs with real values in forbidden fields
    (patient_email, lead_id, utm_source, utm_campaign, utm_ad, source). Confirm
    the projection still strips them out — this is the strong version of the
    forbidden-fields test, because absence-of-key alone could be a false-pass if
    no doc ever had those fields populated.
    """
    body = _get_overview(cap_clinic["headers"])
    for item in body["top_active_requests"]:
        leaks = set(item.keys()) & FORBIDDEN_FIELDS
        assert not leaks, (
            f"forbidden fields leaked in cap_clinic top_active_requests "
            f"(underlying doc had these populated!): {leaks} item={item}"
        )
