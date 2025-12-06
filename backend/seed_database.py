"""Seed script to populate database with test data and default templates."""

import asyncio
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import uuid
import logging
import os

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from auth.auth_utils import get_password_hash
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')


async def seed_database():
    """Seed the database with test data."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    logger.info("Starting database seeding...")
    
    # Clear existing data (for clean seed)
    await db.users.delete_many({})
    await db.counterparties.delete_many({})
    await db.templates.delete_many({})
    await db.invoices.delete_many({})
    await db.acts.delete_many({})
    await db.waybills.delete_many({})
    await db.orders.delete_many({})
    await db.contracts.delete_many({})
    
    logger.info("Cleared existing data")
    
    # Create test users
    users = []
    user_ids = []
    
    for i in range(3):
        user_id = str(uuid.uuid4())
        user_ids.append(user_id)
        user = {
            "_id": user_id,
            "email": f"user{i+1}@example.com",
            "hashed_password": get_password_hash("password123"),
            "full_name": f"Тестовий Користувач {i+1}",
            "company_name": f"ТОВ Компанія {i+1}",
            "phone": f"+38050123456{i}",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        users.append(user)
        await db.users.insert_one(user)
    
    logger.info(f"Created {len(users)} test users")
    logger.info("Test user credentials:")
    for i in range(3):
        logger.info(f"  Email: user{i+1}@example.com, Password: password123")
    
    # Create counterparties for first user
    counterparties = []
    for i in range(10):
        counterparty_id = str(uuid.uuid4())
        edrpou = f"1234567{i}"
        counterparty = {
            "_id": counterparty_id,
            "user_id": user_ids[0],
            "edrpou": edrpou,
            "representative_name": f"ТОВ Контрагент {i+1}",
            "email": f"company{i+1}@example.com",
            "phone": f"+38050765432{i}",
            "iban": f"UA12345678901234567890123456{i}",
            "contract_type": "Постачання",
            "director_position": "Директор",
            "director_name": f"Петренко Петро Петрович {i+1}",
            "legal_address": f"Україна, м. Київ, вул. Хрещатик {i+1}",
            "bank": "АТ КБ 'ПриватБанк'",
            "mfo": "305299",
            "position": "Директор",
            "represented_by": f"Директора Петренка П.П. {i+1}",
            "signature": f"П.П. Петренко {i+1}",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        counterparties.append(counterparty)
        await db.counterparties.insert_one(counterparty)
    
    logger.info(f"Created {len(counterparties)} test counterparties for user1")
    
    # Create system default templates
    templates = []
    
    # Read existing template files
    template_dir = Path(__file__).parent
    template_files = {
        "invoice": template_dir / "invoice_template.html",
        "act": template_dir / "act_template.html",
        "order": template_dir / "order_template.html",
        "contract": template_dir / "default_contract_template.html"
    }
    
    for template_type, template_path in template_files.items():
        if template_path.exists():
            with open(template_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            template_id = str(uuid.uuid4())
            template = {
                "_id": template_id,
                "user_id": None,  # System template
                "is_default": True,
                "template_type": template_type,
                "name": f"Системний шаблон: {template_type.capitalize()}",
                "content": content,
                "variables": _extract_variables(content),
                "version_history": [],
                "current_version": 1,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            templates.append(template)
            await db.templates.insert_one(template)
            logger.info(f"Created system template for {template_type}")
    
    logger.info(f"Created {len(templates)} system default templates")
    
    # Create some test documents for first user
    # Create 2 orders
    for i in range(2):
        order_id = str(uuid.uuid4())
        order = {
            "_id": order_id,
            "user_id": user_ids[0],
            "number": f"{i+1:04d}",
            "date": datetime.utcnow(),
            "counterparty_edrpou": counterparties[i]["edrpou"],
            "counterparty_name": counterparties[i]["representative_name"],
            "items": [
                {
                    "name": "Товар 1",
                    "unit": "шт",
                    "quantity": 10,
                    "price": 100.0,
                    "amount": 1000.0
                },
                {
                    "name": "Товар 2",
                    "unit": "кг",
                    "quantity": 5,
                    "price": 50.0,
                    "amount": 250.0
                }
            ],
            "total_amount": 1250.0,
            "based_on_order": None,
            "pdf_path": None,
            "pdf_generated_at": None,
            "template_id": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.orders.insert_one(order)
    
    logger.info("Created 2 test orders")
    
    # Create 2 invoices
    for i in range(2):
        invoice_id = str(uuid.uuid4())
        edrpou = counterparties[i]["edrpou"]
        edrpou_middle = edrpou[2:6] if len(edrpou) >= 6 else edrpou[:4]
        
        invoice = {
            "_id": invoice_id,
            "user_id": user_ids[0],
            "number": f"{edrpou_middle}-{i+1}",
            "date": datetime.utcnow(),
            "counterparty_edrpou": edrpou,
            "counterparty_name": counterparties[i]["representative_name"],
            "items": [
                {
                    "name": "Товар A",
                    "unit": "шт",
                    "quantity": 5,
                    "price": 200.0,
                    "amount": 1000.0
                }
            ],
            "total_amount": 1000.0,
            "based_on_order": f"{i+1:04d}",
            "pdf_path": None,
            "pdf_generated_at": None,
            "template_id": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.invoices.insert_one(invoice)
    
    logger.info("Created 2 test invoices")
    
    logger.info("Database seeding completed successfully!")
    logger.info("\n" + "="*50)
    logger.info("TEST USERS CREATED:")
    logger.info("="*50)
    for i in range(3):
        logger.info(f"User {i+1}:")
        logger.info(f"  Email: user{i+1}@example.com")
        logger.info(f"  Password: password123")
        logger.info(f"  Company: ТОВ Компанія {i+1}")
    logger.info("="*50)
    
    client.close()


def _extract_variables(content: str):
    """Extract variables from template content."""
    import re
    pattern = r'\{\{\s*(\w+)\s*\}\}'
    variables = re.findall(pattern, content)
    return list(set(variables))


if __name__ == "__main__":
    asyncio.run(seed_database())
