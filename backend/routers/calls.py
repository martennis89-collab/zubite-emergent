from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks, Header
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
import uuid
import json as json_module

from database import db
from schemas import AdminUser
from auth import get_current_user
from config import TWILIO_PHONE_NUMBER_ID, CALL_TIMEOUT_MINUTES, logger
from services.patient_context_mapper import map_lead_to_patient_context, build_ai_prompt_context, normalize_phone_number
from services.elevenlabs_service import (
    initiate_outbound_call, verify_webhook_signature, parse_webhook_payload,
    format_transcript_text, ELEVENLABS_AGENT_ID
)
from models.call_models import CallStatus, InitiateCallResponse

router = APIRouter()


async def cleanup_stuck_calls():
    timeout_threshold = datetime.now(timezone.utc) - timedelta(minutes=CALL_TIMEOUT_MINUTES)
    result = await db.leads.update_many(
        {"call_status": "calling", "last_call_at": {"$lt": timeout_threshold.isoformat()}},
        {"$set": {"call_status": "failed", "call_error_message": f"Call timed out after {CALL_TIMEOUT_MINUTES} minutes - no webhook received"}}
    )
    if result.modified_count > 0:
        logger.info(f"Reset {result.modified_count} stuck calls to 'failed' status")


@router.post("/admin/leads/{lead_id}/call", response_model=InitiateCallResponse)
async def initiate_lead_call(lead_id: str, user: AdminUser = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.get('call_status') == CallStatus.CALLING.value:
        raise HTTPException(status_code=400, detail="A call is already in progress for this lead")

    phone = lead.get('phone')
    if not phone:
        raise HTTPException(status_code=400, detail="Lead has no phone number")
    normalized_phone = normalize_phone_number(phone)
    if not normalized_phone or len(normalized_phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number format")

    try:
        patient_context = map_lead_to_patient_context(lead)
        ai_context = build_ai_prompt_context(patient_context)
    except Exception as e:
        logger.error(f"Failed to build patient context: {e}")
        raise HTTPException(status_code=500, detail="Failed to prepare patient context")

    call_log_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    success, call_response = initiate_outbound_call(
        phone_number=normalized_phone, lead_id=lead_id,
        patient_context=ai_context, agent_phone_number_id=TWILIO_PHONE_NUMBER_ID
    )

    call_log = {
        "id": call_log_id, "lead_id": lead_id,
        "conversation_id": call_response.get("conversation_id"),
        "call_sid": call_response.get("call_sid"),
        "initiated_at": now.isoformat(), "initiated_by": user.id,
        "status": CallStatus.CALLING.value if success else CallStatus.FAILED.value,
        "patient_context": ai_context, "phone_number": normalized_phone,
        "error_message": call_response.get("message") if not success else None,
        "is_mock": call_response.get("mock", False),
    }
    await db.lead_call_logs.insert_one(call_log)

    call_attempts = lead.get('call_attempts', 0) + 1
    update_data = {
        "call_status": CallStatus.CALLING.value if success else CallStatus.FAILED.value,
        "call_attempts": call_attempts, "last_call_at": now.isoformat(),
        "last_call_id": call_log_id,
        "last_conversation_id": call_response.get("conversation_id"),
    }
    if not success:
        update_data["call_error_message"] = call_response.get("message")
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})

    return InitiateCallResponse(
        success=success, message=call_response.get("message", "Call initiated"),
        conversation_id=call_response.get("conversation_id"),
        call_sid=call_response.get("call_sid"), call_log_id=call_log_id
    )


@router.get("/admin/leads/{lead_id}/call-logs")
async def get_lead_call_logs(lead_id: str, user: AdminUser = Depends(get_current_user)):
    logs = await db.lead_call_logs.find({"lead_id": lead_id}, {"_id": 0}).sort("initiated_at", -1).to_list(50)
    return {"logs": logs, "total": len(logs)}


