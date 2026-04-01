from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import httpx
import requests
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import resend

ROOT_DIR = Path(__file__).parent
STATIC_DIR = ROOT_DIR.parent / 'static'
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

# Revalidation Settings for Next.js ISR
REVALIDATE_SECRET = os.environ.get('REVALIDATE_SECRET', 'zubite-revalidate-secret-2024')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Object Storage Settings
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
APP_NAME = "zubite-bg"
storage_key = None  # Module-level, set once and reused globally

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

security = HTTPBearer()
app = FastAPI(title="Zubite.bg API")
api_router = APIRouter(prefix="/api")

# Helper function to trigger Next.js page revalidation
async def trigger_revalidation(slug: Optional[str] = None, action: str = "unknown"):
    """Trigger Next.js on-demand revalidation for blog pages"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{FRONTEND_URL}/api/revalidate",
                json={
                    "secret": REVALIDATE_SECRET,
                    "slug": slug,
                    "action": action
                }
            )
            if response.status_code == 200:
                logger.info(f"Revalidation triggered successfully for action: {action}, slug: {slug}")
            else:
                logger.warning(f"Revalidation returned status {response.status_code}: {response.text}")
    except Exception as e:
        # Don't fail the main request if revalidation fails
        logger.error(f"Failed to trigger revalidation: {e}")

# Root-level health endpoint for deployment health checks
@app.get("/health")
async def health_check():
    return {"status": "ok"}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== OBJECT STORAGE HELPERS ==============

def init_storage():
    """Initialize object storage. Call ONCE at startup."""
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_LLM_KEY:
        logger.warning("EMERGENT_LLM_KEY not set - file uploads disabled")
        return None
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_LLM_KEY},
            timeout=30
        )
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Failed to initialize storage: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to object storage. Returns {"path": "...", "size": 123, "etag": "..."}"""
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    """Download file from object storage. Returns (content_bytes, content_type)."""
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage not available")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# MIME type mapping for common image formats
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp"
}

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
    treatment_type: str  # orthodontics, implants, full_mouth, bonding
    answers: Dict[str, Any] = {}
    can_travel: bool = True
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    consent: bool = False
    source: Optional[str] = None  # quiz source identifier
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

# ============== EMAIL ==============

TREATMENT_NAMES = {
    "invisalign": "Инвизалайн",
    "implants": "Зъбни импланти",
    "full_mouth": "Пълна уста"
}

BAND_NAMES = {
    "GREEN": "Зелен (Висок приоритет)",
    "YELLOW": "Жълт (Среден приоритет)",
    "RED": "Червен (Нисък приоритет)"
}

