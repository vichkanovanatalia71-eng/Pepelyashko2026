from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.income import Income, IncomeCategory
from app.models.user import User
from app.schemas.income import (
    IncomeCategoryCreate,
    IncomeCategoryResponse,
    IncomeCreate,
    IncomeResponse,
    IncomeUpdate,
)

router = APIRouter()


# --- Categories ---


@router.get("/categories", response_model=list[IncomeCategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(IncomeCategory).order_by(IncomeCategory.name))
    return result.scalars().all()


@router.post("/categories", response_model=IncomeCategoryResponse, status_code=201)
async def create_category(
    cat_in: IncomeCategoryCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    category = IncomeCategory(**cat_in.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


# --- Incomes ---


@router.get("/", response_model=list[IncomeResponse])
async def list_incomes(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    category_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Income).where(Income.user_id == user.id).order_by(Income.date.desc())
    if date_from:
        query = query.where(Income.date >= date_from)
    if date_to:
        query = query.where(Income.date <= date_to)
    if category_id:
        query = query.where(Income.category_id == category_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=IncomeResponse, status_code=201)
async def create_income(
    income_in: IncomeCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    income = Income(user_id=user.id, **income_in.model_dump())
    db.add(income)
    await db.commit()
    await db.refresh(income)
    return income


@router.put("/{income_id}", response_model=IncomeResponse)
async def update_income(
    income_id: int,
    income_in: IncomeUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Income).where(Income.id == income_id, Income.user_id == user.id)
    )
    income = result.scalar_one_or_none()
    if not income:
        raise HTTPException(status_code=404, detail="Дохід не знайдено")
    for field, value in income_in.model_dump(exclude_unset=True).items():
        setattr(income, field, value)
    await db.commit()
    await db.refresh(income)
    return income


@router.delete("/{income_id}", status_code=204)
async def delete_income(
    income_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Income).where(Income.id == income_id, Income.user_id == user.id)
    )
    income = result.scalar_one_or_none()
    if not income:
        raise HTTPException(status_code=404, detail="Дохід не знайдено")
    await db.delete(income)
    await db.commit()
