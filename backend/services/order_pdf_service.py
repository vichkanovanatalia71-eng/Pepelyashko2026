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
            ttn_number = order.get('ttn_number', '')
            
            # Status labels for PDF
            STATUS_LABELS = {
                'new': 'Нове',
                'in_progress': 'В роботі',
                'shipped': 'Відправлено',
                'paid': 'Сплачено'
            }
            
            order_status = order.get('status', 'new' if not is_paid else 'paid')
            payment_status = STATUS_LABELS.get(order_status, 'Нове')
            payment_badge_bg = '#10b981' if order_status == 'paid' else '#3b82f6' if order_status == 'new' else '#f59e0b' if order_status == 'in_progress' else '#8b5cf6'
            payment_badge_color = '#ffffff'
            
            # Check if we should show full buyer details (not for shipped orders)
            show_full_buyer_details = order_status != 'shipped'
            
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
            
            # Build items HTML for premium design
            items_html = ""
            for idx, item in enumerate(items, 1):
                item_name = item.get('name', 'N/A')
                item_quantity = item.get('quantity', 0)
                item_unit = item.get('unit', 'шт')
                item_price = item.get('price', 0.0)
                item_amount = item.get('amount', 0.0)
                
                items_html += f"""
                <div class="item-row">
                    <div>{idx}</div>
                    <div>{item_name}</div>
                    <div>{item_unit}</div>
                    <div>{item_quantity}</div>
                    <div>{item_price:,.2f}</div>
                    <div>{item_amount:,.2f} грн</div>
                </div>
                """
            
            # Create HTML - Clean design without supplier & signatures (~80% fill)
            html_content = f"""
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <style>
        @page {{
            size: A4;
            margin: 12mm;
        }}
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'DejaVu Sans', 'Segoe UI', Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.4;
            color: #1B1B1B;
            background: #F3F4F6;
        }}
        .card {{
            background: #FFFFFF;
            border-radius: 10px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
            overflow: hidden;
        }}
        .card-content {{
            padding: 24px 28px;
        }}
        
        /* Hero Section */
        .hero {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 16px;
            margin-bottom: 20px;
            border-bottom: 2px solid #E5E7EB;
        }}
        .hero-left {{
            display: flex;
            align-items: center;
            gap: 14px;
        }}
        .hero-icon {{
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #3B82F6, #2563EB);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18pt;
        }}
        .hero-title {{
            font-size: 16pt;
            font-weight: 600;
            color: #1B1B1B;
        }}
        .hero-date {{
            font-size: 9pt;
            color: #6B7280;
            margin-top: 2px;
        }}
        .status-badge {{
            background: {'#10B981' if is_paid else '#F59E0B'};
            color: white;
            padding: 6px 14px;
            border-radius: 12px;
            font-size: 8pt;
            font-weight: 600;
        }}
        
        /* Parameters Grid */
        .params-grid {{
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            padding: 14px 18px;
            background: #F9FAFB;
            border-radius: 8px;
        }}
        .param-item {{
            flex: 1;
        }}
        .param-label {{
            font-size: 7pt;
            font-weight: 600;
            color: #9CA3AF;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }}
        .param-value {{
            font-size: 11pt;
            font-weight: 600;
            color: #1B1B1B;
        }}
        .param-value.accent {{
            font-size: 13pt;
            font-weight: 700;
            color: #3B82F6;
        }}
        
        /* Section Title */
        .section-title {{
            font-size: 10pt;
            font-weight: 600;
            color: #374151;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .section-icon {{
            font-size: 12pt;
        }}
        
        /* Items Table */
        .items-header {{
            background: #F9FAFB;
            border-radius: 6px 6px 0 0;
            padding: 10px 14px;
            display: flex;
            font-size: 7pt;
            font-weight: 600;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }}
        .items-header > div:nth-child(1) {{ width: 30px; }}
        .items-header > div:nth-child(2) {{ flex: 1; }}
        .items-header > div:nth-child(3) {{ width: 50px; text-align: center; }}
        .items-header > div:nth-child(4) {{ width: 60px; text-align: right; }}
        .items-header > div:nth-child(5) {{ width: 80px; text-align: right; }}
        .items-header > div:nth-child(6) {{ width: 100px; text-align: right; }}
        
        .items-body {{
            border: 1px solid #E5E7EB;
            border-top: none;
            border-radius: 0 0 6px 6px;
        }}
        .item-row {{
            display: flex;
            padding: 10px 14px;
            border-bottom: 1px solid #F3F4F6;
            align-items: center;
        }}
        .item-row:last-child {{ border-bottom: none; }}
        .item-row > div:nth-child(1) {{ width: 30px; font-size: 8pt; color: #9CA3AF; }}
        .item-row > div:nth-child(2) {{ flex: 1; font-size: 9pt; font-weight: 500; }}
        .item-row > div:nth-child(3) {{ width: 50px; font-size: 8pt; color: #6B7280; text-align: center; }}
        .item-row > div:nth-child(4) {{ width: 60px; font-size: 9pt; text-align: right; }}
        .item-row > div:nth-child(5) {{ width: 80px; font-size: 9pt; text-align: right; }}
        .item-row > div:nth-child(6) {{ width: 100px; font-size: 9pt; font-weight: 600; text-align: right; }}
        
        /* Total Box */
        .total-box {{
            background: linear-gradient(135deg, #EFF6FF, #DBEAFE);
            border: 1px solid #BFDBFE;
            border-radius: 8px;
            padding: 14px 20px;
            margin: 20px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .total-label {{
            font-size: 10pt;
            font-weight: 600;
            color: #1E40AF;
        }}
        .total-value {{
            font-size: 16pt;
            font-weight: 700;
            color: #3B82F6;
        }}
        
        /* Buyer Card - Full Width as List */
        .buyer-card {{
            background: #F9FAFB;
            border-radius: 8px;
            padding: 18px 20px;
            margin-bottom: 16px;
        }}
        .buyer-list {{
            display: flex;
            flex-direction: column;
        }}
        .buyer-row {{
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid #E5E7EB;
        }}
        .buyer-row:last-child {{ border-bottom: none; }}
        .buyer-label {{
            width: 140px;
            min-width: 140px;
            font-size: 8pt;
            font-weight: 500;
            color: #6B7280;
        }}
        .buyer-value {{
            flex: 1;
            font-size: 9pt;
            color: #1B1B1B;
        }}
        .buyer-value.bold {{ font-weight: 600; }}
        .buyer-value.mono {{ font-family: 'DejaVu Sans Mono', monospace; font-size: 8pt; }}
        
        /* Info Box */
        .info-box {{
            background: #ECFDF5;
            border: 1px solid #A7F3D0;
            border-radius: 8px;
            padding: 14px 18px;
        }}
        .info-title {{
            font-size: 9pt;
            font-weight: 600;
            color: #065F46;
            margin-bottom: 4px;
        }}
        .info-text {{
            font-size: 8pt;
            color: #047857;
        }}
        
        /* Footer */
        .footer {{
            text-align: center;
            padding: 14px 0 0;
            font-size: 7pt;
            color: #9CA3AF;
            border-top: 1px solid #E5E7EB;
            margin-top: 16px;
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
                    <div class="param-label">Дата</div>
                    <div class="param-value">{order_date}</div>
                </div>
                <div class="param-item">
                    <div class="param-label">ТТН</div>
                    <div class="param-value">{ttn_number if ttn_number else '—'}</div>
                </div>
                <div class="param-item">
                    <div class="param-label">Сума</div>
                    <div class="param-value accent">{total_amount:,.2f} грн</div>
                </div>
            </div>

            <!-- Items -->
            <div class="section-title">
                <span class="section-icon">📦</span>
                Товари та послуги
            </div>
            <div class="items-header">
                <div>№</div>
                <div>Найменування</div>
                <div>Од.</div>
                <div>К-сть</div>
                <div>Ціна</div>
                <div>Сума</div>
            </div>
            <div class="items-body">
                {items_html}
            </div>
            
            <div class="total-box">
                <span class="total-label">💰 Разом до сплати:</span>
                <span class="total-value">{total_amount:,.2f} грн</span>
            </div>

            <!-- Buyer - Full Width as List -->
            <div class="section-title">
                <span class="section-icon">🏢</span>
                Покупець
            </div>
            <div class="buyer-card">
                <div class="buyer-list">
                    <div class="buyer-row">
                        <span class="buyer-label">Повна назва:</span>
                        <span class="buyer-value bold">{counterparty_name}</span>
                    </div>
                    <div class="buyer-row">
                        <span class="buyer-label">Код ЄДРПОУ:</span>
                        <span class="buyer-value mono">{counterparty_edrpou}</span>
                    </div>
                    {'<div class="buyer-row"><span class="buyer-label">Юридична адреса:</span><span class="buyer-value">' + (counterparty_address if counterparty_address else '—') + '</span></div>' if show_full_buyer_details else ''}
                    {'<div class="buyer-row"><span class="buyer-label">IBAN:</span><span class="buyer-value mono">' + (counterparty_iban if counterparty_iban else '—') + '</span></div>' if show_full_buyer_details else ''}
                    {'<div class="buyer-row"><span class="buyer-label">Банк:</span><span class="buyer-value">' + (counterparty_bank if counterparty_bank else '—') + '</span></div>' if show_full_buyer_details else ''}
                    {'<div class="buyer-row"><span class="buyer-label">МФО:</span><span class="buyer-value mono">' + (counterparty_mfo if counterparty_mfo else '—') + '</span></div>' if show_full_buyer_details else ''}
                    {'<div class="buyer-row"><span class="buyer-label">' + (counterparty_position if counterparty_position else 'Директор') + ':</span><span class="buyer-value">' + (counterparty_director if counterparty_director else '—') + '</span></div>' if show_full_buyer_details else ''}
                    {'<div class="buyer-row"><span class="buyer-label">Телефон:</span><span class="buyer-value">' + (counterparty_phone if counterparty_phone else '—') + '</span></div>' if show_full_buyer_details else ''}
                    {'<div class="buyer-row"><span class="buyer-label">Email:</span><span class="buyer-value">' + (counterparty_email if counterparty_email else '—') + '</span></div>' if show_full_buyer_details else ''}
                </div>
            </div>

            <!-- Info Box -->
            <div class="info-box">
                <div class="info-title">✓ Замовлення погоджено</div>
                <div class="info-text">Завдання для виконання: підготувати товар/послуги згідно специфікації замовлення.</div>
            </div>

            <!-- Footer -->
            <div class="footer">
                Документ сформовано: {datetime.now().strftime('%d.%m.%Y %H:%M')} • Замовлення №{order_number} від {order_date}
            </div>
        </div>
    </div>
</body>
</html>
            """
            
            # Generate PDF
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_order_number = order_number.replace('/', '_').replace('\\', '_')
            pdf_filename = f"order_{safe_order_number}_{timestamp}.pdf"
            pdf_path = self.output_dir / pdf_filename
            
            HTML(string=html_content).write_pdf(pdf_path)
            
            logger.info(f"Generated order PDF: {pdf_path}")
            return str(pdf_path)
            
        except Exception as e:
            logger.error(f"Error generating order PDF: {str(e)}")
            raise
