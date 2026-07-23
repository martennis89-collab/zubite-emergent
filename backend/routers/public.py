from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import asyncio
import uuid
from pymongo.errors import DuplicateKeyError

from database import db
from assessment_approaches import (
    ASSESSMENT_APPROACHES,
    clean_assessment_approaches,
    matching_assessment_approaches,
)
from aligner_brands import public_aligner_brand_chips
from schemas import Clinic, LeadCreate, LeadContactUpdate, Lead, RequestCallBody, RequestZubiteHelpBody, SaveCarePassEmailBody, UnlockResultBody, QuickChatLeadCreate, ClinicRecommendationPreferenceBody
from auth import hash_password, get_current_patient, get_current_patient_optional
from audit import audit_log
from config import CITIES, HOME_TRUST_CONSULTATIONS_BASELINE, logger
from scoring import calculate_score
from emails import (
    send_lead_notification_email,
    send_lead_confirmation_email,
    send_quiz_result_email,
    send_admin_selected_clinic_request_alert,
    send_admin_assisted_choice_request_alert,
    send_care_pass_summary_email,
)
from rate_limit import rate_limit

router = APIRouter()


# ─── Soft duplicate detection (Phase 2C) ──────────────────────────
# Look back this far when deciding whether a new lead duplicates an older one.
_DUPLICATE_WINDOW_DAYS = 30


# ─── Strict required-contact lead sources ─────────────────────────
# Patients submitting through these sources land on the recommendation
# / clinic-handover flow, so we require name + phone + email upfront.
# Other lead sources (article snippets, soft commits, legacy forms) keep
# the current optional-contact behaviour.
_STRICT_CONTACT_LEAD_SOURCES = frozenset({
    "diagnostic_quiz",
    "diagnostic_quiz_v1",
    "quiz",
})

# Phone validation kept intentionally permissive: bg numbers come in many
# textual variants (+359 88 1234567, 0888 12 34 56, (02) 123-4567 …).
# We require >=6 digits and only allow `+`, digits, spaces, dashes, parens.
import re as _re
_PHONE_DIGIT_RE = _re.compile(r"\d")
_PHONE_ALLOWED_CHARS_RE = _re.compile(r"^[\d\s\-+()]+$")


def _validate_quiz_contact(data: LeadCreate) -> None:
    """Raises HTTPException(422) when a quiz-source lead carries
    PARTIAL contact info (e.g. phone but no email). Answer-only leads
    (no contact fields at all) are accepted — they will go through the
    Phase B unlock gate on /results/[leadId] before any clinic
    matching happens.

    The function still validates phone format if a phone is present so
    we never store malformed numbers, even if the value technically
    arrives in an unlock flow rather than the initial POST."""
    if data.source not in _STRICT_CONTACT_LEAD_SOURCES:
        return

    has_name = bool((data.name or "").strip())
    has_phone = bool((data.phone or "").strip())
    has_email = bool(data.email)

    # Three accepted shapes:
    #   1) Fully populated — legacy path (back-compat with old MasterQuiz
    #      builds & API consumers that still send contacts inline).
    #   2) Entirely empty — Phase B answer-only path (new MasterQuiz).
    #   3) Partially populated — rejected: indicates a frontend bug or
    #      tampering. We never store half-leads as "unlocked" because
    #      then the gate's transition-trigger would not fire.
    fully_populated = has_name and has_phone and has_email
    fully_empty = not (has_name or has_phone or has_email)
    if not (fully_populated or fully_empty):
        missing: List[str] = []
        if not has_name:
            missing.append("name")
        if not has_phone:
            missing.append("phone")
        if not has_email:
            missing.append("email")
        raise HTTPException(
            status_code=422,
            detail={
                "code": "partial_contact_not_allowed",
                "message": (
                    "Моля, попълнете името, телефона и email-а си, "
                    "или продължете без контакт и ги въведете на следващата стъпка."
                ),
                "missing": missing,
            },
        )

    # Phone format check — only if a phone was provided.
    if has_phone:
        phone_str = (data.phone or "").strip()
        if not _PHONE_ALLOWED_CHARS_RE.match(phone_str):
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "invalid_phone_format",
                    "message": (
                        "Моля, въведете телефонен номер само с цифри, "
                        "интервали, тирета, скоби или знака „+“."
                    ),
                    "missing": ["phone"],
                },
            )
        digits = len(_PHONE_DIGIT_RE.findall(phone_str))
        if digits < 6:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "invalid_phone",
                    "message": "Моля, въведете валиден телефонен номер (поне 6 цифри).",
                    "missing": ["phone"],
                },
            )


async def _auto_match_clinic(city_slug: Optional[str], treatment_type: str, band: str) -> Optional[str]:
    """GREEN-band leads with a known city get auto-assigned to a partner
    clinic that supports the treatment. Called at lead creation when city
    is already known there, and again from
    POST /leads/{id}/clinic-recommendation-preference for leads whose city
    arrives later (the re-sequenced quiz funnel creates leads with no city
    at all — see LeadCreate.city_slug). Matches on either canonical
    `treatments_supported` or the legacy `treatments_offered` mirror; new
    writes populate both, legacy/unmigrated docs may have only one."""
    if not city_slug or band != "GREEN":
        return None
    clinic = await db.clinics.find_one({
        "city_slug": city_slug,
        "is_active": True,
        "archived": {"$ne": True},
        "$or": [
            {"treatments_supported": treatment_type},
            {"treatments_offered": treatment_type},
        ],
    }, {"_id": 0})
    return clinic.get("id") if clinic else None


async def _detect_soft_duplicate(
    phone: Optional[str],
    email: Optional[str],
) -> tuple[bool, Optional[str], Optional[str]]:
    """Return (is_duplicate, reason, possible_duplicate_lead_id).

    The check is purely additive: callers always create the new lead. If
    phone/email are missing, the check is skipped safely.

    Comparison rules:
      - phone is trimmed (string compare).
      - email is trimmed and lower-cased.
      - Match window: last `_DUPLICATE_WINDOW_DAYS` days by `created_at`.
    """
    phone = (phone or "").strip()
    email = (email or "").strip().lower()
    if not phone and not email:
        return False, None, None

    cutoff_iso = (
        datetime.now(timezone.utc) - timedelta(days=_DUPLICATE_WINDOW_DAYS)
    ).isoformat()

    or_clauses: list[dict] = []
    if phone:
        or_clauses.append({"phone": phone})
    if email:
        or_clauses.append({"email": email})

    query = {
        "created_at": {"$gte": cutoff_iso},
        "$or": or_clauses,
    }
    match = await db.leads.find_one(
        query,
        {"_id": 0, "id": 1, "phone": 1, "email": 1},
        sort=[("created_at", -1)],
    )
    if not match:
        return False, None, None

    reasons: list[str] = []
    if phone and (match.get("phone") or "").strip() == phone:
        reasons.append("phone")
    if email and (match.get("email") or "").strip().lower() == email:
        reasons.append("email")
    reason = "+".join(reasons) if reasons else "match"
    return True, reason, match.get("id")


@router.get("/")
async def root():
    return {"message": "Zubite.bg API", "status": "running"}


@router.get("/cities")
async def get_cities():
    return [{"city_slug": k, "city_name": v} for k, v in CITIES.items()]


@router.get("/cities/{city_slug}")
async def get_city(city_slug: str):
    if city_slug not in CITIES:
        raise HTTPException(status_code=404, detail="City not found")
    clinic = await db.clinics.find_one({"city_slug": city_slug, "is_active": True, "archived": {"$ne": True}}, {"_id": 0})
    return {"city_slug": city_slug, "city_name": CITIES[city_slug], "clinic": clinic}


