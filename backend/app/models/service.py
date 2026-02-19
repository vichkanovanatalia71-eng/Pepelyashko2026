from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Service(Base):
    """Платна послуга для ФОП. Матеріали зберігаються як JSON-масив."""

    __tablename__ = "services"
    __table_args__ = (
        UniqueConstraint("user_id", "code", name="uq_service_user_code"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    # Основні поля
    code: Mapped[str] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(255))
    price: Mapped[float] = mapped_column(Numeric(12, 2))

    # Список матеріалів — [{name, unit, quantity, cost}, ...]
    materials: Mapped[list] = mapped_column(JSONB, default=list)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
