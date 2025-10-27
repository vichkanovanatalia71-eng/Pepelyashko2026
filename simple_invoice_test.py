#!/usr/bin/env python3
"""
Simple Invoice Test - Test the specific scenario from review request
"""

import requests
import json
import time
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_invoice_drive_file_id():
    """Test invoice creation with drive_file_id verification"""
    
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
    
    # Test payload exactly as specified in the review request
    test_payload = {
        "counterparty_edrpou": "40196816",
        "items": [
            {
                "name": "Тестовий товар для перевірки",
                "unit": "шт",
                "quantity": 2,
                "price": 5000,
                "amount": 10000
            }
        ],
        "total_amount": 10000
    }
    
    logger.info("=" * 60)
    logger.info("ТЕСТ СТВОРЕННЯ РАХУНКУ З ПЕРЕВІРКОЮ drive_file_id")
    logger.info("=" * 60)
    
    try:
        # Step 1: Create new invoice through POST /api/invoices/generate-pdf
        logger.info("1. Створення нового рахунку через POST /api/invoices/generate-pdf...")
        logger.info(f"   Payload: {json.dumps(test_payload, ensure_ascii=False, indent=2)}")
        
        response = requests.post(
            f"{api_url}/invoices/generate-pdf",
            json=test_payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code != 200:
            logger.error(f"❌ Помилка створення рахунку: {response.status_code}")
            logger.error(f"   Response: {response.text}")
            return False
        
        result = response.json()
        logger.info(f"✅ Рахунок створено успішно")
        logger.info(f"   Response: {json.dumps(result, ensure_ascii=False, indent=2)}")
        
        # Step 2: Check that response contains drive_file_id (not empty)
        logger.info("2. Перевірка що response містить drive_file_id (не порожній)...")
        
        drive_file_id = result.get('drive_file_id', '')
        if not drive_file_id or drive_file_id == '':
            logger.error("❌ Response від generate-pdf НЕ містить drive_file_id або він порожній")
            logger.error(f"   drive_file_id: '{drive_file_id}'")
            logger.error(f"   Всі поля response: {list(result.keys())}")
            return False
        
        logger.info(f"✅ Response від generate-pdf містить drive_file_id: {drive_file_id}")
        
        # Store invoice number for verification
        invoice_number = result.get('invoice_number', '')
        logger.info(f"   Номер рахунку: {invoice_number}")
        
        # Step 3: Get list of invoices through GET /api/invoices
        logger.info("3. Отримання списку рахунків через GET /api/invoices...")
        
        # Wait a moment for the invoice to be saved
        time.sleep(3)
        
        invoices_response = requests.get(
            f"{api_url}/invoices",
            timeout=30
        )
        
        if invoices_response.status_code != 200:
            logger.error(f"❌ Помилка отримання списку рахунків: {invoices_response.status_code}")
            logger.error(f"   Response: {invoices_response.text}")
            return False
        
        invoices_list = invoices_response.json()
        logger.info(f"✅ Список рахунків отримано успішно ({len(invoices_list)} рахунків)")
        
        # Step 4: Check that newly created invoice has drive_file_id in the list
        logger.info("4. Перевірка що новостворений рахунок має поле drive_file_id в списку...")
        
        # Look for the invoice by drive_file_id
        found_invoice = None
        for invoice in invoices_list:
            if invoice.get('drive_file_id') == drive_file_id:
                found_invoice = invoice
                break
        
        if not found_invoice:
            logger.warning(f"⚠️  Рахунок з drive_file_id {drive_file_id} не знайдено в списку")
            logger.info("   Перевіряємо останні рахунки в списку:")
            
            # Show last few invoices to see if any have drive_file_id
            for i, inv in enumerate(invoices_list[-5:]):
                has_drive_id = 'drive_file_id' in inv and inv.get('drive_file_id', '') != ''
                drive_id_value = inv.get('drive_file_id', 'відсутній')
                logger.info(f"     {len(invoices_list)-4+i}. Номер: {inv.get('number', 'N/A')}, drive_file_id: {drive_id_value} {'✅' if has_drive_id else '❌'}")
            
            # Check if any invoice has drive_file_id at all
            invoices_with_drive_id = [inv for inv in invoices_list if inv.get('drive_file_id', '') != '']
            if invoices_with_drive_id:
                logger.info(f"   Знайдено {len(invoices_with_drive_id)} рахунків з drive_file_id в списку")
                logger.info("   Це означає що поле drive_file_id працює, але новий рахунок не збережено правильно")
            else:
                logger.error("   ❌ Жоден рахунок в списку не має drive_file_id")
                logger.error("   Це означає що поле drive_file_id не зберігається в Google Sheets")
            
            return False
        
        # Check if the invoice in the list has drive_file_id
        list_drive_file_id = found_invoice.get('drive_file_id', '')
        if not list_drive_file_id or list_drive_file_id == '':
            logger.error("❌ Знайдений рахунок в GET /api/invoices НЕ має drive_file_id або він порожній")
            logger.error(f"   drive_file_id в списку: '{list_drive_file_id}'")
            return False
        
        logger.info(f"✅ Новий рахунок в GET /api/invoices має drive_file_id: {list_drive_file_id}")
        logger.info(f"   Номер рахунку в списку: {found_invoice.get('number', 'N/A')}")
        
        # Step 5: Log results as requested
        logger.info("=" * 60)
        logger.info("РЕЗУЛЬТАТИ ТЕСТУВАННЯ:")
        logger.info("=" * 60)
        logger.info(f"✅ Чи response від generate-pdf містить drive_file_id: ТАК")
        logger.info(f"✅ Чи новий рахунок в GET /api/invoices має drive_file_id: ТАК")
        logger.info(f"✅ Значення drive_file_id: {drive_file_id}")
        
        # Verify they match
        if drive_file_id == list_drive_file_id:
            logger.info(f"✅ drive_file_id співпадає в обох випадках")
        else:
            logger.warning(f"⚠️  drive_file_id не співпадає: response='{drive_file_id}', list='{list_drive_file_id}'")
        
        logger.info("=" * 60)
        logger.info("🎉 ТЕСТ ПРОЙДЕНО УСПІШНО!")
        logger.info("=" * 60)
        
        return True
            
    except Exception as e:
        logger.error(f"❌ Тест drive_file_id провалився з помилкою: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_invoice_drive_file_id()
    exit(0 if success else 1)