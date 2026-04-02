"""
Test suite for Clinic Password Change and Profile Update features
Tests:
1. POST /api/clinic/change-password - password change functionality
2. PATCH /api/clinic/profile - profile update with new company fields
3. GET /api/clinic/profile - profile retrieval with new fields
4. Admin approve flow - welcome email sending
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
CLINIC_EMAIL = "contact@orthobg.bg"
CLINIC_PASSWORD = "dPRN_ZXjuANYzw"
ADMIN_EMAIL = "admin@zubite.bg"
ADMIN_PASSWORD = "password"


@pytest.fixture(scope="module")
def clinic_token():
    """Get clinic authentication token"""
    response = requests.post(f"{BASE_URL}/api/clinic/login", json={
        "email": CLINIC_EMAIL,
        "password": CLINIC_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Could not login as clinic: {response.status_code} - {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/admin/login", json={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Could not login as admin: {response.status_code} - {response.text}")
    return response.json()["access_token"]


class TestPasswordChange:
    """Tests for POST /api/clinic/change-password endpoint"""

    def test_change_password_wrong_current_password(self, clinic_token):
        """Test that wrong current password returns 400 with Bulgarian error message"""
        response = requests.post(
            f"{BASE_URL}/api/clinic/change-password",
            headers={"Authorization": f"Bearer {clinic_token}"},
            json={
                "current_password": "wrong_password_123",
                "new_password": "newpassword123"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "Текущата парола е грешна" in data.get("detail", ""), f"Expected Bulgarian error message, got: {data}"

    def test_change_password_too_short(self, clinic_token):
        """Test that new password < 6 chars returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/clinic/change-password",
            headers={"Authorization": f"Bearer {clinic_token}"},
            json={
                "current_password": CLINIC_PASSWORD,
                "new_password": "12345"  # Only 5 chars
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "6" in data.get("detail", ""), f"Expected error about 6 chars, got: {data}"

    def test_change_password_success_and_restore(self, clinic_token):
        """Test successful password change, then restore original password"""
        new_password = "TestNewPassword123"
        
        # Step 1: Change password to new one
        response = requests.post(
            f"{BASE_URL}/api/clinic/change-password",
            headers={"Authorization": f"Bearer {clinic_token}"},
            json={
                "current_password": CLINIC_PASSWORD,
                "new_password": new_password
            }
        )
        assert response.status_code == 200, f"Password change failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("status") == "ok", f"Expected status ok, got: {data}"

        # Step 2: Verify login with new password works
        login_response = requests.post(f"{BASE_URL}/api/clinic/login", json={
            "email": CLINIC_EMAIL,
            "password": new_password
        })
        assert login_response.status_code == 200, f"Login with new password failed: {login_response.status_code}"
        new_token = login_response.json()["access_token"]

        # Step 3: Verify old password no longer works
        old_login_response = requests.post(f"{BASE_URL}/api/clinic/login", json={
            "email": CLINIC_EMAIL,
            "password": CLINIC_PASSWORD
        })
        assert old_login_response.status_code == 401, f"Old password should not work: {old_login_response.status_code}"

        # Step 4: Restore original password
        restore_response = requests.post(
            f"{BASE_URL}/api/clinic/change-password",
            headers={"Authorization": f"Bearer {new_token}"},
            json={
                "current_password": new_password,
                "new_password": CLINIC_PASSWORD
            }
        )
        assert restore_response.status_code == 200, f"Password restore failed: {restore_response.status_code} - {restore_response.text}"

        # Step 5: Verify original password works again
        final_login = requests.post(f"{BASE_URL}/api/clinic/login", json={
            "email": CLINIC_EMAIL,
            "password": CLINIC_PASSWORD
        })
        assert final_login.status_code == 200, f"Original password should work after restore: {final_login.status_code}"

    def test_change_password_requires_auth(self):
        """Test that change-password requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/clinic/change-password",
            json={
                "current_password": "test",
                "new_password": "newtest123"
            }
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestProfileUpdate:
    """Tests for PATCH /api/clinic/profile with new company fields"""

    def test_profile_get_returns_all_fields(self, clinic_token):
        """Test that GET /api/clinic/profile returns all new fields"""
        response = requests.get(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}"}
        )
        assert response.status_code == 200, f"Profile GET failed: {response.status_code}"
        data = response.json()
        
        # Check required fields
        assert "id" in data
        assert "clinic_name" in data
        assert "city" in data
        assert "email" in data
        assert "phone" in data
        assert "status" in data
        
        # Check new optional fields exist (can be null)
        assert "address" in data, "address field missing from profile"
        assert "website" in data, "website field missing from profile"
        assert "company_name" in data, "company_name field missing from profile"
        assert "eik" in data, "eik field missing from profile"
        assert "mol" in data, "mol field missing from profile"
        assert "description" in data, "description field missing from profile"

    def test_profile_update_address(self, clinic_token):
        """Test updating address field"""
        test_address = "ул. Тестова 123, Варна"
        response = requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}"},
            json={"address": test_address}
        )
        assert response.status_code == 200, f"Profile update failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("address") == test_address, f"Address not updated: {data.get('address')}"

    def test_profile_update_website(self, clinic_token):
        """Test updating website field"""
        test_website = "https://test-clinic.bg"
        response = requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}"},
            json={"website": test_website}
        )
        assert response.status_code == 200, f"Profile update failed: {response.status_code}"
        data = response.json()
        assert data.get("website") == test_website, f"Website not updated: {data.get('website')}"

    def test_profile_update_company_name(self, clinic_token):
        """Test updating company_name field"""
        test_company = "Тест Клиника ЕООД"
        response = requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}"},
            json={"company_name": test_company}
        )
        assert response.status_code == 200, f"Profile update failed: {response.status_code}"
        data = response.json()
        assert data.get("company_name") == test_company, f"Company name not updated: {data.get('company_name')}"

    def test_profile_update_eik(self, clinic_token):
        """Test updating EIK field"""
        test_eik = "987654321"
        response = requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}"},
            json={"eik": test_eik}
        )
        assert response.status_code == 200, f"Profile update failed: {response.status_code}"
        data = response.json()
        assert data.get("eik") == test_eik, f"EIK not updated: {data.get('eik')}"

    def test_profile_update_mol(self, clinic_token):
        """Test updating MOL field"""
        test_mol = "Д-р Тестов"
        response = requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}"},
            json={"mol": test_mol}
        )
        assert response.status_code == 200, f"Profile update failed: {response.status_code}"
        data = response.json()
        assert data.get("mol") == test_mol, f"MOL not updated: {data.get('mol')}"

    def test_profile_update_description(self, clinic_token):
        """Test updating description field"""
        test_desc = "Тестово описание на клиниката"
        response = requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}"},
            json={"description": test_desc}
        )
        assert response.status_code == 200, f"Profile update failed: {response.status_code}"
        data = response.json()
        assert data.get("description") == test_desc, f"Description not updated: {data.get('description')}"

    def test_profile_update_multiple_fields(self, clinic_token):
        """Test updating multiple company fields at once"""
        update_data = {
            "address": "ул. Морска 45, Варна",
            "company_name": "ОртоБГ ЕООД",
            "eik": "123456789",
            "mol": "Д-р Иванов",
            "description": "Специализирана ортодонтска клиника"
        }
        response = requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {clinic_token}"},
            json=update_data
        )
        assert response.status_code == 200, f"Profile update failed: {response.status_code}"
        data = response.json()
        
        for key, value in update_data.items():
            assert data.get(key) == value, f"{key} not updated correctly: expected {value}, got {data.get(key)}"

    def test_profile_update_requires_auth(self):
        """Test that profile update requires authentication"""
        response = requests.patch(
            f"{BASE_URL}/api/clinic/profile",
            json={"address": "test"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestAdminApproveWelcomeEmail:
    """Tests for admin approve flow with welcome email"""

    def test_get_pending_applications(self, admin_token):
        """Test getting pending clinic applications"""
        response = requests.get(
            f"{BASE_URL}/api/admin/clinic-applications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get applications: {response.status_code}"
        data = response.json()
        assert "applications" in data, "Response should contain applications list"
        
        # Check for pending application
        pending = [app for app in data["applications"] if app.get("status") == "pending"]
        print(f"Found {len(pending)} pending applications")
        return pending

    def test_approve_application_creates_account_and_sends_email(self, admin_token):
        """Test that approving an application creates clinic account and attempts to send welcome email"""
        # First get pending applications
        response = requests.get(
            f"{BASE_URL}/api/admin/clinic-applications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        applications = response.json().get("applications", [])
        
        pending = [app for app in applications if app.get("status") == "pending"]
        if not pending:
            pytest.skip("No pending applications to test approval flow")
        
        app_to_approve = pending[0]
        app_id = app_to_approve["id"]
        app_email = app_to_approve["email"]
        
        print(f"Approving application: {app_id} for email: {app_email}")
        
        # Approve the application
        approve_response = requests.patch(
            f"{BASE_URL}/api/admin/clinic-applications/{app_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "approved"}
        )
        
        # Check response
        assert approve_response.status_code == 200, f"Approve failed: {approve_response.status_code} - {approve_response.text}"
        data = approve_response.json()
        
        # Verify clinic account was created
        assert data.get("clinic_account_created") == True, f"Clinic account should be created: {data}"
        assert "clinic_credentials" in data, f"Credentials should be returned: {data}"
        assert data["clinic_credentials"]["email"] == app_email
        assert "temporary_password" in data["clinic_credentials"]
        
        print(f"Clinic account created with temp password: {data['clinic_credentials']['temporary_password']}")
        
        # Note: Welcome email sending is logged in backend - check logs for "Welcome email sent"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
