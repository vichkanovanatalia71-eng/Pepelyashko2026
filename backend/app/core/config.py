from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Pepelyashko"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@db:5432/pepelyashko"

    # Auth
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Ukrainian FOP tax rates (3rd group, single tax)
    fop_tax_rate: float = 0.05  # 5% єдиний податок
    esv_monthly: float = 1760.00  # ЄСВ мінімальний (оновлюється щорічно)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
