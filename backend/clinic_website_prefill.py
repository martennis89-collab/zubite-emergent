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

import ipaddress
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
    """Subset of ClinicApplicationCreate that a website crawl + AI pass can
    plausibly populate. Everything stays optional except clinic_name —
    an admin fills in whatever the crawl/model couldn't find before
    submitting for real."""
    clinic_name: str = Field(max_length=200)
    city: Optional[str] = Field(default=None, max_length=100)
    address: Optional[str] = Field(default=None, max_length=500)
    contact_name: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=200)
    offers_aligners: bool = False
    offers_braces: bool = False
    offers_implants: bool = False
    treats_adults: bool = False
    treats_children: bool = False
    treatments_supported: List[str] = Field(default_factory=list)
    short_description: Optional[str] = Field(default=None, max_length=500)
    patient_intro: Optional[str] = Field(default=None, max_length=500)
    founded_year: Optional[int] = None
    doctor_spotlight_name: Optional[str] = Field(default=None, max_length=200)
    doctor_spotlight_role: Optional[str] = Field(default=None, max_length=200)
    doctor_spotlight_bio: Optional[str] = Field(default=None, max_length=1000)
    team_note: Optional[str] = Field(default=None, max_length=500)
    clinic_story: Optional[str] = Field(default=None, max_length=1500)
    environment_description: Optional[str] = Field(default=None, max_length=1000)
    consultation_process: Optional[str] = Field(default=None, max_length=1000)
    google_url: Optional[str] = Field(default=None, max_length=500)
    facebook_url: Optional[str] = Field(default=None, max_length=500)
    review_notes: Optional[str] = Field(
        default=None, max_length=1000,
        description="What's missing, uncertain, or worth the admin double-checking.",
    )


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
    can abort the whole crawl."""
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

        for sub_url in _discover_subpage_urls(website_url, home_html):
            if sum(len(b) for b in blocks) >= _MAX_TOTAL_CHARS:
                break
            try:
                resp = await client.get(sub_url)
                resp.raise_for_status()
            except Exception as e:
                warnings.append(f"Пропусната страница {sub_url}: {e}")
                continue
            crawled.append(sub_url)
            blocks.append(f"=== {sub_url} ===\n{_html_to_text(resp.text)}")

    combined = "\n\n".join(blocks)[:_MAX_TOTAL_CHARS]
    if len(combined) < 200:
        warnings.append("Извлеченото съдържание е много кратко — сайтът може да разчита на JavaScript рендиране.")
    return combined, crawled, warnings


_SYSTEM_PROMPT = f"""Ти помагаш на администратор на Zubite.bg (българска платформа,
свързваща пациенти с дентални клиники) да подготви кандидатура за партньорство
на клиника, като извлечеш информация от нейния собствен уебсайт.

Ще получиш суров текст, извлечен от няколко страници на сайта на клиниката.

Правила:
1. ФАКТИЧЕСКИ полета (clinic_name, city, address, phone, email, founded_year,
   google_url, facebook_url, treatments_supported, offers_*, treats_*) —
   извличай точно това, което пише на сайта. Не измисляй факти, които не са
   подкрепени от текста. Ако нещо липсва, остави полето празно (null).
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
"""


async def draft_profile_from_site(site_text: str, *, website_url: str) -> ClinicWebsitePrefillDraft:
    if not prefill_enabled():
        raise RuntimeError("ANTHROPIC_API_KEY не е конфигуриран.")

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    try:
        response = await client.messages.parse(
            model="claude-opus-5",
            max_tokens=4096,
            system=_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": (
                    f"Уебсайт: {website_url}\n\n"
                    f"Извлечено съдържание:\n\n{site_text}"
                ),
            }],
            output_format=ClinicWebsitePrefillDraft,
        )
    except anthropic.APIError as e:
        logging.error(f"Clinic website prefill: Anthropic API error: {e}")
        raise ValueError(f"Грешка при AI обработката: {e}")

    draft = response.parsed_output
    draft.treatments_supported = [
        t for t in draft.treatments_supported if t in TREATMENT_LABELS
    ]
    return draft
