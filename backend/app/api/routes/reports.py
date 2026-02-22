from __future__ import annotations

import json
from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.models.doctor import Doctor
from app.models.expense import Expense, ExpenseCategory
from app.models.income import Income, IncomeCategory
from app.models.monthly_service import MonthlyPaidServiceEntry, MonthlyPaidServicesReport
from app.models.monthly_expense import MonthlyFixedExpense, MonthlySalaryExpense
from app.models.nhsu import AGE_GROUPS, NhsuRecord, NhsuSettings
from app.models.service import Service
from app.models.staff import StaffMember
from app.models.user import User
from app.schemas.report import (
    AgeGroupBreakdown,
    AiInsight,
    AnnualReport,
    CategoryBreakdown,
    DashboardData,
    DashboardInsight,
    DataIntegrityWarning,
    DoctorPatientLoad,
    DoctorRevenue,
    DoctorServiceBreakdown,
    MonthlyPL,
    OwnerFinancialInfo,
    PeriodReport,
    ServiceBreakdownDetail,
    ServiceRevenue,
    StaffRoleBreakdown,
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


async def _get_income_by_doctors(
    db: AsyncSession,
    user_id: int,
    year: int,
    month: int,
) -> tuple[list[DoctorRevenue], float, float]:
    """Get income breakdown by doctor (NHSU + paid services)."""
    d_start, d_end = await _month_range(year, month)

    # Get doctors
    doc_result = await db.execute(
        select(Doctor).where(Doctor.user_id == user_id, Doctor.is_active)
    )
    doctors = {d.id: d.full_name for d in doc_result.scalars().all()}

    result = defaultdict(lambda: {"nhsu": 0.0, "paid": 0.0})

    total_nhsu = 0.0
    total_paid = 0.0

    # NHSU income from nhsu_records (Python property: capitation * coeff * patients / 12)
    nhsu_q = await db.execute(
        select(NhsuRecord).where(
            NhsuRecord.user_id == user_id,
            NhsuRecord.year == year,
            NhsuRecord.month == month,
        )
    )
    for rec in nhsu_q.scalars().all():
        amt = rec.amount
        result[rec.doctor_id]["nhsu"] += amt
        total_nhsu += amt

    # Paid services income (service.price * quantity per doctor)
    paid_q = await db.execute(
        select(
            MonthlyPaidServicesReport.doctor_id,
            MonthlyPaidServiceEntry.service_id,
            MonthlyPaidServiceEntry.quantity,
            Service.price,
        ).join(
            MonthlyPaidServiceEntry,
            MonthlyPaidServiceEntry.report_id == MonthlyPaidServicesReport.id,
        ).join(
            Service,
            MonthlyPaidServiceEntry.service_id == Service.id,
        ).where(
            MonthlyPaidServicesReport.user_id == user_id,
            MonthlyPaidServicesReport.year == year,
            MonthlyPaidServicesReport.month == month,
        )
    )
    for doc_id, _svc_id, qty, price in paid_q.all():
        rev = float(price) * int(qty)
        result[doc_id]["paid"] += rev
        total_paid += rev

    # Convert to DoctorRevenue list
    doctor_revenues: list[DoctorRevenue] = []
    for doc_id, name in doctors.items():
        rev = result[doc_id]
        doctor_revenues.append(DoctorRevenue(
            doctor_id=doc_id,
            doctor_name=name,
            nhsu=round(rev["nhsu"], 2),
            paid_services=round(rev["paid"], 2),
            total=round(rev["nhsu"] + rev["paid"], 2),
        ))

    return sorted(doctor_revenues, key=lambda x: x.total, reverse=True), round(total_nhsu, 2), round(total_paid, 2)


async def _get_top_services(
    db: AsyncSession,
    user_id: int,
    year: int,
    month: int,
    limit: int = 10,
) -> list[ServiceRevenue]:
    """Get top services by quantity in this month."""
    # Query monthly service entries
    services_q = await db.execute(
        select(
            MonthlyPaidServiceEntry.service_id,
            func.sum(MonthlyPaidServiceEntry.quantity).label("qty"),
        ).join(
            MonthlyPaidServicesReport,
            MonthlyPaidServiceEntry.report_id == MonthlyPaidServicesReport.id,
        ).where(
            MonthlyPaidServicesReport.user_id == user_id,
            MonthlyPaidServicesReport.year == year,
            MonthlyPaidServicesReport.month == month,
        ).group_by(MonthlyPaidServiceEntry.service_id)
        .order_by(func.sum(MonthlyPaidServiceEntry.quantity).desc())
        .limit(limit)
    )

    result: list[ServiceRevenue] = []
    for service_id, qty in services_q.all():
        # Get service info
        svc_result = await db.execute(select(Service).where(Service.id == service_id))
        svc = svc_result.scalar_one_or_none()
        if svc:
            result.append(ServiceRevenue(
                service_id=service_id,
                code=svc.code,
                name=svc.name,
                quantity=int(qty) if qty else 0,
                revenue=round(float(svc.price) * (int(qty) if qty else 0), 2),
            ))

    return result


async def _check_data_integrity(
    db: AsyncSession,
    user_id: int,
    year: int,
    month: int,
) -> list[DataIntegrityWarning]:
    """Check for data quality issues."""
    warnings: list[DataIntegrityWarning] = []

    # Check for missing salary data
    staff_result = await db.execute(
        select(StaffMember).where(StaffMember.user_id == user_id, StaffMember.is_active)
    )
    staff_count = len(staff_result.scalars().all())

    # Check if expenses are zero for whole month
    d_start, d_end = await _month_range(year, month)
    exp_result = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == user_id,
            Expense.date >= d_start,
            Expense.date <= d_end if month != 12 else Expense.date < d_end,
        )
    )
    total_expenses = float(exp_result.scalar())

    if staff_count > 0 and total_expenses == 0:
        warnings.append(DataIntegrityWarning(
            type="missing_data",
            message="Немає даних про витрати за період. Можливо, дані не введені.",
        ))

    return warnings


