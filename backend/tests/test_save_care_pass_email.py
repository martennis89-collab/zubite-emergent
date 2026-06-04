"""
Tests for the patient-initiated "Save Care Pass by email" endpoint.

Endpoint under test: POST /api/leads/{lead_id}/email-care-pass

Hard contract:
  - Requires explicit `consent_to_email=True` (422 otherwise).
  - 404 for unknown lead.
  - Pydantic 422 on invalid email format.
  - Always 200 on the happy path even if RESEND_API_KEY is absent
    (the backend logs but does not surface to the patient).
  - Rate-limited at 3 calls / 5 min per client IP (in-memory).

Tests are tolerant of the shared rate-limit bucket — they always
create a fresh lead and tolerate 429 on rapid runs.
"""
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


def _create_lead() -> str:
    """Create a fresh lead and return its id. Tolerates server-side
    rate-limit by sleeping & retrying a few times."""
    payload = {
        "city_slug": "sofia",
        "treatment_type": "orthodontics",
        "answers": {},
        "name": f"Test {uuid.uuid4().hex[:6]}",
        "phone": "+359888112233",
        "email": f"u{uuid.uuid4().hex[:8]}@example.bg",
        "consent": True,
        "source": "quiz",
    }
    last = None
    for _ in range(4):
        r = requests.post(f"{BASE_URL}/api/leads", json=payload, timeout=10)
        if r.status_code == 200:
            return r.json()["id"]
        last = r
        if r.status_code == 429:
            time.sleep(35)
            continue
        break
    raise AssertionError(
        f"Could not create lead, last status={last.status_code} body={last.text[:160]}"
    )


@pytest.fixture(scope="module")
def lead_id() -> str:
    return _create_lead()


class TestSaveCarePassEmail:
    def test_consent_required(self, lead_id):
        r = requests.post(
            f"{BASE_URL}/api/leads/{lead_id}/email-care-pass",
            json={"email": "x@y.bg", "consent_to_email": False},
            timeout=10,
        )
        assert r.status_code == 422, r.text
        detail = r.json()["detail"]
        assert detail["code"] == "consent_required"
        assert "съгласие" in detail["message"].lower()

    def test_unknown_lead(self):
        # Skip if we hit rate limit — the test value is the 404, not the limiter.
        r = requests.post(
            f"{BASE_URL}/api/leads/{uuid.uuid4()}/email-care-pass",
            json={"email": "x@y.bg", "consent_to_email": True},
            timeout=10,
        )
        if r.status_code == 429:
            pytest.skip("rate-limit hit; covered separately")
        assert r.status_code == 404, r.text

    def test_invalid_email_format(self, lead_id):
        r = requests.post(
            f"{BASE_URL}/api/leads/{lead_id}/email-care-pass",
            json={"email": "not-an-email", "consent_to_email": True},
            timeout=10,
        )
        if r.status_code == 429:
            pytest.skip("rate-limit hit; covered separately")
        # Pydantic EmailStr → 422
        assert r.status_code == 422, r.text

    def test_happy_path(self):
        # Fresh lead + unique forwarded IP so the in-memory rate limiter
        # (keyed by client IP) doesn't bleed across test runs.
        unique_ip = f"203.0.113.{int(time.time()) % 250 + 1}"
        headers = {"X-Forwarded-For": unique_ip}
        # Create the lead under the same unique IP.
        create_payload = {
            "city_slug": "sofia",
            "treatment_type": "orthodontics",
            "answers": {},
            "name": "Иван",
            "phone": "+359888112233",
            "email": f"u{uuid.uuid4().hex[:8]}@example.bg",
            "consent": True,
            "source": "quiz",
        }
        lr = requests.post(
            f"{BASE_URL}/api/leads", json=create_payload, headers=headers, timeout=10
        )
        if lr.status_code == 429:
            pytest.skip("rate-limit hit on shared bucket")
        assert lr.status_code == 200, lr.text
        fresh_id = lr.json()["id"]

        r = requests.post(
            f"{BASE_URL}/api/leads/{fresh_id}/email-care-pass",
            json={
                "email": "patient@example.bg",
                "consent_to_email": True,
                "name": "Иван",
            },
            headers=headers,
            timeout=10,
        )
        if r.status_code == 429:
            pytest.skip("rate-limit hit on shared bucket")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert "имейл" in data["message"].lower()