@router.get("/public/trust-signals")
async def get_public_trust_signals():
    """Aggregated, non-identifying proof points for the public homepage.

    Every number is derived from a completed product action. We deliberately
    avoid treatment outcomes, ratings, or claims that the platform cannot
    verify. Appointment totals include active, confirmed, and completed
    booking records but exclude cancelled, rejected, expired, and no-show
    records.
    """
    (
        quiz_session_ids,
        clinic_bookings,
        orientation_bookings,
        legacy_bookings,
        community_answers,
    ) = await asyncio.gather(
        db.analytics_events.distinct(
            "session_id",
            {
                "event_type": "quiz_completed",
                "session_id": {"$type": "string", "$ne": ""},
            },
        ),
        db.clinic_bookings.count_documents(
            {
                "status": {
                    "$in": [
                        "pending_confirmation",
                        "confirmed",
                        "rescheduled",
                        "completed",
                    ]
                }
            }
        ),
        db.online_orientation_bookings.count_documents(
            {
                "status": {
                    "$in": [
                        "pending_clinic_confirmation",
                        "confirmed_by_clinic",
                        "scheduled",
                        "completed",
                        "converted_to_in_clinic",
                    ]
                }
            }
        ),
        db.consultation_requests.count_documents(
            {"status": {"$in": ["booked", "attended"]}}
        ),
        db.qa_answers.count_documents({"status": "published"}),
    )

    return {
        "quiz_completions": len(quiz_session_ids),
        "consultations_booked": max(
            HOME_TRUST_CONSULTATIONS_BASELINE,
            clinic_bookings + orientation_bookings + legacy_bookings,
        ),
        "community_answers": community_answers,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/clinics")
async def get_clinics():
    clinics = await db.clinics.find({"is_active": True, "archived": {"$ne": True}}, {"_id": 0}).to_list(100)
    return clinics


@router.post("/leads", response_model=Lead, dependencies=[Depends(rate_limit("create_lead", 5, 300))])
async def create_lead(
    data: LeadCreate,
    patient: Optional[Dict[str, Any]] = Depends(get_current_patient_optional),
):
    # Quiz / recommendation flows require name + phone + email upfront
    # so the clinic on the receiving end has the contact info to follow
    # up. Friendly Bulgarian errors via HTTP 422 with a structured code.
    _validate_quiz_contact(data)

    score_total, band, score_breakdown = calculate_score(data.treatment_type, data.answers, data.can_travel)

    # A patient submitting the contact form on a SPECIFIC clinic's public
    # profile (PublicContactModal) has already made an explicit choice —
    # that choice must win over the auto-matcher below, which exists only
    # to pick a clinic for quiz-driven leads that never named one. Without
    # this, `answers.public_clinic_id` was recorded but never promoted to
    # `assigned_clinic_id`, so the request silently never appeared in that
    # clinic's dashboard (which queries `assigned_clinic_id` exclusively).
    assigned_clinic_id = None
    explicit_clinic_id = data.answers.get("public_clinic_id")
    if explicit_clinic_id:
        explicit_clinic = await db.clinics.find_one(
            {"id": explicit_clinic_id, "is_active": True, "archived": {"$ne": True}},
            {"_id": 0, "id": 1},
        )
        if explicit_clinic:
            assigned_clinic_id = explicit_clinic["id"]

    if assigned_clinic_id is None:
        # No-op when city_slug is None (the re-sequenced quiz funnel now
        # creates leads before city is known) — auto-match is re-attempted
        # later from clinic_recommendation_preference once city arrives.
        assigned_clinic_id = await _auto_match_clinic(data.city_slug, data.treatment_type, band)

    # Soft duplicate detection — additive, never blocks submission.
    is_dup, dup_reason, dup_lead_id = await _detect_soft_duplicate(
        data.phone, data.email
    )

    # Build the lead from the create payload directly. Lead's `extra="ignore"`
    # config drops any unknown fields, but everything we explicitly typed in
    # LeadCreate (incl. all attribution fields) flows straight through.
    payload = data.model_dump(exclude_none=True)
    # Override with the calculated scoring + assignment fields
    payload.update({
        "score_total": score_total,
        "band": band,
        "score_breakdown": score_breakdown,
        "assigned_clinic_id": assigned_clinic_id,
        "is_potential_duplicate": is_dup,
        "duplicate_reason": dup_reason,
        "possible_duplicate_lead_id": dup_lead_id,
        # Auto-link to the logged-in patient account, if any. Never trusted
        # from the client payload — LeadCreate has no patient_id field.
        "patient_id": patient["id"] if patient else None,
    })
    # MVP unlock flags (Phase A/B) — determined by whether contact
    # details arrived alongside the quiz answers:
    #   • Phase B path (new MasterQuiz): answers-only POST → lead stays
    #     LOCKED. Patient lands on /results/[leadId] and the
    #     ResultUnlockGate collects contacts; that endpoint flips the
    #     flags atomically and fires the admin notification.
    #   • Backwards-compat (legacy API consumers): full contact set
    #     present → unlock immediately so old integrations keep working.
    has_full_contact = bool(
        (data.name or "").strip()
        and (data.phone or "").strip()
        and data.email
    )
    now_iso = datetime.now(timezone.utc).isoformat()
    if has_full_contact:
        payload.update({
            "contact_details_submitted": True,
            "contact_details_submitted_at": now_iso,
            "full_result_unlocked": True,
            "care_pass_eligible": True,
            "care_pass_unlocked": False,
            "consultation_booked_through_zubite": False,
            "clinic_confirmed_consultation": False,
        })
    else:
        payload.update({
            "contact_details_submitted": False,
            "full_result_unlocked": False,
            "care_pass_eligible": False,
            "care_pass_unlocked": False,
            "consultation_booked_through_zubite": False,
            "clinic_confirmed_consultation": False,
        })
    # `source` is not a Lead field — store it in answers so it survives.
    if data.source:
        payload.setdefault("answers", {})["source"] = data.source
    lead = Lead(**payload)

    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.leads.insert_one(doc)

    if is_dup:
        # Audit log only — never echo the contact value back.
        logger.info(
            "soft_duplicate_detected lead=%s match=%s reason=%s",
            lead.id, dup_lead_id, dup_reason,
        )

    if data.consent and (data.name or data.email):
        asyncio.create_task(send_lead_notification_email(doc))
        if data.email:
            asyncio.create_task(send_lead_confirmation_email(doc))

    return lead


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, patient: Optional[Dict[str, Any]] = Depends(get_current_patient_optional)):
    """Public lead lookup. Returns only minimal, non-PII fields (used by
    quiz success / result-unlock pages). The MVP unlock-mechanic flags
    are included so the frontend can decide whether to render the
    lead-capture gate or the full result."""
    lead = await db.leads.find_one(
        {"id": lead_id},
        {"_id": 0, "id": 1, "city_slug": 1, "treatment_type": 1, "band": 1,
         "score_total": 1, "created_at": 1, "answers": 1,
         # Unlock-mechanic flags (Phase A) — safe to expose, no PII.
         "contact_details_submitted": 1, "full_result_unlocked": 1,
         "care_pass_eligible": 1, "care_pass_unlocked": 1,
         "consultation_booked_through_zubite": 1,
         "clinic_confirmed_consultation": 1, "consultation_type": 1,
         # Echo a partial name only — first word, never phone/email,
         # so result page can greet the patient if they're returning.
         "name": 1,
         "patient_id": 1,
         # Step 3 of the quiz funnel — lets the results page skip straight
         # to the right state on load/reload instead of re-asking.
         "wants_clinic_recommendations": 1}
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    # Trim name to first word for safety.
    if lead.get("name"):
        first = (lead["name"] or "").strip().split(" ")[0]
        lead["name"] = first[:30] if first else None
    # Never echo the raw patient_id to any caller — only whether it's
    # THIS caller's own account, computed server-side.
    lead["is_claimed_by_me"] = bool(patient) and lead.get("patient_id") == patient["id"]
    lead.pop("patient_id", None)
    return lead


@router.post(
    "/leads/{lead_id}/claim",
    dependencies=[Depends(rate_limit("claim_lead", 10, 300))],
)
async def claim_lead(lead_id: str, request: Request, patient: Dict[str, Any] = Depends(get_current_patient)):
    """Link an already-created lead to the logged-in patient account —
    the explicit path for a patient who is already logged in and lands
    on a results page for a lead not yet linked to them (the OTP-verify
    flow itself handles the "not logged in yet" case via claim_lead_id)."""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0, "id": 1, "patient_id": 1})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    existing = lead.get("patient_id")
    if existing == patient["id"]:
        return {"success": True, "claimed": True, "already_mine": True}
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "lead_claimed_by_other_account",
                "message": "Този резултат вече е свързан с друг акаунт.",
            },
        )
    await db.leads.update_one({"id": lead_id}, {"$set": {"patient_id": patient["id"]}})
    await audit_log(
        "lead.claimed",
        actor_type="patient",
        target_type="lead",
        target_id=lead_id,
        metadata={"patient_id": patient["id"]},
        severity="info",
        request=request,
    )
    return {"success": True, "claimed": True, "already_mine": False}


@router.get("/patient/leads/mine")
async def my_leads(patient: Dict[str, Any] = Depends(get_current_patient)):
    """Backs the /profile 'Моите резултати' section — every lead linked
    to the current patient account, newest first."""
    cursor = db.leads.find(
        {"patient_id": patient["id"]},
        {"_id": 0, "id": 1, "city_slug": 1, "treatment_type": 1, "band": 1,
         "score_total": 1, "full_result_unlocked": 1, "created_at": 1},
    ).sort("created_at", -1).limit(100)
    # created_at is stored as an ISO string (see create_lead), same as
    # every other timestamp field this router returns raw — no conversion.
    items = [lead async for lead in cursor]
    return {"items": items}


