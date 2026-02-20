from __future__ import annotations

from datetime import date as Date
from typing import Optional

from pydantic import BaseModel


class ExpenseCategoryCreate(BaseModel):
    name: str
    description: str = ""


class ExpenseCategoryResponse(BaseModel):
    id: int
    name: str
    description: str

    model_config = {"from_attributes": True}


class ExpenseCreate(BaseModel):
    amount: float
    description: str = ""
    category_id: Optional[int] = None
    staff_member_id: Optional[int] = None
    date: Date


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    staff_member_id: Optional[int] = None
    date: Optional[Date] = None


class ExpenseResponse(BaseModel):
    id: int
    amount: float
    description: str
    category_id: Optional[int]
    staff_member_id: Optional[int]
    date: Date

    model_config = {"from_attributes": True}


class ExpenseTemplateCreate(BaseModel):
    name: str
    amount: float
    description: str = ""
    category_id: Optional[int] = None


class ExpenseTemplateResponse(BaseModel):
    id: int
    name: str
    amount: float
    description: str
    category_id: Optional[int]

    model_config = {"from_attributes": True}
