from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response
from typing import Optional
from datetime import datetime, timezone, timedelta
import asyncio
import uuid
import httpx

from database import db
from schemas import (
    BlogPostCreate, BlogPostUpdate, BlogPost, BlogViewEvent, AdminUser
)
from auth import get_current_user
from storage import put_object, get_object, ALLOWED_IMAGE_TYPES
from config import APP_NAME, FRONTEND_URL, REVALIDATE_SECRET, logger

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
    return post


@router.post("/blog/track-view")
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
async def admin_upload_file(file: UploadFile = File(...), user: AdminUser = Depends(get_current_user)):
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
async def admin_delete_file(file_id: str, user: AdminUser = Depends(get_current_user)):
    result = await db.uploaded_files.update_one(
        {"id": file_id}, {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
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
async def admin_create_post(post_data: BlogPostCreate, user: AdminUser = Depends(get_current_user)):
    existing = await db.blog_posts.find_one({"slug": post_data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    post = BlogPost(**post_data.model_dump(), author_id=user.id, author_name=user.username,
                    published_at=datetime.now(timezone.utc) if post_data.is_published else None)
    await db.blog_posts.insert_one(post.model_dump())
    if post_data.is_published:
        asyncio.create_task(trigger_revalidation(slug=post.slug, action="create"))
    return post


@router.put("/admin/blog/posts/{post_id}", response_model=BlogPost)
async def admin_update_post(post_id: str, post_data: BlogPostUpdate, user: AdminUser = Depends(get_current_user)):
    existing = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    update_data = {k: v for k, v in post_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    if post_data.is_published and not existing.get("published_at"):
        update_data["published_at"] = datetime.now(timezone.utc)
    await db.blog_posts.update_one({"id": post_id}, {"$set": update_data})
    updated = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    slug_to_revalidate = post_data.slug if post_data.slug else existing.get("slug")
    asyncio.create_task(trigger_revalidation(slug=slug_to_revalidate, action="update"))
    return BlogPost(**updated)


@router.delete("/admin/blog/posts/{post_id}")
async def admin_delete_post(post_id: str, user: AdminUser = Depends(get_current_user)):
    existing = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    result = await db.blog_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    if existing:
        asyncio.create_task(trigger_revalidation(slug=existing.get("slug"), action="delete"))
    return {"message": "Post deleted successfully"}
