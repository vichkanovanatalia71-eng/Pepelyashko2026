"""Service for generating counterparty card PDFs."""

import os
from pathlib import Path
from datetime import datetime
from weasyprint import HTML
import logging

logger = logging.getLogger(__name__)


class CounterpartyPDFService:
    """Service for generating PDF cards for counterparties."""
    
    def __init__(self):
        self.output_dir = Path("/tmp/counterparty_pdfs")
        self.output_dir.mkdir(exist_ok=True)
    
    def generate_html(self, counterparty: dict) -> str:
        """Generate HTML for counterparty card."""
        
        # Build HTML with counterparty information
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
                    line-height: 1.6;
                    color: #333;
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 15px;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24pt;
                    color: #1a1a1a;
                }}
                .section {{
                    margin-bottom: 20px;
                }}
                .section-title {{
                    font-size: 14pt;
                    font-weight: bold;
                    color: #1a1a1a;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 5px;
                }}
                .field {{
                    margin-bottom: 10px;
                }}
                .field-label {{
                    font-weight: bold;
                    display: inline-block;
                    width: 200px;
                    color: #555;
                }}
                .field-value {{
                    display: inline;
                    color: #000;
                }}
                .footer {{
                    margin-top: 40px;
                    text-align: center;
                    font-size: 10pt;
                    color: #888;
                    border-top: 1px solid #ccc;
                    padding-top: 15px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Картка Контрагента</h1>
            </div>
            
            <div class="section">
                <div class="section-title">Основна інформація</div>
                <div class="field">
                    <span class="field-label">ЄДРПОУ/РНОКПП:</span>
                    <span class="field-value">{counterparty.get('edrpou', 'Не вказано')}</span>
                </div>
                <div class="field">
                    <span class="field-label">Назва:</span>
                    <span class="field-value">{counterparty.get('representative_name', 'Не вказано')}</span>
                </div>
                <div class="field">
                    <span class="field-label">Юридична адреса:</span>
                    <span class="field-value">{counterparty.get('legal_address', 'Не вказано')}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Контактна інформація</div>
                <div class="field">
                    <span class="field-label">Email:</span>
                    <span class="field-value">{counterparty.get('email', 'Не вказано')}</span>
                </div>
                <div class="field">
                    <span class="field-label">Телефон:</span>
                    <span class="field-value">{counterparty.get('phone', 'Не вказано')}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Банківські реквізити</div>
                <div class="field">
                    <span class="field-label">р/р (IBAN):</span>
                    <span class="field-value">{counterparty.get('iban', 'Не вказано')}</span>
                </div>
                <div class="field">
                    <span class="field-label">Банк:</span>
                    <span class="field-value">{counterparty.get('bank', 'Не вказано')}</span>
                </div>
                <div class="field">
                    <span class="field-label">МФО:</span>
                    <span class="field-value">{counterparty.get('mfo', 'Не вказано')}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Керівництво</div>
                <div class="field">
                    <span class="field-label">ПІБ керівника:</span>
                    <span class="field-value">{counterparty.get('director_name', 'Не вказано')}</span>
                </div>
                <div class="field">
                    <span class="field-label">Посада:</span>
                    <span class="field-value">{counterparty.get('position', 'Не вказано')}</span>
                </div>
                <div class="field">
                    <span class="field-label">В особі:</span>
                    <span class="field-value">{counterparty.get('represented_by', 'Не вказано')}</span>
                </div>
                <div class="field">
                    <span class="field-label">Підпис:</span>
                    <span class="field-value">{counterparty.get('signature', 'Не вказано')}</span>
                </div>
                <div class="field">
                    <span class="field-label">Діє на підставі:</span>
                    <span class="field-value">{counterparty.get('contract_type', 'Не вказано')}</span>
                </div>
            </div>
            
            <div class="footer">
                <p>Згенеровано: {datetime.now().strftime('%d.%m.%Y %H:%M')}</p>
            </div>
        </body>
        </html>
        """
        
        return html_content
    
    def generate_pdf(self, counterparty: dict) -> str:
        """
        Generate PDF card for counterparty.
        
        Args:
            counterparty: Counterparty data dictionary
            
        Returns:
            Path to generated PDF file
        """
        try:
            # Generate HTML
            html_content = self.generate_html(counterparty)
            
            # Generate filename
            safe_name = counterparty.get('representative_name', 'Unknown').replace('/', '_')[:50]
            edrpou = counterparty.get('edrpou', 'unknown')
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"counterparty_{edrpou}_{timestamp}.pdf"
            output_path = self.output_dir / filename
            
            # Generate PDF from HTML
            HTML(string=html_content).write_pdf(output_path)
            
            logger.info(f"Generated counterparty PDF: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Error generating counterparty PDF: {e}")
            raise
