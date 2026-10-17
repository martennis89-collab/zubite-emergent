"""The /clinics card shows "City, neighbourhood" so patients can judge distance.

The frontend has always rendered `area` next to the city, but the public
payload only passed a raw `area` field nothing ever wrote — the Sofia
`district_slug` chosen on the application or in the admin editor was never
shown. `clinic_area` resolves it.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import routers.public as public  # noqa: E402
import routers.public_clinics as public_clinics  # noqa: E402
from schemas import ClinicAdminUpdate  # noqa: E402


@pytest.mark.parametrize("clinic,expected", [
    ({"district_slug": "lozenets"}, "Лозенец"),
    ({"district_slug": "studentski-grad"}, "Студентски град"),
    ({"area": "Кършияка", "city": "Пловдив"}, "Кършияка"),
    # An admin-typed area overrides the district label.
    ({"area": "  Лозенец (до Южния парк) ", "district_slug": "lozenets"}, "Лозенец (до Южния парк)"),
    ({"area": "", "district_slug": "mladost"}, "Младост"),
    ({"district_slug": "not-a-district"}, None),
    ({}, None),
])
def test_clinic_area_resolution(clinic, expected):
    assert public_clinics.clinic_area(clinic) == expected


def test_directory_payload_carries_the_neighbourhood():
    clinic = {"id": "c1", "clinic_name": "Клиника", "city": "София", "city_slug": "sofia",
              "district_slug": "izgrev"}
    payload = public_clinics._public_clinic_payload(clinic, set())
    assert payload["city_slug"] == "sofia"
    assert payload["area"] == "Изгрев"


def test_recommendation_payload_carries_the_neighbourhood():
    clinic = {"id": "c1", "clinic_name": "Клиника", "city": "София", "city_slug": "sofia",
              "district_slug": "lyulin", "treatments_supported": ["orthodontics"]}
    payload = public._safe_clinic_payload(clinic, "orthodontics", False, lead_district="lyulin")
    assert payload["area"] == "Люлин"
    assert payload["same_district"] is True


def test_admin_can_set_and_clear_the_free_text_area():
    assert ClinicAdminUpdate(area="Кършияка").model_dump()["area"] == "Кършияка"
    # "" survives the None-filter in admin_update_clinic, so it clears the field.
    assert ClinicAdminUpdate(area="").model_dump()["area"] == ""
    assert ClinicAdminUpdate().model_dump()["area"] is None
