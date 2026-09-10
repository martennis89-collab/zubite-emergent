from fastapi import FastAPI, APIRouter, HTTPException
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

from routers import public, admin, blog, analytics, clinics, verification, seo, consultations, audit_logs, orientation_settings, orientation_bookings, content_automation, public_clinics, clinic_addons, bookings, consultation_chat, patient_auth, community, doctors, clinic_patients, recognition

# Root-level health endpoint
app = FastAPI(title="Zubite.bg API")


@app.get("/health")
async def health_check():
    """Render readiness probe: the process is ready only when MongoDB is."""
    try:
        await db.command("ping")
    except Exception as exc:
        logger.error("Health check failed: MongoDB is unavailable (%s)", type(exc).__name__)
        raise HTTPException(status_code=503, detail="database unavailable") from exc
    return {"status": "ok", "database": "connected"}


# Build the /api router and include all sub-routers
api_router = APIRouter(prefix="/api")
api_router.include_router(public.router)
api_router.include_router(admin.router)
api_router.include_router(blog.router)
api_router.include_router(analytics.router)
api_router.include_router(clinics.router)
api_router.include_router(verification.router)
api_router.include_router(seo.router)
api_router.include_router(consultations.router)
from routers import reviews as _reviews  # noqa: E402
api_router.include_router(_reviews.router)
api_router.include_router(audit_logs.router)
api_router.include_router(orientation_settings.router)
api_router.include_router(consultation_chat.router)
api_router.include_router(orientation_bookings.router)
api_router.include_router(content_automation.router)
api_router.include_router(public_clinics.router)
api_router.include_router(clinic_addons.router)
api_router.include_router(bookings.router)
api_router.include_router(patient_auth.router)
api_router.include_router(community.router)
api_router.include_router(doctors.router)
api_router.include_router(clinic_patients.router)
api_router.include_router(recognition.router)

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
    await db.leads.create_index("assigned_clinic_id")
    await db.leads.create_index("clinic_lead_status")
    await db.leads.create_index("verification_status")
    # Phase 2C: soft-duplicate detection lookups
    await db.leads.create_index([("phone", 1), ("created_at", -1)])
    await db.leads.create_index([("email", 1), ("created_at", -1)])
    await db.leads.create_index("patient_id")
    # Clear Advance sweep: one clinic's leads, oldest first. Not a partial index
    # on the unreported ones, tempting as that is -- Mongo rejects
    # `$exists: false` in partialFilterExpression, so the filter has to be
    # applied at query time and this index only narrows the scan to the clinic.
    await db.leads.create_index([("assigned_clinic_id", 1), ("created_at", 1)])
    try:
        await db.clinic_integrations.create_index(
            [("clinic_id", 1), ("provider", 1)], unique=True)
    except Exception as exc:  # pre-existing duplicates must not block startup
        print(f"[clear_advance] clinic_integrations index skipped: {exc}")
    # Clinic "Пациенти" section — global numeric patient ID. Every lead doc
    # carries `patient_number` explicitly as `null` until assigned (Pydantic
    # model_dump() writes all fields), so a plain `sparse` index does NOT
    # work here — Mongo's sparse indexes still include explicit nulls, only
    # skipping documents where the field is fully absent. A partial index
    # excludes null (and missing) values, but the filter must be a
    # sargable comparison (`$gt`) — a `$type` filter on the SAME field
    # being indexed prevents Mongo from computing tight bounds for an
    # equality lookup (verified via explain(): `$type` → index bounds
    # [MinKey, MaxKey], scanning the whole partial index; `$gt` → bounds
    # [n, n], a real single-key seek). `patient_number` is only ever
    # assigned via the $inc counter in clinic_patients.py, which starts
    # at 1 and only increases, so `$gt: 0` is equivalent to "is a number"
    # here without the bound-pushdown penalty.
    try:
        await db.leads.drop_index("patient_number_1")
    except Exception:
        pass
    await db.leads.create_index(
        "patient_number", unique=True,
        partialFilterExpression={"patient_number": {"$gt": 0}},
    )
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
    await db.clinic_applications.create_index("id", unique=True)
    await db.clinic_applications.create_index("status")
    await db.lead_verifications.create_index("token", unique=True)
    await db.lead_verifications.create_index("lead_id")
    await db.lead_verifications.create_index("clinic_id")
    # Patient accounts (Общност Phase 1 — OTP-only)
    await db.patients.create_index("id", unique=True)
    await db.patients.create_index("email", unique=True)
    await db.patient_otps.create_index("email")
    # TTL: Mongo auto-deletes OTP rows once expires_at passes.
    await db.patient_otps.create_index("expires_at", expireAfterSeconds=0)
    # Общност (Q&A) — questions / answers / reports
    await db.qa_questions.create_index("id", unique=True)
    await db.qa_questions.create_index("slug", unique=True)
    await db.qa_questions.create_index([("status", 1), ("topic", 1), ("published_at", -1)])
    await db.qa_questions.create_index("patient_id")
    await db.qa_answers.create_index("id", unique=True)
    await db.qa_answers.create_index([("question_id", 1), ("status", 1)])
    await db.qa_answers.create_index([("author_type", 1), ("author_id", 1)])
    await db.qa_reports.create_index([("target_type", 1), ("target_id", 1)])
    await db.qa_answer_votes.create_index([("answer_id", 1), ("patient_id", 1)], unique=True)
    await db.qa_question_votes.create_index([("question_id", 1), ("patient_id", 1)], unique=True)
    await db.qa_notifications.create_index([("patient_id", 1), ("created_at", -1)])
    await db.qa_notifications.create_index([("patient_id", 1), ("read", 1)])
    await db.qa_question_photos.create_index("id", unique=True)
    await db.qa_question_photos.create_index([("question_id", 1), ("display_order", 1)])
    await db.qa_question_photos.create_index("patient_id")
    # Clinic review collection (R1/R2) — see reviews.py.
    await db.clinic_reviews.create_index("id", unique=True)
    await db.clinic_reviews.create_index("clinic_id")
    await db.clinic_reviews.create_index([("status", 1), ("submitted_at", -1)])
    # Thread-follow notifications — see community.py's _subscribe/_notify_followers.
    await db.qa_subscriptions.create_index([("question_id", 1), ("patient_id", 1)], unique=True)
    await db.qa_subscriptions.create_index("patient_id")
    # Web push (VAPID) — see push.py.
    await db.push_subscriptions.create_index("endpoint", unique=True)
    await db.push_subscriptions.create_index("patient_id")
    # Wall of Recognition — gratitude stories are separate from reviews.
    await db.recognition_entries.create_index("id", unique=True)
    await db.recognition_entries.create_index([("status", 1), ("published_at", -1)])
    await db.recognition_entries.create_index("patient_id")
    # Supports the per-clinic public feed (public_list_clinic_recognition).
    await db.recognition_entries.create_index("clinic_id")
    await db.recognition_photos.create_index("id", unique=True)
    await db.recognition_photos.create_index([("entry_id", 1), ("kind", 1)], unique=True)

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
    asyncio.create_task(clear_advance_loop())

    from auth import auth_session_cleanup_loop
    asyncio.create_task(auth_session_cleanup_loop())

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
    await db.clinic_bookings.create_index("patient_id")
    await db.clinic_availability_rules.create_index([("clinic_id", 1), ("day_of_week", 1)])
    await db.clinic_booking_exceptions.create_index([("clinic_id", 1), ("date", 1)])
    asyncio.create_task(reminder_loop())

    # Multi-doctor booking system (Phase 1 — doctor roster).
    await db.doctors.create_index("id", unique=True)
    await db.doctors.create_index([("clinic_id", 1), ("active", 1)])
    # Phase 3 — staff-internal doctor assignment + conflict lookups.
    await db.clinic_appointments.create_index([("clinic_id", 1), ("doctor_id", 1)])
    await db.online_orientation_bookings.create_index([("clinic_id", 1), ("doctor_id", 1)])
    await db.online_orientation_bookings.create_index("patient_id")


async def clear_advance_loop():
    """Background: hand newly assigned leads over to Clear Advance.

    A lead can be assigned long after it arrives, by any of a dozen code paths,
    so this sweeps for the end state rather than hooking each writer -- the same
    reasoning as `_backfill_patient_numbers`. Every ten minutes rather than
    hourly only because a clinic that has just connected should see its first
    lead appear while it is still looking; nothing here is time-critical, since
    Meta's attribution window is seven days wide.
    """
    from clear_advance import report_pending_leads
    while True:
        try:
            await asyncio.sleep(600)
            reported = await report_pending_leads(db)
            if reported:
                logger.info(f"Clear Advance: reported {reported} newly assigned leads")
        except Exception as e:
            # A reporting problem must never take the API down with it.
            logger.error(f"Clear Advance sweep error: {e}")


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
