"""
Test suite for the 'For Clinics' page backend endpoints:
- POST /api/clinic-applications - Submit clinic partnership application
- GET /api/admin/clinic-applications - Get all applications (admin only)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestClinicApplicationsPublic:
    """Tests for public clinic application submission endpoint"""
    
    def test_submit_clinic_application_success(self):
        """Test successful clinic application submission"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "clinic_name": f"TEST_Dental Clinic {unique_id}",
            "contact_name": f"TEST_Dr. Ivanov {unique_id}",
            "city": "София",
            "phone": "+359888123456",
            "email": f"test_{unique_id}@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"
        assert "id" in data, "Response should contain 'id' field"
        assert isinstance(data["id"], str), "ID should be a string"
        assert len(data["id"]) > 0, "ID should not be empty"
        
        print(f"✓ Clinic application submitted successfully with ID: {data['id']}")
        return data["id"]
    
    def test_submit_clinic_application_missing_fields(self):
        """Test clinic application with missing required fields"""
        # Missing clinic_name
        payload = {
            "contact_name": "Dr. Test",
            "city": "София",
            "phone": "+359888123456",
            "email": "test@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for missing field, got {response.status_code}"
        print("✓ Missing field validation works correctly")
    
    def test_submit_clinic_application_empty_body(self):
        """Test clinic application with empty body"""
        response = requests.post(f"{BASE_URL}/api/clinic-applications", json={})
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for empty body, got {response.status_code}"
        print("✓ Empty body validation works correctly")


class TestClinicApplicationsAdmin:
    """Tests for admin clinic applications endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin authentication token"""
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin@zubite.bg",
            "password": "password"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code} - {login_response.text}")
        
        token = login_response.json().get("access_token")
        if not token:
            pytest.skip("No access token in login response")
        
        return token
    
    def test_get_clinic_applications_requires_auth(self):
        """Test that admin endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/clinic-applications")
        
        # Should return 403 (Forbidden) without auth
        assert response.status_code == 403, f"Expected 403 without auth, got {response.status_code}"
        print("✓ Admin endpoint correctly requires authentication")
    
    def test_get_clinic_applications_with_auth(self, auth_token):
        """Test getting clinic applications with valid auth"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/clinic-applications", headers=headers)
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "applications" in data, "Response should contain 'applications' field"
        assert isinstance(data["applications"], list), "Applications should be a list"
        
        print(f"✓ Retrieved {len(data['applications'])} clinic applications")
        return data["applications"]
    
    def test_submit_and_verify_application_persisted(self, auth_token):
        """Test that submitted application appears in admin list"""
        # First, submit a new application
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "clinic_name": f"TEST_Verify Clinic {unique_id}",
            "contact_name": f"TEST_Dr. Verify {unique_id}",
            "city": "Пловдив",
            "phone": "+359888999888",
            "email": f"verify_{unique_id}@example.com"
        }
        
        submit_response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        assert submit_response.status_code == 200, f"Submit failed: {submit_response.text}"
        
        submitted_id = submit_response.json().get("id")
        
        # Now verify it appears in admin list
        headers = {"Authorization": f"Bearer {auth_token}"}
        list_response = requests.get(f"{BASE_URL}/api/admin/clinic-applications", headers=headers)
        
        assert list_response.status_code == 200, f"List failed: {list_response.text}"
        
        applications = list_response.json().get("applications", [])
        
        # Find our submitted application
        found = None
        for app in applications:
            if app.get("id") == submitted_id:
                found = app
                break
        
        assert found is not None, f"Submitted application {submitted_id} not found in admin list"
        
        # Verify all fields were persisted correctly
        assert found.get("clinic_name") == payload["clinic_name"], "Clinic name mismatch"
        assert found.get("contact_name") == payload["contact_name"], "Contact name mismatch"
        assert found.get("city") == payload["city"], "City mismatch"
        assert found.get("phone") == payload["phone"], "Phone mismatch"
        assert found.get("email") == payload["email"], "Email mismatch"
        assert found.get("status") == "new", "Status should be 'new'"
        
        print(f"✓ Application {submitted_id} correctly persisted and retrieved")


class TestAdminLogin:
    """Tests for admin login endpoint"""
    
    def test_admin_login_success(self):
        """Test successful admin login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin@zubite.bg",
            "password": "password"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user"
        assert data["user"].get("username") == "admin@zubite.bg", "Username mismatch"
        
        print("✓ Admin login successful")
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "wrong@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
