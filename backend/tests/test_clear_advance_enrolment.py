"""Every clinic created on Zubite is enrolled in Clear Advance automatically.

What these tests guard is mostly what enrolment must NOT do: touch a clinic
that existed before the feature shipped, overwrite a connection an admin made
by hand, burn its retries while the environment is unconfigured, or let two
workers mint competing keys for one clinic -- the second key revokes the first
in Clear Advance, so the clinic would be left holding a dead credential.
"""
import asyncio
import os
import sys

import pytest
from cryptography.fernet import Fernet

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import clear_advance  # noqa: E402

SECRET = Fernet.generate_key().decode()
PARTNER_KEY = "ca_pk_" + "p" * 43
ISSUED_KEY = "ca_sk_" + "k" * 39 + "wxyz"


class DuplicateKey(Exception):
    code = 11000


def _matches(doc, query):
    for field, cond in query.items():
        if field == "$or":
            if not any(_matches(doc, q) for q in cond):
                return False
            continue
        value = doc.get(field)
        if isinstance(cond, dict) and any(k.startswith("$") for k in cond):
            for op, operand in cond.items():
                if op == "$exists":
                    if (field in doc) != operand:
                        return False
                elif op == "$lte":
                    if value is None or value > operand:
                        return False
                else:
                    raise AssertionError(f"unsupported operator {op}")
        elif value != cond:
            return False
    return True


class Result:
    def __init__(self, matched, modified):
        self.matched_count = matched
        self.modified_count = modified


class Cursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, *_args):
        return self

    async def to_list(self, limit):
        return self.docs[:limit] if limit else list(self.docs)


class Collection:
    def __init__(self, docs=None, unique=None):
        self.docs = [dict(d) for d in (docs or [])]
        self.unique = unique

    async def find_one(self, query, projection=None):
        return next((dict(d) for d in self.docs if _matches(d, query)), None)

    def find(self, query, projection=None):
        return Cursor([dict(d) for d in self.docs if _matches(d, query)])

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if _matches(doc, query):
                before = dict(doc)
                doc.update(update.get("$set", {}))
                for key in update.get("$unset", {}):
                    doc.pop(key, None)
                return Result(1, int(doc != before))
        if not upsert:
            return Result(0, 0)
        new = {k: v for k, v in query.items() if not k.startswith("$") and not isinstance(v, dict)}
        new.update(update.get("$setOnInsert", {}))
        new.update(update.get("$set", {}))
        if self.unique and any(all(d.get(f) == new.get(f) for f in self.unique) for d in self.docs):
            raise DuplicateKey("E11000 duplicate key")
        self.docs.append(new)
        return Result(0, 1)


class FakeDB:
    def __init__(self, clinics=(), integrations=()):
        self.clinics = Collection(clinics)
        self.clinic_integrations = Collection(integrations, unique=("clinic_id", "provider"))
        self.clear_advance_enrolments = Collection(unique=("clinic_id",))


CLINIC = {"id": "clinic-1", "clinic_name": "Дентален център Астра"}


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("CLEAR_ADVANCE_KEY_SECRET", SECRET)
    monkeypatch.setenv("CLEAR_ADVANCE_API_URL", "https://example.invalid")
    monkeypatch.setenv("CLEAR_ADVANCE_PARTNER_KEY", PARTNER_KEY)


@pytest.fixture
def calls(monkeypatch):
    sent = []

    async def fake_post(path, key, payload):
        sent.append({"path": path, "key": key, **payload})
        await asyncio.sleep(0)  # yield, so concurrent workers genuinely interleave
        return {"ok": True, "created": True, "api_key": ISSUED_KEY,
                "organization": {"id": "org-1", "slug": "zubite-dentalen-tsentar-astra-abc123"}}

    monkeypatch.setattr(clear_advance, "_post", fake_post)
    return sent


def run(coro):
    return asyncio.run(coro)


def test_a_new_clinic_is_queued_and_a_demo_clinic_is_not():
    db = FakeDB()
    assert run(clear_advance.queue_clinic_enrolment(db, CLINIC)) is True
    assert run(clear_advance.queue_clinic_enrolment(db, {"id": "demo", "is_demo": True})) is False
    assert [d["clinic_id"] for d in db.clear_advance_enrolments.docs] == ["clinic-1"]
    assert db.clear_advance_enrolments.docs[0]["status"] == "pending"


def test_queueing_twice_does_not_reset_progress():
    db = FakeDB()
    run(clear_advance.queue_clinic_enrolment(db, CLINIC))
    db.clear_advance_enrolments.docs[0]["attempts"] = 3
    run(clear_advance.queue_clinic_enrolment(db, CLINIC))
    assert len(db.clear_advance_enrolments.docs) == 1
    assert db.clear_advance_enrolments.docs[0]["attempts"] == 3


