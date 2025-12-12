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
            
            # Create HTML with Compact Premium B2B design (fits on one A4 page)
            html_content = f"""
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <style>
        @page {{
            size: A4;
            margin: 10mm;
        }}
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'DejaVu Sans', 'Segoe UI', Arial, sans-serif;
            font-size: 8pt;
            line-height: 1.3;
            color: #1B1B1B;
            background: #F3F4F6;
        }}
        .card {{
            background: #FFFFFF;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            overflow: hidden;
        }}
        .card-content {{
            padding: 16px 20px;
        }}
        
        /* Hero Section - Compact */
        .hero {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 10px;
            margin-bottom: 12px;
            border-bottom: 1px solid #E5E7EB;
        }}
        .hero-left {{
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .hero-icon {{
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #3B82F6, #2563EB);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14pt;
        }}
        .hero-title {{
            font-size: 13pt;
            font-weight: 600;
            color: #1B1B1B;
        }}
        .hero-date {{
            font-size: 8pt;
            color: #6B7280;
        }}
        .status-badge {{
            background: {'#10B981' if is_paid else '#F59E0B'};
            color: white;
            padding: 4px 10px;
            border-radius: 10px;
            font-size: 7pt;
            font-weight: 600;
        }}
        
        /* Parameters Grid - Compact */
        .params-grid {{
            display: flex;
            gap: 16px;
            margin-bottom: 12px;
            padding: 8px 12px;
            background: #F9FAFB;
            border-radius: 6px;
        }}
        .param-item {{
            flex: 1;
        }}
        .param-label {{
            font-size: 6pt;
            font-weight: 600;
            color: #9CA3AF;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 2px;
        }}
        .param-value {{
            font-size: 9pt;
            font-weight: 600;
            color: #1B1B1B;
        }}
        .param-value.accent {{
            font-size: 10pt;
            font-weight: 700;
            color: #3B82F6;
        }}
        
        /* Section Title - Compact */
        .section-title {{
            font-size: 8pt;
            font-weight: 600;
            color: #374151;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 4px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }}
        .section-icon {{
            font-size: 10pt;
        }}
        
        /* Items - Compact Grid */
        .items-header {{
            background: #F9FAFB;
            border-radius: 4px 4px 0 0;
            padding: 6px 8px;
            display: flex;
            font-size: 6pt;
            font-weight: 600;
            color: #6B7280;
            text-transform: uppercase;
        }}
        .items-header > div:nth-child(1) {{ width: 24px; }}
        .items-header > div:nth-child(2) {{ flex: 1; }}
        .items-header > div:nth-child(3) {{ width: 36px; text-align: center; }}
        .items-header > div:nth-child(4) {{ width: 44px; text-align: right; }}
        .items-header > div:nth-child(5) {{ width: 56px; text-align: right; }}
        .items-header > div:nth-child(6) {{ width: 70px; text-align: right; }}
        
        .items-body {{
            border: 1px solid #E5E7EB;
            border-top: none;
            border-radius: 0 0 4px 4px;
        }}
        .item-row {{
            display: flex;
            padding: 5px 8px;
            border-bottom: 1px solid #F3F4F6;
            align-items: center;
        }}
        .item-row:last-child {{ border-bottom: none; }}
        .item-row > div:nth-child(1) {{ width: 24px; font-size: 7pt; color: #9CA3AF; }}
        .item-row > div:nth-child(2) {{ flex: 1; font-size: 7.5pt; font-weight: 500; }}
        .item-row > div:nth-child(3) {{ width: 36px; font-size: 7pt; color: #6B7280; text-align: center; }}
        .item-row > div:nth-child(4) {{ width: 44px; font-size: 7.5pt; text-align: right; }}
        .item-row > div:nth-child(5) {{ width: 56px; font-size: 7.5pt; text-align: right; }}
        .item-row > div:nth-child(6) {{ width: 70px; font-size: 7.5pt; font-weight: 600; text-align: right; }}
        
        /* Total Box - Compact */
        .total-box {{
            background: #EFF6FF;
            border: 1px solid #BFDBFE;
            border-radius: 6px;
            padding: 8px 12px;
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .total-label {{
            font-size: 8pt;
            font-weight: 600;
            color: #1E40AF;
        }}
        .total-value {{
            font-size: 11pt;
            font-weight: 700;
            color: #3B82F6;
        }}
        
        /* Two Column Layout */
        .two-columns {{
            display: flex;
            gap: 12px;
            margin-bottom: 10px;
        }}
        .column {{
            flex: 1;
        }}
        
        /* Buyer Card - Compact */
        .buyer-card {{
            background: #F9FAFB;
            border-radius: 6px;
            padding: 10px;
        }}
        .buyer-row {{
            display: flex;
            padding: 3px 0;
            border-bottom: 1px solid #E5E7EB;
        }}
        .buyer-row:last-child {{ border-bottom: none; }}
        .buyer-label {{
            width: 70px;
            font-size: 6.5pt;
            font-weight: 500;
            color: #6B7280;
        }}
        .buyer-value {{
            flex: 1;
            font-size: 7pt;
            color: #1B1B1B;
        }}
        .buyer-value.bold {{ font-weight: 600; }}
        .buyer-value.mono {{ font-family: 'DejaVu Sans Mono', monospace; font-size: 6.5pt; }}
        
        /* Supplier Card */
        .supplier-card {{
            background: #F0FDF4;
            border-radius: 6px;
            padding: 10px;
        }}
        .supplier-row {{
            display: flex;
            padding: 3px 0;
            border-bottom: 1px solid #D1FAE5;
        }}
        .supplier-row:last-child {{ border-bottom: none; }}
        .supplier-label {{
            width: 70px;
            font-size: 6.5pt;
            font-weight: 500;
            color: #6B7280;
        }}
        .supplier-value {{
            flex: 1;
            font-size: 7pt;
            color: #1B1B1B;
        }}
        
        /* Signatures - Compact */
        .signatures {{
            display: flex;
            gap: 16px;
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid #E5E7EB;
        }}
        .signature-block {{
            flex: 1;
        }}
        .signature-title {{
            font-size: 7pt;
            font-weight: 600;
            color: #374151;
            text-transform: uppercase;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 2px solid #3B82F6;
        }}
        .sig-row {{
            display: flex;
            font-size: 6.5pt;
            padding: 2px 0;
        }}
        .sig-label {{
            width: 50px;
            color: #6B7280;
        }}
        .sig-value {{
            flex: 1;
            color: #1B1B1B;
        }}
        .sign-line {{
            margin-top: 8px;
            font-size: 6.5pt;
            color: #6B7280;
        }}
        .sign-placeholder {{
            border-bottom: 1px solid #1B1B1B;
            width: 100px;
            display: inline-block;
            height: 14px;
        }}
        
        /* Footer - Compact */
        .footer {{
            text-align: center;
            padding: 8px 0 0;
            font-size: 6pt;
            color: #9CA3AF;
            border-top: 1px solid #E5E7EB;
            margin-top: 10px;
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
                <span class="total-label">💰 Разом:</span>
                <span class="total-value">{total_amount:,.2f} грн</span>
            </div>

            <!-- Two Columns: Buyer & Supplier -->
            <div class="two-columns">
                <div class="column">
                    <div class="section-title">
                        <span class="section-icon">🏢</span>
                        Покупець
                    </div>
                    <div class="buyer-card">
                        <div class="buyer-row">
                            <span class="buyer-label">Назва</span>
                            <span class="buyer-value bold">{counterparty_name[:50]}{'...' if len(counterparty_name) > 50 else ''}</span>
                        </div>
                        <div class="buyer-row">
                            <span class="buyer-label">ЄДРПОУ</span>
                            <span class="buyer-value mono">{counterparty_edrpou}</span>
                        </div>
                        <div class="buyer-row">
                            <span class="buyer-label">Адреса</span>
                            <span class="buyer-value">{counterparty_address[:40] if counterparty_address else '—'}{'...' if counterparty_address and len(counterparty_address) > 40 else ''}</span>
                        </div>
                        <div class="buyer-row">
                            <span class="buyer-label">Тел.</span>
                            <span class="buyer-value">{counterparty_phone if counterparty_phone else '—'}</span>
                        </div>
                        <div class="buyer-row">
                            <span class="buyer-label">Email</span>
                            <span class="buyer-value">{counterparty_email if counterparty_email else '—'}</span>
                        </div>
                        <div class="buyer-row">
                            <span class="buyer-label">IBAN</span>
                            <span class="buyer-value mono">{counterparty_iban[:25] if counterparty_iban else '—'}{'...' if counterparty_iban and len(counterparty_iban) > 25 else ''}</span>
                        </div>
                        <div class="buyer-row">
                            <span class="buyer-label">Банк</span>
                            <span class="buyer-value">{counterparty_bank[:25] if counterparty_bank else '—'}{'...' if counterparty_bank and len(counterparty_bank) > 25 else ''}</span>
                        </div>
                        <div class="buyer-row">
                            <span class="buyer-label">Директор</span>
                            <span class="buyer-value">{counterparty_director if counterparty_director else '—'}</span>
                        </div>
                    </div>
                </div>
                <div class="column">
                    <div class="section-title">
                        <span class="section-icon">🏭</span>
                        Постачальник
                    </div>
                    <div class="supplier-card">
                        <div class="supplier-row">
                            <span class="supplier-label">Назва</span>
                            <span class="supplier-value">{supplier_name[:50] if supplier_name else '—'}{'...' if supplier_name and len(supplier_name) > 50 else ''}</span>
                        </div>
                        <div class="supplier-row">
                            <span class="supplier-label">ЄДРПОУ</span>
                            <span class="supplier-value">{supplier_edrpou if supplier_edrpou else '—'}</span>
                        </div>
                        <div class="supplier-row">
                            <span class="supplier-label">Адреса</span>
                            <span class="supplier-value">{supplier_address[:40] if supplier_address else '—'}{'...' if supplier_address and len(supplier_address) > 40 else ''}</span>
                        </div>
                        <div class="supplier-row">
                            <span class="supplier-label">Тел.</span>
                            <span class="supplier-value">{supplier_phone if supplier_phone else '—'}</span>
                        </div>
                        <div class="supplier-row">
                            <span class="supplier-label">Email</span>
                            <span class="supplier-value">{supplier_email if supplier_email else '—'}</span>
                        </div>
                        <div class="supplier-row">
                            <span class="supplier-label">IBAN</span>
                            <span class="supplier-value">{supplier_iban[:25] if supplier_iban else '—'}{'...' if supplier_iban and len(supplier_iban) > 25 else ''}</span>
                        </div>
                        <div class="supplier-row">
                            <span class="supplier-label">Банк</span>
                            <span class="supplier-value">{supplier_bank[:25] if supplier_bank else '—'}{'...' if supplier_bank and len(supplier_bank) > 25 else ''}</span>
                        </div>
                        <div class="supplier-row">
                            <span class="supplier-label">Директор</span>
                            <span class="supplier-value">{supplier_director if supplier_director else '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Signatures -->
            <div class="signatures">
                <div class="signature-block">
                    <div class="signature-title">Покупець</div>
                    <div class="sig-row">
                        <span class="sig-label">ЄДРПОУ:</span>
                        <span class="sig-value">{counterparty_edrpou}</span>
                    </div>
                    <div class="sign-line">
                        Підпис: <span class="sign-placeholder"></span> / {counterparty_director[:20] if counterparty_director else '________'} /
                    </div>
                </div>
                <div class="signature-block">
                    <div class="signature-title">Постачальник</div>
                    <div class="sig-row">
                        <span class="sig-label">ЄДРПОУ:</span>
                        <span class="sig-value">{supplier_edrpou if supplier_edrpou else '—'}</span>
                    </div>
                    <div class="sign-line">
                        Підпис: <span class="sign-placeholder"></span> / {supplier_director[:20] if supplier_director else '________'} /
                    </div>
                </div>
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
            pdf_filename = f"order_{order_number}_{timestamp}.pdf"
            pdf_path = self.output_dir / pdf_filename
            
            HTML(string=html_content).write_pdf(pdf_path)
            
            logger.info(f"Generated order PDF: {pdf_path}")
            return str(pdf_path)
            
        except Exception as e:
            logger.error(f"Error generating order PDF: {str(e)}")
            raise
