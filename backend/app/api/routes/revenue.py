"""Revenue analytics endpoint — aggregates NHSU + Paid Services gross income."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.doctor import Doctor
from app.models.monthly_service import MonthlyPaidServiceEntry, MonthlyPaidServicesReport
from app.models.nhsu import NhsuRecord
from app.models.service import Service
from app.models.user import User
from app.schemas.revenue import (
    AiRecommendation,
    DoctorRevenue,
    IntegrityWarning,
    MonthlyRevenueTrend,
    RevenueAnalytics,
    ServiceRevenue,
)

router = APIRouter()

MONTH_NAMES = [
    "", "Січень", "Лютий", "Березень", "Квітень",
    "Травень", "Червень", "Липень", "Серпень",
    "Вересень", "Жовтень", "Листопад", "Грудень",
]


async def _nhsu_by_doctor(db: AsyncSession, user_id: int, year: int, month: int, doctor_id: int | None) -> dict[int, float]:
    """Returns {doctor_id: nhsu_gross_amount} for the given month."""
    q = select(NhsuRecord).where(
        NhsuRecord.user_id == user_id,
        NhsuRecord.year == year,
        NhsuRecord.month == month,
    )
    if doctor_id:
        q = q.where(NhsuRecord.doctor_id == doctor_id)
    records = (await db.execute(q)).scalars().all()
    totals: dict[int, float] = defaultdict(float)
    for r in records:
        totals[r.doctor_id] += float(r.amount)
    return dict(totals)


async def _paid_by_doctor(
    db: AsyncSession,
    user_id: int,
    year: int,
    month: int,
    doctor_id: int | None,
    services_map: dict[int, Service],
) -> tuple[dict[int, float], dict[int, dict]]:
    """Returns ({doctor_id: paid_gross}, {service_id: {qty, revenue}})."""
    q = select(MonthlyPaidServicesReport).where(
        MonthlyPaidServicesReport.user_id == user_id,
        MonthlyPaidServicesReport.year == year,
        MonthlyPaidServicesReport.month == month,
    )
    if doctor_id:
        q = q.where(MonthlyPaidServicesReport.doctor_id == doctor_id)
    reports = (await db.execute(q)).scalars().all()
    if not reports:
        return {}, {}

    report_ids = [r.id for r in reports]
    doc_of_report = {r.id: r.doctor_id for r in reports}

    entries_res = await db.execute(
        select(MonthlyPaidServiceEntry).where(
            MonthlyPaidServiceEntry.report_id.in_(report_ids)
        )
    )
    entries = entries_res.scalars().all()

    doc_paid: dict[int, float] = defaultdict(float)
    svc_agg: dict[int, dict] = defaultdict(lambda: {"qty": 0, "revenue": 0.0})

    for e in entries:
        svc = services_map.get(e.service_id)
        if not svc:
            continue
        rev = float(svc.price) * e.quantity
        did = doc_of_report[e.report_id]
        doc_paid[did] += rev
        svc_agg[e.service_id]["qty"] += e.quantity
        svc_agg[e.service_id]["revenue"] += rev

    return dict(doc_paid), dict(svc_agg)


def _generate_recommendations(
    total: float,
    nhsu: float,
    paid: float,
    prev_total: float,
    by_doctor: list[DoctorRevenue],
) -> list[AiRecommendation]:
    recs: list[AiRecommendation] = []

    # 1. NHSU dependency risk
    if total > 0:
        nhsu_share = nhsu / total
        if nhsu_share > 0.85:
            recs.append(AiRecommendation(
                type="risk",
                title="Критична залежність від НСЗУ",
                description="Понад 85% доходу надходить від НСЗУ. Ризик фінансової нестабільності при зміні умов договору.",
                data_basis=f"НСЗУ: {nhsu_share*100:.1f}% загального доходу ({nhsu:,.0f} грн із {total:,.0f} грн)",
            ))
        elif nhsu_share > 0.70:
            recs.append(AiRecommendation(
                type="warning",
                title="Висока частка НСЗУ",
                description="Більше 70% доходу — НСЗУ. Рекомендується розширити платні послуги для диверсифікації.",
                data_basis=f"НСЗУ: {nhsu_share*100:.1f}% доходу",
            ))

    # 2. MoM significant drop
    if prev_total > 0 and total > 0:
        mom = (total - prev_total) / prev_total * 100
        if mom < -20:
            recs.append(AiRecommendation(
                type="warning",
                title="Суттєве падіння доходу",
                description=f"Дохід знизився на {abs(mom):.1f}% порівняно з попереднім місяцем. Перевірте причини.",
                data_basis=f"Попередній місяць: {prev_total:,.0f} грн, поточний: {total:,.0f} грн",
            ))
        elif mom > 20:
            recs.append(AiRecommendation(
                type="insight",
                title="Значне зростання доходу",
                description=f"Дохід зріс на {mom:.1f}%. Визначте успішні фактори та масштабуйте їх.",
                data_basis=f"Попередній місяць: {prev_total:,.0f} грн, поточний: {total:,.0f} грн",
            ))

    # 3. Doctors with no paid services
    no_paid = [d for d in by_doctor if d.paid_services == 0 and d.nhsu > 0]
    if no_paid:
        names = ", ".join(d.doctor_name.split()[0] for d in no_paid[:3])
        recs.append(AiRecommendation(
            type="opportunity",
            title="Лікарі без платних послуг",
            description=f"Лікарі {names} мають нульовий дохід від платних послуг. Розгляньте підключення платного прийому.",
            data_basis=f"{len(no_paid)} лікар(ів) без платних послуг за місяць",
        ))

    # 4. Paid services growth opportunity
    if total > 0 and paid / total < 0.30 and paid > 0:
        recs.append(AiRecommendation(
            type="opportunity",
            title="Потенціал росту платних послуг",
            description="Частка платних послуг нижче 30%. Розширення переліку послуг або маркетингові заходи можуть суттєво збільшити дохід.",
            data_basis=f"Платні послуги: {paid/total*100:.1f}% ({paid:,.0f} грн)",
        ))

    # 5. Zero total revenue
    if total == 0:
        recs.append(AiRecommendation(
            type="warning",
            title="Відсутні дані про дохід",
            description="За обраний період не знайдено даних про доходи. Переконайтесь, що звіти НСЗУ та платні послуги введені.",
            data_basis="Загальний дохід = 0",
        ))

    return recs


def _check_integrity(
    nhsu_by_doc: dict[int, float],
    paid_by_doc: dict[int, float],
    doctor_ids_registered: list[int],
) -> list[IntegrityWarning]:
    warnings: list[IntegrityWarning] = []

    all_doc_ids = set(doctor_ids_registered)
    docs_with_nhsu = set(nhsu_by_doc.keys())
    docs_with_paid = set(paid_by_doc.keys())

    docs_no_data = all_doc_ids - docs_with_nhsu - docs_with_paid
    if docs_no_data:
        warnings.append(IntegrityWarning(
            type="missing_data",
            message=f"Немає даних за місяць для {len(docs_no_data)} лікар(ів)",
        ))

    if not nhsu_by_doc:
        warnings.append(IntegrityWarning(
            type="missing_data",
            message="Дані НСЗУ за місяць відсутні",
        ))

    if not paid_by_doc:
        warnings.append(IntegrityWarning(
            type="missing_data",
            message="Дані платних послуг за місяць відсутні",
        ))

    return warnings


@router.get("/analytics", response_model=RevenueAnalytics)
async def revenue_analytics(
    year: int = Query(default=datetime.now(timezone.utc).year),
    month: int = Query(default=datetime.now(timezone.utc).month, ge=1, le=12),
    doctor_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Load doctors
    doc_res = await db.execute(
        select(Doctor).where(Doctor.user_id == user.id, Doctor.is_active == True)
    )
    doctors_list = doc_res.scalars().all()
    doctors_map = {d.id: d.full_name for d in doctors_list}

    # Load user's services (for price lookup)
    svc_res = await db.execute(select(Service).where(Service.user_id == user.id))
    services_map: dict[int, Service] = {s.id: s for s in svc_res.scalars().all()}

    # Current month data
    nhsu_cur = await _nhsu_by_doctor(db, user.id, year, month, doctor_id)
    paid_cur, svc_agg = await _paid_by_doctor(db, user.id, year, month, doctor_id, services_map)

    # Previous month
    prev_m, prev_y = (month - 1, year) if month > 1 else (12, year - 1)
    nhsu_prev = await _nhsu_by_doctor(db, user.id, prev_y, prev_m, doctor_id)
    paid_prev, _ = await _paid_by_doctor(db, user.id, prev_y, prev_m, doctor_id, services_map)

    # Aggregate
    nhsu_total = round(sum(nhsu_cur.values()), 2)
    paid_total = round(sum(paid_cur.values()), 2)
    total = round(nhsu_total + paid_total, 2)

    prev_nhsu = round(sum(nhsu_prev.values()), 2)
    prev_paid = round(sum(paid_prev.values()), 2)
    prev_total = round(prev_nhsu + prev_paid, 2)

    nhsu_pct = round(nhsu_total / total * 100, 1) if total else 0.0
    paid_pct = round(paid_total / total * 100, 1) if total else 0.0
    mom_pct = round((total - prev_total) / prev_total * 100, 1) if prev_total else 0.0

    all_doc_ids = (
        set(nhsu_cur) | set(paid_cur)
        if not doctor_id
        else ({doctor_id} if doctor_id in nhsu_cur or doctor_id in paid_cur else set())
    )
    by_doctor = sorted(
        [
            DoctorRevenue(
                doctor_id=did,
                doctor_name=doctors_map.get(did, "—"),
                nhsu=round(nhsu_cur.get(did, 0), 2),
                paid_services=round(paid_cur.get(did, 0), 2),
                total=round(nhsu_cur.get(did, 0) + paid_cur.get(did, 0), 2),
            )
            for did in all_doc_ids
        ],
        key=lambda d: d.total,
        reverse=True,
    )

    avg_per_doctor = round(total / len(by_doctor), 2) if by_doctor else 0.0

    # Top services
    top_services = sorted(
        [
            ServiceRevenue(
                service_id=sid,
                code=services_map[sid].code if sid in services_map else "—",
                name=services_map[sid].name if sid in services_map else "—",
                quantity=data["qty"],
                revenue=round(data["revenue"], 2),
            )
            for sid, data in svc_agg.items()
        ],
        key=lambda s: s.revenue,
        reverse=True,
    )[:10]

    # Monthly trend (last 12 months)
    trend: list[MonthlyRevenueTrend] = []
    for i in range(11, -1, -1):
        d = datetime(year if month > i else year - 1, ((month - i - 1) % 12) + 1, 1)
        ty, tm = d.year, d.month
        t_nhsu = await _nhsu_by_doctor(db, user.id, ty, tm, doctor_id)
        t_paid, _ = await _paid_by_doctor(db, user.id, ty, tm, doctor_id, services_map)
        tn = round(sum(t_nhsu.values()), 2)
        tp = round(sum(t_paid.values()), 2)
        trend.append(MonthlyRevenueTrend(
            year=ty, month=tm,
            month_name=f"{MONTH_NAMES[tm][:3]} {ty}",
            nhsu=tn, paid_services=tp, total=round(tn + tp, 2),
        ))

    # AI recommendations
    recs = _generate_recommendations(total, nhsu_total, paid_total, prev_total, by_doctor)

    # Integrity warnings
    registered_doc_ids = [d.id for d in doctors_list]
    int_warnings = _check_integrity(nhsu_cur, paid_cur, registered_doc_ids)

    return RevenueAnalytics(
        year=year,
        month=month,
        period_label=f"{MONTH_NAMES[month]} {year}",
        total=total,
        nhsu=nhsu_total,
        paid_services=paid_total,
        nhsu_pct=nhsu_pct,
        paid_pct=paid_pct,
        avg_per_doctor=avg_per_doctor,
        prev_total=prev_total,
        prev_nhsu=prev_nhsu,
        prev_paid=prev_paid,
        mom_pct=mom_pct,
        by_doctor=by_doctor,
        top_services=top_services,
        monthly_trend=trend,
        recommendations=recs,
        warnings=int_warnings,
    )