@router.get("/patient/bookings/mine")
async def my_bookings(patient: Dict[str, Any] = Depends(get_current_patient)):
    """Backs the /profile 'Моите резервации' section — merges the two
    patient-initiated booking collections into one normalized, sorted
    list. Excludes consultation_requests/clinic_appointments (internal
    admin/clinic pipeline records, not patient-initiated)."""
    cb_docs = await db.clinic_bookings.find(
        {"patient_id": patient["id"]},
        {"_id": 0, "id": 1, "clinic_id": 1, "treatment_category": 1,
         "selected_slot_start": 1, "selected_slot_start_display": 1,
         "status": 1, "created_at": 1},
    ).to_list(200)
    oo_docs = await db.online_orientation_bookings.find(
        {"patient_id": patient["id"]},
        {"_id": 0, "id": 1, "clinic_id": 1, "topic": 1, "treatment_category": 1,
         "scheduled_at": 1, "status": 1, "created_at": 1},
    ).to_list(200)

    clinic_ids = {d.get("clinic_id") for d in (*cb_docs, *oo_docs) if d.get("clinic_id")}
    clinic_names: Dict[str, Optional[str]] = {}
    if clinic_ids:
        cur = db.clinics.find(
            {"id": {"$in": list(clinic_ids)}}, {"_id": 0, "id": 1, "clinic_name": 1, "name": 1},
        )
        clinic_names = {c["id"]: (c.get("clinic_name") or c.get("name")) async for c in cur}

    def _parse_dt(s: Optional[str]):
        if not s:
            return None
        try:
            dt = datetime.fromisoformat(s)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            return None

    items: List[Dict[str, Any]] = []
    for b in cb_docs:
        items.append({
            "type": "clinic_booking", "id": b["id"], "clinic_id": b.get("clinic_id"),
            "clinic_name": clinic_names.get(b.get("clinic_id")), "status": b.get("status"),
            "appointment_at": b.get("selected_slot_start"),
            "appointment_display": b.get("selected_slot_start_display"),
            "treatment_category": b.get("treatment_category"), "created_at": b.get("created_at"),
        })
    for o in oo_docs:
        items.append({
            "type": "online_orientation", "id": o["id"], "clinic_id": o.get("clinic_id"),
            "clinic_name": clinic_names.get(o.get("clinic_id")), "status": o.get("status"),
            "appointment_at": o.get("scheduled_at"), "appointment_display": None,
            "treatment_category": o.get("treatment_category") or o.get("topic"),
            "created_at": o.get("created_at"),
        })

    # clinic_bookings.selected_slot_start carries a Sofia offset while
    # online_orientation_bookings.scheduled_at is normalized to UTC — a raw
    # string sort would silently misorder close-together items across the
    # two sources, so sort on parsed, timezone-aware datetimes instead.
    items.sort(
        key=lambda x: _parse_dt(x.get("appointment_at")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return {"items": items}


# ─── MVP unlock-mechanic (Phase B) ────────────────────────────────
#
# POST /leads/{lead_id}/unlock-result
#
# Result-delivery step. The current quiz creates an answer-only lead,
# renders the full result immediately, then asks only for the email where
# the patient wants a copy. City is collected alongside it solely so a
# later "yes" to clinic recommendations can remain a simple binary choice.
#
# Behavior:
#   • Idempotent — never overwrites an existing email/name/phone.
#   • Sets the historical unlock flags used by downstream clinic pages.
#   • Sends the result email on the first successful submission.
#   • Rate-limited like other lead writes.
@router.post(
    "/leads/{lead_id}/unlock-result",
    dependencies=[Depends(rate_limit("unlock_result", 5, 300))],
)
async def unlock_result(lead_id: str, body: UnlockResultBody):
    if not body.consent:
        raise HTTPException(
            status_code=422,
            detail={
                "success": False,
                "code": "consent_required",
                "message": (
                    "Необходимо е съгласие за обработка на данните, "
                    "за да отключим резултата."
                ),
            },
        )

    lead = await db.leads.find_one(
        {"id": lead_id},
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1,
         "contact_details_submitted": 1, "consent": 1},
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    was_first_time = not lead.get("contact_details_submitted", False)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Preserve existing contact values. Only fill in missing legacy
    # fields; the current funnel sends email + city only.
    update: Dict[str, Any] = {
        "contact_details_submitted": True,
        "contact_details_submitted_at": now_iso,
        "full_result_unlocked": True,
        "consent": True,
    }
    if body.name and not (lead.get("name") or "").strip():
        update["name"] = body.name.strip()
    if body.phone and not (lead.get("phone") or "").strip():
        update["phone"] = body.phone.strip()
    if not (lead.get("email") or "").strip():
        update["email"] = body.email
    if body.city_slug:
        update["city_slug"] = body.city_slug
    if body.consultation_type:
        update["consultation_type"] = body.consultation_type

    await db.leads.update_one({"id": lead_id}, {"$set": update})

    # Email capture alone is not a clinic-contact request, so do not send
    # an admin lead alert here. The patient receives only their result.
    if was_first_time:
        full_lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        if full_lead and full_lead.get("consent"):
            if full_lead.get("email"):
                asyncio.create_task(send_quiz_result_email(full_lead))

    return {
        "success": True,
        "message": "Резултатът е изпратен.",
        "full_result_unlocked": True,
    }


# ─── Clinic-recommendation preference (step 3 of the quiz funnel) ────
#
# POST /leads/{lead_id}/clinic-recommendation-preference
#
# Asked only AFTER contact details are unlocked (server-enforced below —
# mirrors the order the frontend already presents). `wants_recommendations
# =False` ends the flow with no city ever collected. `=True` requires
# city_slug and (re)runs the same auto-match `create_lead` runs at
# creation, since this may be the first time the lead's city is known.
@router.post(
    "/leads/{lead_id}/clinic-recommendation-preference",
    dependencies=[Depends(rate_limit("clinic_recommendation_preference", 5, 300))],
)
async def clinic_recommendation_preference(lead_id: str, body: ClinicRecommendationPreferenceBody):
    lead = await db.leads.find_one(
        {"id": lead_id},
        {"_id": 0, "id": 1, "treatment_type": 1, "band": 1, "answers": 1,
         "assigned_clinic_id": 1, "full_result_unlocked": 1,
         "contact_details_submitted": 1},
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not (lead.get("full_result_unlocked") and lead.get("contact_details_submitted")):
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "code": "contact_not_submitted",
                "message": "Моля, първо въведете данните си за контакт.",
            },
        )

    if not body.wants_recommendations:
        await db.leads.update_one(
            {"id": lead_id},
            {"$set": {
                "wants_clinic_recommendations": False,
                "clinic_recommendations_declined_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return {"success": True, "wants_recommendations": False}

    if not body.city_slug:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "code": "city_required",
                "message": "Моля, изберете град.",
            },
        )

    # Same "help the clinic prepare" fields MasterQuiz's old `form` step
    # used to fold into `answers` — only non-empty values are stored.
    intake_answers: Dict[str, Any] = {}
    if body.importance:
        intake_answers["importance"] = body.importance
    if body.has_files:
        intake_answers["has_files"] = body.has_files
    if body.preferred_channel:
        intake_answers["preferred_channel"] = body.preferred_channel

    update: Dict[str, Any] = {
        "wants_clinic_recommendations": True,
        "city_slug": body.city_slug,
    }
    if body.district_slug:
        update["district_slug"] = body.district_slug
    if intake_answers:
        answers = dict(lead.get("answers") or {})
        answers.update(intake_answers)
        update["answers"] = answers
    if body.can_travel:
        update["can_travel"] = body.can_travel == "yes"

    if not lead.get("assigned_clinic_id"):
        matched_clinic_id = await _auto_match_clinic(
            body.city_slug, lead.get("treatment_type", ""), lead.get("band", "RED"),
        )
        if matched_clinic_id:
            update["assigned_clinic_id"] = matched_clinic_id

    await db.leads.update_one({"id": lead_id}, {"$set": update})
    return {"success": True, "wants_recommendations": True}


@router.patch("/leads/{lead_id}/contact", dependencies=[Depends(rate_limit("update_contact", 10, 300))])
async def update_lead_contact(lead_id: str, data: LeadContactUpdate):
    # Look up the lead and enforce a short edit window after creation to prevent
    # arbitrary tampering by anyone who guesses/obtains a lead UUID later on.
    existing = await db.leads.find_one({"id": lead_id}, {"_id": 0, "id": 1, "created_at": 1, "consent": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")

    created_at_raw = existing.get("created_at")
    try:
        created_at_dt = datetime.fromisoformat(created_at_raw) if isinstance(created_at_raw, str) else created_at_raw
        if created_at_dt and created_at_dt.tzinfo is None:
            created_at_dt = created_at_dt.replace(tzinfo=timezone.utc)
        age_seconds = (datetime.now(timezone.utc) - created_at_dt).total_seconds() if created_at_dt else 0
    except Exception:
        age_seconds = 0
    # Allow updates only within 60 minutes of lead creation
    if age_seconds > 3600:
        raise HTTPException(status_code=403, detail="Edit window expired")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None or k == "consent"}
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    # Return only minimal info; never leak full PII to public callers
    lead = await db.leads.find_one(
        {"id": lead_id},
        {"_id": 0, "id": 1, "city_slug": 1, "treatment_type": 1, "band": 1, "score_total": 1, "consent": 1}
    )

    if data.consent and (data.name or data.email):
        # Re-fetch full lead for internal email use only
        full_lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        asyncio.create_task(send_lead_notification_email(full_lead))
        if data.email:
            asyncio.create_task(send_lead_confirmation_email(full_lead))

    return lead


async def _mint_lead_access_token(lead_id: str) -> tuple[str, datetime]:
    """Issue a fresh magic-link token for a lead. Shared by the care-pass
    email flow and the chat-token bootstrap endpoint below.

    Always mints a NEW token rather than reusing an active one: only the
    SHA-256 hash is ever persisted (`lead_access_tokens.token_hash`), so
    the raw value handed to a previous caller cannot be recovered to give
    to a new one. A lead can end up with more than one valid token at a
    time — that's fine, each is independently scoped to the same
    `lead_id` and still bounded by the 90-day expiry.
    """
    import secrets as _secrets
    import hashlib as _hashlib
    access_token = _secrets.token_urlsafe(32)
    token_hash = _hashlib.sha256(access_token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=90)
    await db.lead_access_tokens.insert_one({
        "token_hash": token_hash,
        "lead_id": lead_id,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "revoked_at": None,
        "last_accessed_at": None,
        "access_count": 0,
    })
    return access_token, expires_at


# ─── Patient layer: chat-token bootstrap ─────────────────────────────
#
# POST /leads/{lead_id}/chat-access-token
#
# Silently mints a magic-link token for a lead that has ALREADY unlocked
# its result (the same gate `/results/[leadId]/clinics/[clinicId]` already
# enforces client-side: `full_result_unlocked AND contact_details_submitted`).
# The browser holding a bare `lead_id` is not a strong identity — `GET
# /leads/{lead_id}` is public and already returns quiz answers on that
# basis — but consultation chat carries patient messages and file
# uploads, which can include a real X-ray, so it authenticates via the
# same hashed/revocable token every other patient-facing surface uses
# rather than the raw id. This endpoint is what bridges the two: it
# converts the weak "I have this leadId" capability into a real token,
# gated on the same unlock flags the results page already requires.
#
# Unlike `/email-care-pass`, the token is returned directly in the JSON
# response — there is no inbox to prove control of here, only the unlock
# gate — so no email is sent and no `consent_to_email` is required.
@router.post(
    "/leads/{lead_id}/chat-access-token",
    dependencies=[Depends(rate_limit("chat_access_token", 10, 300))],
)
async def mint_chat_access_token(lead_id: str):
    lead = await db.leads.find_one(
        {"id": lead_id},
        {"_id": 0, "id": 1, "full_result_unlocked": 1, "contact_details_submitted": 1},
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not (lead.get("full_result_unlocked") and lead.get("contact_details_submitted")):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "result_not_unlocked",
                "message": "Резултатът все още не е отключен.",
            },
        )
    access_token, expires_at = await _mint_lead_access_token(lead_id)
    return {"access_token": access_token, "expires_at": expires_at.isoformat()}


# ─── Patient layer: quick-chat lead (no quiz taken) ──────────────────
#
# POST /leads/quick-chat
#
# The chat CTA on a public clinic profile is unconditional per package
# entitlement — a visitor who never ran the quiz can still click it. That
# visitor has no `lead_id` at all, so this creates the thinnest possible
# lead (just a name) and mints its chat token in one round trip, rather
# than making the frontend call two endpoints in sequence.
#
# `full_result_unlocked`/`contact_details_submitted` are set True on
# creation: those flags exist to gate access to an EXISTING lead's quiz
# answers via a bare `lead_id` (see `mint_chat_access_token` above) — a
# concern that doesn't apply here since this lead is created fresh, with
# no quiz answers to protect, and owned by nobody else.
@router.post(
    "/leads/quick-chat",
    dependencies=[Depends(rate_limit("quick_chat_lead", 10, 300))],
)
async def create_quick_chat_lead(body: QuickChatLeadCreate):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name is required")
    lead_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    await db.leads.insert_one({
        "id": lead_id,
        "name": name,
        "city_slug": None,
        "treatment_type": None,
        "answers": {},
        "band": None,
        "score_total": None,
        "source": "chat_quick_start",
        "created_at": now.isoformat(),
        "full_result_unlocked": True,
        "contact_details_submitted": True,
    })
    access_token, expires_at = await _mint_lead_access_token(lead_id)
    return {
        "lead_id": lead_id,
        "access_token": access_token,
        "expires_at": expires_at.isoformat(),
    }


# ─── Patient layer: Save Care Pass by email ─────────────────────────
#
# POST /leads/{lead_id}/email-care-pass
#
# Patient-initiated, self-service summary email. Sent on explicit
# consent from /quiz/success. The email reiterates:
#   • The risk band the patient saw on the success page,
#   • Care Pass eligibility wording (oral hygiene only, AFTER consult),
#   • Manual Recommendation Mode messaging (no instant matching).
#
# Privacy/safety:
#   • Rate-limited to 3 calls / 5 min / client.
#   • Requires explicit `consent_to_email=True`.
#   • Looks up the lead so we can include the correct band + city +
#     treatment_type — but the request body's `email` is the destination
#     (patient may want to send to a different inbox).
#   • Never leaks phone or full quiz answers back.
@router.post(
    "/leads/{lead_id}/email-care-pass",
    dependencies=[Depends(rate_limit("email_care_pass", 3, 300))],
)
async def email_care_pass(lead_id: str, body: SaveCarePassEmailBody):
    if not body.consent_to_email:
        raise HTTPException(
            status_code=422,
            detail={
                "success": False,
                "code": "consent_required",
                "message": (
                    "Необходимо е съгласие, за да изпратим резултата "
                    "и информация за Care Pass на твоя имейл."
                ),
            },
        )

    lead = await db.leads.find_one(
        {"id": lead_id},
        {"_id": 0, "id": 1, "band": 1, "city_slug": 1,
         "treatment_type": 1, "name": 1},
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    name = (body.name or "").strip() or (lead.get("name") or "").strip() or None

    access_token, expires_at = await _mint_lead_access_token(lead_id)

    sent = await send_care_pass_summary_email(
        to_email=body.email,
        name=name,
        band=lead.get("band"),
        city_slug=lead.get("city_slug"),
        treatment_type=lead.get("treatment_type"),
        access_token=access_token,
    )

    if not sent:
        logger.warning(
            "email_care_pass: delivery failed or skipped lead=%s", lead_id,
        )

    return {"success": True, "message": "Изпратихме информацията на твоя имейл."}


# ─── Patient orientation magic-link lookup ──────────────────────────
#
# GET /patient-orientation/{access_token}
#
# Resolves a magic-link token emitted by `POST /leads/{id}/email-care-pass`
# and returns ONLY safe, patient-facing fields. Never returns lead_id,
# raw answers, attribution, phone, full email, score_total, scoring
# breakdown, or internal status/assignment fields.
#
# Privacy/safety:
#   • Tokens are stored as SHA-256 hashes — DB read alone cannot reveal
#     a usable token.
#   • Rate-limited to 30 lookups / 5 min / client IP.
#   • Expired (>90d) → 410 Gone with a stable error code.
#   • Unknown / revoked → 404 with same code shape.
#   • Lookup increments access_count + stamps last_accessed_at for audit.
#   • Fires an `orientation_link_opened` analytics_events row (best-effort,
#     non-blocking) — same pattern as other patient-funnel events.
@router.get(
    "/patient-orientation/{access_token}",
    dependencies=[Depends(rate_limit("patient_orientation_lookup", 30, 300))],
)
async def get_patient_orientation(access_token: str):
    if not access_token or len(access_token) < 16 or len(access_token) > 200:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "code": "token_not_found",
                    "message": "Линкът е невалиден или вече не съществува."},
        )
    import hashlib as _hashlib
    token_hash = _hashlib.sha256(access_token.encode("utf-8")).hexdigest()
    record = await db.lead_access_tokens.find_one(
        {"token_hash": token_hash}, {"_id": 0},
    )
    if not record:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "code": "token_not_found",
                    "message": "Линкът е невалиден или вече не съществува."},
        )
    if record.get("revoked_at"):
        raise HTTPException(
            status_code=404,
            detail={"success": False, "code": "token_revoked",
                    "message": "Линкът вече не е активен."},
        )
    # Expiry check.
    expires_raw = record.get("expires_at")
    try:
        expires_dt = datetime.fromisoformat(expires_raw) if isinstance(expires_raw, str) else expires_raw
        if expires_dt and expires_dt.tzinfo is None:
            expires_dt = expires_dt.replace(tzinfo=timezone.utc)
    except Exception:
        expires_dt = None
    if expires_dt and datetime.now(timezone.utc) > expires_dt:
        raise HTTPException(
            status_code=410,
            detail={"success": False, "code": "token_expired",
                    "message": "Линкът е изтекъл. Можеш да попълниш ориентира отново."},
        )

    lead_id = record.get("lead_id")
    lead = await db.leads.find_one(
        {"id": lead_id},
        {"_id": 0, "id": 1, "band": 1, "city_slug": 1,
         "treatment_type": 1, "name": 1, "created_at": 1, "answers": 1},
    )
    if not lead:
        # Lead was deleted but token survived — treat as not-found.
        raise HTTPException(
            status_code=404,
            detail={"success": False, "code": "token_not_found",
                    "message": "Линкът е невалиден или вече не съществува."},
        )

    # Best-effort: stamp access metadata + analytics event. Never block.
    try:
        await db.lead_access_tokens.update_one(
            {"token_hash": token_hash},
            {
                "$inc": {"access_count": 1},
                "$set": {"last_accessed_at": datetime.now(timezone.utc).isoformat()},
            },
        )
    except Exception as e:
        logger.warning("lead_access_tokens access stamp failed: %s", e)
    try:
        await db.analytics_events.insert_one({
            "event_type": "orientation_link_opened",
            "session_id": f"magic-link-{token_hash[:12]}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "band": lead.get("band"),
            "city": lead.get("city_slug"),
            "has_lead_id": bool(lead_id),
        })
    except Exception as e:
        logger.warning("orientation_link_opened analytics insert failed: %s", e)

    # Extract a safe segment hint from quiz answers if present. Quiz
    # stores segment as `answers.segment` ∈ {adult, teen, child}.
    answers = lead.get("answers") or {}
    segment = None
    if isinstance(answers, dict):
        raw_seg = (answers.get("segment") or "").strip().lower()
        if raw_seg in {"adult", "teen", "child"}:
            segment = raw_seg

    # Safe display name — first word only, bounded length, optional.
    raw_name = (lead.get("name") or "").strip()
    display_name = None
    if raw_name:
        first = raw_name.split()[0] if raw_name.split() else ""
        display_name = first[:24] or None

    return {
        "success": True,
        "band": lead.get("band"),
        "city_slug": lead.get("city_slug") or None,
        "treatment_type": lead.get("treatment_type") or None,
        "segment": segment,
        "display_name": display_name,
        "created_at": lead.get("created_at"),
    }


