"""Authentication helpers (P2 — Batch E1: cookie-or-Bearer support).

E1 contract:
- Bearer header support is fully preserved. Header takes precedence over cookie.
- httpOnly cookies are accepted as an alternative credential source. Admin
  routes accept the admin cookie ONLY; clinic routes accept the clinic cookie
  ONLY. Cross-cookie use is rejected with the same role error as before.
- When authentication originates from a cookie AND the request is a
  state-changing method (POST/PUT/PATCH/DELETE), an Origin/Referer check
  is enforced. Bearer-authenticated requests bypass the CSRF guard so the
  existing frontend continues to work unchanged.
- `AUTH_REQUIRE_COOKIE` is read but NOT enforced in E1 (reserved for E4).
"""
from __future__ import annotations

import re
from typing import Optional
from urllib.parse import urlparse

import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import (
    JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS,
    AUTH_COOKIE_NAME_ADMIN, AUTH_COOKIE_NAME_CLINIC,
)
from database import db
from schemas import AdminUser

# auto_error=False so we can fall back to a cookie when the header is absent.
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: str, username: str) -> str:
    payload = {"sub": user_id, "username": username, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_clinic_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": "clinic",
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ── CSRF / Origin guard (P2 E1) ───────────────────────────────────

_UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Preview hosts already trusted by the CORS layer.
_PREVIEW_HOST_RE = re.compile(r"^[a-z0-9-]+\.preview\.emergentagent\.com$", re.IGNORECASE)


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

    Order:
      1. If `Authorization: Bearer` header is present, use it. CSRF bypassed.
      2. Else if `zubite_admin_session` cookie is present, use it. CSRF enforced
         on state-changing methods.
      3. Else 401.

    Clinic-role tokens are rejected with 403 regardless of source.
    The clinic cookie is NEVER consulted here.
    """
    via_cookie = False
    token: Optional[str] = None

    if credentials is not None and credentials.credentials:
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

    if via_cookie:
        await _enforce_csrf_for_cookie_auth(request, actor_type="admin")

    return AdminUser(id=payload.get("sub"), username=payload.get("username"))


async def get_current_clinic(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Clinic auth dependency.

    Same precedence as admin. Admin tokens / admin cookies are rejected.
    """
    via_cookie = False
    token: Optional[str] = None

    if credentials is not None and credentials.credentials:
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

    clinic = await db.clinics.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not clinic:
        raise HTTPException(status_code=401, detail="Clinic not found")
    if clinic.get("status") == "paused":
        raise HTTPException(status_code=403, detail="Account is paused")

    if via_cookie:
        await _enforce_csrf_for_cookie_auth(request, actor_type="clinic")

    return clinic
