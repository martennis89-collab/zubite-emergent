"""What the background sweep picks up, and what it deliberately leaves alone.

The sweep exists because assignment happens in a dozen places and reporting has
to follow assignment, not creation. Its query is therefore the whole design, and
these tests exercise that query rather than mocking it away: the fake collection
below evaluates the same Mongo operators the sweep sends to the real one.

The case worth the most attention is the backlog guard. A clinic joining Zubite
with two years of leads must not have all of them reported as fresh enquiries the
moment it connects.
"""
import asyncio
import os
import sys

import pytest
from cryptography.fernet import Fernet

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import clear_advance  # noqa: E402

SECRET = Fernet.generate_key().decode()
CONNECTED_AT = "2026-09-01T00:00:00+00:00"


def _matches(doc, query):
    """Enough of Mongo's matcher to make these tests mean something."""
    for field, condition in query.items():
        value = doc.get(field)
        if not isinstance(condition, dict):
            if value != condition:
                return False
            continue
        for op, operand in condition.items():
            if op == "$exists":
                if (field in doc) != operand:
                    return False
            elif op == "$gte":
                if value is None or value < operand:
                    return False
            elif op == "$not":
                if _matches(doc, {field: operand}):
                    return False
            else:  # a new operator in the sweep must not silently pass here
                raise AssertionError(f"unsupported operator {op}")
    return True


class FakeCursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, field, direction):
        self.docs = sorted(self.docs, key=lambda d: d.get(field) or "",
                           reverse=direction < 0)
        return self

    async def to_list(self, limit):
        return self.docs[:limit] if limit else list(self.docs)


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = docs or []
        self.updates = []

    def find(self, query, projection=None):
        return FakeCursor([d for d in self.docs if _matches(d, query)])

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if _matches(doc, query):
                return doc
        return None

    async def update_one(self, query, update, upsert=False):
        self.updates.append((query, update))


class FakeDB:
    def __init__(self, integrations, leads):
        self.clinic_integrations = FakeCollection(integrations)
        self.leads = FakeCollection(leads)


def integration(clinic_id, connected_at=CONNECTED_AT):
    record = {
        "clinic_id": clinic_id,
        "provider": "clear_advance",
        "api_key": Fernet(SECRET.encode()).encrypt(b"ca_sk_key").decode(),
    }
    if connected_at is not None:
        record["connected_at"] = connected_at
    return record


def lead(lead_id, created_at, clinic_id="clinic-a", **extra):
    return {"id": lead_id, "assigned_clinic_id": clinic_id,
            "created_at": created_at, "consent": True, **extra}


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("CLEAR_ADVANCE_KEY_SECRET", SECRET)
    monkeypatch.setenv("CLEAR_ADVANCE_API_URL", "https://example.invalid")
    monkeypatch.setattr(clear_advance.asyncio, "sleep", _no_sleep)


async def _no_sleep(_seconds):
    return None


def sweep(db, accept=True):
    """Run the sweep with the network replaced. Returns the lead ids it sent."""
    sent = []

    async def fake_post(path, key, payload):
        sent.append(payload["source_lead_id"])
        return {"lead_id": f"remote-{payload['source_lead_id']}"} if accept else None

    original = clear_advance._post
    clear_advance._post = fake_post
    try:
        asyncio.run(clear_advance.report_pending_leads(db))
    finally:
        clear_advance._post = original
    return sent


def test_a_lead_assigned_after_connecting_is_reported():
    db = FakeDB([integration("clinic-a")], [lead("L1", "2026-09-05T10:00:00+00:00")])
    assert sweep(db) == ["L1"]


def test_the_clinics_own_history_is_not_reported_as_new_enquiries():
    """The backlog guard.

    Everything before the connection belongs to the clinic's past. None of it is
    attributable -- Meta's window is seven days -- and reporting it would fill a
    fresh Clear Advance account with leads dated today that arrived years ago.
    """
    db = FakeDB([integration("clinic-a")], [
        lead("old", "2024-03-01T10:00:00+00:00"),
        lead("new", "2026-09-05T10:00:00+00:00"),
    ])
    assert sweep(db) == ["new"]


def test_a_lead_already_reported_is_not_reported_twice():
    db = FakeDB([integration("clinic-a")], [
        lead("L1", "2026-09-05T10:00:00+00:00", clear_advance_lead_id="remote-1"),
    ])
    assert sweep(db) == []


def test_a_lead_that_keeps_being_rejected_is_eventually_left_alone():
    """Otherwise one unusable lead is retried every ten minutes forever."""
    db = FakeDB([integration("clinic-a")], [
        lead("tried", "2026-09-05T10:00:00+00:00",
             clear_advance_attempts=clear_advance.MAX_REPORT_ATTEMPTS),
        lead("trying", "2026-09-05T11:00:00+00:00", clear_advance_attempts=1),
    ])
    assert sweep(db) == ["trying"]


def test_a_rejection_is_counted_so_the_sweep_can_give_up():
    db = FakeDB([integration("clinic-a")], [lead("L1", "2026-09-05T10:00:00+00:00")])
    sweep(db, accept=False)
    assert ({"id": "L1"}, {"$inc": {"clear_advance_attempts": 1}}) in db.leads.updates


def test_each_clinic_only_receives_its_own_leads():
    db = FakeDB(
        [integration("clinic-a"), integration("clinic-b")],
        [lead("a1", "2026-09-05T10:00:00+00:00", clinic_id="clinic-a"),
         lead("b1", "2026-09-05T10:00:00+00:00", clinic_id="clinic-b")],
    )
    assert sorted(sweep(db)) == ["a1", "b1"]


def test_an_unconnected_clinics_leads_are_left_where_they_are():
    db = FakeDB([integration("clinic-a")], [
        lead("a1", "2026-09-05T10:00:00+00:00", clinic_id="clinic-a"),
        lead("z1", "2026-09-05T10:00:00+00:00", clinic_id="clinic-z"),
    ])
    assert sweep(db) == ["a1"]


def test_an_integration_without_a_connection_date_reports_nothing():
    """A record predating the connected_at field has no backlog boundary.

    Skipping it is the safe reading: reconnecting the clinic sets the date and
    starts reporting from then, which is what an admin would expect anyway.
    """
    db = FakeDB([integration("clinic-a", connected_at=None)],
                [lead("L1", "2026-09-05T10:00:00+00:00")])
    assert sweep(db) == []


def test_nothing_is_reported_when_the_platform_url_is_unset(monkeypatch):
    monkeypatch.delenv("CLEAR_ADVANCE_API_URL")
    db = FakeDB([integration("clinic-a")], [lead("L1", "2026-09-05T10:00:00+00:00")])
    assert sweep(db) == []


def test_a_lead_without_consent_never_leaves_the_building():
    """Filtered here, not by Clear Advance rejecting it.

    A rejection would still mean the patient's name and phone number crossed the
    wire first, for someone who never agreed to it.
    """
    db = FakeDB([integration("clinic-a")], [
        lead("yes", "2026-09-05T10:00:00+00:00"),
        lead("no", "2026-09-05T11:00:00+00:00", consent=False),
    ])
    assert sweep(db) == ["yes"]
