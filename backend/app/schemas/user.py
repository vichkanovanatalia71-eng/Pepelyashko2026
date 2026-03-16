from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    fop_group: int = Field(default=3, ge=1, le=3)
    tax_rate: float = Field(default=0.05, ge=0, le=1)


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    fop_group: int
    tax_rate: float
    is_active: bool
    is_verified: bool

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    """Відповідь на реєстрацію — без токену, з підказкою перевірити пошту."""
    email: str
    email_sent: bool  # чи надіслано лист (False якщо SMTP не налаштовано)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=128)


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    fop_group: int | None = Field(default=None, ge=1, le=3)
    tax_rate: float | None = Field(default=None, ge=0, le=1)
