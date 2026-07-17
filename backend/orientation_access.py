"""Online Orientation access helper (Phase D — June 2026).

A single, reusable function that maps `(clinic_doc, settings_doc)` to
one of the canonical `ORIENTATION_ACCESS_STATUS_VALUES`:

    included_in_plan     — Growth Partner, admin-enabled, clinic active
    addon_enabled        — Verified Profile, admin enabled the add-on, clinic active
    disabled_by_admin    — Package allows it, but admin toggled enabled=false
                           (or, for Verified, the add-on flag is off)
    not_available        — Package does not include it and no add-on
    clinic_inactive      — Clinic is suspended / inactive / unverified

Package resolution goes through `entitlements.resolve_base_package`,
which prefers the canonical `base_package` field and falls back to
legacy `partner_tier`. This module must never read `partner_tier`
directly to decide access: clinics written after the Feb-2026 revamp
leave that field unset, so a direct read defaults them to "standard"
and hides the feature from the Growth Partners who pay for it.

Phase E will branch on this status to decide whether to surface this
clinic's free-orientation slots on the patient result page. Phase D
itself never exposes anything to patients; it's purely operational.

The helper is intentionally pure and DB-free: callers must pass the
already-loaded clinic doc + settings doc (or `None` for the latter when
no settings have been saved yet).
"""

from __future__ import annotations
from typing import Any, Dict, Optional, TypedDict


from entitlements import resolve_base_package

# `admin_only` is a legacy `partner_tier` with no counterpart in the
# base-package model — it is an internal holding state, never surfaced
# to patients, so it is resolved before the package lookup.
ADMIN_ONLY_TIER = "admin_only"


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
    tier: str                    # legacy `partner_tier`, retained for audit
    base_package: str            # canonical: verified_profile | growth_partner
    plan_category: str           # "growth" | "verified" | "admin_only"
    enabled: bool                # admin operational toggle
    # Mirrors the persisted settings field of the same name; "basic"
    # here is the stored field's legacy wording, not a package.
    addon_enabled_for_basic: bool
    reasons: list                # human-readable detail strings (BG, admin-only)


def _plan_category(clinic: Dict[str, Any]) -> str:
    """Resolve the clinic's package via the canonical `base_package`
    field, falling back to legacy `partner_tier` only through
    `resolve_base_package`.

    Reading `partner_tier` directly here is what this function used to
    do, and it silently mis-classified every clinic saved after the
    Feb-2026 revamp: those docs carry `base_package` and leave
    `partner_tier` unset, so a Growth Partner resolved to the default
    "standard" → "basic" → orientation gated behind the Basic add-on
    toggle they should never have needed.
    """
    if (clinic.get("partner_tier") or "").strip().lower() == ADMIN_ONLY_TIER:
        return "admin_only"
    return "growth" if resolve_base_package(clinic) == "growth_partner" else "verified"


def get_online_orientation_access_status(
    clinic: Dict[str, Any],
    settings: Optional[Dict[str, Any]] = None,
) -> AccessReport:
    """Compute Online Orientation access status for a single clinic.

    See module docstring for the canonical status values.
    """
    tier = (clinic.get("partner_tier") or "").strip().lower() or "standard"
    base_package = resolve_base_package(clinic)
    plan = _plan_category(clinic)
    enabled = bool((settings or {}).get("enabled"))
    addon = bool((settings or {}).get("addon_enabled_for_basic"))
    active = _is_clinic_active(clinic)
    reasons: list = []

    def _report(status: str, **kw: Any) -> AccessReport:
        kw.setdefault("enabled", enabled)
        kw.setdefault("addon_enabled_for_basic", addon)
        return AccessReport(
            status=status, tier=tier, base_package=base_package,
            plan_category=plan, reasons=reasons, **kw,
        )

    # Inactive clinics ALWAYS short-circuit to clinic_inactive — the
    # plan doesn't matter if we can't safely route patients to them.
    if not active:
        reasons.append("Клиниката не е активна (suspended / inactive / unverified).")
        return _report("clinic_inactive", is_active=False)

    if plan == "admin_only":
        reasons.append("Партньорски тарифен план: admin_only — не се излага на пациентския funnel.")
        return _report("not_available", is_active=True)

    if plan == "growth":
        if enabled:
            reasons.append("Включено в Growth Partner пакета и активно от админа.")
            return _report("included_in_plan", is_active=True, enabled=True)
        reasons.append("Включено в Growth Partner пакета, но изключено от админа.")
        return _report("disabled_by_admin", is_active=True, enabled=False)

    # Verified Profile from here on — orientation is an add-on only.
    if not addon:
        reasons.append("Налично като add-on за Verified Profile — добавката не е активирана.")
        return _report("not_available", is_active=True, addon_enabled_for_basic=False)
    if not enabled:
        reasons.append("Add-on е активиран, но операционно е изключено от админа.")
        return _report("disabled_by_admin", is_active=True, enabled=False, addon_enabled_for_basic=True)
    reasons.append("Add-on за Verified Profile е активиран и операционно е включено.")
    return _report("addon_enabled", is_active=True, enabled=True, addon_enabled_for_basic=True)
