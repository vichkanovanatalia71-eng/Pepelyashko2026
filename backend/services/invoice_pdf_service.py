"""Service for generating invoice PDFs."""

import os
from pathlib import Path
from datetime import datetime
from weasyprint import HTML
import logging

logger = logging.getLogger(__name__)


class InvoicePDFService:
    """Service for generating PDF documents for invoices."""
    
    def __init__(self):
        self.output_dir = Path("/tmp/invoice_pdfs")
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
    
    def generate_html(self, invoice: dict) -> str:
        """Generate HTML for invoice document with professional design."""
        
        # Format date in Ukrainian
        date_value = invoice.get('date', datetime.now())
        
        # Convert datetime object to string if needed
        if isinstance(date_value, datetime):
            date_str = date_value.isoformat()
        else:
            date_str = str(date_value)
        
        formatted_date = self.format_date_ukrainian(date_str)
        
        # Calculate items for table
        items_html = ""
        for idx, item in enumerate(invoice.get('items', []), 1):
            # Convert to float to handle both string and numeric values
            quantity = float(item.get('quantity', 0))
            price = float(item.get('price', 0))
            amount = float(item.get('amount', 0))
            
            items_html += f"""
            <tr>
                <td class="table-cell center">{idx}</td>
                <td class="table-cell">{item.get('name', '—')}</td>
                <td class="table-cell center">{item.get('unit', 'шт')}</td>
                <td class="table-cell right">{quantity:.2f}</td>
                <td class="table-cell right">{price:.2f}</td>
                <td class="table-cell right bold">{amount:.2f}</td>
            </tr>
            """
        
        # Calculate totals
        total_without_vat = float(invoice.get('total_amount', 0))
        vat_amount = 0.0
        total_to_pay = total_without_vat + vat_amount
        
        # Get counterparty (buyer) details
        counterparty_data = invoice.get('counterparty_details', {})
        buyer_name = counterparty_data.get('representative_name', invoice.get('counterparty_name', '—'))
        buyer_edrpou = invoice.get('counterparty_edrpou', '—')
        buyer_address = counterparty_data.get('legal_address', '—')
        buyer_iban = counterparty_data.get('iban', '—')
        buyer_bank = counterparty_data.get('bank', '—')
        buyer_mfo = counterparty_data.get('mfo', '—')
        buyer_signature = counterparty_data.get('signature', '—')
        
        # Get supplier details from user profile
        supplier_data = invoice.get('supplier_details', {})
        supplier_name = supplier_data.get('representative_name', supplier_data.get('company_name', '—'))
        supplier_edrpou = supplier_data.get('edrpou', '—')
        supplier_address = supplier_data.get('legal_address', '—')
        supplier_iban = supplier_data.get('iban', '—')
        supplier_bank = supplier_data.get('bank', '—')
        supplier_mfo = supplier_data.get('mfo', '—')
        supplier_signature = supplier_data.get('signature', '—')
        
        # Extract city from supplier address
        supplier_city = self.extract_city_from_address(supplier_address)
        
        # Build professional HTML document with green design (invoice-specific)
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{
                    size: A4;
                    margin: 20mm;
                }}
                body {{
                    font-family: 'DejaVu Sans', Arial, sans-serif;
                    font-size: 10pt;
                    line-height: 1.4;
                    color: #1e293b;
                    margin: 0;
                    padding: 0;
                    background: #f8fafc;
                }}
                .document {{
                    width: 100%;
                    max-width: 210mm;
                    background: white;
                    padding: 20px;
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 20px;
                    padding: 20px;
                    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
                    border-radius: 8px;
                }}
                .location {{
                    font-size: 9pt;
                    margin-bottom: 10px;
                    color: #065f46;
                }}
                .title {{
                    font-size: 14pt;
                    font-weight: bold;
                    margin: 10px 0;
                    color: #047857;
                }}
                .section-title {{
                    font-size: 11pt;
                    font-weight: bold;
                    text-align: center;
                    margin: 20px 0 15px 0;
                    text-transform: uppercase;
                    color: #047857;
                    padding: 8px;
                    background: #d1fae5;
                    border-left: 4px solid #10b981;
                }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 10px 0;
                }}
                table.items-table {{
                    margin-bottom: 0;
                }}
                table.items-table th {{
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    padding: 10px 5px;
                    font-size: 9pt;
                    font-weight: bold;
                    border: 1px solid #059669;
                    text-align: center;
                }}
                table.items-table td {{
                    padding: 8px 5px;
                    font-size: 9pt;
                    border: 1px solid #a7f3d0;
                }}
                .table-cell {{
                    vertical-align: middle;
                }}
                .center {{
                    text-align: center;
                }}
                .right {{
                    text-align: right;
                }}
                .bold {{
                    font-weight: bold;
                }}
                .summary-row td {{
                    border: none;
                    border-top: 1px solid #059669;
                    padding: 8px 5px;
                    font-size: 10pt;
                    background: #ecfdf5;
                }}
                .summary-row.total td {{
                    font-weight: bold;
                    border-top: 2px solid #047857;
                    background: #d1fae5;
                    color: #065f46;
                }}
                .signatures {{
                    margin-top: 25px;
                }}
                .signatures-grid {{
                    display: table;
                    width: 100%;
                    border: 2px solid #10b981;
                }}
                .party-column {{
                    display: table-cell;
                    width: 50%;
                    padding: 15px;
                    vertical-align: top;
                    border-right: 2px solid #10b981;
                }}
                .party-column:last-child {{
                    border-right: none;
                }}
                .party-header {{
                    font-weight: bold;
                    font-size: 11pt;
                    text-align: center;
                    margin-bottom: 15px;
                    text-transform: uppercase;
                    color: white;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    padding: 8px;
                    border-radius: 4px;
                }}
                .party-info {{
                    font-size: 8pt;
                    line-height: 1.8;
                }}
                .party-info .label {{
                    font-weight: bold;
                    display: inline-block;
                    width: 85px;
                    color: #065f46;
                }}
                .party-info .value {{
                    display: inline;
                }}
                .party-info div {{
                    margin-bottom: 5px;
                    word-wrap: break-word;
                }}
                .signature-line {{
                    margin-top: 30px;
                    padding-top: 10px;
                    border-top: 1px solid #10b981;
                    text-align: center;
                    font-size: 9pt;
                }}
            </style>
        </head>
        <body>
            <div class="document">
                <!-- Header -->
                <div class="header">
                    <div class="location">Місце складання: м. Київ</div>
                    <div class="title">РАХУНОК № {invoice.get('number', '—')} від {formatted_date}</div>
                </div>
                
                <!-- Items Table -->
                <div class="section-title">Специфікація</div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">№</th>
                            <th style="width: 35%;">Найменування товарів (робіт, послуг)</th>
                            <th style="width: 12%;">Од. виміру</th>
                            <th style="width: 12%;">Кількість</th>
                            <th style="width: 18%;">Ціна, грн</th>
                            <th style="width: 18%;">Сума, грн</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                        <tr class="summary-row">
                            <td colspan="5" class="right bold">Разом без ПДВ:</td>
                            <td class="right bold">{total_without_vat:.2f}</td>
                        </tr>
                        <tr class="summary-row">
                            <td colspan="5" class="right bold">ПДВ 20%:</td>
                            <td class="right bold">{vat_amount:.2f}</td>
                        </tr>
                        <tr class="summary-row total">
                            <td colspan="5" class="right bold">Всього до сплати:</td>
                            <td class="right bold">{total_to_pay:.2f}</td>
                        </tr>
                    </tbody>
                </table>
                
                <!-- Signatures Section -->
                <div class="signatures">
                    <div class="signatures-grid">
                        <!-- Supplier -->
                        <div class="party-column">
                            <div class="party-header">Постачальник</div>
                            <div class="party-info">
                                <div><span class="label">Назва:</span> <span class="value">{supplier_name}</span></div>
                                <div><span class="label">ЄДРПОУ:</span> <span class="value">{supplier_edrpou}</span></div>
                                <div><span class="label">Адреса:</span> <span class="value">{supplier_address}</span></div>
                                <div><span class="label">IBAN:</span> <span class="value">{supplier_iban}</span></div>
                                <div><span class="label">Банк:</span> <span class="value">{supplier_bank}</span></div>
                                <div><span class="label">МФО:</span> <span class="value">{supplier_mfo}</span></div>
                                <div class="signature-line">___________________<br/>{supplier_signature}</div>
                            </div>
                        </div>
                        
                        <!-- Buyer -->
                        <div class="party-column">
                            <div class="party-header">Покупець</div>
                            <div class="party-info">
                                <div><span class="label">Назва:</span> <span class="value">{buyer_name}</span></div>
                                <div><span class="label">ЄДРПОУ:</span> <span class="value">{buyer_edrpou}</span></div>
                                <div><span class="label">Адреса:</span> <span class="value">{buyer_address}</span></div>
                                <div><span class="label">IBAN:</span> <span class="value">{buyer_iban}</span></div>
                                <div><span class="label">Банк:</span> <span class="value">{buyer_bank}</span></div>
                                <div><span class="label">МФО:</span> <span class="value">{buyer_mfo}</span></div>
                                <div class="signature-line">___________________<br/>{buyer_signature}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_content
    
    def generate_pdf(self, invoice: dict) -> str:
        """Generate PDF from invoice data and return the file path."""
        try:
            # Generate HTML
            html_content = self.generate_html(invoice)
            
            # Generate filename
            invoice_number = invoice.get('number', 'unknown').replace('/', '_')
            filename = f"invoice_{invoice_number}.pdf"
            output_path = self.output_dir / filename
            
            # Convert HTML to PDF
            HTML(string=html_content).write_pdf(str(output_path))
            
            logger.info(f"Generated invoice PDF: {output_path}")
            return str(output_path)
        except Exception as e:
            logger.error(f"Error generating invoice PDF: {str(e)}")
            raise
