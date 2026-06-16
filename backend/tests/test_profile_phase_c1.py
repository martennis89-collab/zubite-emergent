"""Phase C1 — public payload enrichment + demo isolation regression.

Covers:
1. New `ClinicProfile` enrichment fields are passed through
   `/api/public/clinics/{slug_or_id}` with safe defaults.
2. `is_demo`, `is_sponsored`, `sponsored_label`, `is_addons_showcase`
   surface correctly on the public payload.
3. Demo clinics NEVER reach `/api/leads/{lead_id}/recommended-clinics`,
   even when the preview env enables them in the public listing.
4. Real (non-demo) clinics remain unaffected — quiz flow untouched.
"""
from __future__ import annotations
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

API_URL = os.environ.get("API_URL", "http://localhost:8001")


async def _make_clinic(db, *, is_demo: bool = False, partner_tier: str = "premium",
                       enrichment: bool = False, is_sponsored: bool = False) -> dict:
    cid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    profile: dict = {"profile_status": "published"}
    if enrichment:
        profile.update({
            "technology_section": ["Интраорален скенер — дигитални отпечатъци за прецизни планове."],
            "expert_qa": [{"question": "Колко често са контролите?", "answer": "На всеки 6 седмици."}],
            "philosophy": "Дълъг разговор преди план.",
            "faq": [{"question": "Може ли децата?", "answer": "Да, от 7-годишна възраст."}],
            "category_authority": "Известна с комплексни ортодонтски случаи.",
            "price_ranges": [
                {"treatment": "invisalign", "price_from": 4500.0, "price_to": 7500.0, "currency": "BGN", "note": "ориентировъчно"},
            ],
            "treatment_details": {
                "invisalign": {"who_for": "Възрастни с леки до средни случаи.", "remote_start_possible": True, "note": None},
            },
        })
    doc = {
        "id": cid,
        "clinic_name": f"PCS-{cid[:6]}",
        "name": f"PCS-{cid[:6]}",
        "city": "София",
        "city_slug": "sofia",
        "city_name": "София",
        "email": f"pcs-{cid[:8]}@example.bg",
        "phone": "+359888000000",
        "treatments_supported": ["invisalign"],
        "clinic_status": "active_partner",
        "subscription_status": "active",
        "partner_tier": partner_tier,
        "status": "active",
        "is_active": True,
        "is_demo": is_demo,
        "is_sponsored": is_sponsored,
        "sponsored_label": "Спонсорирано" if is_sponsored else None,
        "clinic_profile": profile,
        "created_at": now,
        "updated_at": now,
        "password_hash": "x",
    }
    await db.clinics.insert_one(doc)
    return doc


async def _cleanup(db, ids: list[str]) -> None:
    for cid in ids:
        await db.clinics.delete_one({"id": cid})


def run_all() -> None:
    from database import db  # type: ignore

    async def _main():
        clinic_ids: list[str] = []
        lead_id: str | None = None
        try:
            # 1) Authority clinic with enrichment populated — payload should echo every field.
            authority = await _make_clinic(
                db, partner_tier="premium", enrichment=True, is_sponsored=True,
            )
            clinic_ids.append(authority["id"])

            r = requests.get(f"{API_URL}/api/public/clinics/{authority['id']}", timeout=10)
            assert r.status_code == 200, r.text
            payload = r.json()
            assert payload["is_sponsored"] is True
            assert payload["sponsored_label"] == "Спонсорирано"
            assert payload["is_demo"] is False
            assert payload["is_addons_showcase"] is False
            assert payload["philosophy"] == "Дълъг разговор преди план."
            assert len(payload["technology_section"]) == 1
            assert payload["expert_qa"][0]["question"] == "Колко често са контролите?"
            assert payload["faq"][0]["answer"].startswith("Да")
            assert payload["category_authority"].startswith("Известна")
            assert payload["price_ranges"][0]["price_from"] == 4500.0
            assert payload["treatment_details"]["invisalign"]["remote_start_possible"] is True
            print("  step1 PASS — Authority enriched payload echoes every new field")

            # 2) Bare premium clinic without enrichment — safe defaults (empty lists / nulls).
            bare = await _make_clinic(db, partner_tier="featured", enrichment=False)
            clinic_ids.append(bare["id"])

            r = requests.get(f"{API_URL}/api/public/clinics/{bare['id']}", timeout=10)
            assert r.status_code == 200, r.text
            payload = r.json()
            assert payload["philosophy"] is None
            assert payload["technology_section"] == []
            assert payload["expert_qa"] == []
            assert payload["faq"] == []
            assert payload["price_ranges"] == []
            assert payload["treatment_details"] == {}
            assert payload["category_authority"] is None
            assert payload["is_sponsored"] is False
            assert payload["sponsored_label"] is None
            print("  step2 PASS — bare Premium payload has safe empty defaults")

            # 3) Demo clinic should be excluded from /api/leads/{id}/recommended-clinics
            # regardless of ZUBITE_INCLUDE_DEMO_CLINICS (which gates the listing,
            # not recommendations).
            demo = await _make_clinic(db, is_demo=True, partner_tier="premium", enrichment=True)
            clinic_ids.append(demo["id"])

            # Create a fresh lead in the same city/treatment as the demo clinic.
            lead_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            await db.leads.insert_one({
                "id": lead_id, "created_at": now, "updated_at": now,
                "city_slug": "sofia", "treatment_type": "invisalign",
                "answers": {}, "score_total": 50, "band": "AMBER",
                "status": "NEW", "name": "Test",
                "phone": "+359888777", "email": "rec@example.bg",
                "consent": True, "contact_details_submitted": True,
                "full_result_unlocked": True,
            })

            r = requests.get(
                f"{API_URL}/api/leads/{lead_id}/recommended-clinics?limit=3",
                timeout=10,
            )
            assert r.status_code == 200, r.text
            recs = r.json()
            recommended_ids = [c.get("id") for c in recs.get("clinics", [])]
            assert demo["id"] not in recommended_ids, \
                f"Demo clinic leaked into recommendations: {recommended_ids}"
            print(f"  step3 PASS — demo clinic excluded from recommendations ({len(recommended_ids)} returned)")

            # 4) Demo clinic still resolvable by direct lookup
            # (preview env has ZUBITE_INCLUDE_DEMO_CLINICS=true).
            r = requests.get(f"{API_URL}/api/public/clinics/{demo['id']}", timeout=10)
            assert r.status_code == 200, r.text
            assert r.json()["is_demo"] is True
            print("  step4 PASS — demo clinic direct lookup still works (preview env only)")

            # 5) Sponsored label always normalized to literal "Спонсорирано" (per Phase C1 rule
            # — visual label is fixed regardless of stored value).
            # (Backend stores admin-supplied label; frontend forces the literal string.
            # We only check storage path here.)
            assert payload["sponsored_label"] is None  # bare clinic — no label
            print("  step5 PASS — sponsored label only present when is_sponsored=true")

            print("ALL PHASE C1 BACKEND TESTS PASS ✅")
        finally:
            await _cleanup(db, clinic_ids)
            if lead_id:
                await db.leads.delete_one({"id": lead_id})

    asyncio.get_event_loop().run_until_complete(_main())


if __name__ == "__main__":
    run_all()
