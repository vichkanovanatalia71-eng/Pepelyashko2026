from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.expense import Expense, ExpenseCategory
from app.models.user import User
from app.schemas.expense import (
    ExpenseCategoryCreate,
    ExpenseCategoryResponse,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
)

router = APIRouter()


# --- Categories ---


@router.get("/categories", response_model=list[ExpenseCategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ExpenseCategory).order_by(ExpenseCategory.name))
    return result.scalars().all()


@router.post("/categories", response_model=ExpenseCategoryResponse, status_code=201)
async def create_category(
    cat_in: ExpenseCategoryCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    category = ExpenseCategory(**cat_in.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


# --- Expenses ---


@router.get("/", response_model=list[ExpenseResponse])
async def list_expenses(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    category_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Expense).where(Expense.user_id == user.id).order_by(Expense.date.desc())
    if date_from:
        query = query.where(Expense.date >= date_from)
    if date_to:
        query = query.where(Expense.date <= date_to)
    if category_id:
        query = query.where(Expense.category_id == category_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    expense_in: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    expense = Expense(user_id=user.id, **expense_in.model_dump())
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    expense_in: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == user.id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Витрату не знайдено")
    for field, value in expense_in.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    await db.commit()
    await db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=204)
async def delete_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == user.id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Витрату не знайдено")
    await db.delete(expense)
    await db.commit()
