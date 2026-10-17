"""Turn the links a clinic pastes into its intake photo fields into real photos.

Clinics often paste a page of their own website ("our team", "about us")
into a photo field rather than a link to an image file. Shown as-is, that is
a broken <img>. This module, for each photo slot:

1. fetches the pasted link (SSRF-guarded, size- and time-capped);
2. if it is already an image, uses it; if it is a page, collects every real
   photo on it — <img>/srcset/lazy attributes, CSS backgrounds, slider
   configs, the page's og:image — and drops logos, favicons, icons and
   small buttons;
3. picks the best candidate for that slot (doctor portrait, team, clinic
   interior, hero) with Claude vision when configured, otherwise with a
   keyword/shape heuristic;
4. stores the chosen photo in our own storage, so the profile does not
   depend on the clinic's site staying the same.

The result is a *suggestion* per slot. Nothing reaches the public profile
until an admin accepts it (routers/clinics.py).
"""
from __future__ import annotations

import asyncio
import base64
import html as html_lib
import io
import json
import logging
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from PIL import Image

from clinic_website_prefill import _reject_unsafe_url
from config import ANTHROPIC_API_KEY, APP_NAME

logger = logging.getLogger("zubite.photo_import")

# Photo fields on ClinicApplicationCreate / clinic_profile, in the order they
# are filled — so the doctor portrait claims its photo before the generic
# hero slot can take it.
SLOTS: dict[str, dict[str, Any]] = {
    "doctor_spotlight_image_url": {
        "label": "Снимка на лекаря",
        "describe": "a portrait of ONE dentist or doctor (head-and-shoulders or upper body). Exactly one person.",
        "keywords": ("д-р", "dr", "doctor", "лекар", "dentist", "стоматолог", "portrait", "портрет"),
        "min_side": 300,
        "shape": "portrait",
    },
    "team_image_url": {
        "label": "Снимка на екипа",
        "describe": "a group photo of SEVERAL clinic staff together (at least two people).",
        "keywords": ("екип", "team", "staff", "колектив", "персонал"),
        "min_side": 500,
        "shape": "wide",
    },
    "environment_image_url": {
        "label": "Снимка на клиниката",
        "describe": "the clinic's interior: a treatment room, dental chair, equipment, waiting area or reception. People are optional.",
        "keywords": ("кабинет", "клиника", "interior", "room", "чакалня", "reception", "рецепция",
                     "office", "микроскоп", "microscope", "стол", "chair", "gallery", "galery"),
        "min_side": 500,
        "shape": "wide",
    },
    "hero_image_url": {
        "label": "Главна снимка",
        "describe": "a wide, attractive photo that represents the clinic as a banner: the clinic, its rooms or its team. Not a logo, illustration or text graphic.",
        "keywords": ("клиника", "кабинет", "екип", "team", "clinic", "slide", "banner", "hero",
                     "gallery", "galery"),
        "min_side": 600,
        "shape": "wide",
    },
}

_IMAGE_EXT_RE = re.compile(r"\.(?:jpe?g|png|webp|gif|avif)(?:$|[?#])", re.I)
# Logos, favicons, icons, UI chrome and booking buttons are never profile photos.
_JUNK_RE = re.compile(
    r"\.svg(?:$|[?#])|logo|favicon|cropped-fav|apple-touch|icon|sprite|placeholder|loader|"
    r"spinner|flag|emoji|gravatar|avatar|btn[-_]|button|badge|pixel|/tr\?|blank\.gif|spacer|"
    # Theme/plugin UI assets (lightbox arrows, carousel play buttons, ticks).
    r"/wp-content/(?:plugins|themes)/|/wp-includes/|/assets/lib/",
    re.I,
)
# WordPress serves resized copies as name-WIDTHxHEIGHT.ext; the original is
# the same name without the suffix.
_WP_SIZE_RE = re.compile(r"-(\d{2,4})x(\d{2,4})(\.[a-z]{3,4})$", re.I)
_ABS_IMAGE_URL_RE = re.compile(r"https?:\\?/\\?/[^\s\"'<>()]+?\.(?:jpe?g|png|webp)", re.I)
_CSS_URL_RE = re.compile(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)", re.I)

