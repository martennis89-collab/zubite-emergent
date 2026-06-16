"""Patient layer — P2: GET /api/leads/{lead_id}/recommended-clinics tests.

In-process ASGI tests covering the 13 cases enumerated in the P2 spec:

  1.  lead not found → 404
  2.  expired lead → 410
  3.  same-city + treatment match returns a clinic
  4.  only safe clinic fields are returned (forbidden-field allow-list)
  5.  inactive / paused / applicant clinics are excluded
  6.  supports both treatments_supported and treatments_offered
  7.  diagnostic_quiz / master_quiz falls back to city-based matching
  8.  returns fewer than 3 when only 1-2 suitable clinics exist
  9.  does NOT auto-fill with out-of-city clinics to reach 3
  10. 0 matches returns empty list + assisted_help_available=true + message
  11. deterministic order by score then name (alphabetical tiebreak)
  12. selection_rule shows view-up-to-3, request-call-from-1
  13. rate limit returns 429 after configured window
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

os.environ.setdefault("DB_NAME", "zubite_test_p2_reco")
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

# Stub out the storage layer (S3 etc.) before server import — same pattern
# used by the existing P2 E1 cookie test suite.
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
    """Wipe state between tests so each is independent."""
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
    """Insert a lead, return its id. Synchronous wrapper."""
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


def _make_clinic(
    *,
    name: str = "Test Clinic",
    city_slug: str = "sofia",
    city_name: str = "София",
    treatments_supported: list[str] | None = None,
    treatments_offered: list[str] | None = None,
    is_active: bool | None = True,
    clinic_status: str | None = None,
    status: str | None = None,
    extra: dict | None = None,
    schema: str = "legacy",
) -> str:
    """Insert a clinic doc with the requested shape. Returns its id.

    `schema='legacy'` → uses {name, city_slug, treatments_supported, is_active}.
    `schema='admin'`  → uses {clinic_name, city, treatments_offered, status, clinic_status}.
    """
    import database as _database
    cid = str(uuid.uuid4())
    if schema == "legacy":
        doc: dict = {
            "id": cid,
            "name": name,
            "city_slug": city_slug,
            "city_name": city_name,
            "treatments_supported": treatments_supported or [],
            "is_active": is_active if is_active is not None else True,
            "created_at": _now_iso(),
        }
    else:
        doc = {
            "id": cid,
            "clinic_name": name,
            "city": city_name,  # admin docs store free-text city
            "treatments_offered": treatments_offered or [],
            "status": status or "active",
            "clinic_status": clinic_status or "active_partner",
            "email": f"{cid[:8]}@example.com",
            "phone": "+359888000000",
            "password_hash": "x",
            "created_at": _now_iso(),
        }
        # Optional explicit override.
        if is_active is False:
            doc["is_active"] = False
    if extra:
        doc.update(extra)

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


# Forbidden-fields whitelist. The clinic dicts in the response MUST NOT
# contain any of these keys, even if upstream documents happen to have them.
FORBIDDEN_CLINIC_FIELDS = {
    "email",
    "phone",
    "password_hash",
    "notification_email",
    "owner_id",
    "subscription_status",
    "monthly_plan",
    "description",
    "internal_notes",
    "is_active",
    "status",
    "clinic_status",
    "_id",
    "address",
}

ALLOWED_CLINIC_FIELDS = {
    "id",
    "name",
    "city_name",
    "city_slug",
    "treatments",
    # Canonical going forward (Feb 2026 cleanup).
    "treatments_supported",
    "reason",
    "response_expectation",
    "partner_since_year",
    # Partner placement (P3.5 demo support).
    "partner_tier",
    "is_featured",
    "placement_label",
    "placement_disclosure",
    # External review signals (R1 — display-only, admin-gated).
    "review_signals",
    # Aligner brand chips (Feb 2026 — optional, omitted when no visible entries).
    "aligner_brands_supported",
    # Rich Profile (R1) — tier-gated public projection, optional.
    "clinic_profile",
    # Same-city flag (Feb 2026) — always True on /recommended-clinics since
    # backend filters out city-mismatch via score=-1. Surfaced so the patient
    # card can render the "В твоя град" chip without re-deriving on client.
    "same_city",
    # Care Pass participation (Feb 2026) — boolean. Drives the Care Pass chip
    # on participating clinics only. Never on every clinic.
    "care_pass_partner",
}


# ─────────────── 1. Lead not found ───────────────


def test_01_lead_not_found_returns_404(app):
    status, body = _get(app, "00000000-0000-0000-0000-000000000000")
    assert status == 404, body
    assert body.get("detail") == "Lead not found"


# ─────────────── 2. Expired lead window ───────────────


def test_02_expired_lead_returns_410(app):
    lead_id = _make_lead(age_days=15)  # > 7-day window
    status, body = _get(app, lead_id)
    assert status == 410, body
    assert "expired" in (body.get("detail") or "").lower()


# ─────────────── 3. Same-city + treatment match ───────────────


def test_03_same_city_and_treatment_match(app):
    _make_clinic(
        name="Sofia Aligners",
        city_slug="sofia",
        city_name="София",
        treatments_supported=["aligners"],
    )
    lead_id = _make_lead(city="sofia", treatment="aligners")
    status, body = _get(app, lead_id)
    assert status == 200, body
    assert body["clinic_count"] == 1
    c = body["clinics"][0]
    assert c["name"] == "Sofia Aligners"
    assert c["city_slug"] == "sofia"
    assert "aligners" in c["treatments"]
    # reason text reflects the treatment match (BG label).
    assert "алайнери" in c["reason"]


# ─────────────── 4. Field whitelist (no forbidden fields) ───────────────


def test_04_only_safe_clinic_fields_returned(app):
    # Seed a clinic with ALL the dangerous fields populated so that if the
    # projection ever widens we'll catch real values, not just absence.
    _make_clinic(
        name="Leaky Clinic",
        city_slug="sofia",
        treatments_supported=["aligners"],
        extra={
            "email": "leak@example.com",
            "phone": "+359000111222",
            "password_hash": "$2b$leak",
            "notification_email": "leak@notify.com",
            "owner_id": "leak-owner",
            "subscription_status": "active",
            "monthly_plan": "growth",
            "description": "internal-only blurb",
            "internal_notes": "leak-notes",
            "address": "leak-street 1",
        },
    )
    lead_id = _make_lead(city="sofia", treatment="aligners")
    status, body = _get(app, lead_id)
    assert status == 200
    assert body["clinic_count"] == 1
    c = body["clinics"][0]

    leaks = set(c.keys()) & FORBIDDEN_CLINIC_FIELDS
    assert not leaks, f"forbidden fields leaked: {leaks} item={c}"
    # Must contain only allowed fields.
    extra = set(c.keys()) - ALLOWED_CLINIC_FIELDS
    assert not extra, f"unexpected fields in clinic payload: {extra}"

    # No PII or attribution from lead either.
    assert "answers" not in body
    assert "patient_name" not in body
    assert "patient_phone" not in body
    assert "patient_email" not in body


# ─────────────── 5. Inactive / paused / applicant excluded ───────────────


def test_05_inactive_and_paused_clinics_excluded(app):
    # Legacy clinic flagged inactive.
    _make_clinic(
        name="Inactive Legacy",
        treatments_supported=["aligners"],
        is_active=False,
    )
    # Admin-style applicant.
    _make_clinic(
        name="Applicant Admin",
        treatments_offered=["aligners"],
        schema="admin",
        status="applicant",
        clinic_status="applicant",
    )
    # Admin-style suspended.
    _make_clinic(
        name="Suspended Admin",
        treatments_offered=["aligners"],
        schema="admin",
        status="suspended",
    )
    # One legitimate clinic so we know the endpoint isn't broken.
    _make_clinic(
        name="Active Legacy",
        treatments_supported=["aligners"],
    )
    lead_id = _make_lead()
    status, body = _get(app, lead_id)
    assert status == 200
    names = [c["name"] for c in body["clinics"]]
    assert names == ["Active Legacy"], f"unexpected names: {names}"


# ─── 6. Both treatments_supported AND treatments_offered are matched ───


def test_06_supports_both_treatment_field_names(app):
    # Legacy schema: treatments_supported.
    _make_clinic(
        name="Legacy Aligners",
        treatments_supported=["aligners"],
    )
    # Admin schema: treatments_offered. (Has city as free-text so we rely
    # on the city-name -> slug map inside the endpoint.)
    _make_clinic(
        name="Admin Aligners",
        treatments_offered=["aligners"],
        schema="admin",
    )
    lead_id = _make_lead(treatment="aligners")
    status, body = _get(app, lead_id)
    assert status == 200
    names = sorted(c["name"] for c in body["clinics"])
    assert names == ["Admin Aligners", "Legacy Aligners"]
    # Both should have aligners in their `treatments` union.
    for c in body["clinics"]:
        assert "aligners" in c["treatments"]


# ─────────────── 7. Broad treatment (diagnostic_quiz) → city only ───────────────


def test_07_master_quiz_treatment_falls_back_to_city(app):
    # Clinic in Sofia that does NOT explicitly list any matching treatment.
    _make_clinic(
        name="Sofia General",
        treatments_supported=["whitening"],  # unrelated treatment
    )
    # Out-of-city clinic that DOES list the treatment — must be excluded.
    _make_clinic(
        name="Plovdiv Aligners",
        city_slug="plovdiv",
        city_name="Пловдив",
        treatments_supported=["aligners"],
    )
    lead_id = _make_lead(treatment="master_quiz")
    status, body = _get(app, lead_id)
    assert status == 200
    assert body["clinic_count"] == 1
    assert body["clinics"][0]["name"] == "Sofia General"
    # Broad reason text — no specific treatment surfaced.
    assert "първа консултация" in body["clinics"][0]["reason"]


# ─── 8. Returns fewer than 3 when only 1-2 suitable clinics exist ───


def test_08_returns_fewer_than_three_if_pool_smaller(app):
    _make_clinic(
        name="Sofia One",
        treatments_supported=["aligners"],
    )
    _make_clinic(
        name="Sofia Two",
        treatments_supported=["aligners"],
    )
    lead_id = _make_lead(treatment="aligners")
    status, body = _get(app, lead_id)
    assert status == 200
    assert body["clinic_count"] == 2
    assert len(body["clinics"]) == 2
    assert body["fallback_used"] is False


# ─── 9. No auto-fill with out-of-city clinics to reach 3 ───


def test_09_no_auto_fill_with_out_of_city(app):
    _make_clinic(name="Sofia A", treatments_supported=["aligners"])
    # Three Plovdiv clinics that would otherwise be obvious "fillers".
    _make_clinic(name="Plovdiv X", city_slug="plovdiv",
                 city_name="Пловдив", treatments_supported=["aligners"])
    _make_clinic(name="Plovdiv Y", city_slug="plovdiv",
                 city_name="Пловдив", treatments_supported=["aligners"])
    _make_clinic(name="Plovdiv Z", city_slug="plovdiv",
                 city_name="Пловдив", treatments_supported=["aligners"])
    lead_id = _make_lead(city="sofia", treatment="aligners")
    status, body = _get(app, lead_id)
    assert status == 200
    names = [c["name"] for c in body["clinics"]]
    assert names == ["Sofia A"], f"unexpected names: {names}"
    assert body["fallback_used"] is False


# ─────────────── 10. 0 matches returns empty + assisted message ───────────────


def test_10_zero_matches_returns_empty_with_assisted_help(app):
    # Seed clinics only in other cities so the lead's city has nothing.
    _make_clinic(name="Burgas", city_slug="burgas",
                 city_name="Бургас", treatments_supported=["aligners"])
    lead_id = _make_lead(city="sofia", treatment="aligners")
    status, body = _get(app, lead_id)
    assert status == 200, body
    assert body["clinic_count"] == 0
    assert body["clinics"] == []
    assert body["fallback_used"] is False
    assert body["assisted_help_available"] is True
    assert "Zubite" in body.get("message", "")
    # selection_rule still echoed for client UI consistency.
    assert body["selection_rule"]["can_view_clinics"] == 3
    assert body["selection_rule"]["can_request_call_from_clinics"] == 1


# ─── 11. Deterministic order: score desc, then alphabetical asc ───


def test_11_deterministic_order(app):
    # Three clinics, all in sofia. Two match the treatment, one does not.
    _make_clinic(name="Beta Clinic", treatments_supported=["aligners"])
    _make_clinic(name="Alpha Clinic", treatments_supported=["aligners"])
    _make_clinic(name="Gamma Clinic", treatments_supported=["whitening"])
    lead_id = _make_lead(treatment="aligners")
    # Run twice to confirm determinism across calls.
    _, body1 = _get(app, lead_id)
    _, body2 = _get(app, lead_id)
    names1 = [c["name"] for c in body1["clinics"]]
    names2 = [c["name"] for c in body2["clinics"]]
    assert names1 == names2 == ["Alpha Clinic", "Beta Clinic", "Gamma Clinic"], (
        f"got names1={names1}, names2={names2}"
    )


# ─────────────── 12. selection_rule contract ───────────────


def test_12_selection_rule_present_and_correct(app):
    _make_clinic(name="X", treatments_supported=["aligners"])
    lead_id = _make_lead()
    status, body = _get(app, lead_id)
    assert status == 200
    sr = body["selection_rule"]
    assert sr == {
        "can_view_clinics": 3,
        "can_request_call_from_clinics": 1,
        "assisted_choice_available": True,
    }
    assert body["assisted_help_available"] is True


def test_12b_limit_param_clamped_to_three_max(app):
    for i in range(5):
        _make_clinic(
            name=f"Clinic {chr(ord('A')+i)}",
            treatments_supported=["aligners"],
        )
    lead_id = _make_lead()
    status, body = _get(app, lead_id, limit=10)
    # Even though caller asked for 10, max is 3.
    assert status == 200
    assert body["clinic_count"] == 3


# ─────────────── 13. Rate limit ───────────────


def test_13_rate_limit_eventually_returns_429(app):
    """The endpoint is limited to 30 / 300s per IP (per the rate_limit
    helper). After exhausting the budget we expect 429 on subsequent
    requests in the same window."""
    _make_clinic(name="Rate Clinic", treatments_supported=["aligners"])
    lead_id = _make_lead()

    async def burst():
        statuses = []
        async with _client(app) as c:
            for _ in range(32):
                r = await c.get(f"/api/leads/{lead_id}/recommended-clinics")
                statuses.append(r.status_code)
        return statuses

    statuses = _run(burst())
    # First ones must succeed; some later ones must be limited.
    assert statuses[0] == 200, statuses[:5]
    assert 429 in statuses, f"expected at least one 429, got {statuses}"


# ─────────────── 14. response_expectation copy is conservative ───────────────


def test_14_response_expectation_is_conservative(app):
    _make_clinic(name="Sofia Aligners", treatments_supported=["aligners"])
    lead_id = _make_lead()
    status, body = _get(app, lead_id)
    assert status == 200
    re_text = body["clinics"][0]["response_expectation"]
    # Must NOT promise an SLA in hours.
    forbidden_substrings = ["1 работен ден", "в рамките на", "1 час", "24 часа", "до 24"]
    for s in forbidden_substrings:
        assert s not in re_text, (
            f"response_expectation contains forbidden SLA text {s!r}: {re_text}"
        )
    # Must mention consent.
    assert "съгласие" in re_text


# ─────────────── 15. Lead with missing city → honest empty ───────────────


def test_15_lead_without_city_returns_empty(app):
    """Defensive case: if a lead somehow has no city_slug, the endpoint
    must not crash and must return the standard empty payload."""
    import database as _database
    lead_id = str(uuid.uuid4())
    _run(_database.db.leads.insert_one({
        "id": lead_id,
        "city_slug": "",
        "treatment_type": "aligners",
        "answers": {},
        "consent": False,
        "created_at": _now_iso(),
    }))
    _make_clinic(name="Sofia Aligners", treatments_supported=["aligners"])
    status, body = _get(app, lead_id)
    assert status == 200, body
    assert body["clinic_count"] == 0
    assert body["clinics"] == []
    assert body["assisted_help_available"] is True


# ════════════════════════════════════════════════════════════════
# P3.5 — Partner-tier / featured / premium placement support
# ════════════════════════════════════════════════════════════════

# Allowed values for `placement_label` and `placement_disclosure` text.
# These MUST be deterministic and match the BG copy in the endpoint.
_LABEL_PREMIUM = "Premium партньор"
_LABEL_FEATURED = "Представена клиника"
_DISC_PREMIUM = "Тази клиника има допълнителна партньорска видимост в Zubite."
_DISC_FEATURED = "Тази клиника е представена като партньор на Zubite."


# ─── 16. Standard clinic = default tier, no badge fields ───


def test_16_standard_clinic_has_no_placement_badge(app):
    _make_clinic(name="Plain Clinic", treatments_supported=["aligners"])
    lead_id = _make_lead()
    _, body = _get(app, lead_id)
    c = body["clinics"][0]
    assert c["partner_tier"] == "standard"
    assert c["is_featured"] is False
    assert c["placement_label"] is None
    assert c["placement_disclosure"] is None


# ─── 17. Premium clinic exposes Premium copy and is_featured=True ───


def test_17_premium_clinic_exposes_premium_copy(app):
    _make_clinic(
        name="Premium Clinic",
        treatments_supported=["aligners"],
        extra={"partner_tier": "premium"},
    )
    lead_id = _make_lead()
    _, body = _get(app, lead_id)
    c = body["clinics"][0]
    assert c["partner_tier"] == "premium"
    assert c["is_featured"] is True
    assert c["placement_label"] == _LABEL_PREMIUM
    assert c["placement_disclosure"] == _DISC_PREMIUM


# ─── 18. Featured clinic exposes Featured copy ───


def test_18_featured_clinic_exposes_featured_copy(app):
    _make_clinic(
        name="Featured Clinic",
        treatments_supported=["aligners"],
        extra={"partner_tier": "featured"},
    )
    lead_id = _make_lead()
    _, body = _get(app, lead_id)
    c = body["clinics"][0]
    assert c["partner_tier"] == "featured"
    assert c["is_featured"] is True
    assert c["placement_label"] == _LABEL_FEATURED
    assert c["placement_disclosure"] == _DISC_FEATURED


# ─── 19. Legacy boolean fields (is_premium/is_featured) are honored ───


def test_19_legacy_bool_fields_resolve_to_correct_tier(app):
    _make_clinic(
        name="Bool Premium",
        treatments_supported=["aligners"],
        extra={"is_premium": True},
    )
    _make_clinic(
        name="Bool Featured",
        treatments_supported=["aligners"],
        extra={"is_featured": True},
    )
    _make_clinic(name="Bool Plain", treatments_supported=["aligners"])
    lead_id = _make_lead()
    _, body = _get(app, lead_id)
    by_name = {c["name"]: c for c in body["clinics"]}
    assert by_name["Bool Premium"]["partner_tier"] == "premium"
    assert by_name["Bool Featured"]["partner_tier"] == "featured"
    assert by_name["Bool Plain"]["partner_tier"] == "standard"


# ─── 20. Premium clinic is still EXCLUDED if inactive ───


def test_20_premium_inactive_is_still_excluded(app):
    _make_clinic(
        name="Inactive Premium",
        treatments_supported=["aligners"],
        is_active=False,
        extra={"partner_tier": "premium"},
    )
    # Active control so the endpoint isn't trivially empty.
    _make_clinic(name="Active Plain", treatments_supported=["aligners"])
    lead_id = _make_lead()
    _, body = _get(app, lead_id)
    names = [c["name"] for c in body["clinics"]]
    assert names == ["Active Plain"], (
        f"premium tier must NOT override the inactive filter, got {names}"
    )


# ─── 21. Premium out-of-city clinic does NOT outrank eligible local ───


def test_21_premium_out_of_city_does_not_leak_into_results(app):
    # Plovdiv premium with treatment match — must NOT appear for Sofia lead.
    _make_clinic(
        name="Premium Plovdiv",
        city_slug="plovdiv", city_name="Пловдив",
        treatments_supported=["aligners"],
        extra={"partner_tier": "premium"},
    )
    # Local standard clinic without treatment match.
    _make_clinic(
        name="Standard Sofia",
        treatments_supported=["whitening"],
    )
    lead_id = _make_lead(city="sofia", treatment="aligners")
    _, body = _get(app, lead_id)
    names = [c["name"] for c in body["clinics"]]
    # Only the local Sofia clinic shows up; premium Plovdiv is filtered.
    assert names == ["Standard Sofia"], names


# ─── 22. Premium boost orders among otherwise-tied eligible clinics ───


def test_22_premium_boost_breaks_tie_among_eligible(app):
    # Three Sofia clinics, all with the same +50 treatment match.
    # Without tier boost the alphabetical tiebreak would order:
    #   A, B, C → A first.
    # With premium on C: C gets +8, so order is C, A, B.
    _make_clinic(name="A Std", treatments_supported=["aligners"])
    _make_clinic(name="B Std", treatments_supported=["aligners"])
    _make_clinic(
        name="C Premium",
        treatments_supported=["aligners"],
        extra={"partner_tier": "premium"},
    )
    lead_id = _make_lead(treatment="aligners")
    _, body = _get(app, lead_id)
    names = [c["name"] for c in body["clinics"]]
    assert names == ["C Premium", "A Std", "B Std"], names


# ─── 23. Premium boost CANNOT override a real treatment match ───


def test_23_premium_cannot_override_treatment_match(app):
    # Standard Sofia clinic WITH treatment match: score = 100 + 50 = 150.
    # Premium Sofia clinic WITHOUT treatment match: score = 100 + 0 + 8 = 108.
    # Standard must still rank first.
    _make_clinic(
        name="Sofia Treatment Match",
        treatments_supported=["aligners"],
    )
    _make_clinic(
        name="Sofia Premium Generic",
        treatments_supported=["whitening"],  # mismatch
        extra={"partner_tier": "premium"},
    )
    lead_id = _make_lead(treatment="aligners")
    _, body = _get(app, lead_id)
    names = [c["name"] for c in body["clinics"]]
    assert names == [
        "Sofia Treatment Match",
        "Sofia Premium Generic",
    ], (
        f"premium tier must not outrank a real treatment match: {names}"
    )


# ─── 24. Featured/sponsored_rank tiebreaks within the same score ───


def test_24_featured_rank_tiebreaks_within_same_score(app):
    # Two featured clinics with identical tier + treatment match.
    # `featured_rank: 1` should sort before `featured_rank: 2`.
    _make_clinic(
        name="Featured Two",
        treatments_supported=["aligners"],
        extra={"partner_tier": "featured", "featured_rank": 2},
    )
    _make_clinic(
        name="Featured One",
        treatments_supported=["aligners"],
        extra={"partner_tier": "featured", "featured_rank": 1},
    )
    lead_id = _make_lead(treatment="aligners")
    _, body = _get(app, lead_id)
    names = [c["name"] for c in body["clinics"]]
    assert names == ["Featured One", "Featured Two"], names


# ─── 25. Unsafe fields still NOT leaked even when placement is enabled ───


def test_25_no_unsafe_fields_leak_for_premium_clinic(app):
    _make_clinic(
        name="Leaky Premium",
        treatments_supported=["aligners"],
        extra={
            "partner_tier": "premium",
            "is_premium": True,
            "featured_rank": 1,
            "sponsored_rank": 0,
            # Real PII/financial fields — must not leak even on premium card.
            "email": "leak-premium@example.com",
            "phone": "+359000000000",
            "password_hash": "$2b$leak",
            "notification_email": "ops@leak.com",
            "owner_id": "owner-leak",
            "subscription_status": "active_premium",
            "monthly_plan": "growth",
            "description": "internal blurb",
        },
    )
    lead_id = _make_lead()
    _, body = _get(app, lead_id)
    c = body["clinics"][0]
    # Whitelist must hold.
    extra_keys = set(c.keys()) - ALLOWED_CLINIC_FIELDS
    assert not extra_keys, f"unexpected keys leaked on premium card: {extra_keys}"
    # Negative: no forbidden field in the dict.
    leaks = set(c.keys()) & FORBIDDEN_CLINIC_FIELDS
    assert not leaks, f"forbidden fields leaked: {leaks}"
    # featured_rank / sponsored_rank ARE used internally for sorting but
    # must NOT appear in the response payload (they're not whitelisted).
    assert "featured_rank" not in c
    assert "sponsored_rank" not in c


# ─── 26. Placement copy never contains forbidden marketing terms ───


def test_26_placement_copy_has_no_forbidden_marketing_terms(app):
    _make_clinic(
        name="Marketing Clinic",
        treatments_supported=["aligners"],
        extra={"partner_tier": "premium"},
    )
    lead_id = _make_lead()
    _, body = _get(app, lead_id)
    c = body["clinics"][0]
    forbidden = [
        "най-добра", "топ", "#1", "гарантирано", "проверено качество",
        "best", "guaranteed",
    ]
    for word in forbidden:
        assert word.lower() not in (c["placement_label"] or "").lower(), c
        assert word.lower() not in (c["placement_disclosure"] or "").lower(), c
        assert word.lower() not in (c["reason"] or "").lower(), c


# ─── 27. Deterministic order across repeated calls with tiers mixed ───


def test_27_deterministic_order_with_tiers(app):
    _make_clinic(
        name="Alpha Standard",
        treatments_supported=["aligners"],
    )
    _make_clinic(
        name="Bravo Featured",
        treatments_supported=["aligners"],
        extra={"partner_tier": "featured"},
    )
    _make_clinic(
        name="Charlie Premium",
        treatments_supported=["aligners"],
        extra={"partner_tier": "premium"},
    )
    lead_id = _make_lead(treatment="aligners")
    _, body1 = _get(app, lead_id)
    _, body2 = _get(app, lead_id)
    names1 = [c["name"] for c in body1["clinics"]]
    names2 = [c["name"] for c in body2["clinics"]]
    # premium first (+8), featured second (+5), standard third (+0).
    assert names1 == ["Charlie Premium", "Bravo Featured", "Alpha Standard"]
    assert names1 == names2
