"""Service for generating order PDFs."""

import os
from pathlib import Path
from datetime import datetime
from weasyprint import HTML
import logging

logger = logging.getLogger(__name__)


class OrderPDFService:
    """Service for generating PDF documents for orders."""
    
    def __init__(self):
        self.output_dir = Path("/tmp/order_pdfs")
        self.output_dir.mkdir(exist_ok=True)
    
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
    
    def generate_html(self, order: dict) -> str:
        """Generate HTML for order document with professional design."""
        
        # Format date in Ukrainian
        date_str = order.get('date', datetime.now().strftime('%Y-%m-%d'))
        formatted_date = self.format_date_ukrainian(date_str)
        
        # Calculate items for table
        items_html = ""
        for idx, item in enumerate(order.get('items', []), 1):
            items_html += f"""
            <tr>
                <td class="table-cell center">{idx}</td>
                <td class="table-cell">{item.get('name', '—')}</td>
                <td class="table-cell center">{item.get('unit', 'шт')}</td>
                <td class="table-cell right">{item.get('quantity', 0):.2f}</td>
                <td class="table-cell right">{item.get('price', 0):.2f}</td>
                <td class="table-cell right bold">{item.get('amount', 0):.2f}</td>
            </tr>
            """
        
        # Calculate totals
        total_without_vat = order.get('total_amount', 0)
        vat_amount = 0.0
        total_to_pay = total_without_vat + vat_amount
        
        # Build professional HTML document
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
                    color: #000;
                    margin: 0;
                    padding: 0;
                }}
                .document {{
                    width: 100%;
                    max-width: 210mm;
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 20px;
                }}
                .location {{
                    font-size: 9pt;
                    margin-bottom: 10px;
                }}
                .title {{
                    font-size: 14pt;
                    font-weight: bold;
                    margin: 10px 0;
                }}
                .section-title {{
                    font-size: 11pt;
                    font-weight: bold;
                    text-align: center;
                    margin: 20px 0 15px 0;
                    text-transform: uppercase;
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
                    background-color: #e8e8e8;
                    padding: 8px 5px;
                    font-size: 9pt;
                    font-weight: bold;
                    border: 1px solid #000;
                    text-align: center;
                }}
                table.items-table td {{
                    padding: 6px 5px;
                    font-size: 9pt;
                    border: 1px solid #000;
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
                    border-top: 1px solid #000;
                    padding: 8px 5px;
                    font-size: 10pt;
                }}
                .summary-row.total td {{
                    font-weight: bold;
                    border-top: 2px solid #000;
                }}
                .explanations {{
                    margin: 20px 0;
                }}
                .explanations ol {{
                    margin: 10px 0 10px 20px;
                    padding: 0;
                }}
                .explanations li {{
                    margin-bottom: 8px;
                    font-size: 9pt;
                    line-height: 1.5;
                }}
                .signatures {{
                    margin-top: 25px;
                }}
                .signatures-grid {{
                    display: table;
                    width: 100%;
                    border: 1px solid #000;
                }}
                .party-column {{
                    display: table-cell;
                    width: 50%;
                    padding: 15px;
                    vertical-align: top;
                    border-right: 1px solid #000;
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
                }}
                .party-info {{
                    font-size: 8.5pt;
                    line-height: 1.6;
                }}
                .party-info .label {{
                    font-weight: bold;
                    display: inline-block;
                    width: 70px;
                }}
                .party-info .value {{
                    display: inline;
                }}
                .party-info div {{
                    margin-bottom: 4px;
                    word-wrap: break-word;
                }}
                .signature-line {{
                    margin-top: 25px;
                    padding-top: 10px;
                    border-top: 1px solid #000;
                    text-align: center;
                    font-size: 9pt;
                }}
            </style>
        </head>
        <body>
            <div class="document">
                <!-- Header -->
                <div class="header">
                    <div class="location">Місце складання: м. Одеса</div>
                    <div class="title">ЗАМОВЛЕННЯ № {order.get('number', '—')} ВІД {formatted_date}</div>
                </div>
                
                <!-- Items Table -->
                <div class="section-title">Перелік позицій</div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">№</th>
                            <th style="width: 35%;">Найменування</th>
                            <th style="width: 12%;">Од. виміру</th>
                            <th style="width: 12%;">Кількість</th>
                            <th style="width: 18%;">Ціна, грн</th>
                            <th style="width: 18%;">Сума, грн</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                        <tr class="summary-row">
                            <td colspan="5" class="right bold">Разом без ПДВ, грн</td>
                            <td class="right bold">{total_without_vat:.2f}</td>
                        </tr>
                        <tr class="summary-row">
                            <td colspan="5" class="right bold">ПДВ 0.0%, грн</td>
                            <td class="right bold">{vat_amount:.2f}</td>
                        </tr>
                        <tr class="summary-row total">
                            <td colspan="5" class="right bold">Всього до сплати, грн</td>
                            <td class="right bold">{total_to_pay:.2f}</td>
                        </tr>
                    </tbody>
                </table>
                
                <!-- Explanations -->
                <div class="section-title">Роз'яснення</div>
                <div class="explanations">
                    <ol>
                        <li>Цей документ є первинним погодженим Замовленням між Покупцем і Постачальником, що визначає обсяг, кількість, вартість і найменування товарів та/або послуг.</li>
                        <li>Замовлення є підставою для подальшого укладення Договору постачання товарів та/або надання послуг між Сторонами.</li>
                        <li>Ціни, зазначені в Замовленні, діють до моменту укладення Договору або письмового підтвердження змін, якщо інше не погоджено Сторонами.</li>
                        <li>Підписання цього Замовлення засвідчує намір Сторін здійснити відповідну поставку товарів або надання послуг на погоджених умовах.</li>
                        <li>Документ може підписуватись у паперовому вигляді або електронними засобами з використанням кваліфікованого електронного підпису (КЕП).</li>
                        <li>Цей документ не створює фінансових зобов'язань до моменту укладення основного Договору, але є підтвердженням узгодження номенклатури та вартості.</li>
                    </ol>
                </div>
                
                <!-- Signatures -->
                <div class="section-title">Підписи сторін</div>
                <div class="signatures">
                    <div class="signatures-grid">
                        <div class="party-column">
                            <div class="party-header">Покупець</div>
                            <div class="party-info">
                                <div><span class="label">Назва:</span> <span class="value">{order.get('counterparty_name', '—')}</span></div>
                                <div><span class="label">ЄДРПОУ:</span> <span class="value">{order.get('counterparty_edrpou', '—')}</span></div>
                                <div class="signature-line">
                                    <div>(підпис)</div>
                                </div>
                            </div>
                        </div>
                        <div class="party-column">
                            <div class="party-header">Постачальник</div>
                            <div class="party-info">
                                <div><span class="label">Назва:</span> <span class="value">АКЦІОНЕРНЕ ТОВАРИСТВО "АНТОНОВ"</span></div>
                                <div><span class="label">ЄДРПОУ:</span> <span class="value">14307529</span></div>
                                <div class="signature-line">
                                    <div>(підпис)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_content
    
    def generate_pdf(self, order: dict) -> str:
        """
        Generate PDF document for order.
        
        Args:
            order: Order data dictionary
            
        Returns:
            Path to generated PDF file
        """
        try:
            # Generate HTML
            html_content = self.generate_html(order)
            
            # Generate filename
            order_number = order.get('number', 'unknown')
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"order_{order_number}_{timestamp}.pdf"
            output_path = self.output_dir / filename
            
            # Generate PDF from HTML
            HTML(string=html_content).write_pdf(output_path)
            
            logger.info(f"Generated order PDF: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Error generating order PDF: {e}")
            raise
