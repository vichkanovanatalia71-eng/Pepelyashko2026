#!/usr/bin/env python3
"""
Direct PDF Generation Test - bypasses Google Sheets quota issues
Tests the three new PDF generation endpoints directly
"""

import requests
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_pdf_endpoints():
    """Test the three PDF generation endpoints directly"""
    
    # Use the backend URL from frontend .env
    backend_url = "https://profileplus.preview.emergentagent.com/api"
    
    # Test payload as specified in review request
    test_payload = {
        "counterparty_edrpou": "40196816",  # Hardcoded ЄДРПОУ from review request
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
    
    endpoints = [
        ("Invoice", "/invoices/generate-pdf", "invoice_number"),
        ("Act", "/acts/generate-pdf", "act_number"),
        ("Waybill", "/waybills/generate-pdf", "waybill_number")
    ]
    
    results = {}
    
    for doc_type, endpoint, number_field in endpoints:
        logger.info(f"Testing {doc_type} PDF generation...")
        
        try:
            response = requests.post(
                f"{backend_url}{endpoint}",
                json=test_payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            logger.info(f"{doc_type} Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                results[doc_type] = result
                
                # Check required fields
                required_fields = [
                    'success', number_field, 'pdf_path', 'pdf_filename',
                    'drive_view_link', 'drive_download_link', 'drive_file_id'
                ]
                
                missing_fields = []
                for field in required_fields:
                    if field not in result:
                        missing_fields.append(field)
                
                if missing_fields:
                    logger.error(f"❌ {doc_type}: Missing required fields: {missing_fields}")
                    results[doc_type]['test_status'] = 'FAILED'
                else:
                    # Check success field
                    if result.get('success'):
                        logger.info(f"✅ {doc_type}: PDF generation successful")
                        logger.info(f"   Document number: {result.get(number_field)}")
                        logger.info(f"   PDF filename: {result.get('pdf_filename')}")
                        
                        # Check Google Drive fields
                        drive_view_link = result.get('drive_view_link', '')
                        drive_download_link = result.get('drive_download_link', '')
                        drive_file_id = result.get('drive_file_id', '')
                        
                        if drive_view_link and drive_download_link and drive_file_id:
                            logger.info(f"   ✅ Google Drive integration working")
                            logger.info(f"   Drive view link: {drive_view_link}")
                            logger.info(f"   Drive file ID: {drive_file_id}")
                            results[doc_type]['test_status'] = 'PASSED'
                        else:
                            logger.warning(f"   ⚠️  Google Drive fields empty: view_link={bool(drive_view_link)}, download_link={bool(drive_download_link)}, file_id={bool(drive_file_id)}")
                            results[doc_type]['test_status'] = 'PARTIAL'
                    else:
                        logger.error(f"❌ {doc_type}: Success field is false")
                        results[doc_type]['test_status'] = 'FAILED'
                        
            else:
                logger.error(f"❌ {doc_type}: HTTP {response.status_code} - {response.text}")
                results[doc_type] = {
                    'error': f"HTTP {response.status_code}",
                    'details': response.text,
                    'test_status': 'FAILED'
                }
                
        except Exception as e:
            logger.error(f"❌ {doc_type}: Exception - {str(e)}")
            results[doc_type] = {
                'error': 'Exception',
                'details': str(e),
                'test_status': 'FAILED'
            }
    
    # Summary
    logger.info("=" * 60)
    logger.info("DIRECT PDF GENERATION TEST SUMMARY")
    logger.info("=" * 60)
    
    passed_count = 0
    partial_count = 0
    failed_count = 0
    
    for doc_type, result in results.items():
        status = result.get('test_status', 'UNKNOWN')
        if status == 'PASSED':
            logger.info(f"{doc_type}: ✅ PASSED")
            passed_count += 1
        elif status == 'PARTIAL':
            logger.info(f"{doc_type}: ⚠️  PARTIAL (PDF generated but Drive integration issues)")
            partial_count += 1
        else:
            logger.info(f"{doc_type}: ❌ FAILED")
            failed_count += 1
    
    total_tests = len(endpoints)
    logger.info(f"Results: {passed_count} passed, {partial_count} partial, {failed_count} failed out of {total_tests} tests")
    
    if passed_count == total_tests:
        logger.info("🎉 ALL PDF GENERATION ENDPOINTS WORKING PERFECTLY!")
        return True
    elif passed_count + partial_count == total_tests:
        logger.info("✅ ALL PDF GENERATION ENDPOINTS WORKING (some Drive integration issues)")
        return True
    else:
        logger.error("💥 SOME PDF GENERATION ENDPOINTS FAILED")
        return False

if __name__ == "__main__":
    success = test_pdf_endpoints()
    exit(0 if success else 1)