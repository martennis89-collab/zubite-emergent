"""Public clinic directory — `/clinics` listing surface (Feb 2026).

Isolated from the quiz-driven `/results/[leadId]/clinics` flow. Reuses the
existing `clinics` collection as the single source of truth. No new tier
schema, no parallel lead endpoint.

Endpoints:
    GET  /api/public/clinics          — filtered list
    GET  /api/public/clinics/{slug_or_id}  — single profile

Contact submission is intentionally NOT a new endpoint — the public card
modal POSTs to the existing `POST /api/leads` with `source="clinic_card"`
or `"clinic_profile"` so the admin lead pipeline stays unified.
"""
from __future__ import annotations
import os
import re
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from database import db
from assessment_approaches import clean_assessment_approaches
from schemas import (
    PublicConsultationBookingCreate,
    ORIENTATION_BOOKING_ACTIVE_LOCK_STATUSES,
)
from orientation_access import get_online_orientation_access_status
from orientation_slots import (
    expire_pending_bookings,
    generate_slots_for_clinic,
    SLOT_HORIZON_DAYS,
)
from rate_limit import rate_limit

logger = logging.getLogger(__name__)

router = APIRouter()

# Online-orientation collections (reused — single source of truth).
SETTINGS_COL = "clinic_online_orientation_settings"
AVAIL_COL = "clinic_online_orientation_availability"
BOOKING_COL = "online_orientation_bookings"


def _demo_clinics_enabled() -> bool:
    """Demo/seed clinics are visible only when `ZUBITE_INCLUDE_DEMO_CLINICS`
    is explicitly set to a truthy value in the backend env. Production
    deployments leave this unset, so demo records stay hidden from real
    patient traffic and from Google crawls."""
    v = (os.environ.get("ZUBITE_INCLUDE_DEMO_CLINICS") or "").lower()
    return v in ("1", "true", "yes", "on")

# Mirror the existing tier mapping (no parallel schema introduced).
# Public labels per the Feb 2026 pricing revamp:
#   • Verified Profile — profile-only presence
#   • Growth Partner   — main partner package
#   • Strategic Partner — private tier, only surfaced when
#     `strategic_public_display=True` (admin-approved). "Authority
#     Partner" is NEVER shown publicly — legacy Authority clinics
#     were migrated to Growth Partner + strategic_private and their
#     historical label lives on `legacy_tier` for audit only.
# Legacy `partner_tier` keys are kept as a fallback while the DB
# still carries mixed data; `_public_label_for_clinic` prefers the
# new `base_package` + `founding_status` combo.
_PUBLIC_STATUS_LABEL = {
    "standard": "Verified Profile",
    "featured": "Growth Partner",
    "premium": "Growth Partner",   # legacy Authority → Growth publicly
}


def _public_label_for_clinic(clinic: dict) -> str:
    """Prefer canonical `base_package`; fall back to legacy tier."""
    from entitlements import public_partner_label
    return public_partner_label(clinic)


def _quick_booking_enabled(clinic: dict) -> bool:
    """Cheap derivation of `booking_enabled` for the public payload —
    read directly off `base_package` + any persisted admin override.
    Skips the add-on query (which is heavy) because no add-on in the
    Feb 2026 catalog toggles this entitlement on its own.
    """
    from entitlements import resolve_base_package
    bp = resolve_base_package(clinic)
    default = bp == "growth_partner"
    overrides = clinic.get("entitlement_overrides") or []
    for o in overrides:
        if isinstance(o, dict) and o.get("key") == "booking_enabled":
            return bool(o.get("value"))
    return default


# ─── Public entitlement projection ──────────────────────────────────
# WHY THIS EXISTS: the public profile used to decide which sections to
# render by sniffing the legacy `partner_tier` string. That field is not
# written from the canonical `base_package` (the legacy mapping is
# one-way, on read), so every clinic created after the Feb-2026 revamp
# arrives here with no `partner_tier`, gets defaulted to "standard" below
# in `_public_clinic_payload`, and rendered as a minimum profile — even a
# Growth Partner paying full price. These flags come from
# `entitlements.py`, the actual source of truth, so the page renders what
# the clinic is entitled to.
#
# Only the render-relevant subset is exposed. Commercial entitlements
# (analytics_dashboard, monthly_mini_report, care_pass_access, partner
# offers, beta access…) are clinic-private and must never ship in a
# public payload.
_PUBLIC_ENTITLEMENT_KEYS = (
    "enhanced_clinic_profile",
    "structured_trust_signals",
    "treatment_service_map",
    "max_treatment_sections",
    # Gates the "Message this clinic" chat CTA. Independent of
    # `viber_phone` presence below — a clinic can have chat without a
    # Viber number configured, so the frontend must check this flag
    # rather than infer chat availability from the Viber field.
    "patient_chat_channels",
)


def _resolve_base_package(clinic: dict) -> str:
    """Canonical package for a clinic, resolving legacy `partner_tier`."""
    from entitlements import resolve_base_package
    return resolve_base_package(clinic)


