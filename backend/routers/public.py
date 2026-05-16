from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import asyncio
import uuid

from database import db
from schemas import Clinic, LeadCreate, LeadContactUpdate, Lead
from auth import hash_password
from config import CITIES, logger
from scoring import calculate_score
from emails import send_lead_notification_email, send_lead_confirmation_email
from rate_limit import rate_limit

router = APIRouter()


# ─── Soft duplicate detection (Phase 2C) ──────────────────────────
# Look back this far when deciding whether a new lead duplicates an older one.
_DUPLICATE_WINDOW_DAYS = 30


async def _detect_soft_duplicate(
    phone: Optional[str],
    email: Optional[str],
) -> tuple[bool, Optional[str], Optional[str]]:
    """Return (is_duplicate, reason, possible_duplicate_lead_id).

    The check is purely additive: callers always create the new lead. If
    phone/email are missing, the check is skipped safely.

    Comparison rules:
      - phone is trimmed (string compare).
      - email is trimmed and lower-cased.
      - Match window: last `_DUPLICATE_WINDOW_DAYS` days by `created_at`.
    """
    phone = (phone or "").strip()
    email = (email or "").strip().lower()
    if not phone and not email:
        return False, None, None

    cutoff_iso = (
        datetime.now(timezone.utc) - timedelta(days=_DUPLICATE_WINDOW_DAYS)
    ).isoformat()

    or_clauses: list[dict] = []
    if phone:
        or_clauses.append({"phone": phone})
    if email:
        or_clauses.append({"email": email})

    query = {
        "created_at": {"$gte": cutoff_iso},
        "$or": or_clauses,
    }
    match = await db.leads.find_one(
        query,
        {"_id": 0, "id": 1, "phone": 1, "email": 1},
        sort=[("created_at", -1)],
    )
    if not match:
        return False, None, None

    reasons: list[str] = []
    if phone and (match.get("phone") or "").strip() == phone:
        reasons.append("phone")
    if email and (match.get("email") or "").strip().lower() == email:
        reasons.append("email")
    reason = "+".join(reasons) if reasons else "match"
    return True, reason, match.get("id")


@router.get("/")
async def root():
    return {"message": "Zubite.bg API", "status": "running"}


@router.get("/cities")
async def get_cities():
    return [{"city_slug": k, "city_name": v} for k, v in CITIES.items()]


@router.get("/cities/{city_slug}")
async def get_city(city_slug: str):
    if city_slug not in CITIES:
        raise HTTPException(status_code=404, detail="City not found")
    clinic = await db.clinics.find_one({"city_slug": city_slug, "is_active": True}, {"_id": 0})
    return {"city_slug": city_slug, "city_name": CITIES[city_slug], "clinic": clinic}


@router.get("/clinics")
async def get_clinics():
    clinics = await db.clinics.find({"is_active": True}, {"_id": 0}).to_list(100)
    return clinics


