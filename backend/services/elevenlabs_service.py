"""
ElevenLabs Conversational AI Service for outbound calling.
"""
import os
import logging
import hmac
import hashlib
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import uuid

from elevenlabs import ElevenLabs

logger = logging.getLogger(__name__)

# Environment variables
ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')
ELEVENLABS_AGENT_ID = os.environ.get('ELEVENLABS_AGENT_ID')
ELEVENLABS_WEBHOOK_SECRET = os.environ.get('ELEVENLABS_WEBHOOK_SECRET')

# ElevenLabs client (initialized lazily)
_client: Optional[ElevenLabs] = None


def get_client() -> ElevenLabs:
    """Get or create ElevenLabs client"""
    global _client
    if _client is None:
        if not ELEVENLABS_API_KEY:
            raise ValueError("ELEVENLABS_API_KEY not configured")
        _client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    return _client


def initiate_outbound_call(
    phone_number: str,
    lead_id: str,
    patient_context: Dict[str, str],
    agent_phone_number_id: Optional[str] = None
) -> Tuple[bool, Dict[str, Any]]:
    """
    Initiate an outbound call via ElevenLabs Conversational AI.
    
    Args:
        phone_number: Target phone number in E.164 format
        lead_id: Lead ID for tracking
        patient_context: Dynamic variables for the AI agent
        agent_phone_number_id: Twilio phone number ID (required for real calls)
        
    Returns:
        Tuple of (success, response_data)
    """
    try:
        client = get_client()
        
        if not ELEVENLABS_AGENT_ID:
            raise ValueError("ELEVENLABS_AGENT_ID not configured")
        
        # Prepare conversation initiation data with lead context
        conversation_data = {
            "lead_id": lead_id,
            "call_initiated_at": datetime.now(timezone.utc).isoformat(),
            **patient_context
        }
        
        logger.info(f"=== INITIATING OUTBOUND CALL ===")
        logger.info(f"Phone: {phone_number}")
        logger.info(f"Lead ID: {lead_id}")
        logger.info(f"Agent ID: {ELEVENLABS_AGENT_ID}")
        logger.info(f"Phone Number ID: {agent_phone_number_id}")
        logger.info(f"Conversation Data: {conversation_data}")
        
        # Check if Twilio is configured
        if not agent_phone_number_id:
            # Twilio not configured - return mock response for testing
            logger.warning("Twilio phone number not configured - returning mock response")
            return True, {
                "success": True,
                "message": "Call queued (Twilio not configured - mock mode)",
                "conversation_id": f"mock_conv_{uuid.uuid4().hex[:12]}",
                "call_sid": f"mock_sid_{uuid.uuid4().hex[:12]}",
                "mock": True
            }
        
        # Make actual outbound call via ElevenLabs/Twilio
        logger.info("Calling ElevenLabs API...")
        response = client.conversational_ai.twilio.outbound_call(
            agent_id=ELEVENLABS_AGENT_ID,
            agent_phone_number_id=agent_phone_number_id,
            to_number=phone_number,
            call_recording_enabled=True,
            conversation_initiation_client_data=conversation_data
        )
        
        logger.info(f"ElevenLabs API Response: {response}")
        logger.info(f"Response type: {type(response)}")
        
        # Try to extract conversation_id from response
        conversation_id = None
        call_sid = None
        
        if hasattr(response, 'conversation_id'):
            conversation_id = response.conversation_id
        elif hasattr(response, 'conversationId'):
            conversation_id = response.conversationId
        elif isinstance(response, dict):
            conversation_id = response.get('conversation_id') or response.get('conversationId')
        
        if hasattr(response, 'call_sid'):
            call_sid = response.call_sid
        elif hasattr(response, 'callSid'):
            call_sid = response.callSid
        elif isinstance(response, dict):
            call_sid = response.get('call_sid') or response.get('callSid')
        
        logger.info(f"Extracted conversation_id: {conversation_id}")
        logger.info(f"Extracted call_sid: {call_sid}")
        
        # Check for success
        success = True
        if hasattr(response, 'success'):
            success = response.success
        elif hasattr(response, 'error'):
            success = not response.error
        
        if success:
            logger.info("Call initiated successfully!")
            return True, {
                "success": True,
                "message": "Call initiated successfully",
                "conversation_id": conversation_id,
                "call_sid": call_sid,
            }
        else:
            error_msg = str(response)
            logger.error(f"Call initiation failed: {error_msg}")
            return False, {
                "success": False,
                "message": error_msg,
            }
            
    except Exception as e:
        logger.error(f"Failed to initiate outbound call: {e}", exc_info=True)
        return False, {
            "success": False,
            "message": str(e),
            "error": True
        }


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Verify ElevenLabs webhook signature using HMAC-SHA256.
    
    ElevenLabs sends the signature header in the format:
        t=<unix_timestamp>,v0=<hex_sha256>
    
    The signed payload is `<timestamp>.<body>`.
    
    Args:
        payload: Raw request body bytes
        signature: Signature header value from ElevenLabs-Signature
        
    Returns:
        True if signature is valid and recent (<30 min old)
    """
    if not ELEVENLABS_WEBHOOK_SECRET:
        logger.warning("ELEVENLABS_WEBHOOK_SECRET not configured - skipping signature verification")
        return True  # Allow in dev mode
    
    if not signature:
        return False
    
    try:
        # Parse signature header
        parts = {}
        for part in signature.split(","):
            if "=" in part:
                k, v = part.split("=", 1)
                parts[k.strip()] = v.strip()
        
        timestamp = parts.get("t")
        provided_sig = parts.get("v0")
        
        if not provided_sig:
            # Fallback: legacy format with just the hex digest
            expected = hmac.new(ELEVENLABS_WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
            return hmac.compare_digest(expected, signature)
        
        # Reject signatures older than 30 minutes (replay protection)
        if timestamp:
            try:
                ts_int = int(timestamp)
                now = int(datetime.now(timezone.utc).timestamp())
                if abs(now - ts_int) > 1800:
                    logger.warning(f"Webhook signature timestamp too old/new: {ts_int} vs {now}")
                    return False
            except ValueError:
                logger.warning(f"Invalid timestamp in signature: {timestamp}")
                return False
        
        signed_payload = f"{timestamp}.{payload.decode('utf-8', errors='replace')}".encode()
        expected_signature = hmac.new(
            ELEVENLABS_WEBHOOK_SECRET.encode(),
            signed_payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, provided_sig)
    except Exception as e:
        logger.error(f"Webhook signature verification failed: {e}")
        return False


def parse_webhook_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse and extract relevant data from ElevenLabs post-call webhook.
    
    Args:
        data: The 'data' field from the webhook payload
        
    Returns:
        Parsed call result data
    """
    result = {
        "conversation_id": data.get("conversation_id"),
        "agent_id": data.get("agent_id"),
        "status": data.get("status"),
        "lead_id": None,
        "answered": False,
        "duration_seconds": None,
        "transcript": [],
        "summary": None,
        "outcome": {},
        "raw_data": data,
    }
    
    # Extract lead_id from conversation initiation data
    initiation_data = data.get("conversation_initiation_client_data", {})
    result["lead_id"] = initiation_data.get("lead_id")
    
    # Extract transcript
    transcript = data.get("transcript", [])
    if transcript:
        result["transcript"] = transcript
        result["answered"] = True  # If there's a transcript, call was answered
    
    # Extract analysis/summary
    analysis = data.get("analysis", {})
    if analysis:
        result["summary"] = analysis.get("transcript_summary")
        result["call_successful"] = analysis.get("call_successful")
        
        # Extract data collection results (custom fields from agent)
        data_collection = analysis.get("data_collection_results", {})
        if data_collection:
            result["outcome"] = {
                "interested_in_treatment": data_collection.get("interested_in_treatment"),
                "treatment_interest": data_collection.get("treatment_interest"),
                "treatment_timeline": data_collection.get("treatment_timeline"),
                "permission_to_share": data_collection.get("permission_to_share"),
                "willing_to_travel": data_collection.get("willing_to_travel"),
                "follow_up_needed": data_collection.get("follow_up_needed"),
            }
    
    # Extract metadata (call duration, etc.)
    metadata = data.get("metadata", {})
    if metadata:
        # Duration might be in different places
        result["duration_seconds"] = metadata.get("call_duration_seconds") or metadata.get("duration_seconds")
    
    return result


def format_transcript_text(transcript: list) -> str:
    """
    Format transcript array into readable text.
    
    Args:
        transcript: Array of transcript turns
        
    Returns:
        Formatted transcript string
    """
    lines = []
    for turn in transcript:
        role = turn.get("role", "unknown")
        message = turn.get("message", "")
        time_secs = turn.get("time_in_call_secs", 0)
        
        role_label = "AI" if role == "agent" else "Пациент"
        lines.append(f"[{time_secs}s] {role_label}: {message}")
    
    return "\n".join(lines)
