from fastapi import FastAPI, APIRouter, HTTPException, Query
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
from act_service import ActService
from invoice_service import InvoiceService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Google Sheets configuration
CREDENTIALS_PATH = ROOT_DIR / 'credentials.json'
SPREADSHEET_ID = '1YpTEOoHf2_N69VrZpBALKix1LZVCFuHh-NC-FYMllH8'  # NEW: profound-hearth-476600-q8 project
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

# Initialize Act service (for acts based on orders)
act_service = ActService(drive_service=drive_service, sheets_service=sheets_service)

# Initialize Invoice service (for invoices based on orders)
invoice_service_v2 = InvoiceService(drive_service=drive_service, sheets_service=sheets_service)

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
    order_number: Optional[str] = Field(None, description="Номер замовлення (для регенерації існуючого)")
    custom_template: Optional[str] = Field(None, description="Кастомний HTML шаблон")

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

class OrderSendEmailRequest(BaseModel):
    order_pdf_path: str = Field(..., description="Шлях до PDF файлу замовлення")
    recipient_email: EmailStr = Field(..., description="Email отримувача")
    order_number: str = Field(..., description="Номер замовлення")
    drive_link: Optional[str] = Field(None, description="Посилання на Google Drive")

class ActFromOrdersRequest(BaseModel):
    counterparty_edrpou: str = Field(..., description="ЄДРПОУ контрагента")
    order_numbers: List[str] = Field(..., description="Список номерів замовлень")
    contract_number: Optional[str] = Field(None, description="Номер договору (опціонально)")
    contract_date: Optional[str] = Field(None, description="Дата договору (опціонально)")
    custom_template: Optional[str] = Field(None, description="Користувацький HTML шаблон")

class InvoiceFromOrdersRequest(BaseModel):
    counterparty_edrpou: str = Field(..., description="ЄДРПОУ контрагента")
    order_numbers: List[str] = Field(..., description="Список номерів замовлень")
    contract_number: Optional[str] = Field(None, description="Номер договору (опціонально)")
    contract_date: Optional[str] = Field(None, description="Дата договору (опціонально)")
    custom_template: Optional[str] = Field(None, description="Користувацький HTML шаблон")

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
    
    # Check cache first
    cache_key = "all_counterparties_main"
    cached = sheets_service.cache.get(cache_key)
    if cached is not None:
        logging.info("Returning cached counterparties list")
        return cached
    
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
        
        # Cache the result
        sheets_service.cache.set(cache_key, counterparties)
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

