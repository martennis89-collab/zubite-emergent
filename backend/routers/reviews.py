"""Clinic review collection (R1).

Patient-facing review submission + clinic portal review listing +
admin moderation queue. Nothing public until admin approves.

Public:
    GET  /api/public/clinics/{clinic_id}/review-info
    POST /api/public/clinics/{clinic_id}/reviews

Clinic (auth=clinic):
    GET  /api/clinic/reviews/collection-link
    GET  /api/clinic/reviews

Admin (auth=admin):
    GET  /api/admin/reviews?status=&clinic_id=
    GET  /api/admin/reviews/{id}
    POST /api/admin/reviews/{id}/approve
    POST /api/admin/reviews/{id}/reject

R1 design notes:
- No QR generation library is added — pure URL is returned. Frontend
  shows a "QR generation pending dependency decision" placeholder.
- Approved reviews are NOT yet rendered on the public clinic profile;
  this is deferred to R2 per spec.
- IP / UA fingerprinting are stored as SHA-256 hashes only (privacy-
  safe). No raw IP, no raw user-agent.
- HTML in feedback text is sanitized (escaped) before storage.
- Rate limit: 3 public submissions per IP per 10 minutes.
"""
from __future__ import annotations

import hashlib
import html
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from auth import get_current_user, get_current_clinic
from database import db
from rate_limit import rate_limit
from schemas import AdminUser

router = APIRouter()


# ─── Models ───────────────────────────────────────────────────────

_REVIEW_STATUSES = {"pending", "approved", "rejected"}
_REVIEW_SOURCES = {"clinic_qr", "clinic_link", "admin_created", "unknown"}


class ReviewSubmissionBody(BaseModel):
    rating_overall: int = Field(ge=1, le=5)
    feedback_text: str = Field(min_length=10, max_length=4000)
    consent_public_display: bool
    patient_name_optional: Optional[str] = Field(default=None, max_length=120)
    treatment_type: Optional[str] = Field(default=None, max_length=80)
    private_note_to_clinic: Optional[str] = Field(default=None, max_length=2000)
    patient_contact_optional: Optional[str] = Field(default=None, max_length=200)
    consent_contact_if_needed: bool = False
    source: Optional[str] = Field(default="clinic_link", max_length=40)


class ReviewModerationBody(BaseModel):
    moderation_notes: Optional[str] = Field(default=None, max_length=2000)


# ─── Helpers ──────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:32]


def _initials(name: Optional[str]) -> str:
    if not name:
        return ""
    parts = [p for p in re.split(r"\s+", name.strip()) if p]
    return "".join(p[0].upper() + "." for p in parts[:2])


def _public_review_url(clinic_id: str) -> str:
    base = (
        os.environ.get("PUBLIC_BASE_URL")
        or os.environ.get("PRODUCTION_URL")
        or "https://zubite.bg"
    ).rstrip("/")
    return f"{base}/review/clinic/{clinic_id}"


def _safe_review_for_clinic(r: Dict[str, Any]) -> Dict[str, Any]:
    """Clinic-visible projection. Hides admin moderation metadata except
    status; never shows the IP/UA hashes."""
    return {
        "id": r["id"],
        "clinic_id": r["clinic_id"],
        "status": r.get("status", "pending"),
        "source": r.get("source", "clinic_link"),
        "submitted_at": r.get("submitted_at"),
        "rating_overall": r.get("rating_overall"),
        "patient_name_optional": r.get("patient_name_optional"),
        "patient_initials_public": r.get("patient_initials_public"),
        "treatment_type": r.get("treatment_type"),
        "feedback_text": r.get("feedback_text"),
        "private_note_to_clinic": r.get("private_note_to_clinic"),
        "consent_public_display": r.get("consent_public_display", False),
        "consent_contact_if_needed": r.get("consent_contact_if_needed", False),
        "moderated_at": r.get("moderated_at"),
        "display_permission": r.get("display_permission", False),
    }


