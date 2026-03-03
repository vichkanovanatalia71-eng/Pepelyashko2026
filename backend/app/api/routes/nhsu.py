import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.services.ai_provider import analyze_image as ai_analyze_image, get_provider, parse_ai_json
from app.models.doctor import Doctor
from app.models.nhsu import AGE_GROUPS, NhsuRecord
from app.models.staff import StaffMember
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

logger = logging.getLogger(__name__)

router = APIRouter()

# ── AI-промти для аналізу зображень НСЗУ ─────────────────────────────

_NHSU_AI_SYSTEM = """\
Ти — експертний AI-асистент з розпізнавання звітів НСЗУ \
(Національна служба здоров'я України, портал esoz.nhsu.gov.ua).

ТВОЇ МОЖЛИВОСТІ:
- Розпізнавання будь-яких типів зображень: скріншоти порталу НСЗУ, \
фотографії екрану, скани документів, рукописні записи, таблиці, \
діаграми (кругові, стовпчикові), комбіновані формати.
- Робота з низькою якістю: розмиті, нахилені, частково обрізані, \
погано освітлені зображення.
- Розпізнавання тексту українською та англійською мовами.

КРИТИЧНІ ПРАВИЛА:
1. НІКОЛИ не вигадуй дані, яких немає на зображенні.
2. Якщо щось не вдається прочитати — позначай confidence як "low" \
і вкажи warning з описом проблеми.
3. Відповідай ТІЛЬКИ валідним JSON без markdown, коментарів чи пояснень.
4. Якщо зображення не містить даних про декларації НСЗУ — поверни \
всі числові поля як 0 з відповідним поясненням у notes."""

_NHSU_AI_PROMPT = """\
<task>
Проаналізуй зображення та витягни з нього дані про активні декларації \
лікаря первинної медичної допомоги (ПМД) з порталу НСЗУ.
</task>

<step_1_identify_format>
Спочатку визнач тип зображення:
- ПОРТАЛ_НСЗУ: скріншот порталу esoz.nhsu.gov.ua з даними декларацій
- ТАБЛИЦЯ: структурована таблиця з даними по вікових групах
- ДІАГРАМА: кругова або стовпчикова діаграма з підписами
- РУКОПИС: рукописний текст (почерк, записка)
- ФОТО_ДОКУМЕНТА: фото друкованого документа / витягу
- ЗМІШАНИЙ: комбінація кількох форматів
- НЕ_НСЗУ: зображення не містить інформації про декларації НСЗУ
Запиши визначений тип у поле "image_type".
</step_1_identify_format>

<step_2_extract_data>
Витягни наступні дані:

1. "doctor_name" — ПІБ лікаря (прізвище, ім'я, по батькові). \
Якщо не видно — null.
2. Кількість активних декларацій (пацієнтів) за віковими групами:
   - "age_0_5": від 0 до 5 років
   - "age_6_17": від 6 до 17 років
   - "age_18_39": від 18 до 39 років
   - "age_40_64": від 40 до 64 років
   - "age_65_plus": понад 65 років
3. "total": загальна кількість декларацій (усіх вікових груп разом)
4. "confidence" — впевненість для цього результату:
   - "high": всі числа чітко видимі, читаються однозначно
   - "medium": деякі числа можуть бути неточними
   - "low": значна частина даних нечитабельна або неоднозначна
5. "warning" — опис проблеми (порожній рядок якщо confidence = "high"):
   - "Частина таблиці обрізана"
   - "Число пацієнтів 65+ нечітке, можливо 342 або 842"
   - "Рукописний текст, можливі помилки"
   тощо.
</step_2_extract_data>

<step_3_validate>
Перевір дані:
- Чи total дорівнює сумі всіх вікових груп? Якщо ні — вкажи \
у warnings і використай ЯВНО вказане на зображенні значення total.
- Чи числа реалістичні? Типово для ПМД: 0–5000 на вікову групу, \
total зазвичай 500–2500 (але може бути й менше/більше).
- Якщо якісь числа підозрілі або виходять за межі — зниж \
confidence і додай warning.
- Усі числа мають бути цілими (integer), >= 0.
</step_3_validate>

<output_format>
{
  "image_type": "ПОРТАЛ_НСЗУ",
  "doctor_name": "Іваненко Марія Петрівна",
  "age_0_5": 120,
  "age_6_17": 210,
  "age_18_39": 450,
  "age_40_64": 380,
  "age_65_plus": 290,
  "total": 1450,
  "confidence": "high",
  "warning": "",
  "notes": "",
  "warnings": []
}

Поля:
- "confidence": загальна оцінка якості розпізнавання
- "warning": опис основної проблеми (або порожній рядок)
- "notes": додаткова інформація (порожній рядок якщо все ОК)
- "warnings": масив загальних попереджень, наприклад:
  ["Сума вікових груп (1430) не збігається з total (1450)",
   "Зображення низької якості — рекомендовано перевірити"]
</output_format>"""


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
    await db.flush()  # отримуємо doctor.id до commit

    if not doctor.is_owner:
        staff = StaffMember(
            user_id=user.id,
            full_name=doctor.full_name,
            role="doctor",
            position="",
            doctor_id=doctor.id,
        )
        db.add(staff)

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
    updated_fields = doctor_in.model_dump(exclude_unset=True)
    for field, value in updated_fields.items():
        setattr(doctor, field, value)
    await db.commit()
    await db.refresh(doctor)

    if "full_name" in updated_fields:
        sm_res = await db.execute(
            select(StaffMember).where(
                StaffMember.doctor_id == doctor.id,
                StaffMember.is_active == True,
            )
        )
        sm = sm_res.scalar_one_or_none()
        if sm:
            sm.full_name = doctor.full_name
            await db.commit()

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

    sm_res = await db.execute(
        select(StaffMember).where(
            StaffMember.doctor_id == doctor_id,
            StaffMember.user_id == user.id,
            StaffMember.is_active == True,
        )
    )
    sm = sm_res.scalar_one_or_none()
    if sm:
        sm.is_active = False

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