async def send_lead_notification_email(lead_data: dict):
    """Send email notification to admin when a lead submits contact info."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured - skipping email notification")
        return
    
    city_name = CITIES.get(lead_data.get('city_slug', ''), lead_data.get('city_slug', 'N/A'))
    treatment_name = TREATMENT_NAMES.get(lead_data.get('treatment_type', ''), lead_data.get('treatment_type', 'N/A'))
    band = lead_data.get('band', 'N/A')
    band_display = BAND_NAMES.get(band, band)
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🦷 Нов лийд от Zubite.bg</h1>
        </div>
        
        <div style="padding: 24px; background: #f8fafc;">
            <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
                <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">📋 Информация за лийда</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; width: 140px;">Име:</td>
                        <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">{lead_data.get('name', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;">Телефон:</td>
                        <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">{lead_data.get('phone', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;">Имейл:</td>
                        <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">{lead_data.get('email', 'N/A')}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
                <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">📊 Резултати от теста</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; width: 140px;">Град:</td>
                        <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">{city_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;">Лечение:</td>
                        <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">{treatment_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;">Точки:</td>
                        <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">{lead_data.get('score_total', 0)} / 100</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;">Категория:</td>
                        <td style="padding: 8px 0; font-weight: 500; color: {'#16a34a' if band == 'GREEN' else '#ca8a04' if band == 'YELLOW' else '#dc2626'};">{band_display}</td>
                    </tr>
                </table>
            </div>
            
            <div style="text-align: center; padding-top: 8px;">
                <p style="color: #64748b; font-size: 14px; margin: 0;">
                    Вижте всички лийдове в <a href="https://zubite.bg/admin" style="color: #0ea5e9;">админ панела</a>
                </p>
            </div>
        </div>
        
        <div style="background: #0f172a; padding: 16px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2024 Zubite.bg - Всички права запазени</p>
        </div>
    </div>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [ADMIN_EMAIL],
        "subject": f"🦷 Нов лийд: {lead_data.get('name', 'Без име')} - {treatment_name} ({city_name})",
        "html": html_content
    }
    
    try:
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Lead notification email sent to {ADMIN_EMAIL}, email_id: {email_result.get('id')}")
        return email_result
    except Exception as e:
        logger.error(f"Failed to send lead notification email: {str(e)}")
        return None

# ============== SCORING ==============

def calculate_score(treatment_type: str, answers: Dict[str, Any], can_travel: bool = True) -> tuple:
    score_breakdown = {}
    
    if treatment_type == "invisalign" or treatment_type == "orthodontics":
        # Check if it's from the new ortho quiz (has quiz_type in answers)
        if answers.get('quiz_type') in ['smile-classification', 'treatment-match']:
            # For ortho quiz leads, assign a default score based on quiz result
            quiz_result = answers.get('quiz_result', 'consult')
            if quiz_result in ['aligners', 'eligible']:
                score_breakdown["quiz_result"] = 75
            elif quiz_result in ['both', 'consult']:
                score_breakdown["quiz_result"] = 60
            else:  # braces, notEligible
                score_breakdown["quiz_result"] = 50
        else:
            # Original scoring for old quiz format
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
    
    # Store source in answers if provided
    if data.source:
        lead.answers['source'] = data.source
    
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.leads.insert_one(doc)
    
    # Send email notification if contact info provided directly (ortho quiz flow)
    if data.consent and (data.name or data.email):
        asyncio.create_task(send_lead_notification_email(doc))
    
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
    
    # Send email notification to admin (non-blocking)
    if data.consent and (data.name or data.email):
        asyncio.create_task(send_lead_notification_email(lead))
    
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


# Lead update model
class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city_slug: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


@api_router.put("/admin/leads/{lead_id}")
async def update_lead(lead_id: str, update: LeadUpdate, user: AdminUser = Depends(get_current_user)):
    """Update a lead's details"""
    existing = await db.leads.find_one({"id": lead_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return updated


@api_router.delete("/admin/leads/{lead_id}")
async def delete_lead(lead_id: str, user: AdminUser = Depends(get_current_user)):
    """Delete a specific lead"""
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True, "message": "Lead deleted"}


@api_router.post("/admin/reset-analytics")
async def reset_analytics(user: AdminUser = Depends(get_current_user)):
    """Reset all analytics events"""
    result = await db.analytics_events.delete_many({})
    return {"success": True, "deleted_count": result.deleted_count}


@api_router.post("/admin/reset-blog-views")
async def reset_blog_views(user: AdminUser = Depends(get_current_user)):
    """Reset all blog view tracking data"""
    result = await db.blog_views.delete_many({})
    return {"success": True, "deleted_count": result.deleted_count}


@api_router.post("/admin/cleanup-leads")
async def cleanup_leads(keep_ids: List[str], user: AdminUser = Depends(get_current_user)):
    """Delete all leads except the specified ones"""
    result = await db.leads.delete_many({"id": {"$nin": keep_ids}})
    return {"success": True, "deleted_count": result.deleted_count}


# ============== AI OUTBOUND CALLING ==============

from services.patient_context_mapper import map_lead_to_patient_context, build_ai_prompt_context, normalize_phone_number
from services.elevenlabs_service import (
    initiate_outbound_call, 
    verify_webhook_signature, 
    parse_webhook_payload,
    format_transcript_text,
    ELEVENLABS_AGENT_ID
)
from models.call_models import CallStatus, InitiateCallResponse

# Twilio phone number ID - will be configured later
TWILIO_PHONE_NUMBER_ID = os.environ.get('ELEVENLABS_TWILIO_PHONE_ID')


class CallInitiateRequest(BaseModel):
    """Request body for initiating a call"""
    pass  # No additional fields needed - lead_id comes from URL


@api_router.post("/admin/leads/{lead_id}/call", response_model=InitiateCallResponse)
async def initiate_lead_call(lead_id: str, user: AdminUser = Depends(get_current_user)):
    """
    Initiate an AI outbound call to a lead.
    
    This endpoint:
    1. Loads the lead and quiz data
    2. Transforms it into structured patient context
    3. Calls ElevenLabs to initiate the outbound call
    4. Updates the lead with call status
    5. Creates a call log entry
    """
    # Load lead
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check if call is already in progress
    if lead.get('call_status') == CallStatus.CALLING.value:
        raise HTTPException(
            status_code=400, 
            detail="A call is already in progress for this lead"
        )
    
    # Validate phone number
    phone = lead.get('phone')
    if not phone:
        raise HTTPException(status_code=400, detail="Lead has no phone number")
    
    # Normalize phone number
    normalized_phone = normalize_phone_number(phone)
    if not normalized_phone or len(normalized_phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number format")
    
    # Transform lead to patient context
    try:
        patient_context = map_lead_to_patient_context(lead)
        ai_context = build_ai_prompt_context(patient_context)
    except Exception as e:
        logger.error(f"Failed to build patient context: {e}")
        raise HTTPException(status_code=500, detail="Failed to prepare patient context")
    
    # Generate call log ID
    call_log_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # Initiate call via ElevenLabs
    success, call_response = initiate_outbound_call(
        phone_number=normalized_phone,
        lead_id=lead_id,
        patient_context=ai_context,
        agent_phone_number_id=TWILIO_PHONE_NUMBER_ID
    )
    
    # Prepare call log entry
    call_log = {
        "id": call_log_id,
        "lead_id": lead_id,
        "conversation_id": call_response.get("conversation_id"),
        "call_sid": call_response.get("call_sid"),
        "initiated_at": now.isoformat(),
        "initiated_by": user.id,
        "status": CallStatus.CALLING.value if success else CallStatus.FAILED.value,
        "patient_context": ai_context,
        "phone_number": normalized_phone,
        "error_message": call_response.get("message") if not success else None,
        "is_mock": call_response.get("mock", False),
    }
    
    # Insert call log
    await db.lead_call_logs.insert_one(call_log)
    
    # Update lead with call status
    call_attempts = lead.get('call_attempts', 0) + 1
    update_data = {
        "call_status": CallStatus.CALLING.value if success else CallStatus.FAILED.value,
        "call_attempts": call_attempts,
        "last_call_at": now.isoformat(),
        "last_call_id": call_log_id,
        "last_conversation_id": call_response.get("conversation_id"),
    }
    
    if not success:
        update_data["call_error_message"] = call_response.get("message")
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    
    return InitiateCallResponse(
        success=success,
        message=call_response.get("message", "Call initiated"),
        conversation_id=call_response.get("conversation_id"),
        call_sid=call_response.get("call_sid"),
        call_log_id=call_log_id
    )


@api_router.get("/admin/leads/{lead_id}/call-logs")
async def get_lead_call_logs(lead_id: str, user: AdminUser = Depends(get_current_user)):
    """Get all call logs for a specific lead"""
    logs = await db.lead_call_logs.find(
        {"lead_id": lead_id}, 
        {"_id": 0}
    ).sort("initiated_at", -1).to_list(50)
    return {"logs": logs, "total": len(logs)}


@api_router.get("/admin/call-logs/{call_log_id}")
async def get_call_log(call_log_id: str, user: AdminUser = Depends(get_current_user)):
    """Get a specific call log by ID"""
    log = await db.lead_call_logs.find_one({"id": call_log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Call log not found")
    return log


# ============== ELEVENLABS WEBHOOK ==============

from fastapi import Request, Header, BackgroundTasks
import json as json_module

# Timeout for stuck calls (in minutes)
CALL_TIMEOUT_MINUTES = 5


async def cleanup_stuck_calls():
    """Background task to reset calls stuck in 'calling' status for too long"""
    timeout_threshold = datetime.now(timezone.utc) - timedelta(minutes=CALL_TIMEOUT_MINUTES)
    
    # Find and update stuck calls
    result = await db.leads.update_many(
        {
            "call_status": "calling",
            "last_call_at": {"$lt": timeout_threshold.isoformat()}
        },
        {
            "$set": {
                "call_status": "failed",
                "call_error_message": f"Call timed out after {CALL_TIMEOUT_MINUTES} minutes - no webhook received"
            }
        }
    )
    
    if result.modified_count > 0:
        logger.info(f"Reset {result.modified_count} stuck calls to 'failed' status")


@api_router.post("/webhooks/elevenlabs/post-call")
async def elevenlabs_post_call_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    elevenlabs_signature: Optional[str] = Header(None, alias="ElevenLabs-Signature"),
    x_elevenlabs_signature: Optional[str] = Header(None, alias="X-ElevenLabs-Signature")
):
    """
    Webhook endpoint for ElevenLabs post-call data.
    
    This endpoint receives call results after a call ends, including:
    - Transcript
    - AI-generated summary
    - Extracted data (treatment interest, timeline, etc.)
    
    Always returns 200 to acknowledge receipt.
    """
    # Read raw body for signature verification
    body = await request.body()
    
    # Log incoming webhook
    logger.info(f"Received ElevenLabs webhook, body size: {len(body)} bytes")
    
    # Get signature from either header format
    signature = elevenlabs_signature or x_elevenlabs_signature
    
    # Verify signature if configured and provided
    webhook_secret = os.environ.get('ELEVENLABS_WEBHOOK_SECRET')
    if webhook_secret and signature:
        if not verify_webhook_signature(body, signature):
            logger.warning("Invalid webhook signature - processing anyway for debugging")
            # Don't reject - just log warning
    
    # Parse JSON payload
    try:
        payload = json_module.loads(body)
        logger.info(f"Webhook payload type: {payload.get('type')}")
        logger.debug(f"Full webhook payload: {json_module.dumps(payload, indent=2, default=str)}")
    except Exception as e:
        logger.error(f"Failed to parse webhook payload: {e}")
        # Return 200 anyway to prevent retries
        return {"status": "ok", "processed": False, "error": "invalid_json"}
    
    # Schedule cleanup of stuck calls
    background_tasks.add_task(cleanup_stuck_calls)
    
    # Handle different webhook types
    webhook_type = payload.get("type", "")
    event_type = payload.get("event_type", "")
    
    # ElevenLabs can send different event types
    is_post_call = webhook_type in ["post_call_transcription", "conversation.ended", "call.ended"] or \
                   event_type in ["post_call_transcription", "conversation_ended", "call_ended"]
    
    if not is_post_call:
        logger.info(f"Received non-post-call webhook: type={webhook_type}, event={event_type}")
        return {"status": "ok", "processed": False, "reason": "not_post_call_event"}
    
    # Extract data from various possible payload structures
    data = payload.get("data", payload)  # Sometimes data is at root level
    
    # Try to find conversation_id from various locations
    conversation_id = (
        data.get("conversation_id") or 
        data.get("conversationId") or
        payload.get("conversation_id") or
        payload.get("conversationId")
    )
    
    # Try to find lead_id from conversation initiation data
    initiation_data = (
        data.get("conversation_initiation_client_data") or
        data.get("conversationInitiationClientData") or
        data.get("metadata", {}).get("conversation_initiation_client_data") or
        {}
    )
    lead_id = initiation_data.get("lead_id")
    
    logger.info(f"Webhook identifiers - conversation_id: {conversation_id}, lead_id: {lead_id}")
    
    if not lead_id and not conversation_id:
        logger.warning("Webhook missing both lead_id and conversation_id")
        return {"status": "ok", "processed": False, "reason": "no_identifiers"}
    
    # Find the lead - try multiple methods
    lead = None
    
    # Method 1: Direct lead_id lookup
    if lead_id:
        lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        if lead:
            logger.info(f"Found lead by lead_id: {lead_id}")
    
    # Method 2: Lookup by conversation_id stored on lead
    if not lead and conversation_id:
        lead = await db.leads.find_one({"last_conversation_id": conversation_id}, {"_id": 0})
        if lead:
            logger.info(f"Found lead by conversation_id: {conversation_id}")
    
    # Method 3: Lookup via call_logs collection
    if not lead and conversation_id:
        call_log = await db.lead_call_logs.find_one({"conversation_id": conversation_id}, {"_id": 0})
        if call_log and call_log.get("lead_id"):
            lead = await db.leads.find_one({"id": call_log["lead_id"]}, {"_id": 0})
            if lead:
                logger.info(f"Found lead via call_log: {call_log['lead_id']}")
    
    if not lead:
        logger.warning(f"Lead not found for webhook: lead_id={lead_id}, conv_id={conversation_id}")
        return {"status": "ok", "processed": False, "reason": "lead_not_found"}
    
    # Parse call status from various payload formats
    call_status_raw = (
        data.get("status") or 
        data.get("call_status") or 
        data.get("termination_reason") or
        "unknown"
    ).lower()
    
    # Map ElevenLabs status to our status
    status_mapping = {
        "completed": "completed",
        "success": "completed",
        "answered": "completed",
        "ended": "completed",
        "no_answer": "no_answer",
        "no-answer": "no_answer",
        "noanswer": "no_answer",
        "busy": "no_answer",
        "failed": "failed",
        "error": "failed",
        "cancelled": "failed",
        "canceled": "failed",
        "rejected": "no_answer",
    }
    
    # Check if call was answered by looking at transcript
    transcript = data.get("transcript", [])
    has_transcript = len(transcript) > 0 if isinstance(transcript, list) else bool(transcript)
    
    # Determine final call status
    if has_transcript:
        call_status = "completed"
        answered = True
    elif call_status_raw in status_mapping:
        call_status = status_mapping[call_status_raw]
        answered = call_status == "completed"
    else:
        call_status = "no_answer"
        answered = False
    
    logger.info(f"Call status determined: {call_status}, answered: {answered}")
    
    # Extract analysis/summary from various locations
    analysis = data.get("analysis", {})
    summary = (
        analysis.get("transcript_summary") or
        analysis.get("summary") or
        data.get("summary") or
        data.get("call_summary")
    )
    
    # Extract duration
    metadata = data.get("metadata", {})
    duration_seconds = (
        metadata.get("call_duration_seconds") or
        metadata.get("duration_seconds") or
        data.get("call_duration_seconds") or
        data.get("duration_seconds") or
        data.get("duration")
    )
    
    # Extract data collection results (custom fields)
    data_collection = (
        analysis.get("data_collection_results") or
        analysis.get("collected_data") or
        data.get("data_collection_results") or
        {}
    )
    
    # Build outcome object
    outcome = {
        "interested_in_treatment": data_collection.get("interested_in_treatment"),
        "treatment_interest": data_collection.get("treatment_interest"),
        "treatment_timeline": data_collection.get("treatment_timeline"),
        "permission_to_share": data_collection.get("permission_to_share"),
        "willing_to_travel": data_collection.get("willing_to_travel"),
        "follow_up_needed": data_collection.get("follow_up_needed"),
    }
    # Remove None values
    outcome = {k: v for k, v in outcome.items() if v is not None}
    
    # Prepare error message if call failed
    error_message = None
    if call_status == "failed":
        error_message = (
            data.get("error_message") or
            data.get("failure_reason") or
            data.get("termination_reason") or
            "Call failed"
        )
    
    # Update lead with call results
    update_data = {
        "call_status": call_status,
        "answered_call": answered,
        "last_call_duration_seconds": duration_seconds,
        "call_summary": summary,
        "call_transcript": transcript if isinstance(transcript, list) else [],
        "call_outcome_json": outcome,
        "call_error_message": error_message,
    }
    
    # Add extracted fields if present
    if outcome.get("interested_in_treatment") is not None:
        update_data["interested_in_treatment"] = outcome["interested_in_treatment"]
    if outcome.get("treatment_interest"):
        update_data["treatment_interest"] = outcome["treatment_interest"]
    if outcome.get("treatment_timeline"):
        update_data["treatment_timeline"] = outcome["treatment_timeline"]
    if outcome.get("permission_to_share") is not None:
        update_data["permission_to_share"] = outcome["permission_to_share"]
    
    await db.leads.update_one({"id": lead["id"]}, {"$set": update_data})
    logger.info(f"Updated lead {lead['id']} with call results")
    
    # Update call log entry
    call_log_update = {
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "status": call_status,
        "answered": answered,
        "duration_seconds": duration_seconds,
        "summary": summary,
        "transcript": transcript if isinstance(transcript, list) else [],
        "outcome": outcome,
        "raw_webhook_data": data,
    }
    
    # Find and update call log
    updated_log = False
    if conversation_id:
        result = await db.lead_call_logs.update_one(
            {"conversation_id": conversation_id},
            {"$set": call_log_update}
        )
        updated_log = result.modified_count > 0
    
    if not updated_log and lead.get("last_call_id"):
        await db.lead_call_logs.update_one(
            {"id": lead["last_call_id"]},
            {"$set": call_log_update}
        )
    
    logger.info(f"Successfully processed post-call webhook for lead {lead['id']}: status={call_status}")
    
    return {"status": "ok", "processed": True, "lead_id": lead["id"], "call_status": call_status}


@api_router.post("/admin/calls/cleanup-stuck")
async def cleanup_stuck_calls_endpoint(user: AdminUser = Depends(get_current_user)):
    """Manually trigger cleanup of stuck calls"""
    timeout_threshold = datetime.now(timezone.utc) - timedelta(minutes=CALL_TIMEOUT_MINUTES)
    
    result = await db.leads.update_many(
        {
            "call_status": "calling",
            "last_call_at": {"$lt": timeout_threshold.isoformat()}
        },
        {
            "$set": {
                "call_status": "failed",
                "call_error_message": f"Call timed out - no webhook received"
            }
        }
    )
    
    return {"success": True, "reset_count": result.modified_count}


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

# SEO routes - must be before include_router
@api_router.get("/seo/", response_class=HTMLResponse)
async def serve_homepage_bg():
    file_path = STATIC_DIR / "index.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")

@api_router.get("/seo/en/", response_class=HTMLResponse)
async def serve_homepage_en():
    file_path = STATIC_DIR / "en" / "index.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")

@api_router.get("/seo/city/{city_slug}/", response_class=HTMLResponse)
async def serve_city_page_bg(city_slug: str):
    file_path = STATIC_DIR / "city" / city_slug / "index.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")

