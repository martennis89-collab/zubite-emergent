"""Authentication helpers (P2 — Batch E1: cookie-or-Bearer support;
P5 — Batch E5: server-side auth_sessions governance).

E5 contract (Feb 2026):
- Every newly issued admin/clinic JWT carries a `jti` (UUID) AND a
  matching row is created in the `auth_sessions` Mongo collection.
- `get_current_user` / `get_current_clinic` look up the session by
  `jti` on every protected request and reject:
    • tokens without `jti`            (legacy pre-E5 tokens)
    • sessions that don't exist
    • sessions with `revoked_at` set
    • sessions whose `expires_at` is past
    • sessions whose `user_type` doesn't match the route
    • sessions whose `user_id` doesn't match the JWT's sub
- `last_seen_at` is refreshed at most once every 60s (cheap).
- `/api/admin/logout` and `/api/clinic/logout` revoke the current jti
  in addition to clearing the cookie.
- `/api/admin/logout-all` and `/api/clinic/logout-all` revoke every
  active session for the current user_id+user_type.

E1 contract (preserved):
- Bearer header support is fully preserved. Header takes precedence
  over cookie. Cookie auth still triggers the CSRF origin guard for
  state-changing methods.
"""
from __future__ import annotations

import re
import os as _os
import uuid
import asyncio
from typing import Optional, Tuple
from urllib.parse import urlparse

import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import (
    JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS,
    AUTH_COOKIE_NAME_ADMIN, AUTH_COOKIE_NAME_CLINIC, AUTH_COOKIE_NAME_PATIENT,
    logger,
)
from database import db
from schemas import AdminUser

# auto_error=False so we can fall back to a cookie when the header is absent.
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── E5: server-side session machinery ────────────────────────────

# How often last_seen_at is refreshed on protected reads (seconds).
_LAST_SEEN_DEBOUNCE_SECONDS = 60

# How long a revoked session row is kept before the cleanup loop deletes
# it — a brief audit window, not a permanent record (see audit_log for
# that). Expired-but-never-revoked rows (a session nobody explicitly
# logged out of) have no such grace period: once `expires_at` has
# passed, the row was never valid again, so it's deleted on the next
# sweep regardless of how it got there.
_REVOKED_SESSION_RETENTION_DAYS = 30


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


async def _create_auth_session(
    *,
    user_id: str,
    user_type: str,
    jti: str,
    expires_at: datetime,
) -> None:
    """Insert a new active auth_sessions row.

    Stored fields are minimal — no raw IP/UA — to stay aligned with the
    privacy posture used elsewhere in the app. Existing test envs that
    don't have the collection just get one created on first insert."""
    now = _now_utc()
    await db.auth_sessions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_type": user_type,        # "admin" | "clinic"
        "jti": jti,
        "created_at": now.isoformat(),
        "last_seen_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "revoked_at": None,
        "revoked_reason": None,
    })


async def _validate_auth_session(
    *, jti: Optional[str], user_id: str, user_type: str,
) -> dict:
    """Look up the session bound to this jti and enforce all gates.
    Returns the session document on success."""
    if not jti or not isinstance(jti, str):
        # Legacy pre-E5 tokens have no jti — reject. Users re-login.
        raise HTTPException(status_code=401, detail="Session required")
    session = await db.auth_sessions.find_one(
        {"jti": jti}, {"_id": 0},
    )
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")
    if session.get("revoked_at"):
        raise HTTPException(status_code=401, detail="Session revoked")
    exp = session.get("expires_at")
    try:
        exp_dt = datetime.fromisoformat(exp) if isinstance(exp, str) else exp
    except Exception:
        exp_dt = None
    if exp_dt is None or exp_dt < _now_utc():
        raise HTTPException(status_code=401, detail="Session expired")
    if session.get("user_type") != user_type:
        # Cross-role token reuse — never allowed even if the jti exists.
        raise HTTPException(status_code=403, detail="Wrong session type")
    if session.get("user_id") != user_id:
        raise HTTPException(status_code=401, detail="Session mismatch")
    # Cheap last_seen_at refresh (debounced).
    last_seen = session.get("last_seen_at")
    try:
        last_seen_dt = datetime.fromisoformat(last_seen) if isinstance(last_seen, str) else None
    except Exception:
        last_seen_dt = None
    if (
        last_seen_dt is None
        or (_now_utc() - last_seen_dt).total_seconds() > _LAST_SEEN_DEBOUNCE_SECONDS
    ):
        await db.auth_sessions.update_one(
            {"jti": jti},
            {"$set": {"last_seen_at": _now_utc().isoformat()}},
        )
    return session