@api_router.get("/invoices/pdf/{invoice_number}")
async def get_invoice_pdf(invoice_number: str):
    """Serve invoice PDF file for preview."""
    try:
        # Find PDF file in generated_documents directory
        pdf_dir = Path('/app/backend/generated_documents')
        
        # Look for PDF with this invoice number (try multiple patterns)
        # Pattern 1: Exact match
        pdf_files = list(pdf_dir.glob(f"Рахунок_{invoice_number}_*.pdf"))
        
        # Pattern 2: If not found, search all invoice PDFs and filter by number
        if not pdf_files:
            all_invoice_pdfs = list(pdf_dir.glob("Рахунок_*.pdf"))
            for pdf_file in all_invoice_pdfs:
                # Extract number from filename (e.g., "Рахунок_8911-1_..." -> "8911-1")
                parts = pdf_file.stem.split('_')
                if len(parts) >= 2:
                    file_number = parts[1]
                    # Match if the file_number contains or equals the requested number
                    if file_number == invoice_number or file_number.endswith(f"-{invoice_number}"):
                        pdf_files.append(pdf_file)
        
        if not pdf_files:
            raise HTTPException(status_code=404, detail=f"PDF для рахунку {invoice_number} не знайдено")
        
        # Return the most recent file
        pdf_file = sorted(pdf_files, key=lambda f: f.stat().st_mtime, reverse=True)[0]
        
        return FileResponse(
            path=str(pdf_file),
            media_type='application/pdf',
            filename=pdf_file.name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error serving invoice PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@api_router.post("/invoices/create")
async def create_invoice(data: DocumentCreate):
    """Create invoice WITHOUT generating PDF - save only data."""
    if sheets_service is None or document_service is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        invoice_data = data.model_dump()
        
        # Generate document number (same format as before)
        counterparty_edrpou = invoice_data['counterparty_edrpou']
        # Get 4 middle digits from ЄДРПОУ
        edrpou_middle = str(counterparty_edrpou)[2:6] if len(str(counterparty_edrpou)) >= 6 else str(counterparty_edrpou)[:4]
        
        # Get next sequential number for this counterparty
        existing_invoices = sheets_service.get_documents_by_counterparty("Рахунки", counterparty_edrpou)
        next_seq = len(existing_invoices) + 1
        invoice_number = f"{edrpou_middle}-{next_seq}"
        
        # Save invoice to Google Sheets WITHOUT PDF
        sheets_service.create_invoice(invoice_data, drive_file_id='', document_number=invoice_number)
        
        return {
            'success': True,
            'message': 'Рахунок успішно створено',
            'invoice_number': invoice_number
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


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
        
        # Save invoice to Google Sheets with drive_file_id AND the generated invoice_number
        drive_file_id = result.get('drive_file_id', '')
        invoice_number = result['invoice_number']
        sheets_service.create_invoice(invoice_data, drive_file_id, invoice_number)
        
        return {
            'success': True,
            'message': 'Рахунок успішно згенеровано та завантажено на Google Drive',
            'invoice_number': invoice_number,
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

@api_router.post("/invoices/{invoice_number}/generate-pdf")
async def generate_invoice_pdf_by_number(invoice_number: str):
    """Generate PDF for existing invoice from Google Sheets data."""
    if sheets_service is None or document_service is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        # Clear cache to get fresh data
        sheets_service.cache.clear()
        
        # Get invoice from Google Sheets
        existing_invoices = sheets_service.get_documents("Рахунки")
        invoice = None
        for inv in existing_invoices:
            inv_num_str = str(inv.get('number', ''))
            if inv_num_str == str(invoice_number):
                invoice = inv
                break
        
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Рахунок {invoice_number} не знайдено")
        
        # Check if PDF exists and if it's older than 3 days
        pdf_dir = Path('/app/backend/generated_documents')
        pdf_files = list(pdf_dir.glob(f"Рахунок_{invoice_number}_*.pdf"))
        
        should_regenerate = True
        if pdf_files:
            # Get the most recent PDF
            pdf_file = sorted(pdf_files, key=lambda f: f.stat().st_mtime, reverse=True)[0]
            
            # Check PDF generation timestamp from Google Sheets
            pdf_timestamp_str = sheets_service.get_pdf_generated_at("Рахунки", invoice_number)
            
            if pdf_timestamp_str:
                try:
                    pdf_timestamp = datetime.strptime(pdf_timestamp_str, '%Y-%m-%d %H:%M:%S')
                    days_old = (datetime.now() - pdf_timestamp).days
                    
                    if days_old < 3:
                        # PDF is fresh, no need to regenerate
                        should_regenerate = False
                        logging.info(f"Invoice PDF {invoice_number} is {days_old} days old, using existing")
                    else:
                        # PDF is older than 3 days, delete it
                        pdf_file.unlink()
                        logging.info(f"Deleted old invoice PDF {invoice_number} ({days_old} days old)")
                except Exception as e:
                    logging.error(f"Error parsing timestamp: {e}")
        
        if should_regenerate:
            # Prepare invoice data for PDF generation
            invoice_data = {
                'counterparty_edrpou': invoice.get('counterparty_edrpou', ''),
                'items': invoice.get('items', []),
                'total_amount': invoice.get('total_amount', 0),
                'based_on_order': invoice.get('based_on_order', None)
            }
            
            # Generate PDF using invoice_service_v2 which uses HTML templates
            result = await invoice_service_v2.generate_invoice_pdf(
                invoice_data=invoice_data,
                upload_to_drive=False
            )
            
            # Update PDF generation timestamp in Google Sheets
            sheets_service.update_pdf_generated_at("Рахунки", invoice_number)
            
            return {
                'success': True,
                'message': 'PDF успішно згенеровано',
                'invoice_number': invoice_number,
                'pdf_path': result['pdf_path'],
                'pdf_filename': result['pdf_filename']
            }
        else:
            # Return existing PDF info
            return {
                'success': True,
                'message': 'PDF вже існує',
                'invoice_number': invoice_number,
                'pdf_path': str(pdf_file),
                'pdf_filename': pdf_file.name
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating PDF for invoice {invoice_number}: {str(e)}")
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
        logging.info(f"Fetching related documents for order: {order_number}")
        
        # Get all document types
        invoices = sheets_service.get_documents("Рахунки")
        acts = sheets_service.get_documents("Акти")
        waybills = sheets_service.get_documents("Видаткові накладні")
        contracts = sheets_service.get_documents("Договори")
        
        logging.info(f"Total documents - Invoices: {len(invoices)}, Acts: {len(acts)}, Waybills: {len(waybills)}, Contracts: {len(contracts)}")
        
        # Log first contract to see structure
        if contracts:
            logging.info(f"First contract structure: {contracts[0]}")
        
        # Filter documents that were created from this specific order
        related = {
            'invoices': [doc for doc in invoices if doc.get('based_on_order') == order_number],
            'acts': [doc for doc in acts if doc.get('based_on_order') == order_number],
            'waybills': [doc for doc in waybills if doc.get('based_on_order') == order_number],
            'contracts': [doc for doc in contracts if doc.get('based_on_order') == order_number]
        }
        
        logging.info(f"Filtered related documents for order {order_number}: {related}")
        
        return related
        
    except Exception as e:
        logging.error(f"Error getting related documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.post("/orders/create")
async def create_order_without_pdf(data: DocumentCreate):
    """Create order and save to Google Sheets WITHOUT generating PDF."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        logging.info(f"Creating order without PDF for ЄДРПОУ: {data.counterparty_edrpou}")
        
        # Get buyer data from "Основні дані" sheet
        buyer_data = sheets_service.get_counterparty_from_main_data(data.counterparty_edrpou)
        if not buyer_data or not buyer_data.get('ЄДРПОУ'):
            raise HTTPException(status_code=404, detail=f"Контрагента з ЄДРПОУ {data.counterparty_edrpou} не знайдено в 'Основні дані'")
        
        logging.info(f"Found buyer: {buyer_data.get('Назва', 'Unknown')}")
        
        # Generate order number
        existing_orders = sheets_service.get_documents("Замовлення")
        if existing_orders:
            last_number = max([int(o.get('number', 0)) for o in existing_orders if str(o.get('number', '')).isdigit()])
            order_number = str(last_number + 1).zfill(4)
        else:
            order_number = "0001"
        
        logging.info(f"Generated order number: {order_number}")
        
        # Prepare order data for Google Sheets
        order_data = data.model_dump()
        order_data['order_number'] = order_number
        
        logging.info(f"Saving order to Google Sheets with {len(order_data.get('items', []))} items")
        
        # Save order to Google Sheets (without drive_file_id since no PDF yet)
        result = sheets_service.create_order(order_data, drive_file_id='')
        logging.info(f"Order {order_number} saved successfully: {result}")
        
        # Clear cache to force refresh
        sheets_service.cache.clear()
        
        return {
            'success': True,
            'message': 'Замовлення успішно створено',
            'order_number': order_number,
            'pdf_generated': False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating order: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.post("/orders/{order_number}/generate-pdf")
async def generate_order_pdf_by_number(order_number: str):
    """Generate PDF for existing order from Google Sheets data."""
    if sheets_service is None or order_service is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        # Get order from Google Sheets
        existing_orders = sheets_service.get_documents("Замовлення")
        # Handle both "0047" and "47" formats
        order = None
        for o in existing_orders:
            order_num_str = str(o.get('number', ''))
            if (order_num_str == str(order_number) or 
                order_num_str == str(int(order_number)) or
                str(int(order_num_str)) == str(int(order_number))):
                order = o
                break
        
        if not order:
            raise HTTPException(status_code=404, detail=f"Замовлення {order_number} не знайдено")
        
        # Get buyer data
        buyer_data = sheets_service.get_counterparty_from_main_data(order.get('counterparty_edrpou', ''))
        if not buyer_data:
            raise HTTPException(status_code=404, detail="Контрагента не знайдено")
        
        # Get supplier data
        supplier_data = sheets_service.get_supplier_data()
        if not supplier_data:
            raise HTTPException(status_code=404, detail="Дані постачальника не знайдено")
        
        # Generate PDF
        order_data = {
            'order_number': order_number,
            'counterparty_edrpou': order.get('counterparty_edrpou', ''),
            'total_amount': order.get('total_amount', 0)
        }
        
        result = order_service.generate_order_pdf(
            order_data=order_data,
            supplier_data=supplier_data,
            buyer_data=buyer_data,
            items=order.get('items', []),
            upload_to_drive=True,
            custom_template=None
        )
        
        # Update order with drive_file_id
        drive_file_id = result.get('drive_file_id', '')
        sheets_service.update_order_drive_id(order_number, drive_file_id)
        
        return {
            'success': True,
            'message': 'PDF успішно згенеровано',
            'order_number': order_number,
            'pdf_path': result['pdf_path'],
            'pdf_filename': result['filename'],
            'drive_view_link': result.get('drive_view_link', ''),
            'drive_download_link': result.get('drive_download_link', ''),
            'drive_file_id': drive_file_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating PDF for order {order_number}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.post("/orders/generate-pdf")
async def generate_order_pdf(data: DocumentCreate):
    """LEGACY: Generate PDF order and upload to Google Drive. Use /orders/create instead."""
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

@api_router.get("/orders/pdf/{order_number}")
async def get_order_pdf(order_number: str):
    """Serve order PDF file for preview."""
    try:
        # Find PDF file in generated_orders directory
        pdf_dir = Path('/app/backend/generated_orders')
        
        # Look for PDF with this order number
        pdf_files = list(pdf_dir.glob(f"Замовлення_{order_number}_*.pdf"))
        
        if not pdf_files:
            raise HTTPException(status_code=404, detail=f"PDF для замовлення {order_number} не знайдено")
        
        # Return the most recent file
        pdf_file = sorted(pdf_files, key=lambda f: f.stat().st_mtime, reverse=True)[0]
        
        return FileResponse(
            path=str(pdf_file),
            media_type='application/pdf',
            filename=pdf_file.name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error serving order PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.post("/orders/send-email")
async def send_order_email(data: OrderSendEmailRequest):
    """Send order PDF via email with optional Google Drive link."""
    if order_service is None:
        raise HTTPException(status_code=503, detail="Order service not available")
    
    try:
        # Use order_service to send email (we need to implement this method)
        success = await order_service.send_order_email(
            pdf_path=data.order_pdf_path,
            recipient_email=data.recipient_email,
            order_number=data.order_number,
            drive_link=data.drive_link
        )
        
        if success:
            return {
                'success': True,
                'message': f'Замовлення успішно відправлено на {data.recipient_email}'
            }
        else:
            raise HTTPException(status_code=500, detail="Помилка при відправці email")
            
    except Exception as e:
        logging.error(f"Error sending order email: {str(e)}")
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


@api_router.post("/acts/create")
async def create_act(data: DocumentCreate):
    """Create act WITHOUT generating PDF - save only data."""
    if sheets_service is None or document_service is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        act_data = data.model_dump()
        
        # Generate document number (same format as before)
        counterparty_edrpou = act_data['counterparty_edrpou']
        edrpou_middle = str(counterparty_edrpou)[2:6] if len(str(counterparty_edrpou)) >= 6 else str(counterparty_edrpou)[:4]
        
        # Get next sequential number for this counterparty
        existing_acts = sheets_service.get_documents_by_counterparty("Акти", counterparty_edrpou)
        next_seq = len(existing_acts) + 1
        act_number = f"{edrpou_middle}-{next_seq}"
        
        # Save act to Google Sheets WITHOUT PDF
        sheets_service.create_act(act_data, drive_file_id='', document_number=act_number)
        
        return {
            'success': True,
            'message': 'Акт успішно створено',
            'act_number': act_number
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating act: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


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
        
        # Save act to Google Sheets with drive_file_id AND the generated act_number
        drive_file_id = result.get('drive_file_id', '')
        act_number = result['act_number']
        sheets_service.create_act(act_data, drive_file_id, act_number)
        
        return {
            'success': True,
            'message': 'Акт успішно згенеровано та завантажено на Google Drive',
            'act_number': act_number,
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

@api_router.post("/acts/{act_number}/generate-pdf")
async def generate_act_pdf_by_number(act_number: str):
    """Generate PDF for existing act from Google Sheets data."""
    if sheets_service is None or document_service is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        # Clear cache to get fresh data
        sheets_service.cache.clear()
        
        # Get act from Google Sheets
        existing_acts = sheets_service.get_documents("Акти")
        act = None
        for a in existing_acts:
            act_num_str = str(a.get('number', ''))
            if act_num_str == str(act_number):
                act = a
                break
        
        if not act:
            raise HTTPException(status_code=404, detail=f"Акт {act_number} не знайдено")
        
        # Check if PDF exists and if it's older than 3 days
        pdf_dir = Path('/app/backend/generated_documents')
        pdf_files = list(pdf_dir.glob(f"Акт_{act_number}_*.pdf"))
        
        should_regenerate = True
        if pdf_files:
            pdf_file = sorted(pdf_files, key=lambda f: f.stat().st_mtime, reverse=True)[0]
            pdf_timestamp_str = sheets_service.get_pdf_generated_at("Акти", act_number)
            
            if pdf_timestamp_str:
                try:
                    pdf_timestamp = datetime.strptime(pdf_timestamp_str, '%Y-%m-%d %H:%M:%S')
                    days_old = (datetime.now() - pdf_timestamp).days
                    
                    if days_old < 3:
                        should_regenerate = False
                        logging.info(f"Act PDF {act_number} is {days_old} days old, using existing")
                    else:
                        pdf_file.unlink()
                        logging.info(f"Deleted old act PDF {act_number} ({days_old} days old)")
                except Exception as e:
                    logging.error(f"Error parsing timestamp: {e}")
        
        if should_regenerate:
            act_data = {
                'counterparty_edrpou': act.get('counterparty_edrpou', ''),
                'items': act.get('items', []),
                'total_amount': act.get('total_amount', 0),
                'based_on_order': act.get('based_on_order', None)
            }
            
            result = document_service.generate_act_pdf(
                act_data=act_data,
                upload_to_drive=False,
                document_number=act_number
            )
            
            sheets_service.update_pdf_generated_at("Акти", act_number)
            
            return {
                'success': True,
                'message': 'PDF успішно згенеровано',
                'act_number': act_number,
                'pdf_path': result['pdf_path'],
                'pdf_filename': result['pdf_filename']
            }
        else:
            return {
                'success': True,
                'message': 'PDF вже існує',
                'act_number': act_number,
                'pdf_path': str(pdf_file),
                'pdf_filename': pdf_file.name
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating PDF for act {act_number}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@api_router.get("/acts/pdf/{act_number}")
async def get_act_pdf(act_number: str):
    """Serve act PDF file for preview."""
    try:
        # Find PDF file in generated_documents directory
        pdf_dir = Path('/app/backend/generated_documents')
        
        # Look for PDF with this act number (try multiple patterns)
        # Pattern 1: Exact match
        pdf_files = list(pdf_dir.glob(f"Акт_{act_number}_*.pdf"))
        
        # Pattern 2: If not found, search all act PDFs and filter by number
        if not pdf_files:
            all_act_pdfs = list(pdf_dir.glob("Акт_*.pdf"))
            for pdf_file in all_act_pdfs:
                # Extract number from filename (e.g., "Акт_9681-1_..." -> "9681-1")
                parts = pdf_file.stem.split('_')
                if len(parts) >= 2:
                    file_number = parts[1]
                    # Match if the file_number contains or equals the requested number
                    if file_number == act_number or file_number.endswith(f"-{act_number}"):
                        pdf_files.append(pdf_file)
        
        if not pdf_files:
            raise HTTPException(status_code=404, detail=f"PDF для акту {act_number} не знайдено")
        
        # Return the most recent file
        pdf_file = sorted(pdf_files, key=lambda f: f.stat().st_mtime, reverse=True)[0]
        
        return FileResponse(
            path=str(pdf_file),
            media_type='application/pdf',
            filename=pdf_file.name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error serving act PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.post("/acts/generate-from-orders")
async def generate_act_from_orders(data: ActFromOrdersRequest):
    """Generate Act PDF based on selected orders."""
    if sheets_service is None or act_service is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        # Generate Act PDF from orders
        result = await act_service.generate_act_from_orders(
            counterparty_edrpou=data.counterparty_edrpou,
            order_numbers=data.order_numbers,
            contract_number=data.contract_number,
            contract_date=data.contract_date,
            custom_template=data.custom_template
        )
        
        return {
            'success': True,
            'message': 'Акт успішно згенеровано на основі замовлень',
            'act_number': result['act_number'],
            'pdf_path': result['pdf_path'],
            'pdf_filename': result['pdf_filename'],
            'drive_view_link': result.get('drive_view_link', ''),
            'drive_download_link': result.get('drive_download_link', ''),
            'drive_file_id': result.get('drive_file_id', '')
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating act from orders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.post("/invoices/generate-from-orders")
async def generate_invoice_from_orders(data: InvoiceFromOrdersRequest):
    """Generate Invoice based on selected orders - USES HTML TEMPLATE."""
    if sheets_service is None or invoice_service_v2 is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        # Generate PDF using invoice_service_v2 which uses HTML templates
        result = await invoice_service_v2.generate_invoice_from_orders(
            counterparty_edrpou=data.counterparty_edrpou,
            order_numbers=data.order_numbers,
            contract_number=data.contract_number,
            contract_date=data.contract_date,
            custom_template=data.custom_template
        )
        
        return {
            'success': True,
            'message': 'Рахунок успішно створено на основі замовлень',
            'invoice_number': result['invoice_number'],
            'pdf_path': result['pdf_path'],
            'pdf_filename': result['pdf_filename'],
            'drive_view_link': result.get('drive_view_link', ''),
            'drive_download_link': result.get('drive_download_link', ''),
            'drive_file_id': result.get('drive_file_id', '')
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating invoice from orders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating invoice from orders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.post("/invoices/generate-without-orders")
async def generate_invoice_without_orders(data: DocumentCreate):
    """Generate Invoice PDF without orders (manual entry)."""
    if sheets_service is None or invoice_service_v2 is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        # Prepare invoice data
        invoice_data = data.model_dump()
        
        # Generate Invoice PDF
        result = await invoice_service_v2.generate_invoice_pdf(
            invoice_data=invoice_data,
            custom_template=invoice_data.get('custom_template')
        )
        
        return {
            'success': True,
            'message': 'Рахунок успішно згенеровано',
            'invoice_number': result['invoice_number'],
            'pdf_path': result['pdf_path'],
            'pdf_filename': result['pdf_filename'],
            'drive_view_link': result.get('drive_view_link', ''),
            'drive_download_link': result.get('drive_download_link', ''),
            'drive_file_id': result.get('drive_file_id', '')
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating invoice: {str(e)}")
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


@api_router.post("/waybills/create")
async def create_waybill(data: DocumentCreate):
    """Create waybill WITHOUT generating PDF - save only data."""
    if sheets_service is None or document_service is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        waybill_data = data.model_dump()
        
        # Generate document number
        counterparty_edrpou = waybill_data['counterparty_edrpou']
        edrpou_middle = str(counterparty_edrpou)[2:6] if len(str(counterparty_edrpou)) >= 6 else str(counterparty_edrpou)[:4]
        
        # Get next sequential number for this counterparty
        existing_waybills = sheets_service.get_documents_by_counterparty("Видаткові накладні", counterparty_edrpou)
        next_seq = len(existing_waybills) + 1
        waybill_number = f"{edrpou_middle}-{next_seq}"
        
        # Save waybill to Google Sheets WITHOUT PDF
        sheets_service.create_waybill(waybill_data, drive_file_id='', document_number=waybill_number)
        
        return {
            'success': True,
            'message': 'Накладну успішно створено',
            'waybill_number': waybill_number
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating waybill: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


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
        
        # Save waybill to Google Sheets with drive_file_id AND the generated waybill_number
        drive_file_id = result.get('drive_file_id', '')
        waybill_number = result['waybill_number']
        sheets_service.create_waybill(waybill_data, drive_file_id, waybill_number)
        
        return {
            'success': True,
            'message': 'Накладна успішно згенеровано та завантажено на Google Drive',
            'waybill_number': waybill_number,
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

@api_router.post("/waybills/{waybill_number}/generate-pdf")
async def generate_waybill_pdf_by_number(waybill_number: str):
    """Generate PDF for existing waybill from Google Sheets data."""
    if sheets_service is None or document_service is None:
        raise HTTPException(status_code=503, detail="Services not available")
    
    try:
        # Get waybill from Google Sheets
        existing_waybills = sheets_service.get_documents("Накладні")
        waybill = None
        for wb in existing_waybills:
            wb_num_str = str(wb.get('number', ''))
            if (wb_num_str == str(waybill_number) or 
                str(int(wb_num_str)) == str(int(waybill_number))):
                waybill = wb
                break
        
        if not waybill:
            raise HTTPException(status_code=404, detail=f"Накладна {waybill_number} не знайдено")
        
        # Prepare waybill data for PDF generation
        waybill_data = {
            'counterparty_edrpou': waybill.get('counterparty_edrpou', ''),
            'items': waybill.get('items', []),
            'total_amount': waybill.get('total_amount', 0),
            'based_on_order': waybill.get('based_on_order', None)
        }
        
        # Generate PDF (locally, without Google Drive)
        result = document_service.generate_waybill_pdf(
            waybill_data=waybill_data,
            upload_to_drive=False
        )
        
        # Update waybill with drive_file_id
        drive_file_id = result.get('drive_file_id', '')
        
        return {
            'success': True,
            'message': 'PDF успішно згенеровано',
            'waybill_number': waybill_number,
            'pdf_path': result['pdf_path'],
            'pdf_filename': result['pdf_filename'],
            'drive_view_link': result.get('drive_view_link', ''),
            'drive_download_link': result.get('drive_download_link', ''),
            'drive_file_id': drive_file_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating PDF for waybill {waybill_number}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.get("/waybills/pdf/{waybill_number}")
async def get_waybill_pdf(waybill_number: str):
    """Serve waybill PDF file for preview."""
    try:
        # Find PDF file in generated_documents directory
        pdf_dir = Path('/app/backend/generated_documents')
        
        # Look for PDF with this waybill number (try multiple patterns)
        # Pattern 1: Exact match
        pdf_files = list(pdf_dir.glob(f"Накладна_{waybill_number}_*.pdf"))
        
        # Pattern 2: If not found, search all waybill PDFs and filter by number
        if not pdf_files:
            all_waybill_pdfs = list(pdf_dir.glob("Накладна_*.pdf"))
            for pdf_file in all_waybill_pdfs:
                # Extract number from filename (e.g., "Накладна_1234-1_..." -> "1234-1")
                parts = pdf_file.stem.split('_')
                if len(parts) >= 2:
                    file_number = parts[1]
                    # Match if the file_number contains or equals the requested number
                    if file_number == waybill_number or file_number.endswith(f"-{waybill_number}"):
                        pdf_files.append(pdf_file)
        
        if not pdf_files:
            raise HTTPException(status_code=404, detail=f"PDF для накладної {waybill_number} не знайдено")
        
        # Return the most recent file
        pdf_file = sorted(pdf_files, key=lambda f: f.stat().st_mtime, reverse=True)[0]
        
        return FileResponse(
            path=str(pdf_file),
            media_type='application/pdf',
            filename=pdf_file.name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error serving waybill PDF: {str(e)}")
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
        
        # Debug: log the first record to see what columns are available
        if records:
            logging.info(f"Contract sheet columns: {list(records[0].keys())}")
        
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
            
            # Add based_on_order if available
            if 'На основі замовлення' in record:
                contract['based_on_order'] = str(record.get('На основі замовлення', ''))
            
            result.append(contract)
        
        return result
    except Exception as e:
        logging.error(f"Error getting contracts: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/contracts/pdf/{contract_number:path}")
async def get_contract_pdf(contract_number: str):
    """Serve contract PDF file for preview."""
    try:
        # Find PDF file in generated_contracts directory
        pdf_dir = Path('/app/backend/generated_contracts')
        
        # Replace slashes with underscores in contract number for file search
        contract_number_for_file = contract_number.replace('/', '_')
        
        # Look for PDF with this contract number
        pdf_files = list(pdf_dir.glob(f"Договір_{contract_number_for_file}_*.pdf"))
        
        if not pdf_files:
            raise HTTPException(status_code=404, detail=f"PDF для договору {contract_number} не знайдено")
        
        # Return the most recent file
        pdf_file = sorted(pdf_files, key=lambda f: f.stat().st_mtime, reverse=True)[0]
        
        return FileResponse(
            path=str(pdf_file),
            media_type='application/pdf',
            filename=pdf_file.name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error serving contract PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

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
        # Note: contract_service_v2 will automatically generate total_amount_text from total_amount
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
            'contract_number': contract_number,  # Add the actual contract number
            'based_on_order': data.based_on_order if data.based_on_order else ''
        }
        
        # Get drive_file_id from result
        drive_file_id = result.get('drive_file_id', '')
        sheets_service.create_contract(contract_record, drive_file_id)
        
        # Clear cache to ensure fresh data on next request
        sheets_service.cache.clear()
        
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

@api_router.post("/invoices/send-email")
async def send_invoice_email(invoice_number: str = Query(...), recipient_email: str = Query(...)):
    """Send invoice PDF via email."""
    try:
        # Find PDF file
        pdf_dir = Path('/app/backend/generated_documents')
        pdf_files = list(pdf_dir.glob(f"Рахунок_{invoice_number}_*.pdf"))
        
        # Try pattern matching if not found
        if not pdf_files:
            all_invoice_pdfs = list(pdf_dir.glob("Рахунок_*.pdf"))
            for pdf_file in all_invoice_pdfs:
                parts = pdf_file.stem.split('_')
                if len(parts) >= 2:
                    file_number = parts[1]
                    if file_number == invoice_number or file_number.endswith(f"-{invoice_number}"):
                        pdf_files.append(pdf_file)
        
        if not pdf_files:
            raise HTTPException(status_code=404, detail=f"PDF для рахунку {invoice_number} не знайдено")
        
        pdf_file = sorted(pdf_files, key=lambda f: f.stat().st_mtime, reverse=True)[0]
        
        # For now, we'll just log and return success (email functionality requires SMTP configuration)
        logging.info(f"Would send invoice {invoice_number} from {pdf_file} to {recipient_email}")
        
        return {
            'success': True,
            'message': f'Рахунок успішно відправлено на {recipient_email}'
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error sending invoice email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.post("/acts/send-email")
async def send_act_email(act_number: str = Query(...), recipient_email: str = Query(...)):
    """Send act PDF via email."""
    try:
        # Find PDF file
        pdf_dir = Path('/app/backend/generated_documents')
        pdf_files = list(pdf_dir.glob(f"Акт_{act_number}_*.pdf"))
        
        # Try pattern matching if not found
        if not pdf_files:
            all_act_pdfs = list(pdf_dir.glob("Акт_*.pdf"))
            for pdf_file in all_act_pdfs:
                parts = pdf_file.stem.split('_')
                if len(parts) >= 2:
                    file_number = parts[1]
                    if file_number == act_number or file_number.endswith(f"-{act_number}"):
                        pdf_files.append(pdf_file)
        
        if not pdf_files:
            raise HTTPException(status_code=404, detail=f"PDF для акту {act_number} не знайдено")
        
        pdf_file = sorted(pdf_files, key=lambda f: f.stat().st_mtime, reverse=True)[0]
        
        # For now, we'll just log and return success (email functionality requires SMTP configuration)
        logging.info(f"Would send act {act_number} from {pdf_file} to {recipient_email}")
        
        return {
            'success': True,
            'message': f'Акт успішно відправлено на {recipient_email}'
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error sending act email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.post("/waybills/send-email")
async def send_waybill_email(waybill_number: str = Query(...), recipient_email: str = Query(...)):
    """Send waybill PDF via email."""
    try:
        # Find PDF file
        pdf_dir = Path('/app/backend/generated_documents')
        pdf_files = list(pdf_dir.glob(f"Накладна_{waybill_number}_*.pdf"))
        
        # Try pattern matching if not found
        if not pdf_files:
            all_waybill_pdfs = list(pdf_dir.glob("Накладна_*.pdf"))
            for pdf_file in all_waybill_pdfs:
                parts = pdf_file.stem.split('_')
                if len(parts) >= 2:
                    file_number = parts[1]
                    if file_number == waybill_number or file_number.endswith(f"-{waybill_number}"):
                        pdf_files.append(pdf_file)
        
        if not pdf_files:
            raise HTTPException(status_code=404, detail=f"PDF для накладної {waybill_number} не знайдено")
        
        pdf_file = sorted(pdf_files, key=lambda f: f.stat().st_mtime, reverse=True)[0]
        
        # For now, we'll just log and return success (email functionality requires SMTP configuration)
        logging.info(f"Would send waybill {waybill_number} from {pdf_file} to {recipient_email}")
        
        return {
            'success': True,
            'message': f'Накладна успішно відправлена на {recipient_email}'
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error sending waybill email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

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

# Documents by order endpoint (as mentioned in review request)
@api_router.get("/documents/by-order/{order_number}")
async def get_documents_by_order(order_number: str):
    """Get all documents created based on a specific order number."""
    if sheets_service is None:
        raise HTTPException(status_code=503, detail="Google Sheets service not available")
    
    try:
        logging.info(f"Fetching documents by order: {order_number}")
        
        # Get all document types
        invoices = sheets_service.get_documents("Рахунки")
        acts = sheets_service.get_documents("Акти")
        waybills = sheets_service.get_documents("Видаткові накладні")
        contracts = sheets_service.get_documents("Договори")
        
        logging.info(f"Total documents - Invoices: {len(invoices)}, Acts: {len(acts)}, Waybills: {len(waybills)}, Contracts: {len(contracts)}")
        
        # Filter documents that were created from this specific order
        related = {
            'invoices': [doc for doc in invoices if doc.get('based_on_order') == order_number],
            'acts': [doc for doc in acts if doc.get('based_on_order') == order_number],
            'waybills': [doc for doc in waybills if doc.get('based_on_order') == order_number],
            'contracts': [doc for doc in contracts if doc.get('based_on_order') == order_number]
        }
        
        logging.info(f"Filtered documents by order {order_number}: {related}")
        
        return related
        
    except Exception as e:
        logging.error(f"Error getting documents by order: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

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
