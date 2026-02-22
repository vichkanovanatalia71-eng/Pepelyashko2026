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


class DashboardData(BaseModel):
    year: int
    month: int
    period_label: str

    # Current
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

    # Breakdowns
    income_by_category: list[CategoryBreakdown]
    expense_by_category: list[CategoryBreakdown]

    # Trend (last 6 months)
    trend: list[TrendPoint]

    # Insights
    insights: list[DashboardInsight]

    # Top items
    top_income_sources: list[CategoryBreakdown]
    top_expense_items: list[CategoryBreakdown]
