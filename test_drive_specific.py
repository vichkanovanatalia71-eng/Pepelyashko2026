#!/usr/bin/env python3
"""
Specific Google Drive Test for the Review Request
Tests the exact scenario requested by the user.
"""

import requests
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_google_drive_integration():
    """Test the specific Google Drive scenario from the review request"""
    
    # Get backend URL from frontend .env file
    backend_url = "https://contract-forge-6.preview.emergentagent.com"
    api_url = f"{backend_url}/api"
    
    logger.info("=" * 80)
    logger.info("КРИТИЧНО ВАЖЛИВИЙ ТЕСТ: Google Drive інтеграція")
    logger.info("=" * 80)
    
    # Step 1: GET /api/counterparties
    logger.info("1. Отримання списку контрагентів...")
    try:
        response = requests.get(f"{api_url}/counterparties", timeout=10)
        if response.status_code == 200:
            counterparties = response.json()
            if counterparties:
                first_edrpou = counterparties[0]['edrpou']
                logger.info(f"✅ Знайдено {len(counterparties)} контрагентів")
                logger.info(f"   Використовуємо ЄДРПОУ: {first_edrpou}")
            else:
                logger.error("❌ Контрагентів не знайдено")
                return False
        else:
            logger.error(f"❌ Помилка отримання контрагентів: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Помилка: {str(e)}")
        return False
    
    # Step 2: POST /api/contracts/generate-pdf
    logger.info("2. Генерація договору з тестовими даними...")
    
    test_payload = {
        "counterparty_edrpou": first_edrpou,
        "subject": "Тестовий договір для перевірки Google Drive",
        "items": [
            {
                "name": "Тестовий товар",
                "unit": "шт",
                "quantity": 1,
                "price": 1000,
                "amount": 1000
            }
        ],
        "total_amount": 1000
    }
    
    try:
        response = requests.post(
            f"{api_url}/contracts/generate-pdf",
            json=test_payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ Договір згенеровано успішно")
            
            # КРИТИЧНО ВАЖЛИВО ПЕРЕВІРИТИ:
            drive_view_link = result.get('drive_view_link', '')
            drive_download_link = result.get('drive_download_link', '')
            drive_file_id = result.get('drive_file_id', '')
            
            logger.info("=" * 60)
            logger.info("КРИТИЧНА ПЕРЕВІРКА GOOGLE DRIVE ПОСИЛАНЬ:")
            logger.info("=" * 60)
            
            # Check drive_view_link
            if drive_view_link:
                if drive_view_link.startswith("https://drive.google.com"):
                    logger.info(f"✅ drive_view_link НЕ порожній: {drive_view_link}")
                else:
                    logger.error(f"❌ drive_view_link має неправильний формат: {drive_view_link}")
                    return False
            else:
                logger.error("❌ drive_view_link ПОРОЖНІЙ!")
                return False
            
            # Check drive_download_link
            if drive_download_link:
                logger.info(f"✅ drive_download_link НЕ порожній: {drive_download_link}")
            else:
                logger.error("❌ drive_download_link ПОРОЖНІЙ!")
                return False
            
            # Check drive_file_id
            if drive_file_id:
                logger.info(f"✅ drive_file_id НЕ порожній: {drive_file_id}")
            else:
                logger.error("❌ drive_file_id ПОРОЖНІЙ!")
                return False
            
            logger.info("=" * 60)
            logger.info("🎉 ВСІ GOOGLE DRIVE ПОЛЯ ЗАПОВНЕНІ ПРАВИЛЬНО!")
            logger.info("=" * 60)
            return True
            
        else:
            logger.error(f"❌ Помилка генерації договору: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Помилка генерації договору: {str(e)}")
        return False

def check_backend_logs():
    """Check backend logs for specific Google Drive messages"""
    logger.info("3. Перевірка backend логів...")
    
    try:
        import subprocess
        
        # Look for "Uploaded file" or "Created folder"
        result = subprocess.run(
            ['grep', '-i', 'uploaded file\|created folder', '/var/log/supervisor/backend.err.log'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            logger.info("✅ Знайдено повідомлення про успішне завантаження:")
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    logger.info(f"   {line.strip()}")
        else:
            logger.warning("⚠️  Не знайдено повідомлень про успішне завантаження")
        
        # Look for errors
        error_result = subprocess.run(
            ['grep', '-i', 'storageQuotaExceeded\|403', '/var/log/supervisor/backend.err.log'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if error_result.returncode == 0:
            logger.error("❌ Знайдено помилки Google Drive:")
            for line in error_result.stdout.strip().split('\n')[-5:]:  # Last 5 errors
                if line.strip():
                    logger.error(f"   {line.strip()}")
        
    except Exception as e:
        logger.warning(f"⚠️  Помилка перевірки логів: {str(e)}")

def main():
    """Main test execution"""
    success = test_google_drive_integration()
    check_backend_logs()
    
    logger.info("=" * 80)
    if success:
        logger.info("🎉 ТЕСТ ПРОЙДЕНО: Google Drive інтеграція працює!")
        logger.info("   Всі посилання заповнені правильно")
    else:
        logger.error("💥 ТЕСТ НЕ ПРОЙДЕНО: Google Drive інтеграція НЕ працює")
        logger.error("   Посилання порожні або неправильні")
    logger.info("=" * 80)
    
    return success

if __name__ == "__main__":
    main()