"""Общност (Q&A) — questions, browse, moderation, and answers.

Public / patient:
    POST /api/community/questions                 (patient) ask a question
    GET  /api/community/questions                 browse published (topic/sort/paginate)
    GET  /api/community/questions/{slug}          single published question + answers
    GET  /api/community/topics                    topic tiles + published counts
    POST /api/community/questions/{id}/report     (patient) flag a question
    POST /api/community/questions/{id}/answers    (patient) peer answer — post-moderated
    POST /api/community/answers/{id}/upvote       (patient) "това ми помогна"
    POST /api/community/answers/{id}/report       (patient) flag an answer
    POST /api/community/questions/{id}/photos              (patient, owner) attach a photo
    GET  /api/community/questions/{id}/photos/{photo_id}   published-or-owner

Clinic:
    GET  /api/clinic/community/questions          queue matched to the clinic's treatments
    POST /api/clinic/community/questions/{id}/answers   expert answer — publishes instantly

Admin:
    GET  /api/admin/community/questions?status=   moderation queue
    GET  /api/admin/community/questions/{id}
    POST /api/admin/community/questions/{id}/approve
    POST /api/admin/community/questions/{id}/reject
    GET  /api/admin/community/questions/{id}/photos/{photo_id}   bypasses visibility gate

Design (mirrors clinic_reviews):
- Hybrid moderation on QUESTIONS: every question is `pending` until an admin
  approves. Safety triage: acute-symptom questions are stored + `safety_flag`,
  the POST response carries an emergency interstitial, and they stay out of
  the public browse surface until reviewed.
- Hybrid moderation on ANSWERS: a verified clinic's answer publishes
  instantly (`is_expert=True`, badged) — trusted role, spot-checked after.
  A patient's peer answer also publishes immediately but is post-moderated:
  it auto-hides once report_count reaches `_ANSWER_REPORT_HIDE_THRESHOLD`.
- A clinic may post at most one answer per question
  (`_MAX_CLINIC_ANSWERS_PER_QUESTION`) — one canonical expert take, not a
  competition for visibility.
- Clinic answers are stripped of URLs and PII (`strip_urls` + `scrub_pii`):
  educational content, not a funnel to the clinic's own site.
- PII (emails/phones) scrubbed before storage on every free-text field.
- Asker/answerer identity is anonymised to a display snapshot.
- IP/UA stored as SHA-256 hashes only; never raw.
- Question photos live in their own `qa_question_photos` collection, served
  through a purpose-built path (not the public blog `uploaded_files`/
  `/api/files/{id}` pattern, which is unconditionally public the instant
  it's uploaded — wrong here, since a photo must stay private until its
  parent question clears moderation). Public GET only serves once the
  question is `published`, or to the owning patient; admin GET bypasses
  that gate entirely so moderators can review pending photos.
"""
from __future__ import annotations

import hashlib
import html
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile
from starlette.concurrency import run_in_threadpool

from auth import (
    get_current_patient, get_current_patient_optional, get_current_user,
    get_current_clinic,
)
from audit import audit_log
from config import APP_NAME, CITIES
from community_safety import scan_red_flags, scrub_pii, strip_urls
from community_topics import COMMUNITY_TOPICS, get_topic, is_valid_topic, topics_for_clinic
from community_seed_content import PERSONAS, SEED_BATCH_ID, SEED_ITEMS
from database import db
from emails import send_community_answer_email
from rate_limit import rate_limit
from routers.public import (
    _resolve_partner_tier, _TIER_BOOST_LEGACY, _BASE_PACKAGE_BOOST, _public_profile_for_tier,
)
from routers.public_clinics import _public_visibility_query, slugify_clinic, resolve_city_slug
from schemas import AdminUser, QaQuestionCreate, QaReportCreate, QaModerationBody, QaAnswerCreate
from storage import ALLOWED_IMAGE_TYPES, get_object, put_object

_SOFIA_TZ = ZoneInfo("Europe/Sofia")

router = APIRouter()

_QUESTION_STATUSES = {"pending", "published", "rejected"}
_MAX_CLINIC_ANSWERS_PER_QUESTION = 1
_ANSWER_REPORT_HIDE_THRESHOLD = 3
_MAX_QUESTION_PHOTOS = 3
_MAX_QUESTION_PHOTO_BYTES = 8 * 1024 * 1024  # 8MB — bite/teeth photos, not medical scans

# Emergency guidance shown when a question trips the red-flag scan.
_EMERGENCY_INTERSTITIAL = {
    "title": "Възможно е това да е спешен случай",
    "message": (
        "Описаното може да изисква спешна помощ. Не изчаквайте отговор от "
        "общността — свържете се с дентална клиника или спешен център, а при "
        "затруднено дишане/преглъщане се обадете на 112."
    ),
}


# ─── helpers ──────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


# Minimal Cyrillic→Latin transliteration for readable, ASCII slugs.
_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ж": "zh",
    "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n",
    "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f",
    "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sht", "ъ": "a",
    "ь": "y", "ю": "yu", "я": "ya",
}


def _slugify(title: str) -> str:
    """Transliterate + slug a Bulgarian title, then append a short unique
    suffix so two similar titles never collide."""
    low = title.strip().lower()
    out = "".join(_TRANSLIT.get(ch, ch) for ch in low)
    out = re.sub(r"[^a-z0-9]+", "-", out).strip("-")
    out = out[:60].strip("-") or "vapros"
    return f"{out}-{uuid.uuid4().hex[:6]}"


def _asker_display(patient: Dict[str, Any]) -> str:
    """Anonymised author label. Prefers an explicit display_name, else
    'Пациент от <град>', else a neutral fallback."""
    name = (patient.get("display_name") or "").strip()
    if name:
        return name[:60]
    city_slug = patient.get("city_slug")
    city = CITIES.get(city_slug) if city_slug else None
    return f"Пациент от {city}" if city else "Пациент"


