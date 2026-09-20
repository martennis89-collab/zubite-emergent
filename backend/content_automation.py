"""ZUBITE_ARTICLE_PACKAGE parser (Phase 1 — content automation).

Pure helper: takes raw Markdown and returns a structured dict + a
validation report. NO Mongo / FastAPI imports here.

Required sections (fatal if missing): ARTICLE_META, ARTICLE_BODY_START,
ARTICLE_BODY_END, FAQ, CTA_BLOCK; plus Title + Slug inside ARTICLE_META.

Non-fatal warnings: GEO_SUMMARY, ENTITY_POSITIONING_BLOCK,
EXTRACTABLE_ANSWER_BLOCKS, SOURCE_BACKED_CLAIMS, DECISION_FRAMEWORK,
IMAGE_ASSETS, IMAGE_PROMPT_PACK, EXTERNAL_SOURCES, INTERNAL_LINKS.

Escaped-marker detection rejects pre-escaped Markdown like
`\\# ZUBITE\\_ARTICLE\\_PACKAGE` or `\\<\\!-- ARTICLE\\_META \\-->`.
"""

from __future__ import annotations
import re
import json
from typing import Any, Dict, List, Optional, Tuple

REQUIRED_HEADER = "# ZUBITE_ARTICLE_PACKAGE"

FATAL_SECTIONS = ("ARTICLE_META", "ARTICLE_BODY_START", "ARTICLE_BODY_END", "FAQ", "CTA_BLOCK")
WARN_SECTIONS = (
    "GEO_SUMMARY", "ENTITY_POSITIONING_BLOCK", "EXTRACTABLE_ANSWER_BLOCKS",
    "SOURCE_BACKED_CLAIMS", "DECISION_FRAMEWORK", "IMAGE_ASSETS",
    "IMAGE_PROMPT_PACK", "EXTERNAL_SOURCES", "INTERNAL_LINKS",
    "IMAGE_ALT_TEXTS", "FAQ_SCHEMA_JSON_LD", "ARTICLE_SCHEMA_JSON_LD",
)
ALL_SECTIONS = FATAL_SECTIONS + WARN_SECTIONS

# Detect escaped Markdown markers — Make.com / chat clients sometimes
# pre-escape `_` `#` `<` `>` etc. We reject these aggressively because
# silent acceptance would store unparseable bodies.
ESCAPED_PATTERNS = (
    r"\\#\s*ZUBITE",
    r"\\<\\!--",
    r"ZUBITE\\_ARTICLE\\_PACKAGE",
    r"ARTICLE\\_META",
    r"ARTICLE\\_BODY\\_START",
)


class PackageParseError(ValueError):
    """Raised for any fatal parse failure. The `code` attribute is a
    machine-readable identifier for the FastAPI layer to map to a
    consistent HTTP error code."""
    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.code = code


# Placeholder pattern in body — supports any name/index, e.g.
# {{image:support_1}}, {{image:diagram_3}}, {{image:comparison_table}}.
PLACEHOLDER_RE = re.compile(r"\{\{image:([a-zA-Z0-9_\-]+)\}\}")


def _check_escaped_markers(md: str) -> None:
    for pat in ESCAPED_PATTERNS:
        if re.search(pat, md):
            raise PackageParseError(
                "Escaped Markdown markers detected. Please provide raw Markdown package.",
                code="escaped_markers",
            )


def _extract_section(md: str, name: str) -> Optional[str]:
    """Return the text after `<!-- {name} -->` and before the next
    `<!-- SECTION -->` marker. None if the marker isn't present."""
    open_marker = f"<!-- {name} -->"
    if open_marker not in md:
        return None
    start = md.index(open_marker) + len(open_marker)
    # Find next any-section marker; ARTICLE_BODY_END is a sibling, not a wrapper
    next_marker_re = re.compile(r"<!--\s*[A-Z_]+\s*-->")
    m = next_marker_re.search(md, pos=start)
    end = m.start() if m else len(md)
    return md[start:end].strip()


