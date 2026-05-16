"""Backend follow-up to P6 frontend analytics.

Verifies that the `AnalyticsEvent` Pydantic model now accepts and the
endpoint persists the P6 patient-funnel fields (`lead_id`, `clinic_id`,
`partner_tier`, `placement_label`, `source`, `rank_position`, `success`,
`error_code`, `reason`, `attempted_action`, `clinic_count`,
`has_premium`, `has_featured`, `has_standard`, `has_lead_id`,
`segment`, `band`, `city`).

Also asserts:
- legacy quiz analytics still flow through unchanged
- unknown / PII-looking keys are silently dropped by Pydantic
  (`extra="ignore"`), never reaching MongoDB.
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

os.environ.setdefault("DB_NAME", "zubite_test_p6_analytics_schema")
os.environ.setdefault("APP_ENV", "test")
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"
os.environ.setdefault("RESEND_API_KEY", "test_resend_key_no_network")
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
_resend.Emails.send = MagicMock(return_value={"id": "test-no-send"})  # type: ignore[assignment]

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

    _rl._buckets.clear()
    _run(_database.db.analytics_events.delete_many({}))
    yield
    _rl._buckets.clear()


# ── helpers ───────────────────────────────────────────────────


def _post(app, body: dict):
    async def go():
        async with _client(app) as c:
            return await c.post("/api/analytics/events", json=body)
    return _run(go())


def _find_one(event_type: str) -> dict | None:
    import database as _database
    return _run(_database.db.analytics_events.find_one(
        {"event_type": event_type}, {"_id": 0}
    ))


# ── tests ─────────────────────────────────────────────────────


def test_01_legacy_article_event_still_works(app):
    """The shape used today by `frontend/lib/articleAnalytics.ts` must
    still POST 200 even though `post_slug`/`post_title`/`href`/`cta`
    aren't declared on the model — they're extras, ignored by Pydantic.
    """
    r = _post(app, {
        "event_type": "article_view",
        "session_id": "s_legacy_article_1",
        "timestamp": "2026-02-16T11:00:00.000Z",
        "post_slug": "test-article",
        "post_title": "Test article title",
        "href": "/blog/test-article",
        "cta": None,
    })
    assert r.status_code == 200, r.text
    doc = _find_one("article_view")
    assert doc is not None
    assert doc["session_id"] == "s_legacy_article_1"
    # Extras dropped (article fields aren't declared on the model).
    for k in ("post_slug", "post_title", "href", "cta"):
        assert k not in doc, f"{k!r} should have been dropped"


def test_02_legacy_quiz_event_still_works(app):
    """Quiz events sent by MasterQuiz.tsx must continue to persist."""
    r = _post(app, {
        "event_type": "question_answered",
        "session_id": "s_quiz_1",
        "timestamp": "2026-02-16T11:00:01.000Z",
        "question_id": "q3_jaw_pain",
        "question_index": 3,
        "answer": "sometimes",
        "score": 1,
        "time_spent_ms": 4200,
        "segment": "adult",
    })
    assert r.status_code == 200, r.text
    doc = _find_one("question_answered")
    assert doc is not None
    assert doc["question_id"] == "q3_jaw_pain"
    assert doc["question_index"] == 3
    assert doc["answer"] == "sometimes"
    assert doc["score"] == 1
    assert doc["time_spent_ms"] == 4200
    assert doc["segment"] == "adult"


def test_03_p6_patient_event_persists_all_new_fields(app):
    """P6 `request_call_submitted` payload — full attribution stored."""
    r = _post(app, {
        "event_type": "request_call_submitted",
        "session_id": "s_p6_full_1",
        "timestamp": "2026-02-16T11:00:02.000Z",
        "lead_id": "lead-uuid-aaa-111",
        "clinic_id": "clinic-uuid-bbb-222",
        "partner_tier": "premium",
        "placement_label": "Premium партньор",
        "source": "matching_card",
        "rank_position": 1,
        "success": True,
    })
    assert r.status_code == 200, r.text
    doc = _find_one("request_call_submitted")
    assert doc is not None
    assert doc["lead_id"] == "lead-uuid-aaa-111"
    assert doc["clinic_id"] == "clinic-uuid-bbb-222"
    assert doc["partner_tier"] == "premium"
    assert doc["placement_label"] == "Premium партньор"
    assert doc["source"] == "matching_card"
    assert doc["rank_position"] == 1
    assert doc["success"] is True


def test_04_p6_minimal_event_with_only_required_fields(app):
    """If only event_type / session_id / timestamp are sent, that still
    works — every P6 field is optional.
    """
    r = _post(app, {
        "event_type": "quiz_success_viewed",
        "session_id": "s_p6_minimal_1",
        "timestamp": "2026-02-16T11:00:03.000Z",
    })
    assert r.status_code == 200, r.text
    doc = _find_one("quiz_success_viewed")
    assert doc is not None
    # No optional P6 keys should be persisted (endpoint strips None values).
    for k in ("lead_id", "clinic_id", "partner_tier"):
        assert k not in doc


def test_05_p6_recommendation_view_with_tier_flags(app):
    """`clinic_recommendations_viewed` payload uses the `has_*` booleans."""
    r = _post(app, {
        "event_type": "clinic_recommendations_viewed",
        "session_id": "s_p6_recos_1",
        "timestamp": "2026-02-16T11:00:04.000Z",
        "lead_id": "lead-recos-1",
        "clinic_count": 3,
        "has_premium": True,
        "has_featured": True,
        "has_standard": False,
    })
    assert r.status_code == 200, r.text
    doc = _find_one("clinic_recommendations_viewed")
    assert doc is not None
    assert doc["clinic_count"] == 3
    assert doc["has_premium"] is True
    assert doc["has_featured"] is True
    assert doc["has_standard"] is False
    assert doc["lead_id"] == "lead-recos-1"


def test_06_p6_failure_event_carries_error_code(app):
    r = _post(app, {
        "event_type": "request_call_failed",
        "session_id": "s_p6_fail_1",
        "timestamp": "2026-02-16T11:00:05.000Z",
        "lead_id": "lead-fail-1",
        "clinic_id": "clinic-fail-1",
        "source": "matching_card",
        "error_code": "already_requested",
    })
    assert r.status_code == 200, r.text
    doc = _find_one("request_call_failed")
    assert doc is not None
    assert doc["error_code"] == "already_requested"
    assert doc["lead_id"] == "lead-fail-1"
    assert doc["clinic_id"] == "clinic-fail-1"


def test_07_p6_blocked_event_carries_reason(app):
    r = _post(app, {
        "event_type": "matching_choice_blocked",
        "session_id": "s_p6_blocked_1",
        "timestamp": "2026-02-16T11:00:06.000Z",
        "lead_id": "lead-blk-1",
        "clinic_id": "clinic-blk-1",
        "reason": "already_selected_clinic",
        "attempted_action": "request_call",
    })
    assert r.status_code == 200, r.text
    doc = _find_one("matching_choice_blocked")
    assert doc is not None
    assert doc["reason"] == "already_selected_clinic"
    assert doc["attempted_action"] == "request_call"


def test_08_unknown_extra_field_is_silently_dropped(app):
    """A genuinely unknown extra key must not crash the endpoint
    (Pydantic extra='ignore') and must not be persisted.
    """
    r = _post(app, {
        "event_type": "some_future_event",
        "session_id": "s_extra_1",
        "timestamp": "2026-02-16T11:00:07.000Z",
        "totally_random_field": "drop me",
        "another_one_bites_the_dust": 42,
    })
    assert r.status_code == 200, r.text
    doc = _find_one("some_future_event")
    assert doc is not None
    assert "totally_random_field" not in doc
    assert "another_one_bites_the_dust" not in doc


def test_09_pii_like_extra_fields_never_stored(app):
    """Critical privacy guard: even if a buggy client tried to POST
    `phone`/`email`/`patient_message`/etc., the model must drop them
    before MongoDB insert.
    """
    r = _post(app, {
        "event_type": "request_call_submitted",
        "session_id": "s_pii_test_1",
        "timestamp": "2026-02-16T11:00:08.000Z",
        # legitimate P6 fields:
        "lead_id": "lead-pii-1",
        "clinic_id": "clinic-pii-1",
        "partner_tier": "featured",
        # forbidden PII keys — must NOT be persisted:
        "name": "Иван Петров",
        "phone": "+359888123456",
        "email": "pii@example.com",
        "patient_name": "Иван Петров",
        "patient_phone": "+359888123456",
        "patient_email": "pii@example.com",
        "message": "Имам силна болка в челюстта",
        "patient_message": "Имам силна болка в челюстта",
        "consent_text": "Long verbatim consent string ...",
        "access_token": "Bearer xxx",
        "cookie": "session=yyy",
    })
    assert r.status_code == 200, r.text

    import database as _database
    doc = _run(_database.db.analytics_events.find_one(
        {"session_id": "s_pii_test_1"}, {"_id": 0}
    ))
    assert doc is not None
    # Legitimate P6 fields stored.
    assert doc["lead_id"] == "lead-pii-1"
    assert doc["clinic_id"] == "clinic-pii-1"
    assert doc["partner_tier"] == "featured"
    # PII keys MUST NOT appear anywhere on the persisted document.
    import json
    blob = json.dumps(doc, ensure_ascii=False)
    for forbidden in (
        "Иван Петров", "+359888123456", "pii@example.com",
        "Имам силна болка в челюстта", "Long verbatim consent",
        "Bearer xxx", "session=yyy",
    ):
        assert forbidden not in blob, f"PII value {forbidden!r} leaked"
    for forbidden_key in (
        "name", "phone", "email",
        "patient_name", "patient_phone", "patient_email",
        "message", "patient_message",
        "consent_text", "access_token", "cookie",
    ):
        assert forbidden_key not in doc, f"PII key {forbidden_key!r} leaked"


def test_10_full_p6_funnel_query_roundtrip(app):
    """End-to-end query: insert several P6 events with attribution,
    then query analytics_events directly the way an admin funnel view
    would, and confirm the attribution survives.
    """
    events = [
        {
            "event_type": "quiz_success_viewed",
            "session_id": "s_funnel_1",
            "timestamp": "2026-02-16T11:00:10.000Z",
            "lead_id": "lead-funnel-1",
            "has_lead_id": True,
            "band": "moderate",
            "segment": "adult",
            "city": "sofia",
        },
        {
            "event_type": "clinic_recommendations_viewed",
            "session_id": "s_funnel_1",
            "timestamp": "2026-02-16T11:00:11.000Z",
            "lead_id": "lead-funnel-1",
            "clinic_count": 3,
            "has_premium": True,
            "has_featured": True,
            "has_standard": True,
        },
        {
            "event_type": "clinic_profile_clicked",
            "session_id": "s_funnel_1",
            "timestamp": "2026-02-16T11:00:12.000Z",
            "lead_id": "lead-funnel-1",
            "clinic_id": "clinic-funnel-A",
            "partner_tier": "premium",
            "placement_label": "Premium партньор",
            "rank_position": 1,
        },
        {
            "event_type": "request_call_submitted",
            "session_id": "s_funnel_1",
            "timestamp": "2026-02-16T11:00:13.000Z",
            "lead_id": "lead-funnel-1",
            "clinic_id": "clinic-funnel-A",
            "source": "clinic_profile",
            "partner_tier": "premium",
            "placement_label": "Premium партньор",
            "success": True,
        },
    ]
    for ev in events:
        assert _post(app, ev).status_code == 200

    import database as _database
    docs = _run(_database.db.analytics_events.find(
        {"session_id": "s_funnel_1"}, {"_id": 0}
    ).sort("timestamp", 1).to_list(100))

    assert len(docs) == 4
    by_type = {d["event_type"]: d for d in docs}
    assert by_type["quiz_success_viewed"]["lead_id"] == "lead-funnel-1"
    assert by_type["clinic_recommendations_viewed"]["clinic_count"] == 3
    assert by_type["clinic_profile_clicked"]["partner_tier"] == "premium"
    assert by_type["clinic_profile_clicked"]["rank_position"] == 1
    assert by_type["request_call_submitted"]["clinic_id"] == "clinic-funnel-A"
    assert by_type["request_call_submitted"]["success"] is True

    # Every doc must share the same lead_id for funnel reconstruction.
    assert {d.get("lead_id") for d in docs} == {"lead-funnel-1"}


def test_11_rate_limit_still_enforced(app):
    """Existing rate-limit on /api/analytics/events (60/min) must still
    fire on the 61st call within the window. Regression guard — we
    didn't touch the endpoint, but worth pinning.
    """
    last_status = None
    for i in range(65):
        r = _post(app, {
            "event_type": f"rate_test_{i}",
            "session_id": "s_rate_1",
            "timestamp": "2026-02-16T11:00:20.000Z",
        })
        last_status = r.status_code
        if r.status_code == 429:
            break
    assert last_status == 429, (
        f"expected 429 within 65 calls, last_status={last_status}"
    )
