import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.core.email import send_verification_email
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import (
    PasswordChange,
    ProfileUpdate,
    RegisterResponse,
    Token,
    UserCreate,
    UserResponse,
)

router = APIRouter()


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    email = user_in.email.strip().lower()

    # Перевіряємо унікальність email (case-insensitive)
    result = await db.execute(select(User).where(func.lower(User.email) == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email вже зареєстровано")

    token = str(uuid.uuid4())

    user = User(
        email=email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        fop_group=user_in.fop_group,
        tax_rate=user_in.tax_rate,
        is_verified=False,
        verification_token=token,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Надсилаємо лист підтвердження
    try:
        email_sent = await send_verification_email(email, token)
    except Exception:
        email_sent = False

    # Auto-verify ONLY in debug mode (development); in production require email
    if not email_sent and settings.debug:
        user.is_verified = True
        user.verification_token = None
        await db.commit()

    return RegisterResponse(email=user.email, email_sent=email_sent)


@router.get("/verify-email")
async def verify_email(
    token: str = Query(..., description="Токен підтвердження з листа"),
    db: AsyncSession = Depends(get_db),
):
    """Підтверджує email за токеном із листа."""
    result = await db.execute(
        select(User).where(User.verification_token == token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Недійсний або застарілий токен підтвердження",
        )
    if user.is_verified:
        return {"detail": "Email вже підтверджено"}

    user.is_verified = True
    user.verification_token = None
    await db.commit()

    return {"detail": "Email успішно підтверджено! Тепер ви можете увійти."}


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    email = form_data.username.strip().lower()
    result = await db.execute(select(User).where(func.lower(User.email) == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невірний email або пароль",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Будь ласка, підтвердьте вашу email-адресу. Перевірте пошту.",
        )

    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_in: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    for field, value in profile_in.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/change-password")
async def change_password(
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(data.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Невірний поточний пароль")
    user.hashed_password = get_password_hash(data.new_password)
    await db.commit()
    return {"detail": "Пароль успішно змінено"}
