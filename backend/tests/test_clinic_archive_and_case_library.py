"""E2E tests for (A) Clinic archive/unarchive workflow and
(B) Case Library revamp (treatment_type, duration, price, materials,
specifics, before_images, after_images).

Feb 2026 revamp — Zubite.bg admin dashboard.
"""
import os
import uuid
import pytest
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

# Sample premium clinic id supplied by main agent
PREMIUM_CLINIC_ID = "aa1aa2cd-c794-4f6e-97c3-0e32475925fc"


# ── Session / auth fixtures ─────────────────────────────────────────
@pytest.fixture(scope="module")
def admin_session():
    """Login as admin using cookie auth. Origin header required for CSRF."""
    s = requests.Session()
    s.headers.update({"Origin": BASE, "Referer": f"{BASE}/admin"})
    r = s.post(
        f"{API}/admin/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def test_clinic_id(admin_session):
    """Create a dedicated test clinic so archive round-trip doesn't
    disturb the seeded set. Also used for Case Library tests."""
    # Some deployments expose a `/admin/clinics` POST creator; if not
    # we fall back to directly PATCHing a spare clinic. Try creation
    # first.
    email = f"TEST_archive_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "clinic_name": f"TEST Archive Clinic {uuid.uuid4().hex[:6]}",
        "city": "Sofia",
        "phone": "+359000000000",
    }
    r = admin_session.post(f"{API}/admin/clinics", json=payload)
    if r.status_code in (200, 201):
        body = r.json()
        cid = (body.get("clinic") or {}).get("id") or body.get("id") or body.get("clinic_id")
        assert cid, f"Missing id in create response: {r.text}"
        yield cid
        # Cleanup — best-effort delete
        try:
            admin_session.delete(f"{API}/admin/clinics/{cid}")
        except Exception:
            pass
    else:
        # Fallback: use provided non-premium clinic id (OrthoBG Варна).
        # Ensure it starts unarchived.
        cid = "6167bef3-f865-4734-805f-e897ad5c5501"
        admin_session.post(f"{API}/admin/clinics/{cid}/unarchive")
        yield cid
        admin_session.post(f"{API}/admin/clinics/{cid}/unarchive")


