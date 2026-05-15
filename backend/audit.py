"""Phase 3 — Batch D1: admin audit logging foundation.

Provides a fire-and-forget-safe audit helper that writes sanitised rows to
`db.admin_audit_logs`. NO routers are wired in this batch — only the helper,
the sanitiser, the `diff_fields` builder, and the action allow-list.

Hard invariants:
- `audit_log(...)` NEVER raises to the caller. Audit failures are caught and
  logged via `logger.warning` only.
- Sanitiser is deny-by-default for `before_state`/`after_state` (per
  `target_type` allow-list) and redacts a fixed set of secret-shaped keys
  anywhere in the input.
- Quiz answers, score breakdowns, attribution payloads, call transcripts,
  raw webhook bodies and patient notes are DROPPED, not redacted.
- Toggled by `AUDIT_LOGS_ENABLED` env var (default on). `"0"` disables
  writes; the helper returns immediately.
"""
from __future__ import annotations

import copy
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from fastapi import Request

from database import db
from config import AUDIT_LOGS_ENABLED
from schemas import AdminUser

logger = logging.getLogger("zubite.audit")


# ── Allow-lists & deny-lists ──────────────────────────────────────

# Severity values accepted by audit_log. Defaults to "info".
SEVERITY_VALUES: frozenset[str] = frozenset({"info", "warning", "critical"})

# Actor types. Audit logs may be written for non-authenticated subjects too
# (e.g. a public verification response, a system-triggered background job).
ACTOR_TYPES: frozenset[str] = frozenset({"admin", "clinic", "system", "public"})

# Canonical action keys. Anything else is logged with a warning but STILL
# written — we'd rather have an "unknown" audit line than silently drop one.
ACTION_KEYS: frozenset[str] = frozenset({
    # Lead lifecycle
    "lead.deleted",
    "lead.status_changed",
    "lead.notes_changed",
    "lead.profile_updated",
    "lead.assigned_to_clinic",
    "lead.reassigned_to_clinic",
    "lead.contact_updated_late",
    "lead.exported_csv",
    # Cleanup / reset (Batch B endpoints)
    "cleanup_leads.attempted",
    "cleanup_leads.blocked_majority",
    "cleanup_leads.executed",
    "cleanup_leads.blocked_production",
    "reset_analytics.attempted",
    "reset_analytics.executed",
    "reset_analytics.blocked_production",
    "reset_blog_views.attempted",
    "reset_blog_views.executed",
    "reset_blog_views.blocked_production",
    # Clinic & application admin
    "clinic.created",
    "clinic.updated",
    "clinic.status_changed",
    "clinic.password_reset",
    "clinic.password_regenerated_via_app",
    "clinic_application.approved",
    "clinic_application.rejected",
    "clinic_application.notes_updated",
    # Consultation workflow
    "consultation_request.assigned",
    "consultation_request.reassigned",
    "consultation_request.admin_status_changed",
    "consultation_request.admin_note_added",
    "appointment.cancelled",
    # Verification & calls
    "verification.email_sent",
    "verification.responded",
    "verification.flagged",
    "call.initiated",
    "calls.cleanup_stuck",
    # Content / files
    "blog_post.created",
    "blog_post.updated",
    "blog_post.deleted",
    "file.uploaded",
    "file.deleted",
    # Auth & security
    "auth.admin_login_succeeded",
    "auth.admin_login_failed",
    "auth.clinic_login_failed",
    "auth.clinic_login_blocked_paused",
    "seed.blocked_production",
    "seed.rejected_weak_password",
    "seed.executed",
})


# Keys that, anywhere in the input (deep walk), are replaced with the literal
# string "[REDACTED]". Case-insensitive match.
_REDACT_KEYS: frozenset[str] = frozenset({
    "password", "password_hash", "current_password", "new_password",
    "temporary_password",
    "token", "access_token", "refresh_token", "jwt", "bearer",
    "authorization",
    "api_key", "apikey", "resend_api_key", "twilio_auth_token",
    "elevenlabs_api_key",
    "revalidate_secret", "jwt_secret", "webhook_secret", "signing_secret",
    "verification_token",
    "secret", "secret_key", "private_key",
})

# Keys that, anywhere in the input (deep walk), are DROPPED entirely.
_DROP_KEYS: frozenset[str] = frozenset({
    "answers", "score_breakdown",
    "content_path_before_conversion", "attribution",
    "call_transcript", "call_outcome_json", "call_outcome_summary",
    "raw_webhook_body", "webhook_payload",
    "notes", "admin_notes", "internal_notes",
})

