"""Waybill model."""

from pydantic import BaseModel, Field
from typing import List, Optional
from .document import DocumentModel, DocumentItem


class WaybillModel(DocumentModel):
    """Waybill model for MongoDB."""
    pass


class WaybillCreate(BaseModel):
    """Model for creating a waybill."""
    counterparty_edrpou: str = Field(..., description="ЄДРПОУ контрагента")
    items: List[DocumentItem] = Field(..., description="Список товарів")
    total_amount: float = Field(..., description="Загальна сума")
    based_on_order: Optional[str] = Field(None, description="Номер замовлення")
    template_id: Optional[str] = Field(None, description="Custom template ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "counterparty_edrpou": "12345678",
                "items": [
                    {
                        "name": "Товар 1",
                        "unit": "шт",
                        "quantity": 5,
                        "price": 50.0,
                        "amount": 250.0
                    }
                ],
                "total_amount": 250.0
            }
        }
