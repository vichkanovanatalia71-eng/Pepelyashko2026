"""Service for generating order PDFs."""

from pathlib import Path
from datetime import datetime
from weasyprint import HTML
import logging
import base64

logger = logging.getLogger(__name__)


class OrderPDFService:
    """Service for generating order PDF documents."""
    
    def __init__(self):
        self.output_dir = Path("/tmp/documents")
        self.output_dir.mkdir(exist_ok=True)
    
    def format_date_ukrainian(self, date_str: str) -> str:
        """Format date in Ukrainian style."""
        if not date_str:
            return '—'
        
        try:
            if isinstance(date_str, str):
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            else:
                date_obj = date_str
            
            months = {
                1: 'січня', 2: 'лютого', 3: 'березня', 4: 'квітня',
                5: 'травня', 6: 'червня', 7: 'липня', 8: 'серпня',
                9: 'вересня', 10: 'жовтня', 11: 'листопада', 12: 'грудня'
            }
            
            day = date_obj.day
            month = months.get(date_obj.month, '')
            year = date_obj.year
            
            return f"{day:02d} {month} {year} року"
        except Exception:
            return date_str.split('T')[0] if 'T' in str(date_str) else str(date_str)
    
    def generate_order_pdf(self, order: dict, user: dict = None, counterparty: dict = None) -> str:
        """
        Generate PDF for order card.
        
        Args:
            order: Order dictionary with all order data
            user: Optional user dictionary for logo and company info
            
        Returns:
            Path to generated PDF file
        """
        try:
            # Prepare data
            order_number = order.get('number', 'N/A')
            order_date = self.format_date_ukrainian(order.get('date', ''))
            
            # Get buyer/counterparty info
            counterparty_name = order.get('counterparty_name', 'N/A')
            counterparty_edrpou = order.get('counterparty_edrpou', 'N/A')
            counterparty_address = ''
            counterparty_phone = ''
            counterparty_email = ''
            counterparty_bank = ''
            counterparty_iban = ''
            counterparty_mfo = ''
            counterparty_director = ''
            counterparty_position = ''
            
            if counterparty:
                counterparty_name = counterparty.get('representative_name', counterparty_name)
                counterparty_address = counterparty.get('legal_address', '')
                counterparty_phone = counterparty.get('phone', '')
                counterparty_email = counterparty.get('email', '')
                counterparty_bank = counterparty.get('bank_name', counterparty.get('bank', ''))
                counterparty_iban = counterparty.get('iban', '')
                counterparty_mfo = counterparty.get('mfo', '')
                counterparty_director = counterparty.get('director_name', '')
                counterparty_position = counterparty.get('director_position', counterparty.get('position', ''))
            
            total_amount = order.get('total_amount', 0.0)
            items = order.get('items', [])
            is_paid = order.get('is_paid', False)
            
            # Payment status
            payment_status = "✅ Сплачено" if is_paid else "⏳ Не сплачено"
            payment_badge_bg = '#dcfce7' if is_paid else '#fef3c7'
            payment_badge_color = '#166534' if is_paid else '#92400e'
            
            # User/Company info (Supplier)
            logo_base64 = None
            if user and user.get('logo_url'):
                logo_path = f"/app/backend/{user['logo_url']}"
                if Path(logo_path).exists():
                    with open(logo_path, 'rb') as f:
                        logo_data = f.read()
                        logo_ext = Path(logo_path).suffix.lower()
                        mime_type = 'image/png' if logo_ext == '.png' else 'image/jpeg'
                        logo_base64 = f"data:{mime_type};base64,{base64.b64encode(logo_data).decode()}"
            
            # Get full supplier info from user
            supplier_name = ''
            supplier_edrpou = ''
            supplier_address = ''
            supplier_phone = ''
            supplier_email = ''
            supplier_bank = ''
            supplier_iban = ''
            supplier_mfo = ''
            supplier_director = ''
            supplier_position = ''
            
            if user:
                supplier_name = user.get('representative_name', user.get('company_name', ''))
                supplier_edrpou = user.get('edrpou', '')
                supplier_address = user.get('legal_address', '')
                supplier_phone = user.get('phone', '')
                supplier_email = user.get('email', '')
                supplier_bank = user.get('bank_name', user.get('bank', ''))
                supplier_iban = user.get('iban', '')
                supplier_mfo = user.get('mfo', '')
                supplier_director = user.get('director_name', '')
                supplier_position = user.get('director_position', user.get('position', ''))
            
            # Build items table
            items_html = ""
            for idx, item in enumerate(items, 1):
                item_name = item.get('name', 'N/A')
                item_quantity = item.get('quantity', 0)
                item_unit = item.get('unit', 'шт')
                item_price = item.get('price', 0.0)
                item_amount = item.get('amount', 0.0)
                
                items_html += f"""
                <tr>
                    <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">{idx}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">{item_name}</td>
                    <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">{item_quantity}</td>
                    <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">{item_unit}</td>
                    <td style="text-align: right; padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">{item_price:,.2f} грн</td>
                    <td style="text-align: right; padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">{item_amount:,.2f} грн</td>
                </tr>
                """
            
            # Create HTML with Premium B2B design
            html_content = f"""
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <style>
        @page {{
            size: A4;
            margin: 15mm;
        }}
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'DejaVu Sans', 'Segoe UI', Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.5;
            color: #1B1B1B;
            background: #EEF2F5;
        }}
        .card {{
            max-width: 680px;
            margin: 0 auto;
            background: #FFFFFF;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
            overflow: hidden;
        }}
        .card-content {{
            padding: 28px;
        }}
        
        /* Hero Section */
        .hero {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 20px;
            margin-bottom: 20px;
            border-bottom: 1px solid #E5E7EB;
        }}
        .hero-left {{
            display: flex;
            align-items: flex-start;
            gap: 14px;
        }}
        .hero-icon {{
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #3B82F6, #2563EB);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20pt;
        }}
        .hero-title {{
            font-size: 18pt;
            font-weight: 600;
            color: #1B1B1B;
            margin-bottom: 2px;
        }}
        .hero-date {{
            font-size: 10pt;
            color: #6B7280;
        }}
        .status-badge {{
            background: {'#10B981' if is_paid else '#F59E0B'};
            color: white;
            padding: 6px 14px;
            border-radius: 16px;
            font-size: 9pt;
            font-weight: 600;
        }}
        
        /* Parameters Grid */
        .params-grid {{
            display: flex;
            gap: 24px;
            margin-bottom: 24px;
        }}
        .param-item {{
            flex: 1;
        }}
        .param-label {{
            font-size: 8pt;
            font-weight: 600;
            color: #9CA3AF;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }}
        .param-value {{
            font-size: 12pt;
            font-weight: 600;
            color: #1B1B1B;
        }}
        .param-value.accent {{
            font-size: 14pt;
            font-weight: 700;
            color: #3B82F6;
        }}
        
        /* Section Title */
        .section-title {{
            font-size: 12pt;
            font-weight: 600;
            color: #1B1B1B;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .section-icon {{
            color: #3B82F6;
        }}
        
        /* Items Table */
        .items-header {{
            background: #F9FAFB;
            border-radius: 6px 6px 0 0;
            padding: 10px 12px;
            display: flex;
            font-size: 8pt;
            font-weight: 600;
            color: #6B7280;
            text-transform: uppercase;
        }}
        .items-header > div:nth-child(1) {{ width: 30px; }}
        .items-header > div:nth-child(2) {{ flex: 1; }}
        .items-header > div:nth-child(3) {{ width: 50px; text-align: center; }}
        .items-header > div:nth-child(4) {{ width: 60px; text-align: right; }}
        .items-header > div:nth-child(5) {{ width: 70px; text-align: right; }}
        .items-header > div:nth-child(6) {{ width: 90px; text-align: right; }}
        
        .items-body {{
            border: 1px solid #E5E7EB;
            border-top: none;
            border-radius: 0 0 6px 6px;
        }}
        .item-row {{
            display: flex;
            padding: 10px 12px;
            border-bottom: 1px solid #F3F4F6;
            align-items: center;
        }}
        .item-row:last-child {{ border-bottom: none; }}
        .item-row > div:nth-child(1) {{ width: 30px; font-size: 9pt; color: #9CA3AF; }}
        .item-row > div:nth-child(2) {{ flex: 1; font-size: 10pt; font-weight: 500; }}
        .item-row > div:nth-child(3) {{ width: 50px; font-size: 9pt; color: #6B7280; text-align: center; }}
        .item-row > div:nth-child(4) {{ width: 60px; font-size: 10pt; text-align: right; }}
        .item-row > div:nth-child(5) {{ width: 70px; font-size: 10pt; text-align: right; }}
        .item-row > div:nth-child(6) {{ width: 90px; font-size: 10pt; font-weight: 600; text-align: right; }}
        
        /* Total Box */
        .total-box {{
            background: #EFF6FF;
            border: 1px solid #BFDBFE;
            border-radius: 10px;
            padding: 16px 20px;
            margin: 20px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .total-label {{
            font-size: 11pt;
            font-weight: 600;
            color: #1E40AF;
        }}
        .total-value {{
            font-size: 16pt;
            font-weight: 700;
            color: #3B82F6;
        }}
        
        /* Buyer Card */
        .buyer-card {{
            background: #F7F9FA;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }}
        .buyer-row {{
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid #E5E7EB;
        }}
        .buyer-row:last-child {{ border-bottom: none; }}
        .buyer-label {{
            width: 120px;
            font-size: 9pt;
            font-weight: 500;
            color: #6B7280;
        }}
        .buyer-value {{
            flex: 1;
            font-size: 10pt;
            color: #1B1B1B;
        }}
        .buyer-value.bold {{ font-weight: 600; }}
        .buyer-value.mono {{ font-family: 'DejaVu Sans Mono', monospace; font-size: 9pt; }}
        
        /* Info Box */
        .info-box {{
            background: #EFF6FF;
            border: 1px solid #BFDBFE;
            border-radius: 10px;
            padding: 14px 18px;
            margin-bottom: 20px;
        }}
        .info-title {{
            font-size: 10pt;
            font-weight: 600;
            color: #1E40AF;
            margin-bottom: 4px;
        }}
        .info-text {{
            font-size: 9pt;
            color: #3B82F6;
        }}
        
        /* Signatures */
        .signatures {{
            display: flex;
            gap: 24px;
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
        }}
        .signature-block {{
            flex: 1;
        }}
        .signature-title {{
            font-size: 10pt;
            font-weight: 600;
            color: #1B1B1B;
            text-transform: uppercase;
            margin-bottom: 12px;
            padding-bottom: 6px;
            border-bottom: 2px solid #3B82F6;
        }}
        .signature-row {{
            display: flex;
            padding: 4px 0;
        }}
        .signature-label {{
            width: 80px;
            font-size: 8pt;
            font-weight: 500;
            color: #6B7280;
        }}
        .signature-value {{
            font-size: 9pt;
            color: #1B1B1B;
        }}
        .signature-line {{
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px dashed #D1D5DB;
        }}
        .sign-placeholder {{
            border-bottom: 1px solid #1B1B1B;
            width: 150px;
            display: inline-block;
            height: 20px;
        }}
        
        /* Footer */
        .footer {{
            text-align: center;
            padding: 14px 0 0;
            font-size: 8pt;
            color: #9CA3AF;
            border-top: 1px solid #E5E7EB;
            margin-top: 20px;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="card-content">
            <!-- Hero -->
            <div class="hero">
                <div class="hero-left">
                    <div class="hero-icon">📋</div>
                    <div>
                        <div class="hero-title">Замовлення №{order_number}</div>
                        <div class="hero-date">📅 {order_date}</div>
                    </div>
                </div>
                <div class="status-badge">{payment_status}</div>
            </div>

            <!-- Parameters -->
            <div class="params-grid">
                <div class="param-item">
                    <div class="param-label">Номер</div>
                    <div class="param-value">№{order_number}</div>
                </div>
                <div class="param-item">
                    <div class="param-label">Дата створення</div>
                    <div class="param-value">{order_date}</div>
                </div>
                <div class="param-item">
                    <div class="param-label">Загальна сума</div>
                    <div class="param-value accent">{total_amount:,.2f} грн</div>
                </div>
            </div>

            <!-- Items -->
            <div class="section-title">
                <span class="section-icon">📦</span>
                ТОВАРИ ТА ПОСЛУГИ
            </div>
            <div class="items-header">
                <div>№</div>
                <div>НАЙМЕНУВАННЯ</div>
                <div>ОД.</div>
                <div>КІЛЬК.</div>
                <div>ЦІНА</div>
                <div>СУМА</div>
            </div>
            <div class="items-body">
                {items_html}
            </div>
            
            <div class="total-box">
                <span class="total-label">💰 Загальна сума замовлення:</span>
                <span class="total-value">{total_amount:,.2f} грн</span>
            </div>

            <!-- Buyer -->
            <div class="section-title">
                <span class="section-icon">🏢</span>
                ПОКУПЕЦЬ
            </div>
            <div class="buyer-card">
                <div class="buyer-row">
                    <span class="buyer-label">Повна назва</span>
                    <span class="buyer-value bold">{counterparty_name}</span>
                </div>
                <div class="buyer-row">
                    <span class="buyer-label">Код ЄДРПОУ</span>
                    <span class="buyer-value mono">{counterparty_edrpou}</span>
                </div>
                <div class="buyer-row">
                    <span class="buyer-label">Юридична адреса</span>
                    <span class="buyer-value">{counterparty_address if counterparty_address else '—'}</span>
                </div>
                <div class="buyer-row">
                    <span class="buyer-label">Телефон</span>
                    <span class="buyer-value">{counterparty_phone if counterparty_phone else '—'}</span>
                </div>
                <div class="buyer-row">
                    <span class="buyer-label">Email</span>
                    <span class="buyer-value">{counterparty_email if counterparty_email else '—'}</span>
                </div>
                <div class="buyer-row">
                    <span class="buyer-label">Банк</span>
                    <span class="buyer-value">{counterparty_bank if counterparty_bank else '—'}</span>
                </div>
                <div class="buyer-row">
                    <span class="buyer-label">IBAN</span>
                    <span class="buyer-value mono">{counterparty_iban if counterparty_iban else '—'}</span>
                </div>
                <div class="buyer-row">
                    <span class="buyer-label">МФО</span>
                    <span class="buyer-value mono">{counterparty_mfo if counterparty_mfo else '—'}</span>
                </div>
                <div class="buyer-row">
                    <span class="buyer-label">Директор</span>
                    <span class="buyer-value">{counterparty_director if counterparty_director else '—'}</span>
                </div>
                <div class="buyer-row">
                    <span class="buyer-label">Посада</span>
                    <span class="buyer-value">{counterparty_position if counterparty_position else '—'}</span>
                </div>
            </div>

            <!-- Info Box -->
            <div class="info-box">
                <div class="info-title">Замовлення готове до обробки</div>
                <div class="info-text">Цей документ підтверджує погодження номенклатури та вартості товарів/послуг між сторонами.</div>
            </div>

            <!-- Signatures -->
            <div class="signatures">
                <div class="signature-block">
                    <div class="signature-title">ПОКУПЕЦЬ</div>
                    <div class="signature-row">
                        <span class="signature-label">Назва:</span>
                        <span class="signature-value">{counterparty_name[:40]}{'...' if len(counterparty_name) > 40 else ''}</span>
                    </div>
                    <div class="signature-row">
                        <span class="signature-label">ЄДРПОУ:</span>
                        <span class="signature-value">{counterparty_edrpou}</span>
                    </div>
                    <div class="signature-row">
                        <span class="signature-label">Директор:</span>
                        <span class="signature-value">{counterparty_director if counterparty_director else '—'}</span>
                    </div>
                    <div class="signature-line">
                        <p style="font-size: 8pt; color: #6B7280;">Підпис: <span class="sign-placeholder"></span></p>
                    </div>
                </div>
                <div class="signature-block">
                    <div class="signature-title">ПОСТАЧАЛЬНИК</div>
                    <div class="signature-row">
                        <span class="signature-label">Назва:</span>
                        <span class="signature-value">{supplier_name[:40] if supplier_name else '—'}{'...' if supplier_name and len(supplier_name) > 40 else ''}</span>
                    </div>
                    <div class="signature-row">
                        <span class="signature-label">ЄДРПОУ:</span>
                        <span class="signature-value">{supplier_edrpou if supplier_edrpou else '—'}</span>
                    </div>
                    <div class="signature-row">
                        <span class="signature-label">Директор:</span>
                        <span class="signature-value">{supplier_director if supplier_director else '—'}</span>
                    </div>
                    <div class="signature-line">
                        <p style="font-size: 8pt; color: #6B7280;">Підпис: <span class="sign-placeholder"></span></p>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                Документ сформовано автоматично системою управління документами • {datetime.now().strftime('%d.%m.%Y о %H:%M')}
            </div>
        </div>
    </div>
</body>
</html>
            """
            
            # Generate PDF
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            pdf_filename = f"order_{order_number}_{timestamp}.pdf"
            pdf_path = self.output_dir / pdf_filename
            
            HTML(string=html_content).write_pdf(pdf_path)
            
            logger.info(f"Generated order PDF: {pdf_path}")
            return str(pdf_path)
            
        except Exception as e:
            logger.error(f"Error generating order PDF: {str(e)}")
            raise
