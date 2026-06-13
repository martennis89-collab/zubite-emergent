"""Content automation router (Phase 1).

Two admin endpoints:
  - POST /api/admin/content-automation/start-next
  - POST /api/admin/content-automation/import-from-make

Backend foundation only — no admin UI, no image upload, no public
render-time placeholder replacement. Reuses the existing `blog_posts`
collection for the draft article so the existing public/admin blog CRUD
keeps working unchanged.
"""

from __future__ import annotations
import os, uuid, logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
import httpx

from database import db
from auth import get_current_user
from schemas import AdminUser
from content_automation import (
    parse_zubite_article_package, build_image_requirements, PackageParseError,
)

logger = logging.getLogger(__name__)
router = APIRouter()

JOBS_COL = "content_automation_jobs"
IMG_REQ_COL = "article_image_requirements"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class StartNextBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    topic_hint: Optional[str] = Field(default=None, max_length=300)


class ImportFromMakeBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    secret: str
    makeRunId: Optional[str] = None
    articleId: Optional[str] = None
    slug: Optional[str] = None
    title: Optional[str] = None
    markdown: str
    status: Optional[str] = "draft"


@router.post("/admin/content-automation/start-next")
async def start_next(
    body: StartNextBody,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    webhook = os.environ.get("MAKE_CONTENT_AUTOMATION_WEBHOOK_URL") or ""
    secret = os.environ.get("MAKE_CONTENT_AUTOMATION_SECRET") or ""
    job_id = str(uuid.uuid4())
    now = _now()
    job = {
        "id": job_id,
        "make_run_id": None,
        "article_id": None,
        "title": None,
        "slug": None,
        "status": "queued",
        "source": "zubite_admin",
        "requested_by": getattr(user, "id", None) or getattr(user, "username", None),
        "topic_hint": body.topic_hint,
        "raw_markdown_received": False,
        "validation_result": None,
        "warnings": [],
        "errors": [],
        "created_article_id": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.get_collection(JOBS_COL).insert_one({**job})

    if not webhook or not secret:
        await db.get_collection(JOBS_COL).update_one(
            {"id": job_id},
            {"$set": {"status": "start_failed",
                      "errors": ["MAKE_CONTENT_AUTOMATION_WEBHOOK_URL or _SECRET not configured"],
                      "updated_at": _now()}},
        )
        raise HTTPException(
            status_code=503,
            detail={"code": "make_not_configured",
                    "message": "MAKE_CONTENT_AUTOMATION_WEBHOOK_URL and _SECRET must be set."},
        )

    payload = {
        "secret": secret,
        "mode": "next_topic",
        "requestedBy": job["requested_by"],
        "topicHint": body.topic_hint,
        "source": "zubite_admin",
        "jobId": job_id,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(webhook, json=payload)
        ok = 200 <= r.status_code < 300
    except Exception as exc:
        await db.get_collection(JOBS_COL).update_one(
            {"id": job_id},
            {"$set": {"status": "start_failed",
                      "errors": [f"Webhook call failed: {exc}"],
                      "updated_at": _now()}},
        )
        raise HTTPException(status_code=502, detail={"code": "webhook_failed", "message": str(exc)})

    new_status = "running" if ok else "start_failed"
    await db.get_collection(JOBS_COL).update_one(
        {"id": job_id},
        {"$set": {"status": new_status,
                  "errors": [] if ok else [f"Webhook returned HTTP {r.status_code}"],
                  "updated_at": _now()}},
    )
    return {"success": ok, "job_id": job_id, "status": new_status,
            "webhook_status": r.status_code}


@router.post("/admin/content-automation/import-from-make")
async def import_from_make(body: ImportFromMakeBody, request: Request):
    expected = os.environ.get("MAKE_CONTENT_AUTOMATION_SECRET") or ""
    if not expected:
        raise HTTPException(status_code=503,
            detail={"code": "secret_not_configured",
                    "message": "MAKE_CONTENT_AUTOMATION_SECRET not set in environment."})
    if not body.secret or body.secret != expected:
        raise HTTPException(status_code=401,
            detail={"code": "invalid_secret", "message": "Invalid shared secret."})

    # ── Idempotency: same (articleId, makeRunId) → return existing draft ──
    if body.articleId and body.makeRunId:
        existing = await db.get_collection(JOBS_COL).find_one(
            {"article_id": body.articleId, "make_run_id": body.makeRunId},
            {"_id": 0},
        )
        if existing and existing.get("created_article_id"):
            art = await db.blog_posts.find_one(
                {"id": existing["created_article_id"]}, {"_id": 0, "id": 1, "slug": 1, "title": 1, "is_published": 1},
            )
            return {
                "success": True, "duplicate": True,
                "articleId": body.articleId, "makeRunId": body.makeRunId,
                "createdArticleId": existing["created_article_id"],
                "slug": (art or {}).get("slug"),
                "status": existing.get("status", "Imported as draft"),
                "warnings": existing.get("warnings", []),
                "validation": existing.get("validation_result"),
            }

    # ── Parse ──
    try:
        parsed, warnings, errors = parse_zubite_article_package(body.markdown)
    except PackageParseError as exc:
        # Persist a failed job so the admin sees something in the list later.
        job = {
            "id": str(uuid.uuid4()),
            "make_run_id": body.makeRunId,
            "article_id": body.articleId,
            "title": body.title, "slug": body.slug,
            "status": "import_failed",
            "source": "make_callback",
            "requested_by": None,
            "raw_markdown_received": True,
            "validation_result": None,
            "warnings": [],
            "errors": [str(exc)],
            "error_code": exc.code,
            "created_article_id": None,
            "created_at": _now(), "updated_at": _now(),
        }
        await db.get_collection(JOBS_COL).insert_one({**job})
        raise HTTPException(status_code=400, detail={"code": exc.code, "message": str(exc)})

    # ── Create draft article (reuses existing blog_posts collection) ──
    title = parsed["title"]
    slug = parsed["slug"]
    # Avoid slug collision on the existing public blog.
    existing_slug = await db.blog_posts.find_one({"slug": slug}, {"_id": 0, "id": 1})
    if existing_slug:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
        warnings.append(f"Slug already in use; saved as `{slug}` instead.")

    article_id = str(uuid.uuid4())
    now = _now()
    article_doc = {
        "id": article_id,
        "title": title, "slug": slug,
        "excerpt": parsed.get("excerpt") or "",
        "content": parsed["body"],
        "featured_image": None,  # set later when admin uploads featured image
        "category": parsed.get("category") or "orthodontics",
        "tags": parsed.get("tags") or [],
        "meta_title": parsed.get("seo_title") or title,
        "meta_description": parsed.get("meta_description"),
        "is_published": False,            # NEVER auto-publish
        "seo_title": parsed.get("seo_title"),
        "language": parsed.get("language") or "bg",
        "reviewed_by": parsed.get("reviewed_by"),
        "last_reviewed": parsed.get("last_reviewed"),
        "content_html": None,
        "faq": parsed.get("faq") or [],
        "internal_links": parsed.get("internal_links") or [],
        "external_sources": parsed.get("external_sources") or [],
        "cta": parsed.get("cta"),
        "featured_image_alt": (parsed.get("image_alt_texts") or {}).get("Featured Image Alt"),
        "image_alt_texts": [],
        "faq_schema": parsed.get("faq_schema"),
        "article_schema": parsed.get("article_schema"),
        # Extra Phase-1 structured fields (live alongside existing schema)
        "automation_source": "make",
        "automation_article_id": body.articleId,
        "automation_make_run_id": body.makeRunId,
        "geo_summary": parsed.get("geo_summary"),
        "entity_positioning_block": parsed.get("entity_positioning_block"),
        "decision_framework": parsed.get("decision_framework"),
        "extractable_answer_blocks": parsed.get("extractable_answer_blocks") or [],
        "source_backed_claims": parsed.get("source_backed_claims") or [],
        "image_prompt_pack": parsed.get("image_prompts") or [],
        "placeholders_in_body": parsed.get("placeholders_in_body") or [],
        "created_at": now,
        "updated_at": now,
    }
    await db.blog_posts.insert_one({**article_doc})

    # ── Image requirements ──
    reqs = build_image_requirements(
        article_id, parsed.get("image_assets") or [],
        parsed.get("placeholders_in_body") or [],
    )
    if reqs:
        await db.get_collection(IMG_REQ_COL).insert_many([{**r} for r in reqs])

    # ── Job record ──
    needs_images = any(r["upload_status"] != "attached" for r in reqs) if reqs else False
    status = "needs_images" if needs_images else "imported_as_draft"
    job = {
        "id": str(uuid.uuid4()),
        "make_run_id": body.makeRunId,
        "article_id": body.articleId,
        "title": title, "slug": slug,
        "status": status,
        "source": "make_callback",
        "requested_by": None,
        "raw_markdown_received": True,
        "validation_result": {"warnings": warnings, "errors": errors,
                               "placeholders": parsed.get("placeholders_in_body") or [],
                               "image_requirements": len(reqs)},
        "warnings": warnings,
        "errors": errors,
        "created_article_id": article_id,
        "created_at": now, "updated_at": now,
    }
    await db.get_collection(JOBS_COL).insert_one({**job})

    return {
        "success": True,
        "articleId": body.articleId,
        "makeRunId": body.makeRunId,
        "createdArticleId": article_id,
        "slug": slug,
        "status": status,
        "warnings": warnings,
        "validation": job["validation_result"],
    }


@router.get("/admin/content-automation/jobs")
async def list_jobs(user: AdminUser = Depends(get_current_user)):
    rows = await db.get_collection(JOBS_COL).find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"jobs": rows}
