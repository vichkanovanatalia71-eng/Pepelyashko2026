from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.services.ai_provider import analyze_image as ai_analyze_image, get_provider, parse_ai_json
from app.models.doctor import Doctor
from app.models.nhsu import AGE_GROUPS
from app.models.user import User
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

# ── Промти для AI-провайдерів ────────────────────────────────────────

_ANTHROPIC_SYSTEM = """\
Ти — спеціалізований OCR-асистент для обробки медичних звітів НСЗУ (Національна служба здоров'я України).
Твоя єдина задача — точно розпізнати числові дані з зображення та повернути їх у форматі JSON.
Відповідай ТІЛЬКИ валідним JSON без markdown, коментарів чи пояснень."""

_ANTHROPIC_PROMPT = """\
<context>
Це скріншот або фото зі звіту порталу НСЗУ (esoz.nhsu.gov.ua) або іншого документу з даними про декларації лікаря первинної медичної допомоги.

Типові формати даних на скріншотах:
- Таблиця з колонками: вікова група | кількість декларацій
- Кругова діаграма або стовпчикова діаграма з підписами
- Загальна інформація про лікаря з кількістю пацієнтів
- Текстовий звіт або витяг з порталу
</context>

<task>
Знайди та вилучи з зображення такі дані:

1. **ПІБ лікаря** — прізвище, ім'я, по батькові (якщо видно на зображенні)
2. **Кількість активних декларацій (пацієнтів) за віковими групами:**
   - від 0 до 5 років
   - від 6 до 17 років
   - від 18 до 39 років
   - від 40 до 64 років
   - понад 65 років
3. **Загальна кількість декларацій** (усіх вікових груп разом)
</task>

<rules>
- Числа мають бути цілими (integer), без десяткових крапок
- Якщо "total" не вказано явно — порахуй як суму всіх вікових груп
- Якщо сума вікових груп не збігається з вказаним total — використай ЯВНО вказане на скріншоті значення total
- Якщо певну вікову групу неможливо визначити — постав 0
- Якщо зображення нечітке або дані частково видимі — все одно спробуй розпізнати, що можливо
- confidence: "high" = всі числа чітко видимі; "medium" = деякі числа можуть бути неточними; "low" = більшість даних нерозпізнана
</rules>

<output_format>
Поверни ТІЛЬКИ JSON:
{"doctor_name": "ПІБ або null", "age_0_5": 0, "age_6_17": 0, "age_18_39": 0, "age_40_64": 0, "age_65_plus": 0, "total": 0, "confidence": "high", "notes": ""}
</output_format>"""

_OPENAI_SYSTEM = (
    "Ти — спеціалізований OCR-асистент для обробки медичних звітів НСЗУ "
    "(Національна служба здоров'я України). "
    "Твоя єдина задача — точно розпізнати числові дані з зображення та повернути їх у форматі JSON. "
    "Завжди відповідай ТІЛЬКИ валідним JSON об'єктом. Без markdown, без ```json, без пояснень."
)

_OPENAI_PROMPT = """\
Проаналізуй це зображення зі звіту НСЗУ (портал esoz.nhsu.gov.ua) або іншого документу з даними про декларації лікаря.

Що шукати:
- Таблиця або діаграма з кількістю декларацій по вікових групах
- ПІБ лікаря (прізвище, ім'я, по батькові)
- Загальна кількість декларацій

Вікові групи:
• 0-5 років → age_0_5
• 6-17 років → age_6_17
• 18-39 років → age_18_39
• 40-64 років → age_40_64
• 65+ років → age_65_plus

Правила:
- Числа — цілі (integer)
- Якщо total не вказано — порахуй суму вікових груп
- Якщо вікова група не видима — постав 0
- confidence: "high" (все чітко), "medium" (є неточності), "low" (мало даних)

Поверни JSON:
{"doctor_name": "ПІБ або null", "age_0_5": 0, "age_6_17": 0, "age_18_39": 0, "age_40_64": 0, "age_65_plus": 0, "total": 0, "confidence": "high", "notes": ""}"""

_XAI_SYSTEM = _OPENAI_SYSTEM

_XAI_PROMPT = """\
Проаналізуй зображення зі звіту НСЗУ (Національна служба здоров'я України) — портал esoz.nhsu.gov.ua.

Завдання: знайди кількість активних декларацій лікаря по вікових групах.

Що шукати на зображенні:
- Таблиця або графік з кількістю пацієнтів (декларацій) за віком
- ПІБ лікаря
- Загальна кількість декларацій

Вікові групи та поля JSON:
• від 0 до 5 років → age_0_5
• від 6 до 17 років → age_6_17
• від 18 до 39 років → age_18_39
• від 40 до 64 років → age_40_64
• понад 65 років → age_65_plus

Правила:
- Усі числа — цілі (integer), без десяткових
- total = сума всіх вікових груп (якщо не вказано явно)
- Якщо дані не видно — 0
- confidence: "high"/"medium"/"low"

Відповідай ТІЛЬКИ JSON без будь-якого іншого тексту:
{"doctor_name": "ПІБ або null", "age_0_5": 0, "age_6_17": 0, "age_18_39": 0, "age_40_64": 0, "age_65_plus": 0, "total": 0, "confidence": "high", "notes": ""}"""


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


_NHSU_AI_FALLBACK = {
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


def _get_nhsu_prompts(provider: str) -> tuple[str, str]:
    """Повертає (system_prompt, user_prompt) для вказаного AI-провайдера."""
    if provider == "anthropic":
        return _ANTHROPIC_SYSTEM, _ANTHROPIC_PROMPT
    elif provider == "openai":
        return _OPENAI_SYSTEM, _OPENAI_PROMPT
    else:  # xai
        return _XAI_SYSTEM, _XAI_PROMPT


# ── AI аналіз зображень ──────────────────────────────────────────────


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
    provider, api_key = await get_provider(db, user.id)

    if not provider:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI сервіс не налаштований. "
                "Додайте хоча б один API ключ у Налаштуваннях: "
                "Anthropic (Claude), OpenAI (ChatGPT) або xAI (Grok)."
            ),
        )

    system_prompt, user_prompt = _get_nhsu_prompts(provider)

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

        text = await ai_analyze_image(provider, api_key, raw, media_type, system_prompt, user_prompt)
        data = parse_ai_json(text, _NHSU_AI_FALLBACK)

        results.append({
            "doctor_id": parsed_ids[i] if i < len(parsed_ids) else None,
            "filename": image_file.filename,
            "provider": provider,
            **data,
        })

    return {"results": results, "provider": provider}
