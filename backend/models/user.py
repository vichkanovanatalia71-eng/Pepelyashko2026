"""User model for authentication and authorization."""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserModel(BaseModel):
    """User model for MongoDB."""
    id: str = Field(..., alias="_id")
    email: EmailStr
    full_name: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    
    # Supplier/Provider details (same as counterparty)
    edrpou: Optional[str] = Field(None, description="Код ЄДРПОУ постачальника")
    representative_name: Optional[str] = Field(None, description="Повна назва компанії")
    legal_address: Optional[str] = Field(None, description="Юридична адреса")
    iban: Optional[str] = Field(None, description="IBAN")
    bank: Optional[str] = Field(None, description="Банк")
    mfo: Optional[str] = Field(None, description="МФО")
    bank_name: Optional[str] = Field(None, description="Повна назва банку")
    director_name: Optional[str] = Field(None, description="ПІБ керівника")
    director_position: Optional[str] = Field(None, description="Посада керівника")
    position: Optional[str] = Field(None, description="Посада підписанта")
    contract_type: Optional[str] = Field("Статуту", description="Діє на підставі")
    represented_by: Optional[str] = Field(None, description="В особі")
    signature: Optional[str] = Field(None, description="Підпис")
    logo_url: Optional[str] = Field(None, description="URL логотипу компанії")
    logo_filename: Optional[str] = Field(None, description="Ім'я файлу логотипу")
    
    # VAT information
    vat_payer: Optional[bool] = Field(False, description="Чи є платником ПДВ")
    vat_rate: Optional[float] = Field(20.0, description="Ставка ПДВ (%)")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "user123",
                "email": "user@example.com",
                "full_name": "Іван Петренко",
                "company_name": "ТОВ Приклад",
                "phone": "+380501234567",
                "is_active": True,
                "edrpou": "12345678",
                "representative_name": "ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ \"ПРИКЛАД\"",
                "legal_address": "м. Київ, вул. Хрещатик, 1",
                "iban": "UA123456789012345678901234567"
            }
        }


class UserInDB(UserModel):
    """User model with hashed password."""
    hashed_password: str


class UserCreate(BaseModel):
    """Model for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    company_name: Optional[str] = None
    phone: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123",
                "full_name": "Іван Петренко",
                "company_name": "ТОВ Приклад",
                "phone": "+380501234567"
            }
        }


class UserUpdate(BaseModel):
    """Model for updating user profile."""
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    company_logo: Optional[str] = None
    
    # Supplier/Provider details
    edrpou: Optional[str] = None
    representative_name: Optional[str] = None
    legal_address: Optional[str] = None
    iban: Optional[str] = None
    bank: Optional[str] = None
    bank_name: Optional[str] = None
    mfo: Optional[str] = None
    director_name: Optional[str] = None
    director_position: Optional[str] = None
    position: Optional[str] = None
    represented_by: Optional[str] = None
    signature: Optional[str] = None
    
    # VAT information
    vat_payer: Optional[bool] = None
    vat_rate: Optional[float] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "Іван Петренко",
                "company_name": "ТОВ Новий Приклад",
                "phone": "+380501234567",
                "edrpou": "12345678",
                "representative_name": "ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ \"ПРИКЛАД\""
            }
        }


class UserLogin(BaseModel):
    """Model for user login."""
    email: EmailStr
    password: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123"
            }
        }
