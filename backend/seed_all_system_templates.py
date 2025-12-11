"""
Скрипт для створення/оновлення ВСІХ системних шаблонів в БД
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import uuid

async def seed_all_templates():
    """Створення системних шаблонів для всіх типів документів"""
    
    # Підключення до MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🔍 Підключення до MongoDB...")
    
    # Конфігурація шаблонів
    templates_config = [
        {
            'type': 'invoice',
            'file': '/app/backend/invoice_template.html',
            'name': 'Системний шаблон рахунку'
        },
        {
            'type': 'act',
            'file': '/app/backend/act_template.html',
            'name': 'Системний шаблон акту'
        },
        {
            'type': 'waybill',
            'file': '/app/backend/waybill_template.html',
            'name': 'Системний шаблон накладної'
        },
        {
            'type': 'contract',
            'file': '/app/backend/default_contract_template.html',
            'name': 'Системний шаблон договору'
        }
    ]
    
    for config in templates_config:
        doc_type = config['type']
        file_path = config['file']
        name = config['name']
        
        print(f"\n📄 {doc_type.upper()}:")
        
        # Читаємо HTML-шаблон
        if not os.path.exists(file_path):
            print(f"  ❌ Файл {file_path} не знайдено!")
            continue
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print(f"  📖 Прочитано {len(content)} символів з {file_path}")
        
        # Перевіряємо чи існує системний шаблон
        existing = await db.templates.find_one({
            'template_type': doc_type,
            'user_id': None,
            'is_default': True
        })
        
        if existing:
            # Оновлюємо існуючий
            result = await db.templates.update_one(
                {'_id': existing['_id']},
                {
                    '$set': {
                        'name': name,
                        'content': content,
                        'updated_at': datetime.utcnow()
                    }
                }
            )
            print(f"  ✅ Системний шаблон ОНОВЛЕНО (ID: {existing['_id']})")
        else:
            # Створюємо новий
            template_id = str(uuid.uuid4())
            template_doc = {
                '_id': template_id,
                'user_id': None,
                'is_default': True,
                'template_type': doc_type,
                'name': name,
                'content': content,
                'variables': [],
                'version_history': [],
                'current_version': 1,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            await db.templates.insert_one(template_doc)
            print(f"  ✅ Системний шаблон СТВОРЕНО (ID: {template_id})")
    
    client.close()
    print("\n✅ Всі системні шаблони оброблені!")

if __name__ == "__main__":
    asyncio.run(seed_all_templates())