# ─── Patient layer: recommended clinics (Phase P2) ────────────────
#
# GET /leads/{lead_id}/recommended-clinics returns up to N partner clinics
# matched deterministically against the lead's city and treatment interest.
#
# Product rule (also surfaced to the client in `selection_rule`):
#   • Patients may VIEW up to 3 recommended clinics on the match screen.
#   • Patients may contact every clinic that is relevant to their result.
#   • "Помогнете ми да избера" remains available as an optional service.
#
# This endpoint is READ-ONLY. P2 does not create consultation_requests,
# does not send emails, and does not modify any clinic/lead state.

# How recent a lead must be to fetch recommendations.
# Mirrors the spirit of the existing `PATCH /leads/{id}/contact` window:
# old leads are stale entry points and patient context decays.
_RECO_WINDOW_DAYS = 7

# Treatment categories that should NOT narrow the match by treatment
# (broad/discovery flows). Match by city only and use a generic reason text.
_BROAD_TREATMENT_TYPES = frozenset({"diagnostic_quiz", "master_quiz", "general"})

# Clinic statuses that MUST be excluded even if other "active-ish" signals
# look ok. Conservative allow-list approach is used instead — we explicitly
# only accept these statuses. New unrecognised values do NOT leak through.
_VISIBLE_LEGACY_IS_ACTIVE = True
_VISIBLE_ADMIN_STATUSES = frozenset({"active"})
_VISIBLE_CLINIC_STATUSES = frozenset({"active_partner", "evaluation_partner"})

# BG city_slug -> display name mapping. Lazily resolved against CITIES at
# read time so a missing entry falls back to the slug itself.
def _city_name_for(slug: Optional[str], fallback: Optional[str] = None) -> Optional[str]:
    if not slug:
        return fallback
    name = CITIES.get(slug)
    return name or fallback or slug


# ── Partner placement (demo support, no schema migration) ─────────
#
# Demo / monetization layer. Clinic docs MAY carry the optional fields:
#   • partner_tier        : "standard" | "featured" | "premium"
#   • is_featured         : bool   (legacy boolean, treated as `featured` tier)
#   • is_premium          : bool   (legacy boolean, treated as `premium` tier)
#   • featured_rank / sponsored_rank : int  (lower = surfaces first within tier)
#
# Missing or invalid values => "standard" tier with no placement copy.
# Tier boost is applied AFTER hard eligibility filters and is small enough
# that it can never override a treatment match (+50) or out-rank an
# eligible clinic over an ineligible one (ineligible = excluded entirely).

_VALID_TIERS = frozenset({"standard", "featured", "premium"})

# Legacy boost (pre-Feb 2026): applies when a clinic has NO
# `base_package` field (unmigrated). Authority was +8 historically; per
# the Feb 2026 pricing revamp the private/strategic tier no longer
# confers a hidden ranking advantage, so `premium` = `featured` = +5.
_TIER_BOOST_LEGACY = {"premium": 5, "featured": 5, "standard": 0}

# Canonical Feb 2026 boost — preferred when the clinic has been
# migrated to `base_package`.
_BASE_PACKAGE_BOOST = {"growth_partner": 5, "verified_profile": 0}

# Backwards-compat alias for any old caller that imports `_TIER_BOOST`
# by name. New code should reference `_TIER_BOOST_LEGACY` /
# `_BASE_PACKAGE_BOOST` directly.
_TIER_BOOST = _TIER_BOOST_LEGACY

_PLACEMENT_LABEL = {
    "premium": "Growth партньор",
    "featured": "Growth партньор",
    "standard": None,
}
_PLACEMENT_DISCLOSURE = {
    "premium": "Тази клиника има допълнителна партньорска видимост в Zubite.",
    "featured": "Тази клиника е представена като партньор на Zubite.",
    "standard": None,
}


# ── External review signals (display-only, admin-gated) ───────────
#
# Patient confidence signals from public external platforms. These fields
# MAY be set manually by admins on a clinic document. They are NEVER
# scraped, fetched from any external API, or auto-aggregated.
#
# Hard rules:
#   • `review_sources_verified_by_admin` MUST be True for any data to leave
#     the backend. Defaults to False on every clinic.
#   • Each source needs: numeric rating in [1.0, 5.0], review_count >= 5,
#     and a URL on an explicit per-platform host whitelist.
#   • A source with any missing/invalid field is silently dropped.
#   • Output ordering is fixed: Google -> Superdoc -> Facebook.
#   • No combined trust score, no overall rating, no ranking impact.
#   • No review texts, reviewer names, screenshots, or quotes are ever
#     surfaced — by construction the schema doesn't carry them.

# Lower bound matches policy decision: hide tiny sample sizes that don't
# convey statistical confidence to patients.
_REVIEW_MIN_COUNT = 5
_REVIEW_RATING_MIN = 1.0
_REVIEW_RATING_MAX = 5.0
_REVIEW_DISCLAIMER = (
    "Данните са публични сигнали от външни платформи и може да се променят."
)

# Explicit host whitelist. EXACT host match only — no wildcard subdomain
# patterns to avoid `evil.google.com.attacker.tld`-style bypasses.
_REVIEW_HOST_WHITELIST: dict[str, frozenset[str]] = {
    "google": frozenset({
        "google.com", "www.google.com",
        "maps.google.com",
        "g.page",
        "maps.app.goo.gl",
        "g.co",
    }),
    "facebook": frozenset({
        "facebook.com", "www.facebook.com",
        "m.facebook.com",
        "fb.com",
    }),
    "superdoc": frozenset({
        "superdoc.bg", "www.superdoc.bg",
    }),
}

# Deterministic surface order (Google -> Superdoc -> Facebook).
_REVIEW_PLATFORM_ORDER: tuple[str, ...] = ("google", "superdoc", "facebook")


def _is_safe_review_url(url: object, platform: str) -> bool:
    """Strict http(s) + per-platform exact host check.
    Reject any non-string, any non-http(s) scheme (javascript:, data:,
    file:, ftp:, ...), and any host not present in the whitelist."""
    if not isinstance(url, str):
        return False
    s = url.strip()
    if not s or len(s) > 500:
        return False
    try:
        from urllib.parse import urlparse
        parsed = urlparse(s)
    except Exception:
        return False
    scheme = (parsed.scheme or "").lower()
    if scheme not in ("http", "https"):
        return False
    # `urlparse` lower-cases hostname for us. Reject userinfo / empty host.
    host = (parsed.hostname or "").lower()
    if not host or "@" in s.split("://", 1)[-1].split("/", 1)[0]:
        return False
    allowed = _REVIEW_HOST_WHITELIST.get(platform)
    if not allowed:
        return False
    return host in allowed


def _coerce_rating(v: object) -> Optional[float]:
    """Return a float in [1.0, 5.0] or None. Booleans are rejected so
    `True`/`False` never silently coerce to a rating."""
    if isinstance(v, bool) or v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if f < _REVIEW_RATING_MIN or f > _REVIEW_RATING_MAX:
        return None
    # Round to one decimal — display contract.
    return round(f, 1)


def _coerce_count(v: object) -> Optional[int]:
    if isinstance(v, bool) or v is None:
        return None
    try:
        n = int(v)
    except (TypeError, ValueError):
        return None
    if n < 0 or n > 100_000:
        return None
    return n


def _build_review_signals(clinic: dict) -> Optional[dict]:
    """Return the public `review_signals` object for a clinic, or None.

    Display-only. Never affects ranking. Gated on
    `review_sources_verified_by_admin == True`. Returns None when no source
    is publishable."""
    if clinic.get("review_sources_verified_by_admin") is not True:
        return None

    sources: list[dict] = []
    for platform in _REVIEW_PLATFORM_ORDER:
        rating = _coerce_rating(clinic.get(f"{platform}_rating"))
        count = _coerce_count(clinic.get(f"{platform}_review_count"))
        url_key = "google_place_url" if platform == "google" else (
            "superdoc_profile_url" if platform == "superdoc" else "facebook_page_url"
        )
        url_raw = clinic.get(url_key)
        if rating is None:
            continue
        if count is None or count < _REVIEW_MIN_COUNT:
            continue
        if not _is_safe_review_url(url_raw, platform):
            continue
        sources.append({
            "platform": platform,
            "rating": rating,
            "review_count": count,
            "url": (url_raw or "").strip(),
        })

    if not sources:
        return None

    # last_checked_at is informational; accept ISO strings or datetimes.
    last_checked: Optional[str] = None
    raw_ts = clinic.get("review_sources_last_checked_at")
    if isinstance(raw_ts, str) and raw_ts.strip():
        last_checked = raw_ts.strip()
    elif hasattr(raw_ts, "isoformat"):
        try:
            last_checked = raw_ts.isoformat()
        except Exception:
            last_checked = None

    return {
        "sources": sources,
        "last_checked_at": last_checked,
        "disclaimer": _REVIEW_DISCLAIMER,
    }



def _resolve_partner_tier(clinic: dict) -> str:
    """Pure: read clinic placement signals and resolve to a tier string."""
    raw = (clinic.get("partner_tier") or "").strip().lower()
    if raw in _VALID_TIERS:
        return raw
    if clinic.get("is_premium") is True:
        return "premium"
    if clinic.get("is_featured") is True:
        return "featured"
    return "standard"


def _placement_rank(clinic: dict) -> int:
    """Lower rank surfaces first within the same (score, tier-boost) group.
    Falls back to a large sentinel when absent so absent < present is consistent."""
    for k in ("featured_rank", "sponsored_rank"):
        v = clinic.get(k)
        if isinstance(v, int):
            return v
    return 1_000_000


