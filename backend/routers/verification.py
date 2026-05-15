from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
import logging
import uuid
import secrets

from database import db
from schemas import AdminUser
from auth import get_current_user
from emails import send_verification_email, send_verification_flagged_alert
from rate_limit import rate_limit
from audit import audit_log

router = APIRouter()


@router.post(
    "/admin/leads/{lead_id}/send-verification",
    dependencies=[Depends(rate_limit("send_verification", max_calls=5, window_seconds=300))],
)
async def admin_send_verification(lead_id: str, request: Request, user: AdminUser = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.get("assigned_clinic_id"):
        raise HTTPException(status_code=400, detail="Lead is not assigned to a clinic")
    if not lead.get("email"):
        raise HTTPException(status_code=400, detail="Lead has no email address")

    existing = await db.lead_verifications.find_one({"lead_id": lead_id, "response": {"$exists": False}})
    if existing:
        raise HTTPException(status_code=400, detail="Verification already pending for this lead")

    token = secrets.token_urlsafe(32)
    doc = {
        "id": str(uuid.uuid4()),
        "lead_id": lead_id,
        "clinic_id": lead.get("assigned_clinic_id"),
        "token": token,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.lead_verifications.insert_one(doc)

    base_url = str(request.base_url).rstrip('/')
    forwarded = request.headers.get('x-forwarded-host') or request.headers.get('host')
    scheme = request.headers.get('x-forwarded-proto', 'https')
    if forwarded:
        base_url = f"{scheme}://{forwarded}"

    sent = await send_verification_email(lead, token, base_url)
    await db.leads.update_one({"id": lead_id}, {"$set": {"verification_status": "pending"}})

    if not sent:
        return {"status": "warning", "message": "Verification record created but email could not be sent"}
    return {"status": "ok", "message": "Verification email sent"}


@router.get("/verify/{token}", dependencies=[Depends(rate_limit("verify_token", 20, 600))])
async def verify_lead(token: str, response: str, request: Request):
    if response not in ("yes", "no"):
        raise HTTPException(status_code=400, detail="Invalid response")
    # Token must look like a base64url string of expected length (~43 chars for 32 bytes)
    if not token or len(token) < 32 or len(token) > 100:
        raise HTTPException(status_code=400, detail="Invalid token")

    verification = await db.lead_verifications.find_one({"token": token}, {"_id": 0})
    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")
    if verification.get("response"):
        return {"status": "already_responded", "response": verification["response"]}

    now = datetime.now(timezone.utc).isoformat()
    await db.lead_verifications.update_one({"token": token}, {"$set": {"response": response, "responded_at": now}})

    lead_id = verification["lead_id"]
    clinic_id = verification.get("clinic_id")
    if response == "yes":
        await db.leads.update_one({"id": lead_id}, {"$set": {"verification_status": "verified", "clinic_lead_status": "contacted"}})
        await audit_log(
            "verification.responded",
            actor=None, actor_type="public",
            target_type="verification",
            target_id=verification.get("id"),
            metadata={
                "lead_id": lead_id,
                "clinic_id": clinic_id,
                "response": "yes",
            },
            severity="info", request=request,
        )
    else:
        await db.leads.update_one({"id": lead_id}, {"$set": {"verification_status": "flagged"}})
        # Always emit "responded" first.
        await audit_log(
            "verification.responded",
            actor=None, actor_type="public",
            target_type="verification",
            target_id=verification.get("id"),
            metadata={
                "lead_id": lead_id,
                "clinic_id": clinic_id,
                "response": "no",
            },
            severity="info", request=request,
        )
        # Phase 2C: alert admin. Email failure must NEVER block the flagged
        # status save — we already persisted it above.
        alert_attempted = False
        alert_success: bool | None = None
        try:
            lead = await db.leads.find_one(
                {"id": lead_id},
                {"_id": 0, "id": 1, "name": 1, "assigned_clinic_id": 1},
            )
            clinic_name: str | None = None
            if lead and lead.get("assigned_clinic_id"):
                clinic = await db.clinics.find_one(
                    {"id": lead["assigned_clinic_id"]},
                    {"_id": 0, "clinic_name": 1},
                )
                clinic_name = (clinic or {}).get("clinic_name")
            if lead:
                alert_attempted = True
                ok = await send_verification_flagged_alert(lead, clinic_name=clinic_name)
                alert_success = bool(ok)
        except Exception as alert_exc:
            alert_success = False
            logging.warning(
                f"send_verification_flagged_alert failed for lead {lead_id}: {alert_exc}"
            )
        await audit_log(
            "verification.flagged",
            actor=None, actor_type="public",
            target_type="verification",
            target_id=verification.get("id"),
            metadata={
                "lead_id": lead_id,
                "clinic_id": clinic_id,
                "response": "no",
                "alert_email_attempted": alert_attempted,
                "alert_email_success": alert_success,
            },
            severity="warning", request=request,
        )

    return {"status": "ok", "response": response}


@router.get("/admin/verifications")
async def admin_get_verifications(user: AdminUser = Depends(get_current_user)):
    verifications = await db.lead_verifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"verifications": verifications}


@router.get("/admin/verifications/flagged")
async def admin_get_flagged(user: AdminUser = Depends(get_current_user)):
    flagged = await db.leads.find(
        {"verification_status": "flagged"},
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1, "assigned_clinic_id": 1,
         "created_at": 1, "verification_status": 1, "treatment_type": 1}
    ).sort("created_at", -1).to_list(200)
    return {"flagged_leads": flagged}
