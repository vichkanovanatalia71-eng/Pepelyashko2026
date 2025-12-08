"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
import logging

from models.user import UserCreate, UserModel, UserLogin, UserUpdate
from services.user_service import UserService
from auth.auth_utils import create_access_token
from auth.auth_middleware import get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()
logger = logging.getLogger(__name__)


class TokenResponse(BaseModel):
    """Token response model."""
    access_token: str
    token_type: str = "bearer"
    user: UserModel


def get_user_service(db: AsyncIOMotorDatabase) -> UserService:
    """Dependency to get user service."""
    return UserService(db)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(lambda: None)
):
    """
    Register a new user.
    
    Creates a new user account with hashed password and returns JWT token.
    """
    # This will be injected properly in server.py
    from server import db as database
    
    user_service = UserService(database)
    
    try:
        # Create user
        user = await user_service.create_user(user_data)
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user.id, "email": user.email}
        )
        
        logger.info(f"User registered: {user.email}")
        
        return TokenResponse(
            access_token=access_token,
            user=user
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при реєстрації"
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncIOMotorDatabase = Depends(lambda: None)
):
    """
    Login user and return JWT token.
    
    Authenticates user with email and password.
    """
    from server import db as database
    
    user_service = UserService(database)
    
    try:
        # Authenticate user
        user = await user_service.authenticate_user(
            email=credentials.email,
            password=credentials.password
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Невірний email або пароль",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неактивний користувач"
            )
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user.id, "email": user.email}
        )
        
        # Remove hashed_password before returning
        user_dict = user.model_dump()
        del user_dict["hashed_password"]
        user_model = UserModel(**user_dict)
        
        logger.info(f"User logged in: {user.email}")
        
        return TokenResponse(
            access_token=access_token,
            user=user_model
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при вході"
        )


@router.get("/me", response_model=UserModel)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user)
):
    """
    Get current user information.
    
    Returns information about the authenticated user.
    """
    from server import db as database
    
    user_service = UserService(database)
    
    try:
        user = await user_service.get_user_by_id(current_user["_id"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Користувача не знайдено"
            )
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні інформації користувача"
        )


@router.put("/me", response_model=UserModel)
async def update_current_user(
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current user profile.
    
    Updates user profile information.
    """
    from server import db as database
    
    user_service = UserService(database)
    
    try:
        user = await user_service.update_user(current_user["_id"], user_data)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Користувача не знайдено"
            )
        
        logger.info(f"User updated: {user.email}")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при оновленні профілю"
        )


@router.put("/profile", response_model=UserModel)
async def update_user_profile(
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update user profile with supplier details.
    
    Updates user profile information including supplier/provider details.
    """
    from server import db as database
    
    user_service = UserService(database)
    
    try:
        user = await user_service.update_user(current_user["_id"], user_data)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Користувача не знайдено"
            )
        
        logger.info(f"User profile updated: {user.email}")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при оновленні профілю"
        )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout user.
    
    Note: Since we're using JWT, actual logout is handled client-side by removing the token.
    This endpoint is here for consistency and can be used for logging purposes.
    """
    logger.info(f"User logged out: {current_user.get('email', 'unknown')}")
    return {"message": "Успішно вийшли з системи"}



# ==================== PROFILE MANAGEMENT ROUTES ====================

@router.get("/profile/pdf")
async def download_profile_pdf(
    current_user: dict = Depends(get_current_user)
):
    """Generate and download user profile as PDF."""
    from server import db as database
    from services.profile_pdf_service import ProfilePDFService
    from fastapi.responses import FileResponse
    import os
    
    try:
        # Get full user data
        user = await database.users.find_one(
            {"_id": current_user["_id"]},
            {"_id": 0, "hashed_password": 0}
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Користувача не знайдено"
            )
        
        # Add _id for PDF generation
        user['_id'] = current_user["_id"]
        
        # Generate PDF
        pdf_service = ProfilePDFService()
        pdf_path = pdf_service.generate_profile_pdf(user)
        
        if not os.path.exists(pdf_path):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Помилка генерації PDF"
            )
        
        logger.info(f"Profile PDF generated: {pdf_path} for user {current_user['_id']}")
        
        company_name = user.get('representative_name') or user.get('company_name', 'Профіль')
        filename = f"Профіль_{company_name[:30]}.pdf"
        
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating profile PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при генерації PDF профілю"
        )


class EmailRequest(BaseModel):
    """Request model for sending email."""
    email: str


@router.post("/profile/send-email")
async def send_profile_email(
    email_request: EmailRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send user profile PDF via email."""
    from server import db as database
    from services.profile_pdf_service import ProfilePDFService
    from services.email_service import EmailService
    import os
    
    try:
        # Get full user data
        user = await database.users.find_one(
            {"_id": current_user["_id"]},
            {"_id": 0, "hashed_password": 0}
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Користувача не знайдено"
            )
        
        # Add _id for PDF generation
        user['_id'] = current_user["_id"]
        
        # Generate PDF
        pdf_service = ProfilePDFService()
        pdf_path = pdf_service.generate_profile_pdf(user)
        
        # Get company logo
        company_logo_url = None
        company_logo_path = None
        if user.get('company_logo'):
            logo_relative_path = user['company_logo']
            company_logo_path = f"/app/backend/{logo_relative_path}"
            company_logo_url = "embedded"
        
        # Send email
        email_service = EmailService()
        company_name = user.get('representative_name') or user.get('company_name', 'Компанія')
        
        success = email_service.send_profile_document(
            to_email=email_request.email,
            company_name=company_name,
            pdf_path=pdf_path,
            company_logo_url=company_logo_url,
            company_logo_path=company_logo_path
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Помилка відправки email"
            )
        
        logger.info(f"Profile PDF sent to {email_request.email} by user {current_user['_id']}")
        
        return {"message": f"Профіль відправлено на {email_request.email}"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending profile email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при відправці профілю"
        )


@router.delete("/profile")
async def delete_profile(
    current_user: dict = Depends(get_current_user)
):
    """Delete user profile (soft delete - deactivate account)."""
    from server import db as database
    from datetime import datetime
    
    try:
        # Update user status to deactivated
        result = await database.users.update_one(
            {"_id": current_user["_id"]},
            {
                "$set": {
                    "is_active": False,
                    "deactivated_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Користувача не знайдено"
            )
        
        logger.info(f"User profile deactivated: {current_user['_id']}")
        
        return {
            "message": "Профіль деактивовано",
            "detail": "Ваш обліковий запис було деактивовано. Зверніться до адміністратора для відновлення."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при видаленні профілю"
        )

