from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.doctor import Doctor
from app.models.nhsu import NhsuRecord, NhsuMonthlyExtra, AGE_GROUPS
from app.schemas.nhsu import (
    DoctorAgeGroupRow,
    DoctorSummary,
    NhsuMonthlyReport,
    NhsuMonthlySaveRequest,
)

AGE_GROUP_LABELS = {g["key"]: g["label"] for g in AGE_GROUPS}


async def save_monthly_data(
    db: AsyncSession,
    user_id: int,
    data: NhsuMonthlySaveRequest,
) -> None:
    """Зберегти/оновити всі записи НСЗУ за місяць (повна перезапис)."""

    # Видалити існуючі записи за цей місяць
    await db.execute(
        delete(NhsuRecord).where(
            NhsuRecord.user_id == user_id,
            NhsuRecord.year == data.year,
            NhsuRecord.month == data.month,
        )
    )

    # Зберегти нові записи
    for rec in data.records:
        record = NhsuRecord(
            user_id=user_id,
            doctor_id=rec.doctor_id,
            year=data.year,
            month=data.month,
            capitation_rate=data.capitation_rate,
            age_group=rec.age_group,
            age_coefficient=rec.age_coefficient,
            patient_count=rec.patient_count,
            non_verified=rec.non_verified,
        )
        db.add(record)

    # Зберегти/оновити додаткові дані
    if data.extra:
        result = await db.execute(
            select(NhsuMonthlyExtra).where(
                NhsuMonthlyExtra.user_id == user_id,
                NhsuMonthlyExtra.year == data.year,
                NhsuMonthlyExtra.month == data.month,
            )
        )
        extra = result.scalar_one_or_none()
        if extra:
            for field, value in data.extra.model_dump().items():
                setattr(extra, field, value)
        else:
            extra = NhsuMonthlyExtra(
                user_id=user_id,
                year=data.year,
                month=data.month,
                **data.extra.model_dump(),
            )
            db.add(extra)

    await db.commit()


async def get_monthly_report(
    db: AsyncSession,
    user_id: int,
    year: int,
    month: int,
) -> NhsuMonthlyReport | None:
    """Отримати повний звіт НСЗУ за місяць."""

    # Отримати всі записи за місяць
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

    # Отримати додаткові дані
    extra_result = await db.execute(
        select(NhsuMonthlyExtra).where(
            NhsuMonthlyExtra.user_id == user_id,
            NhsuMonthlyExtra.year == year,
            NhsuMonthlyExtra.month == month,
        )
    )
    extra = extra_result.scalar_one_or_none()

    # Згрупувати по лікарях
    capitation_rate = float(records[0].capitation_rate)
    doctors_data: dict[int, list[NhsuRecord]] = {}
    for r in records:
        doctors_data.setdefault(r.doctor_id, []).append(r)

    doctor_summaries = []
    grand_total_patients = 0
    grand_total_non_verified = 0.0
    grand_total_amount = 0.0
    grand_total_ep_vz = 0.0

    for doc_id, doc_records in doctors_data.items():
        doctor = doctors_map.get(doc_id)
        if not doctor:
            continue

        rows = []
        total_patients = 0
        total_amount = 0.0
        total_ep_vz = 0.0

        for r in doc_records:
            amount = r.amount
            ep_vz = r.ep_vz
            rows.append(
                DoctorAgeGroupRow(
                    age_group=r.age_group,
                    age_group_label=AGE_GROUP_LABELS.get(r.age_group, r.age_group),
                    age_coefficient=float(r.age_coefficient),
                    patient_count=r.patient_count,
                    non_verified=float(r.non_verified),
                    amount=amount,
                    ep_vz=ep_vz,
                )
            )
            total_patients += r.patient_count
            total_amount += amount
            total_ep_vz += ep_vz
            grand_total_non_verified += float(r.non_verified)

        doctor_summaries.append(
            DoctorSummary(
                doctor_id=doc_id,
                doctor_name=doctor.full_name,
                is_owner=doctor.is_owner,
                rows=rows,
                total_patients=total_patients,
                total_amount=round(total_amount, 2),
                total_ep_vz=round(total_ep_vz, 2),
            )
        )
        grand_total_patients += total_patients
        grand_total_amount += total_amount
        grand_total_ep_vz += total_ep_vz

    # Фінансові підсумки
    esv_amount = float(extra.esv_amount) if extra else 1902.34
    paid_services = float(extra.paid_services_amount) if extra else 0.0
    owner_decl = float(extra.owner_declaration_income) if extra else 0.0
    owner_other = float(extra.owner_other_doctor_income) if extra else 0.0
    total_income = owner_decl + owner_other + paid_services
    withdrawal = owner_decl + owner_other

    return NhsuMonthlyReport(
        year=year,
        month=month,
        capitation_rate=capitation_rate,
        doctors=doctor_summaries,
        grand_total_patients=grand_total_patients,
        grand_total_non_verified=round(grand_total_non_verified, 1),
        grand_total_amount=round(grand_total_amount, 2),
        grand_total_ep_vz=round(grand_total_ep_vz, 2),
        esv_amount=esv_amount,
        paid_services_amount=paid_services,
        owner_declaration_income=owner_decl,
        owner_other_doctor_income=owner_other,
        total_income=round(total_income, 2),
        withdrawal_amount=round(withdrawal, 2),
    )
