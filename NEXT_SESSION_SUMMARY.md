# MedFlow (Pepelyashko) — Session Summary for Next Developer

## Project Overview

**MedFlow** — веб-додаток для управління фінансами медичної практики ФОП (Фізична Особа-Підприємець).

| Component | Stack | Port |
|-----------|-------|------|
| Backend | FastAPI + Uvicorn (Python 3.12) | 8000 |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS | 5173 (dev) / 3000 (prod/nginx) |
| Database | PostgreSQL 16 (Alpine) | 5432 |
| Deployment | Railway (2 services: backend + frontend) | Railway-assigned |

---

## What Was Completed (branch `claude/fix-railway-deployment-VhbPs`)

### Bug Fixes
1. **TypeScript build errors** (`c7cc926`) — Fixed TS errors in AiConsultantPage that broke Railway build
2. **AI consultant crash** (`444a5dd`) — Resolved AttributeError causing all AI queries to fail
3. **Services sorting** (`188fce6`, `61a7516`) — Natural numeric sort (1,2,3 not 1,10,2)
4. **Modal visibility on MacBook** (`444cc37`, `336bc38`) — Scrollable modals, proper z-index
5. **Numeric input UX** (`f64a464`, `8e5fced`) — Placeholders instead of 0, clear on focus
6. **TypeScript type error** (`daa0f5c`) — ExpenseRow.amount type allows string
7. **Other expenses CRUD** (`2bdec24`) — Missing backend endpoints for "Інші витрати" tab + fixed fixedModal save bug

### Features Added
1. **Excel export** (`ca54b0c`, `12a2589`, `98ec7ab`) — Full export for services with calculations + materials
2. **Premium design system** (`71c04dd`, `2e7a4fd`) — 3D hover effects, glow animations, light theme
3. **Settings page** (`975db36`) — Moved Profile into Settings as collapsible sections
4. **Mobile UX** (`ec469d6`) — Horizontally scrollable bottom navigation
5. **Dashboard** (`f92b9cc`) — Collapsible insights (show titles only, expand on click)
6. **Rebranding** (`8ebbfae`) — Renamed from "Pepelyashko" to "MedFlow" across the app
7. **Search & sort** (`b73297a`) — Services sort all columns + search by materials

### Railway Deployment Fixes
1. Backend `Dockerfile` now uses `entrypoint.sh` (proper PID 1 handling via `exec`, fallback if migrations fail)
2. Frontend `Dockerfile.prod` uses `envsubst` for dynamic PORT and BACKEND_URL
3. `nginx.conf` template uses `${PORT}` and `${BACKEND_URL}` variables
4. Both `railway.toml` configs have restart policies and health checks
5. Backend `config.py` auto-converts `postgres://` → `postgresql+asyncpg://` for Railway

---

## Current Railway Configuration

### Backend (`backend/railway.toml`)
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

### Frontend (`frontend/railway.toml`)
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

### Required Railway Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Backend | Auto-injected by Railway PostgreSQL plugin |
| `SECRET_KEY` | Backend | JWT signing key (generate a strong random string!) |
| `PORT` | Both | Auto-injected by Railway |
| `BACKEND_URL` | Frontend | Internal Railway URL of backend service (e.g., `http://backend.railway.internal:8000`) |
| `ANTHROPIC_API_KEY` | Backend | For AI consultant feature (optional) |
| `SMTP_HOST` | Backend | Email server (optional, auto-verify without it) |
| `SMTP_PORT` | Backend | Email port (default: 587) |
| `SMTP_USER` | Backend | Email username |
| `SMTP_PASSWORD` | Backend | Email password |
| `SMTP_FROM` | Backend | Sender email address |
| `FRONTEND_URL` | Backend | Public URL of frontend (for email links) |

---

## Project Structure (Key Files)

```
Pepelyashko2026/
├── docker-compose.yml              # Local dev (3 services: db, backend, frontend)
├── DEPLOY.md                       # 400+ lines deployment instructions (Windows/PowerShell)
├── README.md                       # Project overview
├── NEXT_SESSION_SUMMARY.md         # This file
│
├── backend/
│   ├── Dockerfile                  # Production image (Python 3.12-slim)
│   ├── railway.toml                # Railway config
│   ├── entrypoint.sh               # Startup: migrations → uvicorn (with exec for PID 1)
│   ├── requirements.txt            # 35 Python deps (FastAPI, SQLAlchemy, Alembic, etc.)
│   ├── alembic.ini                 # DB migration config
│   ├── .env.example                # Template for environment vars
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── api/routes/             # 13 API route modules
│   │   ├── core/config.py          # Pydantic Settings (auto-converts DATABASE_URL)
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── schemas/                # Pydantic schemas
│   │   └── services/               # Business logic
│   └── alembic/versions/           # 6 DB migrations
│
├── frontend/
│   ├── Dockerfile                  # Dev image (Node 20 Alpine + Vite HMR)
│   ├── Dockerfile.prod             # Multi-stage: Node build → Nginx (envsubst for PORT)
│   ├── railway.toml                # Railway config
│   ├── nginx.conf                  # Template with ${PORT} and ${BACKEND_URL}
│   ├── package.json                # React 18, Vite 6, Tailwind 3, Radix UI, Recharts, XLSX
│   └── src/
│       ├── App.tsx                 # Main app with routing
│       ├── pages/                  # 10+ page components
│       ├── components/             # UI components (shadcn/ui based)
│       └── api/client.ts           # Axios HTTP client
```

