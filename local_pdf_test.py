#!/usr/bin/env python3
"""
Local PDF Generation Test Suite
Tests the new PDF generation endpoints that work locally without Google Drive dependency.
Based on the review request for testing endpoints with upload_to_drive=False.
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

class LocalPDFTestSuite:
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
        
        # Test results storage
        self.test_results = {}
        
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
    
    def get_existing_invoices(self):
        """Get existing invoices from the system"""
        logger.info("Getting existing invoices...")
        try:
            response = requests.get(f"{self.api_url}/invoices", timeout=30)
            if response.status_code == 200:
                invoices = response.json()
                logger.info(f"✅ Found {len(invoices)} existing invoices")
                return invoices
            else:
                logger.error(f"❌ Failed to get invoices: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            logger.error(f"❌ Failed to get invoices: {str(e)}")
            return []
    
    def get_existing_acts(self):
        """Get existing acts from the system"""
        logger.info("Getting existing acts...")
        try:
            response = requests.get(f"{self.api_url}/acts", timeout=30)
            if response.status_code == 200:
                acts = response.json()
                logger.info(f"✅ Found {len(acts)} existing acts")
                return acts
            else:
                logger.error(f"❌ Failed to get acts: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            logger.error(f"❌ Failed to get acts: {str(e)}")
            return []
    
    def get_existing_waybills(self):
        """Get existing waybills from the system"""
        logger.info("Getting existing waybills...")
        try:
            response = requests.get(f"{self.api_url}/waybills", timeout=30)
            if response.status_code == 200:
                waybills = response.json()
                logger.info(f"✅ Found {len(waybills)} existing waybills")
                return waybills
            else:
                logger.error(f"❌ Failed to get waybills: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            logger.error(f"❌ Failed to get waybills: {str(e)}")
            return []
    
    def test_invoice_pdf_generation_from_existing(self):
        """Test 1: Генерація PDF рахунку з існуючих даних"""
        logger.info("=" * 80)
        logger.info("ТЕСТ 1: ГЕНЕРАЦІЯ PDF РАХУНКУ З ІСНУЮЧИХ ДАНИХ")
        logger.info("=" * 80)
        
        # Step 1: Get existing invoices
        invoices = self.get_existing_invoices()
        if not invoices:
            logger.error("❌ No existing invoices found to test PDF generation")
            return False
        
        # Use the first invoice
        test_invoice = invoices[0]
        invoice_number = test_invoice.get('number', '')
        
        if not invoice_number:
            logger.error("❌ Invoice number is empty")
            return False
        
        logger.info(f"✅ Using invoice number: {invoice_number}")
        
        # Step 2: Generate PDF for existing invoice
        logger.info(f"Calling: POST /api/invoices/{invoice_number}/generate-pdf")
        try:
            response = requests.post(
                f"{self.api_url}/invoices/{invoice_number}/generate-pdf",
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"❌ PDF generation failed: {response.status_code} - {response.text}")
                return False
            
            result = response.json()
            
            # Check expected response format
            expected_fields = ['success', 'message', 'invoice_number', 'pdf_path']
            missing_fields = [field for field in expected_fields if field not in result]
            
            if missing_fields:
                logger.error(f"❌ Missing required fields: {missing_fields}")
                return False
            
            if not result.get('success'):
                logger.error(f"❌ Success field is false: {result}")
                return False
            
            expected_message = "PDF успішно згенеровано"
            if result.get('message') != expected_message:
                logger.error(f"❌ Wrong message. Expected: '{expected_message}', got: '{result.get('message')}'")
                return False
            
            pdf_path = result.get('pdf_path', '')
            if not pdf_path:
                logger.error("❌ PDF path is empty")
                return False
            
            logger.info(f"✅ Expected response received:")
            logger.info(f"   success: {result.get('success')}")
            logger.info(f"   message: {result.get('message')}")
            logger.info(f"   invoice_number: {result.get('invoice_number')}")
            logger.info(f"   pdf_path: {pdf_path}")
            
            # Step 3: Check that PDF file exists in /app/backend/generated_invoices/
            logger.info("Checking that PDF file was created in /app/backend/generated_invoices/...")
            
            if os.path.exists(pdf_path):
                file_size = os.path.getsize(pdf_path)
                logger.info(f"✅ PDF file exists: {pdf_path} ({file_size} bytes)")
                
                # Check if it's in the correct directory
                if '/app/backend/generated_invoices/' in pdf_path:
                    logger.info("✅ PDF file is in correct directory: /app/backend/generated_invoices/")
                else:
                    logger.warning(f"⚠️  PDF file not in expected directory: {pdf_path}")
                
                self.test_results['invoice_pdf_path'] = pdf_path
                self.test_results['invoice_number'] = invoice_number
                return True
            else:
                logger.error(f"❌ PDF file does not exist: {pdf_path}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Invoice PDF generation test failed: {str(e)}")
            return False
    
    def test_act_pdf_generation_from_existing(self):
        """Test 2: Генерація PDF акту з існуючих даних"""
        logger.info("=" * 80)
        logger.info("ТЕСТ 2: ГЕНЕРАЦІЯ PDF АКТУ З ІСНУЮЧИХ ДАНИХ")
        logger.info("=" * 80)
        
        # Step 1: Get existing acts
        acts = self.get_existing_acts()
        if not acts:
            logger.error("❌ No existing acts found to test PDF generation")
            return False
        
        # Use the first act
        test_act = acts[0]
        act_number = test_act.get('number', '')
        
        if not act_number:
            logger.error("❌ Act number is empty")
            return False
        
        logger.info(f"✅ Using act number: {act_number}")
        
        # Step 2: Generate PDF for existing act
        logger.info(f"Calling: POST /api/acts/{act_number}/generate-pdf")
        try:
            response = requests.post(
                f"{self.api_url}/acts/{act_number}/generate-pdf",
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"❌ PDF generation failed: {response.status_code} - {response.text}")
                return False
            
            result = response.json()
            
            # Check expected response format
            expected_fields = ['success', 'message', 'act_number', 'pdf_path']
            missing_fields = [field for field in expected_fields if field not in result]
            
            if missing_fields:
                logger.error(f"❌ Missing required fields: {missing_fields}")
                return False
            
            if not result.get('success'):
                logger.error(f"❌ Success field is false: {result}")
                return False
            
            expected_message = "PDF успішно згенеровано"
            if result.get('message') != expected_message:
                logger.error(f"❌ Wrong message. Expected: '{expected_message}', got: '{result.get('message')}'")
                return False
            
            pdf_path = result.get('pdf_path', '')
            if not pdf_path:
                logger.error("❌ PDF path is empty")
                return False
            
            logger.info(f"✅ Expected response received:")
            logger.info(f"   success: {result.get('success')}")
            logger.info(f"   message: {result.get('message')}")
            logger.info(f"   act_number: {result.get('act_number')}")
            logger.info(f"   pdf_path: {pdf_path}")
            
            # Step 3: Check that PDF file exists in /app/backend/generated_acts/
            logger.info("Checking that PDF file was created in /app/backend/generated_acts/...")
            
            if os.path.exists(pdf_path):
                file_size = os.path.getsize(pdf_path)
                logger.info(f"✅ PDF file exists: {pdf_path} ({file_size} bytes)")
                
                # Check if it's in the correct directory
                if '/app/backend/generated_acts/' in pdf_path:
                    logger.info("✅ PDF file is in correct directory: /app/backend/generated_acts/")
                else:
                    logger.warning(f"⚠️  PDF file not in expected directory: {pdf_path}")
                
                self.test_results['act_pdf_path'] = pdf_path
                self.test_results['act_number'] = act_number
                return True
            else:
                logger.error(f"❌ PDF file does not exist: {pdf_path}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Act PDF generation test failed: {str(e)}")
            return False
    
    def test_waybill_pdf_generation_from_existing(self):
        """Test 3: Генерація PDF накладної з існуючих даних (якщо є накладні)"""
        logger.info("=" * 80)
        logger.info("ТЕСТ 3: ГЕНЕРАЦІЯ PDF НАКЛАДНОЇ З ІСНУЮЧИХ ДАНИХ")
        logger.info("=" * 80)
        
        # Step 1: Get existing waybills
        waybills = self.get_existing_waybills()
        if not waybills:
            logger.warning("⚠️  No existing waybills found, creating one for testing...")
            
            # Create a waybill first
            test_payload = {
                "counterparty_edrpou": "40196816",
                "items": [
                    {
                        "name": "Тестовий товар для накладної",
                        "unit": "шт",
                        "quantity": 1,
                        "price": 1000,
                        "amount": 1000
                    }
                ],
                "total_amount": 1000
            }
            
            create_response = requests.post(
                f"{self.api_url}/waybills/generate-pdf",
                json=test_payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if create_response.status_code != 200:
                logger.error(f"❌ Failed to create waybill: {create_response.status_code} - {create_response.text}")
                return False
            
            create_result = create_response.json()
            waybill_number = create_result.get('waybill_number', '')
            
            if not waybill_number:
                logger.error("❌ Created waybill number is empty")
                return False
            
            logger.info(f"✅ Created waybill for testing: {waybill_number}")
        else:
            # Use the first waybill
            test_waybill = waybills[0]
            waybill_number = test_waybill.get('number', '')
            
            if not waybill_number:
                logger.error("❌ Waybill number is empty")
                return False
            
            logger.info(f"✅ Using waybill number: {waybill_number}")
        
        # Step 2: Generate PDF for existing waybill
        logger.info(f"Calling: POST /api/waybills/{waybill_number}/generate-pdf")
        try:
            response = requests.post(
                f"{self.api_url}/waybills/{waybill_number}/generate-pdf",
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"❌ PDF generation failed: {response.status_code} - {response.text}")
                return False
            
            result = response.json()
            
            # Check expected response format
            expected_fields = ['success', 'message', 'waybill_number', 'pdf_path']
            missing_fields = [field for field in expected_fields if field not in result]
            
            if missing_fields:
                logger.error(f"❌ Missing required fields: {missing_fields}")
                return False
            
            if not result.get('success'):
                logger.error(f"❌ Success field is false: {result}")
                return False
            
            expected_message = "PDF успішно згенеровано"
            if result.get('message') != expected_message:
                logger.error(f"❌ Wrong message. Expected: '{expected_message}', got: '{result.get('message')}'")
                return False
            
            pdf_path = result.get('pdf_path', '')
            if not pdf_path:
                logger.error("❌ PDF path is empty")
                return False
            
            logger.info(f"✅ Expected response received:")
            logger.info(f"   success: {result.get('success')}")
            logger.info(f"   message: {result.get('message')}")
            logger.info(f"   waybill_number: {result.get('waybill_number')}")
            logger.info(f"   pdf_path: {pdf_path}")
            
            # Step 3: Check that PDF file exists in /app/backend/generated_waybills/
            logger.info("Checking that PDF file was created in /app/backend/generated_waybills/...")
            
            if os.path.exists(pdf_path):
                file_size = os.path.getsize(pdf_path)
                logger.info(f"✅ PDF file exists: {pdf_path} ({file_size} bytes)")
                
                # Check if it's in the correct directory
                if '/app/backend/generated_waybills/' in pdf_path:
                    logger.info("✅ PDF file is in correct directory: /app/backend/generated_waybills/")
                else:
                    logger.warning(f"⚠️  PDF file not in expected directory: {pdf_path}")
                
                self.test_results['waybill_pdf_path'] = pdf_path
                self.test_results['waybill_number'] = waybill_number
                return True
            else:
                logger.error(f"❌ PDF file does not exist: {pdf_path}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Waybill PDF generation test failed: {str(e)}")
            return False
    
    def test_invoice_pdf_get_endpoint(self):
        """Test 4: Отримання PDF файлу рахунку"""
        logger.info("=" * 80)
        logger.info("ТЕСТ 4: ОТРИМАННЯ PDF ФАЙЛУ РАХУНКУ")
        logger.info("=" * 80)
        
        if 'invoice_number' not in self.test_results:
            logger.error("❌ No invoice number available from previous test")
            return False
        
        invoice_number = self.test_results['invoice_number']
        
        logger.info(f"Calling: GET /api/invoices/pdf/{invoice_number}")
        try:
            response = requests.get(f"{self.api_url}/invoices/pdf/{invoice_number}", timeout=30)
            
            if response.status_code != 200:
                logger.error(f"❌ PDF GET endpoint failed: {response.status_code} - {response.text}")
                return False
            
            # Check content type
            content_type = response.headers.get('content-type', '')
            if 'application/pdf' not in content_type:
                logger.error(f"❌ Wrong content type: {content_type}")
                return False
            
            # Check content size
            if len(response.content) < 1000:
                logger.error(f"❌ PDF content too small: {len(response.content)} bytes")
                return False
            
            logger.info(f"✅ Expected response received:")
            logger.info(f"   Status code: 200")
            logger.info(f"   Content-Type: {content_type}")
            logger.info(f"   Content size: {len(response.content)} bytes")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Invoice PDF GET test failed: {str(e)}")
            return False
    
    def test_act_pdf_get_endpoint(self):
        """Test 5: Отримання PDF файлу акту"""
        logger.info("=" * 80)
        logger.info("ТЕСТ 5: ОТРИМАННЯ PDF ФАЙЛУ АКТУ")
        logger.info("=" * 80)
        
        if 'act_number' not in self.test_results:
            logger.error("❌ No act number available from previous test")
            return False
        
        act_number = self.test_results['act_number']
        
        logger.info(f"Calling: GET /api/acts/pdf/{act_number}")
        try:
            response = requests.get(f"{self.api_url}/acts/pdf/{act_number}", timeout=30)
            
            if response.status_code != 200:
                logger.error(f"❌ PDF GET endpoint failed: {response.status_code} - {response.text}")
                return False
            
            # Check content type
            content_type = response.headers.get('content-type', '')
            if 'application/pdf' not in content_type:
                logger.error(f"❌ Wrong content type: {content_type}")
                return False
            
            # Check content size
            if len(response.content) < 1000:
                logger.error(f"❌ PDF content too small: {len(response.content)} bytes")
                return False
            
            logger.info(f"✅ Expected response received:")
            logger.info(f"   Status code: 200")
            logger.info(f"   Content-Type: {content_type}")
            logger.info(f"   Content size: {len(response.content)} bytes")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Act PDF GET test failed: {str(e)}")
            return False
    
    def test_waybill_pdf_get_endpoint(self):
        """Test 6: Отримання PDF файлу накладної"""
        logger.info("=" * 80)
        logger.info("ТЕСТ 6: ОТРИМАННЯ PDF ФАЙЛУ НАКЛАДНОЇ")
        logger.info("=" * 80)
        
        if 'waybill_number' not in self.test_results:
            logger.error("❌ No waybill number available from previous test")
            return False
        
        waybill_number = self.test_results['waybill_number']
        
        logger.info(f"Calling: GET /api/waybills/pdf/{waybill_number}")
        try:
            response = requests.get(f"{self.api_url}/waybills/pdf/{waybill_number}", timeout=30)
            
            if response.status_code != 200:
                logger.error(f"❌ PDF GET endpoint failed: {response.status_code} - {response.text}")
                return False
            
            # Check content type
            content_type = response.headers.get('content-type', '')
            if 'application/pdf' not in content_type:
                logger.error(f"❌ Wrong content type: {content_type}")
                return False
            
            # Check content size
            if len(response.content) < 1000:
                logger.error(f"❌ PDF content too small: {len(response.content)} bytes")
                return False
            
            logger.info(f"✅ Expected response received:")
            logger.info(f"   Status code: 200")
            logger.info(f"   Content-Type: {content_type}")
            logger.info(f"   Content size: {len(response.content)} bytes")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Waybill PDF GET test failed: {str(e)}")
            return False
    
    def test_local_pdf_generation_verification(self):
        """Test 7: Verification that PDFs are generated locally without Google Drive"""
        logger.info("=" * 80)
        logger.info("ТЕСТ 7: ПЕРЕВІРКА ЛОКАЛЬНОЇ ГЕНЕРАЦІЇ БЕЗ GOOGLE DRIVE")
        logger.info("=" * 80)
        
        logger.info("Checking that all PDF files were generated locally...")
        
        # Check all generated PDF files exist locally
        pdf_paths = [
            self.test_results.get('invoice_pdf_path'),
            self.test_results.get('act_pdf_path'),
            self.test_results.get('waybill_pdf_path')
        ]
        
        all_exist = True
        for pdf_path in pdf_paths:
            if pdf_path and os.path.exists(pdf_path):
                file_size = os.path.getsize(pdf_path)
                logger.info(f"✅ Local PDF exists: {pdf_path} ({file_size} bytes)")
            elif pdf_path:
                logger.error(f"❌ Local PDF missing: {pdf_path}")
                all_exist = False
            else:
                logger.warning("⚠️  PDF path not available from previous tests")
        
        if all_exist:
            logger.info("✅ All PDF files generated locally without Google Drive dependency")
            return True
        else:
            logger.error("❌ Some PDF files are missing locally")
            return False
    
    def run_all_tests(self):
        """Run all tests according to the review request"""
        logger.info("=" * 80)
        logger.info("ТЕСТУВАННЯ НОВИХ ENDPOINTS ДЛЯ ГЕНЕРАЦІЇ PDF")
        logger.info("КОНТЕКСТ: PDF генерація тепер працює локально без залежності від Google Drive")
        logger.info("=" * 80)
        
        tests = [
            ("Health Check", self.test_health_check),
            ("1. Генерація PDF рахунку з існуючих даних", self.test_invoice_pdf_generation_from_existing),
            ("2. Генерація PDF акту з існуючих даних", self.test_act_pdf_generation_from_existing),
            ("3. Генерація PDF накладної з існуючих даних", self.test_waybill_pdf_generation_from_existing),
            ("4. Отримання PDF файлу рахунку", self.test_invoice_pdf_get_endpoint),
            ("5. Отримання PDF файлу акту", self.test_act_pdf_get_endpoint),
            ("6. Отримання PDF файлу накладної", self.test_waybill_pdf_get_endpoint),
            ("7. Перевірка локальної генерації без Google Drive", self.test_local_pdf_generation_verification)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            logger.info(f"\n{'='*60}")
            logger.info(f"Running: {test_name}")
            logger.info(f"{'='*60}")
            
            try:
                if test_func():
                    logger.info(f"✅ PASSED: {test_name}")
                    passed += 1
                else:
                    logger.error(f"❌ FAILED: {test_name}")
                    failed += 1
            except Exception as e:
                logger.error(f"❌ FAILED: {test_name} - Exception: {str(e)}")
                failed += 1
        
        # Final summary
        total = passed + failed
        success_rate = (passed / total * 100) if total > 0 else 0
        
        logger.info("\n" + "=" * 80)
        logger.info("РЕЗУЛЬТАТИ ТЕСТУВАННЯ")
        logger.info("=" * 80)
        logger.info(f"Всього тестів: {total}")
        logger.info(f"Пройшли: {passed}")
        logger.info(f"Провалилися: {failed}")
        logger.info(f"Відсоток успіху: {success_rate:.1f}%")
        
        if failed == 0:
            logger.info("🎉 ВСІ ТЕСТИ ПРОЙШЛИ УСПІШНО!")
            logger.info("✅ PDF генерація працює локально без залежності від Google Drive")
        else:
            logger.error(f"❌ {failed} тест(ів) провалилося")
        
        return failed == 0

def main():
    """Main function to run the test suite"""
    try:
        test_suite = LocalPDFTestSuite()
        success = test_suite.run_all_tests()
        
        if success:
            logger.info("\n🎉 ALL TESTS PASSED - PDF generation endpoints working correctly!")
            sys.exit(0)
        else:
            logger.error("\n❌ SOME TESTS FAILED - Check the logs above for details")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"❌ Test suite failed to initialize: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()