def _normalize_clinic_treatments(clinic: dict) -> List[str]:
    """Canonical normalized treatment list for a clinic.

    Precedence (per Feb 2026 cleanup batch):
      1. `treatments_supported` (canonical going forward)
      2. `treatments_offered`   (legacy admin/partner schema, fallback)

    Returns lowercased, whitespace-trimmed, de-duplicated, stable-ordered
    list. Empty/whitespace entries are dropped. Non-string entries are
    silently dropped (defensive).

    The canonical field exposed publicly is `treatments_supported`.
    The mirror to `treatments_offered` is kept ONLY as a temporary
    backwards-compatibility bridge for older admin reads / clinic-portal
    consumers; it is NOT used as a primary source.
    """
    raw = clinic.get("treatments_supported") or []
    if not (isinstance(raw, list) and any(isinstance(x, str) and x.strip() for x in raw)):
        raw = clinic.get("treatments_offered") or []
    seen: List[str] = []
    for t in raw:
        if not isinstance(t, str):
            continue
        norm = t.strip().lower()
        if norm and norm not in seen:
            seen.append(norm)
    return seen


def _treatments_of(clinic: dict) -> List[str]:
    """Backwards-compatible alias for the cleanup-era helper.

    Historically this returned the UNION of both legacy fields. Going
    forward (Feb 2026) we PREFER `treatments_supported` and fall back
    to `treatments_offered`. Existing call sites in matching/scoring/
    response-building all keep working — the old union semantics were
    used to defend against schema drift, but the new normalized
    canonical write path makes the union unnecessary.
    """
    return _normalize_clinic_treatments(clinic)


def _is_clinic_visible(clinic: dict) -> bool:
    """Conservative allow-list visibility check across mixed schemas.
    Returns True only when at least one positive signal is present AND
    no negative signal is present.

    Negative signals (any -> hidden):
      • is_active == False
      • clinic_status in {applicant, suspended, churned, paused}
      • status in {suspended, churned, paused, applicant}
      • is_demo == True (Phase C1 — demo / showcase clinics MUST never
        reach quiz-driven recommendations regardless of preview env)

    Positive signals (need at least one -> visible):
      • is_active == True
      • clinic_status in {active_partner, evaluation_partner}
      • status == "active"
    """
    # Hard negatives.
    if clinic.get("is_active") is False:
        return False
    # Archived clinics are treated as hard-deleted for all public
    # surfaces (listings, matching, direct profile URL → 404).
    if clinic.get("archived") is True:
        return False
    # Demo / showcase clinics never compete for real recommendations.
    if clinic.get("is_demo") is True:
        return False
    cs = (clinic.get("clinic_status") or "").lower()
    if cs and cs in {"applicant", "suspended", "churned", "paused"}:
        return False
    st = (clinic.get("status") or "").lower()
    if st and st in {"suspended", "churned", "paused", "applicant"}:
        return False

    # Need at least one positive signal.
    if clinic.get("is_active") is _VISIBLE_LEGACY_IS_ACTIVE:
        return True
    if cs in _VISIBLE_CLINIC_STATUSES:
        return True
    if st in _VISIBLE_ADMIN_STATUSES:
        return True
    return False


def _clinic_name(clinic: dict) -> Optional[str]:
    return clinic.get("name") or clinic.get("clinic_name")


def _clinic_city_slug(clinic: dict) -> Optional[str]:
    """Resolve a clinic's city_slug. Legacy clinics have it directly;
    admin-created docs only have free-text `city`. We map by exact city
    name to the configured CITIES dict for safety. Unmappable -> None."""
    slug = clinic.get("city_slug")
    if isinstance(slug, str) and slug:
        return slug
    city = (clinic.get("city") or "").strip()
    if not city:
        return None
    for s, n in CITIES.items():
        if n.strip().lower() == city.lower():
            return s
    return None


def _score_clinic(clinic: dict, lead_city: str, lead_treatment: str, is_broad: bool, lead_district: Optional[str] = None) -> int:
    """Deterministic score. Returns -1 to mark clinic as ineligible (no city match).

    Eligibility (city) is checked FIRST. Partner-tier boost is added ONLY
    after eligibility passes, so an ineligible premium clinic can never
    out-rank an eligible standard clinic.

    External review signals (google/facebook/superdoc ratings & counts) are
    display-only patient confidence signals and must not affect ranking.
    They are deliberately NOT read here.
    """
    cs = _clinic_city_slug(clinic)
    if cs != lead_city:
        return -1
    score = 100  # same-city base
    # Same-neighbourhood bonus (Sofia only in practice — see SOFIA_DISTRICTS
    # in config.py). +20: enough to be a real, visible ranking factor
    # without letting it override a genuine treatment match (+50) or
    # flattening tier differences into noise.
    if lead_district and (clinic.get("district_slug") or "") == lead_district:
        score += 20
    if not is_broad:
        if lead_treatment.lower() in _treatments_of(clinic):
            score += 50
    # Tier boost AFTER eligibility — pure additive, max +8.
    # Feb 2026 pricing revamp: prefer new canonical `base_package`
    # when present; fall back to legacy `partner_tier` boost so
    # unmigrated clinics still get a sensible score. Legacy Authority
    # (`premium`) is boosted at the same level as Growth Partner so
    # the deprecated tier never confers a hidden ranking advantage.
    bp = (clinic.get("base_package") or "").strip().lower()
    if bp in _BASE_PACKAGE_BOOST:
        score += _BASE_PACKAGE_BOOST[bp]
    else:
        score += _TIER_BOOST_LEGACY.get(_resolve_partner_tier(clinic), 0)
    return score


def _reason_for(clinic: dict, lead_treatment: str, is_broad: bool) -> str:
    """Deterministic Bulgarian reason text. No AI, no fake claims."""
    city = _city_name_for(_clinic_city_slug(clinic))
    treatments = _treatments_of(clinic)
    if is_broad:
        return "Партньорска клиника във вашия град, подходяща за първа консултация."
    if lead_treatment.lower() in treatments:
        # Surface the matched treatment in BG via a small mapping.
        _TREATMENT_BG = {
            "aligners": "алайнери",
            "braces": "ортодонтия с брекети",
            "implants": "импланти",
            "orthodontics": "ортодонтия",
            "veneers": "фасети",
            "whitening": "избелване",
            "tmj": "проблеми с челюстна става",
            "sleep_airway": "сън и дихателни пътища",
        }
        treat_bg = _TREATMENT_BG.get(lead_treatment.lower(), lead_treatment.lower())
        return f"Във вашия град и с фокус върху {treat_bg}."
    return f"Партньорска клиника в {city}, подходяща за консултация."


def _public_profile_for_tier(clinic: dict, tier: str) -> Optional[dict]:
    """Tier-gated projection of the admin-managed `clinic_profile` blob.

    Returns None when the blob is missing OR `profile_status != "published"`.
    Otherwise returns ONLY the fields the resolved tier is allowed to
    expose publicly. Saved data is preserved on tier downgrade — we simply
    omit fields here at read-time.

    Tier mapping (R1):
      standard → short_description, treatment_focus
      featured → standard + patient_intro
      premium  → featured + hero/video/team/story/environment/process
                 + case_library (published + consent_confirmed only)
    """
    blob = clinic.get("clinic_profile") or {}
    if not isinstance(blob, dict) or blob.get("profile_status") != "published":
        return None

    out: Dict[str, Any] = {
        "profile_status": "published",
        "short_description": blob.get("short_description") or None,
        "assessment_approaches": clean_assessment_approaches(blob.get("assessment_approaches")),
        "treatment_focus": [
            t for t in (blob.get("treatment_focus") or [])
            if isinstance(t, str) and t.strip()
        ] or None,
    }

    if tier in ("featured", "premium"):
        out["patient_intro"] = blob.get("patient_intro") or None

    if tier == "premium":
        out["hero_image_url"] = blob.get("hero_image_url") or None
        out["doctor_spotlight_image_url"] = blob.get("doctor_spotlight_image_url") or None
        out["team_image_url"] = blob.get("team_image_url") or None
        out["environment_image_url"] = blob.get("environment_image_url") or None
        out["clinic_video_url"] = blob.get("clinic_video_url") or None
        out["doctor_video_url"] = blob.get("doctor_video_url") or None
        out["doctor_spotlight_name"] = blob.get("doctor_spotlight_name") or None
        out["doctor_spotlight_role"] = blob.get("doctor_spotlight_role") or None
        out["doctor_spotlight_bio"] = blob.get("doctor_spotlight_bio") or None
        out["team_note"] = blob.get("team_note") or None
        out["clinic_story"] = blob.get("clinic_story") or None
        out["environment_description"] = blob.get("environment_description") or None
        out["consultation_process"] = blob.get("consultation_process") or None
        # Case library — premium only, published + consent-confirmed only.
        cases = blob.get("case_library") or []
        safe_cases = [
            {
                "id": c.get("id"),
                "title": c.get("title"),
                "category": c.get("category"),
                "summary": c.get("summary"),
                # Revamp fields (Feb 2026). All optional — the FE renders
                # them only when present.
                "treatment_type": c.get("treatment_type") or None,
                "duration": c.get("duration") or None,
                "price": c.get("price") or None,
                "materials": c.get("materials") or None,
                "specifics": c.get("specifics") or None,
                "before_images": [u for u in (c.get("before_images") or []) if isinstance(u, str) and u.strip()],
                "after_images": [u for u in (c.get("after_images") or []) if isinstance(u, str) and u.strip()],
            }
            for c in cases
            if isinstance(c, dict)
            and (c.get("status") or "draft").lower() == "published"
            and c.get("consent_confirmed") is True
            and c.get("title") and c.get("category") and c.get("summary")
        ]
        out["case_library"] = safe_cases or None

    # Strip None keys so consumers don't receive sparse payloads.
    return {k: v for k, v in out.items() if v is not None}


