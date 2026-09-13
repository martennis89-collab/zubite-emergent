"""Periodic auth_sessions cleanup (delete_stale_auth_sessions).

Nothing previously deleted a row from `auth_sessions` — `create_token`/
`create_clinic_token` insert one on every login, and the only existing
cleanup (`cleanup_expired_auth_sessions`, wired to an admin-only manual
endpoint) soft-revokes rows rather than removing them. A single
dev-testing session accumulated 9 rows for one clinic this way, which is
what `routers/public_clinics.py::_compute_online_clinic_ids` had to
defend against (see test_chat_presence.py's truncation regression test).

Covers:
- Expired-and-never-revoked rows are deleted regardless of grace period.
- Revoked rows are deleted only once past the retention window.
- A valid, unrevoked, unexpired row always survives.
- A revoked row still within the retention window survives.
"""

from __future__ import annotations
import os
import asyncio
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone as _tz

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


async def _insert_session(clinic_id: str, *, expires_at, revoked_at) -> str:
    now = datetime.now(_tz.utc)
    jti = str(uuid.uuid4())
    async with _mongo() as db:
        await db.auth_sessions.insert_one({
            "id": str(uuid.uuid4()), "user_id": clinic_id, "user_type": "clinic",
            "jti": jti, "created_at": now.isoformat(), "last_seen_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "revoked_at": revoked_at.isoformat() if revoked_at else None,
            "revoked_reason": "test" if revoked_at else None,
        })
    return jti


async def _exists(jti: str) -> bool:
    async with _mongo() as db:
        return bool(await db.auth_sessions.find_one({"jti": jti}, {"_id": 0}))


def test_delete_stale_auth_sessions():
    """Both scenarios share one `asyncio.run()` call deliberately:
    `delete_stale_auth_sessions` reads `database.db`, the module-global
    Motor client that binds to whichever event loop touches it first (see
    test_orientation_settings.py for the full story) — a second,
    separate `asyncio.run()` in this same pytest process would hit
    "Event loop is closed" the moment it touched that already-bound
    client. Splitting this into two `def test_*` functions is exactly
    what would trigger it.
    """
    from auth import delete_stale_auth_sessions  # type: ignore

    async def runner():
        # ── Scenario 1: the four survive/delete combinations ──
        cid = "cleanup-pytest-" + str(uuid.uuid4())[:8]
        now = datetime.now(_tz.utc)
        try:
            expired_never_revoked = await _insert_session(
                cid, expires_at=now - timedelta(hours=1), revoked_at=None,
            )
            revoked_past_retention = await _insert_session(
                cid, expires_at=now + timedelta(hours=8),
                revoked_at=now - timedelta(days=45),
            )
            still_valid = await _insert_session(
                cid, expires_at=now + timedelta(hours=8), revoked_at=None,
            )
            revoked_within_retention = await _insert_session(
                cid, expires_at=now + timedelta(hours=8),
                revoked_at=now - timedelta(days=5),
            )

            await delete_stale_auth_sessions()

            assert not await _exists(expired_never_revoked), (
                "an expired-but-never-revoked session must be deleted "
                "with no grace period"
            )
            assert not await _exists(revoked_past_retention), (
                "a session revoked well past the retention window must be deleted"
            )
            assert await _exists(still_valid), (
                "a valid, unrevoked, unexpired session must survive"
            )
            assert await _exists(revoked_within_retention), (
                "a recently revoked session must survive until the "
                "retention window passes"
            )
        finally:
            async with _mongo() as db:
                await db.auth_sessions.delete_many({"user_id": cid})

        # ── Scenario 2: a large batch of stale rows doesn't spill over
        #    onto an unrelated valid session — a plain `$or` delete, not
        #    a truncation-prone `.to_list()` cap like the presence bug
        #    this cleanup exists to prevent. ──
        cid2 = "cleanup-pytest-" + str(uuid.uuid4())[:8]
        stale_jtis = []
        try:
            for _ in range(15):
                stale_jtis.append(await _insert_session(
                    cid2, expires_at=now - timedelta(days=1), revoked_at=None,
                ))
            valid = await _insert_session(
                cid2, expires_at=now + timedelta(hours=8), revoked_at=None,
            )

            deleted = await delete_stale_auth_sessions()
            assert deleted >= 15

            for jti in stale_jtis:
                assert not await _exists(jti)
            assert await _exists(valid)
        finally:
            async with _mongo() as db:
                await db.auth_sessions.delete_many({"user_id": cid2})

    asyncio.run(runner())