async def revoke_session_by_jti(jti: str, *, reason: str = "logout") -> bool:
    """Revoke a single session. Idempotent — re-revoking is a no-op
    that still returns True so callers don't have to special-case it."""
    if not jti:
        return False
    res = await db.auth_sessions.update_one(
        {"jti": jti, "revoked_at": None},
        {"$set": {
            "revoked_at": _now_utc().isoformat(),
            "revoked_reason": reason,
        }},
    )
    return res.modified_count > 0


async def revoke_all_sessions_for_user(
    user_id: str, user_type: str, *, reason: str = "logout_all",
) -> int:
    """Revoke every still-active session belonging to (user_id, user_type)."""
    res = await db.auth_sessions.update_many(
        {"user_id": user_id, "user_type": user_type, "revoked_at": None},
        {"$set": {
            "revoked_at": _now_utc().isoformat(),
            "revoked_reason": reason,
        }},
    )
    return res.modified_count


async def cleanup_expired_auth_sessions() -> int:
    """Mark sessions whose expires_at has passed as revoked. Deletion is
    intentionally avoided so audit-style queries can still see them."""
    now = _now_utc().isoformat()
    res = await db.auth_sessions.update_many(
        {"revoked_at": None, "expires_at": {"$lt": now}},
        {"$set": {"revoked_at": now, "revoked_reason": "expired"}},
    )
    return res.modified_count


async def delete_stale_auth_sessions() -> int:
    """Permanently remove rows the soft-revoke step above deliberately
    leaves behind — nothing else does. `create_token`/`create_clinic_token`
    insert a fresh row on every login and nothing ever deleted one, so a
    clinic that logs in daily accumulates one row forever; a single
    dev-testing session already produced 8 rows for one clinic (see
    `routers/public_clinics.py::_compute_online_clinic_ids`, which has to
    defend against exactly this backlog when computing chat presence).

    Two independent delete conditions — a session can qualify via either
    without ever having gone through the soft-revoke step:
      - `expires_at` has passed. An expired session was never valid
        again the moment it expired, revoked or not, so there is no
        grace period here.
      - `revoked_at` is set and older than `_REVOKED_SESSION_RETENTION_DAYS`
        — a short audit window, not a security boundary (revoked already
        means unusable; `_validate_auth_session` checks that in Python
        regardless of whether this row still physically exists).

    A straight Mongo string-range query on the ISO timestamps is fine
    here, unlike the presence window in `_compute_online_clinic_ids`:
    the retention margins are hours/days wide, so the microsecond-
    formatting quirk that made a Python-side parse necessary there
    (`datetime.isoformat()` drops the fraction when it's exactly zero)
    cannot flip a result that isn't already within a fraction of a
    second of the boundary — inconsequential for a garbage sweep.
    """
    now_iso = _now_utc().isoformat()
    revoked_cutoff_iso = (
        _now_utc() - timedelta(days=_REVOKED_SESSION_RETENTION_DAYS)
    ).isoformat()
    res = await db.auth_sessions.delete_many({
        "$or": [
            {"expires_at": {"$lt": now_iso}},
            {"revoked_at": {"$ne": None, "$lt": revoked_cutoff_iso}},
        ],
    })
    return res.deleted_count


_AUTH_SESSION_CLEANUP_LOOP_STARTED = False


async def auth_session_cleanup_loop(interval_seconds: int = 21600) -> None:
    """Background: every `interval_seconds` (default 6h), delete stale
    auth_sessions rows. Started once at app boot — see server.py."""
    global _AUTH_SESSION_CLEANUP_LOOP_STARTED
    if _AUTH_SESSION_CLEANUP_LOOP_STARTED:
        return
    _AUTH_SESSION_CLEANUP_LOOP_STARTED = True
    logger.info(f"[auth-session-cleanup] started; interval={interval_seconds}s")
    while True:
        try:
            n = await delete_stale_auth_sessions()
            if n:
                logger.info(f"[auth-session-cleanup] removed {n} stale session(s)")
        except Exception as exc:
            logger.warning(f"[auth-session-cleanup] iteration error: {exc}")
        await asyncio.sleep(interval_seconds)


async def create_token(user_id: str, username: str) -> Tuple[str, str]:
    """Issue an admin JWT and persist the matching auth_sessions row.
    Returns (token, jti)."""
    jti = str(uuid.uuid4())
    expires_at = _now_utc() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "username": username,
        "role": "admin",
        "jti": jti,
        "iat": int(_now_utc().timestamp()),
        "exp": expires_at,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    await _create_auth_session(
        user_id=user_id, user_type="admin", jti=jti, expires_at=expires_at,
    )
    return token, jti


