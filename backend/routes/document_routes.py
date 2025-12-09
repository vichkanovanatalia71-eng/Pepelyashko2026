"""Document management routes for all document types."""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import FileResponse
from typing import List, Optional
from pathlib import Path
from datetime import datetime, timedelta
import logging
import os

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
    template_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate and return invoice PDF using template."""
    from server import db as database
    from services.pdf_service_with_templates import PDFServiceWithTemplates
    from urllib.parse import quote
    
    try:
        # Get invoice from database
        invoice = await database.invoices.find_one({
            "number": invoice_number,
            "user_id": current_user["_id"]
        }, {"_id": 0})
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Рахунок {invoice_number} не знайдено"
            )
        
        # Get counterparty details
        counterparty_edrpou = invoice.get('counterparty_edrpou')
        counterparty = {}
        if counterparty_edrpou:
            cp = await database.counterparties.find_one({
                "edrpou": counterparty_edrpou,
                "user_id": current_user["_id"]
            }, {"_id": 0})
            
            if cp:
                counterparty = cp
        
        # Get supplier (current user) details
        user = await database.users.find_one({
            "_id": current_user["_id"]
        }, {"hashed_password": 0})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Generate PDF using template
        pdf_service = PDFServiceWithTemplates(database)
        pdf_path = await pdf_service.generate_invoice_pdf(
            invoice, 
            user, 
            counterparty,
            template_id
        )
        
        # Generate filename with proper encoding
        filename = f"Рахунок_{invoice_number}.pdf"
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
        logger.error(f"Error generating invoice PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при генерації PDF"
        )


@router.put("/invoices/{invoice_number}")
async def update_invoice(
    invoice_number: str,
    invoice_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update an invoice."""
    from server import db as database
    from datetime import datetime
    
    try:
        # Log incoming data for debugging
        logger.info(f"UPDATE INVOICE {invoice_number}: Received data keys: {list(invoice_data.keys())}")
        logger.info(f"UPDATE INVOICE {invoice_number}: Items in request: {invoice_data.get('items', 'NOT PROVIDED')}")
        logger.info(f"UPDATE INVOICE {invoice_number}: Total in request: {invoice_data.get('total_amount', 'NOT PROVIDED')}")
        
        # Get existing invoice
        existing_invoice = await database.invoices.find_one({
            "number": invoice_number,
            "user_id": current_user["_id"]
        })
        
        if not existing_invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Рахунок не знайдено"
            )
        
        logger.info(f"UPDATE INVOICE {invoice_number}: Existing items count: {len(existing_invoice.get('items', []))}")
        
        # Prepare update data - ensure numeric values are stored as numbers
        # CRITICAL FIX: If items array is empty in request, keep existing items
        if "items" in invoice_data and len(invoice_data["items"]) > 0:
            items = invoice_data["items"]
            logger.info(f"UPDATE INVOICE {invoice_number}: Using items from request (count: {len(items)})")
        else:
            items = existing_invoice.get("items", [])
            logger.info(f"UPDATE INVOICE {invoice_number}: Using existing items (count: {len(items)}) - request had empty items")
        
        # Convert string values to numbers in items
        if items:
            for item in items:
                if 'quantity' in item:
                    item['quantity'] = float(item['quantity'])
                if 'price' in item:
                    item['price'] = float(item['price'])
                if 'amount' in item:
                    item['amount'] = float(item['amount'])
        
        # Ensure date is not empty
        date_value = invoice_data.get("date", existing_invoice.get("date"))
        if not date_value or date_value == "":
            date_value = existing_invoice.get("date")
        
        # Get total_amount from request if provided AND non-zero, otherwise keep existing
        if "total_amount" in invoice_data and invoice_data["total_amount"] > 0:
            total_amount = invoice_data["total_amount"]
        else:
            total_amount = existing_invoice.get("total_amount", 0)
        
        update_data = {
            "date": date_value,
            "counterparty_edrpou": invoice_data.get("counterparty_edrpou", existing_invoice.get("counterparty_edrpou")),
            "counterparty_name": invoice_data.get("counterparty_name", existing_invoice.get("counterparty_name")),
            "items": items,
            "total_amount": float(total_amount) if total_amount else 0,
            "updated_at": datetime.utcnow()
        }
        
        # Update invoice
        result = await database.invoices.update_one(
            {"number": invoice_number, "user_id": current_user["_id"]},
            {"$set": update_data}
        )
        
        if result.modified_count == 0 and result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Рахунок не знайдено"
            )
        
        # Get updated invoice
        updated_invoice = await database.invoices.find_one(
            {"number": invoice_number, "user_id": current_user["_id"]},
            {"_id": 0}
        )
        
        logger.info(f"Invoice updated: {invoice_number} by user {current_user['_id']}")
        return updated_invoice
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при оновленні рахунку"
        )


