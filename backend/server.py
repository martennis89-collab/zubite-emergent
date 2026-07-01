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

from routers import public, admin, blog, analytics, clinics, verification, seo, consultations, audit_logs, orientation_settings, orientation_bookings, content_automation, public_clinics, clinic_addons, bookings
# ─── ElevenLabs / call integration soft-disabled (Feb 2026) ──────────
# `routers.calls` and `services.elevenlabs_service` are intentionally
# NOT imported. Files remain on disk so the integration can be re-enabled
# by uncommenting the import + the `include_router(calls.router)` line
# below and restoring the ELEVENLABS_* / TWILIO_* env vars.

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
# api_router.include_router(calls.router)  # soft-disabled — see top-of-file comment
api_router.include_router(verification.router)
api_router.include_router(seo.router)
api_router.include_router(consultations.router)
from routers import reviews as _reviews  # noqa: E402
api_router.include_router(_reviews.router)
api_router.include_router(audit_logs.router)
api_router.include_router(orientation_settings.router)
api_router.include_router(orientation_bookings.router)
api_router.include_router(content_automation.router)
api_router.include_router(public_clinics.router)
api_router.include_router(clinic_addons.router)
api_router.include_router(bookings.router)

app.include_router(api_router)

# CORS - restrictive by default; "*" only allowed if credentials disabled
_cors_raw = os.environ.get('CORS_ORIGINS', '').strip()
_cors_origins = [o.strip() for o in _cors_raw.split(',') if o.strip()]

if not _cors_origins or _cors_origins == ['*']:
    # Production-safe default: known origins only
    _cors_origins = [
        "https://zubite.bg",
        "https://www.zubite.bg",
    ]
    # Allow Emergent preview URLs (any *.preview.emergentagent.com)
    _cors_regex = r"https://[a-z0-9-]+\.preview\.emergentagent\.com"
else:
    _cors_regex = None

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_regex,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
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
    # Phase 2C: soft-duplicate detection lookups
    await db.leads.create_index([("phone", 1), ("created_at", -1)])
    await db.leads.create_index([("email", 1), ("created_at", -1)])
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

    # Consultation workflow indexes (Feb 2026)
    await db.consultation_requests.create_index("id", unique=True)
    await db.consultation_requests.create_index("assigned_clinic_id")
    await db.consultation_requests.create_index("status")
    await db.consultation_requests.create_index("lead_id")
    await db.consultation_requests.create_index([("assigned_clinic_id", 1), ("lead_id", 1)])
    await db.consultation_requests.create_index("created_at")
    await db.consultation_events.create_index("id", unique=True)
    await db.consultation_events.create_index("consultation_request_id")
    await db.consultation_events.create_index("created_at")
    await db.clinic_appointments.create_index("id", unique=True)
    await db.clinic_appointments.create_index("clinic_id")
    await db.clinic_appointments.create_index("consultation_request_id")
    await db.clinic_appointments.create_index([("clinic_id", 1), ("start_time", 1)])

    # Phase 3 Batch D1 — admin audit log indexes (additive; no migration).
    await db.admin_audit_logs.create_index("id", unique=True)
    await db.admin_audit_logs.create_index([("created_at", -1)])
    await db.admin_audit_logs.create_index("action")
    await db.admin_audit_logs.create_index("actor_id")
    await db.admin_audit_logs.create_index([("target_type", 1), ("target_id", 1)])
    await db.admin_audit_logs.create_index("severity")
    await db.admin_audit_logs.create_index([("created_at", -1), ("action", 1)])

    # Feb 2026 pricing revamp — clinic add-ons indexes + one-time
    # backfill of `base_package` / `founding_status` / `legacy_tier`
    # for legacy clinics that still carry the old `partner_tier` enum.
    await db.clinic_addons.create_index("id", unique=True)
    await db.clinic_addons.create_index("clinic_id")
    await db.clinic_addons.create_index([("clinic_id", 1), ("status", 1)])
    await db.addon_catalog_items.create_index("add_on_id", unique=True)
    try:
        from entitlements import LEGACY_PARTNER_TIER_TO_BASE_PACKAGE
        cursor = db.clinics.find(
            {"base_package": {"$exists": False}},
            {"_id": 0, "id": 1, "partner_tier": 1},
        )
        n = 0
        async for c in cursor:
            legacy_tier = (c.get("partner_tier") or "standard").strip().lower()
            mapping = LEGACY_PARTNER_TIER_TO_BASE_PACKAGE.get(legacy_tier)
            if not mapping:
                continue
            new_base, new_founding, legacy_label = mapping
            patch = {
                "base_package": new_base,
                "founding_status": new_founding,
            }
            if legacy_label:
                patch["legacy_tier"] = legacy_label
            await db.clinics.update_one({"id": c["id"]}, {"$set": patch})
            n += 1
        if n:
            print(f"[migration] backfilled base_package on {n} legacy clinics")
    except Exception as exc:
        print(f"[migration] base_package backfill skipped: {exc}")

    init_storage()
    asyncio.create_task(auto_verification_loop())

    # Booking engine (Feb 2026) — indexes + 24h reminder loop.
    from routers.bookings import reminder_loop
    await db.clinic_bookings.create_index("id", unique=True)
    await db.clinic_bookings.create_index([("clinic_id", 1), ("selected_slot_start", 1)])
    # Atomic double-booking guard: unique partial index on active
    # statuses only. Cancelled / completed rows are allowed to share
    # a (clinic_id, slot) key so history and reschedule flows work.
    try:
        await db.clinic_bookings.create_index(
            [("clinic_id", 1), ("selected_slot_start", 1)],
            unique=True,
            name="uniq_active_slot",
            partialFilterExpression={
                "status": {"$in": ["pending_confirmation", "confirmed", "rescheduled"]},
            },
        )
    except Exception as exc:  # index may already exist under an older name
        print(f"[bookings] uniq_active_slot index skipped: {exc}")
    await db.clinic_bookings.create_index("reminder_email_scheduled_for")
    await db.clinic_availability_rules.create_index([("clinic_id", 1), ("day_of_week", 1)])
    await db.clinic_booking_exceptions.create_index([("clinic_id", 1), ("date", 1)])
    asyncio.create_task(reminder_loop())


