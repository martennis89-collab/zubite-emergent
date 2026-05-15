"""Phase 3 — Batch D3: admin audit-logs read API.

Single endpoint:
    GET /api/admin/audit-logs

Admin auth only (clinic JWTs rejected). Paginated, filtered, rate-limited,
with defensive read-side masking. NO UI / NO CSV export in this batch.
"""
from __future__ import annotations

from datetime import datetime, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from database import db
from schemas import AdminUser
from auth import get_current_user
from rate_limit import rate_limit
from audit import (
    ACTOR_TYPES,
    SEVERITY_VALUES,
    mask_for_read,
)

router = APIRouter()


def _parse_iso_date(value: Optional[str], *, end_of_day: bool = False) -> Optional[str]:
    """Parse YYYY-MM-DD (or full ISO) and return an ISO-formatted string.

    Audit `created_at` is stored as ISO strings, so we compare strings — works
    because ISO-8601 is lexicographically ordered.

    `end_of_day=True` pins to `T23:59:59.999999` so `date_to` is inclusive.
    """
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise HTTPException(status_code=400, detail="Invalid date format")
    raw = value.strip()
    try:
        # Accept either "YYYY-MM-DD" or full ISO timestamps.
        if len(raw) == 10:
            d = datetime.strptime(raw, "%Y-%m-%d").date()
            dt = datetime.combine(
                d, time.max if end_of_day else time.min,
            )
        else:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date: {raw!r}")
    return dt.isoformat()


@router.get(
    "/admin/audit-logs",
    dependencies=[Depends(rate_limit("admin_audit_logs_read", 30, 60))],
)
async def list_audit_logs(
    request: Request,
    action: Optional[str] = Query(default=None, max_length=200),
    actor_id: Optional[str] = Query(default=None, max_length=200),
    actor_type: Optional[str] = Query(default=None, max_length=20),
    target_type: Optional[str] = Query(default=None, max_length=80),
    target_id: Optional[str] = Query(default=None, max_length=200),
    severity: Optional[str] = Query(default=None, max_length=20),
    date_from: Optional[str] = Query(default=None, max_length=40),
    date_to: Optional[str] = Query(default=None, max_length=40),
    limit: int = Query(default=50, ge=1),
    skip: int = Query(default=0, ge=0),
    user: AdminUser = Depends(get_current_user),  # noqa: ARG001 — auth gate
):
    # Enum-style validation (returns 400, never 422, per spec).
    if actor_type is not None and actor_type not in ACTOR_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid actor_type: {actor_type!r}")
    if severity is not None and severity not in SEVERITY_VALUES:
        raise HTTPException(status_code=400, detail=f"Invalid severity: {severity!r}")

    # Clamp limit to the documented maximum.
    effective_limit = min(max(limit, 1), 200)

    # Build the Mongo filter — only adds keys for params actually supplied.
    query: dict = {}
    if action is not None and action.strip():
        # Support comma-separated values: action=foo,bar → $in lookup.
        parts = [p.strip() for p in action.split(",") if p.strip()]
        query["action"] = {"$in": parts} if len(parts) > 1 else parts[0]
    if actor_id is not None and actor_id.strip():
        query["actor_id"] = actor_id.strip()
    if actor_type is not None:
        query["actor_type"] = actor_type
    if target_type is not None and target_type.strip():
        query["target_type"] = target_type.strip()
    if target_id is not None and target_id.strip():
        query["target_id"] = target_id.strip()
    if severity is not None:
        query["severity"] = severity

    date_range: dict = {}
    df = _parse_iso_date(date_from, end_of_day=False)
    dt_to = _parse_iso_date(date_to, end_of_day=True)
    if df:
        date_range["$gte"] = df
    if dt_to:
        date_range["$lte"] = dt_to
    if date_range:
        query["created_at"] = date_range

    total = await db.admin_audit_logs.count_documents(query)
    cursor = (
        db.admin_audit_logs
        .find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(effective_limit)
    )
    rows = await cursor.to_list(effective_limit)

    # Defensive read-side mask — strips any secret-shaped or PII-shaped
    # fields that might have leaked into the row through a buggy writer.
    masked = [mask_for_read(r) for r in rows]

    return {
        "total": total,
        "limit": effective_limit,
        "skip": skip,
        "logs": masked,
    }
