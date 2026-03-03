from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes import auth, incomes, expenses, taxes, reports, nhsu, user_settings, services, monthly_services, revenue, staff, budget, monthly_expenses
from app.core.config import settings

app = FastAPI(
    title="MedFlow API",
    description="Фінансовий менеджер для медичної практики ФОП",
    version="0.1.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(incomes.router, prefix="/api/incomes", tags=["incomes"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["expenses"])
app.include_router(taxes.router, prefix="/api/taxes", tags=["taxes"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(nhsu.router, prefix="/api/nhsu", tags=["nhsu"])
app.include_router(user_settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(services.router, prefix="/api/services", tags=["services"])
app.include_router(monthly_services.router, prefix="/api/monthly-services", tags=["monthly-services"])
app.include_router(revenue.router, prefix="/api/revenue", tags=["revenue"])
app.include_router(staff.router, prefix="/api/staff", tags=["staff"])
app.include_router(budget.router, prefix="/api/budget", tags=["budget"])
app.include_router(monthly_expenses.router, prefix="/api/monthly-expenses", tags=["monthly-expenses"])


@app.get("/")
async def root():
    return {
        "message": "MedFlow API v0.1.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health_check():
    """Lightweight health check that always responds 200 so Railway accepts the deploy.
    Database connectivity is tested opportunistically — a DB failure returns
    200 with degraded status instead of 503, keeping the container alive."""
    try:
        from app.db.session import async_session

        async with async_session() as db:
            await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {"status": "ok" if db_status == "connected" else "degraded", "db": db_status}
