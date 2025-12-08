"""Service for generating user profile PDFs."""

from pathlib import Path
from datetime import datetime
from weasyprint import HTML
import logging

logger = logging.getLogger(__name__)


class ProfilePDFService:
    """Service for generating profile PDF documents."""
    
    def __init__(self):
        self.output_dir = Path("/tmp/documents")
        self.output_dir.mkdir(exist_ok=True)
    
    def _get_logo_base64(self, logo_path: str) -> str:
        """Convert logo to base64 for embedding in PDF."""
        import base64
        try:
            if logo_path and Path(f"/app/backend/{logo_path}").exists():
                with open(f"/app/backend/{logo_path}", 'rb') as f:
                    img_data = f.read()
                    b64_data = base64.b64encode(img_data).decode('utf-8')
                    ext = logo_path.split('.')[-1].lower()
                    mime_type = f"image/{ext if ext != 'jpg' else 'jpeg'}"
                    return f"data:{mime_type};base64,{b64_data}"
        except Exception as e:
            logger.warning(f"Error encoding logo: {e}")
        return ""
    
    def generate_profile_pdf(self, user: dict) -> str:
        """
        Generate PDF for user profile.
        
        Args:
            user: User dictionary with all profile data
            
        Returns:
            Path to generated PDF file
        """
        try:
            # Get logo as base64
            logo_base64 = self._get_logo_base64(user.get('company_logo', ''))
            
            # Prepare data
            company_name = user.get('representative_name') or user.get('company_name', 'Компанія')
            
            # VAT info
            is_vat_payer = user.get('vat_payer', False)
            vat_rate = user.get('vat_rate', 20.0) if is_vat_payer else 0.0
            vat_status = f"Платник ПДВ ({vat_rate}%)" if is_vat_payer else "Не платник ПДВ"
            
            # Create HTML
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    @page {{
                        size: A4;
                        margin: 20mm;
                    }}
                    body {{
                        font-family: 'DejaVu Sans', Arial, sans-serif;
                        font-size: 11pt;
                        line-height: 1.6;
                        color: #1e293b;
                    }}
                    .header {{
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 3px solid #14b8a6;
                    }}
                    .logo {{
                        max-width: 120px;
                        max-height: 120px;
                        margin-bottom: 15px;
                    }}
                    .company-name {{
                        font-size: 18pt;
                        font-weight: bold;
                        color: #0f172a;
                        margin-bottom: 5px;
                    }}
                    .subtitle {{
                        font-size: 12pt;
                        color: #64748b;
                    }}
                    .section {{
                        margin-bottom: 25px;
                    }}
                    .section-title {{
                        font-size: 14pt;
                        font-weight: bold;
                        color: #14b8a6;
                        margin-bottom: 10px;
                        padding-bottom: 5px;
                        border-bottom: 2px solid #e2e8f0;
                    }}
                    .info-row {{
                        display: flex;
                        padding: 8px 0;
                        border-bottom: 1px solid #f1f5f9;
                    }}
                    .info-label {{
                        width: 40%;
                        font-weight: 600;
                        color: #475569;
                    }}
                    .info-value {{
                        width: 60%;
                        color: #0f172a;
                    }}
                    .vat-badge {{
                        display: inline-block;
                        padding: 4px 12px;
                        background-color: {'#dcfce7' if is_vat_payer else '#f1f5f9'};
                        color: {'#166534' if is_vat_payer else '#64748b'};
                        border-radius: 4px;
                        font-size: 10pt;
                        font-weight: 600;
                    }}
                    .footer {{
                        margin-top: 40px;
                        text-align: center;
                        font-size: 9pt;
                        color: #94a3b8;
                        padding-top: 20px;
                        border-top: 1px solid #e2e8f0;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    {f'<img src="{logo_base64}" class="logo" />' if logo_base64 else ''}
                    <div class="company-name">{company_name}</div>
                    <div class="subtitle">Картка профілю компанії</div>
                </div>
                
                <div class="section">
                    <div class="section-title">Основна інформація</div>
                    <div class="info-row">
                        <div class="info-label">ЄДРПОУ:</div>
                        <div class="info-value">{user.get('edrpou', '—')}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Юридична адреса:</div>
                        <div class="info-value">{user.get('legal_address', '—')}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Email:</div>
                        <div class="info-value">{user.get('email', '—')}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Телефон:</div>
                        <div class="info-value">{user.get('phone', '—')}</div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">Банківські реквізити</div>
                    <div class="info-row">
                        <div class="info-label">IBAN:</div>
                        <div class="info-value">{user.get('iban', user.get('bank_account', '—'))}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Назва банку:</div>
                        <div class="info-value">{user.get('bank_name', user.get('bank', '—'))}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">МФО:</div>
                        <div class="info-value">{user.get('mfo', '—')}</div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">Керівництво</div>
                    <div class="info-row">
                        <div class="info-label">Директор:</div>
                        <div class="info-value">{user.get('director_name', '—')}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Посада:</div>
                        <div class="info-value">{user.get('director_position', user.get('position', '—'))}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Підпис:</div>
                        <div class="info-value">{user.get('signature', '—')}</div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">Податкова інформація</div>
                    <div class="info-row">
                        <div class="info-label">Статус ПДВ:</div>
                        <div class="info-value">
                            <span class="vat-badge">{vat_status}</span>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Згенеровано: {datetime.now().strftime('%d.%m.%Y %H:%M')}</p>
                    <p>Система Управління Документами</p>
                </div>
            </body>
            </html>
            """
            
            # Generate PDF
            user_id = user.get('_id', 'unknown')
            pdf_filename = f"profile_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_path = self.output_dir / pdf_filename
            
            HTML(string=html_content).write_pdf(pdf_path)
            
            logger.info(f"Generated profile PDF: {pdf_path}")
            return str(pdf_path)
            
        except Exception as e:
            logger.error(f"Error generating profile PDF: {str(e)}", exc_info=True)
            raise
