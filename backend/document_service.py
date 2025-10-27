from datetime import datetime
import os
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Register Ukrainian fonts
try:
    pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVu-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    logger.info("Ukrainian fonts registered successfully")
except Exception as e:
    logger.error(f"Failed to register Ukrainian fonts: {str(e)}")
    raise


class DocumentService:
    def __init__(self, drive_service=None, sheets_service=None):
        self.output_dir = Path(__file__).parent / "generated_documents"
        self.output_dir.mkdir(exist_ok=True)
        self.drive_service = drive_service
        self.sheets_service = sheets_service
    
    def _generate_document_number(self, edrpou: str, doc_type: str, sequence: int = 1) -> str:
        """
        Generate document number based on type
        - Contract: 27/10/25-1968-1 (date-middle_4_digits-sequence)
        - Invoice/Act/Waybill: 1968-1 (middle_4_digits-sequence)
        """
        # Extract middle 4 digits from EDRPOU (positions 3-6)
        middle_digits = edrpou[3:7] if len(edrpou) >= 7 else edrpou[:4]
        
        if doc_type == "contract":
            date_str = datetime.now().strftime("%d/%m/%y")
            return f"{date_str}-{middle_digits}-{sequence}"
        else:
            return f"{middle_digits}-{sequence}"
    
    def generate_invoice_pdf(
        self,
        invoice_data: Dict[str, Any],
        upload_to_drive: bool = True
    ) -> Dict[str, Any]:
        """Generate PDF for Invoice (Рахунок на оплату)"""
        try:
            # Get supplier and buyer data
            supplier_data = self.sheets_service.get_supplier_data()
            buyer_data = self.sheets_service.get_counterparty_from_main_data(
                invoice_data['counterparty_edrpou']
            )
            
            if not buyer_data:
                raise ValueError(f"Покупця з ЄДРПОУ {invoice_data['counterparty_edrpou']} не знайдено")
            
            # Generate document number
            doc_number = self._generate_document_number(
                invoice_data['counterparty_edrpou'],
                'invoice',
                invoice_data.get('sequence', 1)
            )
            
            # Create PDF
            filename = f"Рахунок_{doc_number}_{invoice_data['counterparty_edrpou']}.pdf"
            filepath = self.output_dir / filename
            
            doc = SimpleDocTemplate(
                str(filepath),
                pagesize=A4,
                rightMargin=2*cm,
                leftMargin=2*cm,
                topMargin=2*cm,
                bottomMargin=2*cm
            )
            
            # Build content
            story = []
            styles = getSampleStyleSheet()
            
            # Title style
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontName='DejaVu-Bold',
                fontSize=16,
                alignment=TA_CENTER,
                spaceAfter=20
            )
            
            # Normal style
            normal_style = ParagraphStyle(
                'CustomNormal',
                parent=styles['Normal'],
                fontName='DejaVu',
                fontSize=10,
                leading=14
            )
            
            # Header
            story.append(Paragraph(f"РАХУНОК НА ОПЛАТУ № {doc_number}", title_style))
            story.append(Paragraph(f"від {datetime.now().strftime('%d.%m.%Y')} р.", normal_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Supplier info
            story.append(Paragraph("<b>Постачальник:</b>", normal_style))
            supplier_info = [
                ['Назва:', supplier_data['name']],
                ['ЄДРПОУ:', supplier_data['edrpou']],
                ['Адреса:', supplier_data['legal_address']],
                ['р/р (IBAN):', supplier_data['iban']],
                ['Банк:', supplier_data['bank']],
                ['МФО:', supplier_data['mfo']],
                ['Телефон:', supplier_data['phone']],
                ['Email:', supplier_data['email']]
            ]
            
            supplier_table = Table(supplier_info, colWidths=[4*cm, 13*cm])
            supplier_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), 'DejaVu', 9),
                ('FONT', (0, 0), (0, -1), 'DejaVu-Bold', 9),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(supplier_table)
            story.append(Spacer(1, 0.5*cm))
            
            # Buyer info
            story.append(Paragraph("<b>Покупець:</b>", normal_style))
            buyer_info = [
                ['Назва:', buyer_data.get('Назва', '')],
                ['ЄДРПОУ:', buyer_data.get('ЄДРПОУ', '')],
                ['Адреса:', buyer_data.get('Юридична адреса', '')],
            ]
            
            buyer_table = Table(buyer_info, colWidths=[4*cm, 13*cm])
            buyer_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), 'DejaVu', 9),
                ('FONT', (0, 0), (0, -1), 'DejaVu-Bold', 9),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(buyer_table)
            story.append(Spacer(1, 0.7*cm))
            
            # Items table
            story.append(Paragraph("<b>Товари (роботи, послуги):</b>", normal_style))
            story.append(Spacer(1, 0.3*cm))
            
            # Table headers
            items_data = [['№', 'Найменування', 'Кіл-сть', 'Од.', 'Ціна без ПДВ', 'Сума без ПДВ']]
            
            total_sum = 0
            for idx, item in enumerate(invoice_data['items'], 1):
                amount = item['quantity'] * item['price']
                total_sum += amount
                items_data.append([
                    str(idx),
                    item['name'],
                    str(item['quantity']),
                    item['unit'],
                    f"{item['price']:.2f}",
                    f"{amount:.2f}"
                ])
            
            items_table = Table(items_data, colWidths=[1*cm, 7*cm, 2*cm, 2*cm, 3*cm, 3*cm])
            items_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, 0), 'DejaVu-Bold', 9),
                ('FONT', (0, 1), (-1, -1), 'DejaVu', 9),
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('ALIGN', (1, 1), (1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(items_table)
            story.append(Spacer(1, 0.5*cm))
            
            # Totals
            totals_data = [
                ['Всього без ПДВ:', f"{total_sum:.2f} грн"],
                ['Сума ПДВ (не платник):', '0.00 грн'],
                ['<b>Всього до сплати:</b>', f"<b>{total_sum:.2f} грн</b>"]
            ]
            
            totals_table = Table(totals_data, colWidths=[12*cm, 5*cm])
            totals_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), 'DejaVu', 10),
                ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('LINEABOVE', (0, 2), (-1, 2), 1, colors.black),
            ]))
            story.append(totals_table)
            story.append(Spacer(1, 1*cm))
            
            # Signature
            story.append(Paragraph(f"Виписав(ла): {supplier_data['signature']}", normal_style))
            
            # Build PDF
            doc.build(story)
            logger.info(f"Invoice PDF generated: {filepath}")
            
            # Upload to Google Drive
            result = {
                'success': True,
                'pdf_path': str(filepath),
                'pdf_filename': filename,
                'invoice_number': doc_number
            }
            
            if upload_to_drive and self.drive_service:
                try:
                    drive_result = self.drive_service.upload_file(
                        str(filepath),
                        filename,
                        folder_name="Рахунки"
                    )
                    result.update({
                        'drive_file_id': drive_result['file_id'],
                        'drive_view_link': drive_result['view_link'],
                        'drive_download_link': drive_result['download_link']
                    })
                except Exception as e:
                    logger.error(f"Failed to upload invoice to Google Drive: {str(e)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating invoice PDF: {str(e)}")
            raise
    
    def generate_act_pdf(
        self,
        act_data: Dict[str, Any],
        upload_to_drive: bool = True
    ) -> Dict[str, Any]:
        """Generate PDF for Act (Акт виконаних робіт)"""
        try:
            # Get supplier and buyer data
            supplier_data = self.sheets_service.get_supplier_data()
            buyer_data = self.sheets_service.get_counterparty_from_main_data(
                act_data['counterparty_edrpou']
            )
            
            if not buyer_data:
                raise ValueError(f"Покупця з ЄДРПОУ {act_data['counterparty_edrpou']} не знайдено")
            
            # Generate document number
            doc_number = self._generate_document_number(
                act_data['counterparty_edrpou'],
                'act',
                act_data.get('sequence', 1)
            )
            
            # Create PDF
            filename = f"Акт_{doc_number}_{act_data['counterparty_edrpou']}.pdf"
            filepath = self.output_dir / filename
            
            doc = SimpleDocTemplate(
                str(filepath),
                pagesize=A4,
                rightMargin=2*cm,
                leftMargin=2*cm,
                topMargin=2*cm,
                bottomMargin=2*cm
            )
            
            # Build content
            story = []
            styles = getSampleStyleSheet()
            
            # Title style
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontName='DejaVu-Bold',
                fontSize=16,
                alignment=TA_CENTER,
                spaceAfter=20
            )
            
            # Normal style
            normal_style = ParagraphStyle(
                'CustomNormal',
                parent=styles['Normal'],
                fontName='DejaVu',
                fontSize=10,
                leading=14
            )
            
            # Header
            story.append(Paragraph(f"АКТ ВИКОНАНИХ РОБІТ № {doc_number}", title_style))
            story.append(Paragraph(f"від {datetime.now().strftime('%d.%m.%Y')} р.", normal_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Buyer (Замовник) info
            story.append(Paragraph("<b>Реквізити Замовника:</b>", normal_style))
            buyer_info = [
                ['Назва підприємства:', buyer_data.get('Назва', '')],
                ['Код ЄДРПОУ:', buyer_data.get('ЄДРПОУ', '')],
                ['Юридична адреса:', buyer_data.get('Юридична адреса', '')],
                ['Розрахункові реквізити:', buyer_data.get('р/р(IBAN)', '')],
                ['Банк:', buyer_data.get('Банк', '')],
                ['Телефон:', buyer_data.get('тел', '')],
                ['Директор:', buyer_data.get('В особі', '')]
            ]
            
            buyer_table = Table(buyer_info, colWidths=[5*cm, 12*cm])
            buyer_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), 'DejaVu', 9),
                ('FONT', (0, 0), (0, -1), 'DejaVu-Bold', 9),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(buyer_table)
            story.append(Spacer(1, 0.5*cm))
            
            # Supplier (Виконавець) info
            story.append(Paragraph("<b>Реквізити Виконавця:</b>", normal_style))
            supplier_info = [
                ['Назва підприємства:', supplier_data['name']],
                ['Код ЄДРПОУ:', supplier_data['edrpou']],
                ['Юридична адреса:', supplier_data['legal_address']],
                ['Розрахункові реквізити:', supplier_data['iban']],
                ['Банк:', supplier_data['bank']],
                ['МФО:', supplier_data['mfo']],
                ['Телефон:', supplier_data['phone']],
                ['Директор:', supplier_data['represented_by']]
            ]
            
            supplier_table = Table(supplier_info, colWidths=[5*cm, 12*cm])
            supplier_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), 'DejaVu', 9),
                ('FONT', (0, 0), (0, -1), 'DejaVu-Bold', 9),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(supplier_table)
            story.append(Spacer(1, 0.7*cm))
            
            # Works/Services table
            story.append(Paragraph("<b>Виконані роботи (надані послуги):</b>", normal_style))
            story.append(Spacer(1, 0.3*cm))
            
            items_data = [['№', 'Найменування робіт (послуг)', 'Кіл-сть', 'Од.', 'Ціна', 'Сума']]
            
            total_sum = 0
            for idx, item in enumerate(act_data['items'], 1):
                amount = item['quantity'] * item['price']
                total_sum += amount
                items_data.append([
                    str(idx),
                    item['name'],
                    str(item['quantity']),
                    item['unit'],
                    f"{item['price']:.2f}",
                    f"{amount:.2f}"
                ])
            
            items_table = Table(items_data, colWidths=[1*cm, 7*cm, 2*cm, 2*cm, 3*cm, 3*cm])
            items_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, 0), 'DejaVu-Bold', 9),
                ('FONT', (0, 1), (-1, -1), 'DejaVu', 9),
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('ALIGN', (1, 1), (1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(items_table)
            story.append(Spacer(1, 0.5*cm))
            
            # Totals
            totals_data = [
                ['Всього без ПДВ:', f"{total_sum:.2f} грн"],
                ['Сума ПДВ (не платник):', '0.00 грн'],
                ['<b>Разом до сплати:</b>', f"<b>{total_sum:.2f} грн</b>"]
            ]
            
            totals_table = Table(totals_data, colWidths=[12*cm, 5*cm])
            totals_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), 'DejaVu', 10),
                ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('LINEABOVE', (0, 2), (-1, 2), 1, colors.black),
            ]))
            story.append(totals_table)
            story.append(Spacer(1, 1*cm))
            
            # Signatures
            signatures_data = [
                ['Від Виконавця:', ''],
                [supplier_data['signature'], '_________________'],
                ['', ''],
                ['Від Замовника:', ''],
                ['', '_________________']
            ]
            
            signatures_table = Table(signatures_data, colWidths=[8*cm, 8*cm])
            signatures_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), 'DejaVu', 10),
                ('FONT', (0, 0), (0, 0), 'DejaVu-Bold', 10),
                ('FONT', (0, 3), (0, 3), 'DejaVu-Bold', 10),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(signatures_table)
            
            # Build PDF
            doc.build(story)
            logger.info(f"Act PDF generated: {filepath}")
            
            # Upload to Google Drive
            result = {
                'success': True,
                'pdf_path': str(filepath),
                'pdf_filename': filename,
                'act_number': doc_number
            }
            
            if upload_to_drive and self.drive_service:
                try:
                    drive_result = self.drive_service.upload_file(
                        str(filepath),
                        filename,
                        folder_name="Акти"
                    )
                    result.update({
                        'drive_file_id': drive_result['file_id'],
                        'drive_view_link': drive_result['view_link'],
                        'drive_download_link': drive_result['download_link']
                    })
                except Exception as e:
                    logger.error(f"Failed to upload act to Google Drive: {str(e)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating act PDF: {str(e)}")
            raise
    
    def generate_waybill_pdf(
        self,
        waybill_data: Dict[str, Any],
        upload_to_drive: bool = True
    ) -> Dict[str, Any]:
        """Generate PDF for Waybill (Видаткова накладна)"""
        try:
            # Get supplier and buyer data
            supplier_data = self.sheets_service.get_supplier_data()
            buyer_data = self.sheets_service.get_counterparty_from_main_data(
                waybill_data['counterparty_edrpou']
            )
            
            if not buyer_data:
                raise ValueError(f"Покупця з ЄДРПОУ {waybill_data['counterparty_edrpou']} не знайдено")
            
            # Generate document number
            doc_number = self._generate_document_number(
                waybill_data['counterparty_edrpou'],
                'waybill',
                waybill_data.get('sequence', 1)
            )
            
            # Create PDF
            filename = f"Накладна_{doc_number}_{waybill_data['counterparty_edrpou']}.pdf"
            filepath = self.output_dir / filename
            
            doc = SimpleDocTemplate(
                str(filepath),
                pagesize=A4,
                rightMargin=2*cm,
                leftMargin=2*cm,
                topMargin=2*cm,
                bottomMargin=2*cm
            )
            
            # Build content
            story = []
            styles = getSampleStyleSheet()
            
            # Title style
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontName='DejaVu-Bold',
                fontSize=16,
                alignment=TA_CENTER,
                spaceAfter=20
            )
            
            # Normal style
            normal_style = ParagraphStyle(
                'CustomNormal',
                parent=styles['Normal'],
                fontName='DejaVu',
                fontSize=10,
                leading=14
            )
            
            # Header
            story.append(Paragraph(f"ВИДАТКОВА НАКЛАДНА № {doc_number}", title_style))
            story.append(Paragraph(f"від {datetime.now().strftime('%d.%m.%Y')} р.", normal_style))
            story.append(Spacer(1, 0.3*cm))
            
            # Contract reference
            story.append(Paragraph(f"Договір: № ______ від ________", normal_style))
            story.append(Paragraph(f"Адреса доставки: {buyer_data.get('Юридична адреса', '')}", normal_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Supplier info
            story.append(Paragraph("<b>Постачальник:</b>", normal_style))
            story.append(Paragraph(supplier_data['name'], normal_style))
            story.append(Paragraph(f"м. {supplier_data['legal_address'].split(',')[-1].strip() if ',' in supplier_data['legal_address'] else 'Київ'}", normal_style))
            story.append(Spacer(1, 0.3*cm))
            
            # Buyer info
            story.append(Paragraph("<b>Покупець:</b>", normal_style))
            story.append(Paragraph(buyer_data.get('Назва', ''), normal_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Items table
            items_data = [['№', 'Товар', 'Кіл-сть', 'Од.', 'Ціна без ПДВ', 'Сума без ПДВ']]
            
            total_sum = 0
            for idx, item in enumerate(waybill_data['items'], 1):
                amount = item['quantity'] * item['price']
                total_sum += amount
                items_data.append([
                    str(idx),
                    item['name'],
                    str(item['quantity']),
                    item['unit'],
                    f"{item['price']:.2f}",
                    f"{amount:.2f}"
                ])
            
            items_table = Table(items_data, colWidths=[1*cm, 7*cm, 2*cm, 2*cm, 3*cm, 3*cm])
            items_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, 0), 'DejaVu-Bold', 9),
                ('FONT', (0, 1), (-1, -1), 'DejaVu', 9),
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('ALIGN', (1, 1), (1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(items_table)
            story.append(Spacer(1, 0.5*cm))
            
            # Totals
            totals_data = [
                ['Всього:', f"{total_sum:.2f} грн"],
                ['Сума ПДВ:', '0.00 грн'],
                ['<b>Всього із ПДВ:</b>', f"<b>{total_sum:.2f} грн</b>"]
            ]
            
            totals_table = Table(totals_data, colWidths=[12*cm, 5*cm])
            totals_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), 'DejaVu', 10),
                ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('LINEABOVE', (0, 2), (-1, 2), 1, colors.black),
            ]))
            story.append(totals_table)
            story.append(Spacer(1, 0.5*cm))
            
            story.append(Paragraph("<b>Без ПДВ</b>", normal_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Signatures
            story.append(Paragraph(f"Місце складання: _________________", normal_style))
            story.append(Spacer(1, 0.5*cm))
            
            signatures_data = [
                ['Від постачальника*:', '_________________'],
                ['', supplier_data['signature']],
                ['', ''],
                ['Отримав(ла)*:', '_________________']
            ]
            
            signatures_table = Table(signatures_data, colWidths=[8*cm, 8*cm])
            signatures_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), 'DejaVu', 10),
                ('FONT', (0, 0), (0, 0), 'DejaVu-Bold', 10),
                ('FONT', (0, 3), (0, 3), 'DejaVu-Bold', 10),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(signatures_table)
            story.append(Spacer(1, 0.3*cm))
            
            story.append(Paragraph("<i>* Відповідальний за здійснення господарської операції і правильність її оформлення</i>", 
                                 ParagraphStyle('Italic', parent=normal_style, fontSize=8, fontName='DejaVu')))
            
            # Build PDF
            doc.build(story)
            logger.info(f"Waybill PDF generated: {filepath}")
            
            # Upload to Google Drive
            result = {
                'success': True,
                'pdf_path': str(filepath),
                'pdf_filename': filename,
                'waybill_number': doc_number
            }
            
            if upload_to_drive and self.drive_service:
                try:
                    drive_result = self.drive_service.upload_file(
                        str(filepath),
                        filename,
                        folder_name="Видаткові накладні"
                    )
                    result.update({
                        'drive_file_id': drive_result['file_id'],
                        'drive_view_link': drive_result['view_link'],
                        'drive_download_link': drive_result['download_link']
                    })
                except Exception as e:
                    logger.error(f"Failed to upload waybill to Google Drive: {str(e)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating waybill PDF: {str(e)}")
            raise
