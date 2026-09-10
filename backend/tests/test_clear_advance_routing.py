"""Which clinic a lead is reported to, and whether it is reported at all.

Zubite serves many clinics and a Clear Advance API key identifies exactly one, so
a routing mistake here does not merely lose data -- it puts one clinic's patient
into another clinic's advertising account. These tests exist for that one risk.
"""
import asyncio
import os
import sys

import pytest
from cryptography.fernet import Fernet

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import clear_advance  # noqa: E402

SECRET = Fernet.generate_key().decode()


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = docs or []
        self.updates = []

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return doc
        return None

    async def update_one(self, query, update, upsert=False):
        self.updates.append((query, update))


class FakeDB:
    def __init__(self, integrations=None):
        self.clinic_integrations = FakeCollection(integrations)
        self.leads = FakeCollection()
        self.clinics = FakeCollection()


def connected(clinic_id, key="ca_sk_realkey"):
    return {
        "clinic_id": clinic_id,
        "provider": "clear_advance",
        "api_key": Fernet(SECRET.encode()).encrypt(key.encode()).decode(),
    }


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("CLEAR_ADVANCE_KEY_SECRET", SECRET)
    monkeypatch.setenv("CLEAR_ADVANCE_API_URL", "https://example.invalid")


def resolve(db, lead):
    return asyncio.run(clear_advance._clinic_key(db, lead))


def test_a_lead_is_routed_to_its_own_clinics_key():
    db = FakeDB([connected("clinic-a", "ca_sk_aaa"), connected("clinic-b", "ca_sk_bbb")])
    assert resolve(db, {"id": "L1", "assigned_clinic_id": "clinic-a"}) == "ca_sk_aaa"
    assert resolve(db, {"id": "L2", "assigned_clinic_id": "clinic-b"}) == "ca_sk_bbb"


def test_an_unassigned_lead_is_reported_to_nobody():
    """The failure mode this whole design exists to prevent.

    An unassigned lead has no owner, so there is no correct destination. Sending
    it anywhere would put a patient in a clinic they never contacted.
    """
    db = FakeDB([connected("clinic-a")])
    assert resolve(db, {"id": "L3", "assigned_clinic_id": None}) is None
    assert resolve(db, {"id": "L4"}) is None


def test_a_clinic_without_a_key_is_simply_not_connected():
    db = FakeDB([connected("clinic-a")])
    assert resolve(db, {"id": "L5", "assigned_clinic_id": "clinic-unknown"}) is None


def test_there_is_no_environment_wide_fallback_key(monkeypatch):
    """A convenient default would eventually misroute a patient.

    Setting the old single-key variable must not resurrect that behaviour.
    """
    monkeypatch.setenv("CLEAR_ADVANCE_API_KEY", "ca_sk_default")
    db = FakeDB([])
    assert resolve(db, {"id": "L6", "assigned_clinic_id": "clinic-a"}) is None
    assert resolve(db, {"id": "L7", "assigned_clinic_id": None}) is None


def test_a_rotated_secret_fails_closed_rather_than_sending_a_wrong_key(monkeypatch):
    db = FakeDB([connected("clinic-a")])
    monkeypatch.setenv("CLEAR_ADVANCE_KEY_SECRET", Fernet.generate_key().decode())
    assert resolve(db, {"id": "L8", "assigned_clinic_id": "clinic-a"}) is None


def test_the_stored_key_is_not_readable_without_the_secret():
    record = connected("clinic-a", "ca_sk_secretvalue")
    assert "ca_sk_secretvalue" not in record["api_key"]


def test_mapped_statuses_are_ones_zubite_can_actually_produce():
    """The first version of this map keyed on statuses that do not exist.

    LEAD_STATUS_ALLOWED is NEW / CONTACTED / SCHEDULED / COMPLETED / CANCELLED,
    and the PATCH endpoint rejects anything else with a 422. A map keyed on
    "BOOKED" and "ATTENDED" could therefore never match a real lead, so nothing
    was ever reported and nothing ever failed loudly enough to notice.
    """
    allowed = {"NEW", "CONTACTED", "SCHEDULED", "COMPLETED", "CANCELLED"}
    assert set(clear_advance.STATUS_OUTCOMES) <= allowed
    assert clear_advance.STATUS_OUTCOMES["SCHEDULED"] == "appointment_booked"


def test_completed_is_not_reported_as_attendance():
    """"Завършен" closes a lead out, including after a no-show."""
    assert "COMPLETED" not in clear_advance.STATUS_OUTCOMES
    for internal in ("NEW", "CONTACTED", "CANCELLED"):
        assert internal not in clear_advance.STATUS_OUTCOMES


def test_a_no_show_is_never_an_attendance():
    """The reason attendance is taken from the consultation at all.

    Reporting a no-show as attendance would teach Meta to buy more of exactly
    the patients who never turn up.
    """
    assert clear_advance.CONSULTATION_OUTCOMES["mark_attended"] == "appointment_attended"
    assert clear_advance.CONSULTATION_OUTCOMES["book_consultation"] == "appointment_booked"
    assert "mark_no_show" not in clear_advance.CONSULTATION_OUTCOMES
    for other in ("cancel", "patient_declined", "not_suitable", "no_answer"):
        assert other not in clear_advance.CONSULTATION_OUTCOMES


def test_revenue_refuses_an_unusable_amount():
    db = FakeDB([connected("clinic-a")])
    lead = {"id": "L9", "assigned_clinic_id": "clinic-a", "clear_advance_lead_id": "remote"}
    for bad in (0, -1, 12.5, "4000"):
        assert asyncio.run(clear_advance.report_revenue(db, lead, bad, "EUR", "inv-1")) is False
