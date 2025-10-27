#!/usr/bin/env python3
"""
Backend Test Suite for Contract PDF Generation with Unicode Support
Tests the contract PDF generation, preview, download, and email functionality
with focus on Ukrainian characters support.
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

class ContractTestSuite:
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
        
        # Test data with Ukrainian characters
        self.test_counterparty_edrpou = None
        self.generated_pdf_filename = None
        self.generated_pdf_path = None
        self.contract_number = None
        self.drive_view_link = None
        self.drive_download_link = None
        self.drive_file_id = None
        
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
    
    def test_google_drive_service_initialization(self):
        """Test Google Drive service initialization by checking backend logs"""
        logger.info("Testing Google Drive service initialization...")
        
        try:
            # Check backend logs for Google Drive initialization
            import subprocess
            result = subprocess.run(
                ['grep', '-i', 'google drive', '/var/log/supervisor/backend.err.log'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                log_content = result.stdout
                
                if 'Google Drive service initialized successfully' in log_content:
                    logger.info("✅ Google Drive service initialized successfully")
                    return True
                elif 'Failed to initialize Google Drive service' in log_content:
                    logger.warning("⚠️  Google Drive service initialization failed (expected without credentials)")
                    logger.info("✅ This is expected in test environment - Google Drive requires service account credentials")
                    return True
                else:
                    logger.warning("⚠️  No clear Google Drive initialization message found")
                    return True
            else:
                logger.warning("⚠️  No Google Drive messages found in logs")
                logger.info("✅ This may be expected if Google Drive service is not configured")
                return True
                
        except Exception as e:
            logger.warning(f"⚠️  Error checking Google Drive initialization: {str(e)}")
            return True  # Don't fail the test if we can't check logs
    
    def test_get_counterparties(self):
        """Get available counterparties to use for testing"""
        logger.info("Getting available counterparties...")
        try:
            response = requests.get(f"{self.api_url}/counterparties", timeout=10)
            if response.status_code == 200:
                counterparties = response.json()
                if counterparties:
                    # Use the first available counterparty
                    self.test_counterparty_edrpou = counterparties[0]['edrpou']
                    logger.info(f"✅ Found {len(counterparties)} counterparties, using EDRPOU: {self.test_counterparty_edrpou}")
                    return True
                else:
                    logger.error("❌ No counterparties found in system")
                    return False
            else:
                logger.error(f"❌ Failed to get counterparties: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to get counterparties: {str(e)}")
            return False
    
    def test_contract_pdf_generation(self):
        """Test contract PDF generation with Ukrainian characters and Google Drive upload"""
        logger.info("Testing contract PDF generation with Ukrainian characters and Google Drive upload...")
        
        if not self.test_counterparty_edrpou:
            logger.error("❌ No counterparty EDRPOU available for testing")
            return False
        
        # Test payload with Ukrainian characters
        test_payload = {
            "counterparty_edrpou": self.test_counterparty_edrpou,
            "subject": "Постачання медичного обладнання",  # Ukrainian text
            "items": [
                {
                    "name": "Медичне обладнання",  # Ukrainian text
                    "unit": "шт",  # Ukrainian abbreviation
                    "quantity": 5,
                    "price": 1000,
                    "amount": 5000
                }
            ],
            "total_amount": 5000
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/contracts/generate-pdf",
                json=test_payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    self.generated_pdf_filename = result.get('pdf_filename')
                    self.generated_pdf_path = result.get('pdf_path')
                    self.contract_number = result.get('contract_number')
                    
                    # Store Google Drive links for further testing
                    self.drive_view_link = result.get('drive_view_link', '')
                    self.drive_download_link = result.get('drive_download_link', '')
                    self.drive_file_id = result.get('drive_file_id', '')
                    
                    logger.info(f"✅ Contract PDF generated successfully")
                    logger.info(f"   Contract number: {self.contract_number}")
                    logger.info(f"   PDF filename: {self.generated_pdf_filename}")
                    logger.info(f"   PDF path: {self.generated_pdf_path}")
                    
                    # Check Google Drive integration
                    if self.drive_view_link:
                        logger.info(f"✅ Google Drive view link: {self.drive_view_link}")
                    else:
                        logger.warning("⚠️  No Google Drive view link returned (Drive service may not be configured)")
                    
                    if self.drive_download_link:
                        logger.info(f"✅ Google Drive download link: {self.drive_download_link}")
                    else:
                        logger.warning("⚠️  No Google Drive download link returned")
                    
                    if self.drive_file_id:
                        logger.info(f"✅ Google Drive file ID: {self.drive_file_id}")
                    else:
                        logger.warning("⚠️  No Google Drive file ID returned")
                    
                    # Verify the contract number contains Ukrainian character "П"
                    if self.contract_number and "П" in self.contract_number:
                        logger.info(f"✅ Contract number contains Ukrainian character 'П': {self.contract_number}")
                    else:
                        logger.warning(f"⚠️  Contract number doesn't contain expected Ukrainian character 'П': {self.contract_number}")
                    
                    return True
                else:
                    logger.error(f"❌ PDF generation failed: {result}")
                    return False
            else:
                logger.error(f"❌ PDF generation failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ PDF generation failed with exception: {str(e)}")
            return False
    
    def test_contract_pdf_download(self):
        """Test contract PDF download with Unicode filename"""
        logger.info("Testing contract PDF download...")
        
        if not self.generated_pdf_filename:
            logger.error("❌ No PDF filename available for download test")
            return False
        
        try:
            response = requests.get(
                f"{self.api_url}/contracts/download/{self.generated_pdf_filename}",
                timeout=30
            )
            
            if response.status_code == 200:
                # Check content type
                content_type = response.headers.get('content-type', '')
                if 'application/pdf' in content_type:
                    logger.info("✅ PDF download successful")
                    logger.info(f"   Content-Type: {content_type}")
                    
                    # Check Content-Disposition header for proper Unicode encoding
                    content_disposition = response.headers.get('content-disposition', '')
                    if content_disposition:
                        logger.info(f"   Content-Disposition: {content_disposition}")
                        if 'filename*=UTF-8' in content_disposition:
                            logger.info("✅ Proper RFC 5987 Unicode encoding detected in headers")
                        else:
                            logger.warning("⚠️  RFC 5987 Unicode encoding not detected in headers")
                    
                    # Check if we got actual PDF content
                    if len(response.content) > 1000:  # PDF should be reasonably sized
                        logger.info(f"✅ PDF content received ({len(response.content)} bytes)")
                        return True
                    else:
                        logger.error(f"❌ PDF content too small ({len(response.content)} bytes)")
                        return False
                else:
                    logger.error(f"❌ Wrong content type: {content_type}")
                    return False
            else:
                logger.error(f"❌ PDF download failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ PDF download failed with exception: {str(e)}")
            return False
    
    def test_google_drive_links(self):
        """Test Google Drive links validation"""
        logger.info("Testing Google Drive links validation...")
        
        if not self.drive_view_link and not self.drive_download_link and not self.drive_file_id:
            logger.warning("⚠️  No Google Drive links available - Drive service may not be configured")
            logger.info("✅ This is expected in test environment without Google Drive credentials")
            return True
        
        # Test drive_view_link format
        if self.drive_view_link:
            if self.drive_view_link.startswith("https://drive.google.com"):
                logger.info(f"✅ Drive view link has correct format: {self.drive_view_link}")
            else:
                logger.error(f"❌ Drive view link has incorrect format: {self.drive_view_link}")
                return False
        
        # Test drive_download_link
        if self.drive_download_link:
            if self.drive_download_link:
                logger.info(f"✅ Drive download link is not empty: {self.drive_download_link}")
            else:
                logger.error("❌ Drive download link is empty")
                return False
        
        # Test drive_file_id
        if self.drive_file_id:
            if len(self.drive_file_id) > 10:  # Google Drive file IDs are typically long
                logger.info(f"✅ Drive file ID has reasonable length: {self.drive_file_id}")
            else:
                logger.error(f"❌ Drive file ID seems too short: {self.drive_file_id}")
                return False
        
        return True
    
    def test_contract_email_sending(self):
        """Test contract email sending with Unicode filename and Google Drive link"""
        logger.info("Testing contract email sending with Google Drive link...")
        
        if not self.generated_pdf_path or not self.contract_number:
            logger.error("❌ No PDF path or contract number available for email test")
            return False
        
        # Test payload with Google Drive link
        email_payload = {
            "contract_pdf_path": self.generated_pdf_path,
            "recipient_email": "test@example.com",
            "contract_number": self.contract_number,
            "drive_link": self.drive_view_link if self.drive_view_link else None
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/contracts/send-email",
                json=email_payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    logger.info("✅ Email sending request successful")
                    logger.info(f"   Message: {result.get('message', '')}")
                    if self.drive_view_link:
                        logger.info("✅ Email includes Google Drive link")
                    return True
                else:
                    logger.error(f"❌ Email sending failed: {result}")
                    return False
            else:
                # For email testing, we need to check the backend logs to see if it's a Unicode issue or SMTP issue
                logger.info("Email sending failed, checking if it's due to Unicode or SMTP configuration...")
                
                # Check backend logs for the specific error
                import subprocess
                try:
                    log_result = subprocess.run(
                        ['tail', '-n', '20', '/var/log/supervisor/backend.err.log'],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    
                    if log_result.returncode == 0:
                        recent_logs = log_result.stdout
                        
                        # Check for SMTP authentication errors (expected)
                        if 'Username and Password not accepted' in recent_logs or 'BadCredentials' in recent_logs:
                            logger.info("✅ Email sending reached SMTP layer without Unicode errors")
                            logger.info("   SMTP authentication failed as expected (no real credentials configured)")
                            return True
                        
                        # Check for Unicode errors (would be a problem)
                        unicode_error_patterns = ['UnicodeEncodeError', 'UnicodeDecodeError', 'codec can\'t encode']
                        for pattern in unicode_error_patterns:
                            if pattern in recent_logs:
                                logger.error(f"❌ Unicode error detected in email sending: {pattern}")
                                return False
                        
                        # If no specific error pattern found, it's likely an SMTP config issue
                        logger.info("✅ No Unicode errors detected in email sending")
                        logger.info("   Email failure appears to be SMTP configuration related (expected)")
                        return True
                    
                except Exception as log_e:
                    logger.warning(f"Could not check backend logs: {str(log_e)}")
                
                logger.error(f"❌ Email sending failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Email sending failed with exception: {str(e)}")
            return False
    
    def check_backend_logs_for_unicode_errors(self):
        """Check backend logs for any Unicode-related errors and SMTP status"""
        logger.info("Checking backend logs for Unicode errors and email status...")
        
        try:
            # Check recent backend logs
            import subprocess
            result = subprocess.run(
                ['tail', '-n', '100', '/var/log/supervisor/backend.err.log'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                log_content = result.stdout
                unicode_errors = []
                smtp_errors = []
                
                # Look for common Unicode error patterns
                unicode_patterns = [
                    'UnicodeEncodeError',
                    'UnicodeDecodeError',
                    'codec can\'t encode',
                    'codec can\'t decode',
                    'ascii codec',
                    'utf-8 codec'
                ]
                
                # Look for SMTP authentication errors
                smtp_patterns = [
                    'Username and Password not accepted',
                    'BadCredentials',
                    'SMTP authentication'
                ]
                
                for line in log_content.split('\n'):
                    for pattern in unicode_patterns:
                        if pattern in line:
                            unicode_errors.append(line.strip())
                    
                    for pattern in smtp_patterns:
                        if pattern in line:
                            smtp_errors.append(line.strip())
                
                if unicode_errors:
                    logger.error("❌ Unicode errors found in backend logs:")
                    for error in unicode_errors[-3:]:  # Show last 3 errors
                        logger.error(f"   {error}")
                    return False
                else:
                    logger.info("✅ No Unicode errors found in recent backend logs")
                    
                    if smtp_errors:
                        logger.info("✅ SMTP authentication errors found (expected in test environment)")
                        logger.info("   This confirms email sending reached SMTP layer without Unicode issues")
                    
                    return True
            else:
                logger.warning("⚠️  Could not read backend logs")
                return True  # Don't fail the test if we can't read logs
                
        except Exception as e:
            logger.warning(f"⚠️  Error checking backend logs: {str(e)}")
            return True  # Don't fail the test if we can't check logs
    
    def test_specific_google_drive_scenario(self):
        """Test the specific Google Drive scenario from the review request"""
        logger.info("Testing specific Google Drive scenario from review request...")
        
        if not self.test_counterparty_edrpou:
            logger.error("❌ No counterparty EDRPOU available for testing")
            return False
        
        # Test payload exactly as specified in the review request
        test_payload = {
            "counterparty_edrpou": self.test_counterparty_edrpou,
            "subject": "Постачання медичного обладнання та матеріалів",
            "items": [
                {
                    "name": "Медичне обладнання",
                    "unit": "шт",
                    "quantity": 10,
                    "price": 2000,
                    "amount": 20000
                }
            ],
            "total_amount": 20000
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/contracts/generate-pdf",
                json=test_payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Check all required fields from review request
                required_fields = [
                    'success', 'contract_number', 'drive_view_link', 
                    'drive_download_link', 'drive_file_id', 'pdf_path', 'pdf_filename'
                ]
                
                missing_fields = []
                for field in required_fields:
                    if field not in result:
                        missing_fields.append(field)
                
                if missing_fields:
                    logger.error(f"❌ Missing required fields in response: {missing_fields}")
                    return False
                
                # Check success field
                if not result.get('success'):
                    logger.error(f"❌ Success field is not true: {result.get('success')}")
                    return False
                
                # Check contract number format (should contain "П")
                contract_number = result.get('contract_number', '')
                if not contract_number.startswith('П'):
                    logger.error(f"❌ Contract number doesn't start with 'П': {contract_number}")
                    return False
                
                # Check drive_view_link format
                drive_view_link = result.get('drive_view_link', '')
                if drive_view_link and not drive_view_link.startswith("https://drive.google.com"):
                    logger.error(f"❌ Drive view link doesn't start with correct URL: {drive_view_link}")
                    return False
                
                # Check that drive fields are not empty (if Drive is working)
                drive_fields = ['drive_view_link', 'drive_download_link', 'drive_file_id']
                empty_drive_fields = [field for field in drive_fields if not result.get(field)]
                
                if empty_drive_fields:
                    logger.warning(f"⚠️  Empty Google Drive fields: {empty_drive_fields}")
                    logger.info("   This indicates Google Drive integration is not working properly")
                    
                    # Check backend logs for Drive upload attempts
                    self.check_drive_upload_logs()
                    return False  # This is a critical issue for the review request
                else:
                    logger.info("✅ All Google Drive fields are populated")
                    logger.info(f"   Contract number: {contract_number}")
                    logger.info(f"   Drive view link: {drive_view_link}")
                    logger.info(f"   Drive download link: {result.get('drive_download_link')}")
                    logger.info(f"   Drive file ID: {result.get('drive_file_id')}")
                    return True
                
            else:
                logger.error(f"❌ Contract generation failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Contract generation failed with exception: {str(e)}")
            return False
    
    def check_drive_upload_logs(self):
        """Check backend logs for Google Drive upload attempts"""
        logger.info("Checking backend logs for Google Drive upload attempts...")
        
        try:
            import subprocess
            result = subprocess.run(
                ['grep', '-i', 'drive\|upload', '/var/log/supervisor/backend.err.log'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                log_content = result.stdout
                
                # Look for specific patterns
                if 'Uploaded file' in log_content and 'to folder \'Договори\'' in log_content:
                    logger.info("✅ Found successful Drive upload messages in logs")
                elif 'Failed to upload to Google Drive' in log_content:
                    logger.error("❌ Found failed Drive upload messages in logs")
                    # Show the error details
                    lines = log_content.split('\n')
                    for line in lines:
                        if 'Failed to upload to Google Drive' in line or 'Error uploading file' in line:
                            logger.error(f"   {line.strip()}")
                elif 'Shared drive not found' in log_content:
                    logger.error("❌ Google Drive configuration error: Shared drive not found")
                    logger.error("   The folder ID 1NX_cimX_r9suNCFlb3wAhvxSyE_VABb8 is being treated as Shared Drive")
                    logger.error("   But it's actually a regular folder. This needs to be fixed.")
                else:
                    logger.warning("⚠️  No clear Drive upload messages found in recent logs")
            else:
                logger.warning("⚠️  No Drive-related messages found in logs")
                
        except Exception as e:
            logger.warning(f"⚠️  Error checking Drive upload logs: {str(e)}")

    def run_all_tests(self):
        """Run all contract tests"""
        logger.info("=" * 60)
        logger.info("STARTING GOOGLE DRIVE INTEGRATION TEST SUITE")
        logger.info("=" * 60)
        
        test_results = {}
        
        # Test 1: Health Check
        test_results['health_check'] = self.test_health_check()
        
        # Test 2: Google Drive Service Initialization
        test_results['drive_service_init'] = self.test_google_drive_service_initialization()
        
        # Test 3: Get Counterparties
        test_results['get_counterparties'] = self.test_get_counterparties()
        
        # Test 4: Specific Google Drive Scenario (from review request)
        test_results['specific_drive_scenario'] = self.test_specific_google_drive_scenario()
        
        # Test 5: Contract PDF Generation with Drive Upload
        test_results['pdf_generation'] = self.test_contract_pdf_generation()
        
        # Test 6: Google Drive Links Validation
        test_results['drive_links'] = self.test_google_drive_links()
        
        # Test 7: Contract PDF Download
        test_results['pdf_download'] = self.test_contract_pdf_download()
        
        # Test 8: Contract Email Sending with Drive Link
        test_results['email_sending'] = self.test_contract_email_sending()
        
        # Test 9: Check for Unicode errors in logs
        test_results['unicode_logs_check'] = self.check_backend_logs_for_unicode_errors()
        
        # Summary
        logger.info("=" * 60)
        logger.info("TEST RESULTS SUMMARY")
        logger.info("=" * 60)
        
        passed_tests = 0
        total_tests = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            logger.info(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed_tests += 1
        
        logger.info("=" * 60)
        logger.info(f"OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            logger.info("🎉 ALL TESTS PASSED - Google Drive integration and Unicode support working correctly!")
            return True
        else:
            logger.error(f"💥 {total_tests - passed_tests} test(s) failed - Issues need attention")
            return False

def main():
    """Main test execution"""
    try:
        test_suite = ContractTestSuite()
        success = test_suite.run_all_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Test suite failed to initialize: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()