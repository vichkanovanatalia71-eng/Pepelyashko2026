from __future__ import annotations

from datetime import date, datetime
from calendar import monthrange

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.expense import Employee, Expense, ExpenseCategory
from app.models.user import User
from app.schemas.expense import (
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate,
    ExpenseCategoryCreate,
    ExpenseCategoryResponse,
    ExpenseCreate,
    ExpenseDashboard,
    ExpenseByMonth,
    ExpenseResponse,
    ExpenseSummary,
    ExpenseUpdate,
)

router = APIRouter()


# ── Categories ─────────────────────────────────────────────────────────


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


# ── Employees ──────────────────────────────────────────────────────────


@router.get("/employees", response_model=list[EmployeeResponse])
async def list_employees(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Employee)
        .where(Employee.user_id == user.id, Employee.is_active.is_(True))
        .order_by(Employee.full_name)
    )
    return result.scalars().all()


@router.post("/employees", response_model=EmployeeResponse, status_code=201)
async def create_employee(
    emp_in: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    emp = Employee(user_id=user.id, **emp_in.model_dump())
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    return emp


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    emp_in: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.user_id == user.id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Працівника не знайдено")
    for field, value in emp_in.model_dump(exclude_unset=True).items():
        setattr(emp, field, value)
    await db.commit()
    await db.refresh(emp)
    return emp


@router.delete("/employees/{employee_id}", status_code=204)
async def delete_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.user_id == user.id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Працівника не знайдено")
    # Видаляємо залежні зарплатні витрати
    salary_expenses = await db.execute(
        select(Expense).where(
            Expense.user_id == user.id,
            Expense.employee_id == employee_id,
        )
    )
    for exp in salary_expenses.scalars().all():
        await db.delete(exp)
    await db.delete(emp)
    await db.commit()


# ── Expenses ───────────────────────────────────────────────────────────


@router.get("/", response_model=list[ExpenseResponse])
async def list_expenses(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    category_id: int | None = Query(None),
    expense_type: str | None = Query(None),
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
    if expense_type:
        query = query.where(Expense.expense_type == expense_type)
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


# ── Dashboard / Summary ────────────────────────────────────────────────


@router.get("/dashboard", response_model=ExpenseDashboard)
async def expense_dashboard(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Повертає агреговані дані для дашборду витрат."""

    query = select(Expense).where(Expense.user_id == user.id)
    if date_from:
        query = query.where(Expense.date >= date_from)
    if date_to:
        query = query.where(Expense.date <= date_to)

    result = await db.execute(query)
    expenses = result.scalars().all()

    total_fixed = sum(float(e.amount) for e in expenses if e.expense_type == "fixed")
    total_salary = sum(float(e.amount) for e in expenses if e.expense_type == "salary")
    total_other = sum(float(e.amount) for e in expenses if e.expense_type == "other")
    total_tax = sum(float(e.amount) for e in expenses if e.expense_type == "tax")
    grand_total = total_fixed + total_salary + total_other + total_tax

    # Порахувати частки
    salary_share = round(total_salary / grand_total * 100, 1) if grand_total > 0 else 0
    tax_share = round(total_tax / grand_total * 100, 1) if grand_total > 0 else 0
    fixed_share = round(total_fixed / grand_total * 100, 1) if grand_total > 0 else 0
    other_share = round(total_other / grand_total * 100, 1) if grand_total > 0 else 0

    # Група за місяцями
    monthly: dict[str, dict[str, float]] = {}
    for e in expenses:
        key = f"{e.date.year}-{e.date.month:02d}"
        if key not in monthly:
            monthly[key] = {"fixed": 0, "salary": 0, "other": 0, "tax": 0, "total": 0}
        amount = float(e.amount)
        monthly[key][e.expense_type] += amount
        monthly[key]["total"] += amount

    by_month = [
        ExpenseByMonth(month=k, **v) for k, v in sorted(monthly.items())
    ]

    return ExpenseDashboard(
        summary=ExpenseSummary(
            total_fixed=round(total_fixed, 2),
            total_salary=round(total_salary, 2),
            total_other=round(total_other, 2),
            total_tax=round(total_tax, 2),
            grand_total=round(grand_total, 2),
        ),
        by_month=by_month,
        salary_share=salary_share,
        tax_share=tax_share,
        fixed_share=fixed_share,
        other_share=other_share,
    )