@router.get("/admin/call-logs/{call_log_id}")
async def get_call_log(call_log_id: str, user: AdminUser = Depends(get_current_user)):
    log = await db.lead_call_logs.find_one({"id": call_log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Call log not found")
    return log


@router.post("/admin/calls/cleanup-stuck")
async def cleanup_stuck_calls_endpoint(user: AdminUser = Depends(get_current_user)):
    timeout_threshold = datetime.now(timezone.utc) - timedelta(minutes=CALL_TIMEOUT_MINUTES)
    result = await db.leads.update_many(
        {"call_status": "calling", "last_call_at": {"$lt": timeout_threshold.isoformat()}},
        {"$set": {"call_status": "failed", "call_error_message": "Call timed out - no webhook received"}}
    )
    return {"success": True, "reset_count": result.modified_count}


# ─── ElevenLabs Webhook ───────────────────────────────────

@router.post("/webhooks/elevenlabs/post-call")
async def elevenlabs_post_call_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    elevenlabs_signature: Optional[str] = Header(None, alias="ElevenLabs-Signature"),
    x_elevenlabs_signature: Optional[str] = Header(None, alias="X-ElevenLabs-Signature")
):
    body = await request.body()
    logger.info(f"Received ElevenLabs webhook, body size: {len(body)} bytes")

    signature = elevenlabs_signature or x_elevenlabs_signature
    webhook_secret = os.environ.get('ELEVENLABS_WEBHOOK_SECRET')
    if webhook_secret:
        # If a secret is configured, signature MUST be present and valid
        if not signature:
            logger.warning("Webhook rejected: missing signature header")
            raise HTTPException(status_code=401, detail="Missing webhook signature")
        if not verify_webhook_signature(body, signature):
            logger.warning("Webhook rejected: invalid signature")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json_module.loads(body)
        logger.info(f"Webhook payload type: {payload.get('type')}")
    except Exception as e:
        logger.error(f"Failed to parse webhook payload: {e}")
        return {"status": "ok", "processed": False, "error": "invalid_json"}

    background_tasks.add_task(cleanup_stuck_calls)

    webhook_type = payload.get("type", "")
    event_type = payload.get("event_type", "")
    is_post_call = webhook_type in ["post_call_transcription", "conversation.ended", "call.ended"] or \
                   event_type in ["post_call_transcription", "conversation_ended", "call_ended"]

    if not is_post_call:
        logger.info(f"Received non-post-call webhook: type={webhook_type}, event={event_type}")
        return {"status": "ok", "processed": False, "reason": "not_post_call_event"}

    data = payload.get("data", payload)
    conversation_id = data.get("conversation_id") or data.get("conversationId") or payload.get("conversation_id") or payload.get("conversationId")

    initiation_data = data.get("conversation_initiation_client_data") or data.get("conversationInitiationClientData") or data.get("metadata", {}).get("conversation_initiation_client_data") or {}
    lead_id = initiation_data.get("lead_id")

    logger.info(f"Webhook identifiers - conversation_id: {conversation_id}, lead_id: {lead_id}")

    if not lead_id and not conversation_id:
        logger.warning("Webhook missing both lead_id and conversation_id")
        return {"status": "ok", "processed": False, "reason": "no_identifiers"}

    lead = None
    if lead_id:
        lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        if lead: logger.info(f"Found lead by lead_id: {lead_id}")
    if not lead and conversation_id:
        lead = await db.leads.find_one({"last_conversation_id": conversation_id}, {"_id": 0})
        if lead: logger.info(f"Found lead by conversation_id: {conversation_id}")
    if not lead and conversation_id:
        call_log = await db.lead_call_logs.find_one({"conversation_id": conversation_id}, {"_id": 0})
        if call_log and call_log.get("lead_id"):
            lead = await db.leads.find_one({"id": call_log["lead_id"]}, {"_id": 0})
            if lead: logger.info(f"Found lead via call_log: {call_log['lead_id']}")

    if not lead:
        logger.warning(f"Lead not found for webhook: lead_id={lead_id}, conv_id={conversation_id}")
        return {"status": "ok", "processed": False, "reason": "lead_not_found"}

    call_status_raw = (data.get("status") or data.get("call_status") or data.get("termination_reason") or "unknown").lower()
    status_mapping = {
        "completed": "completed", "success": "completed", "answered": "completed", "ended": "completed",
        "no_answer": "no_answer", "no-answer": "no_answer", "noanswer": "no_answer", "busy": "no_answer",
        "failed": "failed", "error": "failed", "cancelled": "failed", "canceled": "failed", "rejected": "no_answer",
    }

    transcript = data.get("transcript", [])
    has_transcript = len(transcript) > 0 if isinstance(transcript, list) else bool(transcript)

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

    analysis = data.get("analysis", {})
    summary = analysis.get("transcript_summary") or analysis.get("summary") or data.get("summary") or data.get("call_summary")

    metadata = data.get("metadata", {})
    duration_seconds = metadata.get("call_duration_seconds") or metadata.get("duration_seconds") or data.get("call_duration_seconds") or data.get("duration_seconds") or data.get("duration")

    data_collection = analysis.get("data_collection_results") or analysis.get("collected_data") or data.get("data_collection_results") or {}
    outcome = {k: v for k, v in {
        "interested_in_treatment": data_collection.get("interested_in_treatment"),
        "treatment_interest": data_collection.get("treatment_interest"),
        "treatment_timeline": data_collection.get("treatment_timeline"),
        "permission_to_share": data_collection.get("permission_to_share"),
        "willing_to_travel": data_collection.get("willing_to_travel"),
        "follow_up_needed": data_collection.get("follow_up_needed"),
    }.items() if v is not None}

    error_message = None
    if call_status == "failed":
        error_message = data.get("error_message") or data.get("failure_reason") or data.get("termination_reason") or "Call failed"

    update_data = {
        "call_status": call_status, "answered_call": answered,
        "last_call_duration_seconds": duration_seconds, "call_summary": summary,
        "call_transcript": transcript if isinstance(transcript, list) else [],
        "call_outcome_json": outcome, "call_error_message": error_message,
    }
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

    call_log_update = {
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "status": call_status, "answered": answered, "duration_seconds": duration_seconds,
        "summary": summary, "transcript": transcript if isinstance(transcript, list) else [],
        "outcome": outcome, "raw_webhook_data": data,
    }

    updated_log = False
    if conversation_id:
        result = await db.lead_call_logs.update_one({"conversation_id": conversation_id}, {"$set": call_log_update})
        updated_log = result.modified_count > 0
    if not updated_log and lead.get("last_call_id"):
        await db.lead_call_logs.update_one({"id": lead["last_call_id"]}, {"$set": call_log_update})

    logger.info(f"Successfully processed post-call webhook for lead {lead['id']}: status={call_status}")
    return {"status": "ok", "processed": True, "lead_id": lead["id"], "call_status": call_status}
