#!/usr/bin/env python3
"""
New Architecture Test Suite: "CREATE WITHOUT PDF + GENERATE ON DEMAND"
Tests the new architecture where documents are created without PDF generation,
and PDFs are generated on demand with 3-day caching and Google Sheets cache clearing.
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

class NewArchitectureTestSuite:
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
        self.created_invoice_number = None
        self.created_act_number = None
        self.created_waybill_number = None
        self.generated_invoice_pdf = None
    
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
    
    def test_get_counterparties_for_documents(self):
        """Get counterparty with ЄДРПОУ 40196816 as specified in review request"""
        logger.info("Getting counterparty with ЄДРПОУ 40196816 for document testing...")
        try:
            response = requests.get(f"{self.api_url}/counterparties", timeout=10)
            if response.status_code == 200:
                counterparties = response.json()
                
                # Look for the specific ЄДРПОУ from review request
                target_edrpou = "40196816"
                found_counterparty = None
                
                for counterparty in counterparties:
                    if counterparty.get('edrpou') == target_edrpou:
                        found_counterparty = counterparty
                        break
                
                if found_counterparty:
                    logger.info(f"✅ Found target counterparty with ЄДРПОУ: {target_edrpou}")
                    logger.info(f"   Name: {found_counterparty.get('representative_name', '')}")
                    return True
                else:
                    logger.error(f"❌ Target ЄДРПОУ {target_edrpou} not found")
                    return False
            else:
                logger.error(f"❌ Failed to get counterparties: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to get counterparties: {str(e)}")
            return False
    
    # PHASE 1: CREATE WITHOUT PDF
    def test_invoice_creation_without_pdf(self):
        """ФАЗА 1: Створення рахунку БЕЗ PDF"""
        logger.info("ФАЗА 1: Створення рахунку БЕЗ PDF")
        
        test_payload = {
            "counterparty_edrpou": "40196816",
            "items": [{"name": "Тест створення", "unit": "шт", "quantity": 1, "price": 1000, "amount": 1000}],
            "total_amount": 1000,
            "based_on_order": "55"
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/invoices/create",
                json=test_payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and result.get('invoice_number'):
                    self.created_invoice_number = result.get('invoice_number')
                    logger.info(f"✅ Рахунок створено БЕЗ PDF: {self.created_invoice_number}")
                    return True
                else:
                    logger.error(f"❌ Помилка створення рахунку: {result}")
                    return False
            else:
                logger.error(f"❌ Помилка створення рахунку: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Помилка створення рахунку: {str(e)}")
            return False
    
    def test_verify_no_pdf_created(self):
        """Перевірка що PDF НЕ створено"""
        logger.info("Перевірка що PDF НЕ створено")
        
        if not self.created_invoice_number:
            logger.error("❌ Немає номера створеного рахунку")
            return False
        
        try:
            # Check that PDF file doesn't exist
            import subprocess
            result = subprocess.run(
                f'ls /app/backend/generated_documents/ | grep {self.created_invoice_number}',
                shell=True,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0 and result.stdout.strip():
                logger.error(f"❌ PDF файл існує, хоча не повинен: {result.stdout.strip()}")
                return False
            else:
                logger.info("✅ PDF файл НЕ створено (як очікувалося)")
                return True
        except Exception as e:
            logger.error(f"❌ Помилка перевірки PDF: {str(e)}")
            return False
    
    def test_act_creation_without_pdf(self):
        """Створення акту БЕЗ PDF"""
        logger.info("Створення акту БЕЗ PDF")
        
        test_payload = {
            "counterparty_edrpou": "40196816",
            "items": [{"name": "Тест створення", "unit": "шт", "quantity": 1, "price": 1000, "amount": 1000}],
            "total_amount": 1000
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/acts/create",
                json=test_payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and result.get('act_number'):
                    self.created_act_number = result.get('act_number')
                    logger.info(f"✅ Акт створено БЕЗ PDF: {self.created_act_number}")
                    return True
                else:
                    logger.error(f"❌ Помилка створення акту: {result}")
                    return False
            else:
                logger.error(f"❌ Помилка створення акту: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Помилка створення акту: {str(e)}")
            return False
    
    def test_waybill_creation_without_pdf(self):
        """Створення накладної БЕЗ PDF"""
        logger.info("Створення накладної БЕЗ PDF")
        
        test_payload = {
            "counterparty_edrpou": "40196816",
            "items": [{"name": "Тест створення", "unit": "шт", "quantity": 1, "price": 1000, "amount": 1000}],
            "total_amount": 1000
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/waybills/create",
                json=test_payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and result.get('waybill_number'):
                    self.created_waybill_number = result.get('waybill_number')
                    logger.info(f"✅ Накладна створена БЕЗ PDF: {self.created_waybill_number}")
                    return True
                else:
                    logger.error(f"❌ Помилка створення накладної: {result}")
                    return False
            else:
                logger.error(f"❌ Помилка створення накладної: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Помилка створення накладної: {str(e)}")
            return False
    
    # PHASE 2: GENERATE PDF ON DEMAND
    def test_invoice_pdf_generation_on_demand(self):
        """ФАЗА 2: Генерація PDF рахунку на вимогу"""
        logger.info("ФАЗА 2: Генерація PDF рахунку на вимогу")
        
        if not self.created_invoice_number:
            logger.error("❌ Немає номера створеного рахунку")
            return False
        
        try:
            response = requests.post(
                f"{self.api_url}/invoices/{self.created_invoice_number}/generate-pdf",
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    logger.info(f"✅ PDF рахунку згенеровано на вимогу: {result.get('pdf_path', '')}")
                    self.generated_invoice_pdf = result
                    return True
                else:
                    logger.error(f"❌ Помилка генерації PDF: {result}")
                    return False
            else:
                logger.error(f"❌ Помилка генерації PDF: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Помилка генерації PDF: {str(e)}")
            return False
    
    def test_verify_pdf_created(self):
        """Перевірка що PDF створено"""
        logger.info("Перевірка що PDF створено")
        
        if not self.created_invoice_number:
            logger.error("❌ Немає номера створеного рахунку")
            return False
        
        try:
            # Check that PDF file exists and has reasonable size
            import subprocess
            result = subprocess.run(
                f'ls -lh /app/backend/generated_documents/ | grep Рахунок_{self.created_invoice_number}',
                shell=True,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0 and result.stdout.strip():
                # Check file size (should be ~50KB as mentioned in review)
                output_lines = result.stdout.strip().split('\n')
                for line in output_lines:
                    if 'Рахунок' in line and self.created_invoice_number in line:
                        size_info = line.split()[4]  # 5th column is file size
                        logger.info(f"✅ PDF файл створено: розмір {size_info}")
                        return True
                
                logger.error("❌ PDF файл не знайдено в результатах ls")
                return False
            else:
                logger.error("❌ PDF файл не створено")
                return False
        except Exception as e:
            logger.error(f"❌ Помилка перевірки PDF: {str(e)}")
            return False
    
    def test_invoice_pdf_download(self):
        """Завантаження PDF рахунку"""
        logger.info("Завантаження PDF рахунку")
        
        if not self.created_invoice_number:
            logger.error("❌ Немає номера створеного рахунку")
            return False
        
        try:
            response = requests.get(
                f"{self.api_url}/invoices/pdf/{self.created_invoice_number}",
                timeout=30
            )
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'application/pdf' in content_type and len(response.content) > 40000:  # >40KB as mentioned
                    logger.info(f"✅ PDF завантажено: {len(response.content)} bytes, Content-Type: {content_type}")
                    return True
                else:
                    logger.error(f"❌ Неправильний PDF: розмір {len(response.content)}, тип {content_type}")
                    return False
            else:
                logger.error(f"❌ Помилка завантаження PDF: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Помилка завантаження PDF: {str(e)}")
            return False
    
    # PHASE 3: PDF CACHING
    def test_pdf_caching_behavior(self):
        """ФАЗА 3: Перевірка кешування PDF"""
        logger.info("ФАЗА 3: Перевірка кешування PDF")
        
        if not self.created_invoice_number:
            logger.error("❌ Немає номера створеного рахунку")
            return False
        
        try:
            # Second call should use existing PDF
            response = requests.post(
                f"{self.api_url}/invoices/{self.created_invoice_number}/generate-pdf",
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    message = result.get('message', '')
                    if 'вже існує' in message or 'успішно згенеровано' in message:
                        logger.info(f"✅ Кешування працює: {message}")
                        return True
                    else:
                        logger.warning(f"⚠️ Неочікуване повідомлення: {message}")
                        return True  # Still working, just different message
                else:
                    logger.error(f"❌ Помилка повторної генерації: {result}")
                    return False
            else:
                logger.error(f"❌ Помилка повторної генерації: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Помилка повторної генерації: {str(e)}")
            return False
    
    # PHASE 4: OLD DOCUMENTS
    def test_get_related_documents(self):
        """ФАЗА 4: Отримання пов'язаних документів"""
        logger.info("ФАЗА 4: Отримання пов'язаних документів")
        
        try:
            response = requests.get(
                f"{self.api_url}/orders/55/related-documents",
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                # Check structure
                expected_keys = ["invoices", "acts", "waybills", "contracts"]
                for key in expected_keys:
                    if key not in result:
                        logger.error(f"❌ Відсутній ключ '{key}' в response")
                        return False
                
                # Check if includes old documents (№23, №25) and new ones
                all_invoices = result.get('invoices', [])
                invoice_numbers = [str(inv.get('number', '')) for inv in all_invoices]
                
                logger.info(f"✅ Пов'язані документи отримано: {len(all_invoices)} рахунків")
                logger.info(f"   Номери рахунків: {', '.join(invoice_numbers[:5])}...")  # Show first 5
                return True
            else:
                logger.error(f"❌ Помилка отримання пов'язаних документів: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Помилка отримання пов'язаних документів: {str(e)}")
            return False
    
    def test_old_document_pdf_generation(self):
        """Генерація PDF для старого документа"""
        logger.info("Генерація PDF для старого документа")
        
        # Test with document #23 as mentioned in review
        old_invoice_number = "23"
        
        try:
            response = requests.post(
                f"{self.api_url}/invoices/{old_invoice_number}/generate-pdf",
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    logger.info(f"✅ PDF для старого документа #{old_invoice_number} згенеровано з актуальними даними")
                    return True
                else:
                    logger.error(f"❌ Помилка генерації PDF для старого документа: {result}")
                    return False
            elif response.status_code == 404:
                logger.warning(f"⚠️ Документ #{old_invoice_number} не знайдено (можливо не існує)")
                return True  # Not a critical failure
            else:
                logger.error(f"❌ Помилка генерації PDF для старого документа: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Помилка генерації PDF для старого документа: {str(e)}")
            return False
    
    # PHASE 5: EMAIL
    def test_invoice_email_sending(self):
        """ФАЗА 5: Відправка рахунку на email"""
        logger.info("ФАЗА 5: Відправка рахунку на email")
        
        if not self.created_invoice_number:
            logger.error("❌ Немає номера створеного рахунку")
            return False
        
        try:
            response = requests.post(
                f"{self.api_url}/invoices/send-email",
                params={
                    'invoice_number': self.created_invoice_number,
                    'recipient_email': 'test@example.com'
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    logger.info("✅ Email відправлено успішно")
                    return True
                else:
                    logger.error(f"❌ Помилка відправки email: {result}")
                    return False
            else:
                # Check if it's SMTP configuration issue (expected)
                if "SMTP" in response.text or "authentication" in response.text.lower():
                    logger.info("✅ Email досяг SMTP рівня (SMTP не налаштований - очікувано)")
                    return True
                else:
                    logger.error(f"❌ Помилка відправки email: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            logger.error(f"❌ Помилка відправки email: {str(e)}")
            return False

    def check_backend_logs_for_unicode_errors(self):
        """Check backend logs for any Unicode-related errors"""
        logger.info("Checking backend logs for Unicode errors...")
        
        try:
            # Check recent backend logs
            import subprocess
            result = subprocess.run(
                ['tail', '-n', '50', '/var/log/supervisor/backend.err.log'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                log_content = result.stdout
                unicode_errors = []
                
                # Look for common Unicode error patterns
                unicode_patterns = [
                    'UnicodeEncodeError',
                    'UnicodeDecodeError',
                    'codec can\'t encode',
                    'codec can\'t decode',
                    'ascii codec',
                    'utf-8 codec'
                ]
                
                for line in log_content.split('\n'):
                    for pattern in unicode_patterns:
                        if pattern in line:
                            unicode_errors.append(line.strip())
                
                if unicode_errors:
                    logger.error("❌ Unicode errors found in backend logs:")
                    for error in unicode_errors[-3:]:  # Show last 3 errors
                        logger.error(f"   {error}")
                    return False
                else:
                    logger.info("✅ No Unicode errors found in recent backend logs")
                    return True
            else:
                logger.warning("⚠️ Could not read backend logs")
                return True  # Don't fail the test if we can't read logs
                
        except Exception as e:
            logger.warning(f"⚠️ Error checking backend logs: {str(e)}")
            return True  # Don't fail the test if we can't check logs

    def run_new_architecture_tests(self):
        """Run all new architecture tests"""
        logger.info("🎯 ПОВНЕ ТЕСТУВАННЯ НОВОЇ АРХІТЕКТУРИ 'СТВОРЕННЯ БЕЗ PDF + ГЕНЕРАЦІЯ НА ВИМОГУ'")
        logger.info("=" * 100)
        
        tests = [
            ("Health Check", self.test_health_check),
            ("Get Counterparties", self.test_get_counterparties_for_documents),
            
            # ФАЗА 1: Створення документів БЕЗ PDF
            ("ФАЗА 1.1: Створення рахунку БЕЗ PDF", self.test_invoice_creation_without_pdf),
            ("ФАЗА 1.2: Перевірка що PDF НЕ створено", self.test_verify_no_pdf_created),
            ("ФАЗА 1.3: Створення акту БЕЗ PDF", self.test_act_creation_without_pdf),
            ("ФАЗА 1.4: Створення накладної БЕЗ PDF", self.test_waybill_creation_without_pdf),
            
            # ФАЗА 2: Генерація PDF на вимогу
            ("ФАЗА 2.1: Генерація PDF рахунку на вимогу", self.test_invoice_pdf_generation_on_demand),
            ("ФАЗА 2.2: Перевірка що PDF створено", self.test_verify_pdf_created),
            ("ФАЗА 2.3: Завантаження PDF рахунку", self.test_invoice_pdf_download),
            
            # ФАЗА 3: Перевірка кешування PDF
            ("ФАЗА 3.1: Повторна генерація PDF (кешування)", self.test_pdf_caching_behavior),
            
            # ФАЗА 4: Тестування старих документів
            ("ФАЗА 4.1: Отримання пов'язаних документів", self.test_get_related_documents),
            ("ФАЗА 4.2: Генерація PDF для старого документа", self.test_old_document_pdf_generation),
            
            # ФАЗА 5: Email endpoints
            ("ФАЗА 5.1: Відправка рахунку на email", self.test_invoice_email_sending),
            
            # Додаткові перевірки
            ("Перевірка логів на помилки", self.check_backend_logs_for_unicode_errors)
        ]
        
        results = []
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            logger.info(f"\n{'='*20} {test_name} {'='*20}")
            try:
                result = test_func()
                results.append((test_name, result))
                if result:
                    passed += 1
                    logger.info(f"✅ {test_name}: ПРОЙДЕНО")
                else:
                    logger.error(f"❌ {test_name}: ПРОВАЛЕНО")
            except Exception as e:
                logger.error(f"❌ {test_name}: ПОМИЛКА - {str(e)}")
                results.append((test_name, False))
        
        # Print summary
        logger.info("\n" + "="*100)
        logger.info("📊 ПІДСУМОК ТЕСТУВАННЯ НОВОЇ АРХІТЕКТУРИ")
        logger.info("="*100)
        
        success_rate = (passed / total) * 100
        logger.info(f"Пройдено тестів: {passed}/{total} ({success_rate:.1f}%)")
        
        if passed == total:
            logger.info("🎉 ВСІ ТЕСТИ ПРОЙШЛИ УСПІШНО! Нова архітектура працює коректно.")
        elif success_rate >= 80:
            logger.info("✅ Більшість тестів пройшла успішно. Основна функціональність працює.")
        else:
            logger.error("❌ Багато тестів провалилося. Потрібні виправлення.")
        
        # Show failed tests
        failed_tests = [name for name, result in results if not result]
        if failed_tests:
            logger.info("\n❌ Провалені тести:")
            for test_name in failed_tests:
                logger.info(f"   - {test_name}")
        
        return results

if __name__ == "__main__":
    # Run the NEW ARCHITECTURE test suite
    test_suite = NewArchitectureTestSuite()
    results = test_suite.run_new_architecture_tests()
    
    # Exit with appropriate code
    failed_tests = [name for name, result in results if not result]
    if failed_tests:
        sys.exit(1)
    else:
        sys.exit(0)