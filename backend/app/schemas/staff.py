from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

StaffRole = Literal["doctor", "nurse", "other"]


class StaffCreate(BaseModel):
    full_name: str
    role: StaffRole
    position: str = ""
    doctor_id: Optional[int] = None


class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[StaffRole] = None
    position: Optional[str] = None
    doctor_id: Optional[int] = None


class StaffResponse(BaseModel):
    id: int
    full_name: str
    role: str
    position: str
    is_active: bool
    doctor_id: Optional[int] = None

    model_config = {"from_attributes": True}
