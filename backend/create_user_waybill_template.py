"""
Скрипт для створення користувацького шаблону накладної для user1
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import uuid

async def create_user_template():
    """Створення користувацького шаблону накладної"""
    
    # Підключення до MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.document_management
    
    print("🔍 Підключення до MongoDB...")
    
    # Знаходимо user1
    user = await db.users.find_one({"email": "user1@example.com"})
    if not user:
        print("❌ Користувач user1@example.com не знайдений!")
        return
    
    user_id = user["_id"]
    print(f"✅ Знайдено користувача: {user['email']} (ID: {user_id})")
    
    # Перевіряємо, чи вже є користувацький шаблон накладної
    existing_template = await db.templates.find_one({
        "user_id": user_id,
        "template_type": "waybill"
    })
    
    if existing_template:
        print(f"ℹ️ Користувацький шаблон накладної вже існує (ID: {existing_template['_id']})")
        print(f"   Оновлюємо його зміст...")
        
        # Читаємо новий HTML-шаблон
        template_path = '/app/backend/waybill_template.html'
        with open(template_path, 'r', encoding='utf-8') as f:
            new_content = f.read()
        
        # Оновлюємо існуючий шаблон
        result = await db.templates.update_one(
            {"_id": existing_template['_id']},
            {
                "$set": {
                    "content": new_content,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            print("✅ Користувацький шаблон оновлено!")
        else:
            print("⚠️ Шаблон не змінився (можливо, вміст ідентичний)")
    else:
        print("ℹ️ Користувацького шаблону накладної немає, створюємо...")
        
        # Читаємо HTML-шаблон
        template_path = '/app/backend/waybill_template.html'
        with open(template_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print(f"📄 Прочитано {len(content)} символів з {template_path}")
        
        # Створюємо користувацький шаблон
        template_id = str(uuid.uuid4())
        template_doc = {
            "_id": template_id,
            "user_id": user_id,
            "is_default": False,
            "template_type": "waybill",
            "name": "Мій шаблон накладної",
            "content": content,
            "variables": [],
            "version_history": [],
            "current_version": 1,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.templates.insert_one(template_doc)
        print(f"✅ Створено користувацький шаблон накладної (ID: {template_id})")
    
    client.close()
    print("✅ Готово!")

if __name__ == "__main__":
    asyncio.run(create_user_template())
