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

class ActService:
    """Service for generating Acts based on Orders"""
    
    def __init__(self, sheets_service, drive_service):
        self.sheets_service = sheets_service
        self.drive_service = drive_service
        self.output_dir = Path('/app/backend/generated_acts')
        self.output_dir.mkdir(exist_ok=True)
        self.template_path = Path('/app/backend/act_template.html')
        
        # Load default template
        with open(self.template_path, 'r', encoding='utf-8') as f:
            self.default_template = f.read()
    
    def format_currency(self, value: float) -> str:
        """Format currency with space as thousands separator"""
        return f"{value:,.2f}".replace(',', ' ')
    
    def number_to_words_ua(self, number: float) -> str:
        """Convert number to Ukrainian words (simplified version)"""
        # Simplified implementation - returns formatted number
        # For production, use a proper number-to-words library
        integer_part = int(number)
        decimal_part = int((number - integer_part) * 100)
        
        # Simple formatting for now
        if decimal_part > 0:
            return f"{integer_part} гривень {decimal_part:02d} копійок"
        else:
            return f"{integer_part} гривень"
    
    async def generate_act_from_orders(
        self,
        counterparty_edrpou: str,
        order_numbers: List[str],
        contract_number: Optional[str] = None,
        contract_date: Optional[str] = None,
        custom_template: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate Act PDF based on selected orders
        
        Args:
            counterparty_edrpou: ЄДРПОУ контрагента
            order_numbers: List of order numbers to include
            contract_number: Optional contract number
            contract_date: Optional contract date
            custom_template: Optional custom HTML template
        
        Returns:
            Dictionary with act details and file paths
        """
        try:
            # 1. Get supplier data from "Мої дані"
            supplier_data = self.sheets_service.get_supplier_data()
            if not supplier_data:
                raise ValueError("Дані постачальника ('Мої дані') не знайдені")
            
            # 2. Get buyer data from "Основні дані"
            buyer_data = self.sheets_service.get_counterparty_by_edrpou(counterparty_edrpou)
            if not buyer_data:
                raise ValueError(f"Контрагента з ЄДРПОУ {counterparty_edrpou} не знайдено в 'Основні дані'")
            
            # 3. Fetch all orders from Google Sheets
            all_orders = self.sheets_service.get_orders()
            
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
            
            # 6. Generate act number
            act_number = self._generate_act_number()
            act_date = datetime.now().strftime('%d.%m.%Y')
            
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
                # Act info
                'act_number': act_number,
                'act_date': act_date,
                'basis': basis,
                # Contract info (if provided)
                'contract_number': contract_number or '',
                'contract_date': contract_date or '',
                # Supplier (Виконавець - Мої дані)
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
                # Buyer (Замовник - Основні дані)
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
            
            # 12. Replace all {{variable}} with actual values
            parsed_html = self._parse_template(html_template, context)
            
            # 13. Create PDF filename
            filename = f"Акт_{act_number}_{buyer_data.get('ЄДРПОУ', '')}.pdf"
            filepath = self.output_dir / filename
            
            # 14. Generate PDF from HTML using WeasyPrint
            HTML(string=parsed_html).write_pdf(str(filepath))
            
            logger.info(f"Act PDF generated: {filename}")
            
            # 15. Upload to Google Drive
            drive_file_id = await self.drive_service.upload_file(
                str(filepath),
                filename,
                folder_name='Акти'
            )
            
            drive_view_link = f"https://drive.google.com/file/d/{drive_file_id}/view"
            drive_download_link = f"https://drive.google.com/uc?export=download&id={drive_file_id}"
            
            # 16. Save to Google Sheets
            act_record = {
                'number': act_number,
                'date': act_date,
                'counterparty_edrpou': counterparty_edrpou,
                'counterparty_name': buyer_data.get('Назва', ''),
                'items': all_items,  # Don't stringify here, _create_document will do it
                'total_amount': totals['total_gross'],
                'based_on_order': ','.join(order_numbers),  # Join multiple orders with comma
                'based_on_contract': contract_number or ''
            }
            
            self.sheets_service.create_act(act_record, drive_file_id)
            
            return {
                'success': True,
                'act_number': act_number,
                'pdf_path': str(filepath),
                'pdf_filename': filename,
                'drive_file_id': drive_file_id,
                'drive_view_link': drive_view_link,
                'drive_download_link': drive_download_link
            }
            
        except Exception as e:
            logger.error(f"Error generating act from orders: {str(e)}")
            raise
    
    def _generate_act_number(self) -> str:
        """Generate sequential act number"""
        try:
            worksheet = self.sheets_service.spreadsheet.worksheet("Акти")
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
            return f"{next_number:04d}"
            
        except Exception as e:
            logger.error(f"Error generating act number: {str(e)}")
            return "0001"
    
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
