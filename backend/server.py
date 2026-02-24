from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import jwt
import bcrypt

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

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Zubite.bg API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============== MODELS ==============

class ClinicBase(BaseModel):
    name: str
    city: str
    region: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True
    treatments_supported: List[str] = []

class Clinic(ClinicBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeadBase(BaseModel):
    treatment_type: str  # invisalign, implants, full_mouth
    city: str = "Хасково"
    answers: Dict[str, Any] = {}
    score_breakdown: Dict[str, int] = {}
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_adset: Optional[str] = None
    utm_ad: Optional[str] = None
    gclid: Optional[str] = None
    page_path: Optional[str] = None
    ip_hash: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class LeadContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    consent: bool = False

class Lead(LeadBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    score_total: int = 0
    band: str = "RED"  # GREEN, YELLOW, RED
    status: str = "NEW"  # NEW, CONTACTED, SENT_TO_CLINIC, WON, LOST
    assigned_clinic_id: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    consent: bool = False
    notes: Optional[str] = None

class LeadStatusUpdate(BaseModel):
    status: Optional[str] = None
    assigned_clinic_id: Optional[str] = None
    notes: Optional[str] = None

class EventBase(BaseModel):
    lead_id: str
    event_type: str  # quiz_started, quiz_completed, contact_submitted
    metadata: Dict[str, Any] = {}

class Event(EventBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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


# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

def create_token(user_id: str, username: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        username = payload.get("username")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return AdminUser(id=user_id, username=username)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============== SCORING LOGIC ==============

def calculate_score(treatment_type: str, answers: Dict[str, Any]) -> tuple:
    """Calculate total score and breakdown based on treatment type and answers"""
    score_breakdown = {}
    
    # Common scoring weights
    timing_scores = {
        "0-3": 15, "3-6": 10, "6+": 5, "not_sure": 4
    }
    importance_scores = {
        "quality": 15, "comfort": 10, "price": 0
    }
    readiness_scores = {
        "yes": 20, "maybe": 10, "no": 0
    }
    
    if treatment_type == "invisalign":
        # Q1: Seriousness
        seriousness = answers.get("seriousness", "browsing")
        score_breakdown["seriousness"] = {"searching": 15, "considering": 8, "browsing": 2}.get(seriousness, 2)
        
        # Q2: Timing
        timing = answers.get("timing", "not_sure")
        score_breakdown["timing"] = timing_scores.get(timing, 4)
        
        # Q3: Importance
        importance = answers.get("importance", "price")
        score_breakdown["importance"] = importance_scores.get(importance, 0)
        
        # Q4: Previous ortho
        prev_ortho = answers.get("previous_ortho", "no")
        score_breakdown["previous_ortho"] = {"yes": 6, "no": 5}.get(prev_ortho, 5)
        
        # Q5: Pain/bite issues
        pain = answers.get("pain_bite", "no")
        score_breakdown["pain_bite"] = {"yes": 8, "no": 5}.get(pain, 5)
        
        # Q6: Investment readiness
        readiness = answers.get("readiness", "no")
        score_breakdown["readiness"] = readiness_scores.get(readiness, 0)
        
        # Q7: Call availability
        call_time = answers.get("call_availability", "week")
        score_breakdown["call_availability"] = {"today": 6, "3days": 4, "week": 1}.get(call_time, 1)
        
    elif treatment_type == "implants":
        # Q1: Missing teeth count
        missing = answers.get("missing_teeth", "1-2")
        score_breakdown["missing_teeth"] = {"1-2": 10, "3-5": 12, "6+": 15}.get(missing, 10)
        
        # Q2: Chewing/comfort issues
        chewing = answers.get("chewing_issues", "no")
        score_breakdown["chewing_issues"] = {"yes": 15, "sometimes": 8, "no": 3}.get(chewing, 3)
        
        # Q3: Pain/inflammation
        pain = answers.get("pain_inflammation", "no")
        score_breakdown["pain_inflammation"] = {"yes": 12, "no": 6}.get(pain, 6)
        
        # Q4: Timing
        timing = answers.get("timing", "not_sure")
        score_breakdown["timing"] = timing_scores.get(timing, 4)
        
        # Q5: Importance
        importance = answers.get("importance", "price")
        score_breakdown["importance"] = {"quality": 15, "speed": 8, "price": 0}.get(importance, 0)
        
        # Q6: Investment readiness
        readiness = answers.get("readiness", "no")
        score_breakdown["readiness"] = readiness_scores.get(readiness, 0)
        
        # Q7: Travel willingness
        travel = answers.get("travel_willingness", "no")
        score_breakdown["travel_willingness"] = {"yes": 5, "no": 2}.get(travel, 2)
        
    elif treatment_type == "full_mouth":
        # Q1: Situation description
        situation = answers.get("situation", "cosmetic")
        score_breakdown["situation"] = {"many_missing": 15, "worn_aesthetic": 12, "cosmetic": 5}.get(situation, 5)
        
        # Q2: Main problem
        problem = answers.get("main_problem", "curiosity")
        score_breakdown["main_problem"] = {"function": 15, "aesthetic": 10, "curiosity": 2}.get(problem, 2)
        
        # Q3: Previous consultation
        consulted = answers.get("consulted_before", "no")
        score_breakdown["consulted_before"] = {"yes_better": 12, "no": 8}.get(consulted, 8)
        
        # Q4: Timing
        timing = answers.get("timing", "not_sure")
        score_breakdown["timing"] = timing_scores.get(timing, 4)
        
        # Q5: Importance
        importance = answers.get("importance", "price")
        score_breakdown["importance"] = {"quality": 15, "price": 0}.get(importance, 0)
        
        # Q6: Investment readiness
        readiness = answers.get("readiness", "no")
        score_breakdown["readiness"] = readiness_scores.get(readiness, 0)
        
        # Q7: Complex plan readiness
        complex_ready = answers.get("complex_plan_ready", "no")
        score_breakdown["complex_plan_ready"] = {"yes": 5, "no": 0}.get(complex_ready, 0)
    
    total_score = sum(score_breakdown.values())
    
    # Determine band
    if total_score >= 75:
        band = "GREEN"
    elif total_score >= 50:
        band = "YELLOW"
    else:
        band = "RED"
    
    return total_score, band, score_breakdown


# ============== ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Zubite.bg API", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}


# ============== CLINIC ROUTES ==============

@api_router.get("/clinics", response_model=List[Clinic])
async def get_clinics():
    clinics = await db.clinics.find({"is_active": True}, {"_id": 0}).to_list(100)
    return clinics

@api_router.get("/clinics/{clinic_id}", response_model=Clinic)
async def get_clinic(clinic_id: str):
    clinic = await db.clinics.find_one({"id": clinic_id}, {"_id": 0})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return clinic


# ============== LEAD ROUTES ==============

@api_router.post("/leads", response_model=Lead)
async def create_lead(lead_data: LeadCreate):
    # Calculate score
    score_total, band, score_breakdown = calculate_score(lead_data.treatment_type, lead_data.answers)
    
    # Create lead
    lead_dict = lead_data.model_dump()
    lead_dict.update({
        'score_total': score_total,
        'band': band,
        'score_breakdown': score_breakdown
    })
    lead = Lead(**lead_dict)
    
    # Convert to dict for MongoDB
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.leads.insert_one(doc)
    
    # Create event
    event = Event(lead_id=lead.id, event_type="quiz_completed", metadata={"band": band, "score": score_total})
    event_doc = event.model_dump()
    event_doc['created_at'] = event_doc['created_at'].isoformat()
    await db.events.insert_one(event_doc)
    
    return lead

@api_router.patch("/leads/{lead_id}/contact", response_model=Lead)
async def update_lead_contact(lead_id: str, contact_data: LeadContactUpdate):
    update_data = {k: v for k, v in contact_data.model_dump().items() if v is not None or k == "consent"}
    
    result = await db.leads.update_one(
        {"id": lead_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Create contact event
    event = Event(lead_id=lead_id, event_type="contact_submitted", metadata={"has_phone": bool(contact_data.phone)})
    event_doc = event.model_dump()
    event_doc['created_at'] = event_doc['created_at'].isoformat()
    await db.events.insert_one(event_doc)
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if lead and isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead

@api_router.get("/leads/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead


# ============== ADMIN AUTH ROUTES ==============

@api_router.post("/admin/login", response_model=TokenResponse)
async def admin_login(login_data: AdminLogin):
    # Find admin user
    user = await db.admin_users.find_one({"username": login_data.username}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["username"])
    
    return TokenResponse(
        access_token=token,
        user=AdminUser(id=user["id"], username=user["username"])
    )

@api_router.get("/admin/me", response_model=AdminUser)
async def get_admin_me(current_user: AdminUser = Depends(get_current_user)):
    return current_user


# ============== ADMIN LEAD MANAGEMENT ==============

@api_router.get("/admin/leads", response_model=List[Lead])
async def get_admin_leads(
    treatment_type: Optional[str] = None,
    band: Optional[str] = None,
    status: Optional[str] = None,
    city: Optional[str] = None,
    current_user: AdminUser = Depends(get_current_user)
):
    query = {}
    if treatment_type:
        query["treatment_type"] = treatment_type
    if band:
        query["band"] = band
    if status:
        query["status"] = status
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    for lead in leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    
    return leads

@api_router.get("/admin/leads/{lead_id}", response_model=Lead)
async def get_admin_lead(lead_id: str, current_user: AdminUser = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead

@api_router.patch("/admin/leads/{lead_id}", response_model=Lead)
async def update_admin_lead(
    lead_id: str, 
    update_data: LeadStatusUpdate,
    current_user: AdminUser = Depends(get_current_user)
):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.leads.update_one(
        {"id": lead_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead

@api_router.get("/admin/leads/export/csv")
async def export_leads_csv(current_user: AdminUser = Depends(get_current_user)):
    leads = await db.leads.find({}, {"_id": 0}).to_list(10000)
    
    import csv
    from io import StringIO
    from fastapi.responses import StreamingResponse
    
    output = StringIO()
    if leads:
        writer = csv.DictWriter(output, fieldnames=leads[0].keys())
        writer.writeheader()
        for lead in leads:
            # Flatten nested dicts for CSV
            flat_lead = {}
            for k, v in lead.items():
                if isinstance(v, dict):
                    flat_lead[k] = str(v)
                else:
                    flat_lead[k] = v
            writer.writerow(flat_lead)
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_export.csv"}
    )

@api_router.get("/admin/clinics", response_model=List[Clinic])
async def get_admin_clinics(current_user: AdminUser = Depends(get_current_user)):
    clinics = await db.clinics.find({}, {"_id": 0}).to_list(100)
    return clinics

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: AdminUser = Depends(get_current_user)):
    total_leads = await db.leads.count_documents({})
    new_leads = await db.leads.count_documents({"status": "NEW"})
    green_leads = await db.leads.count_documents({"band": "GREEN"})
    yellow_leads = await db.leads.count_documents({"band": "YELLOW"})
    red_leads = await db.leads.count_documents({"band": "RED"})
    
    # By treatment
    invisalign_count = await db.leads.count_documents({"treatment_type": "invisalign"})
    implants_count = await db.leads.count_documents({"treatment_type": "implants"})
    full_mouth_count = await db.leads.count_documents({"treatment_type": "full_mouth"})
    
    return {
        "total_leads": total_leads,
        "new_leads": new_leads,
        "by_band": {"green": green_leads, "yellow": yellow_leads, "red": red_leads},
        "by_treatment": {"invisalign": invisalign_count, "implants": implants_count, "full_mouth": full_mouth_count}
    }


# ============== EVENT TRACKING ==============

@api_router.post("/events")
async def create_event(event_data: EventBase):
    event = Event(**event_data.model_dump())
    doc = event.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.events.insert_one(doc)
    return {"status": "ok", "event_id": event.id}


# ============== SEED DATA ==============

@api_router.post("/seed")
async def seed_database():
    """Seed initial data"""
    # Check if already seeded
    existing_clinic = await db.clinics.find_one({"name": "Haskovo Premium Clinic"})
    if existing_clinic:
        return {"message": "Database already seeded"}
    
    # Seed clinic
    clinic = Clinic(
        name="Haskovo Premium Clinic",
        city="Хасково",
        region="Хасковска област",
        phone="+359 38 123 456",
        email="contact@haskovo-dental.bg",
        is_active=True,
        treatments_supported=["invisalign", "implants", "full_mouth"]
    )
    clinic_doc = clinic.model_dump()
    clinic_doc['created_at'] = clinic_doc['created_at'].isoformat()
    await db.clinics.insert_one(clinic_doc)
    
    # Seed admin user (password: admin123)
    admin_exists = await db.admin_users.find_one({"username": "admin"})
    if not admin_exists:
        admin_user = {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.admin_users.insert_one(admin_user)
    
    return {"message": "Database seeded successfully", "clinic_id": clinic.id}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.leads.create_index("id", unique=True)
    await db.leads.create_index("created_at")
    await db.leads.create_index("treatment_type")
    await db.leads.create_index("band")
    await db.leads.create_index("status")
    await db.clinics.create_index("id", unique=True)
    await db.events.create_index("lead_id")
    await db.admin_users.create_index("username", unique=True)
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
