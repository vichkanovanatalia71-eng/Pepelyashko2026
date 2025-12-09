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
        except:
            return date_str.split('T')[0] if 'T' in str(date_str) else str(date_str)
    
    def generate_order_pdf(self, order: dict, user: dict = None) -> str:
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
            
            counterparty_name = order.get('counterparty_name', 'N/A')
            counterparty_edrpou = order.get('counterparty_edrpou', 'N/A')
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
            
            supplier_name = user.get('company_name', user.get('representative_name', '')) if user else ''
            supplier_edrpou = user.get('edrpou', '') if user else ''
            supplier_address = user.get('legal_address', '') if user else ''
            supplier_phone = user.get('phone', '') if user else ''
            supplier_email = user.get('email', '') if user else ''
            
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
            
            # Create HTML
            html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {{
            size: A4;
            margin: 0;
        }}
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.3;
            color: #1e293b;
            background: white;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 7.5mm;
            min-height: 297mm;
        }}
        .card {{
            width: 95%;
            max-width: 199.5mm;
            background: white;
            border-radius: 12px;
            border: 2px solid #4b5563;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            padding: 18px 25px;
            display: flex;
            align-items: center;
            gap: 15px;
            color: white;
        }}
        .logo-box {{
            width: 65px;
            height: 65px;
            background: #f1f5f9;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }}
        .logo {{
            max-width: 58px;
            max-height: 58px;
            object-fit: contain;
        }}
        .header-text {{
            flex: 1;
        }}
        .header-title {{
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 2px;
        }}
        .header-subtitle {{
            font-size: 9pt;
            opacity: 0.9;
        }}
        .badge {{
            background: {payment_badge_bg};
            color: {payment_badge_color};
            padding: 6px 14px;
            border-radius: 12px;
            font-size: 8.5pt;
            font-weight: bold;
            flex-shrink: 0;
        }}
        .content {{
            padding: 20px 25px;
        }}
        .section {{
            margin-bottom: 16px;
            page-break-inside: avoid;
        }}
        .section-title {{
            font-size: 10pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        .info-grid {{
            background: #f8fafc;
            border-radius: 5px;
            padding: 10px 12px;
        }}
        .info-row {{
            display: flex;
            padding: 4px 0;
        }}
        .info-row:not(:last-child) {{
            border-bottom: 1px solid #e2e8f0;
        }}
        .info-label {{
            width: 45%;
            font-size: 8pt;
            color: #64748b;
            font-weight: 600;
        }}
        .info-value {{
            width: 55%;
            font-size: 8pt;
            color: #0f172a;
            word-wrap: break-word;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            overflow: hidden;
        }}
        th {{
            background: #f8fafc;
            padding: 10px 8px;
            text-align: left;
            font-size: 8.5pt;
            font-weight: bold;
            color: #475569;
            border-bottom: 2px solid #e5e7eb;
        }}
        .total-section {{
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            padding: 16px;
            border-radius: 8px;
            margin-top: 16px;
            border: 2px solid #3b82f6;
        }}
        .total-row {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
        }}
        .total-label {{
            font-size: 11pt;
            font-weight: bold;
            color: #1e40af;
        }}
        .total-value {{
            font-size: 16pt;
            font-weight: bold;
            color: #1e40af;
        }}
        .footer {{
            padding: 14px 25px;
            background: #f8fafc;
            text-align: center;
            font-size: 7.5pt;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
        }}
        .description {{
            background: #f0f9ff;
            padding: 12px;
            border-radius: 6px;
            border-left: 3px solid #3b82f6;
            margin-bottom: 16px;
            font-size: 8.5pt;
            line-height: 1.5;
            color: #0f172a;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="logo-box">
                {f'<img src="{logo_base64}" class="logo" />' if logo_base64 else '<div style="font-size: 24pt; color: #3b82f6;">📋</div>'}
            </div>
            <div class="header-text">
                <div class="header-title">Замовлення №{order_number}</div>
                <div class="header-subtitle">від {order_date}</div>
            </div>
            <div class="badge">{payment_status}</div>
        </div>
        
        <div class="content">
            <div class="description">
                <strong>📝 Опис:</strong> Дане замовлення сформовано для контрагента <strong>{counterparty_name}</strong> (ЄДРПОУ: {counterparty_edrpou}). Документ містить детальний перелік товарів/послуг із зазначенням кількості, ціни та загальної вартості.
            </div>
            
            {f'''<div class="section">
                <div class="section-title">
                    <span>🏢</span>
                    Постачальник
                </div>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">Назва</div>
                        <div class="info-value">{supplier_name}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">ЄДРПОУ</div>
                        <div class="info-value">{supplier_edrpou}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Адреса</div>
                        <div class="info-value">{supplier_address}</div>
                    </div>
                    {f"""<div class="info-row">
                        <div class="info-label">Телефон</div>
                        <div class="info-value">{supplier_phone}</div>
                    </div>""" if supplier_phone else ''}
                    {f"""<div class="info-row">
                        <div class="info-label">Email</div>
                        <div class="info-value">{supplier_email}</div>
                    </div>""" if supplier_email else ''}
                </div>
            </div>''' if supplier_name else ''}
            
            <div class="section">
                <div class="section-title">
                    <span>👥</span>
                    Покупець
                </div>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">Назва</div>
                        <div class="info-value" style="font-weight: bold;">{counterparty_name}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">ЄДРПОУ</div>
                        <div class="info-value">{counterparty_edrpou}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">
                    <span>📦</span>
                    Товари та послуги
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px; text-align: center;">№</th>
                            <th>Найменування товару/послуги</th>
                            <th style="width: 60px; text-align: center;">Кіл-ть</th>
                            <th style="width: 50px; text-align: center;">Од.</th>
                            <th style="width: 100px; text-align: right;">Ціна</th>
                            <th style="width: 120px; text-align: right;">Сума</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
            </div>
            
            <div class="total-section">
                <div class="total-row">
                    <div class="total-label">💰 Загальна сума замовлення:</div>
                    <div class="total-value">{total_amount:,.2f} грн</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div>Документ згенеровано автоматично: {datetime.now().strftime('%d.%m.%Y о %H:%M')}</div>
            <div style="margin-top: 4px;">Замовлення №{order_number} • Статус: {payment_status}</div>
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