# Per-target allow-list for before_state / after_state. Deny-by-default:
# only the keys in this map survive sanitisation.
_TARGET_ALLOWED_KEYS: dict[str, frozenset[str]] = {
    "lead": frozenset({
        "status", "clinic_lead_status", "verification_status",
        "assigned_clinic_id", "band", "city_slug", "treatment_type",
        "is_potential_duplicate", "duplicate_reason",
    }),
    "consultation_request": frozenset({
        "status", "assigned_clinic_id",
        "treatment_interest", "patient_city",
    }),
    "clinic": frozenset({
        "clinic_name", "city", "status",
        "clinic_status", "subscription_status", "monthly_plan",
    }),
    "clinic_application": frozenset({
        "status", "clinic_name", "city",
    }),
    "blog_post": frozenset({
        "slug", "is_published", "category", "language",
    }),
    "file": frozenset({
        "id", "original_filename", "content_type", "size", "is_deleted",
    }),
    "verification": frozenset({
        "lead_id", "clinic_id", "response", "verification_status",
    }),
    "call": frozenset({
        "lead_id", "call_status", "conversation_id",
    }),
    "system": frozenset({
        "env", "app_env", "reason_code",
    }),
}

# Metadata serialised size cap.
_METADATA_MAX_BYTES = 4 * 1024
_USER_AGENT_MAX_LEN = 200


# ── Sanitiser ─────────────────────────────────────────────────────


def _is_redact_key(key: Any) -> bool:
    return isinstance(key, str) and key.lower() in _REDACT_KEYS


def _is_drop_key(key: Any) -> bool:
    return isinstance(key, str) and key.lower() in _DROP_KEYS


def _walk(value: Any) -> Any:
    """Deep-walk the value:
      - drop any DROP_KEYS entries
      - redact any REDACT_KEYS values to '[REDACTED]'
      - recurse into dicts / lists / tuples
      - leave scalars alone
    Returns a new structure; does NOT mutate the input.
    """
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for k, v in value.items():
            if _is_drop_key(k):
                continue
            if _is_redact_key(k):
                cleaned[k] = "[REDACTED]"
                continue
            cleaned[k] = _walk(v)
        return cleaned
    if isinstance(value, list):
        return [_walk(v) for v in value]
    if isinstance(value, tuple):
        return [_walk(v) for v in value]
    return value


def _sanitize(
    value: Any,
    *,
    target_type: Optional[str] = None,
) -> Any:
    """Public sanitiser.

    If `target_type` is provided AND the value is a dict, additionally apply
    the per-target allow-list AFTER the global walk: any key not in the
    `_TARGET_ALLOWED_KEYS[target_type]` set is dropped.

    Use this with `target_type` for `before_state`/`after_state` to enforce
    deny-by-default.
    """
    walked = _walk(copy.deepcopy(value) if isinstance(value, (dict, list)) else value)
    if target_type and isinstance(walked, dict):
        allowed = _TARGET_ALLOWED_KEYS.get(target_type)
        if allowed is None:
            # Unknown target_type → drop everything (safer than leaking).
            return {}
        return {k: v for k, v in walked.items() if k in allowed}
    return walked


def _sanitize_metadata(value: Any) -> dict[str, Any]:
    """Sanitise metadata via the global walk and enforce a 4 KB cap.

    On overflow, returns `{"_truncated": True}` plus any safely serialisable
    scalar keys we managed to fit. We keep it simple: if the JSON-serialised
    walked dict exceeds the cap, we drop the original content and return only
    the truncated marker. Callers should keep metadata small (counts, flags,
    short reason codes) by design.
    """
    if value is None:
        return {}
    if not isinstance(value, dict):
        return {"_truncated": True}
    walked = _walk(copy.deepcopy(value))
    try:
        encoded = json.dumps(walked, ensure_ascii=False, default=str)
    except Exception:
        return {"_truncated": True}
    if len(encoded.encode("utf-8")) > _METADATA_MAX_BYTES:
        return {"_truncated": True}
    return walked


def _sanitize_summary(value: Optional[str]) -> Optional[str]:
    """`target_summary` is a free-form string. Allow up to 120 chars; strip
    obvious secret-shaped tokens defensively by truncating only — callers are
    responsible for not putting phone/email/transcripts here in the first
    place. The per-target allow-list-on-state already prevents bulk leaks.
    """
    if value is None:
        return None
    if not isinstance(value, str):
        return None
    return value[:120]


# ── Helpers ───────────────────────────────────────────────────────


