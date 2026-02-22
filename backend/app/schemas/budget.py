from typing import Optional
from pydantic import BaseModel


class BudgetCellValue(BaseModel):
    """Значення однієї комірки."""
    value: Optional[float]       # None = ще не заповнено
    is_locked: bool = False      # True = формула/модуль, не можна редагувати


class BudgetRowOut(BaseModel):
    id: int
    section: str           # "fixed" | "variable"
    sub_type: str          # "fixed" | "quasi_fixed" | "variable"
    input_type: str        # "manual" | "auto_formula" | "auto_module"
    name: str
    description: str
    order_index: int
    is_info_row: bool
    is_system: bool
    formula_key: Optional[str]
    staff_member_id: Optional[int]
    # months: "1" → BudgetCellValue (обчислюється на сервері)
    months: dict[str, BudgetCellValue]
    yearly_total: Optional[float]   # None якщо немає жодного значення

    model_config = {"from_attributes": True}


class BudgetTableResponse(BaseModel):
    year: int
    rows: list[BudgetRowOut]
    monthly_income: dict[str, float]     # "1" → дохід за місяць
    monthly_totals: dict[str, float]     # "1" → сума витрат за місяць
    monthly_remaining: dict[str, float]  # "1" → залишок (дохід - витрати)


class UpdateCellRequest(BaseModel):
    row_id: int
    year: int
    month: int
    value: Optional[float]


class CopyMonthRequest(BaseModel):
    year: int
    source_month: int
    target_months: list[int]
    section: Optional[str] = None   # None = копіювати всі постійні


class AddRowRequest(BaseModel):
    section: str = "fixed"
    sub_type: str = "fixed"
    name: str
    description: str = ""


class BudgetRecommendation(BaseModel):
    type: str       # "info" | "warning" | "breakeven" | "tip"
    title: str
    body: str
    months: Optional[list[int]] = None  # на які місяці стосується


class BudgetRecommendationsResponse(BaseModel):
    year: int
    recommendations: list[BudgetRecommendation]
