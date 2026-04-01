"""
Test suite for Clinic User Accounts and Dashboard features.
Tests: clinic login, dashboard, leads management, profile, admin approve flow.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@zubite.bg"
ADMIN_PASSWORD = "password"

# Clinic credentials (existing clinic account)
CLINIC_EMAIL = "contact@orthobg.bg"
CLINIC_PASSWORD = "dPRN_ZXjuANYzw"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/admin/login", json={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed - skipping admin tests")


@pytest.fixture(scope="module")
def clinic_token():
    """Get clinic authentication token"""
    response = requests.post(f"{BASE_URL}/api/clinic/login", json={
        "email": CLINIC_EMAIL,
        "password": CLINIC_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Clinic authentication failed - skipping clinic tests")


class TestClinicLogin:
    """Tests for POST /api/clinic/login endpoint"""
    
    def test_clinic_login_success(self):
        """Valid credentials should return access_token and user object"""
        response = requests.post(f"{BASE_URL}/api/clinic/login", json={
            "email": CLINIC_EMAIL,
            "password": CLINIC_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0
        
        # Verify user object structure
        user = data["user"]
        assert "id" in user
        assert "clinic_name" in user
        assert "city" in user
        assert "email" in user
        assert "phone" in user
        assert "status" in user
        assert user["email"] == CLINIC_EMAIL.lower()
    
    def test_clinic_login_invalid_credentials(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/clinic/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_clinic_login_wrong_password(self):
        """Correct email but wrong password should return 401"""
        response = requests.post(f"{BASE_URL}/api/clinic/login", json={
            "email": CLINIC_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_clinic_login_email_case_insensitive(self):
        """Email should be case-insensitive"""
        response = requests.post(f"{BASE_URL}/api/clinic/login", json={
            "email": CLINIC_EMAIL.upper(),
            "password": CLINIC_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200 for uppercase email, got {response.status_code}"


class TestClinicDashboard:
    """Tests for GET /api/clinic/dashboard endpoint"""
    
    def test_dashboard_returns_stats(self, clinic_token):
        """Dashboard should return lead statistics"""
        response = requests.get(
            f"{BASE_URL}/api/clinic/dashboard",
            headers={"Authorization": f"Bearer {clinic_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_leads" in data
        assert "leads_contacted" in data
        assert "leads_pending" in data
        assert "leads_no_response" in data
        
        # Verify counts are integers
        assert isinstance(data["total_leads"], int)
        assert isinstance(data["leads_contacted"], int)
        assert isinstance(data["leads_pending"], int)
        assert isinstance(data["leads_no_response"], int)
        
        # Verify counts are non-negative
        assert data["total_leads"] >= 0
        assert data["leads_contacted"] >= 0
        assert data["leads_pending"] >= 0
        assert data["leads_no_response"] >= 0
    
    def test_dashboard_requires_auth(self):
        """Dashboard should require authentication"""
        response = requests.get(f"{BASE_URL}/api/clinic/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_dashboard_rejects_admin_token(self, admin_token):
        """Dashboard should reject admin tokens (role check)"""
        response = requests.get(
            f"{BASE_URL}/api/clinic/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for admin token, got {response.status_code}"


class TestClinicLeads:
    """Tests for GET /api/clinic/leads endpoint"""
    
    def test_leads_returns_list(self, clinic_token):
        """Leads endpoint should return list of assigned leads"""
        response = requests.get(
            f"{BASE_URL}/api/clinic/leads",
            headers={"Authorization": f"Bearer {clinic_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leads" in data
        assert isinstance(data["leads"], list)
        
        # If there are leads, verify structure
        if len(data["leads"]) > 0:
            lead = data["leads"][0]
            assert "id" in lead
            assert "clinic_lead_status" in lead
            assert "created_at" in lead
    
    def test_leads_requires_auth(self):
        """Leads endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/clinic/leads")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestClinicLeadStatusUpdate:
    """Tests for PATCH /api/clinic/leads/{id}/status endpoint"""
    
    def test_update_lead_status_to_contacted(self, clinic_token):
        """Should be able to mark lead as contacted"""
        # First get leads to find one to update
        leads_response = requests.get(
            f"{BASE_URL}/api/clinic/leads",
            headers={"Authorization": f"Bearer {clinic_token}"}
        )
        if leads_response.status_code != 200:
            pytest.skip("Could not fetch leads")
        
        leads = leads_response.json().get("leads", [])
        if len(leads) == 0:
            pytest.skip("No leads assigned to clinic")
        
        lead_id = leads[0]["id"]
        
        # Update status to contacted
        response = requests.patch(
            f"{BASE_URL}/api/clinic/leads/{lead_id}/status",
            headers={"Authorization": f"Bearer {clinic_token}", "Content-Type": "application/json"},
            json={"status": "contacted"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_update_lead_status_to_no_response(self, clinic_token):
        """Should be able to mark lead as no_response"""
        leads_response = requests.get(
            f"{BASE_URL}/api/clinic/leads",
            headers={"Authorization": f"Bearer {clinic_token}"}
        )
        if leads_response.status_code != 200:
            pytest.skip("Could not fetch leads")
        
        leads = leads_response.json().get("leads", [])
        if len(leads) == 0:
            pytest.skip("No leads assigned to clinic")
        
        lead_id = leads[0]["id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/clinic/leads/{lead_id}/status",
            headers={"Authorization": f"Bearer {clinic_token}", "Content-Type": "application/json"},
            json={"status": "no_response"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_update_nonexistent_lead_returns_404(self, clinic_token):
        """Updating non-existent lead should return 404"""
        response = requests.patch(
            f"{BASE_URL}/api/clinic/leads/nonexistent-lead-id/status",
            headers={"Authorization": f"Bearer {clinic_token}", "Content-Type": "application/json"},
            json={"status": "contacted"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_update_unassigned_lead_returns_404(self, clinic_token, admin_token):
        """Updating lead not assigned to this clinic should return 404"""
        # Get all leads from admin to find one not assigned to this clinic
        admin_leads_response = requests.get(
            f"{BASE_URL}/api/admin/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if admin_leads_response.status_code != 200:
            pytest.skip("Could not fetch admin leads")
        
        # Get clinic's leads
        clinic_leads_response = requests.get(
            f"{BASE_URL}/api/clinic/leads",
            headers={"Authorization": f"Bearer {clinic_token}"}
        )
        clinic_lead_ids = {l["id"] for l in clinic_leads_response.json().get("leads", [])}
        
        # Find a lead not assigned to this clinic
        all_leads = admin_leads_response.json()
        unassigned_lead = None
        for lead in all_leads:
            if lead["id"] not in clinic_lead_ids:
                unassigned_lead = lead
                break
        
        if not unassigned_lead:
            pytest.skip("No unassigned leads found")
        
        response = requests.patch(
            f"{BASE_URL}/api/clinic/leads/{unassigned_lead['id']}/status",
            headers={"Authorization": f"Bearer {clinic_token}", "Content-Type": "application/json"},
            json={"status": "contacted"}
        )
        assert response.status_code == 404, f"Expected 404 for unassigned lead, got {response.status_code}"


class TestClinicProfile:
    """Tests for GET/PATCH /api/clinic/profile endpoints"""
    
    def test_get_profile(self, clinic_token):
        """Should return clinic profile"""
        response = requests.get(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "clinic_name" in data
        assert "city" in data
        assert "email" in data
        assert "phone" in data
        assert "status" in data
        
        # Email should match login email
        assert data["email"] == CLINIC_EMAIL.lower()
    
    def test_update_profile_clinic_name(self, clinic_token):
        """Should be able to update clinic_name"""
        # Get current profile
        get_response = requests.get(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}"}
        )
        original_name = get_response.json().get("clinic_name")
        
        # Update name
        new_name = "TEST_Updated Clinic Name"
        response = requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}", "Content-Type": "application/json"},
            json={"clinic_name": new_name}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify update
        data = response.json()
        assert data["clinic_name"] == new_name
        
        # Restore original name
        requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}", "Content-Type": "application/json"},
            json={"clinic_name": original_name}
        )
    
    def test_update_profile_phone(self, clinic_token):
        """Should be able to update phone"""
        get_response = requests.get(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}"}
        )
        original_phone = get_response.json().get("phone")
        
        new_phone = "+359888123456"
        response = requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}", "Content-Type": "application/json"},
            json={"phone": new_phone}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["phone"] == new_phone
        
        # Restore original
        requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}", "Content-Type": "application/json"},
            json={"phone": original_phone}
        )
    
    def test_update_profile_city(self, clinic_token):
        """Should be able to update city"""
        get_response = requests.get(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}"}
        )
        original_city = get_response.json().get("city")
        
        new_city = "София"
        response = requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}", "Content-Type": "application/json"},
            json={"city": new_city}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["city"] == new_city
        
        # Restore original
        requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}", "Content-Type": "application/json"},
            json={"city": original_city}
        )
    
    def test_profile_requires_auth(self):
        """Profile endpoints should require authentication"""
        response = requests.get(f"{BASE_URL}/api/clinic/profile")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestAdminClinicApproval:
    """Tests for admin approve flow that auto-creates clinic account"""
    
    def test_approve_creates_clinic_account(self, admin_token):
        """Approving a pending application should create clinic account with credentials"""
        # First get pending applications
        apps_response = requests.get(
            f"{BASE_URL}/api/admin/clinic-applications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert apps_response.status_code == 200
        
        applications = apps_response.json().get("applications", [])
        pending_apps = [a for a in applications if a.get("status") == "pending"]
        
        if len(pending_apps) == 0:
            pytest.skip("No pending applications to test approval")
        
        app_to_approve = pending_apps[0]
        app_id = app_to_approve["id"]
        
        # Approve the application
        response = requests.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"status": "approved"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check if clinic account was created
        if data.get("clinic_account_created"):
            assert "clinic_credentials" in data
            creds = data["clinic_credentials"]
            assert "email" in creds
            assert "temporary_password" in creds
            assert len(creds["temporary_password"]) > 0
            
            # Verify we can login with the new credentials
            login_response = requests.post(f"{BASE_URL}/api/clinic/login", json={
                "email": creds["email"],
                "password": creds["temporary_password"]
            })
            assert login_response.status_code == 200, f"Could not login with new credentials: {login_response.text}"
        
        # Reset status back to pending for future tests
        requests.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"status": "pending"}
        )


