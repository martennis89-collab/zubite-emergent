"""Focused tests for the Verified/Growth clinic intake mapping."""

from datetime import datetime, timedelta, timezone

from schemas import ClinicApplicationCreate
from routers.clinics import (
    _application_aligner_brands,
    _application_profile,
    _hash_intake_token,
    _invite_expired,
)


def test_complete_growth_intake_validates_and_preserves_structured_fields():
    application = ClinicApplicationCreate(
        clinic_name="Test Growth Clinic",
        city="София",
        address="бул. Тест 1",
        district_slug="lozenets",
        contact_name="Д-р Тест",
        phone="+359888123456",
        email="growth-intake@example.com",
        package_interest="growth_partner",
        treatments_supported=["aligners", "implants"],
        treatment_focus=["Алайнери", "Импланти"],
        short_description="Клиника с ясен и човешки подход.",
        founded_year=2012,
        treatment_case_counts=[
            {"treatment": "Алайнери", "completed_cases": 240, "as_of_year": 2026}
        ],
        doctor_spotlight_kind="lead_doctor",
        doctor_spotlight_name="Д-р Иванова",
        assessment_approaches=["airway_breathing", "functional_orthodontics"],
        aligner_brands=["invisalign", "spark"],
        claimed_official_provider_brands=["invisalign"],
        wants_online_booking=True,
        wants_viber_contact=True,
        viber_phone="+359888123456",
    )

    data = application.model_dump()
    assert data["package_interest"] == "growth_partner"
    assert data["treatment_case_counts"][0]["completed_cases"] == 240
    assert data["assessment_approaches"] == [
        "airway_breathing",
        "functional_orthodontics",
    ]


def test_application_profile_is_always_draft_and_omits_empty_values():
    profile = _application_profile({
        "short_description": "Проверено описание",
        "patient_intro": "",
        "treatment_focus": [],
        "google_url": "https://example.com/google",
    })

    assert profile["profile_status"] == "draft"
    assert profile["short_description"] == "Проверено описание"
    assert profile["review_sources"] == {
        "google_url": "https://example.com/google",
    }
    assert "patient_intro" not in profile
    assert "treatment_focus" not in profile


def test_claimed_official_provider_stays_pending_until_admin_verifies():
    rows = _application_aligner_brands({
        "aligner_brands": ["invisalign", "spark", "not-a-real-brand"],
        "claimed_official_provider_brands": ["invisalign"],
    })

    by_brand = {row["brand"]: row for row in rows}
    assert set(by_brand) == {"invisalign", "spark"}
    assert by_brand["invisalign"]["relationship"] == "official_provider"
    assert by_brand["invisalign"]["verification_status"] == "pending_verification"
    assert by_brand["spark"]["relationship"] == "offered"
    assert by_brand["spark"]["verification_status"] == "unverified"


def test_private_intake_token_hash_is_deterministic_without_storing_token():
    token = "private-token-with-enough-entropy-for-a-link"
    hashed = _hash_intake_token(token)

    assert hashed == _hash_intake_token(token)
    assert hashed != token
    assert len(hashed) == 64


def test_private_intake_expiry_uses_timezone_aware_timestamp():
    now = datetime.now(timezone.utc)
    assert _invite_expired({"expires_at": (now - timedelta(seconds=1)).isoformat()}, now)
    assert not _invite_expired({"expires_at": (now + timedelta(days=1)).isoformat()}, now)
