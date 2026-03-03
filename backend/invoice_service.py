from datetime import datetime
import os
from pathlib import Path
from weasyprint import HTML
import logging
import json
from typing import Dict, Any, List, Optional
import re
from pybars import Compiler

logger = logging.getLogger(__name__)

class InvoiceService:
    """Service for generating Invoices based on Orders"""
    
    def __init__(self, sheets_service, drive_service):
        self.sheets_service = sheets_service
        self.drive_service = drive_service
        self.output_dir = Path('/app/backend/generated_documents')
        self.output_dir.mkdir(exist_ok=True)
        self.template_path = Path('/app/backend/invoice_template.html')
        
        # Load default template
        with open(self.template_path, 'r', encoding='utf-8') as f:
            self.default_template = f.read()
    
    def format_currency(self, value: float) -> str:
        """Format currency with space as thousands separator"""
        return f"{value:,.2f}".replace(',', ' ')
    
    def number_to_words_ua(self, number: float) -> str:
        """Convert number to Ukrainian words"""
        try:
            integer_part = int(number)
            decimal_part = int((number - integer_part) * 100)
            
            # Розряди
            ones = ['', 'одна', 'дві', 'три', 'чотири', "п'ять", 'шість', 'сім', 'вісім', "дев'ять"]
            tens = ['', '', 'двадцять', 'тридцять', 'сорок', "п'ятдесят", 'шістдесят', 'сімдесят', 'вісімдесят', "дев'яносто"]
            hundreds = ['', 'сто', 'двісті', 'триста', 'чотириста', "п'ятсот", 'шістсот', 'сімсот', 'вісімсот', "дев'ятсот"]
            teens = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', "п'ятнадцять", 
                    'шістнадцять', 'сімнадцять', 'вісімнадцять', "дев'ятнадцять"]
            
            def convert_group(n):
                if n == 0:
                    return ''
                result = []
                h = n // 100
                t = (n % 100) // 10
                o = n % 10
                
                if h > 0:
                    result.append(hundreds[h])
                if t == 1:
                    result.append(teens[o])
                else:
                    if t > 0:
                        result.append(tens[t])
                    if o > 0:
                        result.append(ones[o])
                return ' '.join(result)
            
            if integer_part == 0:
                words = 'нуль'
            elif integer_part < 1000:
                words = convert_group(integer_part)
            elif integer_part < 1000000:
                thousands = integer_part // 1000
                remainder = integer_part % 1000
                
                th_word = convert_group(thousands)
                # Correct feminine forms for thousands
                th_word = th_word.replace('одна', 'одна').replace('дві', 'дві')
                
                if thousands % 10 == 1 and thousands % 100 != 11:
                    th_suffix = 'тисяча'
                elif thousands % 10 in [2,3,4] and thousands % 100 not in [12,13,14]:
                    th_suffix = 'тисячі'
                else:
                    th_suffix = 'тисяч'
                
                parts = [th_word, th_suffix]
                if remainder > 0:
                    parts.append(convert_group(remainder))
                words = ' '.join(parts)
            else:
                # Millions
                millions = integer_part // 1000000
                remainder = integer_part % 1000000
                
                m_word = convert_group(millions)
                if millions % 10 == 1 and millions % 100 != 11:
                    m_suffix = 'мільйон'
                elif millions % 10 in [2,3,4] and millions % 100 not in [12,13,14]:
                    m_suffix = 'мільйони'
                else:
                    m_suffix = 'мільйонів'
                
                parts = [m_word, m_suffix]
                
                if remainder >= 1000:
                    thousands = remainder // 1000
                    th_word = convert_group(thousands)
                    th_word = th_word.replace('одна', 'одна').replace('дві', 'дві')
                    if thousands % 10 == 1 and thousands % 100 != 11:
                        th_suffix = 'тисяча'
                    elif thousands % 10 in [2,3,4] and thousands % 100 not in [12,13,14]:
                        th_suffix = 'тисячі'
                    else:
                        th_suffix = 'тисяч'
                    parts.extend([th_word, th_suffix])
                    remainder = remainder % 1000
                
                if remainder > 0:
                    parts.append(convert_group(remainder))
                
                words = ' '.join(parts)
            
            # Add currency
            if integer_part % 10 == 1 and integer_part % 100 != 11:
                currency = 'гривня'
            elif integer_part % 10 in [2,3,4] and integer_part % 100 not in [12,13,14]:
                currency = 'гривні'
            else:
                currency = 'гривень'
            
            result = f"{words} {currency}"
            
            if decimal_part > 0:
                if decimal_part % 10 == 1 and decimal_part % 100 != 11:
                    kop_currency = 'копійка'
                elif decimal_part % 10 in [2,3,4] and decimal_part % 100 not in [12,13,14]:
                    kop_currency = 'копійки'
                else:
                    kop_currency = 'копійок'
                result += f" {decimal_part:02d} {kop_currency}"
            
            return result.strip()
            
        except Exception as e:
            logger.error(f"Error converting number to words: {e}")
            return f"{int(number)} гривень"
    
    async def generate_invoice_from_orders(
        self,
        counterparty_edrpou: str,
        order_numbers: List[str],
        contract_number: Optional[str] = None,
        contract_date: Optional[str] = None,
        custom_template: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate Invoice PDF based on selected orders
        
        Args:
            counterparty_edrpou: ЄДРПОУ контрагента
            order_numbers: List of order numbers to include
            contract_number: Optional contract number
            contract_date: Optional contract date
            custom_template: Optional custom HTML template
        
        Returns:
            Dictionary with invoice details and file paths
        """
        try:
            # 1. Get supplier data from "Мої дані"
            supplier_data = self.sheets_service.get_supplier_data()
            if not supplier_data:
                raise ValueError("Дані постачальника ('Мої дані') не знайдені")
            
            # 2. Get buyer data from "Основні дані"
            buyer_data = self.sheets_service.get_counterparty_from_main_data(counterparty_edrpou)
            if not buyer_data:
                raise ValueError(f"Контрагента з ЄДРПОУ {counterparty_edrpou} не знайдено в 'Основні дані'")
            
            # 3. Fetch all orders from Google Sheets
            all_orders = self.sheets_service.get_documents("Замовлення")
            
            # 4. Filter selected orders
            selected_orders = [o for o in all_orders if o['number'] in order_numbers]
            if not selected_orders:
                raise ValueError(f"Замовлення з номерами {order_numbers} не знайдено")
            
            # 5. Combine items from all selected orders
            all_items = []
            for order in selected_orders:
                try:
                    items = order.get('items', [])
                    if isinstance(items, str):
                        items = json.loads(items)
                    all_items.extend(items)
                except Exception as e:
                    logger.error(f"Error parsing items from order {order['number']}: {e}")
            
            if not all_items:
                raise ValueError("Немає позицій в обраних замовленнях")
            
            # 6. Generate invoice number
            invoice_number = self._generate_invoice_number()
            invoice_date = datetime.now().strftime('%d.%m.%Y')
            
            # 7. Calculate totals
            vat_rate = 0.0  # не платник ПДВ
            totals = self._calculate_totals(all_items, vat_rate)
            
            # 8. Generate items rows HTML
            items_rows_html = self._generate_items_rows(all_items)
            
            # 9. Build "Підстава" (Basis) string
            basis_parts = []
            if contract_number and contract_date:
                basis_parts.append(f"Договір № {contract_number} від {contract_date}")
            
            # Add orders to basis
            order_info = ", ".join([f"Замовлення № {o['number']} від {o['date']}" for o in selected_orders])
            if order_info:
                basis_parts.append(order_info)
            
            basis = ", ".join(basis_parts) if basis_parts else "Не вказано"
            
            # 10. Prepare items for Handlebars templates
            formatted_items = []
            for item in all_items:
                formatted_items.append({
                    'name': item.get('name', ''),
                    'unit': item.get('unit', 'шт'),
                    'qty': self.format_currency(float(item.get('quantity', 0))),
                    'price': self.format_currency(float(item.get('price', 0))),
                    'sum': self.format_currency(float(item.get('amount', 0)))
                })
            
            # 11. Prepare template context
            context = {
                # Invoice info
                'invoice_number': invoice_number,
                'invoice_date': invoice_date,
                'basis': basis,
                # Contract info (if provided)
                'contract_number': contract_number or '',
                'contract_date': contract_date or '',
                # Supplier (Постачальник - Мої дані)
                'supplier_name': supplier_data.get('Назва', supplier_data.get('name', '')),
                'supplier_edrpou': supplier_data.get('ЄДРПОУ', supplier_data.get('edrpou', '')),
                'supplier_address': supplier_data.get('Юридична адреса', supplier_data.get('legal_address', '')),
                'supplier_iban': supplier_data.get('р/р(IBAN)', supplier_data.get('iban', '')),
                'supplier_bank': supplier_data.get('Банк', supplier_data.get('bank', '')),
                'supplier_mfo': supplier_data.get('МФО', supplier_data.get('mfo', '')),
                'supplier_email': supplier_data.get('email', ''),
                'supplier_phone': supplier_data.get('тел', supplier_data.get('phone', '')),
                'supplier_representative': supplier_data.get('В особі', supplier_data.get('representative', '')),
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
                'buyer_representative': buyer_data.get('В особі', ''),
                'buyer_signature': buyer_data.get('Підпис', ''),
                # Items (for Handlebars templates with {{#each}})
                'items': formatted_items,
                # Items rows HTML (for simple templates)
                'items_rows': items_rows_html,
                # Totals
                'total_net': self.format_currency(totals['total_net']),
                'total_vat': self.format_currency(totals['total_vat']),
                'total_gross': self.format_currency(totals['total_gross']),
                'vat_rate': str(vat_rate),
                'total_amount_text': self.number_to_words_ua(totals['total_gross']),
                'vat_note': 'без ПДВ' if vat_rate == 0 else f'з ПДВ {vat_rate}%'
            }
            
            # 12. Use custom template or default
            html_template = custom_template if custom_template else self.default_template
            
            # 13. Replace all {{variable}} with actual values
            parsed_html = self._parse_template(html_template, context)
            
            # 14. Create PDF filename
            safe_invoice_number = invoice_number.replace('/', '_').replace('\\', '_')
            filename = f"Рахунок_{safe_invoice_number}_{buyer_data.get('ЄДРПОУ', '')}.pdf"
            filepath = self.output_dir / filename

            # 15. Generate PDF from HTML using WeasyPrint
            HTML(string=parsed_html).write_pdf(str(filepath))
            
            logger.info(f"Invoice PDF generated: {filename}")
            
            # 16. Upload to Google Drive (if available)
            drive_file_id = ''
            drive_view_link = ''
            drive_download_link = ''
            
            if self.drive_service:
                try:
                    upload_result = self.drive_service.upload_file(
                        file_path=str(filepath),
                        folder_name='Рахунки',
                        custom_name=filename
                    )
                    drive_file_id = upload_result.get('id', '')
                    drive_view_link = f"https://drive.google.com/file/d/{drive_file_id}/view"
                    drive_download_link = f"https://drive.google.com/uc?export=download&id={drive_file_id}"
                    logger.info(f"Invoice uploaded to Google Drive: {drive_file_id}")
                except Exception as drive_error:
                    logger.warning(f"Failed to upload to Google Drive: {str(drive_error)}")
            else:
                logger.info("Google Drive service not available, skipping upload")
            
            # 17. Save to Google Sheets
            invoice_record = {
                'number': invoice_number,
                'date': invoice_date,
                'counterparty_edrpou': counterparty_edrpou,
                'counterparty_name': buyer_data.get('Назва', ''),
                'items': all_items,  # Don't stringify here, _create_document will do it
                'total_amount': totals['total_gross'],
                'based_on_order': ','.join(order_numbers),  # Join multiple orders with comma
                'based_on_contract': contract_number or ''
            }
            
            self.sheets_service.create_invoice(invoice_record, drive_file_id, invoice_number)
            
            return {
                'success': True,
                'invoice_number': invoice_number,
                'pdf_path': str(filepath),
                'pdf_filename': filename,
                'drive_file_id': drive_file_id,
                'drive_view_link': drive_view_link,
                'drive_download_link': drive_download_link
            }
            
        except Exception as e:
            logger.error(f"Error generating invoice from orders: {str(e)}")
            raise
    
    def _generate_invoice_number(self) -> str:
        """Generate invoice number in format: middle 4 digits of EDRPOU - sequential number"""
        try:
            # Get supplier EDRPOU from "Мої дані"
            supplier_data = self.sheets_service.get_supplier_data()
            supplier_edrpou = supplier_data.get('ЄДРПОУ', '')
            
            # Extract middle 4 digits
            if len(supplier_edrpou) >= 8:
                middle_digits = supplier_edrpou[2:6]
            else:
                middle_digits = '0000'
            
            # Get next sequential number from Google Sheets
            worksheet = self.sheets_service.spreadsheet.worksheet("Рахунки")
            records = worksheet.get_all_records()
            
            # Count valid records (skip headers)
            valid_count = 0
            for record in records:
                try:
                    # Try to parse total_amount to check if it's a valid record
                    float(record.get('Загальна сума', 0))
                    valid_count += 1
                except (ValueError, TypeError):
                    continue
            
            next_number = valid_count + 1
            return f"{middle_digits}-{next_number}"
            
        except Exception as e:
            logger.error(f"Error generating invoice number: {str(e)}")
            return "0000-1"
    
    def _calculate_totals(self, items: List[Dict], vat_rate: float) -> Dict[str, float]:
        """Calculate totals from items"""
        total = sum(float(item.get('amount', 0)) for item in items)
        vat = total * vat_rate / 100
        total_with_vat = total + vat
        
        return {
            'total_net': total,
            'total_vat': vat,
            'total_gross': total_with_vat
        }
    
    def _generate_items_rows(self, items: List[Dict]) -> str:
        """Generate HTML rows for items table"""
        rows = []
        for idx, item in enumerate(items, 1):
            name = item.get('name', '')
            unit = item.get('unit', 'шт')
            quantity = float(item.get('quantity', 0))
            price = float(item.get('price', 0))
            amount = float(item.get('amount', 0))
            
            row = f'''
        <tr>
          <td class="ncol">{idx}</td>
          <td class="name">{name}</td>
          <td class="unit">{unit}</td>
          <td class="numeric"><span class="mono">{self.format_currency(quantity)}</span></td>
          <td class="numeric"><span class="mono">{self.format_currency(price)}</span></td>
          <td class="numeric"><span class="mono">{self.format_currency(amount)}</span></td>
        </tr>'''
            rows.append(row)
        
        return '\n'.join(rows)
    
    def _parse_template(self, template: str, context: Dict[str, Any]) -> str:
        """
        Parse template using Handlebars (supports {{#each}} loops)
        Falls back to simple regex replacement if Handlebars parsing fails
        """
        try:
            # Try Handlebars first (for templates with {{#each}})
            compiler = Compiler()
            
            # Register helper for incrementing index
            def inc_helper(this, index):
                return str(index + 1)
            
            # Prepare items for Handlebars (convert to dict if needed)
            if 'items_rows' in context:
                # This is for simple templates - remove items_rows
                handlebars_context = {k: v for k, v in context.items() if k != 'items_rows'}
            else:
                handlebars_context = context.copy()
            
            # Check if template has {{#each}} - use Handlebars
            if '{{#each' in template:
                template_func = compiler.compile(template)
                helpers = {'inc': inc_helper}
                parsed = template_func(handlebars_context, helpers=helpers)
            else:
                # Simple template - use regex replacement
                def replace_variable(match):
                    var_name = match.group(1)
                    return str(context.get(var_name, ''))
                
                pattern = r'\{\{([^}]+)\}\}'
                parsed = re.sub(pattern, replace_variable, template)
            
            return parsed
            
        except Exception as e:
            logger.error(f"Handlebars parsing failed: {str(e)}, falling back to regex")
            # Fallback to simple regex replacement
            def replace_variable(match):
                var_name = match.group(1)
                return str(context.get(var_name, ''))
            
            pattern = r'\{\{([^}]+)\}\}'
            parsed = re.sub(pattern, replace_variable, template)
            
            return parsed
    
    async def generate_invoice_pdf(
        self,
        invoice_data: Dict[str, Any],
        custom_template: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate Invoice PDF without orders (manual entry)
        
        Args:
            invoice_data: Dictionary with invoice details including:
                - counterparty_edrpou: ЄДРПОУ контрагента
                - items: List of items with name, unit, quantity, price, amount
                - contract_number: Optional contract number
                - contract_date: Optional contract date
            custom_template: Optional custom HTML template
        
        Returns:
            Dictionary with invoice details and file paths
        """
        try:
            # 1. Get supplier data from "Мої дані"
            supplier_data = self.sheets_service.get_supplier_data()
            if not supplier_data:
                raise ValueError("Дані постачальника ('Мої дані') не знайдені")
            
            # 2. Get buyer data from "Основні дані"
            counterparty_edrpou = invoice_data.get('counterparty_edrpou')
            buyer_data = self.sheets_service.get_counterparty_from_main_data(counterparty_edrpou)
            if not buyer_data:
                raise ValueError(f"Контрагента з ЄДРПОУ {counterparty_edrpou} не знайдено в 'Основні дані'")
            
            # 3. Get items from invoice_data
            items = invoice_data.get('items', [])
            if not items:
                raise ValueError("Немає позицій в рахунку")
            
            # 4. Generate invoice number
            invoice_number = self._generate_invoice_number()
            invoice_date = datetime.now().strftime('%d.%m.%Y')
            
            # 5. Calculate totals
            vat_rate = 0.0  # не платник ПДВ
            totals = self._calculate_totals(items, vat_rate)
            
            # 6. Generate items rows HTML
            items_rows_html = self._generate_items_rows(items)
            
            # 7. Build "Підстава" (Basis) string
            contract_number = invoice_data.get('contract_number', '')
            contract_date = invoice_data.get('contract_date', '')
            
            basis_parts = []
            if contract_number and contract_date:
                basis_parts.append(f"Договір № {contract_number} від {contract_date}")
            
            basis = ", ".join(basis_parts) if basis_parts else "Не вказано"
            
            # 8. Prepare items for Handlebars templates
            formatted_items = []
            for item in items:
                formatted_items.append({
                    'name': item.get('name', ''),
                    'unit': item.get('unit', 'шт'),
                    'qty': self.format_currency(float(item.get('quantity', 0))),
                    'price': self.format_currency(float(item.get('price', 0))),
                    'sum': self.format_currency(float(item.get('amount', 0)))
                })
            
            # 9. Prepare template context
            context = {
                # Invoice info
                'invoice_number': invoice_number,
                'invoice_date': invoice_date,
                'basis': basis,
                # Contract info (if provided)
                'contract_number': contract_number or '',
                'contract_date': contract_date or '',
                # Supplier (Постачальник - Мої дані)
                'supplier_name': supplier_data.get('Назва', supplier_data.get('name', '')),
                'supplier_edrpou': supplier_data.get('ЄДРПОУ', supplier_data.get('edrpou', '')),
                'supplier_address': supplier_data.get('Юридична адреса', supplier_data.get('legal_address', '')),
                'supplier_iban': supplier_data.get('р/р(IBAN)', supplier_data.get('iban', '')),
                'supplier_bank': supplier_data.get('Банк', supplier_data.get('bank', '')),
                'supplier_mfo': supplier_data.get('МФО', supplier_data.get('mfo', '')),
                'supplier_email': supplier_data.get('email', ''),
                'supplier_phone': supplier_data.get('тел', supplier_data.get('phone', '')),
                'supplier_representative': supplier_data.get('В особі', supplier_data.get('representative', '')),
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
                'buyer_representative': buyer_data.get('В особі', ''),
                'buyer_signature': buyer_data.get('Підпис', ''),
                # Items (for Handlebars templates with {{#each}})
                'items': formatted_items,
                # Items rows HTML (for simple templates)
                'items_rows': items_rows_html,
                # Totals
                'total_net': self.format_currency(totals['total_net']),
                'total_vat': self.format_currency(totals['total_vat']),
                'total_gross': self.format_currency(totals['total_gross']),
                'vat_rate': str(vat_rate),
                'total_amount_text': self.number_to_words_ua(totals['total_gross']),
                'vat_note': 'без ПДВ' if vat_rate == 0 else f'з ПДВ {vat_rate}%'
            }
            
            # 10. Use custom template or default
            html_template = custom_template if custom_template else self.default_template
            
            # 11. Replace all {{variable}} with actual values
            parsed_html = self._parse_template(html_template, context)
            
            # 12. Create PDF filename
            safe_invoice_number = invoice_number.replace('/', '_').replace('\\', '_')
            filename = f"Рахунок_{safe_invoice_number}_{buyer_data.get('ЄДРПОУ', '')}.pdf"
            filepath = self.output_dir / filename

            # 13. Generate PDF from HTML using WeasyPrint
            HTML(string=parsed_html).write_pdf(str(filepath))
            
            logger.info(f"Invoice PDF generated: {filename}")
            
            # 14. Upload to Google Drive (if available)
            drive_file_id = ''
            drive_view_link = ''
            drive_download_link = ''
            
            if self.drive_service:
                try:
                    upload_result = self.drive_service.upload_file(
                        file_path=str(filepath),
                        folder_name='Рахунки',
                        custom_name=filename
                    )
                    drive_file_id = upload_result.get('id', '')
                    drive_view_link = f"https://drive.google.com/file/d/{drive_file_id}/view"
                    drive_download_link = f"https://drive.google.com/uc?export=download&id={drive_file_id}"
                    logger.info(f"Invoice uploaded to Google Drive: {drive_file_id}")
                except Exception as drive_error:
                    logger.warning(f"Failed to upload to Google Drive: {str(drive_error)}")
            else:
                logger.info("Google Drive service not available, skipping upload")
            
            # 15. Save to Google Sheets
            invoice_record = {
                'number': invoice_number,
                'date': invoice_date,
                'counterparty_edrpou': counterparty_edrpou,
                'counterparty_name': buyer_data.get('Назва', ''),
                'items': items,  # Don't stringify here, _create_document will do it
                'total_amount': totals['total_gross'],
                'based_on_order': '',  # No order for manual invoice
                'based_on_contract': contract_number or ''
            }
            
            self.sheets_service.create_invoice(invoice_record, drive_file_id, invoice_number)
            
            return {
                'success': True,
                'invoice_number': invoice_number,
                'pdf_path': str(filepath),
                'pdf_filename': filename,
                'drive_file_id': drive_file_id,
                'drive_view_link': drive_view_link,
                'drive_download_link': drive_download_link
            }
            
        except Exception as e:
            logger.error(f"Error generating invoice PDF: {str(e)}")
            raise