@router.delete("/invoices/{invoice_number}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an invoice."""
    from server import db as database
    
    try:
        result = await database.invoices.delete_one({
            "number": invoice_number,
            "user_id": current_user["_id"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Рахунок не знайдено"
            )
        
        logger.info(f"Invoice deleted: {invoice_number} by user {current_user['_id']}")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при видаленні рахунку"
        )


@router.post("/invoices/{invoice_number}/send-email")
async def send_invoice_email(
    invoice_number: str,
    email_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send invoice PDF to email using template."""
    from server import db as database
    from services.pdf_service_with_templates import PDFServiceWithTemplates
    from services.email_service import EmailService
    
    try:
        # Get invoice from database
        invoice = await database.invoices.find_one({
            "number": invoice_number,
            "user_id": current_user["_id"]
        }, {"_id": 0})
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Рахунок не знайдено"
            )
        
        recipient_email = email_data.get('email')
        if not recipient_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email адреса не вказана"
            )
        
        # Get counterparty details
        counterparty_edrpou = invoice.get('counterparty_edrpou')
        counterparty = {}
        if counterparty_edrpou:
            cp = await database.counterparties.find_one({
                "edrpou": counterparty_edrpou,
                "user_id": current_user["_id"]
            }, {"_id": 0})
            
            if cp:
                counterparty = cp
        
        # Get supplier (user) details
        user = await database.users.find_one({
            "_id": current_user["_id"]
        }, {"_id": 0, "hashed_password": 0})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Generate PDF using NEW template service
        pdf_service = PDFServiceWithTemplates(database)
        pdf_path = await pdf_service.generate_invoice_pdf(
            invoice, 
            user, 
            counterparty
        )
        
        # Send email
        email_service = EmailService()
        invoice_date = invoice.get('date', '')
        
        # Convert date to string if it's a datetime object
        from datetime import datetime
        if isinstance(invoice_date, datetime):
            invoice_date = invoice_date.isoformat()
        else:
            invoice_date = str(invoice_date)
        
        # Get company logo path if available
        company_logo_url = None
        company_logo_path = None
        if user.get('company_logo'):
            # Get the actual file path for embedding
            logo_relative_path = user['company_logo']
            company_logo_path = f"/app/backend/{logo_relative_path}"
            company_logo_url = "embedded"  # Flag to show logo in template
        
        # Get company name
        company_name = user.get('company_name') or user.get('representative_name') or 'Наша компанія'
        
        email_service.send_invoice_document(
            to_email=recipient_email,
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            counterparty_name=invoice.get('counterparty_name', '—'),
            total_amount=invoice.get('total_amount', 0),
            pdf_path=pdf_path,
            company_logo_url=company_logo_url,
            company_logo_path=company_logo_path,
            company_name=company_name
        )
        
        logger.info(f"Invoice PDF sent to {recipient_email} by user {current_user['_id']}")
        return {"message": f"PDF відправлено на {recipient_email}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending invoice email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при відправці email"
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


@router.get("/acts/pdf/{act_number}")
async def get_act_pdf(
    act_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate and return act PDF."""
    from server import db as database
    from services.act_pdf_service import ActPDFService
    from urllib.parse import quote
    
    try:
        # Get act from database
        act = await database.acts.find_one({
            "number": act_number,
            "user_id": current_user["_id"]
        }, {"_id": 0})
        
        if not act:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Акт {act_number} не знайдено"
            )
        
        # Get counterparty details
        counterparty_edrpou = act.get('counterparty_edrpou')
        if counterparty_edrpou:
            counterparty = await database.counterparties.find_one({
                "edrpou": counterparty_edrpou,
                "user_id": current_user["_id"]
            }, {"_id": 0})
            
            if counterparty:
                act['counterparty_details'] = counterparty
        
        # Get supplier details
        user = await database.users.find_one({
            "_id": current_user["_id"]
        }, {"_id": 0, "hashed_password": 0})
        
        if user:
            act['supplier_details'] = user
        
        # Generate PDF
        pdf_service = ActPDFService()
        pdf_path = pdf_service.generate_pdf(act)
        
        filename = f"Акт_{act_number}.pdf"
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
        logger.error(f"Error generating act PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при генерації PDF"
        )


@router.put("/acts/{act_number}")
async def update_act(
    act_number: str,
    act_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update an act."""
    from server import db as database
    from datetime import datetime
    
    try:
        existing_act = await database.acts.find_one({
            "number": act_number,
            "user_id": current_user["_id"]
        })
        
        if not existing_act:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Акт не знайдено"
            )
        
        items = act_data.get("items", existing_act.get("items"))
        
        if items:
            for item in items:
                if 'quantity' in item:
                    item['quantity'] = float(item['quantity'])
                if 'price' in item:
                    item['price'] = float(item['price'])
                if 'amount' in item:
                    item['amount'] = float(item['amount'])
        
        update_data = {
            "date": act_data.get("date", existing_act.get("date")),
            "counterparty_edrpou": act_data.get("counterparty_edrpou", existing_act.get("counterparty_edrpou")),
            "counterparty_name": act_data.get("counterparty_name", existing_act.get("counterparty_name")),
            "items": items,
            "total_amount": float(act_data.get("total_amount", existing_act.get("total_amount"))),
            "updated_at": datetime.utcnow()
        }
        
        result = await database.acts.update_one(
            {"number": act_number, "user_id": current_user["_id"]},
            {"$set": update_data}
        )
        
        if result.modified_count == 0 and result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Акт не знайдено"
            )
        
        updated_act = await database.acts.find_one(
            {"number": act_number, "user_id": current_user["_id"]},
            {"_id": 0}
        )
        
        logger.info(f"Act updated: {act_number} by user {current_user['_id']}")
        return updated_act
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating act: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при оновленні акту"
        )


@router.delete("/acts/{act_number}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_act(
    act_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an act."""
    from server import db as database
    
    try:
        result = await database.acts.delete_one({
            "number": act_number,
            "user_id": current_user["_id"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Акт не знайдено"
            )
        
        logger.info(f"Act deleted: {act_number} by user {current_user['_id']}")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting act: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при видаленні акту"
        )


@router.post("/acts/{act_number}/send-email")
async def send_act_email(
    act_number: str,
    email_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send act PDF to email."""
    from server import db as database
    from services.act_pdf_service import ActPDFService
    from services.email_service import EmailService
    
    try:
        act = await database.acts.find_one({
            "number": act_number,
            "user_id": current_user["_id"]
        }, {"_id": 0})
        
        if not act:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Акт не знайдено"
            )
        
        recipient_email = email_data.get('email')
        if not recipient_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email адреса не вказана"
            )
        
        counterparty_edrpou = act.get('counterparty_edrpou')
        if counterparty_edrpou:
            counterparty = await database.counterparties.find_one({
                "edrpou": counterparty_edrpou,
                "user_id": current_user["_id"]
            }, {"_id": 0})
            
            if counterparty:
                act['counterparty_details'] = counterparty
        
        user = await database.users.find_one({
            "_id": current_user["_id"]
        }, {"_id": 0, "hashed_password": 0})
        
        if user:
            act['supplier_details'] = user
        
        pdf_service = ActPDFService()
        pdf_path = pdf_service.generate_pdf(act)
        
        email_service = EmailService()
        act_date = act.get('date', '')
        
        from datetime import datetime
        if isinstance(act_date, datetime):
            act_date = act_date.isoformat()
        else:
            act_date = str(act_date)
        
        # Prepare company logo
        company_logo_url = None
        company_logo_path = None
        if user and user.get('company_logo'):
            logo_relative_path = user['company_logo']
            company_logo_path = f"/app/backend/{logo_relative_path}"
            company_logo_url = "embedded"
        
        email_service.send_act_document(
            to_email=recipient_email,
            act_number=act_number,
            act_date=act_date,
            counterparty_name=act.get('counterparty_name', '—'),
            total_amount=act.get('total_amount', 0),
            pdf_path=pdf_path,
            company_name=user.get('representative_name') or user.get('company_name', 'Компанія') if user else 'Компанія',
            company_logo_url=company_logo_url,
            company_logo_path=company_logo_path
        )
        
        logger.info(f"Act PDF sent to {recipient_email} by user {current_user['_id']}")
        return {"message": f"PDF відправлено на {recipient_email}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending act email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при відправці email"
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


@router.get("/waybills/{waybill_number}")
async def get_waybill(
    waybill_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Get waybill by number."""
    from server import db as database
    
    try:
        waybill = await database.waybills.find_one({
            "number": waybill_number,
            "user_id": current_user["_id"]
        }, {"_id": 0})
        
        if not waybill:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Накладну {waybill_number} не знайдено"
            )
        
        return waybill
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting waybill: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні накладної"
        )


@router.get("/waybills/pdf/{waybill_number}")
async def get_waybill_pdf(
    waybill_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate and return waybill PDF."""
    from server import db as database
    from services.waybill_pdf_service import WaybillPDFService
    from urllib.parse import quote
    
    try:
        waybill = await database.waybills.find_one({
            "number": waybill_number,
            "user_id": current_user["_id"]
        }, {"_id": 0})
        
        if not waybill:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Накладну {waybill_number} не знайдено"
            )
        
        counterparty_edrpou = waybill.get('counterparty_edrpou')
        if counterparty_edrpou:
            counterparty = await database.counterparties.find_one({
                "edrpou": counterparty_edrpou,
                "user_id": current_user["_id"]
            }, {"_id": 0})
            
            if counterparty:
                waybill['counterparty_details'] = counterparty
        
        user = await database.users.find_one({
            "_id": current_user["_id"]
        }, {"_id": 0, "hashed_password": 0})
        
        if user:
            waybill['supplier_details'] = user
        
        pdf_service = WaybillPDFService()
        pdf_path = pdf_service.generate_pdf(waybill)
        
        filename = f"Накладна_{waybill_number}.pdf"
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
        logger.error(f"Error generating waybill PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при генерації PDF"
        )


@router.put("/waybills/{waybill_number}")
async def update_waybill(
    waybill_number: str,
    waybill_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update a waybill."""
    from server import db as database
    from datetime import datetime
    
    try:
        existing_waybill = await database.waybills.find_one({
            "number": waybill_number,
            "user_id": current_user["_id"]
        })
        
        if not existing_waybill:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Накладну не знайдено"
            )
        
        items = waybill_data.get("items", existing_waybill.get("items"))
        
        if items:
            for item in items:
                if 'quantity' in item:
                    item['quantity'] = float(item['quantity'])
                if 'price' in item:
                    item['price'] = float(item['price'])
                if 'amount' in item:
                    item['amount'] = float(item['amount'])
        
        update_data = {
            "date": waybill_data.get("date", existing_waybill.get("date")),
            "counterparty_edrpou": waybill_data.get("counterparty_edrpou", existing_waybill.get("counterparty_edrpou")),
            "counterparty_name": waybill_data.get("counterparty_name", existing_waybill.get("counterparty_name")),
            "items": items,
            "total_amount": float(waybill_data.get("total_amount", existing_waybill.get("total_amount"))),
            "updated_at": datetime.utcnow()
        }
        
        result = await database.waybills.update_one(
            {"number": waybill_number, "user_id": current_user["_id"]},
            {"$set": update_data}
        )
        
        if result.modified_count == 0 and result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Накладну не знайдено"
            )
        
        updated_waybill = await database.waybills.find_one(
            {"number": waybill_number, "user_id": current_user["_id"]},
            {"_id": 0}
        )
        
        logger.info(f"Waybill updated: {waybill_number} by user {current_user['_id']}")
        return updated_waybill
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating waybill: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при оновленні накладної"
        )


@router.delete("/waybills/{waybill_number}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_waybill(
    waybill_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a waybill."""
    from server import db as database
    
    try:
        result = await database.waybills.delete_one({
            "number": waybill_number,
            "user_id": current_user["_id"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Накладну не знайдено"
            )
        
        logger.info(f"Waybill deleted: {waybill_number} by user {current_user['_id']}")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting waybill: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при видаленні накладної"
        )


@router.post("/waybills/{waybill_number}/send-email")
async def send_waybill_email(
    waybill_number: str,
    email_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send waybill PDF to email."""
    from server import db as database
    from services.waybill_pdf_service import WaybillPDFService
    from services.email_service import EmailService
    
    try:
        waybill = await database.waybills.find_one({
            "number": waybill_number,
            "user_id": current_user["_id"]
        }, {"_id": 0})
        
        if not waybill:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Накладну не знайдено"
            )
        
        recipient_email = email_data.get('email')
        if not recipient_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email адреса не вказана"
            )
        
        counterparty_edrpou = waybill.get('counterparty_edrpou')
        if counterparty_edrpou:
            counterparty = await database.counterparties.find_one({
                "edrpou": counterparty_edrpou,
                "user_id": current_user["_id"]
            }, {"_id": 0})
            
            if counterparty:
                waybill['counterparty_details'] = counterparty
        
        user = await database.users.find_one({
            "_id": current_user["_id"]
        }, {"_id": 0, "hashed_password": 0})
        
        if user:
            waybill['supplier_details'] = user
        
        pdf_service = WaybillPDFService()
        pdf_path = pdf_service.generate_pdf(waybill)
        
        email_service = EmailService()
        waybill_date = waybill.get('date', '')
        
        from datetime import datetime
        if isinstance(waybill_date, datetime):
            waybill_date = waybill_date.isoformat()
        else:
            waybill_date = str(waybill_date)
        
        # Prepare company logo
        company_logo_url = None
        company_logo_path = None
        if user and user.get('company_logo'):
            logo_relative_path = user['company_logo']
            company_logo_path = f"/app/backend/{logo_relative_path}"
            company_logo_url = "embedded"
        
        email_service.send_waybill_document(
            to_email=recipient_email,
            waybill_number=waybill_number,
            waybill_date=waybill_date,
            counterparty_name=waybill.get('counterparty_name', '—'),
            total_amount=waybill.get('total_amount', 0),
            pdf_path=pdf_path,
            company_name=user.get('representative_name') or user.get('company_name', 'Компанія') if user else 'Компанія',
            company_logo_url=company_logo_url,
            company_logo_path=company_logo_path
        )
        
        logger.info(f"Waybill PDF sent to {recipient_email} by user {current_user['_id']}")
        return {"message": f"PDF відправлено на {recipient_email}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending waybill email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при відправці email"
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
    edrpou: Optional[str] = None,
    is_paid: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all orders for the current user with optional filters."""
    from server import db as database
    
    document_service = DocumentServiceMongo(database)
    
    try:
        orders = await document_service.get_all_orders(
            user_id=current_user["_id"],
            edrpou_filter=edrpou,
            is_paid_filter=is_paid
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


@router.put("/orders/{order_id}", response_model=OrderModel)
async def update_order(
    order_id: str,
    order_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update an order."""
    from server import db as database
    from datetime import datetime
    
    try:
        # Get existing order
        existing_order = await database.orders.find_one({
            "_id": order_id,
            "user_id": current_user["_id"]
        })
        
        if not existing_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Замовлення не знайдено"
            )
        
        # Prepare update data - ensure numeric values are stored as numbers
        items = order_data.get("items", existing_order.get("items"))
        
        # Convert string values to numbers in items
        if items:
            for item in items:
                if 'quantity' in item:
                    item['quantity'] = float(item['quantity'])
                if 'price' in item:
                    item['price'] = float(item['price'])
                if 'amount' in item:
                    item['amount'] = float(item['amount'])
        
        update_data = {
            "date": order_data.get("date", existing_order.get("date")),
            "counterparty_edrpou": order_data.get("counterparty_edrpou", existing_order.get("counterparty_edrpou")),
            "counterparty_name": order_data.get("counterparty_name", existing_order.get("counterparty_name")),
            "items": items,
            "total_amount": float(order_data.get("total_amount", existing_order.get("total_amount"))),
            "updated_at": datetime.utcnow()
        }
        
        # Update order
        result = await database.orders.update_one(
            {"_id": order_id, "user_id": current_user["_id"]},
            {"$set": update_data}
        )
        
        if result.modified_count == 0 and result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Замовлення не знайдено"
            )
        
        # Get updated order (include _id for response)
        updated_order = await database.orders.find_one(
            {"_id": order_id}
        )
        
        if updated_order:
            # Convert MongoDB _id to string for response
            updated_order['_id'] = str(updated_order.get('_id', order_id))
        
        logger.info(f"Order updated: {order_id} by user {current_user['_id']}")
        return updated_order
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при оновленні замовлення"
        )


