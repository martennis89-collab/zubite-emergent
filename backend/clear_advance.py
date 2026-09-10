"""Report leads and their outcomes to the Clear Advance platform.

Zubite is where the clinic works. Clear Advance owns attribution and delivery to
Meta, so it needs two things from here: the enquiry when it arrives, and what
became of it afterwards.

Nothing about advertising lives in this file. No pixel id, no Conversions API
token, no idea which campaign a patient came from. Zubite hands over facts;
Clear Advance decides what is eligible to report and reports it. That split is
deliberate -- a dump of this database must not hand anyone the ability to write
conversions into a clinic's ad account.

**Routing is per clinic, and there is no default.** Zubite serves many clinics
and a Clear Advance API key identifies exactly one of them, so the key is stored
on the clinic and resolved from the lead's assignment. A clinic without a key is
simply not connected and is skipped. There is deliberately no environment-wide
fallback key: it would be convenient, and the first unassigned lead would be
reported into whichever clinic that key happened to belong to -- one clinic's
patient appearing in another clinic's ad account. Not reporting is recoverable;
that is not.

Unconfigured is a valid state, exactly like the email sender: no URL or no key
means log and return. A reporting problem must never stop a clinic taking a lead.
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 5.0

# A lead Clear Advance keeps rejecting -- an unusable phone number, a consent
# flag it will not accept -- will be rejected identically forever. The sweep
# below would otherwise retry it every ten minutes for the life of the clinic.
MAX_REPORT_ATTEMPTS = 5

# Zubite's vocabulary is not Clear Advance's. Only the outcomes that mean
# something to an ad platform are mapped; everything else is internal workflow
# and is deliberately not reported.
#
# Lead status is the coarse signal an admin sets by hand. "SCHEDULED"
# ("Записан") is unambiguous, so it is reported. "COMPLETED" ("Завършен") is
# not: it closes a lead out, and a lead closed after a no-show would be
# indistinguishable from one closed after a real visit. Attendance comes from
# the consultation instead -- see CONSULTATION_OUTCOMES.
STATUS_OUTCOMES = {
    "SCHEDULED": "appointment_booked",
}

# A consultation request is where the visit itself is recorded, by the clinic,
# with `mark_attended` and `mark_no_show` as separate actions. That distinction
# is the whole reason attendance is taken from here: reporting a no-show as an
# attendance would teach Meta to buy more of exactly the patients who never
# turn up. `mark_no_show` is absent on purpose and must stay absent.
CONSULTATION_OUTCOMES = {
    "book_consultation": "appointment_booked",
    "mark_attended": "appointment_attended",
}


def _base_url() -> Optional[str]:
    """The one platform every connected clinic reports to."""
    return os.environ.get("CLEAR_ADVANCE_API_URL", "").strip().rstrip("/") or None


def _fernet() -> Optional[Fernet]:
    """Encrypts the per-clinic keys at rest.

    A Clear Advance key can write leads and revenue into one clinic's account, so
    it does not sit in Mongo in the clear. The secret lives in the environment,
    which means a database dump on its own decrypts nothing.
    """
    secret = os.environ.get("CLEAR_ADVANCE_KEY_SECRET", "").strip()
    if not secret:
        return None
    try:
        return Fernet(secret.encode())
    except Exception:
        logger.error("CLEAR_ADVANCE_KEY_SECRET is not a valid Fernet key")
        return None


def encrypt_api_key(plaintext: str) -> Optional[str]:
    """Used by the admin endpoint that stores a clinic's key."""
    f = _fernet()
    return f.encrypt(plaintext.encode()).decode() if f else None


