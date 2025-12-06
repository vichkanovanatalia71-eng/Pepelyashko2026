"""Act model."""

from pydantic import BaseModel, Field
from typing import List, Optional
from .document import DocumentModel, DocumentItem


class ActModel(DocumentModel):
    """Act of completed work model for MongoDB."""
    based_on_contract: Optional[str] = Field(None, description="Номер договору")


class ActCreate(BaseModel):
    """Model for creating an act."""
    counterparty_edrpou: str = Field(..., description="ЄДРПОУ контрагента")
    items: List[DocumentItem] = Field(..., description="Список робіт")
    total_amount: float = Field(..., description="Загальна сума")
    based_on_order: Optional[str] = Field(None, description="Номер замовлення")
    based_on_contract: Optional[str] = Field(None, description="Номер договору")
    template_id: Optional[str] = Field(None, description="Custom template ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "counterparty_edrpou": "12345678",
                "items": [
                    {
                        "name": "Робота 1",
                        "unit": "послуга",
                        "quantity": 1,
                        "price": 1000.0,
                        "amount": 1000.0
                    }
                ],
                "total_amount": 1000.0
            }
        }
