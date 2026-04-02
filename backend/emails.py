import asyncio
import logging
import resend
from config import RESEND_API_KEY, SENDER_EMAIL, ADMIN_EMAIL, CITIES, TREATMENT_NAMES, BAND_NAMES


async def send_lead_notification_email(lead_data: dict):
    """Send email notification to admin when a lead submits contact info."""
    if not RESEND_API_KEY:
        logging.warning("RESEND_API_KEY not configured - skipping email notification")
        return

    city_name = CITIES.get(lead_data.get('city_slug', ''), lead_data.get('city_slug', 'N/A'))
    treatment_name = TREATMENT_NAMES.get(lead_data.get('treatment_type', ''), lead_data.get('treatment_type', 'N/A'))
    band = lead_data.get('band', 'N/A')
    band_display = BAND_NAMES.get(band, band)

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Нов лийд от Zubite.bg</h1>
        </div>
        <div style="padding: 24px; background: #f8fafc;">
            <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
                <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Информация за лийда</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Име:</td><td style="padding: 8px 0; color: #0f172a; font-weight: 500;">{lead_data.get('name', 'N/A')}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;">Телефон:</td><td style="padding: 8px 0; color: #0f172a; font-weight: 500;">{lead_data.get('phone', 'N/A')}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;">Имейл:</td><td style="padding: 8px 0; color: #0f172a; font-weight: 500;">{lead_data.get('email', 'N/A')}</td></tr>
                </table>
            </div>
            <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
                <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Резултати от теста</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Град:</td><td style="padding: 8px 0; color: #0f172a; font-weight: 500;">{city_name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;">Лечение:</td><td style="padding: 8px 0; color: #0f172a; font-weight: 500;">{treatment_name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;">Точки:</td><td style="padding: 8px 0; color: #0f172a; font-weight: 500;">{lead_data.get('score_total', 0)} / 100</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;">Категория:</td><td style="padding: 8px 0; font-weight: 500; color: {'#16a34a' if band == 'GREEN' else '#ca8a04' if band == 'YELLOW' else '#dc2626'};">{band_display}</td></tr>
                </table>
            </div>
            <div style="text-align: center; padding-top: 8px;">
                <p style="color: #64748b; font-size: 14px; margin: 0;">
                    Вижте всички лийдове в <a href="https://zubite.bg/admin" style="color: #0ea5e9;">админ панела</a>
                </p>
            </div>
        </div>
        <div style="background: #0f172a; padding: 16px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2024 Zubite.bg - Всички права запазени</p>
        </div>
    </div>
    """

    params = {
        "from": SENDER_EMAIL,
        "to": [ADMIN_EMAIL],
        "subject": f"Нов лийд: {lead_data.get('name', 'Без име')} - {treatment_name} ({city_name})",
        "html": html_content
    }

    try:
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        logging.info(f"Lead notification email sent to {ADMIN_EMAIL}, email_id: {email_result.get('id')}")
        return email_result
    except Exception as e:
        logging.error(f"Failed to send lead notification email: {str(e)}")
        return None


async def send_verification_email(lead: dict, token: str, base_url: str):
    """Send verification email to the patient"""
    email = lead.get("email")
    name = lead.get("name", "")
    if not email:
        logging.warning(f"Lead {lead['id']} has no email - skipping verification")
        return False

    verify_url = f"{base_url}/verify/{token}"
    yes_url = f"{verify_url}?response=yes"
    no_url = f"{verify_url}?response=no"

    if not RESEND_API_KEY:
        logging.warning("RESEND_API_KEY not set - skipping verification email")
        return False

    try:
        resend.Emails.send({
            "from": SENDER_EMAIL,
            "to": email,
            "subject": "Свърза ли се клиниката с вас? — Zubite.bg",
            "html": f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 0;">
                <h1 style="font-size: 20px; color: #0f172a; margin-bottom: 8px;">Здравейте{(' ' + name) if name else ''},</h1>
                <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                    Наскоро ви свързахме с дентална клиника чрез Zubite.bg. Искаме да проверим дали клиниката се свърза с вас.
                </p>
                <p style="color: #334155; font-size: 16px; font-weight: 600; margin-bottom: 20px;">Свърза ли се клиниката с вас?</p>
                <div style="display: flex; gap: 12px; margin-bottom: 32px;">
                    <a href="{yes_url}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 24px; font-weight: 500; font-size: 15px;">Да</a>
                    <a href="{no_url}" style="display: inline-block; background: #ef4444; color: white; text-decoration: none; padding: 14px 32px; border-radius: 24px; font-weight: 500; font-size: 15px;">Не</a>
                </div>
                <p style="color: #94a3b8; font-size: 13px;">Вашият отговор ни помага да подобрим качеството на услугата.<br>С уважение, Екипът на Zubite.bg</p>
            </div>
            """
        })
        logging.info(f"Verification email sent to {email} for lead {lead['id']}")
        return True
    except Exception as e:
        logging.error(f"Failed to send verification email: {e}")
        return False
