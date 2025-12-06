"""MongoDB models for the document management system."""

from .user import UserModel, UserInDB, UserCreate, UserUpdate
from .counterparty import CounterpartyModel, CounterpartyCreate, CounterpartyUpdate
from .template import TemplateModel, TemplateCreate, TemplateUpdate, TemplateVersion
from .document import DocumentModel, DocumentItem
from .invoice import InvoiceModel, InvoiceCreate
from .act import ActModel, ActCreate
from .waybill import WaybillModel, WaybillCreate
from .order import OrderModel, OrderCreate
from .contract import ContractModel, ContractCreate

__all__ = [
    "UserModel",
    "UserInDB",
    "UserCreate",
    "UserUpdate",
    "CounterpartyModel",
    "CounterpartyCreate",
    "CounterpartyUpdate",
    "TemplateModel",
    "TemplateCreate",
    "TemplateUpdate",
    "TemplateVersion",
    "DocumentModel",
    "DocumentItem",
    "InvoiceModel",
    "InvoiceCreate",
    "ActModel",
    "ActCreate",
    "WaybillModel",
    "WaybillCreate",
    "OrderModel",
    "OrderCreate",
    "ContractModel",
    "ContractCreate",
]
