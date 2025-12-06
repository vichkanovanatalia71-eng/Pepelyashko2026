"""Document management routes for all document types."""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import FileResponse
from typing import List
from pathlib import Path
from datetime import datetime, timedelta
import logging

from models.invoice import InvoiceModel, InvoiceCreate
from models.act import ActModel, ActCreate
from models.waybill import WaybillModel, WaybillCreate
from models.order import OrderModel, OrderCreate
from models.contract import ContractModel, ContractCreate
from services.document_service_mongo import DocumentServiceMongo
from services.counterparty_service import CounterpartyService
from auth.auth_middleware import get_current_user

router = APIRouter(tags=["documents"])
logger = logging.getLogger(__name__)

# ==================== INVOICE ROUTES ====================

@router.post("/invoices", response_model=InvoiceModel, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new invoice."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    counterparty_service = CounterpartyService(database)
    
    try:
        # Get counterparty to get name
        counterparty = await counterparty_service.get_counterparty_by_edrpou(
            user_id=current_user["_id"],
            edrpou=invoice_data.counterparty_edrpou
        )
        
        if not counterparty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Контрагента з ЄДРПОУ {invoice_data.counterparty_edrpou} не знайдено"
            )
        
        invoice = await document_service.create_invoice(
            user_id=current_user["_id"],
            invoice_data=invoice_data,
            counterparty_name=counterparty.representative_name
        )
        
        logger.info(f"Invoice created: {invoice.number} by user {current_user['_id']}")
        return invoice
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при створенні рахунку"
        )


@router.get("/invoices", response_model=List[InvoiceModel])
async def get_all_invoices(
    current_user: dict = Depends(get_current_user)
):
    """Get all invoices for the current user."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    
    try:
        invoices = await document_service.get_all_invoices(
            user_id=current_user["_id"]
        )
        return invoices
    except Exception as e:
        logger.error(f"Error getting invoices: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні рахунків"
        )


@router.get("/invoices/{invoice_number}", response_model=InvoiceModel)
async def get_invoice(
    invoice_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Get invoice by number."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    
    try:
        invoice = await document_service.get_invoice_by_number(
            user_id=current_user["_id"],
            invoice_number=invoice_number
        )
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Рахунок {invoice_number} не знайдено"
            )
        
        return invoice
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні рахунку"
        )


@router.get("/invoices/pdf/{invoice_number}")
async def get_invoice_pdf(
    invoice_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Serve invoice PDF file."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    
    try:
        invoice = await document_service.get_invoice_by_number(
            user_id=current_user["_id"],
            invoice_number=invoice_number
        )
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Рахунок {invoice_number} не знайдено"
            )
        
        if not invoice.pdf_path or not Path(invoice.pdf_path).exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"PDF для рахунку {invoice_number} не знайдено"
            )
        
        return FileResponse(
            path=invoice.pdf_path,
            media_type='application/pdf',
            filename=Path(invoice.pdf_path).name
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving invoice PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні PDF"
        )


# ==================== ACT ROUTES ====================

@router.post("/acts", response_model=ActModel, status_code=status.HTTP_201_CREATED)
async def create_act(
    act_data: ActCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new act."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    counterparty_service = CounterpartyService(database)
    
    try:
        counterparty = await counterparty_service.get_counterparty_by_edrpou(
            user_id=current_user["_id"],
            edrpou=act_data.counterparty_edrpou
        )
        
        if not counterparty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Контрагента з ЄДРПОУ {act_data.counterparty_edrpou} не знайдено"
            )
        
        act = await document_service.create_act(
            user_id=current_user["_id"],
            act_data=act_data,
            counterparty_name=counterparty.representative_name
        )
        
        logger.info(f"Act created: {act.number} by user {current_user['_id']}")
        return act
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating act: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при створенні акту"
        )


@router.get("/acts", response_model=List[ActModel])
async def get_all_acts(
    current_user: dict = Depends(get_current_user)
):
    """Get all acts for the current user."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    
    try:
        acts = await document_service.get_all_acts(
            user_id=current_user["_id"]
        )
        return acts
    except Exception as e:
        logger.error(f"Error getting acts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні актів"
        )


