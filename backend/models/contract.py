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
    contract_type: Optional[str] = Field(None, description="Тип договору: goods, services, goods_and_services")
    subject: str = Field(..., description="Предмет договору")
    amount: float = Field(..., description="Сума договору")
    based_on_order: Optional[str] = Field(None, description="Номер замовлення")
    execution_form: Optional[str] = Field(None, description="Формат виконання: one_time, periodic, with_specifications, annual_volume")
    specification_required: Optional[bool] = Field(False, description="Специфікація обов'язкова")
    quantity_variation_allowed: Optional[bool] = Field(False, description="Варіативність обсягу")
    delivery_address: Optional[str] = Field(None, description="Адреса доставки")
    warranty_period: Optional[str] = Field(None, description="Гарантійний термін: 12_months, 24_months, 36_months, not_applicable")
    penalty_rate: Optional[str] = Field(None, description="Санкції за порушення (% на день)")
    signing_format: Optional[str] = Field(None, description="Формат підписання: paper, electronic, both")
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
    contract_type: Optional[str] = Field(None, description="Тип договору: goods, services, goods_and_services")
    subject: str = Field(..., description="Предмет договору")
    amount: float = Field(..., description="Сума договору")
    based_on_order: Optional[str] = Field(None, description="Номер замовлення")
    execution_form: Optional[str] = Field(None, description="Формат виконання: one_time, periodic, with_specifications, annual_volume")
    specification_required: Optional[bool] = Field(False, description="Специфікація обов'язкова")
    quantity_variation_allowed: Optional[bool] = Field(False, description="Варіативність обсягу")
    delivery_address: Optional[str] = Field(None, description="Адреса доставки")
    warranty_period: Optional[str] = Field(None, description="Гарантійний термін: 12_months, 24_months, 36_months, not_applicable")
    penalty_rate: Optional[str] = Field(None, description="Санкції за порушення (% на день)")
    signing_format: Optional[str] = Field(None, description="Формат підписання: paper, electronic, both")
    template_id: Optional[str] = Field(None, description="Custom template ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "counterparty_edrpou": "12345678",
                "contract_type": "goods",
                "subject": "Постачання товарів",
                "amount": 50000.0,
                "execution_form": "one_time",
                "specification_required": False,
                "quantity_variation_allowed": False,
                "delivery_address": "м. Київ, вул. Хрещатик, 1",
                "warranty_period": "12_months",
                "penalty_rate": "0.1",
                "signing_format": "paper"
            }
        }
