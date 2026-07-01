"""Packages, entitlements & pricing — Zubite.bg clinic pricing model
(Feb 2026 revamp).

Public commercial layer (spec):
  • Verified Profile  — profile-only presence
  • Growth Partner    — main partner package
  • Add-ons           — paid expansion (never affect organic matching)
  • Strategic private — internal only, not a public tier

Historical enum values still living on the `partner_tier` DB field are
never destroyed — they are re-projected into the new model on read and
mirrored on write for backwards compatibility with older admin code.

The entire module is DB-free and pure so it stays trivially testable.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

# ─── Public base packages ───────────────────────────────────────────
BASE_PACKAGES: Tuple[str, str] = ("verified_profile", "growth_partner")
BASE_PACKAGE_LABELS = {
    "verified_profile": "Verified Profile",
    "growth_partner": "Growth Partner",
}

# ─── Founding status ────────────────────────────────────────────────
FOUNDING_STATUS_VALUES: Tuple[str, ...] = (
    "none",
    "founding_growth",
    "strategic_private",
)
FOUNDING_STATUS_LABELS = {
    "none": "—",
    "founding_growth": "Founding Growth",
    "strategic_private": "Strategic Private",
}

# ─── Billing ────────────────────────────────────────────────────────
BILLING_STATUS_VALUES: Tuple[str, ...] = (
    "trial",
    "active",
    "past_due",
    "paused",
    "cancelled",
)
BILLING_CADENCE_VALUES: Tuple[str, ...] = ("yearly", "custom_private")

# ─── Legacy tier reverse-mapping ────────────────────────────────────
# Historical `partner_tier` (kept in DB for audit) → new base_package
# Applied when reading a clinic that predates the Feb-2026 revamp.
LEGACY_PARTNER_TIER_TO_BASE_PACKAGE = {
    "standard": ("verified_profile", "none", None),
    "featured": ("growth_partner", "none", None),
    # Old Authority Partner is remapped to Growth Partner + private
    # strategic status. The historical label is preserved in
    # `legacy_tier` for auditing.
    "premium":  ("growth_partner", "strategic_private", "authority_partner"),
}

# ─── Locked default pricing (EUR) ───────────────────────────────────
PACKAGE_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "verified_profile": {
        "monthly_price_eur": 39,
        "annual_price_eur": 468,
        "onboarding_fee_eur": 199,
        "billing_cadence": "yearly",
    },
    "growth_partner": {
        "monthly_price_eur": 199,
        "annual_price_eur": 2388,
        "onboarding_fee_eur": 499,
        "billing_cadence": "yearly",
    },
}

# Founding Growth — first 6 months of Growth at €149/month, then
# reverts to standard Growth pricing. Onboarding may be reduced or
# waived only by explicit private approval (admin override).
FOUNDING_GROWTH_INTRO_MONTHLY_EUR = 149
FOUNDING_GROWTH_INTRO_MONTHS = 6


# ─── Entitlements matrix ────────────────────────────────────────────
# Boolean flags derived from base_package (+ add-ons). Never persist
# these — always recompute from the source-of-truth clinic + add-ons.

_BASE_ENTITLEMENTS_VERIFIED: Dict[str, Any] = {
    # profile
    "structured_clinic_profile": True,
    "enhanced_clinic_profile": False,
    "structured_trust_signals": True,
    "treatment_service_map": "limited",       # limited | full
    "max_treatment_sections": 3,
    "city_category_eligibility": "basic",     # basic | standard
    # flows
    "patient_journey_eligibility": False,
    "quiz_result_flow_eligibility": False,
    "patient_reported_context": False,
    "source_path_attribution": False,
    # analytics
    "basic_profile_performance_view": True,
    "analytics_dashboard": False,
    "monthly_mini_report": False,
    # optimisation & content
    "quarterly_profile_optimization": False,
    "quarterly_spotlight_or_expert_quote": False,
    "expert_qa_interview_every_six_months": False,
    "case_library_eligibility": False,
    # partner ecosystem
    "care_pass_access": False,
    "educational_event_access": False,
    "partner_brand_supplier_offers": False,
    "selected_beta_access": False,
    "annual_category_insight_snapshot": False,
    # booking (Feb 2026 booking engine — Verified is CTA-only)
    "booking_enabled": False,
    # legacy alias (kept so older FE code doesn't break)
    "partner_access": False,
}

_BASE_ENTITLEMENTS_GROWTH: Dict[str, Any] = {
    # profile
    "structured_clinic_profile": True,
    "enhanced_clinic_profile": True,
    "structured_trust_signals": True,
    "treatment_service_map": "full",
    "max_treatment_sections": 8,
    "city_category_eligibility": "standard",
    # flows
    "patient_journey_eligibility": True,
    "quiz_result_flow_eligibility": True,
    "patient_reported_context": "true_when_available",
    "source_path_attribution": "true_when_available",
    # analytics
    "basic_profile_performance_view": True,
    "analytics_dashboard": True,
    "monthly_mini_report": True,
    # optimisation & content
    "quarterly_profile_optimization": True,
    "quarterly_spotlight_or_expert_quote": True,
    "expert_qa_interview_every_six_months": True,
    "case_library_eligibility": "true_when_suitable",
    # partner ecosystem
    "care_pass_access": True,
    "educational_event_access": True,
    "partner_brand_supplier_offers": True,
    "selected_beta_access": True,
    "annual_category_insight_snapshot": True,
    # booking calendar — enabled by default for Growth
    "booking_enabled": True,
    # legacy alias
    "partner_access": True,
}


def default_entitlements(base_package: str) -> Dict[str, Any]:
    """Return a fresh copy of the base entitlement map for the given
    package. Unknown packages fall back to Verified (safest — least
    access)."""
    if base_package == "growth_partner":
        return dict(_BASE_ENTITLEMENTS_GROWTH)
    return dict(_BASE_ENTITLEMENTS_VERIFIED)


def apply_addon_entitlements(base: Dict[str, Any], addons: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Layer per-add-on entitlement effects on top of the base map.

    Effects are intentionally SMALL and additive:
      • `case_library_asset`               → case_library_eligibility=True
      • `content_authority` category       → expert_qa_interview_every_six_months=True
      • `analytics_strategy` category      → analytics_dashboard=True
      • `partner_campaign` category        → partner_brand_supplier_offers=True,
                                              educational_event_access=True
      • `profile_setup` extra_treatment    → max_treatment_sections += 1
    Add-ons NEVER promote a clinic to Patient Journey / Quiz-flow
    eligibility on their own — that requires an explicit admin
    override (see `apply_admin_overrides`).
    """
    out = dict(base)
    extra_sections = 0

    for addon in addons or []:
        if (addon.get("status") or "").lower() not in ("active", "delivered"):
            continue
        category = (addon.get("category") or "").lower()
        add_on_id = (addon.get("add_on_id") or "").lower()

        if add_on_id == "case_library_asset":
            out["case_library_eligibility"] = True
        if category == "content_authority":
            out["expert_qa_interview_every_six_months"] = True
            out["quarterly_spotlight_or_expert_quote"] = True
        if category == "analytics_strategy":
            out["analytics_dashboard"] = True
        if category == "partner_campaign":
            out["partner_brand_supplier_offers"] = True
            out["educational_event_access"] = True
            out["care_pass_access"] = True
        if add_on_id == "extra_treatment_section":
            extra_sections += 1

    if extra_sections:
        cur = out.get("max_treatment_sections") or 0
        out["max_treatment_sections"] = int(cur) + extra_sections

    return out


