"""
Email Service — Sends HTML emails via Gmail SMTP using Python's standard library.
Handles password reset links and generic notifications.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from ..config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, user_name: str, reset_url: str) -> bool:
    """
    Sends a styled HTML password reset email using Gmail SMTP.
    Returns True if sent successfully, False otherwise.
    """
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        logger.warning(
            "[EmailService] MAIL_USERNAME or MAIL_PASSWORD not set in .env. "
            "Skipping actual SMTP send. Reset URL would be: %s", reset_url
        )
        # Print reset URL to console for local development convenience if SMTP is unconfigured
        print(f"\n========================================================")
        print(f"[LOCAL DEV EMAIL SIMULATION] Password Reset Link for {to_email}:")
        print(f"URL: {reset_url}")
        print(f"========================================================\n")
        return False

    sender_email = settings.MAIL_FROM or settings.MAIL_USERNAME
    subject = "Reset Your Password — AntiGhost CV"

    # HTML Email Template matching AntiGhost CV light glassmorphic aesthetic
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8fafc;
                margin: 0;
                padding: 0;
                color: #334155;
            }}
            .container {{
                max-width: 580px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 24px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 20px 40px -15px rgba(99, 102, 241, 0.08);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                padding: 36px 40px;
                text-align: center;
            }}
            .brand {{
                color: #ffffff;
                font-size: 24px;
                font-weight: 900;
                letter-spacing: -0.5px;
            }}
            .brand-accent {{
                color: #c7d2fe;
            }}
            .content {{
                padding: 40px;
            }}
            h1 {{
                font-size: 20px;
                font-weight: 800;
                color: #0f172a;
                margin-top: 0;
                margin-bottom: 16px;
            }}
            p {{
                font-size: 14px;
                line-height: 1.6;
                color: #64748b;
                margin-bottom: 24px;
            }}
            .button-wrapper {{
                text-align: center;
                margin: 32px 0;
            }}
            .btn {{
                display: inline-block;
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                color: #ffffff !important;
                font-weight: 800;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                padding: 16px 36px;
                border-radius: 16px;
                text-decoration: none;
                box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.3);
            }}
            .footer {{
                background: #f8fafc;
                padding: 24px 40px;
                text-align: center;
                border-top: 1px solid #f1f5f9;
                font-size: 12px;
                color: #94a3b8;
            }}
            .link-alt {{
                font-size: 12px;
                word-break: break-all;
                color: #6366f1;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="brand">AntiGhost <span class="brand-accent">CV</span></div>
            </div>
            <div class="content">
                <h1>Password Reset Request</h1>
                <p>Hello {user_name or 'there'},</p>
                <p>We received a request to reset the password for your AntiGhost CV account associated with <strong>{to_email}</strong>.</p>
                <p>Click the button below to reset your password. This link is valid for <strong>30 minutes</strong>.</p>
                
                <div class="button-wrapper">
                    <a href="{reset_url}" class="btn" target="_blank">Reset Password →</a>
                </div>

                <p>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
                <p style="font-size: 12px; color: #94a3b8;">
                    If the button doesn't work, copy and paste this link into your browser:<br />
                    <a href="{reset_url}" class="link-alt">{reset_url}</a>
                </p>
            </div>
            <div class="footer">
                &copy; AntiGhost CV — AI Resume & Interview Platform
            </div>
        </div>
    </body>
    </html>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"AntiGhost CV <{sender_email}>"
    message["To"] = to_email

    part = MIMEText(html_content, "html")
    message.attach(part)

    try:
        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT)
        server.starttls()  # Upgrade connection to TLS
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(sender_email, to_email, message.as_string())
        server.quit()
        logger.info(f"[EmailService] Password reset email successfully sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"[EmailService] Failed to send email via SMTP to {to_email}: {e}")
        # Print reset URL in console fallback so developer can still test even if credentials fail
        print(f"\n[SMTP ERROR - FALLBACK LINK] URL for {to_email}: {reset_url}\n")
        return False