def _public_entitlements(clinic: dict) -> dict:
    """Public-safe entitlement projection for the profile renderer.

    Same trade-off as `_quick_booking_enabled`: derive from
    `base_package` + persisted admin overrides and skip the per-request
    add-on query, since no add-on in the current catalog toggles these
    keys on its own.
    """
    from entitlements import (
        default_entitlements,
        resolve_base_package,
        apply_admin_overrides,
    )

    base = default_entitlements(resolve_base_package(clinic))
    final = apply_admin_overrides(base, clinic.get("entitlement_overrides"))

    out = {k: final.get(k) for k in _PUBLIC_ENTITLEMENT_KEYS}
    # Collapse the tri-state values ("true_when_suitable") to plain bools
    # so the frontend never has to know about the internal encoding.
    out["case_library_eligibility"] = bool(final.get("case_library_eligibility"))
    out["expert_qa"] = bool(final.get("expert_qa_interview_every_six_months"))
    return out


# ─── Chat presence ("Онлайн сега" / "Приема онлайн консултации") ────
#
# Deliberately NOT a strict "is someone staring at the screen right this
# second" signal — that would need a heartbeat we don't have, and a
# false "offline" the instant a clinic looks away would undersell a
# clinic that responds within minutes of the notification email. Instead
# this reuses the debounced `last_seen_at` that `_validate_auth_session`
# (auth.py) already stamps on every authenticated clinic request,
# treating "active within the last 15 minutes" as "online" and anything
# entitled-but-quieter as "accepting" — true either way, never a claim
# nobody could back up if a patient asked.
_PRESENCE_WINDOW_MINUTES = 15


async def _compute_online_clinic_ids(clinic_ids: list) -> set:
    """One query for a whole page of clinics — never N+1 per listing row.

    `auth_sessions` rows are never purged once expired, so a clinic
    accumulates them indefinitely. A `.to_list(small_fixed_cap)` with no
    sort — the first version of this function — could silently drop the
    one row that's actually still fresh once a clinic has enough
    historical logins: Mongo doesn't return matches in insertion order,
    so truncation has no guarantee of keeping the recent ones. Filtering
    `expires_at` server-side shrinks the accumulated backlog first (a JWT
    is only valid for `JWT_EXPIRATION_HOURS`, hours away from "now" —
    plenty of margin for the microsecond-formatting quirk below to not
    matter here), then sorting newest-first makes any remaining cap safe.

    The actual 15-minute presence cutoff is still checked by parsing
    `last_seen_at` in Python, not via a second Mongo range query:
    `datetime.isoformat()` omits the microsecond fraction when it happens
    to be exactly zero, which would make a naive string `$gte` comparison
    silently misorder rows THAT close together. `_validate_auth_session`
    parses the same field the same way for the same reason.
    """
    if not clinic_ids:
        return set()
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=_PRESENCE_WINDOW_MINUTES)
    rows = await db.auth_sessions.find(
        {
            "user_type": "clinic",
            "user_id": {"$in": clinic_ids},
            "revoked_at": None,
            "expires_at": {"$gte": now.isoformat()},
        },
        {"_id": 0, "user_id": 1, "last_seen_at": 1},
    ).sort("last_seen_at", -1).to_list(1000)
    online = set()
    for row in rows:
        raw = row.get("last_seen_at")
        try:
            seen_at = datetime.fromisoformat(raw) if isinstance(raw, str) else None
            if seen_at and seen_at.tzinfo is None:
                seen_at = seen_at.replace(tzinfo=timezone.utc)
        except Exception:
            seen_at = None
        if seen_at and seen_at >= cutoff:
            online.add(row["user_id"])
    return online


def _chat_presence(clinic: dict, entitlements: dict, online_ids: set) -> Optional[str]:
    """Returns 'online' | 'accepting' | None. None means: don't render a
    chat-presence badge for this clinic at all (not entitled)."""
    if not entitlements.get("patient_chat_channels"):
        return None
    return "online" if clinic.get("id") in online_ids else "accepting"


def _public_viber_phone(clinic: dict) -> Optional[str]:
    """The clinic's Viber number, only when it should actually be shown.

    Resolved server-side rather than shipping the flags and letting the
    renderer decide: the number is only published when the package grants
    the channel AND the clinic switched it on, so a downgrade stops
    publishing it without anyone editing the frontend.
    """
    from entitlements import (
        default_entitlements,
        resolve_base_package,
        apply_admin_overrides,
    )

    number = (clinic.get("viber_phone") or "").strip()
    if not number or not clinic.get("viber_enabled"):
        return None
    base = default_entitlements(resolve_base_package(clinic))
    final = apply_admin_overrides(base, clinic.get("entitlement_overrides"))
    return number if final.get("patient_chat_channels") else None