async def auto_verification_loop():
    """Background: every hour, check for leads assigned 24h+ ago without verification sent"""
    while True:
        try:
            await asyncio.sleep(3600)
            cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
            leads = await db.leads.find(
                {
                    "assigned_clinic_id": {"$exists": True, "$ne": None},
                    "email": {"$nin": [None, ""]},
                    "verification_status": {"$exists": False},
                    "created_at": {"$lt": cutoff},
                },
                {"_id": 0}
            ).to_list(50)

            sent_count = 0
            for lead in leads:
                existing = await db.lead_verifications.find_one({"lead_id": lead["id"]})
                if existing:
                    await db.leads.update_one({"id": lead["id"]}, {"$set": {"verification_status": "pending"}})
                    continue
                token = secrets.token_urlsafe(32)
                auto_base_url = PRODUCTION_URL
                email_sent = await send_verification_email(lead, token, auto_base_url)
                verification_id: str | None = None
                if email_sent:
                    verification_id = str(uuid.uuid4())
                    doc = {
                        "id": verification_id,
                        "lead_id": lead["id"],
                        "clinic_id": lead.get("assigned_clinic_id"),
                        "token": token,
                        "sent_at": datetime.now(timezone.utc).isoformat(),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "auto_sent": True,
                    }
                    await db.lead_verifications.insert_one(doc)
                    sent_count += 1
                # Audit (Phase 3 D2b): system-initiated verification email.
                # NEVER stores token / patient email / answers.
                try:
                    from audit import audit_log as _audit
                    await _audit(
                        "verification.email_sent",
                        actor=None, actor_type="system",
                        target_type="verification",
                        target_id=verification_id,
                        metadata={
                            "lead_id": lead["id"],
                            "clinic_id": lead.get("assigned_clinic_id"),
                            "auto_sent": True,
                            "email_attempted": True,
                            "email_success": bool(email_sent),
                        },
                        severity="info",
                    )
                except Exception as audit_exc:
                    logger.warning(f"auto_verification audit_log failed: {audit_exc}")
                await db.leads.update_one({"id": lead["id"]}, {"$set": {"verification_status": "pending"}})
                await asyncio.sleep(2)

            if sent_count:
                logger.info(f"Auto-verification: sent {sent_count} emails out of {len(leads)} leads")
        except Exception as e:
            logger.error(f"Auto-verification loop error: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
