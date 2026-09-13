"""The Clear Advance status endpoints answer instead of crashing.

Both did `... if outbox else 0` on a MongoDB collection. PyMongo refuses truth
testing on collections, so every call raised NotImplementedError and returned
500: the Clear Advance card on every clinic's Settings page, and the admin
status endpoint. The unit tests could not catch it, because a fake collection is
truthy. This runs against a real backend with the real driver for exactly that
reason.

Set ZUBITE_TEST_BASE_URL (or REACT_APP_BACKEND_URL), ZUBITE_TEST_ADMIN_USERNAME
and ZUBITE_TEST_ADMIN_PASSWORD; without them the module skips.
"""
import os
import uuid

import pytest
import requests

BASE = (os.environ.get("ZUBITE_TEST_BASE_URL") or os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
ADMIN_USERNAME = os.environ.get("ZUBITE_TEST_ADMIN_USERNAME")
ADMIN_PASSWORD = os.environ.get("ZUBITE_TEST_ADMIN_PASSWORD")
API = f"{BASE}/api"

pytestmark = pytest.mark.skipif(
    not (BASE and ADMIN_USERNAME and ADMIN_PASSWORD),
    reason="needs a running backend and admin credentials",
)


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"Origin": BASE, "Referer": f"{BASE}/admin"})
    return s


@pytest.fixture(scope="module")
def admin():
    s = _session()
    r = s.post(f"{API}/admin/login", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return s


def _create(admin, label: str):
    email = f"status-test-{uuid.uuid4().hex[:10]}@example.com"
    r = admin.post(f"{API}/admin/clinics", json={
        "email": email,
        "clinic_name": f"TEST status {label} {uuid.uuid4().hex[:6]}",
        "city": "Sofia",
        "phone": "+359000000000",
    })
    assert r.status_code in (200, 201), r.text
    body = r.json()
    return body["clinic"]["id"], email, body["temporary_password"]


def test_the_admin_status_endpoint_answers_for_an_unconnected_clinic(admin):
    clinic_id, _, _ = _create(admin, "admin")
    r = admin.get(f"{API}/admin/clinics/{clinic_id}/clear-advance")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["connected"] is False
    assert (body["pending_outbox"], body["succeeded_outbox"]) == (0, 0)
    admin.post(f"{API}/admin/clinics/{clinic_id}/archive")


def test_the_clinic_settings_card_endpoint_answers(admin):
    clinic_id, email, password = _create(admin, "clinic")
    clinic = _session()
    login = clinic.post(f"{API}/clinic/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text

    r = clinic.get(f"{API}/clinic/clear-advance")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["connected"] is False
    assert (body["pending_outbox"], body["succeeded_outbox"]) == (0, 0)
    admin.post(f"{API}/admin/clinics/{clinic_id}/archive")
