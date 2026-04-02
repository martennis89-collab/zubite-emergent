from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import asyncio
import uuid

from database import db
from schemas import Clinic, LeadCreate, LeadContactUpdate, Lead
from auth import hash_password
from config import CITIES
from scoring import calculate_score
from emails import send_lead_notification_email

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


@router.post("/leads", response_model=Lead)
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

    lead = Lead(
        city_slug=data.city_slug,
        treatment_type=data.treatment_type,
        answers=data.answers,
        score_breakdown=score_breakdown,
        score_total=score_total,
        band=band,
        assigned_clinic_id=assigned_clinic_id,
        can_travel=data.can_travel,
        name=data.name,
        phone=data.phone,
        email=data.email,
        consent=data.consent,
        utm_source=data.utm_source,
        utm_campaign=data.utm_campaign,
        utm_adset=data.utm_adset,
        utm_ad=data.utm_ad,
        page_path=data.page_path
    )

    if data.source:
        lead.answers['source'] = data.source

    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.leads.insert_one(doc)

    if data.consent and (data.name or data.email):
        asyncio.create_task(send_lead_notification_email(doc))

    return lead


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead


@router.patch("/leads/{lead_id}/contact")
async def update_lead_contact(lead_id: str, data: LeadContactUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None or k == "consent"}
    result = await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])

    if data.consent and (data.name or data.email):
        asyncio.create_task(send_lead_notification_email(lead))

    return lead


@router.post("/seed")
async def seed():
    existing = await db.clinics.find_one({"city_slug": "sofia"})
    if existing:
        return {"message": "Already seeded"}

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

    admin_exists = await db.admin_users.find_one({"username": "admin@zubite.bg"})
    if not admin_exists:
        await db.admin_users.insert_one({
            "id": str(uuid.uuid4()),
            "username": "admin@zubite.bg",
            "password_hash": hash_password("password"),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    return {"message": "Seeded successfully"}
