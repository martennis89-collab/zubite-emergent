from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
import uuid
import secrets

from database import db
from schemas import AdminUser
from auth import get_current_user
from emails import send_verification_email
from rate_limit import rate_limit

router = APIRouter()


@router.post("/admin/leads/{lead_id}/send-verification")
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
async def verify_lead(token: str, response: str):
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
    if response == "yes":
        await db.leads.update_one({"id": lead_id}, {"$set": {"verification_status": "verified", "clinic_lead_status": "contacted"}})
    else:
        await db.leads.update_one({"id": lead_id}, {"$set": {"verification_status": "flagged"}})

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
