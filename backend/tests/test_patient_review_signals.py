"""Patient layer — R1: External review signals for the
`GET /api/leads/{lead_id}/recommended-clinics` endpoint.

These tests verify the display-only, admin-gated review-signals contract:

 1.  verified_by_admin=false hides review_signals even when rating fields exist
 2.  verified_by_admin=true + valid Google fields returns Google source
 3.  review_count < 5 hides that source
 4.  unsafe URL host is rejected/hidden
 5.  non-http scheme is rejected/hidden
 6.  supports Google, Superdoc, Facebook in deterministic order
 7.  response excludes forbidden fields (no review text/name/raw clinic object)
 8.  response never contains trust_score, combined_rating, overall_score
 9.  review signals do NOT affect ranking/order
 10. invalid rating bounds rejected by ClinicAdminUpdate schema
 11. missing URL hides source
 12. standard clinic without review fields still works
 13. boolean-like rating/count values are rejected (not silently coerced)

Conventions follow `test_patient_recommended_clinics.py`: in-process ASGI
tests, isolated test DB, no network.
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

os.environ.setdefault("DB_NAME", "zubite_test_r1_review_signals")
os.environ.setdefault("APP_ENV", "test")
os.environ["RATE_LIMIT_TRUST_XFF"] = "0"
os.environ.setdefault("RESEND_API_KEY", "test_resend_key_no_network")
os.environ.setdefault("ADMIN_EMAIL", "admin-alerts@example.com")
os.environ["AUTH_COOKIE_SECURE"] = "0"

# Safety guards — refuse to run against a non-isolated DB or production env.
_db_name = os.environ.get("DB_NAME", "")
if not (_db_name.startswith("zubite_test") or _db_name.startswith("test_")):
    raise RuntimeError(
        f"Refusing to run: DB_NAME={_db_name!r} is not an isolated test DB."
    )
_env_flag = (
    os.environ.get("APP_ENV") or os.environ.get("ENVIRONMENT")
    or os.environ.get("NODE_ENV") or "development"
).lower().strip()
if _env_flag == "production":
    raise RuntimeError("Refusing to run with APP_ENV=production.")

_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# Stub storage init (same pattern as the P2 reco tests).
import storage as _storage_mod  # noqa: E402

_storage_mod.init_storage = lambda: None  # type: ignore[assignment]

# Hard-disable Resend network call.
import resend as _resend  # noqa: E402

_resend.Emails.send = MagicMock(return_value={"id": "test-no-send"})  # type: ignore[assignment]

from httpx import ASGITransport, AsyncClient  # noqa: E402

_LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(_LOOP)


def _run(coro):
    return _LOOP.run_until_complete(coro)


# ── Fixtures ─────────────────────────────────────────────────────


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

    _rl._buckets.clear()
    _run(wipe())
    yield
    _rl._buckets.clear()


# ── Test data helpers ────────────────────────────────────────────


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_lead(*, city: str = "sofia", treatment: str = "aligners",
               age_days: int = 0) -> str:
    import database as _database
    lead_id = str(uuid.uuid4())
    created_at = (
        datetime.now(timezone.utc) - timedelta(days=age_days)
    ).isoformat()

    async def insert():
        await _database.db.leads.insert_one({
            "id": lead_id,
            "city_slug": city,
            "treatment_type": treatment,
            "answers": {},
            "consent": False,
            "created_at": created_at,
        })

    _run(insert())
    return lead_id


def _make_clinic(*, name: str = "Test Clinic",
                 city_slug: str = "sofia",
                 city_name: str = "София",
                 treatments_supported: list[str] | None = None,
                 review_fields: dict | None = None) -> str:
    """Insert a legacy-shape clinic with optional review fields."""
    import database as _database
    cid = str(uuid.uuid4())
    doc: dict = {
        "id": cid,
        "name": name,
        "city_slug": city_slug,
        "city_name": city_name,
        "treatments_supported": treatments_supported or ["aligners"],
        "is_active": True,
        "created_at": _now_iso(),
    }
    if review_fields:
        doc.update(review_fields)

    async def insert():
        await _database.db.clinics.insert_one(doc)

    _run(insert())
    return cid


def _get(app, lead_id: str, limit: int | None = None) -> tuple[int, dict]:
    qs = f"?limit={limit}" if limit is not None else ""

    async def go():
        async with _client(app) as c:
            return await c.get(f"/api/leads/{lead_id}/recommended-clinics{qs}")

    r = _run(go())
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, {"_raw": r.text}


# Convenience builder for a fully valid Google source on a clinic doc.
def _valid_google_fields(verified: bool = True) -> dict:
    return {
        "google_rating": 4.7,
        "google_review_count": 213,
        "google_place_url": "https://maps.google.com/?cid=12345",
        "review_sources_last_checked_at": "2026-02-12T08:00:00Z",
        "review_sources_verified_by_admin": verified,
    }


# Forbidden response keys — these MUST NEVER appear inside a clinic object
# or inside review_signals.
FORBIDDEN_TOP_KEYS = {
    "trust_score", "combined_rating", "overall_score", "ranking",
    "review_texts", "review_quotes", "testimonials",
}
FORBIDDEN_SOURCE_KEYS = {
    "text", "quote", "review_text", "reviewer", "reviewer_name", "author",
    "screenshot", "raw", "raw_clinic",
}


# ─────────────── 1. verified=false hides review_signals ───────────────


def test_01_unverified_clinic_hides_review_signals(app):
    lead = _make_lead()
    fields = _valid_google_fields(verified=False)
    _make_clinic(review_fields=fields)
    status, body = _get(app, lead)
    assert status == 200, body
    assert body["clinic_count"] == 1
    c = body["clinics"][0]
    assert "review_signals" not in c, (
        "review_signals must be absent when verified_by_admin=false; "
        f"got {c}"
    )


# ─────────────── 2. verified=true + valid Google → Google source ───────────────


def test_02_verified_valid_google_returns_source(app):
    lead = _make_lead()
    _make_clinic(review_fields=_valid_google_fields(verified=True))
    status, body = _get(app, lead)
    assert status == 200, body
    c = body["clinics"][0]
    assert "review_signals" in c
    rs = c["review_signals"]
    assert isinstance(rs["sources"], list) and len(rs["sources"]) == 1
    src = rs["sources"][0]
    assert src["platform"] == "google"
    assert src["rating"] == 4.7
    assert src["review_count"] == 213
    assert src["url"].startswith("https://")
    assert rs["last_checked_at"] == "2026-02-12T08:00:00Z"
    assert rs["disclaimer"].startswith("Данните са публични сигнали")


# ─────────────── 3. review_count < 5 hides the source ───────────────


def test_03_review_count_below_five_hides_source(app):
    lead = _make_lead()
    f = _valid_google_fields(verified=True)
    f["google_review_count"] = 4  # below threshold
    _make_clinic(review_fields=f)
    status, body = _get(app, lead)
    assert status == 200, body
    c = body["clinics"][0]
    # Only Google was set; with count<5 it must drop -> entire object omitted.
    assert "review_signals" not in c


def test_03b_review_count_exactly_five_publishes(app):
    """Boundary: count=5 must be publishable (>= 5 rule)."""
    lead = _make_lead()
    f = _valid_google_fields(verified=True)
    f["google_review_count"] = 5
    _make_clinic(review_fields=f)
    status, body = _get(app, lead)
    c = body["clinics"][0]
    assert "review_signals" in c
    assert c["review_signals"]["sources"][0]["review_count"] == 5


# ─────────────── 4. unsafe URL host is rejected ───────────────


def test_04_unsafe_host_rejected(app):
    lead = _make_lead()
    f = _valid_google_fields(verified=True)
    f["google_place_url"] = "https://evil.example.com/profile"
    _make_clinic(review_fields=f)
    status, body = _get(app, lead)
    c = body["clinics"][0]
    assert "review_signals" not in c, (
        "Source on a non-whitelisted host must be dropped."
    )


def test_04b_host_must_be_exact_match_no_wildcard(app):
    """Sanity: `google.com.attacker.tld` must not pass a wildcard bypass."""
    lead = _make_lead()
    f = _valid_google_fields(verified=True)
    f["google_place_url"] = "https://google.com.attacker.tld/x"
    _make_clinic(review_fields=f)
    _, body = _get(app, lead)
    assert "review_signals" not in body["clinics"][0]


def test_04c_userinfo_in_url_rejected(app):
    """`https://user@maps.google.com/...` style userinfo must be blocked."""
    lead = _make_lead()
    f = _valid_google_fields(verified=True)
    f["google_place_url"] = "https://evil.com@maps.google.com/cid"
    _make_clinic(review_fields=f)
    _, body = _get(app, lead)
    # urlparse correctly extracts hostname as maps.google.com here, but our
    # `@` guard in _is_safe_review_url defends against ambiguous parsers.
    # Either path -> the URL is rejected by our explicit `@` check.
    assert "review_signals" not in body["clinics"][0]


# ─────────────── 5. non-http scheme is rejected ───────────────


@pytest.mark.parametrize("bad_url", [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "ftp://maps.google.com/x",
    "/relative/path",
    "maps.google.com/x",
    "",
])
def test_05_unsafe_scheme_rejected(app, bad_url):
    lead = _make_lead()
    f = _valid_google_fields(verified=True)
    f["google_place_url"] = bad_url
    _make_clinic(review_fields=f)
    _, body = _get(app, lead)
    assert "review_signals" not in body["clinics"][0], bad_url


# ─────────────── 6. deterministic source order: google → superdoc → facebook ───────────────


def test_06_deterministic_source_order(app):
    lead = _make_lead()
    _make_clinic(review_fields={
        # Insert in scrambled order in the dict.
        "facebook_rating": 4.5,
        "facebook_review_count": 88,
        "facebook_page_url": "https://www.facebook.com/clinicx",
        "superdoc_rating": 4.9,
        "superdoc_review_count": 41,
        "superdoc_profile_url": "https://superdoc.bg/clinic/x",
        "google_rating": 4.7,
        "google_review_count": 213,
        "google_place_url": "https://maps.google.com/?cid=12345",
        "review_sources_verified_by_admin": True,
        "review_sources_last_checked_at": "2026-02-12T08:00:00Z",
    })
    _, body = _get(app, lead)
    rs = body["clinics"][0]["review_signals"]
    platforms = [s["platform"] for s in rs["sources"]]
    assert platforms == ["google", "superdoc", "facebook"], platforms


# ─────────────── 7. response excludes forbidden fields ───────────────


def test_07_no_review_text_or_raw_fields_leak(app):
    lead = _make_lead()
    f = _valid_google_fields(verified=True)
    # Try to inject toxic fields onto the clinic doc.
    f["review_text"] = "leaked text"
    f["reviewer_name"] = "John Doe"
    f["screenshot"] = "base64..."
    _make_clinic(review_fields=f)
    _, body = _get(app, lead)
    c = body["clinics"][0]
    rs = c["review_signals"]
    # Clinic object itself must not carry those keys.
    leaks = (set(c.keys()) | set(rs.keys())) & FORBIDDEN_SOURCE_KEYS
    assert not leaks, f"Forbidden keys leaked: {leaks}"
    # Sources must only have the 4 contract keys.
    src = rs["sources"][0]
    assert set(src.keys()) == {"platform", "rating", "review_count", "url"}, src
    # And nothing inside a source is a review text.
    for k in FORBIDDEN_SOURCE_KEYS:
        assert k not in src


# ─────────────── 8. no aggregate / trust score / ranking keys ───────────────


def test_08_no_aggregate_keys_anywhere(app):
    lead = _make_lead()
    _make_clinic(review_fields={
        **_valid_google_fields(verified=True),
        "superdoc_rating": 4.9, "superdoc_review_count": 41,
        "superdoc_profile_url": "https://superdoc.bg/x",
        "facebook_rating": 4.5, "facebook_review_count": 30,
        "facebook_page_url": "https://facebook.com/x",
    })
    _, body = _get(app, lead)
    c = body["clinics"][0]
    rs = c["review_signals"]
    for k in FORBIDDEN_TOP_KEYS:
        assert k not in c, f"Aggregate key {k!r} leaked into clinic object"
        assert k not in rs, f"Aggregate key {k!r} leaked into review_signals"
    # Hard: stringify the whole response and check none of the forbidden
    # words appear as JSON keys.
    import json
    blob = json.dumps(body)
    for k in ("trust_score", "combined_rating", "overall_score"):
        assert f'"{k}"' not in blob, f"{k} appeared as a JSON key in: {blob[:200]}"


# ─────────────── 9. review signals do NOT affect ranking ───────────────


def test_09_review_signals_do_not_change_order(app):
    """Two same-city, same-treatment clinics. Only difference is review
    signals. Order must be alphabetical by name (existing tiebreak).
    Pre-condition: tier is standard for both."""
    lead = _make_lead(city="sofia", treatment="aligners")

    _make_clinic(name="ZebraClinic", review_fields=None)
    _make_clinic(
        name="AppleClinic",
        review_fields={
            **_valid_google_fields(verified=True),
            "superdoc_rating": 5.0, "superdoc_review_count": 999,
            "superdoc_profile_url": "https://superdoc.bg/apple",
        },
    )

    _, body = _get(app, lead)
    names = [c["name"] for c in body["clinics"]]
    assert names == sorted(names), (
        f"Order changed because of review signals; got {names}"
    )


# ─────────────── 10. invalid rating bounds rejected by admin schema ───────────────


def test_10_admin_schema_rejects_invalid_rating_bounds():
    from schemas import ClinicAdminUpdate
    from pydantic import ValidationError

    # 5.1 above max.
    with pytest.raises(ValidationError):
        ClinicAdminUpdate(google_rating=5.1)
    # -0.1 below min.
    with pytest.raises(ValidationError):
        ClinicAdminUpdate(google_rating=-0.1)
    # Negative count.
    with pytest.raises(ValidationError):
        ClinicAdminUpdate(google_review_count=-1)
    # Way above max count.
    with pytest.raises(ValidationError):
        ClinicAdminUpdate(google_review_count=100_001)
    # URL too long.
    with pytest.raises(ValidationError):
        ClinicAdminUpdate(google_place_url="https://maps.google.com/" + ("a" * 600))

    # Sanity: valid values pass.
    m = ClinicAdminUpdate(
        google_rating=4.7,
        google_review_count=213,
        google_place_url="https://maps.google.com/?cid=1",
        review_sources_verified_by_admin=True,
    )
    assert m.google_rating == 4.7


# ─────────────── 11. missing URL hides source ───────────────


def test_11_missing_url_hides_source(app):
    lead = _make_lead()
    f = _valid_google_fields(verified=True)
    f["google_place_url"] = None
    _make_clinic(review_fields=f)
    _, body = _get(app, lead)
    assert "review_signals" not in body["clinics"][0]


def test_11b_missing_rating_hides_source(app):
    lead = _make_lead()
    f = _valid_google_fields(verified=True)
    f["google_rating"] = None
    _make_clinic(review_fields=f)
    _, body = _get(app, lead)
    assert "review_signals" not in body["clinics"][0]


# ─────────────── 12. standard clinic without review fields still works ───────────────


def test_12_standard_clinic_without_review_fields(app):
    lead = _make_lead()
    _make_clinic(review_fields=None)
    status, body = _get(app, lead)
    assert status == 200, body
    c = body["clinics"][0]
    assert "review_signals" not in c
    # Other contract fields must still be present.
    for k in ("id", "name", "city_name", "treatments",
              "reason", "response_expectation", "partner_tier"):
        assert k in c, f"missing core field {k!r}"


# ─────────────── 13. boolean rating/count rejected (no silent coercion) ───────────────


def test_13_boolean_values_rejected(app):
    """A `True` for `google_rating` must not coerce to 1.0; a `True` for
    `google_review_count` must not coerce to 1."""
    lead = _make_lead()
    _make_clinic(review_fields={
        "google_rating": True,
        "google_review_count": True,
        "google_place_url": "https://maps.google.com/?cid=1",
        "review_sources_verified_by_admin": True,
    })
    _, body = _get(app, lead)
    assert "review_signals" not in body["clinics"][0]