_EXCERPT_LENGTH = 160


def _excerpt(body: Optional[str], length: int = _EXCERPT_LENGTH) -> str:
    text = (body or "").strip()
    if len(text) <= length:
        return text
    return text[:length].rsplit(" ", 1)[0] + "…"


def _public_question(
    q: Dict[str, Any], *,
    include_body: bool = True,
    include_excerpt: bool = False,
    upvoted_ids: Optional[set] = None,
) -> Dict[str, Any]:
    """Public-safe projection. Never exposes email/hashes/patient_id."""
    out = {
        "id": q["id"],
        "slug": q["slug"],
        "topic": q["topic"],
        "topic_label": (get_topic(q["topic"]) or {}).get("label"),
        "title": q["title"],
        "asker_display": q.get("asker_display"),
        "answer_count": int(q.get("answer_count", 0)),
        "upvotes": int(q.get("upvotes", 0)),
        "has_upvoted": bool(upvoted_ids) and q["id"] in upvoted_ids,
        "created_at": q.get("created_at"),
        "published_at": q.get("published_at"),
    }
    if include_body:
        out["body"] = q.get("body")
    if include_excerpt:
        out["excerpt"] = _excerpt(q.get("body"))
    return out


# ─── PUBLIC: ask ──────────────────────────────────────────────────

@router.post(
    "/community/questions",
    dependencies=[Depends(rate_limit("community_ask", 5, 600))],
)
async def create_question(
    body: QaQuestionCreate, request: Request, patient=Depends(get_current_patient),
):
    if not is_valid_topic(body.topic):
        raise HTTPException(status_code=400, detail="Невалидна тема")

    # Scrub PII. We do NOT HTML-escape here: every render path (patient
    # pages + admin queue) is a React text node, which escapes on output.
    # Escaping at storage would double-escape and surface literal entities
    # (e.g. "&lt;") to readers. Storage stays raw-but-clean; rendering is
    # never done via dangerouslySetInnerHTML.
    clean_title = scrub_pii(body.title.strip())
    clean_body = scrub_pii(body.body.strip())

    flagged, matched = scan_red_flags(f"{body.title}\n{body.body}")

    ip = request.client.host if request.client else ""
    ua = request.headers.get("user-agent", "")

    doc = {
        "id": str(uuid.uuid4()),
        "slug": _slugify(body.title),
        "topic": body.topic,
        "title": clean_title,
        "body": clean_body,
        "patient_id": patient["id"],
        "asker_display": _asker_display(patient),
        "city_slug": patient.get("city_slug"),
        "status": "pending",
        "safety_flag": flagged,
        "safety_terms": matched or None,
        "answer_count": 0,
        "upvotes": 0,
        "report_count": 0,
        "created_at": _now(),
        "published_at": None,
        "moderated_by": None,
        "moderated_at": None,
        "moderation_notes": None,
        "ip_hash": _hash(ip) if ip else None,
        "user_agent_hash": _hash(ua) if ua else None,
    }
    await db.qa_questions.insert_one(doc)

    resp: Dict[str, Any] = {
        "success": True,
        "id": doc["id"],
        "slug": doc["slug"],
        "message": "Благодарим. Въпросът ще бъде прегледан преди публикуване.",
    }
    if flagged:
        resp["emergency"] = _EMERGENCY_INTERSTITIAL
    return resp


# ─── PUBLIC: browse ───────────────────────────────────────────────

@router.get("/community/topics")
async def list_topics():
    """Topic tiles with published-question counts."""
    counts_cursor = db.qa_questions.aggregate([
        {"$match": {"status": "published"}},
        {"$group": {"_id": "$topic", "n": {"$sum": 1}}},
    ])
    counts = {c["_id"]: c["n"] async for c in counts_cursor}
    return {
        "topics": [
            {
                "slug": t["slug"],
                "label": t["label"],
                "description": t["description"],
                "related_path": t["related_path"],
                "question_count": counts.get(t["slug"], 0),
            }
            for t in COMMUNITY_TOPICS
        ]
    }


def _spotlight_weight(clinic: Dict[str, Any]) -> int:
    """Every visible clinic gets at least one entry in the rotation pool;
    higher-tier clinics get more, using the exact same tier-boost values
    already used for recommendation scoring in public.py — "weight" means
    the same thing here it means everywhere else in this codebase."""
    bp = (clinic.get("base_package") or "").strip().lower()
    if bp in _BASE_PACKAGE_BOOST:
        boost = _BASE_PACKAGE_BOOST[bp]
    else:
        boost = _TIER_BOOST_LEGACY.get(_resolve_partner_tier(clinic), 0)
    return 1 + boost


