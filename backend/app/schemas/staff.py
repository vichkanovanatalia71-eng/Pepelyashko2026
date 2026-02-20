from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

StaffRole = Literal["nurse", "other"]


class StaffCreate(BaseModel):
    full_name: str
    role: StaffRole
    position: str = ""


class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[StaffRole] = None
    position: Optional[str] = None


class StaffResponse(BaseModel):
    id: int
    full_name: str
    role: str
    position: str
    is_active: bool

    model_config = {"from_attributes": True}
