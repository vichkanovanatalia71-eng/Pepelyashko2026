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

class ContractService:
    def __init__(self, drive_service=None):
        self.template_path = Path(__file__).parent / "contract_template.docx"
        self.output_dir = Path(__file__).parent / "generated_contracts"
        self.output_dir.mkdir(exist_ok=True)
        self.drive_service = drive_service
        
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
            city = contract_data.get('city', 'Одеса')
            
            # Counterparty data
            counterparty = contract_data.get('counterparty', {})
            supplier_name = counterparty.get('representative_name', '')
            supplier_edrpou = counterparty.get('edrpou', '')
            supplier_email = counterparty.get('email', '')
            supplier_phone = counterparty.get('phone', '')
            supplier_iban = counterparty.get('iban', '')
            director_position = counterparty.get('director_position', 'Директор')
            director_name = counterparty.get('director_name', supplier_name)
            
            # Items/specification
            items = contract_data.get('items', [])
            total_amount = contract_data.get('total_amount', 0)
            subject = contract_data.get('subject', 'Постачання товарів')
            
            # Generate filename
            filename = f"contract_{contract_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            output_path = self.output_dir / filename
            
            # Create PDF
            doc = SimpleDocTemplate(str(output_path), pagesize=A4,
                                    rightMargin=2*cm, leftMargin=2*cm,
                                    topMargin=2*cm, bottomMargin=2*cm)
            
            # Container for PDF elements
            story = []
            
            # Styles
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=14,
                textColor=colors.black,
                alignment=TA_CENTER,
                spaceAfter=12
            )
            
            normal_style = ParagraphStyle(
                'CustomNormal',
                parent=styles['Normal'],
                fontSize=11,
                alignment=TA_JUSTIFY,
                spaceAfter=12
            )
            
            # Title
            story.append(Paragraph(f'ДОГОВІР ПОСТАЧАННЯ № {contract_number}', title_style))
            story.append(Paragraph(f'{city}, {contract_date}', ParagraphStyle(
                'DateStyle', parent=styles['Normal'], fontSize=11, alignment=TA_CENTER, spaceAfter=12
            )))
            story.append(Spacer(1, 0.5*cm))
            
            # Introduction
            intro = f"""КОМУНАЛЬНЕ НЕКОМЕРЦІЙНЕ ПІДПРИЄМСТВО "МУРОВАНОКУРИЛОВЕЦЬКА ЦЕНТРАЛЬНА РАЙОННА ЛІКАРНЯ", 
            іменоване в подальшому «Покупець», в особі директора Шевцова Анатолія Миколайовича, який діє на підставі Статуту, 
            з однієї сторони, та <b>{supplier_name}</b>, іменований в подальшому «Постачальник», в особі {director_position} {director_name}, 
            з іншої сторони, уклали цей Договір про наступне:"""
            story.append(Paragraph(intro, normal_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Section 1
            story.append(Paragraph('<b>1. ПРЕДМЕТ ДОГОВОРУ</b>', styles['Heading2']))
            story.append(Paragraph('1.1. Постачальник зобов\'язується передати у власність Покупцю, а Покупець прийняти та оплатити Товар відповідно до умов цього Договору та Специфікації, яка є невід\'ємною частиною цього Договору.', normal_style))
            story.append(Paragraph(f'1.2. Предмет договору: {subject}', normal_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Section 2 - Specification
            story.append(Paragraph('<b>2. СПЕЦИФІКАЦІЯ</b>', styles['Heading2']))
            
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
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -2), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ]))
            story.append(table)
            story.append(Spacer(1, 0.5*cm))
            
            # Section 3
            story.append(Paragraph('<b>3. ЦІНА ТА ПОРЯДОК РОЗРАХУНКІВ</b>', styles['Heading2']))
            story.append(Paragraph(f'3.1. Загальна вартість Товару за цим Договором становить: <b>{total_amount:.2f} грн</b> (без ПДВ).', normal_style))
            story.append(Paragraph('3.2. Оплата здійснюється шляхом 100% передоплати на розрахунковий рахунок Постачальника протягом 3 (трьох) банківських днів з моменту підписання цього Договору.', normal_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Section 4
            story.append(Paragraph('<b>4. СТРОК ДІЇ ДОГОВОРУ</b>', styles['Heading2']))
            story.append(Paragraph(f'4.1. Цей Договір набирає чинності з моменту його підписання Сторонами і діє до 31 грудня {datetime.now().year} року.', normal_style))
            story.append(Paragraph('4.2. Поставка Товару здійснюється протягом 7 (семи) календарних днів з моменту надходження коштів на розрахунковий рахунок Постачальника.', normal_style))
            story.append(Spacer(1, 1*cm))
            
            # Section 5 - Signatures
            story.append(Paragraph('<b>5. РЕКВІЗИТИ ТА ПІДПИСИ СТОРІН</b>', styles['Heading2']))
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
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(sig_table)
            
            # Build PDF
            doc.build(story)
            
            logger.info(f"Generated contract PDF: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Error generating contract PDF: {str(e)}")
            raise
    
    async def send_contract_email(
        self, 
        pdf_path: str, 
        recipient_email: str,
        contract_number: str,
        smtp_config: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Send contract via email"""
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
            
            message.set_content(f"""
Доброго дня!

Направляємо Вам договір № {contract_number} для ознайомлення та підписання.

Договір у форматі PDF додано до цього листа.

З повагою,
Система управління документами
            """)
            
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
