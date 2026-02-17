from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


# Статичні вікові групи (ключі та назви не змінюються)
AGE_GROUPS = [
    {"key": "0_5", "label": "від 0 до 5 років"},
    {"key": "6_17", "label": "від 6 до 17 років"},
    {"key": "18_39", "label": "від 18 до 39 років"},
    {"key": "40_64", "label": "від 40 до 64 років"},
    {"key": "65_plus", "label": "понад 65 років"},
]

AGE_GROUP_KEYS = [g["key"] for g in AGE_GROUPS]


class NhsuSettings(Base):
    """Налаштування НСЗУ для кожного користувача."""

    __tablename__ = "nhsu_settings"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_nhsu_settings_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)

    # Капітаційна ставка
    capitation_rate: Mapped[float] = mapped_column(Numeric(10, 2), default=1007.3)

    # Вікові коефіцієнти
    coeff_0_5: Mapped[float] = mapped_column(Numeric(6, 3), default=2.465)
    coeff_6_17: Mapped[float] = mapped_column(Numeric(6, 3), default=1.25)
    coeff_18_39: Mapped[float] = mapped_column(Numeric(6, 3), default=0.616)
    coeff_40_64: Mapped[float] = mapped_column(Numeric(6, 3), default=0.86)
    coeff_65_plus: Mapped[float] = mapped_column(Numeric(6, 3), default=1.3)

    # Податки (у відсотках, наприклад 5.0 = 5%)
    ep_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=5.0)  # Єдиний податок
    vz_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=5.0)  # Військовий збір

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def get_coefficient(self, age_group: str) -> float:
        mapping = {
            "0_5": self.coeff_0_5,
            "6_17": self.coeff_6_17,
            "18_39": self.coeff_18_39,
            "40_64": self.coeff_40_64,
            "65_plus": self.coeff_65_plus,
        }
        return float(mapping.get(age_group, 0))

    def get_coefficients_dict(self) -> dict[str, float]:
        return {
            "0_5": float(self.coeff_0_5),
            "6_17": float(self.coeff_6_17),
            "18_39": float(self.coeff_18_39),
            "40_64": float(self.coeff_40_64),
            "65_plus": float(self.coeff_65_plus),
        }


class NhsuRecord(Base):
    """Запис НСЗУ: дані по одному лікарю, одній віковій групі за місяць.
    Зберігає як ввід (patient_count, non_verified), так і знімок налаштувань
    (capitation_rate, age_coefficient, ep_rate, vz_rate) для історичності.
    """

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

    # Знімок налаштувань на момент збереження
    capitation_rate: Mapped[float] = mapped_column(Numeric(10, 2))
    age_group: Mapped[str] = mapped_column(String(20))  # "0_5", "6_17", ...
    age_coefficient: Mapped[float] = mapped_column(Numeric(6, 3))
    ep_rate: Mapped[float] = mapped_column(Numeric(5, 2))  # ЄП %
    vz_rate: Mapped[float] = mapped_column(Numeric(5, 2))  # ВЗ %

    # Щомісячний ввід
    patient_count: Mapped[int] = mapped_column(Integer)
    non_verified: Mapped[float] = mapped_column(Numeric(8, 1), default=0)

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
    def ep_amount(self) -> float:
        """Єдиний податок = сума × ЄП%"""
        return round(self.amount * float(self.ep_rate) / 100, 2)

    @property
    def vz_amount(self) -> float:
        """Військовий збір = сума × ВЗ%"""
        return round(self.amount * float(self.vz_rate) / 100, 2)

    @property
    def ep_vz_amount(self) -> float:
        """ЄП + ВЗ разом"""
        return round(self.ep_amount + self.vz_amount, 2)
