import os

from pydantic_settings import BaseSettings


def _resolve_database_url() -> str:
    """Railway injects DATABASE_URL as postgres:// — convert to asyncpg."""
    url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/pepelyashko")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


class Settings(BaseSettings):
    app_name: str = "Pepelyashko"
    debug: bool = False

    # Database
    database_url: str = _resolve_database_url()

    # Auth
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # CORS — Railway frontend proxies via nginx, so allow all origins
    cors_origins: list[str] = ["*"]

    # Ukrainian FOP tax rates (3rd group, single tax)
    fop_tax_rate: float = 0.05  # 5% єдиний податок
    esv_monthly: float = 1760.00  # ЄСВ мінімальний (оновлюється щорічно)

    # AI — Claude API key for image analysis
    anthropic_api_key: str = ""

    # Email / SMTP (для підтвердження реєстрації)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""       # напр. your@gmail.com
    smtp_password: str = ""   # пароль додатку Gmail або SMTP-пароль
    smtp_from: str = ""       # якщо не вказано — використовується smtp_user
    frontend_url: str = "http://localhost:5173"  # базова URL фронтенду

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
