"""Regression coverage for clinic longevity and clinician spotlight trust."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from routers.public_clinics import _public_clinic_payload
from schemas import ClinicProfile


CURRENT_YEAR = datetime.now(timezone.utc).year


def _clinic(base_package: str) -> dict:
    return {
        "id": f"trust-{base_package}",
        "name": "Clinic trust test",
        "city_slug": "sofia",
        "city_name": "София",
        "base_package": base_package,
        "partner_tier": "standard",
        "treatments_supported": ["invisalign"],
        "clinic_profile": {
            "profile_status": "published",
            "founded_year": 2012,
            "doctor_spotlight_image_url": "https://example.com/doctor.jpg",
            "doctor_spotlight_name": "д-р Ирина Ковачева",
            "doctor_spotlight_kind": "owner",
            "doctor_spotlight_role": "Ортодонт",
            "doctor_spotlight_specialties": [
                "Алайнерно лечение",
                "Ортодонтия за възрастни",
            ],
            "doctor_spotlight_bio": "15 години опит в ортодонтията.",
        },
    }


def test_profile_schema_accepts_structured_trust_signals() -> None:
    profile = ClinicProfile.model_validate(_clinic("growth_partner")["clinic_profile"])
    assert profile.founded_year == 2012
    assert profile.doctor_spotlight_kind == "owner"
    assert profile.doctor_spotlight_specialties == [
        "Алайнерно лечение",
        "Ортодонтия за възрастни",
    ]


@pytest.mark.parametrize("founded_year", [1899, CURRENT_YEAR + 1])
def test_profile_schema_rejects_invalid_founding_year(founded_year: int) -> None:
    with pytest.raises(ValidationError):
        ClinicProfile.model_validate({"founded_year": founded_year})


def test_profile_schema_rejects_unknown_spotlight_kind() -> None:
    with pytest.raises(ValidationError):
        ClinicProfile.model_validate({"doctor_spotlight_kind": "manager"})


def test_growth_payload_derives_longevity_and_exposes_clinician() -> None:
    payload = _public_clinic_payload(_clinic("growth_partner"))
    assert payload["founded_year"] == 2012
    assert payload["years_in_business"] == CURRENT_YEAR - 2012
    assert payload["doctor_spotlight_image_url"] == "https://example.com/doctor.jpg"
    assert payload["doctor_spotlight"] == {
        "name": "д-р Ирина Ковачева",
        "kind": "owner",
        "role": "Ортодонт",
        "specialties": ["Алайнерно лечение", "Ортодонтия за възрастни"],
        "bio": "15 години опит в ортодонтията.",
    }


def test_verified_payload_withholds_growth_trust_modules() -> None:
    payload = _public_clinic_payload(_clinic("verified_profile"))
    assert payload["founded_year"] is None
    assert payload["years_in_business"] is None
    assert payload["doctor_spotlight_image_url"] is None
    assert payload["doctor_spotlight"] is None

