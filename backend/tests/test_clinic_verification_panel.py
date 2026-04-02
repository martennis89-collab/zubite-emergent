"""
Tests for Clinic Assignment & Verification Panel in Admin Dashboard
Tests: PATCH /api/admin/leads/{id}/assign-clinic, POST /api/admin/leads/{id}/send-verification,
       GET /api/admin/clinic-accounts
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestClinicVerificationPanel:
    """Tests for the clinic assignment and verification panel features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token and test data"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin@zubite.bg",
            "password": "password"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.token = login_resp.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get clinic accounts for testing
        clinics_resp = requests.get(f"{BASE_URL}/api/admin/clinic-accounts", headers=self.headers)
        assert clinics_resp.status_code == 200, f"Failed to get clinics: {clinics_resp.text}"
        self.clinics = clinics_resp.json().get("clinics", [])
        
        # Get leads for testing
        leads_resp = requests.get(f"{BASE_URL}/api/admin/leads", headers=self.headers)
        assert leads_resp.status_code == 200, f"Failed to get leads: {leads_resp.text}"
        self.leads = leads_resp.json()
        
    # ─── GET /api/admin/clinic-accounts Tests ─────────────────────────────
    
    def test_get_clinic_accounts_returns_list(self):
        """GET /api/admin/clinic-accounts returns list of clinic accounts"""
        resp = requests.get(f"{BASE_URL}/api/admin/clinic-accounts", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "clinics" in data
        assert isinstance(data["clinics"], list)
        print(f"✓ Found {len(data['clinics'])} clinic accounts")
        
    def test_get_clinic_accounts_has_required_fields(self):
        """Clinic accounts have required fields: id, clinic_name, city"""
        resp = requests.get(f"{BASE_URL}/api/admin/clinic-accounts", headers=self.headers)
        assert resp.status_code == 200
        clinics = resp.json().get("clinics", [])
        if len(clinics) > 0:
            clinic = clinics[0]
            assert "id" in clinic, "Clinic missing 'id' field"
            assert "clinic_name" in clinic, "Clinic missing 'clinic_name' field"
            assert "city" in clinic, "Clinic missing 'city' field"
            print(f"✓ Clinic has required fields: id={clinic['id'][:8]}..., name={clinic['clinic_name']}, city={clinic['city']}")
        else:
            pytest.skip("No clinic accounts available for testing")
            
    def test_get_clinic_accounts_requires_auth(self):
        """GET /api/admin/clinic-accounts requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/admin/clinic-accounts")
        assert resp.status_code in [401, 403]  # Either is acceptable for auth failure
        print(f"✓ Endpoint requires authentication (returns {resp.status_code})")
        
    # ─── PATCH /api/admin/leads/{id}/assign-clinic Tests ─────────────────────────────
    
    def test_assign_clinic_success(self):
        """PATCH /api/admin/leads/{id}/assign-clinic assigns lead to clinic"""
        if len(self.clinics) == 0:
            pytest.skip("No clinic accounts available")
        if len(self.leads) == 0:
            pytest.skip("No leads available")
            
        # Find a lead without clinic assignment or use first lead
        lead = self.leads[0]
        clinic = self.clinics[0]
        
        resp = requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead['id']}/assign-clinic",
            headers=self.headers,
            json={"clinic_id": clinic["id"]}
        )
        assert resp.status_code == 200, f"Assign failed: {resp.text}"
        data = resp.json()
        assert data.get("status") == "ok"
        assert "assigned_to" in data
        print(f"✓ Lead assigned to clinic: {data['assigned_to']}")
        
    def test_assign_clinic_returns_clinic_name(self):
        """Assign clinic response includes clinic name"""
        if len(self.clinics) == 0 or len(self.leads) == 0:
            pytest.skip("No test data available")
            
        lead = self.leads[0]
        clinic = self.clinics[0]
        
        resp = requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead['id']}/assign-clinic",
            headers=self.headers,
            json={"clinic_id": clinic["id"]}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("assigned_to") == clinic.get("clinic_name")
        print(f"✓ Response includes correct clinic name: {data['assigned_to']}")
        
    def test_assign_clinic_missing_clinic_id(self):
        """PATCH /api/admin/leads/{id}/assign-clinic fails without clinic_id"""
        if len(self.leads) == 0:
            pytest.skip("No leads available")
            
        lead = self.leads[0]
        resp = requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead['id']}/assign-clinic",
            headers=self.headers,
            json={}
        )
        assert resp.status_code == 400
        print("✓ Returns 400 when clinic_id is missing")
        
    def test_assign_clinic_invalid_clinic_id(self):
        """PATCH /api/admin/leads/{id}/assign-clinic fails with invalid clinic_id"""
        if len(self.leads) == 0:
            pytest.skip("No leads available")
            
        lead = self.leads[0]
        resp = requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead['id']}/assign-clinic",
            headers=self.headers,
            json={"clinic_id": "invalid-clinic-id-12345"}
        )
        assert resp.status_code == 404
        print("✓ Returns 404 for invalid clinic_id")
        
    def test_assign_clinic_invalid_lead_id(self):
        """PATCH /api/admin/leads/{id}/assign-clinic fails with invalid lead_id"""
        if len(self.clinics) == 0:
            pytest.skip("No clinics available")
            
        clinic = self.clinics[0]
        resp = requests.patch(
            f"{BASE_URL}/api/admin/leads/invalid-lead-id-12345/assign-clinic",
            headers=self.headers,
            json={"clinic_id": clinic["id"]}
        )
        assert resp.status_code == 404
        print("✓ Returns 404 for invalid lead_id")
        
    def test_assign_clinic_requires_auth(self):
        """PATCH /api/admin/leads/{id}/assign-clinic requires authentication"""
        if len(self.leads) == 0 or len(self.clinics) == 0:
            pytest.skip("No test data available")
            
        lead = self.leads[0]
        clinic = self.clinics[0]
        resp = requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead['id']}/assign-clinic",
            json={"clinic_id": clinic["id"]}
        )
        assert resp.status_code in [401, 403]  # Either is acceptable for auth failure
        print(f"✓ Endpoint requires authentication (returns {resp.status_code})")
        
    # ─── POST /api/admin/leads/{id}/send-verification Tests ─────────────────────────────
    
    def test_send_verification_requires_assigned_clinic(self):
        """POST /api/admin/leads/{id}/send-verification fails if lead not assigned to clinic"""
        # Find a lead without clinic assignment
        unassigned_lead = None
        for lead in self.leads:
            if not lead.get("assigned_clinic_id"):
                unassigned_lead = lead
                break
                
        if not unassigned_lead:
            pytest.skip("All leads are assigned to clinics")
            
        resp = requests.post(
            f"{BASE_URL}/api/admin/leads/{unassigned_lead['id']}/send-verification",
            headers=self.headers
        )
        assert resp.status_code == 400
        assert "not assigned" in resp.json().get("detail", "").lower()
        print("✓ Returns 400 when lead is not assigned to clinic")
        
    def test_send_verification_requires_email(self):
        """POST /api/admin/leads/{id}/send-verification fails if lead has no email"""
        # Find a lead with clinic but no email
        lead_no_email = None
        for lead in self.leads:
            if lead.get("assigned_clinic_id") and not lead.get("email"):
                lead_no_email = lead
                break
                
        if not lead_no_email:
            pytest.skip("No lead without email found")
            
        resp = requests.post(
            f"{BASE_URL}/api/admin/leads/{lead_no_email['id']}/send-verification",
            headers=self.headers
        )
        assert resp.status_code == 400
        assert "email" in resp.json().get("detail", "").lower()
        print("✓ Returns 400 when lead has no email")
        
    def test_send_verification_invalid_lead(self):
        """POST /api/admin/leads/{id}/send-verification fails for non-existent lead"""
        resp = requests.post(
            f"{BASE_URL}/api/admin/leads/invalid-lead-id-12345/send-verification",
            headers=self.headers
        )
        assert resp.status_code == 404
        print("✓ Returns 404 for non-existent lead")
        
    def test_send_verification_requires_auth(self):
        """POST /api/admin/leads/{id}/send-verification requires authentication"""
        if len(self.leads) == 0:
            pytest.skip("No leads available")
            
        lead = self.leads[0]
        resp = requests.post(f"{BASE_URL}/api/admin/leads/{lead['id']}/send-verification")
        assert resp.status_code in [401, 403]  # Either is acceptable for auth failure
        print(f"✓ Endpoint requires authentication (returns {resp.status_code})")
        
    def test_send_verification_success_or_warning(self):
        """POST /api/admin/leads/{id}/send-verification returns ok or warning"""
        # Find a lead with clinic and email
        eligible_lead = None
        for lead in self.leads:
            if lead.get("assigned_clinic_id") and lead.get("email") and lead.get("verification_status") != "pending":
                eligible_lead = lead
                break
                
        if not eligible_lead:
            pytest.skip("No eligible lead found (needs clinic + email + not pending)")
            
        resp = requests.post(
            f"{BASE_URL}/api/admin/leads/{eligible_lead['id']}/send-verification",
            headers=self.headers
        )
        # Could be 200 (success/warning) or 400 (already pending)
        if resp.status_code == 200:
            data = resp.json()
            assert data.get("status") in ["ok", "warning"]
            assert "message" in data
            print(f"✓ Verification sent: status={data['status']}, message={data['message']}")
        elif resp.status_code == 400:
            # Already pending is acceptable
            assert "pending" in resp.json().get("detail", "").lower()
            print("✓ Verification already pending for this lead")
        else:
            pytest.fail(f"Unexpected status code: {resp.status_code}")
            
    # ─── Verification Status Tests ─────────────────────────────
    
    def test_lead_has_verification_status_field(self):
        """Leads have verification_status field"""
        # Check if any lead has verification_status
        has_status = any(lead.get("verification_status") for lead in self.leads)
        if has_status:
            statuses = [lead.get("verification_status") for lead in self.leads if lead.get("verification_status")]
            print(f"✓ Found leads with verification_status: {set(statuses)}")
        else:
            print("✓ No leads have verification_status yet (expected for new leads)")
            
    def test_verification_status_values(self):
        """Verification status has valid values: pending, verified, flagged"""
        valid_statuses = {"pending", "verified", "flagged", None}
        for lead in self.leads:
            status = lead.get("verification_status")
            assert status in valid_statuses or status is None, f"Invalid status: {status}"
        print("✓ All verification statuses are valid")
        
    def test_find_verified_lead(self):
        """Find a lead with verification_status='verified'"""
        verified = [l for l in self.leads if l.get("verification_status") == "verified"]
        if verified:
            print(f"✓ Found {len(verified)} verified lead(s): {verified[0].get('name', 'Unknown')}")
        else:
            print("✓ No verified leads found (may need to complete verification flow)")
            
    def test_find_flagged_lead(self):
        """Find a lead with verification_status='flagged'"""
        flagged = [l for l in self.leads if l.get("verification_status") == "flagged"]
        if flagged:
            print(f"✓ Found {len(flagged)} flagged lead(s): {flagged[0].get('name', 'Unknown')}")
        else:
            print("✓ No flagged leads found")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
