"""PDF service with template support."""

import os
import traceback
from pathlib import Path
from datetime import datetime
from weasyprint import HTML
import logging
from typing import Dict, Any, Optional, List
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
        
        # Format date as full text
        formatted_date_full_text = self.renderer.format_date_text_full(invoice_date)
        
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
            'document_date_text_full': formatted_date_full_text,  # Дата прописом
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
            
            # VAT status - Supplier
            'supplier_is_vat_payer': supplier.get('vat_payer', False),
            'supplier_vat_status': 'Платник ПДВ' if supplier.get('vat_payer', False) else 'Неплатник ПДВ',
            'supplier_vat_rate': supplier.get('vat_rate', 20.0) if supplier.get('vat_payer', False) else 0.0,
            
            # VAT status - Buyer/Counterparty
            'buyer_is_vat_payer': counterparty.get('vat_payer', False),
            'buyer_vat_status': 'Платник ПДВ' if counterparty.get('vat_payer', False) else 'Неплатник ПДВ',
            'buyer_vat_rate': counterparty.get('vat_rate', 20.0) if counterparty.get('vat_payer', False) else 0.0,
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
            print(f"🔍 [PDF] Starting PDF generation for act: {act.get('number')}")
            print(f"📦 [PDF] Act data: counterparty={act.get('counterparty_name')}, total={act.get('total_amount')}")
            print(f"📦 [PDF] Items count: {len(act.get('items', []))}")
            if act.get('items'):
                print(f"📦 [PDF] First item: name={act['items'][0].get('name')}, qty={act['items'][0].get('quantity')}")
            
            logger.info(f"🔍 Starting PDF generation for act: {act.get('number')}")
            logger.info(f"📦 Act data received: counterparty={act.get('counterparty_name')}, items={len(act.get('items', []))}, total={act.get('total_amount')}")
            logger.info(f"📦 First item: {act.get('items', [{}])[0] if act.get('items') else 'No items'}")
            
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
            
            logger.info("✅ Context prepared successfully")
            logger.info(f"📦 Context counterparty: {context.get('buyer_name')}")
            logger.info(f"📦 Context items count: {len(context.get('items', []))}")
            
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
    
    async def generate_waybill_pdf(
        self,
        waybill: dict,
        supplier: dict,
        counterparty: dict,
        template_id: str = None
    ) -> str:
        """
        Generate waybill PDF using database template with ALL variables from invoices and acts.
        """
        try:
            print(f"🔍 [PDF] Starting PDF generation for waybill: {waybill.get('number')}")
            print(f"📦 [PDF] Waybill data: counterparty={waybill.get('counterparty_name')}, total={waybill.get('total_amount')}")
            print(f"📦 [PDF] Items count: {len(waybill.get('items', []))}")
            if waybill.get('items'):
                print(f"📦 [PDF] First item: name={waybill['items'][0].get('name')}, qty={waybill['items'][0].get('quantity')}")
            
            logger.info(f"🔍 Starting PDF generation for waybill: {waybill.get('number')}")
            logger.info(f"📦 Waybill data received: counterparty={waybill.get('counterparty_name')}, items={len(waybill.get('items', []))}, total={waybill.get('total_amount')}")
            
            # Get template
            if template_id:
                template = await self.template_service.get_template_by_id(
                    supplier.get('_id'),
                    template_id
                )
            else:
                template = await self.template_service.get_default_template(
                    supplier.get('_id'),
                    'waybill'
                )
            
            if not template:
                logger.error("No waybill template found, creating default")
                await self.template_service.seed_default_templates(supplier.get('_id'))
                template = await self.template_service.get_default_template(
                    supplier.get('_id'),
                    'waybill'
                )
            
            if not template:
                raise ValueError("Could not create or retrieve waybill template")
            
            # Prepare context with ALL variables from invoices and acts
            context = self._prepare_waybill_context(waybill, supplier, counterparty)
            
            logger.info("✅ Context prepared successfully")
            logger.info(f"📦 Context counterparty: {context.get('buyer_name')}")
            logger.info(f"📦 Context items count: {len(context.get('items', []))}")
            
            # Render HTML
            html_content = self.renderer.render(
                template.content,
                context
            )
            
            # Generate PDF
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_waybill_number = str(waybill.get('number', 'unknown')).replace('/', '_').replace('\\', '_')
            pdf_filename = f"waybill_{safe_waybill_number}_{timestamp}.pdf"
            pdf_path = os.path.join('/tmp/document_pdfs', pdf_filename)
            
            os.makedirs('/tmp/document_pdfs', exist_ok=True)
            
            HTML(string=html_content).write_pdf(pdf_path)
            
            logger.info(f"✅ Waybill PDF generated successfully: {pdf_path}")
            return pdf_path
            
        except Exception as e:
            logger.error(f"Error generating waybill PDF: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    def _prepare_waybill_context(self, waybill: dict, supplier: dict, counterparty: dict) -> dict:
        """
        Prepare context for waybill template with ALL variables from invoices and acts.
        """
        # Parse dates
        waybill_date = waybill.get('date')
        if isinstance(waybill_date, str):
            waybill_date = datetime.fromisoformat(waybill_date.replace('Z', '+00:00'))
        elif not isinstance(waybill_date, datetime):
            waybill_date = datetime.now()
        
        # Format dates in different formats (like in acts)
        formatted_date = waybill_date.strftime('%d.%m.%Y')
        formatted_date_short = waybill_date.strftime('%d.%m.%y')
        formatted_date_iso = waybill_date.strftime('%Y-%m-%d')
        formatted_date_long = waybill_date.strftime('%d %B %Y')
        
        # Ukrainian date formats
        formatted_date_text = self.renderer.format_date_ukrainian(waybill_date)
        formatted_date_text_full = self.renderer.format_date_text_full(waybill_date)
        
        # Extract city from supplier address
        supplier_address = supplier.get('legal_address', '')
        city_name = self._extract_city_from_address(supplier_address)
        
        # Get logo file path for WeasyPrint
        logo_file_path = self._get_logo_file_path(supplier.get('logo_url', ''))
        
        # Calculate VAT (same as in acts)
        total_amount = float(waybill.get('total_amount', 0))
        is_vat_payer = supplier.get('vat_payer', supplier.get('is_vat_payer', False))
        vat_rate = supplier.get('vat_rate', 20.0) if is_vat_payer else 0.0
        
        if is_vat_payer:
            amount_without_vat = total_amount / (1 + vat_rate / 100)
            vat_amount = total_amount - amount_without_vat
            vat_note = f"У тому числі ПДВ {vat_rate}%: {vat_amount:.2f} грн"
        else:
            amount_without_vat = total_amount
            vat_amount = 0.0
            vat_note = "не платник ПДВ"
        
        # Convert amount to text (Ukrainian)
        total_amount_text = self.renderer.number_to_words_ua(total_amount)
        amount_without_vat_text = self.renderer.number_to_words_ua(amount_without_vat)
        vat_amount_text = self.renderer.number_to_words_ua(vat_amount)
        
        # Generate items table HTML
        items_html = self.renderer.generate_items_table_html(waybill.get('items', []))
        
        # Format items for template
        formatted_items = []
        for item in waybill.get('items', []):
            formatted_items.append({
                'name': item.get('name', ''),
                'unit': item.get('unit', 'шт'),
                'qty': f"{float(item.get('quantity', 0)):.2f}",
                'quantity': f"{float(item.get('quantity', 0)):.2f}",
                'price': f"{float(item.get('price', 0)):.2f}",
                'sum': f"{float(item.get('amount', 0)):.2f}",
                'amount': f"{float(item.get('amount', 0)):.2f}"
            })
        
        context = {
            # Document info - ALL formats
            'waybill_number': waybill.get('number', ''),
            'document_number': waybill.get('number', ''),  # Alias
            
            # Date in all formats
            'waybill_date': formatted_date,
            'waybill_date_short': formatted_date_short,
            'waybill_date_long': formatted_date_long,
            'waybill_date_iso': formatted_date_iso,
            'waybill_date_text': formatted_date_text,
            'waybill_date_text_full': formatted_date_text_full,
            'document_date': formatted_date,
            'document_date_text': formatted_date_text,
            'document_date_text_full': formatted_date_text_full,
            
            # Location
            'city': city_name,
            
            # Basis and references
            'basis': waybill.get('basis', waybill.get('based_on_order', waybill.get('based_on_document', 'Не вказано'))),
            'based_on_order': waybill.get('based_on_order', ''),
            'based_on_document': waybill.get('based_on_document', ''),
            'based_on_contract': waybill.get('based_on_contract', ''),
            
            # Items - multiple formats
            'items': formatted_items,
            'items_table': items_html,
            
            # Amounts - all variants
            'total_amount': f"{total_amount:.2f}",
            'total_amount_text': total_amount_text,
            'total_amount_words': total_amount_text,  # Alias
            'amount_in_words': total_amount_text,  # Alias
            
            'amount_without_vat': f"{amount_without_vat:.2f}",
            'amount_without_vat_text': amount_without_vat_text,
            
            'vat_amount': f"{vat_amount:.2f}",
            'vat_amount_text': vat_amount_text,
            'vat_rate': f"{vat_rate:.0f}",
            'is_vat_payer': is_vat_payer,
            'vat_note': vat_note,
            
            # Supplier info - complete
            'supplier_name': supplier.get('representative_name', ''),
            'supplier_company_name': supplier.get('representative_name', ''),  # Alias
            'supplier_edrpou': supplier.get('edrpou', ''),
            'supplier_code': supplier.get('edrpou', ''),  # Alias
            'supplier_address': supplier.get('legal_address', ''),
            'supplier_legal_address': supplier.get('legal_address', ''),  # Alias
            'supplier_email': supplier.get('email', ''),
            'supplier_phone': supplier.get('phone', ''),
            'supplier_iban': supplier.get('bank_account', supplier.get('iban', '')),
            'supplier_bank_account': supplier.get('bank_account', supplier.get('iban', '')),  # Alias
            'supplier_mfo': supplier.get('mfo', ''),
            'supplier_bank': supplier.get('bank_name', supplier.get('bank', '')),
            'supplier_bank_name': supplier.get('bank_name', supplier.get('bank', '')),  # Alias
            'supplier_representative': supplier.get('represented_by', ''),
            'supplier_represented_by': supplier.get('represented_by', ''),  # Alias
            'supplier_position': supplier.get('position', 'Директор'),
            'supplier_signature': supplier.get('signature', ''),
            'supplier_logo': logo_file_path,
            'supplier_logo_url': logo_file_path,  # Alias
            
            # Buyer/Counterparty info - complete
            'buyer_name': counterparty.get('representative_name', waybill.get('counterparty_name', '')),
            'buyer_company_name': counterparty.get('representative_name', waybill.get('counterparty_name', '')),  # Alias
            'counterparty_name': counterparty.get('representative_name', waybill.get('counterparty_name', '')),  # Alias
            
            'buyer_edrpou': counterparty.get('edrpou', waybill.get('counterparty_edrpou', '')),
            'buyer_code': counterparty.get('edrpou', waybill.get('counterparty_edrpou', '')),  # Alias
            'counterparty_edrpou': counterparty.get('edrpou', waybill.get('counterparty_edrpou', '')),  # Alias
            
            'buyer_address': counterparty.get('legal_address', ''),
            'buyer_legal_address': counterparty.get('legal_address', ''),  # Alias
            'buyer_email': counterparty.get('email', ''),
            'buyer_phone': counterparty.get('phone', ''),
            
            'buyer_iban': counterparty.get('bank_account', counterparty.get('iban', '')),
            'buyer_bank_account': counterparty.get('bank_account', counterparty.get('iban', '')),  # Alias
            'buyer_mfo': counterparty.get('mfo', ''),
            'buyer_bank': counterparty.get('bank_name', counterparty.get('bank', '')),
            'buyer_bank_name': counterparty.get('bank_name', counterparty.get('bank', '')),  # Alias
            
            'buyer_representative': counterparty.get('represented_by', ''),
            'buyer_represented_by': counterparty.get('represented_by', ''),  # Alias
            'buyer_position': counterparty.get('position', 'Директор'),
            'buyer_signature': counterparty.get('signature', ''),
        }
        
        return context

    async def generate_contract_pdf(
        self, 
        contract: Dict[str, Any],
        supplier: Dict[str, Any],
        counterparty: Dict[str, Any],
        template_id: Optional[str] = None,
        items: List[Dict[str, Any]] = None
    ) -> str:
        """
        Generate contract PDF using template based on contract type (goods/services).
        
        Args:
            contract: Contract data
            supplier: Supplier (user) data
            counterparty: Counterparty data
            template_id: Optional template ID (uses default if not provided)
            items: Optional list of items (from order)
            
        Returns:
            Path to generated PDF file
        """
        try:
            logger.info(f"Starting PDF generation for contract: {contract.get('number')}")
            logger.info(f"Items passed to generate_contract_pdf: {len(items) if items else 0} items")
            if items:
                logger.info(f"First item: {items[0] if items else 'None'}")
            
            # Determine sub_type based on contract_type
            contract_type = contract.get('contract_type', 'goods')
            if contract_type == 'services':
                sub_type = 'services'
            else:
                sub_type = 'goods'  # Default to goods for 'goods' and 'goods_and_services'
            
            logger.info(f"Contract type: {contract_type}, using template sub_type: {sub_type}")
            
            # Get template
            if template_id:
                template = await self.template_service.get_template_by_id(
                    template_id, 
                    supplier.get('_id')
                )
            else:
                # Get template based on sub_type (goods or services)
                template = await self.template_service.get_default_template(
                    supplier.get('_id'),
                    'contract',
                    sub_type
                )
            
            if not template:
                logger.warning(f"Template for sub_type '{sub_type}' not found, trying fallback")
                # Fallback to any contract template
                template = await self.template_service.get_default_template(
                    supplier.get('_id'),
                    'contract'
                )
            
            if not template:
                raise Exception("Contract template not found")
            
            logger.info(f"Contract template loaded: {template.name} (sub_type: {template.sub_type}, id: {template.id})")
            logger.info(f"Template content length: {len(template.content)}")
            logger.info(f"Template content preview: {template.content[:200]}...")
            
            # Prepare context
            context = self._prepare_contract_context(contract, supplier, counterparty, items or [])
            
            logger.info("Contract context prepared successfully")
            
            # Render template
            html_content = self.renderer.render(template.content, context)
            
            logger.info("Contract template rendered successfully")
            
            # Generate PDF
            contract_number = contract.get('number', 'unknown')
            safe_number = contract_number.replace('/', '_').replace('\\', '_')
            pdf_filename = f"contract_{safe_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_path = self.output_dir / pdf_filename
            
            HTML(string=html_content).write_pdf(pdf_path)
            
            logger.info(f"Generated contract PDF: {pdf_path}")
            return str(pdf_path)
            
        except Exception as e:
            logger.error(f"Error generating contract PDF: {str(e)}", exc_info=True)
            raise

    def _prepare_contract_context(
        self,
        contract: Dict[str, Any],
        supplier: Dict[str, Any],
        counterparty: Dict[str, Any],
        items: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Prepare context variables for contract template."""
        items = items or []
        
        # Format date
        date_value = contract.get('date', datetime.now())
        if isinstance(date_value, str):
            formatted_date = self._format_date_ukrainian(date_value)
            date_obj = self._parse_date(date_value)
        elif isinstance(date_value, datetime):
            formatted_date = self._format_date_ukrainian(date_value.isoformat())
            date_obj = date_value
        else:
            formatted_date = self._format_date_ukrainian(datetime.now().isoformat())
            date_obj = datetime.now()
        
        # Extract place of compilation from supplier address
        place_of_compilation = self._extract_city_from_address(supplier.get('legal_address', ''))
        
        # Get logo path
        logo_url = supplier.get('logo_url', '')
        logo_file_path = ''
        if logo_url:
            if logo_url.startswith('uploads/'):
                logo_file_path = f'/app/backend/{logo_url}'
            else:
                logo_file_path = f'/app/backend/uploads/{logo_url}'
            if not os.path.exists(logo_file_path):
                logo_file_path = ''
        
        # Calculate end date (31 грудня of the same year by default)
        end_date = f"31 грудня {date_obj.year} року" if date_obj else "31 грудня 2025 року"
        
        # Contract type labels
        contract_type_labels = {
            'goods': 'Поставка товарів',
            'services': 'Надання послуг',
            'goods_and_services': 'Поставка товарів та надання послуг'
        }
        contract_type = contract.get('contract_type', 'goods')
        contract_type_label = contract_type_labels.get(contract_type, contract_type)
        
        # Execution form labels
        execution_form_labels = {
            'one_time': 'Разова поставка / послуга',
            'periodic': 'Періодичне виконання',
            'with_specifications': 'З окремими специфікаціями',
            'annual_volume': 'В межах річного/квартального обсягу'
        }
        execution_form = contract.get('execution_form', '')
        execution_form_label = execution_form_labels.get(execution_form, execution_form)
        
        # Warranty period labels
        warranty_labels = {
            '12_months': '12 місяців',
            '24_months': '24 місяці',
            '36_months': '36 місяців',
            'not_applicable': 'Не передбачено'
        }
        warranty_period = contract.get('warranty_period', '')
        warranty_label = warranty_labels.get(warranty_period, warranty_period)
        
        # Penalty rate labels
        penalty_labels = {
            '0.01': '0,01% на день',
            '0.05': '0,05% на день',
            '0.1': '0,1% на день',
            '0.5': '0,5% на день',
            '1.0': '1,0% на день',
            'not_applicable': 'Не передбачено'
        }
        penalty_rate = contract.get('penalty_rate', '')
        penalty_label = penalty_labels.get(penalty_rate, penalty_rate)
        
        # Signing format labels
        signing_labels = {
            'paper': 'Паперовий',
            'electronic': 'Електронний (КЕП)',
            'both': 'Обидва варіанти'
        }
        signing_format = contract.get('signing_format', '')
        signing_label = signing_labels.get(signing_format, signing_format)
        
        # VAT status - check both 'vat_payer' and 'is_vat_payer' fields
        is_vat_payer = supplier.get('vat_payer', supplier.get('is_vat_payer', False))
        supplier_vat_rate = supplier.get('vat_rate', 20.0) if is_vat_payer else 0.0
        vat_note = '' if is_vat_payer else 'без ПДВ'
        supplier_vat_status = 'Платник ПДВ' if is_vat_payer else 'Не є платником ПДВ'
        
        counterparty_is_vat = counterparty.get('vat_payer', counterparty.get('is_vat_payer', False))
        counterparty_vat_rate = counterparty.get('vat_rate', 20.0) if counterparty_is_vat else 0.0
        counterparty_vat_status = 'Платник ПДВ' if counterparty_is_vat else 'Не є платником ПДВ'
        
        # Convert amount to words and calculate VAT
        amount_value = float(contract.get('amount', 0))
        amount_text = self._amount_to_words(amount_value)
        
        # Calculate VAT amounts
        if is_vat_payer and supplier_vat_rate > 0:
            vat_amount = amount_value * supplier_vat_rate / (100 + supplier_vat_rate)
            amount_without_vat = amount_value - vat_amount
        else:
            vat_amount = 0.0
            amount_without_vat = amount_value
        
        context = {
            # Contract main info
            'contract_number': contract.get('number', ''),
            'number': contract.get('number', ''),
            'document_number': contract.get('number', ''),
            'contract_date': formatted_date,
            'date': formatted_date,
            'document_date': formatted_date,
            'document_date_text': formatted_date,
            'contract_date_text': formatted_date,
            'contract_date_text_full': formatted_date,
            'contract_date_raw': str(date_value)[:10] if date_value else '',
            'document_year': str(date_obj.year) if date_obj else str(datetime.now().year),
            'place_of_compilation': place_of_compilation,
            'city': place_of_compilation,
            
            # Contract subject and terms
            'contract_subject': contract.get('subject', ''),
            'subject': contract.get('subject', ''),
            'contract_type': contract_type_label,
            'contract_type_text': contract_type_label,
            'contract_type_raw': contract_type,
            'execution_form': execution_form_label,
            'execution_form_text': execution_form_label,
            'execution_form_raw': execution_form,
            
            # Contract amount
            'contract_amount': f"{amount_value:,.2f}".replace(',', ' '),
            'amount': f"{amount_value:,.2f}".replace(',', ' '),
            'total_amount': f"{amount_value:,.2f}".replace(',', ' '),
            'amount_raw': amount_value,
            'contract_amount_text': amount_text,
            'total_amount_text': amount_text,
            'total_amount_words': amount_text,
            'amount_in_words': amount_text,
            
            # Contract terms
            'contract_term': f"з {formatted_date} до {end_date}",
            'start_date': formatted_date,
            'contract_start_date': formatted_date,
            'end_date': end_date,
            'contract_end_date': end_date,
            'contract_end_date_text': end_date,
            'payment_terms': 'Оплата здійснюється протягом 10 (десяти) календарних днів після дати постачання/підписання акту приймання-передачі.',
            
            # Contract details
            'delivery_address': contract.get('delivery_address', ''),
            'warranty_period': warranty_label,
            'warranty_period_text': warranty_label,
            'warranty_period_raw': warranty_period,
            'penalty_rate': penalty_label,
            'penalty_rate_text': penalty_label,
            'penalty_rate_raw': penalty_rate,
            'signing_format': signing_label,
            'signing_format_text': signing_label,
            'signing_format_raw': signing_format,
            'specification_required': 'Так' if contract.get('specification_required') else 'Ні',
            'quantity_variation_allowed': 'Так' if contract.get('quantity_variation_allowed') else 'Ні',
            
            # Based on order
            'based_on_order': contract.get('based_on_order', ''),
            
            # VAT info
            'vat_note': vat_note,
            'is_vat_payer': is_vat_payer,
            'vat_rate': supplier_vat_rate,
            'vat_amount': f"{vat_amount:,.2f}".replace(',', ' '),
            'vat_amount_text': self._amount_to_words(vat_amount) if vat_amount > 0 else '',
            'amount_without_vat': f"{amount_without_vat:,.2f}".replace(',', ' '),
            'amount_without_vat_text': self._amount_to_words(amount_without_vat),
            'supplier_is_vat_payer': is_vat_payer,
            'supplier_vat_rate': supplier_vat_rate,
            
            # Supplier info
            'supplier_name': supplier.get('representative_name', ''),
            'supplier_company_name': supplier.get('representative_name', ''),
            'supplier_short_name': supplier.get('short_name', supplier.get('representative_name', '')),
            'supplier_full_name': supplier.get('representative_name', ''),
            'supplier_edrpou': supplier.get('edrpou', ''),
            'supplier_code': supplier.get('edrpou', ''),
            'supplier_ipn': supplier.get('ipn', supplier.get('edrpou', '')),
            'supplier_address': supplier.get('legal_address', ''),
            'supplier_legal_address': supplier.get('legal_address', ''),
            'supplier_actual_address': supplier.get('actual_address', supplier.get('legal_address', '')),
            'supplier_email': supplier.get('email', ''),
            'supplier_phone': supplier.get('phone', ''),
            'supplier_iban': supplier.get('bank_account', supplier.get('iban', '')),
            'supplier_bank_account': supplier.get('bank_account', supplier.get('iban', '')),
            'supplier_mfo': supplier.get('mfo', ''),
            'supplier_bank': supplier.get('bank_name', supplier.get('bank', '')),
            'supplier_bank_name': supplier.get('bank_name', supplier.get('bank', '')),
            'supplier_director': supplier.get('director_name', ''),
            'supplier_director_name': supplier.get('director_name', ''),
            'supplier_director_position': supplier.get('director_position', 'Директор'),
            'supplier_position': supplier.get('director_position', 'Директор'),
            'supplier_representative': supplier.get('represented_by', supplier.get('director_name', '')),
            'supplier_represented_by': supplier.get('represented_by', supplier.get('director_name', '')),
            'supplier_signature': supplier.get('signature', supplier.get('director_name', '')),
            'supplier_acts_on': supplier.get('contract_type', 'Статуту'),
            'supplier_basis': supplier.get('contract_type', 'Статуту'),
            'supplier_contract_type': supplier.get('contract_type', 'Статуту'),
            'supplier_vat_status': supplier_vat_status,
            'supplier_logo': logo_file_path,
            'supplier_logo_url': logo_file_path,
            
            # Counterparty/Buyer info
            'buyer_name': counterparty.get('representative_name', contract.get('counterparty_name', '')),
            'buyer_company_name': counterparty.get('representative_name', contract.get('counterparty_name', '')),
            'buyer_short_name': counterparty.get('short_name', counterparty.get('representative_name', contract.get('counterparty_name', ''))),
            'counterparty_name': counterparty.get('representative_name', contract.get('counterparty_name', '')),
            
            'buyer_edrpou': counterparty.get('edrpou', contract.get('counterparty_edrpou', '')),
            'buyer_code': counterparty.get('edrpou', contract.get('counterparty_edrpou', '')),
            'counterparty_edrpou': counterparty.get('edrpou', contract.get('counterparty_edrpou', '')),
            'buyer_ipn': counterparty.get('ipn', counterparty.get('edrpou', contract.get('counterparty_edrpou', ''))),
            
            'buyer_address': counterparty.get('legal_address', ''),
            'buyer_legal_address': counterparty.get('legal_address', ''),
            'buyer_actual_address': counterparty.get('actual_address', counterparty.get('legal_address', '')),
            'buyer_email': counterparty.get('email', ''),
            'buyer_phone': counterparty.get('phone', ''),
            
            'buyer_iban': counterparty.get('bank_account', counterparty.get('iban', '')),
            'buyer_bank_account': counterparty.get('bank_account', counterparty.get('iban', '')),
            'buyer_mfo': counterparty.get('mfo', ''),
            'buyer_bank': counterparty.get('bank_name', counterparty.get('bank', '')),
            'buyer_bank_name': counterparty.get('bank_name', counterparty.get('bank', '')),
            
            'buyer_director': counterparty.get('director_name', ''),
            'buyer_director_name': counterparty.get('director_name', ''),
            'buyer_director_position': counterparty.get('director_position') or counterparty.get('position', 'Директор'),
            'buyer_position': counterparty.get('director_position') or counterparty.get('position', 'Директор'),
            'buyer_representative': counterparty.get('represented_by', counterparty.get('director_name', '')),
            'buyer_represented_by': counterparty.get('represented_by', counterparty.get('director_name', '')),
            'buyer_signature': counterparty.get('signature', counterparty.get('director_name', '')),
            'buyer_acts_on': counterparty.get('contract_type', 'Статуту'),
            'buyer_basis': counterparty.get('contract_type', 'Статуту'),
            'buyer_contract_type': counterparty.get('contract_type', 'Статуту'),
            'buyer_vat_status': counterparty_vat_status,
            'buyer_is_vat_payer': counterparty_is_vat,
            'buyer_vat_rate': counterparty_vat_rate,
        }
        
        # Add items data if available
        logger.info(f"Contract items received: {len(items) if items else 0} items")
        if items:
            logger.info(f"Items data: {items[:2]}")  # Log first 2 items
            
            # Generate items table HTML for contract (special format)
            items_html = self.renderer.generate_items_table_html(items, for_contract=True)
            
            # Format items for template iteration
            formatted_items = []
            for item in items:
                qty = item.get('quantity', item.get('qty', 0))
                price = item.get('price', 0)
                amount = item.get('amount', item.get('sum', 0))
                
                # Ensure numeric values
                try:
                    qty = float(qty) if qty else 0
                    price = float(price) if price else 0
                    amount = float(amount) if amount else 0
                except (ValueError, TypeError):
                    qty = 0
                    price = 0
                    amount = 0
                
                formatted_items.append({
                    'name': item.get('name', ''),
                    'unit': item.get('unit', 'шт'),
                    'qty': f"{qty:.0f}",
                    'quantity': f"{qty:.0f}",
                    'price': f"{price:.2f}",
                    'sum': f"{amount:.2f}",
                    'amount': f"{amount:.2f}",
                })
            
            context['items'] = formatted_items
            context['items_table'] = items_html
            context['items_count'] = len(formatted_items)
            logger.info(f"Formatted items for context: {formatted_items}")
        else:
            logger.warning("No items passed to contract context!")
            context['items'] = []
            context['items_table'] = ''
            context['items_count'] = 0
        
        return context

    def _format_date_ukrainian(self, date_str: str) -> str:
        """Format date in Ukrainian format."""
        try:
            if isinstance(date_str, str):
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            else:
                date_obj = date_str
            
            months_ua = {
                1: 'січня', 2: 'лютого', 3: 'березня', 4: 'квітня',
                5: 'травня', 6: 'червня', 7: 'липня', 8: 'серпня',
                9: 'вересня', 10: 'жовтня', 11: 'листопада', 12: 'грудня'
            }
            
            day = date_obj.day
            month = months_ua[date_obj.month]
            year = date_obj.year
            
            return f"{day} {month} {year} року"
        except:
            return "дата не вказана"
    
    def _parse_date(self, date_str: str) -> datetime:
        """Parse date string to datetime object."""
        try:
            if isinstance(date_str, str):
                return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            elif isinstance(date_str, datetime):
                return date_str
            else:
                return datetime.now()
        except:
            return datetime.now()

    def _amount_to_words(self, amount: float) -> str:
        """Convert amount to Ukrainian words."""
        try:
            units = ['', 'одна', 'дві', 'три', 'чотири', "п'ять", 'шість', 'сім', 'вісім', "дев'ять"]
            teens = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 
                     "п'ятнадцять", 'шістнадцять', 'сімнадцять', 'вісімнадцять', "дев'ятнадцять"]
            tens = ['', '', 'двадцять', 'тридцять', 'сорок', "п'ятдесят", 
                    'шістдесят', 'сімдесят', 'вісімдесят', "дев'яносто"]
            hundreds = ['', 'сто', 'двісті', 'триста', 'чотириста', "п'ятсот", 
                       'шістсот', 'сімсот', 'вісімсот', "дев'ятсот"]
            
            def three_digits(n, gender='f'):
                """Convert 3-digit number to words."""
                if n == 0:
                    return ''
                result = []
                h = n // 100
                t = (n % 100) // 10
                u = n % 10
                
                if h > 0:
                    result.append(hundreds[h])
                if t == 1:
                    result.append(teens[u])
                else:
                    if t > 1:
                        result.append(tens[t])
                    if u > 0:
                        if gender == 'm':
                            m_units = ['', 'один', 'два', 'три', 'чотири', "п'ять", 
                                      'шість', 'сім', 'вісім', "дев'ять"]
                            result.append(m_units[u])
                        else:
                            result.append(units[u])
                return ' '.join(result)
            
            if amount == 0:
                return 'нуль гривень 00 копійок'
            
            hrn = int(amount)
            kop = int(round((amount - hrn) * 100))
            
            result_parts = []
            
            # Millions
            if hrn >= 1000000:
                millions = hrn // 1000000
                hrn = hrn % 1000000
                mil_word = three_digits(millions, 'm')
                if millions % 10 == 1 and millions % 100 != 11:
                    result_parts.append(f"{mil_word} мільйон")
                elif 2 <= millions % 10 <= 4 and (millions % 100 < 10 or millions % 100 >= 20):
                    result_parts.append(f"{mil_word} мільйони")
                else:
                    result_parts.append(f"{mil_word} мільйонів")
            
            # Thousands
            if hrn >= 1000:
                thousands = hrn // 1000
                hrn = hrn % 1000
                th_word = three_digits(thousands, 'f')
                if thousands % 10 == 1 and thousands % 100 != 11:
                    result_parts.append(f"{th_word} тисяча")
                elif 2 <= thousands % 10 <= 4 and (thousands % 100 < 10 or thousands % 100 >= 20):
                    result_parts.append(f"{th_word} тисячі")
                else:
                    result_parts.append(f"{th_word} тисяч")
            
            # Hundreds, tens, units
            if hrn > 0:
                result_parts.append(three_digits(hrn, 'f'))
            
            # Currency word
            hrn_total = int(amount)
            if hrn_total % 10 == 1 and hrn_total % 100 != 11:
                currency = 'гривня'
            elif 2 <= hrn_total % 10 <= 4 and (hrn_total % 100 < 10 or hrn_total % 100 >= 20):
                currency = 'гривні'
            else:
                currency = 'гривень'
            
            result_parts.append(currency)
            result_parts.append(f"{kop:02d} коп.")
            
            return ' '.join(result_parts).strip()
        except Exception as e:
            logger.error(f"Error converting amount to words: {e}")
            return f"{amount:.2f} грн"
