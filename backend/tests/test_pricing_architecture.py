"""
E2E backend tests for Feb 2026 clinic pricing architecture revamp.

Covers:
- Startup migration (partner_tier → base_package + founding_status + legacy_tier)
- GET /api/admin/clinics returns new fields on each row
- GET /api/admin/clinics/{id} returns clinic.base_package, public_partner_label,
  addons, entitlements, package_defaults
- PATCH /api/admin/clinics/{id} auto-fills locked defaults for base_package
- PATCH /api/admin/clinics/{id} founding_growth sets monthly=149
- PATCH validates enums (400 for bad values)
- GET /api/admin/addon-catalog returns 28 seed items + categories + billing_types
- POST/PATCH/DELETE per-clinic add-ons (price auto-fill, guardrail)
- GET /api/admin/clinics/{id}/entitlements + case_library_asset flips
  case_library_eligibility=True
- Entitlements matrix (Verified vs Growth)
- Public payload: public_status_label + base_package, no 'Authority Partner'
"""
import os
import pytest
import requests

def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    try:
        with open("/app/frontend/.env") as fh:
            for line in fh:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except FileNotFoundError:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE_URL = _load_backend_url()

LEGACY_PREMIUM_CLINIC_ID = "aa1aa2cd-c794-4f6e-97c3-0e32475925fc"  # Sofia Premium
VERIFIED_CLINIC_ID = "6167bef3-f865-4734-805f-e897ad5c5501"       # OrthoBG Варна


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/admin/login",
        json={"username": "admin", "password": "admin123"},
        headers={"Origin": BASE_URL},
        timeout=15,
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