@api_router.get("/seo/en/city/{city_slug}/", response_class=HTMLResponse)
async def serve_city_page_en(city_slug: str):
    file_path = STATIC_DIR / "en" / "city" / city_slug / "index.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")

@api_router.get("/seo/city/{city_slug}/ortho/", response_class=HTMLResponse)
async def serve_ortho_page_bg(city_slug: str):
    file_path = STATIC_DIR / "city" / city_slug / "ortho" / "index.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")

# ============== BLOG MODELS ==============

class BlogPostCreate(BaseModel):
    title: str
    slug: str
    excerpt: str
    content: str
    featured_image: Optional[str] = None
    category: str = "orthodontics"
    tags: List[str] = []
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_published: bool = False

class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_published: Optional[bool] = None

class BlogPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    slug: str
    excerpt: str
    content: str
    featured_image: Optional[str] = None
    category: str = "orthodontics"
    tags: List[str] = []
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_published: bool = False
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    published_at: Optional[datetime] = None
    view_count: int = 0

# ============== BLOG ENDPOINTS ==============

# Public blog endpoints
@api_router.get("/blog/posts")
async def get_published_posts(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 10,
    skip: int = 0
):
    """Get published blog posts for public view"""
    query = {"is_published": True}
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
    
    cursor = db.blog_posts.find(query, {"_id": 0}).sort("published_at", -1).skip(skip).limit(limit)
    posts = await cursor.to_list(length=limit)
    total = await db.blog_posts.count_documents(query)
    
    return {"posts": posts, "total": total}

