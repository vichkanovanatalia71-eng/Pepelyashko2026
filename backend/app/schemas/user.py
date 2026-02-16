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

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
