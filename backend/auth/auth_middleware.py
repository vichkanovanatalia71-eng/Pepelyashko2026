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
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Get current authenticated user from JWT token.
    
    Args:
        credentials: HTTP Bearer token
    
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
    
    # Get database from server module
    from server import db
    
    # Verify user exists
    user = await db.users.find_one({"_id": user_id})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Користувача не знайдено",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


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
