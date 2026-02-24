"""Моделі для структурованих місячних витрат.

Блок 1 — постійні витрати (довільні записи з назвою, описом, сумою та прапорцем recurring).
Блок 2 — зарплатні витрати (по одному запису на (staff_member, рік, місяць)).
Блок 3 — інші витрати (довільні записи з назвою, сумою, категорією).
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Legacy mapping — used only for migrating old category_key data to name
FIXED_CATEGORY_NAMES: dict[str, str] = {
    "rent": "Оренда",
    "utilities": "Комунальні",
    "internet": "Інтернет",
    "phone": "Телефон",
    "bank": "Банківські послуги",
    "admin": "Адміністративні витрати",
    "other": "Інші витрати",
}


class MonthlyFixedExpense(Base):
    """Запис постійної витрати за місяць (довільна назва)."""

    __tablename__ = "monthly_fixed_expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)        # 1–12
    category_key: Mapped[str] = mapped_column(String(50))  # legacy / stable id for recurring
    name: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class MonthlySalaryExpense(Base):
    """Зарплатні дані по одному співробітнику за місяць."""

    __tablename__ = "monthly_salary_expenses"
    __table_args__ = (
        UniqueConstraint("user_id", "staff_member_id", "year", "month", name="uq_mse"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    staff_member_id: Mapped[int] = mapped_column(ForeignKey("staff_members.id"), index=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)        # 1–12

    # Основна зарплата
    brutto: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)

    # Доплата (до цільової суми на руки)
    has_supplement: Mapped[bool] = mapped_column(Boolean, default=False)
    target_net: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    # Для лікарів: індивідуальні доплати + флаг підтягування з платних послуг
    individual_bonus: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    paid_services_from_module: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class MonthlyOtherExpense(Base):
    """Довільна «інша витрата» за місяць (назва, опис, сума, категорія)."""

    __tablename__ = "monthly_other_expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)        # 1–12
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    category: Mapped[str] = mapped_column(String(50), default="general")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class MonthlyExpenseLock(Base):
    """Фіксація місяця — після блокування дані вимагають розблокування для редагування."""

    __tablename__ = "monthly_expense_locks"
    __table_args__ = (
        UniqueConstraint("user_id", "year", "month", name="uq_mel"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)   # 1–12
    locked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
