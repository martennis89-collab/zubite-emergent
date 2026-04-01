"""
Test suite for Clinic Application endpoints - Structured Form Version
Tests the new structured clinic application form with 6 sections:
- Clinic Info (clinic_name, city, address, website)
- Contact (contact_name, phone, email)
- Services (offers_aligners, offers_braces, offers_implants, treats_adults, treats_children)
- Qualification (years_experience, number_of_cases_per_month, do_you_use_digital_scans)
- Positioning (what_types_of_patients_are_best_for_you)
- Operations (average_response_time)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = "TEST_CLINIC_"


class TestClinicApplicationEndpoints:
    """Test clinic application CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_token = None
        self.created_app_ids = []
        yield
        # Cleanup: Delete test applications
        if self.admin_token:
            for app_id in self.created_app_ids:
                try:
                    requests.patch(
                        f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
                        headers={"Authorization": f"Bearer {self.admin_token}"},
                        json={"status": "deleted"}
                    )
                except:
                    pass
    
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "admin@zubite.bg", "password": "password"}
        )
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
            return self.admin_token
        pytest.skip("Admin authentication failed")
    
    # ─── POST /api/clinic-applications Tests ───
    
    def test_create_application_with_all_fields(self):
        """Test creating application with all structured fields"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            # Clinic Info
            "clinic_name": f"{TEST_PREFIX}Full_Clinic_{unique_id}",
            "city": "София",
            "address": "ул. Тестова 123",
            "website": "https://test-clinic.bg",
            # Contact
            "contact_name": "Д-р Тестов",
            "phone": "+359888123456",
            "email": f"test_{unique_id}@clinic.bg",
            # Services
            "offers_aligners": True,
            "offers_braces": True,
            "offers_implants": False,
            "treats_adults": True,
            "treats_children": False,
            # Qualification
            "years_experience": 15,
            "number_of_cases_per_month": "16-30",
            "do_you_use_digital_scans": True,
            # Positioning
            "what_types_of_patients_are_best_for_you": "Възрастни с леки до средни ортодонтски проблеми",
            # Operations
            "average_response_time": "<1h"
        }
        
        response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "ok"
        assert "id" in data
        self.created_app_ids.append(data["id"])
        print(f"SUCCESS: Created application with all fields, id={data['id']}")
    
    def test_create_application_required_fields_only(self):
        """Test creating application with only required fields"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "clinic_name": f"{TEST_PREFIX}Minimal_Clinic_{unique_id}",
            "city": "Пловдив",
            "address": "бул. Минимален 1",
            "contact_name": "Д-р Минимален",
            "phone": "+359777111222",
            "email": f"minimal_{unique_id}@clinic.bg"
        }
        
        response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "ok"
        assert "id" in data
        self.created_app_ids.append(data["id"])
        print(f"SUCCESS: Created application with required fields only, id={data['id']}")
    
    def test_create_application_missing_clinic_name(self):
        """Test validation: missing clinic_name returns 422"""
        payload = {
            "city": "Варна",
            "address": "ул. Тест 1",
            "contact_name": "Тест",
            "phone": "+359888000000",
            "email": "test@test.bg"
        }
        
        response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("SUCCESS: Missing clinic_name returns 422")
    
    def test_create_application_missing_city(self):
        """Test validation: missing city returns 422"""
        payload = {
            "clinic_name": "Test Clinic",
            "address": "ул. Тест 1",
            "contact_name": "Тест",
            "phone": "+359888000000",
            "email": "test@test.bg"
        }
        
        response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("SUCCESS: Missing city returns 422")
    
    def test_create_application_missing_address(self):
        """Test validation: missing address returns 422"""
        payload = {
            "clinic_name": "Test Clinic",
            "city": "София",
            "contact_name": "Тест",
            "phone": "+359888000000",
            "email": "test@test.bg"
        }
        
        response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("SUCCESS: Missing address returns 422")
    
    def test_create_application_missing_contact_name(self):
        """Test validation: missing contact_name returns 422"""
        payload = {
            "clinic_name": "Test Clinic",
            "city": "София",
            "address": "ул. Тест 1",
            "phone": "+359888000000",
            "email": "test@test.bg"
        }
        
        response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("SUCCESS: Missing contact_name returns 422")
    
    def test_create_application_missing_phone(self):
        """Test validation: missing phone returns 422"""
        payload = {
            "clinic_name": "Test Clinic",
            "city": "София",
            "address": "ул. Тест 1",
            "contact_name": "Тест",
            "email": "test@test.bg"
        }
        
        response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("SUCCESS: Missing phone returns 422")
    
    def test_create_application_missing_email(self):
        """Test validation: missing email returns 422"""
        payload = {
            "clinic_name": "Test Clinic",
            "city": "София",
            "address": "ул. Тест 1",
            "contact_name": "Тест",
            "phone": "+359888000000"
        }
        
        response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("SUCCESS: Missing email returns 422")
    
    def test_create_application_all_city_options(self):
        """Test all city dropdown options are accepted"""
        cities = ["София", "Пловдив", "Варна", "Друг"]
        
        for city in cities:
            unique_id = str(uuid.uuid4())[:8]
            payload = {
                "clinic_name": f"{TEST_PREFIX}City_{city}_{unique_id}",
                "city": city,
                "address": "ул. Тест 1",
                "contact_name": "Тест",
                "phone": "+359888000000",
                "email": f"city_{unique_id}@test.bg"
            }
            
            response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
            
            assert response.status_code == 200, f"City '{city}' failed: {response.status_code}"
            self.created_app_ids.append(response.json()["id"])
        
        print(f"SUCCESS: All city options accepted: {cities}")
    
    def test_create_application_cases_per_month_options(self):
        """Test all cases_per_month dropdown options"""
        options = ["1-5", "6-15", "16-30", "30+"]
        
        for option in options:
            unique_id = str(uuid.uuid4())[:8]
            payload = {
                "clinic_name": f"{TEST_PREFIX}Cases_{option}_{unique_id}",
                "city": "София",
                "address": "ул. Тест 1",
                "contact_name": "Тест",
                "phone": "+359888000000",
                "email": f"cases_{unique_id}@test.bg",
                "number_of_cases_per_month": option
            }
            
            response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
            
            assert response.status_code == 200, f"Cases option '{option}' failed: {response.status_code}"
            self.created_app_ids.append(response.json()["id"])
        
        print(f"SUCCESS: All cases_per_month options accepted: {options}")
    
    def test_create_application_response_time_options(self):
        """Test all response_time dropdown options"""
        options = ["<1h", "1-6h", "24h", ">24h"]
        
        for option in options:
            unique_id = str(uuid.uuid4())[:8]
            payload = {
                "clinic_name": f"{TEST_PREFIX}Response_{option}_{unique_id}",
                "city": "София",
                "address": "ул. Тест 1",
                "contact_name": "Тест",
                "phone": "+359888000000",
                "email": f"response_{unique_id}@test.bg",
                "average_response_time": option
            }
            
            response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
            
            assert response.status_code == 200, f"Response time '{option}' failed: {response.status_code}"
            self.created_app_ids.append(response.json()["id"])
        
        print(f"SUCCESS: All response_time options accepted: {options}")
    
    def test_create_application_digital_scans_boolean(self):
        """Test digital_scans accepts boolean values"""
        for value in [True, False]:
            unique_id = str(uuid.uuid4())[:8]
            payload = {
                "clinic_name": f"{TEST_PREFIX}Scans_{value}_{unique_id}",
                "city": "София",
                "address": "ул. Тест 1",
                "contact_name": "Тест",
                "phone": "+359888000000",
                "email": f"scans_{unique_id}@test.bg",
                "do_you_use_digital_scans": value
            }
            
            response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
            
            assert response.status_code == 200, f"Digital scans {value} failed: {response.status_code}"
            self.created_app_ids.append(response.json()["id"])
        
        print("SUCCESS: Digital scans accepts True/False")
    
    def test_create_application_service_toggles(self):
        """Test all service toggle combinations"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "clinic_name": f"{TEST_PREFIX}Services_{unique_id}",
            "city": "София",
            "address": "ул. Тест 1",
            "contact_name": "Тест",
            "phone": "+359888000000",
            "email": f"services_{unique_id}@test.bg",
            "offers_aligners": True,
            "offers_braces": False,
            "offers_implants": True,
            "treats_adults": True,
            "treats_children": True
        }
        
        response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        
        assert response.status_code == 200, f"Service toggles failed: {response.status_code}"
        self.created_app_ids.append(response.json()["id"])
        print("SUCCESS: All service toggles accepted")
    
    # ─── GET /api/admin/clinic-applications Tests ───
    
    def test_get_applications_requires_auth(self):
        """Test GET applications requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/clinic-applications")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: GET applications requires auth")
    
    def test_get_applications_with_auth(self):
        """Test GET applications returns list with auth"""
        token = self.get_admin_token()
        
        response = requests.get(
            f"{BASE_URL}/api/admin/clinic-applications",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "applications" in data
        assert isinstance(data["applications"], list)
        print(f"SUCCESS: GET applications returns {len(data['applications'])} applications")
    
    def test_get_applications_returns_all_fields(self):
        """Test GET applications returns all structured fields"""
        # First create an application with all fields
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "clinic_name": f"{TEST_PREFIX}FieldCheck_{unique_id}",
            "city": "Варна",
            "address": "ул. Поле 1",
            "website": "https://fieldcheck.bg",
            "contact_name": "Д-р Поле",
            "phone": "+359888999888",
            "email": f"fieldcheck_{unique_id}@test.bg",
            "offers_aligners": True,
            "offers_braces": True,
            "offers_implants": True,
            "treats_adults": True,
            "treats_children": True,
            "years_experience": 20,
            "number_of_cases_per_month": "30+",
            "do_you_use_digital_scans": True,
            "what_types_of_patients_are_best_for_you": "Всички типове пациенти",
            "average_response_time": "<1h"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        assert create_response.status_code == 200
        app_id = create_response.json()["id"]
        self.created_app_ids.append(app_id)
        
        # Get applications and find our created one
        token = self.get_admin_token()
        response = requests.get(
            f"{BASE_URL}/api/admin/clinic-applications",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        apps = response.json()["applications"]
        
        # Find our application
        our_app = next((a for a in apps if a.get("id") == app_id), None)
        assert our_app is not None, "Created application not found in list"
        
        # Verify all fields are present
        expected_fields = [
            "id", "clinic_name", "city", "address", "website",
            "contact_name", "phone", "email",
            "offers_aligners", "offers_braces", "offers_implants",
            "treats_adults", "treats_children",
            "years_experience", "number_of_cases_per_month", "do_you_use_digital_scans",
            "what_types_of_patients_are_best_for_you", "average_response_time",
            "status", "created_at"
        ]
        
        for field in expected_fields:
            assert field in our_app, f"Field '{field}' missing from response"
        
        # Verify values
        assert our_app["clinic_name"] == payload["clinic_name"]
        assert our_app["city"] == "Варна"
        assert our_app["offers_aligners"] == True
        assert our_app["years_experience"] == 20
        assert our_app["status"] == "pending"
        
        print("SUCCESS: GET applications returns all structured fields with correct values")
    
    # ─── PATCH /api/admin/clinic-applications/{id} Tests ───
    
    def test_patch_application_requires_auth(self):
        """Test PATCH application requires authentication"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/clinic-applications/fake-id",
            json={"status": "approved"}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: PATCH application requires auth")
    
    def test_patch_application_update_status(self):
        """Test updating application status"""
        # Create application
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "clinic_name": f"{TEST_PREFIX}StatusUpdate_{unique_id}",
            "city": "София",
            "address": "ул. Статус 1",
            "contact_name": "Тест",
            "phone": "+359888000000",
            "email": f"status_{unique_id}@test.bg"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        assert create_response.status_code == 200
        app_id = create_response.json()["id"]
        self.created_app_ids.append(app_id)
        
        # Update status
        token = self.get_admin_token()
        response = requests.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "approved"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify status was updated
        get_response = requests.get(
            f"{BASE_URL}/api/admin/clinic-applications",
            headers={"Authorization": f"Bearer {token}"}
        )
        apps = get_response.json()["applications"]
        our_app = next((a for a in apps if a.get("id") == app_id), None)
        assert our_app["status"] == "approved"
        
        print("SUCCESS: PATCH application updates status")
    
    def test_patch_application_update_notes(self):
        """Test updating application notes"""
        # Create application
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "clinic_name": f"{TEST_PREFIX}NotesUpdate_{unique_id}",
            "city": "София",
            "address": "ул. Бележки 1",
            "contact_name": "Тест",
            "phone": "+359888000000",
            "email": f"notes_{unique_id}@test.bg"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        assert create_response.status_code == 200
        app_id = create_response.json()["id"]
        self.created_app_ids.append(app_id)
        
        # Update notes
        token = self.get_admin_token()
        test_notes = "Тестова бележка от администратор"
        response = requests.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"notes": test_notes}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify notes were updated
        get_response = requests.get(
            f"{BASE_URL}/api/admin/clinic-applications",
            headers={"Authorization": f"Bearer {token}"}
        )
        apps = get_response.json()["applications"]
        our_app = next((a for a in apps if a.get("id") == app_id), None)
        assert our_app["notes"] == test_notes
        
        print("SUCCESS: PATCH application updates notes")
    
    def test_patch_application_only_allows_status_and_notes(self):
        """Test PATCH only allows updating status and notes fields"""
        # Create application
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "clinic_name": f"{TEST_PREFIX}FieldRestrict_{unique_id}",
            "city": "София",
            "address": "ул. Ограничение 1",
            "contact_name": "Тест",
            "phone": "+359888000000",
            "email": f"restrict_{unique_id}@test.bg"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/clinic-applications", json=payload)
        assert create_response.status_code == 200
        app_id = create_response.json()["id"]
        self.created_app_ids.append(app_id)
        
        # Try to update clinic_name (should be ignored or fail)
        token = self.get_admin_token()
        response = requests.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"clinic_name": "Hacked Name"}
        )
        
        # Should return 400 because no valid fields to update
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        print("SUCCESS: PATCH only allows status and notes fields")
    
    def test_patch_application_not_found(self):
        """Test PATCH returns 404 for non-existent application"""
        token = self.get_admin_token()
        response = requests.patch(
            f"{BASE_URL}/api/admin/clinic-applications/non-existent-id",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "approved"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SUCCESS: PATCH returns 404 for non-existent application")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
