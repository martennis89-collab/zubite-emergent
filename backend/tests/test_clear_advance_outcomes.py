"""What actually reaches Clear Advance when a clinic records a visit.

The mapping tests next door prove the table is right. These prove the path is:
that a consultation resolves to its lead, that the lead's clinic is the one
billed for the conversion, and above all that a no-show produces no request at
all rather than a request Clear Advance has to reject.
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
    def __init__(self, leads):
        self.leads = FakeCollection(leads)
        self.clinic_integrations = FakeCollection([{
            "clinic_id": "clinic-a",
            "provider": "clear_advance",
            "api_key": Fernet(SECRET.encode()).encrypt(b"ca_sk_key").decode(),
        }])


LEAD = {
    "id": "L1",
    "assigned_clinic_id": "clinic-a",
    "consent": True,
    "clear_advance_lead_id": "remote-1",
}


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("CLEAR_ADVANCE_KEY_SECRET", SECRET)
    monkeypatch.setenv("CLEAR_ADVANCE_API_URL", "https://example.invalid")


def run(db, lead_id, action):
    """Run the hook with the network replaced. Returns the payloads sent."""
    sent = []

    async def fake_post(path, key, payload):
        sent.append({"path": path, **payload})
        return {"ok": True}

    original = clear_advance._post
    clear_advance._post = fake_post
    try:
        asyncio.run(clear_advance.report_consultation_action(db, lead_id, action))
    finally:
        clear_advance._post = original
    return sent


def test_marking_a_patient_attended_reports_an_attendance():
    sent = run(FakeDB([LEAD]), "L1", "mark_attended")
    assert len(sent) == 1
    assert sent[0]["outcome"] == "appointment_attended"
    assert sent[0]["lead_reference"] == "remote-1"
    assert sent[0]["path"] == "/api/v1/outcomes"


def test_booking_a_consultation_reports_a_booking():
    sent = run(FakeDB([LEAD]), "L1", "book_consultation")
    assert [s["outcome"] for s in sent] == ["appointment_booked"]


def test_a_no_show_sends_nothing_at_all():
    """Not "sends something Clear Advance rejects" -- sends nothing.

    A patient who did not turn up must never reach an ad platform as an
    attendance, and the cheapest guarantee of that is never building the
    request.
    """
    assert run(FakeDB([LEAD]), "L1", "mark_no_show") == []


def test_the_other_clinic_actions_are_internal_workflow():
    db = FakeDB([LEAD])
    for action in ("mark_viewed", "call_attempted", "patient_contacted",
                   "no_answer", "reschedule", "patient_declined",
                   "not_suitable", "cancel", "admin_note"):
        assert run(db, "L1", action) == [], action


def test_a_consultation_pointing_at_a_missing_lead_reports_nothing():
    assert run(FakeDB([]), "L-gone", "mark_attended") == []


def test_a_consultation_on_an_unconnected_clinics_lead_reports_nothing():
    lead = {**LEAD, "assigned_clinic_id": "clinic-unknown"}
    assert run(FakeDB([lead]), "L1", "mark_attended") == []


def test_the_same_booking_from_both_paths_collapses_into_one_event():
    """An admin setting "Записан" and the clinic booking the consultation are
    one appointment seen twice. Keying the event id on the lead rather than on
    whatever triggered it is what stops that being two conversions."""
    db = FakeDB([LEAD])
    from_consultation = run(db, "L1", "book_consultation")[0]

    sent = []

    async def fake_post(path, key, payload):
        sent.append(payload)
        return {"ok": True}

    original = clear_advance._post
    clear_advance._post = fake_post
    try:
        asyncio.run(clear_advance.report_status(db, LEAD, "SCHEDULED"))
    finally:
        clear_advance._post = original

    assert sent[0]["source_event_id"] == from_consultation["source_event_id"]
    assert sent[0]["source_event_id"] == "L1:appointment_booked"


def test_outcome_handoff_retries_then_records_success_health(monkeypatch):
    attempts = []

    async def fake_post(path, key, payload):
        attempts.append(payload["outcome"])
        return {"ok": True} if len(attempts) == 3 else None

    async def no_sleep(_delay):
        return None

    monkeypatch.setattr(clear_advance, "_post", fake_post)
    monkeypatch.setattr(clear_advance.asyncio, "sleep", no_sleep)
    db = FakeDB([LEAD])
    assert asyncio.run(clear_advance.report_consultation_action(db, "L1", "book_consultation"))
    assert len(attempts) == 3
    assert db.clinic_integrations.updates[-1][1]["$set"]["clear_advance_last_sync_ok"] is True


def test_failed_outcome_handoff_records_a_failure_streak(monkeypatch):
    attempts = []

    async def fake_post(path, key, payload):
        attempts.append(payload["outcome"])
        return None

    async def no_sleep(_delay):
        return None

    monkeypatch.setattr(clear_advance, "_post", fake_post)
    monkeypatch.setattr(clear_advance.asyncio, "sleep", no_sleep)
    db = FakeDB([LEAD])
    assert not asyncio.run(clear_advance.report_consultation_action(db, "L1", "book_consultation"))
    assert len(attempts) == 1 + len(clear_advance.OUTCOME_RETRY_DELAYS)
    assert db.clinic_integrations.updates[-1][1]["$inc"]["clear_advance_sync_failure_streak"] == 1
