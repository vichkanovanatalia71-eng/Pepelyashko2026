from datetime import datetime
import os
from pathlib import Path
from weasyprint import HTML
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

class OrderService:
    def __init__(self, drive_service=None, sheets_service=None):
        self.output_dir = Path(__file__).parent / "generated_orders"
        self.output_dir.mkdir(exist_ok=True)
        self.drive_service = drive_service
        self.sheets_service = sheets_service
        self.template_file = Path(__file__).parent / "order_template.html"
        
    def generate_order_number(self) -> str:
        """
        Generate order number: simple sequential 0001, 0002, 0003...
        Gets the next number from Google Sheets
        """
        try:
            if self.sheets_service:
                # Get all orders from Google Sheets
                worksheet = self.sheets_service.spreadsheet.worksheet("Замовлення")
                records = worksheet.get_all_records()
                
                # Count valid records (skip headers)
                valid_count = 0
                for record in records:
                    try:
                        # If we can parse the number, it's a valid order
                        num_str = str(record.get('Номер', '')).strip()
                        if num_str and num_str.isdigit():
                            valid_count += 1
                    except:
                        continue
                
                # Next number
                next_number = valid_count + 1
                return f"{next_number:04d}"
            else:
                # Fallback: use timestamp-based number
                return datetime.now().strftime("%H%M")
        except Exception as e:
            logger.error(f"Error generating order number: {str(e)}")
            # Fallback
            return datetime.now().strftime("%H%M")
    
    def format_currency(self, amount: float) -> str:
        """Format currency amount"""
        formatted = f"{amount:,.2f}".replace(",", " ")
        return formatted
    
    def calculate_vat(self, items: List[Dict[str, Any]], vat_rate: float = 20.0) -> Dict[str, float]:
        """
        Calculate VAT totals
        
        Returns:
            Dict with total_net, total_vat, total_gross
        """
        total_net = sum(item.get('amount', 0) for item in items)
        total_vat = total_net * (vat_rate / 100)
        total_gross = total_net + total_vat
        
        return {
            'total_net': total_net,
            'total_vat': total_vat,
            'total_gross': total_gross
        }
    
    def load_template(self) -> str:
        """Load HTML template for order"""
        try:
            if self.template_file.exists():
                with open(self.template_file, 'r', encoding='utf-8') as f:
                    return f.read()
            else:
                logger.warning(f"Template file not found: {self.template_file}")
                return self.get_default_template()
        except Exception as e:
            logger.error(f"Error loading template: {str(e)}")
            return self.get_default_template()
    
    def get_default_template(self) -> str:
        """Get default HTML template (embedded)"""
        # This will use the template provided by user
        return """<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <title>Замовлення № {{order_number}} від {{order_date}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: A4; margin: 2cm 1.5cm 2cm 3cm; }

    html, body {
      margin: 0; padding: 0; background: #fff; color: #111;
      font: 12px/1.4 "Times New Roman", serif;
    }
    .wrap { max-width: 17cm; margin: 0 auto; }

    h1 { text-align: center; margin: 10px 0 8px; font-size: 16px; font-weight: bold; }

    .meta { width: 100%; margin: 6px 0 10px; border-collapse: collapse; }
    .meta td { padding: 2px 0; vertical-align: top; }

    /* Розділи */
    .block-title {
      text-align: center;
      font-weight: bold;
      font-size: 11px;
      margin: 10px 0 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* Таблиця позицій */
    table.items {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 6px;
    }
    table.items thead { background: #f7f7f7; }
    table.items th, table.items td {
      border: 1px solid #cfd4d9;
      padding: 6px 8px;
      vertical-align: top;
      font-size: 12px;
    }
    table.items th { text-align: center; font-weight: bold; }
    .ncol   { width: 28px;  text-align: center; }
    .name   { width: 46%;   }
    .unit   { width: 10%;   text-align: center; }
    .numeric{ text-align: right; }

    /* Підсумки */
    table.items tfoot td {
      border: 1px solid #cfd4d9;
      font-weight: bold;
      background: #fafafa;
    }
    .tfoot-label { text-align: right; }
    .tfoot-sum   { text-align: right; width: 14%; }

    /* Реквізити */
    .requisites { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 12px; }
    .requisites th, .requisites td {
      border: 1px solid #cfd4d9; padding: 6px 8px; vertical-align: top; font-size: 12px;
    }
    .requisites th { background: #f7f7f7; text-align: center; font-weight: bold; }
    .requisites td { width: 50%; }
    .mono { font-family: "Courier New", monospace; white-space: nowrap; }

    .signline { margin-top: 10px; }

    /* Друк */
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }

    @media print { a[href]:after { content: ""; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>ЗАМОВЛЕННЯ № {{order_number}} ВІД {{order_date}}</h1>

    <table class="meta">
      <tr>
        <td><strong>Місце складання:</strong> м. Одеса</td>
      </tr>
    </table>

    <div class="block-title">Сторони</div>
    <table class="requisites">
      <tr>
        <th>ПОКУПЕЦЬ</th>
        <th>ПОСТАЧАЛЬНИК</th>
      </tr>
      <tr>
        <td>
          <p><strong>Назва:</strong> {{buyer_name}}</p>
          <p><strong>ЄДРПОУ:</strong> <span class="mono">{{buyer_edrpou}}</span></p>
          <p><strong>Адреса:</strong> {{buyer_address}}</p>
          <p><strong>IBAN:</strong> <span class="mono">{{buyer_iban}}</span></p>
          <p><strong>Банк:</strong> {{buyer_bank}}</p>
          <p><strong>МФО:</strong> <span class="mono">{{buyer_mfo}}</span></p>
          <p><strong>Email:</strong> <span class="mono">{{buyer_email}}</span></p>
          <p><strong>Тел.:</strong> <span class="mono">{{buyer_phone}}</span></p>
        </td>
        <td>
          <p><strong>Назва:</strong> {{supplier_name}}</p>
          <p><strong>ЄДРПОУ/РНОКПП:</strong> <span class="mono">{{supplier_edrpou}}</span></p>
          <p><strong>Адреса:</strong> {{supplier_address}}</p>
          <p><strong>IBAN:</strong> <span class="mono">{{supplier_iban}}</span></p>
          <p><strong>Банк:</strong> {{supplier_bank}}</p>
          <p><strong>МФО:</strong> <span class="mono">{{supplier_mfo}}</span></p>
          <p><strong>Email:</strong> <span class="mono">{{supplier_email}}</span></p>
          <p><strong>Тел.:</strong> <span class="mono">{{supplier_phone}}</span></p>
        </td>
      </tr>
    </table>

    <div class="block-title">Перелік позицій</div>
    <table class="items">
      <thead>
        <tr>
          <th class="ncol">№</th>
          <th class="name">Найменування</th>
          <th class="unit">Од. виміру</th>
          <th class="numeric">Кількість</th>
          <th class="numeric">Ціна, грн</th>
          <th class="numeric">Сума, грн</th>
        </tr>
      </thead>
      <tbody>
        {{items_rows}}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="tfoot-label">Разом без ПДВ, грн</td>
          <td class="tfoot-sum"><span class="mono">{{total_net}}</span></td>
        </tr>
        <tr>
          <td colspan="5" class="tfoot-label">ПДВ {{vat_rate}}%, грн</td>
          <td class="tfoot-sum"><span class="mono">{{total_vat}}</span></td>
        </tr>
        <tr>
          <td colspan="5" class="tfoot-label"><strong>Всього до сплати, грн</strong></td>
          <td class="tfoot-sum"><strong><span class="mono">{{total_gross}}</span></strong></td>
        </tr>
      </tfoot>
    </table>

    <div class="block-title">Роз'яснення</div>
    <ol style="margin:6px 0 0 18px; padding:0;">
      <li>Даний документ є первинним погодженим Замовленням між Покупцем і Постачальником, що визначає обсяг, кількість, вартість і найменування товарів та/або послуг.</li>
      <li>Замовлення є підставою для подальшого укладення Договору постачання товарів та/або надання послуг між Сторонами.</li>
      <li>Ціни, зазначені в Замовленні, діють до моменту укладення Договору або письмового підтвердження змін, якщо інше не погоджено Сторонами.</li>
      <li>Підписання цього Замовлення засвідчує намір Сторін здійснити відповідну поставку товарів або надання послуг на погоджених умовах.</li>
      <li>Документ може підписуватись у паперовому вигляді або електронними засобами з використанням кваліфікованого електронного підпису (КЕП).</li>
      <li>Цей документ не створює фінансових зобов'язань до моменту укладення основного Договору, але є підтвердженням узгодження номенклатури та вартості.</li>
    </ol>

    <div class="block-title" style="margin-top:14px;">Підписи сторін</div>
    <table class="requisites">
      <tr>
        <td>
          <p><strong>Від Покупця:</strong></p>
          <p>ПІБ: ___________________________</p>
          <p class="signline">Підпис: __________________ / ________ /</p>
        </td>
        <td>
          <p><strong>Від Постачальника:</strong></p>
          <p>ПІБ: ___________________________</p>
          <p class="signline">Підпис: __________________ / ________ /</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>"""
    
    def generate_order_pdf(
        self, 
        order_data: Dict[str, Any],
        supplier_data: Dict[str, str],
        buyer_data: Dict[str, str],
        items: List[Dict[str, Any]],
        upload_to_drive: bool = True,
        custom_template: Optional[str] = None,
        vat_rate: float = 0.0
    ) -> Dict[str, Any]:
        """
        Generate PDF order
        
        Args:
            order_data: Basic order data
            supplier_data: Data from "Мої дані"
            buyer_data: Data from "Основні дані"  
            items: List of items/services
            upload_to_drive: Whether to upload to Google Drive
            custom_template: Custom HTML template (optional)
            vat_rate: VAT rate percentage (default 0% - не платник ПДВ)
            
        Returns:
            Dict with local_path, filename, order_number and optionally drive info
        """
        try:
            # Generate or use existing order number
            if 'order_number' in order_data and order_data['order_number']:
                order_number = order_data['order_number']
                logger.info(f"Using existing order number: {order_number}")
            else:
                order_number = self.generate_order_number()
                logger.info(f"Generated new order number: {order_number}")
            
            # Get date
            today = datetime.now()
            order_date = today.strftime("%d.%m.%Y")
            
            # Calculate totals
            totals = self.calculate_vat(items, vat_rate)
            
            # Load template
            if custom_template and custom_template.strip():
                html_template = custom_template
                logger.info("Using custom HTML template for order")
            else:
                html_template = self.load_template()
                logger.info("Using default template for order")
            
            # Build items rows HTML
            items_rows_html = ""
            print(f"DEBUG: Building items HTML. Items count: {len(items)}")
            print(f"DEBUG: Items data: {items}")
            
            for idx, item in enumerate(items, 1):
                print(f"DEBUG: Processing item {idx}: {item}")
                items_rows_html += f"""
        <tr>
          <td class="ncol">{idx}</td>
          <td class="name">{item.get('name', '')}</td>
          <td class="unit">{item.get('unit', 'шт')}</td>
          <td class="numeric"><span class="mono">{self.format_currency(item.get('quantity', 0))}</span></td>
          <td class="numeric"><span class="mono">{self.format_currency(item.get('price', 0))}</span></td>
          <td class="numeric"><span class="mono">{self.format_currency(item.get('amount', 0))}</span></td>
        </tr>"""
            
            print(f"DEBUG: Generated items_rows_html length: {len(items_rows_html)}")
            print(f"DEBUG: First 500 chars of items_rows_html: {items_rows_html[:500]}")
            
            # Prepare context for variable replacement
            context = {
                # Order info
                'order_number': order_number,
                'order_date': order_date,
                # Supplier (Постачальник - Мої дані)
                'supplier_name': supplier_data.get('Назва', supplier_data.get('name', '')),
                'supplier_edrpou': supplier_data.get('ЄДРПОУ', supplier_data.get('edrpou', '')),
                'supplier_address': supplier_data.get('Юридична адреса', supplier_data.get('legal_address', '')),
                'supplier_iban': supplier_data.get('р/р(IBAN)', supplier_data.get('iban', '')),
                'supplier_bank': supplier_data.get('Банк', supplier_data.get('bank', '')),
                'supplier_mfo': supplier_data.get('МФО', supplier_data.get('mfo', '')),
                'supplier_email': supplier_data.get('email', ''),
                'supplier_phone': supplier_data.get('тел', supplier_data.get('phone', '')),
                'supplier_signature': supplier_data.get('Підпис', supplier_data.get('signature', '')),
                # Buyer (Покупець - Основні дані)
                'buyer_name': buyer_data.get('Назва', ''),
                'buyer_edrpou': buyer_data.get('ЄДРПОУ', ''),
                'buyer_address': buyer_data.get('Юридична адреса', ''),
                'buyer_iban': buyer_data.get('р/р(IBAN)', ''),
                'buyer_bank': buyer_data.get('Банк', ''),
                'buyer_mfo': buyer_data.get('МФО', ''),
                'buyer_email': buyer_data.get('email', ''),
                'buyer_phone': buyer_data.get('тел', ''),
                'buyer_signature': buyer_data.get('Підпис', ''),
                # Items
                'items_rows': items_rows_html,
                # Totals
                'total_net': self.format_currency(totals['total_net']),
                'total_vat': self.format_currency(totals['total_vat']),
                'total_gross': self.format_currency(totals['total_gross']),
                'vat_rate': str(vat_rate)
            }
            
            # Replace all {{variable}} with actual values
            parsed_html = self._parse_template(html_template, context)
            
            # Create PDF filename
            filename = f"Замовлення_{order_number}_{buyer_data.get('ЄДРПОУ', '')}.pdf"
            filepath = self.output_dir / filename
            
            # Generate PDF from HTML using WeasyPrint
            HTML(string=parsed_html).write_pdf(str(filepath))
            
            logger.info(f"Order PDF generated: {filename}")
            
            result = {
                'local_path': str(filepath),
                'filename': filename,
                'order_number': order_number,
                'pdf_path': str(filepath)
            }
            
            # Upload to Google Drive if requested
            if upload_to_drive and self.drive_service:
                try:
                    drive_result = self.drive_service.upload_file(
                        file_path=str(filepath),
                        folder_name='Замовлення',
                        custom_name=filename
                    )
                    
                    if drive_result and drive_result.get('file_id'):
                        result['drive_file_id'] = drive_result['file_id']
                        result['drive_view_link'] = drive_result.get('web_view_link', '')
                        result['drive_download_link'] = drive_result.get('web_content_link', '')
                        logger.info(f"Order uploaded to Google Drive: {drive_result['file_id']}")
                except Exception as drive_error:
                    logger.error(f"Failed to upload to Google Drive: {str(drive_error)}")
                    # Don't fail the whole operation if Drive upload fails
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating order PDF: {str(e)}")
            raise
    
    def _parse_template(self, template: str, context: Dict[str, Any]) -> str:
        """
        Parse template and replace variables with actual values
        
        Args:
            template: Template text with {{variables}}
            context: Dictionary with all available variables
        
        Returns:
            Parsed template with replaced variables
        """
        import re
        
        # Replace all {{variable}} with actual values
        def replace_variable(match):
            var_name = match.group(1)
            return str(context.get(var_name, ''))
        
        # Pattern to match {{variable_name}}
        pattern = r'\{\{([^}]+)\}\}'
        parsed = re.sub(pattern, replace_variable, template)
        
        return parsed

    async def send_order_email(
        self, 
        pdf_path: str, 
        recipient_email: str,
        order_number: str,
        drive_link: Optional[str] = None,
        smtp_config: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Send order via email with optional Google Drive link"""
        try:
            import smtplib
            from email.message import EmailMessage
            from email.utils import formataddr
            
            if smtp_config is None:
                # Default SMTP configuration
                smtp_config = {
                    'hostname': os.getenv('SMTP_HOST', 'smtp.gmail.com'),
                    'port': int(os.getenv('SMTP_PORT', 587)),
                    'username': os.getenv('SMTP_USERNAME'),
                    'password': os.getenv('SMTP_PASSWORD')
                }
            
            # Check if SMTP is configured
            if not smtp_config['username'] or not smtp_config['password']:
                logger.warning("SMTP not configured - email not sent")
                return False
            
            # Create message
            message = EmailMessage()
            message['From'] = smtp_config['username']
            message['To'] = recipient_email
            message['Subject'] = f'Замовлення № {order_number}'
            
            # Email body with optional Drive link
            email_body = f"""
Доброго дня!

Направляємо Вам замовлення № {order_number} для ознайомлення.
"""
            
            if drive_link:
                email_body += f"""
Переглянути замовлення онлайн: {drive_link}

"""
            
            email_body += """
Замовлення у форматі PDF додано до цього листа.

З повагою,
Система управління документами
            """
            
            message.set_content(email_body)
            
            # Attach PDF with proper Unicode filename encoding
            with open(pdf_path, 'rb') as f:
                pdf_data = f.read()
                # Get the filename and encode it properly for email
                filename = os.path.basename(pdf_path)
                
                # Use RFC 2231 encoding for Unicode filenames
                message.add_attachment(
                    pdf_data,
                    maintype='application',
                    subtype='pdf',
                    filename=filename
                )
            
            # Send email via SMTP
            with smtplib.SMTP(smtp_config['hostname'], smtp_config['port']) as server:
                server.starttls()
                server.login(smtp_config['username'], smtp_config['password'])
                server.send_message(message)
            
            logger.info(f"Order email sent successfully to {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending order email: {str(e)}")
            return False

