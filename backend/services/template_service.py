"""Template service for managing document templates."""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime
import uuid
import logging
import re

from models.template import TemplateModel, TemplateCreate, TemplateUpdate, TemplateVersion

logger = logging.getLogger(__name__)


class TemplateService:
    """Service for managing document templates."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.templates
    
    async def create_template(self, user_id: str, template_data: TemplateCreate) -> TemplateModel:
        """
        Create a new template for a user.
        
        Args:
            user_id: Owner user ID
            template_data: Template creation data
        
        Returns:
            Created template model
        """
        template_id = str(uuid.uuid4())
        
        # Auto-detect variables from content if not provided
        variables = template_data.variables
        if variables is None:
            variables = self._extract_variables(template_data.content)
        
        template_dict = {
            "_id": template_id,
            "user_id": user_id,
            "is_default": False,
            "template_type": template_data.template_type,
            "sub_type": template_data.sub_type,
            "name": template_data.name,
            "content": template_data.content,
            "variables": variables,
            "version_history": [],
            "current_version": 1,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.collection.insert_one(template_dict)
        logger.info(f"Created template {template_data.name} for user {user_id}")
        
        return TemplateModel(**template_dict)
    
    async def get_template_by_id(self, user_id: str, template_id: str) -> Optional[TemplateModel]:
        """
        Get template by ID (with user ownership check or system template).
        
        Args:
            user_id: Owner user ID
            template_id: Template ID
        
        Returns:
            Template model or None
        """
        template = await self.collection.find_one({
            "_id": template_id,
            "$or": [
                {"user_id": user_id},
                {"is_default": True}
            ]
        })
        if template:
            return TemplateModel(**template)
        return None
    
    async def get_templates_by_type(self, user_id: str, template_type: str) -> List[TemplateModel]:
        """
        Get all templates of a specific type for a user (including system defaults).
        
        Args:
            user_id: Owner user ID
            template_type: Type of template (invoice, act, waybill, order, contract)
        
        Returns:
            List of template models
        """
        cursor = self.collection.find({
            "template_type": template_type,
            "$or": [
                {"user_id": user_id},
                {"is_default": True}
            ]
        })
        
        templates = []
        async for template in cursor:
            templates.append(TemplateModel(**template))
        return templates
    
    async def get_default_template(self, user_id: str, template_type: str, sub_type: str = None) -> Optional[TemplateModel]:
        """Get default template for a document type - prioritizes user's template.
        
        Args:
            user_id: Owner user ID
            template_type: Type of template (invoice, act, waybill, order, contract)
            sub_type: Sub-type for contracts (goods, services) - optional
        """
        query = {
            "user_id": user_id,
            "template_type": template_type
        }
        
        # Add sub_type filter for contracts
        if template_type == "contract" and sub_type:
            query["sub_type"] = sub_type
        
        # First try to find user's template
        template_doc = await self.collection.find_one(query)
        
        # If not found, get system default
        if not template_doc:
            system_query = {
                "user_id": None,
                "template_type": template_type,
                "is_default": True
            }
            if template_type == "contract" and sub_type:
                system_query["sub_type"] = sub_type
            
            template_doc = await self.collection.find_one(system_query)
        
        # Fallback: if still not found and it's a contract, try without sub_type
        if not template_doc and template_type == "contract":
            template_doc = await self.collection.find_one({
                "$or": [
                    {"user_id": user_id, "template_type": template_type},
                    {"user_id": None, "template_type": template_type, "is_default": True}
                ]
            })
        
        if template_doc:
            return TemplateModel(**template_doc)
        return None
    
    async def get_all_templates(self, user_id: str) -> List[TemplateModel]:
        """
        Get all templates for a user (including system defaults).
        
        Args:
            user_id: Owner user ID
        
        Returns:
            List of template models
        """
        cursor = self.collection.find({
            "$or": [
                {"user_id": user_id},
                {"is_default": True}
            ]
        })
        templates = []
        async for template in cursor:
            templates.append(TemplateModel(**template))
        return templates
    
    async def get_or_create_user_invoice_template(self, user_id: str) -> TemplateModel:
        """
        Get or create user's invoice template.
        If user doesn't have an invoice template, create one from system default.
        
        Args:
            user_id: Owner user ID
        
        Returns:
            User's invoice template model
        """
        # Check if user already has an invoice template
        user_template = await self.collection.find_one({
            "user_id": user_id,
            "template_type": "invoice"
        })
        
        if user_template:
            return TemplateModel(**user_template)
        
        # Get system default template
        system_template = await self.collection.find_one({
            "user_id": None,
            "template_type": "invoice",
            "is_default": True
        })
        
        if not system_template:
            raise ValueError("System default invoice template not found")
        
        # Create user's template from system default
        template_id = str(uuid.uuid4())
        user_template_dict = {
            "_id": template_id,
            "user_id": user_id,
            "is_default": False,
            "template_type": "invoice",
            "name": "Мій шаблон рахунку",
            "content": system_template["content"],
            "variables": system_template.get("variables", []),
            "version_history": [],
            "current_version": 1,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.collection.insert_one(user_template_dict)
        logger.info(f"Created invoice template for user {user_id}")
        
        return TemplateModel(**user_template_dict)
    
    async def update_template(self, user_id: str, template_id: str, template_data: TemplateUpdate) -> Optional[TemplateModel]:
        """
        Update template with versioning.
        If trying to update a system template, creates a user copy instead.
        
        Args:
            user_id: Owner user ID
            template_id: Template ID
            template_data: Update data
        
        Returns:
            Updated template model or None
        """
        # Get current template by ID first
        current_template = await self.collection.find_one({"_id": template_id})
        
        if not current_template:
            return None
        
        # Check permissions
        template_user_id = current_template.get("user_id")
        is_system_template = current_template.get("is_default", False) and template_user_id is None
        
        # If it's a system template, create a user copy instead of updating
        if is_system_template:
            logger.info(f"Creating user copy of system template {template_id} for user {user_id}")
            
            # Check if user already has a template of this type
            existing_user_template = await self.collection.find_one({
                "user_id": user_id,
                "template_type": current_template["template_type"]
            })
            
            if existing_user_template:
                # Update existing user template
                update_dict = template_data.model_dump(exclude_unset=True)
                if not update_dict:
                    return TemplateModel(**existing_user_template)
                
                # If content is being updated, save current version to history
                if "content" in update_dict:
                    version_history = existing_user_template.get("version_history", [])
                    current_version = TemplateVersion(
                        version_number=existing_user_template.get("current_version", 1),
                        content=existing_user_template["content"],
                        created_at=existing_user_template.get("updated_at", datetime.utcnow()),
                        comment=template_data.comment
                    )
                    
                    version_history.append(current_version.model_dump())
                    if len(version_history) > 3:
                        version_history = version_history[-3:]
                    
                    update_dict["version_history"] = version_history
                    update_dict["current_version"] = existing_user_template.get("current_version", 1) + 1
                    
                    if template_data.variables is None:
                        update_dict["variables"] = self._extract_variables(update_dict["content"])
                
                update_dict["updated_at"] = datetime.utcnow()
                
                await self.collection.update_one(
                    {"_id": existing_user_template["_id"]},
                    {"$set": update_dict}
                )
                
                logger.info(f"Updated existing user template: {existing_user_template['_id']}")
                updated_template = await self.collection.find_one({"_id": existing_user_template["_id"]})
                return TemplateModel(**updated_template)
            else:
                # Create new user template based on system template
                new_template_id = str(uuid.uuid4())
                update_dict = template_data.model_dump(exclude_unset=True)
                
                new_content = update_dict.get("content", current_template["content"])
                
                new_template = {
                    "_id": new_template_id,
                    "user_id": user_id,
                    "is_default": False,
                    "template_type": current_template["template_type"],
                    "name": f"Мій {current_template['name']}",
                    "content": new_content,
                    "variables": self._extract_variables(new_content),
                    "version_history": [],
                    "current_version": 1,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                await self.collection.insert_one(new_template)
                logger.info(f"Created user template {new_template_id} from system template")
                return TemplateModel(**new_template)
        
        # Regular user template update
        if template_user_id is not None and template_user_id != user_id:
            # Template belongs to another user - deny access
            return None
        
        update_dict = template_data.model_dump(exclude_unset=True)
        if not update_dict:
            return TemplateModel(**current_template)
        
        # If content is being updated, save current version to history
        if "content" in update_dict:
            version_history = current_template.get("version_history", [])
            current_version = TemplateVersion(
                version_number=current_template.get("current_version", 1),
                content=current_template["content"],
                created_at=current_template.get("updated_at", datetime.utcnow()),
                comment=template_data.comment
            )
            
            # Keep only last 3 versions
            version_history.append(current_version.model_dump())
            if len(version_history) > 3:
                version_history = version_history[-3:]
            
            update_dict["version_history"] = version_history
            update_dict["current_version"] = current_template.get("current_version", 1) + 1
            
            # Auto-update variables if content changed
            if template_data.variables is None:
                update_dict["variables"] = self._extract_variables(update_dict["content"])
        
        update_dict["updated_at"] = datetime.utcnow()
        
        # Update by _id only (permissions already checked above)
        result = await self.collection.update_one(
            {"_id": template_id},
            {"$set": update_dict}
        )
        
        if result.modified_count > 0:
            logger.info(f"Updated template: {template_id}")
            updated_template = await self.collection.find_one({"_id": template_id})
            return TemplateModel(**updated_template)
        
        return None
    
    async def revert_template(self, user_id: str, template_id: str, version_number: int) -> Optional[TemplateModel]:
        """
        Revert template to a previous version.
        
        Args:
            user_id: Owner user ID
            template_id: Template ID
            version_number: Version to revert to
        
        Returns:
            Updated template model or None
        """
        current_template = await self.collection.find_one({
            "_id": template_id,
            "user_id": user_id
        })
        
        if not current_template:
            return None
        
        # Find the version in history
        version_history = current_template.get("version_history", [])
        target_version = None
        for version in version_history:
            if version["version_number"] == version_number:
                target_version = version
                break
        
        if not target_version:
            return None
        
        # Save current version to history before reverting
        current_version = TemplateVersion(
            version_number=current_template.get("current_version", 1),
            content=current_template["content"],
            created_at=current_template.get("updated_at", datetime.utcnow()),
            comment=f"Збережено перед поверненням до версії {version_number}"
        )
        version_history.append(current_version.model_dump())
        if len(version_history) > 3:
            version_history = version_history[-3:]
        
        # Revert to target version
        update_dict = {
            "content": target_version["content"],
            "version_history": version_history,
            "current_version": current_template.get("current_version", 1) + 1,
            "updated_at": datetime.utcnow()
        }
        
        result = await self.collection.update_one(
            {"_id": template_id, "user_id": user_id},
            {"$set": update_dict}
        )
        
        if result.modified_count > 0:
            logger.info(f"Reverted template {template_id} to version {version_number}")
            updated_template = await self.collection.find_one({"_id": template_id})
            return TemplateModel(**updated_template)
        
        return None
    
    async def reset_to_default(self, user_id: str, template_id: str) -> Optional[TemplateModel]:
        """
        Reset user template to system default.
        
        Args:
            user_id: Owner user ID
            template_id: User template ID
        
        Returns:
            Updated template model or None
        """
        # Get user template
        user_template = await self.collection.find_one({
            "_id": template_id,
            "user_id": user_id
        })
        
        if not user_template:
            return None
        
        # Find system default template of the same type
        default_template = await self.collection.find_one({
            "is_default": True,
            "user_id": None,
            "template_type": user_template["template_type"]
        })
        
        if not default_template:
            return None
        
        # Save current version to history
        version_history = user_template.get("version_history", [])
        current_version = TemplateVersion(
            version_number=user_template.get("current_version", 1),
            content=user_template["content"],
            created_at=user_template.get("updated_at", datetime.utcnow()),
            comment="Збережено перед скиданням на дефолтний шаблон"
        )
        version_history.append(current_version.model_dump())
        if len(version_history) > 3:
            version_history = version_history[-3:]
        
        # Reset to default
        update_dict = {
            "content": default_template["content"],
            "variables": default_template.get("variables", []),
            "version_history": version_history,
            "current_version": user_template.get("current_version", 1) + 1,
            "updated_at": datetime.utcnow()
        }
        
        result = await self.collection.update_one(
            {"_id": template_id, "user_id": user_id},
            {"$set": update_dict}
        )
        
        if result.modified_count > 0:
            logger.info(f"Reset template {template_id} to default")
            updated_template = await self.collection.find_one({"_id": template_id})
            return TemplateModel(**updated_template)
        
        return None
    
    async def delete_template(self, user_id: str, template_id: str) -> bool:
        """
        Delete template (only user templates, not system defaults).
        
        Args:
            user_id: Owner user ID
            template_id: Template ID
        
        Returns:
            True if deleted, False otherwise
        """
        result = await self.collection.delete_one({
            "_id": template_id,
            "user_id": user_id,
            "is_default": False  # Cannot delete system templates
        })
        
        if result.deleted_count > 0:
            logger.info(f"Deleted template: {template_id}")
            return True
        
        return False
    
    def _extract_variables(self, content: str) -> List[str]:
        """
        Extract template variables from content.
        Looks for {{variable_name}} patterns.
        
        Args:
            content: HTML template content
        
        Returns:
            List of unique variable names
        """
        pattern = r'\{\{\s*(\w+)\s*\}\}'
        variables = re.findall(pattern, content)
        return list(set(variables))  # Return unique variables

    
    async def initialize_default_templates(self):
        """Create default system templates if they don't exist."""
        import os
        
        # Check if default invoice template exists
        existing = await self.collection.find_one({
            "user_id": None,
            "template_type": "invoice",
            "is_default": True
        })
        
        if not existing:
            # Load default template from file
            template_path = "/app/backend/templates/default_invoice_template.html"
            if os.path.exists(template_path):
                with open(template_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                default_template = {
                    "_id": str(uuid.uuid4()),
                    "user_id": None,
                    "is_default": True,
                    "template_type": "invoice",
                    "name": "Стандартний шаблон рахунку",
                    "content": content,
                    "variables": self._extract_variables(content),
                    "version_history": [],
                    "current_version": 1,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                await self.collection.insert_one(default_template)
                logger.info("✅ Default invoice template created")
            else:
                logger.warning(f"Default template file not found: {template_path}")
        
        # Check if default act template exists
        existing_act = await self.collection.find_one({
            "user_id": None,
            "template_type": "act",
            "is_default": True
        })
        
        if not existing_act:
            # Load default act template from file
            act_template_path = "/app/backend/act_template.html"
            if os.path.exists(act_template_path):
                with open(act_template_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                default_act_template = {
                    "_id": str(uuid.uuid4()),
                    "user_id": None,
                    "is_default": True,
                    "template_type": "act",
                    "name": "Стандартний шаблон акту",
                    "content": content,
                    "variables": self._extract_variables(content),
                    "version_history": [],
                    "current_version": 1,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                await self.collection.insert_one(default_act_template)
                logger.info("✅ Default act template created")
            else:
                logger.warning(f"Default act template file not found: {act_template_path}")
        
        # Check if default waybill template exists
        existing_waybill = await self.collection.find_one({
            "user_id": None,
            "template_type": "waybill",
            "is_default": True
        })
        
        if not existing_waybill:
            # Load default waybill template from file
            waybill_template_path = "/app/backend/waybill_template.html"
            if os.path.exists(waybill_template_path):
                with open(waybill_template_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                default_waybill_template = {
                    "_id": str(uuid.uuid4()),
                    "user_id": None,
                    "is_default": True,
                    "template_type": "waybill",
                    "name": "Стандартний шаблон накладної",
                    "content": content,
                    "variables": self._extract_variables(content),
                    "version_history": [],
                    "current_version": 1,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                await self.collection.insert_one(default_waybill_template)
                logger.info("✅ Default waybill template created")
            else:
                logger.warning(f"Default waybill template file not found: {waybill_template_path}")
        
        # Check if default contract template exists (for goods)
        existing_contract_goods = await self.collection.find_one({
            "user_id": None,
            "template_type": "contract",
            "sub_type": "goods",
            "is_default": True
        })
        
        if not existing_contract_goods:
            # Load default contract goods template from file
            contract_goods_template_path = "/app/backend/templates/default_contract_goods_template.html"
            if os.path.exists(contract_goods_template_path):
                with open(contract_goods_template_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                default_contract_goods_template = {
                    "_id": str(uuid.uuid4()),
                    "user_id": None,
                    "is_default": True,
                    "template_type": "contract",
                    "sub_type": "goods",
                    "name": "Стандартний шаблон договору поставки товарів",
                    "content": content,
                    "variables": self._extract_variables(content),
                    "version_history": [],
                    "current_version": 1,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                await self.collection.insert_one(default_contract_goods_template)
                logger.info("✅ Default contract (goods) template created")
            else:
                logger.warning(f"Default contract goods template file not found: {contract_goods_template_path}")

