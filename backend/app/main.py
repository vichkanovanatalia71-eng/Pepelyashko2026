from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, incomes, expenses, taxes, reports, nhsu, user_settings, services
from app.core.config import settings

app = FastAPI(
    title="Pepelyashko API",
    description="Фінансовий менеджер для медичної практики ФОП",
    version="0.1.0",
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


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
