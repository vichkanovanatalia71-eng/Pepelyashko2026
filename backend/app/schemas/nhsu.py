from pydantic import BaseModel


# ── Doctor ──────────────────────────────────────────────────────────

class DoctorCreate(BaseModel):
    full_name: str
    is_owner: bool = False


class DoctorResponse(BaseModel):
    id: int
    full_name: str
    is_owner: bool
    is_active: bool

    model_config = {"from_attributes": True}


# ── NHSU Record (per doctor / age group / month) ───────────────────

class NhsuRecordInput(BaseModel):
    doctor_id: int
    age_group: str  # "0_5", "6_17", "18_39", "40_64", "65_plus"
    age_coefficient: float
    patient_count: int
    non_verified: float = 0


class NhsuRecordResponse(BaseModel):
    id: int
    doctor_id: int
    year: int
    month: int
    capitation_rate: float
    age_group: str
    age_coefficient: float
    patient_count: int
    non_verified: float
    amount: float
    ep_vz: float

    model_config = {"from_attributes": True}


# ── Monthly Extra Data ──────────────────────────────────────────────

class NhsuMonthlyExtraInput(BaseModel):
    esv_amount: float = 1902.34
    paid_services_amount: float = 0
    owner_declaration_income: float = 0
    owner_other_doctor_income: float = 0


class NhsuMonthlyExtraResponse(BaseModel):
    id: int
    year: int
    month: int
    esv_amount: float
    paid_services_amount: float
    owner_declaration_income: float
    owner_other_doctor_income: float

    model_config = {"from_attributes": True}


# ── Bulk Input (save entire month at once) ──────────────────────────

class NhsuMonthlySaveRequest(BaseModel):
    year: int
    month: int
    capitation_rate: float
    records: list[NhsuRecordInput]
    extra: NhsuMonthlyExtraInput | None = None


# ── Calculated Report ───────────────────────────────────────────────

class DoctorAgeGroupRow(BaseModel):
    age_group: str
    age_group_label: str
    age_coefficient: float
    patient_count: int
    non_verified: float
    amount: float
    ep_vz: float


class DoctorSummary(BaseModel):
    doctor_id: int
    doctor_name: str
    is_owner: bool
    rows: list[DoctorAgeGroupRow]
    total_patients: int
    total_amount: float
    total_ep_vz: float


class NhsuMonthlyReport(BaseModel):
    year: int
    month: int
    capitation_rate: float
    doctors: list[DoctorSummary]
    grand_total_patients: int
    grand_total_non_verified: float
    grand_total_amount: float
    grand_total_ep_vz: float
    # Extra financial data
    esv_amount: float
    paid_services_amount: float
    owner_declaration_income: float
    owner_other_doctor_income: float
    total_income: float  # Разом
    withdrawal_amount: float  # Виведення на картку