@router.post("/leads", response_model=Lead, dependencies=[Depends(rate_limit("create_lead", 5, 300))])
async def create_lead(data: LeadCreate):
    score_total, band, score_breakdown = calculate_score(data.treatment_type, data.answers, data.can_travel)

    assigned_clinic_id = None
    if band == "GREEN":
        clinic = await db.clinics.find_one({
            "city_slug": data.city_slug,
            "is_active": True,
            "treatments_supported": data.treatment_type
        }, {"_id": 0})
        if clinic:
            assigned_clinic_id = clinic.get("id")

    # Soft duplicate detection — additive, never blocks submission.
    is_dup, dup_reason, dup_lead_id = await _detect_soft_duplicate(
        data.phone, data.email
    )

    # Build the lead from the create payload directly. Lead's `extra="ignore"`
    # config drops any unknown fields, but everything we explicitly typed in
    # LeadCreate (incl. all attribution fields) flows straight through.
    payload = data.model_dump(exclude_none=True)
    # Override with the calculated scoring + assignment fields
    payload.update({
        "score_total": score_total,
        "band": band,
        "score_breakdown": score_breakdown,
        "assigned_clinic_id": assigned_clinic_id,
        "is_potential_duplicate": is_dup,
        "duplicate_reason": dup_reason,
        "possible_duplicate_lead_id": dup_lead_id,
    })
    # `source` is not a Lead field — store it in answers so it survives.
    if data.source:
        payload.setdefault("answers", {})["source"] = data.source
    lead = Lead(**payload)

    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.leads.insert_one(doc)

    if is_dup:
        # Audit log only — never echo the contact value back.
        logger.info(
            "soft_duplicate_detected lead=%s match=%s reason=%s",
            lead.id, dup_lead_id, dup_reason,
        )

    if data.consent and (data.name or data.email):
        asyncio.create_task(send_lead_notification_email(doc))
        if data.email:
            asyncio.create_task(send_lead_confirmation_email(doc))

    return lead


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str):
    """Public lead lookup. Returns only minimal, non-PII fields (used by quiz success page)."""
    lead = await db.leads.find_one(
        {"id": lead_id},
        {"_id": 0, "id": 1, "city_slug": 1, "treatment_type": 1, "band": 1,
         "score_total": 1, "created_at": 1, "answers": 1}
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead


@router.patch("/leads/{lead_id}/contact", dependencies=[Depends(rate_limit("update_contact", 10, 300))])
async def update_lead_contact(lead_id: str, data: LeadContactUpdate):
    # Look up the lead and enforce a short edit window after creation to prevent
    # arbitrary tampering by anyone who guesses/obtains a lead UUID later on.
    existing = await db.leads.find_one({"id": lead_id}, {"_id": 0, "id": 1, "created_at": 1, "consent": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")

    created_at_raw = existing.get("created_at")
    try:
        created_at_dt = datetime.fromisoformat(created_at_raw) if isinstance(created_at_raw, str) else created_at_raw
        if created_at_dt and created_at_dt.tzinfo is None:
            created_at_dt = created_at_dt.replace(tzinfo=timezone.utc)
        age_seconds = (datetime.now(timezone.utc) - created_at_dt).total_seconds() if created_at_dt else 0
    except Exception:
        age_seconds = 0
    # Allow updates only within 60 minutes of lead creation
    if age_seconds > 3600:
        raise HTTPException(status_code=403, detail="Edit window expired")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None or k == "consent"}
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    # Return only minimal info; never leak full PII to public callers
    lead = await db.leads.find_one(
        {"id": lead_id},
        {"_id": 0, "id": 1, "city_slug": 1, "treatment_type": 1, "band": 1, "score_total": 1, "consent": 1}
    )

    if data.consent and (data.name or data.email):
        # Re-fetch full lead for internal email use only
        full_lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        asyncio.create_task(send_lead_notification_email(full_lead))
        if data.email:
            asyncio.create_task(send_lead_confirmation_email(full_lead))

    return lead


# ─── Patient layer: recommended clinics (Phase P2) ────────────────
#
# GET /leads/{lead_id}/recommended-clinics returns up to N partner clinics
# matched deterministically against the lead's city and treatment interest.
#
# Product rule (also surfaced to the client in `selection_rule`):
#   • Patients may VIEW up to 3 recommended clinics on the match screen.
#   • Patients may request a CALL from only ONE clinic. If they are unsure
#     they should use "Помогнете ми да избера" (Zubite-assisted flow).
#
# This endpoint is READ-ONLY. P2 does not create consultation_requests,
# does not send emails, and does not modify any clinic/lead state.

# How recent a lead must be to fetch recommendations.
# Mirrors the spirit of the existing `PATCH /leads/{id}/contact` window:
# old leads are stale entry points and patient context decays.
_RECO_WINDOW_DAYS = 7

# Treatment categories that should NOT narrow the match by treatment
# (broad/discovery flows). Match by city only and use a generic reason text.
_BROAD_TREATMENT_TYPES = frozenset({"diagnostic_quiz", "master_quiz", "general"})

# Clinic statuses that MUST be excluded even if other "active-ish" signals
# look ok. Conservative allow-list approach is used instead — we explicitly
# only accept these statuses. New unrecognised values do NOT leak through.
_VISIBLE_LEGACY_IS_ACTIVE = True
_VISIBLE_ADMIN_STATUSES = frozenset({"active"})
_VISIBLE_CLINIC_STATUSES = frozenset({"active_partner", "evaluation_partner"})

# BG city_slug -> display name mapping. Lazily resolved against CITIES at
# read time so a missing entry falls back to the slug itself.
def _city_name_for(slug: Optional[str], fallback: Optional[str] = None) -> Optional[str]:
    if not slug:
        return fallback
    name = CITIES.get(slug)
    return name or fallback or slug


def _treatments_of(clinic: dict) -> List[str]:
    """Union of `treatments_supported` (legacy/routing schema) and
    `treatments_offered` (admin/partner schema). De-duplicated, lowercased."""
    a = clinic.get("treatments_supported") or []
    b = clinic.get("treatments_offered") or []
    seen: List[str] = []
    for t in list(a) + list(b):
        if not isinstance(t, str):
            continue
        norm = t.strip().lower()
        if norm and norm not in seen:
            seen.append(norm)
    return seen


def _is_clinic_visible(clinic: dict) -> bool:
    """Conservative allow-list visibility check across mixed schemas.
    Returns True only when at least one positive signal is present AND
    no negative signal is present.

    Negative signals (any -> hidden):
      • is_active == False
      • clinic_status in {applicant, suspended, churned, paused}
      • status in {suspended, churned, paused, applicant}

    Positive signals (need at least one -> visible):
      • is_active == True
      • clinic_status in {active_partner, evaluation_partner}
      • status == "active"
    """
    # Hard negatives.
    if clinic.get("is_active") is False:
        return False
    cs = (clinic.get("clinic_status") or "").lower()
    if cs and cs in {"applicant", "suspended", "churned", "paused"}:
        return False
    st = (clinic.get("status") or "").lower()
    if st and st in {"suspended", "churned", "paused", "applicant"}:
        return False

    # Need at least one positive signal.
    if clinic.get("is_active") is _VISIBLE_LEGACY_IS_ACTIVE:
        return True
    if cs in _VISIBLE_CLINIC_STATUSES:
        return True
    if st in _VISIBLE_ADMIN_STATUSES:
        return True
    return False


def _clinic_name(clinic: dict) -> Optional[str]:
    return clinic.get("name") or clinic.get("clinic_name")


def _clinic_city_slug(clinic: dict) -> Optional[str]:
    """Resolve a clinic's city_slug. Legacy clinics have it directly;
    admin-created docs only have free-text `city`. We map by exact city
    name to the configured CITIES dict for safety. Unmappable -> None."""
    slug = clinic.get("city_slug")
    if isinstance(slug, str) and slug:
        return slug
    city = (clinic.get("city") or "").strip()
    if not city:
        return None
    for s, n in CITIES.items():
        if n.strip().lower() == city.lower():
            return s
    return None


def _score_clinic(clinic: dict, lead_city: str, lead_treatment: str, is_broad: bool) -> int:
    """Deterministic score. Returns -1 to mark clinic as ineligible (no city match)."""
    cs = _clinic_city_slug(clinic)
    if cs != lead_city:
        return -1
    score = 100  # same-city base
    if not is_broad:
        if lead_treatment.lower() in _treatments_of(clinic):
            score += 50
    return score


def _reason_for(clinic: dict, lead_treatment: str, is_broad: bool) -> str:
    """Deterministic Bulgarian reason text. No AI, no fake claims."""
    city = _city_name_for(_clinic_city_slug(clinic))
    treatments = _treatments_of(clinic)
    if is_broad:
        return "Партньорска клиника във вашия град, подходяща за първа консултация."
    if lead_treatment.lower() in treatments:
        # Surface the matched treatment in BG via a small mapping.
        _TREATMENT_BG = {
            "aligners": "алайнери",
            "braces": "ортодонтия с брекети",
            "implants": "импланти",
            "orthodontics": "ортодонтия",
            "veneers": "фасети",
            "whitening": "избелване",
            "tmj": "проблеми с челюстна става",
            "sleep_airway": "сън и дихателни пътища",
        }
        treat_bg = _TREATMENT_BG.get(lead_treatment.lower(), lead_treatment.lower())
        return f"Във вашия град и с фокус върху {treat_bg}."
    return f"Партньорска клиника в {city}, подходяща за консултация."


def _safe_clinic_payload(clinic: dict, lead_treatment: str, is_broad: bool) -> dict:
    """Strict whitelist projection. Everything not listed here is dropped."""
    slug = _clinic_city_slug(clinic)
    created_at_raw = clinic.get("created_at")
    partner_since_year: Optional[int] = None
    try:
        if isinstance(created_at_raw, str):
            partner_since_year = datetime.fromisoformat(created_at_raw).year
        elif hasattr(created_at_raw, "year"):
            partner_since_year = created_at_raw.year
    except Exception:
        partner_since_year = None

    return {
        "id": clinic.get("id"),
        "name": _clinic_name(clinic),
        "city_name": _city_name_for(slug, clinic.get("city_name")),
        "city_slug": slug,
        "treatments": _treatments_of(clinic),
        "reason": _reason_for(clinic, lead_treatment, is_broad),
        # Honest, conservative wording. We do NOT promise an SLA.
        "response_expectation": (
            "Клиниката ще получи заявката ви и ще може да се свърже с вас "
            "при потвърдено съгласие."
        ),
        "partner_since_year": partner_since_year,
    }


_EMPTY_MESSAGE = (
    "В момента нямаме достатъчно партньорски клиники за автоматична "
    "препоръка. Zubite може да ви помогне ръчно да изберете следваща стъпка."
)


@router.get(
    "/leads/{lead_id}/recommended-clinics",
    dependencies=[Depends(rate_limit("recommended_clinics", 30, 300))],
)
async def recommended_clinics(lead_id: str, limit: int = 3):
    """Public read endpoint that returns up to `limit` partner clinics for a
    lead, with strict field whitelisting and conservative copy.

    Errors:
      • 404 if lead does not exist
      • 410 if lead is older than _RECO_WINDOW_DAYS
    """
    # Clamp limit defensively. Product rule: patient can view max 3.
    if not isinstance(limit, int) or limit < 1:
        limit = 3
    limit = min(limit, 3)

    # 1) Lead lookup — minimal projection, no PII pulled into memory.
    lead = await db.leads.find_one(
        {"id": lead_id},
        {"_id": 0, "id": 1, "city_slug": 1, "treatment_type": 1, "created_at": 1},
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # 2) Freshness window.
    created_at_raw = lead.get("created_at")
    try:
        if isinstance(created_at_raw, str):
            created_at_dt = datetime.fromisoformat(created_at_raw)
        else:
            created_at_dt = created_at_raw
        if created_at_dt and created_at_dt.tzinfo is None:
            created_at_dt = created_at_dt.replace(tzinfo=timezone.utc)
        age_days = (
            (datetime.now(timezone.utc) - created_at_dt).total_seconds() / 86400.0
            if created_at_dt
            else 0
        )
    except Exception:
        age_days = 0
    if age_days > _RECO_WINDOW_DAYS:
        raise HTTPException(status_code=410, detail="Lead recommendation window expired")

    lead_city = (lead.get("city_slug") or "").strip().lower()
    lead_treatment = (lead.get("treatment_type") or "").strip().lower()
    is_broad = lead_treatment in _BROAD_TREATMENT_TYPES

    # Shared selection_rule echoed in every response (and in 0-match case).
    selection_rule = {
        "can_view_clinics": 3,
        "can_request_call_from_clinics": 1,
        "assisted_choice_available": True,
    }
    empty_response = {
        "lead_id": lead_id,
        "city_slug": lead_city,
        "treatment_type": lead_treatment,
        "clinic_count": 0,
        "fallback_used": False,
        "assisted_help_available": True,
        "selection_rule": selection_rule,
        "message": _EMPTY_MESSAGE,
        "clinics": [],
    }

    if not lead_city:
        # No city => no deterministic match possible. Honest empty.
        return empty_response

    # 3) Candidate clinics. Pull a broad page; in-memory filter/score.
    # Cap is generous but bounded.
    raw_candidates = await db.clinics.find(
        {},
        {
            "_id": 0,
            "id": 1, "name": 1, "clinic_name": 1,
            "city_slug": 1, "city_name": 1, "city": 1,
            "treatments_supported": 1, "treatments_offered": 1,
            "is_active": 1, "clinic_status": 1, "status": 1,
            "created_at": 1,
        },
    ).to_list(500)

    scored: List[tuple[int, str, dict]] = []
    for c in raw_candidates:
        if not _is_clinic_visible(c):
            continue
        s = _score_clinic(c, lead_city, lead_treatment, is_broad)
        if s < 0:
            continue
        scored.append((s, (_clinic_name(c) or "").lower(), c))

    # Deterministic sort: score desc, then name asc (alphabetical tie-break).
    scored.sort(key=lambda x: (-x[0], x[1]))

    top = scored[:limit]

    if not top:
        return empty_response

    clinics_out = [_safe_clinic_payload(c, lead_treatment, is_broad) for _, _, c in top]

    return {
        "lead_id": lead_id,
        "city_slug": lead_city,
        "treatment_type": lead_treatment,
        "clinic_count": len(clinics_out),
        "fallback_used": False,
        "assisted_help_available": True,
        "selection_rule": selection_rule,
        "clinics": clinics_out,
    }


# ─── Seed admin-password hygiene (Phase 2B) ──────────────────────
# Reject obvious low-entropy passwords even if the operator forgets to
# pick something strong.
SEED_ADMIN_USERNAME = "admin@zubite.bg"
_SEED_WEAK_PASSWORDS = frozenset({
    "password", "admin", "123456", "changeme", "zubite", "letmein",
})
_SEED_MIN_PASSWORD_LEN = 12


def _validate_seed_admin_password(password: Optional[str]) -> str:
    """Raise 400 if the seed-admin password is missing or weak. Returns
    the reason_code (used for audit metadata only) — actual value lives
    in the caller's HTTPException detail string."""
    if not password:
        raise HTTPException(
            status_code=400,
            detail="SEED_ADMIN_PASSWORD env var is required to seed the admin user.",
        )
    # Check known-weak BEFORE length so callers get a clearer error message.
    if password.lower() in _SEED_WEAK_PASSWORDS:
        raise HTTPException(
            status_code=400,
            detail="Seed admin password is in the known-weak password list.",
        )
    if password.lower() == SEED_ADMIN_USERNAME.lower():
        raise HTTPException(
            status_code=400,
            detail="Seed admin password must not equal the admin username.",
        )
    if len(password) < _SEED_MIN_PASSWORD_LEN:
        raise HTTPException(
            status_code=400,
            detail=f"Seed admin password must be at least {_SEED_MIN_PASSWORD_LEN} characters.",
        )
    return "ok"


def _classify_seed_password(password: Optional[str]) -> Optional[str]:
    """Return a reason_code if password is rejectable; None if acceptable.
    Used by the audit hook so the rejection reason is recorded WITHOUT the
    password value ever entering the audit row."""
    if not password:
        return "missing"
    if password.lower() in _SEED_WEAK_PASSWORDS:
        return "weak"
    if password.lower() == SEED_ADMIN_USERNAME.lower():
        return "username_equal"
    if len(password) < _SEED_MIN_PASSWORD_LEN:
        return "short"
    return None


@router.post(
    "/seed",
    dependencies=[Depends(rate_limit("seed", max_calls=3, window_seconds=600))],
)
async def seed(request: Request):
    """Idempotent seed; runs only on first call when DB is empty.
    Once seeded, becomes a no-op forever to prevent re-seeding attacks.

    Phase 2B guards:
      - Refuses to seed in production (`APP_ENV=production`).
      - Refuses if SEED_ADMIN_PASSWORD is missing, weak, or matches the
        admin username.
    """
    from config import IS_PRODUCTION
    from audit import audit_log as _audit

    if IS_PRODUCTION:
        await _audit(
            "seed.blocked_production",
            actor=None, actor_type="system",
            target_type="system", target_id=None,
            metadata={"reason_code": "production_blocked"},
            severity="warning", request=request,
        )
        raise HTTPException(
            status_code=403,
            detail="Seeding is disabled in production.",
        )

    existing = await db.clinics.find_one({"city_slug": "sofia"})
    if existing:
        return {"message": "Already seeded"}
    admin_exists = await db.admin_users.find_one({"username": SEED_ADMIN_USERNAME})
    if admin_exists:
        return {"message": "Already seeded"}

    # Validate password BEFORE inserting any clinic rows so a botched call
    # leaves the DB untouched.
    import os as _os
    seed_admin_password = _os.environ.get("SEED_ADMIN_PASSWORD")
    reject_reason = _classify_seed_password(seed_admin_password)
    if reject_reason is not None:
        await _audit(
            "seed.rejected_weak_password",
            actor=None, actor_type="system",
            target_type="system", target_id=None,
            metadata={"reason_code": reject_reason},
            severity="warning", request=request,
        )
        # Now raise the user-facing error (NEVER echoes the password).
        _validate_seed_admin_password(seed_admin_password)

    clinics = [
        Clinic(name="Sofia Premium Clinic", city_slug="sofia", city_name="София",
               treatments_supported=["invisalign", "implants", "full_mouth"]),
        Clinic(name="Plovdiv Premium Clinic", city_slug="plovdiv", city_name="Пловдив",
               treatments_supported=["invisalign", "implants", "full_mouth"]),
        Clinic(name="Varna Premium Clinic", city_slug="varna", city_name="Варна",
               treatments_supported=["invisalign", "implants", "full_mouth"]),
        Clinic(name="Haskovo Premium Clinic", city_slug="haskovo", city_name="Хасково",
               treatments_supported=["invisalign", "implants", "full_mouth"])
    ]

    for c in clinics:
        doc = c.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.clinics.insert_one(doc)

    await db.admin_users.insert_one({
        "id": str(uuid.uuid4()),
        "username": SEED_ADMIN_USERNAME,
        "password_hash": hash_password(seed_admin_password),
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    await _audit(
        "seed.executed",
        actor=None, actor_type="system",
        target_type="system", target_id=None,
        metadata={"clinics_seeded": len(clinics), "admin_seeded": True},
        severity="critical", request=request,
    )

    return {"message": "Seeded successfully"}
