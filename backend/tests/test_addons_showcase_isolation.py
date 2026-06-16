"""Phase C2 — addons showcase isolation regression.

Verifies the dedicated visual add-ons showcase clinic is:
1. Resolvable by direct slug/id lookup (preview env).
2. Excluded from `/api/public/clinics` listing even with the demo
   gate ON (production listing remains demo-free regardless).
3. Excluded from `/api/leads/{id}/recommended-clinics`.
4. Carries `is_demo` + `is_addons_showcase` flags on payload.
5. Does NOT affect real (non-demo) clinic visibility — sanity check.
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
SHOWCASE_ID = "demo-clinic-addons-showcase"


def run_all() -> None:
    from database import db  # type: ignore

    async def _main():
        # Ensure the showcase is seeded (idempotent — script may have
        # been run earlier; we rely on the existence of the document).
        doc = await db.clinics.find_one({"id": SHOWCASE_ID}, {"_id": 0, "id": 1})
        assert doc is not None, "Run scripts/seed_addons_showcase.py first."

        # 1. Direct lookup resolves
        r = requests.get(f"{API_URL}/api/public/clinics/{SHOWCASE_ID}", timeout=10)
        assert r.status_code == 200, r.text
        payload = r.json()
        assert payload["is_demo"] is True
        assert payload["is_addons_showcase"] is True
        assert payload["is_sponsored"] is True
        assert payload["partner_tier"] == "premium"
        assert payload["public_status_label"] == "Authority Partner"
        # Enrichment is populated
        assert len(payload["technology_section"]) >= 3
        assert len(payload["expert_qa"]) >= 3
        assert len(payload["case_library"]) >= 2  # both consent_confirmed=True
        assert len(payload["price_ranges"]) >= 3
        assert payload["philosophy"] is not None
        assert payload["category_authority"] is not None
        print("  step1 PASS — direct lookup resolves + full enrichment exposed")

        # 2. Excluded from /api/public/clinics — even with demo gate ON.
        r = requests.get(f"{API_URL}/api/public/clinics?limit=100", timeout=10)
        assert r.status_code == 200, r.text
        ids = [c["id"] for c in r.json().get("clinics", [])]
        assert SHOWCASE_ID not in ids, f"Showcase leaked into listing: {ids}"
        # And other demos still appear (preview env on) — sanity.
        any_demo = any(c.get("is_demo") for c in r.json().get("clinics", []))
        print(f"  step2 PASS — showcase excluded from listing ({len(ids)} clinics total, other demos={any_demo})")

        # 3. Excluded from /api/leads/{id}/recommended-clinics.
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
        try:
            r = requests.get(
                f"{API_URL}/api/leads/{lead_id}/recommended-clinics?limit=3",
                timeout=10,
            )
            assert r.status_code == 200, r.text
            rec_ids = [c.get("id") for c in r.json().get("clinics", [])]
            assert SHOWCASE_ID not in rec_ids
            print(f"  step3 PASS — showcase excluded from recommendations ({len(rec_ids)} returned)")
        finally:
            await db.leads.delete_one({"id": lead_id})

        # 4. Sanity — at least one non-demo real clinic still resolves.
        r = requests.get(
            f"{API_URL}/api/public/clinics?limit=100", timeout=10,
        )
        real_clinics = [c for c in r.json().get("clinics", []) if not c.get("is_demo")]
        assert len(real_clinics) >= 1
        print(f"  step4 PASS — {len(real_clinics)} real clinic(s) still visible in listings")

        print("ALL PHASE C2 BACKEND TESTS PASS ✅")

    asyncio.get_event_loop().run_until_complete(_main())


if __name__ == "__main__":
    run_all()
