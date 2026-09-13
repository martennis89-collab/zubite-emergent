"""Chat presence ("Онлайн сега" / "Приема онлайн консултации").

Covers:
- None for a non-entitled (Verified) clinic regardless of session activity
- 'accepting' for a Growth clinic with no recent session
- 'online' for a Growth clinic active within the 15-minute window
- 'accepting' once that session goes stale past the window
- Regression: a clinic with a large backlog of expired/old sessions must
  still resolve correctly — a fixed-size, unsorted `.to_list()` cap
  silently dropped the one fresh row in the first version of this code.
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
            "id": cid, "clinic_name": f"Presence-Test {cid[:6]}", "city": "София",
            "city_slug": "sofia", "email": f"presence-{cid[:8]}@example.bg",
            "phone": "+359888000000", "base_package": base_package,
            "clinic_status": "active_partner", "subscription_status": "active",
            "status": "active", "password_hash": "x", "is_active": True,
            "created_at": "2026-07-01T00:00:00+00:00",
            "updated_at": "2026-07-01T00:00:00+00:00",
        })
    return cid


async def _add_session(clinic_id: str, *, minutes_ago: float, revoked: bool = False, expired: bool = False):
    now = datetime.now(_tz.utc)
    async with _mongo() as db:
        await db.auth_sessions.insert_one({
            "id": str(uuid.uuid4()), "user_id": clinic_id, "user_type": "clinic",
            "jti": str(uuid.uuid4()), "created_at": now.isoformat(),
            "last_seen_at": (now - timedelta(minutes=minutes_ago)).isoformat(),
            "expires_at": (now - timedelta(hours=1) if expired else now + timedelta(hours=8)).isoformat(),
            "revoked_at": now.isoformat() if revoked else None,
            "revoked_reason": "test" if revoked else None,
        })


async def _cleanup(clinic_id: str):
    async with _mongo() as db:
        await db.clinics.delete_one({"id": clinic_id})
        await db.auth_sessions.delete_many({"user_id": clinic_id})


def test_not_entitled_clinic_has_no_presence():
    async def runner():
        cid = await _new_clinic("verified_profile")
        try:
            await _add_session(cid, minutes_ago=1)
            r = requests.get(f"{API_URL}/api/public/clinics/{cid}", timeout=10)
            assert r.status_code == 200, r.text
            assert r.json()["chat_presence"] is None
        finally:
            await _cleanup(cid)

    asyncio.run(runner())


def test_entitled_clinic_with_no_session_is_accepting():
    async def runner():
        cid = await _new_clinic("growth_partner")
        try:
            r = requests.get(f"{API_URL}/api/public/clinics/{cid}", timeout=10)
            assert r.status_code == 200, r.text
            assert r.json()["chat_presence"] == "accepting"
        finally:
            await _cleanup(cid)

    asyncio.run(runner())


def test_entitled_clinic_with_fresh_session_is_online():
    async def runner():
        cid = await _new_clinic("growth_partner")
        try:
            await _add_session(cid, minutes_ago=2)
            r = requests.get(f"{API_URL}/api/public/clinics/{cid}", timeout=10)
            assert r.status_code == 200, r.text
            assert r.json()["chat_presence"] == "online"
        finally:
            await _cleanup(cid)

    asyncio.run(runner())


def test_stale_session_falls_back_to_accepting():
    async def runner():
        cid = await _new_clinic("growth_partner")
        try:
            await _add_session(cid, minutes_ago=25)  # past the 15-min window
            r = requests.get(f"{API_URL}/api/public/clinics/{cid}", timeout=10)
            assert r.status_code == 200, r.text
            assert r.json()["chat_presence"] == "accepting"
        finally:
            await _cleanup(cid)

    asyncio.run(runner())


def test_revoked_session_does_not_count():
    async def runner():
        cid = await _new_clinic("growth_partner")
        try:
            await _add_session(cid, minutes_ago=1, revoked=True)
            r = requests.get(f"{API_URL}/api/public/clinics/{cid}", timeout=10)
            assert r.status_code == 200, r.text
            assert r.json()["chat_presence"] == "accepting"
        finally:
            await _cleanup(cid)

    asyncio.run(runner())


def test_large_backlog_of_old_sessions_does_not_hide_the_fresh_one():
    """Regression for the truncation bug: `.to_list()` with no sort and a
    small fixed cap could silently drop the one relevant row once a
    clinic accumulates enough historical sessions. Insert far more expired
    rows than any old cap would have allowed, then confirm the one fresh
    session still resolves the clinic as online."""
    async def runner():
        cid = await _new_clinic("growth_partner")
        try:
            for _ in range(20):
                await _add_session(cid, minutes_ago=60 * 24, expired=True)
            await _add_session(cid, minutes_ago=1)
            r = requests.get(f"{API_URL}/api/public/clinics/{cid}", timeout=10)
            assert r.status_code == 200, r.text
            assert r.json()["chat_presence"] == "online", (
                "a fresh session was hidden by a backlog of old ones"
            )
        finally:
            await _cleanup(cid)

    asyncio.run(runner())


def test_listing_page_batches_presence_without_per_row_query():
    """Same guarantee via the /public/clinics listing endpoint, which
    computes presence for the whole page in one query, not per card."""
    async def runner():
        online_cid = await _new_clinic("growth_partner")
        quiet_cid = await _new_clinic("growth_partner")
        try:
            await _add_session(online_cid, minutes_ago=1)
            r = requests.get(f"{API_URL}/api/public/clinics?city=sofia", timeout=10)
            assert r.status_code == 200, r.text
            by_id = {c["id"]: c for c in r.json()["clinics"]}
            assert by_id[online_cid]["chat_presence"] == "online"
            assert by_id[quiet_cid]["chat_presence"] == "accepting"
        finally:
            await _cleanup(online_cid)
            await _cleanup(quiet_cid)

    asyncio.run(runner())
