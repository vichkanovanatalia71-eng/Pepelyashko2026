"""Структуровані місячні витрати — три блоки:
  1. Постійні витрати (7 категорій, підтримка is_recurring)
  2. Зарплатні витрати (по кожному співробітнику)
  3. Податки (автоматичний розрахунок від доходу)
"""
from __future__ import annotations

import base64
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.doctor import Doctor
from app.models.monthly_expense import (
    FIXED_CATEGORY_NAMES,
    FIXED_CATEGORY_KEYS,
    MonthlyExpenseLock,
    MonthlyFixedExpense,
    MonthlySalaryExpense,
)
from app.models.monthly_service import MonthlyPaidServiceEntry, MonthlyPaidServicesReport
from app.models.nhsu import NhsuRecord, NhsuSettings
from app.models.service import Service
from app.models.staff import StaffMember
from app.models.user import User
from app.services.ai_provider import analyze_image, get_provider, parse_ai_json

router = APIRouter()

# ────────────────────────────── Helpers ──────────────────────────────


async def _get_settings(db: AsyncSession, user_id: int) -> NhsuSettings | None:
    res = await db.execute(select(NhsuSettings).where(NhsuSettings.user_id == user_id))
    return res.scalar_one_or_none()


async def _nhsu_income(db: AsyncSession, user_id: int, year: int, month: int) -> float:
    """Сума доходу НСЗУ за місяць (з nhsu_records)."""
    res = await db.execute(
        select(NhsuRecord).where(
            NhsuRecord.user_id == user_id,
            NhsuRecord.year == year,
            NhsuRecord.month == month,
        )
    )
    return round(sum(r.amount for r in res.scalars().all()), 2)


async def _paid_services_income(db: AsyncSession, user_id: int, year: int, month: int) -> float:
    """Загальний дохід від платних послуг за місяць (кількість × ціна)."""
    reports_res = await db.execute(
        select(MonthlyPaidServicesReport).where(
            MonthlyPaidServicesReport.user_id == user_id,
            MonthlyPaidServicesReport.year == year,
            MonthlyPaidServicesReport.month == month,
        )
    )
    report_ids = [r.id for r in reports_res.scalars().all()]
    total = 0.0
    if report_ids:
        entries_res = await db.execute(
            select(MonthlyPaidServiceEntry, Service)
            .join(Service, MonthlyPaidServiceEntry.service_id == Service.id)
            .where(MonthlyPaidServiceEntry.report_id.in_(report_ids))
        )
        for entry, svc in entries_res.all():
            total += float(entry.quantity) * float(svc.price)
    return round(total, 2)


async def _doctor_paid_services_income(
    db: AsyncSession,
    user_id: int,
    doctor_id: int,
    year: int,
    month: int,
    ep_rate_pct: float = 0.0,
    vz_rate_pct: float = 0.0,
) -> float:
    """Дохід лікаря від платних послуг = (ціна − матеріали − ЄП − ВЗ) / 2 × кількість."""
    report_res = await db.execute(
        select(MonthlyPaidServicesReport).where(
            MonthlyPaidServicesReport.user_id == user_id,
            MonthlyPaidServicesReport.doctor_id == doctor_id,
            MonthlyPaidServicesReport.year == year,
            MonthlyPaidServicesReport.month == month,
        )
    )
    report = report_res.scalar_one_or_none()
    if not report:
        return 0.0
    entries_res = await db.execute(
        select(MonthlyPaidServiceEntry, Service)
        .join(Service, MonthlyPaidServiceEntry.service_id == Service.id)
        .where(MonthlyPaidServiceEntry.report_id == report.id)
    )
    ep_r = ep_rate_pct / 100
    vz_r = vz_rate_pct / 100
    total = 0.0
    for entry, svc in entries_res.all():
        price = float(svc.price)
        mat_cost = sum(float(m.get("cost", 0)) for m in (svc.materials or []))
        ep = round(price * ep_r, 2)
        vz = round(price * vz_r, 2)
        to_split = price - mat_cost - ep - vz
        total += round(to_split / 2 * int(entry.quantity), 2)
    return round(total, 2)


