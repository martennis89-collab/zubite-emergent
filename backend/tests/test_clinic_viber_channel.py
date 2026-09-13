"""Viber chat channel — clinic settings + public exposure.

Covers:
- phone_utils.normalize_msisdn_bg (pure)
- PATCH /api/clinic/profile Viber rules: package gate, E.164 normalisation,
  enable-requires-a-number
- The public payload only publishes the number when entitled AND enabled
"""

from __future__ import annotations
import os
import asyncio
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone as _tz
import requests

API_URL = os.environ.get("API_URL", "http://localhost:8001")


@asynccontextmanager
async def _mongo():
    """Motor binds its client to the loop that first uses it and each test
    runs its own `asyncio.run`; see test_orientation_settings for the full
    story. Open a loop-local client instead of `database.db`."""
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
            "id": cid,
            "clinic_name": f"Viber-Test {cid[:6]}",
            "city": "София",
            "city_slug": "sofia",
            "email": f"viber-{cid[:8]}@example.bg",
            "phone": "+359888000000",
            "base_package": base_package,
            "clinic_status": "active_partner",
            "subscription_status": "active",
            "status": "active",
            "password_hash": "x",
            "is_active": True,
            "created_at": "2026-07-01T00:00:00+00:00",
            "updated_at": "2026-07-01T00:00:00+00:00",
        })
    return cid


async def _drop_clinic(cid: str) -> None:
    async with _mongo() as db:
        await db.clinics.delete_one({"id": cid})
        await db.auth_sessions.delete_many({"user_id": cid})


async def _clinic_token(cid: str) -> str:
    """Mint a clinic session directly — /clinic/login is rate-limited to
    5/300s and these tests need several clinics."""
    import jwt  # type: ignore
    from auth import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS  # type: ignore

    jti = str(uuid.uuid4())
    now = datetime.now(_tz.utc)
    exp = now + timedelta(hours=JWT_EXPIRATION_HOURS)
    token = jwt.encode(
        {"sub": cid, "email": f"viber-{cid[:8]}@example.bg", "role": "clinic",
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
    return token


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ─── Pure normalisation ───────────────────────────────────

def test_normalize_msisdn_bg():
    from phone_utils import normalize_msisdn_bg as n  # type: ignore

    # The platform stores phones permissively; a deep link cannot.
    assert n("+359 88 123 4567") == "+359881234567"
    assert n("00359881234567") == "+359881234567"
    assert n("0888 123 456") == "+359888123456"
    assert n("359881234567") == "+359881234567"
    assert n("888 123 456") == "+359888123456"
    assert n("(02) 123-4567") == "+35921234567"
    # A foreign Viber account must not be silently rejected.
    assert n("+44 20 7946 0958") == "+442079460958"
    for junk in ("", "   ", "abc", "123", "+1", None):
        assert n(junk) is None, junk


# ─── Clinic settings endpoint ─────────────────────────────

def test_growth_clinic_can_set_and_enable_viber():
    async def runner():
        cid = await _new_clinic("growth_partner")
        try:
            h = _h(await _clinic_token(cid))
            url = f"{API_URL}/api/clinic/profile"

            # Enabling before a number exists has nothing to point at.
            r = requests.patch(url, headers=h, json={"viber_enabled": True}, timeout=10)
            assert r.status_code == 400, r.text
            assert r.json()["detail"]["code"] == "viber_phone_required"

            # Free-text in, E.164 stored.
            r = requests.patch(url, headers=h, json={"viber_phone": "0888 123 456"}, timeout=10)
            assert r.status_code == 200, r.text
            assert r.json()["viber_phone"] == "+359888123456"
            # Storing a number must not silently switch the channel on.
            assert r.json()["viber_enabled"] is False

            r = requests.patch(url, headers=h, json={"viber_enabled": True}, timeout=10)
            assert r.status_code == 200, r.text
            assert r.json()["viber_enabled"] is True

            r = requests.get(url, headers=h, timeout=10)
            assert r.json()["viber_phone"] == "+359888123456"
            assert r.json()["viber_enabled"] is True
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


def test_unparseable_viber_number_rejected():
    async def runner():
        cid = await _new_clinic("growth_partner")
        try:
            h = _h(await _clinic_token(cid))
            r = requests.patch(
                f"{API_URL}/api/clinic/profile", headers=h,
                json={"viber_phone": "обадете ми се"}, timeout=10,
            )
            assert r.status_code == 400, r.text
            assert r.json()["detail"]["code"] == "invalid_viber_phone"
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


def test_verified_clinic_cannot_enable_viber():
    """The channel is part of the Growth package — a Verified profile must
    not be able to switch it on by POSTing the flag directly."""
    async def runner():
        cid = await _new_clinic("verified_profile")
        try:
            h = _h(await _clinic_token(cid))
            r = requests.patch(
                f"{API_URL}/api/clinic/profile", headers=h,
                json={"viber_enabled": True, "viber_phone": "0888 123 456"}, timeout=10,
            )
            assert r.status_code == 403, r.text
            assert r.json()["detail"]["code"] == "chat_channels_not_in_package"

            async with _mongo() as db:
                doc = await db.clinics.find_one({"id": cid}, {"_id": 0})
            assert not doc.get("viber_enabled")
            assert not doc.get("viber_phone")
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


def test_non_viber_profile_edit_still_works():
    """The Viber gate must not block the rest of the endpoint."""
    async def runner():
        cid = await _new_clinic("verified_profile")
        try:
            h = _h(await _clinic_token(cid))
            r = requests.patch(
                f"{API_URL}/api/clinic/profile", headers=h,
                json={"website": "https://example.bg"}, timeout=10,
            )
            assert r.status_code == 200, r.text
            assert r.json()["website"] == "https://example.bg"
        finally:
            await _drop_clinic(cid)

    asyncio.run(runner())


# ─── Public exposure ──────────────────────────────────────

def test_public_payload_publishes_viber_only_when_earned_and_on():
    from routers.public_clinics import _public_viber_phone  # type: ignore

    on = {"viber_enabled": True, "viber_phone": "+359888123456"}
    assert _public_viber_phone({**on, "base_package": "growth_partner"}) == "+359888123456"
    # Entitled but switched off.
    assert _public_viber_phone({**on, "viber_enabled": False, "base_package": "growth_partner"}) is None
    # Switched on but not entitled — e.g. a downgrade after enabling. The
    # number must stop publishing without anyone editing the clinic doc.
    assert _public_viber_phone({**on, "base_package": "verified_profile"}) is None
    # Enabled with no number stored.
    assert _public_viber_phone({"viber_enabled": True, "base_package": "growth_partner"}) is None


def test_public_entitlements_expose_patient_chat_channels():
    """The results-page chat CTA gates on `entitlements.patient_chat_channels`
    — independent of the Viber number, since a clinic can offer in-platform
    chat without configuring Viber at all."""
    async def runner():
        growth = await _new_clinic("growth_partner")
        verified = await _new_clinic("verified_profile")
        try:
            r = requests.get(f"{API_URL}/api/public/clinics/{growth}", timeout=10)
            assert r.status_code == 200, r.text
            assert r.json()["entitlements"]["patient_chat_channels"] is True

            r = requests.get(f"{API_URL}/api/public/clinics/{verified}", timeout=10)
            assert r.status_code == 200, r.text
            assert r.json()["entitlements"]["patient_chat_channels"] is False
        finally:
            await _drop_clinic(growth)
            await _drop_clinic(verified)

    asyncio.run(runner())
