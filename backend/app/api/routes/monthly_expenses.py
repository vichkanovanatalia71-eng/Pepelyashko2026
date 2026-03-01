"""Структуровані місячні витрати — три блоки:
  1. Постійні витрати (довільні записи з назвою, описом, is_recurring)
  2. Зарплатні витрати (по кожному співробітнику)
  3. Податки (автоматичний розрахунок від доходу)
"""
from __future__ import annotations

import logging

import base64
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, field_validator
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.core.deps import get_current_user, get_db
from app.core.email import send_accountant_report_notification
from app.models.doctor import Doctor
from app.models.monthly_expense import (
    FIXED_CATEGORY_NAMES,
    MonthlyExpenseLock,
    MonthlyFixedExpense,
    MonthlyOtherExpense,
    MonthlySalaryExpense,
)
from app.models.monthly_service import MonthlyPaidServiceEntry, MonthlyPaidServicesReport
from app.models.nhsu import NhsuRecord, NhsuSettings
from app.models.service import Service
from app.models.share_report import ShareReport
from app.models.staff import StaffMember
from app.models.user import User
from app.services.ai_provider import analyze_image, get_provider, parse_ai_json
from app.services.nhsu import get_monthly_report

logger = logging.getLogger(__name__)

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
        mat_cost = sum(float(m.get("quantity", 0)) * float(m.get("cost", 0)) for m in (svc.materials or []))
        ep = round(price * ep_r, 2)
        vz = round(price * vz_r, 2)
        to_split = round(price - mat_cost - ep - vz, 2)
        qty = int(entry.quantity)
        ts = round(to_split * qty, 2)
        total += round(ts / 2, 2)
    return round(total, 2)


async def _all_doctors_paid_services_income(
    db: AsyncSession,
    user_id: int,
    year: int,
    month: int,
    ep_rate_pct: float = 0.0,
    vz_rate_pct: float = 0.0,
) -> tuple[dict[int, float], float]:
    """Дохід від платних послуг по ВСІХ лікарях за місяць — 2 запити замість 2×N.

    Повертає (dict {doctor_id: net_income}, gross_total).
    """
    reports_res = await db.execute(
        select(MonthlyPaidServicesReport).where(
            MonthlyPaidServicesReport.user_id == user_id,
            MonthlyPaidServicesReport.year == year,
            MonthlyPaidServicesReport.month == month,
        )
    )
    reports = reports_res.scalars().all()
    if not reports:
        return {}, 0.0
    report_to_doctor = {r.id: r.doctor_id for r in reports}
    entries_res = await db.execute(
        select(MonthlyPaidServiceEntry, Service)
        .join(Service, MonthlyPaidServiceEntry.service_id == Service.id)
        .where(MonthlyPaidServiceEntry.report_id.in_(list(report_to_doctor.keys())))
    )
    ep_r = ep_rate_pct / 100
    vz_r = vz_rate_pct / 100
    per_doctor: dict[int, float] = {}
    gross_total = 0.0
    for entry, svc in entries_res.all():
        doctor_id = report_to_doctor[entry.report_id]
        price = float(svc.price)
        qty = int(entry.quantity)
        gross_total += price * qty
        mat_cost = sum(float(m.get("quantity", 0)) * float(m.get("cost", 0)) for m in (svc.materials or []))
        ep = round(price * ep_r, 2)
        vz = round(price * vz_r, 2)
        to_split = round(price - mat_cost - ep - vz, 2)
        ts = round(to_split * qty, 2)
        dr = round(ts / 2, 2)
        per_doctor[doctor_id] = round(per_doctor.get(doctor_id, 0.0) + dr, 2)
    return per_doctor, round(gross_total, 2)


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


async def _check_period_lock(db: AsyncSession, user_id: int, year: int, month: int) -> None:
    """Перевіряє чи заблокований період. Кидає 423 якщо так."""
    res = await db.execute(
        select(MonthlyExpenseLock).where(
            MonthlyExpenseLock.user_id == user_id,
            MonthlyExpenseLock.year == year,
            MonthlyExpenseLock.month == month,
        )
    )
    if res.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=423,
            detail=f"Період {month:02d}/{year} заблоковано. Розблокуйте для редагування.",
        )


# ────────────────────────────── Schemas ──────────────────────────────


class TaxRates(BaseModel):
    pdfo_rate: float
    vz_zp_rate: float
    esv_employer_rate: float
    ep_rate: float
    vz_rate: float


class FixedExpenseRow(BaseModel):
    id: int
    name: str
    description: str = ""
    amount: float
    is_recurring: bool
    edited_by: Optional[str] = None
    edited_at: Optional[str] = None
    visible_to_accountant: bool = True
    is_cash_return: bool = False


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
    edited_by: Optional[str] = None
    edited_at: Optional[str] = None


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
    accountant_submitted_at: str | None = None


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

    @field_validator("month")
    @classmethod
    def check_month(cls, v: int) -> int:
        return _validate_month(v)

    @field_validator("year")
    @classmethod
    def check_year(cls, v: int) -> int:
        return _validate_year(v)


class CopyFromRequest(BaseModel):
    source_year: int
    source_month: int
    target_year: int
    target_month: int
    copy_fixed: bool = True
    copy_salary: bool = True

    @field_validator("source_month", "target_month")
    @classmethod
    def check_month(cls, v: int) -> int:
        return _validate_month(v)

    @field_validator("source_year", "target_year")
    @classmethod
    def check_year(cls, v: int) -> int:
        return _validate_year(v)


class AiParsedExpense(BaseModel):
    category: str           # "fixed" | "other"
    name: str
    amount: float
    is_recurring: bool
    confidence: float       # 0–1
    note: str = ""


def _validate_month(v: int) -> int:
    if v < 1 or v > 12:
        raise ValueError("Місяць має бути від 1 до 12")
    return v


def _validate_year(v: int) -> int:
    if v < 2020 or v > 2100:
        raise ValueError("Рік має бути від 2020 до 2100")
    return v


def _validate_amount_positive(v: float) -> float:
    if v < 0:
        raise ValueError("Сума не може бути від'ємною")
    return round(v, 2)


class CreateFixedRequest(BaseModel):
    year: int
    month: int
    name: str
    description: str = ""
    amount: float
    is_recurring: bool

    @field_validator("month")
    @classmethod
    def check_month(cls, v: int) -> int:
        return _validate_month(v)

    @field_validator("year")
    @classmethod
    def check_year(cls, v: int) -> int:
        return _validate_year(v)

    @field_validator("amount")
    @classmethod
    def check_amount(cls, v: float) -> float:
        return _validate_amount_positive(v)


class UpdateFixedRequest(BaseModel):
    name: str
    description: str = ""
    amount: float
    is_recurring: bool

    @field_validator("amount")
    @classmethod
    def check_amount(cls, v: float) -> float:
        return _validate_amount_positive(v)


