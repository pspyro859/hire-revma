#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime
import time

class DryHireAPITester:
    def __init__(self, base_url="https://dry-hire-checklist.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_machine_id = None
        self.test_checklist_id = None
        self.test_maintenance_id = None
        
        # Test data
        self.test_machine = {
            "name": "Test Excavator 320D",
            "asset_id": "TEST-EXC-001",
            "category": "Excavator",
            "make": "Caterpillar", 
            "model": "320D",
            "serial_number": "CAT3E20D54321",
            "year": 2020,
            "hours_operated": 150,
            "next_service_hours": 250,
            "notes": "Test machine for API validation"
        }
        
        self.test_checklist_items = [
            {"category": "Pre-Start Safety", "item": "Fire extinguisher present and charged", "status": "pass", "notes": ""},
            {"category": "Pre-Start Safety", "item": "Seat belt functional", "status": "pass", "notes": ""},
            {"category": "Fluids", "item": "Engine oil level", "status": "fail", "notes": "Oil level low"},
            {"category": "Visual Inspection", "item": "No visible leaks", "status": "pass", "notes": ""}
        ]

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.content:
                    try:
                        return True, response.json()
                    except:
                        return True, response.text
                return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_create_machine(self):
        """Test creating a machine"""
        success, response = self.run_test(
            "Create Machine",
            "POST", 
            "machines",
            200,
            data=self.test_machine
        )
        if success and 'id' in response:
            self.test_machine_id = response['id']
            print(f"   Created machine ID: {self.test_machine_id}")
            return True
        return False

    def test_get_machines(self):
        """Test getting all machines"""
        return self.run_test("Get All Machines", "GET", "machines", 200)

    def test_get_machines_with_filter(self):
        """Test getting machines with status filter"""
        return self.run_test(
            "Get Machines - Filtered", 
            "GET", 
            "machines", 
            200, 
            params={"status": "available"}
        )

    def test_get_single_machine(self):
        """Test getting a single machine by ID"""
        if not self.test_machine_id:
            print("⚠️  Skipping - No machine ID available")
            return False
        
        return self.run_test(
            "Get Single Machine",
            "GET",
            f"machines/{self.test_machine_id}",
            200
        )

    def test_machine_qr_info(self):
        """Test getting QR info for a machine"""
        if not self.test_machine_id:
            print("⚠️  Skipping - No machine ID available")
            return False
        
        return self.run_test(
            "Get Machine QR Info",
            "GET", 
            f"machines/{self.test_machine_id}/qr-info",
            200
        )

    def test_checklist_template(self):
        """Test getting checklist template"""
        success, response = self.run_test(
            "Get Checklist Template",
            "GET",
            "checklist-template", 
            200
        )
        if success and 'items' in response:
            items = response['items']
            print(f"   Template has {len(items)} items")
            categories = set(item['category'] for item in items)
            print(f"   Categories: {', '.join(categories)}")
            # Verify we have the expected categories
            expected_categories = {"Pre-Start Safety", "Fluids", "Visual Inspection", "Operational Check"}
            if expected_categories.issubset(categories):
                print("   ✅ All expected categories present")
                return True
            else:
                print(f"   ❌ Missing categories: {expected_categories - categories}")
        return success

    def test_submit_checklist(self):
        """Test submitting a checklist"""
        if not self.test_machine_id:
            print("⚠️  Skipping - No machine ID available")
            return False
        
        checklist_data = {
            "machine_id": self.test_machine_id,
            "operator_name": "Test Operator",
            "items": self.test_checklist_items,
            "hours_reading": 155.5,
            "notes": "Test checklist submission"
        }
        
        success, response = self.run_test(
            "Submit Checklist", 
            "POST",
            "checklists",
            200,
            data=checklist_data
        )
        if success and 'id' in response:
            self.test_checklist_id = response['id']
            print(f"   Created checklist ID: {self.test_checklist_id}")
            print(f"   Overall status: {response.get('overall_status')}")
            return True
        return False

    def test_get_checklists(self):
        """Test getting all checklists"""
        return self.run_test("Get All Checklists", "GET", "checklists", 200)

    def test_get_single_checklist(self):
        """Test getting a single checklist by ID"""
        if not self.test_checklist_id:
            print("⚠️  Skipping - No checklist ID available")
            return False
            
        return self.run_test(
            "Get Single Checklist",
            "GET",
            f"checklists/{self.test_checklist_id}",
            200
        )

    def test_create_maintenance_record(self):
        """Test creating a maintenance record"""
        if not self.test_machine_id:
            print("⚠️  Skipping - No machine ID available")
            return False
        
        maintenance_data = {
            "machine_id": self.test_machine_id,
            "maintenance_type": "scheduled",
            "description": "250 hour service - Oil change and filter replacement",
            "performed_by": "Test Mechanic",
            "hours_at_service": 250,
            "parts_replaced": ["Oil Filter", "Hydraulic Filter"],
            "cost": 450.00,
            "next_service_hours": 500,
            "notes": "All checks completed successfully"
        }
        
        success, response = self.run_test(
            "Create Maintenance Record",
            "POST",
            "maintenance",
            200,
            data=maintenance_data
        )
        if success and 'id' in response:
            self.test_maintenance_id = response['id']
            print(f"   Created maintenance ID: {self.test_maintenance_id}")
            return True
        return False

    def test_get_maintenance_records(self):
        """Test getting all maintenance records"""
        return self.run_test("Get All Maintenance", "GET", "maintenance", 200)

    def test_get_single_maintenance(self):
        """Test getting a single maintenance record by ID"""
        if not self.test_maintenance_id:
            print("⚠️  Skipping - No maintenance ID available")
            return False
            
        return self.run_test(
            "Get Single Maintenance",
            "GET", 
            f"maintenance/{self.test_maintenance_id}",
            200
        )

    def test_dashboard_stats(self):
        """Test getting dashboard statistics"""
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            print(f"   Stats: {response}")
            required_fields = ['total_machines', 'available_machines', 'in_maintenance', 'due_for_service', 'recent_checklists', 'failed_checklists']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"   ❌ Missing stats fields: {missing_fields}")
                return False
            print("   ✅ All required stats fields present")
        return success

    def test_dashboard_activity(self):
        """Test getting dashboard recent activity"""
        success, response = self.run_test(
            "Get Dashboard Activity",
            "GET",
            "dashboard/recent-activity",
            200
        )
        if success and isinstance(response, dict):
            if 'recent_checklists' in response and 'recent_maintenance' in response:
                print("   ✅ Activity data structure correct")
                return True
            else:
                print("   ❌ Missing activity data fields")
        return success

    def test_update_machine(self):
        """Test updating a machine"""
        if not self.test_machine_id:
            print("⚠️  Skipping - No machine ID available")
            return False
        
        update_data = {
            "hours_operated": 160.0,
            "status": "maintenance"
        }
        
        return self.run_test(
            "Update Machine",
            "PUT",
            f"machines/{self.test_machine_id}",
            200,
            data=update_data
        )

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        if self.test_machine_id:
            try:
                response = requests.delete(f"{self.base_url}/machines/{self.test_machine_id}")
                if response.status_code == 200:
                    print("✅ Test machine deleted")
                else:
                    print(f"⚠️  Could not delete test machine: {response.status_code}")
            except Exception as e:
                print(f"⚠️  Error deleting test machine: {e}")

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting Dry Hire Equipment Management API Tests")
        print(f"🎯 Target URL: {self.base_url}")
        print("=" * 60)

        # Test sequence - order matters due to dependencies
        test_methods = [
            self.test_root_endpoint,
            self.test_create_machine,
            self.test_get_machines,
            self.test_get_machines_with_filter,
            self.test_get_single_machine,
            self.test_machine_qr_info,
            self.test_checklist_template,
            self.test_submit_checklist,
            self.test_get_checklists,
            self.test_get_single_checklist,
            self.test_create_maintenance_record,
            self.test_get_maintenance_records,
            self.test_get_single_maintenance,
            self.test_dashboard_stats,
            self.test_dashboard_activity,
            self.test_update_machine,
        ]

        # Run tests
        for test_method in test_methods:
            try:
                test_method()
                time.sleep(0.1)  # Small delay between tests
            except Exception as e:
                print(f"❌ Test {test_method.__name__} crashed: {e}")

        # Cleanup
        self.cleanup_test_data()

        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate < 50:
            print("🚨 CRITICAL: More than 50% of API tests failed!")
            return 1
        elif success_rate < 80:
            print("⚠️  WARNING: Some API tests failed")
            return 1
        else:
            print("✅ API tests completed successfully")
            return 0

def main():
    tester = DryHireAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())