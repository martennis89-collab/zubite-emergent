"""Clinic-side patient context visibility tests.

Verifies the new `patient_context` payload on
`GET /api/clinic/consultation-requests/{id}`:

  1. Clinic can see `patient_context` for its assigned request.
  2. Clinic cannot see another clinic's request (404).
  3. Unauthenticated cannot access the endpoint.
  4. Internal/admin-only fields are not exposed.
  5. Quiz answers come back as a safe summary, never raw JSON / unknown keys.
  6. Source article context is returned when first_article_title is set.
  7. UTM / campaign source context is returned in a friendly structure.
  8. Missing quiz / source data does not crash the endpoint.
  9. Raw `content_path_before_conversion` and raw attribution blob are
     never present in the response.
 10. Existing fields (`request`, `appointment`, `events`) still returned.

Isolated test DB, in-process ASGI client, no network egress.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest

os.environ.setdefault("DB_NAME", "zubite_test_clinic_patient_context")
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
_resend.Emails.send = MagicMock(return_value={"id": "test-no-send"})  # type: ignore[assignment]

import emails as _emails_mod  # noqa: E402
_emails_mod.send_lead_notification_email = MagicMock(return_value=None)
_emails_mod.send_lead_confirmation_email = MagicMock(return_value=None)

from httpx import ASGITransport, AsyncClient  # noqa: E402

_LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(_LOOP)


def _run(coro):
    return _LOOP.run_until_complete(coro)


CLINIC_A_EMAIL = "clinic-a-context@example.com"
CLINIC_A_PASS = "ClinicAPass1!"
CLINIC_B_EMAIL = "clinic-b-context@example.com"
CLINIC_B_PASS = "ClinicBPass1!"


@pytest.fixture(scope="module")
def app():
    import server as _server
    return _server.app


def _client(app):
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@pytest.fixture(scope="module", autouse=True)
def _bootstrap(app):  # noqa: ARG001
    import database as _database
    from auth import hash_password

    async def setup():
        db = _database.db
        for coll in await db.list_collection_names():
            await db[coll].delete_many({})
        for email, pw, name in (
            (CLINIC_A_EMAIL, CLINIC_A_PASS, "Clinic A"),
            (CLINIC_B_EMAIL, CLINIC_B_PASS, "Clinic B"),
        ):
            await db.clinics.insert_one({
                "id": str(uuid.uuid4()),
                "clinic_name": name,
                "name": name,
                "city": "Sofia", "city_name": "София", "city_slug": "sofia",
                "email": email, "phone": "+359 88 000 0000",
                "password_hash": hash_password(pw),
                "status": "active", "clinic_status": "active_partner",
                "subscription_status": "active", "address": "Test",
                "is_active": True,
                "treatments_supported": ["aligners"],
                "treatments_offered": ["aligners"],
                "notification_email": email,
                "created_at": _now_iso(),
            })

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
        await db.consultation_requests.delete_many({})
        await db.consultation_events.delete_many({})
        await db.leads.delete_many({})

    _rl._buckets.clear()
    _run(wipe())
    yield
    _rl._buckets.clear()


async def _clinic_login(app, email: str, password: str) -> dict:
    async with _client(app) as c:
        r = await c.post("/api/clinic/login", json={"email": email, "password": password})
    r.raise_for_status()
    return dict(r.cookies)


async def _clinic_id(email: str) -> str:
    import database as _database
    c = await _database.db.clinics.find_one({"email": email}, {"_id": 0, "id": 1})
    return c["id"]  # type: ignore[index]


# ── seed helpers ─────────────────────────────────────────────────


def _seed_lead(
    *,
    answers: dict | None = None,
    first_article_title: str | None = None,
    first_article_slug: str | None = None,
    first_utm_source: str | None = None,
    first_utm_campaign: str | None = None,
    first_utm_ad: str | None = None,
    first_landing_page_type: str | None = None,
    pages_viewed: int | None = None,
    blog_assisted: bool | None = None,
    content_path: list | None = None,
) -> str:
    """Insert a lead with controllable attribution fields. Returns lead id."""
    import database as _database
    lead_id = str(uuid.uuid4())
    doc = {
        "id": lead_id,
        "name": "Test Patient",
        "phone": "+359 88 111 2222",
        "city_slug": "sofia",
        "treatment_type": "aligners",
        "answers": answers or {},
        "created_at": _now_iso(),
        "first_article_title": first_article_title,
        "first_article_slug": first_article_slug,
        "first_utm_source": first_utm_source,
        "first_utm_campaign": first_utm_campaign,
        "first_utm_ad": first_utm_ad,
        "first_landing_page_type": first_landing_page_type,
        "pages_viewed_before_conversion": pages_viewed,
        "blog_assisted_conversion": blog_assisted,
        "content_path_before_conversion": content_path or [],
        # Internal sensitive fields — must NEVER reach the clinic response.
        "verification_token": "v_should_never_appear",
        "internal_score_breakdown": {"x": 1, "y": 2, "z": 3},
    }
    _run(_database.db.leads.insert_one(doc))
    return lead_id


def _seed_request(
    *,
    clinic_id: str | None,
    lead_id: str | None = None,
    treatment: str = "aligners",
    patient_message: str | None = None,
) -> str:
    import database as _database
    rid = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": rid,
        "patient_name": "Test Patient",
        "patient_phone": "+359 88 111 2222",
        "patient_email": None,
        "patient_city": "sofia",
        "treatment_interest": treatment,
        "urgency": "high", "readiness": "ready",
        "lead_id": lead_id,
        "source": "patient_selected_clinic",
        "created_from": "recommended_clinics_flow",
        "assigned_clinic_id": clinic_id,
        "status": "assigned" if clinic_id else "needs_zubite_review",
        "assigned_at": now if clinic_id else None,
        "patient_message": patient_message,
        "created_at": now, "updated_at": now,
    }
    _run(_database.db.consultation_requests.insert_one(doc))
    return rid


def _get(app, req_id: str, cookies: dict | None):
    async def go():
        async with _client(app) as c:
            return await c.get(
                f"/api/clinic/consultation-requests/{req_id}",
                cookies=cookies or {},
            )
    return _run(go())


# ── tests ─────────────────────────────────────────────────────────


def test_01_assigned_clinic_sees_patient_context(app):
    cookies = _run(_clinic_login(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    lead_id = _seed_lead(answers={
        "seriousness": "considering", "timing": "0-3",
        "importance": "quality", "previous_ortho": "no",
        "pain_bite": "yes", "readiness": "ready",
    })
    rid = _seed_request(clinic_id=cid, lead_id=lead_id)
    r = _get(app, rid, cookies)
    assert r.status_code == 200, r.text
    body = r.json()
    # Top-level keys still present
    assert set(body.keys()) >= {"request", "appointment", "events", "patient_context"}
    ctx = body["patient_context"]
    assert ctx["label"] == "Информация, споделена от пациента"
    assert ctx["treatment_interest"] == "aligners"
    assert ctx["city"] == "sofia"
    assert ctx["readiness"] == "ready"
    assert ctx["urgency"] == "high"
    # Quiz summary returned as label/value rows (no raw JSON).
    rows = ctx["quiz_summary"]
    assert isinstance(rows, list) and len(rows) >= 5
    for row in rows:
        assert set(row.keys()) == {"question_label", "answer_label"}
        assert isinstance(row["question_label"], str) and row["question_label"]
        assert isinstance(row["answer_label"], str) and row["answer_label"]
    # Friendly value resolution worked.
    labels = {row["question_label"]: row["answer_label"] for row in rows}
    assert labels["Кога планира лечение"] == "В рамките на 0–3 месеца"
    assert labels["Колко сериозно търсене"] == "Обмисля сериозно"


def test_02_clinic_cannot_see_other_clinics_request(app):
    cookies_b = _run(_clinic_login(app, CLINIC_B_EMAIL, CLINIC_B_PASS))
    cid_a = _run(_clinic_id(CLINIC_A_EMAIL))
    lead_id = _seed_lead(answers={"seriousness": "decided"})
    rid = _seed_request(clinic_id=cid_a, lead_id=lead_id)
    # Clinic B asks for Clinic A's request → 404 (and definitely no patient_context).
    r = _get(app, rid, cookies_b)
    assert r.status_code == 404


def test_03_unauthenticated_cannot_access_context(app):
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, lead_id=_seed_lead())
    r = _get(app, rid, None)
    assert r.status_code in (401, 403)


def test_04_internal_fields_are_not_exposed(app):
    cookies = _run(_clinic_login(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    lead_id = _seed_lead(answers={
        "seriousness": "decided",
        # Technical / experimental keys: must NOT surface even though
        # they are present on the lead.
        "session_id": "sess_abc_should_not_appear",
        "experiment_flag_x": "leaked_value_xyz",
    })
    rid = _seed_request(clinic_id=cid, lead_id=lead_id)
    body = _get(app, rid, cookies).json()
    blob = json.dumps(body, ensure_ascii=False)
    # The full document must not contain known internal markers.
    for needle in (
        "sess_abc_should_not_appear",
        "leaked_value_xyz",
        "v_should_never_appear",          # verification_token
        "internal_score_breakdown",
        "experiment_flag_x",
    ):
        assert needle not in blob, f"internal field leaked: {needle!r}"


def test_05_quiz_summary_drops_unknown_keys_and_never_serialises_nested(app):
    cookies = _run(_clinic_login(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    lead_id = _seed_lead(answers={
        "seriousness": "decided",
        # Nested objects must never be serialised as raw JSON.
        "nested_blob": {"hidden": "secret_nested"},
        "experimental_key": "this_label_is_unknown",
    })
    rid = _seed_request(clinic_id=cid, lead_id=lead_id)
    body = _get(app, rid, cookies).json()
    blob = json.dumps(body, ensure_ascii=False)
    assert "secret_nested" not in blob
    assert "this_label_is_unknown" not in blob
    rows = body["patient_context"]["quiz_summary"]
    # Only the recognised key surfaces.
    assert len(rows) == 1
    assert rows[0]["question_label"] == "Колко сериозно търсене"
    assert rows[0]["answer_label"] == "Решен/а да започне"


def test_06_article_source_context_when_present(app):
    cookies = _run(_clinic_login(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    lead_id = _seed_lead(
        first_article_title="Алайнери vs Брекети — какво да изберем",
        first_article_slug="aligners-vs-braces",
        first_landing_page_type="article",
        pages_viewed=4,
        blog_assisted=True,
    )
    rid = _seed_request(clinic_id=cid, lead_id=lead_id)
    src = _get(app, rid, cookies).json()["patient_context"]["source_context"]
    assert src["source_type"] == "article"
    assert src["article_title"] == "Алайнери vs Брекети — какво да изберем"
    assert src["article_slug"] == "aligners-vs-braces"
    assert "блога" in (src["content_path_summary"] or "")
    assert "4" in (src["content_path_summary"] or "")


def test_07_utm_campaign_context_when_present(app):
    cookies = _run(_clinic_login(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    lead_id = _seed_lead(
        first_utm_source="meta",
        first_utm_campaign="aligners-awareness-q2",
        first_utm_ad="hero-video-01",
    )
    rid = _seed_request(clinic_id=cid, lead_id=lead_id)
    src = _get(app, rid, cookies).json()["patient_context"]["source_context"]
    assert src["source_type"] == "campaign"
    assert src["utm_source"] == "meta"
    assert src["utm_campaign"] == "aligners-awareness-q2"
    assert src["utm_ad"] == "hero-video-01"
    # No article should be present
    assert src["article_title"] is None
    assert src["article_slug"] is None


def test_08_missing_quiz_and_source_data_does_not_break(app):
    cookies = _run(_clinic_login(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    # Request with NO lead_id at all.
    rid = _seed_request(clinic_id=cid, lead_id=None)
    body = _get(app, rid, cookies).json()
    ctx = body["patient_context"]
    assert ctx["quiz_summary"] == []
    assert ctx["source_context"]["source_type"] == "unknown"
    assert ctx["source_context"]["article_title"] is None
    assert ctx["source_context"]["utm_source"] is None

    # Request with a lead but empty answers.
    lead_id = _seed_lead(answers={})
    rid2 = _seed_request(clinic_id=cid, lead_id=lead_id)
    body2 = _get(app, rid2, cookies).json()
    assert body2["patient_context"]["quiz_summary"] == []


def test_09_raw_attribution_and_content_path_object_not_exposed(app):
    cookies = _run(_clinic_login(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    lead_id = _seed_lead(
        first_utm_source="meta",
        first_utm_campaign="campaign-xyz",
        pages_viewed=3, blog_assisted=False,
        content_path=[
            {"path": "/blog/secret-page-should-not-leak", "ts": "t1"},
            {"path": "/another-secret-path", "ts": "t2"},
        ],
    )
    rid = _seed_request(clinic_id=cid, lead_id=lead_id)
    body = _get(app, rid, cookies).json()
    blob = json.dumps(body, ensure_ascii=False)
    # Page-by-page raw path must NEVER reach the clinic response.
    assert "secret-page-should-not-leak" not in blob
    assert "another-secret-path" not in blob
    # And the raw key name should not be in the surface payload.
    assert "content_path_before_conversion" not in body["patient_context"]


def test_10_existing_response_shape_still_present(app):
    cookies = _run(_clinic_login(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(clinic_id=cid, lead_id=_seed_lead())
    body = _get(app, rid, cookies).json()
    # Pre-existing top-level keys still returned.
    assert "request" in body and body["request"]["id"] == rid
    assert "appointment" in body
    assert "events" in body and isinstance(body["events"], list)


def test_11_p5_patient_message_surfaces_in_context_when_clinic_is_assigned(app):
    """If admin ever re-assigns a P5 case to a clinic, that clinic
    should see the patient_message inside patient_context."""
    cookies = _run(_clinic_login(app, CLINIC_A_EMAIL, CLINIC_A_PASS))
    cid = _run(_clinic_id(CLINIC_A_EMAIL))
    rid = _seed_request(
        clinic_id=cid,
        lead_id=_seed_lead(answers={"seriousness": "considering"}),
        patient_message="Имам неравни зъби. Бих искал/а да обсъдя алайнери.",
    )
    body = _get(app, rid, cookies).json()
    assert (
        body["patient_context"]["patient_message"]
        == "Имам неравни зъби. Бих искал/а да обсъдя алайнери."
    )