---

## API Routes Overview

| Route Module | Prefix | Description |
|-------------|--------|-------------|
| auth | `/api/auth/` | Registration, login, email verification |
| incomes | `/api/incomes/` | Income CRUD |
| expenses | `/api/expenses/` | Fixed/variable expense CRUD |
| monthly_expenses | `/api/monthly-expenses/` | Monthly other expenses CRUD |
| taxes | `/api/taxes/` | Tax calculation |
| reports | `/api/reports/` | Financial reports & Excel export |
| nhsu | `/api/nhsu/` | NHSU (National Health Service) capitation calculator |
| services | `/api/services/` | Medical services catalog |
| staff | `/api/staff/` | Staff management |
| budget | `/api/budget/` | Budget planning |
| revenue | `/api/revenue/` | Revenue tracking |
| monthly_services | `/api/monthly-services/` | Monthly services data |
| monthly_expenses_data | `/api/monthly-expenses-data/` | Monthly expenses aggregation |
| ai_consultant | `/api/ai-consultant/` | AI-powered financial advisor |
| health | `/api/health` | Health check → `{"status": "ok"}` |

---

## Database

- **Engine**: PostgreSQL 16 Alpine
- **ORM**: SQLAlchemy 2.0.36 (async via asyncpg)
- **Migrations**: Alembic (6 versions)
- **Auto-run**: `entrypoint.sh` runs `alembic upgrade head` before starting server
- **Key models**: User, Income, Expense, MonthlyService, MonthlyOtherExpense, Service, Staff, NhsuSettings

---

## Priority TODOs for Next Session

### High Priority
1. **GitHub Actions CI/CD** — Currently no automated pipeline. Add workflow for:
   - Lint + type check on PR
   - Build verification
   - Auto-deploy to Railway on merge to main/master
2. **Production SECRET_KEY** — Currently uses `"change-me-in-production"` default
3. **CORS tightening** — Currently `["*"]`, should restrict to Railway frontend URL in production

### Medium Priority
4. **Database backup strategy** — No backup mechanism for Railway PostgreSQL
5. **Error monitoring** — No Sentry/logging service integration
6. **Frontend error boundaries** — Missing React error boundaries for graceful failures
7. **API rate limiting** — No rate limiting on auth endpoints

### Low Priority
8. **Legacy file cleanup** — `server.py`, `server_old.py`, old auth/ directory still in backend
9. **Test coverage** — `tests/` directory exists but is empty (only `__init__.py`)
10. **Documentation** — API documentation beyond Swagger auto-docs

---

## Known Issues

1. **CORS is `["*"]`** — Works for dev/Railway but should be restricted for production security
2. **No test suite** — Zero automated tests
3. **Legacy files in backend** — `server.py`, `server_old.py`, old MongoDB code not removed
4. **Generated directories** — `generated_acts/`, `generated_contracts/`, etc. need persistent storage on Railway (volumes)
5. **Docker-compose hardcoded DATABASE_URL** — Only affects local dev, Railway injects its own

---

## Quick Start (Local Development)

```bash
# Clone and start
git clone https://github.com/vichkanovanatalia71-eng/Pepelyashko2026.git
cd Pepelyashko2026
docker compose up --build

# Access
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/docs
# Health: http://localhost:8000/api/health

# Register a test user via Swagger UI at /docs → POST /api/auth/register
```

---

## Railway Deployment Checklist

- [ ] Create Railway project with 2 services (backend + frontend) + PostgreSQL plugin
- [ ] Set `BACKEND_URL` on frontend service to backend's internal Railway URL
- [ ] Set `SECRET_KEY` on backend service (generate strong random key)
- [ ] Set `ANTHROPIC_API_KEY` if AI consultant is needed
- [ ] Configure SMTP vars if email verification is needed
- [ ] Set `FRONTEND_URL` on backend to frontend's public Railway URL
- [ ] Verify health checks pass: backend `/api/health`, frontend `/`
- [ ] Test login/registration flow end-to-end