async def create_clinic_token(user_id: str, email: str) -> Tuple[str, str]:
    """Issue a clinic JWT and persist the matching auth_sessions row.
    Returns (token, jti)."""
    jti = str(uuid.uuid4())
    expires_at = _now_utc() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "email": email,
        "role": "clinic",
        "jti": jti,
        "iat": int(_now_utc().timestamp()),
        "exp": expires_at,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    await _create_auth_session(
        user_id=user_id, user_type="clinic", jti=jti, expires_at=expires_at,
    )
    return token, jti


async def create_patient_token(user_id: str, email: str) -> Tuple[str, str]:
    """Issue a patient JWT and persist the matching auth_sessions row.
    Returns (token, jti). Mirrors create_clinic_token; role/user_type='patient'."""
    jti = str(uuid.uuid4())
    expires_at = _now_utc() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "email": email,
        "role": "patient",
        "jti": jti,
        "iat": int(_now_utc().timestamp()),
        "exp": expires_at,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    await _create_auth_session(
        user_id=user_id, user_type="patient", jti=jti, expires_at=expires_at,
    )
    return token, jti


# ── CSRF / Origin guard (P2 E1) ───────────────────────────────────

_UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Preview hosts already trusted by the CORS layer.
# Two patterns are accepted because the preview infrastructure presents the
# request to the backend under either:
#   1. *.preview.emergentagent.com         (legacy preview hostnames)
#   2. *.cluster-N.preview.emergentcf.cloud (ingress-rewritten host in newer
#      preview clusters — same trust boundary, different DNS surface)
_PREVIEW_HOST_RE = re.compile(
    r"^[a-z0-9-]+\.preview\.emergentagent\.com$"
    r"|^[a-z0-9-]+\.cluster-[a-z0-9]+\.preview\.emergentcf\.cloud$",
    re.IGNORECASE,
)


def _allowed_csrf_hosts() -> set[str]:
    """Build the allow-list at call time (reads CORS_ORIGINS env each call so
    tests that mutate env see the change).
    """
    import os as _os
    raw = (_os.environ.get('CORS_ORIGINS') or '').strip()
    hosts: set[str] = set()
    if raw:
        for origin in raw.split(','):
            origin = origin.strip()
            if not origin:
                continue
            try:
                p = urlparse(origin)
                if p.hostname:
                    hosts.add(p.hostname.lower())
            except Exception:
                continue
    # Always include the production domains. Preview hosts handled by regex.
    hosts.update({"zubite.bg", "www.zubite.bg"})
    return hosts


def _origin_host(request: Request) -> Optional[str]:
    """Extract host from Origin header (preferred) or Referer fallback."""
    raw = request.headers.get("origin") or request.headers.get("referer")
    if not raw or not isinstance(raw, str):
        return None
    try:
        p = urlparse(raw.strip())
        return p.hostname.lower() if p.hostname else None
    except Exception:
        return None


def _is_allowed_origin(host: Optional[str]) -> bool:
    if not host:
        return False
    if host in _allowed_csrf_hosts():
        return True
    if _PREVIEW_HOST_RE.match(host):
        return True
    return False


async def _enforce_csrf_for_cookie_auth(request: Request, *, actor_type: str) -> None:
    """If the request is state-changing and was authenticated via cookie,
    require a same-origin Origin/Referer header.

    Emits `auth.csrf_origin_mismatch` (warning) on failure with reason_code +
    safe origin host only. Raises HTTPException(403) to the caller.
    """
    if request.method.upper() not in _UNSAFE_METHODS:
        return
    host = _origin_host(request)
    if _is_allowed_origin(host):
        return
    # Reject. Emit audit lazily to avoid an import cycle at module load.
    try:
        from audit import audit_log  # noqa: WPS433 — intentional lazy import
        reason_code = "missing_origin" if host is None else "disallowed_origin"
        await audit_log(
            "auth.csrf_origin_mismatch",
            actor_type=actor_type if actor_type in {"admin", "clinic"} else "public",
            target_type="system",
            target_id=None,
            metadata={
                "reason_code": reason_code,
                "origin_host": (host[:120] if host else None),
                "method": request.method.upper(),
                "path": str(request.url.path)[:200],
            },
            severity="warning",
            request=request,
        )
    except Exception:
        # Never let audit failure mask the 403.
        pass
    raise HTTPException(status_code=403, detail="CSRF origin check failed")


# ── Token extraction ──────────────────────────────────────────────


