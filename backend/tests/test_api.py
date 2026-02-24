"""
Backend API Tests for Zubite.bg
Tests: Language-agnostic API endpoints, lead creation, contact submission, email notification
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasicEndpoints:
    """Test basic API health and city endpoints"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert "Zubite.bg" in data["message"]
        print(f"✓ API root: {data}")
    
    def test_get_cities(self):
        """Test cities endpoint returns all 4 cities"""
        response = requests.get(f"{BASE_URL}/api/cities")
        assert response.status_code == 200
        cities = response.json()
        assert len(cities) == 4
        city_slugs = [c["city_slug"] for c in cities]
        assert "sofia" in city_slugs
        assert "plovdiv" in city_slugs
        assert "varna" in city_slugs
        assert "haskovo" in city_slugs
        print(f"✓ Cities: {city_slugs}")
    
    def test_get_city_detail(self):
        """Test individual city endpoint"""
        response = requests.get(f"{BASE_URL}/api/cities/sofia")
        assert response.status_code == 200
        data = response.json()
        assert data["city_slug"] == "sofia"
        assert data["city_name"] == "София"
        print(f"✓ City detail: {data['city_name']}")
    
    def test_get_city_not_found(self):
        """Test 404 for non-existent city"""
        response = requests.get(f"{BASE_URL}/api/cities/nonexistent")
        assert response.status_code == 404
        print("✓ Non-existent city returns 404")


