"""Service for sending emails."""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from pathlib import Path
import logging
import base64

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails with attachments."""
    
    def __init__(self):
        self.smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        self.smtp_username = os.environ.get('SMTP_USERNAME', '')
        self.smtp_password = os.environ.get('SMTP_PASSWORD', '')
        
    def send_email_with_attachment(
        self,
        to_email: str,
        subject: str,
        body: str,
        attachment_path: str,
        attachment_name: str = None,
        embedded_image_path: str = None
    ) -> bool:
        """
        Send email with PDF attachment and optional embedded image.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Email body (HTML or plain text)
            attachment_path: Path to file to attach
            attachment_name: Custom name for attachment (optional)
            embedded_image_path: Path to image to embed in email (optional)
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart('related')
            msg['From'] = self.smtp_username
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Create alternative part for HTML
            msg_alternative = MIMEMultipart('alternative')
            msg.attach(msg_alternative)
            
            # Add body
            msg_alternative.attach(MIMEText(body, 'html'))
            
            # Add embedded image if provided
            if embedded_image_path:
                logger.info(f"Attempting to embed logo from: {embedded_image_path}")
                if os.path.exists(embedded_image_path):
                    with open(embedded_image_path, 'rb') as f:
                        img_data = f.read()
                        image = MIMEImage(img_data)
                        image.add_header('Content-ID', '<company_logo>')
                        image.add_header('Content-Disposition', 'inline', filename='logo.png')
                        msg.attach(image)
                    logger.info(f"✓ Logo embedded successfully, size: {len(img_data)} bytes")
                else:
                    logger.warning(f"✗ Logo file not found at: {embedded_image_path}")
            
            # Add PDF attachment
            if os.path.exists(attachment_path):
                with open(attachment_path, 'rb') as f:
                    attachment = MIMEApplication(f.read(), _subtype='pdf')
                    filename = attachment_name or Path(attachment_path).name
                    attachment.add_header(
                        'Content-Disposition',
                        'attachment',
                        filename=filename
                    )
                    msg.attach(attachment)
            else:
                logger.error(f"Attachment file not found: {attachment_path}")
                return False
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False
    
    def send_counterparty_card(
        self,
        to_email: str,
        counterparty_name: str,
        pdf_path: str,
        company_logo_url: str = None,
        company_logo_path: str = None,
        company_name: str = None
    ) -> bool:
        """
        Send counterparty card PDF via email with green-themed styling.
        
        Args:
            to_email: Recipient email address
            counterparty_name: Name of the counterparty
            pdf_path: Path to PDF file
            company_logo_url: Flag for logo display
            company_logo_path: Path to company logo file
            
        Returns:
            True if email sent successfully
        """
        subject = f"Картка контрагента: {counterparty_name}"
        
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Arial, sans-serif;
                    line-height: 1.6;
                    color: #1e293b;
                    margin: 0;
                    padding: 0;
                    background-color: #f8fafc;
                }}
                .email-container {{
                    max-width: 600px;
                    margin: 20px auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }}
                .logo-container {{
                    text-align: center;
                    padding: 20px;
                    background-color: #ffffff;
                }}
                .company-logo {{
                    max-width: 160px;
                    max-height: 160px;
                    border-radius: 8px;
                }}
                .header {{
                    background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%);
                    color: white;
                    padding: 30px 40px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }}
                .header p {{
                    margin: 5px 0 0 0;
                    font-size: 14px;
                    opacity: 0.9;
                }}
                .content {{
                    padding: 40px;
                }}
                .info-box {{
                    background-color: #f0fdfa;
                    border-left: 4px solid #14b8a6;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .footer {{
                    background-color: #f8fafc;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #64748b;
                    border-top: 1px solid #e2e8f0;
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                {f'<div class="logo-container"><img src="cid:company_logo" alt="Company Logo" class="company-logo" /></div>' if company_logo_url else ''}
                <div class="header">
                    <h1>Картка контрагента</h1>
                    <p>Система Управління Документами</p>
                </div>
                
                <div class="content">
                    <p>Доброго дня!</p>
                    
                    <div class="info-box">
                        <p style="margin: 0;"><strong>Контрагент:</strong> {counterparty_name}</p>
                    </div>
                    
                    <p><strong>{company_name or 'Наша компанія'}</strong> надсилає Вам картку контрагента у вкладеному PDF-файлі.</p>
                    
                    <p>З повагою,<br>Ваша команда</p>
                </div>
                
                <div class="footer">
                    <p>Це автоматично згенерований лист. Будь ласка, не відповідайте на нього.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email_with_attachment(
            to_email=to_email,
            subject=subject,
            body=body,
            attachment_path=pdf_path,
            attachment_name=f"Картка_контрагента_{counterparty_name[:30]}.pdf",
            embedded_image_path=company_logo_path
        )
    
    def format_date_ukrainian(self, date_str: str) -> str:
        """Format date in Ukrainian format: '06 грудня 2025 року'"""
        from datetime import datetime
        
        months_ukrainian = {
            1: 'січня', 2: 'лютого', 3: 'березня', 4: 'квітня',
            5: 'травня', 6: 'червня', 7: 'липня', 8: 'серпня',
            9: 'вересня', 10: 'жовтня', 11: 'листопада', 12: 'грудня'
        }
        
        try:
            # Parse ISO date string
            if 'T' in date_str:
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            else:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            
            day = date_obj.day
            month = months_ukrainian.get(date_obj.month, '')
            year = date_obj.year
            
            return f"{day:02d} {month} {year} року"
        except:
            return date_str
    
    def send_order_document(
        self,
        to_email: str,
        order_number: str,
        order_date: str,
        counterparty_name: str,
        total_amount: float,
        pdf_path: str,
        company_logo_url: str = None,
        company_logo_path: str = None,
        company_name: str = None
    ) -> bool:
        """
        Send order document PDF via email with green-themed HTML styling.
        
        Args:
            to_email: Recipient email address
            order_number: Order number
            order_date: Order date (will be formatted to Ukrainian)
            counterparty_name: Name of the counterparty
            total_amount: Total order amount
            pdf_path: Path to PDF file
            
        Returns:
            True if email sent successfully
        """
        # Format date to Ukrainian
        formatted_date = self.format_date_ukrainian(order_date)
        
        subject = f"Замовлення №{order_number} від {formatted_date}"
        
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Arial, sans-serif;
                    line-height: 1.6;
                    color: #1e293b;
                    margin: 0;
                    padding: 0;
                    background-color: #f8fafc;
                }}
                .email-container {{
                    max-width: 600px;
                    margin: 20px auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }}
                .logo-container {{
                    text-align: center;
                    padding: 20px;
                    background-color: #ffffff;
                }}
                .company-logo {{
                    max-width: 160px;
                    max-height: 160px;
                    border-radius: 8px;
                }}
                .header {{
                    background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%);
                    color: white;
                    padding: 30px 40px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }}
                .header p {{
                    margin: 5px 0 0 0;
                    font-size: 14px;
                    opacity: 0.9;
                }}
                .content {{
                    padding: 40px;
                }}
                .greeting {{
                    font-size: 18px;
                    color: #0f172a;
                    margin-bottom: 20px;
                }}
                .info-box {{
                    background-color: #eff6ff;
                    border-left: 4px solid #3b82f6;
                    padding: 20px;
                    margin: 25px 0;
                    border-radius: 4px;
                }}
                .info-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #dbeafe;
                }}
                .info-row:last-child {{
                    border-bottom: none;
                }}
                .info-label {{
                    color: #64748b;
                    font-weight: 500;
                    font-size: 14px;
                }}
                .info-value {{
                    color: #0f172a;
                    font-weight: 600;
                    font-size: 14px;
                }}
                .total {{
                    background-color: #dbeafe;
                    padding: 15px 20px;
                    margin: 20px 0;
                    border-radius: 6px;
                    text-align: right;
                }}
                .total-label {{
                    color: #1e3a8a;
                    font-size: 16px;
                    font-weight: 600;
                }}
                .total-amount {{
                    color: #2563eb;
                    font-size: 24px;
                    font-weight: 700;
                    margin-top: 5px;
                }}
                .message {{
                    color: #475569;
                    font-size: 15px;
                    line-height: 1.7;
                    margin: 20px 0;
                }}
                .signature {{
                    margin-top: 30px;
                    color: #64748b;
                    font-size: 14px;
                }}
                .footer {{
                    background-color: #f8fafc;
                    padding: 25px 40px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }}
                .footer p {{
                    margin: 5px 0;
                    font-size: 13px;
                    color: #94a3b8;
                }}
                .attachment-notice {{
                    background-color: #dbeafe;
                    border: 1px solid #bfdbfe;
                    padding: 15px;
                    margin: 25px 0;
                    border-radius: 6px;
                    text-align: center;
                }}
                .attachment-notice p {{
                    margin: 0;
                    color: #1e40af;
                    font-size: 14px;
                    font-weight: 500;
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                {f'<div class="logo-container"><img src="cid:company_logo" alt="Company Logo" class="company-logo" /></div>' if company_logo_url else ''}
                <div class="header">
                    <h1>Замовлення №{order_number}</h1>
                    <p>Система Управління Документами</p>
                </div>
                
                <div class="content">
                    <p class="greeting">Доброго дня!</p>
                    
                    <p class="message">
                        Надсилаємо Вам замовлення №<strong>{order_number}</strong> від <strong>{formatted_date}</strong>.
                    </p>
                    
                    <div class="info-box">
                        <div class="info-row">
                            <span class="info-label">📋 Номер замовлення:</span>
                            <span class="info-value">№{order_number}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">📅 Дата:</span>
                            <span class="info-value">{formatted_date}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">🏢 Контрагент:</span>
                            <span class="info-value">{counterparty_name}</span>
                        </div>
                    </div>
                    
                    <div class="total">
                        <div class="total-label">ЗАГАЛЬНА СУМА:</div>
                        <div class="total-amount">{total_amount:.2f} грн</div>
                    </div>
                    
                    <div class="attachment-notice">
                        <p>📎 Повна інформація про замовлення знаходиться у вкладеному PDF-документі</p>
                    </div>
                    
                    <p class="message">
                        <strong>{company_name or 'Наша компанія'}</strong> надсилає Вам замовлення. Будь ласка, перевірте деталі та зв'яжіться з нами у разі виникнення питань.
                    </p>
                    
                    <div class="signature">
                        <p>З повагою,<br>
                        <strong>{company_name or 'Система Управління Документами'}</strong></p>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Це автоматично згенерований лист</p>
                    <p>Будь ласка, не відповідайте на нього</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email_with_attachment(
            to_email=to_email,
            subject=subject,
            body=body,
            attachment_path=pdf_path,
            attachment_name=f"Замовлення_{order_number}.pdf",
            embedded_image_path=company_logo_path
        )
    
    def send_invoice_document(
        self,
        to_email: str,
        invoice_number: str,
        invoice_date: str,
        counterparty_name: str,
        total_amount: float,
        pdf_path: str,
        company_logo_url: str = None,
        company_logo_path: str = None
    ) -> bool:
        """Send invoice document PDF via email with green-themed HTML styling."""
        formatted_date = self.format_date_ukrainian(invoice_date)
        
        subject = f"Рахунок №{invoice_number} від {formatted_date}"
        
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Arial, sans-serif;
                    line-height: 1.6;
                    color: #1e293b;
                    margin: 0;
                    padding: 0;
                    background-color: #f8fafc;
                }}
                .email-container {{
                    max-width: 600px;
                    margin: 20px auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }}
                .logo-container {{
                    text-align: center;
                    padding: 20px;
                    background-color: #ffffff;
                }}
                .company-logo {{
                    max-width: 160px;
                    max-height: 160px;
                    border-radius: 8px;
                }}
                .header {{
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    padding: 30px 40px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }}
                .header p {{
                    margin: 5px 0 0 0;
                    font-size: 14px;
                    opacity: 0.9;
                }}
                .content {{
                    padding: 40px;
                }}
                .greeting {{
                    font-size: 18px;
                    color: #0f172a;
                    margin-bottom: 20px;
                }}
                .info-box {{
                    background-color: #ecfdf5;
                    border-left: 4px solid #10b981;
                    padding: 20px;
                    margin: 25px 0;
                    border-radius: 4px;
                }}
                .info-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #d1fae5;
                }}
                .info-row:last-child {{
                    border-bottom: none;
                }}
                .info-label {{
                    color: #64748b;
                    font-weight: 500;
                    font-size: 14px;
                }}
                .info-value {{
                    color: #0f172a;
                    font-weight: 600;
                    font-size: 14px;
                }}
                .total {{
                    background-color: #d1fae5;
                    padding: 15px 20px;
                    margin: 20px 0;
                    border-radius: 6px;
                    text-align: right;
                }}
                .total-label {{
                    color: #065f46;
                    font-size: 16px;
                    font-weight: 600;
                }}
                .total-amount {{
                    color: #047857;
                    font-size: 24px;
                    font-weight: 700;
                    margin-top: 5px;
                }}
                .attachment-notice {{
                    background-color: #d1fae5;
                    border: 1px solid #a7f3d0;
                    padding: 15px;
                    margin: 25px 0;
                    border-radius: 6px;
                    text-align: center;
                }}
                .footer {{
                    background-color: #f8fafc;
                    padding: 25px 40px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }}
                .footer p {{
                    margin: 5px 0;
                    font-size: 13px;
                    color: #94a3b8;
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                {f'<div class="logo-container"><img src="cid:company_logo" alt="Company Logo" class="company-logo" /></div>' if company_logo_url else ''}
                <div class="header">
                    <h1>Рахунок №{invoice_number}</h1>
                    <p>Система Управління Документами</p>
                </div>
                <div class="content">
                    <p class="greeting">Доброго дня!</p>
                    <p>Надсилаємо Вам рахунок №<strong>{invoice_number}</strong> від <strong>{formatted_date}</strong>.</p>
                    <div class="info-box">
                        <div class="info-row">
                            <span class="info-label">📋 Номер рахунку:</span>
                            <span class="info-value">№{invoice_number}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">📅 Дата:</span>
                            <span class="info-value">{formatted_date}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">🏢 Контрагент:</span>
                            <span class="info-value">{counterparty_name}</span>
                        </div>
                    </div>
                    <div class="total">
                        <div class="total-label">ЗАГАЛЬНА СУМА:</div>
                        <div class="total-amount">{total_amount:.2f} грн</div>
                    </div>
                    <div class="attachment-notice">
                        <p>📎 Повна інформація про рахунок знаходиться у вкладеному PDF-документі</p>
                    </div>
                </div>
                <div class="footer">
                    <p>Це автоматично згенерований лист</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email_with_attachment(
            to_email=to_email,
            subject=subject,
            body=body,
            attachment_path=pdf_path,
            attachment_name=f"Рахунок_{invoice_number}.pdf",
            embedded_image_path=company_logo_path
        )
    
    def send_act_document(
        self,
        to_email: str,
        act_number: str,
        act_date: str,
        counterparty_name: str,
        total_amount: float,
        pdf_path: str
    ) -> bool:
        """Send act document PDF via email with purple-themed HTML styling."""
        formatted_date = self.format_date_ukrainian(act_date)
        
        subject = f"Акт №{act_number} від {formatted_date}"
        
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Arial, sans-serif;
                    line-height: 1.6;
                    color: #1e293b;
                    margin: 0;
                    padding: 0;
                    background-color: #f8fafc;
                }}
                .email-container {{
                    max-width: 600px;
                    margin: 20px auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);
                    color: white;
                    padding: 30px 40px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }}
                .content {{
                    padding: 40px;
                }}
                .info-box {{
                    background-color: #faf5ff;
                    border-left: 4px solid #a855f7;
                    padding: 20px;
                    margin: 25px 0;
                    border-radius: 4px;
                }}
                .info-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #e9d5ff;
                }}
                .info-row:last-child {{
                    border-bottom: none;
                }}
                .total {{
                    background-color: #e9d5ff;
                    padding: 15px 20px;
                    margin: 20px 0;
                    border-radius: 6px;
                    text-align: right;
                }}
                .total-label {{
                    color: #581c87;
                    font-size: 16px;
                    font-weight: 600;
                }}
                .total-amount {{
                    color: #7c3aed;
                    font-size: 24px;
                    font-weight: 700;
                    margin-top: 5px;
                }}
                .attachment-notice {{
                    background-color: #e9d5ff;
                    border: 1px solid #d8b4fe;
                    padding: 15px;
                    margin: 25px 0;
                    border-radius: 6px;
                    text-align: center;
                }}
                .footer {{
                    background-color: #f8fafc;
                    padding: 25px 40px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }}
                .footer p {{
                    margin: 5px 0;
                    font-size: 13px;
                    color: #94a3b8;
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>Акт №{act_number}</h1>
                    <p>Система Управління Документами</p>
                </div>
                <div class="content">
                    <p>Доброго дня!</p>
                    <p>Надсилаємо Вам акт прийнятих робіт №<strong>{act_number}</strong> від <strong>{formatted_date}</strong>.</p>
                    <div class="info-box">
                        <div class="info-row">
                            <span>📋 Номер акту:</span>
                            <span>№{act_number}</span>
                        </div>
                        <div class="info-row">
                            <span>📅 Дата:</span>
                            <span>{formatted_date}</span>
                        </div>
                        <div class="info-row">
                            <span>🏢 Контрагент:</span>
                            <span>{counterparty_name}</span>
                        </div>
                    </div>
                    <div class="total">
                        <div class="total-label">ЗАГАЛЬНА СУМА:</div>
                        <div class="total-amount">{total_amount:.2f} грн</div>
                    </div>
                    <div class="attachment-notice">
                        <p>📎 Повна інформація про акт знаходиться у вкладеному PDF-документі</p>
                    </div>
                </div>
                <div class="footer">
                    <p>Це автоматично згенерований лист</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email_with_attachment(
            to_email=to_email,
            subject=subject,
            body=body,
            attachment_path=pdf_path,
            attachment_name=f"Акт_{act_number}.pdf"
        )
    
    def send_waybill_document(
        self,
        to_email: str,
        waybill_number: str,
        waybill_date: str,
        counterparty_name: str,
        total_amount: float,
        pdf_path: str
    ) -> bool:
        """Send waybill document PDF via email with orange-themed HTML styling."""
        formatted_date = self.format_date_ukrainian(waybill_date)
        
        subject = f"Видаткова накладна №{waybill_number} від {formatted_date}"
        
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Arial, sans-serif;
                    line-height: 1.6;
                    color: #1e293b;
                    margin: 0;
                    padding: 0;
                    background-color: #f8fafc;
                }}
                .email-container {{
                    max-width: 600px;
                    margin: 20px auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                    color: white;
                    padding: 30px 40px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }}
                .content {{
                    padding: 40px;
                }}
                .info-box {{
                    background-color: #fff7ed;
                    border-left: 4px solid #f97316;
                    padding: 20px;
                    margin: 25px 0;
                    border-radius: 4px;
                }}
                .info-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #fed7aa;
                }}
                .info-row:last-child {{
                    border-bottom: none;
                }}
                .total {{
                    background-color: #fed7aa;
                    padding: 15px 20px;
                    margin: 20px 0;
                    border-radius: 6px;
                    text-align: right;
                }}
                .total-label {{
                    color: #7c2d12;
                    font-size: 16px;
                    font-weight: 600;
                }}
                .total-amount {{
                    color: #c2410c;
                    font-size: 24px;
                    font-weight: 700;
                    margin-top: 5px;
                }}
                .attachment-notice {{
                    background-color: #fed7aa;
                    border: 1px solid #fdba74;
                    padding: 15px;
                    margin: 25px 0;
                    border-radius: 6px;
                    text-align: center;
                }}
                .footer {{
                    background-color: #f8fafc;
                    padding: 25px 40px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }}
                .footer p {{
                    margin: 5px 0;
                    font-size: 13px;
                    color: #94a3b8;
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>Видаткова накладна №{waybill_number}</h1>
                    <p>Система Управління Документами</p>
                </div>
                <div class="content">
                    <p>Доброго дня!</p>
                    <p>Надсилаємо Вам видаткову накладну №<strong>{waybill_number}</strong> від <strong>{formatted_date}</strong>.</p>
                    <div class="info-box">
                        <div class="info-row">
                            <span>📋 Номер накладної:</span>
                            <span>№{waybill_number}</span>
                        </div>
                        <div class="info-row">
                            <span>📅 Дата:</span>
                            <span>{formatted_date}</span>
                        </div>
                        <div class="info-row">
                            <span>🏢 Контрагент:</span>
                            <span>{counterparty_name}</span>
                        </div>
                    </div>
                    <div class="total">
                        <div class="total-label">ЗАГАЛЬНА СУМА:</div>
                        <div class="total-amount">{total_amount:.2f} грн</div>
                    </div>
                    <div class="attachment-notice">
                        <p>📎 Повна інформація про накладну знаходиться у вкладеному PDF-документі</p>
                    </div>
                </div>
                <div class="footer">
                    <p>Це автоматично згенерований лист</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email_with_attachment(
            to_email=to_email,
            subject=subject,
            body=body,
            attachment_path=pdf_path,
            attachment_name=f"Накладна_{waybill_number}.pdf"
        )
