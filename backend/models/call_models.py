"""
Call-related Pydantic models for the AI outbound calling feature.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum


class CallStatus(str, Enum):
    IDLE = "idle"
    CALLING = "calling"
    COMPLETED = "completed"
    FAILED = "failed"
    NO_ANSWER = "no_answer"


class TreatmentInterest(str, Enum):
    ALIGNERS = "aligners"
    BRACES = "braces"
    NOT_SURE = "not_sure"
    OTHER = "other"


class TreatmentTimeline(str, Enum):
    ASAP = "asap"
    ONE_TO_THREE_MONTHS = "1-3_months"
    LATER = "later"
    UNKNOWN = "unknown"


class CallOutcome(BaseModel):
    """Structured outcome extracted from AI call"""
    answered_call: Optional[bool] = None
    interested_in_treatment: Optional[bool] = None
    treatment_interest: Optional[str] = None
    treatment_timeline: Optional[str] = None
    willing_to_travel: Optional[bool] = None
    permission_to_share: Optional[bool] = None
    follow_up_needed: Optional[bool] = None
    summary: Optional[str] = None


class CallLogEntry(BaseModel):
    """Single call attempt log entry"""
    id: str
    lead_id: str
    conversation_id: Optional[str] = None
    call_sid: Optional[str] = None
    initiated_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    status: CallStatus = CallStatus.CALLING
    answered: Optional[bool] = None
    outcome: Optional[CallOutcome] = None
    transcript: Optional[List[Dict[str, Any]]] = None
    summary: Optional[str] = None
    error_message: Optional[str] = None
    raw_webhook_data: Optional[Dict[str, Any]] = None


class LeadCallFields(BaseModel):
    """Call-related fields to be added to the Lead model"""
    call_status: CallStatus = CallStatus.IDLE
    call_attempts: int = 0
    last_call_at: Optional[datetime] = None
    last_call_id: Optional[str] = None
    last_call_duration_seconds: Optional[int] = None
    last_conversation_id: Optional[str] = None
    answered_call: Optional[bool] = None
    interested_in_treatment: Optional[bool] = None
    treatment_interest: Optional[str] = None
    treatment_timeline: Optional[str] = None
    permission_to_share: Optional[bool] = None
    call_summary: Optional[str] = None
    call_transcript: Optional[List[Dict[str, Any]]] = None
    call_outcome_json: Optional[Dict[str, Any]] = None
    call_error_message: Optional[str] = None


class PatientContext(BaseModel):
    """Structured patient context for AI caller"""
    name: str
    phone: str
    city: str
    city_name: str
    main_concern: str
    suspected_treatment: str
    urgency: str
    quiz_summary: str
    quiz_score: int
    quiz_band: str
    quiz_band_label: str


class InitiateCallRequest(BaseModel):
    """Request to initiate an outbound call"""
    lead_id: str


class InitiateCallResponse(BaseModel):
    """Response after initiating a call"""
    success: bool
    message: str
    conversation_id: Optional[str] = None
    call_sid: Optional[str] = None
    call_log_id: Optional[str] = None


class WebhookPayload(BaseModel):
    """ElevenLabs post-call webhook payload structure"""
    type: str
    event_timestamp: int
    data: Dict[str, Any]
