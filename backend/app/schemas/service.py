from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class MaterialItem(BaseModel):
    """Один рядок матеріалу у складі послуги."""

    name: str = ""
    unit: str = ""
    quantity: float = 0.0
    cost: float = 0.0  # загальна вартість цього матеріалу


class ServiceCreate(BaseModel):
    code: str
    name: str
    price: float
    materials: list[MaterialItem] = []


class ServiceUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    materials: Optional[list[MaterialItem]] = None


class ServiceResponse(BaseModel):
    id: int
    code: str
    name: str
    price: float
    materials: list[MaterialItem]

    # Автоматично розраховані фінансові поля
    total_materials_cost: float
    ep_amount: float       # Єдиний податок
    vz_amount: float       # Військовий збір
    total_costs: float     # Витрати + ЄП + ВЗ
    net_income: float      # Ціна - Сумарні витрати
    doctor_income: float   # Чистий дохід / 2
    org_income: float      # Чистий дохід / 2

    model_config = {"from_attributes": True}


# ── Масові операції ──────────────────────────────────────────────────


class BulkDeleteRequest(BaseModel):
    ids: list[int]


class BulkPriceChangeRequest(BaseModel):
    ids: list[int]
    percent: float  # +10 = підвищення на 10%, -5 = зниження на 5%


class BulkExportRequest(BaseModel):
    ids: list[int]
