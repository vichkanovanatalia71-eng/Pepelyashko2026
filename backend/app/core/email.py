"""Сервіс відправлення email (aiosmtplib)."""
from __future__ import annotations

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


def _is_smtp_configured() -> bool:
    return bool(settings.smtp_user and settings.smtp_password)


async def send_verification_email(to_email: str, token: str) -> bool:
    """
    Надсилає лист із посиланням для підтвердження email.
    Повертає True якщо лист надіслано, False якщо SMTP не налаштовано.
    Кидає виняток при помилці відправлення.
    """
    if not _is_smtp_configured():
        logger.warning(
            "SMTP не налаштовано (SMTP_USER/SMTP_PASSWORD порожні). "
            "Лист підтвердження не надіслано для %s",
            to_email,
        )
        return False

    verify_url = f"{settings.frontend_url}/verify-email?token={token}"
    sender = settings.smtp_from or settings.smtp_user

    html_body = f"""
<!DOCTYPE html>
<html lang="uk">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:system-ui,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#1a1d27;border-radius:16px;
              border:1px solid rgba(255,255,255,0.06);overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);
                padding:32px 40px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">🏥</div>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Pepelyashko</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">
        Фінансовий менеджер для медичної практики
      </p>
    </div>
    <div style="padding:36px 40px;">
      <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:18px;">
        Підтвердьте вашу email-адресу
      </h2>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">
        Ви зареєструвались у системі Pepelyashko. Натисніть кнопку нижче,
        щоб підтвердити вашу email-адресу та активувати обліковий запис.
      </p>
      <a href="{verify_url}"
         style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;
                font-size:15px;font-weight:600;">
        Підтвердити email
      </a>
      <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.6;">
        Якщо кнопка не працює, скопіюйте та вставте це посилання у браузер:<br>
        <a href="{verify_url}" style="color:#818cf8;word-break:break-all;">{verify_url}</a>
      </p>
      <p style="margin:16px 0 0;color:#475569;font-size:11px;">
        Якщо ви не реєструвались — просто ігноруйте цього листа.
        Посилання діє 24 години.
      </p>
    </div>
  </div>
</body>
</html>
"""

    text_body = (
        f"Підтвердьте вашу email-адресу у системі Pepelyashko.\n\n"
        f"Перейдіть за посиланням:\n{verify_url}\n\n"
        f"Якщо ви не реєструвались — ігноруйте цей лист."
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Підтвердьте вашу email-адресу — Pepelyashko"
    msg["From"] = sender
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        start_tls=True,
    )
    logger.info("Лист підтвердження надіслано на %s", to_email)
    return True