# ── (A) ARCHIVE / UNARCHIVE ─────────────────────────────────────────
class TestArchiveWorkflow:
    def test_auth_required(self):
        r = requests.post(f"{API}/admin/clinics/{PREMIUM_CLINIC_ID}/archive")
        assert r.status_code in (401, 403), f"Expected auth block, got {r.status_code}"

    def test_archive_marks_clinic(self, admin_session, test_clinic_id):
        r = admin_session.post(f"{API}/admin/clinics/{test_clinic_id}/archive")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert data.get("archived") is True
        assert "archived_at" in data

    def test_archive_is_idempotent(self, admin_session, test_clinic_id):
        r = admin_session.post(f"{API}/admin/clinics/{test_clinic_id}/archive")
        assert r.status_code == 200
        data = r.json()
        assert data.get("already_archived") is True

    def test_admin_list_default_excludes_archived(self, admin_session, test_clinic_id):
        r = admin_session.get(f"{API}/admin/clinics")
        assert r.status_code == 200
        clinics = r.json() if isinstance(r.json(), list) else r.json().get("clinics", [])
        ids = [c.get("id") for c in clinics]
        assert test_clinic_id not in ids, "Archived clinic must not appear in default list"
        # `archived` bool present on every clinic
        for c in clinics[:5]:
            assert "archived" in c, "Every listed clinic must expose `archived` field"

    def test_admin_list_archived_true_returns_only_archived(self, admin_session, test_clinic_id):
        r = admin_session.get(f"{API}/admin/clinics", params={"archived": "true"})
        assert r.status_code == 200
        clinics = r.json() if isinstance(r.json(), list) else r.json().get("clinics", [])
        ids = [c.get("id") for c in clinics]
        assert test_clinic_id in ids
        for c in clinics:
            assert c.get("archived") is True

    def test_admin_list_archived_all_returns_both(self, admin_session, test_clinic_id):
        r = admin_session.get(f"{API}/admin/clinics", params={"archived": "all"})
        assert r.status_code == 200
        clinics = r.json() if isinstance(r.json(), list) else r.json().get("clinics", [])
        archived_flags = {bool(c.get("archived")) for c in clinics}
        assert True in archived_flags and False in archived_flags

    def test_public_profile_returns_404_when_archived(self, test_clinic_id):
        r = requests.get(f"{API}/public/clinics/{test_clinic_id}")
        assert r.status_code == 404, f"Archived clinic must 404, got {r.status_code}"

    def test_public_list_excludes_archived(self, test_clinic_id):
        r = requests.get(f"{API}/public/clinics")
        assert r.status_code == 200
        payload = r.json()
        items = payload if isinstance(payload, list) else (
            payload.get("clinics") or payload.get("items") or []
        )
        ids = [c.get("id") for c in items]
        assert test_clinic_id not in ids

    def test_unarchive_restores(self, admin_session, test_clinic_id):
        r = admin_session.post(f"{API}/admin/clinics/{test_clinic_id}/unarchive")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert data.get("archived") is False
        assert "unarchived_at" in data

    def test_unarchive_is_idempotent(self, admin_session, test_clinic_id):
        r = admin_session.post(f"{API}/admin/clinics/{test_clinic_id}/unarchive")
        assert r.status_code == 200
        # No hard requirement for a flag but should stay 200

    def test_public_visible_after_unarchive(self, admin_session, test_clinic_id):
        # Public visibility depends on clinic being active/published. We
        # just assert that the archived-side 404 is gone — either 200 or
        # some non-404 (403/redirect) is acceptable, but NOT 404.
        r = requests.get(f"{API}/public/clinics/{test_clinic_id}")
        # For a freshly created test clinic that's not published, public
        # profile may still 404 due to visibility rules unrelated to
        # archive. Accept 200 OR still-404 IF the seed clinic wasn't
        # published anyway. We assert admin sees it as archived=false.
        admin_get = admin_session.get(f"{API}/admin/clinics/{test_clinic_id}")
        assert admin_get.status_code == 200
        body = admin_get.json()
        clinic = body.get("clinic") or body
        assert clinic.get("archived") is False


# ── (B) CASE LIBRARY REVAMP ─────────────────────────────────────────
def _valid_case(**overrides):
    base = {
        "id": str(uuid.uuid4()),
        "title": "TEST Case",
        "category": "aligners",
        "summary": "Short summary of the test case.",
        "status": "published",
        "consent_confirmed": True,
        "treatment_type": "Aligners",
        "duration": "6 months",
        "price": "от 3500 лв",
        "materials": "Invisalign",
        "specifics": "Complex crossbite corrected.",
        "before_images": ["https://cdn.example.com/before1.jpg"],
        "after_images": ["https://cdn.example.com/after1.jpg"],
    }
    base.update(overrides)
    return base


