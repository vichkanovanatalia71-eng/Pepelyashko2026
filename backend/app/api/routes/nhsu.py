import asyncio
import base64
import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.models.doctor import Doctor
from app.models.nhsu import AGE_GROUPS
from app.models.user import User
from app.models.user_api_keys import UserApiKeys
from app.schemas.nhsu import (
    DoctorCreate,
    DoctorResponse,
    DoctorUpdate,
    NhsuMonthlyReport,
    NhsuMonthlySaveRequest,
    NhsuSettingsInput,
    NhsuSettingsResponse,
)
from app.services.nhsu import get_monthly_report, get_or_create_settings, save_monthly_data

router = APIRouter()

_AI_PROMPT = """Ти аналізуєш скріншот або фото звіту з порталу НСЗУ (Національна служба здоров'я України) або документу з даними про декларації лікаря.

Знайди та вилучи такі дані:
1. Ім'я лікаря (якщо видно)
2. Кількість активних декларацій (пацієнтів) по вікових групах:
   - Вік 0-5 років
   - Вік 6-17 років
   - Вік 18-39 років
   - Вік 40-64 років
   - Вік 65+ років (понад 65)
   - Всього декларацій

Поверни ТІЛЬКИ JSON об'єкт без пояснень, markdown або додаткового тексту:
{
  "doctor_name": "ПІБ лікаря або null якщо не видно",
  "age_0_5": число,
  "age_6_17": число,
  "age_18_39": число,
  "age_40_64": число,
  "age_65_plus": число,
  "total": число,
  "confidence": "high або medium або low",
  "notes": "примітки щодо якості даних"
}

Якщо значення невизначено — використай 0.
"""


# ── Налаштування НСЗУ ───────────────────────────────────────────────