def diff_fields(
    before: Optional[dict],
    after: Optional[dict],
    keys: Iterable[str],
) -> tuple[dict, dict]:
    """Build minimal (before_state, after_state) pairs containing only the
    keys in `keys` that ACTUALLY changed. Used by callers in D2 to avoid
    flooding the audit row with unchanged fields.
    """
    before = before or {}
    after = after or {}
    b_out: dict[str, Any] = {}
    a_out: dict[str, Any] = {}
    for k in keys:
        b = before.get(k)
        a = after.get(k)
        if b != a:
            b_out[k] = b
            a_out[k] = a
    return b_out, a_out


def _extract_actor(actor: Any) -> tuple[Optional[str], Optional[str]]:
    """Return (actor_id, actor_label) safely from an AdminUser / dict / None.

    NEVER returns password_hash / token / jwt etc. Falls back gracefully.
    """
    if actor is None:
        return None, None
    if isinstance(actor, AdminUser):
        return actor.id, actor.username
    if isinstance(actor, dict):
        # Clinic dicts use 'id' + 'email'; admin dicts use 'id' + 'username'.
        aid = actor.get("id")
        label = actor.get("username") or actor.get("email")
        if isinstance(label, str):
            label = label[:120]
        return (aid if isinstance(aid, str) else None,
                label if isinstance(label, str) else None)
    return None, None


def _extract_request_meta(
    request: Optional[Request],
) -> tuple[Optional[str], Optional[str]]:
    """Pull IP + truncated User-Agent from a request. Never reads cookies or
    Authorization headers. Returns (ip, user_agent) — both Optional[str]."""
    if request is None:
        return None, None
    ip: Optional[str] = None
    ua: Optional[str] = None
    try:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            ip = fwd.split(",")[0].strip() or None
        if not ip and request.client:
            ip = request.client.host
        ua = request.headers.get("user-agent")
        if isinstance(ua, str):
            ua = ua[:_USER_AGENT_MAX_LEN]
    except Exception:
        pass
    return ip, ua


# ── Main entry point ──────────────────────────────────────────────


async def audit_log(
    action: str,
    *,
    actor: Any = None,
    actor_type: str = "admin",
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    target_summary: Optional[str] = None,
    before_state: Optional[dict] = None,
    after_state: Optional[dict] = None,
    metadata: Optional[dict] = None,
    severity: str = "info",
    request: Optional[Request] = None,
) -> None:
    """Write a sanitised audit row to `db.admin_audit_logs`.

    Contract:
      - NEVER raises to the caller. All exceptions are caught and logged
        via `logger.warning`. Calling code MUST be able to ignore this
        function's result entirely.
      - Honours the `AUDIT_LOGS_ENABLED` flag (defaults to enabled).
      - Sanitises before_state / after_state with the per-target allow-list,
        metadata with the global walker, target_summary with a length cap.
      - Unknown action keys are logged as `unknown_audit_action=…` but the
        row is still written.
      - Unknown severity values are coerced to "info" and warned.
    """
    if not AUDIT_LOGS_ENABLED:
        return

    try:
        # Action validation (warn-only).
        if action not in ACTION_KEYS:
            logger.warning("unknown_audit_action=%s", action)

        # Severity validation (coerce to info on miss).
        if severity not in SEVERITY_VALUES:
            logger.warning(
                "audit_log invalid severity=%s coerced to 'info'", severity
            )
            severity = "info"

        # Actor type validation (coerce to "system" on miss; preserves a row).
        if actor_type not in ACTOR_TYPES:
            logger.warning(
                "audit_log invalid actor_type=%s coerced to 'system'", actor_type
            )
            actor_type = "system"

        actor_id, actor_label = _extract_actor(actor)
        ip, ua = _extract_request_meta(request)

        row = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "actor_type": actor_type,
            "actor_id": actor_id,
            "actor_label": actor_label,
            "action": action,
            "target_type": target_type,
            "target_id": target_id if isinstance(target_id, str) else None,
            "target_summary": _sanitize_summary(target_summary),
            "before_state": _sanitize(before_state, target_type=target_type) if before_state else None,
            "after_state": _sanitize(after_state, target_type=target_type) if after_state else None,
            "metadata": _sanitize_metadata(metadata) if metadata else None,
            "ip_address": ip,
            "user_agent": ua,
            "severity": severity,
        }

        await db.admin_audit_logs.insert_one(row)
    except Exception as exc:
        # NEVER propagate. The audit log must not break business flow.
        logger.warning(
            "audit_log failed action=%s err=%s",
            action, str(exc)[:200],
        )
