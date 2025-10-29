#!/usr/bin/env python3
"""
Test script specifically for contract creation based on orders functionality
"""

from backend_test import ContractTestSuite
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    logger.info("Starting contract creation based on orders test...")
    
    suite = ContractTestSuite()
    
    # Run the specific test
    result = suite.test_contract_creation_based_on_orders()
    
    if result:
        logger.info("✅ Contract creation based on orders test PASSED")
    else:
        logger.error("❌ Contract creation based on orders test FAILED")
    
    return result

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)