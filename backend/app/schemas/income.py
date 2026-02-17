from __future__ import annotations

from datetime import date as Date
from typing import Optional

from pydantic import BaseModel


class IncomeCreate(BaseModel):
    amount: float
    description: str = ""
    source: str = ""
    payment_method: str = "cash"
    date: Date


class IncomeUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    source: Optional[str] = None
    payment_method: Optional[str] = None
    date: Optional[Date] = None


class IncomeResponse(BaseModel):
    id: int
    amount: float
    description: str
    source: str
    payment_method: str
    date: Date

    model_config = {"from_attributes": True}
