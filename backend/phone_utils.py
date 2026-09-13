"""Phone normalisation for deep links (Viber today).

The platform stores patient/clinic phone numbers permissively on purpose —
Bulgarian numbers arrive as "+359 88 1234567", "0888 12 34 56", "(02)
123-4567" and `_is_acceptable_phone` in routers/public.py only asks for six
digits. That is fine for a human to read and dial.

A deep link is not read by a human. `viber://chat?number=...` needs one
unambiguous international number, so anything we hand to it must be
normalised to E.164 first. This module does only that, and returns None
rather than guessing when the input cannot be resolved to a real number.

Kept DB-free and pure so it stays trivially testable.
"""

from __future__ import annotations

import re
from typing import Optional

BG_COUNTRY_CODE = "359"

# Bulgarian national numbers are 8 or 9 digits after the country code
# (mobile 89xxxxxxx / 88xxxxxxx = 9; Sofia landline 2xxxxxxx = 8).
_MIN_NATIONAL_DIGITS = 8
_MAX_NATIONAL_DIGITS = 9

_NON_DIGIT_RE = re.compile(r"\D")


def normalize_msisdn_bg(raw: Optional[str]) -> Optional[str]:
    """Return the number in E.164 (`+359888123456`), or None if it cannot
    be resolved unambiguously.

    Accepted shapes:
      +359 88 123 4567 / 00359881234567  → explicit country code
      0888 123 456                       → national trunk prefix, assume BG
      359881234567                       → country code without '+'
      888 123 456                        → bare national number, assume BG

    A number with a non-BG country code (e.g. +44…) is returned as-is when
    it is plausibly E.164, so a clinic with a foreign Viber account is not
    silently rejected.
    """
    if not isinstance(raw, str):
        return None
    s = raw.strip()
    if not s:
        return None

    had_plus = s.startswith("+")
    digits = _NON_DIGIT_RE.sub("", s)
    if not digits:
        return None

    # 00 international prefix behaves exactly like a leading '+'.
    if digits.startswith("00"):
        digits = digits[2:]
        had_plus = True

    if had_plus:
        # Already international. Only sanity-check the length; we cannot
        # validate every country's numbering plan and must not guess.
        if not (8 <= len(digits) <= 15):
            return None
        return f"+{digits}"

    if digits.startswith(BG_COUNTRY_CODE):
        national = digits[len(BG_COUNTRY_CODE):]
    elif digits.startswith("0"):
        # National trunk prefix — drop the single leading zero.
        national = digits[1:]
    else:
        national = digits

    if not (_MIN_NATIONAL_DIGITS <= len(national) <= _MAX_NATIONAL_DIGITS):
        return None
    return f"+{BG_COUNTRY_CODE}{national}"
