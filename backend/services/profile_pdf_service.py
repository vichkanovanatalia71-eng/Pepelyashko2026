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
            
            # VAT badge color - синій для ЄП, зелений для ПДВ
            vat_badge_bg = '#dbeafe' if not is_vat_payer else '#dcfce7'
            vat_badge_color = '#1e40af' if not is_vat_payer else '#166534'
            
            # Create HTML matching the design from image
            html_content = f"""
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
                        font-size: 10pt;
                        line-height: 1.4;
                        color: #1e293b;
                        background: white;
                    }}
                    .card {{
                        width: 210mm;
                        min-height: 297mm;
                        background: white;
                        border-radius: 8px;
                        overflow: hidden;
                    }}
                    .header {{
                        background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
                        padding: 25px 30px;
                        display: flex;
                        align-items: center;
                        gap: 20px;
                    }}
                    .logo-box {{
                        width: 80px;
                        height: 80px;
                        background: #f1f5f9;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    }}
                    .logo {{
                        max-width: 70px;
                        max-height: 70px;
                        object-fit: contain;
                    }}
                    .header-text {{
                        flex: 1;
                    }}
                    .company-name {{
                        font-size: 14pt;
                        font-weight: bold;
                        color: white;
                        margin-bottom: 5px;
                    }}
                    .subtitle {{
                        font-size: 9pt;
                        color: rgba(255, 255, 255, 0.9);
                    }}
                    .content {{
                        padding: 25px 30px;
                    }}
                    .section {{
                        margin-bottom: 20px;
                        page-break-inside: avoid;
                    }}
                    .section-title {{
                        font-size: 11pt;
                        font-weight: bold;
                        color: #0f172a;
                        margin-bottom: 12px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }}
                    .section-icon {{
                        width: 18px;
                        height: 18px;
                        color: #14b8a6;
                    }}
                    .info-grid {{
                        background: #f8fafc;
                        border-radius: 6px;
                        padding: 15px;
                    }}
                    .info-row {{
                        display: flex;
                        padding: 6px 0;
                    }}
                    .info-row:not(:last-child) {{
                        border-bottom: 1px solid #e2e8f0;
                    }}
                    .info-label {{
                        width: 45%;
                        font-size: 9pt;
                        color: #64748b;
                        font-weight: 600;
                    }}
                    .info-value {{
                        width: 55%;
                        font-size: 9pt;
                        color: #0f172a;
                        word-wrap: break-word;
                    }}
                    .vat-badge {{
                        display: inline-block;
                        padding: 6px 12px;
                        background-color: {vat_badge_bg};
                        color: {vat_badge_color};
                        border-radius: 12px;
                        font-size: 9pt;
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
                            <div class="subtitle">Картка профілю компанії</div>
                        </div>
                    </div>
                    
                    <div class="content">
                        {/* Основна інформація */}
                        <div class="section">
                            <div class="section-title">
                                <span class="section-icon">🏢</span>
                                Основна інформація
                            </div>
                            <div class="info-grid">
                                <div class="info-row">
                                    <div class="info-label">ЄДРПОУ</div>
                                    <div class="info-value">{user.get('edrpou', '—')}</div>
                                </div>
                                <div class="info-row">
                                    <div class="info-label">Юридична адреса</div>
                                    <div class="info-value">{user.get('legal_address', '—')}</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Контактні дані */}
                        <div class="section">
                            <div class="section-title">
                                <span class="section-icon">📞</span>
                                Контактні дані
                            </div>
                            <div class="info-grid">
                                <div class="info-row">
                                    <div class="info-label">Email</div>
                                    <div class="info-value">{user.get('email', '—')}</div>
                                </div>
                                <div class="info-row">
                                    <div class="info-label">Телефон</div>
                                    <div class="info-value">{user.get('phone', '—')}</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Банківські реквізити */}
                        <div class="section">
                            <div class="section-title">
                                <span class="section-icon">💳</span>
                                Банківські реквізити
                            </div>
                            <div class="info-grid">
                                <div class="info-row">
                                    <div class="info-label">IBAN</div>
                                    <div class="info-value" style="font-family: monospace; font-size: 8pt;">{user.get('iban', user.get('bank_account', '—'))}</div>
                                </div>
                                <div class="info-row">
                                    <div class="info-label">Банк</div>
                                    <div class="info-value">{user.get('bank_name', user.get('bank', '—'))}</div>
                                </div>
                                <div class="info-row">
                                    <div class="info-label">МФО</div>
                                    <div class="info-value">{user.get('mfo', '—')}</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Керівництво */}
                        <div class="section">
                            <div class="section-title">
                                <span class="section-icon">👤</span>
                                Керівництво
                            </div>
                            <div class="info-grid">
                                <div class="info-row">
                                    <div class="info-label">Директор</div>
                                    <div class="info-value">{user.get('director_name', '—')}</div>
                                </div>
                                <div class="info-row">
                                    <div class="info-label">Посада</div>
                                    <div class="info-value">{user.get('director_position', user.get('position', '—'))}</div>
                                </div>
                                <div class="info-row">
                                    <div class="info-label">Діє на підставі</div>
                                    <div class="info-value">{user.get('contract_type', 'Статуту')}</div>
                                </div>
                                <div class="info-row">
                                    <div class="info-label">Підпис</div>
                                    <div class="info-value">{user.get('signature', '—')}</div>
                                </div>
                                <div class="info-row">
                                    <div class="info-label">В особі</div>
                                    <div class="info-value">{user.get('represented_by', '—')}</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Податкова інформація */}
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
