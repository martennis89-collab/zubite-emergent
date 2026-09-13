"""AI-assisted clinic-profile prefill from an existing clinic website.

Admin-only convenience for onboarding a clinic that already runs its own
site: crawl a handful of pages, hand the text to Claude, and get back a
draft shaped like (a subset of) `ClinicApplicationCreate`. The draft is
never persisted or auto-submitted — see routers/clinics.py's
`prefill_clinic_application_from_website`, which only returns it for an
admin to review/edit before calling the separate admin-create endpoint.

Copy fields (short_description, patient_intro, doctor_spotlight_bio,
team_note, clinic_story, environment_description, consultation_process)
are deliberately NOT verbatim scrapes — the prompt asks Claude to write
them as honest, persuasive Zubite-profile copy grounded in what the site
actually says. Factual fields (name, city, address, phone, treatments,
founded_year, social/Google URLs) are asked for as plain extraction.
"""
from __future__ import annotations

import asyncio
import ipaddress
import json
import logging
import socket
from typing import Any, List, Optional
from urllib.parse import urljoin, urlparse

import anthropic
import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field

from config import ANTHROPIC_API_KEY

# Canonical service vocabulary — matches SERVICES in
# frontend/components/ForClinicsLanding.tsx exactly, so an AI-drafted
# application looks identical (in shape) to one a clinic filled in
# themselves. Values are the Bulgarian labels stored on
# ClinicApplicationCreate.treatments_supported, not slugs.
TREATMENT_LABELS = [
    "Обща стоматология",
    "Ортодонтия",
    "Имплантология",
    "Естетична стоматология",
    "Детска стоматология",
    "Орална хирургия",
    "Пародонтология",
    "Ендодонтия",
]

_SUBPAGE_KEYWORDS = [
    "about", "за нас", "екип", "team", "лекари", "doctors", "услуги",
    "services", "лечение", "treatment", "contact", "контакт", "история",
]
_MAX_SUBPAGES = 4
_MAX_PAGE_CHARS = 6000
_MAX_TOTAL_CHARS = 20000
_FETCH_TIMEOUT = 8.0


def prefill_enabled() -> bool:
    return bool(ANTHROPIC_API_KEY)


class ClinicWebsitePrefillDraft(BaseModel):
    # No class docstring, no per-field `description=`/`max_length=` — Claude's
    # structured outputs rejected an earlier, more heavily annotated version
    # of this model with "Schema is too complex" (a real, distinct API error
    # from the union-type-count limit fixed earlier). Real length limits are
    # still enforced where it actually matters: at submission time, when this
    # draft's fields flow into ClinicApplicationCreate. This model's only job
    # is extraction; keep its schema as flat and unadorned as possible.
    #
    # Plain (non-Optional) string fields with an empty-string "not found"
    # sentinel, rather than Optional[str] = None — a schema with too many
    # nullable/union-typed parameters (>16) is the other limit already hit
    # once. founded_year is the one field that keeps Optional (0 is a bad
    # "not found" sentinel for a year); the frontend already treats ""
    # and null identically via `|| ''` fallbacks.
    clinic_name: str
    city: str = ""
    address: str = ""
    contact_name: str = ""
    phone: str = ""
    email: str = ""
    offers_aligners: bool = False
    offers_braces: bool = False
    offers_implants: bool = False
    treats_adults: bool = False
    treats_children: bool = False
    treatments_supported: List[str] = Field(default_factory=list)
    short_description: str = ""
    patient_intro: str = ""
    founded_year: Optional[int] = None
    doctor_spotlight_name: str = ""
    doctor_spotlight_role: str = ""
    doctor_spotlight_bio: str = ""
    team_note: str = ""
    clinic_story: str = ""
    environment_description: str = ""
    consultation_process: str = ""
    google_url: str = ""
    facebook_url: str = ""
    review_notes: str = ""