@router.get("/acts/{act_number}", response_model=ActModel)
async def get_act(
    act_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Get act by number."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    
    try:
        act = await document_service.get_act_by_number(
            user_id=current_user["_id"],
            act_number=act_number
        )
        
        if not act:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Акт {act_number} не знайдено"
            )
        
        return act
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting act: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні акту"
        )


# ==================== WAYBILL ROUTES ====================

@router.post("/waybills", response_model=WaybillModel, status_code=status.HTTP_201_CREATED)
async def create_waybill(
    waybill_data: WaybillCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new waybill."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    counterparty_service = CounterpartyService(database)
    
    try:
        counterparty = await counterparty_service.get_counterparty_by_edrpou(
            user_id=current_user["_id"],
            edrpou=waybill_data.counterparty_edrpou
        )
        
        if not counterparty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Контрагента з ЄДРПОУ {waybill_data.counterparty_edrpou} не знайдено"
            )
        
        waybill = await document_service.create_waybill(
            user_id=current_user["_id"],
            waybill_data=waybill_data,
            counterparty_name=counterparty.representative_name
        )
        
        logger.info(f"Waybill created: {waybill.number} by user {current_user['_id']}")
        return waybill
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating waybill: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при створенні накладної"
        )


@router.get("/waybills", response_model=List[WaybillModel])
async def get_all_waybills(
    current_user: dict = Depends(get_current_user)
):
    """Get all waybills for the current user."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    
    try:
        waybills = await document_service.get_all_waybills(
            user_id=current_user["_id"]
        )
        return waybills
    except Exception as e:
        logger.error(f"Error getting waybills: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні накладних"
        )


# ==================== ORDER ROUTES ====================

@router.post("/orders", response_model=OrderModel, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new order."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    counterparty_service = CounterpartyService(database)
    
    try:
        counterparty = await counterparty_service.get_counterparty_by_edrpou(
            user_id=current_user["_id"],
            edrpou=order_data.counterparty_edrpou
        )
        
        if not counterparty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Контрагента з ЄДРПОУ {order_data.counterparty_edrpou} не знайдено"
            )
        
        order = await document_service.create_order(
            user_id=current_user["_id"],
            order_data=order_data,
            counterparty_name=counterparty.representative_name
        )
        
        logger.info(f"Order created: {order.number} by user {current_user['_id']}")
        return order
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при створенні замовлення"
        )


@router.get("/orders", response_model=List[OrderModel])
async def get_all_orders(
    current_user: dict = Depends(get_current_user)
):
    """Get all orders for the current user."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    
    try:
        orders = await document_service.get_all_orders(
            user_id=current_user["_id"]
        )
        return orders
    except Exception as e:
        logger.error(f"Error getting orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні замовлень"
        )


@router.get("/orders/{order_number}", response_model=OrderModel)
async def get_order(
    order_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Get order by number."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    
    try:
        order = await document_service.get_order_by_number(
            user_id=current_user["_id"],
            order_number=order_number
        )
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Замовлення {order_number} не знайдено"
            )
        
        return order
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні замовлення"
        )


