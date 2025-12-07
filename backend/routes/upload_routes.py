"""Routes for file uploads."""

import os
import uuid
from pathlib import Path
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, status
from routes.auth_routes import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Directory for storing uploaded files
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Allowed image extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/upload/logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload company logo.
    Returns the URL to access the uploaded file.
    """
    from server import db
    
    try:
        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Дозволені тільки зображення: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content
        content = await file.read()
        
        # Validate file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Файл завеликий. Максимальний розмір: 5MB"
            )
        
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Update user profile with logo URL
        logo_url = f"/api/uploads/{unique_filename}"
        
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {
                "$set": {
                    "logo_url": logo_url,
                    "logo_filename": unique_filename
                }
            }
        )
        
        logger.info(f"Logo uploaded for user {current_user['_id']}: {unique_filename}")
        
        return {
            "message": "Логотип успішно завантажено",
            "logo_url": logo_url,
            "filename": unique_filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading logo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка завантаження файлу"
        )


@router.delete("/upload/logo")
async def delete_logo(
    current_user: dict = Depends(get_current_user)
):
    """Delete company logo."""
    from server import db
    
    try:
        user = await db.users.find_one({"_id": current_user["_id"]})
        
        if not user or not user.get("logo_filename"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Логотип не знайдено"
            )
        
        # Delete file from filesystem
        file_path = UPLOAD_DIR / user["logo_filename"]
        if file_path.exists():
            file_path.unlink()
        
        # Update user profile
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {
                "$unset": {
                    "logo_url": "",
                    "logo_filename": ""
                }
            }
        )
        
        logger.info(f"Logo deleted for user {current_user['_id']}")
        
        return {"message": "Логотип успішно видалено"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting logo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка видалення файлу"
        )