_PAGE_MAX_BYTES = 4 * 1024 * 1024
_IMAGE_MAX_BYTES = 8 * 1024 * 1024
_FETCH_TIMEOUT = 10.0
_MAX_CANDIDATES = 24
_MAX_FOR_VISION = 8
_UA = "Mozilla/5.0 (compatible; ZubiteOnboardingBot/1.0)"
_CONTENT_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
_PIL_TYPES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp", "GIF": "image/gif"}


def looks_like_image_url(value: Any) -> bool:
    """True when a stored photo value can actually be shown in an <img>.

    Our own files (`/api/files/<id>`) and links ending in an image extension
    pass; a pasted web page ("https://clinic.bg/team/") does not.
    """
    if not isinstance(value, str) or not value.strip():
        return False
    v = value.strip()
    if v.startswith("/api/files/"):
        return True
    parsed = urlparse(v)
    if parsed.scheme not in ("http", "https"):
        return False
    return bool(_IMAGE_EXT_RE.search(parsed.path))


def public_image_url(value: Any) -> Optional[str]:
    """Safety net for every public payload: never hand the site a page link
    (or anything else) that would render as a broken image."""
    return value.strip() if looks_like_image_url(value) else None


@dataclass
class Candidate:
    url: str
    alt: str = ""
    source: str = "img"  # og | img | css | config
    fallback_url: Optional[str] = None  # resized copy if the original 404s


@dataclass
class LoadedImage:
    url: str
    data: bytes
    content_type: str
    width: int
    height: int
    alt: str
    source: str


def _clean(url: str, base: str) -> Optional[str]:
    url = html_lib.unescape(url.strip()).replace("\\/", "/")
    if not url or url.startswith(("data:", "blob:", "javascript:")):
        return None
    if url.startswith("//"):
        url = "https:" + url
    absolute = urljoin(base, url).split("#")[0]
    if urlparse(absolute).scheme not in ("http", "https"):
        return None
    return absolute


def _largest_from_srcset(srcset: str) -> Optional[str]:
    best, best_w = None, -1
    for part in srcset.split(","):
        bits = part.strip().split()
        if not bits:
            continue
        width = 0
        if len(bits) > 1 and bits[1].endswith("w"):
            try:
                width = int(bits[1][:-1])
            except ValueError:
                width = 0
        if width >= best_w:
            best, best_w = bits[0], width
    return best


def extract_candidates(page_url: str, html: str) -> list[Candidate]:
    """Every plausible photo on a page, best guesses first, junk removed."""
    soup = BeautifulSoup(html, "html.parser")
    found: list[tuple[str, str, str]] = []  # (raw url, alt, source)

    for prop in ("og:image", "og:image:secure_url", "twitter:image"):
        for meta in soup.find_all("meta", attrs={"property": prop}) + soup.find_all("meta", attrs={"name": prop}):
            if meta.get("content"):
                found.append((meta["content"], "", "og"))

    for img in soup.find_all(["img", "source"]):
        alt = (img.get("alt") or img.get("title") or "").strip()
        for attr in ("data-srcset", "srcset", "data-lazy-srcset"):
            if img.get(attr):
                largest = _largest_from_srcset(img[attr])
                if largest:
                    found.append((largest, alt, "img"))
        for attr in ("data-src", "data-lazy-src", "data-original", "data-full", "data-large_image", "src"):
            if img.get(attr):
                found.append((img[attr], alt, "img"))

    for el in soup.find_all(style=True):
        for match in _CSS_URL_RE.findall(el["style"]):
            found.append((match, el.get("aria-label") or "", "css"))
    for style in soup.find_all("style"):
        for match in _CSS_URL_RE.findall(style.get_text() or ""):
            if _IMAGE_EXT_RE.search(match):
                found.append((match, "", "css"))

    # Slider/gallery configs (Elementor, Revolution, Swiper) keep image URLs
    # in data attributes or inline JSON, often with escaped slashes.
    for match in _ABS_IMAGE_URL_RE.findall(html):
        found.append((match, "", "config"))

    out: list[Candidate] = []
    seen: set[str] = set()
    for raw, alt, source in found:
        url = _clean(raw, page_url)
        if not url or _JUNK_RE.search(url):
            continue
        if source != "og" and not _IMAGE_EXT_RE.search(urlparse(url).path):
            continue
        original, fallback = url, None
        m = _WP_SIZE_RE.search(urlparse(url).path)
        if m:
            original = url[: url.rfind(m.group(0))] + m.group(3) + url[url.rfind(m.group(0)) + len(m.group(0)):]
            fallback = url
        key = original.split("?")[0].lower()
        if key in seen:
            # Keep the first sighting but upgrade a missing alt text.
            for cand in out:
                if cand.url.split("?")[0].lower() == key and not cand.alt and alt:
                    cand.alt = alt
            continue
        seen.add(key)
        out.append(Candidate(url=original, alt=alt, source=source, fallback_url=fallback))
        if len(out) >= _MAX_CANDIDATES:
            break
    return out


