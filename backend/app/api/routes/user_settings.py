from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.user_api_keys import UserApiKeys
from app.schemas.user_api_keys import ApiKeysResponse, ApiKeysUpdate

router = APIRouter()


# ── Helpers ──────────────────────────────────────────────────────────

async def get_or_create_api_keys(db: AsyncSession, user_id: int) -> UserApiKeys:
    result = await db.execute(
        select(UserApiKeys).where(UserApiKeys.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        row = UserApiKeys(user_id=user_id, updated_at=datetime.now(timezone.utc))
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


def _build_response(row: UserApiKeys) -> ApiKeysResponse:
    return ApiKeysResponse(
        anthropic_key_set=bool(row.anthropic_key),
        anthropic_key_masked=row.mask(row.anthropic_key),
        openai_key_set=bool(row.openai_key),
        openai_key_masked=row.mask(row.openai_key),
        xai_key_set=bool(row.xai_key),
        xai_key_masked=row.mask(row.xai_key),
    )


# ── Endpoints ─────────────────────────────────────────────────────────

@router.get("/api-keys", response_model=ApiKeysResponse)
async def get_api_keys(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Повертає статус та маскований вигляд API ключів."""
    row = await get_or_create_api_keys(db, user.id)
    return _build_response(row)


@router.put("/api-keys", response_model=ApiKeysResponse)
async def update_api_keys(
    data: ApiKeysUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Оновлює API ключі. Правила:
    - поле None  → не змінювати
    - поле ""    → очистити
    - поле "sk-…"→ зберегти
    """
    row = await get_or_create_api_keys(db, user.id)

    if data.anthropic_key is not None:
        row.anthropic_key = data.anthropic_key or None
    if data.openai_key is not None:
        row.openai_key = data.openai_key or None
    if data.xai_key is not None:
        row.xai_key = data.xai_key or None

    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _build_response(row)
