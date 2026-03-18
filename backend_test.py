import requests
import sys
import json
from datetime import datetime, timedelta

class RevmaAPITester:
    def __init__(self, base_url="https://dry-hire-pro.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.staff_token = None
        self.customer_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = None
        self.staff_user = None
        self.customer_user = None
        self.test_machine_id = None
        self.test_agreement_id = None
        self.test_customer_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        req_headers = {'Content-Type': 'application/json'}
        if headers:
            req_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    req_headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=req_headers)
                else:
                    response = requests.post(url, json=data, headers=req_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=req_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.text}")
                except:
                    pass
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_seed_data(self):
        """Test seeding initial data"""
        return self.run_test(
            "Seed Data",
            "POST",
            "seed",
            200
        )

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@revma.com.au", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.admin_user = response['user']
            return True
        return False

    def test_staff_login(self):
        """Test staff login"""
        success, response = self.run_test(
            "Staff Login",
            "POST",
            "auth/login",
            200,
            data={"email": "staff@revma.com.au", "password": "staff123"}
        )
        if success and 'access_token' in response:
            self.staff_token = response['access_token']
            self.staff_user = response['user']
            return True
        return False

    def test_customer_registration(self):
        """Test customer registration"""
        customer_data = {
            "email": f"testcust_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "full_name": "Test Customer",
            "phone": "0400000000",
            "company_name": "Test Company",
            "abn": "12345678901",
            "drivers_licence": "NSW123456789",
            "address": "123 Test St, Test City NSW 2000"
        }
        
        success, response = self.run_test(
            "Customer Registration",
            "POST",
            "auth/register",
            200,
            data=customer_data
        )
        if success and 'access_token' in response:
            self.customer_token = response['access_token']
            self.customer_user = response['user']
            self.test_customer_id = response['user']['id']
            return True
        return False

    def test_get_machines(self):
        """Test fetching machines"""
        success, response = self.run_test(
            "Get Machines",
            "GET",
            "machines",
            200
        )
        if success and response and len(response) >= 6:
            self.test_machine_id = response[0]['id']  # Store first machine ID for later tests
            print(f"   Found {len(response)} machines")
            return True
        return False

    def test_get_single_machine(self):
        """Test fetching a single machine"""
        if not self.test_machine_id:
            print("❌ Skipping - No machine ID available")
            return False
            
        return self.run_test(
            "Get Single Machine",
            "GET",
            f"machines/{self.test_machine_id}",
            200
        )[0]

    def test_auth_me_admin(self):
        """Test /auth/me endpoint with admin token"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        return self.run_test(
            "Auth Me (Admin)",
            "GET",
            "auth/me",
            200,
            headers=headers
        )[0]

    def test_auth_me_staff(self):
        """Test /auth/me endpoint with staff token"""
        if not self.staff_token:
            print("❌ Skipping - No staff token")
            return False
            
        headers = {"Authorization": f"Bearer {self.staff_token}"}
        return self.run_test(
            "Auth Me (Staff)",
            "GET",
            "auth/me",
            200,
            headers=headers
        )[0]

    def test_auth_me_customer(self):
        """Test /auth/me endpoint with customer token"""
        if not self.customer_token:
            print("❌ Skipping - No customer token")
            return False
            
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        return self.run_test(
            "Auth Me (Customer)",
            "GET",
            "auth/me",
            200,
            headers=headers
        )[0]

    def test_create_agreement(self):
        """Test creating an agreement"""
        if not self.staff_token or not self.test_customer_id or not self.test_machine_id:
            print("❌ Skipping - Missing required data")
            return False
            
        headers = {"Authorization": f"Bearer {self.staff_token}"}
        today = datetime.now()
        start_date = (today + timedelta(days=1)).strftime("%Y-%m-%d")
        end_date = (today + timedelta(days=7)).strftime("%Y-%m-%d")
        
        agreement_data = {
            "customer_id": self.test_customer_id,
            "machine_id": self.test_machine_id,
            "hire_start_date": start_date,
            "hire_end_date": end_date,
            "hire_rate_type": "daily",
            "delivery_method": "pickup",
            "job_site": "Test Job Site",
            "purpose": "Testing equipment hire agreement creation"
        }
        
        success, response = self.run_test(
            "Create Agreement",
            "POST",
            "agreements",
            200,
            data=agreement_data,
            headers=headers
        )
        
        if success and 'id' in response:
            self.test_agreement_id = response['id']
            print(f"   Agreement ID: {self.test_agreement_id}")
            return True
        return False

    def test_get_agreements(self):
        """Test fetching agreements"""
        if not self.staff_token:
            print("❌ Skipping - No staff token")
            return False
            
        headers = {"Authorization": f"Bearer {self.staff_token}"}
        return self.run_test(
            "Get Agreements",
            "GET",
            "agreements",
            200,
            headers=headers
        )[0]

    def test_get_single_agreement(self):
        """Test fetching a single agreement"""
        if not self.staff_token or not self.test_agreement_id:
            print("❌ Skipping - No agreement ID available")
            return False
            
        headers = {"Authorization": f"Bearer {self.staff_token}"}
        return self.run_test(
            "Get Single Agreement",
            "GET",
            f"agreements/{self.test_agreement_id}",
            200,
            headers=headers
        )[0]

    def test_update_checklist(self):
        """Test updating agreement checklist"""
        if not self.staff_token or not self.test_agreement_id:
            print("❌ Skipping - No agreement ID available")
            return False
            
        headers = {"Authorization": f"Bearer {self.staff_token}"}
        checklist_data = [
            {"item": "Engine Oil Level", "checked": True, "notes": "OK"},
            {"item": "Fuel Level", "checked": True, "notes": "Full"},
            {"item": "Coolant Level", "checked": True, "notes": "OK"},
            {"item": "Hydraulic Fluid Level", "checked": True, "notes": "OK"},
            {"item": "Tracks/Tyres Condition", "checked": True, "notes": "Good"},
            {"item": "Visible Damage Inspection", "checked": True, "notes": "None"},
            {"item": "Lights & Indicators Working", "checked": True, "notes": "All working"},
            {"item": "Safety Equipment Present", "checked": True, "notes": "Present"}
        ]
        
        return self.run_test(
            "Update Checklist",
            "PUT",
            f"agreements/{self.test_agreement_id}/checklist",
            200,
            data=checklist_data,
            headers=headers
        )[0]

    def test_create_inquiry(self):
        """Test creating a customer inquiry"""
        inquiry_data = {
            "first_name": "Test",
            "last_name": "Customer",
            "email": "testinquiry@test.com",
            "phone": "0400000000",
            "is_business": True,
            "company_name": "Test Business",
            "abn": "12345678901",
            "equipment": ["Excavator", "Tipper"],
            "hire_start_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "hire_end_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "hire_rate_preference": "daily",
            "delivery_method": "pickup",
            "job_description": "Test excavation work",
            "additional_notes": "This is a test inquiry"
        }
        
        return self.run_test(
            "Create Inquiry",
            "POST",
            "inquiries",
            200,
            data=inquiry_data
        )[0]

    def test_get_inquiries_staff(self):
        """Test fetching inquiries (staff only)"""
        if not self.staff_token:
            print("❌ Skipping - No staff token")
            return False
            
        headers = {"Authorization": f"Bearer {self.staff_token}"}
        return self.run_test(
            "Get Inquiries (Staff)",
            "GET",
            "inquiries",
            200,
            headers=headers
        )[0]

    def test_get_terms(self):
        """Test fetching terms and conditions"""
        return self.run_test(
            "Get Terms & Conditions",
            "GET",
            "terms",
            200
        )[0]

    def test_get_users_staff(self):
        """Test fetching users (staff only)"""
        if not self.staff_token:
            print("❌ Skipping - No staff token")
            return False
            
        headers = {"Authorization": f"Bearer {self.staff_token}"}
        return self.run_test(
            "Get Users (Staff)",
            "GET",
            "users",
            200,
            headers=headers
        )[0]

    def test_health_endpoint(self):
        """Test health check endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )[0]

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test(
            "Root API",
            "GET",
            "/",
            200
        )[0]

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        success, response = self.run_test(
            "Unauthorized Access (Should Fail)",
            "GET",
            "agreements",
            401
        )
        return success