def _reject_unsafe_url(url: str) -> None:
    """Basic SSRF guard for an admin-supplied crawl target: only http(s),
    and refuse hostnames that resolve to a private/loopback/link-local
    address. Admin-gated already, but outbound-fetch-from-a-URL-field is
    exactly the shape of bug that's cheap to guard and expensive to regret."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError("Невалиден URL — очаква се http(s) адрес.")
    try:
        infos = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror as e:
        raise ValueError(f"Адресът не може да бъде разрешен: {e}")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise ValueError("Адресът сочи към частна/вътрешна мрежа — отказано.")


def _html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    return " ".join(text.split())[:_MAX_PAGE_CHARS]


def _discover_subpage_urls(base_url: str, html: str) -> List[str]:
    soup = BeautifulSoup(html, "html.parser")
    base_host = urlparse(base_url).netloc
    seen: set[str] = set()
    picks: List[str] = []
    for a in soup.find_all("a", href=True):
        if len(picks) >= _MAX_SUBPAGES:
            break
        link_text = (a.get_text() or "").strip().lower()
        href = a["href"].strip()
        if not any(kw in link_text or kw in href.lower() for kw in _SUBPAGE_KEYWORDS):
            continue
        absolute = urljoin(base_url, href)
        parsed = urlparse(absolute)
        if parsed.netloc != base_host or parsed.scheme not in ("http", "https"):
            continue
        clean = absolute.split("#")[0]
        if clean in seen or clean == base_url:
            continue
        seen.add(clean)
        picks.append(clean)
    return picks


async def crawl_clinic_site(website_url: str) -> tuple[str, List[str], List[str]]:
    """Fetch the homepage plus a handful of discovered same-domain
    subpages (about/team/services/contact), stripped to plain text.

    Returns (combined_text, crawled_urls, warnings). Never raises for a
    single failed subpage — only the initial homepage fetch/validation
    can abort the whole crawl.

    Subpages are fetched concurrently, not one-by-one — sequentially, up to
    _MAX_SUBPAGES pages at _FETCH_TIMEOUT each could take ~40s worst case
    before the Claude call even starts, comfortably exceeding a typical
    platform request-gateway timeout (a 502, not an application error, is
    what that looks like from the browser). Concurrent fetch caps this
    stage at roughly one timeout window instead of N."""
    _reject_unsafe_url(website_url)

    warnings: List[str] = []
    crawled: List[str] = []
    blocks: List[str] = []

    async with httpx.AsyncClient(
        timeout=_FETCH_TIMEOUT, follow_redirects=True,
        headers={"User-Agent": "Mozilla/5.0 (compatible; ZubiteOnboardingBot/1.0)"},
    ) as client:
        try:
            home_resp = await client.get(website_url)
            home_resp.raise_for_status()
        except Exception as e:
            raise ValueError(f"Сайтът не отговори: {e}")

        home_html = home_resp.text
        crawled.append(website_url)
        blocks.append(f"=== {website_url} (начало) ===\n{_html_to_text(home_html)}")

        subpage_urls = _discover_subpage_urls(website_url, home_html)

        async def _fetch_subpage(sub_url: str) -> tuple[str, Optional[str], Optional[str]]:
            try:
                resp = await client.get(sub_url)
                resp.raise_for_status()
                return sub_url, resp.text, None
            except Exception as e:
                return sub_url, None, str(e)

        results = await asyncio.gather(*[_fetch_subpage(u) for u in subpage_urls])
        for sub_url, html, err in results:
            if err is not None:
                warnings.append(f"Пропусната страница {sub_url}: {err}")
                continue
            if sum(len(b) for b in blocks) >= _MAX_TOTAL_CHARS:
                continue
            crawled.append(sub_url)
            blocks.append(f"=== {sub_url} ===\n{_html_to_text(html)}")

    combined = "\n\n".join(blocks)[:_MAX_TOTAL_CHARS]
    if len(combined) < 200:
        warnings.append("Извлеченото съдържание е много кратко — сайтът може да разчита на JavaScript рендиране.")
    return combined, crawled, warnings


_JSON_SHAPE = """{
  "clinic_name": "",
  "city": "",
  "address": "",
  "contact_name": "",
  "phone": "",
  "email": "",
  "offers_aligners": false,
  "offers_braces": false,
  "offers_implants": false,
  "treats_adults": false,
  "treats_children": false,
  "treatments_supported": [],
  "short_description": "",
  "patient_intro": "",
  "founded_year": null,
  "doctor_spotlight_name": "",
  "doctor_spotlight_role": "",
  "doctor_spotlight_bio": "",
  "team_note": "",
  "clinic_story": "",
  "environment_description": "",
  "consultation_process": "",
  "google_url": "",
  "facebook_url": "",
  "review_notes": ""
}"""

_SYSTEM_PROMPT = f"""Ти помагаш на администратор на Zubite.bg (българска платформа,
свързваща пациенти с дентални клиники) да подготви кандидатура за партньорство
на клиника, като извлечеш информация от нейния собствен уебсайт.

Ще получиш суров текст, извлечен от няколко страници на сайта на клиниката.

Правила:
1. ФАКТИЧЕСКИ полета (clinic_name, city, address, phone, email, founded_year,
   google_url, facebook_url, treatments_supported, offers_*, treats_*) —
   извличай точно това, което пише на сайта. Не измисляй факти, които не са
   подкрепени от текста. Ако нещо липсва, остави полето като празен низ ""
   (или null само за founded_year, ако годината не е посочена никъде).
2. treatments_supported — избирай САМО измежду тази точна затворена листа
   (използвай текста дословно, не превеждай/променяй): {', '.join(TREATMENT_LABELS)}.
