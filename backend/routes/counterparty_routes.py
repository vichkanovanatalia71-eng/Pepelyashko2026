"""Counterparty management routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import logging

from models.counterparty import CounterpartyModel, CounterpartyCreate, CounterpartyUpdate
from services.counterparty_service import CounterpartyService
from auth.auth_middleware import get_current_user

router = APIRouter(prefix="/counterparties", tags=["counterparties"])
logger = logging.getLogger(__name__)


@router.post("", response_model=CounterpartyModel, status_code=status.HTTP_201_CREATED)
async def create_counterparty(
    counterparty_data: CounterpartyCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new counterparty."""
    from server import db as database
    
    counterparty_service = CounterpartyService(database)
    
    try:
        counterparty = await counterparty_service.create_counterparty(
            user_id=current_user["_id"],
            counterparty_data=counterparty_data
        )
        logger.info(f"Counterparty created: {counterparty.edrpou} by user {current_user['_id']}")
        return counterparty
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating counterparty: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при створенні контрагента"
        )


@router.get("", response_model=List[CounterpartyModel])
async def get_all_counterparties(
    current_user: dict = Depends(get_current_user)
):
    """Get all counterparties for the current user."""
    from server import db as database
    
    counterparty_service = CounterpartyService(database)
    
    try:
        counterparties = await counterparty_service.get_all_counterparties(
            user_id=current_user["_id"]
        )
        return counterparties
    except Exception as e:
        logger.error(f"Error getting counterparties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні списку контрагентів"
        )


@router.get("/{edrpou}", response_model=CounterpartyModel)
async def get_counterparty_by_edrpou(
    edrpou: str,
    current_user: dict = Depends(get_current_user)
):
    """Get counterparty by EDRPOU code."""
    from server import db as database
    
    counterparty_service = CounterpartyService(database)
    
    try:
        counterparty = await counterparty_service.get_counterparty_by_edrpou(
            user_id=current_user["_id"],
            edrpou=edrpou
        )
        
        if not counterparty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Контрагента з ЄДРПОУ {edrpou} не знайдено"
            )
        
        return counterparty
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting counterparty: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні контрагента"
        )


@router.put("/{counterparty_id}", response_model=CounterpartyModel)
async def update_counterparty(
    counterparty_id: str,
    counterparty_data: CounterpartyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update counterparty information."""
    from server import db as database
    
    counterparty_service = CounterpartyService(database)
    
    try:
        counterparty = await counterparty_service.update_counterparty(
            user_id=current_user["_id"],
            counterparty_id=counterparty_id,
            counterparty_data=counterparty_data
        )
        
        if not counterparty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Контрагента не знайдено"
            )
        
        logger.info(f"Counterparty updated: {counterparty_id} by user {current_user['_id']}")
        return counterparty
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating counterparty: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при оновленні контрагента"
        )


@router.delete("/{counterparty_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_counterparty(
    counterparty_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete counterparty."""
    from server import db as database
    
    counterparty_service = CounterpartyService(database)
    
    try:
        success = await counterparty_service.delete_counterparty(
            user_id=current_user["_id"],
            counterparty_id=counterparty_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Контрагента не знайдено"
            )
        
        logger.info(f"Counterparty deleted: {counterparty_id} by user {current_user['_id']}")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting counterparty: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при видаленні контрагента"
        )


@router.get("/{counterparty_id}/pdf")
async def download_counterparty_pdf(
    counterparty_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate and download counterparty card as PDF."""
    from server import db as database
    from services.counterparty_pdf_service import CounterpartyPDFService
    from fastapi.responses import FileResponse
    import os
    
    counterparty_service = CounterpartyService(database)
    pdf_service = CounterpartyPDFService()
    
    try:
        # Get counterparty data
        counterparty = await counterparty_service.get_counterparty_by_id(current_user['_id'], counterparty_id)
        
        if not counterparty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Контрагента не знайдено"
            )
        
        # Generate PDF
        pdf_path = pdf_service.generate_pdf(counterparty)
        
        # Return file
        filename = f"Картка_контрагента_{counterparty.get('edrpou', 'unknown')}.pdf"
        
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            filename=filename,
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating counterparty PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при генерації PDF"
        )


@router.post("/{counterparty_id}/send-email")
async def send_counterparty_card_email(
    counterparty_id: str,
    email_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send counterparty card PDF via email."""
    from server import db as database
    from services.counterparty_pdf_service import CounterpartyPDFService
    from services.email_service import EmailService
    
    counterparty_service = CounterpartyService(database)
    pdf_service = CounterpartyPDFService()
    email_service = EmailService()
    
    try:
        # Get recipient email from request
        recipient_email = email_data.get('email')
        
        if not recipient_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email адреса обов'язкова"
            )
        
        # Get counterparty data
        counterparty = await counterparty_service.get_counterparty_by_id(current_user['_id'], counterparty_id)
        
        if not counterparty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Контрагента не знайдено"
            )
        
        # Convert to dict for PDF generation
        counterparty_dict = counterparty.model_dump() if hasattr(counterparty, 'model_dump') else dict(counterparty)
        
        # Generate PDF
        pdf_path = pdf_service.generate_pdf(counterparty_dict)
        
        # Send email
        success = email_service.send_counterparty_card(
            to_email=recipient_email,
            counterparty_name=counterparty_dict.get('representative_name', 'Unknown'),
            pdf_path=pdf_path
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Помилка при відправці email"
            )
        
        logger.info(f"Counterparty card sent to {recipient_email} by user {current_user['_id']}")
        
        return {
            "success": True,
            "message": f"Картку контрагента відправлено на {recipient_email}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending counterparty card email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при відправці email"
        )


@router.get("/{edrpou}/documents")
async def get_counterparty_documents(
    edrpou: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all documents for a specific counterparty."""
    from server import db as database
    from services.document_service_mongo import DocumentServiceMongo
    
    document_service = DocumentServiceMongo(database)
    
    try:
        documents = await document_service.get_counterparty_documents(
            user_id=current_user["_id"],
            counterparty_edrpou=edrpou
        )
        return documents
    except Exception as e:
        logger.error(f"Error getting counterparty documents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Помилка при отриманні документів контрагента"
        )
