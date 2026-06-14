"""Public clinic directory — `/kliniki` listing surface (Feb 2026).

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
import re
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query

from database import db

router = APIRouter()

# Mirror the existing tier mapping (no parallel schema introduced).
_PUBLIC_STATUS_LABEL = {
    "standard": "Zubite Listed",
    "featured": "Zubite Partner",
    "premium": "Zubite Featured Partner",
}

# Statuses considered safe for public display. `active_partner` is a fully
# onboarded clinic. `evaluation_partner` is a vetted pilot clinic and is
# included by design (per agreed scope §1).
_PUBLIC_STATUSES = ("active_partner", "evaluation_partner")

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


def _public_clinic_payload(clinic: dict) -> dict:
    """Build a safe, marketing-honest public payload from a clinic doc.

    Never claims "best", never fakes review data, never invents online
    consultation. Fields absent from the doc are simply omitted.
    """
    tier_raw = (clinic.get("partner_tier") or "standard").lower()
    tier = tier_raw if tier_raw in _PUBLIC_STATUS_LABEL else "standard"
    profile = clinic.get("clinic_profile") or {}

    name = clinic.get("clinic_name") or clinic.get("name") or ""
    clinic_id = clinic.get("id")
    slug = slugify_clinic(name) or clinic_id or ""

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
        "city_slug": clinic.get("city_slug"),
        "city_name": clinic.get("city_name"),
        "area": clinic.get("area"),
        "treatments": treatments,
        "specialties": clinic.get("specialties") or [],
        "short_description": profile.get("short_description"),
        "patient_intro": profile.get("patient_intro"),
        "treatment_focus": profile.get("treatment_focus") or [],
        "hero_image_url": profile.get("hero_image_url"),
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
        "public_status_label": _PUBLIC_STATUS_LABEL[tier],
        "review": review,
        # Optional rich profile (for the public profile page).
        "long_description": profile.get("clinic_story"),
        "consultation_process": profile.get("consultation_process"),
        "doctor_spotlight": (
            {
                "name": profile.get("doctor_spotlight_name"),
                "role": profile.get("doctor_spotlight_role"),
                "bio": profile.get("doctor_spotlight_bio"),
            }
            if profile.get("doctor_spotlight_name")
            else None
        ),
        "case_library": profile.get("case_library") or [],
    }
    return out


def _ranking_score(clinic: dict, specialty: str | None) -> tuple:
    """Sort key used for organic ranking (NOT for sponsored placement).
    Tier boost is small and intentionally below treatment relevance."""
    tier = (clinic.get("partner_tier") or "standard").lower()
    tier_boost = {"premium": 3, "featured": 2, "standard": 1}.get(tier, 0)
    treatments = clinic.get("treatments_supported") or []
    has_specialty = bool(specialty and specialty in treatments)
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
    query: dict[str, Any] = {
        "is_active": True,
        "clinic_status": {"$in": list(_PUBLIC_STATUSES)},
        "name": {"$ne": None, "$exists": True},
        "city_slug": {"$ne": None, "$exists": True},
    }
    if city:
        query["city_slug"] = city.lower()
    if specialty:
        query["treatments_supported"] = specialty.lower()
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
    return {
        "clinics": [_public_clinic_payload(c) for c in docs],
        "total": len(docs),
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
    base = {
        "is_active": True,
        "clinic_status": {"$in": list(_PUBLIC_STATUSES)},
        "name": {"$ne": None},
    }
    # Try id match first (fast index).
    doc = await db.clinics.find_one({**base, "id": slug_or_id}, {"_id": 0})
    if not doc:
        # Scan-then-match-by-derived-slug. Acceptable at ≤100 active clinics.
        async for c in db.clinics.find(base, {"_id": 0}):
            name = c.get("clinic_name") or c.get("name") or ""
            if slugify_clinic(name) == slug_or_id:
                doc = c
                break
    if not doc:
        raise HTTPException(status_code=404, detail={
            "code": "clinic_not_found",
            "message": "Clinic not found or not publicly listed.",
        })
    return _public_clinic_payload(doc)
