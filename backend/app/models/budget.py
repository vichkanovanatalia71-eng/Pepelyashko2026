from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BudgetRow(Base):
    """Рядок бюджетної таблиці — стаття витрат."""

    __tablename__ = "budget_rows"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    # Секція: "fixed" (постійні) | "variable" (змінні)
    section: Mapped[str] = mapped_column(String(20), default="fixed")

    # Підтип: "fixed" | "quasi_fixed" | "variable"
    sub_type: Mapped[str] = mapped_column(String(20), default="fixed")

    # Тип вводу: "manual" | "auto_formula" | "auto_module"
    input_type: Mapped[str] = mapped_column(String(20), default="manual")

    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(String(500), default="")

    # Порядок відображення
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    # Інформаційний рядок — не входить у «Всього витрат»
    is_info_row: Mapped[bool] = mapped_column(Boolean, default=False)

    # Системний рядок — не можна видалити користувачем
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)

    # Ключ формули (для auto_formula / auto_module рядків)
    # Приклади: "ep_tax", "vz_tax", "nhsu_lag", "esv_owner",
    #           "salary_brutto__42", "salary_esv__42", "salary_bonus__42", "salary_pdfo_info__42"
    formula_key: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Прив'язка до конкретного співробітника (для зарплатних блоків)
    staff_member_id: Mapped[int | None] = mapped_column(
        ForeignKey("staff_members.id"), nullable=True
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class BudgetCell(Base):
    """Значення комірки бюджетної таблиці для конкретного рядка / року / місяця.
    Зберігаються лише значення ручного вводу (manual рядки).
    Formula/module рядки обчислюються динамічно.
    """

    __tablename__ = "budget_cells"
    __table_args__ = (UniqueConstraint("row_id", "year", "month"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    row_id: Mapped[int] = mapped_column(ForeignKey("budget_rows.id"), index=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)  # 1–12
    value: Mapped[float | None] = mapped_column(Float, nullable=True)  # None = ще не заповнено
