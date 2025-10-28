from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
from google_sheets_service import GoogleSheetsService
from google_drive_service import GoogleDriveService
from contract_service import ContractService
from contract_service_v2 import ContractServiceV2
from document_service import DocumentService
from order_service import OrderService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Google Sheets configuration
CREDENTIALS_PATH = ROOT_DIR / 'credentials.json'
SPREADSHEET_ID = '1RnVWH300p5Lj8Pe53k2tDdlnSUdFSEF9dEO_eGJj8D4'
SHARED_DRIVE_ID = '0AFj2VSH7Z9sKUk9PVA'  # Shared Drive: Документи КНП

# Initialize Google Sheets service
try:
    sheets_service = GoogleSheetsService(
        credentials_path=str(CREDENTIALS_PATH),
        spreadsheet_id=SPREADSHEET_ID
    )
    logging.info("Google Sheets service initialized successfully")
except Exception as e:
    logging.error(f"Failed to initialize Google Sheets service: {str(e)}")
    sheets_service = None

# Initialize Google Drive service
try:
    drive_service = GoogleDriveService(
        credentials_path=str(CREDENTIALS_PATH),
        shared_drive_id=SHARED_DRIVE_ID
    )
    # Setup folder structure
    drive_service.setup_folder_structure()
    logging.info("Google Drive service initialized successfully")
except Exception as e:
    logging.error(f"Failed to initialize Google Drive service: {str(e)}")
    drive_service = None

# Initialize Contract service with Drive integration and Sheets service
contract_service = ContractService(drive_service=drive_service, sheets_service=sheets_service)
contract_service_v2 = ContractServiceV2(drive_service=drive_service, sheets_service=sheets_service)

# Initialize Document service for invoices, acts, and waybills
document_service = DocumentService(drive_service=drive_service, sheets_service=sheets_service)

# Initialize Order service
order_service = OrderService(drive_service=drive_service, sheets_service=sheets_service)

