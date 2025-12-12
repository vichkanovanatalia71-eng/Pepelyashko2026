"""Order model."""

from pydantic import BaseModel, Field
from typing import List, Optional
from .document import DocumentModel, DocumentItem


class OrderModel(DocumentModel):
    """Order model for MongoDB."""
    status: Optional[str] = Field(default="new", description="Статус замовлення: new, in_progress, shipped, paid")
    ttn_number: Optional[str] = Field(default=None, description="Номер ТТН (товарно-транспортної накладної)")


class OrderCreate(BaseModel):
    """Model for creating an order."""
    counterparty_edrpou: str = Field(..., description="ЄДРПОУ контрагента")
    items: List[DocumentItem] = Field(..., description="Список товарів")
    total_amount: float = Field(..., description="Загальна сума")
    template_id: Optional[str] = Field(None, description="Custom template ID")
    status: Optional[str] = Field(default="new", description="Статус замовлення: new, in_progress, shipped, paid")
    
    class Config:
        json_schema_extra = {
            "example": {
                "counterparty_edrpou": "12345678",
                "items": [
                    {
                        "name": "Товар 1",
                        "unit": "шт",
                        "quantity": 10,
                        "price": 100.0,
                        "amount": 1000.0
                    }
                ],
                "total_amount": 1000.0,
                "status": "new"
            }
        }
