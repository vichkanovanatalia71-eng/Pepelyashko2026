"""Template model for document templates with versioning."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class TemplateVersion(BaseModel):
    """A version of a template."""
    version_number: int
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    comment: Optional[str] = None


class TemplateModel(BaseModel):
    """Template model for MongoDB."""
    id: str = Field(..., alias="_id")
    user_id: Optional[str] = Field(None, description="Owner user ID (None for system templates)")
    is_default: bool = Field(False, description="Is this a system default template?")
    template_type: str = Field(..., description="Type of document: invoice, act, waybill, order, contract")
    sub_type: Optional[str] = Field(None, description="Sub-type for contracts: goods, services")
    name: str = Field(..., description="Template name")
    content: str = Field(..., description="HTML template content")
    variables: List[str] = Field(default_factory=list, description="Available variables for this template")
    version_history: List[TemplateVersion] = Field(default_factory=list, description="Last 3 versions")
    current_version: int = Field(1, description="Current version number")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "template123",
                "user_id": "user123",
                "is_default": False,
                "template_type": "invoice",
                "sub_type": None,
                "name": "Мій шаблон рахунку",
                "content": "<html>...</html>",
                "variables": ["invoice_number", "date", "counterparty_name"],
                "current_version": 1
            }
        }


class TemplateCreate(BaseModel):
    """Model for creating a template."""
    template_type: str = Field(..., description="Type of document: invoice, act, waybill, order, contract")
    sub_type: Optional[str] = Field(None, description="Sub-type for contracts: goods, services")
    name: str = Field(..., description="Template name")
    content: str = Field(..., description="HTML template content")
    variables: Optional[List[str]] = Field(None, description="Available variables")
    
    class Config:
        json_schema_extra = {
            "example": {
                "template_type": "contract",
                "sub_type": "goods",
                "name": "Договір поставки товарів",
                "content": "<html><body>Договір №{{contract_number}}</body></html>",
                "variables": ["contract_number", "date", "counterparty_name"]
            }
        }


class TemplateUpdate(BaseModel):
    """Model for updating a template."""
    name: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[List[str]] = None
    comment: Optional[str] = None
