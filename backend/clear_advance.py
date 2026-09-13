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
import hashlib
import json
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

import httpx
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 5.0
OUTCOME_RETRY_DELAYS = (0.25, 0.75, 1.5)
OUTBOX_RETRY_DELAYS_SECONDS = (60, 300, 900, 3600)
SUPPORTED_OUTCOMES = frozenset({
    "appointment_booked", "appointment_attended", "sale",
})
DEFAULT_STATUS_MAPPINGS = {
    "SCHEDULED": "appointment_booked",
    "ATTENDED": "appointment_attended",
}

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

CONSULTATION_STATUS_KEYS = {
    "book_consultation": "SCHEDULED",
    "mark_attended": "ATTENDED",
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

    return _clear_advance_key(record or {}, clinic_id)


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


async def _patch(path: str, key: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    base = _base_url()
    if not base:
        return None
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.patch(
                f"{base}{path}", json=payload,
                headers={"Authorization": f"Bearer {key}"},
            )
        if response.status_code >= 400:
            logger.error("Clear Advance rejected %s: HTTP %s %s",
                         path, response.status_code, response.text[:300])
            return None
        return response.json()
    except Exception as exc:
        logger.error("Clear Advance request to %s failed: %s", path, exc)
        return None


async def _get(path: str, key: str, params: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """Read a tenant-scoped Clear Advance feed page."""
    base = _base_url()
    if not base:
        return None
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.get(
                f"{base}{path}", params=params,
                headers={"Authorization": f"Bearer {key}"},
            )
        if response.status_code >= 400:
            logger.error("Clear Advance feed rejected: HTTP %s %s",
                         response.status_code, response.text[:300])
            return None
        return response.json()
    except Exception as exc:
        logger.error("Clear Advance feed request to %s failed: %s", path, exc)
        return None


async def _post_with_retry(path: str, key: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Retry a transient outcome handoff without duplicating the operation id."""
    for attempt, delay in enumerate((0, *OUTCOME_RETRY_DELAYS)):
        if attempt:
            await asyncio.sleep(delay)
        result = await _post(path, key, payload)
        if result is not None:
            return result
    return None


async def _patch_with_retry(path: str, key: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    for attempt, delay in enumerate((0, *OUTCOME_RETRY_DELAYS)):
        if attempt:
            await asyncio.sleep(delay)
        result = await _patch(path, key, payload)
        if result is not None:
            return result
    return None


async def _record_sync_health(db, lead: Dict[str, Any], *, ok: bool, kind: str) -> None:
    clinic_id = lead.get("assigned_clinic_id")
    if not clinic_id:
        return
    await _record_clinic_sync_health(db, clinic_id, ok=ok, kind=kind)


async def _record_clinic_sync_health(db, clinic_id: str, *, ok: bool, kind: str) -> None:
    if not clinic_id:
        return
    now = datetime.now(timezone.utc)
    update = {"$set": {
        "clear_advance_last_sync_at": now,
        "clear_advance_last_sync_kind": kind,
        "clear_advance_last_sync_ok": ok,
    }}
    if ok:
        update["$set"]["clear_advance_sync_failure_streak"] = 0
    else:
        update["$inc"] = {"clear_advance_sync_failure_streak": 1}
    await db.clinic_integrations.update_one(
        {"clinic_id": clinic_id, "provider": "clear_advance"}, update,
    )


def _event_id(lead: Dict[str, Any], outcome: str) -> str:
    """Stable idempotency key for one lead/outcome conversion."""
    return f"{lead.get('id')}:{outcome}"


def _revenue_outbox_id(lead: Dict[str, Any], source_event_id: str) -> str:
    """Tenant-safe local identity for one payment event.

    Invoice/reference values are only unique inside a clinic. Clear Advance
    scopes them by organisation; the Zubite outbox must do the same.
    """
    return f"{lead.get('assigned_clinic_id')}:sale:{source_event_id}"


def _lead_touch(lead: Dict[str, Any], prefix: str) -> Dict[str, str]:
    """Build Clear Advance's safe first/latest-touch payload from a Zubite lead."""
    aliases = {
        "utm_source": "utm_source",
        "utm_medium": "utm_medium",
        "utm_campaign": "utm_campaign",
        "utm_content": "utm_content",
        "utm_term": "utm_term",
        "utm_campaign_id": "campaign_id",
        "utm_adset_id": "adset_id",
        "utm_ad_id": "ad_id",
        "fbclid": "fbclid",
        "gclid": "gclid",
        "msclkid": "msclkid",
        "ttclid": "ttclid",
        "landing_page": "landing_page",
        "referrer": "referrer",
        "seen_at": "seen_at",
    }
    touch: Dict[str, str] = {}
    for local_suffix, remote_key in aliases.items():
        value = lead.get(f"{prefix}_{local_suffix}")
        if isinstance(value, str) and value.strip():
            touch[remote_key] = value.strip()
    if prefix == "latest":
        if "utm_source" not in touch and isinstance(lead.get("utm_source"), str):
            touch["utm_source"] = lead["utm_source"]
        if "utm_campaign" not in touch and isinstance(lead.get("utm_campaign"), str):
            touch["utm_campaign"] = lead["utm_campaign"]
        if "utm_content" not in touch and isinstance(lead.get("utm_ad"), str):
            touch["utm_content"] = lead["utm_ad"]
    return touch


async def _enqueue_outcome(db, lead: Dict[str, Any], outcome: str,
                           payload: Dict[str, Any], *, event_id: Optional[str] = None,
                           endpoint: str = "/api/v1/outcomes",
                           method: str = "POST") -> Optional[Dict[str, Any]]:
    """Persist an outbound conversion before attempting delivery.

    Older test doubles do not expose the collection; production always does.
    Keeping the fallback preserves the existing direct-delivery behavior for
    those doubles while the real service gets durable retries.
    """
    outbox = getattr(db, "clear_advance_outbox", None)
    if outbox is None:
        return None
    event_id = event_id or _event_id(lead, outcome)
    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "clinic_id": lead.get("assigned_clinic_id"),
        "lead_id": lead.get("id"),
        "outcome": outcome,
        "endpoint": endpoint,
        "method": method,
        "payload": payload,
        "status": "pending",
        "attempts": 0,
        "created_at": now,
        "updated_at": now,
        "next_attempt_at": now,
    }
    await outbox.update_one(
        {"event_id": event_id}, {"$setOnInsert": doc}, upsert=True,
    )
    return await outbox.find_one({"event_id": event_id}, {"_id": 0})


async def _deliver_outcome(db, lead: Dict[str, Any], event: Dict[str, Any],
                           key: str) -> bool:
    """Deliver one outbox row and update its durable state."""
    outbox = getattr(db, "clear_advance_outbox", None)
    endpoint = event.get("endpoint") or "/api/v1/outcomes"
    sender = _patch_with_retry if event.get("method") == "PATCH" else _post_with_retry
    result = await sender(endpoint, key, event["payload"])
    ok = bool(result)
    if outbox is not None:
        now = datetime.now(timezone.utc)
        attempt_number = int(event.get("attempts") or 0)
        retry_after = OUTBOX_RETRY_DELAYS_SECONDS[
            min(attempt_number, len(OUTBOX_RETRY_DELAYS_SECONDS) - 1)
        ]
        update = {
            "$set": {
                "status": "succeeded" if ok else "failed",
                "updated_at": now,
                "last_attempt_at": now,
                "last_error": None if ok else "delivery_failed",
                "completed_at": now if ok else None,
                "next_attempt_at": None if ok else now + timedelta(seconds=retry_after),
            },
            "$inc": {"attempts": 1},
        }
        await outbox.update_one({"event_id": event["event_id"]}, update)
    await _record_sync_health(db, lead, ok=ok, kind=event["outcome"])
    return ok


async def _defer_outbox_event(outbox, event: Dict[str, Any], error: str) -> None:
    """Record an undeliverable event and keep it off the hot retry path."""
    now = datetime.now(timezone.utc)
    attempt_number = int(event.get("attempts") or 0)
    retry_after = OUTBOX_RETRY_DELAYS_SECONDS[
        min(attempt_number, len(OUTBOX_RETRY_DELAYS_SECONDS) - 1)
    ]
    await outbox.update_one(
        {"event_id": event.get("event_id")},
        {
            "$set": {
                "status": "failed",
                "updated_at": now,
                "last_attempt_at": now,
                "last_error": error,
                "next_attempt_at": now + timedelta(seconds=retry_after),
            },
            "$inc": {"attempts": 1},
        },
    )


async def _status_outcome(db, lead: Dict[str, Any], status: str) -> Optional[str]:
    """Resolve a clinic-specific status mapping, falling back to defaults."""
    normalized = (status or "").upper()
    # COMPLETED is an administrative workflow state, not evidence that the
    # patient attended. Ignore any mapping saved by an older settings screen.
    if normalized == "COMPLETED":
        return None
    record = await db.clinic_integrations.find_one(
        {"clinic_id": lead.get("assigned_clinic_id"), "provider": "clear_advance"},
        {"_id": 0, "status_mappings": 1},
    )
    mappings = (record or {}).get("status_mappings") or {}
    outcome = mappings.get(normalized, DEFAULT_STATUS_MAPPINGS.get(normalized))
    return outcome if outcome in SUPPORTED_OUTCOMES else None


def _clear_advance_key(record: Dict[str, Any], clinic_id: str) -> Optional[str]:
    stored = record.get("api_key")
    if not stored:
        return None
    f = _fernet()
    if not f:
        logger.error("Clinic %s has a stored key but CLEAR_ADVANCE_KEY_SECRET is unset", clinic_id)
        return None
    try:
        return f.decrypt(stored.encode()).decode()
    except Exception:
        logger.error("Could not decrypt the Clear Advance key for clinic %s", clinic_id)
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

    # Imported leads preserve Clear Advance's separate consent flags. Native
    # Zubite leads only have `consent`, so retain that fallback.
    privacy_consent = bool(lead.get("consent_privacy", lead.get("consent")))
    marketing_consent = bool(lead.get("consent_marketing", lead.get("consent")))
    first_touch = _lead_touch(lead, "first")
    last_touch = _lead_touch(lead, "latest")
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
        "consent_privacy": privacy_consent,
        "consent_marketing": marketing_consent,
        "event_id": lead_id,
        "source_system": "zubite",
        "source_lead_id": lead_id,
        "landing_page": lead.get("first_landing_page") or lead.get("page_path"),
        "referrer": lead.get("first_referrer"),
        "first_touch": first_touch,
        "last_touch": last_touch,
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


async def report_outcome(db, lead: Dict[str, Any], outcome: str,
                         *, deliver: bool = True) -> bool:
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
    if outcome not in SUPPORTED_OUTCOMES:
        return False

    key = await _clinic_key(db, lead)
    if not key:
        return False

    payload = {
        "source_system": "zubite",
        "source_event_id": _event_id(lead, outcome),
        "outcome": outcome,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }
    remote_id = lead.get("clear_advance_lead_id")
    if remote_id:
        payload["lead_reference"] = remote_id
    else:
        payload["source_lead_id"] = str(lead.get("id") or "")
    event = await _enqueue_outcome(db, lead, outcome, payload)
    # A durable success is already delivered. This makes duplicate hooks and
    # manual retries read-only after the first successful handoff.
    if event and event.get("status") == "succeeded":
        return True
    if event:
        if not deliver:
            return True
        return await _deliver_outcome(db, lead, {
            "event_id": event["event_id"], "outcome": outcome,
            "payload": event.get("payload") or payload,
        }, key)

    if not deliver:
        return False
    result = await _post_with_retry("/api/v1/outcomes", key, payload)
    ok = bool(result)
    await _record_sync_health(db, lead, ok=ok, kind=outcome)
    return ok


async def report_status(db, lead: Dict[str, Any], status: str,
                        *, deliver: bool = True) -> bool:
    """Report a lead status that means something to an ad platform."""
    outcome = await _status_outcome(db, lead, status)
    return await report_outcome(db, lead, outcome, deliver=deliver) if outcome else False


async def queue_lead_update(db, lead: Dict[str, Any]) -> bool:
    """Durably mirror clinic-edited contact fields to an already linked lead."""
    remote_id = lead.get("clear_advance_lead_id")
    if not remote_id:
        # An unlinked native lead will be created later with its current values.
        return False
    payload = {
        "name": lead.get("name") or "",
        "phone": lead.get("phone") or "",
        "email": lead.get("email"),
    }
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()[:20]
    event = await _enqueue_outcome(
        db, lead, "lead_update", payload,
        event_id=f"{lead.get('assigned_clinic_id')}:lead_update:{lead.get('id')}:{digest}",
        endpoint=f"/api/v1/leads/{remote_id}", method="PATCH",
    )
    if not event:
        return False
    return True


async def report_consultation_action(db, lead_id: str, action_type: str,
                                     *, deliver: bool = True) -> bool:
    """Report what the clinic recorded against a consultation.

    Takes the lead id rather than the lead because the caller has a
    consultation request, and the routing, the consent and the Clear Advance
    reference all live on the lead it came from.
    """
    status_key = CONSULTATION_STATUS_KEYS.get(action_type)
    if not status_key or not lead_id:
        return False

    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        logger.warning("Clear Advance: consultation points at missing lead %s", lead_id)
        return False

    outcome = await _status_outcome(db, lead, status_key)
    return await report_outcome(db, lead, outcome, deliver=deliver) if outcome else False


async def report_revenue(db, lead: Dict[str, Any], amount_minor: int,
                         currency: str, source_event_id: str,
                         *, deliver: bool = True) -> bool:
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

    payload = {
        "source_system": "zubite",
        "source_event_id": source_event_id,
        "outcome": "sale",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "amount_minor": amount_minor,
        "currency": currency.upper(),
    }
    remote_id = lead.get("clear_advance_lead_id")
    if remote_id:
        payload["lead_reference"] = remote_id
    else:
        payload["source_lead_id"] = str(lead.get("id") or "")
    event = await _enqueue_outcome(
        db, lead, "sale", payload,
        event_id=_revenue_outbox_id(lead, source_event_id),
    )
    if event and event.get("status") == "succeeded":
        return True
    if event:
        if not deliver:
            return True
        return await _deliver_outcome(db, lead, {
            "event_id": event["event_id"], "outcome": "sale",
            "payload": event.get("payload") or payload,
        }, key)
    if not deliver:
        return False
    result = await _post_with_retry("/api/v1/outcomes", key, payload)
    ok = bool(result)
    await _record_sync_health(db, lead, ok=ok, kind="sale")
    return ok


async def report_pending_leads(db, limit: int = 50, clinic_id: Optional[str] = None) -> int:
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
    integration_query: Dict[str, Any] = {
        "provider": "clear_advance", "connected_at": {"$exists": True},
    }
    if clinic_id:
        integration_query["clinic_id"] = clinic_id
    integrations = await db.clinic_integrations.find(
        integration_query,
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


async def process_pending_outcomes(db, limit: int = 50,
                                   clinic_id: Optional[str] = None) -> Dict[str, int]:
    """Deliver durable conversion events left by a failed request or restart."""
    outbox = getattr(db, "clear_advance_outbox", None)
    if outbox is None or not _base_url():
        return {"processed": 0, "succeeded": 0, "failed": 0}
    now = datetime.now(timezone.utc)
    event_query: Dict[str, Any] = {
        "status": {"$in": ["pending", "failed"]},
        "$or": [{"next_attempt_at": {"$lte": now}}, {"next_attempt_at": {"$exists": False}}],
    }
    if clinic_id:
        event_query["clinic_id"] = clinic_id
    events = await outbox.find(event_query, {"_id": 0}).sort("created_at", 1).to_list(limit)
    succeeded = 0
    failed = 0
    for event in events:
        clinic_id = event.get("clinic_id")
        lead_id = event.get("lead_id")
        if not clinic_id or not lead_id:
            await _defer_outbox_event(outbox, event, "missing_clinic_or_lead_id")
            failed += 1
            continue
        lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        record = await db.clinic_integrations.find_one(
            {"clinic_id": clinic_id, "provider": "clear_advance"},
            {"_id": 0, "api_key": 1},
        )
        key = _clear_advance_key(record or {}, clinic_id)
        if not lead:
            await _defer_outbox_event(outbox, event, "lead_not_found")
            failed += 1
            continue
        if not key:
            await _defer_outbox_event(outbox, event, "integration_key_unavailable")
            failed += 1
            continue
        ok = await _deliver_outcome(db, lead, event, key)
        succeeded += int(ok)
        failed += int(not ok)
    return {"processed": len(events), "succeeded": succeeded, "failed": failed}


def _imported_lead_doc(remote: Dict[str, Any], clinic_id: str, local_id: str) -> Dict[str, Any]:
    """Normalize a Clear Advance lead into Zubite's existing lead shape."""
    first = remote.get("first_touch") if isinstance(remote.get("first_touch"), dict) else {}
    last = remote.get("last_touch") if isinstance(remote.get("last_touch"), dict) else {}
    qualification = remote.get("qualification")
    remote_status = str(remote.get("status") or "new").lower()
    local_status = {
        "new": "NEW", "contacted": "CONTACTED", "qualified": "CONTACTED",
        "booked": "SCHEDULED", "attended": "COMPLETED", "won": "COMPLETED",
        "lost": "CANCELLED",
    }.get(remote_status, "NEW")
    return {
        "id": local_id,
        "name": remote.get("name") or "",
        "phone": remote.get("phone_e164") or "",
        "email": remote.get("email"),
        "consent": bool(remote.get("consent_privacy")),
        "consent_privacy": bool(remote.get("consent_privacy")),
        "consent_marketing": bool(remote.get("consent_marketing")),
        "assigned_clinic_id": clinic_id,
        "clinic_lead_status": "new" if remote_status == "new" else "contacted",
        "status": local_status,
        "clear_advance_status": remote_status,
        "source": remote.get("source") or "clear_advance",
        "origin_system": "clear_advance",
        "clear_advance_lead_id": remote.get("id"),
        "clear_advance_imported_at": datetime.now(timezone.utc),
        "created_at": remote.get("created_at") or datetime.now(timezone.utc).isoformat(),
        "first_utm_source": first.get("utm_source") or remote.get("utm_source"),
        "first_utm_medium": first.get("utm_medium") or remote.get("utm_medium"),
        "first_utm_campaign": first.get("utm_campaign") or remote.get("utm_campaign"),
        "first_utm_ad": first.get("utm_content") or remote.get("utm_content"),
        "first_utm_content": first.get("utm_content") or remote.get("utm_content"),
        "first_utm_term": first.get("utm_term") or remote.get("utm_term"),
        "first_utm_campaign_id": first.get("campaign_id") or remote.get("campaign_id"),
        "first_utm_adset_id": first.get("adset_id") or remote.get("adset_id"),
        "first_utm_ad_id": first.get("ad_id") or remote.get("ad_id"),
        "latest_utm_source": last.get("utm_source") or remote.get("utm_source"),
        "latest_utm_medium": last.get("utm_medium") or remote.get("utm_medium"),
        "latest_utm_campaign": last.get("utm_campaign") or remote.get("utm_campaign"),
        "latest_utm_ad": last.get("utm_content") or remote.get("utm_content"),
        "latest_utm_content": last.get("utm_content") or remote.get("utm_content"),
        "latest_utm_term": last.get("utm_term") or remote.get("utm_term"),
        "latest_utm_campaign_id": last.get("campaign_id") or remote.get("campaign_id"),
        "latest_utm_adset_id": last.get("adset_id") or remote.get("adset_id"),
        "latest_utm_ad_id": last.get("ad_id") or remote.get("ad_id"),
        "first_landing_page": first.get("landing_page") or remote.get("landing_page"),
        "latest_landing_page": last.get("landing_page") or remote.get("landing_page"),
        "first_referrer": first.get("referrer") or remote.get("referrer"),
        "latest_referrer": last.get("referrer") or remote.get("referrer"),
        "first_seen_at": first.get("seen_at"),
        "last_seen_at": last.get("seen_at"),
        # Qualification answers remain clinic context and are never forwarded
        # back to advertising destinations.
        "answers": qualification if isinstance(qualification, dict) else {},
    }


async def import_clear_advance_lead(db, remote: Dict[str, Any], clinic_id: str) -> bool:
    """Idempotently import one feed row and create its clinic request."""
    remote_id = str(remote.get("id") or "")
    if not remote_id:
        return False

    if remote.get("source_system") == "zubite" and remote.get("source_lead_id"):
        local = await db.leads.find_one(
            {"id": remote["source_lead_id"], "assigned_clinic_id": clinic_id},
            {"_id": 0},
        )
        if local:
            await db.leads.update_one(
                {"id": local["id"]},
                {"$set": {"clear_advance_lead_id": remote_id,
                          "origin_system": local.get("origin_system") or "zubite"}},
            )
            from routers.consultations import _ensure_consultation_for_lead
            await _ensure_consultation_for_lead(local, clinic_id)
            return False

    local = await db.leads.find_one(
        {"clear_advance_lead_id": remote_id, "assigned_clinic_id": clinic_id},
        {"_id": 0},
    )
    created = False
    if not local:
        local_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"clear-advance:{remote_id}"))
        doc = _imported_lead_doc(remote, clinic_id, local_id)
        try:
            await db.leads.update_one({"id": local_id}, {"$setOnInsert": doc}, upsert=True)
        except Exception:
            # Another worker may have won the same deterministic upsert.
            pass
        local = await db.leads.find_one({"id": local_id}, {"_id": 0})
        if not local:
            return False
        created = True
    elif local.get("origin_system") == "clear_advance":
        refreshed = _imported_lead_doc(remote, clinic_id, local["id"])
        mutable_keys = {
            "name", "phone", "email", "consent", "consent_privacy",
            "consent_marketing", "clear_advance_status", "source", "answers",
            *{key for key in refreshed if key.startswith(("first_", "latest_"))},
        }
        await db.leads.update_one(
            {"id": local["id"], "assigned_clinic_id": clinic_id},
            {"$set": {key: refreshed.get(key) for key in mutable_keys}},
        )
        await db.consultation_requests.update_one(
            {"lead_id": local["id"], "assigned_clinic_id": clinic_id},
            {"$set": {
                "patient_name": refreshed.get("name") or "",
                "patient_phone": refreshed.get("phone") or "",
                "patient_email": refreshed.get("email"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        local = {**local, **{key: refreshed.get(key) for key in mutable_keys}}

    from routers.consultations import _ensure_consultation_for_lead
    await _ensure_consultation_for_lead(local, clinic_id)
    return created


async def import_pending_leads(db, limit: int = 100,
                               clinic_id: Optional[str] = None,
                               since: Optional[str] = None) -> int:
    """Pull new Clear Advance leads into each connected clinic workspace."""
    if not _base_url():
        return 0
    imported = 0
    integration_query: Dict[str, Any] = {
        "provider": "clear_advance", "connected_at": {"$exists": True},
    }
    if clinic_id:
        integration_query["clinic_id"] = clinic_id
    integrations = await db.clinic_integrations.find(
        integration_query,
        {"_id": 0, "clinic_id": 1, "api_key": 1, "connected_at": 1,
         "clear_advance_import_cursor": 1},
    ).to_list(None)
    for record in integrations:
        if imported >= limit:
            break
        clinic_id = record.get("clinic_id")
        key = _clear_advance_key(record, clinic_id or "")
        if not key or not clinic_id:
            continue
        page_cursor = None if since else record.get("clear_advance_import_cursor")
        scanned = 0
        while scanned < limit and imported < limit:
            params = {"limit": str(min(50, limit - scanned))}
            if page_cursor:
                params["cursor"] = str(page_cursor)
            elif since:
                params["since"] = since
            elif record.get("connected_at"):
                params["since"] = str(record["connected_at"])
            page = await _get("/api/v1/leads", key, params)
            if not page or not isinstance(page.get("leads"), list):
                await _record_clinic_sync_health(db, clinic_id, ok=False, kind="import")
                break
            rows = page["leads"]
            scanned += len(rows)
            for remote in rows:
                if isinstance(remote, dict) and await import_clear_advance_lead(db, remote, clinic_id):
                    imported += 1
            next_cursor = page.get("next_cursor")
            # Historical reconciliation has its own in-memory cursor and never
            # moves the automatic feed's durable cursor.
            if next_cursor and not since:
                await db.clinic_integrations.update_one(
                    {"clinic_id": clinic_id, "provider": "clear_advance"},
                    {"$set": {"clear_advance_import_cursor": next_cursor}},
                )
            await _record_clinic_sync_health(db, clinic_id, ok=True, kind="import")
            if not page.get("has_more") or not next_cursor or not rows:
                break
            page_cursor = next_cursor
    return imported
