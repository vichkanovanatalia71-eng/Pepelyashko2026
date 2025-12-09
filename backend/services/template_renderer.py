"""Template renderer for converting templates with variables to HTML."""

import re
from typing import Dict, Any, List
from datetime import datetime


class TemplateRenderer:
    """Renderer for processing template variables."""
    
    UKRAINIAN_MONTHS = {
        1: 'січня', 2: 'лютого', 3: 'березня', 4: 'квітня',
        5: 'травня', 6: 'червня', 7: 'липня', 8: 'серпня',
        9: 'вересня', 10: 'жовтня', 11: 'листопада', 12: 'грудня'
    }
    
    UKRAINIAN_DAYS_TEXT = {
        1: 'першого', 2: 'другого', 3: 'третього', 4: 'четвертого', 5: "п'ятого",
        6: 'шостого', 7: 'сьомого', 8: 'восьмого', 9: "дев'ятого", 10: 'десятого',
        11: 'одинадцятого', 12: 'дванадцятого', 13: 'тринадцятого', 14: 'чотирнадцятого', 15: "п'ятнадцятого",
        16: 'шістнадцятого', 17: 'сімнадцятого', 18: 'вісімнадцятого', 19: "дев'ятнадцятого", 20: 'двадцятого',
        21: "двадцять першого", 22: "двадцять другого", 23: "двадцять третього", 24: "двадцять четвертого", 25: "двадцять п'ятого",
        26: "двадцять шостого", 27: "двадцять сьомого", 28: "двадцять восьмого", 29: "двадцять дев'ятого", 30: "тридцятого",
        31: "тридцять першого"
    }
    
    def format_date_ukrainian(self, date_value) -> str:
        """
        Format date to Ukrainian text format: "08 грудня 2025 року"
        
        Args:
            date_value: datetime object or ISO string
            
        Returns:
            Formatted date string in Ukrainian
        """
        if not date_value:
            return ''
        
        # Convert to datetime if needed
        if isinstance(date_value, str):
            try:
                date_obj = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            except:
                return str(date_value)
        elif isinstance(date_value, datetime):
            date_obj = date_value
        else:
            return str(date_value)
        
        day = date_obj.day
        month_name = self.UKRAINIAN_MONTHS.get(date_obj.month, '')
        year = date_obj.year
        
        return f"{day:02d} {month_name} {year} року"
    
    def render(self, template: str, context: Dict[str, Any]) -> str:
        """
        Render template with context variables.
        Supports {{variable}} syntax and simple conditionals.
        Variables containing HTML (like items_table) are inserted as-is without escaping.
        """
        result = template
        
        # Process conditionals first ({{#if variable}}...{{/if}})
        result = self._process_conditionals(result, context)
        
        # Replace all variables
        for key, value in context.items():
            pattern = r'\{\{\s*' + re.escape(key) + r'\s*\}\}'
            # Convert value to string
            if value is None:
                value_str = ''
            elif isinstance(value, (list, dict)):
                value_str = str(value)
            else:
                value_str = str(value)
            
            # Use lambda with default argument to capture current value
            # This ensures HTML tags are NOT escaped and value is captured correctly
            result = re.sub(pattern, lambda m, v=value_str: v, result)
        
        # Clean up any remaining unmatched variables
        result = re.sub(r'\{\{[^}]+\}\}', '', result)
        
        return result
    
    def _process_conditionals(self, template: str, context: Dict[str, Any]) -> str:
        """Process {{#if variable}}...{{else}}...{{/if}} blocks."""
        # Pattern for if blocks with optional else
        pattern = r'\{\{#if\s+(\w+)\}\}(.*?)(?:\{\{else\}\}(.*?))?\{\{/if\}\}'
        
        def replace_conditional(match):
            var_name = match.group(1)
            if_content = match.group(2)
            else_content = match.group(3) or ''
            
            # Check if variable exists and is truthy
            var_value = context.get(var_name)
            if var_value and var_value not in [None, '', False, 0, [], {}]:
                return if_content
            else:
                return else_content
        
        result = re.sub(pattern, replace_conditional, template, flags=re.DOTALL)
        return result
    
    def generate_items_table_html(self, items: List[Dict[str, Any]]) -> str:
        """Generate HTML table rows for items."""
        if not items:
            return ''
        
        rows_html = ''
        for idx, item in enumerate(items, 1):
            name = item.get('name', '')
            unit = item.get('unit', 'шт')
            quantity = item.get('quantity', 0)
            price = item.get('price', 0)
            amount = item.get('amount', 0)
            
            rows_html += f'''
        <tr>
          <td class="col-n">{idx}</td>
          <td class="col-name">{name}</td>
          <td class="col-qty">{quantity}</td>
          <td class="col-unit">{unit}</td>
          <td class="col-price">{price:.2f}</td>
          <td class="col-sum">{amount:.2f}</td>
        </tr>'''
        
        return rows_html
    
    def number_to_words_ua(self, amount: float) -> str:
        """Convert number to Ukrainian words."""
        # Split into integer and fractional parts
        integer_part = int(amount)
        fractional_part = int(round((amount - integer_part) * 100))
        
        if integer_part == 0:
            result = "нуль гривень"
        else:
            # Handle millions (up to 999,999,999)
            if integer_part >= 1000000:
                millions = integer_part // 1000000
                remainder = integer_part % 1000000
                thousands = remainder // 1000
                ones = remainder % 1000
                
                parts = []
                if millions > 0:
                    # Correct plural form for millions
                    millions_word = "мільйон" if millions == 1 else "мільйонів" if millions < 5 else "мільйонів"
                    parts.append(f"{self._convert_hundreds(millions)} {millions_word}")
                if thousands > 0:
                    parts.append(f"{self._convert_hundreds(thousands)} тисяч")
                if ones > 0:
                    parts.append(self._convert_hundreds(ones))
                
                result = ' '.join(parts) + " гривень"
            # Handle thousands (up to 999,999)
            elif integer_part >= 1000:
                thousands = integer_part // 1000
                remainder = integer_part % 1000
                
                parts = []
                if thousands > 0:
                    parts.append(f"{self._convert_hundreds(thousands)} тисяч")
                if remainder > 0:
                    parts.append(self._convert_hundreds(remainder))
                
                result = ' '.join(parts) + " гривень"
            else:
                result = f"{self._convert_hundreds(integer_part)} гривень"
        
        # Add kopecks
        if fractional_part > 0:
            result += f" {fractional_part:02d} копійок"
        else:
            result += " 00 копійок"
        
        return result.strip()
    
    def _convert_hundreds(self, n: int) -> str:
        """Convert number (0-999) to words."""
        if n == 0:
            return ''
        
        units = ['', 'один', 'два', 'три', 'чотири', "п'ять", 'шість', 'сім', 'вісім', "дев'ять"]
        tens = ['', 'десять', 'двадцять', 'тридцять', 'сорок', "п'ятдесят", 
                'шістдесят', 'сімдесят', 'вісімдесят', "дев'яносто"]
        hundreds = ['', 'сто', 'двісті', 'триста', 'чотириста', "п'ятсот", 
                    'шістсот', 'сімсот', 'вісімсот', "дев'ятсот"]
        teens = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять',
                 "п'ятнадцять", 'шістнадцять', 'сімнадцять', 'вісімнадцять', "дев'ятнадцять"]
        
        result = []
        
        # Hundreds
        h = n // 100
        if h > 0:
            result.append(hundreds[h])
        
        # Tens and units
        remainder = n % 100
        if 10 <= remainder < 20:
            result.append(teens[remainder - 10])
        else:
            t = remainder // 10
            u = remainder % 10
            if t > 0:
                result.append(tens[t])
            if u > 0:
                result.append(units[u])
        
        return ' '.join(result)
