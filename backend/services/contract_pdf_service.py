"""Service for generating contract PDFs."""

import os
from pathlib import Path
from datetime import datetime
from weasyprint import HTML
import logging

logger = logging.getLogger(__name__)


class ContractPDFService:
    """Service for generating PDF documents for contracts."""
    
    def __init__(self):
        self.output_dir = Path("/tmp/contract_pdfs")
        self.output_dir.mkdir(exist_ok=True)
    
    def extract_city_from_address(self, address: str) -> str:
        """Extract city name from Ukrainian legal address."""
        if not address:
            return "м. Київ"
        
        # Try to find city pattern: "місто Назва" or "м. Назва" or "смт Назва" or "село Назва"
        import re
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
    
    def generate_html(self, contract: dict) -> str:
        """Generate HTML for contract document with professional design."""
        
        # Format date in Ukrainian
        date_value = contract.get('date', datetime.now())
        
        # Convert datetime object to string if needed
        if isinstance(date_value, datetime):
            date_str = date_value.isoformat()
        else:
            date_str = str(date_value)
        
        formatted_date = self.format_date_ukrainian(date_str)
        
        # Get supplier details
        supplier = contract.get('supplier_details', {})
        supplier_name = supplier.get('representative_name', '—')
        supplier_edrpou = supplier.get('edrpou', '—')
        supplier_address = supplier.get('legal_address', '—')
        supplier_director = supplier.get('director_name', '—')
        supplier_director_position = supplier.get('director_position', 'Директор')
        
        # Get counterparty details
        counterparty = contract.get('counterparty_details', {})
        counterparty_name = counterparty.get('representative_name', contract.get('counterparty_name', '—'))
        counterparty_edrpou = contract.get('counterparty_edrpou', '—')
        counterparty_address = counterparty.get('legal_address', '—')
        counterparty_director = counterparty.get('director_name', '—')
        counterparty_director_position = counterparty.get('director_position', 'Директор')
        
        # Extract place of compilation from supplier address
        place_of_compilation = self.extract_city_from_address(supplier_address)
        
        # Contract details
        contract_number = contract.get('number', '—')
        contract_subject = contract.get('subject', '—')
        contract_amount = float(contract.get('amount', 0))
        contract_type = contract.get('contract_type', 'Загальний')
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{
                    size: A4;
                    margin: 2cm;
                }}
                body {{
                    font-family: 'DejaVu Sans', Arial, sans-serif;
                    font-size: 11pt;
                    line-height: 1.4;
                    color: #000;
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .header h1 {{
                    font-size: 16pt;
                    font-weight: bold;
                    margin: 0;
                    padding: 0;
                }}
                .document-info {{
                    text-align: right;
                    margin-bottom: 20px;
                    font-size: 10pt;
                }}
                .parties {{
                    margin: 25px 0;
                    line-height: 1.6;
                }}
                .party {{
                    margin-bottom: 20px;
                }}
                .party-title {{
                    font-weight: bold;
                    text-decoration: underline;
                    margin-bottom: 5px;
                }}
                .subject {{
                    margin: 25px 0;
                    padding: 15px;
                    background-color: #f8f9fa;
                    border-left: 4px solid #ec4899;
                }}
                .subject-title {{
                    font-weight: bold;
                    font-size: 12pt;
                    margin-bottom: 10px;
                }}
                .amount {{
                    margin: 20px 0;
                    padding: 15px;
                    background-color: #fef2f2;
                    border: 2px solid #ec4899;
                    text-align: center;
                }}
                .amount-value {{
                    font-size: 18pt;
                    font-weight: bold;
                    color: #be185d;
                }}
                .signatures {{
                    margin-top: 50px;
                    display: flex;
                    justify-content: space-between;
                }}
                .signature-block {{
                    width: 45%;
                }}
                .signature-line {{
                    border-bottom: 1px solid #000;
                    width: 200px;
                    margin: 20px 0 5px 0;
                }}
                .terms {{
                    margin: 25px 0;
                    line-height: 1.8;
                }}
                .term-item {{
                    margin-bottom: 10px;
                }}
                .footer {{
                    margin-top: 40px;
                    font-size: 9pt;
                    color: #666;
                    text-align: center;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>ДОГОВІР №{contract_number}</h1>
                <p>{contract_type}</p>
            </div>
            
            <div class="document-info">
                <p>{place_of_compilation}, {formatted_date}</p>
            </div>
            
            <div class="parties">
                <div class="party">
                    <div class="party-title">ПОСТАЧАЛЬНИК (Сторона 1):</div>
                    <p><strong>{supplier_name}</strong></p>
                    <p>ЄДРПОУ: {supplier_edrpou}</p>
                    <p>Юридична адреса: {supplier_address}</p>
                    <p>В особі {supplier_director_position}: {supplier_director}</p>
                </div>
                
                <div class="party">
                    <div class="party-title">ЗАМОВНИК (Сторона 2):</div>
                    <p><strong>{counterparty_name}</strong></p>
                    <p>ЄДРПОУ: {counterparty_edrpou}</p>
                    <p>Юридична адреса: {counterparty_address}</p>
                    <p>В особі {counterparty_director_position}: {counterparty_director}</p>
                </div>
            </div>
            
            <div class="subject">
                <div class="subject-title">1. ПРЕДМЕТ ДОГОВОРУ</div>
                <p>{contract_subject}</p>
            </div>
            
            <div class="amount">
                <p style="margin: 0 0 10px 0; font-weight: bold;">Загальна вартість договору:</p>
                <div class="amount-value">{contract_amount:,.2f} грн</div>
            </div>
            
            <div class="terms">
                <div class="subject-title">2. УМОВИ ДОГОВОРУ</div>
                <div class="term-item">2.1. Постачальник зобов'язується надати послуги/товари відповідно до предмету договору.</div>
                <div class="term-item">2.2. Замовник зобов'язується прийняти та оплатити послуги/товари у встановлені терміни.</div>
                <div class="term-item">2.3. Оплата здійснюється шляхом безготівкового переказу на розрахунковий рахунок Постачальника.</div>
                
                <div class="subject-title" style="margin-top: 20px;">3. ТЕРМІН ДІЇ ДОГОВОРУ</div>
                <div class="term-item">3.1. Договір набирає чинності з дати підписання та діє до повного виконання зобов'язань сторонами.</div>
                
                <div class="subject-title" style="margin-top: 20px;">4. ВІДПОВІДАЛЬНІСТЬ СТОРІН</div>
                <div class="term-item">4.1. За невиконання або неналежне виконання зобов'язань за цим Договором Сторони несуть відповідальність згідно з чинним законодавством України.</div>
            </div>
            
            <div class="signatures">
                <div class="signature-block">
                    <p><strong>ПОСТАЧАЛЬНИК:</strong></p>
                    <p>{supplier_name}</p>
                    <p>{supplier_director_position}: {supplier_director}</p>
                    <div class="signature-line"></div>
                    <p style="font-size: 9pt; margin: 0;">(підпис)</p>
                </div>
                
                <div class="signature-block">
                    <p><strong>ЗАМОВНИК:</strong></p>
                    <p>{counterparty_name}</p>
                    <p>{counterparty_director_position}: {counterparty_director}</p>
                    <div class="signature-line"></div>
                    <p style="font-size: 9pt; margin: 0;">(підпис)</p>
                </div>
            </div>
            
            <div class="footer">
                <p>Договір складено в двох примірниках, які мають однакову юридичну силу.</p>
            </div>
        </body>
        </html>
        """
        
        return html_content
    
    def generate_pdf(self, contract: dict) -> str:
        """
        Generate PDF from contract data.
        
        Args:
            contract: Contract dictionary with all details
            
        Returns:
            str: Path to generated PDF file
        """
        try:
            # Generate HTML
            html_content = self.generate_html(contract)
            
            # Generate PDF filename
            contract_number = contract.get('number', 'unknown')
            safe_number = contract_number.replace('/', '_').replace('\\', '_')
            pdf_filename = f"contract_{safe_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_path = self.output_dir / pdf_filename
            
            # Generate PDF
            HTML(string=html_content).write_pdf(pdf_path)
            
            logger.info(f"Generated contract PDF: {pdf_path}")
            return str(pdf_path)
            
        except Exception as e:
            logger.error(f"Error generating contract PDF: {str(e)}")
            raise
