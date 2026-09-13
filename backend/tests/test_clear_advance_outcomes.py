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
from schemas import ClearAdvanceStatusMappings  # noqa: E402

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


class OutboxCursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, *_args):
        return self

    async def to_list(self, _limit):
        return list(self.docs)


class OutboxCollection(FakeCollection):
    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return doc
        return None

    async def update_one(self, query, update, upsert=False):
        existing = await self.find_one(query)
        if not existing and upsert:
            self.docs.append(dict(update.get("$setOnInsert") or {}))
            return
        self.updates.append((query, update))
        if existing:
            existing.update(update.get("$set") or {})
            for key, value in (update.get("$inc") or {}).items():
                existing[key] = int(existing.get(key) or 0) + value

    def find(self, query, projection=None):
        return OutboxCursor(self.docs)


class FakeDB:
    def __init__(self, leads):
        self.leads = FakeCollection(leads)
        self.clinic_integrations = FakeCollection([{
            "clinic_id": "clinic-a",
            "provider": "clear_advance",
            "api_key": Fernet(SECRET.encode()).encrypt(b"ca_sk_key").decode(),
        }])


class OutboxDB(FakeDB):
    def __init__(self, leads):
        super().__init__(leads)
        self.clear_advance_outbox = OutboxCollection()


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


def test_outbox_makes_repeated_hooks_single_delivery(monkeypatch):
    sent = []

    async def fake_post(path, key, payload):
        sent.append(payload)
        return {"ok": True}

    monkeypatch.setattr(clear_advance, "_post", fake_post)
    db = OutboxDB([LEAD])
    assert asyncio.run(clear_advance.report_consultation_action(db, "L1", "book_consultation"))
    assert asyncio.run(clear_advance.report_consultation_action(db, "L1", "book_consultation"))
    assert len(sent) == 1
    assert db.clear_advance_outbox.docs[0]["status"] == "succeeded"
    assert db.clear_advance_outbox.docs[0]["event_id"] == "L1:appointment_booked"


def test_deferred_delivery_is_durable_before_any_network_call(monkeypatch):
    async def must_not_post(*_args, **_kwargs):
        raise AssertionError("delivery must be deferred until after the outbox insert")

    monkeypatch.setattr(clear_advance, "_post", must_not_post)
    db = OutboxDB([LEAD])
    assert asyncio.run(clear_advance.report_status(
        db, LEAD, "SCHEDULED", deliver=False))
    assert db.clear_advance_outbox.docs[0]["status"] == "pending"


def test_undeliverable_outbox_event_is_deferred_instead_of_hot_looping():
    event = {
        "event_id": "missing:appointment_booked",
        "clinic_id": "clinic-a",
        "lead_id": "missing",
        "outcome": "appointment_booked",
        "payload": {},
        "status": "pending",
        "attempts": 0,
    }
    db = OutboxDB([])
    db.clear_advance_outbox.docs.append(event)
    result = asyncio.run(clear_advance.process_pending_outcomes(db))
    assert result == {"processed": 1, "succeeded": 0, "failed": 1}
    assert event["status"] == "failed"
    assert event["attempts"] == 1
    assert event["last_error"] == "lead_not_found"
    assert event["next_attempt_at"] > event["last_attempt_at"]


def test_revenue_outbox_identity_is_scoped_by_clinic(monkeypatch):
    sent = []

    async def fake_post(_path, _key, payload):
        sent.append(payload)
        return {"ok": True}

    monkeypatch.setattr(clear_advance, "_post", fake_post)
    second = {**LEAD, "id": "L2", "assigned_clinic_id": "clinic-b",
              "clear_advance_lead_id": "remote-2"}
    db = OutboxDB([LEAD, second])
    db.clinic_integrations.docs.append({
        "clinic_id": "clinic-b", "provider": "clear_advance",
        "api_key": Fernet(SECRET.encode()).encrypt(b"ca_sk_other").decode(),
    })
    assert asyncio.run(clear_advance.report_revenue(db, LEAD, 1000, "EUR", "INV-1"))
    assert asyncio.run(clear_advance.report_revenue(db, second, 2000, "EUR", "INV-1"))
    assert len(db.clear_advance_outbox.docs) == 2
    assert {d["event_id"] for d in db.clear_advance_outbox.docs} == {
        "clinic-a:sale:INV-1", "clinic-b:sale:INV-1",
    }


def test_clinic_status_mapping_overrides_default(monkeypatch):
    sent = []

    async def fake_post(path, key, payload):
        sent.append(payload)
        return {"ok": True}

    monkeypatch.setattr(clear_advance, "_post", fake_post)
    db = FakeDB([LEAD])
    db.clinic_integrations.docs[0]["status_mappings"] = {
        "CONTACTED": "appointment_booked",
    }
    assert asyncio.run(clear_advance.report_status(db, LEAD, "CONTACTED"))
    assert sent[0]["outcome"] == "appointment_booked"


def test_confirmed_attendance_uses_the_clinics_mapping(monkeypatch):
    sent = []

    async def fake_post(_path, _key, payload):
        sent.append(payload)
        return {"ok": True}

    monkeypatch.setattr(clear_advance, "_post", fake_post)
    db = FakeDB([LEAD])
    db.clinic_integrations.docs[0]["status_mappings"] = {"ATTENDED": None}
    assert not asyncio.run(clear_advance.report_consultation_action(
        db, "L1", "mark_attended"))
    assert sent == []


def test_legacy_completed_mapping_cannot_claim_an_attendance(monkeypatch):
    async def must_not_post(*_args, **_kwargs):
        raise AssertionError("COMPLETED is not proof that the patient attended")

    monkeypatch.setattr(clear_advance, "_post", must_not_post)
    db = FakeDB([LEAD])
    db.clinic_integrations.docs[0]["status_mappings"] = {
        "COMPLETED": "appointment_attended",
    }
    assert not asyncio.run(clear_advance.report_status(db, LEAD, "COMPLETED"))


def test_status_mapping_schema_normalizes_and_rejects_unknown_outcomes():
    parsed = ClearAdvanceStatusMappings(mappings={" scheduled ": "appointment_booked", "COMPLETED": None})
    assert parsed.mappings == {"SCHEDULED": "appointment_booked", "COMPLETED": None}
    with pytest.raises(ValueError):
        ClearAdvanceStatusMappings(mappings={"NEW": "not_a_clear_advance_outcome"})
    with pytest.raises(ValueError):
        ClearAdvanceStatusMappings(mappings={"COMPLETED": "appointment_attended"})