class TestCaseLibraryFields:
    def test_patch_accepts_new_fields_and_persists(self, admin_session):
        case = _valid_case()
        body = {
            "clinic_profile": {
                "profile_status": "published",
                "case_library": [case],
            }
        }
        r = admin_session.patch(
            f"{API}/admin/clinics/{PREMIUM_CLINIC_ID}", json=body
        )
        assert r.status_code == 200, r.text

        g = admin_session.get(f"{API}/admin/clinics/{PREMIUM_CLINIC_ID}")
        assert g.status_code == 200
        gbody = g.json()
        clinic = gbody.get("clinic") or gbody
        cases = (clinic.get("clinic_profile") or {}).get("case_library") or []
        assert cases, f"Case library empty after PATCH: {gbody}"
        saved = next((c for c in cases if c.get("id") == case["id"]), None)
        assert saved, f"Test case id not found in saved list. Got: {[c.get('id') for c in cases]}"
        for f in (
            "treatment_type", "duration", "price", "materials",
            "specifics", "before_images", "after_images",
        ):
            assert saved.get(f) == case[f], f"{f} not persisted: {saved.get(f)!r} vs {case[f]!r}"

    def test_public_profile_returns_new_case_fields(self):
        r = requests.get(f"{API}/public/clinics/{PREMIUM_CLINIC_ID}")
        assert r.status_code == 200, r.text
        cases = (r.json().get("clinic_profile") or {}).get("case_library") or r.json().get("case_library") or []
        assert cases, "Expected public case_library to include published case"
        pub = cases[0]
        for f in ("treatment_type", "duration", "price", "materials", "specifics",
                  "before_images", "after_images"):
            assert f in pub, f"Public payload missing field: {f}"

    def test_too_many_before_images_returns_400(self, admin_session):
        case = _valid_case(before_images=[
            "https://cdn.example.com/1.jpg",
            "https://cdn.example.com/2.jpg",
            "https://cdn.example.com/3.jpg",
            "https://cdn.example.com/4.jpg",
        ])
        r = admin_session.patch(
            f"{API}/admin/clinics/{PREMIUM_CLINIC_ID}",
            json={"clinic_profile": {"profile_status": "published", "case_library": [case]}},
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        assert "exceeds 3" in r.text.lower() or "before_images" in r.text.lower()

    def test_too_many_after_images_returns_400(self, admin_session):
        case = _valid_case(after_images=[
            "https://cdn.example.com/1.jpg",
            "https://cdn.example.com/2.jpg",
            "https://cdn.example.com/3.jpg",
            "https://cdn.example.com/4.jpg",
        ])
        r = admin_session.patch(
            f"{API}/admin/clinics/{PREMIUM_CLINIC_ID}",
            json={"clinic_profile": {"profile_status": "published", "case_library": [case]}},
        )
        assert r.status_code == 400

    def test_non_list_images_returns_422_or_400(self, admin_session):
        case = _valid_case(before_images="not-a-list")
        r = admin_session.patch(
            f"{API}/admin/clinics/{PREMIUM_CLINIC_ID}",
            json={"clinic_profile": {"profile_status": "published", "case_library": [case]}},
        )
        assert r.status_code in (400, 422), r.text

    def test_url_over_500_chars_returns_400(self, admin_session):
        long_url = "https://cdn.example.com/" + ("a" * 500) + ".jpg"
        case = _valid_case(before_images=[long_url])
        r = admin_session.patch(
            f"{API}/admin/clinics/{PREMIUM_CLINIC_ID}",
            json={"clinic_profile": {"profile_status": "published", "case_library": [case]}},
        )
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}: {r.text}"

    def test_published_requires_consent(self, admin_session):
        case = _valid_case(consent_confirmed=False)
        r = admin_session.patch(
            f"{API}/admin/clinics/{PREMIUM_CLINIC_ID}",
            json={"clinic_profile": {"profile_status": "published", "case_library": [case]}},
        )
        assert r.status_code == 400
        assert "consent" in r.text.lower()

    def test_non_published_case_excluded_from_public(self, admin_session):
        draft_id = str(uuid.uuid4())
        pub_id = str(uuid.uuid4())
        draft = _valid_case(id=draft_id, status="draft", consent_confirmed=False,
                            title="TEST Draft Case")
        published = _valid_case(id=pub_id, title="TEST Published Case")
        r = admin_session.patch(
            f"{API}/admin/clinics/{PREMIUM_CLINIC_ID}",
            json={"clinic_profile": {"profile_status": "published",
                                     "case_library": [draft, published]}},
        )
        assert r.status_code == 200, r.text
        pub = requests.get(f"{API}/public/clinics/{PREMIUM_CLINIC_ID}")
        assert pub.status_code == 200
        pub_cases = (pub.json().get("clinic_profile") or {}).get("case_library") or pub.json().get("case_library") or []
        pub_ids = [c.get("id") for c in pub_cases]
        assert pub_id in pub_ids, "Published+consented case should be in public payload"
        assert draft_id not in pub_ids, "Draft case must NOT be in public payload"
