"""Patient layer P4 — `POST /api/leads/{lead_id}/request-call` tests.

Covers the full hard product rule: ONE lead may request a call from ONLY
ONE clinic, and the selected clinic MUST be in the recommended set.
Validates duplicate protection, consent storage, payload shape, rate
limit, and isolation across clinics.

Conventions mirror test_patient_recommended_clinics.py: in-process ASGI,
isolated test DB, no network.
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest

os.environ.setdefault("DB_NAME", "zubite_test_p4_request_call")
os.environ.setdefault("APP_ENV", "test")
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"
os.environ.setdefault("RESEND_API_KEY", "test_resend_key_no_network")
os.environ.setdefault("ADMIN_EMAIL", "admin-alerts@example.com")
os.environ["AUTH_COOKIE_SECURE"] = "0"

_db_name = os.environ.get("DB_NAME", "")
if not (_db_name.startswith("zubite_test") or _db_name.startswith("test_")):
    raise RuntimeError(f"Refusing to run: DB_NAME={_db_name!r}")
if (os.environ.get("APP_ENV") or "").lower() == "production":
    raise RuntimeError("Refusing APP_ENV=production")

_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import storage as _storage_mod  # noqa: E402

_storage_mod.init_storage = lambda: None  # type: ignore[assignment]

import resend as _resend  # noqa: E402

_resend.Emails.send = MagicMock(return_value={"id": "test-no-send"})

# Block any other external providers the app may bind on import.
# Twilio / ElevenLabs / SendGrid are not imported by /api/leads paths,
# but we assert at the test layer that no email helper is invoked.
import emails as _emails_mod  # noqa: E402

_emails_mod.send_lead_notification_email = MagicMock(return_value=None)
_emails_mod.send_lead_confirmation_email = MagicMock(return_value=None)

from httpx import ASGITransport, AsyncClient  # noqa: E402

_LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(_LOOP)


def _run(coro):
    return _LOOP.run_until_complete(coro)


@pytest.fixture(scope="module")
def app():
    import server as _server
    return _server.app


def _client(app):
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


@pytest.fixture(scope="module", autouse=True)
def _bootstrap(app):  # noqa: ARG001
    import database as _database

    async def setup():
        db = _database.db
        for coll in await db.list_collection_names():
            await db[coll].delete_many({})

    async def teardown():
        await _database.client.drop_database(os.environ["DB_NAME"])
        _database.client.close()

    _run(setup())
    yield
    _run(teardown())


@pytest.fixture(autouse=True)
def _reset_state():
    import database as _database
    import rate_limit as _rl

    async def wipe():
        db = _database.db
        await db.leads.delete_many({})
        await db.clinics.delete_many({})
        await db.consultation_requests.delete_many({})

    _rl._buckets.clear()
    _run(wipe())
    yield
    _rl._buckets.clear()


# ── helpers ──────────────────────────────────────────────────────


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_lead(*, city: str = "sofia", treatment: str = "aligners",
               name: str = "Test Patient",
               phone: str = "+359888000111",
               email: str = "patient@example.com",
               age_days: int = 0) -> str:
    import database as _database
    lead_id = str(uuid.uuid4())
    created_at = (datetime.now(timezone.utc) - timedelta(days=age_days)).isoformat()

    async def insert():
        await _database.db.leads.insert_one({
            "id": lead_id,
            "city_slug": city,
            "treatment_type": treatment,
            "answers": {"urgency": "high", "session_id": "sess-1"},
            "consent": True,
            "name": name,
            "phone": phone,
            "email": email,
            "band": "high",
            "created_at": created_at,
        })

    _run(insert())
    return lead_id


def _make_clinic(*, name: str = "Test Clinic",
                 city_slug: str = "sofia",
                 city_name: str = "София",
                 treatments_supported: list[str] | None = None,
                 active: bool = True) -> str:
    import database as _database
    cid = str(uuid.uuid4())
    doc = {
        "id": cid,
        "name": name,
        "city_slug": city_slug,
        "city_name": city_name,
        "treatments_supported": treatments_supported or ["aligners"],
        "is_active": active,
        "created_at": _now_iso(),
    }

    async def insert():
        await _database.db.clinics.insert_one(doc)

    _run(insert())
    return cid


def _post_request_call(app, lead_id: str, body: dict, **extra_headers):
    async def go():
        async with _client(app) as c:
            return await c.post(
                f"/api/leads/{lead_id}/request-call",
                json=body,
                headers=extra_headers,
            )
    r = _run(go())
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, {"_raw": r.text}


def _get_state(app, lead_id: str):
    async def go():
        async with _client(app) as c:
            return await c.get(f"/api/leads/{lead_id}/selection-state")
    r = _run(go())
    return r.status_code, r.json()


def _valid_body(clinic_id: str, source: str = "matching_card") -> dict:
    return {
        "clinic_id": clinic_id,
        "phone": "+359888000111",
        "consent_to_share": True,
        "source": source,
    }


# ─────────────── Tests ────────────────────────────────────────────


# 1. Valid lead + recommended clinic + consent creates exactly one request.
def test_01_valid_creates_one_request(app):
    import database as _database
    lead = _make_lead()
    clinic = _make_clinic()
    status, body = _post_request_call(app, lead, _valid_body(clinic))
    assert status == 200, body
    assert body["success"] is True
    assert body["clinic"]["id"] == clinic
    assert "request_id" in body and body["request_id"]
    # Exactly one consultation request exists.
    count = _run(_database.db.consultation_requests.count_documents({"lead_id": lead}))
    assert count == 1


# 2. Valid request updates lead selection fields.
def test_02_updates_lead_selection_fields(app):
    import database as _database
    lead = _make_lead()
    clinic = _make_clinic()
    _post_request_call(app, lead, _valid_body(clinic, source="clinic_profile"))
    saved = _run(_database.db.leads.find_one({"id": lead}, {"_id": 0}))
    assert saved["selected_clinic_id"] == clinic
    assert saved["selected_clinic_request_id"]
    assert saved["request_call_status"] == "requested"
    assert saved["clinic_selection_source"] == "clinic_profile"
    assert saved["consent_to_share_clinic"] is True
    assert isinstance(saved["consent_to_share_clinic_at"], str)


# 3. Consent timestamp and consent text stored on the consultation_request.
def test_03_consent_metadata_stored(app):
    import database as _database
    lead = _make_lead()
    clinic = _make_clinic()
    _post_request_call(app, lead, _valid_body(clinic))
    cr = _run(_database.db.consultation_requests.find_one({"lead_id": lead}, {"_id": 0}))
    assert cr["consent_to_share_clinic"] is True
    assert cr["consent_to_share_clinic_at"]
    assert cr["consent_to_share_clinic_text"] == (
        "Съгласен/съгласна съм Zubite да сподели заявката ми с избраната клиника."
    )
    assert cr["source"] == "patient_selected_clinic"
    assert cr["created_from"] == "recommended_clinics_flow"
    assert cr["selection_source"] in ("matching_card", "clinic_profile")
    assert cr["assigned_clinic_id"] == clinic
    assert cr["status"] == "assigned"


# 4. Second request for same lead → SAME clinic does NOT create duplicate.
def test_04_second_request_same_clinic_idempotent(app):
    import database as _database
    lead = _make_lead()
    clinic = _make_clinic()
    s1, b1 = _post_request_call(app, lead, _valid_body(clinic))
    s2, b2 = _post_request_call(app, lead, _valid_body(clinic))
    assert s1 == 200 and s2 == 200
    assert b1["request_id"] == b2["request_id"]
    assert b2.get("already_requested") is True
    count = _run(_database.db.consultation_requests.count_documents({"lead_id": lead}))
    assert count == 1


# 5. Second request for same lead → DIFFERENT clinic returns 409.
def test_05_second_request_different_clinic_409(app):
    import database as _database
    lead = _make_lead()
    clinic_a = _make_clinic(name="ClinicA")
    clinic_b = _make_clinic(name="ClinicB")
    s1, _ = _post_request_call(app, lead, _valid_body(clinic_a))
    assert s1 == 200
    s2, b2 = _post_request_call(app, lead, _valid_body(clinic_b))
    assert s2 == 409, b2
    assert b2["detail"]["code"] == "already_requested"
    assert b2["detail"]["clinic"]["id"] == clinic_a
    # Still only one consultation request.
    count = _run(_database.db.consultation_requests.count_documents({"lead_id": lead}))
    assert count == 1


# 6. Pre-existing flow consultation_request blocks duplicate creation
#    (even if lead.selected_clinic_id is somehow missing — partial write).
def test_06_existing_flow_request_blocks_creation(app):
    import database as _database
    lead = _make_lead()
    clinic = _make_clinic()
    # Pre-seed a flow request without pinning the lead.
    pre_id = str(uuid.uuid4())
    _run(_database.db.consultation_requests.insert_one({
        "id": pre_id,
        "lead_id": lead,
        "assigned_clinic_id": clinic,
        "created_from": "recommended_clinics_flow",
        "source": "patient_selected_clinic",
        "status": "assigned",
        "created_at": _now_iso(),
    }))
    # Try to POST for the SAME clinic → should be detected as idempotent.
    s, b = _post_request_call(app, lead, _valid_body(clinic))
    assert s == 200, b
    assert b.get("already_requested") is True
    assert b["request_id"] == pre_id
    # No duplicate inserted.
    count = _run(_database.db.consultation_requests.count_documents({"lead_id": lead}))
    assert count == 1


def test_06b_existing_flow_request_blocks_different_clinic(app):
    """Same setup as 06, but POSTing a different clinic → 409."""
    import database as _database
    lead = _make_lead()
    clinic_a = _make_clinic(name="ClinicA")
    clinic_b = _make_clinic(name="ClinicB")
    pre_id = str(uuid.uuid4())
    _run(_database.db.consultation_requests.insert_one({
        "id": pre_id, "lead_id": lead,
        "assigned_clinic_id": clinic_a,
        "created_from": "recommended_clinics_flow",
        "source": "patient_selected_clinic",
        "status": "assigned",
        "created_at": _now_iso(),
    }))
    s, b = _post_request_call(app, lead, _valid_body(clinic_b))
    assert s == 409
    assert b["detail"]["code"] == "already_requested"
    count = _run(_database.db.consultation_requests.count_documents({"lead_id": lead}))
    assert count == 1


# 7. Clinic outside recommended list → 400.
def test_07_clinic_outside_recommended(app):
    lead = _make_lead(city="sofia")
    # Make a clinic in DIFFERENT city — it is never recommended for sofia.
    other = _make_clinic(name="OtherCity", city_slug="plovdiv", city_name="Пловдив")
    s, b = _post_request_call(app, lead, _valid_body(other))
    assert s == 400, b
    assert b["detail"]["code"] == "clinic_not_in_recommendations"


def test_07b_completely_unknown_clinic_id(app):
    lead = _make_lead()
    _make_clinic()
    s, b = _post_request_call(app, lead, _valid_body("not-a-real-id"))
    assert s == 400
    assert b["detail"]["code"] == "clinic_not_in_recommendations"


# 8. Missing consent → 422 consent_required.
def test_08_missing_consent(app):
    lead = _make_lead()
    clinic = _make_clinic()
    body = _valid_body(clinic)
    body["consent_to_share"] = False
    s, b = _post_request_call(app, lead, body)
    assert s == 422
    assert b["detail"]["code"] == "consent_required"


# 9. Invalid phone → 422.
@pytest.mark.parametrize("bad_phone", ["", "    ", "abc", "12"])
def test_09_invalid_phone(app, bad_phone):
    lead = _make_lead()
    clinic = _make_clinic()
    body = _valid_body(clinic)
    body["phone"] = bad_phone
    s, b = _post_request_call(app, lead, body)
    # "" is rejected by Pydantic min_length, "abc"/"12" by our digit check.
    assert s in (422, 400), b


# 10. Lead missing / expired → safe error.
def test_10a_missing_lead(app):
    clinic = _make_clinic()
    s, b = _post_request_call(app, str(uuid.uuid4()), _valid_body(clinic))
    assert s == 404


def test_10b_expired_lead(app):
    lead = _make_lead(age_days=30)
    clinic = _make_clinic()
    s, b = _post_request_call(app, lead, _valid_body(clinic))
    assert s == 410


# 11. Inactive clinic cannot be selected.
def test_11_inactive_clinic_rejected(app):
    lead = _make_lead()
    inactive = _make_clinic(active=False)
    s, b = _post_request_call(app, lead, _valid_body(inactive))
    assert s == 400
    assert b["detail"]["code"] == "clinic_not_in_recommendations"


# 12. Response excludes unsafe clinic fields.
def test_12_response_excludes_unsafe_clinic_fields(app):
    lead = _make_lead()
    clinic = _make_clinic()
    s, b = _post_request_call(app, lead, _valid_body(clinic))
    assert s == 200
    # clinic dict only allowed keys
    assert set(b["clinic"].keys()) == {"id", "name", "city_name"}, b["clinic"]
    # No password_hash / email / phone / hashes anywhere in payload.
    import json
    blob = json.dumps(b)
    for forbidden in ("password_hash", "patient_email", "patient_phone",
                      "consent_to_share_clinic_text", "assigned_clinic_id"):
        assert forbidden not in blob, forbidden
    # `_id` must not appear as a JSON key (substring "_id" is OK inside
    # `request_id`). We assert there is no top-level `"_id":` key.
    assert '"_id"' not in blob


# 13. Endpoint rate-limit works.
def test_13_rate_limit(app):
    lead = _make_lead()
    clinic = _make_clinic()
    # Hit 6× quickly from the same IP → 6th should be 429.
    last_status = None
    for i in range(6):
        last_status, _ = _post_request_call(app, lead, _valid_body(clinic))
        if i < 5 and last_status == 429:
            pytest.fail(f"Hit rate limit too early at i={i}")
    assert last_status == 429, "Expected the 6th call to be rate-limited"


# 14. Created request is visible to selected clinic only.
def test_14_request_visible_to_selected_clinic_only(app):
    import database as _database
    lead = _make_lead()
    clinic = _make_clinic()
    other = _make_clinic(name="OtherClinic")
    _post_request_call(app, lead, _valid_body(clinic))
    # Query by assigned_clinic_id — selected clinic sees it.
    seen_by_selected = _run(_database.db.consultation_requests.find_one(
        {"assigned_clinic_id": clinic, "lead_id": lead}, {"_id": 0}
    ))
    assert seen_by_selected is not None
    # Other clinic gets nothing.
    seen_by_other = _run(_database.db.consultation_requests.find_one(
        {"assigned_clinic_id": other, "lead_id": lead}, {"_id": 0}
    ))
    assert seen_by_other is None


# 15. Non-selected clinic explicitly cannot fetch / see the request (covered
#     structurally by 14; clinic portal endpoint is auth-gated and read-only).
def test_15_no_cross_clinic_leak(app):
    """No consultation request rows leak to clinics that weren't selected."""
    import database as _database
    lead = _make_lead()
    clinic = _make_clinic()
    other = _make_clinic(name="OtherClinic")
    _post_request_call(app, lead, _valid_body(clinic))
    # Count all rows for OTHER clinic — must be zero.
    count_other = _run(_database.db.consultation_requests.count_documents(
        {"assigned_clinic_id": other}
    ))
    assert count_other == 0