@api_router.get("/blog/posts/{slug}")
async def get_post_by_slug(slug: str):
    """Get a single published blog post by slug"""
    post = await db.blog_posts.find_one({"slug": slug, "is_published": True}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Increment view count
    await db.blog_posts.update_one({"slug": slug}, {"$inc": {"view_count": 1}})
    
    return post


# Blog view tracking model
class BlogViewEvent(BaseModel):
    post_slug: str
    visitor_id: str
    referrer: Optional[str] = None
    user_agent: Optional[str] = None


@api_router.post("/blog/track-view")
async def track_blog_view(event: BlogViewEvent):
    """Track a unique blog post view"""
    # Check if this visitor already viewed this post today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    existing = await db.blog_views.find_one({
        "post_slug": event.post_slug,
        "visitor_id": event.visitor_id,
        "date": today
    })
    
    if not existing:
        # New unique view for today
        await db.blog_views.insert_one({
            "id": str(uuid.uuid4()),
            "post_slug": event.post_slug,
            "visitor_id": event.visitor_id,
            "referrer": event.referrer,
            "user_agent": event.user_agent,
            "date": today,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"tracked": True, "unique": True}
    
    return {"tracked": True, "unique": False}


@api_router.get("/admin/blog/analytics")
async def get_blog_analytics(user: AdminUser = Depends(get_current_user)):
    """Get blog traffic analytics"""
    # Get all blog posts
    posts = await db.blog_posts.find({"is_published": True}, {"_id": 0}).to_list(1000)
    
    # Get view counts per post
    pipeline = [
        {"$group": {
            "_id": "$post_slug",
            "total_views": {"$sum": 1},
            "unique_visitors": {"$addToSet": "$visitor_id"}
        }}
    ]
    view_stats = await db.blog_views.aggregate(pipeline).to_list(1000)
    view_map = {stat["_id"]: {
        "total_views": stat["total_views"],
        "unique_visitors": len(stat["unique_visitors"])
    } for stat in view_stats}
    
    # Get views per day for last 30 days
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    daily_pipeline = [
        {"$match": {"date": {"$gte": thirty_days_ago}}},
        {"$group": {
            "_id": "$date",
            "views": {"$sum": 1},
            "unique_visitors": {"$addToSet": "$visitor_id"}
        }},
        {"$sort": {"_id": 1}}
    ]
    daily_stats = await db.blog_views.aggregate(daily_pipeline).to_list(100)
    views_per_day = [{
        "date": stat["_id"],
        "views": stat["views"],
        "unique_visitors": len(stat["unique_visitors"])
    } for stat in daily_stats]
    
    # Calculate totals
    total_views = sum(stat.get("total_views", 0) for stat in view_stats)
    all_visitors = set()
    for stat in view_stats:
        all_visitors.update(stat.get("unique_visitors", []))
    total_unique_visitors = len(all_visitors)
    
    # Build post stats with view counts
    post_stats = []
    for post in posts:
        slug = post.get("slug", "")
        stats = view_map.get(slug, {"total_views": 0, "unique_visitors": 0})
        post_stats.append({
            "slug": slug,
            "title": post.get("title", ""),
            "category": post.get("category", ""),
            "published_at": post.get("published_at"),
            "total_views": stats["total_views"],
            "unique_visitors": stats["unique_visitors"]
        })
    
    # Sort by unique visitors descending
    post_stats.sort(key=lambda x: x["unique_visitors"], reverse=True)
    
    return {
        "total_views": total_views,
        "total_unique_visitors": total_unique_visitors,
        "total_posts": len(posts),
        "views_per_day": views_per_day,
        "post_stats": post_stats
    }


# ============== FILE UPLOAD ENDPOINTS ==============

@api_router.post("/admin/upload")
async def admin_upload_file(
    file: UploadFile = File(...),
    user: AdminUser = Depends(get_current_user)
):
    """Upload an image file for blog posts. Returns the URL to access it."""
    # Validate file type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES.keys())}"
        )
    
    # Generate unique filename
    ext = ALLOWED_IMAGE_TYPES[content_type]
    file_id = str(uuid.uuid4())
    storage_path = f"{APP_NAME}/blog/{file_id}.{ext}"
    
    # Read file content
    file_data = await file.read()
    
    # Check file size (max 5MB)
    if len(file_data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
    
    try:
        # Upload to object storage
        result = put_object(storage_path, file_data, content_type)
        
        # Store reference in database
        file_record = {
            "id": file_id,
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": content_type,
            "size": result["size"],
            "uploaded_by": user.id,
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.uploaded_files.insert_one(file_record)
        
        # Return URL that can be used in blog posts
        # The URL will be served through our API
        return {
            "success": True,
            "file_id": file_id,
            "url": f"/api/files/{file_id}",
            "filename": file.filename,
            "size": result["size"]
        }
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file")

@api_router.get("/files/{file_id}")
async def serve_file(file_id: str):
    """Serve an uploaded file by its ID. No auth required for public blog images."""
    # Find file record in database
    record = await db.uploaded_files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Get file from storage
        data, content_type = get_object(record["storage_path"])
        return Response(
            content=data,
            media_type=record.get("content_type", content_type),
            headers={
                "Cache-Control": "public, max-age=31536000",  # Cache for 1 year
                "Content-Disposition": f"inline; filename=\"{record.get('original_filename', 'image')}\""
            }
        )
    except Exception as e:
        logger.error(f"Failed to serve file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve file")

@api_router.get("/admin/files")
async def admin_list_files(
    user: AdminUser = Depends(get_current_user),
    limit: int = 50,
    skip: int = 0
):
    """List all uploaded files for admin."""
    cursor = db.uploaded_files.find(
        {"is_deleted": False},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit)
    files = await cursor.to_list(length=limit)
    total = await db.uploaded_files.count_documents({"is_deleted": False})
    return {"files": files, "total": total}

@api_router.delete("/admin/files/{file_id}")
async def admin_delete_file(file_id: str, user: AdminUser = Depends(get_current_user)):
    """Soft-delete an uploaded file."""
    result = await db.uploaded_files.update_one(
        {"id": file_id},
        {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    return {"success": True, "message": "File deleted"}

# Admin blog endpoints
@api_router.get("/admin/blog/posts")
async def admin_get_posts(
    user: AdminUser = Depends(get_current_user),
    is_published: Optional[bool] = None,
    limit: int = 50,
    skip: int = 0
):
    """Get all blog posts for admin"""
    query = {}
    if is_published is not None:
        query["is_published"] = is_published
    
    cursor = db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    posts = await cursor.to_list(length=limit)
    total = await db.blog_posts.count_documents(query)
    
    return {"posts": posts, "total": total}

@api_router.get("/admin/blog/posts/{post_id}")
async def admin_get_post(post_id: str, user: AdminUser = Depends(get_current_user)):
    """Get a single blog post by ID for admin"""
    post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@api_router.post("/admin/blog/posts", response_model=BlogPost)
async def admin_create_post(
    post_data: BlogPostCreate,
    user: AdminUser = Depends(get_current_user)
):
    """Create a new blog post"""
    # Check if slug already exists
    existing = await db.blog_posts.find_one({"slug": post_data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    post = BlogPost(
        **post_data.model_dump(),
        author_id=user.id,
        author_name=user.username,
        published_at=datetime.now(timezone.utc) if post_data.is_published else None
    )
    
    await db.blog_posts.insert_one(post.model_dump())
    
    # Trigger revalidation if the post is published
    if post_data.is_published:
        asyncio.create_task(trigger_revalidation(slug=post.slug, action="create"))
    
    return post

@api_router.put("/admin/blog/posts/{post_id}", response_model=BlogPost)
async def admin_update_post(
    post_id: str,
    post_data: BlogPostUpdate,
    user: AdminUser = Depends(get_current_user)
):
    """Update a blog post"""
    existing = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update_data = {k: v for k, v in post_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Set published_at if publishing for the first time
    if post_data.is_published and not existing.get("published_at"):
        update_data["published_at"] = datetime.now(timezone.utc)
    
    await db.blog_posts.update_one({"id": post_id}, {"$set": update_data})
    
    updated = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    
    # Trigger revalidation - use new slug if changed, otherwise existing
    slug_to_revalidate = post_data.slug if post_data.slug else existing.get("slug")
    asyncio.create_task(trigger_revalidation(slug=slug_to_revalidate, action="update"))
    
    return BlogPost(**updated)

@api_router.delete("/admin/blog/posts/{post_id}")
async def admin_delete_post(post_id: str, user: AdminUser = Depends(get_current_user)):
    """Delete a blog post"""
    # Get the post first to get the slug for revalidation
    existing = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    
    result = await db.blog_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Trigger revalidation to remove from listings
    if existing:
        asyncio.create_task(trigger_revalidation(slug=existing.get("slug"), action="delete"))
    
    return {"message": "Post deleted successfully"}

@api_router.get("/seo/en/city/{city_slug}/ortho/", response_class=HTMLResponse)
async def serve_ortho_page_en(city_slug: str):
    file_path = STATIC_DIR / "en" / "city" / city_slug / "ortho" / "index.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")

@api_router.get("/seo/static/{file_path:path}")
async def serve_static_file(file_path: str):
    full_path = STATIC_DIR / file_path
    if full_path.exists() and full_path.is_file():
        return FileResponse(full_path)
    raise HTTPException(status_code=404, detail="File not found")


# ============================================
# ANALYTICS ENDPOINTS
# ============================================

class AnalyticsEvent(BaseModel):
    event_type: str
    session_id: str
    timestamp: str
    question_id: Optional[str] = None
    question_index: Optional[int] = None
    answer: Optional[str] = None
    score: Optional[int] = None
    time_spent_ms: Optional[int] = None
    total_score: Optional[int] = None
    band: Optional[str] = None
    total_time_ms: Optional[int] = None
    answers: Optional[List[Dict[str, Any]]] = None
    choice: Optional[str] = None
    form_version: Optional[str] = None
    city: Optional[str] = None
    has_name: Optional[bool] = None
    has_email: Optional[bool] = None

@api_router.post("/analytics/events")
async def track_analytics_event(event: AnalyticsEvent):
    """Track quiz analytics event"""
    doc = {
        "id": str(uuid.uuid4()),
        "event_type": event.event_type,
        "session_id": event.session_id,
        "timestamp": event.timestamp,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **{k: v for k, v in event.model_dump().items() if v is not None and k not in ['event_type', 'session_id', 'timestamp']}
    }
    await db.analytics_events.insert_one(doc)
    return {"status": "ok"}


class QuizAnalytics(BaseModel):
    total_starts: int
    total_completions: int
    completion_rate: float
    avg_time_seconds: float
    dropoff_by_question: Dict[str, int]
    question_stats: Dict[str, Dict[str, float]]
    result_distribution: Dict[str, int]
    funnel: Dict[str, int]
    leads_per_day: List[Dict[str, Any]]
    leads_by_city: Dict[str, int]
    form_version_stats: Dict[str, int]


@api_router.get("/admin/analytics")
async def get_analytics(user: AdminUser = Depends(get_current_user)):
    """Get comprehensive quiz analytics"""
    
    # Get all events
    events = await db.analytics_events.find().to_list(10000)
    
    # Calculate metrics
    sessions = {}
    for event in events:
        sid = event.get('session_id')
        if sid not in sessions:
            sessions[sid] = {'events': [], 'started': False, 'completed': False}
        sessions[sid]['events'].append(event)
        if event.get('event_type') == 'quiz_start':
            sessions[sid]['started'] = True
        if event.get('event_type') == 'quiz_completed':
            sessions[sid]['completed'] = True
    
    total_starts = sum(1 for s in sessions.values() if s['started'])
    total_completions = sum(1 for s in sessions.values() if s['completed'])
    completion_rate = (total_completions / total_starts * 100) if total_starts > 0 else 0
    
    # Average time to complete
    completion_times = []
    for s in sessions.values():
        for e in s['events']:
            if e.get('event_type') == 'quiz_completed' and e.get('total_time_ms'):
                completion_times.append(e['total_time_ms'] / 1000)
    avg_time = sum(completion_times) / len(completion_times) if completion_times else 0
    
    # Drop-off by question
    question_answers = {}
    for event in events:
        if event.get('event_type') == 'question_answered':
            q_idx = event.get('question_index', 0)
            question_answers[q_idx] = question_answers.get(q_idx, 0) + 1
    
    dropoff = {}
    for i in range(1, 11):
        current = question_answers.get(i, 0)
        previous = question_answers.get(i - 1, total_starts) if i > 1 else total_starts
        dropoff[f"q{i}"] = previous - current if previous > current else 0
    
    # Question stats (answer distribution)
    question_stats = {}
    for i in range(1, 11):
        q_key = f"q{i}"
        question_stats[q_key] = {"yes": 0, "sometimes": 0, "unsure": 0, "no": 0}
    
    for event in events:
        if event.get('event_type') == 'question_answered':
            q_idx = event.get('question_index', 0)
            answer = event.get('answer', '')
            q_key = f"q{q_idx}"
            if q_key in question_stats and answer in question_stats[q_key]:
                question_stats[q_key][answer] += 1
    
    # Convert to percentages
    for q_key, stats in question_stats.items():
        total = sum(stats.values())
        if total > 0:
            for answer in stats:
                stats[answer] = round(stats[answer] / total * 100, 1)
    
    # Result distribution - check both field names for compatibility
    result_dist = {"early": 0, "developing": 0, "advanced": 0}
    for event in events:
        if event.get('event_type') == 'quiz_completed':
            band = event.get('band', '')
            # Handle different naming conventions
            if band == 'progressing':
                band = 'developing'
            if band in result_dist:
                result_dist[band] += 1
    
    # Funnel metrics
    soft_commits_yes = sum(1 for e in events if e.get('event_type') == 'soft_commit' and e.get('choice') == 'yes')
    soft_commits_no = sum(1 for e in events if e.get('event_type') == 'soft_commit' and e.get('choice') == 'no')
    form_submits = sum(1 for e in events if e.get('event_type') == 'form_submitted')
    
    funnel = {
        "quiz_start": total_starts,
        "quiz_completed": total_completions,
        "soft_commit_yes": soft_commits_yes,
        "soft_commit_no": soft_commits_no,
        "form_submitted": form_submits
    }
    
    # Leads per day (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    leads_cursor = db.leads.find({"created_at": {"$gte": thirty_days_ago.isoformat()}})
    leads = await leads_cursor.to_list(1000)
    
    leads_by_date = {}
    for lead in leads:
        created = lead.get('created_at', '')[:10]
        leads_by_date[created] = leads_by_date.get(created, 0) + 1
    
    leads_per_day = [{"date": k, "count": v} for k, v in sorted(leads_by_date.items())]
    
    # Leads by city
    leads_by_city = {
        "sofia": await db.leads.count_documents({"city_slug": "sofia"}),
        "plovdiv": await db.leads.count_documents({"city_slug": "plovdiv"})
    }
    
    # Form version stats - check in both main level and answers object
    form_a_count = 0
    form_b_count = 0
    
    leads_for_form = await db.leads.find({}, {"form_version": 1, "answers": 1, "_id": 0}).to_list(10000)
    for lead in leads_for_form:
        fv = lead.get('form_version') or (lead.get('answers', {}) or {}).get('form_version')
        if fv == 'A':
            form_a_count += 1
        elif fv == 'B':
            form_b_count += 1
    
    form_version_stats = {"A": form_a_count, "B": form_b_count}
    
    # Total leads count
    total_leads = await db.leads.count_documents({})
    
    return {
        "total_starts": total_starts,
        "total_completions": total_completions,
        "completion_rate": round(completion_rate, 1),
        "avg_time_seconds": round(avg_time, 1),
        "dropoff_by_question": dropoff,
        "question_stats": question_stats,
        "result_distribution": result_dist,
        "funnel": funnel,
        "leads_per_day": leads_per_day,
        "leads_by_city": leads_by_city,
        "form_version_stats": form_version_stats,
        "total_leads": total_leads
    }


# ─── Clinic Applications ──────────────────────────────────

class ClinicApplicationCreate(BaseModel):
    clinic_name: str
    contact_name: str
    city: str
    phone: str
    email: str

@api_router.post("/clinic-applications")
async def create_clinic_application(application: ClinicApplicationCreate):
    """Receive a clinic partnership application"""
    doc = {
        "id": str(uuid.uuid4()),
        "clinic_name": application.clinic_name,
        "contact_name": application.contact_name,
        "city": application.city,
        "phone": application.phone,
        "email": application.email,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.clinic_applications.insert_one(doc)

    # Send notification email to admin
    if RESEND_API_KEY and ADMIN_EMAIL:
        try:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": ADMIN_EMAIL,
                "subject": f"Нова кандидатура от клиника: {application.clinic_name}",
                "html": f"""
                <h2>Нова кандидатура за партньорство</h2>
                <p><strong>Клиника:</strong> {application.clinic_name}</p>
                <p><strong>Контакт:</strong> {application.contact_name}</p>
                <p><strong>Град:</strong> {application.city}</p>
                <p><strong>Телефон:</strong> {application.phone}</p>
                <p><strong>Имейл:</strong> {application.email}</p>
                """
            })
        except Exception as e:
            logging.error(f"Failed to send clinic application email: {e}")

    return {"status": "ok", "id": doc["id"]}

@api_router.get("/admin/clinic-applications")
async def get_clinic_applications(user: AdminUser = Depends(get_current_user)):
    """Get all clinic applications (admin only)"""
    apps = await db.clinic_applications.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return {"applications": apps}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for CSS/JS (for direct app access)
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.on_event("startup")
async def startup():
    await db.leads.create_index("id", unique=True)
    await db.leads.create_index("city_slug")
    await db.leads.create_index("band")
    await db.leads.create_index("status")
    await db.leads.create_index("form_version")
    await db.leads.create_index("call_status")
    await db.leads.create_index("last_conversation_id")
    await db.clinics.create_index("id", unique=True)
    await db.clinics.create_index("city_slug")
    await db.admin_users.create_index("username", unique=True)
    await db.blog_posts.create_index("id", unique=True)
    await db.blog_posts.create_index("slug", unique=True)
    await db.blog_posts.create_index("is_published")
    await db.blog_posts.create_index("category")
    await db.analytics_events.create_index("session_id")
    await db.analytics_events.create_index("event_type")
    await db.analytics_events.create_index("created_at")
    await db.uploaded_files.create_index("id", unique=True)
    await db.uploaded_files.create_index("is_deleted")
    await db.blog_views.create_index([("post_slug", 1), ("visitor_id", 1), ("date", 1)])
    await db.blog_views.create_index("date")
    # Call logs indexes
    await db.lead_call_logs.create_index("id", unique=True)
    await db.lead_call_logs.create_index("lead_id")
    await db.lead_call_logs.create_index("conversation_id")
    await db.lead_call_logs.create_index("initiated_at")
    
    # Clinic applications indexes
    await db.clinic_applications.create_index("id", unique=True)
    await db.clinic_applications.create_index("status")
    
    # Initialize object storage
    init_storage()

@app.on_event("shutdown")
async def shutdown():
    client.close()
