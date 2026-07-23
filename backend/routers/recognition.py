"""Wall of Recognition — moderated patient gratitude, separate from reviews.

Entries carry no star rating and never affect clinic ranking or matching.
Nothing becomes public before an admin approves both the story and its
explicit display consent. Optional images are private while pending.
"""
from __future__ import annotations

import html
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from auth import get_current_patient, get_current_patient_optional, get_current_user
from community_safety import scrub_pii
from database import db
from rate_limit import rate_limit
from schemas import AdminUser
from storage import ALLOWED_IMAGE_TYPES, get_object, put_object

router = APIRouter()

_STATUSES = {"pending", "published", "rejected"}
_PHOTO_LAYOUTS = {"none", "after_only", "before_after"}
_PHOTO_KINDS = {"before", "after"}
_MAX_PHOTO_BYTES = 8 * 1024 * 1024


class RecognitionCreate(BaseModel):
    message: str = Field(min_length=40, max_length=1200)
    display_name: Optional[str] = Field(default=None, max_length=60)
    treatment_label: Optional[str] = Field(default=None, max_length=80)
    clinic_id: Optional[str] = Field(default=None, max_length=100)
    photo_layout: str = Field(default="none")
    consent_public_display: bool = False


class RecognitionModeration(BaseModel):
    moderation_notes: Optional[str] = Field(default=None, max_length=1200)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _public_name(value: Optional[str]) -> str:
    name = (value or "").strip()
    if not name:
        return "Анонимен пациент"
    return name.split()[0][:24]


async def _photos_for(entry_ids: list[str]) -> Dict[str, list[dict]]:
    grouped: Dict[str, list[dict]] = {}
    if not entry_ids:
        return grouped
    cursor = db.recognition_photos.find(
        {"entry_id": {"$in": entry_ids}, "is_deleted": False},
        {"_id": 0, "id": 1, "entry_id": 1, "kind": 1, "content_type": 1},
    ).sort("kind", 1)
    async for photo in cursor:
        grouped.setdefault(photo["entry_id"], []).append({
            "id": photo["id"],
            "kind": photo["kind"],
            "content_type": photo.get("content_type"),
        })
    return grouped


def _public_entry(entry: Dict[str, Any], photos: list[dict]) -> dict:
    return {
        "id": entry["id"],
        "message": entry.get("message", ""),
        "display_name": entry.get("display_name_public") or "Анонимен пациент",
        "treatment_label": entry.get("treatment_label"),
        "clinic_name": entry.get("clinic_name"),
        "photo_layout": entry.get("photo_layout", "none"),
        "photos": photos,
        "published_at": entry.get("published_at"),
    }


@router.get("/recognition")
async def list_recognition(limit: int = Query(default=30, ge=1, le=60)):
    cursor = db.recognition_entries.find(
        {"status": "published", "display_permission": True}, {"_id": 0},
    ).sort("published_at", -1).limit(limit)
    entries = [entry async for entry in cursor]
    photos = await _photos_for([entry["id"] for entry in entries])
    return {"entries": [_public_entry(entry, photos.get(entry["id"], [])) for entry in entries]}


@router.post(
    "/recognition",
    dependencies=[Depends(rate_limit("recognition_submit", 3, 3600))],
)
async def create_recognition(body: RecognitionCreate, patient=Depends(get_current_patient)):
    if not body.consent_public_display:
        raise HTTPException(status_code=400, detail="Нужно е съгласие за публично показване.")
    if body.photo_layout not in _PHOTO_LAYOUTS:
        raise HTTPException(status_code=400, detail="Невалиден формат на снимките.")

    clinic_name = None
    if body.clinic_id:
        clinic = await db.clinics.find_one(
            {"id": body.clinic_id, "is_active": True},
            {"_id": 0, "clinic_name": 1, "name": 1},
        )
        if not clinic:
            raise HTTPException(status_code=404, detail="Клиниката не е намерена.")
        clinic_name = clinic.get("clinic_name") or clinic.get("name")

    entry_id = str(uuid.uuid4())
    doc = {
        "id": entry_id,
        "patient_id": patient["id"],
        "message": html.escape(scrub_pii(body.message.strip())),
        "display_name_public": _public_name(body.display_name),
        "treatment_label": html.escape((body.treatment_label or "").strip()) or None,
        "clinic_id": body.clinic_id,
        "clinic_name": clinic_name,
        "photo_layout": body.photo_layout,
        "consent_public_display": True,
        "display_permission": False,
        "status": "pending",
        "created_at": _now(),
        "published_at": None,
        "moderated_at": None,
        "moderated_by": None,
        "moderation_notes": None,
    }
    await db.recognition_entries.insert_one(doc)
    return {
        "id": entry_id,
        "message": "Благодарим. Историята ще бъде прегледана преди публикуване.",
    }


