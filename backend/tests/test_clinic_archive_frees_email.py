"""Archiving a clinic gives its email back.

End to end against a running backend, like test_clinic_archive_and_case_library.py,
but without hardcoded credentials. Set ZUBITE_TEST_BASE_URL (or
REACT_APP_BACKEND_URL), ZUBITE_TEST_ADMIN_USERNAME and ZUBITE_TEST_ADMIN_PASSWORD;
without them the module skips rather than fails.

Every test creates its own throwaway clinic with a unique address and leaves it
archived. The whole module logs in as a clinic four times, under the
/clinic/login limit of five attempts per five minutes.
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


def _address() -> str:
    return f"archive-test-{uuid.uuid4().hex[:10]}@example.com"


def _create(admin, email: str, label: str):
    r = admin.post(f"{API}/admin/clinics", json={
        "email": email,
        "clinic_name": f"TEST archive {label} {uuid.uuid4().hex[:6]}",
        "city": "Sofia",
        "phone": "+359000000000",
    })
    assert r.status_code in (200, 201), r.text
    body = r.json()
    return body["clinic"]["id"], body["temporary_password"]


def _clinic(admin, clinic_id: str) -> dict:
    r = admin.get(f"{API}/admin/clinics/{clinic_id}")
    assert r.status_code == 200, r.text
    return r.json()["clinic"]


def _clinic_login(email: str, password: str):
    s = _session()
    return s, s.post(f"{API}/clinic/login", json={"email": email, "password": password})


def test_an_archived_clinics_email_can_be_used_for_a_new_clinic(admin):
    email = _address()
    first, _ = _create(admin, email, "first")
    assert admin.post(f"{API}/admin/clinics/{first}/archive").status_code == 200

    second, _ = _create(admin, email, "second")
    assert second != first
    assert _clinic(admin, first).get("archived") is True
    admin.post(f"{API}/admin/clinics/{second}/archive")


def test_an_archived_clinic_can_no_longer_log_in(admin):
    email = _address()
    clinic_id, password = _create(admin, email, "login")
    _, before = _clinic_login(email, password)
    assert before.status_code == 200, before.text

    admin.post(f"{API}/admin/clinics/{clinic_id}/archive")
    _, after = _clinic_login(email, password)
    assert after.status_code in (401, 403), after.text


def test_a_session_opened_before_archiving_ends_with_it(admin):
    email = _address()
    clinic_id, password = _create(admin, email, "session")
    session, login = _clinic_login(email, password)
    assert login.status_code == 200, login.text
    assert session.get(f"{API}/clinic/profile").status_code == 200

    admin.post(f"{API}/admin/clinics/{clinic_id}/archive")
    assert session.get(f"{API}/clinic/profile").status_code == 403


def test_unarchiving_restores_the_email_and_the_login(admin):
    email = _address()
    clinic_id, password = _create(admin, email, "restore")
    admin.post(f"{API}/admin/clinics/{clinic_id}/archive")

    r = admin.post(f"{API}/admin/clinics/{clinic_id}/unarchive")
    assert r.status_code == 200, r.text
    assert _clinic(admin, clinic_id).get("email") == email
    _, login = _clinic_login(email, password)
    assert login.status_code == 200, login.text
    admin.post(f"{API}/admin/clinics/{clinic_id}/archive")


def test_unarchiving_is_refused_while_a_newer_clinic_holds_the_email(admin):
    email = _address()
    old, _ = _create(admin, email, "old")
    admin.post(f"{API}/admin/clinics/{old}/archive")
    new, _ = _create(admin, email, "new")

    refused = admin.post(f"{API}/admin/clinics/{old}/unarchive")
    assert refused.status_code == 409, refused.text
    assert email in refused.json()["detail"]
    assert _clinic(admin, old).get("archived") is True

    # Once the newer clinic gives the address back, the old one can return.
    admin.post(f"{API}/admin/clinics/{new}/archive")
    assert admin.post(f"{API}/admin/clinics/{old}/unarchive").status_code == 200
    admin.post(f"{API}/admin/clinics/{old}/archive")


def test_a_password_cannot_be_reset_on_an_archived_clinic(admin):
    clinic_id, _ = _create(admin, _address(), "reset")
    admin.post(f"{API}/admin/clinics/{clinic_id}/archive")
    r = admin.post(f"{API}/admin/clinic-accounts/{clinic_id}/reset-password")
    assert r.status_code == 409, r.text


def test_editing_an_archived_clinics_email_does_not_reoccupy_the_login(admin):
    original, replacement = _address(), _address()
    clinic_id, _ = _create(admin, original, "edit")
    admin.post(f"{API}/admin/clinics/{clinic_id}/archive")

    r = admin.patch(f"{API}/admin/clinics/{clinic_id}", json={"email": replacement})
    assert r.status_code == 200, r.text
    # The edited address is what unarchiving would restore, but it is still
    # free for a new clinic right now.
    fresh, _ = _create(admin, replacement, "fresh")
    admin.post(f"{API}/admin/clinics/{fresh}/archive")