def main():
    """Run all API tests"""
    print("="*60)
    print("🚀 REVMA HEAVY EQUIPMENT HIRE API TESTING")
    print("="*60)
    
    tester = RevmaAPITester()
    
    # Test basic endpoints first
    print("\n📋 BASIC ENDPOINTS")
    tester.test_root_endpoint()
    tester.test_health_endpoint()
    
    # Test data seeding
    print("\n🌱 DATA SEEDING")
    tester.test_seed_data()
    
    # Test authentication
    print("\n🔐 AUTHENTICATION TESTS")
    tester.test_admin_login()
    tester.test_staff_login()
    tester.test_customer_registration()
    
    # Test auth/me endpoints
    tester.test_auth_me_admin()
    tester.test_auth_me_staff()
    tester.test_auth_me_customer()
    
    # Test unauthorized access
    tester.test_unauthorized_access()
    
    # Test machines
    print("\n🚛 MACHINES TESTS")
    tester.test_get_machines()
    tester.test_get_single_machine()
    
    # Test agreements
    print("\n📄 AGREEMENTS TESTS")
    tester.test_create_agreement()
    tester.test_get_agreements()
    tester.test_get_single_agreement()
    tester.test_update_checklist()
    
    # Test inquiries
    print("\n💬 INQUIRIES TESTS")
    tester.test_create_inquiry()
    tester.test_get_inquiries_staff()
    
    # Test terms and users
    print("\n📝 TERMS & USERS TESTS")
    tester.test_get_terms()
    tester.test_get_users_staff()
    
    # Print final results
    print("\n" + "="*60)
    print(f"📊 TEST RESULTS: {tester.tests_passed}/{tester.tests_run} PASSED")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"🎯 SUCCESS RATE: {success_rate:.1f}%")
    print("="*60)
    
    # Return appropriate exit code
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print("❌ SOME TESTS FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())