# Statuses considered safe for public display. `active_partner` is a fully
# onboarded clinic. `evaluation_partner` is a vetted pilot clinic and is
# included by design (per agreed scope §1).
_PUBLIC_STATUSES = ("active_partner", "evaluation_partner")


def _public_visibility_query() -> dict[str, Any]:
    """Return the shared visibility predicate for every public surface."""
    query: dict[str, Any] = {
        "clinic_status": {"$in": list(_PUBLIC_STATUSES)},
        "archived": {"$ne": True},
        # Legacy partner records may not have this field yet. Only an
        # explicit false value makes a clinic inactive.
        "is_active": {"$ne": False},
        "is_addons_showcase": {"$ne": True},
    }
    if not _demo_clinics_enabled():
        query["is_demo"] = {"$ne": True}
    return query


_SPECIALTY_GROUPS: dict[str, tuple[str, ...]] = {
    "orthodontics": (
        "orthodontics", "ortho", "ortodontia", "ortodontiya",
        "invisalign", "aligners", "braces", "breketi",
    ),
    "implants": (
        "implants", "implantologia", "dentalni_implanti",
        "dentalni-implanti",
    ),
    "cosmetic": (
        "cosmetic", "aesthetic", "estetichna_stomatologia",
        "estetichna-stomatologia", "veneers", "whitening", "bonding",
    ),
}


def _specialty_values(specialty: str | None) -> tuple[str, ...]:
    key = (specialty or "").strip().lower()
    if not key:
        return ()
    return _SPECIALTY_GROUPS.get(key, (key,))

_CYR_TRANSLIT = str.maketrans(
    {
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e",
        "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l",
        "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s",
        "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts", "ч": "ch",
        "ш": "sh", "щ": "sht", "ъ": "a", "ь": "", "ю": "yu", "я": "ya",
    }
)


def slugify_clinic(name: str | None) -> str:
    """Deterministic clinic slug derived from name. Returns the empty
    string if the name is None — caller should fall back to clinic id."""
    if not name:
        return ""
    s = name.lower().translate(_CYR_TRANSLIT)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def _bool_filter(q: Optional[str]) -> Optional[bool]:
    if q is None:
        return None
    return q.lower() in ("1", "true", "yes", "on")


# Legacy admin-created clinics store only free-text `city` (BG or Latin
# name). Map to the canonical `city_slug` used across the platform. Kept
# in sync with `config.CITIES` — extend both together.
_CITY_NAME_TO_SLUG: dict[str, str] = {
    "sofia": "sofia", "софия": "sofia",
    "plovdiv": "plovdiv", "пловдив": "plovdiv",
    "varna": "varna", "варна": "varna",
    "burgas": "burgas", "бургас": "burgas",
    "ruse": "ruse", "русе": "ruse",
    "stara zagora": "stara-zagora", "stara-zagora": "stara-zagora",
    "стара загора": "stara-zagora",
    "pleven": "pleven", "плевен": "pleven",
    "sliven": "sliven", "сливен": "sliven",
    "dobrich": "dobrich", "добрич": "dobrich",
    "shumen": "shumen", "шумен": "shumen",
    "haskovo": "haskovo", "хасково": "haskovo",
}


def resolve_city_slug(clinic: dict) -> Optional[str]:
    """Return the clinic's `city_slug` if present, otherwise map the
    free-text `city` (BG or Latin) to a canonical slug. Returns None
    when neither field can be resolved."""
    slug = clinic.get("city_slug")
    if isinstance(slug, str) and slug.strip():
        return slug.strip().lower()
    city = (clinic.get("city") or "").strip().lower()
    if not city:
        return None
    return _CITY_NAME_TO_SLUG.get(city)


