"""Backend tests for admin clinic image upload feature (iteration 60).

Verifies:
  1. PATCH /api/admin/clinics/{id} accepts all 4 profile image URL fields.
  2. Public payloads (/api/public/clinics/{id} and reco endpoint) expose them.
  3. 500-char max_length is enforced.
"""
from __future__ import annotations

import os
import uuid

import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://ortho-preview-2.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

GROWTH_CLINIC_ID = "aa1aa2cd-c794-4f6e-97c3-0e32475925fc"


def _admin_session() -> requests.Session:
    s = requests.Session()
    r = s.post(
        f"{API}/admin/login",
        json={"username": "admin", "password": "admin123"},
        headers={"Origin": BASE_URL, "Content-Type": "application/json"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return s


# ─────────────────────────────────────────────────────────────
class TestClinicImageUrlFields:
    def test_patch_accepts_all_four_image_urls_and_persists(self):
        s = _admin_session()
        marker = uuid.uuid4().hex[:8]
        payload = {
            "clinic_profile": {
                "profile_status": "published",
                "hero_image_url": f"https://cdn.example.com/hero-{marker}.jpg",
                "doctor_spotlight_image_url": f"https://cdn.example.com/doc-{marker}.jpg",
                "team_image_url": f"https://cdn.example.com/team-{marker}.jpg",
                "environment_image_url": f"https://cdn.example.com/env-{marker}.jpg",
            }
        }
        r = s.patch(
            f"{API}/admin/clinics/{GROWTH_CLINIC_ID}",
            json=payload,
            headers={"Origin": BASE_URL, "Content-Type": "application/json"},
            timeout=20,
        )
        assert r.status_code == 200, r.text

        # Verify persistence via public GET (top-level image fields exposed by public_clinics.py).
        pg = requests.get(f"{API}/public/clinics/{GROWTH_CLINIC_ID}", timeout=15)
        assert pg.status_code == 200, pg.text
        data = pg.json()
        assert data.get("hero_image_url") == payload["clinic_profile"]["hero_image_url"]
        assert data.get("doctor_spotlight_image_url") == payload["clinic_profile"]["doctor_spotlight_image_url"]
        assert data.get("team_image_url") == payload["clinic_profile"]["team_image_url"]
        assert data.get("environment_image_url") == payload["clinic_profile"]["environment_image_url"]
        assert "_id" not in data

    def test_reco_payload_exposes_hero_image_url(self):
        # Create a lead, fetch recommendations, ensure hero_image_url key exists on each candidate.
        r = requests.post(
            f"{API}/leads",
            json={
                "treatment_type": "invisalign",
                "city_slug": "sofia",
                "name": "TEST reco img",
                "phone": "+359888000999",
                "email": f"test_img_{uuid.uuid4().hex[:6]}@example.com",
                "consent": True,
            },
            headers={"Origin": BASE_URL, "Content-Type": "application/json"},
            timeout=15,
        )
        assert r.status_code in (200, 201), r.text
        lead_id = r.json()["id"]

        rr = requests.get(f"{API}/leads/{lead_id}/recommended-clinics", timeout=15)
        assert rr.status_code == 200, rr.text
        clinics = rr.json().get("clinics", [])
        assert clinics, "reco returned no clinics"
        # hero_image_url exposure is tier-gated to premium clinic_profile.
        # Verify the Growth/Premium seed clinic (aa1aa2cd...) has it exposed.
        target = next((c for c in clinics if c.get("id") == GROWTH_CLINIC_ID), None)
        assert target is not None, f"Growth clinic missing from reco list: {[c.get('id') for c in clinics]}"
        prof = target.get("clinic_profile") or {}
        assert prof.get("hero_image_url"), f"hero_image_url missing on premium clinic profile: {list(prof.keys())}"
        for c in clinics:
            assert "_id" not in c

    def test_url_length_over_500_rejected(self):
        s = _admin_session()
        too_long = "https://a.example/" + "x" * 500
        r = s.patch(
            f"{API}/admin/clinics/{GROWTH_CLINIC_ID}",
            json={"clinic_profile": {"team_image_url": too_long}},
            headers={"Origin": BASE_URL, "Content-Type": "application/json"},
            timeout=15,
        )
        assert r.status_code in (400, 422), r.text

    def test_clear_image_via_empty_string(self):
        s = _admin_session()
        # First set (published, with env image)
        r1 = s.patch(
            f"{API}/admin/clinics/{GROWTH_CLINIC_ID}",
            json={"clinic_profile": {"profile_status": "published", "environment_image_url": "https://cdn.example.com/env-x.jpg"}},
            headers={"Origin": BASE_URL, "Content-Type": "application/json"},
            timeout=15,
        )
        assert r1.status_code == 200, r1.text
        # Then clear (still published, empty env)
        r2 = s.patch(
            f"{API}/admin/clinics/{GROWTH_CLINIC_ID}",
            json={"clinic_profile": {"profile_status": "published", "environment_image_url": ""}},
            headers={"Origin": BASE_URL, "Content-Type": "application/json"},
            timeout=15,
        )
        assert r2.status_code == 200, r2.text
        # Verify cleared via public payload (empty string coerced to None by `or None`).
        pg = requests.get(f"{API}/public/clinics/{GROWTH_CLINIC_ID}", timeout=15)
        assert pg.json().get("environment_image_url") in (None, "")
