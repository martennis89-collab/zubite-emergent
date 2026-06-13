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
import os
import uuid
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel, Field, ConfigDict
import httpx

from database import db
from auth import get_current_user
from schemas import AdminUser
from storage import put_object, ALLOWED_IMAGE_TYPES
from config import APP_NAME
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
        # Optional `x-make-apikey` header (read from env; never logged).
        headers = {}
        api_key = os.environ.get("MAKE_CONTENT_AUTOMATION_API_KEY") or ""
        if api_key:
            headers["x-make-apikey"] = api_key
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(webhook, json=payload, headers=headers or None)
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



@router.delete("/admin/content-automation/jobs/{job_id}")
async def delete_job(job_id: str, user: AdminUser = Depends(get_current_user)):
    """Delete a failed or stuck automation job entry. This removes only the
    job tracking row — the associated draft article (if any) is left
    untouched and remains accessible via the regular blog admin."""
    res = await db.get_collection(JOBS_COL).delete_one({"id": job_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail={
            "code": "job_not_found", "message": "Job not found."
        })
    return {"success": True, "deleted_id": job_id}



# ═══════════════════════════════════════════════════════════════════════
# Phase 3 — Image Requirements
# ═══════════════════════════════════════════════════════════════════════

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


def _normalize_filename(name: str) -> str:
    """Lowercase, trim, collapse whitespace → hyphens. Preserves extension."""
    if not name:
        return ""
    name = name.strip().lower()
    # split extension off so we don't mangle the dot
    m = re.match(r"^(.*?)(\.[a-z0-9]+)?$", name)
    base, ext = (m.group(1) or "", m.group(2) or "") if m else (name, "")
    base = re.sub(r"\s+", "-", base.strip())
    base = re.sub(r"-+", "-", base).strip("-")
    return f"{base}{ext}"


def _build_warnings(article: Dict[str, Any], requirements: List[Dict[str, Any]]) -> List[str]:
    """UI-only warnings (no public-side enforcement in Phase 3)."""
    warnings: List[str] = []
    body = (article or {}).get("content") or ""
    body_placeholders = set(re.findall(r"\{\{image:([a-zA-Z0-9_\-]+)\}\}", body))
    req_placeholder_names = set()
    has_featured_req = False
    for r in requirements:
        ph = (r.get("placeholder") or "").strip()
        # Stored as "{{image:x}}" for implicit, or "x" for explicit. Normalize.
        m = re.match(r"^\{\{image:([a-zA-Z0-9_\-]+)\}\}$", ph) if ph else None
        if m:
            req_placeholder_names.add(m.group(1))
        elif ph:
            req_placeholder_names.add(ph)
        if (r.get("type") or "").lower() == "featured":
            has_featured_req = True
            if r.get("upload_status") != "attached":
                warnings.append("Featured image is missing.")
        elif r.get("upload_status") != "attached":
            label = ph or r.get("expected_filename") or r.get("id")
            warnings.append(f"Support image is missing: {label}.")
    # Placeholder ↔ requirement consistency
    for p in body_placeholders - req_placeholder_names:
        warnings.append(
            f"Body contains placeholder {{{{image:{p}}}}} but no image requirement exists."
        )
    for p in req_placeholder_names - body_placeholders:
        # Skip featured (no placeholder expected in body)
        warnings.append(
            f"Image requirement {{{{image:{p}}}}} exists but body does not contain it."
        )
    if not has_featured_req and any((r.get("type") or "").lower() == "featured" for r in requirements):
        pass  # noop
    # Duplicate file-url conflict
    seen_urls: Dict[str, int] = {}
    for r in requirements:
        url = r.get("uploaded_file_url")
        if not url:
            continue
        seen_urls[url] = seen_urls.get(url, 0) + 1
    for url, cnt in seen_urls.items():
        if cnt > 1:
            warnings.append(f"Duplicate assignment: {url} is attached to {cnt} requirements.")
    return warnings


async def _fetch_article_and_reqs(article_id: str):
    article = await db.blog_posts.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail={"code": "article_not_found",
                                                     "message": "Article not found."})
    reqs = await db.get_collection(IMG_REQ_COL).find(
        {"article_id": article_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return article, reqs


async def _update_job_if_all_attached(article_id: str, all_attached: bool) -> None:
    """Bump the job status to `ready_for_review` once every requirement is
    attached. Reverts to `needs_images` if a later edit leaves some unset."""
    new_status = "ready_for_review" if all_attached else "needs_images"
    await db.get_collection(JOBS_COL).update_many(
        {"created_article_id": article_id,
         "status": {"$in": ["needs_images", "ready_for_review"]}},
        {"$set": {"status": new_status, "updated_at": _now()}},
    )


async def _attach_uploaded_file_to_req(
    article_id: str, req_id: str, file_url: str, file_name: str, matched_by: str,
) -> Dict[str, Any]:
    """Attach a stored file to a requirement and mirror featured image
    onto the blog_posts document. Returns the updated requirement."""
    now = _now()
    req = await db.get_collection(IMG_REQ_COL).find_one_and_update(
        {"id": req_id, "article_id": article_id},
        {"$set": {
            "uploaded_file_url": file_url,
            "uploaded_file_name": file_name,
            "upload_status": "attached",
            "matched_by": matched_by,
            "updated_at": now,
        }},
        return_document=True, projection={"_id": 0},
    )
    if not req:
        raise HTTPException(status_code=404, detail={"code": "requirement_not_found",
                                                     "message": "Image requirement not found."})
    # Mirror featured image onto the article (do NOT touch body)
    if (req.get("type") or "").lower() == "featured":
        update = {"featured_image": file_url, "updated_at": now}
        if req.get("alt"):
            update["featured_image_alt"] = req["alt"]
        await db.blog_posts.update_one({"id": article_id}, {"$set": update})
    return req


async def _all_attached(article_id: str) -> bool:
    remaining = await db.get_collection(IMG_REQ_COL).count_documents(
        {"article_id": article_id, "upload_status": {"$ne": "attached"}}
    )
    return remaining == 0


def _check_image(file: UploadFile, data: bytes) -> str:
    """Validate content-type + size. Returns the file extension."""
    ct = (file.content_type or "").lower()
    if ct not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail={
            "code": "invalid_content_type",
            "message": f"Unsupported content-type: {ct or 'unknown'}. Allowed: png/jpeg/webp.",
        })
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail={
            "code": "file_too_large",
            "message": "File too large. Max 5 MB.",
        })
    return ALLOWED_IMAGE_TYPES[ct]


