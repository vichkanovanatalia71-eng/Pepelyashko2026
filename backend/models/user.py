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
                "is_active": True
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
    
    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "Іван Петренко",
                "company_name": "ТОВ Новий Приклад",
                "phone": "+380501234567"
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
