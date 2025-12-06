"""Authentication middleware for FastAPI."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import os
from .auth_utils import decode_access_token

# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Optional[AsyncIOMotorDatabase] = None
) -> dict:
    """
    Get current authenticated user from JWT token.
    
    Args:
        credentials: HTTP Bearer token
        db: MongoDB database instance
    
    Returns:
        User data dictionary
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    
    # Decode token
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недійсний токен автентифікації",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недійсний токен автентифікації",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # If db is provided, verify user exists
    if db is not None:
        user = await db.users.find_one({"_id": user_id})
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Користувача не знайдено",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user
    
    # Return minimal user data from token
    return {
        "_id": user_id,
        "email": payload.get("email", "")
    }


async def get_current_active_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Get current active user (additional check for is_active flag).
    
    Args:
        current_user: Current user from get_current_user
    
    Returns:
        User data dictionary
    
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неактивний користувач"
        )
    return current_user