async def _nhsu_doctors_data(
    db: AsyncSession, user_id: int, year: int, month: int
) -> list[dict]:
    """Повертає дані НСЗУ по лікарях за місяць: брутто, ЄП, ВЗ."""
    records_res = await db.execute(
        select(NhsuRecord).where(
            NhsuRecord.user_id == user_id,
            NhsuRecord.year == year,
            NhsuRecord.month == month,
        )
    )
    records = records_res.scalars().all()
    if not records:
        return []

    doctor_ids = list({r.doctor_id for r in records})
    doctors_res = await db.execute(select(Doctor).where(Doctor.id.in_(doctor_ids)))
    doctors_map = {d.id: d for d in doctors_res.scalars().all()}

    per_doctor: dict[int, dict] = {}
    for r in records:
        doc_id = r.doctor_id
        if doc_id not in per_doctor:
            doc = doctors_map.get(doc_id)
            per_doctor[doc_id] = {
                "doctor_id": doc_id,
                "doctor_name": doc.full_name if doc else "",
                "is_owner": doc.is_owner if doc else False,
                "nhsu_brutto": 0.0,
                "nhsu_ep": 0.0,
                "nhsu_vz": 0.0,
            }
        per_doctor[doc_id]["nhsu_brutto"] = round(
            per_doctor[doc_id]["nhsu_brutto"] + r.amount, 2
        )
        per_doctor[doc_id]["nhsu_ep"] = round(
            per_doctor[doc_id]["nhsu_ep"] + r.ep_amount, 2
        )
        per_doctor[doc_id]["nhsu_vz"] = round(
            per_doctor[doc_id]["nhsu_vz"] + r.vz_amount, 2
        )
    return list(per_doctor.values())


# ────────────────────────────── Schemas ──────────────────────────────


class TaxRates(BaseModel):
    pdfo_rate: float
    vz_zp_rate: float
    esv_employer_rate: float
    ep_rate: float
    vz_rate: float


class FixedExpenseRow(BaseModel):
    category_key: str
    category_name: str
    amount: float
    is_recurring: bool


class SalaryExpenseRow(BaseModel):
    staff_member_id: int
    full_name: str
    role: str                       # "doctor" | "nurse" | "other"
    brutto: float
    pdfo: float                     # автоматично
    vz_zp: float                    # автоматично
    esv: float                      # ЄСВ роботодавця, автоматично
    netto: float                    # brutto − pdfo − vz_zp
    has_supplement: bool
    target_net: Optional[float]
    supplement: float               # автоматично: max(0, target_net − netto)
    individual_bonus: float         # для лікарів
    paid_services_from_module: bool # для лікарів
    paid_services_income: float     # підтягується з модуля (для лікарів)
    total_employer_cost: float      # brutto + esv + supplement + individual_bonus
    # НСЗУ дані (для пов'язаних лікарів)
    doctor_id: Optional[int] = None
    nhsu_brutto: float = 0.0
    nhsu_ep: float = 0.0
    nhsu_vz: float = 0.0
    is_owner: bool = False


class TaxBlock(BaseModel):
    nhsu_income: float
    paid_services_income: float
    total_income: float
    ep_rate: float
    vz_rate: float
    ep: float
    vz: float
    esv_owner: float
    esv_employer: float


class ExpenseTotals(BaseModel):
    fixed_total: float
    salary_total: float      # brutto + esv + supplement + individual_bonus
    tax_total: float
    grand_total: float
    income: float
    remaining: float


class HiredDoctorInfo(BaseModel):
    doctor_id: int
    doctor_name: str
    nhsu_brutto: float
    nhsu_ep: float
    nhsu_vz: float
    staff_member_id: Optional[int] = None
    staff_brutto: float = 0.0
    staff_total_employer_cost: float = 0.0


class OwnerBlock(BaseModel):
    doctor_id: int
    doctor_name: str
    nhsu_brutto: float
    paid_services_income: float
    ep_all: float
    vz_all: float
    esv_owner: float
    hired_doctors: list[HiredDoctorInfo]


class MonthlyExpenseResponse(BaseModel):
    year: int
    month: int
    settings: TaxRates
    fixed: list[FixedExpenseRow]
    salary: list[SalaryExpenseRow]
    taxes: TaxBlock
    totals: ExpenseTotals
    owner: Optional[OwnerBlock] = None
    is_locked: bool = False
    missing_salary_staff: list[str] = []


