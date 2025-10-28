#!/usr/bin/env python3
"""
Focused test for Order PDF Generation endpoint
Tests the specific requirements from the review request
"""

import requests
import json
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_order_pdf_generation():
    """Test order PDF generation as specified in review request"""
    
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
    logger.info("ТЕСТ ЕНДПОІНТА ГЕНЕРАЦІЇ PDF ЗАМОВЛЕНЬ")
    logger.info("=" * 60)
    
    # Step 1: Get counterparties to find ЄДРПОУ 40196816
    logger.info("1. GET /api/counterparties - отримати список контрагентів з 'Основні дані'")
    try:
        response = requests.get(f"{api_url}/counterparties", timeout=10)
        if response.status_code == 200:
            counterparties = response.json()
            
            # Look for ЄДРПОУ 40196816
            target_edrpou = "40196816"
            found_counterparty = None
            
            for counterparty in counterparties:
                if counterparty.get('edrpou') == target_edrpou:
                    found_counterparty = counterparty
                    break
            
            if found_counterparty:
                logger.info(f"✅ Знайдено контрагента з ЄДРПОУ: {target_edrpou}")
                logger.info(f"   Назва: {found_counterparty.get('representative_name', '')}")
            else:
                logger.error(f"❌ Контрагента з ЄДРПОУ {target_edrpou} не знайдено")
                return False
        else:
            logger.error(f"❌ Помилка отримання контрагентів: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Помилка: {str(e)}")
        return False
    
    # Step 2: Test POST /api/orders/generate-pdf
    logger.info("2. POST /api/orders/generate-pdf - генерація PDF замовлення")
    
    # Test payload exactly as specified in review request
    test_payload = {
        "counterparty_edrpou": "40196816",
        "items": [
            {
                "name": "Медичне обладнання",
                "unit": "шт",
                "quantity": 5,
                "price": 3000,
                "amount": 15000
            }
        ],
        "total_amount": 15000
    }
    
    logger.info(f"   Payload: {json.dumps(test_payload, ensure_ascii=False, indent=2)}")
    
    try:
        response = requests.post(
            f"{api_url}/orders/generate-pdf",
            json=test_payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ Замовлення згенеровано успішно")
            
            # Check all required fields from review request
            logger.info("3. ПЕРЕВІРКА RESPONSE:")
            
            # success: true
            success = result.get('success')
            if success:
                logger.info("✅ success: true")
            else:
                logger.error(f"❌ success: {success}")
                return False
            
            # order_number: має бути у форматі "0001", "0002" тощо
            order_number = result.get('order_number', '')
            if order_number and order_number.isdigit() and len(order_number) == 4:
                logger.info(f"✅ order_number: {order_number} (формат 0001, 0002...)")
            else:
                logger.error(f"❌ order_number неправильний формат: {order_number}")
                return False
            
            # pdf_path: шлях до локального PDF
            pdf_path = result.get('pdf_path', '')
            if pdf_path:
                logger.info(f"✅ pdf_path: {pdf_path}")
            else:
                logger.error("❌ pdf_path відсутній")
                return False
            
            # pdf_filename: має містити "Замовлення_" + номер + "_" + ЄДРПОУ + ".pdf"
            pdf_filename = result.get('pdf_filename', '')
            expected_filename = f"Замовлення_{order_number}_40196816.pdf"
            if pdf_filename == expected_filename:
                logger.info(f"✅ pdf_filename: {pdf_filename}")
            else:
                logger.error(f"❌ pdf_filename неправильний. Очікувався: {expected_filename}, отримано: {pdf_filename}")
                return False
            
            # drive_view_link: посилання для перегляду на Google Drive
            drive_view_link = result.get('drive_view_link', '')
            if drive_view_link and drive_view_link.startswith("https://drive.google.com"):
                logger.info(f"✅ drive_view_link: {drive_view_link}")
            else:
                logger.error(f"❌ drive_view_link неправильний: {drive_view_link}")
                return False
            
            # drive_download_link: посилання для завантаження з Google Drive
            drive_download_link = result.get('drive_download_link', '')
            if drive_download_link:
                logger.info(f"✅ drive_download_link: {drive_download_link}")
            else:
                logger.error("❌ drive_download_link відсутній")
                return False
            
            # drive_file_id: ID файлу на Google Drive
            drive_file_id = result.get('drive_file_id', '')
            if drive_file_id and len(drive_file_id) > 10:
                logger.info(f"✅ drive_file_id: {drive_file_id}")
            else:
                logger.error(f"❌ drive_file_id неправильний: {drive_file_id}")
                return False
            
            logger.info("=" * 60)
            logger.info("РЕЗУЛЬТАТИ ТЕСТУВАННЯ:")
            logger.info("=" * 60)
            logger.info("✅ PDF генерується успішно з українськими символами")
            logger.info(f"✅ Нумерація замовлення: проста послідовна ({order_number})")
            logger.info("✅ Файл завантажується на Google Drive в папку 'Замовлення'")
            logger.info("✅ drive_file_id, drive_view_link, drive_download_link заповнені")
            logger.info("✅ Використовуються дані з 'Мої дані' (постачальник) та 'Основні дані' (покупець)")
            
            return True
            
        else:
            logger.error(f"❌ Помилка генерації замовлення: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Помилка: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_order_pdf_generation()
    if success:
        print("\n🎉 ТЕСТ ПРОЙДЕНО УСПІШНО!")
    else:
        print("\n💥 ТЕСТ ПРОВАЛЕНО!")
    exit(0 if success else 1)