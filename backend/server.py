from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'zubite-bg-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Resend Email Settings
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'martennis89@gmail.com')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

security = HTTPBearer()
app = FastAPI(title="Zubite.bg API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class Clinic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    city_slug: str
    city_name: str
    treatments_supported: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeadCreate(BaseModel):
    city_slug: str
    treatment_type: str  # invisalign, implants, full_mouth
    answers: Dict[str, Any] = {}
    can_travel: bool = True
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_adset: Optional[str] = None
    utm_ad: Optional[str] = None
    page_path: Optional[str] = None

class LeadContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    consent: bool = False

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    city_slug: str
    treatment_type: str
    score_total: int = 0
    band: str = "RED"
    status: str = "NEW"
    assigned_clinic_id: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    consent: bool = False
    answers: Dict[str, Any] = {}
    score_breakdown: Dict[str, int] = {}
    can_travel: bool = True
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_adset: Optional[str] = None
    utm_ad: Optional[str] = None
    page_path: Optional[str] = None
    notes: Optional[str] = None

class LeadStatusUpdate(BaseModel):
    status: Optional[str] = None
    assigned_clinic_id: Optional[str] = None
    notes: Optional[str] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminUser(BaseModel):
    id: str
    username: str
    role: str = "admin"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AdminUser

# City mapping
CITIES = {
    "sofia": "София",
    "plovdiv": "Пловдив", 
    "varna": "Варна",
    "haskovo": "Хасково"
}

# ============== AUTH ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(user_id: str, username: str) -> str:
    payload = {"sub": user_id, "username": username, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return AdminUser(id=payload.get("sub"), username=payload.get("username"))
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== SCORING ==============

def calculate_score(treatment_type: str, answers: Dict[str, Any], can_travel: bool = True) -> tuple:
    score_breakdown = {}
    
    if treatment_type == "invisalign":
        score_breakdown["seriousness"] = {"searching": 15, "considering": 8, "browsing": 2}.get(answers.get("seriousness", "browsing"), 2)
        score_breakdown["timing"] = {"0-3": 15, "3-6": 10, "6+": 5, "not_sure": 4}.get(answers.get("timing", "not_sure"), 4)
        score_breakdown["importance"] = {"quality": 15, "comfort": 10, "price": 0}.get(answers.get("importance", "price"), 0)
        score_breakdown["previous_ortho"] = {"yes": 6, "no": 5}.get(answers.get("previous_ortho", "no"), 5)
        score_breakdown["bite_problem"] = {"yes": 8, "no": 5}.get(answers.get("bite_problem", "no"), 5)
        score_breakdown["readiness"] = {"yes": 20, "maybe": 10, "no": 0}.get(answers.get("readiness", "no"), 0)
        score_breakdown["can_visit"] = 6 if can_travel else 0
        
    elif treatment_type == "implants":
        score_breakdown["missing_teeth"] = {"1-2": 10, "3-5": 12, "6+": 15}.get(answers.get("missing_teeth", "1-2"), 10)
        score_breakdown["chewing_difficulty"] = {"yes": 15, "sometimes": 8, "no": 3}.get(answers.get("chewing_difficulty", "no"), 3)
        score_breakdown["pain"] = {"yes": 12, "no": 6}.get(answers.get("pain", "no"), 6)
        score_breakdown["timing"] = {"0-3": 15, "3-6": 10, "6+": 5, "not_sure": 4}.get(answers.get("timing", "not_sure"), 4)
        score_breakdown["importance"] = {"quality": 15, "speed": 8, "price": 0}.get(answers.get("importance", "price"), 0)
        score_breakdown["readiness"] = {"yes": 20, "maybe": 10, "no": 0}.get(answers.get("readiness", "no"), 0)
        score_breakdown["can_visit"] = 6 if can_travel else 0
        
    elif treatment_type == "full_mouth":
        score_breakdown["situation"] = {"many_missing": 15, "worn": 12, "aesthetic": 5}.get(answers.get("situation", "aesthetic"), 5)
        score_breakdown["main_problem"] = {"function": 15, "aesthetic": 10, "curiosity": 2}.get(answers.get("main_problem", "curiosity"), 2)
        score_breakdown["consulted_before"] = {"yes": 12, "no": 8}.get(answers.get("consulted_before", "no"), 8)
        score_breakdown["timing"] = {"0-3": 15, "3-6": 10, "6+": 5, "not_sure": 4}.get(answers.get("timing", "not_sure"), 4)
        score_breakdown["importance"] = {"quality": 15, "price": 0}.get(answers.get("importance", "price"), 0)
        score_breakdown["complex_plan"] = {"yes": 10, "maybe": 5, "no": 0}.get(answers.get("complex_plan", "no"), 0)
        score_breakdown["can_visit"] = 6 if can_travel else 0
    
    total = sum(score_breakdown.values())
    
    if total >= 75:
        band = "GREEN"
    elif total >= 50:
        band = "YELLOW"
    else:
        band = "RED"
    
    # Cap to YELLOW if can't travel
    if not can_travel and band == "GREEN":
        band = "YELLOW"
    
    return total, band, score_breakdown

# ============== ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Zubite.bg API", "status": "running"}

@api_router.get("/cities")
async def get_cities():
    return [{"city_slug": k, "city_name": v} for k, v in CITIES.items()]

@api_router.get("/cities/{city_slug}")
async def get_city(city_slug: str):
    if city_slug not in CITIES:
        raise HTTPException(status_code=404, detail="City not found")
    clinic = await db.clinics.find_one({"city_slug": city_slug, "is_active": True}, {"_id": 0})
    return {"city_slug": city_slug, "city_name": CITIES[city_slug], "clinic": clinic}

@api_router.get("/clinics")
async def get_clinics():
    clinics = await db.clinics.find({"is_active": True}, {"_id": 0}).to_list(100)
    return clinics

@api_router.post("/leads", response_model=Lead)
async def create_lead(data: LeadCreate):
    score_total, band, score_breakdown = calculate_score(data.treatment_type, data.answers, data.can_travel)
    
    # Auto-assign clinic if GREEN
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
        utm_source=data.utm_source,
        utm_campaign=data.utm_campaign,
        utm_adset=data.utm_adset,
        utm_ad=data.utm_ad,
        page_path=data.page_path
    )
    
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.leads.insert_one(doc)
    
    return lead

@api_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead

@api_router.patch("/leads/{lead_id}/contact")
async def update_lead_contact(lead_id: str, data: LeadContactUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None or k == "consent"}
    result = await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead

# ============== ADMIN ==============

@api_router.post("/admin/login", response_model=TokenResponse)
async def admin_login(data: AdminLogin):
    user = await db.admin_users.find_one({"username": data.username}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["username"])
    return TokenResponse(access_token=token, user=AdminUser(id=user["id"], username=user["username"]))

@api_router.get("/admin/me")
async def admin_me(user: AdminUser = Depends(get_current_user)):
    return user

@api_router.get("/admin/leads")
async def admin_leads(
    city_slug: Optional[str] = None,
    treatment_type: Optional[str] = None,
    band: Optional[str] = None,
    status: Optional[str] = None,
    user: AdminUser = Depends(get_current_user)
):
    query = {}
    if city_slug: query["city_slug"] = city_slug
    if treatment_type: query["treatment_type"] = treatment_type
    if band: query["band"] = band
    if status: query["status"] = status
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for lead in leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return leads

@api_router.get("/admin/leads/{lead_id}")
async def admin_lead(lead_id: str, user: AdminUser = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead

@api_router.patch("/admin/leads/{lead_id}")
async def admin_update_lead(lead_id: str, data: LeadStatusUpdate, user: AdminUser = Depends(get_current_user)):
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data")
    await db.leads.update_one({"id": lead_id}, {"$set": update_dict})
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead

@api_router.get("/admin/clinics")
async def admin_clinics(user: AdminUser = Depends(get_current_user)):
    return await db.clinics.find({}, {"_id": 0}).to_list(100)

@api_router.get("/admin/stats")
async def admin_stats(user: AdminUser = Depends(get_current_user)):
    total = await db.leads.count_documents({})
    new = await db.leads.count_documents({"status": "NEW"})
    green = await db.leads.count_documents({"band": "GREEN"})
    yellow = await db.leads.count_documents({"band": "YELLOW"})
    red = await db.leads.count_documents({"band": "RED"})
    return {
        "total_leads": total, "new_leads": new,
        "by_band": {"green": green, "yellow": yellow, "red": red},
        "by_city": {
            "sofia": await db.leads.count_documents({"city_slug": "sofia"}),
            "plovdiv": await db.leads.count_documents({"city_slug": "plovdiv"}),
            "varna": await db.leads.count_documents({"city_slug": "varna"}),
            "haskovo": await db.leads.count_documents({"city_slug": "haskovo"})
        }
    }

@api_router.get("/admin/leads/export/csv")
async def export_csv(user: AdminUser = Depends(get_current_user)):
    import csv
    from io import StringIO
    from fastapi.responses import StreamingResponse
    
    leads = await db.leads.find({}, {"_id": 0}).to_list(10000)
    output = StringIO()
    if leads:
        writer = csv.DictWriter(output, fieldnames=leads[0].keys())
        writer.writeheader()
        for lead in leads:
            flat = {k: str(v) if isinstance(v, dict) else v for k, v in lead.items()}
            writer.writerow(flat)
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                            headers={"Content-Disposition": "attachment; filename=leads.csv"})

# ============== SEED ==============

@api_router.post("/seed")
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
    
    admin_exists = await db.admin_users.find_one({"username": "admin"})
    if not admin_exists:
        await db.admin_users.insert_one({
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "Seeded successfully"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await db.leads.create_index("id", unique=True)
    await db.leads.create_index("city_slug")
    await db.leads.create_index("band")
    await db.leads.create_index("status")
    await db.clinics.create_index("id", unique=True)
    await db.clinics.create_index("city_slug")
    await db.admin_users.create_index("username", unique=True)

@app.on_event("shutdown")
async def shutdown():
    client.close()
