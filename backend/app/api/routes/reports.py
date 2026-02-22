from __future__ import annotations

from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.models.expense import Expense, ExpenseCategory
from app.models.income import Income, IncomeCategory
from app.models.nhsu import NhsuSettings
from app.models.user import User
from app.schemas.report import (
    AnnualReport,
    CategoryBreakdown,
    DashboardData,
    DashboardInsight,
    MonthlyPL,
    PeriodReport,
    TrendPoint,
)

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


# ── Dashboard (enriched) ─────────────────────────────────────────────


async def _month_range(year: int, month: int) -> tuple[date, date]:
    d_start = date(year, month, 1)
    if month == 12:
        d_end = date(year, 12, 31)
    else:
        d_end = date(year, month + 1, 1)
    return d_start, d_end


async def _month_totals(
    db: AsyncSession,
    user_id: int,
    year: int,
    month: int,
    esv_monthly: float,
    vz_rate: float,
    tax_rate: float,
) -> dict:
    d_start, d_end = await _month_range(year, month)
    is_dec = month == 12

    inc_r = await db.execute(
        select(func.coalesce(func.sum(Income.amount), 0)).where(
            Income.user_id == user_id,
            Income.date >= d_start,
            Income.date <= d_end if is_dec else Income.date < d_end,
        )
    )
    income = float(inc_r.scalar())

    exp_r = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == user_id,
            Expense.date >= d_start,
            Expense.date <= d_end if is_dec else Expense.date < d_end,
        )
    )
    expenses = float(exp_r.scalar())

    tax_single = round(income * tax_rate, 2)
    tax_esv = round(esv_monthly, 2)
    tax_vz = round(income * vz_rate, 2)
    total_taxes = round(tax_single + tax_esv + tax_vz, 2)
    profit = round(income - expenses, 2)

    return {
        "income": income,
        "expenses": expenses,
        "profit": profit,
        "tax_single": tax_single,
        "tax_esv": tax_esv,
        "tax_vz": tax_vz,
        "total_taxes": total_taxes,
        "income_after_taxes": round(profit - total_taxes, 2),
    }


def _pct_change(cur: float, prev: float) -> float:
    if prev == 0:
        return 0.0
    return round((cur - prev) / abs(prev) * 100, 1)


def _generate_insights(
    cur: dict,
    prev: dict,
    avg_income: float,
    avg_expenses: float,
) -> list[DashboardInsight]:
    items: list[DashboardInsight] = []

    income = cur["income"]
    expenses = cur["expenses"]
    profit = cur["profit"]

    # 1. Income dropped vs previous month
    if prev["income"] > 0 and income < prev["income"] * 0.8:
        drop = round((1 - income / prev["income"]) * 100, 1)
        items.append(DashboardInsight(
            type="warning",
            title=f"Дохід знизився на {drop}%",
            description=f"Порівняно з попереднім місяцем ({prev['income']:,.0f} → {income:,.0f} грн). Перевірте причини зменшення.",
        ))
    elif prev["income"] > 0 and income > prev["income"] * 1.2:
        growth = round((income / prev["income"] - 1) * 100, 1)
        items.append(DashboardInsight(
            type="insight",
            title=f"Дохід зріс на {growth}%",
            description=f"Порівняно з попереднім місяцем ({prev['income']:,.0f} → {income:,.0f} грн). Визначте фактори зростання.",
        ))

    # 2. Expenses grew faster than income
    if prev["expenses"] > 0 and expenses > prev["expenses"] * 1.15 and income <= prev["income"] * 1.05:
        items.append(DashboardInsight(
            type="risk",
            title="Витрати ростуть швидше за доходи",
            description=f"Витрати: +{_pct_change(expenses, prev['expenses'])}%, дохід: +{_pct_change(income, prev['income'])}%. Ризик зниження рентабельності.",
        ))

    # 3. Income below 6-month average
    if avg_income > 0 and income < avg_income * 0.85:
        items.append(DashboardInsight(
            type="warning",
            title="Дохід нижче середнього за 6 місяців",
            description=f"Поточний: {income:,.0f} грн, середній: {avg_income:,.0f} грн. Можливо, є сезонний спад або втрата клієнтів.",
        ))

    # 4. Negative profit
    if profit < 0:
        items.append(DashboardInsight(
            type="risk",
            title="Збитковий місяць",
            description=f"Витрати ({expenses:,.0f} грн) перевищують доходи ({income:,.0f} грн). Необхідно терміново переглянути витрати.",
        ))

    # 5. Tax burden
    if income > 0:
        tax_share = cur["total_taxes"] / income * 100
        if tax_share > 15:
            items.append(DashboardInsight(
                type="insight",
                title=f"Податкове навантаження: {tax_share:.1f}%",
                description="Розгляньте оптимізацію через структуру доходів та витрат.",
            ))

    # 6. Good month
    if income > 0 and profit > 0 and (avg_income == 0 or income >= avg_income):
        items.append(DashboardInsight(
            type="opportunity",
            title="Місяць вище середнього",
            description=f"Дохід {income:,.0f} грн при прибутку {profit:,.0f} грн. Гарний результат — зафіксуйте причини успіху.",
        ))

    return items[:7]