@router.delete("/monthly", status_code=204)
async def delete_monthly(
    year: int = Query(...),
    month: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Видалити всі дані НСЗУ за обраний місяць."""
    await db.execute(
        delete(NhsuRecord).where(
            NhsuRecord.user_id == user.id,
            NhsuRecord.year == year,
            NhsuRecord.month == month,
        )
    )
    await db.commit()


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
    "image_type": "НЕ_НСЗУ",
    "doctor_name": None,
    "age_0_5": 0,
    "age_6_17": 0,
    "age_18_39": 0,
    "age_40_64": 0,
    "age_65_plus": 0,
    "total": 0,
    "confidence": "low",
    "warning": "Не вдалося розпізнати дані з зображення",
    "notes": "",
    "warnings": [],
}


def _normalize_nhsu_result(data: dict) -> dict:
    """Нормалізує один результат AI-аналізу НСЗУ."""

    def safe_int(val: object, default: int = 0) -> int:
        try:
            return max(0, int(val))  # type: ignore[arg-type]
        except (ValueError, TypeError):
            return default

    age_0_5 = safe_int(data.get("age_0_5"))
    age_6_17 = safe_int(data.get("age_6_17"))
    age_18_39 = safe_int(data.get("age_18_39"))
    age_40_64 = safe_int(data.get("age_40_64"))
    age_65_plus = safe_int(data.get("age_65_plus"))
    computed_total = age_0_5 + age_6_17 + age_18_39 + age_40_64 + age_65_plus
    explicit_total = safe_int(data.get("total"))
    total = explicit_total if explicit_total > 0 else computed_total

    confidence = data.get("confidence", "medium")
    if confidence not in ("high", "medium", "low"):
        confidence = "medium"

    warnings: list[str] = []
    raw_warnings = data.get("warnings")
    if isinstance(raw_warnings, list):
        warnings = [str(w) for w in raw_warnings if w]

    # Перевірка: сума вікових груп ≠ total
    if computed_total != total and total > 0:
        warnings.append(
            f"Сума вікових груп ({computed_total}) не збігається з total ({total})"
        )

    return {
        "image_type": str(data.get("image_type", "НЕ_НСЗУ")),
        "doctor_name": data.get("doctor_name") or None,
        "age_0_5": age_0_5,
        "age_6_17": age_6_17,
        "age_18_39": age_18_39,
        "age_40_64": age_40_64,
        "age_65_plus": age_65_plus,
        "total": total,
        "confidence": confidence,
        "warning": str(data.get("warning", "")),
        "notes": str(data.get("notes", "")),
        "warnings": warnings,
    }


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

    # Розбираємо doctor_ids
    parsed_ids: List[Optional[int]] = []
    if doctor_ids:
        for part in doctor_ids.split(","):
            try:
                parsed_ids.append(int(part.strip()))
            except ValueError:
                parsed_ids.append(None)

    results = []
    all_warnings: list[str] = []
    confidence_levels: list[str] = []

    for i, image_file in enumerate(images):
        doctor_id = parsed_ids[i] if i < len(parsed_ids) else None

        if len(await image_file.read()) > 10 * 1024 * 1024:
            results.append({
                "doctor_id": doctor_id,
                "filename": image_file.filename,
                "error": "Файл перевищує ліміт 10 MB",
            })
            continue

        # Перечитуємо файл (read() вже спожив потік)
        await image_file.seek(0)
        raw = await image_file.read()
        media_type = image_file.content_type or "image/png"

        try:
            text = await ai_analyze_image(
                provider, api_key, raw, media_type,
                _NHSU_AI_SYSTEM, _NHSU_AI_PROMPT,
            )
            data = parse_ai_json(text, _NHSU_AI_FALLBACK)
            normalized = _normalize_nhsu_result(data)

            confidence_levels.append(normalized["confidence"])
            if normalized["warning"]:
                all_warnings.append(
                    f"{image_file.filename}: {normalized['warning']}"
                )
            all_warnings.extend(normalized.get("warnings", []))

            results.append({
                "doctor_id": doctor_id,
                "filename": image_file.filename,
                "provider": provider,
                **normalized,
            })
        except Exception:
            logger.exception("NHSU AI error for %s", image_file.filename)
            results.append({
                "doctor_id": doctor_id,
                "filename": image_file.filename,
                "provider": provider,
                **_NHSU_AI_FALLBACK,
                "warning": "Внутрішня помилка при аналізі зображення",
            })
            confidence_levels.append("low")

    # Визначаємо загальний рівень confidence
    if not confidence_levels:
        overall = "low"
    elif all(c == "high" for c in confidence_levels):
        overall = "high"
    elif any(c == "low" for c in confidence_levels):
        overall = "low"
    else:
        overall = "medium"

    return {
        "results": results,
        "provider": provider,
        "confidence": overall,
        "warnings": all_warnings,
    }
