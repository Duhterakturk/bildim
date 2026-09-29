import os
import smtplib
from email.message import EmailMessage

from flask import current_app


def send_password_reset(to_email: str, link: str) -> bool:
    """Şifre bağlantısını SMTP ile gönderir. Ayar yoksa False döner, hata fırlatmaz."""
    host = os.environ.get("SMTP_HOST")
    sender = os.environ.get("SMTP_FROM") or os.environ.get("SMTP_USER")
    if not host or not sender:
        current_app.logger.warning("SMTP ayarı yok; şifre bağlantısı gönderilmedi")
        return False

    message = EmailMessage()
    message["Subject"] = "MindArena şifre yenileme"
    message["From"] = sender
    message["To"] = to_email
    message.set_content(
        "Şifrenizi yenilemek için bu bağlantıyı açabilirsiniz. Bağlantı bir saat geçerlidir.\n\n"
        f"{link}\n\n"
        "Bu isteği siz göndermediyseniz bu e-postayı yok sayabilirsiniz."
    )

    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    try:
        with smtplib.SMTP(host, port, timeout=20) as smtp:
            smtp.starttls()
            if user and password:
                smtp.login(user, password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException):
        current_app.logger.exception("Şifre e-postası gönderilemedi")
        return False
    return True
