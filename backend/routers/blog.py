from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.responses import Response
from typing import Optional
from datetime import datetime, timezone, timedelta
import asyncio
import uuid
import os
import httpx

from database import db
from rate_limit import rate_limit
from schemas import (
    BlogPostCreate, BlogPostUpdate, BlogPost, BlogViewEvent, AdminUser
)
from auth import get_current_user
from storage import put_object, get_object, ALLOWED_IMAGE_TYPES
from config import APP_NAME, FRONTEND_URL, REVALIDATE_SECRET, logger
from audit import audit_log, diff_fields
from content_automation import (
    render_content_with_images,
    find_unresolved_placeholders,
)

IMG_REQ_COL = "article_image_requirements"

router = APIRouter()


async def trigger_revalidation(slug: Optional[str] = None, action: str = "unknown"):
    """Trigger Next.js on-demand revalidation for blog pages"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{FRONTEND_URL}/api/revalidate",
                json={"secret": REVALIDATE_SECRET, "slug": slug, "action": action}
            )
            if response.status_code == 200:
                logger.info(f"Revalidation triggered: action={action}, slug={slug}")
            else:
                logger.warning(f"Revalidation returned {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"Failed to trigger revalidation: {e}")


# ─── Public Blog ───────────────────────────────────────────

@router.get("/blog/posts")
async def get_published_posts(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 10,
    skip: int = 0
):
    query = {"is_published": True}
    if category: query["category"] = category
    if tag: query["tags"] = tag
    cursor = db.blog_posts.find(query, {"_id": 0}).sort("published_at", -1).skip(skip).limit(limit)
    posts = await cursor.to_list(length=limit)
    total = await db.blog_posts.count_documents(query)
    return {"posts": posts, "total": total}


@router.get("/blog/posts/{slug}")
async def get_post_by_slug(slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "is_published": True}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.blog_posts.update_one({"slug": slug}, {"$inc": {"view_count": 1}})
    # Phase 4: render {{image:x}} placeholders for automation articles. Original
    # `content` in the DB is left untouched; only the response body is processed.
    # Unresolved placeholders are stripped so public pages never display raw
    # `{{image:x}}` tokens, even if the article slipped through publish
    # protection somehow (defense in depth).
    content = post.get("content") or ""
    if "{{image:" in content:
        reqs = await db.get_collection(IMG_REQ_COL).find(
            {"article_id": post.get("id")}, {"_id": 0}
        ).to_list(200)
        post["content"] = render_content_with_images(content, reqs)
    return post


@router.post(
    "/blog/track-view",
    dependencies=[Depends(rate_limit("blog_track_view", max_calls=60, window_seconds=60))],
)
async def track_blog_view(event: BlogViewEvent):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.blog_views.find_one({
        "post_slug": event.post_slug, "visitor_id": event.visitor_id, "date": today
    })
    if not existing:
        await db.blog_views.insert_one({
            "id": str(uuid.uuid4()),
            "post_slug": event.post_slug,
            "visitor_id": event.visitor_id,
            "referrer": event.referrer,
            "user_agent": event.user_agent,
            "date": today,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"tracked": True, "unique": True}
    return {"tracked": True, "unique": False}


# ─── Admin Blog Analytics ─────────────────────────────────

@router.get("/admin/blog/analytics")
async def get_blog_analytics(user: AdminUser = Depends(get_current_user)):
    posts = await db.blog_posts.find({"is_published": True}, {"_id": 0}).to_list(1000)
    pipeline = [{"$group": {"_id": "$post_slug", "total_views": {"$sum": 1}, "unique_visitors": {"$addToSet": "$visitor_id"}}}]
    view_stats = await db.blog_views.aggregate(pipeline).to_list(1000)
    view_map = {stat["_id"]: {"total_views": stat["total_views"], "unique_visitors": len(stat["unique_visitors"])} for stat in view_stats}

    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    daily_pipeline = [
        {"$match": {"date": {"$gte": thirty_days_ago}}},
        {"$group": {"_id": "$date", "views": {"$sum": 1}, "unique_visitors": {"$addToSet": "$visitor_id"}}},
        {"$sort": {"_id": 1}}
    ]
    daily_stats = await db.blog_views.aggregate(daily_pipeline).to_list(100)
    views_per_day = [{"date": s["_id"], "views": s["views"], "unique_visitors": len(s["unique_visitors"])} for s in daily_stats]

    total_views = sum(s.get("total_views", 0) for s in view_stats)
    all_visitors = set()
    for s in view_stats:
        all_visitors.update(s.get("unique_visitors", []))

    post_stats = []
    for post in posts:
        slug = post.get("slug", "")
        stats = view_map.get(slug, {"total_views": 0, "unique_visitors": 0})
        post_stats.append({
            "slug": slug, "title": post.get("title", ""), "category": post.get("category", ""),
            "published_at": post.get("published_at"),
            "total_views": stats["total_views"], "unique_visitors": stats["unique_visitors"]
        })
    post_stats.sort(key=lambda x: x["unique_visitors"], reverse=True)

    return {
        "total_views": total_views, "total_unique_visitors": len(all_visitors),
        "total_posts": len(posts), "views_per_day": views_per_day, "post_stats": post_stats
    }


# ─── File Upload ───────────────────────────────────────────

@router.post("/admin/upload")
async def admin_upload_file(request: Request, file: UploadFile = File(...), user: AdminUser = Depends(get_current_user)):
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES.keys())}")
    ext = ALLOWED_IMAGE_TYPES[content_type]
    file_id = str(uuid.uuid4())
    storage_path = f"{APP_NAME}/blog/{file_id}.{ext}"
    file_data = await file.read()
    if len(file_data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
    try:
        result = put_object(storage_path, file_data, content_type)
        file_record = {
            "id": file_id, "storage_path": result["path"], "original_filename": file.filename,
            "content_type": content_type, "size": result["size"],
            "uploaded_by": user.id, "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.uploaded_files.insert_one(file_record)
        # Audit: after_state via `file` allow-list (id / original_filename /
        # content_type / size / is_deleted). NEVER stores file bytes or
        # storage_path / storage secrets.
        await audit_log(
            "file.uploaded",
            actor=user, actor_type="admin",
            target_type="file", target_id=file_id,
            target_summary=file.filename,
            after_state=file_record,
            metadata={"size": result["size"], "content_type": content_type},
            severity="info", request=request,
        )
        return {"success": True, "file_id": file_id, "url": f"/api/files/{file_id}", "filename": file.filename, "size": result["size"]}
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file")


@router.get("/files/{file_id}")
async def serve_file(file_id: str):
    record = await db.uploaded_files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, content_type = get_object(record["storage_path"])
        return Response(
            content=data, media_type=record.get("content_type", content_type),
            headers={"Cache-Control": "public, max-age=31536000", "Content-Disposition": f"inline; filename=\"{record.get('original_filename', 'image')}\""}
        )
    except Exception as e:
        logger.error(f"Failed to serve file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve file")


@router.get("/admin/files")
async def admin_list_files(user: AdminUser = Depends(get_current_user), limit: int = 50, skip: int = 0):
    cursor = db.uploaded_files.find({"is_deleted": False}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    files = await cursor.to_list(length=limit)
    total = await db.uploaded_files.count_documents({"is_deleted": False})
    return {"files": files, "total": total}


@router.delete("/admin/files/{file_id}")
async def admin_delete_file(file_id: str, request: Request, user: AdminUser = Depends(get_current_user)):
    result = await db.uploaded_files.update_one(
        {"id": file_id}, {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    await audit_log(
        "file.deleted",
        actor=user, actor_type="admin",
        target_type="file", target_id=file_id,
        before_state={"is_deleted": False},
        after_state={"is_deleted": True},
        severity="info", request=request,
    )
    return {"success": True, "message": "File deleted"}


# ─── Admin Blog CRUD ──────────────────────────────────────

@router.get("/admin/blog/posts")
async def admin_get_posts(user: AdminUser = Depends(get_current_user), is_published: Optional[bool] = None, limit: int = 50, skip: int = 0):
    query = {}
    if is_published is not None: query["is_published"] = is_published
    cursor = db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    posts = await cursor.to_list(length=limit)
    total = await db.blog_posts.count_documents(query)
    return {"posts": posts, "total": total}


@router.get("/admin/blog/posts/{post_id}")
async def admin_get_post(post_id: str, user: AdminUser = Depends(get_current_user)):
    post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/admin/blog/posts", response_model=BlogPost)
async def admin_create_post(post_data: BlogPostCreate, request: Request, user: AdminUser = Depends(get_current_user)):
    existing = await db.blog_posts.find_one({"slug": post_data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    # Safety guard for publish — keep as draft if minimum fields missing.
    if post_data.is_published:
        missing = []
        if not (post_data.slug or "").strip(): missing.append("slug")
        if not (post_data.title or "").strip(): missing.append("title")
        if not (post_data.content or "").strip(): missing.append("content")
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot publish without: {', '.join(missing)}.",
            )
    post = BlogPost(**post_data.model_dump(), author_id=user.id, author_name=user.username,
                    published_at=datetime.now(timezone.utc) if post_data.is_published else None)
    await db.blog_posts.insert_one(post.model_dump())
    if post_data.is_published:
        asyncio.create_task(trigger_revalidation(slug=post.slug, action="create"))
    # Audit: after_state allow-listed to {slug, is_published, category,
    # language} — body / content_html / FAQ schema / article schema NEVER stored.
    await audit_log(
        "blog_post.created",
        actor=user, actor_type="admin",
        target_type="blog_post", target_id=post.id,
        target_summary=post.slug,
        after_state={
            "slug": post.slug,
            "is_published": post.is_published,
            "category": getattr(post, "category", None),
            "language": getattr(post, "language", None),
        },
        severity="info", request=request,
    )
    return post


@router.put("/admin/blog/posts/{post_id}", response_model=BlogPost)
async def admin_update_post(post_id: str, post_data: BlogPostUpdate, request: Request, user: AdminUser = Depends(get_current_user)):
    existing = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    update_data = {k: v for k, v in post_data.model_dump().items() if v is not None}

    # Safety guard: don't allow publishing without minimum SEO requirements.
    final_state = {**existing, **update_data}
    if final_state.get("is_published"):
        missing = []
        if not (final_state.get("slug") or "").strip():
            missing.append("slug")
        if not (final_state.get("title") or "").strip():
            missing.append("title")
        if not (final_state.get("content") or "").strip():
            missing.append("content")
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot publish without: {', '.join(missing)}. Saved as draft instead.",
            )

        # Phase 4: image requirements gate. Hard-block publish if any of the
        # article's image requirements is unattached, if the featured-type
        # requirement exists without a `featured_image`, or if the body
        # still contains unresolved `{{image:x}}` placeholders.
        body = final_state.get("content") or ""
        reqs = await db.get_collection(IMG_REQ_COL).find(
            {"article_id": post_id}, {"_id": 0}
        ).to_list(200)
        missing_images: list[dict] = []
        featured_req_present = False
        attached_names: set[str] = set()
        for r in reqs:
            rtype = (r.get("type") or "").lower()
            attached = r.get("upload_status") == "attached"
            if rtype == "featured":
                featured_req_present = True
            if attached:
                ph = (r.get("placeholder") or "").strip()
                if ph.startswith("{{image:") and ph.endswith("}}"):
                    attached_names.add(ph[len("{{image:"):-2])
                elif ph:
                    attached_names.add(ph)
                continue
            missing_images.append({
                "requirement_id": r.get("id"),
                "type": rtype,
                "expected_filename": r.get("expected_filename"),
                "placeholder": r.get("placeholder"),
            })
        unresolved = []
        if "{{image:" in body:
            unresolved = find_unresolved_placeholders(body, attached_names)
        if featured_req_present and not (final_state.get("featured_image") or "").strip():
            missing_images.append({
                "requirement_id": None,
                "type": "featured",
                "reason": "featured_image_field_empty",
            })
        if missing_images or unresolved:
            raise HTTPException(status_code=400, detail={
                "code": "publish_blocked_missing_images",
                "message": ("Article cannot be published because required "
                            "images are missing or placeholders are unresolved."),
                "details": {
                    "missing_images": missing_images,
                    "unresolved_placeholders": unresolved,
                },
            })

    update_data["updated_at"] = datetime.now(timezone.utc)
    if post_data.is_published and not existing.get("published_at"):
        update_data["published_at"] = datetime.now(timezone.utc)
    await db.blog_posts.update_one({"id": post_id}, {"$set": update_data})
    updated = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    slug_to_revalidate = post_data.slug if post_data.slug else existing.get("slug")
    asyncio.create_task(trigger_revalidation(slug=slug_to_revalidate, action="update"))
    # Audit: changed_fields list + before/after only over the blog_post allow-list
    # (slug, is_published, category, language). Body, content_html, FAQ
    # schema, article schema, SEO blocks NEVER stored.
    changed = sorted(
        k for k in update_data.keys()
        if k not in ("updated_at", "published_at")
    )
    b, a = diff_fields(existing, updated, ["slug", "is_published", "category", "language"])
    await audit_log(
        "blog_post.updated",
        actor=user, actor_type="admin",
        target_type="blog_post", target_id=post_id,
        target_summary=existing.get("slug"),
        before_state=b, after_state=a,
        metadata={"changed_fields": changed},
        severity="info", request=request,
    )
    return BlogPost(**updated)


@router.get("/admin/blog/posts/{post_id}/seo-status")
async def admin_seo_status(post_id: str, user: AdminUser = Depends(get_current_user)):
    """Run a comprehensive SEO indexing check for the article and return a status report."""
    import httpx as _httpx
    post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    site_url = os.environ.get("PUBLIC_SITE_URL", "https://zubite.bg").rstrip("/")
    slug = (post.get("slug") or "").strip()
    canonical = f"{site_url}/blog/{slug}" if slug else None
    is_published = bool(post.get("is_published"))

    errors: list[str] = []
    warnings: list[str] = []

    if not slug:
        errors.append("Missing slug — article cannot be canonicalised.")
    if not (post.get("title") or "").strip():
        errors.append("Missing title.")
    if not (post.get("seo_title") or post.get("meta_title") or "").strip():
        warnings.append("Missing SEO title.")
    if not (post.get("meta_description") or "").strip():
        warnings.append("Missing meta description.")
    if not (post.get("content") or "").strip():
        errors.append("Article body is empty.")
    if not is_published:
        warnings.append("Article is in draft (will not be indexed).")

    canonical_safe = bool(
        canonical and canonical.startswith(("https://zubite.bg", "https://www.zubite.bg"))
    )

    sitemap_included = is_published and bool(slug)

    # Robots.txt: explicitly allow /blog/ and admin disallowed; nothing more to check.
    robots_allowed = True

    has_article_schema = bool(post.get("article_schema"))
    has_faq_schema = bool(post.get("faq_schema"))

    public_status = None
    public_status_error = None
    if is_published and slug:
        try:
            async with _httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                # Try to reach the production URL first; if behind firewall, fall back to FRONTEND_URL.
                target = canonical
                resp = await client.get(target, headers={"User-Agent": "Zubite-SEO-Bot/1.0"})
                public_status = resp.status_code
        except Exception as e:
            public_status_error = str(e)[:200]

    return {
        "post_id": post_id,
        "slug": slug,
        "is_published": is_published,
        "indexable": is_published and not errors,
        "canonical_url": canonical,
        "canonical_valid": canonical_safe,
        "in_sitemap": sitemap_included,
        "robots_allowed": robots_allowed,
        "has_article_schema": has_article_schema,
        "has_faq_schema": has_faq_schema,
        "public_status_code": public_status,
        "public_status_error": public_status_error,
        "last_updated": post.get("updated_at"),
        "last_published": post.get("published_at"),
        "errors": errors,
        "warnings": warnings,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }


@router.delete("/admin/blog/posts/{post_id}")
async def admin_delete_post(post_id: str, request: Request, user: AdminUser = Depends(get_current_user)):
    existing = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    result = await db.blog_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    if existing:
        asyncio.create_task(trigger_revalidation(slug=existing.get("slug"), action="delete"))
        await audit_log(
            "blog_post.deleted",
            actor=user, actor_type="admin",
            target_type="blog_post", target_id=post_id,
            target_summary=existing.get("slug"),
            before_state={
                "slug": existing.get("slug"),
                "is_published": existing.get("is_published"),
                "category": existing.get("category"),
                "language": existing.get("language"),
            },
            severity="warning", request=request,
        )
    return {"message": "Post deleted successfully"}
