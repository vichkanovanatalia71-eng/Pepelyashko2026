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
    
    def _extract_city_from_address(self, address: str) -> str:
        """Extract city name from Ukrainian legal address."""
        if not address:
            return "м. Київ"
        
        import re
        # Try to find city pattern: "місто Назва" or "м. Назва" or "смт Назва" or "село Назва"
        patterns = [
            r'місто\s+([\u0410-\u042f\u0406\u0407\u0404\u0490\u0430-\u044f\u0456\u0457\u0454\u0491\'\-]+)',
            r'м\.\s*([\u0410-\u042f\u0406\u0407\u0404\u0490\u0430-\u044f\u0456\u0457\u0454\u0491\'\-]+)',
            r'смт\s+([\u0410-\u042f\u0406\u0407\u0404\u0490\u0430-\u044f\u0456\u0457\u0454\u0491\'\-]+)',
            r'село\s+([\u0410-\u042f\u0406\u0407\u0404\u0490\u0430-\u044f\u0456\u0457\u0454\u0491\'\-]+)',
            r'с\.\s*([\u0410-\u042f\u0406\u0407\u0404\u0490\u0430-\u044f\u0456\u0457\u0454\u0491\'\-]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, address, re.IGNORECASE)
            if match:
                city_name = match.group(1).capitalize()
                # Determine prefix based on pattern
                if 'місто' in pattern or 'м.' in pattern:
                    return f"м. {city_name}"
                elif 'смт' in pattern:
                    return f"смт {city_name}"
                elif 'село' in pattern or 'с.' in pattern:
                    return f"с. {city_name}"
        
        # If no match, try to extract from comma-separated parts
        parts = [p.strip() for p in address.split(',')]
        for part in parts:
            if 'місто' in part.lower() or 'м.' in part.lower():
                return part
        
        return "м. Київ"
    
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
        
        # VAT calculations
        is_vat_payer = supplier.get('vat_payer', False)
        vat_rate = supplier.get('vat_rate', 20.0) if is_vat_payer else 0.0
        
        if is_vat_payer:
            # Calculate amounts with VAT
            amount_without_vat = total_amount / (1 + vat_rate / 100)
            vat_amount = total_amount - amount_without_vat
            vat_note = f"У тому числі ПДВ {vat_rate}%: {vat_amount:.2f} грн"
            total_amount_text = self.renderer.number_to_words_ua(total_amount)
        else:
            amount_without_vat = total_amount
            vat_amount = 0.0
            vat_note = "не платник ПДВ"
            total_amount_text = self.renderer.number_to_words_ua(total_amount)
        
        # Get logo file path for WeasyPrint
        logo_file_path = self._get_logo_file_path(supplier.get('logo_url', ''))
        
        # Extract city from supplier address
        supplier_address = supplier.get('legal_address', '')
        city_name = self._extract_city_from_address(supplier_address)
        
        # Prepare context
        context = {
            # Document info
            'document_number': invoice.get('number', ''),
            'document_date': formatted_date,
            'document_date_text': formatted_date_text,  # Ukrainian text format
            'items_table': items_html,
            'based_on_order': invoice.get('based_on_order', ''),
            'based_on_document': invoice.get('based_on_order', ''),  # Alias for template
            'city': city_name,  # Місто складання документу
            
            # Amounts with VAT support
            'total_amount': f"{total_amount:.2f}",
            'total_amount_text': total_amount_text,
            'amount_without_vat': f"{amount_without_vat:.2f}",
            'vat_amount': f"{vat_amount:.2f}",
            'vat_rate': f"{vat_rate:.0f}",
            'is_vat_payer': is_vat_payer,
            'vat_note': vat_note,
            
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
            'supplier_contract_type': supplier.get('contract_type', 'Статуту'),
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
    
    async def generate_act_pdf(
        self, 
        act: Dict[str, Any],
        supplier: Dict[str, Any],
        counterparty: Dict[str, Any],
        template_id: Optional[str] = None
    ) -> str:
        """
        Generate act PDF using template.
        
        Args:
            act: Act data
            supplier: Supplier (user) data
            counterparty: Counterparty data
            template_id: Optional template ID (uses default if not provided)
            
        Returns:
            Path to generated PDF file
        """
        try:
            logger.info(f"Starting PDF generation for act: {act.get('number')}")
            
            # Get template
            if template_id:
                template = await self.template_service.get_template_by_id(
                    template_id, 
                    supplier.get('_id')
                )
            else:
                template = await self.template_service.get_default_template(
                    supplier.get('_id'),
                    'act'
                )
            
            if not template:
                raise Exception("Template not found")
            
            logger.info("Template loaded successfully")
            
            # Prepare context
            context = self._prepare_act_context(act, supplier, counterparty)
            
            logger.info("Context prepared successfully")
            
            # Render template
            html_content = self.renderer.render(template.content, context)
            
            logger.info("Template rendered successfully")
            
            # Generate PDF
            act_number = act.get('number', 'unknown')
            safe_number = act_number.replace('/', '_').replace('\\', '_')
            pdf_filename = f"act_{safe_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_path = self.output_dir / pdf_filename
            
            HTML(string=html_content).write_pdf(pdf_path)
            
            logger.info(f"Generated act PDF: {pdf_path}")
            return str(pdf_path)
            
        except Exception as e:
            logger.error(f"Error generating act PDF: {str(e)}", exc_info=True)
            raise
    
    def _prepare_act_context(
        self,
        act: Dict[str, Any],
        supplier: Dict[str, Any],
        counterparty: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Prepare context for act template rendering."""
        
        # Format date
        act_date = act.get('date', datetime.now())
        if isinstance(act_date, str):
            act_date = datetime.fromisoformat(act_date.replace('Z', '+00:00'))
        elif isinstance(act_date, datetime):
            pass
        else:
            act_date = datetime.now()
        
        formatted_date = act_date.strftime('%d.%m.%Y')
        
        # Format date in Ukrainian text format
        formatted_date_text = self.renderer.format_date_ukrainian(act_date)
        
        # Format date as full text
        formatted_date_full_text = self.renderer.format_date_text_full(act_date)
        
        # Calculate totals
        total_amount = float(act.get('total_amount', 0))
        
        # Generate items table HTML
        items_html = self.renderer.generate_items_table_html(act.get('items', []))
        
        # VAT calculations
        is_vat_payer = supplier.get('vat_payer', False)
        vat_rate = supplier.get('vat_rate', 20.0) if is_vat_payer else 0.0
        
        if is_vat_payer:
            amount_without_vat = total_amount / (1 + vat_rate / 100)
            vat_amount = total_amount - amount_without_vat
            vat_note = f"У тому числі ПДВ {vat_rate}%: {vat_amount:.2f} грн"
            total_amount_text = self.renderer.number_to_words_ua(total_amount)
        else:
            amount_without_vat = total_amount
            vat_amount = 0.0
            vat_note = "не платник ПДВ"
            total_amount_text = self.renderer.number_to_words_ua(total_amount)
        
        # Get logo file path for WeasyPrint
        logo_file_path = self._get_logo_file_path(supplier.get('logo_url', ''))
        
        # Extract city from supplier address
        supplier_address = supplier.get('legal_address', '')
        city_name = self._extract_city_from_address(supplier_address)
        
        # Prepare context (similar to invoice but with act-specific fields)
        context = {
            # Document info
            'act_number': act.get('number', ''),
            'act_date': formatted_date,
            'act_date_text': formatted_date_text,
            'act_date_text_full': formatted_date_full_text,  # Дата прописом
            'document_number': act.get('number', ''),  # Alias
            'document_date': formatted_date,  # Alias
            'document_date_text': formatted_date_text,  # Alias
            'document_date_text_full': formatted_date_full_text,  # Alias
            'items_table': items_html,
            'based_on_order': act.get('based_on_order', ''),
            'based_on_document': act.get('based_on_contract', ''),
            'basis': act.get('based_on_order', act.get('based_on_contract', 'Не вказано')),
            'city': city_name,  # Місто складання акту
            
            # Amounts with VAT support
            'total_amount': f"{total_amount:.2f}",
            'total_amount_text': total_amount_text,
            'amount_without_vat': f"{amount_without_vat:.2f}",
            'vat_amount': f"{vat_amount:.2f}",
            'vat_rate': f"{vat_rate:.0f}",
            'is_vat_payer': is_vat_payer,
            'vat_note': vat_note,
            
            # Supplier info
            'supplier_name': supplier.get('representative_name', ''),
            'supplier_edrpou': supplier.get('edrpou', ''),
            'supplier_address': supplier.get('legal_address', ''),
            'supplier_email': supplier.get('email', ''),
            'supplier_phone': supplier.get('phone', ''),
            'supplier_iban': supplier.get('bank_account', supplier.get('iban', '')),
            'supplier_mfo': supplier.get('mfo', ''),
            'supplier_bank': supplier.get('bank_name', supplier.get('bank', '')),
            'supplier_representative': supplier.get('represented_by', ''),
            'supplier_position': supplier.get('position', 'Директор'),
            'supplier_signature': supplier.get('signature', ''),
            'supplier_logo': logo_file_path,
            
            # Buyer/Counterparty info
            'buyer_name': counterparty.get('representative_name', act.get('counterparty_name', '')),
            'buyer_edrpou': counterparty.get('edrpou', act.get('counterparty_edrpou', '')),
            'buyer_address': counterparty.get('legal_address', ''),
            'buyer_email': counterparty.get('email', ''),
            'buyer_phone': counterparty.get('phone', ''),
            'buyer_iban': counterparty.get('bank_account', counterparty.get('iban', '')),
            'buyer_mfo': counterparty.get('mfo', ''),
            'buyer_bank': counterparty.get('bank_name', counterparty.get('bank', '')),
            'buyer_representative': counterparty.get('represented_by', ''),
            'buyer_position': counterparty.get('position', 'Директор'),
            'buyer_signature': counterparty.get('signature', ''),
        }
        
        return context
