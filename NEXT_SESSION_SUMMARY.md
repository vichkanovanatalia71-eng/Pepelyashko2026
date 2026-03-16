# MedFlow (Pepelyashko) — Підсумок сесії для наступного розробника

## Огляд проекту

**MedFlow** — веб-додаток для управління фінансами медичної практики ФОП (Фізична Особа-Підприємець).

| Компонент | Стек | Порт |
|-----------|------|------|
| Бекенд | FastAPI + Uvicorn (Python 3.12) | 8000 |
| Фронтенд | React 18 + Vite + TypeScript + Tailwind CSS | 5173 (dev) / 3000 (prod/nginx) |
| База даних | PostgreSQL 16 (Alpine) | 5432 |
| Деплоймент | Railway (2 сервіси: бекенд + фронтенд) | Призначається Railway |

---

## Що було зроблено (гілка `claude/fix-railway-deployment-VhbPs`)

### Виправлення багів
1. **Помилки збірки TypeScript** (`c7cc926`) — Виправлено TS-помилки в AiConsultantPage, які ламали збірку на Railway
2. **Падіння AI-консультанта** (`444a5dd`) — Виправлено AttributeError, через який всі AI-запити падали
3. **Сортування послуг** (`188fce6`, `61a7516`) — Натуральне числове сортування (1,2,3 замість 1,10,2)
4. **Видимість модальних вікон на MacBook** (`444cc37`, `336bc38`) — Прокручувані модалки, правильний z-index
5. **UX числових полів** (`f64a464`, `8e5fced`) — Плейсхолдери замість 0, очищення при фокусі
6. **Помилка типу TypeScript** (`daa0f5c`) — Тип ExpenseRow.amount дозволяє рядок
7. **CRUD для інших витрат** (`2bdec24`) — Додано відсутні ендпоінти бекенду для вкладки "Інші витрати" + виправлено баг збереження fixedModal

### Додані функції
1. **Експорт в Excel** (`ca54b0c`, `12a2589`, `98ec7ab`) — Повний експорт послуг з розрахунками + матеріали
2. **Преміальна дизайн-система** (`71c04dd`, `2e7a4fd`) — 3D hover-ефекти, glow-анімації, світла тема
3. **Сторінка налаштувань** (`975db36`) — Профіль переміщено в Налаштування як секції, що згортаються
4. **Мобільний UX** (`ec469d6`) — Горизонтально прокручувана нижня навігація
5. **Дашборд** (`f92b9cc`) — Інсайти, що згортаються (показуються лише заголовки, розгортаються при натисканні)
6. **Ребрендинг** (`8ebbfae`) — Перейменовано з "Pepelyashko" на "MedFlow" по всьому додатку
7. **Пошук і сортування** (`b73297a`) — Сортування всіх стовпців послуг + пошук за матеріалами

### Виправлення деплойменту на Railway
1. Бекенд `Dockerfile` тепер використовує `entrypoint.sh` (правильна обробка PID 1 через `exec`, fallback якщо міграції не вдалися)
2. Фронтенд `Dockerfile.prod` використовує `envsubst` для динамічних PORT та BACKEND_URL
3. Шаблон `nginx.conf` використовує змінні `${PORT}` та `${BACKEND_URL}`
4. Обидва конфіги `railway.toml` мають політики перезапуску та перевірки здоров'я
5. Бекенд `config.py` автоматично конвертує `postgres://` → `postgresql+asyncpg://` для Railway

---

## Поточна конфігурація Railway

### Бекенд (`backend/railway.toml`)
```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 120
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 5
```

### Фронтенд (`frontend/railway.toml`)
```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile.prod"

[deploy]
healthcheckPath = "/"
healthcheckTimeout = 120
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 5
```

### Необхідні змінні середовища Railway

