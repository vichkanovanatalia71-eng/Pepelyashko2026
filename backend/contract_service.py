from docx import Document
from datetime import datetime
import os
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
import logging
import aiosmtplib
from email.message import EmailMessage
from email.utils import encode_rfc2231
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Register Ukrainian fonts
try:
    pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVu-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    logger.info("Ukrainian fonts registered successfully")
except Exception as e:
    logger.error(f"Failed to register Ukrainian fonts: {str(e)}")
    raise

class ContractService:
    def __init__(self, drive_service=None, sheets_service=None):
        self.template_path = Path(__file__).parent / "contract_template.docx"
        self.output_dir = Path(__file__).parent / "generated_contracts"
        self.output_dir.mkdir(exist_ok=True)
        self.drive_service = drive_service
        self.sheets_service = sheets_service
        
    def generate_contract_pdf(
        self, 
        contract_data: Dict[str, Any],
        upload_to_drive: bool = True
    ) -> Dict[str, Any]:
        """
        Generate PDF contract using ReportLab and optionally upload to Google Drive
        
        Returns:
            Dict with local_path and optionally drive_file_id and drive_link
        """
        try:
            # Extract data
            contract_number = contract_data.get('contract_number', '001')
            contract_date = contract_data.get('contract_date', datetime.now().strftime('%d.%m.%Y'))
            
            # Get buyer data (from "Основні дані" sheet)
            buyer_data = contract_data.get('buyer_data', {})
            if not buyer_data and self.sheets_service:
                buyer_data = self.sheets_service.get_buyer_main_data()
            
            buyer_name = buyer_data.get('Назва', 'Назва покупця')
            buyer_address = buyer_data.get('Юридична адреса', '')
            buyer_edrpou = buyer_data.get('ЄДРПОУ', '')
            buyer_iban = buyer_data.get('р/р(IBAN)', '')
            buyer_bank = buyer_data.get('Банк', '')
            buyer_mfo = buyer_data.get('МФО', '')
            buyer_email = buyer_data.get('email', '')
            buyer_phone = buyer_data.get('тел', '')
            buyer_director = buyer_data.get('Директор', '')
            
            # Supplier (постачальник) - static data
            supplier_name = 'ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ "ВОРДКРАФТ"'
            supplier_edrpou = '43677030'
            supplier_address = 'Україна, 65017, Одеська обл., м. Одеса, вул. Квітнева, буд. 22'
            supplier_iban = 'UA163052990000026007004908751'
            supplier_bank = 'в АТ КБ "Приватбанк"'
            supplier_mfo = '305299'
            supplier_email = 'wordcraft@surdo.org.ua'
            supplier_phone = '+380 50 540 54 11'
            supplier_director = 'Роман КОЛОНТАЙ'
            
            # Items/specification
            items = contract_data.get('items', [])
            total_amount = contract_data.get('total_amount', 0)
            subject = contract_data.get('subject', 'Товар')
            
            # Generate filename
            filename = f"contract_{contract_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            output_path = self.output_dir / filename
            
            # Create PDF
            doc = SimpleDocTemplate(str(output_path), pagesize=A4,
                                    rightMargin=2*cm, leftMargin=2*cm,
                                    topMargin=2*cm, bottomMargin=2*cm)
            
            # Container for PDF elements
            story = []
            
            # Styles with Ukrainian font
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=14,
                textColor=colors.black,
                alignment=TA_CENTER,
                spaceAfter=12,
                fontName='DejaVu-Bold'
            )
            
            normal_style = ParagraphStyle(
                'CustomNormal',
                parent=styles['Normal'],
                fontSize=10,
                alignment=TA_JUSTIFY,
                spaceAfter=8,
                fontName='DejaVu'
            )
            
            heading_style = ParagraphStyle(
                'CustomHeading',
                parent=styles['Heading2'],
                fontSize=11,
                fontName='DejaVu-Bold',
                spaceAfter=8
            )
            
            small_style = ParagraphStyle(
                'SmallText',
                parent=styles['Normal'],
                fontSize=9,
                fontName='DejaVu',
                spaceAfter=6
            )
            
            # Title
            story.append(Paragraph(f'Договір поставки № {contract_number}', title_style))
            date_style = ParagraphStyle(
                'DateStyle', 
                parent=styles['Normal'], 
                fontSize=10, 
                alignment=TA_CENTER, 
                spaceAfter=12,
                fontName='DejaVu'
            )
            story.append(Paragraph(contract_date, date_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Parties
            story.append(Paragraph(f'<b>Постачальник:</b> ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ "ВОРДКРАФТ" (ЄДРПОУ: 45906348), в особі директора Романа Колонтая, що діє на підставі Статуту, з однієї сторони, та', normal_style))
            story.append(Paragraph(f'<b>Покупець:</b> {buyer_name}, в особі директора {buyer_director}, що діє на підставі Статуту, з іншої сторони, разом по тексту цього Договору іменуються як Сторони, а кожна окремо – як Сторона, уклали цей Договір поставки (надалі – Договір) про наступне:', normal_style))
            story.append(Spacer(1, 0.4*cm))
            
            # Section 1
            story.append(Paragraph('<b>1. ПРЕДМЕТ ДОГОВОРУ</b>', heading_style))
            story.append(Paragraph('1.1. Постачальник зобов\'язується передати у власність Покупцю, а Покупець прийняти та оплатити Товар відповідно до умов цього Договору та Специфікації, яка є невід\'ємною частиною цього Договору.', normal_style))
            story.append(Paragraph(f'1.2. Предмет договору: {subject}', normal_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Section 2 - Specification
            story.append(Paragraph('<b>2. СПЕЦИФІКАЦІЯ</b>', heading_style))
            
            # Create table data
            table_data = [['№', 'Найменування', 'Од.', 'К-сть', 'Ціна, грн', 'Сума, грн']]
            for idx, item in enumerate(items, 1):
                table_data.append([
                    str(idx),
                    item.get('name', ''),
                    item.get('unit', ''),
                    str(item.get('quantity', 0)),
                    f"{item.get('price', 0):.2f}",
                    f"{item.get('amount', 0):.2f}"
                ])
            table_data.append(['', '', '', '', 'РАЗОМ:', f'{total_amount:.2f}'])
            
            # Create table
            table = Table(table_data, colWidths=[1.5*cm, 7*cm, 2*cm, 2*cm, 3*cm, 3*cm])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'DejaVu'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -2), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTNAME', (0, -1), (-1, -1), 'DejaVu-Bold'),
            ]))
            story.append(table)
            story.append(Spacer(1, 0.5*cm))
            
            # Section 3
            story.append(Paragraph('<b>3. ЦІНА ТА ПОРЯДОК РОЗРАХУНКІВ</b>', heading_style))
            story.append(Paragraph(f'3.1. Загальна вартість Товару за цим Договором становить: <b>{total_amount:.2f} грн</b> (без ПДВ).', normal_style))
            story.append(Paragraph('3.2. Оплата здійснюється шляхом 100% передоплати на розрахунковий рахунок Постачальника протягом 3 (трьох) банківських днів з моменту підписання цього Договору.', normal_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Section 4
            story.append(Paragraph('<b>4. СТРОК ДІЇ ДОГОВОРУ</b>', heading_style))
            story.append(Paragraph(f'4.1. Цей Договір набирає чинності з моменту його підписання Сторонами і діє до 31 грудня {datetime.now().year} року.', normal_style))
            story.append(Paragraph('4.2. Поставка Товару здійснюється протягом 7 (семи) календарних днів з моменту надходження коштів на розрахунковий рахунок Постачальника.', normal_style))
            story.append(Spacer(1, 1*cm))
            
            # Section 5 - Signatures
            story.append(Paragraph('<b>5. РЕКВІЗИТИ ТА ПІДПИСИ СТОРІН</b>', heading_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Signatures table
            sig_data = [
                ['ПОКУПЕЦЬ:', 'ПОСТАЧАЛЬНИК:'],
                ['КНП "Мурованокуриловецька ЦРЛ"', supplier_name],
                ['Код ЄДРПОУ: 01982608', f'Код ЄДРПОУ: {supplier_edrpou}'],
                ['', f'Email: {supplier_email}'],
                ['', f'Тел.: {supplier_phone}'],
                ['', f'IBAN: {supplier_iban}'],
                ['', ''],
                ['___________ Шевцов А.М.', f'___________ {director_name}'],
                ['М.П.', ''],
            ]
            
            sig_table = Table(sig_data, colWidths=[9*cm, 9*cm])
            sig_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'DejaVu'),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(sig_table)
            
            # Build PDF
            doc.build(story)
            
            logger.info(f"Generated contract PDF: {output_path}")
            
            # Prepare result
            result = {
                'local_path': str(output_path),
                'filename': filename
            }
            
            # Upload to Google Drive if requested and service is available
            if upload_to_drive and self.drive_service:
                try:
                    # Create custom filename with EDRPOU
                    drive_filename = f"Договір_{contract_number}_{supplier_edrpou}.pdf"
                    
                    drive_result = self.drive_service.upload_file(
                        file_path=str(output_path),
                        folder_name='Договори',
                        custom_name=drive_filename
                    )
                    
                    result['drive_file_id'] = drive_result['file_id']
                    result['drive_view_link'] = drive_result['web_view_link']
                    result['drive_download_link'] = drive_result['web_content_link']
                    
                    logger.info(f"Uploaded contract to Google Drive: {drive_result['file_id']}")
                    
                except Exception as e:
                    logger.error(f"Failed to upload to Google Drive: {str(e)}")
                    # Continue without Drive upload
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating contract PDF: {str(e)}")
            raise
    
    async def send_contract_email(
        self, 
        pdf_path: str, 
        recipient_email: str,
        contract_number: str,
        drive_link: Optional[str] = None,
        smtp_config: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Send contract via email with optional Google Drive link"""
        try:
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
            message['Subject'] = f'Договір № {contract_number}'
            
            # Email body with optional Drive link
            email_body = f"""
Доброго дня!

Направляємо Вам договір № {contract_number} для ознайомлення та підписання.
"""
            
            if drive_link:
                email_body += f"""
Переглянути договір онлайн: {drive_link}

"""
            
            email_body += """
Договір у форматі PDF додано до цього листа.

З повагою,
Система управління документами
            """
            
            message.set_content(email_body)
            
            # Attach PDF with proper Unicode filename encoding
            with open(pdf_path, 'rb') as f:
                pdf_data = f.read()
                # Get the filename and encode it properly for email
                original_filename = os.path.basename(pdf_path)
                # Use RFC 2231 encoding for the filename
                message.add_attachment(
                    pdf_data,
                    maintype='application',
                    subtype='pdf',
                    filename=('utf-8', '', original_filename)
                )
            
            # Send email with start_tls
            await aiosmtplib.send(
                message,
                hostname=smtp_config['hostname'],
                port=smtp_config['port'],
                username=smtp_config['username'],
                password=smtp_config['password'],
                start_tls=True
            )
            
            logger.info(f"Contract sent to {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending contract email: {str(e)}")
            return False
