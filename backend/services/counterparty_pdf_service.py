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
        """Generate HTML for counterparty card with modern design matching the site."""
        
        # Build HTML with counterparty information
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{
                    size: A4;
                    margin: 0;
                    background: #f9fafb;
                }}
                body {{
                    font-family: 'DejaVu Sans', 'Segoe UI', Arial, sans-serif;
                    font-size: 11pt;
                    line-height: 1.5;
                    color: #1f2937;
                    background: #f9fafb;
                    margin: 0;
                    padding: 40px;
                }}
                .container {{
                    max-width: 700px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
                    overflow: hidden;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 30px 40px;
                    color: white;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28pt;
                    font-weight: 600;
                    letter-spacing: -0.5px;
                }}
                .header .subtitle {{
                    margin-top: 5px;
                    font-size: 11pt;
                    opacity: 0.9;
                }}
                .content {{
                    padding: 35px 40px;
                }}
                .section {{
                    margin-bottom: 28px;
                }}
                .section:last-child {{
                    margin-bottom: 0;
                }}
                .section-title {{
                    font-size: 13pt;
                    font-weight: 600;
                    color: #111827;
                    margin-bottom: 15px;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #e5e7eb;
                }}
                .field-row {{
                    display: table;
                    width: 100%;
                    margin-bottom: 12px;
                    padding: 8px 0;
                }}
                .field-label {{
                    display: table-cell;
                    width: 40%;
                    font-weight: 500;
                    color: #6b7280;
                    font-size: 10pt;
                    vertical-align: top;
                    padding-right: 15px;
                }}
                .field-value {{
                    display: table-cell;
                    width: 60%;
                    color: #111827;
                    font-size: 10.5pt;
                    word-wrap: break-word;
                }}
                .field-value.important {{
                    font-weight: 600;
                    font-size: 11pt;
                    color: #1f2937;
                }}
                .highlight-box {{
                    background: #f3f4f6;
                    border-left: 3px solid #667eea;
                    padding: 15px 20px;
                    margin: 15px 0;
                    border-radius: 6px;
                }}
                .highlight-box .field-row {{
                    margin-bottom: 8px;
                }}
                .footer {{
                    background: #f9fafb;
                    padding: 20px 40px;
                    text-align: center;
                    border-top: 1px solid #e5e7eb;
                }}
                .footer-text {{
                    font-size: 9pt;
                    color: #9ca3af;
                    margin: 0;
                }}
                .divider {{
                    height: 1px;
                    background: #e5e7eb;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Картка Контрагента</h1>
                    <div class="subtitle">Система Управління Документами</div>
                </div>
                
                <div class="content">
                    <!-- Основна інформація -->
                    <div class="section">
                        <div class="section-title">📋 Основна інформація</div>
                        <div class="highlight-box">
                            <div class="field-row">
                                <div class="field-label">ЄДРПОУ/РНОКПП</div>
                                <div class="field-value important">{counterparty.get('edrpou', '—')}</div>
                            </div>
                            <div class="field-row">
                                <div class="field-label">Повна назва</div>
                                <div class="field-value important">{counterparty.get('representative_name', '—')}</div>
                            </div>
                        </div>
                        <div class="field-row">
                            <div class="field-label">Юридична адреса</div>
                            <div class="field-value">{counterparty.get('legal_address', '—')}</div>
                        </div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <!-- Контактна інформація -->
                    <div class="section">
                        <div class="section-title">📞 Контактна інформація</div>
                        <div class="field-row">
                            <div class="field-label">Email</div>
                            <div class="field-value">{counterparty.get('email', '—')}</div>
                        </div>
                        <div class="field-row">
                            <div class="field-label">Телефон</div>
                            <div class="field-value">{counterparty.get('phone', '—')}</div>
                        </div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <!-- Банківські реквізити -->
                    <div class="section">
                        <div class="section-title">🏦 Банківські реквізити</div>
                        <div class="field-row">
                            <div class="field-label">IBAN</div>
                            <div class="field-value important">{counterparty.get('iban', '—')}</div>
                        </div>
                        <div class="field-row">
                            <div class="field-label">Банк</div>
                            <div class="field-value">{counterparty.get('bank', '—')}</div>
                        </div>
                        <div class="field-row">
                            <div class="field-label">МФО</div>
                            <div class="field-value">{counterparty.get('mfo', '—')}</div>
                        </div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <!-- Керівництво -->
                    <div class="section">
                        <div class="section-title">👤 Керівництво та повноваження</div>
                        <div class="field-row">
                            <div class="field-label">ПІБ керівника</div>
                            <div class="field-value important">{counterparty.get('director_name', '—')}</div>
                        </div>
                        <div class="field-row">
                            <div class="field-label">Посада</div>
                            <div class="field-value">{counterparty.get('position', '—')}</div>
                        </div>
                        <div class="field-row">
                            <div class="field-label">Діє на підставі</div>
                            <div class="field-value">{counterparty.get('contract_type', '—')}</div>
                        </div>
                        <div class="field-row">
                            <div class="field-label">В особі</div>
                            <div class="field-value">{counterparty.get('represented_by', '—')}</div>
                        </div>
                        <div class="field-row">
                            <div class="field-label">Підпис</div>
                            <div class="field-value">{counterparty.get('signature', '—')}</div>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <p class="footer-text">Документ згенеровано автоматично • {datetime.now().strftime('%d.%m.%Y о %H:%M')}</p>
                </div>
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