@router.get("/community/spotlight")
async def get_spotlight():
    """"Клиника на деня" — deterministic, Sofia-calendar-day rotation.
    Prefers the eligible higher-tier pool when one exists, then degrades
    through candidate pools (any published -> visible-only) before giving
    up; returns {"clinic": None} rather than an
    error when nothing is eligible — the widget simply doesn't render, never
    shows a broken/empty box. Stateless: recomputed on every request from
    live clinic data, no cache to invalidate when an admin changes a tier
    or publishes a profile.

    The final eligible pool is rotated sequentially by Sofia calendar date.
    That guarantees a different clinic on consecutive days whenever the pool
    contains more than one clinic, instead of merely making a new random pick
    that could repeat yesterday's profile."""
    base_query = _public_visibility_query()

    async def _pool(extra: Dict[str, Any]) -> List[Dict[str, Any]]:
        query = {**base_query, **extra}
        return await db.clinics.find(query, {"_id": 0}).to_list(200)

    pool = await _pool({"clinic_profile.profile_status": "published"})
    premium_pool = [c for c in pool if _spotlight_weight(c) > 1]
    pool = premium_pool or pool
    if not pool:
        pool = await _pool({})
    if not pool:
        return {"clinic": None}

    ordered_pool = sorted(pool, key=lambda c: c["id"])
    today = datetime.now(_SOFIA_TZ).date()
    rotation_offset = int(
        hashlib.sha256(b"clinic_spotlight_rotation_v2").hexdigest(),
        16,
    ) % len(ordered_pool)
    clinic = ordered_pool[(today.toordinal() + rotation_offset) % len(ordered_pool)]

    tier = _resolve_partner_tier(clinic)
    profile = _public_profile_for_tier(clinic, tier) or {}
    treatments = clinic.get("treatments_supported") or clinic.get("treatments_offered") or []
    specialty_slug = treatments[0] if treatments and isinstance(treatments[0], str) else "klinika"
    name = clinic.get("clinic_name") or clinic.get("name") or ""
    current_year = today.year
    founded_year_raw = profile.get("founded_year")
    founded_year = (
        founded_year_raw
        if isinstance(founded_year_raw, int)
        and not isinstance(founded_year_raw, bool)
        and 1900 <= founded_year_raw <= current_year
        else None
    )

    return {
        "clinic": {
            "id": clinic["id"],
            # Clinics have no stored `slug` field — the public profile URL
            # slug is always derived from the name, same as `_public_clinic_
            # payload` in public_clinics.py, so this must match exactly.
            "slug": slugify_clinic(name) or clinic["id"],
            "name": name,
            "city_slug": resolve_city_slug(clinic),
            "city_name": clinic.get("city_name") or clinic.get("city"),
            "area": clinic.get("area"),
            "specialty_slug": specialty_slug,
            "short_description": profile.get("short_description"),
            "patient_intro": profile.get("patient_intro"),
            "hero_image_url": profile.get("hero_image_url"),
            "treatment_focus": profile.get("treatment_focus") or [],
            "years_in_business": current_year - founded_year if founded_year is not None else None,
            "online_consultation": bool(clinic.get("online_consultation")),
            "accepts_adults": clinic.get("accepts_adults"),
            "accepts_children": clinic.get("accepts_children"),
            "profile_information_reviewed": bool(
                clinic.get("review_sources_verified_by_admin")
            ),
            "rotation_date": today.isoformat(),
        },
    }


@router.get("/community/questions")
async def list_questions(
    topic: Optional[str] = Query(None),
    q: Optional[str] = Query(None, max_length=160),
    sort: str = Query("new"),
    # Upper bound raised to 500 (mirrors /api/blog/posts) so the sitemap
    # builder can pull every published question in one call rather than
    # paginating — see frontend/app/sitemap.ts.
    limit: int = Query(20, ge=1, le=500),
    offset: int = Query(0, ge=0),
    patient=Depends(get_current_patient_optional),
):
    query: Dict[str, Any] = {"status": "published"}
    if topic:
        if not is_valid_topic(topic):
            raise HTTPException(status_code=400, detail="Невалидна тема")
        query["topic"] = topic
    if q and q.strip():
        # Plain case-insensitive regex, no text index — matches every other
        # search-like filter in this codebase (public_clinics.py,
        # patient_auth.py). Unindexed scan over an already status/topic-
        # filtered set; fine at current Общност volume, revisit with a real
        # text index only if this grows to tens of thousands of questions.
        term = re.escape(q.strip())
        query["$or"] = [
            {"title": {"$regex": term, "$options": "i"}},
            {"body": {"$regex": term, "$options": "i"}},
        ]

    sort_spec = [("answer_count", -1), ("published_at", -1)] if sort == "top" \
        else [("published_at", -1)]

    total = await db.qa_questions.count_documents(query)
    cursor = db.qa_questions.find(query, {"_id": 0}).sort(sort_spec).skip(offset).limit(limit)
    docs = [doc async for doc in cursor]

    upvoted_ids: set = set()
    if patient and docs:
        vote_cursor = db.qa_question_votes.find(
            {"patient_id": patient["id"], "question_id": {"$in": [d["id"] for d in docs]}},
            {"_id": 0, "question_id": 1},
        )
        upvoted_ids = {v["question_id"] async for v in vote_cursor}

    items = [
        _public_question(doc, include_body=False, include_excerpt=True, upvoted_ids=upvoted_ids)
        for doc in docs
    ]
    return {"total": total, "limit": limit, "offset": offset, "items": items}


def _public_answer(a: Dict[str, Any], *, upvoted_ids: Optional[set] = None) -> Dict[str, Any]:
    return {
        "id": a["id"],
        "author_type": a.get("author_type"),
        "author_display": a.get("author_display"),
        "is_expert": bool(a.get("is_expert")),
        "body": a.get("body"),
        "upvotes": int(a.get("upvotes", 0)),
        "created_at": a.get("created_at"),
        "has_upvoted": bool(upvoted_ids) and a["id"] in upvoted_ids,
    }


