from docx import Document
from datetime import datetime
import os
from pathlib import Path
from weasyprint import HTML, CSS
import logging
import aiosmtplib
from email.message import EmailMessage
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class ContractService:
    def __init__(self):
        self.template_path = Path(__file__).parent / "contract_template.docx"
        self.output_dir = Path(__file__).parent / "generated_contracts"
        self.output_dir.mkdir(exist_ok=True)
        
    def generate_contract_html(self, contract_data: Dict[str, Any]) -> str:
        """Generate HTML from contract data"""
        
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
        
        # Generate specification table
        spec_rows = ""
        for idx, item in enumerate(items, 1):
            item_total = item.get('amount', 0)
            spec_rows += f"""
            <tr>
                <td style="border: 1px solid black; padding: 5px; text-align: center;">{idx}</td>
                <td style="border: 1px solid black; padding: 5px;">{item.get('name', '')}</td>
                <td style="border: 1px solid black; padding: 5px; text-align: center;">{item.get('unit', '')}</td>
                <td style="border: 1px solid black; padding: 5px; text-align: center;">{item.get('quantity', 0)}</td>
                <td style="border: 1px solid black; padding: 5px; text-align: right;">{item.get('price', 0):.2f}</td>
                <td style="border: 1px solid black; padding: 5px; text-align: right;">{item_total:.2f}</td>
            </tr>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{
                    size: A4;
                    margin: 2cm;
                }}
                body {{
                    font-family: 'DejaVu Sans', Arial, sans-serif;
                    font-size: 12pt;
                    line-height: 1.5;
                    color: #000;
                }}
                h1 {{
                    text-align: center;
                    font-size: 14pt;
                    font-weight: bold;
                    margin-bottom: 10px;
                }}
                h2 {{
                    font-size: 12pt;
                    font-weight: bold;
                    margin-top: 15px;
                    margin-bottom: 10px;
                }}
                p {{
                    text-align: justify;
                    margin-bottom: 10px;
                }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 10px 0;
                }}
                .center {{
                    text-align: center;
                }}
                .signature-block {{
                    margin-top: 30px;
                    display: flex;
                    justify-content: space-between;
                }}
                .signature {{
                    width: 45%;
                }}
            </style>
        </head>
        <body>
            <h1>ДОГОВІР ПОСТАЧАННЯ № {contract_number}</h1>
            <p class="center">{city}, {contract_date}</p>
            
            <p>КОМУНАЛЬНЕ НЕКОМЕРЦІЙНЕ ПІДПРИЄМСТВО "МУРОВАНОКУРИЛОВЕЦЬКА ЦЕНТРАЛЬНА РАЙОННА ЛІКАРНЯ", іменоване в подальшому «Покупець», 
            в особі директора Шевцова Анатолія Миколайовича, який діє на підставі Статуту, з однієї сторони, та</p>
            
            <p><strong>{supplier_name}</strong>, іменований в подальшому «Постачальник», 
            в особі {director_position} {director_name}, з іншої сторони, 
            уклали цей Договір про наступне:</p>
            
            <h2>1. ПРЕДМЕТ ДОГОВОРУ</h2>
            <p>1.1. Постачальник зобов'язується передати у власність Покупцю, а Покупець прийняти та оплатити Товар відповідно до умов 
            цього Договору та Специфікації, яка є невід'ємною частиною цього Договору.</p>
            
            <p>1.2. Предмет договору: {subject}</p>
            
            <h2>2. СПЕЦИФІКАЦІЯ</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="background-color: #f0f0f0;">
                        <th style="border: 1px solid black; padding: 5px;">№</th>
                        <th style="border: 1px solid black; padding: 5px;">Найменування товару/послуги</th>
                        <th style="border: 1px solid black; padding: 5px;">Од. вим.</th>
                        <th style="border: 1px solid black; padding: 5px;">Кількість</th>
                        <th style="border: 1px solid black; padding: 5px;">Ціна без ПДВ, грн</th>
                        <th style="border: 1px solid black; padding: 5px;">Сума без ПДВ, грн</th>
                    </tr>
                </thead>
                <tbody>
                    {spec_rows}
                    <tr style="font-weight: bold;">
                        <td colspan="5" style="border: 1px solid black; padding: 5px; text-align: right;">РАЗОМ:</td>
                        <td style="border: 1px solid black; padding: 5px; text-align: right;">{total_amount:.2f}</td>
                    </tr>
                </tbody>
            </table>
            
            <h2>3. ЦІНА ТА ПОРЯДОК РОЗРАХУНКІВ</h2>
            <p>3.1. Загальна вартість Товару за цим Договором становить: <strong>{total_amount:.2f} грн</strong> (без ПДВ).</p>
            <p>3.2. Оплата здійснюється шляхом 100% передоплати на розрахунковий рахунок Постачальника протягом 3 (трьох) банківських днів 
            з моменту підписання цього Договору.</p>
            
            <h2>4. СТРОК ДІЇ ДОГОВОРУ</h2>
            <p>4.1. Цей Договір набирає чинності з моменту його підписання Сторонами і діє до 31 грудня {datetime.now().year} року.</p>
            <p>4.2. Поставка Товару здійснюється протягом 7 (семи) календарних днів з моменту надходження коштів на розрахунковий рахунок Постачальника.</p>
            
            <h2>5. РЕКВІЗИТИ ТА ПІДПИСИ СТОРІН</h2>
            
            <div style="display: flex; justify-content: space-between; margin-top: 30px;">
                <div style="width: 45%;">
                    <p><strong>ПОКУПЕЦЬ:</strong></p>
                    <p>КНП "Мурованокуриловецька ЦРЛ"</p>
                    <p>Код ЄДРПОУ: 01982608</p>
                    <br>
                    <p>_______________ Шевцов А.М.</p>
                    <p style="font-size: 10pt;">(підпис)</p>
                    <p>М.П.</p>
                </div>
                
                <div style="width: 45%;">
                    <p><strong>ПОСТАЧАЛЬНИК:</strong></p>
                    <p>{supplier_name}</p>
                    <p>Код ЄДРПОУ: {supplier_edrpou}</p>
                    <p>Email: {supplier_email}</p>
                    <p>Тел.: {supplier_phone}</p>
                    <p>IBAN: {supplier_iban}</p>
                    <br>
                    <p>_______________ {director_name}</p>
                    <p style="font-size: 10pt;">(підпис)</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_content
    
    def generate_contract_pdf(self, contract_data: Dict[str, Any]) -> str:
        """Generate PDF contract and return file path"""
        try:
            html_content = self.generate_contract_html(contract_data)
            
            # Generate filename
            contract_number = contract_data.get('contract_number', '001')
            filename = f"contract_{contract_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            output_path = self.output_dir / filename
            
            # Generate PDF from HTML
            HTML(string=html_content).write_pdf(str(output_path))
            
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
                    'password': os.getenv('SMTP_PASSWORD'),
                    'use_tls': True
                }
            
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
            
            # Attach PDF
            with open(pdf_path, 'rb') as f:
                pdf_data = f.read()
                message.add_attachment(
                    pdf_data,
                    maintype='application',
                    subtype='pdf',
                    filename=os.path.basename(pdf_path)
                )
            
            # Send email
            await aiosmtplib.send(
                message,
                hostname=smtp_config['hostname'],
                port=smtp_config['port'],
                username=smtp_config['username'],
                password=smtp_config['password'],
                use_tls=smtp_config['use_tls']
            )
            
            logger.info(f"Contract sent to {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending contract email: {str(e)}")
            return False