# ── Нові схеми ──

class PeriodSummary(BaseModel):
    year: int
    month: int
    fixed_total: float
    salary_brutto_total: float   # сума брутто (швидкий підрахунок)
    is_locked: bool
    has_data: bool


class LockRequest(BaseModel):
    year: int
    month: int


class CopyFromRequest(BaseModel):
    source_year: int
    source_month: int
    target_year: int
    target_month: int
    copy_fixed: bool = True
    copy_salary: bool = True


class AiParsedExpense(BaseModel):
    category: str           # "fixed" | "other"
    category_key: str       # для fixed — один з FIXED_CATEGORY_KEYS
    name: str
    amount: float
    is_recurring: bool
    confidence: float       # 0–1
    note: str = ""


class UpdateFixedRequest(BaseModel):
    year: int
    month: int
    category_key: str
    amount: float
    is_recurring: bool


class UpdateSalaryRequest(BaseModel):
    year: int
    month: int
    staff_member_id: int
    brutto: float
    has_supplement: bool
    target_net: Optional[float] = None
    individual_bonus: float = 0.0
    paid_services_from_module: bool = False


# ────────────────────────────── Endpoint: GET ──────────────────────────────


@router.get("/", response_model=MonthlyExpenseResponse)
async def get_monthly_expenses(
    year: int = Query(...),
    month: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # 1. Налаштування ставок
    nhsu = await _get_settings(db, user.id)
    rates = TaxRates(
        pdfo_rate=float(nhsu.pdfo_rate) if nhsu else 18.0,
        vz_zp_rate=float(nhsu.vz_zp_rate) if nhsu else 5.0,
        esv_employer_rate=float(nhsu.esv_employer_rate) if nhsu else 22.0,
        ep_rate=float(nhsu.ep_rate) if nhsu else 5.0,
        vz_rate=float(nhsu.vz_rate) if nhsu else 1.5,
    )

    # 2. Постійні витрати — підтягуємо збережені, решту = 0
    fixed_res = await db.execute(
        select(MonthlyFixedExpense).where(
            MonthlyFixedExpense.user_id == user.id,
            MonthlyFixedExpense.year == year,
            MonthlyFixedExpense.month == month,
        )
    )
    saved_fixed: dict[str, MonthlyFixedExpense] = {
        r.category_key: r for r in fixed_res.scalars().all()
    }
    fixed_rows: list[FixedExpenseRow] = []
    for key in FIXED_CATEGORY_KEYS:
        rec = saved_fixed.get(key)
        fixed_rows.append(FixedExpenseRow(
            category_key=key,
            category_name=FIXED_CATEGORY_NAMES[key],
            amount=float(rec.amount) if rec else 0.0,
            is_recurring=rec.is_recurring if rec else False,
        ))

    # 3. Зарплатні витрати — всі активні співробітники
    staff_res = await db.execute(
        select(StaffMember).where(
            StaffMember.user_id == user.id,
            StaffMember.is_active == True,
        ).order_by(StaffMember.full_name)
    )
    staff_list = staff_res.scalars().all()

    salary_res = await db.execute(
        select(MonthlySalaryExpense).where(
            MonthlySalaryExpense.user_id == user.id,
            MonthlySalaryExpense.year == year,
            MonthlySalaryExpense.month == month,
        )
    )
    saved_salary: dict[int, MonthlySalaryExpense] = {
        r.staff_member_id: r for r in salary_res.scalars().all()
    }

    # 3а. Підтягуємо НСЗУ дані для всіх лікарів одразу (для уникнення дублювання запитів)
    nhsu_data_all = await _nhsu_doctors_data(db, user.id, year, month)
    nhsu_by_doctor_id = {d["doctor_id"]: d for d in nhsu_data_all}

    pdfo_rate = rates.pdfo_rate / 100
    vz_zp_rate = rates.vz_zp_rate / 100
    esv_rate = rates.esv_employer_rate / 100

    salary_rows: list[SalaryExpenseRow] = []
    for member in staff_list:
        rec = saved_salary.get(member.id)
        brutto = float(rec.brutto) if rec else 0.0
        pdfo = round(brutto * pdfo_rate, 2)
        vz_zp = round(brutto * vz_zp_rate, 2)
        esv = round(brutto * esv_rate, 2)
        netto = round(brutto - pdfo - vz_zp, 2)

        has_supplement = rec.has_supplement if rec else False
        target_net = float(rec.target_net) if (rec and rec.target_net is not None) else None
        supplement = 0.0
        if has_supplement and target_net is not None:
            supplement = max(0.0, round(target_net - netto, 2))

        individual_bonus = float(rec.individual_bonus) if rec else 0.0
        paid_services_from_module = rec.paid_services_from_module if rec else False

        # Для лікарів: завжди підтягуємо дохід з платних послуг автоматично
        paid_services_income = 0.0
        if member.role == "doctor" and member.doctor_id:
            paid_services_income = await _doctor_paid_services_income(
                db, user.id, member.doctor_id, year, month,
                ep_rate_pct=rates.ep_rate, vz_rate_pct=rates.vz_rate,
            )

        total_employer_cost = round(brutto + esv + supplement + individual_bonus, 2)

        # НСЗУ дані для пов'язаного лікаря
        doctor_nhsu = nhsu_by_doctor_id.get(member.doctor_id) if member.doctor_id else None

        salary_rows.append(SalaryExpenseRow(
            staff_member_id=member.id,
            full_name=member.full_name,
            role=member.role,
            brutto=brutto,
            pdfo=pdfo,
            vz_zp=vz_zp,
            esv=esv,
            netto=netto,
            has_supplement=has_supplement,
            target_net=target_net,
            supplement=supplement,
            individual_bonus=individual_bonus,
            paid_services_from_module=paid_services_from_module,
            paid_services_income=paid_services_income,
            total_employer_cost=total_employer_cost,
            doctor_id=member.doctor_id,
            nhsu_brutto=doctor_nhsu["nhsu_brutto"] if doctor_nhsu else 0.0,
            nhsu_ep=doctor_nhsu["nhsu_ep"] if doctor_nhsu else 0.0,
            nhsu_vz=doctor_nhsu["nhsu_vz"] if doctor_nhsu else 0.0,
            is_owner=doctor_nhsu.get("is_owner", False) if doctor_nhsu else False,
        ))

    # 4. Податковий блок
    nhsu_inc = await _nhsu_income(db, user.id, year, month)
    paid_inc = await _paid_services_income(db, user.id, year, month)
    total_income = round(nhsu_inc + paid_inc, 2)
    ep = round(total_income * rates.ep_rate / 100, 2)
    vz = round(total_income * rates.vz_rate / 100, 2)

    # ЄСВ власника (щомісячна фіксована сума з налаштувань)
    esv_owner = float(nhsu.esv_monthly) if nhsu else 1760.0

    # ЄСВ роботодавця (сума ЄСВ із виплачених зарплат за місяць)
    esv_employer = round(sum(r.esv for r in salary_rows), 2)

    tax_block = TaxBlock(
        nhsu_income=nhsu_inc,
        paid_services_income=paid_inc,
        total_income=total_income,
        ep_rate=rates.ep_rate,
        vz_rate=rates.vz_rate,
        ep=ep,
        vz=vz,
        esv_owner=esv_owner,
        esv_employer=esv_employer,
    )

    # 5. Підсумки
    fixed_total = round(sum(r.amount for r in fixed_rows), 2)
    salary_total = round(sum(r.total_employer_cost for r in salary_rows), 2)
    tax_total = round(ep + vz + esv_owner + esv_employer, 2)
    grand_total = round(fixed_total + salary_total + tax_total, 2)
    remaining = round(total_income - grand_total, 2)

    # 6. Блок власника (лікар з прапорцем is_owner)
    owner_block: Optional[OwnerBlock] = None
    owner_doc_res = await db.execute(
        select(Doctor).where(
            Doctor.user_id == user.id,
            Doctor.is_owner == True,
            Doctor.is_active == True,
        )
    )
    owner_doctor = owner_doc_res.scalar_one_or_none()
    if owner_doctor:
        nhsu_data = nhsu_data_all  # вже завантажені вище
        owner_nhsu = next((d for d in nhsu_data if d["is_owner"]), None)
        hired_nhsu = [d for d in nhsu_data if not d["is_owner"]]

        ep_all = round(sum(d["nhsu_ep"] for d in nhsu_data), 2)
        vz_all = round(sum(d["nhsu_vz"] for d in nhsu_data), 2)
        esv_owner = float(nhsu.esv_monthly) if nhsu else 1760.0

        hired_doctors_info: list[HiredDoctorInfo] = []
        for hd in hired_nhsu:
            sm = next((s for s in staff_list if s.doctor_id == hd["doctor_id"]), None)
            sal_row = next(
                (r for r in salary_rows if sm and r.staff_member_id == sm.id), None
            )
            hired_doctors_info.append(HiredDoctorInfo(
                doctor_id=hd["doctor_id"],
                doctor_name=hd["doctor_name"],
                nhsu_brutto=hd["nhsu_brutto"],
                nhsu_ep=hd["nhsu_ep"],
                nhsu_vz=hd["nhsu_vz"],
                staff_member_id=sm.id if sm else None,
                staff_brutto=sal_row.brutto if sal_row else 0.0,
                staff_total_employer_cost=sal_row.total_employer_cost if sal_row else 0.0,
            ))

        owner_paid = await _doctor_paid_services_income(
            db, user.id, owner_doctor.id, year, month,
            ep_rate_pct=rates.ep_rate, vz_rate_pct=rates.vz_rate,
        )

        owner_block = OwnerBlock(
            doctor_id=owner_doctor.id,
            doctor_name=owner_doctor.full_name,
            nhsu_brutto=owner_nhsu["nhsu_brutto"] if owner_nhsu else 0.0,
            paid_services_income=owner_paid,
            ep_all=ep_all,
            vz_all=vz_all,
            esv_owner=esv_owner,
            hired_doctors=hired_doctors_info,
        )

    # 7. Перевірка блокування
    lock_res = await db.execute(
        select(MonthlyExpenseLock).where(
            MonthlyExpenseLock.user_id == user.id,
            MonthlyExpenseLock.year == year,
            MonthlyExpenseLock.month == month,
        )
    )
    is_locked = lock_res.scalar_one_or_none() is not None

    # 8. Попередження про відсутність зарплати
    staff_with_salary = {r.staff_member_id for r in salary_rows if r.brutto > 0}
    missing_salary_staff = [
        m.full_name for m in staff_list
        if m.id not in staff_with_salary
    ]

    return MonthlyExpenseResponse(
        year=year,
        month=month,
        settings=rates,
        fixed=fixed_rows,
        salary=salary_rows,
        taxes=tax_block,
        totals=ExpenseTotals(
            fixed_total=fixed_total,
            salary_total=salary_total,
            tax_total=tax_total,
            grand_total=grand_total,
            income=total_income,
            remaining=remaining,
        ),
        owner=owner_block,
        is_locked=is_locked,
        missing_salary_staff=missing_salary_staff,
    )


# ────────────────────────────── Endpoint: PUT fixed ──────────────────────────────


@router.put("/fixed", response_model=FixedExpenseRow)
async def update_fixed_expense(
    body: UpdateFixedRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Оновлює або створює запис постійної витрати.
    Якщо is_recurring=True — автоматично копіює на всі наступні місяці поточного року.
    """
    if body.category_key not in FIXED_CATEGORY_KEYS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Unknown category_key: {body.category_key}")

    # Upsert поточного місяця
    res = await db.execute(
        select(MonthlyFixedExpense).where(
            MonthlyFixedExpense.user_id == user.id,
            MonthlyFixedExpense.year == body.year,
            MonthlyFixedExpense.month == body.month,
            MonthlyFixedExpense.category_key == body.category_key,
        )
    )
    rec = res.scalar_one_or_none()
    if rec is None:
        rec = MonthlyFixedExpense(
            user_id=user.id,
            year=body.year,
            month=body.month,
            category_key=body.category_key,
        )
        db.add(rec)
    rec.amount = body.amount
    rec.is_recurring = body.is_recurring
    await db.flush()

    # Якщо постійна — копіюємо на наступні місяці (лише якщо ще немає запису)
    if body.is_recurring:
        for future_month in range(body.month + 1, 13):
            fut_res = await db.execute(
                select(MonthlyFixedExpense).where(
                    MonthlyFixedExpense.user_id == user.id,
                    MonthlyFixedExpense.year == body.year,
                    MonthlyFixedExpense.month == future_month,
                    MonthlyFixedExpense.category_key == body.category_key,
                )
            )
            fut_rec = fut_res.scalar_one_or_none()
            if fut_rec is None:
                fut_rec = MonthlyFixedExpense(
                    user_id=user.id,
                    year=body.year,
                    month=future_month,
                    category_key=body.category_key,
                    amount=body.amount,
                    is_recurring=True,
                )
                db.add(fut_rec)
            else:
                # Зберігаємо is_recurring флаг на наступних місяцях,
                # але НЕ перезаписуємо суму (користувач міг змінити її)
                fut_rec.is_recurring = True

    await db.commit()
    await db.refresh(rec)

    return FixedExpenseRow(
        category_key=rec.category_key,
        category_name=FIXED_CATEGORY_NAMES[rec.category_key],
        amount=float(rec.amount),
        is_recurring=rec.is_recurring,
    )


# ────────────────────────────── Endpoint: PUT salary ──────────────────────────────


@router.put("/salary", response_model=SalaryExpenseRow)
async def update_salary_expense(
    body: UpdateSalaryRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Оновлює або створює запис зарплатних витрат по співробітнику."""
    # Перевіряємо що співробітник належить цьому користувачу
    member_res = await db.execute(
        select(StaffMember).where(
            StaffMember.id == body.staff_member_id,
            StaffMember.user_id == user.id,
            StaffMember.is_active == True,
        )
    )
    member = member_res.scalar_one_or_none()
    if member is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Staff member not found")

    # Upsert
    sal_res = await db.execute(
        select(MonthlySalaryExpense).where(
            MonthlySalaryExpense.user_id == user.id,
            MonthlySalaryExpense.staff_member_id == body.staff_member_id,
            MonthlySalaryExpense.year == body.year,
            MonthlySalaryExpense.month == body.month,
        )
    )
    rec = sal_res.scalar_one_or_none()
    if rec is None:
        rec = MonthlySalaryExpense(
            user_id=user.id,
            staff_member_id=body.staff_member_id,
            year=body.year,
            month=body.month,
        )
        db.add(rec)

    rec.brutto = body.brutto
    rec.has_supplement = body.has_supplement
    rec.target_net = body.target_net
    rec.individual_bonus = body.individual_bonus
    rec.paid_services_from_module = body.paid_services_from_module
    await db.commit()
    await db.refresh(rec)

    # Отримуємо ставки для розрахунку
    nhsu = await _get_settings(db, user.id)
    pdfo_rate = float(nhsu.pdfo_rate) / 100 if nhsu else 0.18
    vz_zp_rate = float(nhsu.vz_zp_rate) / 100 if nhsu else 0.05
    esv_rate = float(nhsu.esv_employer_rate) / 100 if nhsu else 0.22

    brutto = float(rec.brutto)
    pdfo = round(brutto * pdfo_rate, 2)
    vz_zp = round(brutto * vz_zp_rate, 2)
    esv = round(brutto * esv_rate, 2)
    netto = round(brutto - pdfo - vz_zp, 2)

    target_net = float(rec.target_net) if rec.target_net is not None else None
    supplement = 0.0
    if rec.has_supplement and target_net is not None:
        supplement = max(0.0, round(target_net - netto, 2))

    individual_bonus = float(rec.individual_bonus)

    paid_services_income = 0.0
    if member.role == "doctor" and member.doctor_id:
        nhsu_s = await _get_settings(db, user.id)
        ep_pct = float(nhsu_s.ep_rate) if nhsu_s else 5.0
        vz_pct = float(nhsu_s.vz_rate) if nhsu_s else 1.5
        paid_services_income = await _doctor_paid_services_income(
            db, user.id, member.doctor_id, body.year, body.month,
            ep_rate_pct=ep_pct, vz_rate_pct=vz_pct,
        )

    total_employer_cost = round(brutto + esv + supplement + individual_bonus, 2)

    return SalaryExpenseRow(
        staff_member_id=member.id,
        full_name=member.full_name,
        role=member.role,
        brutto=brutto,
        pdfo=pdfo,
        vz_zp=vz_zp,
        esv=esv,
        netto=netto,
        has_supplement=rec.has_supplement,
        target_net=target_net,
        supplement=supplement,
        individual_bonus=individual_bonus,
        paid_services_from_module=rec.paid_services_from_module,
        paid_services_income=paid_services_income,
        total_employer_cost=total_employer_cost,
    )


# ══════════════════════════════════════════════════════════════════
#   НОВИЙ ФУНКЦІОНАЛ: Periods / Lock / Copy / AI
# ══════════════════════════════════════════════════════════════════


@router.get("/periods", response_model=list[PeriodSummary])
async def get_periods(
    year: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Повертає список місяців з даними за рік."""
    # Fixed totals per month
    fixed_res = await db.execute(
        select(
            MonthlyFixedExpense.month,
            func.sum(MonthlyFixedExpense.amount).label("total"),
        ).where(
            MonthlyFixedExpense.user_id == user.id,
            MonthlyFixedExpense.year == year,
            MonthlyFixedExpense.amount > 0,
        ).group_by(MonthlyFixedExpense.month)
    )
    fixed_by_month: dict[int, float] = {r.month: float(r.total) for r in fixed_res}

    # Salary brutto per month
    salary_res = await db.execute(
        select(
            MonthlySalaryExpense.month,
            func.sum(MonthlySalaryExpense.brutto).label("total"),
        ).where(
            MonthlySalaryExpense.user_id == user.id,
            MonthlySalaryExpense.year == year,
            MonthlySalaryExpense.brutto > 0,
        ).group_by(MonthlySalaryExpense.month)
    )
    salary_by_month: dict[int, float] = {r.month: float(r.total) for r in salary_res}

    # Lock status per month
    locks_res = await db.execute(
        select(MonthlyExpenseLock.month).where(
            MonthlyExpenseLock.user_id == user.id,
            MonthlyExpenseLock.year == year,
        )
    )
    locked_months = {r.month for r in locks_res}

    # Build result — include month if it has any data
    months_with_data = set(fixed_by_month) | set(salary_by_month)

    result = []
    for m in range(1, 13):
        has_data = m in months_with_data
        result.append(PeriodSummary(
            year=year,
            month=m,
            fixed_total=fixed_by_month.get(m, 0.0),
            salary_brutto_total=salary_by_month.get(m, 0.0),
            is_locked=m in locked_months,
            has_data=has_data,
        ))
    return result


@router.post("/lock", status_code=200)
async def lock_period(
    body: LockRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Фіксує (блокує) місяць від редагування."""
    existing = await db.execute(
        select(MonthlyExpenseLock).where(
            MonthlyExpenseLock.user_id == user.id,
            MonthlyExpenseLock.year == body.year,
            MonthlyExpenseLock.month == body.month,
        )
    )
    if not existing.scalar_one_or_none():
        lock = MonthlyExpenseLock(user_id=user.id, year=body.year, month=body.month)
        db.add(lock)
        await db.commit()
    return {"is_locked": True}


@router.delete("/lock", status_code=200)
async def unlock_period(
    year: int = Query(...),
    month: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Розблоковує місяць для редагування."""
    res = await db.execute(
        select(MonthlyExpenseLock).where(
            MonthlyExpenseLock.user_id == user.id,
            MonthlyExpenseLock.year == year,
            MonthlyExpenseLock.month == month,
        )
    )
    lock = res.scalar_one_or_none()
    if lock:
        await db.delete(lock)
        await db.commit()
    return {"is_locked": False}


@router.post("/copy-from", status_code=200)
async def copy_from_period(
    body: CopyFromRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Копіює дані з одного місяця в інший."""
    copied_fixed = 0
    copied_salary = 0

    if body.copy_fixed:
        src_fixed = await db.execute(
            select(MonthlyFixedExpense).where(
                MonthlyFixedExpense.user_id == user.id,
                MonthlyFixedExpense.year == body.source_year,
                MonthlyFixedExpense.month == body.source_month,
            )
        )
        for src in src_fixed.scalars():
            # Перевіряємо чи вже існує запис
            existing = await db.execute(
                select(MonthlyFixedExpense).where(
                    MonthlyFixedExpense.user_id == user.id,
                    MonthlyFixedExpense.year == body.target_year,
                    MonthlyFixedExpense.month == body.target_month,
                    MonthlyFixedExpense.category_key == src.category_key,
                )
            )
            tgt = existing.scalar_one_or_none()
            if tgt is None:
                tgt = MonthlyFixedExpense(
                    user_id=user.id,
                    year=body.target_year,
                    month=body.target_month,
                    category_key=src.category_key,
                )
                db.add(tgt)
            tgt.amount = src.amount
            tgt.is_recurring = src.is_recurring
            copied_fixed += 1

    if body.copy_salary:
        src_salary = await db.execute(
            select(MonthlySalaryExpense).where(
                MonthlySalaryExpense.user_id == user.id,
                MonthlySalaryExpense.year == body.source_year,
                MonthlySalaryExpense.month == body.source_month,
            )
        )
        for src in src_salary.scalars():
            existing = await db.execute(
                select(MonthlySalaryExpense).where(
                    MonthlySalaryExpense.user_id == user.id,
                    MonthlySalaryExpense.staff_member_id == src.staff_member_id,
                    MonthlySalaryExpense.year == body.target_year,
                    MonthlySalaryExpense.month == body.target_month,
                )
            )
            tgt = existing.scalar_one_or_none()
            if tgt is None:
                tgt = MonthlySalaryExpense(
                    user_id=user.id,
                    staff_member_id=src.staff_member_id,
                    year=body.target_year,
                    month=body.target_month,
                )
                db.add(tgt)
            # Копіюємо лише зарплатні налаштування (не суму, якщо 0)
            tgt.brutto = src.brutto
            tgt.has_supplement = src.has_supplement
            tgt.target_net = src.target_net
            tgt.individual_bonus = src.individual_bonus
            tgt.paid_services_from_module = src.paid_services_from_module
            copied_salary += 1

    await db.commit()
    return {"copied_fixed": copied_fixed, "copied_salary": copied_salary}


@router.post("/ai-parse", response_model=AiParsedExpense)
async def ai_parse_expense(
    text: str = Form(""),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Аналізує текст або зображення і повертає розпізнану витрату."""
    provider, api_key = await get_provider(db, user.id)
    if not provider:
        raise HTTPException(status_code=400, detail="AI провайдер не налаштований")

    category_keys = ", ".join(FIXED_CATEGORY_KEYS)
    system_prompt = (
        "Ти бухгалтерський асистент медичної клініки ФОП. "
        "Проаналізуй зображення або текст витрати і поверни JSON з полями: "
        f"category (fixed|other), category_key (один з: {category_keys}; або empty для other), "
        "name (назва витрати укр), amount (число), is_recurring (true/false), "
        "confidence (0.0-1.0), note (коментар якщо є неясності). "
        "Тільки JSON без markdown."
    )
    user_prompt = text or "Розпізнай витрату на зображенні."

    raw = ""
    if file:
        content = await file.read()
        media_type = file.content_type or "image/jpeg"
        raw = await analyze_image(provider, api_key, content, media_type, system_prompt, user_prompt)
    else:
        # Text-only: call without image
        if provider == "anthropic":
            import anthropic as sdk
            import asyncio
            client = sdk.Anthropic(api_key=api_key)
            def _sync():
                msg = client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=512,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}],
                )
                return msg.content[0].text
            raw = await asyncio.to_thread(_sync)
        else:
            from openai import OpenAI
            import asyncio
            client = OpenAI(api_key=api_key)
            def _sync():
                r = client.chat.completions.create(
                    model="gpt-4o-mini", max_tokens=512,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                )
                return r.choices[0].message.content
            raw = await asyncio.to_thread(_sync)

    parsed = parse_ai_json(raw)
    return AiParsedExpense(
        category=parsed.get("category", "other"),
        category_key=parsed.get("category_key", "other"),
        name=parsed.get("name", "Витрата"),
        amount=float(parsed.get("amount", 0)),
        is_recurring=bool(parsed.get("is_recurring", False)),
        confidence=float(parsed.get("confidence", 0.5)),
        note=parsed.get("note", ""),
    )