@router.get("/orders/{order_number}/related-documents")
async def get_order_related_documents(
    order_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all documents created from this order."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    
    try:
        related = await document_service.get_order_related_documents(
            user_id=current_user["_id"],
            order_number=order_number
        )
        return related
    except Exception as e:
        logger.error(f"Error getting related documents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні пов'язаних документів"
        )


@router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an order."""
    from server import db as database
    from bson import ObjectId
    
    try:
        result = await database.orders.delete_one({
            "_id": ObjectId(order_id),
            "user_id": current_user["_id"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Замовлення не знайдено"
            )
        
        logger.info(f"Order deleted: {order_id} by user {current_user['_id']}")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при видаленні замовлення"
        )


@router.get("/orders/{order_id}/pdf")
async def get_order_pdf(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate and return order PDF."""
    from server import db as database
    from bson import ObjectId
    from services.order_pdf_service import OrderPDFService
    from urllib.parse import quote
    
    try:
        # Get order from database
        order = await database.orders.find_one({
            "_id": ObjectId(order_id),
            "user_id": current_user["_id"]
        }, {"_id": 0})
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Замовлення не знайдено"
            )
        
        # Generate PDF
        pdf_service = OrderPDFService()
        pdf_path = pdf_service.generate_pdf(order)
        
        # Generate filename with proper encoding
        filename = f"Замовлення_{order.get('number', 'unknown')}.pdf"
        encoded_filename = quote(filename.encode('utf-8'))
        
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            headers={
                'Content-Disposition': f"attachment; filename*=UTF-8''{encoded_filename}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating order PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при генерації PDF"
        )


@router.post("/orders/{order_id}/send-email")
async def send_order_email(
    order_id: str,
    email_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send order PDF to email."""
    from server import db as database
    from bson import ObjectId
    from services.order_pdf_service import OrderPDFService
    from services.email_service import EmailService
    
    try:
        # Get order from database
        order = await database.orders.find_one({
            "_id": ObjectId(order_id),
            "user_id": current_user["_id"]
        }, {"_id": 0})
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Замовлення не знайдено"
            )
        
        recipient_email = email_data.get('email')
        if not recipient_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email адреса не вказана"
            )
        
        # Generate PDF
        pdf_service = OrderPDFService()
        pdf_path = pdf_service.generate_pdf(order)
        
        # Send email
        email_service = EmailService()
        order_number = order.get('number', 'unknown')
        subject = f"Замовлення №{order_number}"
        body = f"""
Доброго дня!

Надсилаємо Вам замовлення №{order_number}.

Контрагент: {order.get('counterparty_name', '—')}
Загальна сума: {order.get('total_amount', 0):.2f} грн

З повагою,
Система Управління Документами
        """
        
        email_service.send_email_with_attachment(
            to_email=recipient_email,
            subject=subject,
            body=body,
            attachment_path=pdf_path,
            attachment_name=f"Замовлення_{order_number}.pdf"
        )
        
        logger.info(f"Order PDF sent to {recipient_email} by user {current_user['_id']}")
        return {"message": f"PDF відправлено на {recipient_email}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending order email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при відправці email"
        )


# ==================== CONTRACT ROUTES ====================

@router.post("/contracts", response_model=ContractModel, status_code=status.HTTP_201_CREATED)
async def create_contract(
    contract_data: ContractCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new contract."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    counterparty_service = CounterpartyService(database)
    
    try:
        counterparty = await counterparty_service.get_counterparty_by_edrpou(
            user_id=current_user["_id"],
            edrpou=contract_data.counterparty_edrpou
        )
        
        if not counterparty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Контрагента з ЄДРПОУ {contract_data.counterparty_edrpou} не знайдено"
            )
        
        contract = await document_service.create_contract(
            user_id=current_user["_id"],
            contract_data=contract_data,
            counterparty_name=counterparty.representative_name
        )
        
        logger.info(f"Contract created: {contract.number} by user {current_user['_id']}")
        return contract
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating contract: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при створенні договору"
        )


@router.get("/contracts", response_model=List[ContractModel])
async def get_all_contracts(
    current_user: dict = Depends(get_current_user)
):
    """Get all contracts for the current user."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    
    try:
        contracts = await document_service.get_all_contracts(
            user_id=current_user["_id"]
        )
        return contracts
    except Exception as e:
        logger.error(f"Error getting contracts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні договорів"
        )
