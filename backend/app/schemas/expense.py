from __future__ import annotations

from datetime import date as Date
from typing import Optional

from pydantic import BaseModel


# --- Categories ---


class ExpenseCategoryCreate(BaseModel):
    name: str
    description: str = ""


class ExpenseCategoryResponse(BaseModel):
    id: int
    name: str
    description: str

    model_config = {"from_attributes": True}


# --- Expenses ---


class ExpenseCreate(BaseModel):
    amount: float
    description: str = ""
    category_id: Optional[int] = None
    date: Date
    expense_type: str = "other"  # fixed, salary, other, tax
    is_recurring: bool = False
    employee_id: Optional[int] = None


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    date: Optional[Date] = None
    expense_type: Optional[str] = None
    is_recurring: Optional[bool] = None
    employee_id: Optional[int] = None


class ExpenseResponse(BaseModel):
    id: int
    amount: float
    description: str
    category_id: Optional[int]
    date: Date
    expense_type: str
    is_recurring: bool
    employee_id: Optional[int]

    model_config = {"from_attributes": True}


# --- Employees ---


class EmployeeCreate(BaseModel):
    full_name: str
    position: str = ""
    staff_type: str = "other"  # doctor, nurse, other
    salary: float = 0


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    position: Optional[str] = None
    staff_type: Optional[str] = None
    salary: Optional[float] = None
    is_active: Optional[bool] = None


class EmployeeResponse(BaseModel):
    id: int
    full_name: str
    position: str
    staff_type: str
    salary: float
    is_active: bool

    model_config = {"from_attributes": True}


# --- Dashboard / Summary ---


class ExpenseSummary(BaseModel):
    total_fixed: float = 0
    total_salary: float = 0
    total_other: float = 0
    total_tax: float = 0
    grand_total: float = 0


class ExpenseByMonth(BaseModel):
    month: str
    fixed: float = 0
    salary: float = 0
    other: float = 0
    tax: float = 0
    total: float = 0


class ExpenseDashboard(BaseModel):
    summary: ExpenseSummary
    by_month: list[ExpenseByMonth]
    salary_share: float = 0  # відсоток
    tax_share: float = 0
    fixed_share: float = 0
    other_share: float = 0
