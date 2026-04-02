"""
Comprehensive API tests for Zubite.bg refactored backend
Tests all endpoints after major refactoring from monolithic server.py to modular routers
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@zubite.bg"
ADMIN_PASSWORD = "password"
CLINIC_EMAIL = "test-new@clinic.bg"


class TestPublicEndpoints:
    """Public routes: /, /cities, /leads"""
    
    def test_root_endpoint(self):
        """GET /api/ returns ok status"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert "Zubite.bg API" in data["message"]
        print(f"✓ Root endpoint returns: {data}")
    
    def test_cities_returns_4_cities(self):
        """GET /api/cities returns 4 cities"""
        response = requests.get(f"{BASE_URL}/api/cities")
        assert response.status_code == 200
        cities = response.json()
        assert len(cities) == 4
        city_slugs = [c["city_slug"] for c in cities]
        assert "sofia" in city_slugs
        assert "plovdiv" in city_slugs
        assert "varna" in city_slugs
        assert "haskovo" in city_slugs
        print(f"✓ Cities endpoint returns {len(cities)} cities: {city_slugs}")


class TestAdminAuth:
    """Admin authentication and protected endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_admin_login_success(self):
        """POST /api/admin/login with valid credentials returns access_token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == ADMIN_EMAIL
        print(f"✓ Admin login successful, token received")
    
    def test_admin_login_invalid_credentials(self):
        """POST /api/admin/login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"✓ Admin login correctly rejects invalid credentials")
    
    def test_admin_leads_returns_list(self, admin_token):
        """GET /api/admin/leads returns list of leads"""
        response = requests.get(
            f"{BASE_URL}/api/admin/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        leads = response.json()
        assert isinstance(leads, list)
        print(f"✓ Admin leads endpoint returns {len(leads)} leads")
    
    def test_admin_leads_requires_auth(self):
        """GET /api/admin/leads without auth returns 403"""
        response = requests.get(f"{BASE_URL}/api/admin/leads")
        assert response.status_code == 403
        print(f"✓ Admin leads correctly requires authentication")
    
    def test_admin_stats_returns_data(self, admin_token):
        """GET /api/admin/stats returns total_leads, by_band, by_city"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_leads" in data
        assert "by_band" in data
        assert "by_city" in data
        assert "green" in data["by_band"]
        assert "yellow" in data["by_band"]
        assert "red" in data["by_band"]
        assert "sofia" in data["by_city"]
        print(f"✓ Admin stats: total={data['total_leads']}, by_band={data['by_band']}")


class TestBlogEndpoints:
    """Blog routes: public posts, tracking"""
    
    def test_blog_posts_returns_published(self):
        """GET /api/blog/posts returns published posts with total"""
        response = requests.get(f"{BASE_URL}/api/blog/posts")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert "total" in data
        assert isinstance(data["posts"], list)
        print(f"✓ Blog posts endpoint returns {data['total']} total posts")
    
    def test_blog_track_view_accepts_event(self):
        """POST /api/blog/track-view accepts blog view tracking"""
        response = requests.post(f"{BASE_URL}/api/blog/track-view", json={
            "post_slug": "test-post",
            "visitor_id": "test-visitor-123",
            "referrer": "https://google.com",
            "user_agent": "Test Agent"
        })
        assert response.status_code == 200
        data = response.json()
        assert "tracked" in data
        print(f"✓ Blog track view accepted: {data}")


class TestAnalyticsEndpoints:
    """Analytics routes: events tracking, admin analytics"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_analytics_events_accepts_event(self):
        """POST /api/analytics/events accepts quiz analytics events"""
        response = requests.post(f"{BASE_URL}/api/analytics/events", json={
            "event_type": "quiz_start",
            "session_id": "test-session-123",
            "timestamp": "2026-01-01T12:00:00Z"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print(f"✓ Analytics event accepted")
    
    def test_admin_analytics_returns_data(self, admin_token):
        """GET /api/admin/analytics returns quiz analytics data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_starts" in data
        assert "total_completions" in data
        assert "completion_rate" in data
        assert "funnel" in data
        print(f"✓ Admin analytics: starts={data['total_starts']}, completions={data['total_completions']}")


class TestClinicApplicationsEndpoints:
    """Clinic applications admin routes"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_admin_clinic_applications_returns_list(self, admin_token):
        """GET /api/admin/clinic-applications returns applications list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/clinic-applications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "applications" in data
        assert isinstance(data["applications"], list)
        print(f"✓ Clinic applications: {len(data['applications'])} applications")
    
    def test_admin_clinic_applications_requires_auth(self):
        """GET /api/admin/clinic-applications without auth returns 403"""
        response = requests.get(f"{BASE_URL}/api/admin/clinic-applications")
        assert response.status_code == 403
        print(f"✓ Clinic applications correctly requires authentication")


