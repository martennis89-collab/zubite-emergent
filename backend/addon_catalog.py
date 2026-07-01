"""Seed catalog for clinic add-ons (Feb 2026 pricing revamp).

The 28 items below are the default admin dropdown. Admins can also
create custom add-ons per-clinic via the `/api/admin/clinics/{id}/
addons` endpoint — those custom entries never appear in this catalog.

Each item is intentionally minimal (id / category / name / price /
billing_type). The full add-on object attached to a clinic carries
runtime fields like `status`, `start_date`, `public_visibility`, etc.

`affects_organic_matching` is deliberately hard-coded FALSE at the
router layer — no add-on entry in this catalog can flip it on.
"""

from __future__ import annotations

from typing import Any, Dict, List

ADDON_CATEGORIES = (
    "content_authority",
    "video_podcast_event",
    "analytics_strategy",
    "partner_campaign",
    "profile_setup",
    "custom_private",
)

ADDON_BILLING_TYPES = (
    "one_time",
    "monthly",
    "quarterly",
    "per_campaign",
    "custom",
)

ADDON_STATUS_VALUES = (
    "proposed",
    "active",
    "delivered",
    "paused",
    "cancelled",
)

ADDON_PUBLIC_VISIBILITY_VALUES = (
    "none",
    "public_labeled",
    "internal_only",
)

ADDON_CATALOG: List[Dict[str, Any]] = [
    # ─── Content & Authority ──────────────────────────────────
    {"add_on_id": "extra_clinic_spotlight",     "category": "content_authority",   "name": "Extra clinic spotlight",              "price_eur": 149,  "billing_type": "one_time"},
    {"add_on_id": "expert_quote_placement",     "category": "content_authority",   "name": "Extra expert quote placement",        "price_eur": 99,   "billing_type": "one_time"},
    {"add_on_id": "expert_qa_article",          "category": "content_authority",   "name": "Expert Q&A article",                   "price_eur": 299,  "billing_type": "one_time"},
    {"add_on_id": "deep_expert_interview",      "category": "content_authority",   "name": "Deep expert interview",                "price_eur": 399,  "billing_type": "one_time"},
    {"add_on_id": "case_library_asset",         "category": "content_authority",   "name": "Case-library asset",                   "price_eur": 249,  "billing_type": "one_time"},
    {"add_on_id": "case_education_bundle_3",    "category": "content_authority",   "name": "3-case education bundle",              "price_eur": 599,  "billing_type": "one_time"},
    {"add_on_id": "category_authority_page",    "category": "content_authority",   "name": "Category authority page contribution", "price_eur": 499,  "billing_type": "one_time"},
    {"add_on_id": "profile_storytelling_upgrade","category": "content_authority",  "name": "Profile storytelling upgrade",         "price_eur": 349,  "billing_type": "one_time"},

    # ─── Video / Podcast / Event ──────────────────────────────
    {"add_on_id": "podcast_video_guest",        "category": "video_podcast_event", "name": "Podcast/video guest feature",          "price_eur": 750,  "billing_type": "one_time"},
    {"add_on_id": "podcast_video_plus_clips",   "category": "video_podcast_event", "name": "Podcast/video feature + short clips",  "price_eur": 1200, "billing_type": "one_time"},
    {"add_on_id": "educational_webinar_cohost", "category": "video_podcast_event", "name": "Educational webinar co-host",          "price_eur": 450,  "billing_type": "per_campaign"},
    {"add_on_id": "event_speaker_cohost",       "category": "video_podcast_event", "name": "Event speaker/co-host opportunity",    "price_eur": 500,  "billing_type": "per_campaign"},
    {"add_on_id": "clinic_event_campaign",      "category": "video_podcast_event", "name": "Clinic event campaign support",        "price_eur": 750,  "billing_type": "per_campaign"},

    # ─── Analytics & Strategy ─────────────────────────────────
    {"add_on_id": "extra_strategy_call",        "category": "analytics_strategy",  "name": "Extra strategy review call",           "price_eur": 199,  "billing_type": "per_campaign"},
    {"add_on_id": "advanced_category_report",   "category": "analytics_strategy",  "name": "Advanced category report",             "price_eur": 299,  "billing_type": "per_campaign"},
    {"add_on_id": "city_category_opportunity_report", "category": "analytics_strategy", "name": "City/category opportunity report", "price_eur": 399, "billing_type": "per_campaign"},
    {"add_on_id": "custom_dashboard_setup",     "category": "analytics_strategy",  "name": "Custom dashboard setup",               "price_eur": 249,  "billing_type": "one_time"},
    {"add_on_id": "quarterly_growth_advisory",  "category": "analytics_strategy",  "name": "Quarterly growth advisory bundle",     "price_eur": 499,  "billing_type": "quarterly"},

    # ─── Partner Access / Campaign ────────────────────────────
    {"add_on_id": "partner_campaign_participation", "category": "partner_campaign", "name": "Partner campaign participation",      "price_eur": 300,  "billing_type": "per_campaign"},
    {"add_on_id": "priority_partner_campaign",  "category": "partner_campaign",    "name": "Priority partner campaign eligibility","price_eur": 500,  "billing_type": "per_campaign"},
    {"add_on_id": "care_pass_activation_support","category": "partner_campaign",   "name": "Care Pass activation support",         "price_eur": 199,  "billing_type": "one_time"},
    {"add_on_id": "patient_flow_pilot",         "category": "partner_campaign",    "name": "Special patient flow pilot",           "price_eur": 199,  "billing_type": "monthly"},
    {"add_on_id": "strategic_roundtable_sponsorship", "category": "partner_campaign", "name": "Strategic roundtable sponsorship",  "price_eur": 500,  "billing_type": "per_campaign"},

    # ─── Profile & Setup ──────────────────────────────────────
    {"add_on_id": "extra_treatment_section",    "category": "profile_setup",       "name": "Extra treatment section beyond limit", "price_eur": 75,   "billing_type": "one_time"},
    {"add_on_id": "extra_location_profile",     "category": "profile_setup",       "name": "Extra location profile",               "price_eur": 99,   "billing_type": "monthly"},
    {"add_on_id": "extra_doctor_profile",       "category": "profile_setup",       "name": "Extra doctor profile",                 "price_eur": 49,   "billing_type": "monthly"},
    {"add_on_id": "extra_profile_refresh",      "category": "profile_setup",       "name": "Extra profile refresh",                "price_eur": 149,  "billing_type": "one_time"},
    {"add_on_id": "full_profile_rebuild",       "category": "profile_setup",       "name": "Full profile rebuild",                 "price_eur": 399,  "billing_type": "one_time"},
]


def catalog_by_category() -> Dict[str, List[Dict[str, Any]]]:
    grouped: Dict[str, List[Dict[str, Any]]] = {c: [] for c in ADDON_CATEGORIES}
    for item in ADDON_CATALOG:
        grouped[item["category"]].append(item)
    return grouped


def catalog_find(add_on_id: str) -> Dict[str, Any] | None:
    """Look up a catalog item by id — used when an admin picks one
    from the seed list."""
    for item in ADDON_CATALOG:
        if item["add_on_id"] == add_on_id:
            return dict(item)
    return None
