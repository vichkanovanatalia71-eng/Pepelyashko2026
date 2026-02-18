# Розгортання Pepelyashko через PowerShell + Docker

Покрокова інструкція для запуску проекту на Windows.

---

## Зміст

1. [Огляд проекту та структура файлів](#1-огляд-проекту-та-структура-файлів)
2. [Передумови — що потрібно встановити](#2-передумови--що-потрібно-встановити)
3. [Клонування та підготовка](#3-клонування-та-підготовка)
4. [Запуск через Docker](#4-запуск-через-docker)
5. [Перевірка роботи](#5-перевірка-роботи)
6. [Реєстрація та вхід](#6-реєстрація-та-вхід)
7. [Повсякденна робота](#7-повсякденна-робота)
8. [Розробка з hot-reload](#8-розробка-з-hot-reload)
9. [Робота з базою даних](#9-робота-з-базою-даних)
10. [Діагностика проблем](#10-діагностика-проблем)

---

## 1. Огляд проекту та структура файлів

Pepelyashko — веб-додаток для управління фінансами медичної практики ФОП.

### Які файли відповідають за що

```
Pepelyashko2026/
│
├── docker-compose.yml          ← ГОЛОВНИЙ файл для запуску всього проекту
├── README.md                   ← Загальний опис проекту
├── DEPLOY.md                   ← Ця інструкція
│
├── backend/                    ← БЕКЕНД (серверна частина)
│   ├── Dockerfile              ← Інструкція для збірки Docker-образу бекенду
│   ├── entrypoint.sh           ← Скрипт запуску: чекає БД → міграції → сервер
│   ├── requirements.txt        ← Список Python-бібліотек
│   ├── alembic.ini             ← Налаштування міграцій БД
│   ├── .env.example            ← Шаблон змінних оточення
│   ├── .dockerignore           ← Файли, які Docker ігнорує при збірці
│   │
│   ├── app/                    ← ОСНОВНИЙ КОД БЕКЕНДУ (FastAPI + PostgreSQL)
│   │   ├── main.py             ← Точка входу FastAPI-додатку
│   │   ├── api/routes/         ← API ендпоінти (auth, incomes, expenses, taxes, nhsu, reports)
│   │   ├── core/               ← Конфігурація, безпека, залежності
│   │   ├── db/                 ← Підключення до PostgreSQL
│   │   ├── models/             ← SQLAlchemy моделі (таблиці БД)
│   │   ├── schemas/            ← Pydantic схеми (валідація даних)
│   │   └── services/           ← Бізнес-логіка
│   │
│   ├── alembic/                ← Міграції бази даних
│   │   └── versions/           ← Файли міграцій
│   │
│   │   ──────── ДОДАТКОВІ ФАЙЛИ (legacy/утиліти) ────────
│   │
│   ├── server.py               ← Стара версія сервера (MongoDB), НЕ використовується
│   ├── server_old.py           ← Ще старіша версія сервера, НЕ використовується
│   ├── auth/                   ← Стара авторизація (Google OAuth), НЕ використовується
│   ├── services/               ← Старі PDF-сервіси для документів
│   ├── templates/              ← HTML-шаблони для генерації документів
│   │
│   ├── *_service.py            ← Сервіси генерації документів (акти, рахунки, договори)
│   ├── *_template.html         ← HTML-шаблони для PDF
│   ├── contract_template.docx  ← Word-шаблон договору
│   │
│   ├── generated_acts/         ← Згенеровані PDF актів
│   ├── generated_contracts/    ← Згенеровані PDF договорів
│   ├── generated_documents/    ← Згенеровані PDF документів
│   ├── generated_invoices/     ← Згенеровані PDF рахунків
│   ├── generated_orders/       ← Згенеровані PDF замовлень
│   └── uploads/                ← Завантажені файли користувачів
│
├── frontend/                   ← ФРОНТЕНД (клієнтська частина)
│   ├── Dockerfile              ← Інструкція для збірки Docker-образу фронтенду
│   ├── index.html              ← HTML-точка входу
│   ├── package.json            ← Список npm-залежностей
│   ├── package-lock.json       ← Lock-файл npm (точні версії)
│   ├── tsconfig.json           ← Налаштування TypeScript
│   ├── tailwind.config.js      ← Налаштування Tailwind CSS
│   ├── vite.config.ts          ← Налаштування Vite (збирач)
│   ├── postcss.config.js       ← PostCSS для Tailwind
│   ├── components.json         ← Конфіг shadcn/ui (бібліотека UI компонентів)
│   ├── .dockerignore           ← Файли, які Docker ігнорує
│   │
│   ├── craco.config.js         ← Стара конфігурація (Create React App), НЕ використовується
│   ├── jsconfig.json           ← Стара JS-конфігурація, НЕ використовується
│   │
│   └── src/                    ← ВИХІДНИЙ КОД ФРОНТЕНДУ
│       ├── main.tsx            ← Точка входу React-додатку
│       ├── App.tsx             ← Головний компонент з маршрутизацією
│       ├── index.css           ← Глобальні стилі + Tailwind
│       │
│       ├── pages/              ← Сторінки додатку
│       │   ├── Dashboard.tsx       ← Головна панель (огляд фінансів)
│       │   ├── LoginPage.tsx       ← Сторінка входу
│       │   ├── IncomesPage.tsx     ← Облік доходів
│       │   ├── ExpensesPage.tsx    ← Облік витрат
│       │   ├── TaxesPage.tsx       ← Розрахунок податків
│       │   └── NhsuPage.tsx        ← Калькулятор НСЗУ (капітація)
│       │
│       ├── components/
│       │   ├── Layout.tsx          ← Бокове меню + навігація
│       │   ├── ui/                 ← shadcn/ui компоненти (button, dialog, table...)
│       │   ├── dialogs/            ← Модальні вікна документів
│       │   ├── documents/          ← Списки документів
│       │   ├── comments/           ← Коментарі
│       │   └── templates/          ← Редактор шаблонів
│       │
│       ├── api/client.ts           ← HTTP-клієнт (axios)
│       ├── hooks/useAuth.tsx       ← Хук авторизації
│       ├── types/index.ts          ← TypeScript типи
│       ├── contexts/               ← React контексти (стара версія, не використовується)
│       ├── lib/utils.jsx           ← Утиліти для UI компонентів
│       └── theme/                  ← Теми документів
│
└── tests/                      ← Тести
    └── __init__.py
```

### Важливо знати

- **Папка `backend/app/`** — це основний бекенд (FastAPI + PostgreSQL). Саме він запускається в Docker.
- **Файли `server.py`, `server_old.py`** — це старі версії сервера на MongoDB. Вони **НЕ запускаються** і **НЕ впливають** на роботу проекту.
- **Файли `*_service.py` в корені `backend/`** — сервіси генерації PDF-документів. Вони поки не підключені до основного додатку.
- **Папки `generated_*/`** — містять раніше згенеровані PDF-файли. Docker зберігає їх у окремих volumes.
- **Папки `uploads/`** — для завантажених файлів. Теж зберігається в Docker volume.

---

## 2. Передумови — що потрібно встановити

### 2.1. Docker Desktop

**Завантажити:** https://www.docker.com/products/docker-desktop/

Встановлення:
```powershell
# 1. Завантажити та встановити Docker Desktop
# 2. При встановленні обрати "Use WSL 2 instead of Hyper-V" (рекомендовано)
# 3. Перезавантажити комп'ютер після встановлення
# 4. Запустити Docker Desktop з меню Пуск
# 5. Дочекатися зеленого індикатора "Engine running" внизу вікна
```

Перевірка в PowerShell (відкрити PowerShell від адміністратора):
```powershell
docker --version
# Очікувано: Docker version 27.x.x, build ...

docker compose version
# Очікувано: Docker Compose version v2.x.x
```

> **Якщо `docker` не знайдено:** перезавантажте комп'ютер та запустіть Docker Desktop. Переконайтеся, що Docker Desktop працює (іконка в треї).

### 2.2. Git

**Завантажити:** https://git-scm.com/download/win

При встановленні залишити всі налаштування за замовчуванням.

Перевірка:
```powershell
git --version
# Очікувано: git version 2.x.x
```

### 2.3. (Опціонально) Visual Studio Code

**Завантажити:** https://code.visualstudio.com/

Рекомендовані розширення:
- Docker
- Python
- ES7+ React/Redux/React-Native snippets

---

## 3. Клонування та підготовка

### 3.1. Відкрити PowerShell

Натиснути `Win + X` → вибрати "Terminal" або "PowerShell".

### 3.2. Обрати папку для проекту

```powershell
# Варіант 1: Робочий стіл
cd $HOME\Desktop

# Варіант 2: Папка Документи
cd $HOME\Documents

# Варіант 3: Корінь диску D
cd D:\
```

### 3.3. Клонувати репозиторій

```powershell
git clone https://github.com/vichkanovanatalia71-eng/Pepelyashko2026.git
```

> **Якщо ви вже маєте папку проекту** (наприклад, отримали як ZIP-архів):
> ```powershell
> # Просто перейдіть в неї
> cd C:\шлях\до\папки\Pepelyashko2026
> ```

### 3.4. Перейти в папку проекту

```powershell
cd Pepelyashko2026
```

### 3.5. Перевірити вміст

```powershell
Get-ChildItem
```

Має бути щось подібне:
```
Mode    Name
----    ----
d-----  backend
d-----  frontend
d-----  tests
-a----  docker-compose.yml
-a----  README.md
-a----  DEPLOY.md
-a----  .gitignore
```

> **Можуть бути й інші файли/папки** (`.emergent/`, `.screenshots/` тощо) — це нормально, вони не впливають на роботу.

---

## 4. Запуск через Docker

### 4.1. Переконатися, що Docker Desktop запущено

```powershell
docker info | Select-String "Server Version"
# Очікувано: Server Version: 27.x.x
```

Якщо бачите помилку "Cannot connect to the Docker daemon":
```powershell
# Запустіть Docker Desktop з меню Пуск та зачекайте 30 секунд
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
Start-Sleep -Seconds 30
```

### 4.2. Перший запуск (збірка + старт)

```powershell
docker compose up --build
```

**Що відбувається автоматично (в такому порядку):**

```
1. [db]       Завантажується образ PostgreSQL 16
2. [db]       Створюється база даних "pepelyashko"
3. [db]       PostgreSQL стартує та проходить healthcheck
4. [backend]  Завантажується образ Python 3.12
5. [backend]  Встановлюються залежності (pip install)
6. [backend]  entrypoint.sh чекає, поки БД буде готова
7. [backend]  Запускаються міграції Alembic (CREATE TABLE...)
8. [backend]  Стартує FastAPI сервер на порту 8000
9. [frontend] Завантажується образ Node.js 20
10.[frontend] Встановлюються npm залежності (npm ci)
11.[frontend] Стартує Vite dev server на порту 5173
```

**Перший запуск займе 3-7 хвилин** (залежно від швидкості інтернету).

### 4.3. Як зрозуміти, що все готово

В терміналі побачите послідовно:

```
db-1        | database system is ready to accept connections
backend-1   | ✅ PostgreSQL is ready
backend-1   | 🔄 Running database migrations...
backend-1   | INFO  [alembic.runtime.migration] Running upgrade -> d22ac519fddb
backend-1   | 🚀 Starting backend server...
backend-1   | INFO:     Uvicorn running on http://0.0.0.0:8000
frontend-1  |   VITE v6.x.x  ready in xxx ms
frontend-1  |   ➜  Local:   http://localhost:5173/
```

**Коли побачите останній рядок — все працює!**

> **Не закривайте це вікно PowerShell!** Воно показує логи в реальному часі. Для роботи відкрийте **другий термінал** (Ctrl + Shift + T або нове вікно PowerShell).

---

## 5. Перевірка роботи

### 5.1. В новому вікні PowerShell:

```powershell
# Перевірка бекенду
Invoke-RestMethod -Uri "http://localhost:8000/api/health"
# Очікувано: status: ok

# Перевірка фронтенду
(Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing).StatusCode
# Очікувано: 200

# Стан контейнерів
docker compose ps
# Очікувано: 3 контейнери зі статусом "Up"
```

### 5.2. Відкрити в браузері

| Що | URL | Опис |
|----|-----|------|
| Фронтенд | http://localhost:5173 | Основний інтерфейс додатку |
| Swagger UI | http://localhost:8000/docs | Інтерактивна документація API |
| ReDoc | http://localhost:8000/redoc | Альтернативна документація API |
| Health check | http://localhost:8000/api/health | Перевірка стану сервера |

---

## 6. Реєстрація та вхід

### 6.1. Зареєструвати користувача

**Варіант A — через Swagger UI (рекомендовано для першого разу):**

1. Відкрити http://localhost:8000/docs
2. Знайти розділ **auth** → `POST /api/auth/register`
3. Натиснути "Try it out"
4. В поле Request body вставити:

```json
{
  "email": "admin@example.com",
  "password": "admin123",
  "full_name": "Адмін Адмінович",
  "fop_group": 3,
  "tax_rate": 0.05
}
```

5. Натиснути "Execute"
6. Побачити відповідь з `"id": 1` — користувач створений!

**Варіант B — через PowerShell:**

```powershell
$body = @{
    email     = "admin@example.com"
    password  = "admin123"
    full_name = "Адмін Адмінович"
    fop_group = 3
    tax_rate  = 0.05
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### 6.2. Увійти на фронтенді

1. Відкрити http://localhost:5173
2. Ввести:
   - **Email:** `admin@example.com`
   - **Пароль:** `admin123`
3. Натиснути "Увійти"
4. Потрапити на Дашборд

### 6.3. Параметри реєстрації

| Поле | Опис | Приклад |
|------|------|---------|
| `email` | Email для входу | `doctor@clinic.ua` |
| `password` | Пароль (мін. 6 символів) | `MyPassword123` |
| `full_name` | Повне ім'я ФОП | `Петренко Олена Іванівна` |
| `fop_group` | Група ФОП (1, 2 або 3) | `3` |
| `tax_rate` | Ставка єдиного податку | `0.05` (5%) |

---

## 7. Повсякденна робота

### Запустити проект (контейнери вже зібрані):
```powershell
cd $HOME\Desktop\Pepelyashko2026
docker compose up
```

### Запустити у фоновому режимі (без логів у терміналі):
```powershell
docker compose up -d
```

### Подивитися логи:
```powershell
# Всі сервіси
docker compose logs

# Конкретний сервіс в реальному часі
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Останні 50 рядків бекенду
docker compose logs --tail 50 backend
```

### Перевірити стан контейнерів:
```powershell
docker compose ps
```

Очікуваний вивід:
```
NAME                     STATUS              PORTS
pepelyashko2026-db-1     Up (healthy)        0.0.0.0:5432->5432/tcp
pepelyashko2026-backend-1  Up                0.0.0.0:8000->8000/tcp
pepelyashko2026-frontend-1 Up                0.0.0.0:5173->5173/tcp
```

### Зупинити проект:
```powershell
# Зупинити (дані БД зберігаються)
docker compose down

# Зупинити + видалити ВСІ дані (БД, документи, uploads)
docker compose down -v
```

### Перезапустити один сервіс:
```powershell
# Перезапустити тільки бекенд
docker compose restart backend

# Перезапустити тільки фронтенд
docker compose restart frontend
```

---

## 8. Розробка з hot-reload

Проект налаштований для зручної розробки — зміни в коді автоматично підхоплюються.

### Як це працює

| Що змінюєте | Що відбувається | Час |
|-------------|-----------------|-----|
| `backend/**/*.py` | Backend перезапускається (uvicorn --reload) | 1-2 сек |
| `frontend/src/**/*.tsx` | Сторінка оновлюється миттєво (Vite HMR) | <1 сек |
| `frontend/src/**/*.css` | Стилі оновлюються миттєво | <1 сек |
| `backend/requirements.txt` | Потрібно перебудувати: `docker compose up --build backend` | 1-2 хв |
| `frontend/package.json` | Потрібно перебудувати: `docker compose up --build frontend` | 1-2 хв |

### Рекомендований робочий процес

```powershell
# Термінал 1: Запустити проект
docker compose up

# Термінал 2: Відкрити VS Code
code .
```

Тепер редагуйте файли в VS Code. Зміни автоматично з'являтимуться у браузері.

### Додати нову Python-бібліотеку:
```powershell
# 1. Додайте бібліотеку в backend/requirements.txt
# 2. Перебудуйте бекенд
docker compose up --build backend
```

### Додати нову npm-бібліотеку:
```powershell
# 1. Додайте в frontend/package.json
# 2. Перебудуйте фронтенд
docker compose up --build frontend
```

### Або встановити напряму в контейнер:
```powershell
# Python бібліотека
docker compose exec backend pip install requests

# npm пакет
docker compose exec frontend npm install chart.js
```

> Пам'ятайте: встановлення через `exec` діє тільки до перебудови контейнера. Для постійного ефекту додайте в `requirements.txt` або `package.json`.

---

## 9. Робота з базою даних

### Підключитися до PostgreSQL з PowerShell:
```powershell
docker compose exec db psql -U postgres -d pepelyashko
```

### Корисні SQL-команди:
```sql
-- Подивитися таблиці
\dt

-- Подивитися користувачів
SELECT id, email, full_name, fop_group FROM users;

-- Подивитися доходи
SELECT * FROM incomes ORDER BY date DESC LIMIT 10;

-- Подивитися витрати
SELECT * FROM expenses ORDER BY date DESC LIMIT 10;

-- Вийти з psql
\q
```

### Виконати міграції вручну:
```powershell
docker compose exec backend alembic upgrade head
```

### Створити нову міграцію (після зміни моделей):
```powershell
docker compose exec backend alembic revision --autogenerate -m "add_new_field"
```

### Повний скид БД:
```powershell
# Зупинити та видалити volume БД
docker compose down -v

# Запустити знову (міграції створять таблиці з нуля)
docker compose up
```

---

## 10. Діагностика проблем

### Проблема: "Cannot connect to the Docker daemon"

```powershell
# Docker Desktop не запущений. Запустіть його:
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Зачекайте 30-60 секунд і спробуйте знову
Start-Sleep -Seconds 30
docker compose up --build
```

Якщо Docker Desktop не встановлюється:
```powershell
# Переконайтеся, що WSL2 встановлений
wsl --install

# Перезавантажте комп'ютер та спробуйте знову
```

### Проблема: "port is already allocated" або "Address already in use"

Порт зайнятий іншим процесом.

```powershell
# Знайти, що займає порт 8000
netstat -ano | findstr :8000

# Результат: TCP 0.0.0.0:8000 ... LISTENING 12345
#                                              ^^^^^ це PID

# Завершити процес
taskkill /PID 12345 /F

# Аналогічно для порту 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Тепер запустити знову
docker compose up
```

### Проблема: "backend exited with code 1"

```powershell
# Подивитися логи бекенду
docker compose logs backend --tail 100
```

Типові причини:
- БД ще не готова → зачекайте 10 секунд, бекенд перезапуститься
- Помилка в коді Python → дивіться traceback в логах
- Порт 5432 зайнятий локальним PostgreSQL → зупиніть його або змініть порт

### Проблема: "frontend exited with code 1"

```powershell
docker compose logs frontend --tail 100
```

Типові причини:
- Помилка в `package.json` → перевірте JSON синтаксис
- Конфлікт залежностей → `docker compose up --build frontend`

### Проблема: фронтенд відкривається, але білий екран

```powershell
# 1. Відкрити DevTools в браузері (F12) → Console → подивитися помилки

# 2. Перевірити, чи бекенд працює
Invoke-RestMethod -Uri "http://localhost:8000/api/health"

# 3. Перебудувати все з нуля
docker compose down -v
docker compose up --build
```

### Проблема: повільна робота Docker на Windows

```powershell
# Перевірити, що використовується WSL2 (не Hyper-V)
# Docker Desktop → Settings → General → "Use the WSL 2 based engine" має бути увімкнено

# Збільшити пам'ять для WSL2
# Створити файл C:\Users\<ваше ім'я>\.wslconfig з вмістом:
```

Створити файл `C:\Users\<ваше_ім'я>\.wslconfig`:
```ini
[wsl2]
memory=4GB
processors=2
```

Потім перезапустити WSL:
```powershell
wsl --shutdown
# Перезапустити Docker Desktop
```

### Проблема: "no space left on device"

```powershell
# Очистити невикористані Docker-ресурси
docker system prune -a --volumes

# Це видалить ВСІ невикористані образи, контейнери та volumes
# Після цього потрібно перебудувати: docker compose up --build
```

### Повний скид (якщо нічого не допомагає):

```powershell
# 1. Зупинити все та видалити дані
docker compose down -v --rmi all

# 2. Очистити Docker
docker system prune -a --volumes -f

# 3. Зібрати та запустити з нуля
docker compose up --build
```

---

## Структура Docker-сервісів

```
┌───────────────────────────────────────────────────────────┐
│  docker compose up                                        │
│                                                           │
│  ┌─────────────┐   ┌─────────────┐   ┌────────────────┐  │
│  │  frontend   │   │   backend   │   │      db        │  │
│  │  Node.js 20 │──►│  Python 3.12│──►│  PostgreSQL 16 │  │
│  │  Vite+React │   │  FastAPI    │   │                │  │
│  │  :5173      │   │  :8000      │   │  :5432         │  │
│  └─────────────┘   └─────────────┘   └────────────────┘  │
│        │                  │                   │           │
│        │                  │                   │           │
│   ./frontend/        ./backend/         postgres_data     │
│   (hot-reload)       (hot-reload)       (Docker volume)   │
│                           │                               │
│                    generated_*/  uploads/                  │
│                    (Docker volumes)                        │
└───────────────────────────────────────────────────────────┘

Браузер → http://localhost:5173      (фронтенд)
          http://localhost:5173/api/* (проксі → бекенд :8000)
          http://localhost:8000/docs  (Swagger документація)
```

### Де зберігаються дані

| Дані | Де зберігається | Як видалити |
|------|-----------------|-------------|
| База даних PostgreSQL | Docker volume `postgres_data` | `docker compose down -v` |
| Згенеровані PDF-документи | Docker volumes `backend_generated_*` | `docker compose down -v` |
| Завантажені файли | Docker volume `backend_uploads` | `docker compose down -v` |
| Вихідний код | Локальна папка проекту | Видалити папку |
| Docker-образи | Docker image cache | `docker system prune -a` |

---

## Корисні команди (шпаргалка)

```powershell
# ═══ ЗАПУСК ═══
docker compose up              # Запустити (з логами)
docker compose up -d           # Запустити у фоні
docker compose up --build      # Перебудувати та запустити

# ═══ ЗУПИНКА ═══
docker compose down            # Зупинити (дані зберігаються)
docker compose down -v         # Зупинити + видалити дані

# ═══ ЛОГИ ═══
docker compose logs            # Всі логи
docker compose logs -f backend # Логи бекенду (live)
docker compose logs --tail 50  # Останні 50 рядків

# ═══ СТАН ═══
docker compose ps              # Список контейнерів
docker compose top             # Процеси в контейнерах

# ═══ ВИКОНАТИ КОМАНДУ В КОНТЕЙНЕРІ ═══
docker compose exec backend bash           # Shell в бекенді
docker compose exec db psql -U postgres    # PostgreSQL CLI
docker compose exec frontend sh            # Shell в фронтенді

# ═══ ПЕРЕЗАПУСК ═══
docker compose restart backend             # Перезапустити бекенд
docker compose restart frontend            # Перезапустити фронтенд

# ═══ ПЕРЕВІРКА ═══
Invoke-RestMethod http://localhost:8000/api/health   # Health check
```