def _safe_clinic_payload(
    clinic: dict,
    lead_treatment: str,
    is_broad: bool,
    lead_district: Optional[str] = None,
    lead_flags: Optional[set[str]] = None,
) -> dict:
    slug = _clinic_city_slug(clinic)
    created_at_raw = clinic.get("created_at")
    partner_since_year: Optional[int] = None
    try:
        if isinstance(created_at_raw, str):
            partner_since_year = datetime.fromisoformat(created_at_raw).year
        elif hasattr(created_at_raw, "year"):
            partner_since_year = created_at_raw.year
    except Exception:
        partner_since_year = None

    tier = _resolve_partner_tier(clinic)

    treatments_normalized = _normalize_clinic_treatments(clinic)
    # Care Pass participation — strictly boolean. Backend stores either
    # the explicit `care_pass_partner` flag (preferred) or, defensively,
    # treats any truthy value as opt-in. Default False keeps the chip
    # OFF unless admin/clinic explicitly enrolled.
    care_pass_partner = bool(clinic.get("care_pass_partner") is True)
    profile = clinic.get("clinic_profile") or {}
    assessment_approaches = (
        clean_assessment_approaches(profile.get("assessment_approaches"))
        if profile.get("profile_status") == "published"
        else []
    )
    approach_matches = matching_assessment_approaches(
        assessment_approaches,
        lead_flags or set(),
    )

    payload = {
        "id": clinic.get("id"),
        # Public profile slug — exposed so frontend can deep-link the lead-
        # context clinic profile route to the public /api/public/clinics/{slug}
        # endpoint in a future profile-unification refactor. Today no UI uses
        # it for routing; we surface it now to avoid a second backend bump.
        "slug": clinic.get("slug"),
        "name": _clinic_name(clinic),
        "city_name": _city_name_for(slug, clinic.get("city_name")),
        "city_slug": slug,
        # Recommendation eligibility invariant — every clinic returned by
        # /recommended-clinics passed the same-city filter in `_score_clinic`
        # (which returns -1 for city mismatch). We surface this flag for the
        # frontend "В твоя град" chip without re-checking on the client.
        "same_city": True,
        # "В твоя квартал" chip — only true when the lead has a district
        # set AND it matches this clinic's. Unlike same_city, this is NOT
        # a filter invariant (district match is a scoring bonus, not
        # eligibility), so it must be computed here, not hardcoded.
        "same_district": bool(lead_district) and (clinic.get("district_slug") or "") == lead_district,
        # Care Pass chip — chip renders only when this is true on the card.
        # Copy guard: "Възможни ползи след физическа консултация." — never
        # implies online consultation, contact submission, or quiz unlock.
        "care_pass_partner": care_pass_partner,
        # Canonical field name for frontend consumers (Feb 2026 cleanup).
        "treatments_supported": treatments_normalized,
        # Legacy alias kept so existing card / profile components keep
        # working while the frontend migrates to `treatments_supported`.
        "treatments": treatments_normalized,
        "assessment_approaches": assessment_approaches,
        "assessment_approach_matches": approach_matches,
        "assessment_approach_match_labels": [ASSESSMENT_APPROACHES[value] for value in approach_matches],
        "reason": _reason_for(clinic, lead_treatment, is_broad),
        # Honest, conservative wording. We do NOT promise an SLA.
        "response_expectation": (
            "Клиниката ще получи заявката ви и ще може да се свърже с вас "
            "при потвърдено съгласие."
        ),
        "partner_since_year": partner_since_year,
        # Partner placement (transparent demo support).
        "partner_tier": tier,
        "is_featured": tier in ("featured", "premium"),
        "placement_label": _PLACEMENT_LABEL[tier],
        "placement_disclosure": _PLACEMENT_DISCLOSURE[tier],
    }

    # External review signals — display-only, never affect ranking.
    # `_build_review_signals` returns None when verified_by_admin is False
    # or no publishable source exists, in which case we omit the key entirely.
    rs = _build_review_signals(clinic)
    if rs is not None:
        payload["review_signals"] = rs

    # ── Rich Profile Editor R1 — tier-gated public projection ─────────
    # Only surface profile data when explicitly `published`. Standard tier
    # gets a minimal slice; Featured gets the contextual additions; Premium
    # gets the full media + storytelling stack. Draft / missing -> nothing.
    profile_public = _public_profile_for_tier(clinic, tier)
    if profile_public is not None:
        payload["clinic_profile"] = profile_public

    # ── Aligner brand / provider tags (Feb 2026) ──────────────────────
    # Helper applies the public-display downgrade (no "official" without
    # admin-verified status) and strips visible=false entries.
    chips = public_aligner_brand_chips(clinic.get("aligner_brands_supported"))
    if chips:
        payload["aligner_brands_supported"] = chips

    return payload


_EMPTY_MESSAGE = (
    "В момента нямаме достатъчно партньорски клиники за автоматична "
    "препоръка. Zubite може да ви помогне ръчно да изберете следваща стъпка."
)