async def _store_image(file: UploadFile, data: bytes, ext: str, user_id: Optional[str]) -> Dict[str, Any]:
    """Persist the bytes via the existing storage layer and create an
    `uploaded_files` row. Returns `{file_id, url, filename}`."""
    file_id = str(uuid.uuid4())
    storage_path = f"{APP_NAME}/blog/{file_id}.{ext}"
    result = put_object(storage_path, data, file.content_type or "image/png")
    rec = {
        "id": file_id, "storage_path": result["path"], "original_filename": file.filename,
        "content_type": file.content_type, "size": result["size"],
        "uploaded_by": user_id, "is_deleted": False,
        "created_at": _now(),
    }
    await db.uploaded_files.insert_one(rec)
    return {"file_id": file_id, "url": f"/api/files/{file_id}", "filename": file.filename or f"{file_id}.{ext}"}


# ───── 1. List image requirements for an article ─────────────────────

@router.get("/admin/blog/{article_id}/image-requirements")
async def list_image_requirements(
    article_id: str, user: AdminUser = Depends(get_current_user),
):
    article, reqs = await _fetch_article_and_reqs(article_id)
    return {
        "article_id": article_id,
        "article_title": article.get("title"),
        "article_slug": article.get("slug"),
        "article_is_published": bool(article.get("is_published")),
        "featured_image": article.get("featured_image"),
        "requirements": reqs,
        "warnings": _build_warnings(article, reqs),
        "all_attached": all((r.get("upload_status") == "attached") for r in reqs) if reqs else True,
    }


# ───── 2. Upload an image to a specific requirement slot ─────────────

@router.post("/admin/blog/{article_id}/image-requirements/{requirement_id}/upload")
async def upload_image_for_requirement(
    article_id: str,
    requirement_id: str,
    file: UploadFile = File(...),
    user: AdminUser = Depends(get_current_user),
):
    article, _ = await _fetch_article_and_reqs(article_id)
    req = await db.get_collection(IMG_REQ_COL).find_one(
        {"id": requirement_id, "article_id": article_id}, {"_id": 0},
    )
    if not req:
        raise HTTPException(status_code=404, detail={"code": "requirement_not_found",
                                                     "message": "Image requirement not found."})
    data = await file.read()
    ext = _check_image(file, data)
    stored = await _store_image(file, data, ext, getattr(user, "id", None))
    updated = await _attach_uploaded_file_to_req(
        article_id, requirement_id, stored["url"], stored["filename"], matched_by="manual",
    )
    await _update_job_if_all_attached(article_id, await _all_attached(article_id))
    return {"success": True, "requirement": updated, "file": stored}


# ───── 3. Bulk upload with auto-matching ─────────────────────────────

