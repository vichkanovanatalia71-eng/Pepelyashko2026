"""Invoice model."""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from .document import DocumentModel, DocumentItem


class InvoiceModel(DocumentModel):
    """Invoice model for MongoDB."""
    pass


class InvoiceCreate(BaseModel):
    """Model for creating an invoice."""
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
                        "quantity": 2,
                        "price": 100.0,
                        "amount": 200.0
                    }
                ],
                "total_amount": 200.0,
                "based_on_order": "0001"
            }
        }
