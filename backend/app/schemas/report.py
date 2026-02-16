from pydantic import BaseModel


class PeriodReport(BaseModel):
    period: str
    total_income: float
    total_expenses: float
    net_profit: float
    tax_single: float  # єдиний податок
    tax_esv: float  # ЄСВ
    total_taxes: float
    income_after_taxes: float


class TaxSummary(BaseModel):
    quarter: str
    income: float
    single_tax: float  # єдиний податок (5%)
    esv: float  # ЄСВ
    total: float
