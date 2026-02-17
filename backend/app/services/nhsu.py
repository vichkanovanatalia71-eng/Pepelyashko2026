from __future__ import annotations

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.doctor import Doctor
from app.models.nhsu import NhsuRecord, NhsuSettings, AGE_GROUPS
from app.schemas.nhsu import (
    AgeGroupSummary,
    DoctorAgeGroupRow,
    DoctorSummary,
    NhsuMonthlyReport,
    NhsuMonthlySaveRequest,
)

AGE_GROUP_LABELS = {g["key"]: g["label"] for g in AGE_GROUPS}
AGE_GROUP_KEYS = [g["key"] for g in AGE_GROUPS]


async def get_or_create_settings(db: AsyncSession, user_id: int) -> NhsuSettings:
    """Отримати або створити налаштування НСЗУ для користувача."""
    result = await db.execute(
        select(NhsuSettings).where(NhsuSettings.user_id == user_id)
    )
    settings = result.scalar_one_or_none()
    if not settings:
        settings = NhsuSettings(user_id=user_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


async def save_monthly_data(
    db: AsyncSession,
    user_id: int,
    data: NhsuMonthlySaveRequest,
) -> None:
    """Зберегти щомісячні дані (тільки пацієнти). Знімок налаштувань автоматично."""

    settings = await get_or_create_settings(db, user_id)
    coefficients = settings.get_coefficients_dict()

    # Видалити існуючі записи за цей місяць
    await db.execute(
        delete(NhsuRecord).where(
            NhsuRecord.user_id == user_id,
            NhsuRecord.year == data.year,
            NhsuRecord.month == data.month,
        )
    )

    # Зберегти нові записи зі знімком поточних налаштувань
    for rec in data.records:
        coeff = coefficients.get(rec.age_group, 0)
        record = NhsuRecord(
            user_id=user_id,
            doctor_id=rec.doctor_id,
            year=data.year,
            month=data.month,
            capitation_rate=float(settings.capitation_rate),
            age_group=rec.age_group,
            age_coefficient=coeff,
            ep_rate=float(settings.ep_rate),
            vz_rate=float(settings.vz_rate),
            patient_count=rec.patient_count,
            non_verified=rec.non_verified,
        )
        db.add(record)

    await db.commit()


async def get_monthly_report(
    db: AsyncSession,
    user_id: int,
    year: int,
    month: int,
) -> NhsuMonthlyReport | None:
    """Отримати повний звіт НСЗУ за місяць з підсумками у різних розрізах."""

    result = await db.execute(
        select(NhsuRecord)
        .where(
            NhsuRecord.user_id == user_id,
            NhsuRecord.year == year,
            NhsuRecord.month == month,
        )
        .order_by(NhsuRecord.doctor_id, NhsuRecord.age_group)
    )
    records = result.scalars().all()

    if not records:
        return None

    # Отримати лікарів
    doctor_ids = list({r.doctor_id for r in records})
    doc_result = await db.execute(
        select(Doctor).where(Doctor.id.in_(doctor_ids))
    )
    doctors_map = {d.id: d for d in doc_result.scalars().all()}

    # Зібрати інфо зі знімків
    capitation_rate = float(records[0].capitation_rate)
    ep_rate = float(records[0].ep_rate)
    vz_rate = float(records[0].vz_rate)

    # ── По лікарях ──────────────────────────────────────────────────
    doctors_data: dict[int, list[NhsuRecord]] = {}
    for r in records:
        doctors_data.setdefault(r.doctor_id, []).append(r)

    doctor_summaries = []
    grand_total_patients = 0
    grand_total_non_verified = 0.0
    grand_total_amount = 0.0
    grand_total_ep = 0.0
    grand_total_vz = 0.0

    # ── По вікових групах (сумарно) ─────────────────────────────────
    ag_totals: dict[str, dict] = {}

    for doc_id, doc_records in doctors_data.items():
        doctor = doctors_map.get(doc_id)
        if not doctor:
            continue

        rows = []
        doc_patients = 0
        doc_non_verified = 0.0
        doc_amount = 0.0
        doc_ep = 0.0
        doc_vz = 0.0

        for r in doc_records:
            amount = r.amount
            ep = r.ep_amount
            vz = r.vz_amount
            nv = float(r.non_verified)

            rows.append(
                DoctorAgeGroupRow(
                    age_group=r.age_group,
                    age_group_label=AGE_GROUP_LABELS.get(r.age_group, r.age_group),
                    age_coefficient=float(r.age_coefficient),
                    patient_count=r.patient_count,
                    non_verified=nv,
                    amount=amount,
                    ep_amount=ep,
                    vz_amount=vz,
                    ep_vz_amount=round(ep + vz, 2),
                )
            )
            doc_patients += r.patient_count
            doc_non_verified += nv
            doc_amount += amount
            doc_ep += ep
            doc_vz += vz

            # Накопичення по вікових групах
            if r.age_group not in ag_totals:
                ag_totals[r.age_group] = {
                    "age_coefficient": float(r.age_coefficient),
                    "patients": 0,
                    "non_verified": 0.0,
                    "amount": 0.0,
                    "ep": 0.0,
                    "vz": 0.0,
                }
            ag = ag_totals[r.age_group]
            ag["patients"] += r.patient_count
            ag["non_verified"] += nv
            ag["amount"] += amount
            ag["ep"] += ep
            ag["vz"] += vz

        doctor_summaries.append(
            DoctorSummary(
                doctor_id=doc_id,
                doctor_name=doctor.full_name,
                is_owner=doctor.is_owner,
                rows=rows,
                total_patients=doc_patients,
                total_non_verified=round(doc_non_verified, 1),
                total_amount=round(doc_amount, 2),
                total_ep=round(doc_ep, 2),
                total_vz=round(doc_vz, 2),
                total_ep_vz=round(doc_ep + doc_vz, 2),
            )
        )
        grand_total_patients += doc_patients
        grand_total_non_verified += doc_non_verified
        grand_total_amount += doc_amount
        grand_total_ep += doc_ep
        grand_total_vz += doc_vz

    # Побудувати підсумки по вікових групах
    age_group_summaries = []
    for ag_key in AGE_GROUP_KEYS:
        if ag_key in ag_totals:
            ag = ag_totals[ag_key]
            age_group_summaries.append(
                AgeGroupSummary(
                    age_group=ag_key,
                    age_group_label=AGE_GROUP_LABELS.get(ag_key, ag_key),
                    age_coefficient=ag["age_coefficient"],
                    total_patients=ag["patients"],
                    total_non_verified=round(ag["non_verified"], 1),
                    total_amount=round(ag["amount"], 2),
                    total_ep=round(ag["ep"], 2),
                    total_vz=round(ag["vz"], 2),
                    total_ep_vz=round(ag["ep"] + ag["vz"], 2),
                )
            )

    return NhsuMonthlyReport(
        year=year,
        month=month,
        capitation_rate=capitation_rate,
        ep_rate=ep_rate,
        vz_rate=vz_rate,
        doctors=doctor_summaries,
        age_group_totals=age_group_summaries,
        grand_total_patients=grand_total_patients,
        grand_total_non_verified=round(grand_total_non_verified, 1),
        grand_total_amount=round(grand_total_amount, 2),
        grand_total_ep=round(grand_total_ep, 2),
        grand_total_vz=round(grand_total_vz, 2),
        grand_total_ep_vz=round(grand_total_ep + grand_total_vz, 2),
    )
