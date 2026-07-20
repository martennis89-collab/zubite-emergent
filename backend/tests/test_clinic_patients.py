"""Backend tests for the Clinic "Пациенти" (Patients) section
(routers/clinic_patients.py).

Covers:
- Numeric patient_number assignment, idempotency, and global uniqueness
  across clinics.
- Clinic isolation on both the list and detail endpoints.
- Aggregation of consultation_requests / clinic_bookings /
  online_orientation_bookings into a single patient mini profile.
- Internal-notes CRUD + clinic isolation + non-leak into the unrelated
  consultation-request detail endpoint.
- Regression smoke test on the existing consultation-requests endpoint.
"""

import os
import uuid
import pytest
import requests

from database import db

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://ortho-preview-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@zubite.bg"
ADMIN_PASSWORD = "password"

CLINIC_A_EMAIL = "mvp-test@example.com"
CLINIC_A_PASSWORD = "Mvp1234!"

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
        "clinic_name": f"TEST_Patients_ClinicB_{suffix}",
        "city": "Sofia",
        "email": f"test-patients-clinic-b-{suffix}@example.com",
        "phone": "+359 88 000 0000",
        "address": "Test address",
        "treatments_offered": ["aligners"],
        "clinic_status": "evaluation_partner",
        "subscription_status": "trial",
    }
    r = requests.post(f"{API}/admin/clinics", json=payload, headers=admin_headers, timeout=20)
    assert r.status_code == 200, f"Create Clinic B failed: {r.status_code} {r.text}"
    data = r.json()
    temp_password = data["temporary_password"]
    cid = data["clinic"]["id"]
    r2 = requests.post(f"{API}/clinic/login", json={"email": payload["email"], "password": temp_password}, timeout=20)
    assert r2.status_code == 200, f"Clinic B login failed: {r2.status_code} {r2.text}"
    token = r2.json()["access_token"]
    return {"id": cid, "email": payload["email"], "token": token}


@pytest.fixture(scope="module")
def clinic_b_headers(clinic_b):
    return {"Authorization": f"Bearer {clinic_b['token']}", "Content-Type": "application/json"}