def _public_clinic_payload(clinic: dict, online_ids: Optional[set] = None) -> dict:
    """Build a safe, marketing-honest public payload from a clinic doc.

    Never claims "best", never fakes review data, never invents online
    consultation. Fields absent from the doc are simply omitted.

    `online_ids` is precomputed ONCE per request by the caller
    (`_compute_online_clinic_ids`) — never queried per-clinic here, which
    would turn a listing page into an N+1 auth_sessions lookup.
    """
    tier_raw = (clinic.get("partner_tier") or "standard").lower()
    tier = tier_raw if tier_raw in _PUBLIC_STATUS_LABEL else "standard"
    profile = clinic.get("clinic_profile") or {}
    # Entitlement-derived render flags — the canonical gate. See
    # `_public_entitlements` for why `tier` above must not be used for this.
    _ent = _public_entitlements(clinic)

    name = clinic.get("clinic_name") or clinic.get("name") or ""
    clinic_id = clinic.get("id")
    slug = slugify_clinic(name) or clinic_id or ""

    # Legacy admin-created docs may lack `city_slug`; derive from the
    # free-text `city` field so /clinics listing still surfaces them.
    city_slug_resolved = resolve_city_slug(clinic)

    # Review data is shown only when both rating AND count exist (per spec).
    review = None
    g_rating = clinic.get("google_rating")
    g_count = clinic.get("google_review_count")
    if isinstance(g_rating, (int, float)) and isinstance(g_count, int) and g_count > 0:
        review = {"rating": g_rating, "count": g_count, "source": "google"}
    elif isinstance(clinic.get("superdoc_rating"), (int, float)) and isinstance(
        clinic.get("superdoc_review_count"), int
    ) and clinic.get("superdoc_review_count", 0) > 0:
        review = {
            "rating": clinic.get("superdoc_rating"),
            "count": clinic.get("superdoc_review_count"),
            "source": "superdoc",
        }

    treatments = clinic.get("treatments_supported") or []
    assessment_approaches = (
        clean_assessment_approaches(profile.get("assessment_approaches"))
        if profile.get("profile_status") == "published"
        else []
    )

    # Growth trust signals are derived from validated source facts so they
    # cannot become stale free-text claims. A clinic founded this year has
    # zero completed years in business, which the frontend phrases as a new
    # practice rather than displaying "0 years".
    current_year = datetime.now(timezone.utc).year
    founded_year_raw = profile.get("founded_year")
    founded_year = (
        founded_year_raw
        if _ent.get("enhanced_clinic_profile")
        and isinstance(founded_year_raw, int)
        and not isinstance(founded_year_raw, bool)
        and 1900 <= founded_year_raw <= current_year
        else None
    )
    doctor_specialties_raw = profile.get("doctor_spotlight_specialties") or []
    if not isinstance(doctor_specialties_raw, list):
        doctor_specialties_raw = []
    doctor_specialties = [
        item.strip()
        for item in doctor_specialties_raw[:8]
        if isinstance(item, str) and item.strip() and len(item.strip()) <= 80
    ]
    doctor_kind = profile.get("doctor_spotlight_kind")
    if doctor_kind not in ("owner", "lead_doctor"):
        doctor_kind = "lead_doctor"

    # Defensive: derive a list of "why this clinic appears" reasons from
    # static clinic fields. No fake reasoning.
    why: list[str] = []
    if clinic.get("city_name"):
        why.append(f"Намира се в {clinic['city_name']}")
    if treatments:
        why.append("Предлага лечения, които съответстват на твоя интерес")
    if profile.get("profile_status") == "published":
        why.append("Има публикуван профил в Zubite")
    if clinic.get("review_sources_verified_by_admin"):
        why.append("Информацията за профила е прегледана от Zubite")
    if clinic.get("care_pass_partner"):
        why.append("Партньор по Zubite Care Pass")
    if clinic.get("online_consultation"):
        why.append("Предлага онлайн консултация")

    out: dict[str, Any] = {
        "id": clinic_id,
        "slug": slug,
        "name": name,
        "city_slug": city_slug_resolved,
        "city_name": clinic.get("city_name") or clinic.get("city"),
        "area": clinic.get("area"),
        "treatments": treatments,
        "specialties": clinic.get("specialties") or [],
        "assessment_approaches": assessment_approaches,
        "short_description": profile.get("short_description"),
        "patient_intro": profile.get("patient_intro"),
        "founded_year": founded_year,
        "years_in_business": current_year - founded_year if founded_year is not None else None,
        "treatment_focus": profile.get("treatment_focus") or [],
        # Growth-only aggregate experience. These clinic-declared totals are
        # intentionally separate from the consented public `case_library`.
        # Validate defensively here too: older rows may have bypassed the
        # current admin schema through a direct database import.
        "treatment_case_counts": [
            {
                "treatment": row.get("treatment").strip(),
                "completed_cases": row.get("completed_cases"),
                "as_of_year": (
                    row.get("as_of_year")
                    if isinstance(row.get("as_of_year"), int)
                    and not isinstance(row.get("as_of_year"), bool)
                    and 2000 <= row.get("as_of_year") <= datetime.now(timezone.utc).year
                    else None
                ),
            }
            for row in (profile.get("treatment_case_counts") or [])
            if isinstance(row, dict)
            and isinstance(row.get("treatment"), str)
            and row.get("treatment").strip()
            and isinstance(row.get("completed_cases"), int)
            and not isinstance(row.get("completed_cases"), bool)
            and 0 < row.get("completed_cases") <= 1_000_000
        ] if _ent.get("enhanced_clinic_profile") else [],
        "hero_image_url": profile.get("hero_image_url"),
        "doctor_spotlight_image_url": (
            profile.get("doctor_spotlight_image_url")
            if _ent.get("enhanced_clinic_profile")
            else None
        ),
        "team_image_url": profile.get("team_image_url"),
        "environment_image_url": profile.get("environment_image_url"),
        "best_for": clinic.get("best_for") or profile.get("treatment_focus") or [],
        "not_ideal_for": clinic.get("not_ideal_for") or [],
        "why_this_clinic_appears": why,
        # Trust flags — only `True` is rendered as a badge by the FE.
        "online_consultation": bool(clinic.get("online_consultation")),
        "online_consultation_label": clinic.get("online_consultation_label"),
        "care_pass_partner": bool(clinic.get("care_pass_partner")),
        "accepts_adults": clinic.get("accepts_adults"),
        "accepts_children": clinic.get("accepts_children"),
        "profile_information_reviewed": bool(
            clinic.get("review_sources_verified_by_admin")
        ),
        # Tier (public label only).
        "partner_tier": tier,
        "public_status_label": _public_label_for_clinic(clinic),
        # NEW canonical field — always safe to render. Returns the
        # RESOLVED package, not the raw column: legacy clinics carry only
        # `partner_tier` until the startup backfill reaches them, and the
        # frontend must not have to know that. `resolve_base_package`
        # applies LEGACY_PARTNER_TIER_TO_BASE_PACKAGE for those.
        "base_package": _resolve_base_package(clinic),
        # Feb 2026 booking engine — cheap derived flag so the FE can
        # conditionally show the "Запази консултация" CTA. We don't
        # inline the addons check here (that costs another query per
        # public request); we rely on the derived `booking_enabled`
        # coming from the pre-migrated base_package + any admin
        # override persisted in `entitlement_overrides` on the clinic
        # doc itself.
        "booking_enabled": _quick_booking_enabled(clinic),
        # Present only when the package grants the channel and the clinic
        # switched it on — see `_public_viber_phone`. Null means "do not
        # render a Viber CTA", with no flags for the frontend to combine.
        "viber_phone": _public_viber_phone(clinic),
        # 'online' | 'accepting' | null — see `_chat_presence`.
        "chat_presence": _chat_presence(clinic, _ent, online_ids or set()),
        # Canonical, entitlement-derived render flags. The frontend gates
        # sections on these — NOT on `partner_tier` above, which is a
        # legacy audit field and is "standard" for every post-revamp clinic.
        "entitlements": _ent,
        "review": review,
        # Optional rich profile (for the public profile page).
        "long_description": profile.get("clinic_story"),
        "consultation_process": profile.get("consultation_process"),
        "environment_description": profile.get("environment_description"),
        "philosophy": profile.get("philosophy"),
        "doctor_spotlight": (
            {
                "name": profile.get("doctor_spotlight_name"),
                "kind": doctor_kind,
                "role": profile.get("doctor_spotlight_role"),
                "specialties": doctor_specialties,
                "bio": profile.get("doctor_spotlight_bio"),
            }
            if _ent.get("enhanced_clinic_profile") and profile.get("doctor_spotlight_name")
            else None
        ),
        "team_note": profile.get("team_note"),
        "clinic_video_url": profile.get("clinic_video_url"),
        "doctor_video_url": profile.get("doctor_video_url"),
        # Enrichment fields. Storage is tier-agnostic (so a downgrade
        # preserves data), which means gating cannot be left to the
        # frontend alone: an un-entitled clinic's paid-tier content would
        # still sit in the JSON for anyone reading the network tab. These
        # are emptied server-side when the clinic is not entitled.
        "technology_section": profile.get("technology_section") or [],
        "expert_qa": (profile.get("expert_qa") or []) if _ent.get("expert_qa") else [],
        "faq": profile.get("faq") or [],
        "category_authority": profile.get("category_authority"),
        "price_ranges": profile.get("price_ranges") or [],
        "treatment_details": profile.get("treatment_details") or {},
        "case_library": [
            {
                "id": c.get("id"),
                "title": c.get("title"),
                "category": c.get("category"),
                "summary": c.get("summary"),
                # Revamp fields (Feb 2026) — surfaced when present.
                "treatment_type": c.get("treatment_type") or None,
                "duration": c.get("duration") or None,
                "price": c.get("price") or None,
                "materials": c.get("materials") or None,
                "specifics": c.get("specifics") or None,
                "before_images": [u for u in (c.get("before_images") or []) if isinstance(u, str) and u.strip()],
                "after_images": [u for u in (c.get("after_images") or []) if isinstance(u, str) and u.strip()],
            }
            for c in (profile.get("case_library") or [])
            # Only consent-confirmed cases reach the public payload.
            if c.get("consent_confirmed") and c.get("status") == "published"
        ] if _ent.get("case_library_eligibility") else [],
        "profile_published_at": profile.get("published_at"),
        # Phase C1 — sponsorship + demo flags (FE consumes them
        # respectively for the "Спонсорирано" badge and the demo
        # banner + noindex meta).
        "is_sponsored": bool(clinic.get("is_sponsored")),
        "sponsored_label": clinic.get("sponsored_label") or None,
        "is_demo": bool(clinic.get("is_demo")),
        "is_addons_showcase": bool(clinic.get("is_addons_showcase")),
    }
    return out


