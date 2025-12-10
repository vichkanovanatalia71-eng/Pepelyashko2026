"""
Скрипт для оновлення системного шаблону накладної в базі даних
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

async def update_waybill_template():
    """Оновлення системного шаблону накладної"""
    
    # Підключення до MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.document_management
    templates_collection = db.templates
    
    print("🔍 Підключення до MongoDB...")
    
    # Читаємо новий HTML-шаблон
    template_path = '/app/backend/waybill_template.html'
    with open(template_path, 'r', encoding='utf-8') as f:
        new_content = f.read()
    
    print(f"📄 Прочитано {len(new_content)} символів з {template_path}")
    
    # Оновлюємо всі системні шаблони накладних (user_id = None, is_default = True)
    result = await templates_collection.update_many(
        {
            "template_type": "waybill",
            "user_id": None,
            "is_default": True
        },
        {
            "$set": {
                "content": new_content,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    print(f"✅ Оновлено {result.modified_count} системних шаблонів накладних")
    
    # Якщо системного шаблону немає, створюємо його
    if result.modified_count == 0:
        print("⚠️ Системний шаблон не знайдено, створюємо новий...")
        
        import uuid
        template_doc = {
            "_id": str(uuid.uuid4()),
            "user_id": None,
            "is_default": True,
            "template_type": "waybill",
            "name": "Системний шаблон накладної",
            "content": new_content,
            "variables": [],
            "version_history": [],
            "current_version": 1,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await templates_collection.insert_one(template_doc)
        print("✅ Створено новий системний шаблон накладної")
    
    # Перевіряємо результат
    system_template = await templates_collection.find_one({
        "template_type": "waybill",
        "user_id": None,
        "is_default": True
    })
    
    if system_template:
        print(f"✅ Системний шаблон накладної в БД:")
        print(f"   - ID: {system_template['_id']}")
        print(f"   - Назва: {system_template['name']}")
        print(f"   - Розмір контенту: {len(system_template['content'])} символів")
        print(f"   - Оновлено: {system_template['updated_at']}")
    
    client.close()
    print("✅ Готово!")

if __name__ == "__main__":
    asyncio.run(update_waybill_template())
