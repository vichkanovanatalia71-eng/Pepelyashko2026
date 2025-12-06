"""Counterparty model for managing business partners."""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


class CounterpartyModel(BaseModel):
    """Counterparty model for MongoDB."""
    id: str = Field(..., alias="_id")
    user_id: str = Field(..., description="Owner user ID")
    edrpou: str = Field(..., description="Код ЄДРПОУ")
    representative_name: str = Field(..., description="Назва")
    email: EmailStr = Field(..., description="Email")
    phone: str = Field(..., description="Телефон")
    iban: str = Field(..., description="IBAN")
    contract_type: Optional[str] = Field('', description="Тип договору")
    director_position: Optional[str] = Field(None, description="Посада керівника")
    director_name: Optional[str] = Field(None, description="ПІБ керівника")
    legal_address: Optional[str] = Field(None, description="Юридична адреса")
    bank: Optional[str] = Field(None, description="Банк")
    mfo: Optional[str] = Field(None, description="МФО")
    position: Optional[str] = Field(None, description="Посада")
    represented_by: Optional[str] = Field(None, description="В особі")
    signature: Optional[str] = Field(None, description="Підпис")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "counterparty123",
                "user_id": "user123",
                "edrpou": "12345678",
                "representative_name": "ТОВ Приклад",
                "email": "company@example.com",
                "phone": "+380501234567",
                "iban": "UA123456789012345678901234567",
                "director_name": "Петро Іваненко"
            }
        }


class CounterpartyCreate(BaseModel):
    """Model for creating a counterparty."""
    edrpou: str = Field(..., description="Код ЄДРПОУ")
    representative_name: str = Field(..., description="Назва")
    email: EmailStr = Field(..., description="Email")
    phone: str = Field(..., description="Телефон")
    iban: str = Field(..., description="IBAN")
    contract_type: Optional[str] = Field('', description="Тип договору")
    director_position: Optional[str] = Field(None, description="Посада керівника")
    director_name: Optional[str] = Field(None, description="ПІБ керівника")
    legal_address: Optional[str] = Field(None, description="Юридична адреса")
    bank: Optional[str] = Field(None, description="Банк")
    mfo: Optional[str] = Field(None, description="МФО")
    position: Optional[str] = Field(None, description="Посада")
    represented_by: Optional[str] = Field(None, description="В особі")
    signature: Optional[str] = Field(None, description="Підпис")
    
    @field_validator('edrpou')
    @classmethod
    def validate_edrpou(cls, v: str) -> str:
        """Validate EDRPOU: must be exactly 8 digits (for legal entities) or 10 digits (for FOP)."""
        if not v:
            raise ValueError('ЄДРПОУ обов\'язкове поле')
        if not v.isdigit():
            raise ValueError('ЄДРПОУ має містити лише цифри')
        if len(v) not in [8, 10]:
            raise ValueError('ЄДРПОУ має бути 8 цифр (для ЮрОсіб) або 10 цифр (для ФОП)')
        return v


class CounterpartyUpdate(BaseModel):
    """Model for updating a counterparty."""
    representative_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    iban: Optional[str] = None
    contract_type: Optional[str] = None
    director_position: Optional[str] = None
    director_name: Optional[str] = None
    legal_address: Optional[str] = None
    bank: Optional[str] = None
    mfo: Optional[str] = None
    position: Optional[str] = None
    represented_by: Optional[str] = None
    signature: Optional[str] = None
