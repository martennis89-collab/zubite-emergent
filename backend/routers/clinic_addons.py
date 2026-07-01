"""Clinic add-ons — admin CRUD + catalog endpoints.

Data model
----------
Add-ons live in the `clinic_addons` Mongo collection with the shape:
    {
      id, clinic_id, add_on_id, category, name, price_eur,
      billing_type, status, start_date, end_date,
      public_visibility, affects_organic_matching (ALWAYS False),
      internal_owner, delivery_notes, invoice_notes,
      created_at, updated_at, created_by, updated_by,
    }

Guardrails
----------
• `affects_organic_matching` is hard-coded FALSE at the router level.
  No admin input can flip it — the field is stripped from every
  submitted payload before write. Documented in the spec's
  matching-logic section.
• The 28-item catalog seeds a `addon_catalog_items` collection on
  startup for admin dropdown discovery; custom add-ons live only in
  `clinic_addons`.
• All writes are audit-logged.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request

from database import db
from schemas import AdminUser, ClinicAddonCreate, ClinicAddonUpdate
from auth import get_current_user
from audit import audit_log
from addon_catalog import (
    ADDON_CATALOG, ADDON_CATEGORIES, ADDON_BILLING_TYPES,
    ADDON_STATUS_VALUES, ADDON_PUBLIC_VISIBILITY_VALUES,
    catalog_find,
)

router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _ensure_clinic(clinic_id: str) -> Dict[str, Any]:
    if not isinstance(clinic_id, str) or not clinic_id.strip():
        raise HTTPException(status_code=400, detail="Invalid clinic_id")
    c = await db.clinics.find_one({"id": clinic_id}, {"_id": 0, "password_hash": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return c


# ─── Catalog (seed list) ────────────────────────────────────────────
@router.get("/admin/addon-catalog")
async def admin_list_addon_catalog(user: AdminUser = Depends(get_current_user)):
    """Return the seed catalog + any admin-created custom catalog
    items stored in `addon_catalog_items`."""
    custom = await db.addon_catalog_items.find({}, {"_id": 0}).to_list(200)
    return {
        "seed": ADDON_CATALOG,
        "custom": custom,
        "categories": list(ADDON_CATEGORIES),
        "billing_types": list(ADDON_BILLING_TYPES),
        "statuses": list(ADDON_STATUS_VALUES),
        "public_visibility_values": list(ADDON_PUBLIC_VISIBILITY_VALUES),
    }


@router.post("/admin/addon-catalog")
async def admin_create_custom_catalog_item(
    body: ClinicAddonCreate,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    """Add a custom catalog entry available to every clinic."""
    if body.category not in ADDON_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    if body.billing_type not in ADDON_BILLING_TYPES:
        raise HTTPException(status_code=400, detail="Invalid billing_type")
    now = _now_iso()
    item = {
        "add_on_id": body.add_on_id.strip().lower(),
        "category": body.category,
        "name": body.name.strip(),
        "price_eur": body.price_eur if body.price_eur is not None else None,
        "billing_type": body.billing_type,
        "created_at": now,
        "is_custom": True,
    }
    # Uniqueness on add_on_id
    exists = await db.addon_catalog_items.find_one({"add_on_id": item["add_on_id"]})
    if exists or catalog_find(item["add_on_id"]) is not None:
        raise HTTPException(status_code=409, detail="add_on_id already exists")
    await db.addon_catalog_items.insert_one(dict(item))
    await audit_log(
        "admin_addon_catalog_created",
        actor=user, actor_type="admin",
        target_type="addon_catalog", target_id=item["add_on_id"],
        target_summary=item["name"],
        severity="info", request=request,
    )
    return {"item": item}


# ─── Per-clinic add-ons ─────────────────────────────────────────────
@router.get("/admin/clinics/{clinic_id}/addons")
async def admin_list_clinic_addons(
    clinic_id: str,
    user: AdminUser = Depends(get_current_user),
):
    await _ensure_clinic(clinic_id)
    addons = await db.clinic_addons.find({"clinic_id": clinic_id}, {"_id": 0}).to_list(200)
    return {"addons": addons}


@router.post("/admin/clinics/{clinic_id}/addons")
async def admin_create_clinic_addon(
    clinic_id: str,
    body: ClinicAddonCreate,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    await _ensure_clinic(clinic_id)
    if body.category not in ADDON_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    if body.billing_type not in ADDON_BILLING_TYPES:
        raise HTTPException(status_code=400, detail="Invalid billing_type")
    if body.status not in ADDON_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if body.public_visibility not in ADDON_PUBLIC_VISIBILITY_VALUES:
        raise HTTPException(status_code=400, detail="Invalid public_visibility")

    # Auto-fill price from seed catalog if omitted.
    seed = catalog_find(body.add_on_id)
    price = body.price_eur
    if price is None and seed:
        price = seed.get("price_eur")

    now = _now_iso()
    row: Dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "clinic_id": clinic_id,
        "add_on_id": body.add_on_id.strip().lower(),
        "category": body.category,
        "name": body.name.strip(),
        "price_eur": float(price) if price is not None else None,
        "billing_type": body.billing_type,
        "status": body.status,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "public_visibility": body.public_visibility,
        # Guardrail: hard-coded FALSE regardless of input.
        "affects_organic_matching": False,
        "internal_owner": (body.internal_owner or "").strip() or None,
        "delivery_notes": body.delivery_notes,
        "invoice_notes": body.invoice_notes,
        "created_at": now,
        "updated_at": now,
        "created_by": getattr(user, "username", "admin"),
        "updated_by": getattr(user, "username", "admin"),
    }
    await db.clinic_addons.insert_one(dict(row))
    await audit_log(
        "clinic_addon_created",
        actor=user, actor_type="admin",
        target_type="clinic", target_id=clinic_id,
        target_summary=row["name"],
        metadata={"add_on_id": row["add_on_id"], "category": row["category"], "status": row["status"]},
        severity="info", request=request,
    )
    return {"addon": row}


@router.patch("/admin/clinics/{clinic_id}/addons/{addon_id}")
async def admin_update_clinic_addon(
    clinic_id: str,
    addon_id: str,
    body: ClinicAddonUpdate,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    await _ensure_clinic(clinic_id)
    existing = await db.clinic_addons.find_one({"id": addon_id, "clinic_id": clinic_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Add-on not found")
    raw = body.model_dump()
    update = {k: v for k, v in raw.items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "category" in update and update["category"] not in ADDON_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    if "billing_type" in update and update["billing_type"] not in ADDON_BILLING_TYPES:
        raise HTTPException(status_code=400, detail="Invalid billing_type")
    if "status" in update and update["status"] not in ADDON_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if "public_visibility" in update and update["public_visibility"] not in ADDON_PUBLIC_VISIBILITY_VALUES:
        raise HTTPException(status_code=400, detail="Invalid public_visibility")
    if "price_eur" in update and update["price_eur"] is not None:
        try:
            update["price_eur"] = float(update["price_eur"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid price_eur")

    # Guardrail — never write this field.
    update.pop("affects_organic_matching", None)

    update["updated_at"] = _now_iso()
    update["updated_by"] = getattr(user, "username", "admin")

    await db.clinic_addons.update_one({"id": addon_id, "clinic_id": clinic_id}, {"$set": update})
    after = await db.clinic_addons.find_one({"id": addon_id}, {"_id": 0})
    await audit_log(
        "clinic_addon_updated",
        actor=user, actor_type="admin",
        target_type="clinic", target_id=clinic_id,
        target_summary=(after or {}).get("name"),
        metadata={"addon_id": addon_id, "changed_keys": list(update.keys())},
        severity="info", request=request,
    )
    return {"addon": after}


@router.delete("/admin/clinics/{clinic_id}/addons/{addon_id}")
async def admin_delete_clinic_addon(
    clinic_id: str,
    addon_id: str,
    request: Request,
    user: AdminUser = Depends(get_current_user),
):
    await _ensure_clinic(clinic_id)
    existing = await db.clinic_addons.find_one({"id": addon_id, "clinic_id": clinic_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Add-on not found")
    await db.clinic_addons.delete_one({"id": addon_id, "clinic_id": clinic_id})
    await audit_log(
        "clinic_addon_deleted",
        actor=user, actor_type="admin",
        target_type="clinic", target_id=clinic_id,
        target_summary=existing.get("name"),
        metadata={"addon_id": addon_id, "add_on_id": existing.get("add_on_id")},
        severity="warning", request=request,
    )
    return {"ok": True, "deleted": addon_id}


# ─── Entitlements read endpoint ─────────────────────────────────────
@router.get("/admin/clinics/{clinic_id}/entitlements")
async def admin_get_clinic_entitlements(
    clinic_id: str,
    user: AdminUser = Depends(get_current_user),
):
    """Read-only computed entitlements + package summary."""
    clinic = await _ensure_clinic(clinic_id)
    addons = await db.clinic_addons.find({"clinic_id": clinic_id}, {"_id": 0}).to_list(200)
    from entitlements import (
        resolve_base_package, resolve_founding_status, public_partner_label,
        compute_entitlements, package_default_pricing, GUARDRAIL_COPY,
    )
    bp = resolve_base_package(clinic)
    return {
        "clinic_id": clinic_id,
        "base_package": bp,
        "founding_status": resolve_founding_status(clinic),
        "public_partner_label": public_partner_label(clinic),
        "entitlements": compute_entitlements(clinic, addons=addons),
        "package_defaults": package_default_pricing(bp),
        "addons_count": len(addons),
        "guardrail": GUARDRAIL_COPY,
    }
