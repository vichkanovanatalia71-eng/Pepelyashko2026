"""Counterparty service for managing business partners."""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime
import uuid
import logging

from models.counterparty import CounterpartyModel, CounterpartyCreate, CounterpartyUpdate

logger = logging.getLogger(__name__)


class CounterpartyService:
    """Service for managing counterparties."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.counterparties
    
    async def create_counterparty(self, user_id: str, counterparty_data: CounterpartyCreate) -> CounterpartyModel:
        """
        Create a new counterparty for a user.
        
        Args:
            user_id: Owner user ID
            counterparty_data: Counterparty creation data
        
        Returns:
            Created counterparty model
        
        Raises:
            ValueError: If counterparty with this EDRPOU already exists for this user
        """
        # Check if counterparty with this EDRPOU already exists for this user
        existing = await self.collection.find_one({
            "user_id": user_id,
            "edrpou": counterparty_data.edrpou
        })
        if existing:
            raise ValueError(f"Контрагент з ЄДРПОУ {counterparty_data.edrpou} вже існує")
        
        # Create counterparty document
        counterparty_id = str(uuid.uuid4())
        counterparty_dict = {
            "_id": counterparty_id,
            "user_id": user_id,
            **counterparty_data.model_dump(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.collection.insert_one(counterparty_dict)
        logger.info(f"Created counterparty {counterparty_data.edrpou} for user {user_id}")
        
        return CounterpartyModel(**counterparty_dict)
    
    async def get_counterparty_by_id(self, user_id: str, counterparty_id: str) -> Optional[CounterpartyModel]:
        """
        Get counterparty by ID (with user ownership check).
        
        Args:
            user_id: Owner user ID
            counterparty_id: Counterparty ID
        
        Returns:
            Counterparty model or None
        """
        counterparty = await self.collection.find_one({
            "_id": counterparty_id,
            "user_id": user_id
        })
        if counterparty:
            return CounterpartyModel(**counterparty)
        return None
    
    async def get_counterparty_by_edrpou(self, user_id: str, edrpou: str) -> Optional[CounterpartyModel]:
        """
        Get counterparty by EDRPOU (with user ownership check).
        
        Args:
            user_id: Owner user ID
            edrpou: EDRPOU code
        
        Returns:
            Counterparty model or None
        """
        counterparty = await self.collection.find_one({
            "user_id": user_id,
            "edrpou": edrpou
        })
        if counterparty:
            return CounterpartyModel(**counterparty)
        return None
    
    async def get_all_counterparties(self, user_id: str) -> List[CounterpartyModel]:
        """
        Get all counterparties for a user.
        
        Args:
            user_id: Owner user ID
        
        Returns:
            List of counterparty models
        """
        cursor = self.collection.find({"user_id": user_id})
        counterparties = []
        async for counterparty in cursor:
            counterparties.append(CounterpartyModel(**counterparty))
        return counterparties
    
    async def update_counterparty(self, user_id: str, counterparty_id: str, counterparty_data: CounterpartyUpdate) -> Optional[CounterpartyModel]:
        """
        Update counterparty.
        
        Args:
            user_id: Owner user ID
            counterparty_id: Counterparty ID
            counterparty_data: Update data
        
        Returns:
            Updated counterparty model or None
        """
        update_dict = counterparty_data.model_dump(exclude_unset=True)
        if not update_dict:
            return await self.get_counterparty_by_id(user_id, counterparty_id)
        
        update_dict["updated_at"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": counterparty_id, "user_id": user_id},
            {"$set": update_dict}
        )
        
        if result.modified_count > 0:
            logger.info(f"Updated counterparty: {counterparty_id}")
            return await self.get_counterparty_by_id(user_id, counterparty_id)
        
        return None
    
    async def delete_counterparty(self, user_id: str, counterparty_id: str) -> bool:
        """
        Delete counterparty.
        
        Args:
            user_id: Owner user ID
            counterparty_id: Counterparty ID
        
        Returns:
            True if deleted, False otherwise
        """
        result = await self.collection.delete_one({
            "_id": counterparty_id,
            "user_id": user_id
        })
        
        if result.deleted_count > 0:
            logger.info(f"Deleted counterparty: {counterparty_id}")
            return True
        
        return False
