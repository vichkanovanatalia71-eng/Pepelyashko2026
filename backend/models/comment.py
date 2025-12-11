"""
Comment model for documents and counterparties
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class CommentCreate(BaseModel):
    """Schema for creating a new comment"""
    entity_type: str = Field(..., description="Type: order|invoice|act|waybill|contract|counterparty")
    entity_id: str = Field(..., description="ID of the entity (document number or counterparty EDRPOU)")
    text: str = Field(..., min_length=1, max_length=1000, description="Comment text")


class CommentModel(BaseModel):
    """Comment model"""
    id: str = Field(..., alias="_id")
    user_id: str
    author_name: str
    author_email: str
    entity_type: str
    entity_id: str
    text: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class CommentUpdate(BaseModel):
    """Schema for updating a comment"""
    text: str = Field(..., min_length=1, max_length=1000)