def _safe_review_for_admin(r: Dict[str, Any]) -> Dict[str, Any]:
    out = _safe_review_for_clinic(r)
    out.update({
        "moderation_notes": r.get("moderation_notes"),
        "moderated_by": r.get("moderated_by"),
        "patient_contact_optional": r.get("patient_contact_optional"),
    })
    return out


# ─── PUBLIC ───────────────────────────────────────────────────────

@router.get("/public/clinics/{clinic_id}/review-info")
async def public_review_info(clinic_id: str):
    clinic = await db.clinics.find_one(
        {"id": clinic_id},
        {"_id": 0, "id": 1, "clinic_name": 1, "name": 1, "city_name": 1,
         "is_active": 1, "clinic_status": 1},
    )
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return {
        "clinic_id": clinic_id,
        "clinic_name": clinic.get("clinic_name") or clinic.get("name") or "",
        "city_name": clinic.get("city_name"),
        "review_url": _public_review_url(clinic_id),
    }


@router.post(
    "/public/clinics/{clinic_id}/reviews",
    dependencies=[Depends(rate_limit("public_review_submit", 3, 600))],
)
async def public_submit_review(clinic_id: str, body: ReviewSubmissionBody, request: Request):
    clinic = await db.clinics.find_one({"id": clinic_id}, {"_id": 0, "id": 1, "clinic_name": 1})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")

    feedback = html.escape(body.feedback_text.strip())
    private_note = html.escape((body.private_note_to_clinic or "").strip()) or None
    name = (body.patient_name_optional or "").strip() or None

    src = body.source if body.source in _REVIEW_SOURCES else "unknown"
    ip = request.client.host if request.client else ""
    ua = request.headers.get("user-agent", "")
    fp_basis = f"{clinic_id}|{ip}|{feedback[:200]}"

    doc = {
        "id": str(uuid.uuid4()),
        "clinic_id": clinic_id,
        "source": src,
        "submitted_at": _now(),
        "status": "pending",
        "display_permission": False,
        "patient_name_optional": name,
        "patient_initials_public": _initials(name),
        "patient_contact_optional": (body.patient_contact_optional or "").strip() or None,
        "rating_overall": body.rating_overall,
        "treatment_type": (body.treatment_type or "").strip() or None,
        "feedback_text": feedback,
        "private_note_to_clinic": private_note,
        "consent_public_display": bool(body.consent_public_display),
        "consent_contact_if_needed": bool(body.consent_contact_if_needed),
        "moderation_notes": None,
        "moderated_by": None,
        "moderated_at": None,
        "ip_hash": _hash(ip) if ip else None,
        "user_agent_hash": _hash(ua) if ua else None,
        "duplicate_fingerprint": _hash(fp_basis),
    }
    await db.clinic_reviews.insert_one(doc)
    return {
        "success": True,
        "review_id": doc["id"],
        "message": (
            "Благодарим. Обратната връзка ще бъде прегледана преди публикуване."
        ),
    }


# ─── CLINIC PORTAL ────────────────────────────────────────────────

@router.get("/clinic/reviews/collection-link")
async def clinic_review_link(clinic: Dict[str, Any] = Depends(get_current_clinic)):
    cid = clinic["id"]
    pending = await db.clinic_reviews.count_documents({"clinic_id": cid, "status": "pending"})
    approved = await db.clinic_reviews.count_documents({"clinic_id": cid, "status": "approved"})
    rejected = await db.clinic_reviews.count_documents({"clinic_id": cid, "status": "rejected"})
    return {
        "clinic_id": cid,
        "clinic_name": clinic.get("clinic_name") or clinic.get("name") or "",
        "city_name": clinic.get("city_name"),
        "review_url": _public_review_url(cid),
        "qr_status": "pending_dependency_decision",
        "qr_note": (
            "QR генерация ще бъде добавена след решение за лек QR пакет. "
            "За R1 използвайте линка."
        ),
        "counts": {"pending": pending, "approved": approved, "rejected": rejected},
    }


