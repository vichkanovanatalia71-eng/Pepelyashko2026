# Pepelyashko

Веб-додаток для управління фінансами медичної практики ФОП (фізична особа-підприємець).
Замінює Excel-таблиці автоматизованою системою обліку доходів, витрат та податків.

## Можливості

- **Облік доходів** — записуйте надходження від пацієнтів, страхових компаній з вказанням способу оплати
- **Облік витрат** — категоризовані витрати (оренда, матеріали, обладнання тощо)
- **Розрахунок податків** — автоматичний розрахунок єдиного податку (5%) та ЄСВ для ФОП 3 групи
- **Звіти** — зведення за довільний період з розбивкою за кварталами
- **Дашборд** — візуальний огляд фінансового стану практики

## Технологічний стек

### Backend
- Python 3.12
- FastAPI
- SQLAlchemy + asyncpg (async PostgreSQL)
- Alembic (міграції БД)
- JWT авторизація

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Recharts (графіки)
- React Router

### Інфраструктура
- PostgreSQL 16
- Docker + docker-compose

## Швидкий старт

```bash
# Клонувати репозиторій
git clone https://github.com/WordCraft-ua/pepelyashko.git
cd pepelyashko

# Запустити через Docker
docker compose up --build

# Backend: http://localhost:8000
# Frontend: http://localhost:5173
# API docs: http://localhost:8000/docs
```

## Розробка без Docker

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Створити .env з .env.example
cp .env.example .env

# Запустити міграції
alembic upgrade head

# Запустити сервер
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Структура проекту

```
pepelyashko/
├── backend/
│   ├── app/
│   │   ├── api/routes/     # API ендпоінти
│   │   ├── core/           # Конфіг, безпека, залежності
│   │   ├── db/             # Сесія БД, базова модель
│   │   ├── models/         # SQLAlchemy моделі
│   │   ├── schemas/        # Pydantic схеми
│   │   └── services/       # Бізнес-логіка
│   ├── alembic/            # Міграції БД
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/            # HTTP клієнт
│   │   ├── components/     # React компоненти
│   │   ├── hooks/          # Кастомні хуки
│   │   ├── pages/          # Сторінки
│   │   └── types/          # TypeScript типи
│   └── package.json
└── docker-compose.yml
```

## API

| Метод | Ендпоінт | Опис |
|-------|----------|------|
| POST | /api/auth/register | Реєстрація |
| POST | /api/auth/login | Вхід |
| GET | /api/incomes/ | Список доходів |
| POST | /api/incomes/ | Створити дохід |
| PUT | /api/incomes/:id | Оновити дохід |
| DELETE | /api/incomes/:id | Видалити дохід |
| GET | /api/expenses/ | Список витрат |
| POST | /api/expenses/ | Створити витрату |
| GET | /api/expenses/categories | Категорії витрат |
| GET | /api/taxes/quarterly | Податки по кварталах |
| GET | /api/reports/period | Звіт за період |

## Ліцензія

MIT
