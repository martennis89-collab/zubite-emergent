"""Backend regression + new-feature tests for the Consultation Workflow MVP (Feb 2026).

Covers admin clinic/consultation endpoints, clinic-side action workflow, access control,
and regression on existing endpoints.
"""

import os
import time
import uuid
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://ortho-preview-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@zubite.bg"
ADMIN_PASSWORD = "password"

CLINIC_A_EMAIL = "mvp-test@example.com"
CLINIC_A_PASSWORD = "Mvp1234!"

# Module-level shared state
_state = {}


# ─────────────────────────── Fixtures ───────────────────────────

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def clinic_a_token():
    r = requests.post(f"{API}/clinic/login", json={"email": CLINIC_A_EMAIL, "password": CLINIC_A_PASSWORD}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"Clinic A login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def clinic_a_headers(clinic_a_token):
    return {"Authorization": f"Bearer {clinic_a_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def clinic_a_id(clinic_a_token):
    r = requests.get(
        f"{API}/clinic/profile",
        headers={"Authorization": f"Bearer {clinic_a_token}"},
        timeout=20,
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


@pytest.fixture(scope="module")
def clinic_b(admin_headers):
    """Create a fresh Clinic B via admin endpoint and login."""
    suffix = uuid.uuid4().hex[:6]
    payload = {
        "clinic_name": f"TEST_Clinic_B_{suffix}",
        "city": "Sofia",
        "email": f"test-clinic-b-{suffix}@example.com",
        "phone": "+359 88 000 0000",
        "address": "Test address",
        "treatments_offered": ["aligners"],
        "clinic_status": "evaluation_partner",
        "subscription_status": "trial",
    }
    r = requests.post(f"{API}/admin/clinics", json=payload, headers=admin_headers, timeout=20)
    assert r.status_code == 200, f"Create Clinic B failed: {r.status_code} {r.text}"
    data = r.json()
    assert "temporary_password" in data
    temp_password = data["temporary_password"]
    cid = data["clinic"]["id"]
    # login as Clinic B
    r2 = requests.post(f"{API}/clinic/login", json={"email": payload["email"], "password": temp_password}, timeout=20)
    assert r2.status_code == 200, f"Clinic B login failed: {r2.status_code} {r2.text}"
    token = r2.json()["access_token"]
    _state["clinic_b"] = {"id": cid, "email": payload["email"], "token": token}
    return _state["clinic_b"]


# ─────────────────────────── Tests ───────────────────────────

# Test 1 — Admin POST /api/admin/clinics
def test_01_admin_create_clinic(clinic_b):
    assert clinic_b["id"]
    assert clinic_b["token"]


# Test 2 — Admin PATCH /api/admin/clinics/{id}
def test_02_admin_update_clinic(admin_headers, clinic_b):
    r = requests.patch(
        f"{API}/admin/clinics/{clinic_b['id']}",
        json={"clinic_status": "active_partner", "subscription_status": "active"},
        headers=admin_headers,
        timeout=20,
    )
    assert r.status_code == 200, r.text
    c = r.json()["clinic"]
    assert c["clinic_status"] == "active_partner"
    assert c["subscription_status"] == "active"


# Test 17a — invalid clinic_status on PATCH
def test_17a_admin_update_clinic_invalid_status(admin_headers, clinic_b):
    r = requests.patch(
        f"{API}/admin/clinics/{clinic_b['id']}",
        json={"clinic_status": "bogus_status"},
        headers=admin_headers,
        timeout=20,
    )
    assert r.status_code == 400, r.text


# Test 17b — invalid clinic_status on POST create
def test_17b_admin_create_clinic_invalid_status(admin_headers):
    suffix = uuid.uuid4().hex[:6]
    r = requests.post(
        f"{API}/admin/clinics",
        json={
            "clinic_name": f"TEST_bad_{suffix}",
            "city": "Sofia",
            "email": f"bad-{suffix}@example.com",
            "phone": "+359 88 000 0001",
            "clinic_status": "bogus_value",
            "subscription_status": "trial",
        },
        headers=admin_headers,
        timeout=20,
    )
    assert r.status_code == 400, r.text


# Helper: create a lead and assign to clinic_a, returns lead_id and consultation_request_id
def _create_lead_and_assign(admin_headers, clinic_id):
    suffix = uuid.uuid4().hex[:8]
    lead_payload = {
        "name": f"TEST_Patient_{suffix}",
        "phone": f"+359 88 {suffix[:3]} {suffix[3:7]}",
        "email": f"test-{suffix}@example.com",
        "city_slug": "sofia",
        "treatment_type": "aligners",
        "consent": True,
    }
    r = requests.post(f"{API}/leads", json=lead_payload, timeout=20)
    assert r.status_code in (200, 201), r.text
    lead_id = r.json().get("id") or r.json().get("lead_id") or r.json().get("lead", {}).get("id")
    assert lead_id, f"No lead id in response: {r.json()}"

    r2 = requests.patch(
        f"{API}/admin/leads/{lead_id}/assign-clinic",
        json={"clinic_id": clinic_id},
        headers=admin_headers,
        timeout=20,
    )
    assert r2.status_code == 200, r2.text
    return lead_id


# Test 3 — Admin assign-clinic auto-creates ConsultationRequest + emits event
def test_03_assign_clinic_creates_consultation_request(admin_headers, clinic_a_id):
    lead_id = _create_lead_and_assign(admin_headers, clinic_a_id)
    _state["lead_id_a"] = lead_id

    # Find the consultation request linked
    r = requests.get(f"{API}/admin/consultation-requests", headers=admin_headers, timeout=20)
    assert r.status_code == 200, r.text
    reqs = r.json()["requests"]
    matching = [x for x in reqs if x.get("lead_id") == lead_id]
    assert matching, "No consultation_request created from lead assign"
    cr = matching[0]
    assert cr["assigned_clinic_id"] == clinic_a_id
    assert cr["status"] == "assigned"
    _state["req_a"] = cr["id"]

    # Test 4 — listing has assigned_clinic_name attached
    assert cr.get("assigned_clinic_name"), "assigned_clinic_name missing on listing"

    # Verify event timeline includes 'assigned_to_clinic'
    r2 = requests.get(f"{API}/admin/consultation-requests/{cr['id']}/events", headers=admin_headers, timeout=20)
    assert r2.status_code == 200
    events = r2.json()["events"]
    assert any(e["event_type"] == "assigned_to_clinic" for e in events), f"events: {events}"


# Test 5 — Clinic login + listing returns ONLY their own
def test_05_clinic_listing_isolation(clinic_a_headers, clinic_b):
    r = requests.get(f"{API}/clinic/consultation-requests", headers=clinic_a_headers, timeout=20)
    assert r.status_code == 200, r.text
    requests_a = r.json()["requests"]
    assert _state["req_a"] in [x["id"] for x in requests_a]

    # Clinic B sees nothing for that req
    rb = requests.get(
        f"{API}/clinic/consultation-requests",
        headers={"Authorization": f"Bearer {clinic_b['token']}"},
        timeout=20,
    )
    assert rb.status_code == 200
    ids_b = [x["id"] for x in rb.json()["requests"]]
    assert _state["req_a"] not in ids_b


# Test 6 — first GET sets clinic_viewed_at + emits event + status->clinic_viewed
def test_06_clinic_first_view_transitions(clinic_a_headers):
    rid = _state["req_a"]
    r = requests.get(f"{API}/clinic/consultation-requests/{rid}", headers=clinic_a_headers, timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["request"]["status"] == "clinic_viewed"
    assert body["request"]["clinic_viewed_at"] is not None
    assert any(e["event_type"] == "clinic_viewed_request" for e in body["events"])


# Test 7 — call_attempted action
def test_07_call_attempted(clinic_a_headers):
    rid = _state["req_a"]
    r = requests.post(
        f"{API}/clinic/consultation-requests/{rid}/action",
        json={"action_type": "call_attempted", "note": "TEST: tried"},
        headers=clinic_a_headers,
        timeout=20,
    )
    assert r.status_code == 200, r.text
    req = r.json()["request"]
    assert req["status"] == "call_attempted"
    assert req["call_attempted_at"] is not None
    assert req["first_action_at"] is not None


# Test 8 — book_consultation with appointment payload
def test_08_book_consultation(clinic_a_headers):
    rid = _state["req_a"]
    payload = {
        "action_type": "book_consultation",
        "appointment": {
            "appointment_type": "orthodontic_consultation",
            "start_time": "2026-02-15T10:00:00+00:00",
            "end_time": "2026-02-15T10:30:00+00:00",
            "notes": "TEST booking",
        },
    }
    r = requests.post(f"{API}/clinic/consultation-requests/{rid}/action", json=payload, headers=clinic_a_headers, timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["request"]["status"] == "booked"
    assert body["request"]["appointment_booked_at"] is not None
    assert body["appointment"] is not None
    _state["appt_a"] = body["appointment"]["id"]


# Test 17c — book_consultation without appointment payload returns 400
def test_17c_book_without_appointment(clinic_a_headers, admin_headers, clinic_a_id):
    # use a fresh request to avoid state pollution
    lead_id = _create_lead_and_assign(admin_headers, clinic_a_id)
    r0 = requests.get(f"{API}/admin/consultation-requests", headers=admin_headers, timeout=20)
    rid = next(x["id"] for x in r0.json()["requests"] if x.get("lead_id") == lead_id)
    r = requests.post(
        f"{API}/clinic/consultation-requests/{rid}/action",
        json={"action_type": "book_consultation"},
        headers=clinic_a_headers,
        timeout=20,
    )
    assert r.status_code == 400, r.text


# Test 17d — invalid action_type
def test_17d_invalid_action_type(clinic_a_headers):
    rid = _state["req_a"]
    r = requests.post(
        f"{API}/clinic/consultation-requests/{rid}/action",
        json={"action_type": "invalid_action_xyz"},
        headers=clinic_a_headers,
        timeout=20,
    )
    assert r.status_code == 400, r.text


# Test 9 — Clinic sees the booked appointment
def test_09_clinic_appointments_lists_booked(clinic_a_headers):
    r = requests.get(f"{API}/clinic/appointments", headers=clinic_a_headers, timeout=20)
    assert r.status_code == 200, r.text
    appts = r.json()["appointments"]
    assert _state["appt_a"] in [a["id"] for a in appts]


# Test 10 — mark_attended
def test_10_mark_attended(clinic_a_headers):
    rid = _state["req_a"]
    r = requests.post(
        f"{API}/clinic/consultation-requests/{rid}/action",
        json={"action_type": "mark_attended"},
        headers=clinic_a_headers,
        timeout=20,
    )
    assert r.status_code == 200, r.text
    req = r.json()["request"]
    assert req["status"] == "attended"
    assert req["attended_at"] is not None

    # appointment status transitioned
    ra = requests.get(f"{API}/clinic/appointments", headers=clinic_a_headers, timeout=20)
    appt = next(a for a in ra.json()["appointments"] if a["id"] == _state["appt_a"])
    assert appt["status"] == "attended"


# Test 11 — dashboard-overview KPIs
def test_11_dashboard_overview(clinic_a_headers):
    r = requests.get(f"{API}/clinic/dashboard-overview", headers=clinic_a_headers, timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    for k in ("new_requests", "awaiting_action", "booked_this_month",
              "attended_this_month", "no_show_this_month",
              "avg_response_seconds", "avg_time_to_book_seconds"):
        assert k in body, f"missing KPI: {k}"


# Test 12 — performance
def test_12_clinic_performance(clinic_a_headers):
    r = requests.get(f"{API}/clinic/performance", headers=clinic_a_headers, timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    for k in ("booking_conversion_rate", "attendance_rate",
              "avg_time_to_first_action_seconds", "avg_time_to_book_seconds"):
        assert k in body, f"missing perf field: {k}"


# Test 13 — Access control: Clinic A cannot read Clinic B's request → 404
def test_13_access_control_get_other_clinic_request(admin_headers, clinic_b, clinic_a_headers):
    # Create a request assigned to clinic B
    lead_id = _create_lead_and_assign(admin_headers, clinic_b["id"])
    r = requests.get(f"{API}/admin/consultation-requests", headers=admin_headers, timeout=20)
    rid_b = next(x["id"] for x in r.json()["requests"] if x.get("lead_id") == lead_id)
    _state["req_b"] = rid_b

    r2 = requests.get(f"{API}/clinic/consultation-requests/{rid_b}", headers=clinic_a_headers, timeout=20)
    assert r2.status_code == 404


# Test 14 — Access control: PATCH appointment isolation
def test_14_access_control_patch_other_clinic_appointment(clinic_b, clinic_a_headers):
    # Clinic B books an appointment first
    rid_b = _state["req_b"]
    headers_b = {"Authorization": f"Bearer {clinic_b['token']}", "Content-Type": "application/json"}
    # First view it (status assigned->clinic_viewed) is not necessary; just book
    payload = {
        "action_type": "book_consultation",
        "appointment": {
            "appointment_type": "general_consultation",
            "start_time": "2026-02-20T11:00:00+00:00",
            "end_time": "2026-02-20T11:30:00+00:00",
        },
    }
    r = requests.post(f"{API}/clinic/consultation-requests/{rid_b}/action", json=payload, headers=headers_b, timeout=20)
    assert r.status_code == 200, r.text
    appt_b_id = r.json()["appointment"]["id"]

    # Clinic A tries to PATCH it
    r2 = requests.patch(
        f"{API}/clinic/appointments/{appt_b_id}",
        json={"status": "cancelled"},
        headers=clinic_a_headers,
        timeout=20,
    )
    assert r2.status_code == 404


# Test 15 — Admin event timeline
def test_15_admin_event_timeline(admin_headers):
    rid = _state["req_a"]
    r = requests.get(f"{API}/admin/consultation-requests/{rid}/events", headers=admin_headers, timeout=20)
    assert r.status_code == 200, r.text
    events = r.json()["events"]
    types = {e["event_type"] for e in events}
    # Should include at least: assigned_to_clinic, clinic_viewed_request, call_attempted, appointment_booked, marked_attended
    expected = {"assigned_to_clinic", "clinic_viewed_request", "call_attempted", "appointment_booked", "marked_attended"}
    assert expected.issubset(types), f"missing events: {expected - types}; got: {types}"


# Test 16 — Regression on existing endpoints
@pytest.mark.parametrize("path", [
    "/admin/leads",
    "/admin/analytics",
    "/blog/posts",
    "/admin/clinic-accounts",
    "/admin/clinic-applications",
])
def test_16_regression_admin_endpoints(admin_headers, path):
    r = requests.get(f"{API}{path}", headers=admin_headers, timeout=20)
    assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"


def test_16b_regression_blog_posts_public():
    r = requests.get(f"{API}/blog/posts", timeout=20)
    assert r.status_code == 200, r.text


def test_16c_regression_post_lead():
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "name": f"TEST_RegLead_{suffix}",
        "phone": f"+359 88 999 {suffix[:4]}",
        "email": f"test-reg-{suffix}@example.com",
        "city_slug": "sofia",
        "treatment_type": "aligners",
        "consent": True,
    }
    r = requests.post(f"{API}/leads", json=payload, timeout=20)
    assert r.status_code in (200, 201), r.text