def _ranking_score(clinic: dict, specialty: str | None) -> tuple:
    """Sort key used for organic ranking (NOT for sponsored placement).
    Tier boost is small and intentionally below treatment relevance."""
    tier = (clinic.get("partner_tier") or "standard").lower()
    tier_boost = {"premium": 3, "featured": 2, "standard": 1}.get(tier, 0)
    treatments = clinic.get("treatments_supported") or []
    accepted_specialties = set(_specialty_values(specialty))
    has_specialty = bool(accepted_specialties.intersection(treatments))
    profile_complete = (clinic.get("clinic_profile") or {}).get("profile_status") == "published"
    # Higher tuple = better. Python sorts ascending by default → negate.
    return (
        -(1 if has_specialty else 0),
        -(1 if profile_complete else 0),
        -tier_boost,
        clinic.get("name") or "",
    )


@router.get("/public/clinics")
async def list_public_clinics(
    city: Optional[str] = Query(default=None, max_length=80),
    specialty: Optional[str] = Query(default=None, max_length=80),
    online_consultation: Optional[str] = Query(default=None),
    care_pass: Optional[str] = Query(default=None),
    accepts_adults: Optional[str] = Query(default=None),
    accepts_children: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
):
    query = _public_visibility_query()
    if city:
        # Match both canonical slug and free-text (BG/Latin) forms so
        # legacy admin-created docs are included. Case-insensitive on
        # the free-text `city` because admin input may be capitalised.
        city_l = city.lower()
        matching_free_text = [
            k for k, v in _CITY_NAME_TO_SLUG.items() if v == city_l
        ]
        or_clauses: list[dict[str, Any]] = [{"city_slug": city_l}]
        for ft in matching_free_text:
            or_clauses.append(
                {"city": {"$regex": f"^{re.escape(ft)}$", "$options": "i"}}
            )
        query["$or"] = or_clauses
    if specialty:
        values = _specialty_values(specialty)
        query["treatments_supported"] = (
            values[0] if len(values) == 1 else {"$in": list(values)}
        )
    if _bool_filter(online_consultation) is True:
        query["online_consultation"] = True
    if _bool_filter(care_pass) is True:
        query["care_pass_partner"] = True
    if _bool_filter(accepts_adults) is True:
        query["accepts_adults"] = True
    if _bool_filter(accepts_children) is True:
        query["accepts_children"] = True

    docs = await db.clinics.find(query, {"_id": 0}).to_list(limit)
    docs.sort(key=lambda c: _ranking_score(c, (specialty or "").lower() or None))
    # One query for the whole page's presence, not one per card.
    online_ids = await _compute_online_clinic_ids([d.get("id") for d in docs if d.get("id")])
    payloads = [_public_clinic_payload(c, online_ids) for c in docs]
    # Drop entries that have no resolvable name or city — the frontend
    # route `/clinics/[city]/[specialty]/[slug]` can't handle either.
    payloads = [p for p in payloads if p.get("name") and p.get("city_slug")]
    return {
        "clinics": payloads,
        "total": len(payloads),
        "ranking_note": (
            "Клиниките се подреждат според релевантност към избраната категория, "
            "локация, профилна пълнота и Zubite доверителни сигнали. "
            "Спонсорираното позициониране не влияе на органичното подреждане."
        ),
    }


