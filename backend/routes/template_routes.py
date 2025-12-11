"""Template management routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel
import logging

from models.template import TemplateModel, TemplateCreate, TemplateUpdate
from services.template_service import TemplateService
from auth.auth_middleware import get_current_user

router = APIRouter(prefix="/templates", tags=["templates"])
logger = logging.getLogger(__name__)


class RevertRequest(BaseModel):
    """Request model for reverting template."""
    version_number: int


@router.post("", response_model=TemplateModel, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: TemplateCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new template."""
    from server import db as database
    
    template_service = TemplateService(database)
    
    try:
        template = await template_service.create_template(
            user_id=current_user["_id"],
            template_data=template_data
        )
        logger.info(f"Template created: {template.name} by user {current_user['_id']}")
        return template
    except Exception as e:
        logger.error(f"Error creating template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при створенні шаблону"
        )


@router.get("", response_model=List[TemplateModel])
async def get_all_templates(
    current_user: dict = Depends(get_current_user)
):
    """Get all templates for the current user (including system defaults)."""
    from server import db as database
    
    template_service = TemplateService(database)
    
    try:
        templates = await template_service.get_all_templates(
            user_id=current_user["_id"]
        )
        return templates
    except Exception as e:
        logger.error(f"Error getting templates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні списку шаблонів"
        )


@router.get("/invoice/user", response_model=TemplateModel)
async def get_user_invoice_template(
    current_user: dict = Depends(get_current_user)
):
    """Get or create user's invoice template."""
    from server import db as database
    
    template_service = TemplateService(database)
    
    try:
        template = await template_service.get_or_create_user_invoice_template(
            user_id=current_user["_id"]
        )
        return template
    except Exception as e:
        logger.error(f"Error getting user invoice template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні шаблону рахунку"
        )


@router.get("/type/{template_type}", response_model=List[TemplateModel])
async def get_templates_by_type(
    template_type: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all templates of a specific type."""
    from server import db as database
    
    template_service = TemplateService(database)
    
    try:
        templates = await template_service.get_templates_by_type(
            user_id=current_user["_id"],
            template_type=template_type
        )
        return templates
    except Exception as e:
        logger.error(f"Error getting templates by type: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні шаблонів"
        )


@router.get("/{template_id}", response_model=TemplateModel)
async def get_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get template by ID."""
    from server import db as database
    
    template_service = TemplateService(database)
    
    try:
        template = await template_service.get_template_by_id(
            user_id=current_user["_id"],
            template_id=template_id
        )
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Шаблон не знайдено"
            )
        
        return template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні шаблону"
        )


@router.put("/{template_id}", response_model=TemplateModel)
async def update_template(
    template_id: str,
    template_data: TemplateUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update template (with versioning)."""
    from server import db as database
    
    template_service = TemplateService(database)
    
    try:
        template = await template_service.update_template(
            user_id=current_user["_id"],
            template_id=template_id,
            template_data=template_data
        )
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Шаблон не знайдено або ви не маєте прав на його редагування"
            )
        
        logger.info(f"Template updated: {template_id} by user {current_user['_id']}")
        return template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при оновленні шаблону"
        )


@router.post("/{template_id}/revert", response_model=TemplateModel)
async def revert_template(
    template_id: str,
    revert_request: RevertRequest,
    current_user: dict = Depends(get_current_user)
):
    """Revert template to a previous version."""
    from server import db as database
    
    template_service = TemplateService(database)
    
    try:
        template = await template_service.revert_template(
            user_id=current_user["_id"],
            template_id=template_id,
            version_number=revert_request.version_number
        )
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Шаблон або версію не знайдено"
            )
        
        logger.info(f"Template reverted: {template_id} to version {revert_request.version_number}")
        return template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reverting template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при поверненні до попередньої версії"
        )


@router.post("/{template_id}/reset", response_model=TemplateModel)
async def reset_template_to_default(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Reset template to system default."""
    from server import db as database
    
    template_service = TemplateService(database)
    
    try:
        template = await template_service.reset_to_default(
            user_id=current_user["_id"],
            template_id=template_id
        )
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Шаблон не знайдено або системний шаблон відсутній"
            )
        
        logger.info(f"Template reset to default: {template_id}")
        return template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при скиданні шаблону"
        )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete template (only user templates, not system defaults)."""
    from server import db as database
    
    template_service = TemplateService(database)
    
    try:
        success = await template_service.delete_template(
            user_id=current_user["_id"],
            template_id=template_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Шаблон не знайдено або його не можна видалити"
            )
        
        logger.info(f"Template deleted: {template_id}")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при видаленні шаблону"
        )


@router.get("/system/{template_type}", response_model=TemplateModel)
async def get_system_template(
    template_type: str,
    current_user: dict = Depends(get_current_user)
):
    """Get system default template for a specific type."""
    from server import db as database
    
    try:
        # Get system template (user_id = None, is_default = True)
        system_template = await database.templates.find_one({
            "template_type": template_type,
            "user_id": None,
            "is_default": True
        })
        
        if not system_template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Системний шаблон не знайдено"
            )
        
        logger.info(f"System template retrieved: {template_type}")
        return TemplateModel(**system_template)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting system template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні системного шаблону"
        )
