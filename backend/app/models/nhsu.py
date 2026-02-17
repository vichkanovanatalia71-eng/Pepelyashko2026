from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


AGE_GROUPS = [
    {"key": "0_5", "label": "від 0 до 5 років", "default_coefficient": 2.465},
    {"key": "6_17", "label": "від 6 до 17 років", "default_coefficient": 1.25},
    {"key": "18_39", "label": "від 18 до 39 років", "default_coefficient": 0.616},
    {"key": "40_64", "label": "від 40 до 64 років", "default_coefficient": 0.86},
    {"key": "65_plus", "label": "понад 65 років", "default_coefficient": 1.3},
]

AGE_GROUP_KEYS = [g["key"] for g in AGE_GROUPS]


class NhsuRecord(Base):
    """Запис НСЗУ: дані по одному лікарю, одній віковій групі за місяць."""

    __tablename__ = "nhsu_records"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "doctor_id", "year", "month", "age_group",
            name="uq_nhsu_record",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)  # 1-12
    capitation_rate: Mapped[float] = mapped_column(Numeric(10, 2))  # Капітаційна ставка
    age_group: Mapped[str] = mapped_column(String(20))  # "0_5", "6_17", ...
    age_coefficient: Mapped[float] = mapped_column(Numeric(6, 3))  # Віковий коефіцієнт
    patient_count: Mapped[int] = mapped_column(Integer)  # К-ть пацієнтів
    non_verified: Mapped[float] = mapped_column(Numeric(8, 1), default=0)  # Не верифіковані
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    @property
    def amount(self) -> float:
        """Сума = ставка × коефіцієнт × (пацієнти - не верифіковані) / 12"""
        return round(
            float(self.capitation_rate)
            * float(self.age_coefficient)
            * (int(self.patient_count) - float(self.non_verified))
            / 12,
            2,
        )

    @property
    def ep_vz(self) -> float:
        """ЄП+ВЗ = 6% від суми (ЄП 5% + ВЗ 1%)"""
        return round(self.amount * 0.06, 2)


class NhsuMonthlyExtra(Base):
    """Додаткові дані за місяць: ЄСВ, платні послуги тощо."""

    __tablename__ = "nhsu_monthly_extras"
    __table_args__ = (
        UniqueConstraint("user_id", "year", "month", name="uq_nhsu_monthly_extra"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)
    esv_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=1902.34)  # ЄСВ
    paid_services_amount: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0
    )  # Дохід за платні послуги
    owner_declaration_income: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0
    )  # Кошти власника за власні декларації
    owner_other_doctor_income: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0
    )  # Дохід власника від декларацій іншого лікаря
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
