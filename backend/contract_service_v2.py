from datetime import datetime, date
import os
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# Register fonts - Times New Roman equivalent (Liberation Serif) and DejaVu for Ukrainian
try:
    # Times New Roman equivalent for italic text
    pdfmetrics.registerFont(TTFont('TimesRoman', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
    pdfmetrics.registerFont(TTFont('TimesRoman-Italic', '/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf'))
    pdfmetrics.registerFont(TTFont('TimesRoman-Bold', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
    
    # DejaVu for Ukrainian characters
    pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVu-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVu-Italic', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf'))
    logger.info("Fonts registered successfully")
except Exception as e:
    logger.error(f"Failed to register fonts: {str(e)}")
    raise

class ContractServiceV2:
    def __init__(self, drive_service=None, sheets_service=None):
        self.output_dir = Path(__file__).parent / "generated_contracts"
        self.output_dir.mkdir(exist_ok=True)
        self.drive_service = drive_service
        self.sheets_service = sheets_service
        
    def generate_contract_number(self, edrpou: str) -> str:
        """Generate contract number: DD/MM/YY-4_middle_EDRPOU_digits-sequential_number"""
        today = datetime.now()
        
        # Get middle 4 digits of EDRPOU
        edrpou_clean = ''.join(filter(str.isdigit, str(edrpou)))
        if len(edrpou_clean) >= 8:
            middle_digits = edrpou_clean[2:6]
        else:
            middle_digits = edrpou_clean[:4].zfill(4)
        
        # Get sequential number (simplified - using timestamp)
        seq_number = today.strftime("%H%M")
        
        # Format: DD/MM/YY-9681-1
        contract_number = f"{today.strftime('%d/%m/%y')}-{middle_digits}-{seq_number}"
        
        return contract_number
    
    def get_end_of_year_date(self) -> str:
        """Get December 31 of current year"""
        today = datetime.now()
        return f"31 грудня {today.year}"
    
    def format_currency(self, amount: float) -> str:
        """Format currency amount"""
        return f"{amount:,.2f}".replace(",", " ")
    
    def generate_contract_pdf(
        self, 
        contract_data: Dict[str, Any],
        supplier_data: Dict[str, str],
        buyer_data: Dict[str, str],
        items: List[Dict[str, Any]],
        upload_to_drive: bool = True
    ) -> Dict[str, Any]:
        """
        Generate PDF contract with new template
        
        Args:
            contract_data: Basic contract data (subject, etc.)
            supplier_data: Data from "Мої дані"
            buyer_data: Data from "Основні дані"  
            items: List of items/services from order
            upload_to_drive: Whether to upload to Google Drive
            
        Returns:
            Dict with local_path, filename, contract_number and optionally drive info
        """
        try:
            # Generate contract number
            contract_number = self.generate_contract_number(buyer_data.get('ЄДРПОУ', ''))
            
            # Get dates
            today = datetime.now()
            contract_date = today.strftime("%d.%m.%Y")
            contract_date_parts = {
                'day': today.strftime("%d"),
                'month': self._get_month_name_genitive(today.month),
                'year': today.strftime("%Y")
            }
            end_date = self.get_end_of_year_date()
            
            # City from supplier data
            city = self._extract_city(supplier_data.get('Юридична адреса', 'м. Київ'))
            
            # Calculate total
            total_amount = sum(item.get('amount', 0) for item in items)
            
            # Create PDF
            filename = f"Договір_{contract_number.replace('/', '_')}_{buyer_data.get('ЄДРПОУ', '')}.pdf"
            filepath = self.output_dir / filename
            
            doc = SimpleDocTemplate(
                str(filepath),
                pagesize=A4,
                rightMargin=20*mm,
                leftMargin=20*mm,
                topMargin=20*mm,
                bottomMargin=20*mm
            )
            
            # Build document content
            story = []
            
            # Create styles
            styles = self._create_styles()
            
            # Title
            title_text = f"ДОГОВІР ПОСТАЧАННЯ ТОВАРІВ ТА/АБО НАДАННЯ ПОСЛУГ № {contract_number}"
            story.append(Paragraph(title_text, styles['Title']))
            story.append(Spacer(1, 6*mm))
            
            # Location and date
            location_date = f"{city}  «{contract_date_parts['day']}» {contract_date_parts['month']} {contract_date_parts['year']} р."
            story.append(Paragraph(location_date, styles['Normal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 1: PARTIES
            story.append(Paragraph("1. СТОРОНИ ТА ДЖЕРЕЛА ДАНИХ", styles['Heading1']))
            story.append(Spacer(1, 3*mm))
            
            # 1.1 Supplier
            supplier_text = f"""<b>1.1. Постачальник:</b> {supplier_data.get('Назва', '')}, код ЄДРПОУ {supplier_data.get('ЄДРПОУ', '')}, 
місцезнаходження {supplier_data.get('Юридична адреса', '')}, IBAN {supplier_data.get('р/р(IBAN)', '')} у банку {supplier_data.get('Банк', '')}, 
МФО {supplier_data.get('МФО', '')}, e-mail {supplier_data.get('email', '')}, тел. {supplier_data.get('тел', '')}, 
в особі {supplier_data.get('В особі', '')}, що діє на підставі {supplier_data.get('Підпис', 'Статуту')} (далі – «Постачальник»)."""
            story.append(Paragraph(supplier_text, styles['Normal']))
            story.append(Spacer(1, 3*mm))
            
            # 1.2 Buyer
            buyer_text = f"""<b>1.2. Покупець/Замовник:</b> {buyer_data.get('Назва', '')}, код ЄДРПОУ {buyer_data.get('ЄДРПОУ', '')}, 
місцезнаходження {buyer_data.get('Юридична адреса', '')}, IBAN {buyer_data.get('р/р(IBAN)', '')} у банку {buyer_data.get('Банк', '')}, 
МФО {buyer_data.get('МФО', '')}, e-mail {buyer_data.get('email', '')}, тел. {buyer_data.get('тел', '')}, 
в особі {buyer_data.get('В особі', '')}, що діє на підставі {buyer_data.get('Підпис', 'Статуту')} (далі – «Покупець»)."""
            story.append(Paragraph(buyer_text, styles['Normal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 2: SUBJECT
            story.append(Paragraph("2. ПРЕДМЕТ ДОГОВОРУ", styles['Heading1']))
            story.append(Spacer(1, 3*mm))
            
            subject_text = f"""<b>2.1.</b> Постачальник зобов'язується поставити Покупцю товари та/або надати послуги 
({contract_data.get('subject', 'Постачання товарів')}), а Покупець – прийняти та оплатити їх на умовах цього Договору."""
            story.append(Paragraph(subject_text, styles['Normal']))
            story.append(Spacer(1, 3*mm))
            
            story.append(Paragraph("<b>2.2.</b> Номенклатура, кількість/обсяг, ціни визначаються у Специфікації (Додаток 1), що є невід'ємною частиною Договору.", styles['Normal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 3-7: Standard terms (abbreviated)
            story.append(Paragraph("3. ПОРЯДОК ФОРМУВАННЯ ТА ПІДТВЕРДЖЕННЯ ЗАМОВЛЕННЯ", styles['Heading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>3.1.</b> Покупець формує Замовлення, яке підтверджується шляхом підписання КЕП або обміну електронними повідомленнями.", styles['Normal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 8: PRICE AND PAYMENT
            story.append(Paragraph("4. ЦІНА, ПОДАТКИ, ОПЛАТА", styles['Heading1']))
            story.append(Spacer(1, 3*mm))
            
            total_text = f"""<b>4.1.</b> Загальна вартість згідно Специфікації становить: {self.format_currency(total_amount)} грн 
(без ПДВ, згідно з п. 181.1 ПКУ/статусом платника)."""
            story.append(Paragraph(total_text, styles['Normal']))
            story.append(Spacer(1, 3*mm))
            
            story.append(Paragraph("<b>4.2.</b> Умови оплати: післяплата протягом 14 календарних днів з дати підписання акту приймання-передачі.", styles['Normal']))
            story.append(Spacer(1, 6*mm))
            
            # Section: TERM
            story.append(Paragraph("5. СТРОК ДІЇ ДОГОВОРУ", styles['Heading1']))
            story.append(Spacer(1, 3*mm))
            
            term_text = f"""<b>5.1.</b> Договір набирає чинності з дати підписання і діє до {end_date} або до повного виконання зобов'язань, 
залежно від того, що настане пізніше."""
            story.append(Paragraph(term_text, styles['Normal']))
            story.append(Spacer(1, 6*mm))
            
            # Section: SIGNATURES
            story.append(Paragraph("ПІДПИСИ СТОРІН:", styles['Heading1']))
            story.append(Spacer(1, 6*mm))
            
            # Signature table
            signature_data = [
                ['Постачальник', 'Покупець'],
                ['', ''],
                [f"________________/ {supplier_data.get('В особі', '')}/", f"________________/ {buyer_data.get('В особі', '')}/"]
            ]
            
            sig_table = Table(signature_data, colWidths=[8*cm, 8*cm])
            sig_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'DejaVu'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(sig_table)
            
            # Page break before appendix
            story.append(PageBreak())
            
            # APPENDIX 1: SPECIFICATION
            story.append(Paragraph("Додаток 1", styles['Heading1']))
            story.append(Paragraph("СПЕЦИФІКАЦІЯ", styles['Title']))
            story.append(Spacer(1, 6*mm))
            
            spec_info = f"до Договору № {contract_number} від {contract_date}"
            story.append(Paragraph(spec_info, styles['Normal']))
            story.append(Spacer(1, 6*mm))
            
            # Items table
            table_data = [
                ['№', 'Найменування', 'Од. виміру', 'Кіль-\nкість', 'Ціна\n(грн)', 'Сума\n(грн)']
            ]
            
            for idx, item in enumerate(items, 1):
                table_data.append([
                    str(idx),
                    item.get('name', ''),
                    item.get('unit', 'шт'),
                    str(item.get('quantity', 0)),
                    self.format_currency(item.get('price', 0)),
                    self.format_currency(item.get('amount', 0))
                ])
            
            # Total row
            table_data.append([
                '', '', '', '', '<b>РАЗОМ:</b>', f"<b>{self.format_currency(total_amount)}</b>"
            ])
            
            items_table = Table(table_data, colWidths=[1*cm, 7*cm, 2*cm, 1.5*cm, 2.5*cm, 2.5*cm])
            items_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
                ('FONTNAME', (0, 1), (-1, -2), 'DejaVu'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('ALIGN', (0, 1), (0, -1), 'CENTER'),
                ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),
                ('ALIGN', (1, 1), (2, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -2), 0.5, colors.black),
                ('BOX', (0, 0), (-1, -1), 1, colors.black),
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ]))
            story.append(items_table)
            story.append(Spacer(1, 6*mm))
            
            # Note about VAT
            story.append(Paragraph("Примітка: Постачальник не є платником ПДВ.", styles['SmallItalic']))
            story.append(Spacer(1, 12*mm))
            
            # Specification signatures
            story.append(Paragraph("ПІДПИСИ:", styles['Normal']))
            story.append(Spacer(1, 6*mm))
            
            spec_sig_table = Table(signature_data, colWidths=[8*cm, 8*cm])
            spec_sig_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'DejaVu'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(spec_sig_table)
            
            # Build PDF
            doc.build(story)
            logger.info(f"Contract PDF generated: {filename}")
            
            result = {
                'local_path': str(filepath),
                'filename': filename,
                'contract_number': contract_number
            }
            
            # Upload to Google Drive if requested
            if upload_to_drive and self.drive_service:
                try:
                    drive_result = self.drive_service.upload_file(
                        file_path=str(filepath),
                        file_name=filename,
                        folder_name='Договори'
                    )
                    
                    result.update({
                        'drive_file_id': drive_result['file_id'],
                        'drive_view_link': drive_result['view_link'],
                        'drive_download_link': drive_result['download_link']
                    })
                    logger.info(f"Contract uploaded to Google Drive: {drive_result['file_id']}")
                except Exception as e:
                    logger.error(f"Failed to upload to Google Drive: {str(e)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating contract PDF: {str(e)}")
            raise
    
    def _create_styles(self):
        """Create custom styles for the document"""
        styles = getSampleStyleSheet()
        
        # Title style
        styles.add(ParagraphStyle(
            name='Title',
            parent=styles['Heading1'],
            fontName='DejaVu-Bold',
            fontSize=14,
            alignment=TA_CENTER,
            spaceAfter=6*mm,
            spaceBefore=0
        ))
        
        # Heading 1
        styles.add(ParagraphStyle(
            name='Heading1',
            parent=styles['Normal'],
            fontName='DejaVu-Bold',
            fontSize=12,
            alignment=TA_LEFT,
            spaceAfter=3*mm,
            spaceBefore=6*mm
        ))
        
        # Normal text
        styles.add(ParagraphStyle(
            name='Normal',
            fontName='DejaVu',
            fontSize=11,
            alignment=TA_JUSTIFY,
            leading=14,
            spaceAfter=3*mm
        ))
        
        # Small italic
        styles.add(ParagraphStyle(
            name='SmallItalic',
            fontName='DejaVu-Italic',
            fontSize=9,
            alignment=TA_LEFT,
            leading=11
        ))
        
        return styles
    
    def _extract_city(self, address: str) -> str:
        """Extract city from address"""
        # Simple extraction - look for "м." or first word
        if 'м.' in address:
            parts = address.split('м.')
            if len(parts) > 1:
                city_part = parts[1].strip().split(',')[0].strip()
                return f"м. {city_part}"
        return "м. Київ"
    
    def _get_month_name_genitive(self, month: int) -> str:
        """Get Ukrainian month name in genitive case"""
        months = {
            1: 'січня', 2: 'лютого', 3: 'березня', 4: 'квітня',
            5: 'травня', 6: 'червня', 7: 'липня', 8: 'серпня',
            9: 'вересня', 10: 'жовтня', 11: 'листопада', 12: 'грудня'
        }
        return months.get(month, 'січня')
