"""
Test suite for Admin Clinic Applications Management Page
Tests: GET /api/admin/clinic-applications, PATCH /api/admin/clinic-applications/{id}
Features: Table view, status filtering, detail modal, status updates, admin notes
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ortho-preview-2.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@zubite.bg"
ADMIN_PASSWORD = "password"


class TestAdminClinicApplications:
    """Test admin clinic applications management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        # Note: API returns 'access_token' not 'token'
        self.token = data.get("access_token")
        assert self.token, f"No access_token in response: {data}"
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_admin_login_returns_access_token(self):
        """Test that admin login returns access_token (not token)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data, f"Expected 'access_token' in response, got: {data.keys()}"
        assert "user" in data
        assert data["user"]["username"] == ADMIN_EMAIL
        
    def test_get_clinic_applications_requires_auth(self):
        """Test that GET /api/admin/clinic-applications requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/clinic-applications")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_get_clinic_applications_success(self):
        """Test GET /api/admin/clinic-applications returns applications list"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "applications" in data, f"Expected 'applications' key, got: {data.keys()}"
        assert isinstance(data["applications"], list)
        
    def test_get_clinic_applications_sorted_by_created_at_desc(self):
        """Test that applications are sorted by created_at descending"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        assert response.status_code == 200
        
        apps = response.json()["applications"]
        if len(apps) >= 2:
            # Check that first app is newer than second
            for i in range(len(apps) - 1):
                assert apps[i]["created_at"] >= apps[i+1]["created_at"], \
                    f"Applications not sorted by created_at desc: {apps[i]['created_at']} < {apps[i+1]['created_at']}"
                    
    def test_application_has_required_fields(self):
        """Test that each application has all required fields for table display"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        assert response.status_code == 200
        
        apps = response.json()["applications"]
        if len(apps) > 0:
            app = apps[0]
            required_fields = [
                "id", "clinic_name", "city", "contact_name", "status", "created_at",
                "offers_aligners", "offers_braces", "offers_implants"
            ]
            for field in required_fields:
                assert field in app, f"Missing required field: {field}"
                
    def test_application_has_detail_fields(self):
        """Test that application has all fields needed for detail modal"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        assert response.status_code == 200
        
        apps = response.json()["applications"]
        if len(apps) > 0:
            app = apps[0]
            detail_fields = [
                "address", "website", "phone", "email",
                "treats_adults", "treats_children",
                "years_experience", "number_of_cases_per_month", "do_you_use_digital_scans",
                "what_types_of_patients_are_best_for_you", "average_response_time",
                "notes"
            ]
            for field in detail_fields:
                assert field in app, f"Missing detail field: {field}"
                
    def test_patch_application_status_pending(self):
        """Test PATCH to update status to pending"""
        # First get an application
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        apps = response.json()["applications"]
        if len(apps) == 0:
            pytest.skip("No applications to test")
            
        app_id = apps[0]["id"]
        
        # Update status
        patch_response = self.session.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            json={"status": "pending"}
        )
        assert patch_response.status_code == 200, f"PATCH failed: {patch_response.text}"
        
        # Verify update
        verify_response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        updated_app = next((a for a in verify_response.json()["applications"] if a["id"] == app_id), None)
        assert updated_app is not None
        assert updated_app["status"] == "pending"
        
    def test_patch_application_status_approved(self):
        """Test PATCH to update status to approved"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        apps = response.json()["applications"]
        if len(apps) == 0:
            pytest.skip("No applications to test")
            
        app_id = apps[0]["id"]
        
        patch_response = self.session.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            json={"status": "approved"}
        )
        assert patch_response.status_code == 200
        
        # Verify
        verify_response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        updated_app = next((a for a in verify_response.json()["applications"] if a["id"] == app_id), None)
        assert updated_app["status"] == "approved"
        
    def test_patch_application_status_rejected(self):
        """Test PATCH to update status to rejected"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        apps = response.json()["applications"]
        if len(apps) == 0:
            pytest.skip("No applications to test")
            
        app_id = apps[0]["id"]
        
        patch_response = self.session.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            json={"status": "rejected"}
        )
        assert patch_response.status_code == 200
        
        verify_response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        updated_app = next((a for a in verify_response.json()["applications"] if a["id"] == app_id), None)
        assert updated_app["status"] == "rejected"
        
    def test_patch_application_status_waiting_list(self):
        """Test PATCH to update status to waiting_list"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        apps = response.json()["applications"]
        if len(apps) == 0:
            pytest.skip("No applications to test")
            
        app_id = apps[0]["id"]
        
        patch_response = self.session.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            json={"status": "waiting_list"}
        )
        assert patch_response.status_code == 200
        
        verify_response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        updated_app = next((a for a in verify_response.json()["applications"] if a["id"] == app_id), None)
        assert updated_app["status"] == "waiting_list"
        
    def test_patch_application_notes(self):
        """Test PATCH to update admin notes"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        apps = response.json()["applications"]
        if len(apps) == 0:
            pytest.skip("No applications to test")
            
        app_id = apps[0]["id"]
        test_note = "TEST_NOTE_Admin review completed"
        
        patch_response = self.session.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            json={"notes": test_note}
        )
        assert patch_response.status_code == 200
        
        # Verify
        verify_response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        updated_app = next((a for a in verify_response.json()["applications"] if a["id"] == app_id), None)
        assert updated_app["notes"] == test_note
        
    def test_patch_application_status_and_notes_together(self):
        """Test PATCH to update both status and notes in one request"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        apps = response.json()["applications"]
        if len(apps) == 0:
            pytest.skip("No applications to test")
            
        app_id = apps[0]["id"]
        
        patch_response = self.session.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            json={"status": "pending", "notes": "TEST_Combined update"}
        )
        assert patch_response.status_code == 200
        
        verify_response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        updated_app = next((a for a in verify_response.json()["applications"] if a["id"] == app_id), None)
        assert updated_app["status"] == "pending"
        assert updated_app["notes"] == "TEST_Combined update"
        
    def test_patch_application_invalid_fields_rejected(self):
        """Test that PATCH rejects fields other than status and notes"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        apps = response.json()["applications"]
        if len(apps) == 0:
            pytest.skip("No applications to test")
            
        app_id = apps[0]["id"]
        
        # Try to update clinic_name (should be rejected)
        patch_response = self.session.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            json={"clinic_name": "Hacked Name"}
        )
        assert patch_response.status_code == 400, f"Expected 400, got {patch_response.status_code}"
        
    def test_patch_nonexistent_application(self):
        """Test PATCH returns 404 for non-existent application"""
        patch_response = self.session.patch(
            f"{BASE_URL}/api/admin/clinic-applications/nonexistent-id-12345",
            json={"status": "approved"}
        )
        assert patch_response.status_code == 404
        
    def test_patch_requires_auth(self):
        """Test that PATCH requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        apps = response.json()["applications"]
        if len(apps) == 0:
            pytest.skip("No applications to test")
            
        app_id = apps[0]["id"]
        
        # Request without auth
        patch_response = requests.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            json={"status": "approved"},
            headers={"Content-Type": "application/json"}
        )
        assert patch_response.status_code in [401, 403]
        
    def test_status_values_are_valid(self):
        """Test that all applications have valid status values"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        apps = response.json()["applications"]
        
        valid_statuses = {"pending", "approved", "rejected", "waiting_list"}
        for app in apps:
            assert app["status"] in valid_statuses, f"Invalid status: {app['status']}"


class TestClinicApplicationsDataIntegrity:
    """Test data integrity and structure of clinic applications"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_services_are_boolean(self):
        """Test that service fields are boolean values"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        apps = response.json()["applications"]
        
        for app in apps:
            assert isinstance(app.get("offers_aligners"), bool), f"offers_aligners not bool: {type(app.get('offers_aligners'))}"
            assert isinstance(app.get("offers_braces"), bool), f"offers_braces not bool"
            assert isinstance(app.get("offers_implants"), bool), f"offers_implants not bool"
            assert isinstance(app.get("treats_adults"), bool), f"treats_adults not bool"
            assert isinstance(app.get("treats_children"), bool), f"treats_children not bool"
            
    def test_created_at_is_iso_format(self):
        """Test that created_at is in ISO format"""
        response = self.session.get(f"{BASE_URL}/api/admin/clinic-applications")
        apps = response.json()["applications"]
        
        for app in apps:
            created_at = app.get("created_at")
            assert created_at is not None
            # Should be parseable as ISO datetime
            from datetime import datetime
            try:
                datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except ValueError:
                pytest.fail(f"created_at not in ISO format: {created_at}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
