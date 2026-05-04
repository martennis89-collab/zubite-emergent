from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime, timezone
import csv
from io import StringIO

from database import db
from schemas import AdminLogin, AdminUser, TokenResponse, LeadStatusUpdate, LeadUpdate
from auth import verify_password, create_token, get_current_user
from rate_limit import rate_limit

router = APIRouter()


@router.post("/admin/login", response_model=TokenResponse, dependencies=[Depends(rate_limit("admin_login", 5, 300))])
async def admin_login(data: AdminLogin):
    user = await db.admin_users.find_one({"username": data.username}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["username"])
    return TokenResponse(access_token=token, user=AdminUser(id=user["id"], username=user["username"]))


@router.get("/admin/me")
async def admin_me(user: AdminUser = Depends(get_current_user)):
    return user


@router.get("/admin/leads")
async def admin_leads(
    city_slug: Optional[str] = None,
    treatment_type: Optional[str] = None,
    band: Optional[str] = None,
    status: Optional[str] = None,
    user: AdminUser = Depends(get_current_user)
):
    query = {}
    if city_slug: query["city_slug"] = city_slug
    if treatment_type: query["treatment_type"] = treatment_type
    if band: query["band"] = band
    if status: query["status"] = status

    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for lead in leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return leads


@router.get("/admin/leads/{lead_id}")
async def admin_lead(lead_id: str, user: AdminUser = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead


@router.patch("/admin/leads/{lead_id}")
async def admin_update_lead(lead_id: str, data: LeadStatusUpdate, user: AdminUser = Depends(get_current_user)):
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data")
    await db.leads.update_one({"id": lead_id}, {"$set": update_dict})
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead


@router.get("/admin/clinics")
async def admin_clinics(user: AdminUser = Depends(get_current_user)):
    return await db.clinics.find({}, {"_id": 0}).to_list(100)


@router.get("/admin/stats")
async def admin_stats(user: AdminUser = Depends(get_current_user)):
    total = await db.leads.count_documents({})
    new = await db.leads.count_documents({"status": "NEW"})
    green = await db.leads.count_documents({"band": "GREEN"})
    yellow = await db.leads.count_documents({"band": "YELLOW"})
    red = await db.leads.count_documents({"band": "RED"})
    return {
        "total_leads": total, "new_leads": new,
        "by_band": {"green": green, "yellow": yellow, "red": red},
        "by_city": {
            "sofia": await db.leads.count_documents({"city_slug": "sofia"}),
            "plovdiv": await db.leads.count_documents({"city_slug": "plovdiv"}),
            "varna": await db.leads.count_documents({"city_slug": "varna"}),
            "haskovo": await db.leads.count_documents({"city_slug": "haskovo"})
        }
    }


@router.get("/admin/leads/export/csv")
async def export_csv(user: AdminUser = Depends(get_current_user)):
    leads = await db.leads.find({}, {"_id": 0}).to_list(10000)
    output = StringIO()
    if leads:
        writer = csv.DictWriter(output, fieldnames=leads[0].keys())
        writer.writeheader()
        for lead in leads:
            flat = {k: str(v) if isinstance(v, dict) else v for k, v in lead.items()}
            writer.writerow(flat)
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                            headers={"Content-Disposition": "attachment; filename=leads.csv"})


@router.put("/admin/leads/{lead_id}")
async def update_lead(lead_id: str, update: LeadUpdate, user: AdminUser = Depends(get_current_user)):
    existing = await db.leads.find_one({"id": lead_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return updated


@router.delete("/admin/leads/{lead_id}")
async def delete_lead(lead_id: str, user: AdminUser = Depends(get_current_user)):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True, "message": "Lead deleted"}


@router.post("/admin/reset-analytics")
async def reset_analytics(user: AdminUser = Depends(get_current_user)):
    result = await db.analytics_events.delete_many({})
    return {"success": True, "deleted_count": result.deleted_count}


@router.post("/admin/reset-blog-views")
async def reset_blog_views(user: AdminUser = Depends(get_current_user)):
    result = await db.blog_views.delete_many({})
    return {"success": True, "deleted_count": result.deleted_count}


@router.post("/admin/cleanup-leads")
async def cleanup_leads(keep_ids: List[str], user: AdminUser = Depends(get_current_user)):
    result = await db.leads.delete_many({"id": {"$nin": keep_ids}})
    return {"success": True, "deleted_count": result.deleted_count}
