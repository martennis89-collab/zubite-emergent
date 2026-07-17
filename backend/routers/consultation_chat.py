"""Online consultation chat — patient ↔ Growth clinic, with OPG/photo upload.

Part of the Growth online-consultation bundle (`patient_chat_channels`),
alongside the Viber deep link. A Verified clinic keeps the phone CTA.

Why medical files do not reuse `uploaded_files`
───────────────────────────────────────────────
`GET /api/files/{id}` (routers/blog.py) is UNAUTHENTICATED and responds
`Cache-Control: public, max-age=31536000`. That is correct for blog images
and catastrophic for a dental X-ray, which is health data — GDPR Art. 9
special category.

Attachments therefore live in their own `consultation_files` collection.
That route queries `uploaded_files` only, so it physically cannot serve a
patient's scan even if someone learns the id. Reading one back requires
`GET .../files/{id}` here, which re-checks ownership on every request and
sends `Cache-Control: private, no-store`.

Auth
────
Patients have no accounts. They authenticate with the existing magic-link
token (`lead_access_tokens`, SHA-256 hashed at rest, 90-day expiry) that
already backs `/api/patient-orientation/{token}` — not a parallel system.
Clinics authenticate with their normal dashboard session, and every query
is scoped to `clinic_id` so one clinic can never read another's thread.
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter, Depends, File, HTTPException, Request, Response, UploadFile,
)
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from database import db
from auth import get_current_clinic
from audit import audit_log
from config import APP_NAME, logger
from entitlements import compute_entitlements
from rate_limit import rate_limit
from storage import put_object, get_object

router = APIRouter()

CHATS_COL = "consultation_chats"
MESSAGES_COL = "consultation_chat_messages"
FILES_COL = "consultation_files"

# OPGs are panoramic X-rays exported from clinic software — usually a large
# JPEG/PNG, sometimes a PDF. DICOM is deliberately not accepted: we cannot
# render it and would only be storing special-category data we cannot use.
ALLOWED_MEDICAL_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
}
MAX_MEDICAL_FILE_BYTES = 10 * 1024 * 1024
MAX_ATTACHMENTS_PER_MESSAGE = 5
MAX_BODY_CHARS = 4000


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class MessageCreate(BaseModel):
    body: str = Field(default="", max_length=MAX_BODY_CHARS)
    attachment_ids: List[str] = Field(default_factory=list)


# ─── Patient identity via magic link ──────────────────────

async def _lead_from_token(access_token: str) -> Dict[str, Any]:
    """Resolve a magic-link token to its lead, mirroring the checks in
    `/api/patient-orientation/{token}` so the two cannot drift apart."""
    if not access_token or not (16 <= len(access_token) <= 200):
        raise HTTPException(
            status_code=404,
            detail={"code": "token_not_found",
                    "message": "Линкът е невалиден или вече не съществува."},
        )
    token_hash = hashlib.sha256(access_token.encode("utf-8")).hexdigest()
    record = await db.lead_access_tokens.find_one({"token_hash": token_hash}, {"_id": 0})
    if not record or record.get("revoked_at"):
        raise HTTPException(
            status_code=404,
            detail={"code": "token_not_found",
                    "message": "Линкът е невалиден или вече не съществува."},
        )
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
            detail={"code": "token_expired", "message": "Линкът е изтекъл."},
        )
    lead = await db.leads.find_one({"id": record.get("lead_id")}, {"_id": 0})
    if not lead:
        raise HTTPException(
            status_code=404,
            detail={"code": "token_not_found",
                    "message": "Линкът е невалиден или вече не съществува."},
        )
    return lead


async def _require_chat_clinic(clinic_id: str) -> Dict[str, Any]:
    """Load a clinic and assert chat is part of its package."""
    clinic = await db.clinics.find_one({"id": clinic_id}, {"_id": 0, "password_hash": 0})
    if not clinic:
        raise HTTPException(status_code=404, detail={"code": "clinic_not_found"})
    addons = await db.clinic_addons.find({"clinic_id": clinic_id}, {"_id": 0}).to_list(200)
    if not compute_entitlements(clinic, addons=addons).get("patient_chat_channels"):
        raise HTTPException(
            status_code=403,
            detail={"code": "chat_not_available",
                    "message": "Тази клиника не приема съобщения през Zubite."},
        )
    return clinic


async def _get_or_create_chat(lead: Dict[str, Any], clinic: Dict[str, Any]) -> Dict[str, Any]:
    existing = await db.get_collection(CHATS_COL).find_one(
        {"lead_id": lead["id"], "clinic_id": clinic["id"]}, {"_id": 0},
    )
    if existing:
        return existing
    doc = {
        "id": str(uuid.uuid4()),
        "lead_id": lead["id"],
        "clinic_id": clinic["id"],
        "status": "open",
        "created_at": _now(),
        "last_message_at": None,
        "clinic_unread": 0,
        "patient_unread": 0,
        "clinic_notified_at": None,
    }
    await db.get_collection(CHATS_COL).insert_one({**doc})
    return doc


def _message_out(m: Dict[str, Any], files_by_id: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "id": m["id"],
        "sender": m["sender"],
        "body": m.get("body") or "",
        "created_at": m.get("created_at"),
        "attachments": [
            {
                "id": fid,
                "filename": (files_by_id.get(fid) or {}).get("original_filename"),
                "content_type": (files_by_id.get(fid) or {}).get("content_type"),
                "size": (files_by_id.get(fid) or {}).get("size"),
            }
            for fid in (m.get("attachments") or [])
            if fid in files_by_id
        ],
    }


async def _messages_for(chat_id: str) -> List[Dict[str, Any]]:
    rows = await db.get_collection(MESSAGES_COL).find(
        {"chat_id": chat_id}, {"_id": 0},
    ).sort("created_at", 1).to_list(500)
    file_ids = [fid for r in rows for fid in (r.get("attachments") or [])]
    files_by_id: Dict[str, Dict[str, Any]] = {}
    if file_ids:
        cur = db.get_collection(FILES_COL).find(
            {"id": {"$in": file_ids}, "is_deleted": False}, {"_id": 0},
        )
        for f in await cur.to_list(500):
            files_by_id[f["id"]] = f
    return [_message_out(m, files_by_id) for m in rows]


async def _store_upload(
    file: UploadFile,
    *,
    chat: Dict[str, Any],
    uploaded_by: str,
) -> Dict[str, Any]:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_MEDICAL_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"code": "unsupported_file_type",
                    "message": "Приемаме снимки (JPG, PNG, WEBP) или PDF."},
        )
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail={"code": "empty_file"})
    if len(data) > MAX_MEDICAL_FILE_BYTES:
        raise HTTPException(
            status_code=400,
            detail={"code": "file_too_large",
                    "message": "Максималният размер е 10 MB."},
        )
    file_id = str(uuid.uuid4())
    ext = ALLOWED_MEDICAL_TYPES[content_type]
    # Prefixed away from `blog/` so a bucket-level policy can treat patient
    # data differently (retention, lifecycle) without touching marketing assets.
    storage_path = f"{APP_NAME}/consultations/{chat['id']}/{file_id}.{ext}"
    # `put_object` is blocking boto3; a 10 MB X-ray would stall the event
    # loop for every other request if called inline.
    await run_in_threadpool(put_object, storage_path, data, content_type)
    doc = {
        "id": file_id,
        "chat_id": chat["id"],
        "lead_id": chat["lead_id"],
        "clinic_id": chat["clinic_id"],
        "storage_path": storage_path,
        "original_filename": file.filename,
        "content_type": content_type,
        "size": len(data),
        "uploaded_by": uploaded_by,
        "is_deleted": False,
        "created_at": _now(),
    }
    await db.get_collection(FILES_COL).insert_one({**doc})
    return doc


async def _serve_file(record: Dict[str, Any]) -> Response:
    data, content_type = await run_in_threadpool(get_object, record["storage_path"])
    filename = record.get("original_filename") or "file"
    return Response(
        content=data,
        media_type=record.get("content_type") or content_type,
        headers={
            # Never cached by a browser, CDN or proxy — this is health data
            # and the URL is only valid for whoever proved ownership above.
            "Cache-Control": "private, no-store, max-age=0",
            "Content-Disposition": f'inline; filename="{filename}"',
            "X-Content-Type-Options": "nosniff",
        },
    )


async def _append_message(
    chat: Dict[str, Any],
    *,
    sender: str,
    body: str,
    attachment_ids: List[str],
) -> Dict[str, Any]:
    body = (body or "").strip()
    if not body and not attachment_ids:
        raise HTTPException(
            status_code=400,
            detail={"code": "empty_message",
                    "message": "Напишете съобщение или прикачете файл."},
        )
    if len(attachment_ids) > MAX_ATTACHMENTS_PER_MESSAGE:
        raise HTTPException(
            status_code=400,
            detail={"code": "too_many_attachments",
                    "message": f"Максимум {MAX_ATTACHMENTS_PER_MESSAGE} файла на съобщение."},
        )
    if attachment_ids:
        owned = await db.get_collection(FILES_COL).count_documents(
            {"id": {"$in": attachment_ids}, "chat_id": chat["id"],
             "uploaded_by": sender, "is_deleted": False},
        )
        if owned != len(set(attachment_ids)):
            # Stops a caller attaching a file id belonging to another thread.
            raise HTTPException(status_code=400, detail={"code": "unknown_attachment"})

    doc = {
        "id": str(uuid.uuid4()),
        "chat_id": chat["id"],
        "sender": sender,
        "body": body,
        "attachments": attachment_ids,
        "created_at": _now(),
    }
    await db.get_collection(MESSAGES_COL).insert_one({**doc})
    unread_field = "clinic_unread" if sender == "patient" else "patient_unread"
    await db.get_collection(CHATS_COL).update_one(
        {"id": chat["id"]},
        {"$set": {"last_message_at": doc["created_at"], "status": "open"},
         "$inc": {unread_field: 1}},
    )
    return doc


# ─── Patient endpoints ────────────────────────────────────

@router.get(
    "/patient-chat/{access_token}",
    dependencies=[Depends(rate_limit("patient_chat_read", 60, 300))],
)
async def patient_list_chats(access_token: str):
    lead = await _lead_from_token(access_token)
    rows = await db.get_collection(CHATS_COL).find(
        {"lead_id": lead["id"]}, {"_id": 0},
    ).sort("last_message_at", -1).to_list(50)
    out = []
    for c in rows:
        clinic = await db.clinics.find_one(
            {"id": c["clinic_id"]}, {"_id": 0, "clinic_name": 1, "name": 1},
        )
        out.append({
            "id": c["id"],
            "clinic_id": c["clinic_id"],
            "clinic_name": (clinic or {}).get("clinic_name") or (clinic or {}).get("name"),
            "status": c.get("status"),
            "last_message_at": c.get("last_message_at"),
            "unread": c.get("patient_unread", 0),
        })
    return {"chats": out}


@router.get(
    "/patient-chat/{access_token}/chats/{chat_id}",
    dependencies=[Depends(rate_limit("patient_chat_read", 60, 300))],
)
async def patient_get_chat(access_token: str, chat_id: str):
    lead = await _lead_from_token(access_token)
    chat = await db.get_collection(CHATS_COL).find_one(
        {"id": chat_id, "lead_id": lead["id"]}, {"_id": 0},
    )
    if not chat:
        raise HTTPException(status_code=404, detail={"code": "chat_not_found"})
    await db.get_collection(CHATS_COL).update_one(
        {"id": chat_id}, {"$set": {"patient_unread": 0}},
    )
    return {"chat": {"id": chat["id"], "status": chat.get("status")},
            "messages": await _messages_for(chat_id)}


@router.post(
    "/patient-chat/{access_token}/clinics/{clinic_id}/files",
    dependencies=[Depends(rate_limit("patient_chat_upload", 20, 300))],
)
async def patient_upload_file(
    access_token: str,
    clinic_id: str,
    file: UploadFile = File(...),
):
    lead = await _lead_from_token(access_token)
    clinic = await _require_chat_clinic(clinic_id)
    chat = await _get_or_create_chat(lead, clinic)
    doc = await _store_upload(file, chat=chat, uploaded_by="patient")
    return {"id": doc["id"], "filename": doc["original_filename"],
            "content_type": doc["content_type"], "size": doc["size"]}


@router.post(
    "/patient-chat/{access_token}/clinics/{clinic_id}/messages",
    dependencies=[Depends(rate_limit("patient_chat_send", 30, 300))],
)
async def patient_send_message(
    access_token: str,
    clinic_id: str,
    payload: MessageCreate,
    request: Request,
):
    lead = await _lead_from_token(access_token)
    clinic = await _require_chat_clinic(clinic_id)
    chat = await _get_or_create_chat(lead, clinic)
    first_from_patient = chat.get("last_message_at") is None
    msg = await _append_message(
        chat, sender="patient", body=payload.body,
        attachment_ids=payload.attachment_ids,
    )
    if first_from_patient:
        await _notify_clinic_new_chat(chat, clinic, lead)
    return {"message": _message_out(msg, {})}


@router.get("/patient-chat/{access_token}/files/{file_id}")
async def patient_get_file(access_token: str, file_id: str):
    lead = await _lead_from_token(access_token)
    record = await db.get_collection(FILES_COL).find_one(
        {"id": file_id, "lead_id": lead["id"], "is_deleted": False}, {"_id": 0},
    )
    if not record:
        raise HTTPException(status_code=404, detail={"code": "file_not_found"})
    return await _serve_file(record)


# ─── Clinic endpoints ─────────────────────────────────────

@router.get("/clinic/chats")
async def clinic_list_chats(clinic=Depends(get_current_clinic)):
    await _require_chat_clinic(clinic["id"])
    rows = await db.get_collection(CHATS_COL).find(
        {"clinic_id": clinic["id"]}, {"_id": 0},
    ).sort("last_message_at", -1).to_list(200)
    out = []
    for c in rows:
        lead = await db.leads.find_one(
            {"id": c["lead_id"]}, {"_id": 0, "name": 1, "band": 1},
        )
        out.append({
            "id": c["id"],
            "patient_name": (lead or {}).get("name") or "Пациент",
            "status": c.get("status"),
            "last_message_at": c.get("last_message_at"),
            "unread": c.get("clinic_unread", 0),
        })
    return {"chats": out}


@router.get("/clinic/chats/{chat_id}")
async def clinic_get_chat(chat_id: str, clinic=Depends(get_current_clinic)):
    await _require_chat_clinic(clinic["id"])
    chat = await db.get_collection(CHATS_COL).find_one(
        {"id": chat_id, "clinic_id": clinic["id"]}, {"_id": 0},
    )
    if not chat:
        raise HTTPException(status_code=404, detail={"code": "chat_not_found"})
    await db.get_collection(CHATS_COL).update_one(
        {"id": chat_id}, {"$set": {"clinic_unread": 0}},
    )
    lead = await db.leads.find_one({"id": chat["lead_id"]}, {"_id": 0, "name": 1})
    return {
        "chat": {"id": chat["id"], "status": chat.get("status"),
                 "patient_name": (lead or {}).get("name") or "Пациент"},
        "messages": await _messages_for(chat_id),
    }


@router.post("/clinic/chats/{chat_id}/files")
async def clinic_upload_file(
    chat_id: str,
    file: UploadFile = File(...),
    clinic=Depends(get_current_clinic),
):
    await _require_chat_clinic(clinic["id"])
    chat = await db.get_collection(CHATS_COL).find_one(
        {"id": chat_id, "clinic_id": clinic["id"]}, {"_id": 0},
    )
    if not chat:
        raise HTTPException(status_code=404, detail={"code": "chat_not_found"})
    doc = await _store_upload(file, chat=chat, uploaded_by="clinic")
    return {"id": doc["id"], "filename": doc["original_filename"],
            "content_type": doc["content_type"], "size": doc["size"]}


@router.post("/clinic/chats/{chat_id}/messages")
async def clinic_send_message(
    chat_id: str,
    payload: MessageCreate,
    clinic=Depends(get_current_clinic),
):
    await _require_chat_clinic(clinic["id"])
    chat = await db.get_collection(CHATS_COL).find_one(
        {"id": chat_id, "clinic_id": clinic["id"]}, {"_id": 0},
    )
    if not chat:
        raise HTTPException(status_code=404, detail={"code": "chat_not_found"})
    msg = await _append_message(
        chat, sender="clinic", body=payload.body,
        attachment_ids=payload.attachment_ids,
    )
    return {"message": _message_out(msg, {})}


@router.get("/clinic/chats/{chat_id}/files/{file_id}")
async def clinic_get_file(
    chat_id: str, file_id: str, clinic=Depends(get_current_clinic),
):
    await _require_chat_clinic(clinic["id"])
    record = await db.get_collection(FILES_COL).find_one(
        {"id": file_id, "chat_id": chat_id, "clinic_id": clinic["id"],
         "is_deleted": False},
        {"_id": 0},
    )
    if not record:
        raise HTTPException(status_code=404, detail={"code": "file_not_found"})
    return await _serve_file(record)


# ─── Notification ─────────────────────────────────────────

async def _notify_clinic_new_chat(
    chat: Dict[str, Any], clinic: Dict[str, Any], lead: Dict[str, Any],
) -> None:
    """Email the clinic the first time a patient opens a thread.

    Email is the only notification channel this platform has (Resend) — no
    push, no SMS. Deliberately carries NO message body and NO attachment:
    it is a "you have a message" nudge, so patient health data never leaves
    the platform in an unencrypted mailbox.
    """
    from emails import send_clinic_chat_notification

    try:
        await db.get_collection(CHATS_COL).update_one(
            {"id": chat["id"]}, {"$set": {"clinic_notified_at": _now()}},
        )
        await audit_log(
            "consultation_chat_started",
            actor_type="public", target_type="clinic", target_id=clinic["id"],
            target_summary=clinic.get("clinic_name") or clinic.get("name"),
            metadata={"chat_id": chat["id"]}, severity="info",
        )
        if clinic.get("email"):
            await send_clinic_chat_notification(
                to_email=clinic["email"],
                clinic_name=clinic.get("clinic_name") or clinic.get("name"),
            )
    except Exception as exc:  # never block the patient's message on this
        logger.warning(f"clinic chat notification failed: {exc}")
