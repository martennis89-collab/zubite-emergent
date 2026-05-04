from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


# ─── Public / Seed Models ─────────────────────────────────

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
    city_slug: str = Field(min_length=1, max_length=50)
    treatment_type: str = Field(min_length=1, max_length=50)
    answers: Dict[str, Any] = {}
    can_travel: bool = True
    name: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[EmailStr] = None
    consent: bool = False
    source: Optional[str] = Field(default=None, max_length=100)
    utm_source: Optional[str] = Field(default=None, max_length=200)
    utm_campaign: Optional[str] = Field(default=None, max_length=200)
    utm_adset: Optional[str] = Field(default=None, max_length=200)
    utm_ad: Optional[str] = Field(default=None, max_length=200)
    page_path: Optional[str] = Field(default=None, max_length=500)


class LeadContactUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[EmailStr] = None
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


# ─── Admin Models ──────────────────────────────────────────

class LeadStatusUpdate(BaseModel):
    status: Optional[str] = None
    assigned_clinic_id: Optional[str] = None
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city_slug: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AdminLogin(BaseModel):
    username: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=1, max_length=200)


class AdminUser(BaseModel):
    id: str
    username: str
    role: str = "admin"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AdminUser


# ─── Clinic Models ─────────────────────────────────────────

class ClinicLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class ClinicUserOut(BaseModel):
    id: str
    clinic_name: str
    city: str
    email: str
    phone: str
    status: str
    address: Optional[str] = None
    website: Optional[str] = None
    company_name: Optional[str] = None
    eik: Optional[str] = None
    mol: Optional[str] = None
    description: Optional[str] = None


class ClinicTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: ClinicUserOut


class ClinicProfileUpdate(BaseModel):
    clinic_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    company_name: Optional[str] = None
    eik: Optional[str] = None
    mol: Optional[str] = None
    description: Optional[str] = None


class ClinicPasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=8, max_length=200)


class ClinicLeadStatusUpdate(BaseModel):
    status: str


class ClinicApplicationCreate(BaseModel):
    clinic_name: str = Field(min_length=2, max_length=200)
    city: str = Field(min_length=2, max_length=100)
    address: str = Field(min_length=2, max_length=500)
    website: Optional[str] = Field(default=None, max_length=500)
    contact_name: str = Field(min_length=2, max_length=200)
    phone: str = Field(min_length=5, max_length=50)
    email: EmailStr
    offers_aligners: bool = False
    offers_braces: bool = False
    offers_implants: bool = False
    treats_adults: bool = False
    treats_children: bool = False
    years_experience: Optional[int] = Field(default=None, ge=0, le=100)
    number_of_cases_per_month: Optional[str] = Field(default=None, max_length=100)
    do_you_use_digital_scans: Optional[bool] = None
    what_types_of_patients_are_best_for_you: Optional[str] = Field(default=None, max_length=2000)
    average_response_time: Optional[str] = Field(default=None, max_length=100)


# ─── Blog Models ───────────────────────────────────────────

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


class BlogViewEvent(BaseModel):
    post_slug: str
    visitor_id: str
    referrer: Optional[str] = None
    user_agent: Optional[str] = None


# ─── Analytics Models ──────────────────────────────────────

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