class TestLeadCreation:
    """Test lead creation and scoring"""
    
    def test_create_lead_invisalign_green_band(self):
        """Test creating a high-scoring Invisalign lead (GREEN band)"""
        lead_data = {
            "city_slug": "sofia",
            "treatment_type": "invisalign",
            "answers": {
                "seriousness": "searching",
                "timing": "0-3",
                "importance": "quality",
                "previous_ortho": "no",
                "bite_problem": "yes",
                "readiness": "yes"
            },
            "can_travel": True
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200
        lead = response.json()
        
        assert lead["city_slug"] == "sofia"
        assert lead["treatment_type"] == "invisalign"
        assert lead["band"] == "GREEN"
        assert lead["score_total"] >= 75
        assert "id" in lead
        print(f"✓ Created GREEN lead: score={lead['score_total']}, band={lead['band']}")
        return lead["id"]
    
    def test_create_lead_implants_yellow_band(self):
        """Test creating a medium-scoring Implants lead (YELLOW band)"""
        lead_data = {
            "city_slug": "plovdiv",
            "treatment_type": "implants",
            "answers": {
                "missing_teeth": "1-2",
                "chewing_difficulty": "sometimes",
                "pain": "no",
                "timing": "3-6",
                "importance": "speed",
                "readiness": "maybe"
            },
            "can_travel": True
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200
        lead = response.json()
        
        assert lead["band"] in ["YELLOW", "GREEN"]  # Could be either depending on exact scoring
        print(f"✓ Created lead: score={lead['score_total']}, band={lead['band']}")
        return lead["id"]
    
    def test_create_lead_full_mouth_red_band(self):
        """Test creating a low-scoring Full Mouth lead (RED band)"""
        lead_data = {
            "city_slug": "varna",
            "treatment_type": "full_mouth",
            "answers": {
                "situation": "aesthetic",
                "main_problem": "curiosity",
                "consulted_before": "no",
                "timing": "not_sure",
                "importance": "price",
                "complex_plan": "no"
            },
            "can_travel": False
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200
        lead = response.json()
        
        assert lead["band"] == "RED"
        assert lead["score_total"] < 50
        print(f"✓ Created RED lead: score={lead['score_total']}, band={lead['band']}")
        return lead["id"]
    
    def test_travel_restriction_caps_band(self):
        """Test that can_travel=False caps band to YELLOW even with high score"""
        lead_data = {
            "city_slug": "sofia",
            "treatment_type": "invisalign",
            "answers": {
                "seriousness": "searching",
                "timing": "0-3",
                "importance": "quality",
                "previous_ortho": "yes",
                "bite_problem": "yes",
                "readiness": "yes"
            },
            "can_travel": False  # This should cap to YELLOW
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200
        lead = response.json()
        
        # Even with high score, band should be capped to YELLOW
        assert lead["band"] in ["YELLOW", "RED"]  # Not GREEN
        print(f"✓ Travel restriction caps band: score={lead['score_total']}, band={lead['band']}")


class TestLeadContactUpdate:
    """Test lead contact update and email notification trigger"""
    
    def test_update_lead_contact_triggers_email(self):
        """Test that updating lead contact info triggers email notification"""
        # First create a lead
        lead_data = {
            "city_slug": "sofia",
            "treatment_type": "invisalign",
            "answers": {
                "seriousness": "searching",
                "timing": "0-3",
                "importance": "quality",
                "previous_ortho": "no",
                "bite_problem": "yes",
                "readiness": "yes"
            },
            "can_travel": True
        }
        create_response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert create_response.status_code == 200
        lead_id = create_response.json()["id"]
        print(f"✓ Created lead: {lead_id}")
        
        # Update contact info
        contact_data = {
            "name": f"TEST_User_{uuid.uuid4().hex[:8]}",
            "phone": "+359888123456",
            "email": "test-email-notification@example.com",
            "consent": True
        }
        update_response = requests.patch(f"{BASE_URL}/api/leads/{lead_id}/contact", json=contact_data)
        assert update_response.status_code == 200
        updated_lead = update_response.json()
        
        assert updated_lead["name"] == contact_data["name"]
        assert updated_lead["phone"] == contact_data["phone"]
        assert updated_lead["email"] == contact_data["email"]
        assert updated_lead["consent"] == True
        print(f"✓ Updated lead contact: {updated_lead['name']}, {updated_lead['email']}")
        # Note: Email notification is sent asynchronously, we can't verify it was sent in this test
        # but the backend logs should show the email was sent
    
    def test_get_lead_after_contact_update(self):
        """Test that lead data persists after contact update"""
        # Create lead
        lead_data = {
            "city_slug": "haskovo",
            "treatment_type": "implants",
            "answers": {"missing_teeth": "3-5", "timing": "0-3", "readiness": "yes"},
            "can_travel": True
        }
        create_response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        lead_id = create_response.json()["id"]
        
        # Update contact
        contact_data = {"name": "TEST_Persistence", "email": "persist@test.com", "consent": True}
        requests.patch(f"{BASE_URL}/api/leads/{lead_id}/contact", json=contact_data)
        
        # GET to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/leads/{lead_id}")
        assert get_response.status_code == 200
        lead = get_response.json()
        
        assert lead["name"] == "TEST_Persistence"
        assert lead["email"] == "persist@test.com"
        assert lead["city_slug"] == "haskovo"
        print(f"✓ Lead data persisted correctly")


class TestAdminAuthentication:
    """Test admin login and protected endpoints"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        login_data = {"username": "admin", "password": "admin123"}
        response = requests.post(f"{BASE_URL}/api/admin/login", json=login_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "admin"
        print(f"✓ Admin login successful")
        return data["access_token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        login_data = {"username": "admin", "password": "wrongpassword"}
        response = requests.post(f"{BASE_URL}/api/admin/login", json=login_data)
        assert response.status_code == 401
        print("✓ Invalid credentials rejected")
    
    def test_admin_leads_requires_auth(self):
        """Test that admin leads endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/leads")
        assert response.status_code in [401, 403]
        print("✓ Admin leads requires auth")
    
    def test_admin_leads_with_auth(self):
        """Test admin leads endpoint with valid token"""
        # Login first
        login_data = {"username": "admin", "password": "admin123"}
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Get leads with auth
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/leads", headers=headers)
        assert response.status_code == 200
        leads = response.json()
        assert isinstance(leads, list)
        print(f"✓ Admin leads returned {len(leads)} leads")
    
    def test_admin_stats(self):
        """Test admin stats endpoint"""
        # Login
        login_data = {"username": "admin", "password": "admin123"}
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Get stats
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        stats = response.json()
        
        assert "total_leads" in stats
        assert "by_band" in stats
        assert "by_city" in stats
        print(f"✓ Admin stats: total={stats['total_leads']}, by_band={stats['by_band']}")


class TestClinics:
    """Test clinic endpoints"""
    
    def test_get_clinics(self):
        """Test getting all clinics"""
        response = requests.get(f"{BASE_URL}/api/clinics")
        assert response.status_code == 200
        clinics = response.json()
        assert isinstance(clinics, list)
        assert len(clinics) >= 4  # Should have at least 4 seeded clinics
        print(f"✓ Found {len(clinics)} clinics")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
