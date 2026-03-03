"""Бюджетне планування: помісячна таблиця витрат на рік."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.budget import BudgetCell, BudgetRow
from app.models.monthly_service import MonthlyPaidServiceEntry, MonthlyPaidServicesReport
from app.models.nhsu import NhsuRecord, NhsuSettings
from app.models.service import Service
from app.models.staff import StaffMember
from app.models.user import User
from app.schemas.budget import (
    AddRowRequest,
    BudgetCellValue,
    BudgetRecommendation,
    BudgetRecommendationsResponse,
    BudgetRowOut,
    BudgetTableResponse,
    CopyMonthRequest,
    UpdateCellRequest,
)

router = APIRouter()

# ────────── Дефолтні рядки (seed при першому доступі) ──────────
_DEFAULT_FIXED = [
    dict(section="fixed", sub_type="fixed", input_type="manual",
         name="Оренда приміщення",
         description="Щомісячна оренда приміщення. Ручний ввід.",
         order_index=10, is_system=True),
    dict(section="fixed", sub_type="quasi_fixed", input_type="manual",
         name="Комунальні послуги",
         description="Електроенергія, вода, опалення. Умовно-постійна — "
                     "сума може сезонно коливатися. Варто переглядати щомісяця.",
         order_index=20, is_system=True),
    dict(section="fixed", sub_type="fixed", input_type="manual",
         name="Зв'язок та інтернет",
         description="Інтернет, телефонія, мобільний зв'язок. Ручний ввід.",
         order_index=30, is_system=True),
    dict(section="fixed", sub_type="fixed", input_type="manual",
         name="Обслуговування обладнання",
         description="Технічне обслуговування та ремонт медичного обладнання. Ручний ввід.",
         order_index=40, is_system=True),
    dict(section="fixed", sub_type="quasi_fixed", input_type="manual",
         name="Витратні матеріали",
         description="Медичні витратні матеріали. Умовно-постійна — "
                     "обсяг залежить від кількості пацієнтів.",
         order_index=50, is_system=True),
    dict(section="fixed", sub_type="fixed", input_type="auto_formula",
         name="ЄСВ власника",
         description="Єдиний соціальний внесок ФОП (власника). "
                     "Автоматично береться з Налаштувань → ЄСВ щомісяця.",
         order_index=60, is_system=True, formula_key="esv_owner"),
    dict(section="fixed", sub_type="fixed", input_type="manual",
         name="Інші фіксовані витрати",
         description="Різні постійні витрати. Ручний ввід.",
         order_index=70, is_system=True),
]

_DEFAULT_VARIABLE = [
    dict(section="variable", sub_type="variable", input_type="auto_formula",
         name="Сплата ЄП (5%)",
         description="Єдиний податок: Дохід за місяць × ставка ЄП із Налаштувань. "
                     "Автоматично перераховується при зміні доходу.",
         order_index=110, is_system=True, formula_key="ep_tax"),
    dict(section="variable", sub_type="variable", input_type="auto_formula",
         name="Сплата ВЗ",
         description="Військовий збір: Дохід за місяць × ставка ВЗ із Налаштувань. "
                     "Автоматично перераховується при зміні доходу.",
         order_index=120, is_system=True, formula_key="vz_tax"),
    dict(section="variable", sub_type="variable", input_type="auto_module",
         name="Виплата НСЗУ (попередній місяць)",
         description="Сума нарахувань НСЗУ за попередній місяць (зсув -1 місяць). "
                     "Підтягується автоматично з модуля Декларації.",
         order_index=130, is_system=True, formula_key="nhsu_lag"),
]

# ESV employer rate (Україна, 2024)
_ESV_EMPLOYER_RATE = 0.22
# Ставки утримань із ЗП (за замовчуванням, можуть бути перевизначені через налаштування)
_DEFAULT_PDFO_RATE = 0.18
_DEFAULT_VZ_ZP_RATE = 0.05


# ────────── Helpers ──────────

async def _get_nhsu_settings(db: AsyncSession, user_id: int) -> Optional[NhsuSettings]:
    result = await db.execute(
        select(NhsuSettings).where(NhsuSettings.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def _compute_monthly_income(db: AsyncSession, user_id: int, year: int, month: int) -> float:
    """Загальний дохід за місяць = НСЗУ + Платні послуги."""
    # НСЗУ
    nhsu_res = await db.execute(
        select(NhsuRecord).where(
            NhsuRecord.user_id == user_id,
            NhsuRecord.year == year,
            NhsuRecord.month == month,
        )
    )
    nhsu_total = sum(r.amount for r in nhsu_res.scalars().all())

    # Платні послуги: SUM(entry.quantity × service.price)
    reports_res = await db.execute(
        select(MonthlyPaidServicesReport).where(
            MonthlyPaidServicesReport.user_id == user_id,
            MonthlyPaidServicesReport.year == year,
            MonthlyPaidServicesReport.month == month,
        )
    )
    report_ids = [r.id for r in reports_res.scalars().all()]
    paid_total = 0.0
    if report_ids:
        entries_res = await db.execute(
            select(MonthlyPaidServiceEntry, Service)
            .join(Service, MonthlyPaidServiceEntry.service_id == Service.id)
            .where(MonthlyPaidServiceEntry.report_id.in_(report_ids))
        )
        for entry, svc in entries_res.all():
            paid_total += float(entry.quantity) * float(svc.price)

    return round(nhsu_total + paid_total, 2)


async def _compute_nhsu_total(db: AsyncSession, user_id: int, year: int, month: int) -> float:
    """Сума НСЗУ за вказаний місяць (для зсуву -1 місяць)."""
    res = await db.execute(
        select(NhsuRecord).where(
            NhsuRecord.user_id == user_id,
            NhsuRecord.year == year,
            NhsuRecord.month == month,
        )
    )
    return round(sum(r.amount for r in res.scalars().all()), 2)


async def _seed_default_rows(db: AsyncSession, user_id: int) -> bool:
    """Створює дефолтні рядки якщо їх ще немає. Повертає True якщо щось створено."""
    existing = await db.execute(
        select(BudgetRow).where(BudgetRow.user_id == user_id, BudgetRow.is_active == True)
    )
    if existing.scalars().first():
        return False  # вже є

    for spec in _DEFAULT_FIXED + _DEFAULT_VARIABLE:
        row = BudgetRow(user_id=user_id, **spec)
        db.add(row)
    await db.flush()
    return True


async def _ensure_staff_rows(db: AsyncSession, user_id: int) -> None:
    """Для кожного активного співробітника перевіряє/створює зарплатні рядки."""
    staff_res = await db.execute(
        select(StaffMember).where(
            StaffMember.user_id == user_id,
            StaffMember.is_active == True,
        )
    )
    staff_list = staff_res.scalars().all()

    for member in staff_list:
        # Перевіряємо чи існує хоча б один рядок для цього співробітника
        existing = await db.execute(
            select(BudgetRow).where(
                BudgetRow.user_id == user_id,
                BudgetRow.staff_member_id == member.id,
                BudgetRow.is_active == True,
            )
        )
        if existing.scalars().first():
            continue  # рядки вже є

        base_idx = 200 + member.id * 10
        name = member.full_name

        rows_to_add = [
            BudgetRow(user_id=user_id, section="fixed", sub_type="fixed",
                      input_type="manual", name=f"Оклад ({name})",
                      description=f"Брутто-оклад {name}. Ручний ввід.",
                      order_index=base_idx, is_system=True, is_info_row=False,
                      formula_key=f"salary_brutto__{member.id}",
                      staff_member_id=member.id),
            BudgetRow(user_id=user_id, section="fixed", sub_type="fixed",
                      input_type="auto_formula", name=f"ЄСВ роботодавця ({name})",
                      description=f"ЄСВ роботодавця = Оклад × 22%. Авторозрахунок.",
                      order_index=base_idx + 1, is_system=True, is_info_row=False,
                      formula_key=f"salary_esv__{member.id}",
                      staff_member_id=member.id),
            BudgetRow(user_id=user_id, section="fixed", sub_type="fixed",
                      input_type="manual", name=f"Доплата ({name})",
                      description=f"Доплата (премія, надбавка) для {name}. Ручний ввід. "
                                  "Залиште 0 якщо доплат немає.",
                      order_index=base_idx + 2, is_system=True, is_info_row=False,
                      formula_key=f"salary_bonus__{member.id}",
                      staff_member_id=member.id),
            BudgetRow(user_id=user_id, section="fixed", sub_type="fixed",
                      input_type="auto_formula", name=f"ПДФО та ВЗ із ЗП ({name})",
                      description=f"Інформаційний рядок: ПДФО + ВЗ від Окладу. "
                                  f"Ставки беруться з Налаштувань. "
                                  f"Не входить у «Всього витрат».",
                      order_index=base_idx + 3, is_system=True, is_info_row=True,
                      formula_key=f"salary_pdfo_info__{member.id}",
                      staff_member_id=member.id),
        ]
        for r in rows_to_add:
            db.add(r)
    await db.flush()


def _compute_cell_value(
    row: BudgetRow,
    month: int,
    cells: dict,          # (row_id, month) → value
    monthly_income: dict, # month → income
    monthly_nhsu_lag: dict,
    esv_owner: float,
    ep_rate: float,
    vz_rate: float,
    all_rows: list[BudgetRow],
    pdfo_rate: float = _DEFAULT_PDFO_RATE,
    vz_zp_rate: float = _DEFAULT_VZ_ZP_RATE,
) -> tuple[Optional[float], bool]:
    """Повертає (value, is_locked) для рядка і місяця."""
    key = row.formula_key

    if row.input_type == "manual":
        return cells.get((row.id, month)), False

    if key == "ep_tax":
        income = monthly_income.get(month, 0.0)
        return round(income * ep_rate, 2), True

    if key == "vz_tax":
        income = monthly_income.get(month, 0.0)
        return round(income * vz_rate, 2), True

    if key == "nhsu_lag":
        return monthly_nhsu_lag.get(month, 0.0), True

    if key == "esv_owner":
        return esv_owner, True

    # Зарплатні формули
    if key and key.startswith("salary_"):
        parts = key.split("__")
        if len(parts) == 2:
            kind, sid = parts[0].replace("salary_", ""), parts[1]
            try:
                sid_int = int(sid)
            except ValueError:
                return None, True

            brutto_row = next(
                (r for r in all_rows if r.formula_key == f"salary_brutto__{sid}"), None
            )
            brutto = cells.get((brutto_row.id, month), 0.0) if brutto_row else 0.0
            brutto = brutto or 0.0

            if f"salary_esv__{sid}" == key:
                return round(brutto * _ESV_EMPLOYER_RATE, 2), True
            if f"salary_pdfo_info__{sid}" == key:
                return round(brutto * (pdfo_rate + vz_zp_rate), 2), True

    return None, True


# ────────── Endpoints ──────────

@router.get("/", response_model=BudgetTableResponse)
async def get_budget_table(
    year: int = Query(default_factory=lambda: datetime.now().year),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id

    # Seed дефолтних рядків при першому відкритті
    await _seed_default_rows(db, user_id)
    await _ensure_staff_rows(db, user_id)
    await db.commit()

    # Отримуємо всі активні рядки
    rows_res = await db.execute(
        select(BudgetRow)
        .where(BudgetRow.user_id == user_id, BudgetRow.is_active == True)
        .order_by(BudgetRow.order_index, BudgetRow.id)
    )
    rows = rows_res.scalars().all()

    # Отримуємо всі комірки за рік
    cells_res = await db.execute(
        select(BudgetCell)
        .join(BudgetRow, BudgetCell.row_id == BudgetRow.id)
        .where(BudgetRow.user_id == user_id, BudgetCell.year == year)
    )
    cells: dict[tuple[int, int], Optional[float]] = {
        (c.row_id, c.month): c.value for c in cells_res.scalars().all()
    }

    # Налаштування НСЗУ (для ставок ЄП, ВЗ, ЄСВ власника)
    nhsu_settings = await _get_nhsu_settings(db, user_id)
    esv_owner = float(nhsu_settings.esv_monthly) if nhsu_settings else 1760.0
    ep_rate = float(nhsu_settings.ep_rate) / 100 if nhsu_settings else 0.05
    vz_rate = float(nhsu_settings.vz_rate) / 100 if nhsu_settings else 0.015
    pdfo_rate = float(nhsu_settings.pdfo_rate) / 100 if nhsu_settings else _DEFAULT_PDFO_RATE
    vz_zp_rate = float(nhsu_settings.vz_zp_rate) / 100 if nhsu_settings else _DEFAULT_VZ_ZP_RATE

    # Обчислюємо місячні доходи та лаг-НСЗУ
    monthly_income: dict[int, float] = {}
    monthly_nhsu_lag: dict[int, float] = {}
    for m in range(1, 13):
        monthly_income[m] = await _compute_monthly_income(db, user_id, year, m)
        lag_year = year if m > 1 else year - 1
        lag_month = m - 1 if m > 1 else 12
        monthly_nhsu_lag[m] = await _compute_nhsu_total(db, user_id, lag_year, lag_month)

    # Будуємо рядки відповіді
    row_out_list: list[BudgetRowOut] = []
    for row in rows:
        months_data: dict[str, BudgetCellValue] = {}
        values_for_total: list[float] = []
        for m in range(1, 13):
            val, locked = _compute_cell_value(
                row, m, cells, monthly_income, monthly_nhsu_lag,
                esv_owner, ep_rate, vz_rate, list(rows),
                pdfo_rate=pdfo_rate, vz_zp_rate=vz_zp_rate,
            )
            months_data[str(m)] = BudgetCellValue(value=val, is_locked=locked)
            if val is not None:
                values_for_total.append(val)

        yearly_total = round(sum(values_for_total), 2) if values_for_total else None

        row_out_list.append(BudgetRowOut(
            id=row.id,
            section=row.section,
            sub_type=row.sub_type,
            input_type=row.input_type,
            name=row.name,
            description=row.description,
            order_index=row.order_index,
            is_info_row=row.is_info_row,
            is_system=row.is_system,
            formula_key=row.formula_key,
            staff_member_id=row.staff_member_id,
            months=months_data,
            yearly_total=yearly_total,
        ))

    # Підсумки по місяцях
    monthly_totals: dict[str, float] = {}
    monthly_remaining: dict[str, float] = {}
    for m in range(1, 13):
        total = sum(
            (r.months[str(m)].value or 0.0)
            for r in row_out_list
            if not r.is_info_row and r.months[str(m)].value is not None
        )
        monthly_totals[str(m)] = round(total, 2)
        monthly_remaining[str(m)] = round(monthly_income[m] - total, 2)

    return BudgetTableResponse(
        year=year,
        rows=row_out_list,
        monthly_income={str(m): v for m, v in monthly_income.items()},
        monthly_totals=monthly_totals,
        monthly_remaining=monthly_remaining,
    )


@router.put("/cell")
async def update_cell(
    req: UpdateCellRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Зберегти значення ручної комірки."""
    user_id = current_user.id

    # Перевіряємо, що рядок належить користувачу і є ручним
    row_res = await db.execute(
        select(BudgetRow).where(
            BudgetRow.id == req.row_id,
            BudgetRow.user_id == user_id,
            BudgetRow.is_active == True,
        )
    )
    row = row_res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Рядок не знайдено")
    if row.input_type != "manual":
        raise HTTPException(status_code=400, detail="Ця комірка розраховується автоматично")
    if not (1 <= req.month <= 12):
        raise HTTPException(status_code=400, detail="Місяць повинен бути від 1 до 12")

    # Upsert
    cell_res = await db.execute(
        select(BudgetCell).where(
            BudgetCell.row_id == req.row_id,
            BudgetCell.year == req.year,
            BudgetCell.month == req.month,
        )
    )
    cell = cell_res.scalar_one_or_none()
    if cell:
        cell.value = req.value
    else:
        cell = BudgetCell(row_id=req.row_id, year=req.year, month=req.month, value=req.value)
        db.add(cell)
    await db.commit()
    return {"ok": True}


