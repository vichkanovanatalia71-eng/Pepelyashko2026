"""Document service for managing all document types in MongoDB."""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import logging

from models.document import DocumentItem
from models.invoice import InvoiceModel, InvoiceCreate
from models.act import ActModel, ActCreate
from models.waybill import WaybillModel, WaybillCreate
from models.order import OrderModel, OrderCreate
from models.contract import ContractModel, ContractCreate

logger = logging.getLogger(__name__)


class DocumentServiceMongo:
    """Service for managing all document types."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.invoices = db.invoices
        self.acts = db.acts
        self.waybills = db.waybills
        self.orders = db.orders
        self.contracts = db.contracts
        self.counterparties = db.counterparties
    
    # ==================== INVOICE METHODS ====================
    
    async def create_invoice(self, user_id: str, invoice_data: InvoiceCreate, counterparty_name: str) -> InvoiceModel:
        """Create a new invoice."""
        invoice_id = str(uuid.uuid4())
        
        # Generate invoice number
        invoice_number = await self._generate_document_number(user_id, "invoice", invoice_data.counterparty_edrpou)
        
        invoice_dict = {
            "_id": invoice_id,
            "user_id": user_id,
            "number": invoice_number,
            "date": datetime.utcnow(),
            "counterparty_edrpou": invoice_data.counterparty_edrpou,
            "counterparty_name": counterparty_name,
            "items": [item.model_dump() for item in invoice_data.items],
            "total_amount": invoice_data.total_amount,
            "based_on_order": invoice_data.based_on_order,
            "pdf_path": None,
            "pdf_generated_at": None,
            "template_id": invoice_data.template_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.invoices.insert_one(invoice_dict)
        logger.info(f"Created invoice {invoice_number} for user {user_id}")
        
        return InvoiceModel(**invoice_dict)
    
    async def get_invoice_by_id(self, user_id: str, invoice_id: str) -> Optional[InvoiceModel]:
        """Get invoice by ID."""
        invoice = await self.invoices.find_one({"_id": invoice_id, "user_id": user_id})
        if invoice:
            return InvoiceModel(**invoice)
        return None
    
    async def get_invoice_by_number(self, user_id: str, invoice_number: str) -> Optional[InvoiceModel]:
        """Get invoice by number."""
        invoice = await self.invoices.find_one({"number": invoice_number, "user_id": user_id})
        if invoice:
            return InvoiceModel(**invoice)
        return None
    
    async def get_all_invoices(self, user_id: str) -> List[InvoiceModel]:
        """Get all invoices for a user."""
        cursor = self.invoices.find({"user_id": user_id}).sort("date", -1)
        invoices = []
        async for invoice in cursor:
            invoices.append(InvoiceModel(**invoice))
        return invoices
    
    async def update_invoice_pdf(self, user_id: str, invoice_number: str, pdf_path: str) -> bool:
        """Update invoice PDF path and timestamp."""
        result = await self.invoices.update_one(
            {"number": invoice_number, "user_id": user_id},
            {"$set": {
                "pdf_path": pdf_path,
                "pdf_generated_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        return result.modified_count > 0
    
    # ==================== ACT METHODS ====================
    
    async def create_act(self, user_id: str, act_data: ActCreate, counterparty_name: str) -> ActModel:
        """Create a new act."""
        act_id = str(uuid.uuid4())
        
        # Generate act number
        act_number = await self._generate_document_number(user_id, "act", act_data.counterparty_edrpou)
        
        act_dict = {
            "_id": act_id,
            "user_id": user_id,
            "number": act_number,
            "date": datetime.utcnow(),
            "counterparty_edrpou": act_data.counterparty_edrpou,
            "counterparty_name": counterparty_name,
            "items": [item.model_dump() for item in act_data.items],
            "total_amount": act_data.total_amount,
            "based_on_order": act_data.based_on_order,
            "based_on_contract": act_data.based_on_contract,
            "pdf_path": None,
            "pdf_generated_at": None,
            "template_id": act_data.template_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.acts.insert_one(act_dict)
        logger.info(f"Created act {act_number} for user {user_id}")
        
        return ActModel(**act_dict)
    
    async def get_act_by_number(self, user_id: str, act_number: str) -> Optional[ActModel]:
        """Get act by number."""
        act = await self.acts.find_one({"number": act_number, "user_id": user_id})
        if act:
            return ActModel(**act)
        return None
    
    async def get_all_acts(self, user_id: str) -> List[ActModel]:
        """Get all acts for a user."""
        cursor = self.acts.find({"user_id": user_id}).sort("date", -1)
        acts = []
        async for act in cursor:
            acts.append(ActModel(**act))
        return acts
    
    async def update_act_pdf(self, user_id: str, act_number: str, pdf_path: str) -> bool:
        """Update act PDF path and timestamp."""
        result = await self.acts.update_one(
            {"number": act_number, "user_id": user_id},
            {"$set": {
                "pdf_path": pdf_path,
                "pdf_generated_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        return result.modified_count > 0
    
    # ==================== WAYBILL METHODS ====================
    
    async def create_waybill(self, user_id: str, waybill_data: WaybillCreate, counterparty_name: str) -> WaybillModel:
        """Create a new waybill."""
        waybill_id = str(uuid.uuid4())
        
        # Generate waybill number
        waybill_number = await self._generate_document_number(user_id, "waybill", waybill_data.counterparty_edrpou)
        
        waybill_dict = {
            "_id": waybill_id,
            "user_id": user_id,
            "number": waybill_number,
            "date": datetime.utcnow(),
            "counterparty_edrpou": waybill_data.counterparty_edrpou,
            "counterparty_name": counterparty_name,
            "items": [item.model_dump() for item in waybill_data.items],
            "total_amount": waybill_data.total_amount,
            "based_on_order": waybill_data.based_on_order,
            "pdf_path": None,
            "pdf_generated_at": None,
            "template_id": waybill_data.template_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.waybills.insert_one(waybill_dict)
        logger.info(f"Created waybill {waybill_number} for user {user_id}")
        
        return WaybillModel(**waybill_dict)
    
    async def get_waybill_by_number(self, user_id: str, waybill_number: str) -> Optional[WaybillModel]:
        """Get waybill by number."""
        waybill = await self.waybills.find_one({"number": waybill_number, "user_id": user_id})
        if waybill:
            return WaybillModel(**waybill)
        return None
    
    async def get_all_waybills(self, user_id: str) -> List[WaybillModel]:
        """Get all waybills for a user."""
        cursor = self.waybills.find({"user_id": user_id}).sort("date", -1)
        waybills = []
        async for waybill in cursor:
            waybills.append(WaybillModel(**waybill))
        return waybills
    
    async def update_waybill_pdf(self, user_id: str, waybill_number: str, pdf_path: str) -> bool:
        """Update waybill PDF path and timestamp."""
        result = await self.waybills.update_one(
            {"number": waybill_number, "user_id": user_id},
            {"$set": {
                "pdf_path": pdf_path,
                "pdf_generated_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        return result.modified_count > 0
    
    # ==================== ORDER METHODS ====================
    
    async def create_order(self, user_id: str, order_data: OrderCreate, counterparty_name: str) -> OrderModel:
        """Create a new order."""
        order_id = str(uuid.uuid4())
        
        # Generate order number (simple sequential)
        existing_count = await self.orders.count_documents({"user_id": user_id})
        order_number = f"{existing_count + 1:04d}"
        
        order_dict = {
            "_id": order_id,
            "user_id": user_id,
            "number": order_number,
            "date": datetime.utcnow(),
            "counterparty_edrpou": order_data.counterparty_edrpou,
            "counterparty_name": counterparty_name,
            "items": [item.model_dump() for item in order_data.items],
            "total_amount": order_data.total_amount,
            "based_on_order": None,
            "pdf_path": None,
            "pdf_generated_at": None,
            "template_id": order_data.template_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.orders.insert_one(order_dict)
        logger.info(f"Created order {order_number} for user {user_id}")
        
        return OrderModel(**order_dict)
    
    async def get_order_by_number(self, user_id: str, order_number: str) -> Optional[OrderModel]:
        """Get order by number."""
        order = await self.orders.find_one({"number": order_number, "user_id": user_id})
        if order:
            return OrderModel(**order)
        return None
    
    async def get_all_orders(self, user_id: str, edrpou_filter: Optional[str] = None, is_paid_filter: Optional[bool] = None) -> List[OrderModel]:
        """Get all orders for a user with optional filters."""
        query = {"user_id": user_id}
        
        # Add EDRPOU filter if provided
        if edrpou_filter:
            query["counterparty_edrpou"] = edrpou_filter
        
        # Add payment status filter if provided
        if is_paid_filter is not None:
            query["is_paid"] = is_paid_filter
        
        cursor = self.orders.find(query).sort("date", -1)
        orders = []
        async for order in cursor:
            orders.append(OrderModel(**order))
        return orders
    
    async def update_order_pdf(self, user_id: str, order_number: str, pdf_path: str) -> bool:
        """Update order PDF path and timestamp."""
        result = await self.orders.update_one(
            {"number": order_number, "user_id": user_id},
            {"$set": {
                "pdf_path": pdf_path,
                "pdf_generated_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        return result.modified_count > 0
    
    async def get_order_related_documents(self, user_id: str, order_number: str) -> Dict[str, List[Any]]:
        """Get all documents created from this order."""
        related = {
            "invoices": [],
            "acts": [],
            "waybills": [],
            "contracts": []
        }
        
        # Get related invoices
        cursor = self.invoices.find({"user_id": user_id, "based_on_order": order_number})
        async for doc in cursor:
            related["invoices"].append(InvoiceModel(**doc))
        
        # Get related acts
        cursor = self.acts.find({"user_id": user_id, "based_on_order": order_number})
        async for doc in cursor:
            related["acts"].append(ActModel(**doc))
        
        # Get related waybills
        cursor = self.waybills.find({"user_id": user_id, "based_on_order": order_number})
        async for doc in cursor:
            related["waybills"].append(WaybillModel(**doc))
        
        # Get related contracts
        cursor = self.contracts.find({"user_id": user_id, "based_on_order": order_number})
        async for doc in cursor:
            related["contracts"].append(ContractModel(**doc))
        
        return related
    
    # ==================== CONTRACT METHODS ====================
    
    async def create_contract(self, user_id: str, contract_data: ContractCreate, counterparty_name: str) -> ContractModel:
        """Create a new contract."""
        contract_id = str(uuid.uuid4())
        
        # Generate contract number (simple sequential)
        existing_count = await self.contracts.count_documents({"user_id": user_id})
        contract_number = f"{existing_count + 1:04d}"
        
        contract_dict = {
            "_id": contract_id,
            "user_id": user_id,
            "number": contract_number,
            "date": datetime.utcnow(),
            "counterparty_edrpou": contract_data.counterparty_edrpou,
            "counterparty_name": counterparty_name,
            "contract_type": contract_data.contract_type,
            "subject": contract_data.subject,
            "amount": contract_data.amount,
            "based_on_order": contract_data.based_on_order,
            "pdf_path": None,
            "pdf_generated_at": None,
            "template_id": contract_data.template_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.contracts.insert_one(contract_dict)
        logger.info(f"Created contract {contract_number} for user {user_id}")
        
        return ContractModel(**contract_dict)
    
    async def get_contract_by_id(self, user_id: str, contract_id: str) -> Optional[ContractModel]:
        """Get contract by ID."""
        contract = await self.contracts.find_one({"_id": contract_id, "user_id": user_id})
        if contract:
            return ContractModel(**contract)
        return None
    
    async def get_contract_by_number(self, user_id: str, contract_number: str) -> Optional[ContractModel]:
        """Get contract by number."""
        contract = await self.contracts.find_one({"number": contract_number, "user_id": user_id})
        if contract:
            return ContractModel(**contract)
        return None
    
    async def get_all_contracts(self, user_id: str) -> List[ContractModel]:
        """Get all contracts for a user."""
        cursor = self.contracts.find({"user_id": user_id}).sort("date", -1)
        contracts = []
        async for contract in cursor:
            contracts.append(ContractModel(**contract))
        return contracts
    
    async def update_contract_pdf(self, user_id: str, contract_number: str, pdf_path: str) -> bool:
        """Update contract PDF path and timestamp."""
        result = await self.contracts.update_one(
            {"number": contract_number, "user_id": user_id},
            {"$set": {
                "pdf_path": pdf_path,
                "pdf_generated_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        return result.modified_count > 0
    
    # ==================== HELPER METHODS ====================
    
    async def _generate_document_number(self, user_id: str, doc_type: str, counterparty_edrpou: str) -> str:
        """
        Generate document number based on counterparty EDRPOU and sequential count.
        Format: XXXX-N where XXXX is middle 4 digits of EDRPOU, N is sequential number.
        """
        # Get 4 middle digits from EDRPOU
        edrpou_str = str(counterparty_edrpou)
        if len(edrpou_str) >= 6:
            edrpou_middle = edrpou_str[2:6]
        else:
            edrpou_middle = edrpou_str[:4].zfill(4)
        
        # Count existing documents for this counterparty
        collection_map = {
            "invoice": self.invoices,
            "act": self.acts,
            "waybill": self.waybills
        }
        
        collection = collection_map.get(doc_type)
        if collection is None:
            return f"{edrpou_middle}-1"
        
        count = await collection.count_documents({
            "user_id": user_id,
            "counterparty_edrpou": counterparty_edrpou
        })
        
        return f"{edrpou_middle}-{count + 1}"
    
    async def get_counterparty_documents(self, user_id: str, counterparty_edrpou: str) -> Dict[str, List[Any]]:
        """Get all documents for a specific counterparty."""
        documents = {
            "orders": [],
            "invoices": [],
            "acts": [],
            "waybills": [],
            "contracts": []
        }
        
        # Get orders
        cursor = self.orders.find({"user_id": user_id, "counterparty_edrpou": counterparty_edrpou})
        async for doc in cursor:
            documents["orders"].append(OrderModel(**doc))
        
        # Get invoices
        cursor = self.invoices.find({"user_id": user_id, "counterparty_edrpou": counterparty_edrpou})
        async for doc in cursor:
            documents["invoices"].append(InvoiceModel(**doc))
        
        # Get acts
        cursor = self.acts.find({"user_id": user_id, "counterparty_edrpou": counterparty_edrpou})
        async for doc in cursor:
            documents["acts"].append(ActModel(**doc))
        
        # Get waybills
        cursor = self.waybills.find({"user_id": user_id, "counterparty_edrpou": counterparty_edrpou})
        async for doc in cursor:
            documents["waybills"].append(WaybillModel(**doc))
        
        # Get contracts
        cursor = self.contracts.find({"user_id": user_id, "counterparty_edrpou": counterparty_edrpou})
        async for doc in cursor:
            documents["contracts"].append(ContractModel(**doc))
        
        return documents
