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
from weasyprint import HTML, CSS
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
    pdfmetrics.registerFont(TTFont('DejaVu-Italic', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))  # Use Serif as italic alternative
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
        upload_to_drive: bool = True,
        custom_template: Optional[str] = None,
        template_settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate PDF contract with new template
        
        Args:
            contract_data: Basic contract data (subject, etc.)
            supplier_data: Data from "Мої дані"
            buyer_data: Data from "Основні дані"  
            items: List of items/services from order
            upload_to_drive: Whether to upload to Google Drive
            custom_template: Custom template text with variables and formatting
            template_settings: Settings like fontSize, fontFamily, lineSpacing
            
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
            
            # Create PDF with correct margins (top/bottom: 2cm, left: 3cm, right: 1cm)
            filename = f"Договір_{contract_number.replace('/', '_')}_{buyer_data.get('ЄДРПОУ', '')}.pdf"
            filepath = self.output_dir / filename
            
            doc = SimpleDocTemplate(
                str(filepath),
                pagesize=A4,
                rightMargin=10*mm,   # 1 cm
                leftMargin=30*mm,    # 3 cm
                topMargin=20*mm,     # 2 cm
                bottomMargin=20*mm   # 2 cm
            )
            
            # Build document content
            story = []
            
            # Create styles
            styles = self._create_styles(template_settings)
            
            # Prepare context for variable replacement
            context = {
                # Supplier (Мої дані)
                'supplier_name': supplier_data.get('Назва', supplier_data.get('name', '')),
                'supplier_edrpou': supplier_data.get('ЄДРПОУ', supplier_data.get('edrpou', '')),
                'supplier_address': supplier_data.get('Юридична адреса', supplier_data.get('legal_address', '')),
                'supplier_iban': supplier_data.get('р/р(IBAN)', supplier_data.get('iban', '')),
                'supplier_bank': supplier_data.get('Банк', supplier_data.get('bank', '')),
                'supplier_mfo': supplier_data.get('МФО', supplier_data.get('mfo', '')),
                'supplier_email': supplier_data.get('email', ''),
                'supplier_phone': supplier_data.get('тел', supplier_data.get('phone', '')),
                'supplier_representative': supplier_data.get('В особі', supplier_data.get('represented_by', '')),
                'supplier_signature': supplier_data.get('Підпис', supplier_data.get('signature', '')),
                # Buyer (Основні дані)
                'buyer_name': buyer_data.get('Назва', ''),
                'buyer_edrpou': buyer_data.get('ЄДРПОУ', ''),
                'buyer_address': buyer_data.get('Юридична адреса', ''),
                'buyer_iban': buyer_data.get('р/р(IBAN)', ''),
                'buyer_bank': buyer_data.get('Банк', ''),
                'buyer_mfo': buyer_data.get('МФО', ''),
                'buyer_email': buyer_data.get('email', ''),
                'buyer_phone': buyer_data.get('тел', ''),
                'buyer_representative': buyer_data.get('В особі', ''),
                'buyer_signature': buyer_data.get('Підпис', ''),
                # General
                'contract_number': contract_number,
                'contract_date': contract_date,
                'city': city,
                'end_date': end_date,
                'total_amount': self.format_currency(total_amount),
                'subject': contract_data.get('subject', '')
            }
            
            # Check if custom template is provided
            if custom_template and custom_template.strip():
                logger.info("Using custom template for contract generation")
                
                # Parse template and replace variables
                parsed_template = self._parse_custom_template(custom_template, context)
                
                # Process formatting markers and create story
                formatted_elements = self._process_formatting_markers(parsed_template, styles['CustomNormal'])
                story.extend(formatted_elements)
                
            else:
                # Use standard template
                logger.info("Using standard template for contract generation")
                
                # Title
                title_text = f"ДОГОВІР ПОСТАЧАННЯ ТОВАРІВ ТА/АБО НАДАННЯ ПОСЛУГ № {contract_number}"
                story.append(Paragraph(title_text, styles['ContractTitle']))
                story.append(Spacer(1, 6*mm))
            
            # Location and date
            location_date = f"{city}  «{contract_date_parts['day']}» {contract_date_parts['month']} {contract_date_parts['year']} р."
            story.append(Paragraph(location_date, styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 1: PARTIES
            story.append(Paragraph("1. СТОРОНИ ТА ДЖЕРЕЛА ДАНИХ", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            
            # 1.1 Supplier
            supplier_text = f"""<b>1.1. Постачальник:</b> {supplier_data.get('Назва', '')}, код ЄДРПОУ {supplier_data.get('ЄДРПОУ', '')}, 
місцезнаходження {supplier_data.get('Юридична адреса', '')}, IBAN {supplier_data.get('р/р(IBAN)', '')} у банку {supplier_data.get('Банк', '')}, 
МФО {supplier_data.get('МФО', '')}, e-mail {supplier_data.get('email', '')}, тел. {supplier_data.get('тел', '')}, 
в особі {supplier_data.get('В особі', '')}, що діє на підставі {supplier_data.get('Підпис', 'Статуту')} (далі – «Постачальник»)."""
            story.append(Paragraph(supplier_text, styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            
            # 1.2 Buyer
            buyer_text = f"""<b>1.2. Покупець/Замовник:</b> {buyer_data.get('Назва', '')}, код ЄДРПОУ {buyer_data.get('ЄДРПОУ', '')}, 
місцезнаходження {buyer_data.get('Юридична адреса', '')}, IBAN {buyer_data.get('р/р(IBAN)', '')} у банку {buyer_data.get('Банк', '')}, 
МФО {buyer_data.get('МФО', '')}, e-mail {buyer_data.get('email', '')}, тел. {buyer_data.get('тел', '')}, 
в особі {buyer_data.get('В особі', '')}, що діє на підставі {buyer_data.get('Підпис', 'Статуту')} (далі – «Покупець»)."""
            story.append(Paragraph(buyer_text, styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            
            # 1.3
            story.append(Paragraph("<b>1.3.</b> Ці дані автоматично підтягуються з аркушів: «Мої дані» (Постачальник) та «Основні дані» (Покупець). Уся номенклатура/послуги та ціни формуються у Специфікації (Додаток 1), яка генерується з аркуша «Замовлення».", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 2: SUBJECT
            story.append(Paragraph("2. ПРЕДМЕТ ДОГОВОРУ", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            
            story.append(Paragraph("<b>2.1.</b> Постачальник зобов'язується поставити Покупцю товари та/або надати послуги, а Покупець – прийняти та оплатити їх на умовах цього Договору.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            
            story.append(Paragraph("<b>2.2.</b> Номенклатура, кількість/обсяг, ціни, строки виконання визначаються у Специфікації (Додаток 1) та окремих Замовленнях/Заявках (Додаток 2), що є невід'ємною частиною Договору.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            
            story.append(Paragraph("<b>2.3.</b> Для товарів застосовуються правила поставки; для послуг – правила надання послуг. Якщо предмет змішаний, застосовуються обидва блоки.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 3: ORDER FORMATION
            story.append(Paragraph("3. ПОРЯДОК ФОРМУВАННЯ ТА ПІДТВЕРДЖЕННЯ ЗАМОВЛЕННЯ", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>3.1.</b> Покупець формує Замовлення на аркуші «Замовлення» (№, дата, позиції, строки, місце поставки/надання, відповідальні особи).", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>3.2.</b> На підставі «Замовлення» система формує Специфікацію (Додаток 1) із полями: № позиції, опис, артикул/код, од. виміру, кількість/обсяг, ціна без ПДВ, ставка ПДВ/ЄП, сума без ПДВ, ПДВ, сума з ПДВ/загальна.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>3.3.</b> Підтвердження здійснюється шляхом підписання КЕП/удаленої згоди або обміну електронними повідомленнями з вкладеною Специфікацією. Електронні документи прирівнюються до паперових (ст. 7 Закону «Про електронні документи…», ст. 18 Закону «Про електронні довірчі послуги»).", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 4: DELIVERY TERMS
            story.append(Paragraph("4. УМОВИ ПОСТАВКИ ТОВАРІВ", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>4.1.</b> Базис поставки: DAP – за INCOTERMS 2020 або інший погоджений у Специфікації.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>4.2.</b> Строк поставки – згідно Специфікації. Дата поставки – дата підписання видаткової накладної/ТТН або акту приймання-передачі товару.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>4.3.</b> Право власності та ризики випадкової загибелі/пошкодження переходять до Покупця з моменту підписання видаткової накладної (або інший момент, визначений у Специфікації).", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>4.4.</b> Комплектність, тара, пакування – згідно ДСТУ/ТУ та умов Специфікації. Маркування – українською мовою, із зазначенням виробника, дати виготовлення, гарантійних умов, серій/лотів тощо, якщо це вимагає закон.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>4.5.</b> Якість – відповідно до ДСТУ/ТУ, декларацій/сертифікатів відповідності/якості, висновків СЕС, ін. обов'язкових документів (за номенклатурою). На вимогу надаються копії сертифікатів.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 5: SERVICES
            story.append(Paragraph("5. НАДАННЯ ПОСЛУГ", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>5.1.</b> Обсяг, місце та строки надання – у Специфікації/Замовленні.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>5.2.</b> Результат надання послуг приймається Актом наданих послуг. Дата підписання Акта – дата належного виконання.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>5.3.</b> Якщо протягом 5 (п'яти) робочих днів з дати отримання Акта від Покупця не надійшло мотивованих письмових зауважень, послуги вважаються прийнятими в повному обсязі.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 6: WARRANTY
            story.append(Paragraph("6. ГАРАНТІЙНІ ЗОБОВ'ЯЗАННЯ (ДЛЯ ТОВАРІВ)", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>6.1.</b> Гарантійний строк: 12 місяців або встановлений виробником, якщо він більший. Перебіг гарантії починається з дати поставки.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>6.2.</b> У разі виявлення недоліків у гарантійний період Постачальник за свій рахунок усуває їх/здійснює заміну у строк, розумно необхідний, але не більше 14–30 календарних днів, якщо інше не погоджено.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>6.3.</b> Гарантія не поширюється на випадки порушення правил експлуатації/зберігання/монтажу, на механічні пошкодження та форс-мажор.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 7: QUALITY ACCEPTANCE
            story.append(Paragraph("7. ЯКІСТЬ, ПРИЙМАННЯ ЗА КІЛЬКІСТЮ І ЯКІСТЮ", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>7.1.</b> Приймання за кількістю – за видатковими накладними/ТТН у момент отримання. За якістю – протягом 14 календарних днів, якщо інше не встановлено у Специфікації/законом для конкретної продукції.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>7.2.</b> Виявлені невідповідності фіксуються актом розбіжностей із фото/відеопідтвердженням; сторони вживають заходів для заміни/доукомплектування/корекції.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 8: PRICE AND PAYMENT
            story.append(Paragraph("8. ЦІНА, ПОДАТКИ, ОПЛАТА", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            
            story.append(Paragraph("<b>8.1.</b> Ціни визначаються у Специфікації. Вони можуть бути: з ПДВ/без ПДВ/за ставкою єдиного податку – залежно від статусу Постачальника (дані з «Мої дані»).", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            
            story.append(Paragraph("<b>8.2.</b> Валюта розрахунків – гривня.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            
            story.append(Paragraph("<b>8.3.</b> Умови оплати: передоплата/післяплата/відстрочка – відповідно до Специфікації. Підстави: рахунок/Специфікація/Акт/накладна.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            
            story.append(Paragraph("<b>8.4.</b> У разі постачання платником ПДВ – Постачальник реєструє податкову накладну в ЄРПН у строки, визначені ПКУ. У разі неплатника ПДВ – у Специфікації зазначається «без ПДВ, згідно з п. 181.1 ПКУ/статусом платника».", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            
            story.append(Paragraph("<b>8.5.</b> Банківські витрати – за платником, якщо інше не погоджено.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 9: CONFIDENTIALITY
            story.append(Paragraph("9. КОНФІДЕНЦІЙНІСТЬ ТА ПЕРСОНАЛЬНІ ДАНІ", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>9.1.</b> Комерційна інформація за цим Договором є конфіденційною; розголошення заборонене без письмової згоди іншої Сторони, крім випадків, передбачених законом.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>9.2.</b> Обробка персональних даних здійснюється відповідно до Закону України «Про захист персональних даних» та ст. 32 Конституції України. Сторони є окремими володільцями/розпорядниками та гарантують законні підстави обробки.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 10: IP
            story.append(Paragraph("10. ІНТЕЛЕКТУАЛЬНА ВЛАСНІСТЬ (для послуг/робіт)", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>10.1.</b> Майнові права інтелектуальної власності на результати, створені Постачальником у межах цього Договору за оплату, переходять Покупцю з моменту підписання Акта та повної оплати, якщо інше прямо не зазначено у Специфікації.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>10.2.</b> Невиключні/виключні права, територія, строк, способи використання – деталізуються у Специфікації. Авторське (особисте немайнове) право зберігається за автором.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 11: LIABILITY
            story.append(Paragraph("11. ВІДПОВІДАЛЬНІСТЬ І ШТРАФНІ САНКЦІЇ", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>11.1.</b> За порушення строків поставки/надання – штраф/пеня: 0,1% від вартості непоставленого/ненаданого за кожен день прострочення, але не більше 10% від відповідної вартості, якщо інше не погоджено.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>11.2.</b> За порушення строків оплати – пеня у розмірі подвійної облікової ставки НБУ від суми простроченого платежу за кожен день прострочення, плюс інфляційні втрати та 3% річних (ст. 625 ЦКУ).", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>11.3.</b> Сплата санкцій не звільняє від виконання основних зобов'язань.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 12: FORCE MAJEURE
            story.append(Paragraph("12. ФОРС-МАЖОР", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>12.1.</b> Сторона, яка зазнала дії форс-мажору (військові дії, блокада, пожежа, стихія, акти органів влади, кібератаки тощо), звільняється від відповідальності на період дії таких обставин за умови їх підтвердження ТПП України. Повідомлення – протягом 5 роб. днів.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 13: TERM
            story.append(Paragraph("13. СТРОК ДІЇ, РОЗІРВАННЯ, ЗМІНИ", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            
            term_text = f"""<b>13.1.</b> Договір набирає чинності з дати підписання і діє до {end_date} або до повного виконання зобов'язань, залежно від того, що настане пізніше."""
            story.append(Paragraph(term_text, styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            
            story.append(Paragraph("<b>13.2.</b> Може бути розірваний за взаємною згодою сторін або в односторонньому порядку у разі істотного порушення (прострочення понад 30 дн., відмова від приймання/оплати, систематичні порушення) – із письмовим повідомленням за 10 к. дн.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            
            story.append(Paragraph("<b>13.3.</b> Зміни/доповнення чинні, якщо оформлені додатковою угодою/оновленою Специфікацією, підписані КЕП.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 14: DISPUTES
            story.append(Paragraph("14. ВИРІШЕННЯ СПОРІВ", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>14.1.</b> Спори вирішуються шляхом переговорів; за відсутності згоди – у господарських судах України за місцезнаходженням відповідача або за домовленістю – за місцезнаходженням Позивача, якщо це прямо передбачено у Специфікації.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 15: ANTI-CORRUPTION
            story.append(Paragraph("15. АНТИКОРУПЦІЯ, САНКЦІЇ, КОМПЛАЄНС", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>15.1.</b> Сторони гарантують дотримання антикорупційного законодавства України. Будь-які платежі з корупційною метою заборонені. Порушення є підставою для негайного розірвання.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>15.2.</b> Сторони підтверджують відсутність у санкційних списках України/ЄС/США (OFAC). У разі запровадження санкцій до будь-якої сторони інша сторона має право зупинити виконання/розірвати договір.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 16: DOCUMENT EXCHANGE
            story.append(Paragraph("16. ОБМІН ДОКУМЕНТАМИ", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>16.1.</b> Сторони визнають юридичну силу електронних документів (КЕП, е-пошта з доменних адрес, ЕДО/EDI) відповідно до законодавства України.", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("<b>16.2.</b> Оригінали (за потреби) обмінюються поштою/кур'єром протягом 10 роб. днів після запиту.", styles['CustomNormal']))
            story.append(Spacer(1, 6*mm))
            
            # Section 17: REQUISITES
            story.append(Paragraph("17. РЕКВІЗИТИ СТОРІН", styles['CustomHeading1']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("Постачальник – з аркуша «Мої дані»; Покупець – з аркуша «Основні дані».", styles['CustomNormal']))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("(Тут у друкованій версії виводяться значення полів із п. 1.1 та 1.2.)", styles['SmallItalic']))
            story.append(Spacer(1, 6*mm))
            
            # SIGNATURES
            story.append(Paragraph("ПІДПИСИ СТОРІН:", styles['CustomHeading1']))
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
            story.append(Paragraph("Додаток 1", styles['CustomHeading1']))
            story.append(Paragraph("СПЕЦИФІКАЦІЯ", styles['ContractTitle']))
            story.append(Spacer(1, 6*mm))
            
            spec_info = f"до Договору № {contract_number} від {contract_date}"
            story.append(Paragraph(spec_info, styles['CustomNormal']))
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
            story.append(Paragraph("ПІДПИСИ:", styles['CustomNormal']))
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
                        folder_name='Договори',
                        custom_name=filename
                    )
                    
                    result.update({
                        'drive_file_id': drive_result['file_id'],
                        'drive_view_link': drive_result['web_view_link'],
                        'drive_download_link': drive_result['web_content_link']
                    })
                    logger.info(f"Contract uploaded to Google Drive: {drive_result['file_id']}")
                except Exception as e:
                    logger.error(f"Failed to upload to Google Drive: {str(e)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating contract PDF: {str(e)}")
            raise
    
    def _create_styles(self, template_settings: Optional[Dict[str, Any]] = None):
        """Create custom styles for the document"""
        styles = getSampleStyleSheet()
        
        # Get settings or use defaults
        font_size = 11
        line_spacing = 1.5
        if template_settings:
            font_size = template_settings.get('fontSize', 11)
            line_spacing = template_settings.get('lineSpacing', 1.5)
        
        # Contract Title style (custom name to avoid conflict)
        styles.add(ParagraphStyle(
            name='ContractTitle',
            parent=styles['Heading1'],
            fontName='DejaVu-Bold',
            fontSize=14,
            alignment=TA_CENTER,
            spaceAfter=6*mm,
            spaceBefore=0
        ))
        
        # Custom Heading 1
        styles.add(ParagraphStyle(
            name='CustomHeading1',
            parent=styles['Normal'],
            fontName='DejaVu-Bold',
            fontSize=12,
            alignment=TA_LEFT,
            spaceAfter=3*mm,
            spaceBefore=6*mm
        ))
        
        # Custom Normal text
        styles.add(ParagraphStyle(
            name='CustomNormal',
            fontName='DejaVu',
            fontSize=font_size,
            alignment=TA_JUSTIFY,
            leading=font_size * line_spacing,
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
    
    def _parse_custom_template(self, template: str, context: Dict[str, Any]) -> str:
        """
        Parse custom template and replace variables with actual values
        
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
            return str(context.get(var_name, f'{{{{ {var_name} }}}}'))
        
        # Pattern to match {{variable_name}}
        pattern = r'\{\{([^}]+)\}\}'
        parsed = re.sub(pattern, replace_variable, template)
        
        return parsed
    
    def _process_formatting_markers(self, text: str, base_style: ParagraphStyle) -> List:
        """
        Process formatting markers ([b], [i], [u], [align:...]) and create formatted story elements
        
        Args:
            text: Text with formatting markers
            base_style: Base paragraph style to use
        
        Returns:
            List of ReportLab story elements (Paragraphs, Spacers)
        """
        import re
        
        story_elements = []
        
        # Split by alignment markers first
        align_pattern = r'\[align:(left|center|right|justify)\](.*?)\[/align\]'
        
        # Find all alignment blocks
        last_end = 0
        for match in re.finditer(align_pattern, text, re.DOTALL):
            # Add any text before this alignment block
            before_text = text[last_end:match.start()].strip()
            if before_text:
                # Process inline formatting for before_text
                formatted_before = self._process_inline_formatting(before_text)
                para = Paragraph(formatted_before, base_style)
                story_elements.append(para)
                story_elements.append(Spacer(1, 3*mm))
            
            # Process aligned text
            align_type = match.group(1)
            aligned_text = match.group(2).strip()
            
            # Create aligned style
            aligned_style = ParagraphStyle(
                f'Aligned_{align_type}',
                parent=base_style,
                alignment={'left': TA_LEFT, 'center': TA_CENTER, 'right': TA_RIGHT, 'justify': TA_JUSTIFY}.get(align_type, TA_JUSTIFY)
            )
            
            # Process inline formatting for aligned text
            formatted_aligned = self._process_inline_formatting(aligned_text)
            para = Paragraph(formatted_aligned, aligned_style)
            story_elements.append(para)
            story_elements.append(Spacer(1, 3*mm))
            
            last_end = match.end()
        
        # Add remaining text
        remaining_text = text[last_end:].strip()
        if remaining_text:
            formatted_remaining = self._process_inline_formatting(remaining_text)
            para = Paragraph(formatted_remaining, base_style)
            story_elements.append(para)
        
        return story_elements
    
    def _process_inline_formatting(self, text: str) -> str:
        """
        Process inline formatting markers ([b], [i], [u]) and convert to ReportLab XML
        
        Args:
            text: Text with inline formatting markers
        
        Returns:
            Text with ReportLab XML formatting tags
        """
        import re
        
        # Replace [b]text[/b] with <b>text</b>
        text = re.sub(r'\[b\](.*?)\[/b\]', r'<b>\1</b>', text, flags=re.DOTALL)
        
        # Replace [i]text[/i] with <i>text</i>
        text = re.sub(r'\[i\](.*?)\[/i\]', r'<i>\1</i>', text, flags=re.DOTALL)
        
        # Replace [u]text[/u] with <u>text</u>
        text = re.sub(r'\[u\](.*?)\[/u\]', r'<u>\1</u>', text, flags=re.DOTALL)
        
        return text
