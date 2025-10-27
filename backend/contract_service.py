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
        Generate PDF contract using ReportLab based on HTML template
        
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
            buyer_director_full = buyer_data.get('В особі', '')
            buyer_signature = buyer_data.get('Підпис', '')
            
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
            
            # Calculate contract end date (end of current year)
            current_year = datetime.now().year
            
            # Generate filename
            filename = f"contract_{contract_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            output_path = self.output_dir / filename
            
            # Create PDF
            doc = SimpleDocTemplate(str(output_path), pagesize=A4,
                                    rightMargin=2*cm, leftMargin=2*cm,
                                    topMargin=1.5*cm, bottomMargin=1.5*cm)
            
            # Container for PDF elements
            story = []
            
            # Define styles
            styles = getSampleStyleSheet()
            
            title_style = ParagraphStyle(
                'Title',
                fontName='DejaVu-Bold',
                fontSize=16,
                alignment=TA_CENTER,
                spaceAfter=6
            )
            
            normal_style = ParagraphStyle(
                'Normal',
                fontName='DejaVu',
                fontSize=10,
                alignment=TA_JUSTIFY,
                spaceAfter=8,
                leading=14
            )
            
            heading_style = ParagraphStyle(
                'Heading',
                fontName='DejaVu-Bold',
                fontSize=12,
                spaceAfter=8
            )
            
            small_style = ParagraphStyle(
                'Small',
                fontName='DejaVu',
                fontSize=9,
                textColor=colors.HexColor('#666666'),
                spaceAfter=12
            )
            
            # Title and date
            story.append(Paragraph(f'ДОГОВІР ПОСТАВКИ № {contract_number}', title_style))
            story.append(Paragraph(f'м. Одеса &nbsp;&nbsp;&nbsp;&nbsp; {contract_date} р.', small_style))
            story.append(Spacer(1, 0.3*cm))
            
            # Parties introduction
            intro_text = f'''<b>Постачальник:</b> {supplier_name}, в особі директора Колонтая Романа Леонідовича, що діє на підставі Статуту, з однієї сторони, та <b>Покупець:</b> {buyer_name}, {buyer_director_full}, з іншої сторони, разом іменовані «Сторони», уклали цей Договір поставки (далі — «Договір») про таке.'''
            story.append(Paragraph(intro_text, normal_style))
            story.append(Spacer(1, 0.4*cm))
            
            # Section 1: Предмет Договору
            story.append(Paragraph('<b>1. Предмет Договору</b>', heading_style))
            story.append(Paragraph(f'1.1. Постачальник зобов\'язується поставити, а Покупець прийняти та оплатити Товар ({subject}) згідно цього Договору та видаткових документів.', normal_style))
            story.append(Paragraph('1.2. Якість Товару має відповідати вимогам чинного законодавства України, ДСТУ/ТУ та умовам Покупця.', normal_style))
            story.append(Spacer(1, 0.3*cm))
            
            # Section 2: Поставка
            story.append(Paragraph('<b>2. Поставка</b>', heading_style))
            story.append(Paragraph('2.1. Поставка здійснюється Постачальником за власний рахунок або транспортом, якщо інше не погоджено Сторонами.', normal_style))
            story.append(Paragraph('2.2. Датою поставки є дата видаткової накладної, підписаної Сторонами. Право власності переходить Покупцю на момент її підписання.', normal_style))
            story.append(Spacer(1, 0.3*cm))
            
            # Section 3: Гарантія
            story.append(Paragraph('<b>3. Гарантія</b>', heading_style))
            story.append(Paragraph('3.1. Гарантійний строк експлуатації Товару: 12 місяців.', normal_style))
            story.append(Paragraph('3.2. Упродовж гарантії Постачальник безоплатно усуває виявлені дефекти, крім випадків порушення правил експлуатації.', normal_style))
            story.append(Spacer(1, 0.3*cm))
            
            # Section 4: Ціна і розрахунки
            story.append(Paragraph('<b>4. Ціна і розрахунки</b>', heading_style))
            story.append(Paragraph(f'4.1. Загальна вартість Договору: <b>{total_amount:.2f} грн</b> без ПДВ.', normal_style))
            story.append(Paragraph(f'4.2. Покупець здійснює 100% передоплату відповідно до рахунку на оплату протягом 3 (трьох) банківських днів.', normal_style))
            story.append(Spacer(1, 0.3*cm))
            
            # Section 5: Відповідальність
            story.append(Paragraph('<b>5. Відповідальність</b>', heading_style))
            story.append(Paragraph('5.1. За порушення умов Договору винна Сторона несе відповідальність згідно із законодавством України та цим Договором.', normal_style))
            story.append(Paragraph('5.2. За прострочення поставки Постачальник сплачує неустойку 0,1% від вартості непоставленого Товару за кожен день прострочення.', normal_style))
            story.append(Spacer(1, 0.3*cm))
            
            # Section 6: Форс-мажор
            story.append(Paragraph('<b>6. Форс-мажор</b>', heading_style))
            story.append(Paragraph('6.1. Обставини непереборної сили звільняють від відповідальності на період їх дії за наявності підтвердження ТПП України.', normal_style))
            story.append(Spacer(1, 0.3*cm))
            
            # Section 7: Строк дії
            story.append(Paragraph('<b>7. Строк дії</b>', heading_style))
            story.append(Paragraph('7.1. Договір набирає чинності з дати підписання та діє до повного виконання зобов\'язань.', normal_style))
            story.append(Paragraph('7.2. Зміни/доповнення дійсні лише у письмовій формі, підписані уповноваженими представниками обох Сторін.', normal_style))
            story.append(Spacer(1, 0.4*cm))
            
            # Section 8: Реквізити сторін
            story.append(Paragraph('<b>8. Реквізити сторін</b>', heading_style))
            story.append(Spacer(1, 0.2*cm))
            
            # Requisites table
            req_data = [
                ['ПОКУПЕЦЬ', 'ПОСТАЧАЛЬНИК'],
                [
                    Paragraph(f'<b>{buyer_name}</b><br/>Юр. адреса: {buyer_address}<br/>Код ЄДРПОУ: {buyer_edrpou}<br/>р/р (IBAN): {buyer_iban}<br/>{buyer_bank}<br/>МФО: {buyer_mfo}<br/>E-mail: {buyer_email}<br/>Тел.: {buyer_phone}<br/>Директор: {buyer_signature}', normal_style),
                    Paragraph(f'<b>{supplier_name}</b><br/>Юр. адреса: {supplier_address}<br/>Код ЄДРПОУ: {supplier_edrpou}<br/>р/р (IBAN): {supplier_iban}<br/>{supplier_bank}<br/>МФО: {supplier_mfo}<br/>E-mail: {supplier_email}<br/>Тел.: {supplier_phone}<br/>Директор: {supplier_director}', normal_style)
                ]
            ]
            
            req_table = Table(req_data, colWidths=[9*cm, 9*cm])
            req_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                ('TOPPADDING', (0, 1), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 12),
            ]))
            story.append(req_table)
            story.append(Spacer(1, 0.5*cm))
            
            # Section 9: Підписи
            story.append(Paragraph('<b>9. Підписи сторін</b>', heading_style))
            story.append(Spacer(1, 0.2*cm))
            
            sig_data = [
                ['Постачальник', 'Покупець'],
                ['', ''],
                [f'__________________________ / {supplier_director} /', f'__________________________ / {buyer_signature} /']
            ]
            
            sig_table = Table(sig_data, colWidths=[9*cm, 9*cm], rowHeights=[None, 60, None])
            sig_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
                ('FONTNAME', (0, 2), (-1, 2), 'DejaVu'),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
                ('VALIGN', (0, 2), (-1, 2), 'BOTTOM'),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
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
                    drive_filename = f"Договір_{contract_number}_{buyer_edrpou}.pdf"
                    
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