async def _fetch(client: httpx.AsyncClient, url: str, max_bytes: int) -> tuple[bytes, str]:
    _reject_unsafe_url(url)
    async with client.stream("GET", url) as resp:
        resp.raise_for_status()
        chunks, total = [], 0
        async for chunk in resp.aiter_bytes():
            total += len(chunk)
            if total > max_bytes:
                raise ValueError("Файлът е твърде голям")
            chunks.append(chunk)
        return b"".join(chunks), (resp.headers.get("content-type") or "").split(";")[0].strip().lower()


def _decode(data: bytes) -> Optional[tuple[str, int, int]]:
    try:
        with Image.open(io.BytesIO(data)) as im:
            content_type = _PIL_TYPES.get(im.format or "")
            if not content_type:
                return None
            return content_type, im.width, im.height
    except Exception:
        return None


async def _load(client: httpx.AsyncClient, cand: Candidate) -> Optional[LoadedImage]:
    for url in (cand.url, cand.fallback_url):
        if not url:
            continue
        try:
            data, _ = await _fetch(client, url, _IMAGE_MAX_BYTES)
        except Exception:
            continue
        decoded = _decode(data)
        if decoded:
            content_type, w, h = decoded
            return LoadedImage(url, data, content_type, w, h, cand.alt, cand.source)
    return None


def _fits(slot: str, img: LoadedImage) -> bool:
    spec = SLOTS[slot]
    if min(img.width, img.height) < spec["min_side"] * 0.6 or max(img.width, img.height) < spec["min_side"]:
        return False
    ratio = img.width / img.height
    if ratio > 4.5 or ratio < 0.4:
        return False
    if spec["shape"] == "wide" and ratio < 0.9:
        return False
    return True


def heuristic_score(slot: str, img: LoadedImage) -> float:
    spec = SLOTS[slot]
    text = f"{img.alt} {urlparse(img.url).path}".lower()
    score = 0.0
    score += 5.0 * sum(1 for kw in spec["keywords"] if kw in text)
    ratio = img.width / img.height
    if spec["shape"] == "portrait":
        score += 3.0 if 0.6 <= ratio <= 1.3 else -2.0
        if img.source == "og":
            score += 2.0
    else:
        score += 2.0 if 1.3 <= ratio <= 3.2 else 0.0
    score += min(img.width * img.height / 1_000_000, 2.0)
    return score


def _thumbnail_b64(img: LoadedImage) -> str:
    with Image.open(io.BytesIO(img.data)) as im:
        im = im.convert("RGB")
        im.thumbnail((512, 512))
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=80)
    return base64.b64encode(buf.getvalue()).decode("ascii")


async def _choose_with_claude(slot: str, options: list[LoadedImage]) -> Optional[tuple[int, str]]:
    """Ask Claude which numbered photo fits the slot. Returns (index, reason)
    or None when the call fails (caller falls back to the heuristic)."""
    if not ANTHROPIC_API_KEY or not options:
        return None
    import anthropic

    content: list[dict[str, Any]] = []
    for i, img in enumerate(options):
        content.append({"type": "text", "text": f"Снимка {i}: {img.width}x{img.height}, alt: {img.alt or '—'}"})
        content.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                                    "data": _thumbnail_b64(img)}})
    content.append({"type": "text", "text": (
        f"Кое от тези изображения е най-подходящо за това място в профила на дентална клиника: "
        f"{SLOTS[slot]['describe']}\n"
        "Не избирай лого, илюстрация, икона, графика с текст или стокова снимка без връзка с клиниката. "
        "Ако нито едно не пасва, върни null.\n"
        'Отговори САМО с JSON: {"choice": <номер или null>, "reason": "<едно кратко изречение на български>"}'
    )})
    try:
        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-sonnet-5", max_tokens=200, messages=[{"role": "user", "content": content}],
        )
        text = "".join(getattr(b, "text", "") for b in response.content)
        data = json.loads(text[text.find("{"): text.rfind("}") + 1])
        choice = data.get("choice")
        reason = str(data.get("reason") or "")[:300]
        if choice is None:
            return (-1, reason or "Няма подходяща снимка на страницата.")
        if isinstance(choice, int) and 0 <= choice < len(options):
            return (choice, reason)
    except Exception as exc:
        logger.warning(f"Claude photo choice failed for {slot}: {exc}")
    return None


