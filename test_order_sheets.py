#!/usr/bin/env python3
"""
Test to verify order is saved to Google Sheets with drive_file_id
"""

import requests
import json
import logging
import time
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_order_sheets_integration():
    """Test that order is saved to Google Sheets with drive_file_id"""
    
    # Get backend URL from frontend .env file
    frontend_env_path = Path("/app/frontend/.env")
    backend_url = None
    
    if frontend_env_path.exists():
        with open(frontend_env_path, 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    backend_url = line.split('=', 1)[1].strip()
                    break
    
    if not backend_url:
        logger.error("Could not find REACT_APP_BACKEND_URL in frontend/.env")
        return False
    
    api_url = f"{backend_url}/api"
    logger.info(f"Testing backend at: {api_url}")
    
    logger.info("=" * 60)
    logger.info("ТЕСТ ЗБЕРЕЖЕННЯ ЗАМОВЛЕННЯ В GOOGLE SHEETS")
    logger.info("=" * 60)
    
    # Step 1: Create a new order
    logger.info("1. Створення нового замовлення...")
    
    test_payload = {
        "counterparty_edrpou": "40196816",
        "items": [
            {
                "name": "Тестовий товар для перевірки Google Sheets",
                "unit": "шт",
                "quantity": 1,
                "price": 100,
                "amount": 100
            }
        ],
        "total_amount": 100
    }
    
    try:
        response = requests.post(
            f"{api_url}/orders/generate-pdf",
            json=test_payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code != 200:
            logger.error(f"❌ Помилка створення замовлення: {response.status_code} - {response.text}")
            return False
        
        result = response.json()
        order_number = result.get('order_number', '')
        drive_file_id = result.get('drive_file_id', '')
        
        logger.info(f"✅ Замовлення створено: {order_number}")
        logger.info(f"   Drive file ID: {drive_file_id}")
        
        # Step 2: Wait and get orders list
        logger.info("2. Очікування та отримання списку замовлень...")
        time.sleep(3)  # Wait for Google Sheets to update
        
        orders_response = requests.get(f"{api_url}/orders", timeout=30)
        
        if orders_response.status_code != 200:
            logger.error(f"❌ Помилка отримання замовлень: {orders_response.status_code}")
            return False
        
        orders_list = orders_response.json()
        logger.info(f"✅ Отримано {len(orders_list)} замовлень")
        
        # Step 3: Find our order
        logger.info("3. Пошук нашого замовлення в списку...")
        
        found_order = None
        for order in orders_list:
            if order.get('number') == order_number:
                found_order = order
                break
        
        if not found_order:
            logger.error(f"❌ Замовлення {order_number} не знайдено в списку")
            # Show last few orders for debugging
            logger.info("Останні 3 замовлення:")
            for order in orders_list[-3:]:
                logger.info(f"  Номер: {order.get('number')}, drive_file_id: {order.get('drive_file_id', 'N/A')}")
            return False
        
        logger.info(f"✅ Знайдено замовлення {order_number}")
        
        # Step 4: Check drive_file_id
        logger.info("4. Перевірка drive_file_id в списку...")
        
        list_drive_file_id = found_order.get('drive_file_id', '')
        
        if not list_drive_file_id:
            logger.error("❌ drive_file_id відсутній в списку замовлень")
            logger.info(f"Поля замовлення: {list(found_order.keys())}")
            return False
        
        if list_drive_file_id != drive_file_id:
            logger.error(f"❌ drive_file_id не співпадає:")
            logger.error(f"   В response: {drive_file_id}")
            logger.error(f"   В списку: {list_drive_file_id}")
            return False
        
        logger.info(f"✅ drive_file_id співпадає: {list_drive_file_id}")
        
        logger.info("=" * 60)
        logger.info("РЕЗУЛЬТАТ:")
        logger.info("=" * 60)
        logger.info("✅ Замовлення зберігається в Google Sheets з drive_file_id")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Помилка: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_order_sheets_integration()
    if success:
        print("\n🎉 ТЕСТ ПРОЙДЕНО УСПІШНО!")
    else:
        print("\n💥 ТЕСТ ПРОВАЛЕНО!")
    exit(0 if success else 1)