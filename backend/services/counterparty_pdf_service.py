"""Service for generating counterparty profile PDF cards."""
import logging
from pathlib import Path
from datetime import datetime
from weasyprint import HTML
import base64

logger = logging.getLogger(__name__)


class CounterpartyPDFService:
    """Service to generate styled PDF cards for counterparties."""
    
    def __init__(self):
        """Initialize service."""
        pass
    
    def generate_counterparty_card_pdf(
        self, 
        counterparty: dict,
        output_path: str = None
    ) -> str:
        """
        Generate a styled PDF card for counterparty (matching user profile design).
        
        Args:
            counterparty: Counterparty data dict
            output_path: Optional path to save PDF
            
        Returns:
            Path to generated PDF file
        """
        try:
            company_name = counterparty.get('representative_name', 'Контрагент')
            
            # Logo handling
            logo_base64 = None
            company_logo_path = None
            if counterparty.get('logo_url'):
                logo_relative_path = counterparty['logo_url']
                company_logo_path = f"/app/backend/{logo_relative_path}"
                
                if Path(company_logo_path).exists():
                    with open(company_logo_path, 'rb') as f:
                        logo_data = f.read()
                        logo_ext = Path(company_logo_path).suffix.lower()
                        mime_type = 'image/png' if logo_ext == '.png' else 'image/jpeg'
                        logo_base64 = f"data:{mime_type};base64,{base64.b64encode(logo_data).decode()}"
            
            # VAT info
            is_vat_payer = counterparty.get('vat_payer', False)
            vat_rate = counterparty.get('vat_rate', 20.0) if is_vat_payer else 0.0
            vat_status = f"Платник ПДВ ({vat_rate:.0f}%)" if is_vat_payer else "Платник ЄП"
            
            # VAT badge colors
            vat_badge_bg = '#dbeafe' if not is_vat_payer else '#dcfce7'
            vat_badge_color = '#1e40af' if not is_vat_payer else '#166534'
            
            # HTML matching user profile design
            html_content = self._generate_html(
                counterparty, company_name, logo_base64, 
                vat_status, vat_badge_bg, vat_badge_color
            )
            
            # Generate PDF
            if output_path is None:
                output_path = f"/tmp/counterparty_{counterparty.get('id', 'unknown')}.pdf"
            
            HTML(string=html_content).write_pdf(output_path)
            
            logger.info(f"Generated counterparty PDF card: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error generating counterparty PDF: {str(e)}", exc_info=True)
            raise
    
    def _generate_html(self, counterparty, company_name, logo_base64, vat_status, vat_badge_bg, vat_badge_color):
        """Generate HTML content for PDF."""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {{
            size: A4;
            margin: 0;
        }}
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.3;
            color: #1e293b;
            background: white;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 7.5mm;
            min-height: 297mm;
        }}
        .card {{
            width: 95%;
            max-width: 199.5mm;
            background: white;
            border-radius: 12px;
            border: 2px solid #4b5563;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
            padding: 18px 25px;
            display: flex;
            align-items: center;
            gap: 15px;
        }}
        .logo-box {{
            width: 65px;
            height: 65px;
            background: #f1f5f9;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }}
        .logo {{
            max-width: 58px;
            max-height: 58px;
            object-fit: contain;
        }}
        .header-text {{
            flex: 1;
        }}
        .company-name {{
            font-size: 12pt;
            font-weight: bold;
            color: white;
            margin-bottom: 3px;
        }}
        .subtitle {{
            font-size: 8pt;
            color: rgba(255, 255, 255, 0.9);
        }}
        .content {{
            padding: 18px 25px;
        }}
        .section {{
            margin-bottom: 14px;
            page-break-inside: avoid;
        }}
        .section-title {{
            font-size: 10pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        .section-icon {{
            width: 15px;
            height: 15px;
            color: #14b8a6;
        }}
        .info-grid {{
            background: #f8fafc;
            border-radius: 5px;
            padding: 10px 12px;
        }}
        .info-row {{
            display: flex;
            padding: 4px 0;
        }}
        .info-row:not(:last-child) {{
            border-bottom: 1px solid #e2e8f0;
        }}
        .info-label {{
            width: 45%;
            font-size: 8pt;
            color: #64748b;
            font-weight: 600;
        }}
        .info-value {{
            width: 55%;
            font-size: 8pt;
            color: #0f172a;
            word-wrap: break-word;
        }}
        .vat-badge {{
            display: inline-block;
            padding: 4px 10px;
            background-color: {vat_badge_bg};
            color: {vat_badge_color};
            border-radius: 10px;
            font-size: 8pt;
            font-weight: 600;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="logo-box">
                {f'<img src="{logo_base64}" class="logo" />' if logo_base64 else '<div style="font-size: 24pt; color: #14b8a6;">📄</div>'}
            </div>
            <div class="header-text">
                <div class="company-name">{company_name}</div>
                <div class="subtitle">Картка контрагента</div>
            </div>
        </div>
        
        <div class="content">
            <div class="section">
                <div class="section-title">
                    <span class="section-icon">🏢</span>
                    Основна інформація
                </div>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">ЄДРПОУ</div>
                        <div class="info-value">{counterparty.get('edrpou', '—')}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Юридична адреса</div>
                        <div class="info-value">{counterparty.get('legal_address', '—')}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">
                    <span class="section-icon">📞</span>
                    Контактні дані
                </div>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">Email</div>
                        <div class="info-value">{counterparty.get('email', '—')}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Телефон</div>
                        <div class="info-value">{counterparty.get('phone', '—')}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">
                    <span class="section-icon">💳</span>
                    Банківські реквізити
                </div>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">IBAN</div>
                        <div class="info-value" style="font-family: monospace; font-size: 8pt;">{counterparty.get('iban', counterparty.get('bank_account', '—'))}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Банк</div>
                        <div class="info-value">{counterparty.get('bank_name', counterparty.get('bank', '—'))}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">МФО</div>
                        <div class="info-value">{counterparty.get('mfo', '—')}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">
                    <span class="section-icon">👤</span>
                    Керівництво
                </div>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">Директор</div>
                        <div class="info-value">{counterparty.get('director_name', '—')}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Посада</div>
                        <div class="info-value">{counterparty.get('director_position', counterparty.get('position', '—'))}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Діє на підставі</div>
                        <div class="info-value">{counterparty.get('contract_type', 'Статуту')}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Підпис</div>
                        <div class="info-value">{counterparty.get('signature', '—')}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">В особі</div>
                        <div class="info-value">{counterparty.get('represented_by', '—')}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">
                    <span class="section-icon">📋</span>
                    Податкова інформація
                </div>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">Податковий статус</div>
                        <div class="info-value">
                            <span class="vat-badge">{vat_status}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""
