#!/usr/bin/env python3
"""
Counterparty Search Test Suite
Tests the counterparty search functionality by ЄДРПОУ in "Основні дані" sheet.
"""

import requests
import json
import os
import sys
from pathlib import Path
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CounterpartySearchTestSuite:
    def __init__(self):
        # Get backend URL from frontend .env file
        frontend_env_path = Path("/app/frontend/.env")
        self.backend_url = None
        
        if frontend_env_path.exists():
            with open(frontend_env_path, 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        self.backend_url = line.split('=', 1)[1].strip()
                        break
        
        if not self.backend_url:
            raise ValueError("Could not find REACT_APP_BACKEND_URL in frontend/.env")
        
        self.api_url = f"{self.backend_url}/api"
        logger.info(f"Testing backend at: {self.api_url}")
        
        # Target ЄДРПОУ from the review request
        self.target_edrpou = "40196816"
        
    def test_health_check(self):
        """Test if the backend is running and healthy"""
        logger.info("Testing health check...")
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            if response.status_code == 200:
                logger.info("✅ Health check passed")
                return True
            else:
                logger.error(f"❌ Health check failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Health check failed with exception: {str(e)}")
            return False
    
    def test_get_all_counterparties(self):
        """Test GET /api/counterparties - should return list from 'Основні дані' sheet"""
        logger.info("Testing GET /api/counterparties...")
        try:
            response = requests.get(f"{self.api_url}/counterparties", timeout=10)
            
            if response.status_code == 200:
                counterparties = response.json()
                logger.info(f"✅ Successfully retrieved {len(counterparties)} counterparties")
                
                # Check if the target ЄДРПОУ exists
                target_found = False
                for counterparty in counterparties:
                    if counterparty.get('edrpou') == self.target_edrpou:
                        target_found = True
                        logger.info(f"✅ Found target ЄДРПОУ {self.target_edrpou} in the list")
                        logger.info(f"   Name: {counterparty.get('representative_name', 'N/A')}")
                        logger.info(f"   Email: {counterparty.get('email', 'N/A')}")
                        logger.info(f"   Phone: {counterparty.get('phone', 'N/A')}")
                        logger.info(f"   IBAN: {counterparty.get('iban', 'N/A')}")
                        break
                
                if not target_found:
                    logger.error(f"❌ Target ЄДРПОУ {self.target_edrpou} NOT found in counterparties list")
                    logger.info("Available EDRPOUs:")
                    for cp in counterparties[:5]:  # Show first 5
                        logger.info(f"   - {cp.get('edrpou', 'N/A')}: {cp.get('representative_name', 'N/A')}")
                    return False
                
                # Validate response structure
                if counterparties:
                    sample = counterparties[0]
                    required_fields = ['edrpou', 'representative_name', 'email', 'phone', 'iban']
                    missing_fields = [field for field in required_fields if field not in sample]
                    
                    if missing_fields:
                        logger.error(f"❌ Missing required fields in response: {missing_fields}")
                        return False
                    else:
                        logger.info("✅ Response structure is correct")
                
                return True
            else:
                logger.error(f"❌ Failed to get counterparties: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to get counterparties: {str(e)}")
            return False
    
    def test_search_by_edrpou(self):
        """Test GET /api/counterparties/{edrpou} - search for specific ЄДРПОУ"""
        logger.info(f"Testing GET /api/counterparties/{self.target_edrpou}...")
        try:
            response = requests.get(f"{self.api_url}/counterparties/{self.target_edrpou}", timeout=10)
            
            if response.status_code == 200:
                counterparty = response.json()
                logger.info(f"✅ Successfully found counterparty with ЄДРПОУ {self.target_edrpou}")
                
                # Validate response structure and content
                required_fields = {
                    'edrpou': self.target_edrpou,
                    'representative_name': 'should not be empty',
                    'email': 'should contain data from table',
                    'phone': 'should contain data from table', 
                    'iban': 'should contain data from table'
                }
                
                validation_passed = True
                for field, expectation in required_fields.items():
                    value = counterparty.get(field)
                    if field == 'edrpou':
                        if value != self.target_edrpou:
                            logger.error(f"❌ ЄДРПОУ mismatch: expected {self.target_edrpou}, got {value}")
                            validation_passed = False
                        else:
                            logger.info(f"✅ ЄДРПОУ: {value}")
                    elif field == 'representative_name':
                        if not value or value.strip() == '':
                            logger.error(f"❌ {field} is empty")
                            validation_passed = False
                        else:
                            logger.info(f"✅ Representative name: {value}")
                    else:
                        logger.info(f"✅ {field}: {value}")
                
                # Check additional fields
                additional_fields = ['director_position', 'director_name', 'contract_type']
                for field in additional_fields:
                    value = counterparty.get(field)
                    logger.info(f"   {field}: {value}")
                
                return validation_passed
                
            elif response.status_code == 404:
                logger.error(f"❌ Counterparty with ЄДРПОУ {self.target_edrpou} not found (404)")
                logger.error("   This means the counterparty is not in the 'Основні дані' sheet")
                return False
            else:
                logger.error(f"❌ Search failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Search failed with exception: {str(e)}")
            return False
    
    def check_backend_logs_for_search(self):
        """Check backend logs for counterparty search messages"""
        logger.info("Checking backend logs for counterparty search messages...")
        
        try:
            import subprocess
            result = subprocess.run(
                ['grep', '-i', 'counterparty\|основні дані', '/var/log/supervisor/backend.err.log'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                log_content = result.stdout
                
                # Look for success messages
                if "Found counterparty in 'Основні дані'" in log_content:
                    logger.info("✅ Found success message: 'Found counterparty in 'Основні дані''")
                    return True
                
                # Look for not found messages
                if f"not found in 'Основні дані'" in log_content:
                    logger.error("❌ Found 'not found' message in logs")
                    logger.error("   This indicates the counterparty search is not working properly")
                    return False
                
                # Look for other relevant messages
                lines = log_content.split('\n')
                relevant_lines = [line for line in lines if 'counterparty' in line.lower() or 'основні' in line.lower()]
                
                if relevant_lines:
                    logger.info("Found relevant log messages:")
                    for line in relevant_lines[-5:]:  # Show last 5 relevant lines
                        logger.info(f"   {line.strip()}")
                else:
                    logger.warning("⚠️  No relevant counterparty search messages found in logs")
                
                return True
            else:
                logger.warning("⚠️  No counterparty-related messages found in logs")
                return True  # Don't fail the test if no logs found
                
        except Exception as e:
            logger.warning(f"⚠️  Error checking backend logs: {str(e)}")
            return True  # Don't fail the test if we can't check logs
    
    def check_google_sheets_connection(self):
        """Check if Google Sheets service is working properly"""
        logger.info("Checking Google Sheets connection...")
        
        try:
            import subprocess
            result = subprocess.run(
                ['grep', '-i', 'google sheets\|spreadsheet', '/var/log/supervisor/backend.err.log'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                log_content = result.stdout
                
                if 'Google Sheets service initialized successfully' in log_content:
                    logger.info("✅ Google Sheets service initialized successfully")
                    return True
                elif 'Failed to initialize Google Sheets service' in log_content:
                    logger.error("❌ Google Sheets service initialization failed")
                    logger.error("   This could cause counterparty search to fail")
                    return False
                elif 'quota' in log_content.lower():
                    logger.warning("⚠️  Google Sheets API quota issues detected")
                    logger.warning("   This could affect counterparty search functionality")
                    return False
                else:
                    logger.info("✅ No obvious Google Sheets errors found")
                    return True
            else:
                logger.warning("⚠️  No Google Sheets messages found in logs")
                return True
                
        except Exception as e:
            logger.warning(f"⚠️  Error checking Google Sheets logs: {str(e)}")
            return True
    
    def test_data_integrity(self):
        """Test that the ЄДРПОУ in the table is exactly '40196816' without spaces"""
        logger.info("Testing data integrity for target ЄДРПОУ...")
        
        # First get all counterparties to check the exact format
        try:
            response = requests.get(f"{self.api_url}/counterparties", timeout=10)
            
            if response.status_code == 200:
                counterparties = response.json()
                
                # Look for variations of the target ЄДРПОУ
                variations_found = []
                for counterparty in counterparties:
                    edrpou = counterparty.get('edrpou', '')
                    if self.target_edrpou in edrpou or edrpou in self.target_edrpou:
                        variations_found.append(edrpou)
                
                if variations_found:
                    logger.info(f"✅ Found ЄДРПОУ variations: {variations_found}")
                    
                    # Check for exact match
                    if self.target_edrpou in variations_found:
                        logger.info(f"✅ Exact match found: '{self.target_edrpou}'")
                        return True
                    else:
                        logger.error(f"❌ No exact match found. Variations: {variations_found}")
                        logger.error("   The ЄДРПОУ in the table might have extra spaces or different format")
                        return False
                else:
                    logger.error(f"❌ No variations of ЄДРПОУ {self.target_edrpou} found")
                    logger.error("   The ЄДРПОУ might not exist in the 'Основні дані' sheet")
                    return False
            else:
                logger.error(f"❌ Failed to get counterparties for data integrity check: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Data integrity check failed: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all counterparty search tests"""
        logger.info("=" * 70)
        logger.info("STARTING COUNTERPARTY SEARCH TEST SUITE")
        logger.info(f"Target ЄДРПОУ: {self.target_edrpou}")
        logger.info("=" * 70)
        
        test_results = {}
        
        # Test 1: Health Check
        test_results['health_check'] = self.test_health_check()
        
        # Test 2: Google Sheets Connection
        test_results['google_sheets_connection'] = self.check_google_sheets_connection()
        
        # Test 3: Get All Counterparties
        test_results['get_all_counterparties'] = self.test_get_all_counterparties()
        
        # Test 4: Search by ЄДРПОУ
        test_results['search_by_edrpou'] = self.test_search_by_edrpou()
        
        # Test 5: Data Integrity Check
        test_results['data_integrity'] = self.test_data_integrity()
        
        # Test 6: Backend Logs Check
        test_results['backend_logs_check'] = self.check_backend_logs_for_search()
        
        # Summary
        logger.info("=" * 70)
        logger.info("TEST RESULTS SUMMARY")
        logger.info("=" * 70)
        
        passed_tests = 0
        total_tests = len(test_results)
        critical_failures = []
        
        for test_name, result in test_results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            logger.info(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed_tests += 1
            else:
                # Mark critical failures
                if test_name in ['search_by_edrpou', 'get_all_counterparties']:
                    critical_failures.append(test_name)
        
        logger.info("=" * 70)
        logger.info(f"OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        if critical_failures:
            logger.error(f"💥 CRITICAL FAILURES: {critical_failures}")
            logger.error("These failures indicate that counterparty search is not working properly")
            
            # Provide diagnostic information
            logger.info("\n🔍 DIAGNOSTIC INFORMATION:")
            logger.info("1. Check if ЄДРПОУ '40196816' exists in 'Основні дані' sheet")
            logger.info("2. Verify Google Sheets API credentials and permissions")
            logger.info("3. Check if Google Sheets API quota is not exceeded")
            logger.info("4. Ensure the sheet structure matches expected format:")
            logger.info("   ЄДРПОУ | Назва | Юридична адреса | р/р(IBAN) | Банк | МФО | email | тел | Посада | В особі")
            
            return False
        elif passed_tests == total_tests:
            logger.info("🎉 ALL TESTS PASSED - Counterparty search is working correctly!")
            return True
        else:
            logger.warning(f"⚠️  {total_tests - passed_tests} non-critical test(s) failed")
            return True  # Non-critical failures don't fail the overall test

def main():
    """Main test execution"""
    try:
        test_suite = CounterpartySearchTestSuite()
        success = test_suite.run_all_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Test suite failed to initialize: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()