async def _clinic_key(db, lead: Dict[str, Any]) -> Optional[str]:
    """The API key of the clinic this lead belongs to, or nothing.

    An unassigned lead has no key by definition. That is the correct outcome, not
    a gap to paper over: we do not know whose patient it is, so we must not
    report it to anyone.
    """
    clinic_id = lead.get("assigned_clinic_id")
    if not clinic_id:
        logger.debug("Lead %s has no assigned clinic — not reported", lead.get("id"))
        return None

    # Deliberately its own collection rather than a field on the clinic. Several
    # clinic reads project with {"_id": 0}, which returns every other field, and
    # one of them -- GET /clinics -- is public and unauthenticated. A key stored
    # on the clinic would be published by a projection nobody thought about;
    # stored here it cannot be, however careless a future query is.
    record = await db.clinic_integrations.find_one(
        {"clinic_id": clinic_id, "provider": "clear_advance"}, {"_id": 0, "api_key": 1})
    stored = (record or {}).get("api_key")
    if not stored:
        logger.debug("Clinic %s is not connected to Clear Advance", clinic_id)
        return None

    f = _fernet()
    if not f:
        logger.error("Clinic %s has a stored key but CLEAR_ADVANCE_KEY_SECRET is unset", clinic_id)
        return None
    try:
        return f.decrypt(stored.encode()).decode()
    except Exception:
        # Usually the secret was rotated without re-encrypting the stored keys.
        logger.error("Could not decrypt the Clear Advance key for clinic %s", clinic_id)
        return None


async def _post(path: str, key: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    base = _base_url()
    if not base:
        return None
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{base}{path}", json=payload, headers={"Authorization": f"Bearer {key}"},
            )
        if response.status_code >= 400:
            # Clear Advance names the offending field precisely so this line is
            # actionable rather than a shrug.
            logger.error("Clear Advance rejected %s: HTTP %s %s",
                         path, response.status_code, response.text[:300])
            return None
        return response.json()
    except Exception as exc:
        logger.error("Clear Advance request to %s failed: %s", path, exc)
        return None


async def report_lead(db, lead: Dict[str, Any]) -> Optional[str]:
    """Hand a new enquiry over, and remember the id we get back.

    That id is the link between the two systems. Storing it is what lets a later
    outcome be attached to the right person without matching on a phone number --
    two family members share one, and merging them would credit one person's
    treatment to another.
    """
    lead_id = str(lead.get("id") or "")
    key = await _clinic_key(db, lead) if lead_id else None
    if not key or not _base_url():
        return None

    consent = bool(lead.get("consent"))
    result = await _post("/api/v1/leads", key, {
        "name": lead.get("name") or "",
        "phone": lead.get("phone") or "",
        "email": lead.get("email"),
        # Zubite records one consent flag. Clear Advance distinguishes the
        # privacy basis for holding the enquiry from permission to use it for
        # advertising measurement, and only the second unlocks identifiers.
        # Mapping one onto both is only correct while the form's wording
        # actually covers advertising measurement -- verify that before trusting
        # the attribution this produces.
        "consent_privacy": consent,
        "consent_marketing": consent,
        "source_system": "zubite",
        "source_lead_id": lead_id,
        "utm_source": lead.get("utm_source"),
        "utm_campaign": lead.get("utm_campaign"),
    })

    remote_id = (result or {}).get("lead_id")
    if remote_id:
        await db.leads.update_one(
            {"id": lead_id},
            {"$set": {"clear_advance_lead_id": remote_id,
                      "clear_advance_reported_at": datetime.now(timezone.utc)}},
        )
        logger.info("Clear Advance accepted lead %s as %s", lead_id, remote_id)
    else:
        # Counted so the sweep can eventually give up. _post has already logged
        # why; this only records that it happened.
        await db.leads.update_one({"id": lead_id}, {"$inc": {"clear_advance_attempts": 1}})
    return remote_id


async def _linked_id(db, lead: Dict[str, Any]) -> Optional[str]:
    """The Clear Advance lead id, reporting the enquiry first if it never arrived."""
    return lead.get("clear_advance_lead_id") or await report_lead(db, lead)


async def report_outcome(db, lead: Dict[str, Any], outcome: str) -> bool:
    """Report one outcome for one lead.

    The source event id is the lead plus the outcome, deliberately not the
    thing that triggered it. The same booking can arrive from two directions --
    an admin setting the lead to "Записан" and the clinic booking the
    consultation -- and keying on the trigger would report that one appointment
    twice. Keying on the lead means whichever arrives first wins and the other
    collapses into it, which also makes a double click, a retried request or a
    reconciliation sweep free.

    The cost is that a second, genuinely separate appointment for the same
    patient is not reported. That is the right way round: under-reporting a
    conversion is recoverable, inventing one is not.
    """
    key = await _clinic_key(db, lead)
    if not key:
        return False

    remote_id = await _linked_id(db, lead)
    if not remote_id:
        return False

    return bool(await _post("/api/v1/outcomes", key, {
        "source_system": "zubite",
        "source_event_id": f"{lead.get('id')}:{outcome}",
        "outcome": outcome,
        "lead_reference": remote_id,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }))