@router.patch("/orders/{order_number}/payment-status")
async def update_order_payment_status(
    order_number: str,
    is_paid: bool,
    current_user: dict = Depends(get_current_user)
):
    """Update payment status of an order."""
    from server import db as database
    from datetime import datetime
    
    try:
        result = await database.orders.update_one(
            {"number": order_number, "user_id": current_user["_id"]},
            {"$set": {
                "is_paid": is_paid,
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Замовлення не знайдено"
            )
        
        logger.info(f"Order {order_number} payment status updated to {is_paid}")
        return {"message": "Статус оплати оновлено", "is_paid": is_paid}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating payment status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при оновленні статусу оплати"
        )


@router.get("/orders/{order_number}/pdf")
async def get_order_pdf(
    order_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate and download order PDF."""
    from server import db as database
    from services.order_pdf_service import OrderPDFService
    
    try:
        # Get order
        order = await database.orders.find_one({
            "number": order_number,
            "user_id": current_user["_id"]
        }, {"_id": 0})
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Замовлення не знайдено"
            )
        
        # Get user data
        user = await database.users.find_one({
            "_id": current_user["_id"]
        }, {"hashed_password": 0})
        
        # Get counterparty data
        counterparty = None
        if order.get('counterparty_edrpou'):
            counterparty = await database.counterparties.find_one({
                "edrpou": order['counterparty_edrpou'],
                "user_id": current_user["_id"]
            }, {"_id": 0})
        
        # Generate PDF
        pdf_service = OrderPDFService()
        pdf_path = pdf_service.generate_order_pdf(order, user, counterparty)
        
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"zamovlennya_{order_number}.pdf"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating order PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при генерації PDF"
        )


@router.post("/orders/{order_number}/send-email")
async def send_order_email(
    order_number: str,
    email: str,
    current_user: dict = Depends(get_current_user)
):
    """Send order PDF via email."""
    from server import db as database
    from services.order_pdf_service import OrderPDFService
    from services.email_service import EmailService
    
    try:
        # Get order
        order = await database.orders.find_one({
            "number": order_number,
            "user_id": current_user["_id"]
        }, {"_id": 0})
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Замовлення не знайдено"
            )
        
        # Get user data
        user = await database.users.find_one({
            "_id": current_user["_id"]
        }, {"hashed_password": 0})
        
        # Get counterparty data
        counterparty = None
        if order.get('counterparty_edrpou'):
            counterparty = await database.counterparties.find_one({
                "edrpou": order['counterparty_edrpou'],
                "user_id": current_user["_id"]
            }, {"_id": 0})
        
        # Generate PDF
        pdf_service = OrderPDFService()
        pdf_path = pdf_service.generate_order_pdf(order, user, counterparty)
        
        # Send email with styled HTML
        email_service = EmailService()
        
        # Format date
        order_date = order.get('date', '')
        if isinstance(order_date, str):
            try:
                from datetime import datetime
                date_obj = datetime.fromisoformat(order_date.replace('Z', '+00:00'))
                months = {
                    1: 'січня', 2: 'лютого', 3: 'березня', 4: 'квітня',
                    5: 'травня', 6: 'червня', 7: 'липня', 8: 'серпня',
                    9: 'вересня', 10: 'жовтня', 11: 'листопада', 12: 'грудня'
                }
                formatted_date = f"{date_obj.day:02d} {months.get(date_obj.month, '')} {date_obj.year} року"
            except:
                formatted_date = order_date.split('T')[0] if 'T' in order_date else order_date
        else:
            formatted_date = str(order_date)
        
        company_name = user.get('representative_name', user.get('company_name', 'Компанія'))
        counterparty_name = order.get('counterparty_name', 'N/A')
        total_amount = order.get('total_amount', 0.0)
        is_paid = order.get('is_paid', False)
        payment_status = '✅ Сплачено' if is_paid else '⏳ Не сплачено'
        
        # Get company logo path if available
        company_logo_url = None
        company_logo_path = None
        if user.get('company_logo'):
            # Get the actual file path for embedding
            logo_relative_path = user['company_logo']
            company_logo_path = f"/app/backend/{logo_relative_path}"
            company_logo_url = "embedded"  # Flag to show logo in template
        
        subject = f"Замовлення №{order_number} від {formatted_date}"
        
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Arial, sans-serif;
                    line-height: 1.6;
                    color: #1e293b;
                    margin: 0;
                    padding: 0;
                    background-color: #f8fafc;
                }}
                .email-container {{
                    max-width: 600px;
                    margin: 20px auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }}
                .logo-container {{
                    text-align: center;
                    padding: 20px;
                    background-color: #ffffff;
                }}
                .company-logo {{
                    max-width: 160px;
                    max-height: 160px;
                    border-radius: 8px;
                }}
                .header {{
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    padding: 30px 40px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }}
                .header p {{
                    margin: 5px 0 0 0;
                    font-size: 14px;
                    opacity: 0.9;
                }}
                .content {{
                    padding: 40px;
                }}
                .greeting {{
                    font-size: 18px;
                    color: #0f172a;
                    margin-bottom: 20px;
                }}
                .info-box {{
                    background-color: #eff6ff;
                    border-left: 4px solid #3b82f6;
                    padding: 20px;
                    margin: 25px 0;
                    border-radius: 4px;
                }}
                .info-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #dbeafe;
                }}
                .info-row:last-child {{
                    border-bottom: none;
                }}
                .info-label {{
                    color: #64748b;
                    font-weight: 500;
                    font-size: 14px;
                }}
                .info-value {{
                    color: #0f172a;
                    font-weight: 600;
                    font-size: 14px;
                }}
                .total {{
                    background-color: #dbeafe;
                    padding: 15px 20px;
                    margin: 20px 0;
                    border-radius: 6px;
                    text-align: right;
                }}
                .total-label {{
                    color: #1e40af;
                    font-size: 16px;
                    font-weight: 600;
                }}
                .total-amount {{
                    color: #1e3a8a;
                    font-size: 24px;
                    font-weight: 700;
                    margin-top: 5px;
                }}
                .status-badge {{
                    display: inline-block;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 600;
                    background-color: {('#dcfce7' if is_paid else '#fef3c7')};
                    color: {('#166534' if is_paid else '#92400e')};
                }}
                .attachment-notice {{
                    background-color: #dbeafe;
                    border: 1px solid #bfdbfe;
                    padding: 15px;
                    margin: 25px 0;
                    border-radius: 6px;
                    text-align: center;
                }}
                .footer {{
                    background-color: #f8fafc;
                    padding: 25px 40px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }}
                .footer p {{
                    margin: 5px 0;
                    font-size: 13px;
                    color: #94a3b8;
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                {f'<div class="logo-container"><img src="cid:company_logo" alt="Company Logo" class="company-logo" /></div>' if company_logo_url else ''}
                <div class="header">
                    <h1>Замовлення №{order_number}</h1>
                    <p>Система Управління Документами</p>
                </div>
                <div class="content">
                    <p class="greeting">Доброго дня!</p>
                    <p><strong>{company_name}</strong> надсилає Вам замовлення №<strong>{order_number}</strong> від <strong>{formatted_date}</strong>.</p>
                    <div class="info-box">
                        <div class="info-row">
                            <span class="info-label">📋 Номер замовлення:</span>
                            <span class="info-value">№{order_number}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">📅 Дата:</span>
                            <span class="info-value">{formatted_date}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">🏢 Покупець:</span>
                            <span class="info-value">{counterparty_name}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">💳 Статус оплати:</span>
                            <span class="info-value"><span class="status-badge">{payment_status}</span></span>
                        </div>
                    </div>
                    <div class="total">
                        <div class="total-label">ЗАГАЛЬНА СУМА ЗАМОВЛЕННЯ:</div>
                        <div class="total-amount">{total_amount:,.2f} грн</div>
                    </div>
                    <div class="attachment-notice">
                        <p>📎 Детальна інформація про замовлення з повними реквізитами покупця знаходиться у вкладеному PDF-документі</p>
                    </div>
                </div>
                <div class="footer">
                    <p>Це автоматично згенерований лист</p>
                    <p style="margin-top: 8px; font-weight: 500; color: #64748b;">З повагою, {company_name}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        email_service.send_email_with_attachment(
            to_email=email,
            subject=subject,
            body=body,
            attachment_path=pdf_path,
            attachment_name=f"Замовлення_{order_number}.pdf",
            embedded_image_path=company_logo_path
        )
        
        logger.info(f"Order {order_number} PDF sent to {email}")
        return {"message": f"Замовлення відправлено на {email}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending order email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при відправці email"
        )


@router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an order."""
    from server import db as database
    
    try:
        result = await database.orders.delete_one({
            "_id": order_id,
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
    from services.order_pdf_service import OrderPDFService
    from urllib.parse import quote
    
    try:
        # Get order from database (using UUID string, not ObjectId)
        order = await database.orders.find_one({
            "_id": order_id,
            "user_id": current_user["_id"]
        }, {"_id": 0})
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Замовлення не знайдено"
            )
        
        # Get counterparty details for full information
        counterparty_edrpou = order.get('counterparty_edrpou')
        if counterparty_edrpou:
            counterparty = await database.counterparties.find_one({
                "edrpou": counterparty_edrpou,
                "user_id": current_user["_id"]
            }, {"_id": 0})
            
            if counterparty:
                # Add counterparty details to order for PDF generation
                order['counterparty_details'] = counterparty
        
        # Get supplier (current user) details for PDF
        user = await database.users.find_one({
            "_id": current_user["_id"]
        }, {"_id": 0, "hashed_password": 0})
        
        if user:
            order['supplier_details'] = user
        
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
    from services.order_pdf_service import OrderPDFService
    from services.email_service import EmailService
    
    try:
        # Get order from database (using UUID string, not ObjectId)
        order = await database.orders.find_one({
            "_id": order_id,
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
        
        # Get counterparty details for full information in PDF
        counterparty_edrpou = order.get('counterparty_edrpou')
        if counterparty_edrpou:
            counterparty = await database.counterparties.find_one({
                "edrpou": counterparty_edrpou,
                "user_id": current_user["_id"]
            }, {"_id": 0})
            
            if counterparty:
                order['counterparty_details'] = counterparty
        
        # Get supplier (current user) details for PDF
        user = await database.users.find_one({
            "_id": current_user["_id"]
        }, {"_id": 0, "hashed_password": 0})
        
        if user:
            order['supplier_details'] = user
        
        # Generate PDF
        pdf_service = OrderPDFService()
        pdf_path = pdf_service.generate_pdf(order)
        
        # Send email with HTML formatting
        email_service = EmailService()
        order_number = order.get('number', 'unknown')
        order_date = order.get('date', '')
        
        # Convert date to string if it's a datetime object
        from datetime import datetime
        if isinstance(order_date, datetime):
            order_date = order_date.isoformat()
        else:
            order_date = str(order_date)
        
        # Get company logo if available
        company_logo_url = None
        company_logo_path = None
        if user and user.get('company_logo'):
            logo_relative_path = user['company_logo']
            company_logo_path = f"/app/backend/{logo_relative_path}"
            company_logo_url = "embedded"
        
        # Get company name
        company_name = user.get('company_name') or user.get('representative_name') or 'Наша компанія'
        
        # Email service will format it to Ukrainian
        email_service.send_order_document(
            to_email=recipient_email,
            order_number=order_number,
            order_date=order_date,
            counterparty_name=order.get('counterparty_name', '—'),
            total_amount=order.get('total_amount', 0),
            pdf_path=pdf_path,
            company_logo_url=company_logo_url,
            company_logo_path=company_logo_path,
            company_name=company_name
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


@router.get("/contracts/{contract_id}/pdf")
async def generate_contract_pdf(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate PDF for a specific contract."""
    from server import db as database
    from services.contract_pdf_service import ContractPDFService
    
    document_service = DocumentServiceMongo(database)
    
    try:
        # Get contract details
        contract = await document_service.get_contract_by_id(current_user["_id"], contract_id)
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Договір не знайдено"
            )
        
        
        # Convert Pydantic model to dict
        contract_dict = contract.model_dump()
        # Get supplier details
        supplier = await database.users.find_one(
            {"_id": current_user["_id"]},
            {"_id": 0}
        )
        
        # Get counterparty details
        counterparty = await database.counterparties.find_one(
            {"edrpou": contract_dict.get("counterparty_edrpou"), "user_id": current_user["_id"]},
            {"_id": 0}
        )
        
        # Prepare contract data for PDF
        contract_data = {
            **contract_dict,
            "supplier_details": supplier,
            "counterparty_details": counterparty or {}
        }
        
        # Generate PDF
        pdf_service = ContractPDFService()
        pdf_path = pdf_service.generate_pdf(contract_data)
        
        # Return PDF file
        from fastapi.responses import FileResponse
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"contract_{contract_dict.get('number', 'unknown')}.pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating contract PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Помилка при генерації PDF: {str(e)}"
        )


@router.post("/contracts/{contract_id}/email")
async def email_contract(
    contract_id: str,
    email_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send contract PDF via email."""
    from server import db as database
    from services.contract_pdf_service import ContractPDFService
    from services.email_service import EmailService
    
    document_service = DocumentServiceMongo(database)
    
    try:
        # Get contract details
        contract = await document_service.get_contract_by_id(current_user["_id"], contract_id)
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Договір не знайдено"
            )
        
        
        # Convert Pydantic model to dict
        contract_dict = contract.model_dump()
        # Get supplier details
        supplier = await database.users.find_one(
            {"_id": current_user["_id"]},
            {"_id": 0}
        )
        
        # Get counterparty details
        counterparty = await database.counterparties.find_one(
            {"edrpou": contract_dict.get("counterparty_edrpou"), "user_id": current_user["_id"]},
            {"_id": 0}
        )
        
        # Prepare contract data for PDF
        contract_data = {
            **contract_dict,
            "supplier_details": supplier,
            "counterparty_details": counterparty or {}
        }
        
        # Generate PDF
        pdf_service = ContractPDFService()
        pdf_path = pdf_service.generate_pdf(contract_data)
        
        # Send email
        email_service = EmailService()
        recipient_email = email_data.get("recipient_email") or email_data.get("email")
        
        if not recipient_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email отримувача не вказано"
            )
        
        # Prepare company logo
        company_logo_url = None
        company_logo_path = None
        if supplier and supplier.get('company_logo'):
            logo_relative_path = supplier['company_logo']
            company_logo_path = f"/app/backend/{logo_relative_path}"
            company_logo_url = "embedded"
        
        # Format date
        contract_date = contract_dict.get('date', '')
        from datetime import datetime
        if isinstance(contract_date, datetime):
            contract_date = contract_date.isoformat()
        else:
            contract_date = str(contract_date)
        
        email_service.send_contract_document(
            to_email=recipient_email,
            contract_number=contract_dict.get('number', 'N/A'),
            contract_date=contract_date,
            counterparty_name=contract_dict.get('counterparty_name', '—'),
            pdf_path=pdf_path,
            company_name=supplier.get('representative_name') or supplier.get('company_name', 'Компанія') if supplier else 'Компанія',
            company_logo_url=company_logo_url,
            company_logo_path=company_logo_path
        )
        
        return {"message": "Email успішно надіслано"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending contract email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Помилка при відправці email: {str(e)}"
        )