def test_enrolment_connects_the_clinic_with_an_encrypted_key(calls):
    db = FakeDB(clinics=[CLINIC])
    run(clear_advance.queue_clinic_enrolment(db, CLINIC))
    assert run(clear_advance.enrol_clinic(db, "clinic-1")) is True

    assert calls[0]["path"] == "/api/v1/partner/organizations"
    assert calls[0]["key"] == PARTNER_KEY
    assert (calls[0]["external_ref"], calls[0]["name"]) == ("clinic-1", "Дентален център Астра")

    integration = db.clinic_integrations.docs[0]
    assert integration["api_key"] != ISSUED_KEY
    assert Fernet(SECRET.encode()).decrypt(integration["api_key"].encode()).decode() == ISSUED_KEY
    assert integration["key_hint"] == "...wxyz"
    assert integration["connected_at"]
    assert integration["provisioned_by"] == "auto"
    assert integration["clear_advance_org_slug"] == "zubite-dentalen-tsentar-astra-abc123"

    enrolment = db.clear_advance_enrolments.docs[0]
    assert enrolment["status"] == "done"
    assert "claimed_until" not in enrolment


def test_a_clinic_that_existed_before_this_shipped_is_never_enrolled(calls):
    """Only clinics created after deploy carry a marker; nothing else is swept."""
    db = FakeDB(clinics=[CLINIC, {"id": "old-clinic", "clinic_name": "Old"}])
    assert run(clear_advance.process_pending_enrolments(db)) == 0
    assert calls == []
    assert db.clinic_integrations.docs == []


def test_a_connection_made_by_hand_is_never_overwritten(calls):
    manual = {"clinic_id": "clinic-1", "provider": "clear_advance",
              "api_key": "manual-encrypted", "connected_at": "2026-09-10T00:00:00+00:00"}
    db = FakeDB(clinics=[CLINIC], integrations=[manual])
    run(clear_advance.queue_clinic_enrolment(db, CLINIC))
    assert run(clear_advance.enrol_clinic(db, "clinic-1")) is True

    assert calls == []
    assert db.clinic_integrations.docs == [manual]
    assert db.clear_advance_enrolments.docs[0]["status"] == "done"


def test_a_manual_connection_landing_mid_enrolment_still_wins(monkeypatch):
    db = FakeDB(clinics=[CLINIC])
    manual = {"clinic_id": "clinic-1", "provider": "clear_advance", "api_key": "manual-encrypted"}

    async def racing_post(path, key, payload):
        db.clinic_integrations.docs.append(dict(manual))
        return {"ok": True, "api_key": ISSUED_KEY, "organization": {"id": "org-1", "slug": "s"}}

    monkeypatch.setattr(clear_advance, "_post", racing_post)
    run(clear_advance.queue_clinic_enrolment(db, CLINIC))
    assert run(clear_advance.enrol_clinic(db, "clinic-1")) is True
    assert db.clinic_integrations.docs == [manual]
    assert db.clear_advance_enrolments.docs[0]["status"] == "done"


def test_an_unconfigured_environment_waits_without_burning_attempts(calls, monkeypatch):
    monkeypatch.delenv("CLEAR_ADVANCE_PARTNER_KEY")
    db = FakeDB(clinics=[CLINIC])
    run(clear_advance.queue_clinic_enrolment(db, CLINIC))

    assert run(clear_advance.enrol_clinic(db, "clinic-1")) is False
    assert run(clear_advance.process_pending_enrolments(db)) == 0
    assert calls == []
    enrolment = db.clear_advance_enrolments.docs[0]
    assert enrolment["status"] == "pending"
    assert enrolment["attempts"] == 0
    assert enrolment["last_error"] == "not_configured"


def test_a_failing_request_backs_off_and_eventually_gives_up(monkeypatch):
    async def failing_post(path, key, payload):
        return None

    monkeypatch.setattr(clear_advance, "_post", failing_post)
    db = FakeDB(clinics=[CLINIC])
    run(clear_advance.queue_clinic_enrolment(db, CLINIC))

    assert run(clear_advance.enrol_clinic(db, "clinic-1")) is False
    enrolment = db.clear_advance_enrolments.docs[0]
    assert (enrolment["status"], enrolment["attempts"], enrolment["last_error"]) == ("pending", 1, "request_failed")
    assert enrolment["next_attempt_at"] > enrolment["created_at"]

    for _ in range(clear_advance.MAX_ENROLMENT_ATTEMPTS):
        db.clear_advance_enrolments.docs[0]["next_attempt_at"] = "2000-01-01T00:00:00+00:00"
        run(clear_advance.enrol_clinic(db, "clinic-1"))
    assert db.clear_advance_enrolments.docs[0]["status"] == "failed"
    assert db.clinic_integrations.docs == []


def test_two_workers_cannot_enrol_one_clinic_twice(calls):
    """The creation hook and the sweep can overlap. A second call would revoke
    the first key in Clear Advance while Zubite stored the first one."""
    db = FakeDB(clinics=[CLINIC])
    run(clear_advance.queue_clinic_enrolment(db, CLINIC))

    async def both():
        return await asyncio.gather(
            clear_advance.enrol_clinic(db, "clinic-1"),
            clear_advance.enrol_clinic(db, "clinic-1"),
        )

    results = run(both())
    assert len(calls) == 1
    assert sorted(results) == [False, True]


def test_the_partner_key_is_never_stored(calls):
    db = FakeDB(clinics=[CLINIC])
    run(clear_advance.queue_clinic_enrolment(db, CLINIC))
    run(clear_advance.enrol_clinic(db, "clinic-1"))
    stored = repr(db.clinic_integrations.docs) + repr(db.clear_advance_enrolments.docs)
    assert PARTNER_KEY not in stored
    assert ISSUED_KEY not in stored