| Змінна | Сервіс | Опис |
|--------|--------|------|
| `DATABASE_URL` | Бекенд | Автоматично підставляється плагіном Railway PostgreSQL |
| `SECRET_KEY` | Бекенд | Ключ підпису JWT (згенеруйте надійний випадковий рядок!) |
| `PORT` | Обидва | Автоматично підставляється Railway |
| `BACKEND_URL` | Фронтенд | Внутрішня Railway URL бекенд-сервісу (напр., `http://backend.railway.internal:8000`) |
| `ANTHROPIC_API_KEY` | Бекенд | Для функції AI-консультанта (необов'язково) |
| `SMTP_HOST` | Бекенд | Поштовий сервер (необов'язково, без нього — автоверифікація) |
| `SMTP_PORT` | Бекенд | Порт пошти (за замовчуванням: 587) |
| `SMTP_USER` | Бекенд | Ім'я користувача пошти |
| `SMTP_PASSWORD` | Бекенд | Пароль пошти |
| `SMTP_FROM` | Бекенд | Адреса відправника |
| `FRONTEND_URL` | Бекенд | Публічна URL фронтенду (для посилань у листах) |

---

## Структура проекту (ключові файли)

```
Pepelyashko2026/
├── docker-compose.yml              # Локальна розробка (3 сервіси: db, backend, frontend)
├── DEPLOY.md                       # 400+ рядків інструкцій з деплойменту (Windows/PowerShell)
├── README.md                       # Огляд проекту
├── NEXT_SESSION_SUMMARY.md         # Цей файл
│
├── backend/
│   ├── Dockerfile                  # Production-образ (Python 3.12-slim)
│   ├── railway.toml                # Конфіг Railway
│   ├── entrypoint.sh               # Запуск: міграції → uvicorn (з exec для PID 1)
│   ├── requirements.txt            # 35 Python-залежностей (FastAPI, SQLAlchemy, Alembic тощо)
│   ├── alembic.ini                 # Конфіг міграцій БД
│   ├── .env.example                # Шаблон змінних середовища
│   ├── app/
│   │   ├── main.py                 # Точка входу FastAPI-додатку
│   │   ├── api/routes/             # 13 модулів API-маршрутів
│   │   ├── core/config.py          # Pydantic Settings (автоконвертація DATABASE_URL)
│   │   ├── models/                 # SQLAlchemy моделі
│   │   ├── schemas/                # Pydantic схеми
│   │   └── services/               # Бізнес-логіка
│   └── alembic/versions/           # 6 міграцій БД
│
├── frontend/
│   ├── Dockerfile                  # Dev-образ (Node 20 Alpine + Vite HMR)
│   ├── Dockerfile.prod             # Multi-stage: збірка Node → Nginx (envsubst для PORT)
│   ├── railway.toml                # Конфіг Railway
│   ├── nginx.conf                  # Шаблон з ${PORT} та ${BACKEND_URL}
│   ├── package.json                # React 18, Vite 6, Tailwind 3, Radix UI, Recharts, XLSX
│   └── src/
│       ├── App.tsx                 # Головний додаток з маршрутизацією
│       ├── pages/                  # 10+ компонентів сторінок
│       ├── components/             # UI-компоненти (на базі shadcn/ui)
│       └── api/client.ts           # HTTP-клієнт Axios
```

---

## Огляд API-маршрутів

| Модуль маршруту | Префікс | Опис |
|----------------|---------|------|
| auth | `/api/auth/` | Реєстрація, вхід, підтвердження email |
| incomes | `/api/incomes/` | CRUD доходів |
| expenses | `/api/expenses/` | CRUD постійних/змінних витрат |
| monthly_expenses | `/api/monthly-expenses/` | CRUD щомісячних інших витрат |
| taxes | `/api/taxes/` | Розрахунок податків |
| reports | `/api/reports/` | Фінансові звіти та експорт в Excel |
| nhsu | `/api/nhsu/` | Калькулятор капітації НСЗУ |
| services | `/api/services/` | Каталог медичних послуг |
| staff | `/api/staff/` | Управління персоналом |
| budget | `/api/budget/` | Планування бюджету |
| revenue | `/api/revenue/` | Відстеження доходів |
| monthly_services | `/api/monthly-services/` | Дані щомісячних послуг |
| monthly_expenses_data | `/api/monthly-expenses-data/` | Агрегація щомісячних витрат |
| ai_consultant | `/api/ai-consultant/` | AI-фінансовий консультант |
| health | `/api/health` | Перевірка здоров'я → `{"status": "ok"}` |

---

## База даних

- **Движок**: PostgreSQL 16 Alpine
- **ORM**: SQLAlchemy 2.0.36 (асинхронний через asyncpg)
- **Міграції**: Alembic (6 версій)
- **Автозапуск**: `entrypoint.sh` виконує `alembic upgrade head` перед запуском сервера
- **Ключові моделі**: User, Income, Expense, MonthlyService, MonthlyOtherExpense, Service, Staff, NhsuSettings

---

## Пріоритетні завдання для наступної сесії

### Високий пріоритет
1. **GitHub Actions CI/CD** — Наразі немає автоматизованого пайплайну. Додати workflow для:
   - Лінтинг + перевірка типів на PR
   - Верифікація збірки
   - Railway деплоїть автоматично при push в main (через GitHub інтеграцію)
   - ~~Fly.io workflow видалено~~ (виконано)
2. **Production SECRET_KEY** — Наразі використовується значення за замовчуванням `"change-me-in-production"`
3. **CORS** — Наразі обмежено до `["https://medflow.live"]` (встановлено через `CORS_ORIGINS` env var)

### Середній пріоритет
4. **Стратегія резервного копіювання БД** — Немає механізму бекапів для Railway PostgreSQL
5. **Моніторинг помилок** — Немає інтеграції з Sentry чи сервісом логування
6. **Error boundaries фронтенду** — Відсутні React error boundaries для коректної обробки збоїв
7. **Обмеження частоти запитів API** — Немає rate limiting на ендпоінтах авторизації

### Низький пріоритет
8. **Очищення застарілих файлів** — `server.py`, `server_old.py`, стара директорія auth/ досі в бекенді (виключені з Docker-образу через .dockerignore)
9. **Покриття тестами** — Директорія `tests/` існує, але порожня (лише `__init__.py`)
10. **Документація** — API-документація окрім автогенерованої Swagger

---

## Відомі проблеми

1. **CORS** — Обмежено до `["https://medflow.live"]` (налаштовується через `CORS_ORIGINS` env var)
2. **Немає тестів** — Жодного автоматизованого тесту
3. **Застарілі файли в бекенді** — `server.py`, `server_old.py`, старий код MongoDB не видалено (виключені з Docker через .dockerignore)
4. **Директорії для генерованих файлів** — `generated_acts/`, `generated_contracts/` тощо потребують постійного сховища на Railway (volumes)
5. **Жорстко заданий DATABASE_URL в docker-compose** — Впливає лише на локальну розробку, Railway підставляє свій

---

## Швидкий старт (локальна розробка)

```bash
# Клонування та запуск
git clone https://github.com/vichkanovanatalia71-eng/Pepelyashko2026.git
cd Pepelyashko2026
docker compose up --build

# Доступ
# Фронтенд: http://localhost:5173
# API бекенду: http://localhost:8000/docs
# Перевірка здоров'я: http://localhost:8000/api/health

# Зареєструвати тестового користувача через Swagger UI на /docs → POST /api/auth/register
```

---

## Чек-лист деплойменту на Railway

- [ ] Створити проект Railway з 2 сервісами (бекенд + фронтенд) + плагін PostgreSQL
- [ ] Встановити `BACKEND_URL` на фронтенд-сервісі = внутрішня Railway URL бекенду
- [ ] Встановити `SECRET_KEY` на бекенд-сервісі (згенерувати надійний випадковий ключ)
- [ ] Встановити `ANTHROPIC_API_KEY`, якщо потрібен AI-консультант
- [ ] Налаштувати SMTP-змінні, якщо потрібна верифікація email
- [ ] Встановити `FRONTEND_URL` на бекенді = публічна Railway URL фронтенду
- [ ] Перевірити що health checks проходять: бекенд `/api/health`, фронтенд `/`
- [ ] Протестувати потік входу/реєстрації від початку до кінця