def _decode_jwt(token: str) -> dict:
    """Decode a JWT. Raises HTTPException(401) on any decode failure."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── FastAPI dependencies (cookie-or-Bearer) ──────────────────────


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Admin auth dependency.

    Behaviour depends on `AUTH_REQUIRE_COOKIE` (read lazily each call so tests
    can flip the env).

    AUTH_REQUIRE_COOKIE=0 (default — E1/E2/E3 compatibility mode):
      1. If `Authorization: Bearer` header is present, use it. CSRF bypassed.
      2. Else if `zubite_admin_session` cookie is present, use it. CSRF enforced
         on state-changing methods.
      3. Else 401.

    AUTH_REQUIRE_COOKIE=1 (E4 cookie-only mode):
      Authorization header is ignored. Admin cookie is required. CSRF enforced
      on state-changing methods.

    Clinic-role tokens are rejected with 403 regardless of source.
    The clinic cookie is NEVER consulted here.
    """
    import os as _os
    cookie_required = (_os.environ.get('AUTH_REQUIRE_COOKIE', '0') == '1')

    via_cookie = False
    token: Optional[str] = None

    if not cookie_required and credentials is not None and credentials.credentials:
        token = credentials.credentials
    else:
        cookie_val = request.cookies.get(AUTH_COOKIE_NAME_ADMIN)
        if cookie_val:
            token = cookie_val
            via_cookie = True
        else:
            raise HTTPException(status_code=401, detail="Not authenticated")

    payload = _decode_jwt(token)
    if payload.get("role") == "clinic":
        raise HTTPException(status_code=403, detail="Admin access required")

    # E5 — server-side session governance
    await _validate_auth_session(
        jti=payload.get("jti"),
        user_id=payload.get("sub"),
        user_type="admin",
    )

    if via_cookie:
        await _enforce_csrf_for_cookie_auth(request, actor_type="admin")

    return AdminUser(id=payload.get("sub"), username=payload.get("username"))


async def get_current_clinic(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Clinic auth dependency. Same `AUTH_REQUIRE_COOKIE` semantics as admin.

    Admin tokens / admin cookies are rejected.
    """
    import os as _os
    cookie_required = (_os.environ.get('AUTH_REQUIRE_COOKIE', '0') == '1')

    via_cookie = False
    token: Optional[str] = None

    if not cookie_required and credentials is not None and credentials.credentials:
        token = credentials.credentials
    else:
        cookie_val = request.cookies.get(AUTH_COOKIE_NAME_CLINIC)
        if cookie_val:
            token = cookie_val
            via_cookie = True
        else:
            raise HTTPException(status_code=401, detail="Not authenticated")

    payload = _decode_jwt(token)
    if payload.get("role") != "clinic":
        raise HTTPException(status_code=403, detail="Not a clinic user")

    # E5 — server-side session governance
    await _validate_auth_session(
        jti=payload.get("jti"),
        user_id=payload.get("sub"),
        user_type="clinic",
    )

    clinic = await db.clinics.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not clinic:
        raise HTTPException(status_code=401, detail="Clinic not found")
    if clinic.get("status") == "paused":
        raise HTTPException(status_code=403, detail="Account is paused")

    if via_cookie:
        await _enforce_csrf_for_cookie_auth(request, actor_type="clinic")

    return clinic


async def get_current_patient(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Patient auth dependency. Same AUTH_REQUIRE_COOKIE semantics as clinic.

    Admin / clinic tokens are rejected. Returns the patient document
    (without any sensitive fields — patients are OTP-only, no password).
    """
    import os as _os
    cookie_required = (_os.environ.get('AUTH_REQUIRE_COOKIE', '0') == '1')

    via_cookie = False
    token: Optional[str] = None

    if not cookie_required and credentials is not None and credentials.credentials:
        token = credentials.credentials
    else:
        cookie_val = request.cookies.get(AUTH_COOKIE_NAME_PATIENT)
        if cookie_val:
            token = cookie_val
            via_cookie = True
        else:
            raise HTTPException(status_code=401, detail="Not authenticated")

    payload = _decode_jwt(token)
    if payload.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Not a patient user")

    # E5 — server-side session governance
    await _validate_auth_session(
        jti=payload.get("jti"),
        user_id=payload.get("sub"),
        user_type="patient",
    )

    patient = await db.patients.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=401, detail="Patient not found")
    if patient.get("status") == "banned":
        raise HTTPException(status_code=403, detail="Account is disabled")

    if via_cookie:
        await _enforce_csrf_for_cookie_auth(request, actor_type="patient")

    return patient


async def get_current_patient_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Like get_current_patient but returns None instead of raising when the
    caller is not an authenticated patient. Used by public pages that
    personalize when a patient is logged in (browse/read surfaces)."""
    try:
        return await get_current_patient(request, credentials)
    except HTTPException:
        return None
