from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


# ── Doctor ──────────────────────────────────────────────────────────

class DoctorCreate(BaseModel):
    full_name: str
    is_owner: bool = False


class DoctorUpdate(BaseModel):
    full_name: Optional[str] = None
    is_owner: Optional[bool] = None


class DoctorResponse(BaseModel):
    id: int
    full_name: str
    is_owner: bool
    is_active: bool

    model_config = {"from_attributes": True}


# ── Settings ────────────────────────────────────────────────────────

class NhsuSettingsInput(BaseModel):
    capitation_rate: float = 1007.3
    coeff_0_5: float = 2.465
    coeff_6_17: float = 1.25
    coeff_18_39: float = 0.616
    coeff_40_64: float = 0.86
    coeff_65_plus: float = 1.3
    ep_rate: float = 5.0   # %
    vz_rate: float = 1.5   # %
    esv_monthly: float = 1760.00  # грн


class NhsuSettingsResponse(BaseModel):
    id: int
    capitation_rate: float
    coeff_0_5: float
    coeff_6_17: float
    coeff_18_39: float
    coeff_40_64: float
    coeff_65_plus: float
    ep_rate: float
    vz_rate: float
    esv_monthly: float

    model_config = {"from_attributes": True}


# ── Monthly Input (only patient data) ──────────────────────────────

class MonthlyRecordInput(BaseModel):
    doctor_id: int
    age_group: str  # "0_5", "6_17", "18_39", "40_64", "65_plus"
    patient_count: int
    non_verified: float = 0


class NhsuMonthlySaveRequest(BaseModel):
    year: int
    month: int  # 1-12
    records: list[MonthlyRecordInput]


# ── Calculated Report ───────────────────────────────────────────────

class DoctorAgeGroupRow(BaseModel):
    age_group: str
    age_group_label: str
    age_coefficient: float
    patient_count: int
    non_verified: float
    amount: float       # Сума за пацієнтів
    ep_amount: float    # Єдиний податок
    vz_amount: float    # Військовий збір
    ep_vz_amount: float # ЄП + ВЗ разом


class DoctorSummary(BaseModel):
    doctor_id: int
    doctor_name: str
    is_owner: bool
    rows: list[DoctorAgeGroupRow]
    total_patients: int
    total_non_verified: float
    total_amount: float
    total_ep: float
    total_vz: float
    total_ep_vz: float


class AgeGroupSummary(BaseModel):
    """Підсумок по віковій групі (по всіх лікарях)."""
    age_group: str
    age_group_label: str
    age_coefficient: float
    total_patients: int
    total_non_verified: float
    total_amount: float
    total_ep: float
    total_vz: float
    total_ep_vz: float


class NhsuMonthlyReport(BaseModel):
    year: int
    month: int
    capitation_rate: float
    ep_rate: float
    vz_rate: float
    # По лікарях
    doctors: list[DoctorSummary]
    # По вікових групах (сумарно)
    age_group_totals: list[AgeGroupSummary]
    # Загальні підсумки
    grand_total_patients: int
    grand_total_non_verified: float
    grand_total_amount: float
    grand_total_ep: float
    grand_total_vz: float
    grand_total_ep_vz: float