class TestClinicAuth:
    """Clinic authentication and dashboard"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def clinic_credentials(self, admin_token):
        """Get current clinic credentials by regenerating password"""
        # First get clinic applications to find the app_id
        apps_response = requests.get(
            f"{BASE_URL}/api/admin/clinic-applications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        apps = apps_response.json()["applications"]
        
        # Find the application for test-new@clinic.bg
        app = next((a for a in apps if a.get("email") == CLINIC_EMAIL), None)
        if not app:
            pytest.skip(f"No application found for {CLINIC_EMAIL}")
        
        # Regenerate password
        regen_response = requests.post(
            f"{BASE_URL}/api/admin/clinic-applications/{app['id']}/regenerate-password",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert regen_response.status_code == 200
        data = regen_response.json()
        return data["credentials"]
    
    def test_clinic_login_success(self, clinic_credentials):
        """POST /api/clinic/login with valid credentials returns access_token"""
        response = requests.post(f"{BASE_URL}/api/clinic/login", json={
            "email": clinic_credentials["email"],
            "password": clinic_credentials["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Clinic login successful for {clinic_credentials['email']}")
    
    def test_clinic_profile_returns_info(self, clinic_credentials):
        """GET /api/clinic/profile returns clinic info"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/clinic/login", json={
            "email": clinic_credentials["email"],
            "password": clinic_credentials["password"]
        })
        token = login_response.json()["access_token"]
        
        # Get profile
        response = requests.get(
            f"{BASE_URL}/api/clinic/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "clinic_name" in data
        assert "email" in data
        print(f"✓ Clinic profile: {data['clinic_name']}")
    
    def test_clinic_dashboard_returns_stats(self, clinic_credentials):
        """GET /api/clinic/dashboard returns lead stats"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/clinic/login", json={
            "email": clinic_credentials["email"],
            "password": clinic_credentials["password"]
        })
        token = login_response.json()["access_token"]
        
        # Get dashboard
        response = requests.get(
            f"{BASE_URL}/api/clinic/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_leads" in data
        assert "leads_contacted" in data
        assert "leads_pending" in data
        print(f"✓ Clinic dashboard: total_leads={data['total_leads']}")
    
    def test_clinic_leads_returns_assigned(self, clinic_credentials):
        """GET /api/clinic/leads returns leads assigned to clinic"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/clinic/login", json={
            "email": clinic_credentials["email"],
            "password": clinic_credentials["password"]
        })
        token = login_response.json()["access_token"]
        
        # Get leads
        response = requests.get(
            f"{BASE_URL}/api/clinic/leads",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        assert isinstance(data["leads"], list)
        print(f"✓ Clinic leads: {len(data['leads'])} leads assigned")


class TestPasswordRegeneration:
    """Password regeneration endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_regenerate_password_returns_credentials(self, admin_token):
        """POST /api/admin/clinic-applications/{app_id}/regenerate-password regenerates password"""
        # Get clinic applications
        apps_response = requests.get(
            f"{BASE_URL}/api/admin/clinic-applications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        apps = apps_response.json()["applications"]
        
        # Find approved application with clinic account
        app = next((a for a in apps if a.get("status") == "approved"), None)
        if not app:
            pytest.skip("No approved clinic application found")
        
        # Regenerate password
        response = requests.post(
            f"{BASE_URL}/api/admin/clinic-applications/{app['id']}/regenerate-password",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "credentials" in data
        assert "email" in data["credentials"]
        assert "password" in data["credentials"]
        print(f"✓ Password regenerated for {data['credentials']['email']}")


class TestVerificationEndpoints:
    """Verification routes"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_admin_verifications_returns_records(self, admin_token):
        """GET /api/admin/verifications returns verification records"""
        response = requests.get(
            f"{BASE_URL}/api/admin/verifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "verifications" in data
        assert isinstance(data["verifications"], list)
        print(f"✓ Verifications: {len(data['verifications'])} records")
    
    def test_admin_verifications_requires_auth(self):
        """GET /api/admin/verifications without auth returns 403"""
        response = requests.get(f"{BASE_URL}/api/admin/verifications")
        assert response.status_code == 403
        print(f"✓ Verifications correctly requires authentication")


class TestClinicAccountsEndpoints:
    """Clinic accounts admin routes"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_admin_clinic_accounts_returns_list(self, admin_token):
        """GET /api/admin/clinic-accounts returns clinic accounts list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/clinic-accounts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "clinics" in data
        assert isinstance(data["clinics"], list)
        # Verify structure
        if data["clinics"]:
            clinic = data["clinics"][0]
            assert "id" in clinic
            assert "clinic_name" in clinic
            assert "email" in clinic
            # Ensure password_hash is not exposed
            assert "password_hash" not in clinic
        print(f"✓ Clinic accounts: {len(data['clinics'])} accounts")
    
    def test_admin_clinic_accounts_requires_auth(self):
        """GET /api/admin/clinic-accounts without auth returns 403"""
        response = requests.get(f"{BASE_URL}/api/admin/clinic-accounts")
        assert response.status_code == 403
        print(f"✓ Clinic accounts correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
