"""Medical-safety triage + PII scrubbing for community questions.

Two independent responsibilities, both applied to every incoming question:

1. `scan_red_flags(text)` — detect language describing an acute/emergency
   dental situation (severe swelling, uncontrolled bleeding, trauma, breathing
   difficulty, high fever, abscess). A hit does NOT block submission; it sets a
   `safety_flag` so the frontend can show a "seek urgent care" interstitial and
   the question is held out of the public peer queue until a human reviews it.
   This is the responsible-platform behaviour a Facebook group can't offer.

2. `scrub_pii(text)` — strip emails and phone numbers a patient might paste
   into a public question, before the text is ever stored or shown.

Deliberately keyword/regex based: fast, transparent, no external calls, and
easy for a Bulgarian-speaking reviewer to audit. Errs toward flagging.
"""
from __future__ import annotations

import re
from typing import List, Tuple

# ── 1. Red-flag detection ─────────────────────────────────────────

# Lowercased Bulgarian (and a few Latin) markers of acute situations.
# Grouped only for readability; matched as a flat set.
_RED_FLAG_TERMS: List[str] = [
    # swelling / abscess
    "подуто лице", "подута буза", "подуване на лицето", "оток", "подул", "подуто",
    "абсцес", "гной", "флегмон",
    # uncontrolled bleeding
    "кръвта не спира", "не спира да кърви", "обилно кървене", "силно кървене",
    # trauma
    "избит зъб", "счупен зъб", "изкъртен зъб", "паднал зъб след удар", "травма",
    "удар в устата", "счупена челюст",
    # airway / systemic — most urgent
    "затруднено дишане", "трудно дишам", "не мога да дишам",
    "затруднено преглъщане", "не мога да преглъщам", "не мога да отворя устата",
    # fever with dental context
    "висока температура", "температура 39", "температура 40", "втрисане",
    # severe pain
    "непоносима болка", "нетърпима болка", "ужасна болка", "силна болка",
    "спешно", "спешна помощ",
]


def scan_red_flags(text: str) -> Tuple[bool, List[str]]:
    """Return (flagged, matched_terms). Case-insensitive substring match on
    the normalised text."""
    if not text:
        return False, []
    low = text.lower()
    matched = [t for t in _RED_FLAG_TERMS if t in low]
    return (len(matched) > 0), matched


# ── 2. PII scrubbing ──────────────────────────────────────────────

_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
# Bulgarian mobile / any 8+ digit run (optionally +359, spaces, dashes).
_PHONE_RE = re.compile(r"(?:\+?359|0)\s*(?:\d[\s-]?){8,11}\d")

_EMAIL_PLACEHOLDER = "[имейл]"
_PHONE_PLACEHOLDER = "[телефон]"


def scrub_pii(text: str) -> str:
    """Remove emails + phone numbers from free text before storage/display.
    Community questions are public; contact details never belong in them."""
    if not text:
        return text
    text = _EMAIL_RE.sub(_EMAIL_PLACEHOLDER, text)
    text = _PHONE_RE.sub(_PHONE_PLACEHOLDER, text)
    return text


# ── 3. Self-promo guardrail (clinic answers) ──────────────────────

_URL_RE = re.compile(r"(?:https?://|www\.)\S+", re.IGNORECASE)
_URL_PLACEHOLDER = "[линк премахнат]"


def strip_urls(text: str) -> str:
    """Remove links from clinic answers. Answers must be educational, not a
    funnel to the clinic's own site — booking happens through Zubite's own
    CTA, never a pasted link. Applied on top of `scrub_pii`."""
    if not text:
        return text
    return _URL_RE.sub(_URL_PLACEHOLDER, text)