@router.get("/clinic/reviews")
async def clinic_list_reviews(
    status: Optional[str] = None,
    clinic: Dict[str, Any] = Depends(get_current_clinic),
):
    q: Dict[str, Any] = {"clinic_id": clinic["id"]}
    if status:
        if status not in _REVIEW_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        q["status"] = status
    cursor = db.clinic_reviews.find(q, {"_id": 0}).sort("submitted_at", -1).limit(500)
    rows = [r async for r in cursor]
    return {"reviews": [_safe_review_for_clinic(r) for r in rows]}


# ─── ADMIN MODERATION ─────────────────────────────────────────────

@router.get("/admin/reviews")
async def admin_list_reviews(
    status: Optional[str] = None,
    clinic_id: Optional[str] = None,
    user: AdminUser = Depends(get_current_user),
):
    q: Dict[str, Any] = {}
    if status:
        if status not in _REVIEW_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        q["status"] = status
    if clinic_id:
        q["clinic_id"] = clinic_id

    cursor = db.clinic_reviews.find(q, {"_id": 0}).sort("submitted_at", -1).limit(500)
    rows = [r async for r in cursor]

    clinic_ids = list({r["clinic_id"] for r in rows})
    clinic_names: Dict[str, str] = {}
    if clinic_ids:
        async for c in db.clinics.find(
            {"id": {"$in": clinic_ids}},
            {"_id": 0, "id": 1, "clinic_name": 1, "name": 1},
        ):
            clinic_names[c["id"]] = c.get("clinic_name") or c.get("name") or ""

    out = []
    for r in rows:
        d = _safe_review_for_admin(r)
        d["clinic_name"] = clinic_names.get(r["clinic_id"], "")
        out.append(d)

    counts = {
        "pending": await db.clinic_reviews.count_documents({"status": "pending"}),
        "approved": await db.clinic_reviews.count_documents({"status": "approved"}),
        "rejected": await db.clinic_reviews.count_documents({"status": "rejected"}),
    }
    return {"reviews": out, "counts": counts}


@router.get("/admin/reviews/{review_id}")
async def admin_get_review(review_id: str, user: AdminUser = Depends(get_current_user)):
    r = await db.clinic_reviews.find_one({"id": review_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    out = _safe_review_for_admin(r)
    clinic = await db.clinics.find_one(
        {"id": r["clinic_id"]},
        {"_id": 0, "clinic_name": 1, "name": 1, "city_name": 1},
    )
    out["clinic_name"] = (clinic or {}).get("clinic_name") or (clinic or {}).get("name") or ""
    out["city_name"] = (clinic or {}).get("city_name")
    return out


async def _moderate(review_id: str, new_status: str, notes: Optional[str], user: AdminUser):
    if new_status not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    existing = await db.clinic_reviews.find_one({"id": review_id}, {"_id": 0, "status": 1, "consent_public_display": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Review not found")
    update: Dict[str, Any] = {
        "status": new_status,
        "moderated_by": user.id,
        "moderated_at": _now(),
    }
    if notes is not None:
        update["moderation_notes"] = html.escape(notes.strip()) or None
    if new_status == "approved":
        update["display_permission"] = bool(existing.get("consent_public_display", False))
    else:
        update["display_permission"] = False
    await db.clinic_reviews.update_one({"id": review_id}, {"$set": update})
    fresh = await db.clinic_reviews.find_one({"id": review_id}, {"_id": 0})
    return {"success": True, "review": _safe_review_for_admin(fresh) if fresh else None}


@router.post("/admin/reviews/{review_id}/approve")
async def admin_approve_review(
    review_id: str,
    body: Optional[ReviewModerationBody] = None,
    user: AdminUser = Depends(get_current_user),
):
    return await _moderate(review_id, "approved", (body.moderation_notes if body else None), user)


@router.post("/admin/reviews/{review_id}/reject")
async def admin_reject_review(
    review_id: str,
    body: Optional[ReviewModerationBody] = None,
    user: AdminUser = Depends(get_current_user),
):
    return await _moderate(review_id, "rejected", (body.moderation_notes if body else None), user)