def _extract_body(md: str) -> Optional[str]:
    s = md.find("<!-- ARTICLE_BODY_START -->")
    e = md.find("<!-- ARTICLE_BODY_END -->")
    if s < 0 or e < 0 or e <= s:
        return None
    return md[s + len("<!-- ARTICLE_BODY_START -->"):e].strip()


def _kv_block(text: str) -> Dict[str, str]:
    """Parse a `Key: value` block into a dict (case-preserving keys).
    Values may span multiple lines until the next `Key:` line."""
    out: Dict[str, List[str]] = {}
    cur: Optional[str] = None
    for raw in text.splitlines():
        line = raw.rstrip()
        m = re.match(r"^([A-Za-z][A-Za-z _\-]+?)\s*:\s*(.*)$", line)
        if m and not line.startswith(" ") and not line.startswith("\t"):
            cur = m.group(1).strip()
            out.setdefault(cur, []).append(m.group(2).strip())
        elif cur and line.strip():
            out[cur].append(line.strip())
    return {k: "\n".join(v).strip() for k, v in out.items()}


def _list_of_dicts(text: str) -> List[Dict[str, str]]:
    """Parse a section that contains bullet-style `* Key: value` records
    separated by blank lines. Each `* Key:` starts a new record."""
    items: List[Dict[str, str]] = []
    cur: Optional[Dict[str, str]] = None
    last_key: Optional[str] = None
    for raw in text.splitlines():
        line = raw.rstrip()
        # New item starts with "* Key: value" (markdown bullet)
        m = re.match(r"^\*\s+([A-Za-z][A-Za-z _\-]+?)\s*:\s*(.*)$", line)
        if m:
            # If this looks like the *first* key of a record (Type/Title/Question/Claim/Label),
            # start a new item.
            key = m.group(1).strip()
            first_keys = {"Type", "Question", "Claim", "Label", "Title", "Image number"}
            if cur is None or key in first_keys:
                cur = {}
                items.append(cur)
            cur[key] = m.group(2).strip()
            last_key = key
            continue
        # Continuation line "  Sub: value" (indented OR not)
        m2 = re.match(r"^\s*([A-Za-z][A-Za-z _\-]+?)\s*:\s*(.*)$", line)
        if m2 and cur is not None:
            cur[m2.group(1).strip()] = m2.group(2).strip()
            last_key = m2.group(1).strip()
            continue
        # Free continuation of last key
        if cur is not None and last_key and line.strip():
            cur[last_key] = (cur.get(last_key, "") + " " + line.strip()).strip()
    return [it for it in items if it]


def _escape_control_chars_in_strings(raw: str) -> str:
    """Escape literal newlines, carriage returns and tabs that sit *inside*
    a JSON string. A model writing JSON-LD routinely wraps a long description
    across lines, which strict JSON rejects as an unterminated string. Text
    outside strings is untouched, so indentation and layout survive.
    """
    out: List[str] = []
    in_string = False
    escaped = False
    for ch in raw:
        if escaped:
            out.append(ch)
            escaped = False
            continue
        if ch == "\\":
            out.append(ch)
            escaped = True
            continue
        if ch == '"':
            in_string = not in_string
            out.append(ch)
            continue
        if in_string and ch in "\n\r\t":
            out.append({"\n": "\\n", "\r": "\\r", "\t": "\\t"}[ch])
            continue
        out.append(ch)
    return "".join(out)


def _repair_llm_json(raw: str) -> str:
    """Best-effort repair of the JSON defects a language model actually makes.
    Only ever called after strict parsing has already failed, and the result is
    re-parsed before use -- an unsuccessful repair changes nothing.
    """
    repaired = _escape_control_chars_in_strings(raw)
    # Trailing comma before a closing brace or bracket.
    repaired = re.sub(r",(\s*[}\]])", r"\1", repaired)
    return repaired


def _parse_jsonld(
    text: Optional[str],
) -> Tuple[Optional[Dict[str, Any]], Optional[str], bool]:
    """Returns `(value, error, repaired)`. `repaired` is True when the block
    only parsed after a repair pass, so the caller can warn that the upstream
    output was malformed even though the article was saved.
    """
    if not text:
        return None, None, False
    # Strip ```json fences if present.
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned), None, False
    except Exception as exc:
        first_error = str(exc)
    repaired = _repair_llm_json(cleaned)
    if repaired != cleaned:
        try:
            return json.loads(repaired), None, True
        except Exception:
            pass
    return None, first_error, False