@router.post("/admin/blog/{article_id}/image-requirements/bulk-upload")
async def bulk_upload_images(
    article_id: str,
    files: List[UploadFile] = File(...),
    user: AdminUser = Depends(get_current_user),
):
    article, reqs = await _fetch_article_and_reqs(article_id)

    # Pre-build matching tables (only across requirements that are still
    # missing, so re-uploads don't silently overwrite already-attached slots).
    open_reqs = [r for r in reqs if r.get("upload_status") != "attached"]
    by_exact: Dict[str, List[Dict[str, Any]]] = {}
    by_norm: Dict[str, List[Dict[str, Any]]] = {}
    for r in open_reqs:
        ef = (r.get("expected_filename") or "").strip()
        if ef:
            by_exact.setdefault(ef, []).append(r)
            by_norm.setdefault(_normalize_filename(ef), []).append(r)

    attached: List[Dict[str, Any]] = []
    unmatched: List[Dict[str, Any]] = []
    conflicts: List[Dict[str, Any]] = []
    user_id = getattr(user, "id", None)

    for f in files:
        data = await f.read()
        try:
            ext = _check_image(f, data)
        except HTTPException as exc:
            unmatched.append({
                "filename": f.filename,
                "reason": (exc.detail or {}).get("code", "invalid_file") if isinstance(exc.detail, dict) else "invalid_file",
                "message": (exc.detail or {}).get("message") if isinstance(exc.detail, dict) else str(exc.detail),
            })
            continue

        fname = f.filename or ""
        # Exact match first
        candidates = list(by_exact.get(fname, []))
        match_kind = "filename"
        if not candidates:
            candidates = list(by_norm.get(_normalize_filename(fname), []))
            match_kind = "normalized_filename"

        if len(candidates) == 0:
            # Persist the file so admin can still manually assign it.
            stored = await _store_image(f, data, ext, user_id)
            unmatched.append({
                "filename": fname,
                "uploaded_file_url": stored["url"],
                "uploaded_file_name": stored["filename"],
                "reason": "no_matching_requirement",
            })
            continue

        if len(candidates) > 1:
            stored = await _store_image(f, data, ext, user_id)
            conflicts.append({
                "filename": fname,
                "uploaded_file_url": stored["url"],
                "uploaded_file_name": stored["filename"],
                "reason": "multiple_requirements_match",
                "candidate_requirement_ids": [c["id"] for c in candidates],
            })
            continue

        # Exactly one candidate → attach
        target = candidates[0]
        stored = await _store_image(f, data, ext, user_id)
        updated = await _attach_uploaded_file_to_req(
            article_id, target["id"], stored["url"], stored["filename"], matched_by=match_kind,
        )
        attached.append({
            "requirement_id": target["id"],
            "filename": fname,
            "matched_by": match_kind,
            "requirement": updated,
        })
        # Remove this requirement from open pools so subsequent files in
        # the SAME bulk batch don't double-match it.
        ef = (target.get("expected_filename") or "").strip()
        for table, key in ((by_exact, ef), (by_norm, _normalize_filename(ef))):
            if key and target in table.get(key, []):
                table[key] = [r for r in table[key] if r["id"] != target["id"]]
                if not table[key]:
                    table.pop(key, None)

    # Refresh requirements snapshot for the response
    _, fresh_reqs = await _fetch_article_and_reqs(article_id)
    await _update_job_if_all_attached(article_id, await _all_attached(article_id))
    return {
        "attached": attached,
        "unmatched": unmatched,
        "conflicts": conflicts,
        "requirements": fresh_reqs,
        "warnings": _build_warnings(article, fresh_reqs),
        "all_attached": all((r.get("upload_status") == "attached") for r in fresh_reqs) if fresh_reqs else True,
    }


# ───── 4. Manual assign an already-uploaded file to a requirement ────

class AssignBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    uploaded_file_url: str = Field(..., min_length=1, max_length=500)
    uploaded_file_name: Optional[str] = Field(default=None, max_length=300)


@router.post("/admin/blog/{article_id}/image-requirements/{requirement_id}/assign")
async def assign_image_to_requirement(
    article_id: str,
    requirement_id: str,
    body: AssignBody,
    user: AdminUser = Depends(get_current_user),
):
    article, _ = await _fetch_article_and_reqs(article_id)
    updated = await _attach_uploaded_file_to_req(
        article_id, requirement_id,
        body.uploaded_file_url, body.uploaded_file_name or body.uploaded_file_url,
        matched_by="manual",
    )
    await _update_job_if_all_attached(article_id, await _all_attached(article_id))
    return {"success": True, "requirement": updated}