# Create the main app without a prefix
app = FastAPI(title="Document Management System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class CounterpartyCreate(BaseModel):
    edrpou: str = Field(..., description="Код ЄДРПОУ")
    representative_name: str = Field(..., description="Назва")
    email: EmailStr = Field(..., description="Email")
    phone: str = Field(..., description="Телефон")
    iban: str = Field(..., description="IBAN")
    contract_type: Optional[str] = Field('', description="Тип договору")
    director_position: Optional[str] = Field(None, description="Посада керівника")
    director_name: Optional[str] = Field(None, description="ПІБ керівника")
    legal_address: Optional[str] = Field(None, description="Юридична адреса")
    bank: Optional[str] = Field(None, description="Банк")
    mfo: Optional[str] = Field(None, description="МФО")
    position: Optional[str] = Field(None, description="Посада")
    represented_by: Optional[str] = Field(None, description="В особі")
    signature: Optional[str] = Field(None, description="Підпис")

class Counterparty(BaseModel):
    edrpou: str
    representative_name: str
    email: str
    phone: str
    iban: str
    contract_type: str
    director_position: Optional[str] = None
    director_name: Optional[str] = None
    legal_address: Optional[str] = None
    bank: Optional[str] = None
    mfo: Optional[str] = None
    position: Optional[str] = None
    represented_by: Optional[str] = None
    signature: Optional[str] = None

class DocumentItem(BaseModel):
    name: str = Field(..., description="Назва товару/роботи")
    unit: str = Field(..., description="Одиниця виміру")
    quantity: float = Field(..., description="Кількість")
    price: float = Field(..., description="Ціна за одиницю")
    amount: float = Field(..., description="Сума")

class DocumentCreate(BaseModel):
    counterparty_edrpou: str = Field(..., description="ЄДРПОУ контрагента")
    items: List[DocumentItem] = Field(..., description="Список товарів/робіт")
    total_amount: float = Field(..., description="Загальна сума")
    based_on_order: Optional[str] = Field(None, description="Номер замовлення (якщо створено на основі замовлення)")

class ContractCreate(BaseModel):
    counterparty_edrpou: str = Field(..., description="ЄДРПОУ контрагента")
    contract_type: Optional[str] = Field(None, description="Тип договору")
    subject: str = Field(..., description="Предмет договору")
    amount: float = Field(..., description="Сума договору")

class Contract(BaseModel):
    number: str
    date: str
    counterparty_edrpou: str
    counterparty_name: str
    contract_type: str
    subject: str
    amount: float

class ContractGenerateRequest(BaseModel):
    subject: str = Field(..., description="Предмет договору")
    items: List[DocumentItem] = Field(..., description="Список товарів/робіт")
    total_amount: float = Field(..., description="Загальна сума")
    contract_number: Optional[str] = Field(None, description="Номер договору (автоматично якщо не вказано)")
    counterparty_edrpou: Optional[str] = Field(None, description="ЄДРПОУ (не використовується, покупець береться з Основні дані)")
    custom_template: Optional[str] = Field(None, description="Кастомний текст шаблону договору")
    template_settings: Optional[dict] = Field(None, description="Налаштування форматування шаблону")
    total_amount_text: Optional[str] = Field(None, description="Сума договору прописом")
    vat_note: Optional[str] = Field(None, description="Позначка про ПДВ (наприклад, 'без ПДВ')")
    based_on_order: Optional[str] = Field(None, description="Номер замовлення (якщо створено на основі замовлення)")

class ContractSendEmailRequest(BaseModel):
    contract_pdf_path: str = Field(..., description="Шлях до PDF файлу")
    recipient_email: EmailStr = Field(..., description="Email отримувача")
    contract_number: str = Field(..., description="Номер договору")
    drive_link: Optional[str] = Field(None, description="Посилання на Google Drive")

class Document(BaseModel):
    number: str
    date: str
    counterparty_edrpou: str
    counterparty_name: str
    items: List[DocumentItem]
    total_amount: float

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Document Management System API"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    return {"status": "healthy", "sheets_connected": True}

# Counterparty endpoints
@api_router.post("/counterparties", response_model=dict)
async def create_counterparty(data: CounterpartyCreate):
    """Create a new counterparty."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        result = sheets_service.create_counterparty(data.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.error(f"Error creating counterparty: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/counterparties", response_model=List[Counterparty])
async def get_counterparties():
    """Get all counterparties from 'Основні дані'."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        # Get all records from "Основні дані"
        worksheet = sheets_service.spreadsheet.worksheet("Основні дані")
        
        # Define expected headers to handle duplicate empty headers
        expected_headers = ['ЄДРПОУ', 'Назва', 'Юридична адреса', 'р/р(IBAN)', 'Банк', 'МФО', 'email', 'тел', 'Посада', 'В особі', 'Підпис']
        
        try:
            records = worksheet.get_all_records(expected_headers=expected_headers)
        except Exception as header_error:
            logging.warning(f"Failed to get records with expected headers: {str(header_error)}")
            # Fallback: get raw values and process manually
            all_values = worksheet.get_all_values()
            if not all_values:
                return []
            
            records = []
            for row in all_values[1:]:  # Skip header row
                if any(cell.strip() for cell in row):  # Skip empty rows
                    record = {}
                    for i, header in enumerate(expected_headers):
                        if i < len(row):
                            record[header] = row[i].strip()
                        else:
                            record[header] = ''
                    records.append(record)
        
        counterparties = []
        for record in records:
            edrpou = str(record.get('ЄДРПОУ', '')).strip()
            # Skip header row and empty rows
            if edrpou and edrpou != 'ЄДРПОУ':  # Skip header row
                counterparties.append({
                    'edrpou': edrpou,
                    'representative_name': str(record.get('Назва', '')),
                    'email': str(record.get('email', '')),
                    'phone': str(record.get('тел', '')),
                    'iban': str(record.get('р/р(IBAN)', '')),
                    'contract_type': '',
                    'director_position': str(record.get('Посада', 'Директор')),
                    'director_name': str(record.get('В особі', '')),
                    'legal_address': str(record.get('Юридична адреса', '')),
                    'bank': str(record.get('Банк', '')),
                    'mfo': str(record.get('МФО', '')),
                    'position': str(record.get('Посада', '')),
                    'represented_by': str(record.get('В особі', '')),
                    'signature': str(record.get('Підпис', ''))
                })
        
        return counterparties
    except Exception as e:
        logging.error(f"Error getting counterparties: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.put("/counterparties/{edrpou}", response_model=dict)
async def update_counterparty(edrpou: str, data: CounterpartyCreate):
    """Update counterparty in 'Основні дані' sheet."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        # Prepare update data
        update_data = {
            'Назва': data.representative_name,
            'Юридична адреса': data.legal_address or '',
            'р/р(IBAN)': data.iban,
            'Банк': data.bank or '',
            'МФО': data.mfo or '',
            'email': data.email,
            'тел': data.phone,
            'Посада': data.position or '',
            'В особі': data.represented_by or '',
            'Підпис': data.signature or ''
        }
        
        success = sheets_service.update_counterparty_in_main_data(edrpou, update_data)
        
        if success:
            return {
                'success': True,
                'message': 'Контрагента успішно оновлено'
            }
        else:
            raise HTTPException(status_code=404, detail="Контрагента не знайдено")
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating counterparty: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

        return counterparties
    except Exception as e:
        logging.error(f"Error getting counterparties: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/counterparties/{edrpou}", response_model=Counterparty)
async def get_counterparty(edrpou: str):
    """Get counterparty by ЄДРПОУ from 'Основні дані'."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        counterparty_data = sheets_service.get_counterparty_from_main_data(edrpou)
        if not counterparty_data:
            raise HTTPException(status_code=404, detail="Контрагента не знайдено в 'Основні дані'")
        
        # Convert to Counterparty format
        counterparty = {
            'edrpou': counterparty_data['ЄДРПОУ'],
            'representative_name': counterparty_data['Назва'],
            'email': counterparty_data['email'],
            'phone': counterparty_data['тел'],
            'iban': counterparty_data['р/р(IBAN)'],
            'contract_type': '',
            'director_position': counterparty_data.get('Посада', 'Директор'),
            'director_name': counterparty_data['Директор'],
            'legal_address': counterparty_data.get('Юридична адреса', ''),
            'bank': counterparty_data.get('Банк', ''),
            'mfo': counterparty_data.get('МФО', ''),
            'position': counterparty_data.get('Посада', ''),
            'represented_by': counterparty_data.get('В особі', ''),
            'signature': counterparty_data.get('Підпис', '')
        }
        return counterparty
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting counterparty: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/counterparties/{edrpou}/documents")
async def get_counterparty_documents(edrpou: str):
    """Get all documents for a specific counterparty."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        documents = sheets_service.get_counterparty_documents(edrpou)
        return documents
    except Exception as e:
        logging.error(f"Error getting counterparty documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Invoice endpoints
@api_router.post("/invoices", response_model=dict)
async def create_invoice(data: DocumentCreate):
    """Create a new invoice."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        result = sheets_service.create_invoice(data.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.error(f"Error creating invoice: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/invoices", response_model=List[Document])
async def get_invoices():
    """Get all invoices."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        invoices = sheets_service.get_documents("Рахунки")
        return invoices
    except Exception as e:
        logging.error(f"Error getting invoices: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.post("/invoices/generate-pdf")
async def generate_invoice_pdf(data: DocumentCreate):
    """Generate PDF invoice and upload to Google Drive."""
    if sheets_service is None or document_service is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        # Generate PDF and upload to Drive
        invoice_data = data.model_dump()
        result = document_service.generate_invoice_pdf(
            invoice_data=invoice_data,
            upload_to_drive=True
        )
        
        # Save invoice to Google Sheets with drive_file_id
        drive_file_id = result.get('drive_file_id', '')
        sheets_service.create_invoice(invoice_data, drive_file_id)
        
        return {
            'success': True,
            'message': 'Рахунок успішно згенеровано та завантажено на Google Drive',
            'invoice_number': result['invoice_number'],
            'pdf_path': result['pdf_path'],
            'pdf_filename': result['pdf_filename'],
            'drive_view_link': result.get('drive_view_link', ''),
            'drive_download_link': result.get('drive_download_link', ''),
            'drive_file_id': result.get('drive_file_id', '')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating invoice PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Order endpoints
@api_router.post("/orders", response_model=dict)
async def create_order(data: DocumentCreate):
    """Create a new order."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        result = sheets_service.create_order(data.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.error(f"Error creating order: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/orders", response_model=List[Document])
async def get_orders():
    """Get all orders."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        orders = sheets_service.get_documents("Замовлення")
        return orders
    except Exception as e:
        logging.error(f"Error getting orders: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/orders/{order_number}/related-documents")
async def get_order_related_documents(order_number: str):
    """Get all documents created from this order."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        # Get all document types
        invoices = sheets_service.get_documents("Рахунки")
        acts = sheets_service.get_documents("Акти")
        waybills = sheets_service.get_documents("Видаткові накладні")
        contracts = sheets_service.get_documents("Договори")
        
        # Filter documents that reference this order number (check in subject or notes)
        related = {
            'invoices': [],
            'acts': [],
            'waybills': [],
            'contracts': []
        }
        
        # Get the order to find its counterparty
        orders = sheets_service.get_documents("Замовлення")
        order = next((o for o in orders if str(o.get('number', '')) == str(order_number)), None)
        
        if order:
            counterparty_edrpou = order.get('counterparty_edrpou', '')
            
            # Find documents for the same counterparty created around the same time
            for inv in invoices:
                if inv.get('counterparty_edrpou') == counterparty_edrpou:
                    related['invoices'].append(inv)
            
            for act in acts:
                if act.get('counterparty_edrpou') == counterparty_edrpou:
                    related['acts'].append(act)
            
            for wb in waybills:
                if wb.get('counterparty_edrpou') == counterparty_edrpou:
                    related['waybills'].append(wb)
            
            for contract in contracts:
                # Check if contract subject mentions this order number
                subject = contract.get('subject', '')
                if order_number in subject or contract.get('counterparty_edrpou') == counterparty_edrpou:
                    related['contracts'].append(contract)
        
        return related
        
    except Exception as e:
        logging.error(f"Error getting related documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.post("/orders/generate-pdf")
async def generate_order_pdf(data: DocumentCreate):
    """Generate PDF order and upload to Google Drive."""
    if sheets_service is None or order_service is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        # Get buyer data from "Основні дані" sheet
        buyer_data = sheets_service.get_counterparty_from_main_data(data.counterparty_edrpou)
        if not buyer_data or not buyer_data.get('ЄДРПОУ'):
            raise HTTPException(status_code=404, detail=f"Контрагента з ЄДРПОУ {data.counterparty_edrpou} не знайдено в 'Основні дані'")
        
        # Get supplier data from "Мої дані" sheet
        supplier_data = sheets_service.get_supplier_data()
        if not supplier_data:
            raise HTTPException(status_code=404, detail="Дані постачальника не знайдено в 'Мої дані'")
        
        # Generate PDF and upload to Drive
        order_data = data.model_dump()
        
        # Get custom template if provided
        custom_template = order_data.get('custom_template', None)
        
        result = order_service.generate_order_pdf(
            order_data=order_data,
            supplier_data=supplier_data,
            buyer_data=buyer_data,
            items=[item.model_dump() for item in data.items] if data.items else [],
            upload_to_drive=True,
            custom_template=custom_template
        )
        
        # Save order to Google Sheets with drive_file_id
        drive_file_id = result.get('drive_file_id', '')
        order_number = result.get('order_number', '')
        
        # Add order number to order_data for Google Sheets
        order_data_with_number = order_data.copy()
        order_data_with_number['order_number'] = order_number
        
        # Check if this is a regeneration (order already exists in sheets)
        # If order_number exists, update it; otherwise create new
        existing_orders = sheets_service.get_documents("Замовлення")
        order_exists = any(str(o.get('number', '')) == str(order_number) for o in existing_orders)
        
        if order_exists:
            # Update existing order with new drive_file_id
            sheets_service.update_order_drive_id(order_number, drive_file_id)
            logging.info(f"Updated existing order {order_number} with new drive_file_id")
        else:
            # Create new order
            sheets_service.create_order(order_data_with_number, drive_file_id)
            logging.info(f"Created new order {order_number}")
        
        return {
            'success': True,
            'message': 'Замовлення успішно згенеровано та завантажено на Google Drive',
            'order_number': result['order_number'],
            'pdf_path': result['pdf_path'],
            'pdf_filename': result['filename'],
            'drive_view_link': result.get('drive_view_link', ''),
            'drive_download_link': result.get('drive_download_link', ''),
            'drive_file_id': result.get('drive_file_id', '')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating order PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Act endpoints
@api_router.post("/acts", response_model=dict)
async def create_act(data: DocumentCreate):
    """Create a new act of completed work."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        result = sheets_service.create_act(data.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.error(f"Error creating act: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/acts", response_model=List[Document])
async def get_acts():
    """Get all acts."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        acts = sheets_service.get_documents("Акти")
        return acts
    except Exception as e:
        logging.error(f"Error getting acts: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.post("/acts/generate-pdf")
async def generate_act_pdf(data: DocumentCreate):
    """Generate PDF act and upload to Google Drive."""
    if sheets_service is None or document_service is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        # Generate PDF and upload to Drive
        act_data = data.model_dump()
        result = document_service.generate_act_pdf(
            act_data=act_data,
            upload_to_drive=True
        )
        
        # Save act to Google Sheets with drive_file_id
        drive_file_id = result.get('drive_file_id', '')
        sheets_service.create_act(act_data, drive_file_id)
        
        return {
            'success': True,
            'message': 'Акт успішно згенеровано та завантажено на Google Drive',
            'act_number': result['act_number'],
            'pdf_path': result['pdf_path'],
            'pdf_filename': result['pdf_filename'],
            'drive_view_link': result.get('drive_view_link', ''),
            'drive_download_link': result.get('drive_download_link', ''),
            'drive_file_id': result.get('drive_file_id', '')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating act PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Waybill endpoints
@api_router.post("/waybills", response_model=dict)
async def create_waybill(data: DocumentCreate):
    """Create a new waybill."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        result = sheets_service.create_waybill(data.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.error(f"Error creating waybill: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/waybills", response_model=List[Document])
async def get_waybills():
    """Get all waybills."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        waybills = sheets_service.get_documents("Видаткові накладні")
        return waybills
    except Exception as e:
        logging.error(f"Error getting waybills: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.post("/waybills/generate-pdf")
async def generate_waybill_pdf(data: DocumentCreate):
    """Generate PDF waybill and upload to Google Drive."""
    if sheets_service is None or document_service is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        # Generate PDF and upload to Drive
        waybill_data = data.model_dump()
        result = document_service.generate_waybill_pdf(
            waybill_data=waybill_data,
            upload_to_drive=True
        )
        
        # Save waybill to Google Sheets with drive_file_id
        drive_file_id = result.get('drive_file_id', '')
        sheets_service.create_waybill(waybill_data, drive_file_id)
        
        return {
            'success': True,
            'message': 'Накладна успішно згенеровано та завантажено на Google Drive',
            'waybill_number': result['waybill_number'],
            'pdf_path': result['pdf_path'],
            'pdf_filename': result['pdf_filename'],
            'drive_view_link': result.get('drive_view_link', ''),
            'drive_download_link': result.get('drive_download_link', ''),
            'drive_file_id': result.get('drive_file_id', '')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating waybill PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Contract endpoints
@api_router.post("/contracts", response_model=dict)
async def create_contract(data: ContractCreate):
    """Create a new contract."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        result = sheets_service.create_contract(data.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.error(f"Error creating contract: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/contracts", response_model=List[Contract])
async def get_contracts():
    """Get all contracts."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        worksheet = sheets_service.spreadsheet.worksheet("Договори")
        records = worksheet.get_all_records()
        
        result = []
        for record in records:
            # Skip header rows or invalid rows
            try:
                amount = float(record['Сума договору']) if record['Сума договору'] else 0.0
            except (ValueError, TypeError):
                continue
                
            contract = {
                'number': str(record['Номер']),
                'date': str(record['Дата']),
                'counterparty_edrpou': str(record['ЄДРПОУ контрагента']),
                'counterparty_name': str(record["Ім'я контрагента"]),
                'contract_type': str(record.get('Тип договору', '')),
                'subject': str(record['Предмет договору']),
                'amount': amount
            }
            
            # Add drive_file_id if available
            if 'Drive File ID' in record:
                contract['drive_file_id'] = str(record.get('Drive File ID', ''))
            
            result.append(contract)
        
        return result
    except Exception as e:
        logging.error(f"Error getting contracts: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.post("/contracts/generate-pdf")
async def generate_contract_pdf(data: ContractGenerateRequest):
    """Generate PDF contract and upload to Google Drive."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        logging.info(f"Received contract request: counterparty_edrpou={data.counterparty_edrpou}, total_amount={data.total_amount}, total_amount_text={data.total_amount_text}, vat_note={data.vat_note}")
        
        # Get buyer data from "Основні дані" sheet
        buyer_data = sheets_service.get_counterparty_from_main_data(data.counterparty_edrpou)
        if not buyer_data or not buyer_data.get('ЄДРПОУ'):
            raise HTTPException(status_code=404, detail=f"Контрагента з ЄДРПОУ {data.counterparty_edrpou} не знайдено в 'Основні дані'")
        
        # Get supplier data from "Мої дані" sheet
        supplier_data = sheets_service.get_supplier_data()
        if not supplier_data:
            raise HTTPException(status_code=404, detail="Дані постачальника не знайдено в 'Мої дані'")
        
        # Prepare contract data
        contract_data = {
            'subject': data.subject,
            'total_amount': data.total_amount,
            'total_amount_text': data.total_amount_text if data.total_amount_text else '',
            'vat_note': data.vat_note if data.vat_note else ''
        }
        
        logging.info(f"Contract data prepared: {contract_data}")
        
        # Generate PDF using new service
        result = contract_service_v2.generate_contract_pdf(
            contract_data=contract_data,
            supplier_data=supplier_data,
            buyer_data=buyer_data,
            items=[item.model_dump() for item in data.items] if data.items else [],
            upload_to_drive=True,
            custom_template=data.custom_template,
            template_settings=data.template_settings
        )
        
        contract_number = result['contract_number']
        
        # Save contract to Google Sheets with Drive link
        contract_record = {
            'counterparty_edrpou': buyer_data.get('ЄДРПОУ', ''),
            'subject': data.subject,
            'amount': data.total_amount,
            'contract_number': contract_number  # Add the actual contract number
        }
        
        # Get drive_file_id from result
        drive_file_id = result.get('drive_file_id', '')
        sheets_service.create_contract(contract_record, drive_file_id)
        
        return {
            'success': True,
            'message': 'Договір успішно згенеровано та завантажено на Google Drive',
            'contract_number': contract_number,
            'pdf_path': result['local_path'],
            'pdf_filename': result['filename'],
            'drive_view_link': result.get('drive_view_link', ''),
            'drive_download_link': result.get('drive_download_link', ''),
            'drive_file_id': result.get('drive_file_id', '')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating contract PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.get("/contracts/download/{filename}")
async def download_contract(filename: str):
    """Download generated contract PDF."""
    try:
        contracts_dir = Path(__file__).parent / "generated_contracts"
        file_path = contracts_dir / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Файл не знайдено")
        
        # Use urllib to properly encode filename for header
        from urllib.parse import quote
        encoded_filename = quote(filename)
        
        return FileResponse(
            path=str(file_path),
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'inline; filename*=UTF-8\'\'{encoded_filename}'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error downloading contract: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.post("/contracts/send-email")
async def send_contract_email(data: ContractSendEmailRequest):
    """Send contract PDF via email with optional Google Drive link."""
    try:
        success = await contract_service.send_contract_email(
            pdf_path=data.contract_pdf_path,
            recipient_email=data.recipient_email,
            contract_number=data.contract_number,
            drive_link=data.drive_link
        )
        
        if success:
            return {
                'success': True,
                'message': f'Договір успішно відправлено на {data.recipient_email}'
            }
        else:
            raise HTTPException(status_code=500, detail="Помилка при відправці email")
            
    except Exception as e:
        logging.error(f"Error sending contract email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
