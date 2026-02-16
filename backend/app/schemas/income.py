from datetime import date

from pydantic import BaseModel


class IncomeCreate(BaseModel):
    amount: float
    description: str = ""
    source: str = ""
    payment_method: str = "cash"
    date: date


class IncomeUpdate(BaseModel):
    amount: float | None = None
    description: str | None = None
    source: str | None = None
    payment_method: str | None = None
    date: date | None = None


class IncomeResponse(BaseModel):
    id: int
    amount: float
    description: str
    source: str
    payment_method: str
    date: date

    model_config = {"from_attributes": True}