def _create_lead_and_assign(admin_headers, clinic_id):
    suffix = uuid.uuid4().hex[:8]
    lead_payload = {
        "name": f"TEST_Patient_{suffix}",
        "phone": f"+359 88 {suffix[:3]} {suffix[3:7]}",
        "email": f"test-patients-{suffix}@example.com",
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


@pytest.fixture(scope="module")
def lead_a(admin_headers, clinic_a_id):
    return _create_lead_and_assign(admin_headers, clinic_a_id)


@pytest.fixture(scope="module")
def lead_b(admin_headers, clinic_b):
    return _create_lead_and_assign(admin_headers, clinic_b["id"])


def _find_row(patients, lead_id):
    return next((p for p in patients if p["lead_id"] == lead_id), None)


# ─────────────────────────── Tests ───────────────────────────

# Test 1 — empty list before any lead is assigned to this clinic
def test_01_list_patients_empty_before_any_leads(clinic_b_headers):
    r = requests.get(f"{API}/clinic/patients", headers=clinic_b_headers, timeout=20)
    assert r.status_code == 200, r.text
    assert r.json()["patients"] == []


# Test 2 — patient_number assigned (non-null int) on first list call
def test_02_patient_number_assigned_on_first_list_call(clinic_a_headers, lead_a):
    r = requests.get(f"{API}/clinic/patients", headers=clinic_a_headers, timeout=20)
    assert r.status_code == 200, r.text
    row = _find_row(r.json()["patients"], lead_a)
    assert row is not None, "lead_a not present in clinic A's patients list"
    assert isinstance(row["patient_number"], int)
    _state["lead_a_patient_number"] = row["patient_number"]


# Test 3 — patient_number stable across repeated calls
def test_03_patient_number_stable_across_calls(clinic_a_headers, lead_a):
    r = requests.get(f"{API}/clinic/patients", headers=clinic_a_headers, timeout=20)
    assert r.status_code == 200, r.text
    row = _find_row(r.json()["patients"], lead_a)
    assert row["patient_number"] == _state["lead_a_patient_number"]


# Test 4 — patient_number is drawn from a single global sequence, not per-clinic
def test_04_patient_number_globally_unique_across_clinics(clinic_a_headers, clinic_b_headers, lead_a, lead_b):
    ra = requests.get(f"{API}/clinic/patients", headers=clinic_a_headers, timeout=20)
    rb = requests.get(f"{API}/clinic/patients", headers=clinic_b_headers, timeout=20)
    assert ra.status_code == 200 and rb.status_code == 200
    row_a = _find_row(ra.json()["patients"], lead_a)
    row_b = _find_row(rb.json()["patients"], lead_b)
    assert isinstance(row_a["patient_number"], int)
    assert isinstance(row_b["patient_number"], int)
    assert row_a["patient_number"] != row_b["patient_number"]
    _state["lead_b_patient_number"] = row_b["patient_number"]


# Test 5 — clinic isolation on the list endpoint
def test_05_clinic_isolation_list(clinic_a_headers, clinic_b_headers, lead_a, lead_b):
    ra = requests.get(f"{API}/clinic/patients", headers=clinic_a_headers, timeout=20)
    rb = requests.get(f"{API}/clinic/patients", headers=clinic_b_headers, timeout=20)
    assert _find_row(ra.json()["patients"], lead_b) is None, "Clinic A sees Clinic B's patient"
    assert _find_row(rb.json()["patients"], lead_a) is None, "Clinic B sees Clinic A's patient"


# Test 6 — clinic isolation on the detail endpoint (404, no leak)
def test_06_clinic_isolation_detail_404(clinic_a_headers, clinic_b_headers):
    a_number = _state["lead_a_patient_number"]
    b_number = _state["lead_b_patient_number"]
    r1 = requests.get(f"{API}/clinic/patients/{a_number}", headers=clinic_b_headers, timeout=20)
    assert r1.status_code == 404, r1.text
    r2 = requests.get(f"{API}/clinic/patients/{b_number}", headers=clinic_a_headers, timeout=20)
    assert r2.status_code == 404, r2.text


# Test 7 — detail endpoint aggregates an existing consultation_request
def test_07_get_patient_aggregates_consultation_requests(clinic_a_headers, admin_headers, lead_a):
    number = _state["lead_a_patient_number"]
    r = requests.get(f"{API}/clinic/patients/{number}", headers=clinic_a_headers, timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["patient_number"] == number
    assert body["contact"]["phone"], "contact info missing"
    consultations = body["consultations"]
    assert any(c.get("lead_id") == lead_a for c in consultations), "consultation_request not aggregated"
    _state["lead_a_req_id"] = next(c["id"] for c in consultations if c.get("lead_id") == lead_a)


# Test 8 — detail endpoint aggregates a clinic_bookings row
@pytest.mark.asyncio
async def test_08_get_patient_aggregates_bookings(clinic_b_headers, clinic_b, lead_b):
    number = _state["lead_b_patient_number"]
    booking_id = str(uuid.uuid4())
    await db.clinic_bookings.insert_one({
        "id": booking_id,
        "clinic_id": clinic_b["id"],
        "lead_id": lead_b,
        "patient_name": "TEST_Patient_Booking",
        "patient_email": "test-booking@example.com",
        "patient_phone": "+359888000111",
        "selected_slot_start": "2026-08-01T09:00:00+03:00",
        "status": "pending_confirmation",
        "created_at": "2026-07-20T00:00:00+00:00",
    })
    r = requests.get(f"{API}/clinic/patients/{number}", headers=clinic_b_headers, timeout=20)
    assert r.status_code == 200, r.text
    bookings = r.json()["bookings"]
    assert any(b["id"] == booking_id for b in bookings), "clinic_bookings row not aggregated"


# Test 9 — detail endpoint aggregates an online_orientation_bookings row
# with clinic-audience PII visible (via the reused _public_booking helper)
@pytest.mark.asyncio
async def test_09_get_patient_aggregates_orientation_bookings(clinic_b_headers, clinic_b, lead_b):
    number = _state["lead_b_patient_number"]
    ob_id = str(uuid.uuid4())
    await db.online_orientation_bookings.insert_one({
        "id": ob_id,
        "clinic_id": clinic_b["id"],
        "lead_id": lead_b,
        "patient_name": "TEST_Patient_Orientation",
        "patient_phone": "+359888000222",
        "patient_email": "test-orientation@example.com",
        "topic": "implants",
        "scheduled_at": "2026-08-02T10:00:00+03:00",
        "status": "pending_clinic_confirmation",
        "created_at": "2026-07-20T00:00:00+00:00",
    })
    r = requests.get(f"{API}/clinic/patients/{number}", headers=clinic_b_headers, timeout=20)
    assert r.status_code == 200, r.text
    rows = r.json()["orientation_bookings"]
    match = next((b for b in rows if b["id"] == ob_id), None)
    assert match is not None, "online_orientation_bookings row not aggregated"
    assert match["patient_phone"] == "+359888000222", "clinic-audience PII missing from projection"


# Test 10 — internal note write-then-read round-trip
def test_10_notes_crud_write_then_read(clinic_a_headers):
    number = _state["lead_a_patient_number"]
    r = requests.put(
        f"{API}/clinic/patients/{number}/note",
        json={"note": "Патиентът предпочита сутрешни часове."},
        headers=clinic_a_headers,
        timeout=20,
    )
    assert r.status_code == 200, r.text
    assert r.json()["clinic_internal_note"] == "Патиентът предпочита сутрешни часове."

    r2 = requests.get(f"{API}/clinic/patients/{number}", headers=clinic_a_headers, timeout=20)
    assert r2.status_code == 200, r2.text
    assert r2.json()["clinic_internal_note"] == "Патиентът предпочита сутрешни часове."
    assert r2.json()["clinic_internal_note_updated_at"]


# Test 11 — note isolation: clinic B cannot write a note on clinic A's patient
def test_11_notes_isolation(clinic_b_headers):
    number = _state["lead_a_patient_number"]
    r = requests.put(
        f"{API}/clinic/patients/{number}/note",
        json={"note": "should not be allowed"},
        headers=clinic_b_headers,
        timeout=20,
    )
    assert r.status_code == 404, r.text


# Test 12 — regression guard: the internal note never leaks into the
# unrelated consultation-request detail endpoint's patient_context.
def test_12_notes_never_leak_to_other_surfaces(clinic_a_headers):
    req_id = _state["lead_a_req_id"]
    r = requests.get(f"{API}/clinic/consultation-requests/{req_id}", headers=clinic_a_headers, timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "clinic_internal_note" not in body
    assert "clinic_internal_note" not in (body.get("patient_context") or {})


# Test 13 — regression smoke test: existing consultation-requests endpoint
# still works and returns its original shape after the schema additions.
def test_13_regression_existing_consultation_endpoint_unaffected(clinic_a_headers):
    r = requests.get(f"{API}/clinic/consultation-requests", headers=clinic_a_headers, timeout=20)
    assert r.status_code == 200, r.text
    assert isinstance(r.json().get("requests"), list)
