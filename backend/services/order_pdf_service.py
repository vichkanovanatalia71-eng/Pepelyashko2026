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
    
    def generate_html(self, order: dict) -> str:
        """Generate HTML for order document with modern design matching the site."""
        
        # Calculate items total for verification
        items_html = ""
        for idx, item in enumerate(order.get('items', []), 1):
            items_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">{idx}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{item.get('name', '—')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">{item.get('unit', 'шт')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">{item.get('quantity', 0)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">{item.get('price', 0):.2f}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">{item.get('amount', 0):.2f}</td>
            </tr>
            """
        
        # Format date
        date_str = order.get('date', datetime.now().strftime('%Y-%m-%d'))
        try:
            date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            formatted_date = date_obj.strftime('%d.%m.%Y')
        except:
            formatted_date = date_str
        
        # Build HTML with order information
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{
                    size: A4;
                    margin: 0;
                    background: #f0f9ff;
                }}
                body {{
                    font-family: 'DejaVu Sans', 'Segoe UI', Arial, sans-serif;
                    font-size: 10pt;
                    line-height: 1.4;
                    color: #1e293b;
                    background: #f0f9ff;
                    margin: 0;
                    padding: 30px;
                }}
                .container {{
                    max-width: 100%;
                    margin: 0 auto;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }}
                .header {{
                    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                    padding: 25px 35px;
                    color: white;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24pt;
                    font-weight: 600;
                    letter-spacing: -0.5px;
                }}
                .header .subtitle {{
                    margin-top: 5px;
                    font-size: 10pt;
                    opacity: 0.95;
                }}
                .header .order-number {{
                    margin-top: 10px;
                    font-size: 14pt;
                    font-weight: 600;
                    opacity: 0.95;
                }}
                .content {{
                    padding: 30px 35px;
                }}
                .section {{
                    margin-bottom: 20px;
                }}
                .section:last-child {{
                    margin-bottom: 0;
                }}
                .section-title {{
                    font-size: 11pt;
                    font-weight: 600;
                    color: #0f172a;
                    margin-bottom: 10px;
                    padding-bottom: 6px;
                    border-bottom: 2px solid #e0f2fe;
                }}
                .info-grid {{
                    display: table;
                    width: 100%;
                    margin-bottom: 15px;
                }}
                .info-row {{
                    display: table-row;
                }}
                .info-label {{
                    display: table-cell;
                    width: 30%;
                    padding: 6px 0;
                    font-weight: 500;
                    color: #64748b;
                    font-size: 9pt;
                }}
                .info-value {{
                    display: table-cell;
                    width: 70%;
                    padding: 6px 0;
                    color: #0f172a;
                    font-size: 9.5pt;
                }}
                .info-value.important {{
                    font-weight: 600;
                    font-size: 10pt;
                    color: #1e293b;
                }}
                .highlight-box {{
                    background: #f0f9ff;
                    border-left: 3px solid #0ea5e9;
                    padding: 12px 15px;
                    margin: 12px 0;
                    border-radius: 4px;
                }}
                table.items-table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                    font-size: 9pt;
                }}
                table.items-table thead {{
                    background: #f1f5f9;
                }}
                table.items-table th {{
                    padding: 10px;
                    text-align: left;
                    font-weight: 600;
                    color: #475569;
                    border-bottom: 2px solid #cbd5e1;
                }}
                table.items-table td {{
                    padding: 10px;
                    border-bottom: 1px solid #e5e7eb;
                }}
                table.items-table tfoot {{
                    background: #f8fafc;
                    font-weight: 600;
                }}
                table.items-table tfoot td {{
                    padding: 12px 10px;
                    border-top: 2px solid #0ea5e9;
                    border-bottom: none;
                }}
                .total-section {{
                    background: #e0f2fe;
                    border: 2px solid #0ea5e9;
                    padding: 15px 20px;
                    margin: 20px 0;
                    border-radius: 6px;
                    text-align: right;
                }}
                .total-label {{
                    font-size: 11pt;
                    font-weight: 600;
                    color: #0c4a6e;
                    margin-bottom: 5px;
                }}
                .total-amount {{
                    font-size: 18pt;
                    font-weight: 700;
                    color: #0369a1;
                }}
                .footer {{
                    background: #f8fafc;
                    padding: 15px 35px;
                    text-align: center;
                    border-top: 1px solid #e5e7eb;
                }}
                .footer-text {{
                    font-size: 8pt;
                    color: #94a3b8;
                    margin: 0;
                }}
                .divider {{
                    height: 1px;
                    background: #e0f2fe;
                    margin: 15px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Замовлення</h1>
                    <div class="subtitle">Система Управління Документами</div>
                    <div class="order-number">№ {order.get('number', '—')}</div>
                </div>
                
                <div class="content">
                    <!-- Основна інформація -->
                    <div class="section">
                        <div class="section-title">📋 Основна інформація</div>
                        <div class="info-grid">
                            <div class="info-row">
                                <div class="info-label">Номер замовлення</div>
                                <div class="info-value important">№ {order.get('number', '—')}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">Дата</div>
                                <div class="info-value">{formatted_date}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <!-- Контрагент -->
                    <div class="section">
                        <div class="section-title">🏢 Контрагент</div>
                        <div class="highlight-box">
                            <div class="info-grid">
                                <div class="info-row">
                                    <div class="info-label">ЄДРПОУ</div>
                                    <div class="info-value important">{order.get('counterparty_edrpou', '—')}</div>
                                </div>
                                <div class="info-row">
                                    <div class="info-label">Назва</div>
                                    <div class="info-value important">{order.get('counterparty_name', '—')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <!-- Товари/Послуги -->
                    <div class="section">
                        <div class="section-title">📦 Товари та послуги</div>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th style="width: 5%; text-align: center;">№</th>
                                    <th style="width: 40%;">Найменування</th>
                                    <th style="width: 10%; text-align: center;">Од.</th>
                                    <th style="width: 12%; text-align: right;">Кількість</th>
                                    <th style="width: 15%; text-align: right;">Ціна, грн</th>
                                    <th style="width: 18%; text-align: right;">Сума, грн</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items_html}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="5" style="text-align: right; font-size: 10pt;">Усього:</td>
                                    <td style="text-align: right; font-size: 11pt; color: #0369a1;">{order.get('total_amount', 0):.2f} грн</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    
                    <!-- Total Section -->
                    <div class="total-section">
                        <div class="total-label">ЗАГАЛЬНА СУМА:</div>
                        <div class="total-amount">{order.get('total_amount', 0):.2f} грн</div>
                    </div>
                </div>
                
                <div class="footer">
                    <p class="footer-text">Документ згенеровано автоматично • {datetime.now().strftime('%d.%m.%Y о %H:%M')}</p>
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