@router.post(
    "/recognition/{entry_id}/photos",
    dependencies=[Depends(rate_limit("recognition_photo_upload", 6, 3600))],
)
async def upload_recognition_photo(
    entry_id: str,
    kind: str = Query(...),
    file: UploadFile = File(...),
    patient=Depends(get_current_patient),
):
    entry = await db.recognition_entries.find_one(
        {"id": entry_id, "patient_id": patient["id"], "status": "pending"},
        {"_id": 0, "photo_layout": 1},
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Историята не е намерена.")
    if kind not in _PHOTO_KINDS:
        raise HTTPException(status_code=400, detail="Невалиден тип снимка.")
    layout = entry.get("photo_layout", "none")
    if layout == "none" or (layout == "after_only" and kind != "after"):
        raise HTTPException(status_code=400, detail="Тази снимка не съответства на избрания формат.")
    if await db.recognition_photos.count_documents(
        {"entry_id": entry_id, "kind": kind, "is_deleted": False},
    ):
        raise HTTPException(status_code=400, detail="Вече има снимка за тази позиция.")

    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Приемаме JPG, PNG, WEBP или GIF.")
    data = await file.read()
    if not data or len(data) > _MAX_PHOTO_BYTES:
        raise HTTPException(status_code=400, detail="Снимката трябва да е до 8 MB.")

    photo_id = str(uuid.uuid4())
    ext = ALLOWED_IMAGE_TYPES[content_type]
    path = f"zubite/recognition/{entry_id}/{photo_id}.{ext}"
    await run_in_threadpool(put_object, path, data, content_type)
    await db.recognition_photos.insert_one({
        "id": photo_id,
        "entry_id": entry_id,
        "patient_id": patient["id"],
        "kind": kind,
        "storage_path": path,
        "content_type": content_type,
        "size": len(data),
        "is_deleted": False,
        "created_at": _now(),
    })
    return {"id": photo_id, "kind": kind}


@router.get("/recognition/{entry_id}/photos/{photo_id}")
async def get_recognition_photo(
    entry_id: str,
    photo_id: str,
    patient=Depends(get_current_patient_optional),
):
    photo = await db.recognition_photos.find_one(
        {"id": photo_id, "entry_id": entry_id, "is_deleted": False}, {"_id": 0},
    )
    entry = await db.recognition_entries.find_one(
        {"id": entry_id}, {"_id": 0, "status": 1, "display_permission": 1, "patient_id": 1},
    )
    if not photo or not entry:
        raise HTTPException(status_code=404, detail="Not found")
    is_public = entry.get("status") == "published" and entry.get("display_permission") is True
    is_owner = bool(patient) and entry.get("patient_id") == patient["id"]
    if not (is_public or is_owner):
        raise HTTPException(status_code=404, detail="Not found")
    data, stored_type = await run_in_threadpool(get_object, photo["storage_path"])
    return Response(
        content=data,
        media_type=photo.get("content_type") or stored_type,
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "public, max-age=3600" if is_public else "private, no-store",
        },
    )


@router.get("/admin/recognition")
async def admin_list_recognition(
    status: Optional[str] = None,
    user: AdminUser = Depends(get_current_user),
):
    query: Dict[str, Any] = {}
    if status:
        if status not in _STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        query["status"] = status
    cursor = db.recognition_entries.find(query, {"_id": 0}).sort("created_at", -1).limit(300)
    entries = [entry async for entry in cursor]
    photos = await _photos_for([entry["id"] for entry in entries])
    return {"entries": [{**entry, "photos": photos.get(entry["id"], [])} for entry in entries]}


@router.get("/admin/recognition/{entry_id}/photos/{photo_id}")
async def admin_get_recognition_photo(
    entry_id: str,
    photo_id: str,
    user: AdminUser = Depends(get_current_user),
):
    """Moderators must be able to inspect pending images before approval."""
    photo = await db.recognition_photos.find_one(
        {"id": photo_id, "entry_id": entry_id, "is_deleted": False}, {"_id": 0},
    )
    if not photo:
        raise HTTPException(status_code=404, detail="Not found")
    data, stored_type = await run_in_threadpool(get_object, photo["storage_path"])
    return Response(
        content=data,
        media_type=photo.get("content_type") or stored_type,
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"},
    )


async def _moderate(entry_id: str, status: str, body: RecognitionModeration, user: AdminUser):
    entry = await db.recognition_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    now = _now()
    patch = {
        "status": status,
        "display_permission": status == "published" and bool(entry.get("consent_public_display")),
        "moderated_at": now,
        "moderated_by": user.id,
        "moderation_notes": html.escape((body.moderation_notes or "").strip()) or None,
        "published_at": now if status == "published" else None,
    }
    await db.recognition_entries.update_one({"id": entry_id}, {"$set": patch})
    return {"success": True, "status": status}


@router.post("/admin/recognition/{entry_id}/approve")
async def approve_recognition(
    entry_id: str,
    body: RecognitionModeration,
    user: AdminUser = Depends(get_current_user),
):
    return await _moderate(entry_id, "published", body, user)


@router.post("/admin/recognition/{entry_id}/reject")
async def reject_recognition(
    entry_id: str,
    body: RecognitionModeration,
    user: AdminUser = Depends(get_current_user),
):
    return await _moderate(entry_id, "rejected", body, user)
