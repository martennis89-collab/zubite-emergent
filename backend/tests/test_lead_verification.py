"""
Test Lead Verification System
Tests for:
- POST /api/admin/leads/{lead_id}/send-verification
- GET /api/verify/{token}
- GET /api/admin/verifications
- GET /api/admin/verifications/flagged
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@zubite.bg"
ADMIN_PASSWORD = "password"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/admin/login", json={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def clinic_id(auth_headers):
    """Get an existing clinic ID for assigning leads"""
    response = requests.get(f"{BASE_URL}/api/admin/clinic-accounts", headers=auth_headers)
    if response.status_code != 200:
        pytest.skip("Could not get clinic accounts")
    clinics = response.json().get("clinics", [])
    if not clinics:
        pytest.skip("No clinic accounts available")
    return clinics[0]["id"]


@pytest.fixture
def test_lead_with_email(clinic_id):
    """Create a test lead with email and assign to clinic"""
    unique_id = str(uuid.uuid4())[:8]
    lead_data = {
        "city_slug": "sofia",
        "treatment_type": "invisalign",
        "answers": {"quiz_type": "smile-classification", "quiz_result": "aligners"},
        "can_travel": True,
        "name": f"TEST_Verification_{unique_id}",
        "phone": "+359888123456",
        "email": f"test_verify_{unique_id}@example.com",
        "consent": True
    }
    response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
    assert response.status_code == 200, f"Failed to create lead: {response.text}"
    lead = response.json()
    lead_id = lead["id"]
    
    # Assign to clinic
    admin_token_resp = requests.post(f"{BASE_URL}/api/admin/login", json={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    token = admin_token_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    assign_resp = requests.patch(
        f"{BASE_URL}/api/admin/leads/{lead_id}",
        json={"assigned_clinic_id": clinic_id},
        headers=headers
    )
    assert assign_resp.status_code == 200, f"Failed to assign clinic: {assign_resp.text}"
    
    yield lead
    
    # Cleanup: delete the lead
    requests.delete(f"{BASE_URL}/api/admin/leads/{lead_id}", headers=headers)


@pytest.fixture
def test_lead_without_email(clinic_id):
    """Create a test lead without email"""
    unique_id = str(uuid.uuid4())[:8]
    lead_data = {
        "city_slug": "sofia",
        "treatment_type": "invisalign",
        "answers": {"quiz_type": "smile-classification"},
        "can_travel": True,
        "name": f"TEST_NoEmail_{unique_id}",
        "phone": "+359888123456",
        "consent": True
    }
    response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
    assert response.status_code == 200
    lead = response.json()
    lead_id = lead["id"]
    
    # Assign to clinic
    admin_token_resp = requests.post(f"{BASE_URL}/api/admin/login", json={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    token = admin_token_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    assign_resp = requests.patch(
        f"{BASE_URL}/api/admin/leads/{lead_id}",
        json={"assigned_clinic_id": clinic_id},
        headers=headers
    )
    
    yield lead
    
    # Cleanup
    requests.delete(f"{BASE_URL}/api/admin/leads/{lead_id}", headers=headers)


@pytest.fixture
def test_lead_unassigned():
    """Create a test lead not assigned to any clinic"""
    unique_id = str(uuid.uuid4())[:8]
    lead_data = {
        "city_slug": "sofia",
        "treatment_type": "implants",  # Different treatment to avoid auto-assign
        "answers": {},
        "can_travel": False,  # Low score to avoid auto-assign
        "name": f"TEST_Unassigned_{unique_id}",
        "phone": "+359888123456",
        "email": f"test_unassigned_{unique_id}@example.com",
        "consent": True
    }
    response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
    assert response.status_code == 200
    lead = response.json()
    
    yield lead
    
    # Cleanup
    admin_token_resp = requests.post(f"{BASE_URL}/api/admin/login", json={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    token = admin_token_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    requests.delete(f"{BASE_URL}/api/admin/leads/{lead['id']}", headers=headers)


class TestSendVerification:
    """Tests for POST /api/admin/leads/{lead_id}/send-verification"""
    
    def test_send_verification_success(self, auth_headers, test_lead_with_email):
        """Send verification creates record and returns success"""
        lead_id = test_lead_with_email["id"]
        response = requests.post(
            f"{BASE_URL}/api/admin/leads/{lead_id}/send-verification",
            headers=auth_headers
        )
        # Accept both 200 (ok) and warning (email not sent in test mode)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] in ["ok", "warning"], f"Unexpected status: {data}"
        print(f"PASS: Send verification returned status={data['status']}")
    
    def test_send_verification_no_email(self, auth_headers, test_lead_without_email):
        """Send verification fails if lead has no email (400)"""
        lead_id = test_lead_without_email["id"]
        response = requests.post(
            f"{BASE_URL}/api/admin/leads/{lead_id}/send-verification",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "email" in data.get("detail", "").lower(), f"Expected email error, got: {data}"
        print(f"PASS: No email returns 400 with message: {data['detail']}")
    
    def test_send_verification_not_assigned(self, auth_headers, test_lead_unassigned):
        """Send verification fails if lead is not assigned to clinic (400)"""
        lead_id = test_lead_unassigned["id"]
        response = requests.post(
            f"{BASE_URL}/api/admin/leads/{lead_id}/send-verification",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "clinic" in data.get("detail", "").lower() or "assigned" in data.get("detail", "").lower(), \
            f"Expected clinic/assigned error, got: {data}"
        print(f"PASS: Unassigned lead returns 400 with message: {data['detail']}")
    
    def test_send_verification_already_pending(self, auth_headers, test_lead_with_email):
        """Send verification fails if verification already pending (400)"""
        lead_id = test_lead_with_email["id"]
        # First call should succeed (or already done in previous test)
        requests.post(
            f"{BASE_URL}/api/admin/leads/{lead_id}/send-verification",
            headers=auth_headers
        )
        # Second call should fail
        response = requests.post(
            f"{BASE_URL}/api/admin/leads/{lead_id}/send-verification",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "pending" in data.get("detail", "").lower() or "already" in data.get("detail", "").lower(), \
            f"Expected pending/already error, got: {data}"
        print(f"PASS: Already pending returns 400 with message: {data['detail']}")
    
    def test_send_verification_lead_not_found(self, auth_headers):
        """Send verification fails for non-existent lead (404)"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/leads/{fake_id}/send-verification",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("PASS: Non-existent lead returns 404")


