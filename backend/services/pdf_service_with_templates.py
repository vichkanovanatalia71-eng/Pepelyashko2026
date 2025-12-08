"""PDF service with template support."""

import os
from pathlib import Path
from datetime import datetime
from weasyprint import HTML
import logging
from typing import Dict, Any, Optional
from services.template_renderer import TemplateRenderer
from services.template_service import TemplateService

logger = logging.getLogger(__name__)


class PDFServiceWithTemplates:
    """Service for generating PDFs using templates."""
    
    def __init__(self, db):
        self.db = db
        self.output_dir = Path("/tmp/document_pdfs")
        self.output_dir.mkdir(exist_ok=True)
        self.renderer = TemplateRenderer()
        self.template_service = TemplateService(db)
    
    async def generate_invoice_pdf(
        self, 
        invoice: Dict[str, Any],
        supplier: Dict[str, Any],
        counterparty: Dict[str, Any],
        template_id: Optional[str] = None
    ) -> str:
        """
        Generate invoice PDF using template.
        
        Args:
            invoice: Invoice data
            supplier: Supplier (user) data
            counterparty: Counterparty data
            template_id: Optional template ID (uses default if not provided)
            
        Returns:
            Path to generated PDF file
        """
        try:
            logger.info(f"Starting PDF generation for invoice: {invoice.get('number')}")
            
            # Get template
            if template_id:
                template = await self.template_service.get_template_by_id(
                    template_id, 
                    supplier.get('_id')
                )
            else:
                template = await self.template_service.get_default_template(
                    supplier.get('_id'),
                    'invoice'
                )
            
            if not template:
                raise Exception("Template not found")
            
            logger.info("Template loaded successfully")
            
            # Prepare context
            context = self._prepare_invoice_context(invoice, supplier, counterparty)
            
            logger.info("Context prepared successfully")
            
            # Render template
            html_content = self.renderer.render(template.content, context)
            
            logger.info("Template rendered successfully")
            
            # Generate PDF
            invoice_number = invoice.get('number', 'unknown')
            safe_number = invoice_number.replace('/', '_').replace('\\', '_')
            pdf_filename = f"invoice_{safe_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_path = self.output_dir / pdf_filename
            
            HTML(string=html_content).write_pdf(pdf_path)
            
            logger.info(f"Generated invoice PDF: {pdf_path}")
            return str(pdf_path)
            
        except Exception as e:
            logger.error(f"Error generating invoice PDF: {str(e)}", exc_info=True)
            raise
    
    def _get_logo_file_path(self, logo_url: str) -> str:
        """
        Convert logo URL to local file path for WeasyPrint.
        
        Args:
            logo_url: URL like '/api/uploads/filename.png'
            
        Returns:
            Local file path like 'file:///app/backend/uploads/filename.png' or empty string
        """
        if not logo_url:
            return ''
        
        # Extract filename from URL
        # URL format: /api/uploads/filename.png
        if logo_url.startswith('/api/uploads/'):
            filename = logo_url.replace('/api/uploads/', '')
            local_path = Path('/app/backend/uploads') / filename
            
            # Check if file exists
            if local_path.exists():
                # Return as file:// URL for WeasyPrint
                return f"file://{local_path}"
        
        return ''
    
    def _prepare_invoice_context(
        self,
        invoice: Dict[str, Any],
        supplier: Dict[str, Any],
        counterparty: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Prepare context for template rendering."""
        
        # Format date
        invoice_date = invoice.get('date', datetime.now())
        if isinstance(invoice_date, str):
            invoice_date = datetime.fromisoformat(invoice_date.replace('Z', '+00:00'))
        elif isinstance(invoice_date, datetime):
            pass
        else:
            invoice_date = datetime.now()
        
        formatted_date = invoice_date.strftime('%d.%m.%Y')
        
        # Format date in Ukrainian text format
        formatted_date_text = self.renderer.format_date_ukrainian(invoice_date)
        
        # Calculate totals (БЕЗ ПДВ за вимогою користувача)
        total_amount = float(invoice.get('total_amount', 0))
        
        # Generate items table HTML
        items_html = self.renderer.generate_items_table_html(invoice.get('items', []))
        
        # Amount in words (без ПДВ)
        total_amount_text = self.renderer.number_to_words_ua(total_amount)
        
        # Get logo file path for WeasyPrint
        logo_file_path = self._get_logo_file_path(supplier.get('logo_url', ''))
        
        # Prepare context
        context = {
            # Document info
            'document_number': invoice.get('number', ''),
            'document_date': formatted_date,
            'document_date_text': formatted_date_text,  # Ukrainian text format
            'items_table': items_html,
            'based_on_order': invoice.get('based_on_order', ''),
            'based_on_document': invoice.get('based_on_order', ''),  # Alias for template
            
            # Amounts (БЕЗ ПДВ - новий шаблон)
            'total_amount': f"{total_amount:.2f}",
            'total_amount_text': total_amount_text,
            'vat_note': "не платник ПДВ",
            
            # Supplier info (from profile) - EXTENDED
            'supplier_name': supplier.get('representative_name', ''),
            'supplier_edrpou': supplier.get('edrpou', ''),
            'supplier_address': supplier.get('legal_address', ''),
            'supplier_email': supplier.get('email', ''),
            'supplier_phone': supplier.get('phone', ''),
            'supplier_iban': supplier.get('bank_account', supplier.get('iban', '')),
            'supplier_mfo': supplier.get('mfo', ''),
            'supplier_bank': supplier.get('bank_name', supplier.get('bank', '')),
            'supplier_director_name': supplier.get('director_name', ''),
            'supplier_director_position': supplier.get('director_position', 'Директор'),
            'supplier_position': supplier.get('position', 'Директор'),
            'supplier_represented_by': supplier.get('represented_by', ''),
            'supplier_signature': supplier.get('signature', ''),
            'supplier_full_name': supplier.get('full_name', ''),
            'supplier_company_name': supplier.get('company_name', ''),
            'supplier_logo': logo_file_path,
            
            # Counterparty info - EXTENDED
            'counterparty_name': counterparty.get('representative_name', invoice.get('counterparty_name', '')),
            'counterparty_edrpou': counterparty.get('edrpou', invoice.get('counterparty_edrpou', '')),
            'counterparty_address': counterparty.get('legal_address', ''),
            'counterparty_email': counterparty.get('email', ''),
            'counterparty_phone': counterparty.get('phone', ''),
            'counterparty_iban': counterparty.get('bank_account', counterparty.get('iban', '')),
            'counterparty_mfo': counterparty.get('mfo', ''),
            'counterparty_bank': counterparty.get('bank_name', counterparty.get('bank', '')),
            'counterparty_director_name': counterparty.get('director_name', ''),
            'counterparty_director_position': counterparty.get('director_position', 'Директор'),
            'counterparty_position': counterparty.get('position', 'Директор'),
            'counterparty_represented_by': counterparty.get('represented_by', ''),
            'counterparty_signature': counterparty.get('signature', ''),
            'counterparty_contract_type': counterparty.get('contract_type', ''),
            
            # Aliases for buyer (same as counterparty)
            'buyer_name': counterparty.get('representative_name', invoice.get('counterparty_name', '')),
            'buyer_edrpou': counterparty.get('edrpou', invoice.get('counterparty_edrpou', '')),
            'buyer_address': counterparty.get('legal_address', ''),
            'buyer_email': counterparty.get('email', ''),
            'buyer_phone': counterparty.get('phone', ''),
            'buyer_iban': counterparty.get('bank_account', counterparty.get('iban', '')),
            'buyer_mfo': counterparty.get('mfo', ''),
            'buyer_bank': counterparty.get('bank_name', counterparty.get('bank', '')),
            'buyer_director_name': counterparty.get('director_name', ''),
            'buyer_director_position': counterparty.get('director_position', 'Директор'),
            'buyer_position': counterparty.get('position', 'Директор'),
            'buyer_represented_by': counterparty.get('represented_by', ''),
            'buyer_signature': counterparty.get('signature', ''),
        }
        
        return context
