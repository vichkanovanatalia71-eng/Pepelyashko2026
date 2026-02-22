"""CRUD для персоналу: медичні сестри (role='nurse') та інший персонал (role='other')."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.staff import StaffMember
from app.models.user import User
from app.schemas.staff import StaffCreate, StaffResponse, StaffUpdate

router = APIRouter()


@router.get("/", response_model=list[StaffResponse])
async def list_staff(
    role: str | None = Query(None, description="nurse | other — filter by role"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(StaffMember).where(
        StaffMember.user_id == user.id,
        StaffMember.is_active == True,
    ).order_by(StaffMember.full_name)
    if role:
        q = q.where(StaffMember.role == role)
    return (await db.execute(q)).scalars().all()


@router.post("/", response_model=StaffResponse, status_code=201)
async def create_staff(
    data: StaffCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    member = StaffMember(user_id=user.id, **data.model_dump())
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: int,
    data: StaffUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    member = await _get_member(db, user.id, staff_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(member, field, value)
    await db.commit()
    await db.refresh(member)
    return member


@router.delete("/{staff_id}", status_code=204)
async def delete_staff(
    staff_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    member = await _get_member(db, user.id, staff_id)
    member.is_active = False
    await db.commit()


async def _get_member(db: AsyncSession, user_id: int, staff_id: int) -> StaffMember:
    result = await db.execute(
        select(StaffMember).where(
            StaffMember.id == staff_id,
            StaffMember.user_id == user_id,
            StaffMember.is_active == True,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return member
