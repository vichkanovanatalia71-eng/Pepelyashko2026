"""
Comment routes for documents and counterparties
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
import uuid

from models.comment import CommentCreate, CommentModel, CommentUpdate
from routes.auth_routes import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/comments", tags=["comments"])


@router.post("", response_model=CommentModel, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new comment for a document or counterparty."""
    from server import db as database
    
    try:
        # Validate entity type
        valid_types = ["order", "invoice", "act", "waybill", "contract", "counterparty"]
        if comment_data.entity_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid entity type. Must be one of: {', '.join(valid_types)}"
            )
        
        # Create comment
        comment_id = str(uuid.uuid4())
        comment_dict = {
            "_id": comment_id,
            "user_id": current_user["_id"],
            "author_name": current_user.get("name") or current_user.get("email", "Unknown"),
            "author_email": current_user.get("email", ""),
            "entity_type": comment_data.entity_type,
            "entity_id": comment_data.entity_id,
            "text": comment_data.text,
            "created_at": datetime.utcnow(),
            "updated_at": None
        }
        
        await database.comments.insert_one(comment_dict)
        logger.info(f"Comment created: {comment_id} for {comment_data.entity_type} {comment_data.entity_id}")
        
        return CommentModel(**comment_dict)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating comment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при створенні коментаря"
        )


@router.get("/{entity_type}/{entity_id}", response_model=List[CommentModel])
async def get_comments(
    entity_type: str,
    entity_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all comments for a specific document or counterparty."""
    from server import db as database
    
    try:
        # Validate entity type
        valid_types = ["order", "invoice", "act", "waybill", "contract", "counterparty"]
        if entity_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid entity type. Must be one of: {', '.join(valid_types)}"
            )
        
        # Get comments sorted by created_at descending (newest first)
        cursor = database.comments.find({
            "entity_type": entity_type,
            "entity_id": entity_id,
            "user_id": current_user["_id"]
        }).sort("created_at", -1)
        
        comments = []
        async for comment in cursor:
            comments.append(CommentModel(**comment))
        
        logger.info(f"Retrieved {len(comments)} comments for {entity_type} {entity_id}")
        return comments
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting comments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні коментарів"
        )


@router.put("/{comment_id}", response_model=CommentModel)
async def update_comment(
    comment_id: str,
    comment_data: CommentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a comment (only by author)."""
    from server import db as database
    
    try:
        # Check if comment exists and belongs to user
        existing_comment = await database.comments.find_one({
            "_id": comment_id,
            "user_id": current_user["_id"]
        })
        
        if not existing_comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Коментар не знайдено або ви не маєте прав на його редагування"
            )
        
        # Update comment
        result = await database.comments.update_one(
            {"_id": comment_id},
            {
                "$set": {
                    "text": comment_data.text,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Не вдалося оновити коментар"
            )
        
        # Get updated comment
        updated_comment = await database.comments.find_one({"_id": comment_id})
        logger.info(f"Comment updated: {comment_id}")
        
        return CommentModel(**updated_comment)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating comment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при оновленні коментаря"
        )


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a comment (only by author)."""
    from server import db as database
    
    try:
        # Check if comment exists and belongs to user
        existing_comment = await database.comments.find_one({
            "_id": comment_id,
            "user_id": current_user["_id"]
        })
        
        if not existing_comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Коментар не знайдено або ви не маєте прав на його видалення"
            )
        
        # Delete comment
        result = await database.comments.delete_one({"_id": comment_id})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Не вдалося видалити коментар"
            )
        
        logger.info(f"Comment deleted: {comment_id}")
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting comment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при видаленні коментаря"
        )
