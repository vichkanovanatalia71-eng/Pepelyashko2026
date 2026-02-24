from pydantic import BaseModel


class PeriodReport(BaseModel):
    period: str
    total_income: float
    total_expenses: float
    net_profit: float
    tax_single: float  # єдиний податок
    tax_esv: float  # ЄСВ
    tax_vz: float  # військовий збір
    total_taxes: float
    income_after_taxes: float


class TaxSummary(BaseModel):
    quarter: str
    income: float
    single_tax: float  # єдиний податок (5%)
    esv: float  # ЄСВ
    vz: float  # військовий збір (1.5%)
    total: float


class MonthlyPL(BaseModel):
    month: int
    month_name: str
    income: float
    expenses: float
    net_profit: float
    tax_single: float
    tax_esv: float
    tax_vz: float
    total_taxes: float
    income_after_taxes: float


class AnnualReport(BaseModel):
    year: int
    months: list[MonthlyPL]
    total_income: float
    total_expenses: float
    total_net_profit: float
    total_tax_single: float
    total_tax_esv: float
    total_tax_vz: float
    total_taxes: float
    total_income_after_taxes: float


# ── Dashboard (enriched) ─────────────────────────────────────────────


class CategoryBreakdown(BaseModel):
    name: str
    amount: float
    pct: float


class TrendPoint(BaseModel):
    month_name: str
    income: float
    expenses: float
    profit: float
    taxes: float


class DashboardInsight(BaseModel):
    type: str  # "risk" | "warning" | "opportunity" | "insight"
    title: str
    description: str


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


class AiInsight(BaseModel):
    type: str  # "risk" | "warning" | "opportunity" | "insight"
    title: str
    description: str
    data_basis: str | None = None


class DataIntegrityWarning(BaseModel):
    type: str  # "missing_data" | "conflict" | "anomaly"
    message: str


# ── ПРІОРИТЕТ 1: Пацієнти ────────────────────────────────────────────

class AgeGroupBreakdown(BaseModel):
    age_group: str  # "0_5", "6_17", ...
    age_label: str  # "від 0 до 5 років"
    patient_count: int
    non_verified: int
    pct: float


class DoctorPatientLoad(BaseModel):
    doctor_id: int
    doctor_name: str
    patient_count: int
    patient_count_prev: int
    patient_count_change_pct: float
    services_count: int
    revenue_per_patient: float


# ── ПРІОРИТЕТ 1: Персонал & ФОП ───────────────────────────────────────

class StaffRoleBreakdown(BaseModel):
    role: str  # "doctor", "nurse", "other"
    role_label: str
    count: int
    salary_total: float
    salary_netto_total: float
    pdfo_total: float
    vz_total: float
    esv_employer_total: float
    salary_brutto_total: float
    individual_bonus_total: float  # Індивідуальні доплати
    supplement_total: float  # Доплата до цільової суми
    total_employer_cost: float  # Витрати роботодавця (brutto + esv + bonuses + supplements)
    pct: float


class OwnerFinancialInfo(BaseModel):
    doctor_id: int
    doctor_name: str
    is_owner: bool
    nhsu_income: float
    paid_services_income: float
    total_income: float
    ep_amount: float
    vz_amount: float
    esv_owner_amount: float
    total_taxes: float
    income_after_taxes: float


# ── ПРІОРИТЕТ 1: Платні послуги ───────────────────────────────────────

class ServiceBreakdownDetail(BaseModel):
    service_id: int
    code: str
    name: str
    quantity: int
    revenue: float
    materials_cost: float
    margin: float
    margin_pct: float
    by_doctor: list["DoctorServiceBreakdown"]


class DoctorServiceBreakdown(BaseModel):
    doctor_id: int
    doctor_name: str
    quantity: int
    revenue: float


# Forward ref for ServiceBreakdownDetail
ServiceBreakdownDetail.model_rebuild()


class DashboardData(BaseModel):
    year: int
    month: int
    period_label: str

    # ── ОСНОВНІ ФІНАНСОВІ ПОКАЗНИКИ ──
    # Current month
    total_income: float
    total_expenses: float
    net_profit: float
    tax_single: float
    tax_esv: float
    tax_vz: float
    total_taxes: float
    income_after_taxes: float

    # Previous month for comparison
    prev_income: float
    prev_expenses: float
    prev_profit: float
    prev_taxes: float

    # % change MoM
    income_change_pct: float
    expenses_change_pct: float
    profit_change_pct: float
    taxes_change_pct: float

    # 6-month avg
    avg_income_6m: float
    avg_expenses_6m: float
    avg_profit_6m: float

    # ── ДОХОДИ ──
    # By category
    income_by_category: list[CategoryBreakdown]

    # Top income sources
    top_income_sources: list[CategoryBreakdown]

    # Revenue breakdown
    nhsu_income: float
    paid_services_income: float
    nhsu_pct: float
    paid_pct: float

    # By doctor
    income_by_doctor: list[DoctorRevenue]

    # By service
    top_services: list[ServiceRevenue]

    # ── ВИТРАТИ ──
    # By category
    expense_by_category: list[CategoryBreakdown]

    # Top expense items
    top_expense_items: list[CategoryBreakdown]

    # Fixed vs salary
    fixed_expenses: float
    salary_expenses: float

    # ── ПОДАТКОВА МОДЕЛЬ ──
    # Current tax details
    tax_single_rate: float
    tax_esv_monthly: float
    tax_vz_rate: float

    # ── ОПЕРАЦІЙНІ ПОКАЗНИКИ ──
    # Services
    total_services_count: int
    services_by_doctor: dict[str, int]  # doctor_name -> count

    # Doctor load
    active_doctors_count: int

    # ── ПРІОРИТЕТ 1: ПАЦІЄНТИ ──
    patients_by_age: list[AgeGroupBreakdown] = []
    patients_by_doctor: list[DoctorPatientLoad] = []
    total_patients: int = 0
    total_patients_prev: int = 0
    total_patients_change_pct: float = 0.0
    total_non_verified: int = 0
    total_non_verified_pct: float = 0.0

    # ── ПРІОРИТЕТ 1: ПЕРСОНАЛ & ФОП ──
    staff_by_role: list[StaffRoleBreakdown] = []
    owner_info: OwnerFinancialInfo | None = None
    total_staff_count: int = 0
    fop_total: float = 0.0
    fop_pct: float = 0.0

    # ── ПРІОРИТЕТ 1: ПЛАТНІ ПОСЛУГИ ──
    top_paid_services: list[ServiceBreakdownDetail] = []
    paid_services_total_revenue: float = 0.0
    paid_services_total_qty: int = 0
    services_total_margin: float = 0.0
    services_margin_pct: float = 0.0

    # ── КАСОВЕ СТАНОВИЩЕ ──
    opening_balance: float = 0.0
    bank_balance: float = 0.0

    # ── ЦІЛІСНІСТЬ ДАНИХ ──
    data_integrity_warnings: list[DataIntegrityWarning]
    missing_salary_staff: list[str]

    # ── ТРЕНДИ ──
    # Trend (last 6 months)
    trend: list[TrendPoint]

    # ── AI АНАЛІТИКА ──
    # Insights
    insights: list[DashboardInsight]

    # AI-recommendations
    ai_insights: list[AiInsight]
