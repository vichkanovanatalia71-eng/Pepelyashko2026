from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ShareReport(Base):
    """Тимчасова публічна сторінка звіту (TTL 30 днів)."""

    __tablename__ = "share_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    # Унікальний токен (URL-safe, 43+ символів)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    # Знімок фільтра та даних на момент генерації (для стабільного відображення)
    filter_snapshot: Mapped[dict] = mapped_column(JSONB)
    payload_snapshot: Mapped[dict] = mapped_column(JSONB)

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