@router.get("/community/questions/{slug}")
async def get_question(slug: str, patient=Depends(get_current_patient_optional)):
    doc = await db.qa_questions.find_one({"slug": slug, "status": "published"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Въпросът не е намерен")

    answers_cursor = db.qa_answers.find(
        {"question_id": doc["id"], "status": "published"}, {"_id": 0},
    ).sort([("is_expert", -1), ("upvotes", -1), ("created_at", 1)])
    answer_docs = [a async for a in answers_cursor]

    upvoted_ids: set = set()
    if patient and answer_docs:
        vote_cursor = db.qa_answer_votes.find(
            {"patient_id": patient["id"], "answer_id": {"$in": [a["id"] for a in answer_docs]}},
            {"_id": 0, "answer_id": 1},
        )
        upvoted_ids = {v["answer_id"] async for v in vote_cursor}

    question_upvoted_ids: set = set()
    if patient:
        qv = await db.qa_question_votes.find_one(
            {"question_id": doc["id"], "patient_id": patient["id"]}, {"_id": 0},
        )
        if qv:
            question_upvoted_ids = {doc["id"]}

    out = _public_question(doc, include_body=True, upvoted_ids=question_upvoted_ids)
    out["topic_related_path"] = (get_topic(doc["topic"]) or {}).get("related_path")
    out["answers"] = [_public_answer(a, upvoted_ids=upvoted_ids) for a in answer_docs]
    # A patient may answer if logged in and hasn't already posted on this
    # thread (one peer answer per patient per question keeps signal high).
    already_answered = bool(patient) and any(
        a.get("author_type") == "patient" and a.get("author_id") == patient["id"]
        for a in answer_docs
    )
    out["can_answer"] = bool(patient) and not already_answered
    # doc["status"] == "published" here unconditionally (the find_one filter
    # above), so every photo attached to it is inherently public-safe —
    # no separate gating needed for this list, same reasoning as `answers`.
    photos_cursor = db.qa_question_photos.find(
        {"question_id": doc["id"], "is_deleted": False},
        {"_id": 0, "id": 1, "content_type": 1, "display_order": 1},
    ).sort("display_order", 1)
    out["photos"] = [{"id": p["id"], "content_type": p["content_type"]} async for p in photos_cursor]
    return out


@router.post(
    "/community/questions/{question_id}/report",
    dependencies=[Depends(rate_limit("community_report", 10, 600))],
)
async def report_question(
    question_id: str, body: QaReportCreate, request: Request,
    patient=Depends(get_current_patient),
):
    q = await db.qa_questions.find_one({"id": question_id}, {"_id": 0, "id": 1})
    if not q:
        raise HTTPException(status_code=404, detail="Въпросът не е намерен")
    await db.qa_reports.insert_one({
        "id": str(uuid.uuid4()),
        "target_type": "question",
        "target_id": question_id,
        "reporter_patient_id": patient["id"],
        "reason": html.escape(body.reason.strip()),
        "status": "open",
        "created_at": _now(),
    })
    await db.qa_questions.update_one({"id": question_id}, {"$inc": {"report_count": 1}})
    return {"success": True, "message": "Благодарим. Сигналът е получен."}


@router.post(
    "/community/questions/{question_id}/upvote",
    dependencies=[Depends(rate_limit("community_upvote", 30, 600))],
)
async def upvote_question(question_id: str, patient=Depends(get_current_patient)):
    """Idempotent toggle — "и аз имам този въпрос" ("I have this question
    too"). Deliberately does NOT touch reputation — see upvote_answer's
    docstring; that signal rewards helpful answers, not popular questions.
    Rewarding a question upvote would let anyone farm reputation just by
    asking a common question, not by helping other patients."""
    question = await db.qa_questions.find_one({"id": question_id}, {"_id": 0, "id": 1})
    if not question:
        raise HTTPException(status_code=404, detail="Въпросът не е намерен")

    existing = await db.qa_question_votes.find_one(
        {"question_id": question_id, "patient_id": patient["id"]}, {"_id": 0},
    )
    if existing:
        await db.qa_question_votes.delete_one(
            {"question_id": question_id, "patient_id": patient["id"]},
        )
        await db.qa_questions.update_one({"id": question_id}, {"$inc": {"upvotes": -1}})
        return {"success": True, "upvoted": False}

    await db.qa_question_votes.insert_one({
        "id": str(uuid.uuid4()),
        "question_id": question_id,
        "patient_id": patient["id"],
        "created_at": _now(),
    })
    await db.qa_questions.update_one({"id": question_id}, {"$inc": {"upvotes": 1}})
    return {"success": True, "upvoted": True}


# ─── PUBLIC: question photos ───────────────────────────────────────

@router.post(
    "/community/questions/{question_id}/photos",
    dependencies=[Depends(rate_limit("community_photo_upload", 10, 600))],
)
async def upload_question_photo(
    question_id: str, file: UploadFile = File(...),
    patient=Depends(get_current_patient),
):
    """Attach a photo to a question the caller asked. Always called AFTER
    the question itself was already created via POST /community/questions —
    a failed upload here never blocks or rolls back question creation."""
    q = await db.qa_questions.find_one(
        {"id": question_id, "patient_id": patient["id"]}, {"_id": 0, "id": 1},
    )
    if not q:
        raise HTTPException(status_code=404, detail="Въпросът не е намерен")

    existing_count = await db.qa_question_photos.count_documents(
        {"question_id": question_id, "is_deleted": False},
    )
    if existing_count >= _MAX_QUESTION_PHOTOS:
        raise HTTPException(
            status_code=400,
            detail={"code": "too_many_photos",
                    "message": f"Максимум {_MAX_QUESTION_PHOTOS} снимки на въпрос."},
        )

    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"code": "unsupported_file_type",
                    "message": "Приемаме снимки (JPG, PNG, WEBP, GIF)."},
        )
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail={"code": "empty_file"})
    if len(data) > _MAX_QUESTION_PHOTO_BYTES:
        raise HTTPException(
            status_code=400,
            detail={"code": "file_too_large", "message": "Максималният размер е 8 MB."},
        )

    photo_id = str(uuid.uuid4())
    ext = ALLOWED_IMAGE_TYPES[content_type]
    storage_path = f"{APP_NAME}/community/questions/{question_id}/{photo_id}.{ext}"
    # put_object is blocking boto3 — offload so it doesn't stall the event loop.
    await run_in_threadpool(put_object, storage_path, data, content_type)

    await db.qa_question_photos.insert_one({
        "id": photo_id,
        "question_id": question_id,
        "patient_id": patient["id"],
        "storage_path": storage_path,
        "original_filename": file.filename,
        "content_type": content_type,
        "size": len(data),
        "display_order": existing_count,
        "is_deleted": False,
        "created_at": _now(),
    })
    return {"id": photo_id, "content_type": content_type, "size": len(data)}