# 16. No email/external provider invoked.
def test_16_no_external_provider_called(app):
    lead = _make_lead()
    clinic = _make_clinic()
    _post_request_call(app, lead, _valid_body(clinic))
    _emails_mod.send_lead_notification_email.assert_not_called()
    _emails_mod.send_lead_confirmation_email.assert_not_called()
    _resend.Emails.send.assert_not_called()


# 17. Source matching_card/clinic_profile stored safely.
@pytest.mark.parametrize("src", ["matching_card", "clinic_profile"])
def test_17_source_stored(app, src):
    import database as _database
    lead = _make_lead()
    clinic = _make_clinic()
    _post_request_call(app, lead, _valid_body(clinic, source=src))
    cr = _run(_database.db.consultation_requests.find_one({"lead_id": lead}))
    assert cr["selection_source"] == src
    saved = _run(_database.db.leads.find_one({"id": lead}, {"_id": 0}))
    assert saved["clinic_selection_source"] == src


def test_17b_invalid_source_rejected(app):
    lead = _make_lead()
    clinic = _make_clinic()
    body = _valid_body(clinic, source="hacker_payload")
    s, _ = _post_request_call(app, lead, body)
    assert s == 422  # Pydantic Literal rejection


# 18. Double-click / two rapid submits do not create two consultation_requests.
def test_18_concurrent_submit_no_duplicate(app):
    import database as _database
    lead = _make_lead()
    clinic = _make_clinic()

    async def submit():
        async with _client(app) as c:
            return await c.post(
                f"/api/leads/{lead}/request-call",
                json=_valid_body(clinic),
            )

    async def both():
        return await asyncio.gather(submit(), submit())

    r1, r2 = _run(both())
    statuses = sorted([r1.status_code, r2.status_code])
    # One success, one duplicate — never two clean creates.
    assert 200 in statuses, statuses
    count = _run(_database.db.consultation_requests.count_documents({"lead_id": lead}))
    assert count == 1, f"Expected 1, got {count}"


