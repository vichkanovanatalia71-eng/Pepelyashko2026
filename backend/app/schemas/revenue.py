from __future__ import annotations

from pydantic import BaseModel


class DoctorRevenue(BaseModel):
    doctor_id: int
    doctor_name: str
    nhsu: float
    paid_services: float
    total: float


class ServiceRevenue(BaseModel):
    service_id: int
    code: str
    name: str
    quantity: int
    revenue: float


class MonthlyRevenueTrend(BaseModel):
    year: int
    month: int
    month_name: str
    nhsu: float
    paid_services: float
    total: float


class AiRecommendation(BaseModel):
    type: str       # "risk" | "opportunity" | "warning" | "insight"
    title: str
    description: str
    data_basis: str


class IntegrityWarning(BaseModel):
    type: str       # "missing_data" | "conflict" | "anomaly"
    message: str


class RevenueAnalytics(BaseModel):
    year: int
    month: int
    period_label: str
    # KPIs
    total: float
    nhsu: float
    paid_services: float
    nhsu_pct: float
    paid_pct: float
    avg_per_doctor: float
    # MoM
    prev_total: float
    prev_nhsu: float
    prev_paid: float
    mom_pct: float
    # Breakdown
    by_doctor: list[DoctorRevenue]
    top_services: list[ServiceRevenue]
    monthly_trend: list[MonthlyRevenueTrend]
    # AI
    recommendations: list[AiRecommendation]
    warnings: list[IntegrityWarning]