@router.get("/public/clinics/{slug_or_id}")
async def get_public_clinic(slug_or_id: str):
    """Lookup by slug (slugified from name) OR by clinic id (UUID). Returns
    only clinics in a public-displayable status."""
    base = _public_visibility_query()
    # Try id match first (fast index).
    doc = await db.clinics.find_one({**base, "id": slug_or_id}, {"_id": 0})
    if not doc:
        # Scan-then-match-by-derived-slug. Acceptable at ≤100 active clinics.
        async for c in db.clinics.find(base, {"_id": 0}):
            name = c.get("clinic_name") or c.get("name") or ""
            if not name:
                continue
            if slugify_clinic(name) == slug_or_id:
                doc = c
                break
    if not doc:
        raise HTTPException(status_code=404, detail={
            "code": "clinic_not_found",
            "message": "Clinic not found or not publicly listed.",
        })
    online_ids = await _compute_online_clinic_ids([doc["id"]])
    return _public_clinic_payload(doc, online_ids)



# ─── Public Consultation Scheduler (Phase A — clinic profile) ─────
# Lets a patient on the public clinic profile request a phone
# consultation directly, without going through the quiz funnel. Reuses
# the existing slot engine + booking state machine; auto-creates a
# minimal lead with strict labels so admin / clinic can filter
# scheduler-originated traffic away from quiz-qualified leads.

_PUBLIC_SCHEDULER_LEAD_LABELS = {
    "lead_source": "clinic_profile_scheduler",
    "lead_type": "phone_consultation_booking",
    "qualification_source": "public_profile",
    "is_quiz_qualified": False,
    "consultation_type": "phone_consultation",
}