class TestVerifyEndpoint:
    """Tests for GET /api/verify/{token}"""
    
    @pytest.fixture
    def verification_token(self, auth_headers, clinic_id):
        """Create a lead and get verification token"""
        unique_id = str(uuid.uuid4())[:8]
        # Create lead
        lead_data = {
            "city_slug": "sofia",
            "treatment_type": "invisalign",
            "answers": {"quiz_type": "smile-classification", "quiz_result": "aligners"},
            "can_travel": True,
            "name": f"TEST_Token_{unique_id}",
            "phone": "+359888123456",
            "email": f"test_token_{unique_id}@example.com",
            "consent": True
        }
        lead_resp = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        lead = lead_resp.json()
        lead_id = lead["id"]
        
        # Assign to clinic
        requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead_id}",
            json={"assigned_clinic_id": clinic_id},
            headers=auth_headers
        )
        
        # Send verification
        requests.post(
            f"{BASE_URL}/api/admin/leads/{lead_id}/send-verification",
            headers=auth_headers
        )
        
        # Get token from verifications
        verifications_resp = requests.get(
            f"{BASE_URL}/api/admin/verifications",
            headers=auth_headers
        )
        verifications = verifications_resp.json().get("verifications", [])
        token = None
        for v in verifications:
            if v.get("lead_id") == lead_id:
                token = v.get("token")
                break
        
        yield {"token": token, "lead_id": lead_id}
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/leads/{lead_id}", headers=auth_headers)
    
    def test_verify_yes_updates_status(self, verification_token, auth_headers):
        """GET /api/verify/{token}?response=yes returns ok and updates lead to 'verified'"""
        token = verification_token["token"]
        lead_id = verification_token["lead_id"]
        
        if not token:
            pytest.skip("Could not get verification token")
        
        response = requests.get(f"{BASE_URL}/api/verify/{token}?response=yes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] == "ok", f"Expected status=ok, got: {data}"
        assert data["response"] == "yes", f"Expected response=yes, got: {data}"
        
        # Verify lead status updated
        lead_resp = requests.get(f"{BASE_URL}/api/admin/leads/{lead_id}", headers=auth_headers)
        lead = lead_resp.json()
        assert lead.get("verification_status") == "verified", \
            f"Expected verification_status=verified, got: {lead.get('verification_status')}"
        print("PASS: Verify yes updates lead to 'verified'")
    
    def test_verify_no_updates_status(self, auth_headers, clinic_id):
        """GET /api/verify/{token}?response=no returns ok and updates lead to 'flagged'"""
        unique_id = str(uuid.uuid4())[:8]
        # Create fresh lead for this test
        lead_data = {
            "city_slug": "sofia",
            "treatment_type": "invisalign",
            "answers": {"quiz_type": "smile-classification"},
            "can_travel": True,
            "name": f"TEST_VerifyNo_{unique_id}",
            "phone": "+359888123456",
            "email": f"test_verify_no_{unique_id}@example.com",
            "consent": True
        }
        lead_resp = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        lead = lead_resp.json()
        lead_id = lead["id"]
        
        # Assign and send verification
        requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead_id}",
            json={"assigned_clinic_id": clinic_id},
            headers=auth_headers
        )
        requests.post(
            f"{BASE_URL}/api/admin/leads/{lead_id}/send-verification",
            headers=auth_headers
        )
        
        # Get token
        verifications_resp = requests.get(f"{BASE_URL}/api/admin/verifications", headers=auth_headers)
        verifications = verifications_resp.json().get("verifications", [])
        token = None
        for v in verifications:
            if v.get("lead_id") == lead_id:
                token = v.get("token")
                break
        
        if not token:
            pytest.skip("Could not get verification token")
        
        # Verify with 'no'
        response = requests.get(f"{BASE_URL}/api/verify/{token}?response=no")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] == "ok"
        assert data["response"] == "no"
        
        # Verify lead status updated to flagged
        lead_resp = requests.get(f"{BASE_URL}/api/admin/leads/{lead_id}", headers=auth_headers)
        lead = lead_resp.json()
        assert lead.get("verification_status") == "flagged", \
            f"Expected verification_status=flagged, got: {lead.get('verification_status')}"
        print("PASS: Verify no updates lead to 'flagged'")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/leads/{lead_id}", headers=auth_headers)
    
    def test_verify_already_responded(self, auth_headers, clinic_id):
        """GET /api/verify/{token}?response=yes returns 'already_responded' on second click"""
        unique_id = str(uuid.uuid4())[:8]
        # Create fresh lead
        lead_data = {
            "city_slug": "sofia",
            "treatment_type": "invisalign",
            "answers": {},
            "can_travel": True,
            "name": f"TEST_AlreadyResp_{unique_id}",
            "phone": "+359888123456",
            "email": f"test_already_{unique_id}@example.com",
            "consent": True
        }
        lead_resp = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        lead = lead_resp.json()
        lead_id = lead["id"]
        
        # Assign and send verification
        requests.patch(
            f"{BASE_URL}/api/admin/leads/{lead_id}",
            json={"assigned_clinic_id": clinic_id},
            headers=auth_headers
        )
        requests.post(
            f"{BASE_URL}/api/admin/leads/{lead_id}/send-verification",
            headers=auth_headers
        )
        
        # Get token
        verifications_resp = requests.get(f"{BASE_URL}/api/admin/verifications", headers=auth_headers)
        verifications = verifications_resp.json().get("verifications", [])
        token = None
        for v in verifications:
            if v.get("lead_id") == lead_id:
                token = v.get("token")
                break
        
        if not token:
            pytest.skip("Could not get verification token")
        
        # First response
        requests.get(f"{BASE_URL}/api/verify/{token}?response=yes")
        
        # Second response should return already_responded
        response = requests.get(f"{BASE_URL}/api/verify/{token}?response=yes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] == "already_responded", f"Expected already_responded, got: {data}"
        print("PASS: Second click returns 'already_responded'")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/leads/{lead_id}", headers=auth_headers)
    
    def test_verify_invalid_token(self):
        """GET /api/verify/invalid-token?response=yes returns 404"""
        response = requests.get(f"{BASE_URL}/api/verify/invalid-token-12345?response=yes")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("PASS: Invalid token returns 404")


class TestAdminVerifications:
    """Tests for GET /api/admin/verifications and /api/admin/verifications/flagged"""
    
    def test_get_all_verifications(self, auth_headers):
        """GET /api/admin/verifications returns all verification records"""
        response = requests.get(f"{BASE_URL}/api/admin/verifications", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "verifications" in data, f"Expected 'verifications' key, got: {data.keys()}"
        assert isinstance(data["verifications"], list), "verifications should be a list"
        print(f"PASS: GET /api/admin/verifications returns {len(data['verifications'])} records")
    
    def test_get_flagged_leads(self, auth_headers):
        """GET /api/admin/verifications/flagged returns only flagged leads"""
        response = requests.get(f"{BASE_URL}/api/admin/verifications/flagged", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "flagged_leads" in data, f"Expected 'flagged_leads' key, got: {data.keys()}"
        assert isinstance(data["flagged_leads"], list), "flagged_leads should be a list"
        # Verify all returned leads have verification_status='flagged'
        for lead in data["flagged_leads"]:
            assert lead.get("verification_status") == "flagged", \
                f"Expected all leads to be flagged, got: {lead.get('verification_status')}"
        print(f"PASS: GET /api/admin/verifications/flagged returns {len(data['flagged_leads'])} flagged leads")
    
    def test_verifications_requires_auth(self):
        """GET /api/admin/verifications requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/verifications")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: /api/admin/verifications requires auth")
    
    def test_flagged_requires_auth(self):
        """GET /api/admin/verifications/flagged requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/verifications/flagged")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: /api/admin/verifications/flagged requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