class UpdateSalaryRequest(BaseModel):
    year: int
    month: int
    staff_member_id: int
    brutto: float
    has_supplement: bool
    target_net: Optional[float] = None
    individual_bonus: float = 0.0
    paid_services_from_module: bool = False

    @field_validator("month")
    @classmethod
    def check_month(cls, v: int) -> int:
        return _validate_month(v)

    @field_validator("year")
    @classmethod
    def check_year(cls, v: int) -> int:
        return _validate_year(v)

    @field_validator("brutto")
    @classmethod
    def check_brutto(cls, v: float) -> float:
        return _validate_amount_positive(v)


# ────────────────────────────── Helper: побудова відповіді ──────────────────────────────


async def _build_monthly_expense_response(
    db: AsyncSession, user: User, year: int, month: int
) -> MonthlyExpenseResponse:
    """Обчислює повну відповідь витрат за місяць з актуальних даних у БД."""

    # 1. Налаштування ставок
    nhsu = await _get_settings(db, user.id)
    rates = TaxRates(
        pdfo_rate=float(nhsu.pdfo_rate) if nhsu else 18.0,
        vz_zp_rate=float(nhsu.vz_zp_rate) if nhsu else 5.0,
        esv_employer_rate=float(nhsu.esv_employer_rate) if nhsu else 22.0,
        ep_rate=float(nhsu.ep_rate) if nhsu else 5.0,
        vz_rate=float(nhsu.vz_rate) if nhsu else 1.5,
    )

    # 2. Постійні витрати — всі збережені записи
    fixed_res = await db.execute(
        select(MonthlyFixedExpense).where(
            MonthlyFixedExpense.user_id == user.id,
            MonthlyFixedExpense.year == year,
            MonthlyFixedExpense.month == month,
        ).order_by(MonthlyFixedExpense.id)
    )
    fixed_rows: list[FixedExpenseRow] = []
    for rec in fixed_res.scalars().all():
        fixed_rows.append(FixedExpenseRow(
            id=rec.id,
            name=rec.name or FIXED_CATEGORY_NAMES.get(rec.category_key, rec.category_key),
            description=rec.description or "",
            amount=float(rec.amount),
            is_recurring=rec.is_recurring,
            edited_by=rec.edited_by,
            edited_at=rec.edited_at.isoformat() if rec.edited_at else None,
            visible_to_accountant=rec.visible_to_accountant,
            is_cash_return=rec.is_cash_return,
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

    # 3б. Підтягуємо дохід від платних послуг для ВСІХ лікарів одним батч-запитом (2 SQL замість 2×N)
    paid_by_doctor, paid_gross_total = await _all_doctors_paid_services_income(
        db, user.id, year, month,
        ep_rate_pct=rates.ep_rate, vz_rate_pct=rates.vz_rate,
    )

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

        # Для лікарів: дохід з платних послуг з батч-запиту
        paid_services_income = 0.0
        if member.role == "doctor" and member.doctor_id:
            paid_services_income = paid_by_doctor.get(member.doctor_id, 0.0)

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
            edited_by=rec.edited_by if rec else None,
            edited_at=rec.edited_at.isoformat() if (rec and rec.edited_at) else None,
        ))

    # 4. Податковий блок (використовуємо вже завантажені дані — без додаткових запитів)
    nhsu_inc = round(sum(d["nhsu_brutto"] for d in nhsu_data_all), 2)
    paid_inc = paid_gross_total
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

        owner_block = OwnerBlock(
            doctor_id=owner_doctor.id,
            doctor_name=owner_doctor.full_name,
            nhsu_brutto=owner_nhsu["nhsu_brutto"] if owner_nhsu else 0.0,
            paid_services_income=paid_by_doctor.get(owner_doctor.id, 0.0),
            ep_all=ep_all,
            vz_all=vz_all,
            esv_owner=esv_owner,
            hired_doctors=hired_doctors_info,
        )

    # 7. Попередження про відсутність зарплати
    staff_with_salary = {r.staff_member_id for r in salary_rows if r.brutto > 0}
    missing_salary_staff = [
        m.full_name for m in staff_list
        if m.id not in staff_with_salary
    ]

    # 8. Перевірка останнього звіту бухгалтера для цього місяця
    accountant_submitted_at: str | None = None
    acc_res = await db.execute(
        select(ShareReport).where(
            ShareReport.user_id == user.id,
            ShareReport.is_deleted == False,
            ShareReport.filter_snapshot["type"].astext == "accountant_request",
            ShareReport.filter_snapshot["year"].astext == str(year),
            ShareReport.filter_snapshot["month"].astext == str(month),
            ShareReport.filter_snapshot["submitted"].astext == "true",
        ).order_by(ShareReport.created_at.desc()).limit(5)
    )
    for sr in acc_res.scalars().all():
        sat = (sr.filter_snapshot.get("submitted_data") or {}).get("submitted_at")
        if sat and (accountant_submitted_at is None or sat > accountant_submitted_at):
            accountant_submitted_at = sat

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
        is_locked=False,
        missing_salary_staff=missing_salary_staff,
        accountant_submitted_at=accountant_submitted_at,
    )


# ────────────────────────────── Endpoint: GET ──────────────────────────────