async def _store(img: LoadedImage) -> str:
    """Save a chosen photo in our bucket; returns the uploaded_files id."""
    from database import db
    from storage import put_object

    file_id = str(uuid.uuid4())
    ext = _CONTENT_TYPES[img.content_type]
    result = put_object(f"{APP_NAME}/clinic-photos/{file_id}.{ext}", img.data, img.content_type)
    await db.uploaded_files.insert_one({
        "id": file_id, "storage_path": result["path"],
        "original_filename": urlparse(img.url).path.rsplit("/", 1)[-1][:200],
        "content_type": img.content_type, "size": result["size"],
        "uploaded_by": "photo_import", "source_url": img.url, "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return file_id


async def suggest_photos(slot_links: dict[str, str]) -> dict[str, dict[str, Any]]:
    """One suggestion per slot from the pasted links. Never raises per slot."""
    suggestions: dict[str, dict[str, Any]] = {}
    pages: dict[str, list[LoadedImage]] = {}
    used: set[str] = set()
    now = datetime.now(timezone.utc).isoformat()

    async def _guard_redirect(request: httpx.Request) -> None:
        # Every hop, not just the pasted link: a redirect must not lead the
        # fetcher into a private network.
        _reject_unsafe_url(str(request.url))

    async with httpx.AsyncClient(timeout=_FETCH_TIMEOUT, follow_redirects=True,
                                 headers={"User-Agent": _UA},
                                 event_hooks={"request": [_guard_redirect]}) as client:
        for slot in SLOTS:
            link = (slot_links.get(slot) or "").strip()
            if not link or link.startswith("/api/files/"):
                continue
            base = {"source_page": link, "created_at": now, "label": SLOTS[slot]["label"]}
            try:
                if link not in pages:
                    data, content_type = await _fetch(client, link, _PAGE_MAX_BYTES)
                    decoded = _decode(data) if content_type.startswith("image/") or looks_like_image_url(link) else None
                    if decoded:
                        ct, w, h = decoded
                        pages[link] = [LoadedImage(link, data, ct, w, h, "", "direct")]
                    else:
                        cands = extract_candidates(link, data.decode("utf-8", errors="ignore"))
                        loaded = await asyncio.gather(*[_load(client, c) for c in cands])
                        pages[link] = [img for img in loaded if img]
                options = [img for img in pages[link]
                           if img.url.split("?")[0].lower() not in used and _fits(slot, img)]
                if not options:
                    suggestions[slot] = {**base, "status": "not_found",
                                         "reason": "Не открих подходяща снимка на тази страница."}
                    continue
                options.sort(key=lambda img: heuristic_score(slot, img), reverse=True)
                options = options[:_MAX_FOR_VISION]
                picked = await _choose_with_claude(slot, options)
                method = "claude"
                if picked is None:
                    picked, method = (0, "Избрана по описание и размер на снимката."), "heuristic"
                index, reason = picked
                if index < 0:
                    suggestions[slot] = {**base, "status": "not_found", "reason": reason}
                    continue
                chosen = options[index]
                file_id = await _store(chosen)
                used.add(chosen.url.split("?")[0].lower())
                suggestions[slot] = {
                    **base, "status": "pending", "method": method, "reason": reason,
                    "file_id": file_id, "image_url": f"/api/files/{file_id}",
                    "image_source_url": chosen.url, "width": chosen.width, "height": chosen.height,
                }
            except Exception as exc:
                logger.warning(f"Photo import failed for {slot} ({link}): {exc}")
                suggestions[slot] = {**base, "status": "failed", "reason": f"Страницата не може да бъде заредена: {exc}"[:300]}
    return suggestions
