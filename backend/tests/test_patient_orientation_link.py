"""
Tests for the patient orientation magic-link endpoint.

Endpoint under test: GET /api/patient-orientation/{access_token}

Contract:
  - 200 + safe patient-facing fields on a valid token.
  - 200 response NEVER contains lead_id, phone, raw email, full name,
    answers, score, attribution, or status fields.
  - 404 (code=token_not_found) on unknown / malformed tokens.
  - 410 (code=token_expired) on expired tokens.
  - access_count increments on every successful lookup.
  - SHA-256 hash is the only thing stored — raw token never persists.

Tokens are minted directly via the DB layer (replicating the production
mint path in `POST /leads/{id}/email-care-pass`) so the test does not
depend on Resend / outbound email.

Implementation note: we avoid pytest-asyncio (not installed). Each test
spins up a fresh asyncio.run() to talk to Motor.
"""
import asyncio
import hashlib
import os
import secrets
import time
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


def _unique_xff() -> str:
    return f"198.51.100.{(int(time.time() * 1000) + secrets.randbelow(200)) % 250 + 1}"


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


async def _get_db():
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]


def _create_lead_sync() -> str:
    headers = {"X-Forwarded-For": _unique_xff()}
    payload = {
        "city_slug": "sofia",
        "treatment_type": "orthodontics",
        "answers": {"segment": "adult"},
        "name": f"Тест {uuid.uuid4().hex[:6]}",
        "phone": "+359888112233",
        "email": f"u{uuid.uuid4().hex[:8]}@example.bg",
        "consent": True,
        "source": "quiz",
    }
    r = requests.post(f"{BASE_URL}/api/leads", json=payload, headers=headers, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()["id"]


async def _mint_token(lead_id: str, *, expires_in_days: int = 90, revoked: bool = False) -> str:
    db = await _get_db()
    raw = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    now = datetime.now(timezone.utc)
    await db.lead_access_tokens.insert_one({
        "token_hash": token_hash,
        "lead_id": lead_id,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=expires_in_days)).isoformat(),
        "revoked_at": now.isoformat() if revoked else None,
        "last_accessed_at": None,
        "access_count": 0,
    })
    return raw


async def _cleanup_lead_tokens(lead_id: str):
    db = await _get_db()
    await db.lead_access_tokens.delete_many({"lead_id": lead_id})


async def _read_token_row(token: str):
    db = await _get_db()
    return await db.lead_access_tokens.find_one(
        {"token_hash": hashlib.sha256(token.encode()).hexdigest()},
        {"_id": 0},
    )


PRIVATE_FIELDS = (
    "lead_id", "phone", "email", "name", "answers", "score_total",
    "score_breakdown", "assigned_clinic_id", "consent", "utm_source",
    "utm_campaign", "first_utm_source", "latest_utm_source",
    "is_potential_duplicate", "duplicate_reason", "possible_duplicate_lead_id",
    "notes",
)


def test_valid_token_returns_safe_payload():
    lead_id = _create_lead_sync()
    token = _run(_mint_token(lead_id))
    try:
        r = requests.get(
            f"{BASE_URL}/api/patient-orientation/{token}",
            headers={"X-Forwarded-For": _unique_xff()},
            timeout=10,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert "band" in data
        for k in PRIVATE_FIELDS:
            assert k not in data, f"Private field '{k}' leaked into payload: {data}"
    finally:
        _run(_cleanup_lead_tokens(lead_id))


def test_access_count_increments():
    lead_id = _create_lead_sync()
    token = _run(_mint_token(lead_id))
    try:
        for _ in range(3):
            r = requests.get(
                f"{BASE_URL}/api/patient-orientation/{token}",
                headers={"X-Forwarded-For": _unique_xff()},
                timeout=10,
            )
            assert r.status_code == 200
        rec = _run(_read_token_row(token))
        assert rec is not None
        assert rec["access_count"] == 3
        assert rec["last_accessed_at"] is not None
    finally:
        _run(_cleanup_lead_tokens(lead_id))


def test_unknown_token_returns_404():
    bogus = secrets.token_urlsafe(32)
    r = requests.get(
        f"{BASE_URL}/api/patient-orientation/{bogus}",
        headers={"X-Forwarded-For": _unique_xff()},
        timeout=10,
    )
    assert r.status_code == 404, r.text
    assert r.json()["detail"]["code"] == "token_not_found"


def test_short_token_returns_404():
    r = requests.get(
        f"{BASE_URL}/api/patient-orientation/abc",
        headers={"X-Forwarded-For": _unique_xff()},
        timeout=10,
    )
    assert r.status_code == 404, r.text
    assert r.json()["detail"]["code"] == "token_not_found"


def test_expired_token_returns_410():
    lead_id = _create_lead_sync()
    token = _run(_mint_token(lead_id, expires_in_days=-1))
    try:
        r = requests.get(
            f"{BASE_URL}/api/patient-orientation/{token}",
            headers={"X-Forwarded-For": _unique_xff()},
            timeout=10,
        )
        assert r.status_code == 410, r.text
        assert r.json()["detail"]["code"] == "token_expired"
    finally:
        _run(_cleanup_lead_tokens(lead_id))


def test_revoked_token_returns_404():
    lead_id = _create_lead_sync()
    token = _run(_mint_token(lead_id, revoked=True))
    try:
        r = requests.get(
            f"{BASE_URL}/api/patient-orientation/{token}",
            headers={"X-Forwarded-For": _unique_xff()},
            timeout=10,
        )
        assert r.status_code == 404, r.text
        assert r.json()["detail"]["code"] == "token_revoked"
    finally:
        _run(_cleanup_lead_tokens(lead_id))


def test_save_by_email_persists_only_hashed_token():
    """E2E: POST /email-care-pass mints a token row keyed by the lead.
    Only the hash is persisted — no raw token / no copy of lead PII."""
    lead_id = _create_lead_sync()
    r = requests.post(
        f"{BASE_URL}/api/leads/{lead_id}/email-care-pass",
        json={"email": "patient@example.bg", "consent_to_email": True},
        headers={"X-Forwarded-For": _unique_xff()},
        timeout=10,
    )
    if r.status_code == 429:
        pytest.skip("rate-limit hit on shared bucket")
    assert r.status_code == 200, r.text

    async def _check():
        db = await _get_db()
        rec = await db.lead_access_tokens.find_one({"lead_id": lead_id}, {"_id": 0})
        assert rec is not None
        # Only the hash; no raw token / phone / email persisted.
        assert "token_hash" in rec
        assert "token" not in rec
        assert "phone" not in rec
        assert "email" not in rec
        # 64-char hex SHA-256 digest.
        assert len(rec["token_hash"]) == 64
        assert all(c in "0123456789abcdef" for c in rec["token_hash"])
        # Expiry within a reasonable window (≤91 days).
        exp = datetime.fromisoformat(rec["expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        delta = (exp - datetime.now(timezone.utc)).days
        assert 80 <= delta <= 95
        await db.lead_access_tokens.delete_many({"lead_id": lead_id})
    _run(_check())