def parse_zubite_article_package(markdown: str) -> Tuple[Dict[str, Any], List[str], List[str]]:
    """Returns `(parsed, warnings, errors)`. Raises `PackageParseError`
    on fatal issues so the caller can map to a 4xx with a stable code."""
    if not isinstance(markdown, str) or not markdown.strip():
        raise PackageParseError("Missing markdown.", code="missing_markdown")
    _check_escaped_markers(markdown)
    if REQUIRED_HEADER not in markdown:
        raise PackageParseError(
            "Missing required header: # ZUBITE_ARTICLE_PACKAGE.",
            code="missing_header",
        )

    warnings: List[str] = []
    errors: List[str] = []

    # Fatal sections presence
    for sec in FATAL_SECTIONS:
        if f"<!-- {sec} -->" not in markdown:
            raise PackageParseError(
                f"Missing required section: {sec}.",
                code=f"missing_section:{sec}",
            )
    for sec in WARN_SECTIONS:
        if f"<!-- {sec} -->" not in markdown:
            warnings.append(f"Missing optional section: {sec}.")

    # ── ARTICLE_META ──
    meta_text = _extract_section(markdown, "ARTICLE_META") or ""
    meta = _kv_block(meta_text)
    title = meta.get("Title", "").strip()
    slug = meta.get("Slug", "").strip()
    if not title:
        raise PackageParseError("Missing required field: Title.", code="missing_title")
    if not slug:
        raise PackageParseError("Missing required field: Slug.", code="missing_slug")

    # ── BODY ──
    body = _extract_body(markdown)
    if body is None or not body.strip():
        raise PackageParseError(
            "Missing required section: ARTICLE_BODY_START / ARTICLE_BODY_END.",
            code="missing_body",
        )
    placeholders = sorted(set(PLACEHOLDER_RE.findall(body)))

    # ── FAQ ──
    faq_text = _extract_section(markdown, "FAQ") or ""
    faq_items: List[Dict[str, str]] = []
    cur_q: Optional[str] = None
    for raw in faq_text.splitlines():
        line = raw.strip()
        if line.startswith("Q:"):
            cur_q = line[2:].strip()
        elif line.startswith("A:") and cur_q:
            faq_items.append({"q": cur_q, "a": line[2:].strip()})
            cur_q = None

    # ── CTA_BLOCK ──
    cta_text = _extract_section(markdown, "CTA_BLOCK") or ""
    cta_kv = _kv_block(cta_text)
    cta = {
        "title": cta_kv.get("Title", ""),
        "text": cta_kv.get("Text", ""),
        "button": cta_kv.get("Button", ""),
        "url": cta_kv.get("URL", ""),
        "type": cta_kv.get("Type", ""),
    } if cta_kv else None

    # ── Optional structured blocks ──
    internal_links = [
        {"label": x.get("Label", ""), "url": x.get("URL", ""), "context": x.get("Context", "")}
        for x in _list_of_dicts(_extract_section(markdown, "INTERNAL_LINKS") or "")
    ]
    external_sources = [
        {"title": x.get("Title", ""), "url": x.get("URL", ""), "context": x.get("Context", "")}
        for x in _list_of_dicts(_extract_section(markdown, "EXTERNAL_SOURCES") or "")
    ]
    image_assets = _list_of_dicts(_extract_section(markdown, "IMAGE_ASSETS") or "")
    image_alt_texts = _kv_block(_extract_section(markdown, "IMAGE_ALT_TEXTS") or "")
    image_prompts = _list_of_dicts(_extract_section(markdown, "IMAGE_PROMPT_PACK") or "")
    extractable = _list_of_dicts(_extract_section(markdown, "EXTRACTABLE_ANSWER_BLOCKS") or "")
    claims = _list_of_dicts(_extract_section(markdown, "SOURCE_BACKED_CLAIMS") or "")
    geo_summary = _extract_section(markdown, "GEO_SUMMARY")
    entity_block = _extract_section(markdown, "ENTITY_POSITIONING_BLOCK")
    decision_fw = _extract_section(markdown, "DECISION_FRAMEWORK")

    # ── JSON-LD ──
    faq_ld, faq_err, faq_fixed = _parse_jsonld(
        _extract_section(markdown, "FAQ_SCHEMA_JSON_LD"))
    art_ld, art_err, art_fixed = _parse_jsonld(
        _extract_section(markdown, "ARTICLE_SCHEMA_JSON_LD"))
    if faq_err:
        errors.append(f"Invalid JSON-LD in FAQ_SCHEMA_JSON_LD: {faq_err}")
    if art_err:
        errors.append(f"Invalid JSON-LD in ARTICLE_SCHEMA_JSON_LD: {art_err}")
    if faq_fixed:
        warnings.append("FAQ_SCHEMA_JSON_LD was malformed and repaired on import.")
    if art_fixed:
        warnings.append("ARTICLE_SCHEMA_JSON_LD was malformed and repaired on import.")

    # ── Image-asset / placeholder consistency warnings ──
    asset_placeholders = {a.get("Placeholder", "").strip() for a in image_assets if a.get("Placeholder")}
    body_placeholder_tokens = {f"{{{{image:{p}}}}}" for p in placeholders}
    for p in body_placeholder_tokens - asset_placeholders:
        warnings.append(f"Placeholder {p} exists in body but no image asset is defined.")
    for p in asset_placeholders - body_placeholder_tokens:
        if p:
            warnings.append(f"IMAGE_ASSETS defines {p} but body does not contain it.")

    parsed = {
        "header_detected": True,
        "meta": meta,
        "title": title,
        "slug": slug,
        "seo_title": meta.get("SEO Title") or None,
        "meta_description": meta.get("Meta Description") or None,
        "excerpt": meta.get("Excerpt") or "",
        "category": (meta.get("Category") or "orthodontics").strip(),
        "tags": [t.strip() for t in (meta.get("Tags") or "").split(",") if t.strip()],
        "language": meta.get("Language") or "bg",
        "reviewed_by": meta.get("Reviewed By") or None,
        "last_reviewed": meta.get("Last Reviewed") or None,
        "focus_keyword": meta.get("Focus Keyword") or None,
        "secondary_keywords": [k.strip() for k in (meta.get("Secondary Keywords") or "").split(",") if k.strip()],
        "reading_time": meta.get("Reading Time") or None,
        "body": body,
        "placeholders_in_body": placeholders,
        "faq": faq_items,
        "cta": cta,
        "internal_links": internal_links,
        "external_sources": external_sources,
        "image_assets": image_assets,
        "image_alt_texts": image_alt_texts,
        "image_prompts": image_prompts,
        "extractable_answer_blocks": extractable,
        "source_backed_claims": claims,
        "geo_summary": geo_summary,
        "entity_positioning_block": entity_block,
        "decision_framework": decision_fw,
        "faq_schema": faq_ld,
        "article_schema": art_ld,
    }
    return parsed, warnings, errors


