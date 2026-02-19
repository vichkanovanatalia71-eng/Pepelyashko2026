from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MonthlyPaidServicesReport(Base):
    """Звіт про платні послуги за місяць для конкретного лікаря."""

    __tablename__ = "monthly_paid_services_reports"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "doctor_id", "year", "month",
            name="uq_mps_report",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True)

    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)   # 1–12

    cash_in_register: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    # draft → final
    status: Mapped[str] = mapped_column(String(10), default="draft")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class MonthlyPaidServiceEntry(Base):
    """Кількість конкретної послуги у звіті за місяць."""

    __tablename__ = "monthly_paid_service_entries"
    __table_args__ = (
        UniqueConstraint("report_id", "service_id", name="uq_mps_entry"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("monthly_paid_services_reports.id", ondelete="CASCADE"),
        index=True,
    )
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
