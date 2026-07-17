"""Online consultation chat — auth, isolation, entitlement, and the
guarantee that medical attachments are not publicly reachable.

The upload round-trip itself needs live R2 credentials, so it is covered by
`_r2_smoke.py` plus `test_storage_r2.py`; here we assert the upload path
fails CLOSED when storage is unavailable rather than half-writing a message.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone as _tz

import requests

API_URL = os.environ.get("API_URL", "http://localhost:8001")


@asynccontextmanager
async def _mongo():
    """Loop-local Motor client — see test_orientation_settings for why."""
    from motor.motor_asyncio import AsyncIOMotorClient  # type: ignore
    from config import MONGO_URL, DB_NAME  # type: ignore
    client = AsyncIOMotorClient(MONGO_URL)
    try:
        yield client[DB_NAME]
    finally:
        client.close()


async def _new_clinic(base_package: str) -> str:
    cid = str(uuid.uuid4())
    async with _mongo() as db:
        await db.clinics.insert_one({
            "id": cid, "clinic_name": f"Chat-Test {cid[:6]}", "city": "София",
            "city_slug": "sofia", "email": f"chat-{cid[:8]}@example.bg",
            "phone": "+359888000000", "base_package": base_package,
            "clinic_status": "active_partner", "subscription_status": "active",
            "status": "active", "password_hash": "x", "is_active": True,
            "created_at": "2026-07-01T00:00:00+00:00",
            "updated_at": "2026-07-01T00:00:00+00:00",
        })
    return cid


async def _new_lead_with_token(*, expired: bool = False, revoked: bool = False):
    """Create a lead plus a magic-link token, the way the care-pass email
    flow does (`POST /leads/{id}/email-care-pass`)."""
    lead_id = str(uuid.uuid4())
    token = secrets.token_urlsafe(32)
    now = datetime.now(_tz.utc)
    expires = now - timedelta(days=1) if expired else now + timedelta(days=90)
    async with _mongo() as db:
        await db.leads.insert_one({
            "id": lead_id, "name": "Тест Пациент", "city_slug": "sofia",
            "treatment_type": "orthodontics", "band": "moderate",
            "created_at": now.isoformat(),
        })
        await db.lead_access_tokens.insert_one({
            "token_hash": hashlib.sha256(token.encode("utf-8")).hexdigest(),
            "lead_id": lead_id, "created_at": now.isoformat(),
            "expires_at": expires.isoformat(),
            "revoked_at": now.isoformat() if revoked else None,
            "last_accessed_at": None, "access_count": 0,
        })
    return lead_id, token


async def _cleanup(lead_ids, clinic_ids):
    async with _mongo() as db:
        for lid in lead_ids:
            await db.leads.delete_one({"id": lid})
            await db.lead_access_tokens.delete_many({"lead_id": lid})
            await db.consultation_chats.delete_many({"lead_id": lid})
            await db.consultation_files.delete_many({"lead_id": lid})
        for cid in clinic_ids:
            await db.clinics.delete_one({"id": cid})
            await db.auth_sessions.delete_many({"user_id": cid})
            await db.consultation_chats.delete_many({"clinic_id": cid})


async def _clinic_token(cid: str) -> str:
    import jwt  # type: ignore
    from auth import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS  # type: ignore
    jti = str(uuid.uuid4())
    now = datetime.now(_tz.utc)
    exp = now + timedelta(hours=JWT_EXPIRATION_HOURS)
    tok = jwt.encode(
        {"sub": cid, "email": f"chat-{cid[:8]}@example.bg", "role": "clinic",
         "jti": jti, "iat": int(now.timestamp()), "exp": exp},
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )
    async with _mongo() as db:
        await db.auth_sessions.insert_one({
            "id": str(uuid.uuid4()), "user_id": cid, "user_type": "clinic",
            "jti": jti, "created_at": now.isoformat(),
            "last_seen_at": now.isoformat(), "expires_at": exp.isoformat(),
            "revoked_at": None, "revoked_reason": None,
        })
    return tok


def _h(tok: str) -> dict:
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ─── Patient token auth ───────────────────────────────────

def test_patient_chat_rejects_bad_tokens():
    async def runner():
        lead_ids, clinic_ids = [], []
        try:
            # Garbage token.
            r = requests.get(f"{API_URL}/api/patient-chat/{'x' * 40}", timeout=10)
            assert r.status_code == 404, r.text

            # Too short to be one of ours — must not even hit the DB.
            r = requests.get(f"{API_URL}/api/patient-chat/abc", timeout=10)
            assert r.status_code == 404, r.text

            lead_id, tok = await _new_lead_with_token(expired=True)
            lead_ids.append(lead_id)
            r = requests.get(f"{API_URL}/api/patient-chat/{tok}", timeout=10)
            assert r.status_code == 410, r.text
            assert r.json()["detail"]["code"] == "token_expired"

            lead_id2, tok2 = await _new_lead_with_token(revoked=True)
            lead_ids.append(lead_id2)
            r = requests.get(f"{API_URL}/api/patient-chat/{tok2}", timeout=10)
            assert r.status_code == 404, r.text
        finally:
            await _cleanup(lead_ids, clinic_ids)

    asyncio.run(runner())


# ─── Entitlement gate ─────────────────────────────────────

def test_verified_clinic_does_not_accept_chat():
    """Chat is part of the Growth bundle; a Verified clinic keeps the phone
    CTA and must not silently accept a thread."""
    async def runner():
        lead_id, tok = await _new_lead_with_token()
        cid = await _new_clinic("verified_profile")
        try:
            r = requests.post(
                f"{API_URL}/api/patient-chat/{tok}/clinics/{cid}/messages",
                json={"body": "Здравейте"}, timeout=10,
            )
            assert r.status_code == 403, r.text
            assert r.json()["detail"]["code"] == "chat_not_available"

            async with _mongo() as db:
                assert await db.consultation_chats.count_documents({"clinic_id": cid}) == 0
        finally:
            await _cleanup([lead_id], [cid])

    asyncio.run(runner())


# ─── Happy path ───────────────────────────────────────────

def test_patient_and_growth_clinic_exchange_messages():
    async def runner():
        lead_id, tok = await _new_lead_with_token()
        cid = await _new_clinic("growth_partner")
        try:
            r = requests.post(
                f"{API_URL}/api/patient-chat/{tok}/clinics/{cid}/messages",
                json={"body": "Здравейте, имам въпрос за брекети."}, timeout=10,
            )
            assert r.status_code == 200, r.text

            ch = requests.get(f"{API_URL}/api/clinic/chats", headers=_h(await _clinic_token(cid)), timeout=10)
            assert ch.status_code == 200, ch.text
            chats = ch.json()["chats"]
            assert len(chats) == 1, chats
            assert chats[0]["unread"] == 1, "clinic should see the message as unread"
            chat_id = chats[0]["id"]

            # Opening the thread clears the clinic's unread counter.
            r = requests.get(f"{API_URL}/api/clinic/chats/{chat_id}", headers=_h(await _clinic_token(cid)), timeout=10)
            assert r.status_code == 200, r.text
            assert len(r.json()["messages"]) == 1
            assert r.json()["messages"][0]["sender"] == "patient"

            r = requests.post(
                f"{API_URL}/api/clinic/chats/{chat_id}/messages",
                headers=_h(await _clinic_token(cid)),
                json={"body": "Здравейте, заповядайте на консултация."}, timeout=10,
            )
            assert r.status_code == 200, r.text

            r = requests.get(f"{API_URL}/api/patient-chat/{tok}/chats/{chat_id}", timeout=10)
            assert r.status_code == 200, r.text
            msgs = r.json()["messages"]
            assert [m["sender"] for m in msgs] == ["patient", "clinic"]

            # A second patient message reuses the same thread, not a new one.
            requests.post(
                f"{API_URL}/api/patient-chat/{tok}/clinics/{cid}/messages",
                json={"body": "Благодаря!"}, timeout=10,
            )
            async with _mongo() as db:
                assert await db.consultation_chats.count_documents({"lead_id": lead_id}) == 1
        finally:
            await _cleanup([lead_id], [cid])

    asyncio.run(runner())


def test_empty_message_rejected():
    async def runner():
        lead_id, tok = await _new_lead_with_token()
        cid = await _new_clinic("growth_partner")
        try:
            r = requests.post(
                f"{API_URL}/api/patient-chat/{tok}/clinics/{cid}/messages",
                json={"body": "   "}, timeout=10,
            )
            assert r.status_code == 400, r.text
            assert r.json()["detail"]["code"] == "empty_message"
        finally:
            await _cleanup([lead_id], [cid])

    asyncio.run(runner())


# ─── Isolation ────────────────────────────────────────────

def test_clinic_cannot_read_another_clinics_thread():
    async def runner():
        lead_id, tok = await _new_lead_with_token()
        owner = await _new_clinic("growth_partner")
        other = await _new_clinic("growth_partner")
        try:
            requests.post(
                f"{API_URL}/api/patient-chat/{tok}/clinics/{owner}/messages",
                json={"body": "поверително"}, timeout=10,
            )
            chats = requests.get(
                f"{API_URL}/api/clinic/chats", headers=_h(await _clinic_token(owner)), timeout=10,
            ).json()["chats"]
            chat_id = chats[0]["id"]

            h_other = _h(await _clinic_token(other))
            r = requests.get(f"{API_URL}/api/clinic/chats/{chat_id}", headers=h_other, timeout=10)
            assert r.status_code == 404, r.text
            r = requests.post(
                f"{API_URL}/api/clinic/chats/{chat_id}/messages",
                headers=h_other, json={"body": "натрапник"}, timeout=10,
            )
            assert r.status_code == 404, r.text
            assert requests.get(f"{API_URL}/api/clinic/chats", headers=h_other, timeout=10).json()["chats"] == []
        finally:
            await _cleanup([lead_id], [owner, other])

    asyncio.run(runner())


def test_patient_cannot_read_another_patients_thread():
    async def runner():
        lead_a, tok_a = await _new_lead_with_token()
        lead_b, tok_b = await _new_lead_with_token()
        cid = await _new_clinic("growth_partner")
        try:
            requests.post(
                f"{API_URL}/api/patient-chat/{tok_a}/clinics/{cid}/messages",
                json={"body": "мое"}, timeout=10,
            )
            async with _mongo() as db:
                chat = await db.consultation_chats.find_one({"lead_id": lead_a}, {"_id": 0})
            r = requests.get(f"{API_URL}/api/patient-chat/{tok_b}/chats/{chat['id']}", timeout=10)
            assert r.status_code == 404, r.text
        finally:
            await _cleanup([lead_a, lead_b], [cid])

    asyncio.run(runner())


# ─── The GDPR-critical guarantee ──────────────────────────

def test_medical_attachment_is_not_reachable_via_public_files_route():
    """`GET /api/files/{id}` is unauthenticated and sets `Cache-Control:
    public, max-age=31536000`. It reads `uploaded_files`; consultation
    attachments live in `consultation_files` precisely so a dental X-ray
    can never be served from it, even to someone who learns the id."""
    async def runner():
        lead_id, tok = await _new_lead_with_token()
        cid = await _new_clinic("growth_partner")
        file_id = str(uuid.uuid4())
        try:
            async with _mongo() as db:
                await db.consultation_files.insert_one({
                    "id": file_id, "chat_id": str(uuid.uuid4()), "lead_id": lead_id,
                    "clinic_id": cid, "storage_path": f"zubite-bg/consultations/x/{file_id}.jpg",
                    "original_filename": "opg.jpg", "content_type": "image/jpeg",
                    "size": 1234, "uploaded_by": "patient", "is_deleted": False,
                    "created_at": datetime.now(_tz.utc).isoformat(),
                })

            r = requests.get(f"{API_URL}/api/files/{file_id}", timeout=10)
            assert r.status_code == 404, (
                f"a consultation attachment must not be served by the public "
                f"files route; got {r.status_code}"
            )

            # And an unrelated patient's token cannot fetch it either.
            _, other_tok = await _new_lead_with_token()
            r = requests.get(f"{API_URL}/api/patient-chat/{other_tok}/files/{file_id}", timeout=10)
            assert r.status_code == 404, r.text
        finally:
            async with _mongo() as db:
                await db.consultation_files.delete_many({"id": file_id})
            await _cleanup([lead_id], [cid])

    asyncio.run(runner())


def test_upload_fails_closed_without_storage():
    """With R2 unconfigured the upload must 503 — never a partial write and
    never a message referencing a file that was not stored."""
    async def runner():
        from config import R2_ACCESS_KEY_ID  # type: ignore
        if R2_ACCESS_KEY_ID:
            import pytest
            pytest.skip("R2 is configured; this asserts the unconfigured path")

        lead_id, tok = await _new_lead_with_token()
        cid = await _new_clinic("growth_partner")
        try:
            r = requests.post(
                f"{API_URL}/api/patient-chat/{tok}/clinics/{cid}/files",
                files={"file": ("opg.jpg", b"\xff\xd8\xff" + b"0" * 128, "image/jpeg")},
                timeout=20,
            )
            assert r.status_code == 503, r.text
            async with _mongo() as db:
                assert await db.consultation_files.count_documents({"lead_id": lead_id}) == 0
        finally:
            await _cleanup([lead_id], [cid])

    asyncio.run(runner())


def test_unsupported_file_type_rejected_before_storage():
    async def runner():
        lead_id, tok = await _new_lead_with_token()
        cid = await _new_clinic("growth_partner")
        try:
            r = requests.post(
                f"{API_URL}/api/patient-chat/{tok}/clinics/{cid}/files",
                files={"file": ("notes.exe", b"MZ\x90\x00", "application/x-msdownload")},
                timeout=20,
            )
            assert r.status_code == 400, r.text
            assert r.json()["detail"]["code"] == "unsupported_file_type"
        finally:
            await _cleanup([lead_id], [cid])

    asyncio.run(runner())
