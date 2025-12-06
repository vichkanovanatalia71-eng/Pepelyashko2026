"""User service for user management."""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime
import uuid
import logging

from models.user import UserModel, UserInDB, UserCreate, UserUpdate
from auth.auth_utils import get_password_hash, verify_password

logger = logging.getLogger(__name__)


class UserService:
    """Service for managing users."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.users
    
    async def create_user(self, user_data: UserCreate) -> UserModel:
        """
        Create a new user.
        
        Args:
            user_data: User creation data
        
        Returns:
            Created user model
        
        Raises:
            ValueError: If user with this email already exists
        """
        # Check if user with this email already exists
        existing_user = await self.collection.find_one({"email": user_data.email})
        if existing_user:
            raise ValueError(f"Користувач з email {user_data.email} вже існує")
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user document
        user_id = str(uuid.uuid4())
        user_dict = {
            "_id": user_id,
            "email": user_data.email,
            "hashed_password": hashed_password,
            "full_name": user_data.full_name,
            "company_name": user_data.company_name,
            "phone": user_data.phone,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.collection.insert_one(user_dict)
        logger.info(f"Created user: {user_data.email}")
        
        # Return user model (without password)
        user_dict_clean = {k: v for k, v in user_dict.items() if k != "hashed_password"}
        return UserModel(**user_dict_clean)
    
    async def get_user_by_email(self, email: str) -> Optional[UserInDB]:
        """
        Get user by email (including hashed password).
        
        Args:
            email: User email
        
        Returns:
            User with hashed password or None
        """
        user = await self.collection.find_one({"email": email})
        if user:
            return UserInDB(**user)
        return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[UserModel]:
        """
        Get user by ID.
        
        Args:
            user_id: User ID
        
        Returns:
            User model or None
        """
        user = await self.collection.find_one({"_id": user_id})
        if user:
            # Remove hashed_password before returning
            user_dict = {k: v for k, v in user.items() if k != "hashed_password"}
            return UserModel(**user_dict)
        return None
    
    async def authenticate_user(self, email: str, password: str) -> Optional[UserInDB]:
        """
        Authenticate user with email and password.
        
        Args:
            email: User email
            password: Plain password
        
        Returns:
            User with hashed password or None if authentication fails
        """
        user = await self.get_user_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    async def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[UserModel]:
        """
        Update user profile.
        
        Args:
            user_id: User ID
            user_data: Update data
        
        Returns:
            Updated user model or None
        """
        update_dict = user_data.model_dump(exclude_unset=True)
        if not update_dict:
            return await self.get_user_by_id(user_id)
        
        update_dict["updated_at"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": user_id},
            {"$set": update_dict}
        )
        
        if result.modified_count > 0:
            logger.info(f"Updated user: {user_id}")
            return await self.get_user_by_id(user_id)
        
        return None
    
    async def get_all_users(self) -> List[UserModel]:
        """
        Get all users (admin function).
        
        Returns:
            List of user models
        """
        cursor = self.collection.find({})
        users = []
        async for user in cursor:
            user_dict = {k: v for k, v in user.items() if k != "hashed_password"}
            users.append(UserModel(**user_dict))
        return users
