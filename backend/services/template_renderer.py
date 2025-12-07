"""Template renderer for converting templates with variables to HTML."""

import re
from typing import Dict, Any, List
from datetime import datetime


class TemplateRenderer:
    """Renderer for processing template variables."""
    
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
                value = ''
            elif isinstance(value, (list, dict)):
                value = str(value)
            else:
                value = str(value)
            
            # Use lambda to prevent backslash interpretation
            # This ensures HTML tags are NOT escaped
            result = re.sub(pattern, lambda m: value, result)
        
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
        # Simplified version - can be extended
        units = ['', 'одна', 'дві', 'три', 'чотири', "п'ять", 'шість', 'сім', 'вісім', "дев'ять"]
        tens = ['', 'десять', 'двадцять', 'тридцять', 'сорок', "п'ятдесят", 
                'шістдесят', 'сімдесят', 'вісімдесят', "дев'яносто"]
        hundreds = ['', 'сто', 'двісті', 'триста', 'чотириста', "п'ятсот", 
                    'шістсот', 'сімсот', 'вісімсот', "дев'ятсот"]
        
        # Split into integer and fractional parts
        integer_part = int(amount)
        fractional_part = int(round((amount - integer_part) * 100))
        
        if integer_part == 0:
            result = "нуль гривень"
        else:
            # Simple implementation for numbers up to 999
            if integer_part >= 1000:
                thousands = integer_part // 1000
                remainder = integer_part % 1000
                result = f"{self._convert_hundreds(thousands)} тисяч {self._convert_hundreds(remainder)} гривень"
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
