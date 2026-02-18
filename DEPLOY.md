# Розгортання Pepelyashko через Docker (Windows PowerShell)

## Передумови

### 1. Встановити Docker Desktop

Завантажити з: https://www.docker.com/products/docker-desktop/

Після встановлення:
- Перезавантажити комп'ютер
- Запустити Docker Desktop
- Дочекатися, поки зелений індикатор внизу покаже "Engine running"

Перевірка в PowerShell:
```powershell
docker --version
docker compose version
```

Очікуваний вивід:
```
Docker version 27.x.x, build ...
Docker Compose version v2.x.x
```

### 2. Встановити Git

Завантажити з: https://git-scm.com/download/win

Перевірка:
```powershell
git --version
```

---

## Крок 1: Клонувати репозиторій

```powershell
# Перейти в папку, де буде проект (наприклад, Робочий стіл)
cd ~\Desktop

# Клонувати репозиторій
git clone https://github.com/vichkanovanatalia71-eng/Pepelyashko2026.git

# Перейти в папку проекту
cd Pepelyashko2026
```

---

## Крок 2: Перевірити структуру

```powershell
# Переконатися, що є всі потрібні файли
Get-ChildItem

# Має бути:
#   docker-compose.yml
#   backend/
#   frontend/
#   README.md
```

---

## Крок 3: Запустити проект

```powershell
# Зібрати та запустити всі контейнери
docker compose up --build
```

**Що відбувається автоматично:**
1. Завантажується PostgreSQL 16
2. Створюється база даних `pepelyashko`
3. Встановлюються Python залежності бекенду
4. Запускаються міграції БД (створення таблиць)
5. Стартує FastAPI сервер
6. Встановлюються npm залежності фронтенду
7. Стартує Vite dev server

**Перший запуск займе 3-5 хвилин** (завантаження образів Docker).

Коли побачите рядок:
```
frontend-1  |   VITE v6.x.x  ready in xxx ms
frontend-1  |   ➜  Local:   http://localhost:5173/
```

**Все готово!**

---

## Крок 4: Відкрити у браузері

| Що | URL |
|----|-----|
| **Фронтенд (основний інтерфейс)** | http://localhost:5173 |
| **API документація (Swagger)** | http://localhost:8000/docs |
| **Health check API** | http://localhost:8000/api/health |

---

## Крок 5: Зареєструвати першого користувача

### Варіант A: Через Swagger UI

1. Відкрити http://localhost:8000/docs
2. Знайти `POST /api/auth/register`
3. Натиснути "Try it out"
4. Вставити JSON:
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

### Варіант B: Через PowerShell (curl)

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "email": "admin@example.com",
    "password": "admin123",
    "full_name": "Адмін Адмінович",
    "fop_group": 3,
    "tax_rate": 0.05
  }'
```

### Потім увійти на фронтенді

Відкрити http://localhost:5173 та ввести:
- Email: `admin@example.com`
- Пароль: `admin123`

---

## Повсякденне використання

### Запустити проект (після першого разу):
```powershell
cd ~\Desktop\Pepelyashko2026
docker compose up
```
> Без `--build` — швидше, бо використовує вже зібрані образи.

### Запустити у фоновому режимі (без логів у терміналі):
```powershell
docker compose up -d
```

### Подивитися логи конкретного сервісу:
```powershell
# Всі логи
docker compose logs

# Тільки бекенд
docker compose logs backend

# Тільки фронтенд (в реальному часі)
docker compose logs -f frontend

# Тільки база даних
docker compose logs db
```

### Зупинити проект:
```powershell
docker compose down
```

### Зупинити та ВИДАЛИТИ дані БД (повний скид):
```powershell
docker compose down -v
```
> `-v` видаляє volume з даними PostgreSQL. Наступний запуск почнеться з чистою БД.

---

## Розробка з hot-reload

Проект налаштований на **автоматичне перезавантаження** при зміні файлів:

- **Backend**: змінюєте `.py` файли у `backend/` → сервер перезапускається автоматично
- **Frontend**: змінюєте `.tsx/.ts/.css` файли у `frontend/src/` → сторінка оновлюється миттєво (HMR)

### Приклад робочого процесу:

```powershell
# Термінал 1: Запустити проект
docker compose up

# Термінал 2: Відкрити код у VS Code
code .
```

Тепер редагуйте файли в VS Code — зміни з'являться автоматично у браузері.

---

## Перебудувати контейнер після зміни залежностей

Якщо ви додали нову бібліотеку (pip install / npm install):

```powershell
# Перебудувати тільки бекенд
docker compose up --build backend

# Перебудувати тільки фронтенд
docker compose up --build frontend

# Перебудувати все
docker compose up --build
```

---

## Діагностика проблем

### Перевірити стан контейнерів:
```powershell
docker compose ps
```

Має показати 3 сервіси зі статусом "Up":
```
NAME              STATUS
db                Up (healthy)
backend           Up
frontend          Up
```

### Порт зайнятий (помилка "Address already in use"):
```powershell
# Знайти процес на порту 8000
netstat -ano | findstr :8000

# Завершити процес (замінити PID на знайдений)
taskkill /PID <PID> /F
```

### Контейнер падає одразу:
```powershell
# Подивитися логи конкретного контейнера
docker compose logs backend --tail 50
```

### Повний перезапуск з нуля:
```powershell
docker compose down -v
docker compose up --build
```

### Docker Desktop не запускається:
1. Переконатися, що WSL2 встановлений:
```powershell
wsl --install
```
2. Перезавантажити комп'ютер
3. Запустити Docker Desktop знову

---

## Структура сервісів

```
┌─────────────────────────────────────────────────┐
│  Docker Compose                                 │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ frontend │  │ backend  │  │     db       │  │
│  │ :5173    │─►│ :8000    │─►│ PostgreSQL   │  │
│  │ Vite+    │  │ FastAPI  │  │ :5432        │  │
│  │ React    │  │ Python   │  │              │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│                                                 │
│  Браузер ──► localhost:5173                     │
│              localhost:5173/api/* ──► :8000      │
└─────────────────────────────────────────────────┘
```

**Frontend** проксює всі `/api/*` запити на **Backend** через Vite proxy.
