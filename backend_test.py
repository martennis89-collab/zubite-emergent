#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ZubiteAPITester:
    def __init__(self, base_url="https://orthodontics-quiz-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return response.json()
                except:
                    return {"status": "ok"}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                
                self.log_test(name, False, error_msg)
                return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n=== TESTING HEALTH ENDPOINTS ===")
        
        self.run_test("API Root", "GET", "", 200)
        self.run_test("Health Check", "GET", "health", 200)

    def test_seed_database(self):
        """Test database seeding"""
        print("\n=== TESTING DATABASE SEEDING ===")
        
        result = self.run_test("Seed Database", "POST", "seed", 200)
        return result is not None

    def test_admin_auth(self):
        """Test admin authentication"""
        print("\n=== TESTING ADMIN AUTHENTICATION ===")
        
        # Test login with correct credentials
        login_data = {"username": "admin", "password": "admin123"}
        result = self.run_test("Admin Login", "POST", "admin/login", 200, login_data)
        
        if result and 'access_token' in result:
            self.token = result['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            
            # Test getting current user
            self.run_test("Get Admin User", "GET", "admin/me", 200)
            return True
        else:
            print("❌ Failed to get admin token")
            return False

    def test_quiz_flow(self):
        """Test complete quiz flow with new routing"""
        print("\n=== TESTING QUIZ FLOW ===")
        
        # Test Invisalign quiz with new routing (city level)
        invisalign_answers = {
            "seriousness": "searching",
            "timing": "0-3",
            "importance": "quality",
            "previous_ortho": "no",
            "pain_bite": "yes",
            "readiness": "yes",
            "call_availability": "today",
            "can_travel": "yes"
        }
        
        lead_data = {
            "treatment_type": "invisalign",
            "city_slug": "haskovo",
            "clinic_slug": None,
            "answers": invisalign_answers,
            "can_travel": True,
            "utm_source": "test",
            "page_path": "/city/haskovo/invisalign"
        }
        
        lead_result = self.run_test("Create City-Level Invisalign Lead", "POST", "leads", 200, lead_data)
        
        if lead_result and 'id' in lead_result:
            lead_id = lead_result['id']
            print(f"   Lead created with ID: {lead_id}")
            print(f"   Score: {lead_result.get('score_total', 'N/A')}")
            print(f"   Band: {lead_result.get('band', 'N/A')}")
            print(f"   City Slug: {lead_result.get('city_slug', 'N/A')}")
            print(f"   Clinic Slug: {lead_result.get('clinic_slug', 'N/A')}")
            print(f"   Can Travel: {lead_result.get('can_travel', 'N/A')}")
            
            # Test getting the lead
            self.run_test("Get Lead", "GET", f"leads/{lead_id}", 200)
            
            # Test updating contact info
            contact_data = {
                "name": "Test User",
                "phone": "+359888123456",
                "email": "test@example.com",
                "consent": True
            }
            
            self.run_test("Update Lead Contact", "PATCH", f"leads/{lead_id}/contact", 200, contact_data)
            
            # Test clinic-specific lead (auto-assigned)
            clinic_lead_data = {
                "treatment_type": "invisalign",
                "city_slug": "haskovo",
                "clinic_slug": "haskovo-premium-clinic",
                "answers": invisalign_answers,
                "can_travel": True,
                "utm_source": "test",
                "page_path": "/city/haskovo/c/haskovo-premium-clinic/invisalign"
            }
            
            clinic_lead_result = self.run_test("Create Clinic-Level Invisalign Lead", "POST", "leads", 200, clinic_lead_data)
            
            if clinic_lead_result:
                print(f"   Clinic Lead ID: {clinic_lead_result['id']}")
                print(f"   Assigned Clinic ID: {clinic_lead_result.get('assigned_clinic_id', 'N/A')}")
            
            # Test travel restriction (should cap to YELLOW)
            travel_restricted_data = {
                "treatment_type": "invisalign",
                "city_slug": "haskovo",
                "answers": invisalign_answers,
                "can_travel": False,
                "utm_source": "test",
                "page_path": "/city/haskovo/invisalign"
            }
            
            travel_result = self.run_test("Create Travel-Restricted Lead", "POST", "leads", 200, travel_restricted_data)
            
            if travel_result:
                print(f"   Travel Restricted Band: {travel_result.get('band', 'N/A')} (should be YELLOW or RED)")
            
            return lead_id
        
        return None

    def test_admin_lead_management(self):
        """Test admin lead management with city filtering"""
        print("\n=== TESTING ADMIN LEAD MANAGEMENT ===")
        
        if not self.token:
            print("❌ No admin token available")
            return False
        
        # Test getting admin stats
        self.run_test("Get Admin Stats", "GET", "admin/stats", 200)
        
        # Test getting all leads
        leads_result = self.run_test("Get Admin Leads", "GET", "admin/leads", 200)
        
        # Test filtering by city_slug
        self.run_test("Get Admin Leads by City", "GET", "admin/leads?city_slug=haskovo", 200)
        
        # Test filtering by clinic_slug
        self.run_test("Get Admin Leads by Clinic", "GET", "admin/leads?clinic_slug=haskovo-premium-clinic", 200)
        
        if leads_result and len(leads_result) > 0:
            lead_id = leads_result[0]['id']
            
            # Test getting specific lead
            self.run_test("Get Admin Lead Detail", "GET", f"admin/leads/{lead_id}", 200)
            
            # Test updating lead status
            update_data = {
                "status": "CONTACTED",
                "notes": "Test note from API test"
            }
            
            self.run_test("Update Lead Status", "PATCH", f"admin/leads/{lead_id}", 200, update_data)
            
            return True
        
        return False

    def test_different_quiz_types(self):
        """Test different quiz types and scoring with new routing"""
        print("\n=== TESTING DIFFERENT QUIZ TYPES ===")
        
        # Test Implants quiz (should get YELLOW)
        implants_answers = {
            "missing_teeth": "3-5",
            "chewing_issues": "sometimes",
            "pain_inflammation": "no",
            "timing": "6+",
            "importance": "price",
            "readiness": "maybe",
            "can_travel": "yes"
        }
        
        implants_data = {
            "treatment_type": "implants",
            "city_slug": "haskovo",
            "answers": implants_answers,
            "can_travel": True
        }
        
        implants_result = self.run_test("Create Implants Lead", "POST", "leads", 200, implants_data)
        
        if implants_result:
            print(f"   Implants Score: {implants_result.get('score_total', 'N/A')}")
            print(f"   Implants Band: {implants_result.get('band', 'N/A')}")
        
        # Test Full Mouth quiz (should get RED)
        full_mouth_answers = {
            "situation": "cosmetic",
            "main_problem": "curiosity",
            "consulted_before": "no",
            "timing": "not_sure",
            "importance": "price",
            "readiness": "no",
            "complex_plan_ready": "no",
            "can_travel": "yes"
        }
        
        full_mouth_data = {
            "treatment_type": "full_mouth",
            "city_slug": "haskovo",
            "answers": full_mouth_answers,
            "can_travel": True
        }
        
        full_mouth_result = self.run_test("Create Full Mouth Lead", "POST", "leads", 200, full_mouth_data)
        
        if full_mouth_result:
            print(f"   Full Mouth Score: {full_mouth_result.get('score_total', 'N/A')}")
            print(f"   Full Mouth Band: {full_mouth_result.get('band', 'N/A')}")

    def test_city_and_clinic_endpoints(self):
        """Test new city and clinic endpoints"""
        print("\n=== TESTING CITY AND CLINIC ENDPOINTS ===")
        
        # Test getting cities
        cities_result = self.run_test("Get Cities", "GET", "cities", 200)
        
        if cities_result and len(cities_result) > 0:
            city_slug = cities_result[0]['city_slug']
            print(f"   Found city: {city_slug}")
            
            # Test getting city info
            city_info_result = self.run_test("Get City Info", "GET", f"cities/{city_slug}", 200)
            
            if city_info_result and 'clinics' in city_info_result:
                clinics = city_info_result['clinics']
                if len(clinics) > 0:
                    clinic_slug = clinics[0]['clinic_slug']
                    print(f"   Found clinic: {clinic_slug}")
                    
                    # Test getting clinic by slug
                    self.run_test("Get Clinic by Slug", "GET", f"cities/{city_slug}/clinics/{clinic_slug}", 200)
        
        # Test legacy clinics endpoint
        self.run_test("Get All Clinics", "GET", "clinics", 200)

    def test_events_endpoint(self):
        """Test event tracking"""
        print("\n=== TESTING EVENT TRACKING ===")
        
        event_data = {
            "lead_id": "test-lead-id",
            "event_type": "quiz_started",
            "metadata": {"treatment_type": "invisalign"}
        }
        
        self.run_test("Create Event", "POST", "events", 200, event_data)

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Zubite.bg API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test basic endpoints
        self.test_health_endpoints()
        
        # Seed database
        if not self.test_seed_database():
            print("❌ Database seeding failed, continuing anyway...")
        
        # Test admin authentication
        if not self.test_admin_auth():
            print("❌ Admin auth failed, skipping admin tests")
        
        # Test quiz flow
        lead_id = self.test_quiz_flow()
        
        # Test different quiz types
        self.test_different_quiz_types()
        
        # Test admin functionality
        if self.token:
            self.test_admin_lead_management()
        
        # Test cities and clinics
        self.test_city_and_clinic_endpoints()
        
        # Test events
        self.test_events_endpoint()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"   Total tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed")
            return 1

def main():
    tester = ZubiteAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())