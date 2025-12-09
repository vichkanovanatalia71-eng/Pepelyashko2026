"""Base document model for all document types."""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class DocumentItem(BaseModel):
    """Item in a document (product/service)."""
    name: str = Field(..., description="Назва товару/роботи")
    unit: str = Field(..., description="Одиниця виміру")
    quantity: float = Field(..., description="Кількість")
    price: float = Field(..., description="Ціна за одиницю")
    amount: float = Field(..., description="Сума")


class DocumentModel(BaseModel):
    """Base model for all documents."""
    id: str = Field(..., alias="_id")
    user_id: str = Field(..., description="Owner user ID")
    number: str = Field(..., description="Document number")
    date: datetime = Field(default_factory=datetime.utcnow, description="Document date")
    counterparty_edrpou: str = Field(..., description="ЄДРПОУ контрагента")
    counterparty_name: str = Field(..., description="Назва контрагента")
    items: List[DocumentItem] = Field(..., description="Список товарів/робіт")
    total_amount: float = Field(..., description="Загальна сума")
    is_paid: Optional[bool] = Field(False, description="Статус оплати (Сплачено/Не сплачено)")
    based_on_order: Optional[str] = Field(None, description="Номер замовлення (якщо створено на основі замовлення)")
    pdf_path: Optional[str] = Field(None, description="Path to generated PDF")
    pdf_generated_at: Optional[datetime] = Field(None, description="PDF generation timestamp")
    template_id: Optional[str] = Field(None, description="Template used for this document")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
