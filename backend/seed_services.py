"""Seed 22 paid services for all users.

Usage: cd backend && python seed_services.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.service import Service
from app.models.user import User

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/pepelyashko",
)

SERVICES = [
    {
        "code": "001",
        "name": "Прийом лікаря без декларації",
        "price": 400.0,
        "materials": [
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Шпатель (1 штука)", "unit": "штука", "quantity": 1, "cost": 2.0},
            {"name": "Аскорбінова кислота (1 штука)", "unit": "штука", "quantity": 1, "cost": 12.0},
        ],
    },
    {
        "code": "002",
        "name": "Глюкоза крові",
        "price": 110.0,
        "materials": [
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Тест-смужка (1 штука)", "unit": "штука", "quantity": 1, "cost": 10.0},
            {"name": "Спиртова серветка (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
            {"name": "Ланцет (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
        ],
    },
    {
        "code": "003",
        "name": "Глюкоза крові з навантаженням",
        "price": 250.0,
        "materials": [
            {"name": "Рукавички нестерильні (2 пари)", "unit": "пара", "quantity": 2, "cost": 10.0},
            {"name": "Спиртова серветка (2 штуки)", "unit": "штука", "quantity": 2, "cost": 2.0},
            {"name": "Тест-смужка (2 штуки)", "unit": "штука", "quantity": 2, "cost": 20.0},
            {"name": "Ланцет (2 штуки)", "unit": "штука", "quantity": 2, "cost": 2.0},
            {"name": "Глюкоза-тест порошок для орального розчину (1 штука)", "unit": "штука", "quantity": 1, "cost": 70.0},
            {"name": "Шпатель (1 штука)", "unit": "штука", "quantity": 1, "cost": 2.0},
            {"name": "Одноразовий стаканчик (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
        ],
    },
    {
        "code": "004",
        "name": "Електрокардіографія",
        "price": 150.0,
        "materials": [
            {"name": "Амортизація та стрічка", "unit": "послуга", "quantity": 1, "cost": 50.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
        ],
    },
    {
        "code": "005",
        "name": "Швидкий тест на антиген COVID-19",
        "price": 250.0,
        "materials": [
            {"name": "Експрес-тест на антиген COVID-19 (1 штука)", "unit": "штука", "quantity": 1, "cost": 50.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Маска медична 3-шарова (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.50},
        ],
    },
    {
        "code": "006",
        "name": "Загальний аналіз сечі",
        "price": 150.0,
        "materials": [
            {"name": "Рукавички нестерильні (2 пари)", "unit": "пара", "quantity": 2, "cost": 10.0},
            {"name": "Тест-смужки U-11, Mindray (1 штука)", "unit": "штука", "quantity": 1, "cost": 20.0},
            {"name": "Амортизація", "unit": "послуга", "quantity": 1, "cost": 15.0},
        ],
    },
    {
        "code": "007",
        "name": "Внутрішньовенне введення лікарського засобу",
        "price": 100.0,
        "materials": [
            {"name": "Шприц 10,0 мл (2 штуки)", "unit": "штука", "quantity": 2, "cost": 8.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Спиртова серветка (2 штуки)", "unit": "штука", "quantity": 2, "cost": 2.0},
            {"name": "Лейкопластир (1 штука)", "unit": "штука", "quantity": 1, "cost": 2.50},
            {"name": "Шприц 20,0 мл (1 штука)", "unit": "штука", "quantity": 1, "cost": 5.0},
        ],
    },
    {
        "code": "008",
        "name": "Внутрішньом\u2019язове введення лікарського засобу",
        "price": 80.0,
        "materials": [
            {"name": "Шприц 5,0 мл (2 штуки)", "unit": "штука", "quantity": 2, "cost": 8.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Спиртова серветка (2 штуки)", "unit": "штука", "quantity": 2, "cost": 2.0},
            {"name": "Шприц 2,0 мл (2 штуки)", "unit": "штука", "quantity": 2, "cost": 6.0},
        ],
    },
    {
        "code": "009",
        "name": "Підшкірне введення лікарського засобу",
        "price": 80.0,
        "materials": [
            {"name": "Шприц 5,0 мл (1 штука)", "unit": "штука", "quantity": 1, "cost": 4.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Спиртова серветка (2 штуки)", "unit": "штука", "quantity": 2, "cost": 2.0},
            {"name": "Шприц 2,0 мл (1 штука)", "unit": "штука", "quantity": 1, "cost": 3.0},
        ],
    },
    {
        "code": "010",
        "name": "Інфузійне введення лікарського засобу",
        "price": 200.0,
        "materials": [
            {"name": "Шприц 5,0 мл (1 штука)", "unit": "штука", "quantity": 1, "cost": 4.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Спиртова серветка (2 штуки)", "unit": "штука", "quantity": 2, "cost": 2.0},
            {"name": "Шприц 10,0 мл (1 штука)", "unit": "штука", "quantity": 1, "cost": 4.0},
            {"name": "Інфузійна система (1 штука)", "unit": "штука", "quantity": 1, "cost": 15.0},
            {"name": "Пластир для фіксації канюлі внутрішньовенної (1 штука)", "unit": "штука", "quantity": 1, "cost": 4.0},
        ],
    },
    {
        "code": "011",
        "name": "Взяття біологічного матеріалу (венозна кров)",
        "price": 100.0,
        "materials": [
            {"name": "Шприц 5,0 мл (1 штука)", "unit": "штука", "quantity": 1, "cost": 4.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Спиртова серветка (2 штуки)", "unit": "штука", "quantity": 2, "cost": 2.0},
            {"name": "Шприц інсуліновий 1,0 мл (1 штука)", "unit": "штука", "quantity": 1, "cost": 5.0},
        ],
    },
    {
        "code": "012",
        "name": "Прийом лікаря-спеціаліста",
        "price": 500.0,
        "materials": [
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Шпатель (1 штука)", "unit": "штука", "quantity": 1, "cost": 2.0},
            {"name": "Аскорбінова кислота (1 штука)", "unit": "штука", "quantity": 1, "cost": 12.0},
        ],
    },
    {
        "code": "013",
        "name": "Консультація лікаря на дому",
        "price": 600.0,
        "materials": [
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Шпатель (1 штука)", "unit": "штука", "quantity": 1, "cost": 2.0},
            {"name": "Послуги таксі — середній показник", "unit": "послуга", "quantity": 1, "cost": 150.0},
        ],
    },
    {
        "code": "014",
        "name": "Комбінований швидкий тест для визначення антигена COVID-19 та грипу А/В",
        "price": 350.0,
        "materials": [
            {"name": "Комбінований швидкий тест для визначення антигена COVID-19 та грипу А/В (1 штука)", "unit": "штука", "quantity": 1, "cost": 105.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Маска медична 3-шарова (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.50},
        ],
    },
    {
        "code": "015",
        "name": "Швидкий тест для діагностики стрептококової ангіни",
        "price": 400.0,
        "materials": [
            {"name": "Швидкий тест для діагностики стрептококової ангіни CITO TEST STREP A (1 штука)", "unit": "штука", "quantity": 1, "cost": 255.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Маска медична 3-шарова (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.50},
        ],
    },
    {
        "code": "016",
        "name": "Визначення рівня сечової кислоти у крові тест-смужками",
        "price": 200.0,
        "materials": [
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Тест-смужка (1 штука)", "unit": "штука", "quantity": 1, "cost": 35.0},
            {"name": "Спиртова серветка (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
            {"name": "Ланцет (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
        ],
    },
    {
        "code": "017",
        "name": "Швидкий тест для визначення С-реактивного білка",
        "price": 250.0,
        "materials": [
            {"name": "Швидкий тест для визначення С-реактивного білка (1 штука)", "unit": "штука", "quantity": 1, "cost": 75.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Спиртова серветка (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
            {"name": "Ланцет (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
        ],
    },
    {
        "code": "018",
        "name": "Швидкий тест на феритин",
        "price": 350.0,
        "materials": [
            {"name": "Швидкий тест на феритин (1 штука)", "unit": "штука", "quantity": 1, "cost": 113.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Спиртова серветка (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
            {"name": "Ланцет (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
        ],
    },
    {
        "code": "019",
        "name": "Швидкий тест на вітамін D",
        "price": 500.0,
        "materials": [
            {"name": "Швидкий тест на вітамін D (1 штука)", "unit": "штука", "quantity": 1, "cost": 148.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Спиртова серветка (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
            {"name": "Ланцет (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
        ],
    },
    {
        "code": "020",
        "name": "Швидкий тест на виявлення простат-специфічного антигену (ПСА)",
        "price": 340.0,
        "materials": [
            {"name": "Швидкий тест на виявлення простат-специфічного антигену (ПСА) (1 штука)", "unit": "штука", "quantity": 1, "cost": 72.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Спиртова серветка (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
            {"name": "Ланцет (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
        ],
    },
    {
        "code": "021",
        "name": "Тест швидкий комбінований для виявлення ВІЛ 1/2, гепатит С, гепатит В, сифіліс",
        "price": 450.0,
        "materials": [
            {"name": "Тест швидкий комбінований для виявлення ВІЛ 1/2, гепатит С, гепатит В, сифіліс (1 штука)", "unit": "штука", "quantity": 1, "cost": 80.0},
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Спиртова серветка (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
            {"name": "Ланцет (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
        ],
    },
    {
        "code": "022",
        "name": "Визначення рівня гемоглобіну в крові тест-смужками",
        "price": 100.0,
        "materials": [
            {"name": "Рукавички нестерильні (1 пара)", "unit": "пара", "quantity": 1, "cost": 5.0},
            {"name": "Тест-смужка (1 штука)", "unit": "штука", "quantity": 1, "cost": 39.0},
            {"name": "Спиртова серветка (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
            {"name": "Ланцет (1 штука)", "unit": "штука", "quantity": 1, "cost": 1.0},
        ],
    },
]


async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db:
        # Get all users
        users = (await db.execute(select(User))).scalars().all()
        if not users:
            print("No users found in database.")
            return

        for user in users:
            print(f"\n=== User: {user.email} (id={user.id}) ===")

            # Delete existing services
            result = await db.execute(
                select(Service).where(Service.user_id == user.id)
            )
            existing = result.scalars().all()
            print(f"  Deleting {len(existing)} existing services...")
            await db.execute(
                delete(Service).where(Service.user_id == user.id)
            )

            # Create new services
            for svc in SERVICES:
                service = Service(
                    user_id=user.id,
                    code=svc["code"],
                    name=svc["name"],
                    price=svc["price"],
                    materials=svc["materials"],
                )
                db.add(service)
                print(f"  + [{svc['code']}] {svc['name']} — {svc['price']} грн ({len(svc['materials'])} матеріалів)")

            await db.commit()
            print(f"  Done! Created {len(SERVICES)} services.")

    await engine.dispose()
    print("\nSeed complete!")


if __name__ == "__main__":
    asyncio.run(main())
