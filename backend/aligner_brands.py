"""Aligner brand / provider tag utilities.

Shared by `routers/consultations.py` (admin write path) and
`routers/public.py` (patient-facing read path) so that both sides
agree on the whitelist, the validation rules, and — crucially — the
public-display downgrade rule:

    A clinic can only display "Официален <brand> provider" wording
    publicly when an admin has set `verification_status="verified"`.
    Anything else is downgraded to the safer "Работи с <brand>" form
    before it reaches the public response.

There is no destructive migration; clinics that don't have the field
just get an empty list out.
"""
from __future__ import annotations

import html
from typing import Any, Dict, List, Optional

# ─── Whitelist ────────────────────────────────────────────────

# slug → display label. Admins pick the slug; we render the label.
ALIGNER_BRAND_LABELS: Dict[str, str] = {
    "invisalign":    "Invisalign",
    "spark":         "Spark",
    "angel_aligner": "Angel Aligner",
    "dentalign":     "Dentalign",
    "clearcorrect":  "ClearCorrect",
    "other":         "Other",
}

# Allowed values for the structured fields. Anything outside these
# sets is rejected at admin write time (HTTP 400) so we never persist
# a value that the public projection would have to guess about.
RELATIONSHIP_VALUES = {"offered", "official_provider"}
VERIFICATION_STATUS_VALUES = {"unverified", "pending_verification", "verified"}

# Hard cap on entries per clinic — defensive (prevents accidental
# UI flooding or oversized documents).
MAX_BRANDS_PER_CLINIC = 12

# Max length of the user-supplied "other" label, after sanitisation.
OTHER_LABEL_MAX_LEN = 60


class AlignerBrandValidationError(ValueError):
    """Raised by `normalize_aligner_brand_entries` when input violates
    the whitelist or the relationship/verification enums.

    The caller (admin route) catches this and returns 400 with the
    message verbatim, so messages MUST stay user-safe and Bulgarian-
    speaking-admin-friendly."""


def _coerce_visible(value: Any) -> bool:
    """Default to visible=True. Only an explicit False/false hides."""
    if value is False:
        return False
    if isinstance(value, str) and value.strip().lower() in ("false", "0", "no"):
        return False
    return True


def _clean_other_label(raw: Any) -> Optional[str]:
    """Sanitise the optional custom label that accompanies brand=other.
    Trims, collapses whitespace, html-escapes, caps length.
    Returns None when input is empty after trimming."""
    if not isinstance(raw, str):
        return None
    s = " ".join(raw.split()).strip()
    if not s:
        return None
    s = html.escape(s, quote=False)
    return s[:OTHER_LABEL_MAX_LEN]


def normalize_aligner_brand_entries(
    raw: Optional[List[Any]],
) -> List[Dict[str, Any]]:
    """Validate + normalize an admin-supplied list of brand entries.

    Each entry is coerced into:
        {
          "brand": "<slug from whitelist>",
          "label": "<canonical label>",
          "relationship": "offered" | "official_provider",
          "verification_status": "unverified" | "pending_verification" | "verified",
          "visible": bool,
          "other_label": "<short escaped string>"  # only when brand="other"
        }

    Rules:
      • Brand must be in `ALIGNER_BRAND_LABELS`.
      • Relationship must be in `RELATIONSHIP_VALUES`. Default "offered".
      • Verification must be in `VERIFICATION_STATUS_VALUES`.
        Default "unverified".
      • brand="other" requires a non-empty `other_label`.
      • Duplicates by brand slug are collapsed (last entry wins —
        consistent with how the admin form will replace existing
        entries on save).
      • Empty / None input returns [].
      • Excess entries beyond MAX_BRANDS_PER_CLINIC raise.
    """
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise AlignerBrandValidationError(
            "aligner_brands_supported must be a list"
        )
    if len(raw) > MAX_BRANDS_PER_CLINIC:
        raise AlignerBrandValidationError(
            f"Too many aligner brand entries (max {MAX_BRANDS_PER_CLINIC})"
        )

    by_brand: Dict[str, Dict[str, Any]] = {}
    for idx, entry in enumerate(raw):
        if not isinstance(entry, dict):
            raise AlignerBrandValidationError(
                f"Brand entry #{idx + 1} must be an object"
            )
        brand_raw = entry.get("brand")
        if not isinstance(brand_raw, str):
            raise AlignerBrandValidationError(
                f"Brand entry #{idx + 1}: 'brand' is required"
            )
        slug = brand_raw.strip().lower()
        if slug not in ALIGNER_BRAND_LABELS:
            raise AlignerBrandValidationError(
                f"Unknown aligner brand: '{brand_raw}'"
            )

        relationship = (entry.get("relationship") or "offered").strip().lower()
        if relationship not in RELATIONSHIP_VALUES:
            raise AlignerBrandValidationError(
                f"Invalid relationship for {slug}: '{relationship}'"
            )

        verification = (
            entry.get("verification_status") or "unverified"
        ).strip().lower()
        if verification not in VERIFICATION_STATUS_VALUES:
            raise AlignerBrandValidationError(
                f"Invalid verification_status for {slug}: '{verification}'"
            )

        clean: Dict[str, Any] = {
            "brand": slug,
            "label": ALIGNER_BRAND_LABELS[slug],
            "relationship": relationship,
            "verification_status": verification,
            "visible": _coerce_visible(entry.get("visible", True)),
        }

        if slug == "other":
            other_label = _clean_other_label(entry.get("other_label"))
            if not other_label:
                raise AlignerBrandValidationError(
                    "Brand 'other' requires a short non-empty 'other_label'"
                )
            clean["other_label"] = other_label

        by_brand[slug] = clean

    return list(by_brand.values())


def public_aligner_brand_chips(stored: Any) -> List[Dict[str, Any]]:
    """Project a stored brand list into the public-safe shape.

    Filtering & downgrade rules (in this exact order):
      1. Drop entries with `visible=False`.
      2. Drop entries with brand slugs not in the whitelist (defensive
         — shouldn't ever happen because admin write-path validates,
         but old/imported data is possible).
      3. If `relationship="official_provider"` AND
         `verification_status != "verified"`, downgrade the relationship
         to "offered" so the frontend cannot render official wording.
      4. The returned shape exposes only fields the public profile
         needs to render text-only chips:

            {
              "brand": "<slug>",
              "label": "Invisalign" | <other_label>,
              "relationship": "offered" | "official_provider",
              "verified_official": True if shown as official.
            }
    """
    if not isinstance(stored, list):
        return []
    out: List[Dict[str, Any]] = []
    for entry in stored:
        if not isinstance(entry, dict):
            continue
        if entry.get("visible") is False:
            continue
        slug = entry.get("brand")
        if slug not in ALIGNER_BRAND_LABELS:
            continue

        relationship = entry.get("relationship") or "offered"
        if relationship not in RELATIONSHIP_VALUES:
            relationship = "offered"
        verification = entry.get("verification_status") or "unverified"
        verified_official = (
            relationship == "official_provider"
            and verification == "verified"
        )
        # Downgrade public claim when not verified.
        public_relationship = (
            "official_provider" if verified_official else "offered"
        )

        # Display label
        if slug == "other":
            label = entry.get("other_label") or ALIGNER_BRAND_LABELS[slug]
        else:
            label = ALIGNER_BRAND_LABELS[slug]

        out.append({
            "brand": slug,
            "label": label,
            "relationship": public_relationship,
            "verified_official": verified_official,
        })
    return out
