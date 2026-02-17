from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.doctor import Doctor
from app.models.nhsu import AGE_GROUPS
from app.models.user import User
from app.schemas.nhsu import (
    DoctorCreate,
    DoctorResponse,
    NhsuMonthlyReport,
    NhsuMonthlySaveRequest,
)
from app.services.nhsu import get_monthly_report, save_monthly_data

router = APIRouter()


# ── Лікарі ──────────────────────────────────────────────────────────


@router.get("/doctors", response_model=list[DoctorResponse])
async def list_doctors(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Doctor)
        .where(Doctor.user_id == user.id, Doctor.is_active.is_(True))
        .order_by(Doctor.id)
    )
    return result.scalars().all()


@router.post("/doctors", response_model=DoctorResponse, status_code=201)
async def create_doctor(
    doctor_in: DoctorCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doctor = Doctor(user_id=user.id, **doctor_in.model_dump())
    db.add(doctor)
    await db.commit()
    await db.refresh(doctor)
    return doctor


@router.delete("/doctors/{doctor_id}", status_code=204)
async def delete_doctor(
    doctor_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.user_id == user.id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Лікаря не знайдено")
    doctor.is_active = False
    await db.commit()


# ── Вікові групи (довідник) ──────────────────────────────────────────


@router.get("/age-groups")
async def list_age_groups():
    return AGE_GROUPS


# ── Місячні дані НСЗУ ───────────────────────────────────────────────


@router.post("/monthly", status_code=201)
async def save_monthly(
    data: NhsuMonthlySaveRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not 1 <= data.month <= 12:
        raise HTTPException(status_code=400, detail="Місяць має бути від 1 до 12")
    if data.capitation_rate <= 0:
        raise HTTPException(status_code=400, detail="Капітаційна ставка має бути > 0")

    await save_monthly_data(db, user.id, data)
    return {"status": "ok"}


@router.get("/monthly", response_model=NhsuMonthlyReport)
async def get_monthly(
    year: int = Query(...),
    month: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    report = await get_monthly_report(db, user.id, year, month)
    if not report:
        raise HTTPException(
            status_code=404,
            detail="Дані за цей місяць не знайдено",
        )
    return report