async def _serve_question_photo(record: Dict[str, Any]) -> Response:
    data, content_type = await run_in_threadpool(get_object, record["storage_path"])
    return Response(
        content=data,
        media_type=record.get("content_type") or content_type,
        headers={"X-Content-Type-Options": "nosniff"},
    )


@router.get("/community/questions/{question_id}/photos/{photo_id}")
async def get_question_photo(
    question_id: str, photo_id: str,
    patient=Depends(get_current_patient_optional),
):
    photo = await db.qa_question_photos.find_one(
        {"id": photo_id, "question_id": question_id, "is_deleted": False}, {"_id": 0},
    )
    if not photo:
        raise HTTPException(status_code=404, detail="Not found")
    q = await db.qa_questions.find_one(
        {"id": question_id}, {"_id": 0, "status": 1, "patient_id": 1},
    )
    is_published = bool(q) and q.get("status") == "published"
    is_owner = bool(patient) and bool(q) and q.get("patient_id") == patient["id"]
    if not (is_published or is_owner):
        # 404, not 403 — never confirm existence of a pending/foreign photo.
        raise HTTPException(status_code=404, detail="Not found")
    resp = await _serve_question_photo(photo)
    resp.headers["Cache-Control"] = (
        "public, max-age=3600" if is_published else "private, no-store, max-age=0"
    )
    return resp


# ─── PUBLIC: peer answers, upvotes, answer reports ────────────────

async def _notify_asker(question: Dict[str, Any], *, answerer_patient_id: Optional[str],
                         answerer_display: str, is_expert: bool) -> None:
    """Record an in-app notification + best-effort email when a question
    gets a new answer. Never notifies someone about their own answer to
    their own question. Failures here must never break answer creation —
    both the DB insert and the email send are swallowed on error."""
    asker_id = question.get("patient_id")
    if not asker_id or asker_id == answerer_patient_id:
        return
    try:
        await db.qa_notifications.insert_one({
            "id": str(uuid.uuid4()),
            "patient_id": asker_id,
            "type": "answer_received",
            "question_id": question["id"],
            "question_slug": question["slug"],
            "question_title": question["title"],
            "answerer_display": answerer_display,
            "is_expert": is_expert,
            "read": False,
            "created_at": _now(),
        })
    except Exception:
        pass
    try:
        asker = await db.patients.find_one({"id": asker_id}, {"_id": 0, "email": 1})
        if asker and asker.get("email"):
            await send_community_answer_email(
                asker["email"],
                question_title=question["title"],
                question_slug=question["slug"],
                answerer_display=answerer_display,
                is_expert=is_expert,
            )
    except Exception:
        pass


@router.post(
    "/community/questions/{question_id}/answers",
    dependencies=[Depends(rate_limit("community_answer", 10, 600))],
)
async def create_peer_answer(
    question_id: str, body: QaAnswerCreate, request: Request,
    patient=Depends(get_current_patient),
):
    """A patient's peer answer. Post-moderated: publishes immediately, but
    auto-hides once report_count reaches the threshold — see module docstring."""
    q = await db.qa_questions.find_one(
        {"id": question_id, "status": "published"},
        {"_id": 0, "id": 1, "slug": 1, "title": 1, "patient_id": 1},
    )
    if not q:
        raise HTTPException(status_code=404, detail="Въпросът не е намерен")

    existing = await db.qa_answers.find_one(
        {"question_id": question_id, "author_type": "patient", "author_id": patient["id"]},
        {"_id": 0, "id": 1},
    )
    if existing:
        raise HTTPException(status_code=400, detail="Вече отговорихте на този въпрос")

    clean_body = scrub_pii(body.body.strip())
    author_display = _asker_display(patient)
    doc = {
        "id": str(uuid.uuid4()),
        "question_id": question_id,
        "author_type": "patient",
        "author_id": patient["id"],
        "author_display": author_display,
        "is_expert": False,
        "body": clean_body,
        "status": "published",
        "upvotes": 0,
        "report_count": 0,
        "created_at": _now(),
    }
    await db.qa_answers.insert_one(doc)
    await db.qa_questions.update_one({"id": question_id}, {"$inc": {"answer_count": 1}})
    await _notify_asker(
        q, answerer_patient_id=patient["id"], answerer_display=author_display, is_expert=False,
    )
    return {"success": True, "id": doc["id"]}


