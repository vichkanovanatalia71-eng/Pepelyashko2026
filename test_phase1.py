#!/usr/bin/env python3
"""
ФАЗА 1 Рефакторинг Замовлень - Тестування
Тестує відокремлення створення замовлень від генерації PDF
"""

import requests
import json
import time
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Phase1OrderTests:
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
        
        self.created_order_number = None
    
    def test_order_creation_without_pdf(self):
        """Test ФАЗА 1: Створення нового замовлення БЕЗ PDF"""
        logger.info("=" * 80)
        logger.info("ТЕСТУВАННЯ ФАЗА 1: СТВОРЕННЯ ЗАМОВЛЕННЯ БЕЗ PDF")
        logger.info("=" * 80)
        
        # Test payload exactly as specified in review request
        test_payload = {
            "counterparty_edrpou": "40196816",
            "items": [
                {
                    "name": "Тестовий товар",
                    "unit": "шт",
                    "quantity": 2,
                    "price": 1000,
                    "amount": 2000
                }
            ],
            "total_amount": 2000
        }
        
        try:
            logger.info("ТЕСТ 1: POST /api/orders/create (створення замовлення БЕЗ PDF)")
            logger.info("-" * 50)
            
            # Step 1: Create order without PDF
            logger.info("1. Створення замовлення через POST /api/orders/create...")
            response = requests.post(
                f"{self.api_url}/orders/create",
                json=test_payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response text: {response.text}")
            
            if response.status_code != 200:
                logger.error(f"❌ Помилка створення замовлення: {response.status_code} - {response.text}")
                return False
            
            result = response.json()
            logger.info("✅ Замовлення створено успішно")
            
            # Step 2: Check expected response format
            logger.info("2. Перевірка очікуваної відповіді...")
            expected_fields = ['success', 'message', 'order_number', 'pdf_generated']
            
            missing_fields = []
            for field in expected_fields:
                if field not in result:
                    missing_fields.append(field)
            
            if missing_fields:
                logger.error(f"❌ Відсутні обов'язкові поля в response: {missing_fields}")
                logger.info(f"Отримані поля: {list(result.keys())}")
                return False
            
            # Check specific values
            if not result.get('success'):
                logger.error(f"❌ success не true: {result.get('success')}")
                return False
            
            expected_message = "Замовлення успішно створено"
            if result.get('message') != expected_message:
                logger.error(f"❌ Неправильне повідомлення. Очікувалося: '{expected_message}', отримано: '{result.get('message')}'")
                return False
            
            if result.get('pdf_generated') != False:
                logger.error(f"❌ pdf_generated повинно бути false, отримано: {result.get('pdf_generated')}")
                return False
            
            order_number = result.get('order_number')
            if not order_number:
                logger.error("❌ order_number порожній")
                return False
            
            logger.info(f"✅ Очікувана відповідь отримана:")
            logger.info(f"   success: {result.get('success')}")
            logger.info(f"   message: {result.get('message')}")
            logger.info(f"   order_number: {order_number}")
            logger.info(f"   pdf_generated: {result.get('pdf_generated')}")
            
            # Store order number for next test
            self.created_order_number = order_number
            
            # Step 3: Check order appears in Google Sheets WITHOUT drive_file_id
            logger.info("3. Перевірка що замовлення з'явилося в Google Sheets БЕЗ drive_file_id...")
            
            # Wait a moment for the order to be saved
            time.sleep(3)
            
            orders_response = requests.get(f"{self.api_url}/orders", timeout=30)
            if orders_response.status_code != 200:
                logger.error(f"❌ Помилка отримання списку замовлень: {orders_response.status_code}")
                return False
            
            orders_list = orders_response.json()
            logger.info(f"Отримано {len(orders_list)} замовлень")
            
            # Find our created order (handle both "0046" and "46" formats)
            found_order = None
            for order in orders_list:
                order_num_str = str(order.get('number', ''))
                # Try exact match first, then try without leading zeros
                if (order_num_str == str(order_number) or 
                    order_num_str == str(int(order_number)) or
                    str(int(order_num_str)) == str(int(order_number))):
                    found_order = order
                    break
            
            if not found_order:
                logger.error(f"❌ Створене замовлення {order_number} не знайдено в списку")
                logger.info("Останні 5 замовлень:")
                for i, order in enumerate(orders_list[-5:]):
                    logger.info(f"  {i+1}. Номер: {order.get('number', 'N/A')}, drive_file_id: {order.get('drive_file_id', 'N/A')}")
                return False
            
            # Check that drive_file_id is empty or not present
            drive_file_id = found_order.get('drive_file_id', '')
            if drive_file_id and drive_file_id.strip():
                logger.error(f"❌ Замовлення має drive_file_id, хоча PDF не генерувався: '{drive_file_id}'")
                return False
            
            logger.info(f"✅ Замовлення {order_number} знайдено в Google Sheets БЕЗ drive_file_id")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Тест створення замовлення провалився: {str(e)}")
            return False
    
    def test_order_pdf_generation_on_demand(self):
        """Test ФАЗА 1: Генерація PDF для існуючого замовлення"""
        logger.info("=" * 80)
        logger.info("ТЕСТУВАННЯ ФАЗА 1: ГЕНЕРАЦІЯ PDF ДЛЯ ІСНУЮЧОГО ЗАМОВЛЕННЯ")
        logger.info("=" * 80)
        
        if not self.created_order_number:
            logger.error("❌ Немає номера створеного замовлення для тестування генерації PDF")
            return False
        
        order_number = self.created_order_number
        
        try:
            logger.info(f"ТЕСТ 2: POST /api/orders/{order_number}/generate-pdf")
            logger.info("-" * 50)
            
            # Step 1: Generate PDF for existing order
            logger.info(f"1. Генерація PDF для замовлення {order_number}...")
            response = requests.post(
                f"{self.api_url}/orders/{order_number}/generate-pdf",
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response text: {response.text}")
            
            if response.status_code != 200:
                logger.error(f"❌ Помилка генерації PDF: {response.status_code} - {response.text}")
                return False
            
            result = response.json()
            logger.info("✅ PDF згенеровано успішно")
            
            # Step 2: Check expected response format
            logger.info("2. Перевірка очікуваної відповіді...")
            expected_fields = ['success', 'message', 'order_number', 'drive_view_link', 'drive_file_id']
            
            missing_fields = []
            for field in expected_fields:
                if field not in result:
                    missing_fields.append(field)
            
            if missing_fields:
                logger.error(f"❌ Відсутні обов'язкові поля в response: {missing_fields}")
                logger.info(f"Отримані поля: {list(result.keys())}")
                return False
            
            # Check specific values
            if not result.get('success'):
                logger.error(f"❌ success не true: {result.get('success')}")
                return False
            
            expected_message = "PDF успішно згенеровано"
            if result.get('message') != expected_message:
                logger.error(f"❌ Неправильне повідомлення. Очікувалося: '{expected_message}', отримано: '{result.get('message')}'")
                return False
            
            if result.get('order_number') != order_number:
                logger.error(f"❌ Неправильний order_number. Очікувався: '{order_number}', отримано: '{result.get('order_number')}'")
                return False
            
            drive_view_link = result.get('drive_view_link', '')
            drive_file_id = result.get('drive_file_id', '')
            
            if not drive_view_link:
                logger.error("❌ drive_view_link порожній")
                return False
            
            if not drive_file_id:
                logger.error("❌ drive_file_id порожній")
                return False
            
            if not drive_view_link.startswith("https://drive.google.com"):
                logger.error(f"❌ drive_view_link має неправильний формат: {drive_view_link}")
                return False
            
            logger.info(f"✅ Очікувана відповідь отримана:")
            logger.info(f"   success: {result.get('success')}")
            logger.info(f"   message: {result.get('message')}")
            logger.info(f"   order_number: {result.get('order_number')}")
            logger.info(f"   drive_view_link: {drive_view_link}")
            logger.info(f"   drive_file_id: {drive_file_id}")
            
            # Step 3: Check that drive_file_id is updated in Google Sheets
            logger.info("3. Перевірка що drive_file_id оновився в Google Sheets...")
            
            # Wait a moment for the update
            time.sleep(3)
            
            orders_response = requests.get(f"{self.api_url}/orders", timeout=30)
            if orders_response.status_code != 200:
                logger.error(f"❌ Помилка отримання списку замовлень: {orders_response.status_code}")
                return False
            
            orders_list = orders_response.json()
            
            # Find our order
            found_order = None
            for order in orders_list:
                if str(order.get('number', '')) == str(order_number):
                    found_order = order
                    break
            
            if not found_order:
                logger.error(f"❌ Замовлення {order_number} не знайдено в списку")
                return False
            
            # Check that drive_file_id is now populated
            sheets_drive_file_id = found_order.get('drive_file_id', '')
            if not sheets_drive_file_id or not sheets_drive_file_id.strip():
                logger.error(f"❌ drive_file_id не оновився в Google Sheets: '{sheets_drive_file_id}'")
                return False
            
            if sheets_drive_file_id != drive_file_id:
                logger.error(f"❌ drive_file_id не співпадає. API: '{drive_file_id}', Sheets: '{sheets_drive_file_id}'")
                return False
            
            logger.info(f"✅ drive_file_id оновився в Google Sheets: {sheets_drive_file_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Тест генерації PDF провалився: {str(e)}")
            return False
    
    def test_order_list_verification(self):
        """Test ФАЗА 1: Перевірка списку замовлень"""
        logger.info("=" * 80)
        logger.info("ТЕСТУВАННЯ ФАЗА 1: ПЕРЕВІРКА СПИСКУ ЗАМОВЛЕНЬ")
        logger.info("=" * 80)
        
        if not self.created_order_number:
            logger.error("❌ Немає номера створеного замовлення для перевірки списку")
            return False
        
        order_number = self.created_order_number
        
        try:
            logger.info("ТЕСТ 3: GET /api/orders (перевірка списку замовлень)")
            logger.info("-" * 50)
            
            # Get orders list
            logger.info("1. Отримання списку замовлень...")
            response = requests.get(f"{self.api_url}/orders", timeout=30)
            
            if response.status_code != 200:
                logger.error(f"❌ Помилка отримання списку замовлень: {response.status_code} - {response.text}")
                return False
            
            orders_list = response.json()
            logger.info(f"✅ Список замовлень отримано ({len(orders_list)} замовлень)")
            
            # Find our created order
            logger.info(f"2. Пошук створеного замовлення {order_number} в списку...")
            found_order = None
            for order in orders_list:
                if str(order.get('number', '')) == str(order_number):
                    found_order = order
                    break
            
            if not found_order:
                logger.error(f"❌ Створене замовлення {order_number} не знайдено в списку")
                logger.error(f"   Всього замовлень в списку: {len(orders_list)}")
                if orders_list:
                    logger.error("   Останні 3 замовлення:")
                    for i, order in enumerate(orders_list[-3:]):
                        logger.error(f"     {i+1}. Номер: {order.get('number', 'N/A')}")
                return False
            
            logger.info(f"✅ Замовлення {order_number} знайдено в списку")
            
            # Check that it has drive_file_id (after PDF generation)
            logger.info("3. Перевірка що замовлення має оновлений drive_file_id...")
            drive_file_id = found_order.get('drive_file_id', '')
            
            if not drive_file_id or not drive_file_id.strip():
                logger.error(f"❌ Замовлення в списку не має drive_file_id: '{drive_file_id}'")
                return False
            
            logger.info(f"✅ Замовлення має оновлений drive_file_id: {drive_file_id}")
            
            # Check other order fields
            logger.info("4. Перевірка інших полів замовлення...")
            
            counterparty_edrpou = found_order.get('counterparty_edrpou', '')
            if counterparty_edrpou != "40196816":
                logger.error(f"❌ Неправильний counterparty_edrpou: '{counterparty_edrpou}'")
                return False
            
            total_amount = found_order.get('total_amount', 0)
            if total_amount != 2000:
                logger.error(f"❌ Неправильна total_amount: {total_amount}")
                return False
            
            items = found_order.get('items', [])
            if not items or len(items) != 1:
                logger.error(f"❌ Неправильна кількість items: {len(items)}")
                return False
            
            item = items[0]
            if item.get('name') != "Тестовий товар":
                logger.error(f"❌ Неправильна назва товару: '{item.get('name')}'")
                return False
            
            logger.info("✅ Всі поля замовлення правильні:")
            logger.info(f"   Номер: {found_order.get('number')}")
            logger.info(f"   ЄДРПОУ: {counterparty_edrpou}")
            logger.info(f"   Сума: {total_amount}")
            logger.info(f"   Товарів: {len(items)}")
            logger.info(f"   Drive File ID: {drive_file_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Тест перевірки списку замовлень провалився: {str(e)}")
            return False
    
    def run_phase1_tests(self):
        """Run all ФАЗА 1 tests"""
        logger.info("🚀 ПОЧАТОК ТЕСТУВАННЯ ФАЗА 1 РЕФАКТОРИНГ ЗАМОВЛЕНЬ")
        logger.info("=" * 80)
        
        tests = [
            ("ФАЗА 1: Створення замовлення БЕЗ PDF", self.test_order_creation_without_pdf),
            ("ФАЗА 1: Генерація PDF для існуючого замовлення", self.test_order_pdf_generation_on_demand),
            ("ФАЗА 1: Перевірка списку замовлень", self.test_order_list_verification),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            logger.info(f"\n🔍 ЗАПУСК ТЕСТУ: {test_name}")
            try:
                if test_func():
                    logger.info(f"✅ {test_name}: ПРОЙШОВ")
                    passed += 1
                else:
                    logger.error(f"❌ {test_name}: ПРОВАЛИВСЯ")
                    failed += 1
            except Exception as e:
                logger.error(f"❌ {test_name}: ПОМИЛКА - {str(e)}")
                failed += 1
        
        logger.info("\n" + "=" * 80)
        logger.info("📊 ПІДСУМОК ТЕСТУВАННЯ ФАЗА 1")
        logger.info("=" * 80)
        logger.info(f"Всього тестів: {len(tests)}")
        logger.info(f"Пройшли: {passed}")
        logger.info(f"Провалилися: {failed}")
        logger.info(f"Відсоток успіху: {(passed/len(tests)*100):.1f}%")
        
        if failed == 0:
            logger.info("🎉 ВСІ ТЕСТИ ФАЗА 1 ПРОЙШЛИ УСПІШНО!")
            return True
        else:
            logger.error(f"💥 {failed} ТЕСТІВ ПРОВАЛИЛОСЯ!")
            return False

if __name__ == "__main__":
    tester = Phase1OrderTests()
    success = tester.run_phase1_tests()
    exit(0 if success else 1)