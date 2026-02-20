from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    fop_group: int = 3
    tax_rate: float = 0.05


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
    new_password: str


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    fop_group: int | None = None
    tax_rate: float | None = None