@router.post(
    "/community/answers/{answer_id}/upvote",
    dependencies=[Depends(rate_limit("community_upvote", 30, 600))],
)
async def upvote_answer(answer_id: str, patient=Depends(get_current_patient)):
    """Idempotent: a second call from the same patient un-votes ("това ми
    помогна" toggles off), rather than erroring or double-counting.

    Reputation: a patient (peer) author's `reputation` moves 1-for-1 with
    upvotes on their answers — the only reputation signal this build ships
    (no "accepted answer" marker exists in the answer model, so that's not
    a separate rep source here). Clinic authors have no reputation field."""
    answer = await db.qa_answers.find_one(
        {"id": answer_id}, {"_id": 0, "id": 1, "author_type": 1, "author_id": 1},
    )
    if not answer:
        raise HTTPException(status_code=404, detail="Отговорът не е намерен")

    existing = await db.qa_answer_votes.find_one(
        {"answer_id": answer_id, "patient_id": patient["id"]}, {"_id": 0},
    )
    if existing:
        await db.qa_answer_votes.delete_one({"answer_id": answer_id, "patient_id": patient["id"]})
        await db.qa_answers.update_one({"id": answer_id}, {"$inc": {"upvotes": -1}})
        if answer.get("author_type") == "patient" and answer.get("author_id"):
            await db.patients.update_one({"id": answer["author_id"]}, {"$inc": {"reputation": -1}})
        return {"success": True, "upvoted": False}

    await db.qa_answer_votes.insert_one({
        "id": str(uuid.uuid4()),
        "answer_id": answer_id,
        "patient_id": patient["id"],
        "created_at": _now(),
    })
    await db.qa_answers.update_one({"id": answer_id}, {"$inc": {"upvotes": 1}})
    if answer.get("author_type") == "patient" and answer.get("author_id"):
        await db.patients.update_one({"id": answer["author_id"]}, {"$inc": {"reputation": 1}})
    return {"success": True, "upvoted": True}


@router.post(
    "/community/answers/{answer_id}/report",
    dependencies=[Depends(rate_limit("community_report", 10, 600))],
)
async def report_answer(
    answer_id: str, body: QaReportCreate, request: Request,
    patient=Depends(get_current_patient),
):
    answer = await db.qa_answers.find_one({"id": answer_id}, {"_id": 0, "id": 1, "status": 1})
    if not answer:
        raise HTTPException(status_code=404, detail="Отговорът не е намерен")
    await db.qa_reports.insert_one({
        "id": str(uuid.uuid4()),
        "target_type": "answer",
        "target_id": answer_id,
        "reporter_patient_id": patient["id"],
        "reason": html.escape(body.reason.strip()),
        "status": "open",
        "created_at": _now(),
    })
    result = await db.qa_answers.update_one({"id": answer_id}, {"$inc": {"report_count": 1}})
    updated = await db.qa_answers.find_one({"id": answer_id}, {"_id": 0, "report_count": 1, "status": 1})
    # Auto-hide once reports cross the threshold — post-moderation for peer
    # answers, never applied to clinic (expert) answers, which are
    # spot-checked by an admin instead of crowd-hidden.
    if (
        updated
        and updated.get("status") == "published"
        and int(updated.get("report_count", 0)) >= _ANSWER_REPORT_HIDE_THRESHOLD
    ):
        hidden = await db.qa_answers.find_one_and_update(
            {"id": answer_id, "status": "published"},
            {"$set": {"status": "hidden"}},
        )
        # Keep the question's displayed count in sync with what's actually
        # visible — only decrement once, guarded by the status match above
        # so a second report burst past the threshold can't double-decrement.
        if hidden:
            await db.qa_questions.update_one(
                {"id": hidden["question_id"]}, {"$inc": {"answer_count": -1}},
            )
    return {"success": True, "message": "Благодарим. Сигналът е получен."}


# ─── CLINIC: queue + expert answers ───────────────────────────────

@router.get("/clinic/community/questions")
async def clinic_question_queue(
    limit: int = Query(30, ge=1, le=100),
    clinic: Dict[str, Any] = Depends(get_current_clinic),
):
    """Published questions matched to this clinic's treatments, excluding
    threads the clinic already answered."""
    matched_topics = topics_for_clinic(clinic.get("treatments_supported"))
    answered_ids = {
        a["question_id"]
        async for a in db.qa_answers.find(
            {"author_type": "clinic", "author_id": clinic["id"]}, {"_id": 0, "question_id": 1},
        )
    }
    q: Dict[str, Any] = {"status": "published", "topic": {"$in": matched_topics}}
    if answered_ids:
        q["id"] = {"$nin": list(answered_ids)}
    cursor = db.qa_questions.find(q, {"_id": 0}).sort("published_at", -1).limit(limit)
    items = [_public_question(doc, include_body=True) async for doc in cursor]
    return {"items": items}


@router.post(
    "/clinic/community/questions/{question_id}/answers",
    dependencies=[Depends(rate_limit("clinic_community_answer", 20, 600))],
)
async def create_expert_answer(
    question_id: str, body: QaAnswerCreate, request: Request,
    clinic: Dict[str, Any] = Depends(get_current_clinic),
):
    q = await db.qa_questions.find_one(
        {"id": question_id, "status": "published"},
        {"_id": 0, "id": 1, "slug": 1, "title": 1, "patient_id": 1},
    )
    if not q:
        raise HTTPException(status_code=404, detail="Въпросът не е намерен")

    existing_count = await db.qa_answers.count_documents(
        {"question_id": question_id, "author_type": "clinic", "author_id": clinic["id"]},
    )
    if existing_count >= _MAX_CLINIC_ANSWERS_PER_QUESTION:
        raise HTTPException(status_code=400, detail="Вече отговорихте на този въпрос")

    # Educational content only — never a link or contact details to the
    # clinic's own channels.
    clean_body = strip_urls(scrub_pii(body.body.strip()))
    author_display = clinic.get("clinic_name") or clinic.get("name") or "Партньорска клиника"

    doc = {
        "id": str(uuid.uuid4()),
        "question_id": question_id,
        "author_type": "clinic",
        "author_id": clinic["id"],
        "author_display": author_display,
        "is_expert": True,
        "body": clean_body,
        # Verified answers publish instantly (trusted role) — this flag
        # exists purely so an admin can later filter "answers to spot-check",
        # it never gates visibility.
        "admin_reviewed": False,
        "status": "published",
        "upvotes": 0,
        "report_count": 0,
        "created_at": _now(),
    }
    await db.qa_answers.insert_one(doc)
    await db.qa_questions.update_one({"id": question_id}, {"$inc": {"answer_count": 1}})
    await _notify_asker(
        q, answerer_patient_id=None, answerer_display=author_display, is_expert=True,
    )
    await audit_log(
        "community.expert_answer_created",
        actor_type="clinic",
        target_type="qa_question",
        target_id=question_id,
        metadata={"clinic_id": clinic["id"], "answer_id": doc["id"]},
        severity="info",
        request=request,
    )
    return {"success": True, "id": doc["id"]}