@router.get("/", response_model=MonthlyExpenseResponse)
async def get_monthly_expenses(
    year: int = Query(...),
    month: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Перевірка фіксації: якщо є знімок — повертаємо його замість динамічного розрахунку
    lock_res = await db.execute(
        select(MonthlyExpenseLock).where(
            MonthlyExpenseLock.user_id == user.id,
            MonthlyExpenseLock.year == year,
            MonthlyExpenseLock.month == month,
        )
    )
    lock = lock_res.scalar_one_or_none()

    if lock is not None and lock.snapshot is not None:
        # Повертаємо зафіксований знімок
        snapshot_data = dict(lock.snapshot)
        snapshot_data["is_locked"] = True
        return MonthlyExpenseResponse(**snapshot_data)

    # Динамічний розрахунок
    response = await _build_monthly_expense_response(db, user, year, month)
    if lock is not None:
        # Є блокування без знімка (legacy) — позначаємо як заблокований
        response.is_locked = True
    return response


# ────────────────────────────── Endpoints: fixed expenses CRUD ──────────────────────────────


async def _is_period_locked(db: AsyncSession, user_id: int, year: int, month: int) -> bool:
    """Return True if the period is locked (without raising)."""
    res = await db.execute(
        select(MonthlyExpenseLock).where(
            MonthlyExpenseLock.user_id == user_id,
            MonthlyExpenseLock.year == year,
            MonthlyExpenseLock.month == month,
        )
    )
    return res.scalar_one_or_none() is not None


async def _propagate_recurring(
    db: AsyncSession, user_id: int, year: int, month: int,
    category_key: str, name: str, description: str, amount: float,
):
    """Якщо витрата постійна — копіюємо на всі наступні місяці поточного року
    та на всі місяці наступного року. Пропускаємо заблоковані періоди."""
    # Поточний рік: від наступного місяця до грудня
    periods: list[tuple[int, int]] = [(year, m) for m in range(month + 1, 13)]
    # Наступний рік: всі 12 місяців
    periods += [(year + 1, m) for m in range(1, 13)]

    for fut_year, fut_month in periods:
        if await _is_period_locked(db, user_id, fut_year, fut_month):
            continue
        fut_res = await db.execute(
            select(MonthlyFixedExpense).where(
                MonthlyFixedExpense.user_id == user_id,
                MonthlyFixedExpense.year == fut_year,
                MonthlyFixedExpense.month == fut_month,
                MonthlyFixedExpense.category_key == category_key,
            )
        )
        fut_rec = fut_res.scalar_one_or_none()
        if fut_rec is None:
            fut_rec = MonthlyFixedExpense(
                user_id=user_id,
                year=fut_year,
                month=fut_month,
                category_key=category_key,
                name=name,
                description=description,
                amount=amount,
                is_recurring=True,
            )
            db.add(fut_rec)
        else:
            fut_rec.is_recurring = True
            if not fut_rec.name:
                fut_rec.name = name


@router.post("/fixed", response_model=FixedExpenseRow, status_code=201)
async def create_fixed_expense(
    body: CreateFixedRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Створює нову постійну витрату."""
    await _check_period_lock(db, user.id, body.year, body.month)
    cat_key = str(uuid.uuid4())[:12]
    rec = MonthlyFixedExpense(
        user_id=user.id,
        year=body.year,
        month=body.month,
        category_key=cat_key,
        name=body.name,
        description=body.description,
        amount=body.amount,
        is_recurring=body.is_recurring,
        edited_by="user",
        edited_at=datetime.now(timezone.utc),
    )
    db.add(rec)
    await db.flush()

    if body.is_recurring:
        await _propagate_recurring(
            db, user.id, body.year, body.month,
            cat_key, body.name, body.description, body.amount,
        )

    await db.commit()
    await db.refresh(rec)

    return FixedExpenseRow(
        id=rec.id,
        name=rec.name,
        description=rec.description or "",
        amount=float(rec.amount),
        is_recurring=rec.is_recurring,
        edited_by=rec.edited_by,
        edited_at=rec.edited_at.isoformat() if rec.edited_at else None,
        visible_to_accountant=rec.visible_to_accountant,
        is_cash_return=rec.is_cash_return,
    )


@router.put("/fixed/{expense_id}", response_model=FixedExpenseRow)
async def update_fixed_expense(
    expense_id: int,
    body: UpdateFixedRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Оновлює постійну витрату за id."""
    res = await db.execute(
        select(MonthlyFixedExpense).where(
            MonthlyFixedExpense.id == expense_id,
            MonthlyFixedExpense.user_id == user.id,
        )
    )
    rec = res.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Витрату не знайдено")
    await _check_period_lock(db, user.id, rec.year, rec.month)

    rec.name = body.name
    rec.description = body.description
    rec.amount = body.amount
    rec.is_recurring = body.is_recurring
    rec.edited_by = "user"
    rec.edited_at = datetime.now(timezone.utc)
    await db.flush()

    if body.is_recurring:
        await _propagate_recurring(
            db, user.id, rec.year, rec.month,
            rec.category_key, body.name, body.description, body.amount,
        )

    await db.commit()
    await db.refresh(rec)

    return FixedExpenseRow(
        id=rec.id,
        name=rec.name,
        description=rec.description or "",
        amount=float(rec.amount),
        is_recurring=rec.is_recurring,
        edited_by=rec.edited_by,
        edited_at=rec.edited_at.isoformat() if rec.edited_at else None,
        visible_to_accountant=rec.visible_to_accountant,
        is_cash_return=rec.is_cash_return,
    )


@router.delete("/fixed/{expense_id}", status_code=204)
async def delete_fixed_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Видаляє постійну витрату."""
    res = await db.execute(
        select(MonthlyFixedExpense).where(
            MonthlyFixedExpense.id == expense_id,
            MonthlyFixedExpense.user_id == user.id,
        )
    )
    rec = res.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Витрату не знайдено")
    await _check_period_lock(db, user.id, rec.year, rec.month)
    await db.delete(rec)
    await db.commit()


@router.patch("/fixed/{expense_id}/visibility")
async def toggle_fixed_visibility(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Перемикає видимість постійної витрати для бухгалтера."""
    res = await db.execute(
        select(MonthlyFixedExpense).where(
            MonthlyFixedExpense.id == expense_id,
            MonthlyFixedExpense.user_id == user.id,
        )
    )
    rec = res.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Витрату не знайдено")
    await _check_period_lock(db, user.id, rec.year, rec.month)
    rec.visible_to_accountant = not rec.visible_to_accountant
    await db.commit()
    return {"visible_to_accountant": rec.visible_to_accountant}


@router.patch("/fixed/{expense_id}/cash-return")
async def toggle_fixed_cash_return(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Перемикає прапорець повернення готівки для постійної витрати."""
    res = await db.execute(
        select(MonthlyFixedExpense).where(
            MonthlyFixedExpense.id == expense_id,
            MonthlyFixedExpense.user_id == user.id,
        )
    )
    rec = res.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Витрату не знайдено")
    await _check_period_lock(db, user.id, rec.year, rec.month)
    rec.is_cash_return = not rec.is_cash_return
    await db.commit()
    return {"is_cash_return": rec.is_cash_return}


# ────────────────────────────── Endpoint: PUT salary ──────────────────────────────


@router.put("/salary", response_model=SalaryExpenseRow)
async def update_salary_expense(
    body: UpdateSalaryRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Оновлює або створює запис зарплатних витрат по співробітнику."""
    await _check_period_lock(db, user.id, body.year, body.month)
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
    rec.edited_by = "user"
    rec.edited_at = datetime.now(timezone.utc)
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


# ────────────────────────────── Other expenses CRUD ──────────────────────────────


class OtherExpenseCreate(BaseModel):
    name: str
    description: str = ""
    amount: float
    category: str = "general"
    year: int
    month: int

    @field_validator("month")
    @classmethod
    def check_month(cls, v: int) -> int:
        return _validate_month(v)

    @field_validator("year")
    @classmethod
    def check_year(cls, v: int) -> int:
        return _validate_year(v)

    @field_validator("amount")
    @classmethod
    def check_amount(cls, v: float) -> float:
        return _validate_amount_positive(v)


class OtherExpenseResponse(BaseModel):
    id: int
    name: str
    description: str
    amount: float
    category: str
    year: int
    month: int
    edited_by: Optional[str] = None
    edited_at: Optional[datetime] = None
    visible_to_accountant: bool = True
    is_cash_return: bool = False

    model_config = {"from_attributes": True}


@router.get("/other", response_model=list[OtherExpenseResponse])
async def list_other_expenses(
    year: int = Query(...),
    month: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Повертає список інших витрат за місяць."""
    # Перевірка фіксації: якщо є знімок — повертаємо його
    lock_res = await db.execute(
        select(MonthlyExpenseLock).where(
            MonthlyExpenseLock.user_id == user.id,
            MonthlyExpenseLock.year == year,
            MonthlyExpenseLock.month == month,
        )
    )
    lock = lock_res.scalar_one_or_none()
    if lock is not None and lock.other_expenses_snapshot is not None:
        return lock.other_expenses_snapshot

    res = await db.execute(
        select(MonthlyOtherExpense).where(
            MonthlyOtherExpense.user_id == user.id,
            MonthlyOtherExpense.year == year,
            MonthlyOtherExpense.month == month,
        )
    )
    return res.scalars().all()


@router.post("/other", response_model=OtherExpenseResponse, status_code=201)
async def create_other_expense(
    body: OtherExpenseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Створює нову іншу витрату."""
    await _check_period_lock(db, user.id, body.year, body.month)
    rec = MonthlyOtherExpense(
        user_id=user.id,
        year=body.year,
        month=body.month,
        name=body.name,
        description=body.description,
        amount=body.amount,
        category=body.category,
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec


@router.put("/other/{expense_id}", response_model=OtherExpenseResponse)
async def update_other_expense(
    expense_id: int,
    body: OtherExpenseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Оновлює іншу витрату."""
    res = await db.execute(
        select(MonthlyOtherExpense).where(
            MonthlyOtherExpense.id == expense_id,
            MonthlyOtherExpense.user_id == user.id,
        )
    )
    rec = res.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Витрату не знайдено")
    await _check_period_lock(db, user.id, rec.year, rec.month)
    # Also check the target period lock if moving to a different period
    if body.year != rec.year or body.month != rec.month:
        await _check_period_lock(db, user.id, body.year, body.month)
    rec.name = body.name
    rec.description = body.description
    rec.amount = body.amount
    rec.category = body.category
    rec.year = body.year
    rec.month = body.month
    await db.commit()
    await db.refresh(rec)
    return rec


@router.delete("/other/{expense_id}", status_code=204)
async def delete_other_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Видаляє іншу витрату."""
    res = await db.execute(
        select(MonthlyOtherExpense).where(
            MonthlyOtherExpense.id == expense_id,
            MonthlyOtherExpense.user_id == user.id,
        )
    )
    rec = res.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Витрату не знайдено")
    await _check_period_lock(db, user.id, rec.year, rec.month)
    await db.delete(rec)
    await db.commit()


@router.patch("/other/{expense_id}/visibility")
async def toggle_other_visibility(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Перемикає видимість іншої витрати для бухгалтера."""
    res = await db.execute(
        select(MonthlyOtherExpense).where(
            MonthlyOtherExpense.id == expense_id,
            MonthlyOtherExpense.user_id == user.id,
        )
    )
    rec = res.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Витрату не знайдено")
    rec.visible_to_accountant = not rec.visible_to_accountant
    await db.commit()
    return {"visible_to_accountant": rec.visible_to_accountant}


@router.patch("/other/{expense_id}/cash-return")
async def toggle_other_cash_return(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Перемикає прапорець повернення готівки для іншої витрати."""
    res = await db.execute(
        select(MonthlyOtherExpense).where(
            MonthlyOtherExpense.id == expense_id,
            MonthlyOtherExpense.user_id == user.id,
        )
    )
    rec = res.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Витрату не знайдено")
    rec.is_cash_return = not rec.is_cash_return
    await db.commit()
    return {"is_cash_return": rec.is_cash_return}


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
    """Фіксує (блокує) місяць від редагування та зберігає знімок даних."""
    existing_res = await db.execute(
        select(MonthlyExpenseLock).where(
            MonthlyExpenseLock.user_id == user.id,
            MonthlyExpenseLock.year == body.year,
            MonthlyExpenseLock.month == body.month,
        )
    )
    existing = existing_res.scalar_one_or_none()

    # Обчислюємо актуальний знімок витрат
    expense_response = await _build_monthly_expense_response(db, user, body.year, body.month)
    expense_response.is_locked = True
    expenses_dict = expense_response.model_dump(mode="json")

    # Знімок інших витрат
    other_res = await db.execute(
        select(MonthlyOtherExpense).where(
            MonthlyOtherExpense.user_id == user.id,
            MonthlyOtherExpense.year == body.year,
            MonthlyOtherExpense.month == body.month,
        )
    )
    other_list = [
        OtherExpenseResponse.model_validate(rec).model_dump(mode="json")
        for rec in other_res.scalars().all()
    ]

    if existing:
        # Повторна фіксація — оновлюємо знімок
        existing.snapshot = expenses_dict
        existing.other_expenses_snapshot = other_list
        existing.locked_at = datetime.now(timezone.utc)
        flag_modified(existing, "snapshot")
        flag_modified(existing, "other_expenses_snapshot")
    else:
        lock = MonthlyExpenseLock(
            user_id=user.id,
            year=body.year,
            month=body.month,
            snapshot=expenses_dict,
            other_expenses_snapshot=other_list,
        )
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


@router.delete("/period", status_code=204)
async def delete_period_data(
    year: int = Query(...),
    month: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Видалити всі дані витрат за обраний місяць (постійні, зарплатні, інші витрати + блокування)."""
    await _check_period_lock(db, user.id, year, month)
    await db.execute(
        delete(MonthlyFixedExpense).where(
            MonthlyFixedExpense.user_id == user.id,
            MonthlyFixedExpense.year == year,
            MonthlyFixedExpense.month == month,
        )
    )
    await db.execute(
        delete(MonthlySalaryExpense).where(
            MonthlySalaryExpense.user_id == user.id,
            MonthlySalaryExpense.year == year,
            MonthlySalaryExpense.month == month,
        )
    )
    await db.execute(
        delete(MonthlyOtherExpense).where(
            MonthlyOtherExpense.user_id == user.id,
            MonthlyOtherExpense.year == year,
            MonthlyOtherExpense.month == month,
        )
    )
    await db.execute(
        delete(MonthlyExpenseLock).where(
            MonthlyExpenseLock.user_id == user.id,
            MonthlyExpenseLock.year == year,
            MonthlyExpenseLock.month == month,
        )
    )
    await db.commit()


@router.post("/copy-from", status_code=200)
async def copy_from_period(
    body: CopyFromRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Копіює дані з одного місяця в інший."""
    await _check_period_lock(db, user.id, body.target_year, body.target_month)
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
            # Перевіряємо чи вже існує запис з таким category_key
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
                    name=src.name or "",
                    description=src.description or "",
                )
                db.add(tgt)
            tgt.amount = src.amount
            tgt.is_recurring = src.is_recurring
            if not tgt.name:
                tgt.name = src.name or ""
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

    system_prompt = (
        "Ти бухгалтерський асистент медичної клініки ФОП. "
        "Проаналізуй зображення або текст витрати і поверни JSON з полями: "
        "category (fixed|other), "
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
        name=parsed.get("name", "Витрата"),
        amount=float(parsed.get("amount", 0)),
        is_recurring=bool(parsed.get("is_recurring", False)),
        confidence=float(parsed.get("confidence", 0.5)),
        note=parsed.get("note", ""),
    )


# ══════════════════════════════════════════════════════════════════
#   SHARE: Тимчасова публічна сторінка зведеного звіту власника ФОП
# ══════════════════════════════════════════════════════════════════

MONTHS_UA = [
    "", "Січень", "Лютий", "Березень", "Квітень",
    "Травень", "Червень", "Липень", "Серпень",
    "Вересень", "Жовтень", "Листопад", "Грудень",
]


class OwnerShareCreate(BaseModel):
    year: int
    month: int
    hired_doctor_id: Optional[int] = None
    hired_nurse_id: Optional[int] = None


class OwnerShareResponse(BaseModel):
    token: str
    url: str
    expires_at: datetime


async def _build_owner_share_payload(
    db: AsyncSession,
    user_id: int,
    year: int,
    month: int,
    hired_doctor_id: Optional[int],
    hired_nurse_id: Optional[int],
) -> dict:
    """Збирає повний знімок даних для share-сторінки власника ФОП."""
    from app.api.routes.monthly_services import _build_analytics as build_paid_analytics

    # ── 1. НСЗУ monthly report ──
    nhsu_report = await get_monthly_report(db, user_id, year, month)
    nhsu_data = None
    if nhsu_report:
        nhsu_data = {
            "year": nhsu_report.year,
            "month": nhsu_report.month,
            "capitation_rate": nhsu_report.capitation_rate,
            "ep_rate": nhsu_report.ep_rate,
            "vz_rate": nhsu_report.vz_rate,
            "doctors": [
                {
                    "doctor_id": d.doctor_id,
                    "doctor_name": d.doctor_name,
                    "is_owner": d.is_owner,
                    "rows": [
                        {
                            "age_group": r.age_group,
                            "age_group_label": r.age_group_label,
                            "age_coefficient": r.age_coefficient,
                            "patient_count": r.patient_count,
                            "non_verified": r.non_verified,
                            "amount": r.amount,
                            "ep_amount": r.ep_amount,
                            "vz_amount": r.vz_amount,
                            "ep_vz_amount": r.ep_vz_amount,
                        }
                        for r in d.rows
                    ],
                    "total_patients": d.total_patients,
                    "total_non_verified": d.total_non_verified,
                    "total_amount": d.total_amount,
                    "total_ep": d.total_ep,
                    "total_vz": d.total_vz,
                    "total_ep_vz": d.total_ep_vz,
                }
                for d in nhsu_report.doctors
            ],
            "age_group_totals": [
                {
                    "age_group": ag.age_group,
                    "age_group_label": ag.age_group_label,
                    "age_coefficient": ag.age_coefficient,
                    "total_patients": ag.total_patients,
                    "total_non_verified": ag.total_non_verified,
                    "total_amount": ag.total_amount,
                    "total_ep": ag.total_ep,
                    "total_vz": ag.total_vz,
                    "total_ep_vz": ag.total_ep_vz,
                }
                for ag in nhsu_report.age_group_totals
            ],
            "grand_total_patients": nhsu_report.grand_total_patients,
            "grand_total_amount": nhsu_report.grand_total_amount,
            "grand_total_ep": nhsu_report.grand_total_ep,
            "grand_total_vz": nhsu_report.grand_total_vz,
            "grand_total_ep_vz": nhsu_report.grand_total_ep_vz,
        }

    # ── 2. Платні послуги (paid services analytics) ──
    paid_analytics = await build_paid_analytics(db, user_id, year, month, None)
    paid_data = paid_analytics.model_dump(mode="json")

    # ── 3. Дані для розрахунку сформованого доходу власника ──
    nhsu_doctors = await _nhsu_doctors_data(db, user_id, year, month)
    owner_nhsu = next((d for d in nhsu_doctors if d["is_owner"]), None)
    hired_nhsu_list = [d for d in nhsu_doctors if not d["is_owner"]]

    nhsu_settings = await _get_settings(db, user_id)
    ep_rate = float(nhsu_settings.ep_rate) if nhsu_settings else 5.0
    vz_rate = float(nhsu_settings.vz_rate) if nhsu_settings else 1.5
    esv_owner = float(nhsu_settings.esv_monthly) if nhsu_settings else 1760.0

    ep_all = round(sum(d["nhsu_ep"] for d in nhsu_doctors), 2)
    vz_all = round(sum(d["nhsu_vz"] for d in nhsu_doctors), 2)

    owner_nhsu_brutto = owner_nhsu["nhsu_brutto"] if owner_nhsu else 0.0

    # Розрахунок "Кошти за власні декларації"
    own_declarations = max(
        0,
        round(((owner_nhsu_brutto / 2) - (ep_all + vz_all + esv_owner)) * 0.9, 2),
    )

    # Розрахунок "Кошти за декларації найманого лікаря"
    hired_declarations = 0.0
    hired_doctor_detail = None
    hired_nurse_detail = None

    if hired_doctor_id and hired_nurse_id:
        hd = next((d for d in hired_nhsu_list if d["doctor_id"] == hired_doctor_id), None)
        if hd:
            # Знайти staff member для лікаря
            staff_res = await db.execute(
                select(StaffMember).where(
                    StaffMember.user_id == user_id,
                    StaffMember.is_active == True,
                )
            )
            staff_list = staff_res.scalars().all()

            sal_res = await db.execute(
                select(MonthlySalaryExpense).where(
                    MonthlySalaryExpense.user_id == user_id,
                    MonthlySalaryExpense.year == year,
                    MonthlySalaryExpense.month == month,
                )
            )
            saved_salary = {r.staff_member_id: r for r in sal_res.scalars().all()}

            pdfo_rate_v = float(nhsu_settings.pdfo_rate) / 100 if nhsu_settings else 0.18
            vz_zp_rate_v = float(nhsu_settings.vz_zp_rate) / 100 if nhsu_settings else 0.05
            esv_rate_v = float(nhsu_settings.esv_employer_rate) / 100 if nhsu_settings else 0.22

            def _calc_employer_cost(staff_member_id: int) -> float:
                rec = saved_salary.get(staff_member_id)
                if not rec:
                    return 0.0
                brutto = float(rec.brutto)
                esv = round(brutto * esv_rate_v, 2)
                netto = round(brutto - round(brutto * pdfo_rate_v, 2) - round(brutto * vz_zp_rate_v, 2), 2)
                supplement = 0.0
                if rec.has_supplement and rec.target_net is not None:
                    supplement = max(0.0, round(float(rec.target_net) - netto, 2))
                individual_bonus = float(rec.individual_bonus)
                return round(brutto + esv + supplement + individual_bonus, 2)

            doctor_sm = next((s for s in staff_list if s.doctor_id == hired_doctor_id), None)
            nurse_sm = next((s for s in staff_list if s.id == hired_nurse_id), None)

            doctor_employer_cost = _calc_employer_cost(doctor_sm.id) if doctor_sm else 0.0
            nurse_employer_cost = _calc_employer_cost(hired_nurse_id) if nurse_sm else 0.0

            hired_declarations = max(
                0,
                round(
                    (hd["nhsu_brutto"] - hd["nhsu_ep"] - hd["nhsu_vz"]
                     - doctor_employer_cost - nurse_employer_cost) / 2 * 0.9, 2,
                ),
            )

            hired_doctor_detail = {
                "doctor_id": hd["doctor_id"],
                "doctor_name": hd["doctor_name"],
                "nhsu_brutto": hd["nhsu_brutto"],
                "total_expenses": round(
                    hd["nhsu_ep"] + hd["nhsu_vz"] + doctor_employer_cost + nurse_employer_cost, 2,
                ),
            }
            hired_nurse_detail = {
                "staff_member_id": hired_nurse_id,
                "full_name": nurse_sm.full_name if nurse_sm else "—",
            }

    # Дохід від платних послуг власника
    owner_doc_res = await db.execute(
        select(Doctor).where(
            Doctor.user_id == user_id,
            Doctor.is_owner == True,
            Doctor.is_active == True,
        )
    )
    owner_doctor = owner_doc_res.scalar_one_or_none()
    owner_paid_services = 0.0
    if owner_doctor:
        owner_paid_services = await _doctor_paid_services_income(
            db, user_id, owner_doctor.id, year, month,
            ep_rate_pct=ep_rate, vz_rate_pct=vz_rate,
        )

    total_formed_income = round(own_declarations + hired_declarations + owner_paid_services, 2)

    formed_income = {
        "own_declarations": own_declarations,
        "own_nhsu_brutto": owner_nhsu_brutto,
        "hired_declarations": hired_declarations,
        "hired_doctor": hired_doctor_detail,
        "hired_nurse": hired_nurse_detail,
        "paid_services_income": owner_paid_services,
        "total": total_formed_income,
        "ep_all": ep_all,
        "vz_all": vz_all,
        "esv_owner": esv_owner,
    }

    # ПІБ власника
    owner_name = owner_doctor.full_name if owner_doctor else ""

    return {
        "owner_name": owner_name,
        "nhsu": nhsu_data,
        "paid_services": paid_data,
        "formed_income": formed_income,
    }


@router.post("/owner-share", status_code=201)
async def create_owner_share(
    body: OwnerShareCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Створює тимчасову публічну сторінку зведеного звіту власника ФОП (30 днів)."""
    # Lazy cleanup expired
    expired_res = await db.execute(
        select(ShareReport).where(
            ShareReport.user_id == user.id,
            ShareReport.expires_at <= datetime.now(timezone.utc),
        )
    )
    for share in expired_res.scalars().all():
        await db.delete(share)
    await db.commit()

    payload = await _build_owner_share_payload(
        db, user.id, body.year, body.month,
        body.hired_doctor_id, body.hired_nurse_id,
    )

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    share = ShareReport(
        user_id=user.id,
        token=token,
        filter_snapshot={
            "type": "owner_report",
            "year": body.year,
            "month": body.month,
            "hired_doctor_id": body.hired_doctor_id,
            "hired_nurse_id": body.hired_nurse_id,
        },
        payload_snapshot=payload,
        expires_at=expires_at,
        is_deleted=False,
    )
    db.add(share)
    await db.commit()

    return OwnerShareResponse(
        token=token,
        url=f"/owner-share/{token}",
        expires_at=expires_at,
    )


@router.get("/owner-share/{token}/view")
async def view_owner_share(token: str, db: AsyncSession = Depends(get_db)):
    """Публічний ендпоінт (без авторизації) — перегляд share-сторінки власника."""
    r = await db.execute(
        select(ShareReport).where(
            ShareReport.token == token,
            ShareReport.is_deleted == False,
            ShareReport.expires_at > datetime.now(timezone.utc),
        )
    )
    share = r.scalar_one_or_none()
    if not share:
        raise HTTPException(404, detail="Посилання не знайдено або термін дії закінчився")

    fs = share.filter_snapshot
    if fs.get("type") != "owner_report":
        raise HTTPException(404, detail="Посилання не знайдено")

    month_name = MONTHS_UA[fs.get("month", 1)]
    year = fs.get("year", "")

    return {
        "token": token,
        "filter_label": f"{month_name} {year}",
        "expires_at": share.expires_at.isoformat(),
        "data": share.payload_snapshot,
    }


# ══════════════════════════════════════════════════════════════════════
#  Запит до бухгалтера (Accountant Request)
# ══════════════════════════════════════════════════════════════════════


class AccountantRequestCreate(BaseModel):
    year: int
    month: int


class AccountantRequestResponse(BaseModel):
    token: str
    url: str
    expires_at: datetime


class AccSalaryItem(BaseModel):
    staff_member_id: int
    brutto: float


class AccExpenseItem(BaseModel):
    name: str
    amount: float
    is_recurring: bool = False
    backend_id: int | None = None  # id існуючого запису (якщо редагування)
    source: str = "fixed"          # "fixed" | "other" — тип оригінального запису


class AccountantSubmitRequest(BaseModel):
    salaries: list[AccSalaryItem]
    expenses: list[AccExpenseItem]


@router.post("/accountant-request", status_code=201)
async def create_accountant_request(
    body: AccountantRequestCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Створює тимчасову сторінку для бухгалтера (TTL 15 днів)."""
    # ── Збір даних для payload ──
    # Активні співробітники (крім лікаря-власника)
    staff_res = await db.execute(
        select(StaffMember).where(
            StaffMember.user_id == user.id,
            StaffMember.is_active == True,
        ).order_by(StaffMember.full_name)
    )
    staff_list = staff_res.scalars().all()

    # Знайти ID лікаря-власника
    owner_doc_res = await db.execute(
        select(Doctor).where(
            Doctor.user_id == user.id,
            Doctor.is_owner == True,
            Doctor.is_active == True,
        )
    )
    owner_doctor = owner_doc_res.scalar_one_or_none()
    owner_doctor_id = owner_doctor.id if owner_doctor else None

    # Фільтруємо staff: виключаємо лікаря-власника
    filtered_staff = [
        s for s in staff_list
        if not (s.doctor_id and s.doctor_id == owner_doctor_id)
    ]

    # Дані зарплат з попереднього місяця
    prev_year, prev_month = (body.year, body.month - 1) if body.month > 1 else (body.year - 1, 12)
    prev_sal_res = await db.execute(
        select(MonthlySalaryExpense).where(
            MonthlySalaryExpense.user_id == user.id,
            MonthlySalaryExpense.year == prev_year,
            MonthlySalaryExpense.month == prev_month,
        )
    )
    prev_salary_map = {r.staff_member_id: r for r in prev_sal_res.scalars().all()}

    salary_data = []
    for s in filtered_staff:
        prev = prev_salary_map.get(s.id)
        salary_data.append({
            "staff_member_id": s.id,
            "full_name": s.full_name,
            "role": s.role,
            "position": s.position,
            "prev_brutto": float(prev.brutto) if prev else 0.0,
        })

    # Постійні витрати з попереднього місяця (is_recurring=True)
    prev_fixed_res = await db.execute(
        select(MonthlyFixedExpense).where(
            MonthlyFixedExpense.user_id == user.id,
            MonthlyFixedExpense.year == prev_year,
            MonthlyFixedExpense.month == prev_month,
            MonthlyFixedExpense.is_recurring == True,
        )
    )
    recurring_expenses = []
    for fe in prev_fixed_res.scalars().all():
        recurring_expenses.append({
            "category_key": fe.category_key,
            "name": fe.name or FIXED_CATEGORY_NAMES.get(fe.category_key, fe.category_key),
            "amount": float(fe.amount),
            "is_recurring": True,
        })

    payload = {
        "salary_staff": salary_data,
        "recurring_expenses": recurring_expenses,
    }

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=15)

    share = ShareReport(
        user_id=user.id,
        token=token,
        filter_snapshot={
            "type": "accountant_request",
            "year": body.year,
            "month": body.month,
        },
        payload_snapshot=payload,
        expires_at=expires_at,
        is_deleted=False,
    )
    db.add(share)
    await db.commit()

    return AccountantRequestResponse(
        token=token,
        url=f"/accountant/{token}",
        expires_at=expires_at,
    )


@router.get("/accountant-request/{token}/view")
async def view_accountant_request(token: str, db: AsyncSession = Depends(get_db)):
    """Публічний ендпоінт — перегляд форми бухгалтера."""
    r = await db.execute(
        select(ShareReport).where(
            ShareReport.token == token,
            ShareReport.is_deleted == False,
            ShareReport.expires_at > datetime.now(timezone.utc),
        )
    )
    share = r.scalar_one_or_none()
    if not share:
        raise HTTPException(404, detail="Посилання не знайдено або термін дії закінчився")

    fs = share.filter_snapshot
    if fs.get("type") != "accountant_request":
        raise HTTPException(404, detail="Посилання не знайдено")

    month_name = MONTHS_UA[fs.get("month", 1)]
    year = fs.get("year")
    month = fs.get("month")
    user_id = share.user_id

    # ── Актуальні дані з БД (live_data) ──
    # Зарплати
    sal_res = await db.execute(
        select(MonthlySalaryExpense).where(
            MonthlySalaryExpense.user_id == user_id,
            MonthlySalaryExpense.year == year,
            MonthlySalaryExpense.month == month,
        )
    )
    salary_map = {s.staff_member_id: s for s in sal_res.scalars().all()}

    # Staff members (для full_name/role/position) — тільки ті, що у payload
    payload_staff_ids = {s["staff_member_id"] for s in share.payload_snapshot.get("salary_staff", [])}
    staff_res = await db.execute(
        select(StaffMember).where(StaffMember.id.in_(payload_staff_ids)) if payload_staff_ids else select(StaffMember).where(False)
    )
    staff_map = {s.id: s for s in staff_res.scalars().all()}

    live_salaries = []
    for ps in share.payload_snapshot.get("salary_staff", []):
        sid = ps["staff_member_id"]
        sal = salary_map.get(sid)
        sm = staff_map.get(sid)
        live_salaries.append({
            "staff_member_id": sid,
            "full_name": sm.full_name if sm else ps.get("full_name", ""),
            "role": sm.role if sm else ps.get("role", ""),
            "position": sm.position if sm else ps.get("position", ""),
            "current_brutto": float(sal.brutto) if sal else ps.get("prev_brutto", 0.0),
            "prev_brutto": ps.get("prev_brutto", 0.0),
            "edited_by": sal.edited_by if sal else None,
            "edited_at": sal.edited_at.isoformat() if sal and sal.edited_at else None,
        })

    # Постійні витрати (visible_to_accountant=True)
    fixed_res = await db.execute(
        select(MonthlyFixedExpense).where(
            MonthlyFixedExpense.user_id == user_id,
            MonthlyFixedExpense.year == year,
            MonthlyFixedExpense.month == month,
            MonthlyFixedExpense.visible_to_accountant == True,
        ).order_by(MonthlyFixedExpense.id)
    )
    live_fixed = []
    for fe in fixed_res.scalars().all():
        live_fixed.append({
            "id": fe.id,
            "name": fe.name or FIXED_CATEGORY_NAMES.get(fe.category_key, fe.category_key),
            "amount": float(fe.amount),
            "is_recurring": fe.is_recurring,
            "category_key": fe.category_key,
            "edited_by": fe.edited_by,
            "edited_at": fe.edited_at.isoformat() if fe.edited_at else None,
        })

    # Інші витрати (visible_to_accountant=True)
    other_res = await db.execute(
        select(MonthlyOtherExpense).where(
            MonthlyOtherExpense.user_id == user_id,
            MonthlyOtherExpense.year == year,
            MonthlyOtherExpense.month == month,
            MonthlyOtherExpense.visible_to_accountant == True,
        ).order_by(MonthlyOtherExpense.id)
    )
    live_other = []
    for oe in other_res.scalars().all():
        live_other.append({
            "id": oe.id,
            "name": oe.name,
            "amount": float(oe.amount),
            "category": oe.category,
            "edited_by": oe.edited_by,
            "edited_at": oe.edited_at.isoformat() if oe.edited_at else None,
        })

    return {
        "token": token,
        "filter_label": f"{month_name} {year}",
        "year": year,
        "month": month,
        "expires_at": share.expires_at.isoformat(),
        "submitted": fs.get("submitted", False),
        "submitted_data": fs.get("submitted_data"),
        "data": share.payload_snapshot,
        "live_data": {
            "salaries": live_salaries,
            "fixed_expenses": live_fixed,
            "other_expenses": live_other,
        },
    }


@router.post("/accountant-request/{token}/submit")
async def submit_accountant_request(
    token: str,
    body: AccountantSubmitRequest,
    db: AsyncSession = Depends(get_db),
):
    """Публічний ендпоінт — бухгалтер надсилає звіт."""
    r = await db.execute(
        select(ShareReport).where(
            ShareReport.token == token,
            ShareReport.is_deleted == False,
            ShareReport.expires_at > datetime.now(timezone.utc),
        )
    )
    share = r.scalar_one_or_none()
    if not share:
        raise HTTPException(404, detail="Посилання не знайдено або термін дії закінчився")

    fs = share.filter_snapshot
    if fs.get("type") != "accountant_request":
        raise HTTPException(404, detail="Посилання не знайдено")

    year = fs["year"]
    month = fs["month"]
    user_id = share.user_id

    saved_salaries = []
    saved_fixed = []
    saved_other = []

    # ── 1. Зберігаємо зарплати ──
    for sal in body.salaries:
        # Перевірка що staff_member належить user
        sm_res = await db.execute(
            select(StaffMember).where(
                StaffMember.id == sal.staff_member_id,
                StaffMember.user_id == user_id,
            )
        )
        sm = sm_res.scalar_one_or_none()
        if not sm:
            continue

        # Upsert salary
        existing_res = await db.execute(
            select(MonthlySalaryExpense).where(
                MonthlySalaryExpense.user_id == user_id,
                MonthlySalaryExpense.staff_member_id == sal.staff_member_id,
                MonthlySalaryExpense.year == year,
                MonthlySalaryExpense.month == month,
            )
        )
        rec = existing_res.scalar_one_or_none()
        if rec is None:
            rec = MonthlySalaryExpense(
                user_id=user_id,
                staff_member_id=sal.staff_member_id,
                year=year,
                month=month,
            )
            db.add(rec)
        rec.brutto = sal.brutto
        rec.edited_by = "accountant"
        rec.edited_at = datetime.now(timezone.utc)
        await db.flush()

        saved_salaries.append({
            "staff_member_id": sal.staff_member_id,
            "full_name": sm.full_name,
            "brutto": sal.brutto,
        })

    # ── 2. Зберігаємо витрати бухгалтера ──
    # Збираємо ID всіх ВИДИМИХ витрат (тільки ті, які бухгалтер бачив)
    vis_fixed_res = await db.execute(
        select(MonthlyFixedExpense).where(
            MonthlyFixedExpense.user_id == user_id,
            MonthlyFixedExpense.year == year,
            MonthlyFixedExpense.month == month,
            MonthlyFixedExpense.visible_to_accountant == True,
        )
    )
    visible_fixed = {fe.id: fe for fe in vis_fixed_res.scalars().all()}

    vis_other_res = await db.execute(
        select(MonthlyOtherExpense).where(
            MonthlyOtherExpense.user_id == user_id,
            MonthlyOtherExpense.year == year,
            MonthlyOtherExpense.month == month,
            MonthlyOtherExpense.visible_to_accountant == True,
        )
    )
    visible_other = {oe.id: oe for oe in vis_other_res.scalars().all()}

    # Множини ID які бухгалтер залишив у формі
    submitted_fixed_ids: set[int] = set()
    submitted_other_ids: set[int] = set()

    for exp in body.expenses:
        now = datetime.now(timezone.utc)

        if exp.backend_id and exp.source == "fixed" and exp.backend_id in visible_fixed:
            # ── Існуючий MonthlyFixedExpense ──
            rec = visible_fixed[exp.backend_id]
            submitted_fixed_ids.add(exp.backend_id)

            if exp.is_recurring:
                # Залишається у fixed — оновлюємо на місці
                rec.name = exp.name
                rec.amount = exp.amount
                rec.is_recurring = True
                rec.edited_by = "accountant"
                rec.edited_at = now
                await db.flush()
                saved_fixed.append({"name": exp.name, "amount": exp.amount, "category": "Постійні витрати"})
            else:
                # Переміщення fixed → other (прапорець знято)
                await db.delete(rec)
                await db.flush()
                oe = MonthlyOtherExpense(
                    user_id=user_id, year=year, month=month,
                    name=exp.name, amount=exp.amount, category="general",
                    edited_by="accountant", edited_at=now,
                )
                db.add(oe)
                await db.flush()
                saved_other.append({"name": exp.name, "amount": exp.amount, "category": "Інші витрати"})

        elif exp.backend_id and exp.source == "other" and exp.backend_id in visible_other:
            # ── Існуючий MonthlyOtherExpense ──
            rec = visible_other[exp.backend_id]
            submitted_other_ids.add(exp.backend_id)

            if not exp.is_recurring:
                # Залишається у other — оновлюємо на місці
                rec.name = exp.name
                rec.amount = exp.amount
                rec.edited_by = "accountant"
                rec.edited_at = now
                await db.flush()
                saved_other.append({"name": exp.name, "amount": exp.amount, "category": "Інші витрати"})
            else:
                # Переміщення other → fixed (прапорець поставлено)
                await db.delete(rec)
                await db.flush()
                cat_key = str(uuid.uuid4())[:12]
                fe = MonthlyFixedExpense(
                    user_id=user_id, year=year, month=month,
                    category_key=cat_key, name=exp.name, amount=exp.amount,
                    is_recurring=True, edited_by="accountant", edited_at=now,
                )
                db.add(fe)
                await db.flush()
                await _propagate_recurring(
                    db, user_id, year, month, cat_key, exp.name, "", exp.amount,
                )
                saved_fixed.append({"name": exp.name, "amount": exp.amount, "category": "Постійні витрати"})

        else:
            # ── Нова витрата від бухгалтера ──
            if exp.is_recurring:
                cat_key = str(uuid.uuid4())[:12]
                fe = MonthlyFixedExpense(
                    user_id=user_id, year=year, month=month,
                    category_key=cat_key, name=exp.name, amount=exp.amount,
                    is_recurring=True, edited_by="accountant", edited_at=now,
                )
                db.add(fe)
                await db.flush()
                await _propagate_recurring(
                    db, user_id, year, month, cat_key, exp.name, "", exp.amount,
                )
                saved_fixed.append({"name": exp.name, "amount": exp.amount, "category": "Постійні витрати"})
            else:
                oe = MonthlyOtherExpense(
                    user_id=user_id, year=year, month=month,
                    name=exp.name, amount=exp.amount, category="general",
                    edited_by="accountant", edited_at=now,
                )
                db.add(oe)
                await db.flush()
                saved_other.append({"name": exp.name, "amount": exp.amount, "category": "Інші витрати"})

    # ── Видалити витрати які бухгалтер прибрав (тільки серед ВИДИМИХ) ──
    for fid, fe_rec in visible_fixed.items():
        if fid not in submitted_fixed_ids:
            await db.delete(fe_rec)
    for oid, oe_rec in visible_other.items():
        if oid not in submitted_other_ids:
            await db.delete(oe_rec)
    await db.flush()

    # ── 3. Оновлюємо share запис як підтверджений ──
    new_fs = dict(fs)
    new_fs["submitted"] = True
    new_fs["submitted_data"] = {
        "salaries": saved_salaries,
        "fixed_expenses": saved_fixed,
        "other_expenses": saved_other,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    share.filter_snapshot = new_fs
    flag_modified(share, "filter_snapshot")

    await db.commit()

    # ── 4. Email-повідомлення власнику ──
    owner_res = await db.execute(select(User).where(User.id == user_id))
    owner = owner_res.scalar_one_or_none()
    if owner and owner.email:
        salary_total = sum(s["brutto"] for s in saved_salaries)
        expenses_total = sum(e["amount"] for e in saved_fixed) + sum(
            e["amount"] for e in saved_other
        )
        month_name = MONTHS_UA[month]
        try:
            sent = await send_accountant_report_notification(
                to_email=owner.email,
                month_name=month_name,
                year=year,
                salary_total=salary_total,
                expenses_total=expenses_total,
            )
            if not sent:
                logger.warning(
                    "Email-повідомлення про звіт бухгалтера не надіслано для %s (SMTP не налаштовано?)",
                    owner.email,
                )
        except Exception:
            logger.exception("Помилка при відправці email-повідомлення про звіт бухгалтера")

    return {
        "status": "ok",
        "message": "Дані прийняті та записані",
        "saved": {
            "salaries": saved_salaries,
            "fixed_expenses": saved_fixed,
            "other_expenses": saved_other,
        },
    }
