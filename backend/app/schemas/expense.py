from datetime import date

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
    category_id: int | None = None
    date: date


class ExpenseUpdate(BaseModel):
    amount: float | None = None
    description: str | None = None
    category_id: int | None = None
    date: date | None = None


class ExpenseResponse(BaseModel):
    id: int
    amount: float
    description: str
    category_id: int | None
    date: date

    model_config = {"from_attributes": True}
