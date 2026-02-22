from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.models.expense import Expense
from app.models.income import Income
from app.models.nhsu import NhsuSettings
from app.models.user import User
from app.schemas.report import AnnualReport, MonthlyPL, PeriodReport

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
    nhsu_result = await db.execute(
        select(NhsuSettings).where(NhsuSettings.user_id == user.id)
    )
    nhsu = nhsu_result.scalar_one_or_none()
    esv_monthly = float(nhsu.esv_monthly) if nhsu else settings.esv_monthly
    vz_rate = float(nhsu.vz_rate) / 100 if nhsu else 0.015
    days = (date_to - date_from).days + 1
    months = max(1, round(days / 30))
    tax_esv = round(esv_monthly * months, 2)
    tax_vz = round(total_income * vz_rate, 2)
    total_taxes = round(tax_single + tax_esv + tax_vz, 2)

    net_profit = round(total_income - total_expenses, 2)
    income_after_taxes = round(net_profit - total_taxes, 2)

    return PeriodReport(
        period=f"{date_from} — {date_to}",
        total_income=total_income,
        total_expenses=total_expenses,
        net_profit=net_profit,
        tax_single=tax_single,
        tax_esv=tax_esv,
        tax_vz=tax_vz,
        total_taxes=total_taxes,
        income_after_taxes=income_after_taxes,
    )


MONTH_NAMES_UA = [
    "", "Січень", "Лютий", "Березень", "Квітень",
    "Травень", "Червень", "Липень", "Серпень",
    "Вересень", "Жовтень", "Листопад", "Грудень",
]


@router.get("/annual", response_model=AnnualReport)
async def annual_report(
    year: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    nhsu_result = await db.execute(
        select(NhsuSettings).where(NhsuSettings.user_id == user.id)
    )
    nhsu = nhsu_result.scalar_one_or_none()
    esv_monthly = float(nhsu.esv_monthly) if nhsu else settings.esv_monthly
    vz_rate = float(nhsu.vz_rate) / 100 if nhsu else 0.015

    months_data: list[MonthlyPL] = []
    totals = dict(income=0.0, expenses=0.0, net=0.0, single=0.0, esv=0.0, vz=0.0, taxes=0.0, after=0.0)

    for m in range(1, 13):
        d_start = date(year, m, 1)
        d_end = date(year, m + 1, 1) if m < 12 else date(year, 12, 31)

        inc_r = await db.execute(
            select(func.coalesce(func.sum(Income.amount), 0)).where(
                Income.user_id == user.id,
                Income.date >= d_start,
                Income.date <= d_end if m == 12 else Income.date < d_end,
            )
        )
        income = float(inc_r.scalar())

        exp_r = await db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(
                Expense.user_id == user.id,
                Expense.date >= d_start,
                Expense.date <= d_end if m == 12 else Expense.date < d_end,
            )
        )
        expenses = float(exp_r.scalar())

        tax_single = round(income * user.tax_rate, 2)
        tax_esv = round(esv_monthly, 2)
        tax_vz = round(income * vz_rate, 2)
        total_taxes = round(tax_single + tax_esv + tax_vz, 2)
        net_profit = round(income - expenses, 2)
        income_after = round(net_profit - total_taxes, 2)

        months_data.append(MonthlyPL(
            month=m,
            month_name=MONTH_NAMES_UA[m],
            income=income,
            expenses=expenses,
            net_profit=net_profit,
            tax_single=tax_single,
            tax_esv=tax_esv,
            tax_vz=tax_vz,
            total_taxes=total_taxes,
            income_after_taxes=income_after,
        ))

        totals["income"] += income
        totals["expenses"] += expenses
        totals["net"] += net_profit
        totals["single"] += tax_single
        totals["esv"] += tax_esv
        totals["vz"] += tax_vz
        totals["taxes"] += total_taxes
        totals["after"] += income_after

    return AnnualReport(
        year=year,
        months=months_data,
        total_income=round(totals["income"], 2),
        total_expenses=round(totals["expenses"], 2),
        total_net_profit=round(totals["net"], 2),
        total_tax_single=round(totals["single"], 2),
        total_tax_esv=round(totals["esv"], 2),
        total_tax_vz=round(totals["vz"], 2),
        total_taxes=round(totals["taxes"], 2),
        total_income_after_taxes=round(totals["after"], 2),
    )