# 19. Unrelated lead fields are not overwritten.
def test_19_unrelated_lead_fields_preserved(app):
    import database as _database
    lead = _make_lead(name="Иван Иванов", email="ivan@example.com")
    # Stamp a few unrelated marker fields.
    _run(_database.db.leads.update_one(
        {"id": lead},
        {"$set": {"score_total": 42, "band": "high", "answers.q1": "yes"}}
    ))
    clinic = _make_clinic()
    _post_request_call(app, lead, _valid_body(clinic))
    saved = _run(_database.db.leads.find_one({"id": lead}, {"_id": 0}))
    assert saved["name"] == "Иван Иванов"
    assert saved["email"] == "ivan@example.com"
    assert saved["score_total"] == 42
    assert saved["band"] == "high"
    assert saved["answers"]["q1"] == "yes"


# 20. Selected clinic must remain one of the recommended clinics (covered
#     by 07 and 11). Add a stress case: clinic in same city but lead's
#     treatment is broad → still must be a recommended candidate, but city
#     match alone is enough to be in the top-3 recommended set.
def test_20_selected_must_be_in_top3(app):
    """Insert 5 clinics, all sofia/aligners; only top-3 may be selected.

    With deterministic ordering (score desc → placement_rank → name asc),
    the alphabetical tail (clinics #4 and #5 by name) should NOT be in
    the recommended list and therefore not selectable.
    """
    lead = _make_lead(city="sofia", treatment="aligners")
    ids_by_name = {}
    for letter in "ABCDE":
        cid = _make_clinic(name=f"Clinic{letter}")
        ids_by_name[letter] = cid
    # The recommended top-3 should be A, B, C (alphabetical tiebreak).
    # Try to select Clinic D (4th place) — must fail.
    s, b = _post_request_call(app, lead, _valid_body(ids_by_name["D"]))
    assert s == 400, b
    assert b["detail"]["code"] == "clinic_not_in_recommendations"
    # Try Clinic C — should succeed.
    s2, b2 = _post_request_call(app, lead, _valid_body(ids_by_name["C"]))
    assert s2 == 200, b2
    assert b2["clinic"]["id"] == ids_by_name["C"]


# ── Selection-state read endpoint ────────────────────────────────


def test_state_no_request_yet(app):
    lead = _make_lead()
    s, b = _get_state(app, lead)
    assert s == 200
    assert b["has_request"] is False
    assert b["selected_clinic_id"] is None


def test_state_after_request(app):
    lead = _make_lead()
    clinic = _make_clinic()
    _post_request_call(app, lead, _valid_body(clinic))
    s, b = _get_state(app, lead)
    assert s == 200
    assert b["has_request"] is True
    assert b["selected_clinic_id"] == clinic
    assert b["request_call_status"] == "requested"
    assert b["clinic"]["id"] == clinic


def test_state_404_for_unknown_lead(app):
    s, _ = _get_state(app, str(uuid.uuid4()))
    assert s == 404