@router.get("/dashboard", response_model=DashboardData)
async def dashboard_report(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Load settings
    nhsu_result = await db.execute(
        select(NhsuSettings).where(NhsuSettings.user_id == user.id)
    )
    nhsu = nhsu_result.scalar_one_or_none()
    esv_monthly = float(nhsu.esv_monthly) if nhsu else settings.esv_monthly
    vz_rate = float(nhsu.vz_rate) / 100 if nhsu else 0.015

    # Current month
    cur = await _month_totals(db, user.id, year, month, esv_monthly, vz_rate, user.tax_rate)

    # Previous month
    prev_m, prev_y = (month - 1, year) if month > 1 else (12, year - 1)
    prev = await _month_totals(db, user.id, prev_y, prev_m, esv_monthly, vz_rate, user.tax_rate)

    # 6-month trend
    trend: list[TrendPoint] = []
    sum_income = 0.0
    sum_expenses = 0.0
    sum_profit = 0.0
    for i in range(5, -1, -1):
        d = date(year, month, 1)
        # Go back i months
        ty = year
        tm = month - i
        while tm <= 0:
            tm += 12
            ty -= 1
        m_data = await _month_totals(db, user.id, ty, tm, esv_monthly, vz_rate, user.tax_rate)
        trend.append(TrendPoint(
            month_name=MONTH_NAMES_UA[tm][:3],
            income=m_data["income"],
            expenses=m_data["expenses"],
            profit=m_data["profit"],
            taxes=m_data["total_taxes"],
        ))
        sum_income += m_data["income"]
        sum_expenses += m_data["expenses"]
        sum_profit += m_data["profit"]

    avg_income_6m = round(sum_income / 6, 2)
    avg_expenses_6m = round(sum_expenses / 6, 2)
    avg_profit_6m = round(sum_profit / 6, 2)

    # Income by category
    d_start, d_end = await _month_range(year, month)
    is_dec = month == 12

    # Load income categories
    cat_res = await db.execute(select(IncomeCategory))
    income_cats = {c.id: c.name for c in cat_res.scalars().all()}

    # Income by category
    inc_cat_q = await db.execute(
        select(Income.category_id, func.sum(Income.amount)).where(
            Income.user_id == user.id,
            Income.date >= d_start,
            Income.date <= d_end if is_dec else Income.date < d_end,
        ).group_by(Income.category_id)
    )
    income_by_cat_raw: dict[str, float] = defaultdict(float)
    for cat_id, amt in inc_cat_q.all():
        name = income_cats.get(cat_id, "Без категорії") if cat_id else "Без категорії"
        income_by_cat_raw[name] += float(amt)

    income_by_category = sorted(
        [
            CategoryBreakdown(
                name=name,
                amount=round(amt, 2),
                pct=round(amt / cur["income"] * 100, 1) if cur["income"] > 0 else 0,
            )
            for name, amt in income_by_cat_raw.items()
        ],
        key=lambda x: x.amount,
        reverse=True,
    )

    # Load expense categories
    exp_cat_res = await db.execute(select(ExpenseCategory))
    expense_cats = {c.id: c.name for c in exp_cat_res.scalars().all()}

    # Expenses by category
    exp_cat_q = await db.execute(
        select(Expense.category_id, func.sum(Expense.amount)).where(
            Expense.user_id == user.id,
            Expense.date >= d_start,
            Expense.date <= d_end if is_dec else Expense.date < d_end,
        ).group_by(Expense.category_id)
    )
    expense_by_cat_raw: dict[str, float] = defaultdict(float)
    for cat_id, amt in exp_cat_q.all():
        name = expense_cats.get(cat_id, "Без категорії") if cat_id else "Без категорії"
        expense_by_cat_raw[name] += float(amt)

    expense_by_category = sorted(
        [
            CategoryBreakdown(
                name=name,
                amount=round(amt, 2),
                pct=round(amt / cur["expenses"] * 100, 1) if cur["expenses"] > 0 else 0,
            )
            for name, amt in expense_by_cat_raw.items()
        ],
        key=lambda x: x.amount,
        reverse=True,
    )

    # Top income sources (by source field)
    inc_src_q = await db.execute(
        select(Income.source, func.sum(Income.amount)).where(
            Income.user_id == user.id,
            Income.date >= d_start,
            Income.date <= d_end if is_dec else Income.date < d_end,
        ).group_by(Income.source)
    )
    top_income_sources = sorted(
        [
            CategoryBreakdown(
                name=src or "Не вказано",
                amount=round(float(amt), 2),
                pct=round(float(amt) / cur["income"] * 100, 1) if cur["income"] > 0 else 0,
            )
            for src, amt in inc_src_q.all()
        ],
        key=lambda x: x.amount,
        reverse=True,
    )[:10]

    # Top expense items (by description)
    exp_item_q = await db.execute(
        select(Expense.description, func.sum(Expense.amount)).where(
            Expense.user_id == user.id,
            Expense.date >= d_start,
            Expense.date <= d_end if is_dec else Expense.date < d_end,
        ).group_by(Expense.description).order_by(func.sum(Expense.amount).desc()).limit(10)
    )
    top_expense_items = [
        CategoryBreakdown(
            name=desc or "Без опису",
            amount=round(float(amt), 2),
            pct=round(float(amt) / cur["expenses"] * 100, 1) if cur["expenses"] > 0 else 0,
        )
        for desc, amt in exp_item_q.all()
    ]

    # Generate insights
    insights = _generate_insights(cur, prev, avg_income_6m, avg_expenses_6m)

    return DashboardData(
        year=year,
        month=month,
        period_label=f"{MONTH_NAMES_UA[month]} {year}",
        total_income=cur["income"],
        total_expenses=cur["expenses"],
        net_profit=cur["profit"],
        tax_single=cur["tax_single"],
        tax_esv=cur["tax_esv"],
        tax_vz=cur["tax_vz"],
        total_taxes=cur["total_taxes"],
        income_after_taxes=cur["income_after_taxes"],
        prev_income=prev["income"],
        prev_expenses=prev["expenses"],
        prev_profit=prev["profit"],
        prev_taxes=prev["total_taxes"],
        income_change_pct=_pct_change(cur["income"], prev["income"]),
        expenses_change_pct=_pct_change(cur["expenses"], prev["expenses"]),
        profit_change_pct=_pct_change(cur["profit"], prev["profit"]),
        taxes_change_pct=_pct_change(cur["total_taxes"], prev["total_taxes"]),
        avg_income_6m=avg_income_6m,
        avg_expenses_6m=avg_expenses_6m,
        avg_profit_6m=avg_profit_6m,
        income_by_category=income_by_category,
        expense_by_category=expense_by_category,
        trend=trend,
        insights=insights,
        top_income_sources=top_income_sources,
        top_expense_items=top_expense_items,
    )
