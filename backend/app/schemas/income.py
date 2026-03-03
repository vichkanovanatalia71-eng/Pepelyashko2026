from __future__ import annotations

from datetime import date as Date
from typing import Optional

from pydantic import BaseModel, Field


class IncomeCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""


class IncomeCategoryResponse(BaseModel):
    id: int
    name: str
    description: str

    model_config = {"from_attributes": True}


class IncomeCreate(BaseModel):
    amount: float = Field(gt=0)
    description: str = Field(default="", max_length=2000)
    source: str = Field(default="", max_length=255)
    payment_method: str = Field(default="cash", pattern=r"^(cash|card|bank_transfer)$")
    category_id: Optional[int] = None
    date: Date


class IncomeUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    source: Optional[str] = None
    payment_method: Optional[str] = None
    category_id: Optional[int] = None
    date: Optional[Date] = None


class IncomeResponse(BaseModel):
    id: int
    amount: float
    description: str
    source: str
    payment_method: str
    category_id: Optional[int] = None
    date: Date

    model_config = {"from_attributes": True}