class TestAdminLeadAssignment:
    """Tests for PATCH /api/admin/leads/{lead_id}/assign-clinic endpoint"""
    
    def test_assign_lead_to_clinic(self, admin_token):
        """Admin should be able to assign lead to clinic"""
        # Get clinic accounts
        clinics_response = requests.get(
            f"{BASE_URL}/api/admin/clinic-accounts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert clinics_response.status_code == 200
        
        clinics = clinics_response.json().get("clinics", [])
        if len(clinics) == 0:
            pytest.skip("No clinic accounts available")
        
        clinic_id = clinics[0]["id"]
        
        # Get leads
        leads_response = requests.get(
            f"{BASE_URL}/api/admin/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert leads_response.status_code == 200
        
        leads = leads_response.json()
        if len(leads) == 0:
            pytest.skip("No leads available")
        
        lead_id = leads[0]["id"]
        
        # Assign lead to clinic
        response = requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead_id}/assign-clinic",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"clinic_id": clinic_id}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok"
        assert "assigned_to" in data
    
    def test_assign_lead_requires_clinic_id(self, admin_token):
        """Assign endpoint should require clinic_id"""
        leads_response = requests.get(
            f"{BASE_URL}/api/admin/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        leads = leads_response.json()
        if len(leads) == 0:
            pytest.skip("No leads available")
        
        lead_id = leads[0]["id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead_id}/assign-clinic",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={}
        )
        assert response.status_code == 400, f"Expected 400 without clinic_id, got {response.status_code}"
    
    def test_assign_lead_invalid_clinic_returns_404(self, admin_token):
        """Assigning to non-existent clinic should return 404"""
        leads_response = requests.get(
            f"{BASE_URL}/api/admin/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        leads = leads_response.json()
        if len(leads) == 0:
            pytest.skip("No leads available")
        
        lead_id = leads[0]["id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead_id}/assign-clinic",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"clinic_id": "nonexistent-clinic-id"}
        )
        assert response.status_code == 404, f"Expected 404 for invalid clinic, got {response.status_code}"


class TestAdminClinicAccounts:
    """Tests for GET /api/admin/clinic-accounts endpoint"""
    
    def test_list_clinic_accounts(self, admin_token):
        """Admin should be able to list all clinic accounts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/clinic-accounts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "clinics" in data
        assert isinstance(data["clinics"], list)
        
        # Verify structure if there are clinics
        if len(data["clinics"]) > 0:
            clinic = data["clinics"][0]
            assert "id" in clinic
            assert "clinic_name" in clinic
            assert "email" in clinic
            assert "status" in clinic
            # password_hash should NOT be returned
            assert "password_hash" not in clinic
    
    def test_clinic_accounts_requires_admin_auth(self):
        """Clinic accounts endpoint should require admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/clinic-accounts")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_clinic_accounts_rejects_clinic_token(self, clinic_token):
        """Clinic accounts endpoint should reject clinic tokens"""
        response = requests.get(
            f"{BASE_URL}/api/admin/clinic-accounts",
            headers={"Authorization": f"Bearer {clinic_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for clinic token, got {response.status_code}"


class TestPausedClinicLogin:
    """Tests for paused clinic login behavior"""
    
    def test_paused_clinic_gets_403(self, admin_token):
        """Paused clinic should get 403 on login"""
        # This test requires a paused clinic account
        # First check if there's a paused clinic
        clinics_response = requests.get(
            f"{BASE_URL}/api/admin/clinic-accounts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        clinics = clinics_response.json().get("clinics", [])
        paused_clinics = [c for c in clinics if c.get("status") == "paused"]
        
        if len(paused_clinics) == 0:
            pytest.skip("No paused clinic accounts to test")
        
        # We can't test login without knowing the password
        # This test documents expected behavior
        pytest.skip("Cannot test paused login without knowing paused clinic password")