# ─── PATIENT: notifications + my activity (for /profile) ──────────

@router.get("/patient/community/notifications")
async def list_notifications(
    limit: int = Query(30, ge=1, le=100),
    patient=Depends(get_current_patient),
):
    cursor = db.qa_notifications.find(
        {"patient_id": patient["id"]}, {"_id": 0},
    ).sort("created_at", -1).limit(limit)
    items = [n async for n in cursor]
    unread_count = await db.qa_notifications.count_documents(
        {"patient_id": patient["id"], "read": False},
    )
    return {"items": items, "unread_count": unread_count}


@router.post("/patient/community/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, patient=Depends(get_current_patient)):
    await db.qa_notifications.update_one(
        {"id": notification_id, "patient_id": patient["id"]}, {"$set": {"read": True}},
    )
    return {"success": True}


@router.post("/patient/community/notifications/read-all")
async def mark_all_notifications_read(patient=Depends(get_current_patient)):
    result = await db.qa_notifications.update_many(
        {"patient_id": patient["id"], "read": False}, {"$set": {"read": True}},
    )
    return {"success": True, "updated": result.modified_count}


@router.get("/patient/community/mine")
async def my_community_activity(patient=Depends(get_current_patient)):
    """Backs the '/profile' page's 'Моите въпроси' section: every question
    the patient asked (any status — including still-pending, so they can see
    it's in review) and every peer answer they've posted."""
    questions_cursor = db.qa_questions.find(
        {"patient_id": patient["id"]}, {"_id": 0},
    ).sort("created_at", -1).limit(100)
    questions = [
        {
            "id": q["id"],
            "slug": q["slug"],
            "title": q["title"],
            "status": q["status"],
            "topic": q["topic"],
            "answer_count": int(q.get("answer_count", 0)),
            "created_at": q.get("created_at"),
        }
        async for q in questions_cursor
    ]

    answers_cursor = db.qa_answers.find(
        {"author_type": "patient", "author_id": patient["id"]}, {"_id": 0},
    ).sort("created_at", -1).limit(100)
    answer_docs = [a async for a in answers_cursor]
    question_lookup: Dict[str, Dict[str, Any]] = {}
    if answer_docs:
        qids = list({a["question_id"] for a in answer_docs})
        async for qd in db.qa_questions.find({"id": {"$in": qids}}, {"_id": 0, "id": 1, "slug": 1, "title": 1}):
            question_lookup[qd["id"]] = qd
    answers = [
        {
            "id": a["id"],
            "question_id": a["question_id"],
            "question_slug": (question_lookup.get(a["question_id"]) or {}).get("slug"),
            "question_title": (question_lookup.get(a["question_id"]) or {}).get("title"),
            "status": a["status"],
            "upvotes": int(a.get("upvotes", 0)),
            "created_at": a.get("created_at"),
        }
        for a in answer_docs
    ]

    return {"questions": questions, "answers": answers}


# ─── ADMIN: moderation ────────────────────────────────────────────

async def _attach_photos(items: List[Dict[str, Any]]) -> None:
    """Mutates `items` in place, adding a lightweight `photos` list to each
    — used by both the moderation list and single-question admin views so
    reviewers can see attached images before approving/rejecting."""
    ids = [it["id"] for it in items]
    if not ids:
        return
    photos_by_q: Dict[str, List[Dict[str, Any]]] = {}
    async for p in db.qa_question_photos.find(
        {"question_id": {"$in": ids}, "is_deleted": False},
        {"_id": 0, "id": 1, "question_id": 1, "content_type": 1, "display_order": 1},
    ).sort("display_order", 1):
        photos_by_q.setdefault(p["question_id"], []).append(
            {"id": p["id"], "content_type": p["content_type"]}
        )
    for it in items:
        it["photos"] = photos_by_q.get(it["id"], [])


@router.get("/admin/community/questions")
async def admin_list_questions(
    status: Optional[str] = Query(None),
    user: AdminUser = Depends(get_current_user),
):
    q: Dict[str, Any] = {}
    if status:
        if status not in _QUESTION_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        q["status"] = status
    cursor = db.qa_questions.find(q, {"_id": 0}).sort("created_at", -1).limit(500)
    items = [doc async for doc in cursor]
    await _attach_photos(items)
    return {
        "items": items,
        "counts": {
            "pending": await db.qa_questions.count_documents({"status": "pending"}),
            "published": await db.qa_questions.count_documents({"status": "published"}),
            "rejected": await db.qa_questions.count_documents({"status": "rejected"}),
            "flagged": await db.qa_questions.count_documents(
                {"status": "pending", "safety_flag": True}
            ),
        },
    }


@router.get("/admin/community/questions/{question_id}")
async def admin_get_question(question_id: str, user: AdminUser = Depends(get_current_user)):
    doc = await db.qa_questions.find_one({"id": question_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    await _attach_photos([doc])
    return doc


@router.get("/admin/community/questions/{question_id}/photos/{photo_id}")
async def admin_get_question_photo(
    question_id: str, photo_id: str, user: AdminUser = Depends(get_current_user),
):
    """Bypasses the published-or-owner visibility rule entirely — admins
    must be able to review a photo regardless of the question's status."""
    photo = await db.qa_question_photos.find_one(
        {"id": photo_id, "question_id": question_id, "is_deleted": False}, {"_id": 0},
    )
    if not photo:
        raise HTTPException(status_code=404, detail="Not found")
    resp = await _serve_question_photo(photo)
    resp.headers["Cache-Control"] = "private, no-store, max-age=0"
    return resp


async def _moderate(question_id: str, new_status: str, notes: Optional[str], user: AdminUser):
    doc = await db.qa_questions.find_one({"id": question_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    now = _now()
    update = {
        "status": new_status,
        "moderated_by": user.username,
        "moderated_at": now,
        "moderation_notes": html.escape(notes.strip()) if notes else None,
    }
    if new_status == "published" and not doc.get("published_at"):
        update["published_at"] = now
    await db.qa_questions.update_one({"id": question_id}, {"$set": update})
    await audit_log(
        f"community.question_{new_status}",
        actor_type="admin",
        target_type="qa_question",
        target_id=question_id,
        metadata={"safety_flag": bool(doc.get("safety_flag"))},
        severity="info",
    )
    return {"success": True, "status": new_status}


@router.post("/admin/community/questions/{question_id}/approve")
async def admin_approve_question(
    question_id: str, body: Optional[QaModerationBody] = None,
    user: AdminUser = Depends(get_current_user),
):
    return await _moderate(question_id, "published", body.moderation_notes if body else None, user)


@router.post("/admin/community/questions/{question_id}/reject")
async def admin_reject_question(
    question_id: str, body: Optional[QaModerationBody] = None,
    user: AdminUser = Depends(get_current_user),
):
    return await _moderate(question_id, "rejected", body.moderation_notes if body else None, user)


# ─── ADMIN: launch content seeding (one-off) ───────────────────────

@router.post("/admin/community/seed-demo-content")
async def admin_seed_demo_content(user: AdminUser = Depends(get_current_user)):
    """Seed the community with realistic, common patient questions + peer
    answers so it doesn't look empty on launch. See community_seed_content.py
    for the actual content and design notes.

    Idempotent: a second click is a no-op if this batch already ran (checked
    via `seed_batch` on qa_questions), so it's safe to press more than once.
    Inserts directly with status="published" — no admin-approval gate, no
    OTP signup flow, matching the "no gating" launch-content request.
    """
    already = await db.qa_questions.find_one({"seed_batch": SEED_BATCH_ID}, {"_id": 0, "id": 1})
    if already:
        return {"success": True, "already_seeded": True, "message": "Batch already seeded."}

    now = datetime.now(timezone.utc)

    # 1. Ensure every persona exists as a real `patients` doc (idempotent
    # per-persona via email lookup, independent of the batch check above —
    # a persona may already exist from a prior partial run).
    persona_ids: Dict[str, str] = {}
    for key, p in PERSONAS.items():
        existing = await db.patients.find_one({"email": p["email"]}, {"_id": 0, "id": 1})
        if existing:
            persona_ids[key] = existing["id"]
            continue
        pid = str(uuid.uuid4())
        await db.patients.insert_one({
            "id": pid,
            "email": p["email"],
            "email_verified": True,
            "display_name": p["display_name"],
            "city_slug": p["city_slug"],
            "reputation": 0,
            "status": "active",
            "created_at": (now - timedelta(days=30)).isoformat(),
            "seed_batch": SEED_BATCH_ID,
        })
        persona_ids[key] = pid

    # 2. Questions + answers.
    created_questions = 0
    created_answers = 0
    for item in SEED_ITEMS:
        q_created_at = now - timedelta(days=item["days_ago"])
        q_persona = PERSONAS[item["persona"]]
        answers = item["answers"]

        qid = str(uuid.uuid4())
        await db.qa_questions.insert_one({
            "id": qid,
            "slug": _slugify(item["title"]),
            "topic": item["topic"],
            "title": item["title"],
            "body": item["body"],
            "patient_id": persona_ids[item["persona"]],
            "asker_display": q_persona["display_name"],
            "city_slug": q_persona["city_slug"],
            "status": "published",
            "safety_flag": False,
            "safety_terms": None,
            "answer_count": len(answers),
            "created_at": q_created_at.isoformat(),
            "published_at": q_created_at.isoformat(),
            "moderated_by": user.username,
            "moderated_at": q_created_at.isoformat(),
            "moderation_notes": "Launch content seed.",
            "ip_hash": None,
            "user_agent_hash": None,
            "seed_batch": SEED_BATCH_ID,
        })
        created_questions += 1

        for a in answers:
            a_persona = PERSONAS[a["persona"]]
            a_created_at = q_created_at + timedelta(days=a["days_after"])
            await db.qa_answers.insert_one({
                "id": str(uuid.uuid4()),
                "question_id": qid,
                "author_type": "patient",
                "author_id": persona_ids[a["persona"]],
                "author_display": a_persona["display_name"],
                "is_expert": False,
                "body": a["body"],
                "status": "published",
                "upvotes": a["upvotes"],
                "report_count": 0,
                "created_at": a_created_at.isoformat(),
                "seed_batch": SEED_BATCH_ID,
            })
            created_answers += 1

    await audit_log(
        "community.seed_demo_content",
        actor_type="admin",
        target_type="qa_question",
        target_id=None,
        metadata={
            "seed_batch": SEED_BATCH_ID,
            "personas": len(persona_ids),
            "questions": created_questions,
            "answers": created_answers,
        },
        severity="info",
    )
    return {
        "success": True,
        "already_seeded": False,
        "personas_created": len(persona_ids),
        "questions_created": created_questions,
        "answers_created": created_answers,
    }
