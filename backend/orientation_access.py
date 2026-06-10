"""Online Orientation access helper (Phase D — June 2026).

A single, reusable function that maps `(clinic_doc, settings_doc)` to
one of the canonical `ORIENTATION_ACCESS_STATUS_VALUES`:

    included_in_plan     — Premium clinic, admin-enabled, clinic active
    addon_enabled        — Basic clinic, admin enabled the add-on, clinic active
    disabled_by_admin    — Tier allows it, but admin toggled enabled=false
                           (or, for Basic, the add-on flag is off)
    not_available        — Tier does not include it and no add-on for Basic
    clinic_inactive      — Clinic is suspended / inactive / unverified

Phase E will branch on this status to decide whether to surface this
clinic's free-orientation slots on the patient result page. Phase D
itself never exposes anything to patients; it's purely operational.

The helper is intentionally pure and DB-free: callers must pass the
already-loaded clinic doc + settings doc (or `None` for the latter when
no settings have been saved yet).
"""

from __future__ import annotations
from typing import Any, Dict, Optional, TypedDict


# Tier mapping (frozen contract for Phase D):
#   standard / featured       → "basic"
#   premium / premium_plus    → "premium"
#   founding_premium          → "premium"
#   admin_only                → "admin_only" (never surfaced to patients)
PREMIUM_LIKE_TIERS = frozenset({"premium", "premium_plus", "founding_premium"})
BASIC_LIKE_TIERS = frozenset({"standard", "featured"})


def _is_clinic_active(clinic: Dict[str, Any]) -> bool:
    """Return True iff the clinic is operational and may be considered
    for patient routing.

    Inactivity sources (any of these → inactive):
      - `clinic_status` ∈ {"inactive", "probation", "waiting_list"}
      - legacy `status` ∈ {"paused", "inactive", "disabled", "suspended", "expired"}
      - `subscription_status` ∈ {"cancelled", "unpaid"}
    """
    cs = (clinic.get("clinic_status") or "").strip().lower()
    if cs in {"inactive", "probation", "waiting_list"}:
        return False
    legacy = (clinic.get("status") or "").strip().lower()
    if legacy in {"paused", "inactive", "disabled", "suspended", "expired"}:
        return False
    sub = (clinic.get("subscription_status") or "").strip().lower()
    if sub in {"cancelled", "unpaid"}:
        return False
    # Hard `is_active=False` (seed-level flag) — only honour an explicit
    # False; missing field is treated as "active".
    if clinic.get("is_active") is False:
        return False
    return True


class AccessReport(TypedDict, total=False):
    status: str
    is_active: bool
    tier: str
    plan_category: str           # "premium" | "basic" | "admin_only" | "unknown"
    enabled: bool                # admin operational toggle
    addon_enabled_for_basic: bool
    reasons: list                # human-readable detail strings (BG, admin-only)


def _plan_category(tier: Optional[str]) -> str:
    t = (tier or "").strip().lower()
    if t in PREMIUM_LIKE_TIERS:
        return "premium"
    if t in BASIC_LIKE_TIERS:
        return "basic"
    if t == "admin_only":
        return "admin_only"
    # Unknown / missing — treat conservatively as basic so admin still
    # has a path to enable via add-on toggle.
    return "basic"


def get_online_orientation_access_status(
    clinic: Dict[str, Any],
    settings: Optional[Dict[str, Any]] = None,
) -> AccessReport:
    """Compute Online Orientation access status for a single clinic.

    See module docstring for the canonical status values.
    """
    tier = (clinic.get("partner_tier") or "").strip().lower() or "standard"
    plan = _plan_category(tier)
    enabled = bool((settings or {}).get("enabled"))
    addon = bool((settings or {}).get("addon_enabled_for_basic"))
    active = _is_clinic_active(clinic)
    reasons: list = []

    # Inactive clinics ALWAYS short-circuit to clinic_inactive — the
    # plan doesn't matter if we can't safely route patients to them.
    if not active:
        reasons.append("Клиниката не е активна (suspended / inactive / unverified).")
        return AccessReport(
            status="clinic_inactive",
            is_active=False, tier=tier, plan_category=plan,
            enabled=enabled, addon_enabled_for_basic=addon,
            reasons=reasons,
        )

    if plan == "admin_only":
        reasons.append("Партньорски тарифен план: admin_only — не се излага на пациентския funnel.")
        return AccessReport(
            status="not_available",
            is_active=True, tier=tier, plan_category=plan,
            enabled=enabled, addon_enabled_for_basic=addon,
            reasons=reasons,
        )

    if plan == "premium":
        if enabled:
            return AccessReport(
                status="included_in_plan",
                is_active=True, tier=tier, plan_category=plan,
                enabled=True, addon_enabled_for_basic=addon,
                reasons=["Включено в Premium профила и активно от админа."],
            )
        reasons.append("Включено в Premium профила, но изключено от админа.")
        return AccessReport(
            status="disabled_by_admin",
            is_active=True, tier=tier, plan_category=plan,
            enabled=False, addon_enabled_for_basic=addon,
            reasons=reasons,
        )

    # Basic-like tier from here on.
    if not addon:
        reasons.append("Налично като add-on за Basic — добавката не е активирана.")
        return AccessReport(
            status="not_available",
            is_active=True, tier=tier, plan_category=plan,
            enabled=enabled, addon_enabled_for_basic=False,
            reasons=reasons,
        )
    if not enabled:
        reasons.append("Add-on е активиран, но операционно е изключено от админа.")
        return AccessReport(
            status="disabled_by_admin",
            is_active=True, tier=tier, plan_category=plan,
            enabled=False, addon_enabled_for_basic=True,
            reasons=reasons,
        )
    return AccessReport(
        status="addon_enabled",
        is_active=True, tier=tier, plan_category=plan,
        enabled=True, addon_enabled_for_basic=True,
        reasons=["Add-on за Basic е активиран и операционно е включено."],
    )