3. КОПИРАЙТИНГ полета (short_description, patient_intro, doctor_spotlight_bio,
   team_note, clinic_story, environment_description, consultation_process) —
   НЕ копирай текста дословно от сайта. Пренапиши го като кратко, честно и
   убедително описание за профила на клиниката в Zubite — на български,
   в топъл но професионален тон, без превъзходни степени без покритие
   ("най-добрият", "№1" и т.н.) и без твърдения, които сайтът не подкрепя.
   Целта е текстът да звучи добре в списък с партньорски клиники, не да е
   маркетингов препис.
4. Ако дадено копирайтинг поле няма достатъчно материал в изходния текст,
   остави го празно вместо да измисляш съдържание.
5. review_notes — кратко обобщение (2-4 изречения) какво липсва, какво е
   несигурно, или какво администраторът трябва да провери ръчно преди да
   изпрати кандидатурата (напр. "Не открих година на основаване.",
   "Телефонният номер на сайта изглежда остарял — провери.").

Отговори САМО с валиден JSON обект в точно тази форма (същите ключове,
същия ред, никакви допълнителни ключове) — без markdown code fences (```),
без обяснения преди или след него, само самият JSON:

{_JSON_SHAPE}"""


async def draft_profile_from_site(site_text: str, *, website_url: str) -> ClinicWebsitePrefillDraft:
    if not prefill_enabled():
        raise RuntimeError("ANTHROPIC_API_KEY не е конфигуриран.")

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    try:
        # Sonnet, not Opus: this is bounded structured extraction + light
        # copywriting from a few KB of site text, not open-ended reasoning
        # — Sonnet 5 handles it well at roughly half Opus's per-token cost.
        # Combined with the crawl's ~20k-char input cap, the follow prompt
        # for max_tokens, and the rate limit on the endpoint that calls
        # this (see clinics.py — 5 calls/hour/IP), a single admin spamming
        # this feature nonstop still can't run up more than a few dollars
        # a day; a normal onboarding pace costs cents.
        #
        # Deliberately NOT using output_format/messages.parse() here —
        # Anthropic's structured-outputs feature rejects this schema with
        # "Schema is too complex" purely from having 25 properties (it
        # fails in ~1-2s, before any generation even starts — a
        # pre-flight schema-compilation check, not a per-field issue;
        # already tried stripping every description/max_length and it
        # made no difference). Plain generation with the exact JSON shape
        # spelled out in the system prompt sidesteps that limit entirely,
        # since the API then isn't constraining/validating the output
        # against any schema at all — we parse and validate it ourselves
        # below instead.
        response = await client.messages.create(
            model="claude-sonnet-5",
            max_tokens=4096,
            system=_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": (
                    f"Уебсайт: {website_url}\n\n"
                    f"Извлечено съдържание:\n\n{site_text}"
                ),
            }],
        )
    except anthropic.APIError as e:
        logging.error(f"Clinic website prefill: Anthropic API error: {e}")
        raise ValueError(f"Грешка при AI обработката: {e}")

    raw_text = next((b.text for b in response.content if b.type == "text"), "")
    draft = _parse_draft_json(raw_text)
    draft.treatments_supported = [
        t for t in draft.treatments_supported if t in TREATMENT_LABELS
    ]
    _truncate_to_application_limits(draft)
    return draft


def _parse_draft_json(raw_text: str) -> ClinicWebsitePrefillDraft:
    """Claude was asked for bare JSON but models occasionally wrap it in a
    ```json fence anyway — strip that defensively before parsing."""
    text = raw_text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        logging.error(f"Clinic website prefill: model did not return valid JSON: {e}\nRaw: {raw_text[:500]}")
        raise ValueError("AI отговорът не беше валиден JSON — опитайте отново.")

    try:
        return ClinicWebsitePrefillDraft(**data)
    except Exception as e:
        logging.error(f"Clinic website prefill: draft failed validation: {e}\nData: {data}")
        raise ValueError(f"AI отговорът не съответстваше на очаквания формат: {e}")


# Mirrors the max_length on the corresponding ClinicApplicationCreate
# fields (schemas.py) — the draft schema itself carries no length
# constraints (see the model's comment), so this is where they're
# actually enforced, before the draft ever reaches an admin's edit form.
# Without this, a slightly-too-long AI-generated field would sail through
# the draft step and only fail as a cryptic validation error at final
# submission.
_APPLICATION_FIELD_LIMITS = {
    "clinic_name": 200, "city": 100, "address": 500, "contact_name": 200,
    "phone": 50, "email": 200, "short_description": 500, "patient_intro": 500,
    "doctor_spotlight_name": 200, "doctor_spotlight_role": 200,
    "doctor_spotlight_bio": 1000, "team_note": 500, "clinic_story": 1500,
    "environment_description": 1000, "consultation_process": 1000,
    "google_url": 500, "facebook_url": 500,
}


def _truncate_to_application_limits(draft: ClinicWebsitePrefillDraft) -> None:
    for field, limit in _APPLICATION_FIELD_LIMITS.items():
        value = getattr(draft, field)
        if isinstance(value, str) and len(value) > limit:
            setattr(draft, field, value[:limit])