@router.post("/copy-month")
async def copy_month(
    req: CopyMonthRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Копіювати значення постійних витрат з одного місяця в інші."""
    user_id = current_user.id

    # Отримуємо ручні рядки (лише manual), відповідного section якщо вказано
    query = select(BudgetRow).where(
        BudgetRow.user_id == user_id,
        BudgetRow.is_active == True,
        BudgetRow.input_type == "manual",
    )
    if req.section:
        query = query.where(BudgetRow.section == req.section)
    rows_res = await db.execute(query)
    rows = rows_res.scalars().all()

    for row in rows:
        # Значення з джерельного місяця
        src_cell_res = await db.execute(
            select(BudgetCell).where(
                BudgetCell.row_id == row.id,
                BudgetCell.year == req.year,
                BudgetCell.month == req.source_month,
            )
        )
        src_cell = src_cell_res.scalar_one_or_none()
        src_value = src_cell.value if src_cell else None

        for tgt_month in req.target_months:
            if tgt_month == req.source_month:
                continue
            cell_res = await db.execute(
                select(BudgetCell).where(
                    BudgetCell.row_id == row.id,
                    BudgetCell.year == req.year,
                    BudgetCell.month == tgt_month,
                )
            )
            cell = cell_res.scalar_one_or_none()
            if cell:
                cell.value = src_value
            else:
                db.add(BudgetCell(
                    row_id=row.id, year=req.year, month=tgt_month, value=src_value
                ))
    await db.commit()
    return {"ok": True, "rows_affected": len(rows)}


@router.post("/rows")
async def add_custom_row(
    req: AddRowRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Додати власну статтю витрат."""
    # Знаходимо максимальний order_index у секції
    max_res = await db.execute(
        select(BudgetRow.order_index)
        .where(BudgetRow.user_id == current_user.id, BudgetRow.section == req.section)
        .order_by(BudgetRow.order_index.desc())
        .limit(1)
    )
    max_idx = max_res.scalar_one_or_none() or 0

    row = BudgetRow(
        user_id=current_user.id,
        section=req.section,
        sub_type=req.sub_type,
        input_type="manual",
        name=req.name,
        description=req.description,
        order_index=max_idx + 5,
        is_system=False,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "name": row.name}


@router.delete("/rows/{row_id}")
async def delete_row(
    row_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Видалити власну статтю витрат (не системні)."""
    res = await db.execute(
        select(BudgetRow).where(
            BudgetRow.id == row_id,
            BudgetRow.user_id == current_user.id,
        )
    )
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Рядок не знайдено")
    if row.is_system:
        raise HTTPException(status_code=400, detail="Системний рядок не можна видалити")
    row.is_active = False
    await db.commit()
    return {"ok": True}


@router.get("/recommendations", response_model=BudgetRecommendationsResponse)
async def get_recommendations(
    year: int = Query(default_factory=lambda: datetime.now().year),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    recommendations: list[BudgetRecommendation] = []

    # Отримуємо рядки
    rows_res = await db.execute(
        select(BudgetRow).where(
            BudgetRow.user_id == user_id, BudgetRow.is_active == True
        )
    )
    rows = rows_res.scalars().all()

    cells_res = await db.execute(
        select(BudgetCell)
        .join(BudgetRow, BudgetCell.row_id == BudgetRow.id)
        .where(BudgetRow.user_id == user_id, BudgetCell.year == year)
    )
    cells: dict[tuple[int, int], Optional[float]] = {
        (c.row_id, c.month): c.value for c in cells_res.scalars().all()
    }

    nhsu_settings = await _get_nhsu_settings(db, user_id)
    esv_owner = float(nhsu_settings.esv_monthly) if nhsu_settings else 1760.0
    ep_rate = float(nhsu_settings.ep_rate) / 100 if nhsu_settings else 0.05
    vz_rate = float(nhsu_settings.vz_rate) / 100 if nhsu_settings else 0.015
    pdfo_rate = float(nhsu_settings.pdfo_rate) / 100 if nhsu_settings else _DEFAULT_PDFO_RATE
    vz_zp_rate = float(nhsu_settings.vz_zp_rate) / 100 if nhsu_settings else _DEFAULT_VZ_ZP_RATE

    # Місячні доходи
    monthly_income: dict[int, float] = {}
    for m in range(1, 13):
        monthly_income[m] = await _compute_monthly_income(db, user_id, year, m)

    # Постійні витрати по місяцях (без info rows і без змінних)
    fixed_monthly: dict[int, float] = {m: 0.0 for m in range(1, 13)}
    for row in rows:
        if row.is_info_row or row.section != "fixed":
            continue
        for m in range(1, 13):
            val, _ = _compute_cell_value(
                row, m, cells, monthly_income, {}, esv_owner, ep_rate, vz_rate, list(rows),
                pdfo_rate=pdfo_rate, vz_zp_rate=vz_zp_rate,
            )
            if val is not None:
                fixed_monthly[m] += val

    # Середньомісячні постійні витрати (тільки заповнені місяці)
    filled_fixed = [(m, v) for m, v in fixed_monthly.items() if v > 0]
    if filled_fixed:
        avg_fixed = sum(v for _, v in filled_fixed) / len(filled_fixed)
    else:
        avg_fixed = 0.0

    # 1. Точка беззбитковості
    if avg_fixed > 0:
        recommendations.append(BudgetRecommendation(
            type="breakeven",
            title="Точка беззбитковості",
            body=(f"Мінімальний місячний дохід для покриття постійних витрат: "
                  f"≈ {avg_fixed:,.0f} ₴. "
                  f"Розраховано як середня сума постійних витрат за заповнені місяці."),
        ))

    # 2. Попередження про змінні податки
    ep_pct = int(float(nhsu_settings.ep_rate)) if nhsu_settings else 5
    vz_pct = float(nhsu_settings.vz_rate) if nhsu_settings else 1.5
    recommendations.append(BudgetRecommendation(
        type="info",
        title="Змінні податки прив'язані до доходу",
        body=(f"Сплата ЄП ({ep_pct}%) та ВЗ ({vz_pct}%) розраховуються автоматично "
              f"від загального місячного доходу (НСЗУ + Платні послуги). "
              f"При зміні доходу ці значення перерахуються автоматично."),
    ))

    # 3. Умовно-постійні рядки
    quasi_names = [r.name for r in rows if r.sub_type == "quasi_fixed" and not r.is_info_row]
    if quasi_names:
        recommendations.append(BudgetRecommendation(
            type="tip",
            title="Умовно-постійні витрати",
            body=(f"Рядки «{', '.join(quasi_names)}» позначені як умовно-постійні. "
                  f"Вони плануються як постійні, але фактичні суми можуть сезонно "
                  f"коливатися. Рекомендується переглядати їх щомісяця."),
        ))

    # 4. Постійні можна копіювати
    manual_fixed = [r for r in rows if r.section == "fixed" and r.input_type == "manual" and not r.is_info_row]
    if manual_fixed:
        recommendations.append(BudgetRecommendation(
            type="info",
            title="Копіювання постійних витрат",
            body=(f"Постійні витрати ({len(manual_fixed)} рядків) можна скопіювати з "
                  f"одного місяця на решту за допомогою кнопки «Скопіювати по всіх місяцях». "
                  f"Це заощадить час при плануванні річного бюджету."),
        ))

    # 5. Незаповнені ручні комірки
    unfilled_months: list[int] = []
    for m in range(1, 13):
        for row in manual_fixed:
            if cells.get((row.id, m)) is None:
                unfilled_months.append(m)
                break
    if unfilled_months:
        month_names = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер",
                       "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"]
        names = ", ".join(month_names[m - 1] for m in sorted(set(unfilled_months)))
        recommendations.append(BudgetRecommendation(
            type="warning",
            title="Незаповнені постійні витрати",
            body=f"У місяцях {names} є незаповнені статті постійних витрат. "
                 f"Заповніть їх для точного розрахунку підсумків.",
            months=sorted(set(unfilled_months)),
        ))

    # 6. Перевитрата
    overspend_months = []
    for m in range(1, 13):
        income = monthly_income[m]
        if income == 0:
            continue
        total_exp = 0.0
        for row in rows:
            if row.is_info_row:
                continue
            val, _ = _compute_cell_value(
                row, m, cells, monthly_income, {}, esv_owner, ep_rate, vz_rate, list(rows)
            )
            total_exp += val or 0.0
        if total_exp > income:
            overspend_months.append(m)
    if overspend_months:
        month_names = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер",
                       "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"]
        names = ", ".join(month_names[m - 1] for m in overspend_months)
        recommendations.append(BudgetRecommendation(
            type="warning",
            title="Перевитрата",
            body=f"У місяцях {names} витрати перевищують дохід. "
                 f"Рекомендується переглянути структуру витрат.",
            months=overspend_months,
        ))

    return BudgetRecommendationsResponse(year=year, recommendations=recommendations)
