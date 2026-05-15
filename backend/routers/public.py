from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
import asyncio
import uuid

from database import db
from schemas import Clinic, LeadCreate, LeadContactUpdate, Lead
from auth import hash_password
from config import CITIES
from scoring import calculate_score
from emails import send_lead_notification_email, send_lead_confirmation_email
from rate_limit import rate_limit

router = APIRouter()


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
    })
    # `source` is not a Lead field — store it in answers so it survives.
    if data.source:
        payload.setdefault("answers", {})["source"] = data.source
    lead = Lead(**payload)

    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.leads.insert_one(doc)

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


# ─── Seed admin-password hygiene (Phase 2B) ──────────────────────
# Reject obvious low-entropy passwords even if the operator forgets to
# pick something strong.
SEED_ADMIN_USERNAME = "admin@zubite.bg"
_SEED_WEAK_PASSWORDS = frozenset({
    "password", "admin", "123456", "changeme", "zubite", "letmein",
})
_SEED_MIN_PASSWORD_LEN = 12


def _validate_seed_admin_password(password: Optional[str]) -> None:
    """Raise 400 if the seed-admin password is missing or weak. Never echoes
    the password back in the error message."""
    if not password:
        raise HTTPException(
            status_code=400,
            detail="SEED_ADMIN_PASSWORD env var is required to seed the admin user.",
        )
    # Check known-weak BEFORE length so callers get a clearer error message
    # ("known weak") rather than the generic "too short" when they typed
    # something like 'password' / 'admin' (both < 12 chars and weak).
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


@router.post(
    "/seed",
    dependencies=[Depends(rate_limit("seed", max_calls=3, window_seconds=600))],
)
async def seed():
    """Idempotent seed; runs only on first call when DB is empty.
    Once seeded, becomes a no-op forever to prevent re-seeding attacks.

    Phase 2B guards:
      - Refuses to seed in production (`APP_ENV=production`).
      - Refuses if SEED_ADMIN_PASSWORD is missing, weak, or matches the
        admin username.
    """
    from config import IS_PRODUCTION

    if IS_PRODUCTION:
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

    return {"message": "Seeded successfully"}
