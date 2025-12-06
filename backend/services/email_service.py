"""Service for sending emails."""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from pathlib import Path
import logging

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
        attachment_name: str = None
    ) -> bool:
        """
        Send email with PDF attachment.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Email body (HTML or plain text)
            attachment_path: Path to file to attach
            attachment_name: Custom name for attachment (optional)
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.smtp_username
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add body
            msg.attach(MIMEText(body, 'html'))
            
            # Add attachment
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
        pdf_path: str
    ) -> bool:
        """
        Send counterparty card PDF via email.
        
        Args:
            to_email: Recipient email address
            counterparty_name: Name of the counterparty
            pdf_path: Path to PDF file
            
        Returns:
            True if email sent successfully
        """
        subject = f"Картка контрагента: {counterparty_name}"
        
        body = f"""
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #f8f9fa;
                    padding: 20px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                }}
                .content {{
                    padding: 20px 0;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e0e0e0;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0; color: #1a1a1a;">Картка контрагента</h2>
                </div>
                
                <div class="content">
                    <p>Доброго дня!</p>
                    
                    <p>Надсилаємо Вам картку контрагента: <strong>{counterparty_name}</strong></p>
                    
                    <p>Картка контрагента знаходиться у вкладеному PDF-файлі.</p>
                    
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
            attachment_name=f"Картка_контрагента_{counterparty_name[:30]}.pdf"
        )
