from __future__ import annotations

import io
from decimal import Decimal

import openpyxl
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.nhsu import NhsuSettings
from app.models.service import Service
from app.models.user import User
from app.schemas.service import (
    BulkDeleteRequest,
    BulkExportRequest,
    BulkPriceChangeRequest,
    MaterialItem,
    ServiceCreate,
    ServiceResponse,
    ServiceUpdate,
)

router = APIRouter()

# ── Фінансові розрахунки ─────────────────────────────────────────────


async def _get_tax_rates(db: AsyncSession, user_id: int) -> tuple[float, float]:
    """Повертає (ep_rate, vz_rate) з NhsuSettings або дефолти."""
    result = await db.execute(
        select(NhsuSettings).where(NhsuSettings.user_id == user_id)
    )
    settings = result.scalar_one_or_none()
    if settings:
        return float(settings.ep_rate), float(settings.vz_rate)
    return 5.0, 1.0  # defaults: ЄП 5%, ВЗ 1%


def _calc(service: Service, ep_rate: float, vz_rate: float) -> dict:
    """Розраховує всі фінансові поля послуги."""
    price = float(service.price)
    materials = service.materials or []

    total_materials_cost = round(
        sum(float(m.get("cost", 0)) for m in materials), 2
    )
    ep_amount = round(price * ep_rate / 100, 2)
    vz_amount = round(price * vz_rate / 100, 2)
    total_costs = round(total_materials_cost + ep_amount + vz_amount, 2)
    net_income = round(price - total_costs, 2)
    doctor_income = round(net_income / 2, 2)
    org_income = round(net_income / 2, 2)

    return {
        "total_materials_cost": total_materials_cost,
        "ep_amount": ep_amount,
        "vz_amount": vz_amount,
        "total_costs": total_costs,
        "net_income": net_income,
        "doctor_income": doctor_income,
        "org_income": org_income,
    }


def _to_response(service: Service, ep_rate: float, vz_rate: float) -> ServiceResponse:
    calc = _calc(service, ep_rate, vz_rate)
    materials = [
        MaterialItem(**m) for m in (service.materials or [])
    ]
    return ServiceResponse(
        id=service.id,
        code=service.code,
        name=service.name,
        price=float(service.price),
        materials=materials,
        **calc,
    )


# ── Масові операції (до /{service_id}!) ───────────────────────────────


@router.post("/bulk-delete", status_code=204)
async def bulk_delete_services(
    body: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Масове видалення послуг."""
    if not body.ids:
        return
    result = await db.execute(
        select(Service).where(
            Service.id.in_(body.ids), Service.user_id == user.id
        )
    )
    services = result.scalars().all()
    for svc in services:
        await db.delete(svc)
    await db.commit()


@router.post("/bulk-price-change", response_model=list[ServiceResponse])
async def bulk_price_change(
    body: BulkPriceChangeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Масова зміна ціни: нова = поточна × (1 + % / 100)."""
    if not body.ids:
        return []
    ep_rate, vz_rate = await _get_tax_rates(db, user.id)
    result = await db.execute(
        select(Service).where(
            Service.id.in_(body.ids), Service.user_id == user.id
        )
    )
    services = result.scalars().all()
    for svc in services:
        new_price = float(svc.price) * (1 + body.percent / 100)
        svc.price = round(new_price, 2)
    await db.commit()
    for svc in services:
        await db.refresh(svc)
    return [_to_response(s, ep_rate, vz_rate) for s in services]


@router.post("/export")
async def export_services(
    body: BulkExportRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Експорт вибраних послуг у файл Excel (.xlsx)."""
    ep_rate, vz_rate = await _get_tax_rates(db, user.id)

    query = select(Service).where(Service.user_id == user.id)
    if body.ids:
        query = query.where(Service.id.in_(body.ids))
    result = await db.execute(query.order_by(Service.code))
    services = result.scalars().all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Послуги"

    headers = [
        "Код", "Назва", "Ціна (грн)", "Витрати (грн)",
        "Єдиний податок (грн)", "Військовий збір (грн)",
        "Сумарні витрати (грн)", "Дохід лікаря (грн)", "Дохід організації (грн)",
    ]
    ws.append(headers)

    for svc in services:
        c = _calc(svc, ep_rate, vz_rate)
        ws.append([
            svc.code,
            svc.name,
            float(svc.price),
            c["total_materials_cost"],
            c["ep_amount"],
            c["vz_amount"],
            c["total_costs"],
            c["doctor_income"],
            c["org_income"],
        ])

    # Автоширина стовпців
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = max(max_len + 2, 12)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=services.xlsx"},
    )


# ── CRUD ──────────────────────────────────────────────────────────────


@router.get("/", response_model=list[ServiceResponse])
async def list_services(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ep_rate, vz_rate = await _get_tax_rates(db, user.id)
    result = await db.execute(
        select(Service)
        .where(Service.user_id == user.id)
        .order_by(Service.code)
    )
    services = result.scalars().all()
    return [_to_response(s, ep_rate, vz_rate) for s in services]


@router.post("/", response_model=ServiceResponse, status_code=201)
async def create_service(
    service_in: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Перевірка унікальності коду в межах користувача
    existing = await db.execute(
        select(Service).where(
            Service.user_id == user.id, Service.code == service_in.code
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Послуга з кодом '{service_in.code}' вже існує",
        )

    service = Service(
        user_id=user.id,
        code=service_in.code,
        name=service_in.name,
        price=service_in.price,
        materials=[m.model_dump() for m in service_in.materials],
    )
    db.add(service)
    await db.commit()
    await db.refresh(service)

    ep_rate, vz_rate = await _get_tax_rates(db, user.id)
    return _to_response(service, ep_rate, vz_rate)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    service_in: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Service).where(
            Service.id == service_id, Service.user_id == user.id
        )
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Послугу не знайдено")

    data = service_in.model_dump(exclude_unset=True)

    # Перевірка унікальності нового коду
    if "code" in data and data["code"] != service.code:
        existing = await db.execute(
            select(Service).where(
                Service.user_id == user.id,
                Service.code == data["code"],
                Service.id != service_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"Послуга з кодом '{data['code']}' вже існує",
            )

    if "materials" in data:
        # Конвертуємо MaterialItem → dict
        data["materials"] = [
            m.model_dump() if isinstance(m, MaterialItem) else m
            for m in data["materials"]
        ]

    for field, value in data.items():
        setattr(service, field, value)

    await db.commit()
    await db.refresh(service)

    ep_rate, vz_rate = await _get_tax_rates(db, user.id)
    return _to_response(service, ep_rate, vz_rate)


@router.delete("/{service_id}", status_code=204)
async def delete_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Service).where(
            Service.id == service_id, Service.user_id == user.id
        )
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Послугу не знайдено")
    await db.delete(service)
    await db.commit()
