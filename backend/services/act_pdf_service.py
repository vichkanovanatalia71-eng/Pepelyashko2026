"""Service for generating act PDFs using external template."""

import os
from pathlib import Path
from datetime import datetime
from weasyprint import HTML
import logging
import re
from pybars import Compiler

logger = logging.getLogger(__name__)


class ActPDFService:
    """Service for generating PDF documents for acts using external template."""
    
    def __init__(self):
        self.output_dir = Path("/tmp/act_pdfs")
        self.output_dir.mkdir(exist_ok=True)
        self.template_path = Path('/app/backend/act_template.html')
        
        # Load template
        with open(self.template_path, 'r', encoding='utf-8') as f:
            self.template = f.read()
    
    def extract_city_from_address(self, address: str) -> str:
        """Extract city name from Ukrainian legal address."""
        if not address:
            return "м. Київ"
        
        # Try to find city pattern: "місто Назва" or "м. Назва" or "смт Назва" or "село Назва"
        patterns = [
            r'місто\s+([А-ЯІЇЄҐа-яіїєґ\'\-]+)',
            r'м\.\s*([А-ЯІЇЄҐа-яіїєґ\'\-]+)',
            r'смт\s+([А-ЯІЇЄҐа-яіїєґ\'\-]+)',
            r'село\s+([А-ЯІЇЄҐа-яіїєґ\'\-]+)',
            r'с\.\s*([А-ЯІЇЄҐа-яіїєґ\'\-]+)'
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
    
    def format_date_ukrainian(self, date_str: str) -> str:
        """Format date in Ukrainian format: '06 грудня 2025 року'"""
        months_ukrainian = {
            1: 'січня', 2: 'лютого', 3: 'березня', 4: 'квітня',
            5: 'травня', 6: 'червня', 7: 'липня', 8: 'серпня',
            9: 'вересня', 10: 'жовтня', 11: 'листопада', 12: 'грудня'
        }
        
        try:
            # Parse ISO date string
            if 'T' in date_str:
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            else:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            
            day = date_obj.day
            month = months_ukrainian.get(date_obj.month, '')
            year = date_obj.year
            
            return f"{day:02d} {month} {year} року"
        except:
            return date_str
    
    def number_to_words_ua(self, number: float) -> str:
        """Convert number to Ukrainian words - simplified version."""
        try:
            integer_part = int(number)
            decimal_part = int((number - integer_part) * 100)
            
            # Simplified: just return formatted number with currency
            if integer_part % 10 == 1 and integer_part % 100 != 11:
                currency = 'гривня'
            elif integer_part % 10 in [2,3,4] and integer_part % 100 not in [12,13,14]:
                currency = 'гривні'
            else:
                currency = 'гривень'
            
            result = f"{integer_part} {currency}"
            
            if decimal_part > 0:
                if decimal_part % 10 == 1 and decimal_part % 100 != 11:
                    kop_currency = 'копійка'
                elif decimal_part % 10 in [2,3,4] and decimal_part % 100 not in [12,13,14]:
                    kop_currency = 'копійки'
                else:
                    kop_currency = 'копійок'
                result += f" {decimal_part:02d} {kop_currency}"
            
            return result.strip()
        except Exception as e:
            logger.error(f"Error converting number to words: {e}")
            return f"{int(number)} гривень"
    
    def format_currency(self, value: float) -> str:
        """Format currency with space as thousands separator."""
        return f"{value:,.2f}".replace(',', ' ')
    
    def generate_html(self, act: dict) -> str:
        """Generate HTML for act document using external template."""
        
        # Format date in Ukrainian
        date_value = act.get('date', datetime.now())
        
        # Convert datetime object to string if needed
        if isinstance(date_value, datetime):
            date_str = date_value.isoformat()
        else:
            date_str = str(date_value)
        
        formatted_date = self.format_date_ukrainian(date_str)
        
        # Calculate totals
        total_amount = float(act.get('total_amount', 0))
        vat_rate = 20.0  # Default VAT rate
        is_vat_payer = False  # По умолчанию не платник ПДВ
        
        # Check if VAT payer from supplier details
        supplier_data = act.get('supplier_details', {})
        # Implement logic if needed
        
        if is_vat_payer:
            amount_without_vat = total_amount / (1 + vat_rate / 100)
            vat_amount = total_amount - amount_without_vat
        else:
            amount_without_vat = total_amount
            vat_amount = 0.0
        
        # Get counterparty (buyer) details
        counterparty_data = act.get('counterparty_details', {})
        buyer_name = counterparty_data.get('representative_name', act.get('counterparty_name', '—'))
        buyer_edrpou = act.get('counterparty_edrpou', '—')
        buyer_address = counterparty_data.get('legal_address', '—')
        buyer_iban = counterparty_data.get('iban', '—')
        buyer_bank = counterparty_data.get('bank', '—')
        buyer_mfo = counterparty_data.get('mfo', '—')
        buyer_email = counterparty_data.get('email', '—')
        buyer_phone = counterparty_data.get('phone', '—')
        buyer_representative = counterparty_data.get('represented_by', '—')
        buyer_position = counterparty_data.get('position', '—')
        buyer_signature = counterparty_data.get('signature', '—')
        
        # Get supplier details from user profile
        supplier_name = supplier_data.get('representative_name', supplier_data.get('company_name', '—'))
        supplier_edrpou = supplier_data.get('edrpou', '—')
        supplier_address = supplier_data.get('legal_address', '—')
        supplier_iban = supplier_data.get('iban', '—')
        supplier_bank = supplier_data.get('bank', '—')
        supplier_mfo = supplier_data.get('mfo', '—')
        supplier_email = supplier_data.get('email', '—')
        supplier_phone = supplier_data.get('phone', '—')
        supplier_representative = supplier_data.get('represented_by', '—')
        supplier_signature = supplier_data.get('signature', '—')
        
        # Get supplier logo if exists
        supplier_logo = None
        if supplier_data.get('company_logo'):
            logo_path = f"/app/backend/{supplier_data['company_logo']}"
            if os.path.exists(logo_path):
                # Convert logo to base64 for embedding
                import base64
                with open(logo_path, 'rb') as logo_file:
                    logo_data = base64.b64encode(logo_file.read()).decode('utf-8')
                    # Determine image type
                    ext = Path(logo_path).suffix.lower()
                    mime_type = 'image/png' if ext == '.png' else 'image/jpeg'
                    supplier_logo = f"data:{mime_type};base64,{logo_data}"
        
        # Prepare items for Handlebars templates
        formatted_items = []
        for item in act.get('items', []):
            formatted_items.append({
                'name': item.get('name', ''),
                'unit': item.get('unit', 'шт'),
                'qty': self.format_currency(float(item.get('quantity', 0))),
                'price': self.format_currency(float(item.get('price', 0))),
                'sum': self.format_currency(float(item.get('amount', 0)))
            })
        
        # Prepare template context
        context = {
            # Act info
            'act_number': act.get('number', '—'),
            'act_date': formatted_date,
            'basis': act.get('based_on_order', 'Не вказано'),
            'based_on_order': act.get('based_on_order', None),
            'based_on_document': act.get('based_on_contract', None),
            # Supplier (Виконавець)
            'supplier_name': supplier_name,
            'supplier_edrpou': supplier_edrpou,
            'supplier_address': supplier_address,
            'supplier_iban': supplier_iban,
            'supplier_bank': supplier_bank,
            'supplier_mfo': supplier_mfo,
            'supplier_email': supplier_email,
            'supplier_phone': supplier_phone,
            'supplier_representative': supplier_representative,
            'supplier_signature': supplier_signature,
            'supplier_logo': supplier_logo,
            # Buyer (Замовник)
            'buyer_name': buyer_name,
            'buyer_edrpou': buyer_edrpou,
            'buyer_address': buyer_address,
            'buyer_iban': buyer_iban,
            'buyer_bank': buyer_bank,
            'buyer_mfo': buyer_mfo,
            'buyer_email': buyer_email,
            'buyer_phone': buyer_phone,
            'buyer_representative': buyer_representative,
            'buyer_position': buyer_position,
            'buyer_signature': buyer_signature,
            # Items
            'items': formatted_items,
            # Totals
            'total_amount': self.format_currency(total_amount),
            'amount_without_vat': self.format_currency(amount_without_vat),
            'vat_amount': self.format_currency(vat_amount),
            'vat_rate': str(int(vat_rate)),
            'total_amount_text': self.number_to_words_ua(total_amount),
            'is_vat_payer': is_vat_payer
        }
        
        # Parse template using Handlebars
        try:
            compiler = Compiler()
            
            # Register helper for incrementing index
            def inc_helper(this, index):
                return str(index + 1)
            
            template_func = compiler.compile(self.template)
            helpers = {'inc': inc_helper}
            parsed_html = template_func(context, helpers=helpers)
            
            return parsed_html
        except Exception as e:
            logger.error(f"Error parsing template: {e}")
            # Fallback to simple regex replacement
            parsed = self.template
            for key, value in context.items():
                if not isinstance(value, (list, dict, bool)):
                    parsed = parsed.replace(f"{{{{{key}}}}}", str(value))
            return parsed
    
    def generate_pdf(self, act: dict) -> str:
        """Generate PDF from act data and return the file path."""
        try:
            # Generate HTML
            html_content = self.generate_html(act)
            
            # Generate filename
            act_number = act.get('number', 'unknown').replace('/', '_')
            filename = f"act_{act_number}.pdf"
            output_path = self.output_dir / filename
            
            # Convert HTML to PDF
            HTML(string=html_content).write_pdf(str(output_path))
            
            logger.info(f"Generated act PDF: {output_path}")
            return str(output_path)
        except Exception as e:
            logger.error(f"Error generating act PDF: {str(e)}")
            raise
