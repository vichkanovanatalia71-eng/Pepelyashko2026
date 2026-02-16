from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.models.expense import Expense
from app.models.income import Income
from app.models.user import User
from app.schemas.report import PeriodReport

router = APIRouter()


@router.get("/period", response_model=PeriodReport)
async def period_report(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Total income
    income_result = await db.execute(
        select(func.coalesce(func.sum(Income.amount), 0)).where(
            Income.user_id == user.id,
            Income.date >= date_from,
            Income.date <= date_to,
        )
    )
    total_income = float(income_result.scalar())

    # Total expenses
    expense_result = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == user.id,
            Expense.date >= date_from,
            Expense.date <= date_to,
        )
    )
    total_expenses = float(expense_result.scalar())

    # Calculate taxes
    tax_single = round(total_income * user.tax_rate, 2)
    # Approximate ESV based on number of months in period
    days = (date_to - date_from).days + 1
    months = max(1, round(days / 30))
    tax_esv = round(settings.esv_monthly * months, 2)
    total_taxes = round(tax_single + tax_esv, 2)

    net_profit = round(total_income - total_expenses, 2)
    income_after_taxes = round(net_profit - total_taxes, 2)

    return PeriodReport(
        period=f"{date_from} — {date_to}",
        total_income=total_income,
        total_expenses=total_expenses,
        net_profit=net_profit,
        tax_single=tax_single,
        tax_esv=tax_esv,
        total_taxes=total_taxes,
        income_after_taxes=income_after_taxes,
    )