def build_image_requirements(article_id: str, image_assets: List[Dict[str, str]],
                             placeholders_in_body: List[str]) -> List[Dict[str, Any]]:
    """Translate parsed IMAGE_ASSETS into image-requirement records.
    Also generates implicit support requirements for body placeholders
    that have no matching IMAGE_ASSETS entry — admin can fill these in
    manually later."""
    from datetime import datetime, timezone
    import uuid as _uuid
    now = datetime.now(timezone.utc).isoformat()
    out: List[Dict[str, Any]] = []
    asset_placeholder_tokens = set()
    for a in image_assets or []:
        ph = (a.get("Placeholder") or "").strip()
        if ph:
            asset_placeholder_tokens.add(ph)
        out.append({
            "id": str(_uuid.uuid4()),
            "article_id": article_id,
            "type": (a.get("Type") or "support").strip().lower(),
            "expected_filename": (a.get("File Name") or "").strip(),
            "alt": a.get("Alt") or "",
            "title": a.get("Title") or "",
            "caption": a.get("Caption") or "",
            "placement": (a.get("Placement") or "").strip(),
            "placeholder": ph or None,
            "uploaded_file_url": None,
            "uploaded_file_name": None,
            "upload_status": "missing",
            "matched_by": None,
            "created_at": now,
            "updated_at": now,
        })
    # Implicit slots for placeholders present in body without an asset entry
    for p in placeholders_in_body or []:
        token = f"{{{{image:{p}}}}}"
        if token in asset_placeholder_tokens:
            continue
        out.append({
            "id": str(_uuid.uuid4()),
            "article_id": article_id,
            "type": "support",
            "expected_filename": "",
            "alt": "",
            "title": "",
            "caption": "",
            "placement": "inline",
            "placeholder": token,
            "uploaded_file_url": None,
            "uploaded_file_name": None,
            "upload_status": "missing",
            "matched_by": None,
            "implicit": True,
            "created_at": now,
            "updated_at": now,
        })
    return out



