"""Regression coverage for clinic focus experience signals."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from routers.public_clinics import _public_clinic_payload
from schemas import ClinicProfile


def _clinic(base_package: str) -> dict:
    return {
        "id": f"clinic-{base_package}",
        "name": "Clinic focus test",
        "city_slug": "sofia",
        "city_name": "София",
        "base_package": base_package,
        "partner_tier": "standard",
        "treatments_supported": ["invisalign", "implants"],
        "clinic_profile": {
            "profile_status": "published",
            "treatment_focus": ["Invisalign"],
            "treatment_case_counts": [
                {
                    "treatment": "Invisalign",
                    "completed_cases": 184,
                    "as_of_year": datetime.now(timezone.utc).year,
                },
            ],
        },
    }


def test_treatment_case_count_schema_accepts_honest_aggregate() -> None:
    profile = ClinicProfile.model_validate(_clinic("growth_partner")["clinic_profile"])
    assert profile.treatment_case_counts is not None
    assert profile.treatment_case_counts[0].completed_cases == 184


@pytest.mark.parametrize("completed_cases", [0, -1, 1_000_001])
def test_treatment_case_count_schema_rejects_invalid_totals(completed_cases: int) -> None:
    with pytest.raises(ValidationError):
        ClinicProfile.model_validate({
            "treatment_case_counts": [{
                "treatment": "Invisalign",
                "completed_cases": completed_cases,
            }],
        })


def test_growth_public_payload_exposes_clinic_declared_counts() -> None:
    payload = _public_clinic_payload(_clinic("growth_partner"))
    assert payload["treatment_case_counts"] == [{
        "treatment": "Invisalign",
        "completed_cases": 184,
        "as_of_year": datetime.now(timezone.utc).year,
    }]


def test_verified_public_payload_withholds_growth_counts() -> None:
    payload = _public_clinic_payload(_clinic("verified_profile"))
    assert payload["treatment_case_counts"] == []

