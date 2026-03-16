import logging
from app.config import settings

logger = logging.getLogger(__name__)


def _mask_email(email: str) -> str:
    """g***@gmail.com"""
    local, domain = email.split("@")
    return f"{local[0]}***@{domain}"


def _build_html(display_name: str, code: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-block;width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#7c3aed);border-radius:16px;line-height:56px;font-size:28px">👶</div>
        <h2 style="color:#1e1b4b;margin:12px 0 4px">CryBaby</h2>
        <p style="color:#64748b;margin:0;font-size:14px">Baby care, simplified</p>
      </div>
      <div style="background:#f8fafc;border-radius:16px;padding:28px;text-align:center">
        <p style="color:#334155;margin:0 0 8px">Hi {display_name},</p>
        <p style="color:#334155;margin:0 0 24px">Your login verification code is:</p>
        <div style="background:#1e1b4b;color:#a5b4fc;font-size:36px;font-weight:bold;letter-spacing:12px;border-radius:12px;padding:16px 24px;display:inline-block">{code}</div>
        <p style="color:#94a3b8;font-size:13px;margin:20px 0 0">Expires in <strong>10 minutes</strong>. Do not share this code.</p>
      </div>
      <p style="color:#cbd5e1;font-size:12px;text-align:center;margin-top:24px">
        If you didn't try to log in, you can safely ignore this email.
      </p>
    </div>
    """


def send_otp_email(to_email: str, code: str, display_name: str) -> None:
    html = _build_html(display_name, code)
    subject = f"CryBaby login code: {code}"

    # Brevo HTTP API (HTTPS — never blocked by hosting providers)
    if settings.brevo_api_key:
        import httpx
        sender = settings.smtp_from or "geerath23091999@gmail.com"
        resp = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": settings.brevo_api_key, "Content-Type": "application/json"},
            json={
                "sender": {"name": "CryBaby", "email": sender},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html,
            },
            timeout=10,
        )
        resp.raise_for_status()
        logger.info("OTP email sent via Brevo API to %s", _mask_email(to_email))
        return

    # Fallback: Resend (requires verified domain for arbitrary recipients)
    if settings.resend_api_key:
        import resend
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": "CryBaby <onboarding@resend.dev>",
            "to": to_email,
            "subject": subject,
            "html": html,
        })
        logger.info("OTP email sent via Resend to %s", _mask_email(to_email))
        return

    raise RuntimeError("No email provider configured. Set BREVO_API_KEY in environment.")