@router.get("/settings", response_model=NhsuSettingsResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    s = await get_or_create_settings(db, user.id)
    return s


@router.put("/settings", response_model=NhsuSettingsResponse)
async def update_settings(
    data: NhsuSettingsInput,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    s = await get_or_create_settings(db, user.id)
    for field, value in data.model_dump().items():
        setattr(s, field, value)
    await db.commit()
    await db.refresh(s)
    return s


# ── Лікарі ──────────────────────────────────────────────────────────


@router.get("/doctors", response_model=list[DoctorResponse])
async def list_doctors(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Doctor)
        .where(Doctor.user_id == user.id, Doctor.is_active.is_(True))
        .order_by(Doctor.id)
    )
    return result.scalars().all()


@router.post("/doctors", response_model=DoctorResponse, status_code=201)
async def create_doctor(
    doctor_in: DoctorCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doctor = Doctor(user_id=user.id, **doctor_in.model_dump())
    db.add(doctor)
    await db.commit()
    await db.refresh(doctor)
    return doctor


@router.put("/doctors/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(
    doctor_id: int,
    doctor_in: DoctorUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.user_id == user.id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Лікаря не знайдено")
    for field, value in doctor_in.model_dump(exclude_unset=True).items():
        setattr(doctor, field, value)
    await db.commit()
    await db.refresh(doctor)
    return doctor


@router.delete("/doctors/{doctor_id}", status_code=204)
async def delete_doctor(
    doctor_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.user_id == user.id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Лікаря не знайдено")
    doctor.is_active = False
    await db.commit()


# ── Вікові групи (статичний довідник) ────────────────────────────────


@router.get("/age-groups")
async def list_age_groups():
    return AGE_GROUPS


# ── Місячні дані НСЗУ ───────────────────────────────────────────────


@router.post("/monthly", status_code=201)
async def save_monthly(
    data: NhsuMonthlySaveRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not 1 <= data.month <= 12:
        raise HTTPException(status_code=400, detail="Місяць має бути від 1 до 12")
    await save_monthly_data(db, user.id, data)
    return {"status": "ok"}


@router.get("/monthly", response_model=NhsuMonthlyReport)
async def get_monthly(
    year: int = Query(...),
    month: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    report = await get_monthly_report(db, user.id, year, month)
    if not report:
        raise HTTPException(
            status_code=404,
            detail="Дані за цей місяць не знайдено",
        )
    return report


# ── Тренд / прогноз (останні N місяців) ─────────────────────────────

_MONTH_LABELS = ["Січ","Лют","Бер","Квіт","Тра","Чер","Лип","Сер","Вер","Жов","Лис","Гру"]


@router.get("/monthly-summary")
async def get_monthly_summary(
    months: int = Query(6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Останні N місяців — спрощені підсумки для тренд-графіку та прогнозування."""
    now = datetime.now(timezone.utc)
    results = []

    for i in range(months - 1, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1

        report = await get_monthly_report(db, user.id, y, m)
        results.append({
            "year": y,
            "month": m,
            "label": f"{_MONTH_LABELS[m - 1]} {y}",
            "has_data": report is not None,
            "total_patients": report.grand_total_patients if report else 0,
            "total_amount": float(report.grand_total_amount) if report else 0.0,
            "net_amount": float(report.grand_total_amount - report.grand_total_ep_vz) if report else 0.0,
            "total_ep_vz": float(report.grand_total_ep_vz) if report else 0.0,
        })

    return results


# ── AI аналіз зображень ──────────────────────────────────────────────


def _parse_ai_json(text: str) -> dict:
    """Вилучає JSON з відповіді моделі."""
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
    except Exception:
        pass
    return {
        "doctor_name": None,
        "age_0_5": 0,
        "age_6_17": 0,
        "age_18_39": 0,
        "age_40_64": 0,
        "age_65_plus": 0,
        "total": 0,
        "confidence": "low",
        "notes": "Не вдалося розпізнати дані з зображення",
    }


async def _analyze_with_anthropic(api_key: str, image_bytes: bytes, media_type: str) -> dict:
    """Аналізує зображення через Anthropic Claude."""
    import anthropic as anthropic_sdk

    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    client = anthropic_sdk.Anthropic(api_key=api_key)

    def _sync_call():
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64,
                            },
                        },
                        {"type": "text", "text": _AI_PROMPT},
                    ],
                }
            ],
        )
        return msg.content[0].text

    text = await asyncio.to_thread(_sync_call)
    return _parse_ai_json(text)


async def _analyze_with_openai(
    api_key: str,
    image_bytes: bytes,
    media_type: str,
    base_url: str | None = None,
    model: str = "gpt-4o-mini",
) -> dict:
    """Аналізує зображення через OpenAI-сумісне API (OpenAI або xAI/Grok)."""
    from openai import OpenAI

    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    client_kwargs: dict = {"api_key": api_key}
    if base_url:
        client_kwargs["base_url"] = base_url
    client = OpenAI(**client_kwargs)

    def _sync_call():
        resp = client.chat.completions.create(
            model=model,
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{media_type};base64,{b64}"},
                        },
                        {"type": "text", "text": _AI_PROMPT},
                    ],
                }
            ],
        )
        return resp.choices[0].message.content

    text = await asyncio.to_thread(_sync_call)
    return _parse_ai_json(text)


def _pick_provider(user_keys) -> tuple[str, str] | tuple[None, None]:
    """
    Повертає (provider, api_key) за пріоритетом: Anthropic → OpenAI → xAI.
    Fallback на ANTHROPIC_API_KEY з env. Якщо нічого немає — (None, None).
    """
    if user_keys:
        if user_keys.anthropic_key:
            return "anthropic", user_keys.anthropic_key
        if user_keys.openai_key:
            return "openai", user_keys.openai_key
        if user_keys.xai_key:
            return "xai", user_keys.xai_key
    if settings.anthropic_api_key:
        return "anthropic", settings.anthropic_api_key
    return None, None


@router.post("/analyze-image")
async def analyze_image(
    images: List[UploadFile] = File(...),
    doctor_ids: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Аналізує зображення через доступний AI-провайдер (Claude, OpenAI або xAI).

    - images: один або кілька файлів зображень
    - doctor_ids: необов'язковий рядок з id лікарів через кому
    """
    user_keys_result = await db.execute(
        select(UserApiKeys).where(UserApiKeys.user_id == user.id)
    )
    user_keys = user_keys_result.scalar_one_or_none()

    provider, api_key = _pick_provider(user_keys)

    if not provider:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI сервіс не налаштований. "
                "Додайте хоча б один API ключ у Налаштуваннях: "
                "Anthropic (Claude), OpenAI (ChatGPT) або xAI (Grok)."
            ),
        )

    # Розбираємо doctor_ids
    parsed_ids: List[Optional[int]] = []
    if doctor_ids:
        for part in doctor_ids.split(","):
            try:
                parsed_ids.append(int(part.strip()))
            except ValueError:
                parsed_ids.append(None)

    results = []
    for i, image_file in enumerate(images):
        raw = await image_file.read()
        media_type = image_file.content_type or "image/png"

        if len(raw) > 10 * 1024 * 1024:
            results.append({
                "doctor_id": parsed_ids[i] if i < len(parsed_ids) else None,
                "filename": image_file.filename,
                "error": "Файл перевищує ліміт 10 MB",
            })
            continue

        if provider == "anthropic":
            data = await _analyze_with_anthropic(api_key, raw, media_type)
        elif provider == "openai":
            data = await _analyze_with_openai(api_key, raw, media_type, model="gpt-4o-mini")
        else:  # xai
            data = await _analyze_with_openai(
                api_key, raw, media_type,
                base_url="https://api.x.ai/v1",
                model="grok-2-vision-1212",
            )

        results.append({
            "doctor_id": parsed_ids[i] if i < len(parsed_ids) else None,
            "filename": image_file.filename,
            "provider": provider,
            **data,
        })

    return {"results": results, "provider": provider}