# ── 1. Admin clinics list: new fields present ──────────────────────
class TestAdminClinicsList:
    def test_list_has_new_fields(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/clinics", timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        rows = body.get("clinics", body) if isinstance(body, dict) else body
        assert isinstance(rows, list) and rows
        # legacy_tier is only present on migrated premium clinics — check it separately
        core_required = {
            "base_package", "founding_status", "public_partner_label",
            "addons_active_count", "patient_journey_eligible", "partner_access",
        }
        missing = [c.get("id") for c in rows if not core_required.issubset(set(c.keys()))]
        assert not missing, f"{len(missing)} rows missing core pricing fields: {missing[:3]}"

    def test_all_clinics_have_base_package_after_migration(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/clinics", timeout=20)
        body = r.json()
        rows = body.get("clinics", body) if isinstance(body, dict) else body
        no_bp = [c["id"] for c in rows if not c.get("base_package")]
        assert not no_bp, f"{len(no_bp)} clinics missing base_package post-migration"

    def test_legacy_premium_migrated_correctly(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/clinics", timeout=20)
        body = r.json()
        rows = body.get("clinics", body) if isinstance(body, dict) else body
        premium = next((c for c in rows if c["id"] == LEGACY_PREMIUM_CLINIC_ID), None)
        assert premium is not None, "Sofia Premium clinic not found"
        assert premium.get("base_package") == "growth_partner"
        assert premium.get("founding_status") == "strategic_private"
        assert premium.get("legacy_tier") == "authority_partner"
        # NEVER leak Authority Partner label — strategic_public_display is False by default
        assert premium.get("public_partner_label") in ("Growth Partner", "Strategic Partner")
        assert premium.get("public_partner_label") != "Authority Partner"


# ── 2. Admin clinic detail: full envelope ──────────────────────────
class TestAdminClinicDetail:
    def test_detail_has_addons_entitlements_defaults(self, admin_session):
        r = admin_session.get(
            f"{BASE_URL}/api/admin/clinics/{VERIFIED_CLINIC_ID}", timeout=20
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "clinic" in body
        clinic = body["clinic"]
        assert clinic.get("base_package") in ("verified_profile", "growth_partner")
        assert isinstance(clinic.get("public_partner_label"), str)
        assert "addons" in body and isinstance(body["addons"], list)
        assert "entitlements" in body and isinstance(body["entitlements"], dict)
        assert "package_defaults" in body and isinstance(body["package_defaults"], dict)
        # package_defaults may be per-package or for current clinic's package
        pd = body["package_defaults"]
        assert pd, "package_defaults empty"


# ── 3. PATCH auto-fill locked defaults ─────────────────────────────
class TestPatchAutoFillDefaults:
    def _patch(self, s, cid, payload):
        return s.patch(
            f"{BASE_URL}/api/admin/clinics/{cid}",
            json=payload,
            headers={"Origin": BASE_URL},
            timeout=20,
        )

    def test_switch_to_verified_profile_fills_defaults(self, admin_session):
        r = self._patch(admin_session, VERIFIED_CLINIC_ID, {"base_package": "verified_profile"})
        assert r.status_code == 200, r.text
        c = r.json()
        # payload may be flat or nested under "clinic"
        c = c.get("clinic", c)
        assert c.get("monthly_price_eur") == 39
        assert c.get("annual_price_eur") == 468
        assert c.get("onboarding_fee_eur") == 199
        assert c.get("billing_cadence") == "yearly"

    def test_switch_to_growth_partner_fills_defaults(self, admin_session):
        r = self._patch(admin_session, VERIFIED_CLINIC_ID, {"base_package": "growth_partner"})
        assert r.status_code == 200, r.text
        c = r.json()
        c = c.get("clinic", c)
        assert c.get("monthly_price_eur") == 199
        assert c.get("annual_price_eur") == 2388
        assert c.get("onboarding_fee_eur") == 499
        assert c.get("billing_cadence") == "yearly"

    def test_founding_growth_sets_monthly_149(self, admin_session):
        r = self._patch(admin_session, VERIFIED_CLINIC_ID, {
            "base_package": "growth_partner",
            "founding_status": "founding_growth",
        })
        assert r.status_code == 200, r.text
        c = r.json()
        c = c.get("clinic", c)
        assert c.get("monthly_price_eur") == 149, f"Expected 149, got {c.get('monthly_price_eur')}"

    def test_manual_override_beats_founding_default(self, admin_session):
        # Manual monthly should NOT be overwritten by founding logic in same request
        r = self._patch(admin_session, VERIFIED_CLINIC_ID, {
            "base_package": "growth_partner",
            "founding_status": "founding_growth",
            "monthly_price_eur": 175,
        })
        assert r.status_code == 200, r.text
        c = r.json().get("clinic", r.json())
        assert c.get("monthly_price_eur") == 175

    def test_invalid_base_package_returns_400(self, admin_session):
        r = self._patch(admin_session, VERIFIED_CLINIC_ID, {"base_package": "authority_partner"})
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"

    def test_invalid_founding_status_returns_400(self, admin_session):
        r = self._patch(admin_session, VERIFIED_CLINIC_ID, {"founding_status": "wild_west"})
        assert r.status_code == 400

    def test_invalid_billing_cadence_returns_400(self, admin_session):
        r = self._patch(admin_session, VERIFIED_CLINIC_ID, {"billing_cadence": "biweekly"})
        assert r.status_code == 400


# ── 4. Addon catalog ────────────────────────────────────────────────
class TestAddonCatalog:
    def test_catalog_returns_seed_items(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/addon-catalog", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        # Actual shape: {seed, custom, categories, billing_types, statuses, public_visibility_values}
        items = body.get("seed") or body.get("catalog") or body.get("items") or []
        assert len(items) == 28, f"Expected 28 seed items, got {len(items)}"
        assert "custom" in body
        for key in ("categories", "billing_types", "statuses"):
            assert key in body, f"Missing '{key}' in catalog response"
        assert len(body["categories"]) == 6


# ── 5. Per-clinic add-on CRUD ──────────────────────────────────────
class TestClinicAddons:
    """POST body requires category+name+billing_type+status+public_visibility;
    price_eur is auto-filled from catalog when omitted."""

    _CATALOG_ITEM = {
        "add_on_id": "expert_quote_placement",
        "category": "content_authority",
        "name": "Extra expert quote placement",
        "billing_type": "one_time",
        "status": "active",
        "public_visibility": "internal_only",
    }

    def test_create_addon_autofills_price_and_forces_no_organic(self, admin_session):
        payload = dict(self._CATALOG_ITEM)
        payload["affects_organic_matching"] = True  # sneak
        # NOTE: price_eur intentionally omitted — must auto-fill from catalog=99
        r = admin_session.post(
            f"{BASE_URL}/api/admin/clinics/{VERIFIED_CLINIC_ID}/addons",
            json=payload,
            headers={"Origin": BASE_URL},
            timeout=15,
        )
        assert r.status_code in (200, 201), r.text
        addon = r.json().get("addon", r.json())
        assert addon.get("price_eur") == 99, f"price_eur autofill wrong: {addon.get('price_eur')}"
        assert addon.get("affects_organic_matching") is False, \
            f"guardrail failed — organic matching leaked: {addon.get('affects_organic_matching')}"
        # Cleanup
        aid = addon.get("id")
        if aid:
            admin_session.delete(
                f"{BASE_URL}/api/admin/clinics/{VERIFIED_CLINIC_ID}/addons/{aid}",
                headers={"Origin": BASE_URL}, timeout=15,
            )

    def test_full_addon_lifecycle(self, admin_session):
        payload = {
            "add_on_id": "extra_clinic_spotlight",
            "category": "content_authority",
            "name": "Extra clinic spotlight",
            "billing_type": "one_time",
            "status": "proposed",
            "public_visibility": "internal_only",
        }
        r = admin_session.post(
            f"{BASE_URL}/api/admin/clinics/{VERIFIED_CLINIC_ID}/addons",
            json=payload,
            headers={"Origin": BASE_URL}, timeout=15,
        )
        assert r.status_code in (200, 201), r.text
        addon = r.json().get("addon", r.json())
        addon_id = addon.get("id")
        assert addon_id, f"No addon id in response: {addon}"

        # Update
        r = admin_session.patch(
            f"{BASE_URL}/api/admin/clinics/{VERIFIED_CLINIC_ID}/addons/{addon_id}",
            json={"status": "active", "delivery_notes": "TEST_note"},
            headers={"Origin": BASE_URL}, timeout=15,
        )
        assert r.status_code == 200, r.text

        # Delete
        r = admin_session.delete(
            f"{BASE_URL}/api/admin/clinics/{VERIFIED_CLINIC_ID}/addons/{addon_id}",
            headers={"Origin": BASE_URL}, timeout=15,
        )
        assert r.status_code in (200, 204), r.text


# ── 6. Entitlements engine ─────────────────────────────────────────
class TestEntitlements:
    def test_verified_entitlements(self, admin_session):
        # Ensure verified
        admin_session.patch(
            f"{BASE_URL}/api/admin/clinics/{VERIFIED_CLINIC_ID}",
            json={"base_package": "verified_profile", "founding_status": "none"},
            headers={"Origin": BASE_URL}, timeout=15,
        )
        r = admin_session.get(
            f"{BASE_URL}/api/admin/clinics/{VERIFIED_CLINIC_ID}/entitlements",
            timeout=15,
        )
        assert r.status_code == 200, r.text
        ent = r.json().get("entitlements", r.json())
        assert ent.get("partner_access") is False
        assert ent.get("patient_journey_eligibility") is False
        assert ent.get("analytics_dashboard") is False
        assert ent.get("max_treatment_sections") == 3
        assert ent.get("treatment_service_map") == "limited"

    def test_growth_entitlements(self, admin_session):
        admin_session.patch(
            f"{BASE_URL}/api/admin/clinics/{VERIFIED_CLINIC_ID}",
            json={"base_package": "growth_partner", "founding_status": "none"},
            headers={"Origin": BASE_URL}, timeout=15,
        )
        r = admin_session.get(
            f"{BASE_URL}/api/admin/clinics/{VERIFIED_CLINIC_ID}/entitlements",
            timeout=15,
        )
        ent = r.json().get("entitlements", r.json())
        assert ent.get("partner_access") is True
        assert ent.get("patient_journey_eligibility") is True
        assert ent.get("analytics_dashboard") is True
        assert ent.get("max_treatment_sections") == 8

    def test_case_library_addon_flips_eligibility(self, admin_session):
        # Add case_library_asset — should flip case_library_eligibility=True
        r = admin_session.post(
            f"{BASE_URL}/api/admin/clinics/{VERIFIED_CLINIC_ID}/addons",
            json={
                "add_on_id": "case_library_asset",
                "category": "content_authority",
                "name": "Case-library asset",
                "billing_type": "one_time",
                "status": "active",
                "public_visibility": "internal_only",
            },
            headers={"Origin": BASE_URL}, timeout=15,
        )
        assert r.status_code in (200, 201), r.text
        addon_id = r.json().get("addon", r.json()).get("id")

        r = admin_session.get(
            f"{BASE_URL}/api/admin/clinics/{VERIFIED_CLINIC_ID}/entitlements",
            timeout=15,
        )
        ent = r.json().get("entitlements", r.json())
        assert ent.get("case_library_eligibility") in (True, "true_when_suitable"), \
            f"case_library_eligibility not flipped: {ent.get('case_library_eligibility')}"

        # Cleanup
        if addon_id:
            admin_session.delete(
                f"{BASE_URL}/api/admin/clinics/{VERIFIED_CLINIC_ID}/addons/{addon_id}",
                headers={"Origin": BASE_URL}, timeout=15,
            )


# ── 7. Public payload (no Authority Partner leak) ──────────────────
class TestPublicPayload:
    def test_legacy_premium_shows_growth_partner_publicly(self):
        r = requests.get(f"{BASE_URL}/api/public/clinics/{LEGACY_PREMIUM_CLINIC_ID}", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        # Extract clinic object regardless of envelope
        clinic = body.get("clinic", body)
        label = clinic.get("public_status_label") or body.get("public_status_label")
        assert label != "Authority Partner", f"LEAK: public shows Authority Partner"
        assert label in ("Growth Partner", "Verified Profile", "Strategic Partner", None), \
            f"Unexpected public_status_label: {label}"
        assert "base_package" in clinic or "base_package" in body, \
            "base_package field missing in public payload"
        # Legacy partner_tier still there for BC
        assert "partner_tier" in clinic or "partner_tier" in body

    def test_verified_public_label(self):
        r = requests.get(f"{BASE_URL}/api/public/clinics/{VERIFIED_CLINIC_ID}", timeout=15)
        # Verified may not be publicly listed — skip in that case
        if r.status_code == 404:
            pytest.skip("Verified clinic not publicly listed")
        assert r.status_code == 200, r.text
        body = r.json()
        clinic = body.get("clinic", body)
        label = clinic.get("public_status_label") or body.get("public_status_label")
        assert label != "Authority Partner"
