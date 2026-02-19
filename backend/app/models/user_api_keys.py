from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserApiKeys(Base):
    """API ключі зовнішніх AI-сервісів для кожного користувача."""

    __tablename__ = "user_api_keys"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_api_keys_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)

    # Claude / Anthropic
    anthropic_key: Mapped[str | None] = mapped_column(String(512), nullable=True, default=None)

    # OpenAI / GPT
    openai_key: Mapped[str | None] = mapped_column(String(512), nullable=True, default=None)

    # xAI / Grok
    xai_key: Mapped[str | None] = mapped_column(String(512), nullable=True, default=None)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def mask(self, key: str | None) -> str | None:
        """Повертає маскований ключ: перші 10 символів + '...' + останні 4."""
        if not key:
            return None
        if len(key) <= 14:
            return "•" * len(key)
        return key[:10] + "..." + key[-4:]