async def report_status(db, lead: Dict[str, Any], status: str) -> bool:
    """Report a lead status that means something to an ad platform."""
    outcome = STATUS_OUTCOMES.get((status or "").upper())
    return await report_outcome(db, lead, outcome) if outcome else False


async def report_consultation_action(db, lead_id: str, action_type: str) -> bool:
    """Report what the clinic recorded against a consultation.

    Takes the lead id rather than the lead because the caller has a
    consultation request, and the routing, the consent and the Clear Advance
    reference all live on the lead it came from.
    """
    outcome = CONSULTATION_OUTCOMES.get(action_type)
    if not outcome or not lead_id:
        return False

    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        logger.warning("Clear Advance: consultation points at missing lead %s", lead_id)
        return False

    return await report_outcome(db, lead, outcome)


async def report_revenue(db, lead: Dict[str, Any], amount_minor: int,
                         currency: str, source_event_id: str) -> bool:
    """Report money actually agreed or taken, in minor units.

    `source_event_id` must identify the *operation*, not the lead: a patient can
    legitimately pay twice, and the two must not collapse into one. It is also
    what makes a retry safe, so it has to be stable across retries of the same
    payment -- an invoice number, not a timestamp.
    """
    if not isinstance(amount_minor, int) or amount_minor <= 0:
        logger.error("Clear Advance: refusing revenue for %s with an unusable amount",
                     lead.get("id"))
        return False

    key = await _clinic_key(db, lead)
    if not key:
        return False

    remote_id = await _linked_id(db, lead)
    if not remote_id:
        return False

    return bool(await _post("/api/v1/outcomes", key, {
        "source_system": "zubite",
        "source_event_id": source_event_id,
        "outcome": "sale",
        "lead_reference": remote_id,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "amount_minor": amount_minor,
        "currency": currency.upper(),
    }))


async def report_pending_leads(db, limit: int = 50) -> int:
    """Hand over assigned leads that were never reported. Returns how many landed.

    Reporting is driven by assignment, not by creation, because an unassigned
    lead has nobody to report it to. Assignment happens in a dozen places -- the
    matcher, an admin editing a lead, a clinic claiming one, the profile
    scheduler -- and hooking every one of them is a promise the next writer will
    break. Sweeping for the end state is the choice `_backfill_patient_numbers`
    already made in this codebase, for the same reason.

    A clinic's own history is deliberately out of scope. Only leads created after
    it connected are eligible: without that, connecting a clinic with two years
    of leads would report all of them as fresh enquiries -- none attributable
    (Meta's window is seven days), all of them arriving in the clinic's Clear
    Advance list dated today.

    An outcome on an older lead still works. `_linked_id` reports that one lead
    on demand, which is a deliberate act about a named patient rather than a
    bulk backfill.
    """
    if not _base_url():
        return 0

    reported = 0
    integrations = await db.clinic_integrations.find(
        {"provider": "clear_advance", "connected_at": {"$exists": True}},
        {"_id": 0, "clinic_id": 1, "connected_at": 1},
    ).to_list(None)

    for integration in integrations:
        if reported >= limit:
            break
        leads = await db.leads.find(
            {
                "assigned_clinic_id": integration["clinic_id"],
                "clear_advance_lead_id": {"$exists": False},
                # A lead with no consent has no lawful basis to be sent
                # anywhere, so it is filtered here rather than left for Clear
                # Advance to reject -- a rejection still means the name and
                # phone number crossed the wire first.
                "consent": True,
                "created_at": {"$gte": integration["connected_at"]},
                "clear_advance_attempts": {"$not": {"$gte": MAX_REPORT_ATTEMPTS}},
            },
            {"_id": 0},
        ).sort("created_at", 1).to_list(limit - reported)

        for lead in leads:
            if await report_lead(db, lead):
                reported += 1
            # One clinic's backlog must not monopolise the connection pool or
            # arrive at Clear Advance as a burst.
            await asyncio.sleep(0.2)

    return reported