@router.get(
    "/leads/{lead_id}/recommended-clinics",
    dependencies=[Depends(rate_limit("recommended_clinics", 30, 300))],
)
async def recommended_clinics(lead_id: str, limit: int = 3):
    """Public read endpoint that returns up to `limit` partner clinics for a
    lead, with strict field whitelisting and conservative copy.

    Errors:
      • 404 if lead does not exist
      • 410 if lead is older than _RECO_WINDOW_DAYS
    """
    # Clamp limit defensively. Product rule: patient can view max 3.
    if not isinstance(limit, int) or limit < 1:
        limit = 3
    limit = min(limit, 3)

    # 1) Lead lookup — minimal projection, no PII pulled into memory.
    lead = await db.leads.find_one(
        {"id": lead_id},
        {"_id": 0, "id": 1, "city_slug": 1, "district_slug": 1, "treatment_type": 1, "created_at": 1},
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # 2) Freshness window.
    created_at_raw = lead.get("created_at")
    try:
        if isinstance(created_at_raw, str):
            created_at_dt = datetime.fromisoformat(created_at_raw)
        else:
            created_at_dt = created_at_raw
        if created_at_dt and created_at_dt.tzinfo is None:
            created_at_dt = created_at_dt.replace(tzinfo=timezone.utc)
        age_days = (
            (datetime.now(timezone.utc) - created_at_dt).total_seconds() / 86400.0
            if created_at_dt
            else 0
        )
    except Exception:
        age_days = 0
    if age_days > _RECO_WINDOW_DAYS:
        raise HTTPException(status_code=410, detail="Lead recommendation window expired")

    lead_city = (lead.get("city_slug") or "").strip().lower()
    lead_district = (lead.get("district_slug") or "").strip().lower() or None
    lead_treatment = (lead.get("treatment_type") or "").strip().lower()
    is_broad = lead_treatment in _BROAD_TREATMENT_TYPES
    answers = lead.get("answers") if isinstance(lead.get("answers"), dict) else {}
    lead_flags = {
        flag for flag in (answers.get("quiz_flags") or [])
        if isinstance(flag, str)
    }

    # Shared selection_rule echoed in every response (and in 0-match case).
    selection_rule = {
        "can_view_clinics": 3,
        "can_request_call_from_clinics": None,
        "assisted_choice_available": True,
    }
    empty_response = {
        "lead_id": lead_id,
        "city_slug": lead_city,
        "treatment_type": lead_treatment,
        "clinic_count": 0,
        "fallback_used": False,
        "assisted_help_available": True,
        "selection_rule": selection_rule,
        "message": _EMPTY_MESSAGE,
        "clinics": [],
    }

    if not lead_city:
        # No city => no deterministic match possible. Honest empty.
        return empty_response

    # 3) Candidate clinics. Pull a broad page; in-memory filter/score.
    # Cap is generous but bounded.
    raw_candidates = await db.clinics.find(
        {},
        {
            "_id": 0,
            "id": 1, "name": 1, "clinic_name": 1,
            "city_slug": 1, "city_name": 1, "city": 1, "district_slug": 1,
            "treatments_supported": 1, "treatments_offered": 1,
            "is_active": 1, "clinic_status": 1, "status": 1,
            "archived": 1,
            "is_demo": 1,
            # Public profile slug — projected so it's available for the
            # `slug` field exposed in `_safe_clinic_payload` (Feb 2026).
            "slug": 1,
            # Care Pass participation flag — exposed on the recommended-clinic
            # payload so the patient-facing card can render the Care Pass chip
            # ONLY on participating clinics (Feb 2026 brief). NEVER affects ranking.
            "care_pass_partner": 1,
            "created_at": 1,
            # Partner placement (optional; missing => safe defaults).
            "partner_tier": 1, "is_featured": 1, "is_premium": 1,
            "featured_rank": 1, "sponsored_rank": 1,
            # Rich Profile (R1) — admin-managed, tier-gated public surface.
            "clinic_profile": 1,
            # Aligner brand tags (Feb 2026) — projected raw; the helper
            # applies the public downgrade + visibility filter.
            "aligner_brands_supported": 1,
            # External review signals (optional; admin-gated, display-only).
            # MUST NOT influence ranking — see `_score_clinic`.
            "google_rating": 1, "google_review_count": 1, "google_place_url": 1,
            "facebook_rating": 1, "facebook_review_count": 1, "facebook_page_url": 1,
            "superdoc_rating": 1, "superdoc_review_count": 1, "superdoc_profile_url": 1,
            "review_sources_last_checked_at": 1,
            "review_sources_verified_by_admin": 1,
        },
    ).to_list(500)

    scored: List[tuple[int, int, str, dict]] = []
    for c in raw_candidates:
        if not _is_clinic_visible(c):
            continue
        s = _score_clinic(c, lead_city, lead_treatment, is_broad, lead_district)
        if s < 0:
            continue
        scored.append((s, _placement_rank(c), (_clinic_name(c) or "").lower(), c))

    # Deterministic sort: score desc (includes tier boost), then
    # featured/sponsored_rank asc (lower = surface first within same score
    # bucket), then alphabetical name asc.
    scored.sort(key=lambda x: (-x[0], x[1], x[2]))

    top = scored[:limit]

    if not top:
        return empty_response

    clinics_out = [
        _safe_clinic_payload(c, lead_treatment, is_broad, lead_district, lead_flags)
        for _, _, _, c in top
    ]

    return {
        "lead_id": lead_id,
        "city_slug": lead_city,
        "treatment_type": lead_treatment,
        "clinic_count": len(clinics_out),
        "fallback_used": False,
        "assisted_help_available": True,
        "selection_rule": selection_rule,
        "clinics": clinics_out,
    }


# ─── Patient layer P4: request contact from recommended clinics ───
#
# Product rule, enforced server-side AND echoed in the response:
#   • A lead may request contact from any number of recommended clinics.
#   • The selected clinic must be in the lead's recommended set.
#   • Patient must explicitly opt-in via `consent_to_share`.
#
# Idempotency is per lead + clinic. Repeating the same request returns the
# existing row; selecting another recommended clinic creates a new row.
#
# This endpoint does NOT send email/SMS/Twilio/ElevenLabs. Notification
# is a later batch.

# Exact consent text shown to the patient (in Bulgarian). Stored verbatim
# on both the consultation_request and the lead so audit can replay the
# precise wording the patient agreed to.
REQUEST_CALL_CONSENT_TEXT = (
    "Съгласен/съгласна съм Zubite да сподели заявката ми с избраната клиника."
)

_PHONE_DIGIT_RE = __import__("re").compile(r"\d")


def _is_acceptable_phone(value: str) -> bool:
    """Permissive check matching existing platform rules: at least 6
    digits anywhere in the string. We deliberately do not enforce a strict
    BG format; lead phone is also stored without strict validation in
    LeadContactUpdate."""
    if not isinstance(value, str):
        return False
    s = value.strip()
    if not s:
        return False
    digits = "".join(_PHONE_DIGIT_RE.findall(s))
    return len(digits) >= 6


def _safe_clinic_summary(clinic: dict) -> dict:
    """Public-safe minimal clinic info for success / duplicate responses."""
    return {
        "id": clinic.get("id"),
        "name": _clinic_name(clinic),
        "city_name": _city_name_for(_clinic_city_slug(clinic), clinic.get("city_name")),
    }


@router.post(
    "/leads/{lead_id}/request-call",
    dependencies=[Depends(rate_limit("request_call", 5, 300))],
)
async def request_call(lead_id: str, body: RequestCallBody):
    """Patient selects a recommended clinic and consents to share their
    request. Creates one consultation_request per clinic while allowing
    the same lead to contact other recommended clinics.
    """
    # 1) Consent — fail fast before any DB work.
    if not body.consent_to_share:
        raise HTTPException(
            status_code=422,
            detail={
                "success": False,
                "code": "consent_required",
                "message": (
                    "Необходимо е съгласие, за да споделим заявката с "
                    "избраната клиника."
                ),
            },
        )

    # 2) Phone validation (permissive — see _is_acceptable_phone).
    if not _is_acceptable_phone(body.phone):
        raise HTTPException(
            status_code=422,
            detail={
                "success": False,
                "code": "phone_invalid",
                "message": "Моля, въведете валиден телефонен номер.",
            },
        )

    # 3) Lead lookup. We need full lead for consultation_request copy +
    #    selection state for idempotency.
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # 4) Lead-recommendation freshness window (same rule as
    #    recommended-clinics endpoint).
    created_at_raw = lead.get("created_at")
    try:
        if isinstance(created_at_raw, str):
            created_at_dt = datetime.fromisoformat(created_at_raw)
        else:
            created_at_dt = created_at_raw
        if created_at_dt and created_at_dt.tzinfo is None:
            created_at_dt = created_at_dt.replace(tzinfo=timezone.utc)
        age_days = (
            (datetime.now(timezone.utc) - created_at_dt).total_seconds() / 86400.0
            if created_at_dt else 0
        )
    except Exception:
        age_days = 0
    if age_days > _RECO_WINDOW_DAYS:
        raise HTTPException(status_code=410, detail="Lead recommendation window expired")

    # 5) Recompute the recommended set with the EXACT same rules used by
    #    GET /recommended-clinics. We trust nothing the client sends — the
    #    selected clinic must be in this server-computed set.
    lead_city = (lead.get("city_slug") or "").strip().lower()
    lead_district = (lead.get("district_slug") or "").strip().lower() or None
    lead_treatment = (lead.get("treatment_type") or "").strip().lower()
    is_broad = lead_treatment in _BROAD_TREATMENT_TYPES
    if not lead_city:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "code": "clinic_not_in_recommendations",
                "message": "Тази клиника не е част от препоръките за този резултат.",
            },
        )

    raw_candidates = await db.clinics.find(
        {},
        {
            "_id": 0,
            "id": 1, "name": 1, "clinic_name": 1,
            "city_slug": 1, "city_name": 1, "city": 1, "district_slug": 1,
            "treatments_supported": 1, "treatments_offered": 1,
            "is_active": 1, "clinic_status": 1, "status": 1,
            "archived": 1,
            "partner_tier": 1, "is_featured": 1, "is_premium": 1,
            "featured_rank": 1, "sponsored_rank": 1,
            "subscription_status": 1,
            "aligner_brands_supported": 1,
        },
    ).to_list(500)

    scored: List[tuple[int, int, str, dict]] = []
    for c in raw_candidates:
        if not _is_clinic_visible(c):
            continue
        s = _score_clinic(c, lead_city, lead_treatment, is_broad, lead_district)
        if s < 0:
            continue
        scored.append((s, _placement_rank(c), (_clinic_name(c) or "").lower(), c))
    scored.sort(key=lambda x: (-x[0], x[1], x[2]))
    recommended = [c for _, _, _, c in scored[:3]]
    recommended_by_id = {c.get("id"): c for c in recommended}

    selected_clinic = recommended_by_id.get(body.clinic_id)
    if selected_clinic is None:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "code": "clinic_not_in_recommendations",
                "message": "Тази клиника не е част от препоръките за този резултат.",
            },
        )

    # 6) Idempotency is scoped to the selected clinic. A patient can contact
    #    other recommended clinics; retrying the same clinic returns the
    #    original request instead of creating a duplicate.
    existing_request = await db.consultation_requests.find_one(
        {
            "lead_id": lead_id,
            "assigned_clinic_id": body.clinic_id,
            "created_from": "recommended_clinics_flow",
        },
        {"_id": 0},
    )
    if existing_request:
        return {
            "success": True,
            "request_id": existing_request.get("id"),
            "clinic": _safe_clinic_summary(selected_clinic),
            "message": "Заявката вече е изпратена към тази клиника.",
            "already_requested": True,
        }

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "phone": body.phone.strip(),
                "consent_to_share_clinic": True,
                "consent_to_share_clinic_at": now_iso,
            }
        },
    )

    # 7) Build and insert the consultation_request. We avoid importing
    #    `_ensure_consultation_for_lead` from the consultations router to
    #    keep this endpoint isolated and avoid email side-effects (that
    #    helper is admin-facing). The doc shape is intentionally aligned
    #    with what the clinic portal already reads.
    fresh_lead = await db.leads.find_one({"id": lead_id}, {"_id": 0}) or lead
    req_id = str(uuid.uuid5(
        uuid.NAMESPACE_URL,
        f"zubite:recommended-clinic-request:{lead_id}:{body.clinic_id}",
    ))
    consultation_doc = {
        "id": req_id,
        "patient_name": fresh_lead.get("name") or "",
        "patient_phone": fresh_lead.get("phone") or "",
        "patient_email": fresh_lead.get("email"),
        "patient_city": fresh_lead.get("city_slug") or fresh_lead.get("city"),
        "preferred_contact_time": None,
        "treatment_interest": (fresh_lead.get("treatment_type") or "general").lower(),
        "urgency": (fresh_lead.get("answers") or {}).get("urgency"),
        "readiness": (fresh_lead.get("answers") or {}).get("readiness") or fresh_lead.get("band"),
        "quiz_result_id": (fresh_lead.get("answers") or {}).get("session_id"),
        "lead_id": lead_id,
        "source": "patient_selected_clinic",
        "created_from": "recommended_clinics_flow",
        "selection_source": body.source,
        "utm_source": fresh_lead.get("utm_source") or fresh_lead.get("first_utm_source"),
        "utm_campaign": fresh_lead.get("utm_campaign") or fresh_lead.get("first_utm_campaign"),
        "utm_adset": fresh_lead.get("utm_adset") or fresh_lead.get("first_utm_adset"),
        "utm_ad": fresh_lead.get("utm_ad") or fresh_lead.get("first_utm_ad"),
        "assigned_clinic_id": body.clinic_id,
        "status": "assigned",
        "assigned_at": now_iso,
        "clinic_viewed_at": None,
        "first_action_at": None,
        "call_attempted_at": None,
        "patient_contacted_at": None,
        "appointment_booked_at": None,
        "attended_at": None,
        "no_show_at": None,
        "cancelled_at": None,
        "notes": None,
        # Consent capture (verbatim, with timestamp) — for compliance audit.
        "consent_to_share_clinic": True,
        "consent_to_share_clinic_at": now_iso,
        "consent_to_share_clinic_text": REQUEST_CALL_CONSENT_TEXT,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    try:
        await db.consultation_requests.insert_one(consultation_doc)
    except DuplicateKeyError:
        # A parallel submission for the same lead + clinic used the same
        # deterministic id and won the insert. Surface it as an idempotent
        # success instead of creating a duplicate.
        existing_request = await db.consultation_requests.find_one(
            {"id": req_id},
            {"_id": 0, "id": 1},
        )
        return {
            "success": True,
            "request_id": (existing_request or {}).get("id", req_id),
            "clinic": _safe_clinic_summary(selected_clinic),
            "message": "Заявката вече е изпратена към тази клиника.",
            "already_requested": True,
        }

    # 8) Keep legacy single-selection fields for older clients while adding
    #    arrays that represent the real multi-clinic state.
    await db.leads.update_one(
        {"id": lead_id},
        {
            "$addToSet": {
                "selected_clinic_ids": body.clinic_id,
                "selected_clinic_request_ids": req_id,
            },
            "$set": {
                "selected_clinic_id": body.clinic_id,
                "selected_clinic_request_id": req_id,
                "selected_clinic_requested_at": now_iso,
                "clinic_selection_source": body.source,
                "request_call_status": "requested",
            },
        },
    )

    # 9) Admin email alert (best-effort, non-blocking). Triggered only on a
    #    successful new insert, never on an idempotent retry.
    try:
        await send_admin_selected_clinic_request_alert(
            request_id=req_id,
            lead_id=lead_id,
            patient_name=fresh_lead.get("name"),
            patient_phone=fresh_lead.get("phone"),
            patient_city=fresh_lead.get("city_slug") or fresh_lead.get("city"),
            treatment_interest=consultation_doc.get("treatment_interest"),
            clinic_id=body.clinic_id,
            clinic_name=_clinic_name(selected_clinic),
            source=body.source,
            created_at=now_iso,
        )
    except Exception as alert_exc:
        # Email failure must NEVER block the patient flow.
        logger.warning(
            f"P4 admin alert failed for req {req_id}: {alert_exc}"
        )

    return {
        "success": True,
        "request_id": req_id,
        "clinic": _safe_clinic_summary(selected_clinic),
        "message": "Заявката е изпратена към избраната клиника.",
    }


@router.get("/leads/{lead_id}/selection-state")
async def lead_selection_state(lead_id: str):
    """Read-only summary of all clinics contacted for this result plus the
    optional Zubite-assisted request. The legacy single-selection fields
    remain populated with the most recent clinic for older clients."""
    lead = await db.leads.find_one(
        {"id": lead_id},
        {"_id": 0, "selected_clinic_id": 1, "selected_clinic_request_id": 1,
         "clinic_selection_source": 1, "request_call_status": 1,
         "selected_clinic_requested_at": 1,
         "assisted_choice_request_id": 1, "assisted_choice_status": 1,
         "assisted_choice_requested_at": 1, "assisted_choice_source": 1},
    )
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")

    clinic_requests = await db.consultation_requests.find(
        {
            "lead_id": lead_id,
            "created_from": "recommended_clinics_flow",
            "assigned_clinic_id": {"$nin": [None, ""]},
        },
        {"_id": 0, "id": 1, "assigned_clinic_id": 1, "created_at": 1},
    ).sort("created_at", 1).to_list(100)

    requested_clinic_ids: List[str] = []
    request_id_by_clinic: Dict[str, str] = {}
    for request_doc in clinic_requests:
        clinic_id = request_doc.get("assigned_clinic_id")
        if not clinic_id or clinic_id in request_id_by_clinic:
            continue
        requested_clinic_ids.append(clinic_id)
        request_id_by_clinic[clinic_id] = request_doc.get("id")

    # Compatibility with historical rows that stamped only the lead.
    legacy_id = lead.get("selected_clinic_id")
    if legacy_id and legacy_id not in request_id_by_clinic:
        requested_clinic_ids.append(legacy_id)
        request_id_by_clinic[legacy_id] = lead.get("selected_clinic_request_id")

    latest_clinic_id = requested_clinic_ids[-1] if requested_clinic_ids else None
    latest_request_id = (
        request_id_by_clinic.get(latest_clinic_id)
        if latest_clinic_id else None
    )

    clinic_docs = []
    if requested_clinic_ids:
        clinic_docs = await db.clinics.find(
            {"id": {"$in": requested_clinic_ids}},
            {"_id": 0, "id": 1, "name": 1, "clinic_name": 1,
             "city_slug": 1, "city_name": 1, "city": 1},
        ).to_list(100)
    clinics_by_id = {clinic.get("id"): clinic for clinic in clinic_docs}
    requested_clinics = [
        _safe_clinic_summary(clinics_by_id[clinic_id])
        if clinic_id in clinics_by_id
        else {"id": clinic_id, "name": "", "city_name": ""}
        for clinic_id in requested_clinic_ids
    ]

    assisted_id = lead.get("assisted_choice_request_id")
    out = {
        "lead_id": lead_id,
        "has_request": bool(requested_clinic_ids),
        "request_count": len(requested_clinic_ids),
        "requested_clinic_ids": requested_clinic_ids,
        "requested_clinics": requested_clinics,
        # Legacy compatibility: expose the latest clinic through the old keys.
        "selected_clinic_id": latest_clinic_id,
        "selected_clinic_request_id": latest_request_id,
        "clinic_selection_source": lead.get("clinic_selection_source"),
        "request_call_status": lead.get("request_call_status"),
        "selected_clinic_requested_at": lead.get("selected_clinic_requested_at"),
        "has_selected_clinic": bool(requested_clinic_ids),
        "has_requested_zubite_help": bool(assisted_id),
        "assisted_choice_request_id": assisted_id,
        "assisted_choice_status": lead.get("assisted_choice_status"),
        "assisted_choice_requested_at": lead.get("assisted_choice_requested_at"),
        "assisted_choice_source": lead.get("assisted_choice_source"),
    }
    if latest_clinic_id:
        latest_clinic = next(
            (
                clinic for clinic in requested_clinics
                if clinic.get("id") == latest_clinic_id
            ),
            None,
        )
        out["clinic"] = latest_clinic
        out["selected_clinic"] = latest_clinic
    else:
        out["selected_clinic"] = None
    return out


# ─── Patient layer P5: assisted choice ("Помогнете ми да избера") ──
#
# A patient who is unsure which clinic to choose can ask Zubite to help.
# This is a MANUAL concierge flow: no clinic is notified, no clinic is
# auto-selected, no AI decision is made. The endpoint only records the
# request in MongoDB so admins can pick it up later.
#
# This optional help request does not prevent the patient from contacting
# clinics directly, and direct clinic requests do not disable this service.

REQUEST_ZUBITE_HELP_CONSENT_TEXT = (
    "Съгласен/съгласна съм Zubite да използва информацията от оценката ми, "
    "за да ми помогне да избера подходяща следваща стъпка."
)


@router.post(
    "/leads/{lead_id}/request-zubite-help",
    dependencies=[Depends(rate_limit("request_zubite_help", 5, 300))],
)
async def request_zubite_help(lead_id: str, body: RequestZubiteHelpBody):
    """Patient asks Zubite to help them choose. Creates a single
    `consultation_requests` document with `assigned_clinic_id=null` and
    `created_from='assisted_choice_flow'` so it never surfaces in any
    clinic portal (those queries always include an `assigned_clinic_id`
    filter)."""
    # 1) Consent — fail fast.
    if not body.consent_to_share:
        raise HTTPException(
            status_code=422,
            detail={
                "success": False,
                "code": "consent_required",
                "message": "Необходимо е съгласие, за да обработим заявката ви.",
            },
        )

    # 2) Phone validation (permissive, see _is_acceptable_phone).
    if not _is_acceptable_phone(body.phone):
        raise HTTPException(
            status_code=422,
            detail={
                "success": False,
                "code": "phone_invalid",
                "message": "Моля, въведете валиден телефонен номер.",
            },
        )

    # 3) Lead lookup.
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # 4) Lead-window freshness (same rule as recommendations / P4).
    created_at_raw = lead.get("created_at")
    try:
        if isinstance(created_at_raw, str):
            created_at_dt = datetime.fromisoformat(created_at_raw)
        else:
            created_at_dt = created_at_raw
        if created_at_dt and created_at_dt.tzinfo is None:
            created_at_dt = created_at_dt.replace(tzinfo=timezone.utc)
        age_days = (
            (datetime.now(timezone.utc) - created_at_dt).total_seconds() / 86400.0
            if created_at_dt else 0
        )
    except Exception:
        age_days = 0
    if age_days > _RECO_WINDOW_DAYS:
        raise HTTPException(status_code=410, detail="Lead recommendation window expired")

    # 5) Existing assisted-choice row → idempotent retry surfaces the
    #    existing id. Clinic contact requests do not block this flow.
    existing_assisted_id = lead.get("assisted_choice_request_id")
    if existing_assisted_id:
        return {
            "success": True,
            "request_id": existing_assisted_id,
            "message": "Заявката вече е изпратена към Zubite.",
            "already_requested": True,
        }

    # Defensive cross-check against the collection (partial-write recovery).
    flow_assisted_req = await db.consultation_requests.find_one(
        {"lead_id": lead_id, "created_from": "assisted_choice_flow"},
        {"_id": 0, "id": 1},
    )
    if flow_assisted_req:
        return {
            "success": True,
            "request_id": flow_assisted_req["id"],
            "message": "Заявката вече е изпратена към Zubite.",
            "already_requested": True,
        }

    # 6) Atomic CAS guards only against duplicate assisted-choice submits.
    #    Direct clinic requests are intentionally independent.
    now_iso = datetime.now(timezone.utc).isoformat()
    req_id = str(uuid.uuid4())
    cas = await db.leads.update_one(
        {
            "id": lead_id,
            "$or": [
                {"assisted_choice_requested_at": {"$exists": False}},
                {"assisted_choice_requested_at": None},
                {"assisted_choice_requested_at": ""},
            ],
        },
        {
            "$set": {
                "assisted_choice_request_id": req_id,
                "assisted_choice_requested_at": now_iso,
                "assisted_choice_status": "requested",
                "assisted_choice_source": body.source,
                "consent_to_share_zubite": True,
                "consent_to_share_zubite_at": now_iso,
                "phone": body.phone.strip(),
            }
        },
    )
    if cas.modified_count != 1:
        # Lost the CAS — re-read & branch.
        relead = await db.leads.find_one(
            {"id": lead_id},
            {"_id": 0, "assisted_choice_request_id": 1},
        ) or {}
        if relead.get("assisted_choice_request_id"):
            return {
                "success": True,
                "request_id": relead["assisted_choice_request_id"],
                "message": "Заявката вече е изпратена към Zubite.",
                "already_requested": True,
            }
        # Genuinely unknown failure — surface a safe 409 not 500.
        raise HTTPException(
            status_code=409,
            detail={
                "success": False,
                "code": "already_requested_zubite_help",
                "message": "Вече сте изпратили заявка към Zubite за помощ при избора.",
            },
        )

    # 7) Insert the consultation_request (no clinic assignment).
    fresh_lead = await db.leads.find_one({"id": lead_id}, {"_id": 0}) or lead
    safe_message: Optional[str] = (body.message or "").strip()[:1000] or None
    consultation_doc = {
        "id": req_id,
        "patient_name": fresh_lead.get("name") or "",
        "patient_phone": fresh_lead.get("phone") or "",
        "patient_email": fresh_lead.get("email"),
        "patient_city": fresh_lead.get("city_slug") or fresh_lead.get("city"),
        "preferred_contact_time": None,
        "treatment_interest": (fresh_lead.get("treatment_type") or "general").lower(),
        "urgency": (fresh_lead.get("answers") or {}).get("urgency"),
        "readiness": (fresh_lead.get("answers") or {}).get("readiness") or fresh_lead.get("band"),
        "quiz_result_id": (fresh_lead.get("answers") or {}).get("session_id"),
        "lead_id": lead_id,
        "source": "patient_requested_zubite_help",
        "created_from": "assisted_choice_flow",
        "selection_source": body.source,
        "utm_source": fresh_lead.get("utm_source") or fresh_lead.get("first_utm_source"),
        "utm_campaign": fresh_lead.get("utm_campaign") or fresh_lead.get("first_utm_campaign"),
        # Critical: no clinic assignment. This is what hides the request from
        # any clinic portal query (all of which filter by assigned_clinic_id).
        "assigned_clinic_id": None,
        "status": "needs_zubite_review",
        "assigned_at": None,
        "notes": None,
        "patient_message": safe_message,
        "consent_to_share_zubite": True,
        "consent_to_share_zubite_at": now_iso,
        "consent_to_share_zubite_text": REQUEST_ZUBITE_HELP_CONSENT_TEXT,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await db.consultation_requests.insert_one(consultation_doc)

    # 8) Admin email alert (best-effort, non-blocking). Triggered ONLY on
    #    a successful new insert — never on idempotent retry / 409 paths
    #    (those return before reaching this point).
    try:
        await send_admin_assisted_choice_request_alert(
            request_id=req_id,
            lead_id=lead_id,
            patient_name=fresh_lead.get("name"),
            patient_phone=fresh_lead.get("phone"),
            patient_city=fresh_lead.get("city_slug") or fresh_lead.get("city"),
            treatment_interest=consultation_doc.get("treatment_interest"),
            patient_message=safe_message,
            source=body.source,
            created_at=now_iso,
        )
    except Exception as alert_exc:
        logger.warning(
            f"P5 admin alert failed for req {req_id}: {alert_exc}"
        )

    return {
        "success": True,
        "request_id": req_id,
        "message": "Заявката е изпратена към Zubite.",
    }




# ─── Seed admin-password hygiene (Phase 2B) ──────────────────────
# Reject obvious low-entropy passwords even if the operator forgets to
# pick something strong.
SEED_ADMIN_USERNAME = "admin@zubite.bg"
_SEED_WEAK_PASSWORDS = frozenset({
    "password", "admin", "123456", "changeme", "zubite", "letmein",
})
_SEED_MIN_PASSWORD_LEN = 12


def _validate_seed_admin_password(password: Optional[str]) -> str:
    """Raise 400 if the seed-admin password is missing or weak. Returns
    the reason_code (used for audit metadata only) — actual value lives
    in the caller's HTTPException detail string."""
    if not password:
        raise HTTPException(
            status_code=400,
            detail="SEED_ADMIN_PASSWORD env var is required to seed the admin user.",
        )
    # Check known-weak BEFORE length so callers get a clearer error message.
    if password.lower() in _SEED_WEAK_PASSWORDS:
        raise HTTPException(
            status_code=400,
            detail="Seed admin password is in the known-weak password list.",
        )
    if password.lower() == SEED_ADMIN_USERNAME.lower():
        raise HTTPException(
            status_code=400,
            detail="Seed admin password must not equal the admin username.",
        )
    if len(password) < _SEED_MIN_PASSWORD_LEN:
        raise HTTPException(
            status_code=400,
            detail=f"Seed admin password must be at least {_SEED_MIN_PASSWORD_LEN} characters.",
        )
    return "ok"


def _classify_seed_password(password: Optional[str]) -> Optional[str]:
    """Return a reason_code if password is rejectable; None if acceptable.
    Used by the audit hook so the rejection reason is recorded WITHOUT the
    password value ever entering the audit row."""
    if not password:
        return "missing"
    if password.lower() in _SEED_WEAK_PASSWORDS:
        return "weak"
    if password.lower() == SEED_ADMIN_USERNAME.lower():
        return "username_equal"
    if len(password) < _SEED_MIN_PASSWORD_LEN:
        return "short"
    return None


@router.post(
    "/seed",
    dependencies=[Depends(rate_limit("seed", max_calls=3, window_seconds=600))],
)
async def seed(request: Request):
    """Idempotent seed; runs only on first call when DB is empty.
    Once seeded, becomes a no-op forever to prevent re-seeding attacks.

    Phase 2B guards:
      - Refuses to seed in production (`APP_ENV=production`).
      - Refuses if SEED_ADMIN_PASSWORD is missing, weak, or matches the
        admin username.
    """
    from config import IS_PRODUCTION
    from audit import audit_log as _audit

    if IS_PRODUCTION:
        await _audit(
            "seed.blocked_production",
            actor=None, actor_type="system",
            target_type="system", target_id=None,
            metadata={"reason_code": "production_blocked"},
            severity="warning", request=request,
        )
        raise HTTPException(
            status_code=403,
            detail="Seeding is disabled in production.",
        )

    existing = await db.clinics.find_one({"city_slug": "sofia"})
    if existing:
        return {"message": "Already seeded"}
    admin_exists = await db.admin_users.find_one({"username": SEED_ADMIN_USERNAME})
    if admin_exists:
        return {"message": "Already seeded"}

    # Validate password BEFORE inserting any clinic rows so a botched call
    # leaves the DB untouched.
    import os as _os
    seed_admin_password = _os.environ.get("SEED_ADMIN_PASSWORD")
    reject_reason = _classify_seed_password(seed_admin_password)
    if reject_reason is not None:
        await _audit(
            "seed.rejected_weak_password",
            actor=None, actor_type="system",
            target_type="system", target_id=None,
            metadata={"reason_code": reject_reason},
            severity="warning", request=request,
        )
        # Now raise the user-facing error (NEVER echoes the password).
        _validate_seed_admin_password(seed_admin_password)

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

    await db.admin_users.insert_one({
        "id": str(uuid.uuid4()),
        "username": SEED_ADMIN_USERNAME,
        "password_hash": hash_password(seed_admin_password),
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    await _audit(
        "seed.executed",
        actor=None, actor_type="system",
        target_type="system", target_id=None,
        metadata={"clinics_seeded": len(clinics), "admin_seeded": True},
        severity="critical", request=request,
    )

    return {"message": "Seeded successfully"}
