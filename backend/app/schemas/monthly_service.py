from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Запит / відповідь звіту ─────────────────────────────────────────


class EntryInput(BaseModel):
    service_id: int
    quantity: int = Field(default=0, ge=0)


class ReportCreate(BaseModel):
    doctor_id: int
    year: int = Field(ge=2020, le=2100)
    month: int = Field(ge=1, le=12)
    cash_in_register: Optional[float] = Field(default=None, ge=0)
    entries: list[EntryInput] = []


class ReportUpdate(BaseModel):
    cash_in_register: Optional[float] = None
    entries: Optional[list[EntryInput]] = None


class EntryResponse(BaseModel):
    service_id: int
    service_code: str
    service_name: str
    quantity: int

    model_config = {"from_attributes": True}


class ReportResponse(BaseModel):
    id: int
    doctor_id: int
    doctor_name: str
    year: int
    month: int
    cash_in_register: float
    status: str
    entries: list[EntryResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Аналітика ──────────────────────────────────────────────────────


class DashboardData(BaseModel):
    """6 блоків дашборду."""

    # Блок 1: Наданих послуг
    total_revenue: float
    total_quantity: int
    avg_check: float
    prev_month_revenue: float
    prev_month_quantity: int

    # Блок 2: Дохід лікаря/лікарів
    doctor_income: float

    # Блок 3: Витрати
    materials_cost: float
    ep_amount: float
    vz_amount: float
    total_costs: float

    # Блок 4: Дохід організації
    org_income: float

    # Блок 5: Готівка в касі
    cash_in_register: float

    # Блок 6: Кошти на рахунку
    bank_amount: float


class DoctorBreakdown(BaseModel):
    doctor_id: int
    doctor_name: str
    quantity: int


class ServiceTableRow(BaseModel):
    service_id: int
    code: str
    name: str
    price: float
    total_quantity: int
    by_doctor: list[DoctorBreakdown]
    sum: float
    materials: float
    ep_amount: float
    vz_amount: float
    to_split: float
    doctor_income: float
    org_income: float


class MonthlyTrendRow(BaseModel):
    year: int
    month: int
    quantity: int
    sum: float
    materials: float
    ep_amount: float
    vz_amount: float
    to_split: float
    doctor_income: float


class TopMaterialRow(BaseModel):
    name: str
    unit: str
    total_quantity: float
    total_cost: float
    share_pct: float


class AnalyticsResponse(BaseModel):
    dashboard: DashboardData
    services_table: list[ServiceTableRow]
    monthly_trend: list[MonthlyTrendRow]
    top_materials: list[TopMaterialRow]
    reports: list[ReportResponse]
    ep_rate: float
    vz_rate: float
    is_locked: bool = False


# ── Поширення (Share) ───────────────────────────────────────────────


class ShareCreate(BaseModel):
    doctor_id: Optional[int] = None   # None = all doctors
    year: int
    month: int


class ShareResponse(BaseModel):
    token: str
    url: str
    expires_at: datetime


class PublicShareData(BaseModel):
    """Відповідь публічної сторінки (без авторизації)."""

    token: str
    filter_label: str          # "Лютий 2026 · Всі лікарі"
    expires_at: datetime
    analytics: dict[str, Any]  # AnalyticsResponse у вигляді dict для snapshot


# ── Експорт ────────────────────────────────────────────────────────


class ExportRequest(BaseModel):
    doctor_id: Optional[int] = None
    year: int
    month: int


# ── Інформація про готівку за період ────────────────────────────────


class PeriodInfoResponse(BaseModel):
    """Відомості про останнього лікаря та готівку для поточного місяця."""

    last_active_doctor_id: Optional[int] = None
    cash_for_period: Optional[float] = None   # None = ще не внесено
    submitted_doctor_ids: list[int] = []
