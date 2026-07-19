"""Consultation Workflow Router (Feb 2026).

Implements the clinic-side consultation management MVP described in the spec:
- Clinic-isolated workflow on top of `consultation_requests` collection
- Internal Zubite calendar (`clinic_appointments`)
- Immutable event log (`consultation_events`)
- Auto-creation of ConsultationRequest when admin assigns a Lead to a clinic
- Admin endpoints for clinics CRUD + consultation request management

Lead workflow (existing) is preserved — this router adds a parallel
consultation workflow that is *linked back* to leads via `lead_id`.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from database import db
from aligner_brands import (
    normalize_aligner_brand_entries,
    public_aligner_brand_chips,
    AlignerBrandValidationError,
)
from schemas import (
    AdminUser,
    ClinicCreate, ClinicAdminUpdate,
    ConsultationRequestCreate, ConsultationAssignClinic, ConsultationAdminPatch,
    ConsultationActionRequest,
    ClinicAppointmentCreate, ClinicAppointmentPatch,
    CLINIC_STATUS_VALUES, SUBSCRIPTION_STATUS_VALUES,
    CONSULTATION_STATUS_VALUES, APPOINTMENT_STATUS_VALUES,
    APPOINTMENT_TYPE_VALUES, ACTION_TYPE_VALUES,
    PARTNER_TIER_VALUES, PROFILE_STATUS_VALUES,
)
from audit import audit_log, diff_fields
from auth import get_current_user, get_current_clinic, hash_password
from emails import _send_email  # internal helper; safe wrapper
from config import RESEND_API_KEY, SENDER_EMAIL, PRODUCTION_URL
from routers.public import _is_clinic_visible

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Helpers ──────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


def _public_clinic_dict(c: Dict[str, Any]) -> Dict[str, Any]:
    """Return a clinic doc without password_hash and without _id.

    Also surfaces the canonical normalized `treatments_supported` field
    (Feb 2026 cleanup batch). The legacy `treatments_offered` key is
    preserved on the returned doc for backwards-compatibility readers.
    """
    out = {k: v for k, v in c.items() if k not in ("_id", "password_hash")}
    # Canonical normalized treatment list, even when the stored doc only
    # has the legacy `treatments_offered` field. Idempotent: if the doc
    # already has `treatments_supported`, the helper just normalizes it.
    out["treatments_supported"] = _canonical_treatments_for_doc(out)
    # Aligner brand tags — admin sees the full structured list (incl.
    # verification_status). The PUBLIC projection uses
    # `public_aligner_brand_chips` instead and is applied in
    # `routers/public.py::_safe_clinic_payload`.
    if "aligner_brands_supported" not in out or out.get("aligner_brands_supported") is None:
        out["aligner_brands_supported"] = []
    return out


def _canonical_treatments_for_doc(clinic: Dict[str, Any]) -> List[str]:
    """Local mirror of `routers.public._normalize_clinic_treatments` to
    avoid a cross-router import. Same precedence: `treatments_supported`
    wins; falls back to `treatments_offered`. Lowercased, trimmed,
    deduped, stable-ordered."""
    raw = clinic.get("treatments_supported") or []
    if not (isinstance(raw, list) and any(isinstance(x, str) and x.strip() for x in raw)):
        raw = clinic.get("treatments_offered") or []
    seen: List[str] = []
    for t in raw if isinstance(raw, list) else []:
        if not isinstance(t, str):
            continue
        norm = t.strip().lower()
        if norm and norm not in seen:
            seen.append(norm)
    return seen


async def _log_event(
    request_id: str,
    event_type: str,
    *,
    clinic_id: Optional[str] = None,
    user_id: Optional[str] = None,
    previous_status: Optional[str] = None,
    new_status: Optional[str] = None,
    note: Optional[str] = None,
) -> None:
    doc = {
        "id": _new_id(),
        "consultation_request_id": request_id,
        "clinic_id": clinic_id,
        "user_id": user_id,
        "event_type": event_type,
        "previous_status": previous_status,
        "new_status": new_status,
        "note": note,
        "created_at": _now_iso(),
    }
    await db.consultation_events.insert_one(doc)


def _treatment_interest_from_lead(lead: Dict[str, Any]) -> str:
    """Best-effort mapping: lead.treatment_type → human-readable interest."""
    t = (lead.get("treatment_type") or "").lower()
    return t or "general"


async def _build_consultation_from_lead(lead: Dict[str, Any], clinic_id: str) -> Dict[str, Any]:
    """Construct a ConsultationRequest document from a Lead doc.
    Copies patient info + UTM/source attribution. Marks status as 'assigned'.
    """
    now = _now_iso()
    doc: Dict[str, Any] = {
        "id": _new_id(),
        "patient_name": lead.get("name") or "",
        "patient_phone": lead.get("phone") or "",
        "patient_email": lead.get("email"),
        "patient_city": lead.get("city_slug") or lead.get("city"),
        "preferred_contact_time": None,
        "treatment_interest": _treatment_interest_from_lead(lead),
        "urgency": (lead.get("answers") or {}).get("urgency"),
        "readiness": (lead.get("answers") or {}).get("readiness")
                     or lead.get("band"),
        "quiz_result_id": (lead.get("answers") or {}).get("session_id"),
        "lead_id": lead.get("id"),
        "source": lead.get("source"),
        "utm_source": lead.get("utm_source") or lead.get("first_utm_source"),
        "utm_campaign": lead.get("utm_campaign") or lead.get("first_utm_campaign"),
        "utm_adset": lead.get("utm_adset") or lead.get("first_utm_adset"),
        "utm_ad": lead.get("utm_ad") or lead.get("first_utm_ad"),
        "assigned_clinic_id": clinic_id,
        "status": "assigned",
        "assigned_at": now,
        "clinic_viewed_at": None,
        "first_action_at": None,
        "call_attempted_at": None,
        "patient_contacted_at": None,
        "appointment_booked_at": None,
        "attended_at": None,
        "no_show_at": None,
        "cancelled_at": None,
        "notes": None,
        "created_at": now,
        "updated_at": now,
    }
    return doc


async def _ensure_consultation_for_lead(lead: Dict[str, Any], clinic_id: str) -> Dict[str, Any]:
    """Idempotent: return existing consultation_request linked to this lead/clinic
    or create one. Used by both the explicit assign endpoint and the lazy
    backfill path on /clinic/consultation-requests."""
    existing = await db.consultation_requests.find_one(
        {"lead_id": lead["id"], "assigned_clinic_id": clinic_id},
        {"_id": 0},
    )
    if existing:
        return existing
    doc = await _build_consultation_from_lead(lead, clinic_id)
    await db.consultation_requests.insert_one({**doc})
    await _log_event(
        doc["id"],
        "assigned_to_clinic",
        clinic_id=clinic_id,
        new_status="assigned",
        note="auto-created from lead assignment",
    )
    return doc


async def _send_clinic_assignment_email(clinic: Dict[str, Any], req: Dict[str, Any]) -> None:
    if not RESEND_API_KEY or not clinic.get("notification_email") and not clinic.get("email"):
        logger.info("Skipping clinic assignment email — no RESEND_API_KEY or email")
        return
    to_email = clinic.get("notification_email") or clinic.get("email")
    if not to_email:
        return
    base_url = PRODUCTION_URL or "https://zubite.bg"
    detail_url = f"{base_url}/clinic/dashboard/requests/{req['id']}"
    subject = "Нова заявка за консултация — Zubite.bg"
    html = f"""
    <p>Здравейте,</p>
    <p>Получихте нова заявка за консултация в платформата Zubite.bg.</p>
    <ul>
      <li><strong>Пациент:</strong> {req.get('patient_name') or '—'}</li>
      <li><strong>Лечение:</strong> {req.get('treatment_interest') or '—'}</li>
      <li><strong>Град:</strong> {req.get('patient_city') or '—'}</li>
    </ul>
    <p><a href="{detail_url}">Отвори заявката в клиничното табло</a></p>
    <p>—<br/>Zubite.bg</p>
    """
    try:
        await _send_email(to_email, subject, html, sender=SENDER_EMAIL)
    except Exception as exc:
        # MVP: never block on email failure
        logger.warning(f"Clinic assignment email failed: {exc}")


# ─── Admin: Clinic Management ─────────────────────────────

@router.get("/admin/clinics")
async def admin_list_clinics(
    archived: Optional[str] = None,
    user: AdminUser = Depends(get_current_user),
):
    """List partner clinics for the admin dashboard.

    `archived` query values:
      • `false` / omitted → only NON-archived clinics (default)
      • `true`            → only archived clinics
      • `all`             → both
    """
    archived_norm = (archived or "").strip().lower()
    query: Dict[str, Any] = {}
    if archived_norm == "true":
        query["archived"] = True
    elif archived_norm == "all":
        pass  # no filter — include both
    else:
        # default: hide archived
        query["archived"] = {"$ne": True}

    clinics = await db.clinics.find(query, {"_id": 0, "password_hash": 0}).to_list(500)
    # Bulk-load add-on counts so we don't N+1 the listing.
    ids = [c.get("id") for c in clinics if c.get("id")]
    addon_counts: Dict[str, int] = {}
    if ids:
        pipeline = [
            {"$match": {"clinic_id": {"$in": ids}, "status": {"$in": ["active", "delivered"]}}},
            {"$group": {"_id": "$clinic_id", "n": {"$sum": 1}}},
        ]
        async for row in db.clinic_addons.aggregate(pipeline):
            addon_counts[row["_id"]] = row["n"]

    from entitlements import (
        resolve_base_package, resolve_founding_status, public_partner_label,
        compute_entitlements,
    )

    # Augment with simple counts for the listing table
    for c in clinics:
        cid = c.get("id")
        c["assigned_requests_count"] = await db.consultation_requests.count_documents(
            {"assigned_clinic_id": cid}
        )
        c["booked_count"] = await db.consultation_requests.count_documents(
            {"assigned_clinic_id": cid, "status": "booked"}
        )
        # Surface canonical normalized treatments (Feb 2026 cleanup).
        c["treatments_supported"] = _canonical_treatments_for_doc(c)
        # Ensure `archived` flag is always present (default False) so the
        # admin UI can render badges without branching on `undefined`.
        c["archived"] = bool(c.get("archived"))
        # Pricing revamp — expose derived summary for the admin table.
        c["base_package"] = resolve_base_package(c)
        c["founding_status"] = resolve_founding_status(c)
        c["public_partner_label"] = public_partner_label(c)
        # Ensure `legacy_tier` is always present (null when the clinic
        # was never migrated) so FE type-guards don't need branching.
        c["legacy_tier"] = c.get("legacy_tier") or None
        c["addons_active_count"] = addon_counts.get(cid, 0)
        # Lightweight entitlements summary (only the flags the list
        # table renders — full map available on the detail endpoint).
        ents = compute_entitlements(c, addons=[])
        c["patient_journey_eligible"] = bool(ents.get("patient_journey_eligibility"))
        c["partner_access"] = bool(ents.get("partner_access"))
    return {"clinics": clinics}


@router.post("/admin/clinics/{clinic_id}/archive")
async def admin_archive_clinic(
    clinic_id: str,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    """Soft-delete: hide clinic from ALL public surfaces (listings,
    matching, direct profile URL → 404) without destroying data. The
    clinic remains fully editable in the admin dashboard under the
    Archived tab and can be un-archived at any time."""
    if not isinstance(clinic_id, str) or not clinic_id.strip():
        raise HTTPException(status_code=400, detail="Invalid clinic_id")
    before = await db.clinics.find_one({"id": clinic_id}, {"_id": 0, "password_hash": 0})
    if not before:
        raise HTTPException(status_code=404, detail="Clinic not found")
    if before.get("archived") is True:
        return {"ok": True, "already_archived": True}
    now = _now_iso()
    await db.clinics.update_one(
        {"id": clinic_id},
        {"$set": {"archived": True, "archived_at": now, "updated_at": now}},
    )
    await audit_log(
        "clinic.archived",
        actor=user, actor_type="admin",
        target_type="clinic", target_id=clinic_id,
        target_summary=before.get("clinic_name"),
        metadata={"archived_at": now},
        severity="warning", request=request,
    )
    return {"ok": True, "archived": True, "archived_at": now}


@router.post("/admin/clinics/{clinic_id}/unarchive")
async def admin_unarchive_clinic(
    clinic_id: str,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    """Restore an archived clinic. All public surfaces immediately
    honour its previous `clinic_status` / `is_active` state."""
    if not isinstance(clinic_id, str) or not clinic_id.strip():
        raise HTTPException(status_code=400, detail="Invalid clinic_id")
    before = await db.clinics.find_one({"id": clinic_id}, {"_id": 0, "password_hash": 0})
    if not before:
        raise HTTPException(status_code=404, detail="Clinic not found")
    if not before.get("archived"):
        return {"ok": True, "already_active": True}
    now = _now_iso()
    await db.clinics.update_one(
        {"id": clinic_id},
        {"$set": {"archived": False, "unarchived_at": now, "updated_at": now}},
    )
    await audit_log(
        "clinic.unarchived",
        actor=user, actor_type="admin",
        target_type="clinic", target_id=clinic_id,
        target_summary=before.get("clinic_name"),
        metadata={"unarchived_at": now},
        severity="info", request=request,
    )
    return {"ok": True, "archived": False, "unarchived_at": now}


@router.post("/admin/clinics")
async def admin_create_clinic(
    data: ClinicCreate,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    if data.clinic_status not in CLINIC_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid clinic_status")
    if data.subscription_status not in SUBSCRIPTION_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid subscription_status")
    email = data.email.strip().lower()
    existing = await db.clinics.find_one({"email": email}, {"_id": 0, "id": 1})
    if existing:
        raise HTTPException(status_code=400, detail="Clinic with this email already exists")

    # ── Treatment fields cleanup (Feb 2026) ────────────────────────────
    # Canonical = `treatments_supported`. Accept either field on input
    # (frontend may send the legacy `treatments_offered` while migrating);
    # always write canonical, plus a temporary mirror to `treatments_offered`
    # so any older read paths still see the value.
    canonical_treatments = _canonical_treatments_for_doc({
        "treatments_supported": getattr(data, "treatments_supported", None),
        "treatments_offered": data.treatments_offered,
    })

    # ── Aligner brand tags (Feb 2026) ──────────────────────────
    try:
        normalized_brands = normalize_aligner_brand_entries(
            getattr(data, "aligner_brands_supported", None)
        )
    except AlignerBrandValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Auto-generate temporary password (admin can reset later via existing endpoint)
    import secrets as _secrets
    temp_password = _secrets.token_urlsafe(12)
    now = _now_iso()
    # Public listing (`/clinics`) expects a canonical `name` + `city_slug`
    # + `is_active` triple. Legacy admin docs only had `clinic_name` +
    # free-text `city`, which excluded them from the public list. Mirror
    # both fields on insert so new clinics surface immediately.
    from routers.public_clinics import resolve_city_slug
    city_slug = resolve_city_slug({"city": data.city})
    doc = {
        "id": _new_id(),
        "clinic_name": data.clinic_name,
        "name": data.clinic_name,
        "city": data.city,
        "city_slug": city_slug,
        "is_active": True,
        "email": email,
        "phone": data.phone,
        "address": data.address,
        "website": data.website,
        "contact_person": data.contact_person,
        # Canonical going forward.
        "treatments_supported": canonical_treatments,
        # Legacy mirror — temporary backwards-compat bridge.
        "treatments_offered": canonical_treatments,
        "aligner_brands_supported": normalized_brands,
        "clinic_status": data.clinic_status,
        "subscription_status": data.subscription_status,
        "monthly_plan": data.monthly_plan,
        "notification_email": data.notification_email or email,
        "status": "active",  # legacy flag for clinic_login compatibility
        "password_hash": hash_password(temp_password),
        "created_at": now,
        "updated_at": now,
    }
    await db.clinics.insert_one({**doc})
    # Audit: after_state via clinic allow-list (clinic_name, city, status, etc.) —
    # password_hash & temporary_password are NEVER stored (sanitiser drops them).
    await audit_log(
        "clinic.created",
        actor=user, actor_type="admin",
        target_type="clinic", target_id=doc["id"],
        target_summary=data.clinic_name,
        after_state=doc,
        severity="info", request=request,
    )
    return {
        "clinic": _public_clinic_dict(doc),
        "temporary_password": temp_password,
    }


@router.get("/admin/clinics/{clinic_id}")
async def admin_get_clinic(
    clinic_id: str,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(clinic_id, str):
        raise HTTPException(status_code=400, detail="Invalid clinic_id")
    clinic = await db.clinics.find_one({"id": clinic_id}, {"_id": 0, "password_hash": 0})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    # Performance metrics
    cid = clinic_id
    assigned = await db.consultation_requests.count_documents({"assigned_clinic_id": cid})
    booked = await db.consultation_requests.count_documents({"assigned_clinic_id": cid, "status": "booked"})
    attended = await db.consultation_requests.count_documents({"assigned_clinic_id": cid, "status": "attended"})
    no_show = await db.consultation_requests.count_documents({"assigned_clinic_id": cid, "status": "no_show"})
    # Pricing revamp — attach derived entitlements + add-ons.
    from entitlements import (
        resolve_base_package, resolve_founding_status, public_partner_label,
        compute_entitlements, package_default_pricing,
    )
    addons = await db.clinic_addons.find({"clinic_id": cid}, {"_id": 0}).to_list(200)
    clinic_out = _public_clinic_dict(clinic)
    clinic_out["base_package"] = resolve_base_package(clinic)
    clinic_out["founding_status"] = resolve_founding_status(clinic)
    clinic_out["public_partner_label"] = public_partner_label(clinic)
    entitlements = compute_entitlements(clinic, addons=addons)
    return {
        "clinic": clinic_out,
        "metrics": {
            "assigned": assigned, "booked": booked,
            "attended": attended, "no_show": no_show,
        },
        "addons": addons,
        "entitlements": entitlements,
        "package_defaults": package_default_pricing(clinic_out["base_package"]),
    }


@router.patch("/admin/clinics/{clinic_id}")
async def admin_update_clinic(
    clinic_id: str,
    data: ClinicAdminUpdate,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(clinic_id, str):
        raise HTTPException(status_code=400, detail="Invalid clinic_id")
    # `model_dump()` serializes nested Pydantic models (ClinicProfile,
    # ClinicProfileCase) into plain dicts so they store as nested
    # documents in Mongo. We keep `None` filtering AFTER profile-level
    # checks so callers can intentionally clear a top-level field by
    # sending `null` is NOT supported (consistent with existing behaviour).
    raw = data.model_dump()
    update = {k: v for k, v in raw.items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    # Keep the canonical public-listing fields in sync when admin edits
    # `clinic_name` or `city`. Public `/clinics` filters on `name` +
    # `city_slug` — legacy edits that only touched `clinic_name`/`city`
    # would otherwise leave stale values behind.
    if "clinic_name" in update:
        update["name"] = update["clinic_name"]
    if "city" in update:
        from routers.public_clinics import resolve_city_slug
        derived_slug = resolve_city_slug({"city": update["city"]})
        if derived_slug:
            update["city_slug"] = derived_slug
    if "clinic_status" in update and update["clinic_status"] not in CLINIC_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid clinic_status")
    if "subscription_status" in update and update["subscription_status"] not in SUBSCRIPTION_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid subscription_status")

    # ── Rich Profile Editor R1 validation ────────────────────────────
    if "partner_tier" in update:
        tier = (update["partner_tier"] or "").strip().lower()
        if tier not in PARTNER_TIER_VALUES:
            raise HTTPException(status_code=400, detail="Invalid partner_tier")
        update["partner_tier"] = tier

    # ── Feb 2026 pricing revamp validation ──────────────────────
    from entitlements import (
        BASE_PACKAGES, FOUNDING_STATUS_VALUES,
        BILLING_STATUS_VALUES, BILLING_CADENCE_VALUES,
        package_default_pricing,
    )
    # Snapshot of keys explicitly supplied by the caller — used so
    # every "only-if-not-user-supplied" auto-fill below is order-
    # independent (previously the base_package block auto-filled
    # monthly_price_eur which then masked the founding_growth 149
    # override, causing a subtle default-collision bug).
    user_provided = set(update.keys())
    if "base_package" in update:
        bp = (update["base_package"] or "").strip().lower()
        if bp not in BASE_PACKAGES:
            raise HTTPException(status_code=400, detail="Invalid base_package")
        update["base_package"] = bp
        # Auto-fill locked pricing defaults when the admin switches
        # packages and hasn't manually overridden pricing in the same
        # request. Founding Growth intro pricing is applied only when
        # `founding_status=founding_growth` is also set (handled below).
        defaults = package_default_pricing(bp)
        for k, v in defaults.items():
            if k not in user_provided:
                update[k] = v
    if "founding_status" in update:
        fs = (update["founding_status"] or "").strip().lower()
        if fs not in FOUNDING_STATUS_VALUES:
            raise HTTPException(status_code=400, detail="Invalid founding_status")
        update["founding_status"] = fs
        if fs == "founding_growth" and "monthly_price_eur" not in user_provided:
            # Only auto-apply the founding intro monthly if the admin
            # didn't override in this request. Overrides an earlier
            # base_package default-fill because founding is the more
            # specific configuration.
            from entitlements import FOUNDING_GROWTH_INTRO_MONTHLY_EUR
            update["monthly_price_eur"] = FOUNDING_GROWTH_INTRO_MONTHLY_EUR
    if "billing_status" in update:
        bs = (update["billing_status"] or "").strip().lower()
        if bs not in BILLING_STATUS_VALUES:
            raise HTTPException(status_code=400, detail="Invalid billing_status")
        update["billing_status"] = bs
    if "billing_cadence" in update:
        bc = (update["billing_cadence"] or "").strip().lower()
        if bc not in BILLING_CADENCE_VALUES:
            raise HTTPException(status_code=400, detail="Invalid billing_cadence")
        update["billing_cadence"] = bc
    for money_field in ("monthly_price_eur", "annual_price_eur", "onboarding_fee_eur"):
        if money_field in update and update[money_field] is not None:
            try:
                update[money_field] = float(update[money_field])
            except (TypeError, ValueError):
                raise HTTPException(status_code=400, detail=f"Invalid {money_field}")
            if update[money_field] < 0 or update[money_field] > 100000:
                raise HTTPException(status_code=400, detail=f"{money_field} out of range")
    for date_field in ("founding_start_date", "founding_end_date"):
        if date_field in update and update[date_field]:
            v = str(update[date_field]).strip()
            # Loose ISO date validation — YYYY-MM-DD (10 chars) or empty.
            if len(v) not in (0, 10) or (len(v) == 10 and not (v[4] == "-" and v[7] == "-")):
                raise HTTPException(status_code=400, detail=f"Invalid {date_field}")
            update[date_field] = v
    if "entitlement_overrides" in update:
        overrides = update["entitlement_overrides"] or []
        if not isinstance(overrides, list):
            raise HTTPException(status_code=400, detail="entitlement_overrides must be a list")
        cleaned = []
        now_iso = _now_iso()
        for row in overrides:
            if not isinstance(row, dict):
                continue
            key = str(row.get("key") or "").strip()
            if not key:
                continue
            cleaned.append({
                "key": key,
                "value": row.get("value"),
                "note": (row.get("note") or "").strip()[:500],
                "at": row.get("at") or now_iso,
                "by": row.get("by") or (user.username if user else "admin"),
            })
        update["entitlement_overrides"] = cleaned

    if "clinic_profile" in update:
        profile = update["clinic_profile"]
        status_value = (profile.get("profile_status") or "draft").lower()
        if status_value not in PROFILE_STATUS_VALUES:
            raise HTTPException(status_code=400, detail="Invalid profile_status")
        profile["profile_status"] = status_value

        focus = profile.get("treatment_focus") or []
        if isinstance(focus, list):
            if len(focus) > 12:
                raise HTTPException(status_code=400, detail="treatment_focus exceeds 12 items")
            for item in focus:
                if not isinstance(item, str) or len(item) > 80:
                    raise HTTPException(status_code=400, detail="Invalid treatment_focus item")

        doctor_specialties = profile.get("doctor_spotlight_specialties") or []
        if isinstance(doctor_specialties, list):
            if len(doctor_specialties) > 8:
                raise HTTPException(
                    status_code=400,
                    detail="doctor_spotlight_specialties exceeds 8 items",
                )
            seen_specialties: set[str] = set()
            for item in doctor_specialties:
                if not isinstance(item, str) or not item.strip() or len(item) > 80:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid doctor_spotlight_specialties item",
                    )
                specialty_key = item.strip().casefold()
                if specialty_key in seen_specialties:
                    raise HTTPException(
                        status_code=400,
                        detail="doctor_spotlight_specialties contains duplicates",
                    )
                seen_specialties.add(specialty_key)

        treatment_case_counts = profile.get("treatment_case_counts") or []
        if isinstance(treatment_case_counts, list):
            if len(treatment_case_counts) > 12:
                raise HTTPException(
                    status_code=400,
                    detail="treatment_case_counts exceeds 12 items",
                )
            seen_treatments: set[str] = set()
            for row in treatment_case_counts:
                treatment_key = (row.get("treatment") or "").strip().casefold()
                if treatment_key in seen_treatments:
                    raise HTTPException(
                        status_code=400,
                        detail="treatment_case_counts contains duplicate treatments",
                    )
                seen_treatments.add(treatment_key)

        cases = profile.get("case_library") or []
        if isinstance(cases, list):
            if len(cases) > 12:
                raise HTTPException(status_code=400, detail="case_library exceeds 12 items")
            for case in cases:
                case_status = (case.get("status") or "draft").lower()
                if case_status not in PROFILE_STATUS_VALUES:
                    raise HTTPException(status_code=400, detail="Invalid case status")
                case["status"] = case_status
                if case_status == "published" and not case.get("consent_confirmed"):
                    raise HTTPException(
                        status_code=400,
                        detail="Published case requires consent_confirmed=true",
                    )
                if not case.get("id"):
                    case["id"] = str(uuid.uuid4())
                # Feb 2026 revamp — before/after images (up to 3 each).
                for _img_field in ("before_images", "after_images"):
                    imgs = case.get(_img_field)
                    if imgs is None:
                        continue
                    if not isinstance(imgs, list):
                        raise HTTPException(
                            status_code=400,
                            detail=f"{_img_field} must be a list",
                        )
                    if len(imgs) > 3:
                        raise HTTPException(
                            status_code=400,
                            detail=f"{_img_field} exceeds 3 items",
                        )
                    for u in imgs:
                        if not isinstance(u, str) or not u.strip() or len(u) > 500:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Invalid {_img_field} entry",
                            )
                    # Persist trimmed list (drop any accidental blanks).
                    case[_img_field] = [u.strip() for u in imgs if u.strip()]

        # Stamp updated_at on every write; stamp published_at on transition
        # to published (or keep previous if already published).
        existing = await db.clinics.find_one(
            {"id": clinic_id}, {"_id": 0, "clinic_profile": 1}
        )
        prev_profile = (existing or {}).get("clinic_profile") or {}
        now_iso = _now_iso()
        profile["updated_at"] = now_iso
        if status_value == "published":
            profile["published_at"] = prev_profile.get("published_at") or now_iso
        else:
            # Preserve a prior published_at on downgrade; useful for audit/history.
            if prev_profile.get("published_at"):
                profile["published_at"] = prev_profile["published_at"]

    # ── Treatment fields cleanup (Feb 2026) ────────────────────────────
    # Whenever the admin patches either treatment field, normalize and
    # write to BOTH so the canonical (`treatments_supported`) and the
    # legacy mirror (`treatments_offered`) stay in sync.
    if "treatments_supported" in update or "treatments_offered" in update:
        merged = {
            "treatments_supported": update.get("treatments_supported"),
            "treatments_offered": update.get("treatments_offered"),
        }
        canonical = _canonical_treatments_for_doc(merged)
        update["treatments_supported"] = canonical
        update["treatments_offered"] = canonical

    # ── Aligner brand tags (Feb 2026) ──────────────────────────
    if "aligner_brands_supported" in update:
        try:
            update["aligner_brands_supported"] = normalize_aligner_brand_entries(
                update["aligner_brands_supported"]
            )
        except AlignerBrandValidationError as e:
            raise HTTPException(status_code=400, detail=str(e))

    update["updated_at"] = _now_iso()
    before = await db.clinics.find_one({"id": clinic_id}, {"_id": 0, "password_hash": 0})
    result = await db.clinics.update_one({"id": clinic_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Clinic not found")
    clinic = await db.clinics.find_one({"id": clinic_id}, {"_id": 0, "password_hash": 0})

    # Audit clinic.updated with changed_fields (keys only, never values).
    if before is not None:
        changed = sorted(k for k in update.keys() if k != "updated_at")
        # Snapshot tier + profile_status transitions for the audit trail
        # (key-level only — never the body of the profile).
        tier_metadata = {}
        if "partner_tier" in update:
            tier_metadata["partner_tier_before"] = before.get("partner_tier")
            tier_metadata["partner_tier_after"] = update["partner_tier"]
        if "clinic_profile" in update:
            tier_metadata["profile_status_before"] = (
                (before.get("clinic_profile") or {}).get("profile_status")
            )
            tier_metadata["profile_status_after"] = update["clinic_profile"].get("profile_status")
        await audit_log(
            "clinic.updated",
            actor=user, actor_type="admin",
            target_type="clinic", target_id=clinic_id,
            target_summary=before.get("clinic_name"),
            metadata={"changed_fields": changed, **tier_metadata},
            severity="info", request=request,
        )
        # If clinic_status or status changed, emit status_changed too.
        status_change_keys = [k for k in ("clinic_status", "status") if k in update]
        if status_change_keys:
            b, a = diff_fields(before, clinic, status_change_keys)
            if b or a:
                # severity warning when transitioning to a pause/disable state.
                new_status = update.get("clinic_status") or update.get("status")
                paused = isinstance(new_status, str) and new_status.lower() in (
                    "paused", "inactive", "disabled", "suspended",
                    "waiting_list", "probation",
                )
                await audit_log(
                    "clinic.status_changed",
                    actor=user, actor_type="admin",
                    target_type="clinic", target_id=clinic_id,
                    target_summary=before.get("clinic_name"),
                    before_state=b, after_state=a,
                    severity="warning" if paused else "info",
                    request=request,
                )
    return {"clinic": _public_clinic_dict(clinic) if clinic else clinic}


# ─── Admin: Consultation Requests ─────────────────────────

# Allowed values for the admin list filter on `created_from`. Patient layer
# P4/P5 produce these two values; admin-created/legacy rows may have other
# values, so we whitelist only the patient-flow ones to keep the API contract
# tight.
_ADMIN_CREATED_FROM_VALUES = (
    "recommended_clinics_flow",   # P4 — patient picked a specific clinic
    "assisted_choice_flow",       # P5 — patient asked Zubite for help
)


@router.get("/admin/consultation-requests")
async def admin_list_consultation_requests(
    status: Optional[str] = None,
    clinic_id: Optional[str] = None,
    created_from: Optional[str] = None,
    user: AdminUser = Depends(get_current_user),
):
    q: Dict[str, Any] = {}
    if isinstance(status, str) and status:
        q["status"] = status
    if isinstance(clinic_id, str) and clinic_id:
        q["assigned_clinic_id"] = clinic_id
    if isinstance(created_from, str) and created_from in _ADMIN_CREATED_FROM_VALUES:
        q["created_from"] = created_from
    requests = await db.consultation_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    # attach clinic name for the listing table
    clinic_ids = list({r.get("assigned_clinic_id") for r in requests if r.get("assigned_clinic_id")})
    name_map: Dict[str, str] = {}
    city_map: Dict[str, str] = {}
    if clinic_ids:
        clinics = await db.clinics.find(
            {"id": {"$in": clinic_ids}},
            {"_id": 0, "id": 1, "clinic_name": 1, "name": 1, "city": 1, "city_name": 1},
        ).to_list(500)
        for c in clinics:
            cid = c.get("id")
            if not cid:
                continue
            name_map[cid] = c.get("clinic_name") or c.get("name") or ""
            city_map[cid] = c.get("city_name") or c.get("city") or ""
    for r in requests:
        cid = r.get("assigned_clinic_id") or ""
        r["assigned_clinic_name"] = name_map.get(cid)
        r["assigned_clinic_city"] = city_map.get(cid)
    return {"requests": requests}


@router.get("/admin/consultation-requests/{req_id}")
async def admin_get_consultation_request(
    req_id: str,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(req_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    req = await db.consultation_requests.find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    clinic_name = None
    clinic_city = None
    if req.get("assigned_clinic_id"):
        c = await db.clinics.find_one(
            {"id": req["assigned_clinic_id"]},
            {"_id": 0, "clinic_name": 1, "name": 1, "city": 1, "city_name": 1},
        )
        if c:
            clinic_name = c.get("clinic_name") or c.get("name")
            clinic_city = c.get("city_name") or c.get("city")
    appointment = await db.clinic_appointments.find_one(
        {"consultation_request_id": req_id}, {"_id": 0}
    )

    # Attached lead snapshot (for admin view of quiz answers, attribution)
    lead = None
    if req.get("lead_id"):
        lead = await db.leads.find_one(
            {"id": req["lead_id"]},
            {"_id": 0, "answers": 1, "first_utm_source": 1, "first_utm_campaign": 1,
             "latest_utm_source": 1, "latest_utm_campaign": 1, "band": 1, "score_total": 1,
             "first_landing_page": 1, "first_referrer": 1},
        )
    return {
        "request": req,
        "clinic_name": clinic_name,
        "clinic_city": clinic_city,
        "appointment": appointment,
        "lead": lead,
        "patient_context": await _build_patient_context(req),
    }


@router.patch("/admin/consultation-requests/{req_id}")
async def admin_patch_consultation_request(
    req_id: str,
    data: ConsultationAdminPatch,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(req_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "status" in update and update["status"] not in CONSULTATION_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid status")
    update["updated_at"] = _now_iso()
    existing = await db.consultation_requests.find_one({"id": req_id}, {"_id": 0, "status": 1, "assigned_clinic_id": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Request not found")
    await db.consultation_requests.update_one({"id": req_id}, {"$set": update})
    if "status" in update and update["status"] != existing.get("status"):
        await _log_event(
            req_id, "admin_status_change",
            clinic_id=existing.get("assigned_clinic_id"),
            user_id=user.id,
            previous_status=existing.get("status"),
            new_status=update["status"],
            note=update.get("notes"),
        )
        # Audit: before/after status only.
        await audit_log(
            "consultation_request.admin_status_changed",
            actor=user, actor_type="admin",
            target_type="consultation_request", target_id=req_id,
            before_state={"status": existing.get("status")},
            after_state={"status": update["status"]},
            severity="info", request=request,
        )
    elif "notes" in update:
        await _log_event(
            req_id, "admin_note_added",
            clinic_id=existing.get("assigned_clinic_id"),
            user_id=user.id, note=update["notes"],
        )
        new_notes = update.get("notes") or ""
        await audit_log(
            "consultation_request.admin_note_added",
            actor=user, actor_type="admin",
            target_type="consultation_request", target_id=req_id,
            metadata={
                "notes_changed": True,
                "notes_length_before": 0,  # admin patch overwrites without reading old
                "notes_length_after": len(new_notes) if isinstance(new_notes, str) else 0,
            },
            severity="info", request=request,
        )
    return {"status": "ok"}


@router.post("/admin/consultation-requests/{req_id}/assign-clinic")
async def admin_assign_consultation_to_clinic(
    req_id: str,
    body: ConsultationAssignClinic,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(req_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    clinic = await db.clinics.find_one(
        {"id": body.clinic_id},
        {"_id": 0, "id": 1, "clinic_name": 1, "email": 1, "notification_email": 1,
         "clinic_status": 1, "status": 1, "is_active": 1, "archived": 1, "is_demo": 1},
    )
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    if not _is_clinic_visible(clinic):
        raise HTTPException(
            status_code=409,
            detail=(
                "Clinic is not currently eligible for new lead assignment "
                f"(clinic_status={clinic.get('clinic_status')!r}, status={clinic.get('status')!r}). "
                "Reactivate the clinic before assigning."
            ),
        )
    req = await db.consultation_requests.find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    prev_status = req.get("status")
    prev_clinic = req.get("assigned_clinic_id")
    now = _now_iso()
    await db.consultation_requests.update_one(
        {"id": req_id},
        {"$set": {
            "assigned_clinic_id": body.clinic_id,
            "status": "assigned",
            "assigned_at": now if not req.get("assigned_at") else req["assigned_at"],
            "updated_at": now,
        }},
    )
    await _log_event(
        req_id,
        "reassigned_to_clinic" if prev_clinic and prev_clinic != body.clinic_id else "assigned_to_clinic",
        clinic_id=body.clinic_id, user_id=user.id,
        previous_status=prev_status, new_status="assigned",
    )
    # Best-effort email: only notify when the assignment is actually new or
    # different. Re-saving to the SAME clinic must NOT trigger a duplicate.
    is_new_assignment = prev_clinic != body.clinic_id
    notification_attempted = False
    notification_success: bool | None = None
    if is_new_assignment:
        refreshed = await db.consultation_requests.find_one({"id": req_id}, {"_id": 0})
        notification_attempted = True
        try:
            await _send_clinic_assignment_email(clinic, refreshed or req)
            notification_success = True
        except Exception as email_exc:
            notification_success = False
            logger.warning(
                f"Consultation reassignment email failed for req {req_id}: {email_exc}"
            )
    # Audit AFTER the update.
    if is_new_assignment:
        action = "consultation_request.reassigned" if prev_clinic else "consultation_request.assigned"
        severity = "warning" if prev_clinic else "info"
        await audit_log(
            action,
            actor=user, actor_type="admin",
            target_type="consultation_request", target_id=req_id,
            before_state={"assigned_clinic_id": prev_clinic},
            after_state={"assigned_clinic_id": body.clinic_id},
            metadata={
                "previous_clinic_id": prev_clinic,
                "new_clinic_id": body.clinic_id,
                "notification_attempted": notification_attempted,
                "notification_success": notification_success,
            },
            severity=severity, request=request,
        )
    return {"status": "ok", "assigned_to": clinic.get("clinic_name")}


@router.get("/admin/consultation-requests/{req_id}/events")
async def admin_consultation_events(
    req_id: str,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(req_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    events = await db.consultation_events.find(
        {"consultation_request_id": req_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"events": events}


@router.post("/admin/consultation-requests")
async def admin_create_consultation_request(
    data: ConsultationRequestCreate,
    user: AdminUser = Depends(get_current_user),
):
    """Manual creation — rare. Auto-creation happens via lead assign flow."""
    now = _now_iso()
    if data.assigned_clinic_id:
        clinic = await db.clinics.find_one(
            {"id": data.assigned_clinic_id},
            {"_id": 0, "id": 1, "clinic_status": 1, "status": 1, "is_active": 1,
             "archived": 1, "is_demo": 1},
        )
        if not clinic:
            raise HTTPException(status_code=404, detail="Clinic not found")
        if not _is_clinic_visible(clinic):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Clinic is not currently eligible for new lead assignment "
                    f"(clinic_status={clinic.get('clinic_status')!r}, status={clinic.get('status')!r}). "
                    "Reactivate the clinic before assigning."
                ),
            )
    doc = {
        "id": _new_id(),
        **data.model_dump(),
        "status": "assigned" if data.assigned_clinic_id else "new",
        "assigned_at": now if data.assigned_clinic_id else None,
        "clinic_viewed_at": None,
        "first_action_at": None,
        "call_attempted_at": None,
        "patient_contacted_at": None,
        "appointment_booked_at": None,
        "attended_at": None,
        "no_show_at": None,
        "cancelled_at": None,
        "notes": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.consultation_requests.insert_one({**doc})
    if data.assigned_clinic_id:
        await _log_event(
            doc["id"], "assigned_to_clinic",
            clinic_id=data.assigned_clinic_id, user_id=user.id,
            new_status="assigned", note="manual admin creation",
        )
    return {"request": doc}


# ─── Admin: Appointments ──────────────────────────────────

@router.get("/admin/appointments")
async def admin_list_appointments(
    user: AdminUser = Depends(get_current_user),
    clinic_id: Optional[str] = None,
):
    q: Dict[str, Any] = {}
    if isinstance(clinic_id, str) and clinic_id:
        q["clinic_id"] = clinic_id
    appts = await db.clinic_appointments.find(q, {"_id": 0}).sort("start_time", 1).to_list(2000)
    return {"appointments": appts}


@router.get("/admin/clinics/{clinic_id}/appointments")
async def admin_clinic_appointments(
    clinic_id: str,
    user: AdminUser = Depends(get_current_user),
):
    if not isinstance(clinic_id, str):
        raise HTTPException(status_code=400, detail="Invalid clinic_id")
    appts = await db.clinic_appointments.find(
        {"clinic_id": clinic_id}, {"_id": 0}
    ).sort("start_time", 1).to_list(2000)
    return {"appointments": appts}


# ─── Clinic: Consultation Requests ────────────────────────

async def _backfill_legacy_assigned_leads(clinic_id: str) -> None:
    """Idempotently create consultation_requests for any leads that are
    `assigned_clinic_id == clinic_id` but have no consultation_request yet.
    Runs on every list call — cheap because the existing-doc check is
    indexed by (lead_id, assigned_clinic_id)."""
    legacy_leads = await db.leads.find(
        {"assigned_clinic_id": clinic_id},
        {"_id": 0},
    ).to_list(1000)
    if not legacy_leads:
        return
    existing_lead_ids = set()
    cursor = db.consultation_requests.find(
        {"assigned_clinic_id": clinic_id, "lead_id": {"$in": [ld["id"] for ld in legacy_leads]}},
        {"_id": 0, "lead_id": 1},
    )
    async for r in cursor:
        if r.get("lead_id"):
            existing_lead_ids.add(r["lead_id"])
    for lead in legacy_leads:
        if lead["id"] in existing_lead_ids:
            continue
        if not lead.get("name") and not lead.get("phone"):
            continue  # skip incomplete leads
        await _ensure_consultation_for_lead(lead, clinic_id)


@router.get("/clinic/consultation-requests")
async def clinic_list_consultation_requests(clinic=Depends(get_current_clinic)):
    cid = clinic["id"]
    await _backfill_legacy_assigned_leads(cid)
    requests = await db.consultation_requests.find(
        {"assigned_clinic_id": cid}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return {"requests": requests}


# ─── Clinic-safe patient context (P-Dash Visibility Upgrade) ──────
#
# A clinic, after the request is assigned to it, may see patient-reported
# context (quiz answers, source of arrival) so they can prepare for the
# call. This is patient-reported information ONLY — never a diagnosis,
# never an internal score, never another clinic's data.
#
# Strict allow-list approach: we look up known quiz keys and known
# attribution fields by name. Anything we don't recognise is silently
# dropped. Raw attribution objects, content_path_before_conversion,
# password_hash, JWT tokens, cookies, verification tokens are NEVER
# included in the output of this helper.

# Friendly Bulgarian labels for the quiz question keys we currently
# emit from the patient-side quiz. Keys not in this map are not
# surfaced — they may be technical (session_id) or experimental.
_QUIZ_QUESTION_LABELS: Dict[str, str] = {
    "seriousness":       "Колко сериозно търсене",
    "timing":            "Кога планира лечение",
    "importance":        "Какво е важно за пациента",
    "previous_ortho":    "Имал ли е предишно ортодонтско лечение",
    "pain_bite":         "Болка / дискомфорт при захапка",
    "readiness":         "Готовност за лечение",
    "urgency":           "Спешност",
    "can_travel":        "Готовност да пътува",
    "call_availability": "Кога е удобно за разговор",
    "main_concern":      "Основен повод",
    "age_range":         "Възрастова група",
    "segment":           "За кого е заявката",
    # Intake context captured on the city step of MasterQuiz (optional).
    "has_files":         "Налични материали",
    "preferred_channel": "Предпочитан контакт",
}

# Friendly value labels for known answer codes. Keys missing here fall
# back to the raw value string (capitalised, single line).
_QUIZ_VALUE_LABELS: Dict[str, Dict[str, str]] = {
    "seriousness":       {"searching": "Проучва възможности",
                          "considering": "Обмисля сериозно",
                          "decided": "Решен/а да започне"},
    "timing":            {"0-3": "В рамките на 0–3 месеца",
                          "3-6": "В рамките на 3–6 месеца",
                          "6-12": "В рамките на 6–12 месеца",
                          "12+": "След повече от година"},
    "importance":        {"quality": "Качество и опит",
                          "price": "Цена",
                          "speed": "Скорост на лечение",
                          "comfort": "Комфорт"},
    "previous_ortho":    {"yes": "Да", "no": "Не"},
    "pain_bite":         {"yes": "Да", "no": "Не"},
    "readiness":         {"ready": "Готов/а да започне",
                          "researching": "Проучва",
                          "exploring": "Тества вариантите"},
    "urgency":           {"high": "Висока", "moderate": "Умерена", "low": "Ниска"},
    "can_travel":        {"yes": "Да", "no": "Не"},
    # `segment` is emitted by MasterQuiz as a raw English enum; without
    # this the clinic-facing brief printed "adult" / "child".
    "segment":           {"adult": "Възрастен",
                          "teen": "Тийнейджър (12–17 г.)",
                          "child": "Дете (под 12 г.)"},
    # Intake context (MasterQuiz city step).
    "has_files":         {"photos": "Снимки на зъбите",
                          "opg": "OPG / скенер",
                          "plan": "План или оферта",
                          "none": "Няма"},
    "preferred_channel": {"call": "Обаждане",
                          "message": "Съобщение",
                          "any": "Няма значение"},
}

# ── MasterQuiz (homepage flagship) ──────────────────────────────────
# WHY THIS EXISTS: `_QUIZ_QUESTION_LABELS` above was written for the
# treatment/city quizzes, whose answer keys are `seriousness`, `timing`,
# `can_travel`… MasterQuiz — the quiz the entire homepage funnels into —
# emits `a1..a10` (adult), `t1..t8` (teen), `c1..c8` (child) instead.
# `_safe_quiz_summary` drops any key it has no label for, so every
# homepage lead reached the clinic with exactly ONE row surfaced
# (`segment`). Ten answered questions were collected, stored, and thrown
# away at render time — while Growth Partner is sold "patient-reported
# context". These labels close that gap.
#
# The labels are deliberately clinical shorthand, not the patient-facing
# question text ("Коя от тези усмивки е най-близка до твоята?" → "Подредба
# на зъбите"). The clinic needs the signal at a glance; the patient's
# phrasing is noise in a brief. Keep in sync with QUESTION_SETS in
# frontend/components/MasterQuiz.tsx.
_MASTER_QUIZ_LABELS: Dict[str, str] = {
    # adult
    "a1": "Подредба на зъбите",
    "a2": "Крие зъбите при усмивка",
    "a3": "Равномерна захапка",
    "a4": "Дъвче едностранно",
    "a5": "Дишане през устата",
    "a6": "Щракане в челюстта",
    "a7": "Сутрешно напрежение в челюстта",
    "a8": "Износване на зъбите",
    "a9": "Главоболие / напрежение",
    "a10": "Подозирал/а проблем преди теста",
    # teen
    "t1": "Подредба на зъбите",
    "t2": "Притеснява се от усмивката си",
    "t3": "Неравномерна захапка",
    "t4": "Дъвче едностранно",
    "t5": "Струпани постоянни зъби",
    "t6": "Дишане през устата",
    "t7": "Затруднения с говора",
    "t8": "Родителят очаква нужда от лечение",
    # child
    "c1": "Подредба на зъбите",
    "c2": "Дишане през устата",
    "c3": "Хъркане / неспокоен сън",
    "c4": "Смучене на пръст / биберон",
    "c5": "Тясна челюст / липса на място",
    "c6": "Видима разлика в захапката",
    "c7": "Отворена уста през деня",
    "c8": "Родителят очаква нужда от преглед",
}

# Shared value vocabulary for the MasterQuiz keys above.
_MASTER_QUIZ_VALUES: Dict[str, str] = {
    "crowded": "Видимо струпани",
    "mild": "Леко струпани",
    "aligned": "Подредени",
    "yes": "Да",
    "no": "Не",
    "sometimes": "Понякога",
    "unsure": "Не е сигурен/а",
    "past": "Преди да, вече не",
}

# Clinical flags derived by the quiz scorer — the highest-signal output it
# produces, and previously not surfaced to the clinic at all.
_QUIZ_FLAG_LABELS: Dict[str, str] = {
    "crowding": "Струпване",
    "bite_issue": "Захапка",
    "airway": "Дишане",
    "tension": "Напрежение",
    "wear": "Износване",
    "development": "Развитие",
}

# Orientation stage shown to the patient on their result screen. The
# clinic should see the same words the patient saw.
_QUIZ_BAND_LABELS: Dict[str, str] = {
    "low": "Ранен етап",
    "moderate": "Развиващ се етап",
    "high": "Напреднал етап",
    # legacy/lead-level band values
    "GREEN": "Ранен етап",
    "YELLOW": "Развиващ се етап",
    "RED": "Напреднал етап",
}

# Safe surface for the "source of arrival" panel — never expose the raw
# UTM dictionary, just a friendly classification.
def _classify_source_type(lead: Dict[str, Any]) -> str:
    if not lead:
        return "unknown"
    if lead.get("first_article_slug") or lead.get("first_article_title"):
        return "article"
    src = (lead.get("first_utm_source") or lead.get("latest_utm_source") or "").lower()
    if src in {"facebook", "meta", "instagram", "fb", "ig"} or "meta" in src:
        return "campaign"
    if src in {"google", "google_ads", "googleads"}:
        return "campaign"
    if src and src not in {"(direct)", "direct", "none", "—"}:
        return "campaign"
    landing_type = (
        lead.get("first_landing_page_type")
        or lead.get("latest_landing_page_type")
        or ""
    ).lower()
    if landing_type == "quiz":
        return "quiz"
    if landing_type in {"article", "blog"}:
        return "article"
    if (lead.get("first_referrer") or "").strip():
        return "campaign"  # external referrer
    if lead.get("first_landing_page"):
        return "direct"
    return "unknown"


def _safe_quiz_summary(lead: Dict[str, Any]) -> List[Dict[str, str]]:
    """Return ONLY known safe quiz answers in `{question_label, answer_label}`
    rows. Drops any key we don't have a label for.

    Covers both answer vocabularies: the treatment/city quizzes
    (`seriousness`, `timing`, …) and MasterQuiz (`a1..a10`/`t1..t8`/
    `c1..c8`). Order is stable and deliberate — MasterQuiz answers first
    in question order, since that quiz drives the homepage funnel.
    """
    out: List[Dict[str, str]] = []
    if not lead:
        return out
    answers = lead.get("answers") or {}
    if not isinstance(answers, dict):
        return out

    def _clean(raw: Any) -> Optional[str]:
        # Only allow primitive types — never serialise nested dicts/lists.
        if raw is None or raw == "" or not isinstance(raw, (str, int, float, bool)):
            return None
        s = str(raw).strip()
        if not s:
            return None
        return s[:199].rstrip() + "…" if len(s) > 200 else s

    def _render(key: str, raw: Any, value_map: Dict[str, str]) -> Optional[str]:
        """Render one answer. Handles multi-select answers (a list of
        option codes, e.g. `has_files`) by mapping each item through the
        value vocabulary and joining. Deliberately narrow: only a list of
        primitives is accepted, capped at 6, so this cannot be used to
        serialise arbitrary nested data into a clinic-facing payload.
        """
        if isinstance(raw, list):
            parts: List[str] = []
            for item in raw[:6]:
                v = _clean(item)
                if v is None:
                    continue
                parts.append(value_map.get(v, v))
            return ", ".join(parts) if parts else None
        v = _clean(raw)
        return None if v is None else value_map.get(v, v)

    # MasterQuiz answers, in question order (a1, a2, … then t…, then c…).
    for key, label in _MASTER_QUIZ_LABELS.items():
        if key not in answers:
            continue
        val = _clean(answers.get(key))
        if val is None:
            continue
        out.append({
            "question_label": label,
            "answer_label": _MASTER_QUIZ_VALUES.get(val, val),
        })

    # Treatment/city-quiz answers + MasterQuiz intake context.
    for key, label in _QUIZ_QUESTION_LABELS.items():
        if key not in answers:
            continue
        display = _render(key, answers.get(key), _QUIZ_VALUE_LABELS.get(key) or {})
        if display is None:
            continue
        out.append({"question_label": label, "answer_label": display})
    return out


def _safe_quiz_signals(lead: Dict[str, Any]) -> Dict[str, Any]:
    """The quiz's own derived output: orientation stage + clinical flags.

    This is the highest-signal part of the brief — it is what the patient
    was actually shown on their result screen — and it was previously not
    sent to the clinic at all. Keeping it aligned matters: the clinic
    should know what the patient was told before they speak.
    """
    if not lead:
        return {"stage_label": None, "flags": []}
    answers = lead.get("answers") or {}
    if not isinstance(answers, dict):
        answers = {}

    raw_band = answers.get("quiz_band") or lead.get("band")
    stage = _QUIZ_BAND_LABELS.get(str(raw_band).strip()) if raw_band else None

    raw_flags = answers.get("quiz_flags")
    flags: List[str] = []
    if isinstance(raw_flags, list):
        for f in raw_flags:
            if isinstance(f, str) and f in _QUIZ_FLAG_LABELS:
                flags.append(_QUIZ_FLAG_LABELS[f])
    return {"stage_label": stage, "flags": flags}


def _safe_source_context(lead: Dict[str, Any]) -> Dict[str, Any]:
    """Friendly source/attribution summary. Never returns raw UTM blob."""
    if not lead:
        return {
            "source_type": "unknown",
            "article_title": None,
            "article_slug": None,
            "utm_source": None,
            "utm_campaign": None,
            "utm_ad": None,
            "content_path_summary": None,
        }
    article_title = lead.get("first_article_title") or lead.get("latest_article_title")
    article_slug = lead.get("first_article_slug") or lead.get("latest_article_slug")
    # Friendly content-path summary: simply the number of pages viewed
    # before conversion + whether a blog-assisted path was detected. We
    # do NOT expose the page-by-page raw path.
    pages_viewed = lead.get("pages_viewed_before_conversion")
    blog_assisted = lead.get("blog_assisted_conversion")
    content_path_summary: Optional[str] = None
    if isinstance(pages_viewed, int) and pages_viewed > 0:
        if blog_assisted:
            content_path_summary = (
                f"Пациентът е разгледал {pages_viewed} страници, включително "
                f"съдържание от блога преди да попълни заявката."
            )
        else:
            content_path_summary = (
                f"Пациентът е разгледал {pages_viewed} страници преди да "
                f"попълни заявката."
            )
    return {
        "source_type": _classify_source_type(lead),
        "article_title": article_title,
        "article_slug": article_slug,
        "utm_source": lead.get("first_utm_source") or lead.get("latest_utm_source"),
        "utm_campaign": lead.get("first_utm_campaign") or lead.get("latest_utm_campaign"),
        "utm_ad": lead.get("first_utm_ad") or lead.get("latest_utm_ad"),
        "content_path_summary": content_path_summary,
    }


async def _build_patient_context(req: Dict[str, Any]) -> Dict[str, Any]:
    """Compose the clinic-safe `patient_context` payload for a given
    consultation_request. Returns a dict that is always JSON-serialisable
    and never contains internal fields."""
    lead: Dict[str, Any] = {}
    if req.get("lead_id"):
        lead = await db.leads.find_one(
            {"id": req["lead_id"]},
            {
                "_id": 0,
                # Allow-list only — everything else is dropped.
                "answers": 1,
                # Orientation stage. MasterQuiz leads carry it in
                # `answers.quiz_band`; treatment/city-quiz leads only have
                # the lead-level `band`, so both are needed for the stage
                # line to resolve for every lead type.
                "band": 1,
                "first_article_title": 1, "first_article_slug": 1,
                "latest_article_title": 1, "latest_article_slug": 1,
                "first_utm_source": 1, "first_utm_campaign": 1, "first_utm_ad": 1,
                "latest_utm_source": 1, "latest_utm_campaign": 1, "latest_utm_ad": 1,
                "first_landing_page_type": 1, "latest_landing_page_type": 1,
                "first_landing_page": 1, "first_referrer": 1,
                "pages_viewed_before_conversion": 1,
                "blog_assisted_conversion": 1,
            },
        ) or {}
    answers = lead.get("answers") or {}
    main_concern_raw = answers.get("main_concern") if isinstance(answers, dict) else None
    if not isinstance(main_concern_raw, (str, type(None))):
        main_concern_raw = None
    # P5 patient_message: truncate to 1000 (matches storage cap) for UI.
    pm_raw = req.get("patient_message")
    patient_message = (pm_raw[:1000] if isinstance(pm_raw, str) else None)
    signals = _safe_quiz_signals(lead)
    return {
        "label": "Информация, споделена от пациента",
        "treatment_interest": req.get("treatment_interest"),
        "city": req.get("patient_city"),
        "readiness": req.get("readiness"),
        "urgency": req.get("urgency"),
        "main_concern": (main_concern_raw[:500] if main_concern_raw else None),
        "patient_message": patient_message,
        # The orientation the patient was actually shown — stage + the
        # scorer's clinical flags. Lets the clinic open the call already
        # knowing what the patient has been told.
        "stage_label": signals["stage_label"],
        "signal_flags": signals["flags"],
        "quiz_summary": _safe_quiz_summary(lead),
        "source_context": _safe_source_context(lead),
    }


@router.get("/clinic/consultation-requests/{req_id}")
async def clinic_get_consultation_request(
    req_id: str,
    clinic=Depends(get_current_clinic),
):
    if not isinstance(req_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    req = await db.consultation_requests.find_one(
        {"id": req_id, "assigned_clinic_id": clinic["id"]}, {"_id": 0}
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    appointment = await db.clinic_appointments.find_one(
        {"consultation_request_id": req_id, "clinic_id": clinic["id"]}, {"_id": 0}
    )
    events = await db.consultation_events.find(
        {"consultation_request_id": req_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)

    # Lazy: mark_viewed if first time seen and still in 'assigned' state
    if req.get("status") == "assigned" and not req.get("clinic_viewed_at"):
        now = _now_iso()
        await db.consultation_requests.update_one(
            {"id": req_id, "assigned_clinic_id": clinic["id"]},
            {"$set": {
                "clinic_viewed_at": now,
                "status": "clinic_viewed",
                "updated_at": now,
            }},
        )
        await _log_event(
            req_id, "clinic_viewed_request",
            clinic_id=clinic["id"],
            previous_status="assigned",
            new_status="clinic_viewed",
        )
        req["clinic_viewed_at"] = now
        req["status"] = "clinic_viewed"
        # Re-fetch events to include the new one
        events = await db.consultation_events.find(
            {"consultation_request_id": req_id}, {"_id": 0}
        ).sort("created_at", 1).to_list(500)

    return {
        "request": req,
        "appointment": appointment,
        "events": events,
        "patient_context": await _build_patient_context(req),
    }


# Action types that count as a "first meaningful action" for time_to_first_action
_FIRST_ACTION_TYPES = {
    "call_attempted", "patient_contacted", "no_answer",
    "book_consultation", "patient_declined", "not_suitable",
}

# Maps action_type → (event_type, new_status, timestamp_field)
_ACTION_TO_STATUS: Dict[str, Dict[str, Any]] = {
    "mark_viewed":         {"event": "clinic_viewed_request",  "status": "clinic_viewed",     "ts_field": "clinic_viewed_at"},
    "call_attempted":      {"event": "call_attempted",         "status": "call_attempted",    "ts_field": "call_attempted_at"},
    "patient_contacted":   {"event": "patient_contacted",      "status": "patient_contacted", "ts_field": "patient_contacted_at"},
    "no_answer":           {"event": "no_answer",              "status": "no_answer",         "ts_field": None},
    "book_consultation":   {"event": "appointment_booked",     "status": "booked",            "ts_field": "appointment_booked_at"},
    "reschedule":          {"event": "appointment_rescheduled","status": "rescheduled",       "ts_field": None},
    "patient_declined":    {"event": "patient_declined",       "status": "patient_declined",  "ts_field": None},
    "not_suitable":        {"event": "marked_not_suitable",    "status": "not_suitable",      "ts_field": None},
    "mark_attended":       {"event": "marked_attended",        "status": "attended",          "ts_field": "attended_at"},
    "mark_no_show":        {"event": "marked_no_show",         "status": "no_show",           "ts_field": "no_show_at"},
    "cancel":              {"event": "cancelled",              "status": "cancelled",         "ts_field": "cancelled_at"},
    "admin_note":          {"event": "admin_note_added",       "status": None,                "ts_field": None},
}

# Terminal statuses — destructive/forward transitions are not allowed
# once the request is in one of these. `mark_viewed` is exempt because
# the endpoint already short-circuits it (no status mutation, no
# clinic_viewed_at overwrite). `admin_note` is exempt because it does
# not change status at all.
_TERMINAL_STATUSES = frozenset({
    "attended", "no_show",
    "patient_declined", "not_suitable",
    "cancelled", "expired",
})
_TRANSITION_EXEMPT_ACTIONS = frozenset({"mark_viewed", "admin_note"})


@router.post("/clinic/consultation-requests/{req_id}/action")
async def clinic_perform_action(
    req_id: str,
    body: ConsultationActionRequest,
    clinic=Depends(get_current_clinic),
):
    if not isinstance(req_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    if body.action_type not in ACTION_TYPE_VALUES:
        raise HTTPException(status_code=400, detail="Invalid action_type")
    spec = _ACTION_TO_STATUS.get(body.action_type)
    if not spec:
        raise HTTPException(status_code=400, detail="Unhandled action_type")

    req = await db.consultation_requests.find_one(
        {"id": req_id, "assigned_clinic_id": clinic["id"]}, {"_id": 0}
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Transition safety: once a request reaches a terminal status, the
    # clinic cannot push it forward into another status. `mark_viewed`
    # and `admin_note` are exempt (they are idempotent / non-mutating).
    if (
        req.get("status") in _TERMINAL_STATUSES
        and body.action_type not in _TRANSITION_EXEMPT_ACTIONS
    ):
        raise HTTPException(
            status_code=409,
            detail="Заявката е приключена и не може да бъде променяна.",
        )

    now = _now_iso()
    update: Dict[str, Any] = {"updated_at": now}
    prev_status = req.get("status")
    new_status = spec["status"]

    # Status transition (skip for 'admin_note' or for 'mark_viewed' if already past)
    if body.action_type == "mark_viewed":
        if prev_status == "assigned":
            update["status"] = new_status
        if not req.get("clinic_viewed_at"):
            update["clinic_viewed_at"] = now
    elif new_status:
        update["status"] = new_status

    # Specific timestamp field
    ts_field = spec.get("ts_field")
    if ts_field and not req.get(ts_field):
        update[ts_field] = now

    # First action time
    if body.action_type in _FIRST_ACTION_TYPES and not req.get("first_action_at"):
        update["first_action_at"] = now

    # Note
    if body.note:
        existing_notes = req.get("notes") or ""
        sep = "\n" if existing_notes else ""
        update["notes"] = f"{existing_notes}{sep}[{now}] {body.note}".strip()

    appointment_doc: Optional[Dict[str, Any]] = None

    # Booking / Reschedule require appointment payload
    if body.action_type == "book_consultation":
        if not body.appointment:
            raise HTTPException(status_code=400, detail="appointment required for book_consultation")
        appt = body.appointment
        if appt.appointment_type not in APPOINTMENT_TYPE_VALUES:
            raise HTTPException(status_code=400, detail="Invalid appointment_type")
        appointment_doc = {
            "id": _new_id(),
            "clinic_id": clinic["id"],
            "consultation_request_id": req_id,
            "patient_name": req.get("patient_name") or "",
            "patient_phone": req.get("patient_phone") or "",
            "treatment_category": req.get("treatment_interest"),
            "appointment_type": appt.appointment_type,
            "start_time": appt.start_time,
            "end_time": appt.end_time,
            "status": "booked",
            "notes": appt.notes,
            "created_at": now,
            "updated_at": now,
        }
        await db.clinic_appointments.insert_one({**appointment_doc})

    elif body.action_type == "reschedule":
        if not body.appointment:
            raise HTTPException(status_code=400, detail="appointment required for reschedule")
        appt = body.appointment
        if appt.appointment_type not in APPOINTMENT_TYPE_VALUES:
            raise HTTPException(status_code=400, detail="Invalid appointment_type")
        existing_appt = await db.clinic_appointments.find_one(
            {"consultation_request_id": req_id, "clinic_id": clinic["id"]}, {"_id": 0}
        )
        if existing_appt:
            await db.clinic_appointments.update_one(
                {"id": existing_appt["id"]},
                {"$set": {
                    "appointment_type": appt.appointment_type,
                    "start_time": appt.start_time,
                    "end_time": appt.end_time,
                    "notes": appt.notes,
                    "status": "rescheduled",
                    "updated_at": now,
                }},
            )
            appointment_doc = {**existing_appt,
                "appointment_type": appt.appointment_type,
                "start_time": appt.start_time, "end_time": appt.end_time,
                "notes": appt.notes, "status": "rescheduled", "updated_at": now,
            }
        else:
            # Create a new appointment if there was no prior booking
            appointment_doc = {
                "id": _new_id(),
                "clinic_id": clinic["id"],
                "consultation_request_id": req_id,
                "patient_name": req.get("patient_name") or "",
                "patient_phone": req.get("patient_phone") or "",
                "treatment_category": req.get("treatment_interest"),
                "appointment_type": appt.appointment_type,
                "start_time": appt.start_time,
                "end_time": appt.end_time,
                "status": "rescheduled",
                "notes": appt.notes,
                "created_at": now,
                "updated_at": now,
            }
            await db.clinic_appointments.insert_one({**appointment_doc})
        # On reschedule, also bump booking timestamp if missing
        if not req.get("appointment_booked_at"):
            update["appointment_booked_at"] = now

    elif body.action_type == "mark_attended":
        await db.clinic_appointments.update_many(
            {"consultation_request_id": req_id, "clinic_id": clinic["id"]},
            {"$set": {"status": "attended", "updated_at": now}},
        )
    elif body.action_type == "mark_no_show":
        await db.clinic_appointments.update_many(
            {"consultation_request_id": req_id, "clinic_id": clinic["id"]},
            {"$set": {"status": "no_show", "updated_at": now}},
        )
    elif body.action_type == "cancel":
        await db.clinic_appointments.update_many(
            {"consultation_request_id": req_id, "clinic_id": clinic["id"]},
            {"$set": {"status": "cancelled", "updated_at": now}},
        )

    await db.consultation_requests.update_one({"id": req_id}, {"$set": update})

    await _log_event(
        req_id,
        spec["event"],
        clinic_id=clinic["id"],
        previous_status=prev_status,
        new_status=update.get("status"),
        note=body.note,
    )

    refreshed = await db.consultation_requests.find_one({"id": req_id}, {"_id": 0})

    # Phase F — Care Pass unlock on first clinic appointment booking.
    # `book_consultation` is the canonical "clinic accepted + booked"
    # action in the existing offline/in-person workflow. The unlock
    # helper is idempotent: reschedule / repeated book_consultation
    # will not duplicate emails or reset the original
    # `care_pass_unlocked_at`.
    if body.action_type == "book_consultation" and refreshed and refreshed.get("lead_id"):
        try:
            from care_pass import unlock_care_pass_for_lead
            await unlock_care_pass_for_lead(
                refreshed["lead_id"],
                consultation_type="offline_in_person",
                clinic_id=clinic.get("id"),
                source_request_id=req_id,
                actor_type="clinic", actor_id=clinic.get("id"),
            )
        except Exception as exc:
            logger.warning(f"care_pass unlock (offline) failed: {exc}")

    return {"request": refreshed, "appointment": appointment_doc}


# ─── Clinic: Calendar / Appointments ──────────────────────

def _orientation_booking_to_appointment(b: Dict[str, Any]) -> Dict[str, Any]:
    """Adapt an `online_orientation_bookings` row into the `Appointment`
    shape the clinic calendar UI already renders, so free online-orientation
    slots booked from a clinic's public profile show up alongside manually
    created in-clinic appointments instead of only being visible on the
    separate "Онлайн ориентация" actions page. `online_orientation_booking_id`
    (rather than reusing `consultation_request_id`) tells the frontend to
    link back to that actions page, since that's still where confirm/reject
    actually happens — this endpoint stays read-only for these rows.
    """
    scheduled_at = b.get("scheduled_at") or b.get("created_at")
    duration = int(b.get("duration_minutes") or 20)
    end_time = scheduled_at
    try:
        start_dt = datetime.fromisoformat(str(scheduled_at).replace("Z", "+00:00"))
        end_time = (start_dt + timedelta(minutes=duration)).isoformat()
    except (ValueError, TypeError):
        pass
    return {
        "id": b["id"],
        "clinic_id": b.get("clinic_id"),
        "consultation_request_id": None,
        "online_orientation_booking_id": b["id"],
        "patient_name": b.get("patient_name") or "Пациент",
        "patient_phone": b.get("patient_phone") or "",
        "treatment_category": b.get("treatment_category"),
        "appointment_type": "online_orientation",
        "start_time": scheduled_at,
        "end_time": end_time,
        "status": b.get("status"),
        "notes": b.get("patient_note"),
        "doctor_id": b.get("doctor_id"),
        "created_at": b.get("created_at"),
        "updated_at": b.get("updated_at"),
    }


# Terminal/dead statuses excluded from the calendar — matches the "История"
# (history) grouping on the online-orientation actions page. The calendar is
# forward-looking; finished bookings would just be noise.
_ORIENTATION_CALENDAR_TERMINAL_STATUSES = {
    "completed", "no_show", "converted_to_in_clinic", "not_suitable",
    "cancelled_by_patient", "cancelled_by_clinic", "rejected_by_clinic",
    "expired_pending_confirmation",
}


@router.get("/clinic/appointments")
async def clinic_list_appointments(
    clinic=Depends(get_current_clinic),
    status: Optional[str] = None,
    appointment_type: Optional[str] = None,
):
    # "online_orientation" is a synthetic type that only ever exists on
    # adapted rows below — it never matches a real clinic_appointments doc,
    # so filtering by it skips that collection entirely rather than
    # (correctly, but confusingly) always returning zero rows.
    wants_orientation_only = appointment_type == "online_orientation"
    wants_real_type_only = bool(appointment_type) and not wants_orientation_only

    appts: List[Dict[str, Any]] = []
    if not wants_orientation_only:
        q: Dict[str, Any] = {"clinic_id": clinic["id"]}
        if isinstance(status, str) and status:
            q["status"] = status
        if wants_real_type_only:
            q["appointment_type"] = appointment_type
        appts = await db.clinic_appointments.find(q, {"_id": 0}).sort("start_time", 1).to_list(2000)

    if not wants_real_type_only:
        orientation_q: Dict[str, Any] = {
            "clinic_id": clinic["id"],
            "status": {"$nin": list(_ORIENTATION_CALENDAR_TERMINAL_STATUSES)},
        }
        if isinstance(status, str) and status:
            orientation_q["status"] = status
        orientation_rows = await db.online_orientation_bookings.find(
            orientation_q, {"_id": 0},
        ).to_list(2000)
        appts.extend(_orientation_booking_to_appointment(b) for b in orientation_rows)
        appts.sort(key=lambda a: a.get("start_time") or "")

    return {"appointments": appts}


@router.post("/clinic/appointments")
async def clinic_create_appointment(
    data: ClinicAppointmentCreate,
    clinic=Depends(get_current_clinic),
):
    if data.appointment_type not in APPOINTMENT_TYPE_VALUES:
        raise HTTPException(status_code=400, detail="Invalid appointment_type")
    # If linked to a consultation_request, ensure it belongs to this clinic
    if data.consultation_request_id:
        req = await db.consultation_requests.find_one(
            {"id": data.consultation_request_id, "assigned_clinic_id": clinic["id"]},
            {"_id": 0, "id": 1},
        )
        if not req:
            raise HTTPException(status_code=404, detail="Linked consultation request not found")
    now = _now_iso()
    doc = {
        "id": _new_id(),
        "clinic_id": clinic["id"],
        "consultation_request_id": data.consultation_request_id,
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "treatment_category": data.treatment_category,
        "appointment_type": data.appointment_type,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "status": "booked",
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }
    await db.clinic_appointments.insert_one({**doc})
    return {"appointment": doc}


@router.patch("/clinic/appointments/{appt_id}")
async def clinic_update_appointment(
    appt_id: str,
    data: ClinicAppointmentPatch,
    clinic=Depends(get_current_clinic),
):
    if not isinstance(appt_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "appointment_type" in update and update["appointment_type"] not in APPOINTMENT_TYPE_VALUES:
        raise HTTPException(status_code=400, detail="Invalid appointment_type")
    if "status" in update and update["status"] not in APPOINTMENT_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid status")
    update["updated_at"] = _now_iso()
    result = await db.clinic_appointments.update_one(
        {"id": appt_id, "clinic_id": clinic["id"]}, {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt = await db.clinic_appointments.find_one({"id": appt_id}, {"_id": 0})
    return {"appointment": appt}


@router.delete("/clinic/appointments/{appt_id}")
async def clinic_cancel_appointment(
    appt_id: str,
    request: Request,
    clinic=Depends(get_current_clinic),
):
    """Soft-cancel: status='cancelled'. Does not delete the row."""
    if not isinstance(appt_id, str):
        raise HTTPException(status_code=400, detail="Invalid id")
    existing = await db.clinic_appointments.find_one(
        {"id": appt_id, "clinic_id": clinic["id"]}, {"_id": 0}
    )
    result = await db.clinic_appointments.update_one(
        {"id": appt_id, "clinic_id": clinic["id"]},
        {"$set": {"status": "cancelled", "updated_at": _now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    # Audit: target_type=consultation_request (per the Phase 3 plan); appt_id
    # carried in metadata. The sanitiser allow-lists status / assigned_clinic_id
    # only — no patient PII.
    await audit_log(
        "appointment.cancelled",
        actor=clinic, actor_type="clinic",
        target_type="consultation_request",
        target_id=(existing or {}).get("consultation_request_id"),
        metadata={
            "appointment_id": appt_id,
            "clinic_id": clinic.get("id"),
        },
        severity="info", request=request,
    )
    return {"status": "ok"}


# ─── Clinic: Dashboard Overview / Performance ─────────────

def _avg_seconds(diffs: List[float]) -> Optional[float]:
    if not diffs:
        return None
    return sum(diffs) / len(diffs)


def _iso_diff_seconds(a: Optional[str], b: Optional[str]) -> Optional[float]:
    if not a or not b:
        return None
    try:
        ta = datetime.fromisoformat(a)
        tb = datetime.fromisoformat(b)
        return (tb - ta).total_seconds()
    except Exception:
        return None


@router.get("/clinic/dashboard-overview")
async def clinic_dashboard_overview(clinic=Depends(get_current_clinic)):
    """KPI cards for the clinic dashboard landing."""
    cid = clinic["id"]
    await _backfill_legacy_assigned_leads(cid)

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    new_count = await db.consultation_requests.count_documents(
        {"assigned_clinic_id": cid, "status": {"$in": ["new", "assigned"]}}
    )
    awaiting_action = await db.consultation_requests.count_documents(
        {"assigned_clinic_id": cid, "status": {"$in": [
            "assigned", "clinic_viewed", "call_attempted", "no_answer", "rescheduled",
        ]}}
    )
    booked_this_month = await db.consultation_requests.count_documents(
        {"assigned_clinic_id": cid, "appointment_booked_at": {"$gte": month_start}}
    )
    attended_this_month = await db.consultation_requests.count_documents(
        {"assigned_clinic_id": cid, "attended_at": {"$gte": month_start}}
    )
    no_show_this_month = await db.consultation_requests.count_documents(
        {"assigned_clinic_id": cid, "no_show_at": {"$gte": month_start}}
    )

    # Avg response/booking times — across all requests for this clinic
    all_requests = await db.consultation_requests.find(
        {"assigned_clinic_id": cid},
        {"_id": 0, "assigned_at": 1, "first_action_at": 1, "appointment_booked_at": 1, "clinic_viewed_at": 1},
    ).to_list(2000)
    response_diffs = [d for r in all_requests if (d := _iso_diff_seconds(r.get("assigned_at"), r.get("first_action_at"))) is not None]
    book_diffs = [d for r in all_requests if (d := _iso_diff_seconds(r.get("assigned_at"), r.get("appointment_booked_at"))) is not None]

    # 7-day trend: counts of newly assigned requests and bookings per day.
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    span_start = (today - timedelta(days=6)).isoformat()
    trend_docs = await db.consultation_requests.find(
        {
            "assigned_clinic_id": cid,
            "$or": [
                {"assigned_at": {"$gte": span_start}},
                {"appointment_booked_at": {"$gte": span_start}},
            ],
        },
        {"_id": 0, "assigned_at": 1, "appointment_booked_at": 1},
    ).to_list(5000)
    days: List[Dict[str, Any]] = []
    for i in range(7):
        d = today - timedelta(days=6 - i)
        d_iso = d.date().isoformat()
        assigned = sum(
            1 for r in trend_docs
            if (r.get("assigned_at") or "")[:10] == d_iso
        )
        booked = sum(
            1 for r in trend_docs
            if (r.get("appointment_booked_at") or "")[:10] == d_iso
        )
        days.append({"date": d_iso, "assigned": assigned, "booked": booked})

    # Top 5 active (non-terminal) requests, most recent first.
    active_statuses = [
        "new", "assigned", "clinic_viewed", "call_attempted",
        "no_answer", "patient_contacted", "booked", "rescheduled",
    ]
    top_docs = await db.consultation_requests.find(
        {"assigned_clinic_id": cid, "status": {"$in": active_statuses}},
        {
            "_id": 0,
            "id": 1, "patient_name": 1, "patient_phone": 1,
            "treatment_interest": 1, "status": 1,
            "urgency": 1, "created_at": 1, "assigned_at": 1,
            "appointment_booked_at": 1,
        },
    ).sort("created_at", -1).to_list(5)

    return {
        "new_requests": new_count,
        "awaiting_action": awaiting_action,
        "booked_this_month": booked_this_month,
        "attended_this_month": attended_this_month,
        "no_show_this_month": no_show_this_month,
        "avg_response_seconds": _avg_seconds(response_diffs),
        "avg_time_to_book_seconds": _avg_seconds(book_diffs),
        "weekly_trend": days,
        "top_active_requests": top_docs,
    }


@router.get("/clinic/performance")
async def clinic_performance(clinic=Depends(get_current_clinic)):
    cid = clinic["id"]
    requests = await db.consultation_requests.find(
        {"assigned_clinic_id": cid}, {"_id": 0}
    ).to_list(5000)
    total_assigned = len(requests)
    viewed = sum(1 for r in requests if r.get("clinic_viewed_at"))
    contact_attempted = sum(1 for r in requests if r.get("call_attempted_at"))
    contacted = sum(1 for r in requests if r.get("patient_contacted_at"))
    booked = sum(1 for r in requests if r.get("appointment_booked_at"))
    attended = sum(1 for r in requests if r.get("attended_at"))
    no_show = sum(1 for r in requests if r.get("no_show_at"))

    response_diffs = [
        d for r in requests
        if (d := _iso_diff_seconds(r.get("assigned_at"), r.get("first_action_at"))) is not None
    ]
    book_diffs = [
        d for r in requests
        if (d := _iso_diff_seconds(r.get("assigned_at"), r.get("appointment_booked_at"))) is not None
    ]

    booking_conversion = (booked / total_assigned * 100) if total_assigned > 0 else 0
    attendance_rate = (attended / booked * 100) if booked > 0 else 0

    return {
        "total_assigned": total_assigned,
        "viewed": viewed,
        "contact_attempted": contact_attempted,
        "contacted": contacted,
        "booked": booked,
        "attended": attended,
        "no_show": no_show,
        "avg_time_to_first_action_seconds": _avg_seconds(response_diffs),
        "avg_time_to_book_seconds": _avg_seconds(book_diffs),
        "booking_conversion_rate": round(booking_conversion, 1),
        "attendance_rate": round(attendance_rate, 1),
    }