async def _load_clinic_for_public_scheduler(clinic_id: str) -> dict:
    base = {**_public_visibility_query(), "id": clinic_id}
    doc = await db.clinics.find_one(base, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(
            status_code=404,
            detail={"code": "clinic_not_found",
                    "message": "Clinic not found or not publicly listed."},
        )
    return doc


async def _scheduler_state_for_clinic(clinic: dict) -> tuple[str, Optional[dict], list[dict]]:
    """Return (state, settings_doc, availability_rows).

    state ∈ {"disabled", "enabled_no_slots", "available"} — slots are NOT
    generated here for the "disabled" case to keep the path cheap.
    """
    settings = await db.get_collection(SETTINGS_COL).find_one(
        {"clinic_id": clinic["id"]}, {"_id": 0},
    )
    access = get_online_orientation_access_status(clinic, settings or {})
    if access["status"] not in ("included_in_plan", "addon_enabled"):
        return ("disabled", settings, [])
    avail = await db.get_collection(AVAIL_COL).find(
        {"clinic_id": clinic["id"]}, {"_id": 0},
    ).to_list(200)
    return ("available", settings, avail)


@router.get("/public/clinics/{clinic_id}/availability")
async def public_clinic_availability(
    clinic_id: str,
    type: str = Query(default="phone_consultation", max_length=40),
):
    """Public availability for a single clinic. Currently only
    `type=phone_consultation` is supported. Returns one of three
    states so the frontend can render the matching UI without
    leaking internal booking data."""
    if type != "phone_consultation":
        raise HTTPException(
            status_code=400,
            detail={"code": "unsupported_type",
                    "message": "Only `phone_consultation` is supported."},
        )
    clinic = await _load_clinic_for_public_scheduler(clinic_id)
    state, settings, avail = await _scheduler_state_for_clinic(clinic)
    base_resp: dict[str, Any] = {
        "clinic_id": clinic_id,
        "consultation_type": "phone_consultation",
        "state": state,
        "slots": [],
        "slot_duration_minutes": int((settings or {}).get("slot_duration_minutes") or 20),
        "disclaimer_text": (settings or {}).get("disclaimer_text") or None,
        "public_description": (settings or {}).get("public_description") or None,
    }
    if state == "disabled":
        return base_resp
    slots = await generate_slots_for_clinic(
        db, clinic_id, settings or {}, avail,
        horizon_days=SLOT_HORIZON_DAYS, max_slots=24,
    )
    if not slots:
        base_resp["state"] = "enabled_no_slots"
        return base_resp
    # Strip the engine-internal `clinic_id` echo from each slot to keep
    # the public payload small (caller already has clinic_id).
    base_resp["slots"] = [
        {k: v for k, v in s.items() if k != "clinic_id"} for s in slots
    ]
    return base_resp


@router.post(
    "/public/consultation-bookings",
    dependencies=[Depends(rate_limit("public_consult_book", 10, 600))],
)
async def public_create_consultation_booking(
    payload: PublicConsultationBookingCreate,
    request: Request,
):
    """Auto-create a minimal lead and a phone-consultation booking on a
    public clinic profile. NEVER claims the slot is confirmed — the
    booking starts in `pending_clinic_confirmation` and the clinic must
    confirm it just like any other orientation booking."""
    if not payload.consent:
        raise HTTPException(
            status_code=422,
            detail={"code": "consent_required",
                    "message": "Моля, потвърди съгласието си преди да изпратиш заявката."},
        )
    if not payload.disclaimer_acknowledged:
        raise HTTPException(
            status_code=422,
            detail={"code": "disclaimer_required",
                    "message": "Моля, потвърди, че телефонният разговор е насочваща стъпка, не диагноза."},
        )

    clinic = await _load_clinic_for_public_scheduler(payload.clinic_id)
    state, settings, _avail = await _scheduler_state_for_clinic(clinic)
    if state == "disabled":
        raise HTTPException(
            status_code=400,
            detail={"code": "clinic_scheduler_disabled",
                    "message": "Тази клиника не приема онлайн заявки в момента."},
        )

    # Parse + normalise scheduled_at to UTC ISO so the active-lock check
    # uses the exact same key the slot engine emits.
    try:
        slot_dt = datetime.fromisoformat(payload.scheduled_at.replace("Z", "+00:00"))
        if slot_dt.tzinfo is None:
            slot_dt = slot_dt.replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(
            status_code=422,
            detail={"code": "invalid_scheduled_at",
                    "message": "Невалиден формат на избрания час."},
        )
    slot_iso = slot_dt.astimezone(timezone.utc).isoformat()

    # Lazy-expire stale pending bookings for this clinic so the lock
    # check below sees the current truth.
    await expire_pending_bookings(db, clinic_id=clinic["id"])
    locked = await db.get_collection(BOOKING_COL).find_one({
        "clinic_id": clinic["id"],
        "scheduled_at": slot_iso,
        "status": {"$in": list(ORIENTATION_BOOKING_ACTIVE_LOCK_STATUSES)},
    }, {"_id": 0, "id": 1})
    if locked:
        raise HTTPException(
            status_code=409,
            detail={"code": "slot_already_locked",
                    "message": "Този час е вече зает. Моля, избери друг."},
        )

    # ─── Auto-create minimal lead with strict scheduler labels ─────
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    treatments = clinic.get("treatments_supported") or []
    lead_id = str(uuid.uuid4())
    lead_doc: dict[str, Any] = {
        "id": lead_id,
        "created_at": now_iso,
        "updated_at": now_iso,
        "city_slug": clinic.get("city_slug") or "unknown",
        "treatment_type": (treatments[0] if treatments else "general_orientation"),
        "answers": {},
        "score_total": 0,
        "band": "UNKNOWN",
        "status": "NEW",
        "name": payload.name,
        "phone": payload.phone,
        "email": payload.email,
        "consent": True,
        # MVP unlock flags — contact submitted → result unlocked. Care
        # Pass stays locked until the clinic confirms the consultation
        # (same invariant as quiz-driven leads).
        "contact_details_submitted": True,
        "contact_details_submitted_at": now_iso,
        "full_result_unlocked": True,
        # Care Pass eligibility mirrors the clinic's actual Care Pass
        # partner status — never auto-True for clinics that don't run
        # the program. Care Pass still stays LOCKED until the clinic
        # confirms the consultation (Phase F invariant).
        "care_pass_eligible": bool(clinic.get("care_pass_partner")),
        "care_pass_unlocked": False,
        "consultation_booked_through_zubite": True,
        # Strict labels — see _PUBLIC_SCHEDULER_LEAD_LABELS.
        **_PUBLIC_SCHEDULER_LEAD_LABELS,
        "clinic_id": clinic["id"],
        # The clinic-facing dashboard (`GET /clinic/leads`, `GET
        # /clinic/dashboard`) filters exclusively on `assigned_clinic_id`,
        # never `clinic_id`. A patient booking a slot straight from this
        # clinic's own public profile has already made an explicit choice —
        # no admin triage needed — so assign immediately rather than
        # leaving the lead invisible to the clinic until someone notices.
        "assigned_clinic_id": clinic["id"],
        "source": "clinic_profile_scheduler",
        "source_path": payload.source_path,
        # Attribution (best-effort).
        "utm_source": payload.utm_source,
        "utm_campaign": payload.utm_campaign,
        "first_utm_source": payload.utm_source,
        "first_utm_campaign": payload.utm_campaign,
        "first_lead_source_type": "clinic_profile_scheduler",
        "latest_utm_source": payload.utm_source,
        "latest_utm_campaign": payload.utm_campaign,
        "latest_lead_source_type": "clinic_profile_scheduler",
    }
    try:
        await db.leads.insert_one({**lead_doc})
    except Exception as exc:
        logger.exception(f"public scheduler lead insert failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail={"code": "lead_create_failed",
                    "message": "Неуспешно създаване на заявката. Опитай отново."},
        )

    # ─── Insert booking row in the existing collection ─────────────
    duration = int((settings or {}).get("slot_duration_minutes") or 20)
    booking_id = str(uuid.uuid4())
    expires_at = (now + timedelta(hours=24)).isoformat()
    booking_doc: dict[str, Any] = {
        "id": booking_id,
        "clinic_id": clinic["id"],
        "lead_id": lead_id,
        "patient_name": payload.name,
        "patient_phone": payload.phone,
        "patient_email": payload.email,
        # Topic isn't asked on the public profile — record the
        # consultation_type so admin can distinguish phone-scheduler
        # bookings from quiz-driven orientation bookings.
        "topic": "not_sure",
        "consultation_type": "phone_consultation",
        "treatment_category": None,
        "scheduled_at": slot_iso,
        "duration_minutes": duration,
        "status": "pending_clinic_confirmation",
        "quiz_summary": None,
        "internal_clinic_note": None,
        "patient_note": payload.patient_note,
        "clinic_confirmed_at": None,
        "confirmed_by_clinic_user_id": None,
        "expires_at": expires_at,
        "expired_at": None,
        "created_at": now_iso,
        "updated_at": now_iso,
        # Source labels — mirror the lead's strict tags on the booking
        # so clinic dashboard / admin queue can filter without joining.
        "lead_source": "clinic_profile_scheduler",
        "qualification_source": "public_profile",
        "is_quiz_qualified": False,
        "source_path": payload.source_path,
    }
    await db.get_collection(BOOKING_COL).insert_one({**booking_doc})

    return {
        "booking": {
            "id": booking_id,
            "clinic_id": clinic["id"],
            "lead_id": lead_id,
            "status": "pending_clinic_confirmation",
            "consultation_type": "phone_consultation",
            "scheduled_at": slot_iso,
            "duration_minutes": duration,
            "expires_at": expires_at,
            "created_at": now_iso,
        },
        "message": "Заявката е изпратена. Клиниката ще потвърди часа.",
    }