def apply_admin_overrides(
    base: Dict[str, Any],
    overrides: Optional[List[Dict[str, Any]]],
) -> Dict[str, Any]:
    """Apply persisted `entitlement_overrides` on top of the computed
    entitlements. Each override is `{key, value, note, at, by}` — the
    note is stored for audit but does not affect the derived map."""
    if not overrides:
        return base
    out = dict(base)
    for row in overrides:
        key = (row or {}).get("key")
        if not isinstance(key, str) or not key:
            continue
        # Only allow overriding keys we know about — silently ignore
        # anything foreign so old-shape data can't inject arbitrary
        # entitlements.
        if key not in _BASE_ENTITLEMENTS_GROWTH:
            continue
        out[key] = row.get("value")
    return out


def compute_entitlements(
    clinic: Dict[str, Any],
    addons: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Public entry point. Given a clinic doc + its add-ons list,
    return the derived entitlement map."""
    base_package = resolve_base_package(clinic)
    base = default_entitlements(base_package)
    with_addons = apply_addon_entitlements(base, addons or [])
    final = apply_admin_overrides(with_addons, clinic.get("entitlement_overrides"))
    return final


# ─── Base-package resolution ────────────────────────────────────────
def resolve_base_package(clinic: Dict[str, Any]) -> str:
    """Prefer the canonical `base_package` field; fall back to legacy
    `partner_tier` via `LEGACY_PARTNER_TIER_TO_BASE_PACKAGE`."""
    raw = (clinic.get("base_package") or "").strip().lower()
    if raw in BASE_PACKAGES:
        return raw
    legacy_tier = (clinic.get("partner_tier") or "").strip().lower()
    if legacy_tier in LEGACY_PARTNER_TIER_TO_BASE_PACKAGE:
        return LEGACY_PARTNER_TIER_TO_BASE_PACKAGE[legacy_tier][0]
    return "verified_profile"


def resolve_founding_status(clinic: Dict[str, Any]) -> str:
    """Read the explicit `founding_status`; if absent, derive from
    legacy `partner_tier` (only `premium` maps to strategic_private)."""
    raw = (clinic.get("founding_status") or "").strip().lower()
    if raw in FOUNDING_STATUS_VALUES:
        return raw
    legacy_tier = (clinic.get("partner_tier") or "").strip().lower()
    if legacy_tier in LEGACY_PARTNER_TIER_TO_BASE_PACKAGE:
        return LEGACY_PARTNER_TIER_TO_BASE_PACKAGE[legacy_tier][1]
    return "none"


def public_partner_label(clinic: Dict[str, Any]) -> str:
    """The label the public profile is allowed to show. Never leaks
    „Authority Partner", private terms, or pricing.

    Rules:
      • founding_status == 'strategic_private' AND admin has explicitly
        approved public exposure via `strategic_public_display=True`
        → 'Стратегически партньор' (Bulgarian public site)
      • base_package == 'growth_partner' → 'Growth Partner'
      • otherwise → 'Verified Profile'
    """
    fs = resolve_founding_status(clinic)
    if fs == "strategic_private" and clinic.get("strategic_public_display") is True:
        return "Стратегически партньор"
    bp = resolve_base_package(clinic)
    return BASE_PACKAGE_LABELS.get(bp, "Verified Profile")


# ─── Pricing helpers ────────────────────────────────────────────────
def package_default_pricing(base_package: str) -> Dict[str, Any]:
    return dict(PACKAGE_DEFAULTS.get(base_package, PACKAGE_DEFAULTS["verified_profile"]))


def founding_growth_intro_pricing() -> Dict[str, Any]:
    """Config for the Founding Growth introductory period."""
    return {
        "monthly_price_eur": FOUNDING_GROWTH_INTRO_MONTHLY_EUR,
        "intro_months": FOUNDING_GROWTH_INTRO_MONTHS,
        "reverts_to": PACKAGE_DEFAULTS["growth_partner"],
    }


# ─── Guardrail copy — single source of truth for admin/public ──────
GUARDRAIL_COPY = (
    "Zubite packages and add-ons do not guarantee leads, patients, "
    "first position, best-clinic status, clinical superiority, "
    "diagnosis, treatment outcomes, or paid ranking. Sponsored "
    "visibility must be clearly separated from organic/relevance-"
    "based matching."
)