# ═══════════════════════════════════════════════════════════════════════
# Phase 4 — Render-time placeholder replacement & publish protection
# ═══════════════════════════════════════════════════════════════════════

PLACEHOLDER_REGEX = re.compile(r"\{\{image:([a-zA-Z0-9_\-]+)\}\}")


def _markdown_escape(text: str) -> str:
    """Escape characters that would break inside a markdown image alt/title."""
    if not text:
        return ""
    return (text.replace("\\", "\\\\").replace('"', '\\"')
                .replace("[", "\\[").replace("]", "\\]"))


def _req_placeholder_name(req: Dict[str, Any]) -> Optional[str]:
    """Return the placeholder *name* part (e.g. ``support_1``) for a
    requirement, regardless of whether it stores the bare name or the full
    ``{{image:x}}`` token."""
    ph = (req.get("placeholder") or "").strip()
    if not ph:
        return None
    m = PLACEHOLDER_REGEX.match(ph)
    if m:
        return m.group(1)
    return ph


def find_unresolved_placeholders(content: str, attached_names: set[str]) -> List[str]:
    """Return placeholder names present in body but not in the attached set."""
    if not content:
        return []
    found = set(PLACEHOLDER_REGEX.findall(content))
    return sorted(found - attached_names)


def render_content_with_images(content: str, requirements: List[Dict[str, Any]]) -> str:
    """Replace ``{{image:x}}`` in ``content`` with Markdown image syntax
    using ``requirements`` whose ``upload_status == "attached"``.

    Featured-type requirements are NEVER inserted into the body (they are
    rendered via the article's ``featured_image`` field).

    Unresolved placeholders are removed (replaced with the empty string),
    so public pages never display raw ``{{image:x}}`` tokens.

    The original ``content`` is not mutated; a new string is returned.
    """
    if not content:
        return content
    attached_by_name: Dict[str, Dict[str, Any]] = {}
    for r in requirements or []:
        if (r.get("type") or "").lower() == "featured":
            continue
        if r.get("upload_status") != "attached":
            continue
        if not r.get("uploaded_file_url"):
            continue
        name = _req_placeholder_name(r)
        if not name:
            continue
        # Last writer wins (admin-attached duplicates are a UI warning, not
        # a renderer concern).
        attached_by_name[name] = r

    def _sub(match: re.Match) -> str:
        name = match.group(1)
        req = attached_by_name.get(name)
        if not req:
            return ""
        url = req["uploaded_file_url"]
        alt = _markdown_escape(req.get("alt") or req.get("title") or "")
        title = _markdown_escape(req.get("title") or "")
        caption = (req.get("caption") or "").strip()
        # Markdown figure on its own paragraph
        img = f'![{alt}]({url}'
        if title:
            img += f' "{title}"'
        img += ")"
        if caption:
            # parseMarkdown will keep the image and the italic line together
            # in the same paragraph; force separation with a double newline.
            return f"\n\n{img}\n\n*{caption}*\n\n"
        return f"\n\n{img}\n\n"

    return PLACEHOLDER_REGEX.sub(_sub, content)
