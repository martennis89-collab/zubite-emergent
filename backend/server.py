from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
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
    "varna": "Варна"
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

# Mount static files for CSS/JS
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Static HTML routes for SEO
@app.get("/seo/", response_class=HTMLResponse)
async def serve_homepage_bg():
    file_path = STATIC_DIR / "index.html"
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Page not found")

@app.get("/seo/en/", response_class=HTMLResponse)
async def serve_homepage_en():
    file_path = STATIC_DIR / "en" / "index.html"
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Page not found")

@app.get("/seo/city/{city_slug}/", response_class=HTMLResponse)
async def serve_city_page_bg(city_slug: str):
    file_path = STATIC_DIR / "city" / city_slug / "index.html"
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Page not found")

@app.get("/seo/en/city/{city_slug}/", response_class=HTMLResponse)
async def serve_city_page_en(city_slug: str):
    file_path = STATIC_DIR / "en" / "city" / city_slug / "index.html"
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Page not found")

@app.get("/seo/city/{city_slug}/ortho/", response_class=HTMLResponse)
async def serve_ortho_page_bg(city_slug: str):
    file_path = STATIC_DIR / "city" / city_slug / "ortho" / "index.html"
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Page not found")

@app.get("/seo/en/city/{city_slug}/ortho/", response_class=HTMLResponse)
async def serve_ortho_page_en(city_slug: str):
    file_path = STATIC_DIR / "en" / "city" / city_slug / "ortho" / "index.html"
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Page not found")

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