async def _get_nhsu_settings(db: AsyncSession, user_id: int) -> NhsuSettings | None:
    """Get NHSU settings to extract tax rates."""
    res = await db.execute(select(NhsuSettings).where(NhsuSettings.user_id == user_id))
    return res.scalar_one_or_none()


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

    # 1. Income from incomes table (manual entries)
    inc_r = await db.execute(
        select(func.coalesce(func.sum(Income.amount), 0)).where(
            Income.user_id == user_id,
            Income.date >= d_start,
            Income.date <= d_end if is_dec else Income.date < d_end,
        )
    )
    manual_income = float(inc_r.scalar())

    # 2. NHSU income from nhsu_records (capitation_rate * age_coefficient * patients / 12)
    nhsu_q = await db.execute(
        select(NhsuRecord).where(
            NhsuRecord.user_id == user_id,
            NhsuRecord.year == year,
            NhsuRecord.month == month,
        )
    )
    nhsu_records = nhsu_q.scalars().all()
    nhsu_income = sum(r.amount for r in nhsu_records)

    # 3. Paid services income (service.price * quantity)
    paid_entries_q = await db.execute(
        select(MonthlyPaidServiceEntry.quantity, Service.price).join(
            MonthlyPaidServicesReport,
            MonthlyPaidServiceEntry.report_id == MonthlyPaidServicesReport.id,
        ).join(
            Service,
            MonthlyPaidServiceEntry.service_id == Service.id,
        ).where(
            MonthlyPaidServicesReport.user_id == user_id,
            MonthlyPaidServicesReport.year == year,
            MonthlyPaidServicesReport.month == month,
        )
    )
    paid_income = sum(
        float(price) * int(qty)
        for qty, price in paid_entries_q.all()
    )

    # Total income = manual + NHSU + paid services
    income = round(manual_income + nhsu_income + paid_income, 2)

    # 4. Fixed expenses from MonthlyFixedExpense
    fixed_r = await db.execute(
        select(func.coalesce(func.sum(MonthlyFixedExpense.amount), 0)).where(
            MonthlyFixedExpense.user_id == user_id,
            MonthlyFixedExpense.year == year,
            MonthlyFixedExpense.month == month,
        )
    )
    fixed_total = float(fixed_r.scalar())

    # 5. Salary expenses (brutto + PDFO + VZ + ESV + supplement + bonus)
    salary_records = (await db.execute(
        select(MonthlySalaryExpense).where(
            MonthlySalaryExpense.user_id == user_id,
            MonthlySalaryExpense.year == year,
            MonthlySalaryExpense.month == month,
        )
    )).scalars().all()

    salary_total = 0.0
    esv_employer = 0.0
    for rec in salary_records:
        brutto = float(rec.brutto) if rec.brutto else 0.0
        pdfo = round(brutto * 0.18, 2)  # PDFO 18%
        vz_zp = round(brutto * 0.05, 2)  # VZ 5%
        esv = round(brutto * 0.22, 2)    # ESV employer 22%

        # Calculate netto
        netto = round(brutto - pdfo - vz_zp, 2)

        # Calculate supplement to reach target_net if needed
        supplement = 0.0
        if rec.has_supplement and rec.target_net:
            target = float(rec.target_net)
            supplement = max(0, target - netto)

        bonus = float(rec.individual_bonus) if rec.individual_bonus else 0.0

        employer_cost = round(brutto + esv + supplement + bonus, 2)
        salary_total += employer_cost
        esv_employer += esv

    # 6. Tax expenses (ЄП, ВЗ, ЄСВ власника)
    # vz_rate is already in decimal form (0.015 = 1.5%), passed from endpoint
    # Get EP rate from settings
    nhsu = await _get_nhsu_settings(db, user_id)
    ep_rate_pct = 5.0  # default
    if nhsu:
        ep_rate_pct = float(nhsu.ep_rate)

    ep = round(income * ep_rate_pct / 100, 2)
    vz = round(income * vz_rate, 2)  # vz_rate is already in decimal form
    esv_owner = round(esv_monthly, 2)

    tax_total = round(ep + vz + esv_owner + esv_employer, 2)

    # 7. Ad-hoc expenses from Expense table
    exp_r = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == user_id,
            Expense.date >= d_start,
            Expense.date <= d_end if is_dec else Expense.date < d_end,
        )
    )
    adhoc_expenses = float(exp_r.scalar())

    # Total expenses = fixed + salary + tax + ad-hoc
    expenses = round(fixed_total + salary_total + tax_total + adhoc_expenses, 2)

    profit = round(income - expenses, 2)

    # Calculate individual tax components for dashboard display
    tax_single = round(income * tax_rate, 2)  # PDFO-like single tax
    tax_esv = round(esv_monthly, 2)

    return {
        "income": income,
        "expenses": expenses,
        "profit": profit,
        "tax_single": tax_single,
        "tax_esv": tax_esv,
        "tax_vz": vz,
        "total_taxes": tax_total,
        "income_after_taxes": round(profit - tax_total, 2),
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


# ─── ПРІОРИТЕТ 1: Функції для дополнительных даних ──────────────────────

async def _get_patients_by_age(db: AsyncSession, user_id: int, year: int, month: int) -> tuple[list[AgeGroupBreakdown], int, int, int]:
    """Отримати пацієнтів по вікових групах для поточного місяця.
    Повертає: (список по групам, всього пацієнтів, неверифікованих, всього попереднього місяця)
    """
    # Поточний місяць
    current_q = await db.execute(
        select(NhsuRecord.age_group, func.sum(NhsuRecord.patient_count), func.sum(NhsuRecord.non_verified)).where(
            NhsuRecord.user_id == user_id,
            NhsuRecord.year == year,
            NhsuRecord.month == month,
        ).group_by(NhsuRecord.age_group)
    )
    current_data = {row[0]: (int(row[1] or 0), float(row[2] or 0)) for row in current_q.all()}

    # Попередній місяць
    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    prev_q = await db.execute(
        select(func.sum(NhsuRecord.patient_count)).where(
            NhsuRecord.user_id == user_id,
            NhsuRecord.year == prev_year,
            NhsuRecord.month == prev_month,
        )
    )
    prev_total = int(prev_q.scalar() or 0)

    # Розраховуємо загальні числа
    total_patients = sum(p[0] for p in current_data.values())
    total_non_verified = sum(int(p[1]) for p in current_data.values())

    # Формуємо результат
    result = []
    for age_group_def in AGE_GROUPS:
        key = age_group_def["key"]
        patient_count, non_verified = current_data.get(key, (0, 0))
        result.append(AgeGroupBreakdown(
            age_group=key,
            age_label=age_group_def["label"],
            patient_count=patient_count,
            non_verified=int(non_verified),
            pct=round(patient_count / total_patients * 100, 1) if total_patients > 0 else 0,
        ))

    return result, total_patients, total_non_verified, prev_total


async def _get_patients_by_doctor(db: AsyncSession, user_id: int, year: int, month: int) -> list[DoctorPatientLoad]:
    """Отримати кількість пацієнтів на кожного лікаря з порівнянням до попереднього місяця."""

    # Поточний місяць - пацієнти з NHSU
    nhsu_q = await db.execute(
        select(
            NhsuRecord.doctor_id,
            Doctor.full_name,
            func.sum(NhsuRecord.patient_count),
        ).join(
            Doctor, NhsuRecord.doctor_id == Doctor.id
        ).where(
            NhsuRecord.user_id == user_id,
            NhsuRecord.year == year,
            NhsuRecord.month == month,
        ).group_by(NhsuRecord.doctor_id, Doctor.full_name)
    )
    current_data = {}
    for row in nhsu_q.all():
        doctor_id = row[0]
        current_data[doctor_id] = {
            "name": row[1],
            "patients": int(row[2] or 0),
            "services": 0,
            "revenue": 0,
        }

    # Послуги та дохід по лікарям
    services_q = await db.execute(
        select(
            Doctor.id,
            func.count(MonthlyPaidServiceEntry.id).label("services_count"),
            func.sum(Service.price).label("revenue"),
        ).join(
            MonthlyPaidServicesReport, Doctor.id == MonthlyPaidServicesReport.doctor_id
        ).join(
            MonthlyPaidServiceEntry, MonthlyPaidServiceEntry.report_id == MonthlyPaidServicesReport.id
        ).join(
            Service, MonthlyPaidServiceEntry.service_id == Service.id
        ).where(
            MonthlyPaidServicesReport.user_id == user_id,
            MonthlyPaidServicesReport.year == year,
            MonthlyPaidServicesReport.month == month,
        ).group_by(Doctor.id)
    )
    for row in services_q.all():
        doctor_id = row[0]
        if doctor_id in current_data:
            current_data[doctor_id]["services"] = int(row[1] or 0)
            current_data[doctor_id]["revenue"] = float(row[2] or 0)

    # Попередній місяць
    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    prev_q = await db.execute(
        select(NhsuRecord.doctor_id, func.sum(NhsuRecord.patient_count)).where(
            NhsuRecord.user_id == user_id,
            NhsuRecord.year == prev_year,
            NhsuRecord.month == prev_month,
        ).group_by(NhsuRecord.doctor_id)
    )
    prev_data = {row[0]: int(row[1] or 0) for row in prev_q.all()}

    # Формуємо результат
    result = []
    for doctor_id, data in current_data.items():
        patient_count = data["patients"]
        prev_count = prev_data.get(doctor_id, 0)
        revenue = data["revenue"]
        revenue_per_patient = round(revenue / patient_count, 2) if patient_count > 0 else 0
        result.append(DoctorPatientLoad(
            doctor_id=doctor_id,
            doctor_name=data["name"],
            patient_count=patient_count,
            patient_count_prev=prev_count,
            patient_count_change_pct=round((patient_count - prev_count) / prev_count * 100, 1) if prev_count > 0 else 0,
            services_count=data["services"],
            revenue_per_patient=revenue_per_patient,
        ))

    return sorted(result, key=lambda x: x.patient_count, reverse=True)


async def _get_staff_breakdown(db: AsyncSession, user_id: int, year: int, month: int) -> tuple[list[StaffRoleBreakdown], float, float]:
    """Отримати розбивку персоналу по ролях з розрахунком зарплат.
    Повертає: (список по ролях, загальна зарплата, ФОП)
    """

    # Отримуємо персонал та зарплати
    staff_q = await db.execute(
        select(
            StaffMember.role,
            func.count(StaffMember.id),
        ).where(
            StaffMember.user_id == user_id,
            StaffMember.is_active,
        ).group_by(StaffMember.role)
    )
    staff_count = {row[0]: int(row[1]) for row in staff_q.all()}

    # Зарплати за місяць (brutto + bonuses + supplements)
    salary_q = await db.execute(
        select(
            StaffMember.role,
            func.sum(MonthlySalaryExpense.brutto),
            func.sum(MonthlySalaryExpense.individual_bonus),
            func.coalesce(func.sum(
                case(
                    (MonthlySalaryExpense.has_supplement == True,
                     MonthlySalaryExpense.target_net - (MonthlySalaryExpense.brutto * 0.77)),
                    else_=0.0
                )
            ), 0),
        ).join(
            MonthlySalaryExpense, StaffMember.id == MonthlySalaryExpense.staff_member_id
        ).where(
            StaffMember.user_id == user_id,
            MonthlySalaryExpense.year == year,
            MonthlySalaryExpense.month == month,
        ).group_by(StaffMember.role)
    )
    salary_data = {}
    total_salary_brutto = 0
    for row in salary_q.all():
        role = row[0]
        brutto = float(row[1] or 0)
        individual_bonus = float(row[2] or 0)
        supplement = float(row[3] or 0)

        # Calculate tax components
        pdfo = round(brutto * 0.18, 2)  # PDFO 18%
        vz = round(brutto * 0.05, 2)    # VZ 5%
        esv_emp = round(brutto * 0.22, 2)  # ESV employer 22%
        netto = round(brutto - pdfo - vz, 2)

        # Витрати роботодавця = brutto + esv_emp + individual_bonus + supplement
        total_employer_cost = round(brutto + esv_emp + individual_bonus + supplement, 2)

        salary_data[role] = {
            "netto": netto,
            "pdfo": pdfo,
            "vz": vz,
            "esv_emp": esv_emp,
            "brutto": brutto,
            "individual_bonus": individual_bonus,
            "supplement": supplement,
            "total_employer_cost": total_employer_cost,
        }
        total_salary_brutto += brutto

    # Формуємо результат
    result = []
    for role in staff_count.keys():
        count = staff_count.get(role, 0)
        sal = salary_data.get(role, {
            "netto": 0, "pdfo": 0, "vz": 0, "esv_emp": 0, "brutto": 0,
            "individual_bonus": 0, "supplement": 0, "total_employer_cost": 0
        })
        result.append(StaffRoleBreakdown(
            role=role,
            role_label="Лікар" if role == "doctor" else "Медсестра" if role == "nurse" else "Інший персонал",
            count=count,
            salary_total=round(sal["brutto"], 2),
            salary_netto_total=round(sal["netto"], 2),
            pdfo_total=round(sal["pdfo"], 2),
            vz_total=round(sal["vz"], 2),
            esv_employer_total=round(sal["esv_emp"], 2),
            salary_brutto_total=round(sal["brutto"], 2),
            individual_bonus_total=round(sal["individual_bonus"], 2),
            supplement_total=round(sal["supplement"], 2),
            total_employer_cost=round(sal["total_employer_cost"], 2),
            pct=round(sal["brutto"] / total_salary_brutto * 100, 1) if total_salary_brutto > 0 else 0,
        ))

    return result, total_salary_brutto, total_salary_brutto


async def _get_top_paid_services_detailed(db: AsyncSession, user_id: int, year: int, month: int) -> tuple[list[ServiceBreakdownDetail], float, float, float, int]:
    """Отримати ТОП платних послуг з розрахунком маржі та розподілом по лікарям.
    Повертає: (список послуг з деталями, загальна маржа, % маржі)
    """
    # Отримуємо всі послуги за місяць (per service + doctor combination)
    services_q = await db.execute(
        select(
            Service.id,
            Service.code,
            Service.name,
            Service.price,
            Service.materials,
            Doctor.id.label("doctor_id"),
            Doctor.full_name,
            func.sum(MonthlyPaidServiceEntry.quantity).label("qty"),
        ).join(
            MonthlyPaidServiceEntry, MonthlyPaidServiceEntry.service_id == Service.id
        ).join(
            MonthlyPaidServicesReport, MonthlyPaidServiceEntry.report_id == MonthlyPaidServicesReport.id
        ).join(
            Doctor, MonthlyPaidServicesReport.doctor_id == Doctor.id
        ).where(
            MonthlyPaidServicesReport.user_id == user_id,
            MonthlyPaidServicesReport.year == year,
            MonthlyPaidServicesReport.month == month,
        ).group_by(Service.id, Service.code, Service.name, Service.price, Service.materials, Doctor.id, Doctor.full_name)
    )

    # Агрегуємо дані по послугам
    service_data = {}
    for row in services_q.all():
        service_id = row[0]
        if service_id not in service_data:
            service_data[service_id] = {
                "code": row[1],
                "name": row[2],
                "price": float(row[3] or 0),
                "materials": row[4],  # JSON string
                "quantity": 0,
                "revenue": 0,
                "by_doctor": {},
            }

        doctor_id = row[5]
        doctor_name = row[6]
        qty = int(row[7] or 0)

        # Сумуємо загальну кількість та дохід
        service_data[service_id]["quantity"] += qty
        service_data[service_id]["revenue"] += float(row[3] or 0) * qty

        # Розподіл по лікарям
        if doctor_name not in service_data[service_id]["by_doctor"]:
            service_data[service_id]["by_doctor"][doctor_name] = {"qty": 0, "revenue": 0, "doctor_id": doctor_id}
        service_data[service_id]["by_doctor"][doctor_name]["qty"] += qty
        service_data[service_id]["by_doctor"][doctor_name]["revenue"] += float(row[3] or 0) * qty

    # Формуємо результат
    total_revenue = 0
    total_materials_cost = 0
    all_total_qty = 0  # Initialize here
    result = []

    for service_id, data in service_data.items():
        # Розраховуємо матеріали
        materials_cost = 0
        try:
            if data["materials"]:
                materials = json.loads(data["materials"]) if isinstance(data["materials"], str) else data["materials"]
                if isinstance(materials, list):
                    materials_cost = sum(float(m.get("cost", 0)) for m in materials) * data["quantity"]
        except:
            pass

        revenue = data["revenue"]
        margin = revenue - materials_cost
        margin_pct = round(margin / revenue * 100, 1) if revenue > 0 else 0

        # Розбивка по лікарям
        by_doctor = []
        for doctor_name, doc_data in data["by_doctor"].items():
            by_doctor.append(DoctorServiceBreakdown(
                doctor_id=doc_data["doctor_id"],
                doctor_name=doctor_name,
                quantity=doc_data["qty"],
                revenue=round(doc_data["revenue"], 2),
            ))

        result.append(ServiceBreakdownDetail(
            service_id=service_id,
            code=data["code"],
            name=data["name"],
            quantity=data["quantity"],
            revenue=round(revenue, 2),
            materials_cost=round(materials_cost, 2),
            margin=round(margin, 2),
            margin_pct=margin_pct,
            by_doctor=by_doctor,
        ))

        total_revenue += revenue
        total_materials_cost += materials_cost
        all_total_qty += data["quantity"]  # Accumulate total quantity


    # Save total revenue before truncating to top 5
    all_total_revenue = total_revenue

    # Сортуємо по виручці
    result = sorted(result, key=lambda x: x.revenue, reverse=True)[:5]

    total_margin = total_revenue - total_materials_cost
    total_margin_pct = round(total_margin / total_revenue * 100, 1) if total_revenue > 0 else 0

    return result, total_margin, total_margin_pct, all_total_revenue, all_total_qty


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

    # ── Collect additional data for enriched dashboard ──

    # Income by doctor
    income_by_doctor, nhsu_income, paid_income = await _get_income_by_doctors(db, user.id, year, month)

    # Add NHSU and paid services to income categories
    if nhsu_income > 0:
        income_by_cat_raw["НСЗУ"] = nhsu_income
    if paid_income > 0:
        income_by_cat_raw["Платні послуги"] = paid_income

    # Recalculate income_by_category with added NHSU and paid services
    if nhsu_income > 0 or paid_income > 0:
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

    # Add tax expenses to expense categories
    if cur["total_taxes"] > 0:
        expense_by_cat_raw["Податки"] = cur["total_taxes"]

    # Recalculate expense_by_category with tax data
    if cur["total_taxes"] > 0:
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

    # Top services
    top_services = await _get_top_services(db, user.id, year, month)

    # Data integrity warnings
    data_warnings = await _check_data_integrity(db, user.id, year, month)

    # Calculate services breakdown
    services_q = await db.execute(
        select(func.count(MonthlyPaidServiceEntry.id)).join(
            MonthlyPaidServicesReport,
            MonthlyPaidServiceEntry.report_id == MonthlyPaidServicesReport.id,
        ).where(
            MonthlyPaidServicesReport.user_id == user.id,
            MonthlyPaidServicesReport.year == year,
            MonthlyPaidServicesReport.month == month,
        )
    )
    total_services_count = services_q.scalar() or 0

    # Services by doctor
    services_by_doctor_q = await db.execute(
        select(
            Doctor.full_name,
            func.count(MonthlyPaidServiceEntry.id).label("cnt")
        ).join(
            MonthlyPaidServicesReport,
            Doctor.id == MonthlyPaidServicesReport.doctor_id,
        ).join(
            MonthlyPaidServiceEntry,
            MonthlyPaidServiceEntry.report_id == MonthlyPaidServicesReport.id,
        ).where(
            MonthlyPaidServicesReport.user_id == user.id,
            MonthlyPaidServicesReport.year == year,
            MonthlyPaidServicesReport.month == month,
        ).group_by(Doctor.full_name)
    )
    services_by_doctor = {name: int(cnt) for name, cnt in services_by_doctor_q.all()}

    # Active doctors count
    active_docs_q = await db.execute(
        select(func.count(Doctor.id)).where(
            Doctor.user_id == user.id,
            Doctor.is_active
        )
    )
    active_doctors_count = active_docs_q.scalar() or 0

    # Fixed and salary expenses (approximate from categories)
    fixed_expenses = sum(
        cb.amount for cb in expense_by_category
        if "матеріали" not in cb.name.lower() and "зарплата" not in cb.name.lower()
    )
    salary_expenses = sum(
        cb.amount for cb in expense_by_category
        if "зарплата" in cb.name.lower()
    )

    # AI insights (basic recommendations)
    ai_insights: list[AiInsight] = []

    # Revenue concentration insight
    if nhsu_income > 0 or paid_income > 0:
        nhsu_pct = (nhsu_income / (nhsu_income + paid_income) * 100) if (nhsu_income + paid_income) > 0 else 0
        if nhsu_pct > 70:
            ai_insights.append(AiInsight(
                type="insight",
                title="Висока залежність від НСЗУ",
                description=f"НСЗУ становить {nhsu_pct:.0f}% доходу. Розгляньте розвиток платних послуг для диверсифікації.",
                data_basis=f"НСЗУ: {nhsu_income:,.0f} грн, Платні послуги: {paid_income:,.0f} грн",
            ))

    # Doctor load insight
    if active_doctors_count > 0 and total_services_count > 0:
        avg_services_per_doctor = total_services_count / active_doctors_count
        if avg_services_per_doctor < 10:
            ai_insights.append(AiInsight(
                type="warning",
                title="Низька завантаженість лікарів",
                description=f"Середня кількість послуг: {avg_services_per_doctor:.0f} на лікаря. Можливість збільшити обсяги.",
                data_basis=f"Послуг: {total_services_count}, Лікарів: {active_doctors_count}",
            ))

    # Expense ratio insight
    if cur["income"] > 0:
        expense_ratio = (cur["expenses"] / cur["income"]) * 100
        if expense_ratio > 70:
            ai_insights.append(AiInsight(
                type="risk",
                title="Високі витрати відносно доходів",
                description=f"Витрати становлять {expense_ratio:.0f}% доходу. Перевірте обґрунтованість основних статей витрат.",
                data_basis=f"Доходи: {cur['income']:,.0f} грн, Витрати: {cur['expenses']:,.0f} грн",
            ))

    # ── ПРІОРИТЕТ 1: Отримання додаткових даних ──
    # Пацієнти (з безпекою)
    patients_by_age = []
    patients_by_doctor = []
    total_patients = 0
    total_non_verified = 0
    total_patients_change_pct = 0.0
    total_non_verified_pct = 0.0
    try:
        patients_by_age, total_patients, total_non_verified, prev_patients = await _get_patients_by_age(db, user.id, year, month)
        patients_by_doctor = await _get_patients_by_doctor(db, user.id, year, month)
        total_patients_change_pct = round((total_patients - prev_patients) / prev_patients * 100, 1) if prev_patients > 0 else 0
        total_non_verified_pct = round(total_non_verified / total_patients * 100, 1) if total_patients > 0 else 0
    except Exception as e:
        print(f"ERROR in _get_patients: {e}")

    # Персонал & ФОП (з безпекою)
    staff_by_role = []
    fop_total = 0.0
    fop_pct = 0.0
    try:
        staff_by_role, fop_total, _ = await _get_staff_breakdown(db, user.id, year, month)
        fop_pct = round(fop_total / cur["income"] * 100, 1) if cur["income"] > 0 else 0
    except Exception as e:
        print(f"ERROR in _get_staff_breakdown: {e}")

    # Отримуємо дані про власника (якщо є)
    owner = None
    try:
        owner_q = await db.execute(
            select(Doctor).where(Doctor.user_id == user.id, Doctor.is_owner == True).limit(1)
        )
        owner_doctor = owner_q.scalar_one_or_none()
        if owner_doctor and nhsu_income > 0:
            owner = OwnerFinancialInfo(
                doctor_id=owner_doctor.id,
                doctor_name=owner_doctor.full_name,
                is_owner=True,
                nhsu_income=nhsu_income,
                paid_services_income=paid_income,
                total_income=nhsu_income + paid_income,
                ep_amount=cur["tax_single"],
                vz_amount=cur["tax_vz"],
                esv_owner_amount=cur["tax_esv"],
                total_taxes=cur["tax_single"] + cur["tax_vz"] + cur["tax_esv"],
                income_after_taxes=cur["income_after_taxes"],
            )
    except Exception as e:
        print(f"ERROR in owner_info: {e}")

    # Платні послуги (з безпекою)
    top_paid_services = []
    services_margin = 0.0
    services_margin_pct = 0.0
    paid_services_total_revenue = 0.0
    paid_services_total_qty = 0
    try:
        top_paid_services, services_margin, services_margin_pct, paid_services_total_revenue, paid_services_total_qty = await _get_top_paid_services_detailed(db, user.id, year, month)
    except Exception as e:
        print(f"ERROR in _get_top_paid_services_detailed: {e}")

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
        top_income_sources=top_income_sources,
        expense_by_category=expense_by_category,
        # New fields
        nhsu_income=nhsu_income,
        paid_services_income=paid_income,
        nhsu_pct=round((nhsu_income / (nhsu_income + paid_income) * 100) if (nhsu_income + paid_income) > 0 else 0, 1),
        paid_pct=round((paid_income / (nhsu_income + paid_income) * 100) if (nhsu_income + paid_income) > 0 else 0, 1),
        income_by_doctor=income_by_doctor,
        top_services=top_services,
        top_expense_items=top_expense_items,
        fixed_expenses=round(fixed_expenses, 2),
        salary_expenses=round(salary_expenses, 2),
        tax_single_rate=float(user.tax_rate) * 100,
        tax_esv_monthly=esv_monthly,
        tax_vz_rate=vz_rate * 100,
        total_services_count=int(total_services_count),
        services_by_doctor=services_by_doctor,
        active_doctors_count=int(active_doctors_count),
        data_integrity_warnings=data_warnings,
        missing_salary_staff=[],
        trend=trend,
        insights=insights,
        ai_insights=ai_insights,
        # ── ПРІОРИТЕТ 1: Нові поля ──
        patients_by_age=patients_by_age,
        patients_by_doctor=patients_by_doctor,
        total_patients=total_patients,
        total_patients_prev=prev_patients,
        total_patients_change_pct=total_patients_change_pct,
        total_non_verified=total_non_verified,
        total_non_verified_pct=total_non_verified_pct,
        staff_by_role=staff_by_role,
        owner_info=owner,
        total_staff_count=sum(s.count for s in staff_by_role),
        fop_total=round(fop_total, 2),
        fop_pct=fop_pct,
        top_paid_services=top_paid_services,
        paid_services_total_revenue=round(paid_services_total_revenue, 2),
        paid_services_total_qty=paid_services_total_qty,
        services_total_margin=round(services_margin, 2),
        services_margin_pct=services_margin_pct,
    )
