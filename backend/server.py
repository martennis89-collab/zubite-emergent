from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import os
import asyncio
import secrets
import uuid
from datetime import datetime, timezone, timedelta

from config import STATIC_DIR, PRODUCTION_URL, logger
from database import db, client
from storage import init_storage
from emails import send_verification_email

from routers import public, admin, blog, analytics, clinics, calls, verification, seo

# Root-level health endpoint
app = FastAPI(title="Zubite.bg API")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# Build the /api router and include all sub-routers
api_router = APIRouter(prefix="/api")
api_router.include_router(public.router)
api_router.include_router(admin.router)
api_router.include_router(blog.router)
api_router.include_router(analytics.router)
api_router.include_router(clinics.router)
api_router.include_router(calls.router)
api_router.include_router(verification.router)
api_router.include_router(seo.router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    await db.leads.create_index("assigned_clinic_id")
    await db.leads.create_index("clinic_lead_status")
    await db.leads.create_index("verification_status")
    await db.clinics.create_index("id", unique=True)
    await db.clinics.create_index("city_slug")
    await db.clinics.create_index("email")
    try:
        await db.clinics.drop_index("city_slug_1_clinic_slug_1")
    except Exception:
        pass
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
    await db.lead_call_logs.create_index("id", unique=True)
    await db.lead_call_logs.create_index("lead_id")
    await db.lead_call_logs.create_index("conversation_id")
    await db.lead_call_logs.create_index("initiated_at")
    await db.clinic_applications.create_index("id", unique=True)
    await db.clinic_applications.create_index("status")
    await db.lead_verifications.create_index("token", unique=True)
    await db.lead_verifications.create_index("lead_id")
    await db.lead_verifications.create_index("clinic_id")

    init_storage()
    asyncio.create_task(auto_verification_loop())


async def auto_verification_loop():
    """Background: every hour, check for leads assigned 24h+ ago without verification sent"""
    while True:
        try:
            await asyncio.sleep(3600)
            cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
            leads = await db.leads.find(
                {
                    "assigned_clinic_id": {"$exists": True, "$ne": None},
                    "email": {"$exists": True, "$ne": None, "$ne": ""},
                    "verification_status": {"$exists": False},
                    "created_at": {"$lt": cutoff},
                },
                {"_id": 0}
            ).to_list(50)

            for lead in leads:
                existing = await db.lead_verifications.find_one({"lead_id": lead["id"]})
                if existing:
                    continue
                token = secrets.token_urlsafe(32)
                doc = {
                    "id": str(uuid.uuid4()),
                    "lead_id": lead["id"],
                    "clinic_id": lead.get("assigned_clinic_id"),
                    "token": token,
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "auto_sent": True,
                }
                await db.lead_verifications.insert_one(doc)
                auto_base_url = PRODUCTION_URL
                await send_verification_email(lead, token, auto_base_url)
                await db.leads.update_one({"id": lead["id"]}, {"$set": {"verification_status": "pending"}})
                await asyncio.sleep(2)

            if leads:
                logger.info(f"Auto-verification: processed {len(leads)} leads")
        except Exception as e:
            logger.error(f"Auto-verification loop error: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
