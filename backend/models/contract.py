"""Contract model."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ContractModel(BaseModel):
    """Contract model for MongoDB."""
    id: str = Field(..., alias="_id")
    user_id: str = Field(..., description="Owner user ID")
    number: str = Field(..., description="Contract number")
    date: datetime = Field(default_factory=datetime.utcnow, description="Contract date")
    counterparty_edrpou: str = Field(..., description="ЄДРПОУ контрагента")
    counterparty_name: str = Field(..., description="Назва контрагента")
    contract_type: Optional[str] = Field(None, description="Тип договору")
    subject: str = Field(..., description="Предмет договору")
    amount: float = Field(..., description="Сума договору")
    based_on_order: Optional[str] = Field(None, description="Номер замовлення")
    pdf_path: Optional[str] = Field(None, description="Path to generated PDF")
    pdf_generated_at: Optional[datetime] = Field(None, description="PDF generation timestamp")
    template_id: Optional[str] = Field(None, description="Template used for this document")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True


class ContractCreate(BaseModel):
    """Model for creating a contract."""
    counterparty_edrpou: str = Field(..., description="ЄДРПОУ контрагента")
    contract_type: Optional[str] = Field(None, description="Тип договору")
    subject: str = Field(..., description="Предмет договору")
    amount: float = Field(..., description="Сума договору")
    based_on_order: Optional[str] = Field(None, description="Номер замовлення")
    template_id: Optional[str] = Field(None, description="Custom template ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "counterparty_edrpou": "12345678",
                "contract_type": "Постачання",
                "subject": "Постачання товарів",
                "amount": 50000.0
            }
        }
