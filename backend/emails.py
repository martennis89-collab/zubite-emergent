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


async def send_patient_otp_email(email: str, code: str):
    """Send a passwordless one-time login code to a patient (Общност accounts).

    OTP-only: the code is the sole credential. Kept deliberately plain and
    fast; no tracking, no marketing. Returns the Resend result or None."""
    if not RESEND_API_KEY:
        logging.warning("RESEND_API_KEY not configured - skipping patient OTP email")
        return None

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Zubite.bg</h1>
        </div>
        <div style="padding: 28px 24px; background: #f8fafc; text-align: center;">
            <p style="color: #0f172a; font-size: 16px; margin: 0 0 8px 0;">Вашият код за вход в Общността</p>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 20px 0;">Въведете този код, за да продължите. Валиден е 5 минути.</p>
            <div style="display: inline-block; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 28px;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">{code}</span>
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0 0;">
                Ако не сте поискали този код, просто игнорирайте това съобщение.
            </p>
        </div>
        <div style="background: #0f172a; padding: 16px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; Zubite.bg</p>
        </div>
    </div>
    """

    params = {
        "from": SENDER_EMAIL,
        "to": [email],
        "subject": f"Код за вход в Zubite: {code}",
        "html": html_content,
    }

    try:
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        logging.info(f"Patient OTP email sent to {email}, email_id: {email_result.get('id')}")
        return email_result
    except Exception as e:
        logging.error(f"Failed to send patient OTP email: {str(e)}")
        return None


async def send_community_answer_email(
    to_email: str, *, question_title: str, question_slug: str,
    answerer_display: str, is_expert: bool,
):
    """Notify a patient their Общност question got a new answer.

    Best-effort: like the other senders here, failures are logged and
    swallowed rather than raised — a missed notification email must never
    block the answer itself from publishing."""
    if not RESEND_API_KEY:
        logging.warning("RESEND_API_KEY not configured - skipping community answer email")
        return None

    base_url = "https://zubite.bg"
    badge = (
        '<span style="display:inline-block;background:#ccfbf1;color:#0f766e;'
        'font-size:12px;font-weight:600;border-radius:9999px;padding:2px 10px;">'
        "Проверена клиника</span>"
        if is_expert else ""
    )

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Zubite.bg</h1>
        </div>
        <div style="padding: 28px 24px; background: #f8fafc;">
            <p style="color: #0f172a; font-size: 16px; margin: 0 0 8px 0;">Има нов отговор на вашия въпрос</p>
            <div style="background: white; border-radius: 12px; padding: 16px 20px; margin: 16px 0; border: 1px solid #e2e8f0;">
                <p style="color: #0f172a; font-weight: 600; margin: 0 0 6px 0;">{question_title}</p>
                <p style="color: #64748b; font-size: 14px; margin: 0;">Отговори {answerer_display} {badge}</p>
            </div>
            <div style="text-align: center; padding-top: 8px;">
                <a href="{base_url}/community/v/{question_slug}"
                   style="display:inline-block;background:#0d9488;color:white;text-decoration:none;
                          padding:10px 22px;border-radius:8px;font-weight:600;">
                    Виж отговора
                </a>
            </div>
        </div>
        <div style="background: #0f172a; padding: 16px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; Zubite.bg</p>
        </div>
    </div>
    """

    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": f"Нов отговор: {question_title}",
        "html": html_content,
    }

    try:
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        logging.info(f"Community answer email sent to {to_email}, email_id: {email_result.get('id')}")
        return email_result
    except Exception as e:
        logging.error(f"Failed to send community answer email: {str(e)}")
        return None


async def send_lead_confirmation_email(lead_data: dict):
    """Send confirmation email to the lead (patient) after quiz submission."""
    if not RESEND_API_KEY:
        return None
    email = lead_data.get('email')
    if not email:
        return None

    name = lead_data.get('name', '')
    greeting = f"Здравейте{(' ' + name) if name else ''}"
    city_name = CITIES.get(lead_data.get('city_slug', ''), lead_data.get('city_slug', ''))

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 0;">
        <h1 style="font-size: 22px; color: #0f172a; margin-bottom: 8px;">Получихме вашите отговори</h1>
        <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            {greeting}, благодарим ви, че попълнихте теста в Zubite.bg.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px;">Какво следва?</p>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #0ea5e9; font-weight: 700; width: 28px; vertical-align: top;">1.</td>
                    <td style="padding: 8px 0; color: #334155; font-size: 15px;">Ще прегледаме вашите отговори и ще подберем подходящи клиники{(' в ' + city_name) if city_name else ''}.</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #0ea5e9; font-weight: 700; vertical-align: top;">2.</td>
                    <td style="padding: 8px 0; color: #334155; font-size: 15px;">Ще се свържем с вас по телефон в рамките на 24–48 часа.</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #0ea5e9; font-weight: 700; vertical-align: top;">3.</td>
                    <td style="padding: 8px 0; color: #334155; font-size: 15px;">Ще ви помогнем да запазите консултация при специалист — без ангажимент.</td>
                </tr>
            </table>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
            Ако имате въпроси, отговорете директно на този имейл.<br>
            С уважение, Екипът на <a href="https://zubite.bg" style="color: #0ea5e9; text-decoration: none;">Zubite.bg</a>
        </p>
    </div>
    """

    try:
        result = await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": "Получихме вашите отговори — Zubite.bg",
            "html": html,
        })
        logging.info(f"Lead confirmation email sent to {email}, email_id: {result.get('id')}")
        return result
    except Exception as e:
        logging.error(f"Failed to send lead confirmation email to {email}: {e}")
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



async def _send_email(to: str, subject: str, html: str, *, sender: str = None) -> bool:
    """Generic Resend wrapper used by ad-hoc workflows (clinic notifications,
    etc.). Returns True on success, False on failure. Never raises."""
    if not RESEND_API_KEY:
        logging.warning("RESEND_API_KEY not configured — skipping email")
        return False
    try:
        resend.api_key = RESEND_API_KEY
        from_addr = sender or SENDER_EMAIL
        params = {"from": from_addr, "to": [to], "subject": subject, "html": html}
        await asyncio.to_thread(resend.Emails.send, params)
        logging.info(f"Email sent to {to}: {subject}")
        return True
    except Exception as e:
        logging.error(f"_send_email failed to {to}: {e}")
        return False


async def send_verification_flagged_alert(
    lead: dict,
    clinic_name: str | None = None,
) -> bool:
    """Phase 2C: admin alert when a patient verification response is 'no'
    (verification_status='flagged'). Includes ONLY minimal context — no
    quiz answers, attribution, transcripts, or call outcome JSON."""
    if not RESEND_API_KEY or not ADMIN_EMAIL:
        logging.warning("RESEND_API_KEY / ADMIN_EMAIL not set — skipping flagged alert")
        return False
    lead_id = lead.get("id", "")
    clinic_id = lead.get("assigned_clinic_id") or ""
    patient_name = lead.get("name") or "—"
    clinic_label = clinic_name or clinic_id or "—"
    subject = "Lead flagged — patient reported clinic did not make contact"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px 0;">
        <h1 style="font-size: 18px; color: #b91c1c; margin: 0 0 12px;">Flagged lead — clinic did not contact</h1>
        <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
            A patient responded <strong>"no"</strong> to the 24h verification email.
            Please follow up with the clinic.
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 140px;">Lead ID:</td>
                <td style="padding: 6px 0; color: #0f172a;"><code>{lead_id}</code></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Clinic ID:</td>
                <td style="padding: 6px 0; color: #0f172a;"><code>{clinic_id}</code></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Clinic:</td>
                <td style="padding: 6px 0; color: #0f172a;">{clinic_label}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Patient:</td>
                <td style="padding: 6px 0; color: #0f172a;">{patient_name}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Reason:</td>
                <td style="padding: 6px 0; color: #0f172a;">Patient reported they were not contacted.</td></tr>
        </table>
        <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0;">— Zubite.bg automated alert</p>
    </div>
    """
    try:
        return await _send_email(ADMIN_EMAIL, subject, html)
    except Exception as e:
        logging.error(f"send_verification_flagged_alert failed: {e}")
        return False


# ─────────────────────────────────────────────────────────────
# P4 / P5 — Admin notifications on patient-flow request creation
# ─────────────────────────────────────────────────────────────
#
# Both helpers share the same operational shape:
#   • Internal admin email (Bulgarian subject, neutral tone).
#   • Best-effort: missing RESEND_API_KEY or ADMIN_EMAIL → log + return False.
#   • Never raises — callers wrap in try/except too, so a Resend outage
#     can never block the patient submit.
#   • Privacy: patient name/phone are admin-visible already (admin queue).
#     We do NOT include quiz answers, attribution objects, tokens,
#     cookies, verification tokens, or password hashes.

def _h(value) -> str:
    """HTML-escape user content for safe insertion into the email body."""
    import html as _html
    return _html.escape("" if value is None else str(value))


def _truncate(s: str | None, limit: int) -> str:
    s = (s or "").strip()
    if len(s) <= limit:
        return s
    return s[: max(0, limit - 1)].rstrip() + "…"


def _admin_url(path: str) -> str:
    """Compose an absolute admin URL using PRODUCTION_URL when available."""
    from config import PRODUCTION_URL
    base = (PRODUCTION_URL or "https://zubite.bg").rstrip("/")
    if not path.startswith("/"):
        path = "/" + path
    return f"{base}{path}"


async def send_clinic_chat_notification(
    *,
    to_email: str,
    clinic_name: str | None = None,
) -> bool:
    """Tell a clinic a patient has opened an online consultation thread.

    Carries NO message text and NO attachment on purpose. The patient may
    have written about their health and attached an X-ray; that is
    special-category data and must stay behind the dashboard login rather
    than sitting in an unencrypted mailbox. This is a nudge, not a copy.
    """
    if not RESEND_API_KEY:
        logging.warning("RESEND_API_KEY not configured - skipping chat notification")
        return False

    url = _admin_url("/clinic/dashboard/chats")
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #5eead4 0%, #14b8a6 100%); padding: 24px; text-align: center;">
            <h1 style="color: #0f172a; margin: 0; font-size: 22px;">Нов онлайн разговор</h1>
        </div>
        <div style="padding: 24px; background: #f8fafc;">
            <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
                <p style="color: #0f172a; margin: 0 0 12px 0; font-size: 15px;">
                    Пациент започна онлайн разговор с вас в Zubite.
                </p>
                <p style="color: #64748b; margin: 0 0 20px 0; font-size: 14px; line-height: 1.6;">
                    Съобщението и приложените файлове са достъпни само във вашето табло —
                    не ги изпращаме по имейл.
                </p>
                <a href="{url}" style="display: inline-block; background: #14b8a6; color: white; text-decoration: none; padding: 12px 20px; border-radius: 999px; font-weight: 500; font-size: 14px;">
                    Отвори разговора
                </a>
            </div>
        </div>
    </div>
    """
    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": "Нов онлайн разговор в Zubite",
        "html": html_content,
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logging.info(f"Clinic chat notification sent to {to_email}, email_id: {result.get('id')}")
        return True
    except Exception as e:
        logging.error(f"Failed to send clinic chat notification: {str(e)}")
        return False


async def send_admin_selected_clinic_request_alert(
    *,
    request_id: str,
    lead_id: str,
    patient_name: str | None,
    patient_phone: str | None,
    patient_city: str | None,
    treatment_interest: str | None,
    clinic_id: str,
    clinic_name: str | None,
    source: str | None,
    created_at: str | None,
) -> bool:
    """P4 admin alert: a patient picked a specific recommended clinic."""
    if not RESEND_API_KEY or not ADMIN_EMAIL:
        logging.warning(
            "P4 admin alert skipped — RESEND_API_KEY / ADMIN_EMAIL missing"
        )
        return False
    subject = "Нова заявка към избрана клиника — Zubite"
    city_name = CITIES.get((patient_city or "").lower(), patient_city or "—")
    treatment_label = TREATMENT_NAMES.get(
        (treatment_interest or "").lower(), treatment_interest or "—"
    )
    detail_url = _admin_url(f"/admin/consultation-requests/{request_id}")
    list_url = _admin_url(
        "/admin/consultation-requests?created_from=recommended_clinics_flow"
    )
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px 0;">
        <h1 style="font-size: 18px; color: #0f172a; margin: 0 0 8px;">Нова заявка към избрана клиника</h1>
        <p style="color: #475569; font-size: 14px; line-height: 1.55; margin: 0 0 16px;">
            Пациентът избра конкретна клиника от препоръчаните и поиска тя да се свърже с него.
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 170px;">Тип заявка:</td>
                <td style="padding: 6px 0; color: #0f172a;">Пациентът избра конкретна клиника</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Пациент:</td>
                <td style="padding: 6px 0; color: #0f172a;">{_h(patient_name) or "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Телефон:</td>
                <td style="padding: 6px 0; color: #0f172a;">{_h(patient_phone) or "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Град:</td>
                <td style="padding: 6px 0; color: #0f172a;">{_h(city_name)}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Тип лечение:</td>
                <td style="padding: 6px 0; color: #0f172a;">{_h(treatment_label)}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Избрана клиника:</td>
                <td style="padding: 6px 0; color: #0f172a;">{_h(clinic_name) or "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Clinic ID:</td>
                <td style="padding: 6px 0; color: #0f172a;"><code>{_h(clinic_id)}</code></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Lead ID:</td>
                <td style="padding: 6px 0; color: #0f172a;"><code>{_h(lead_id)}</code></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Consultation Request ID:</td>
                <td style="padding: 6px 0; color: #0f172a;"><code>{_h(request_id)}</code></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Източник:</td>
                <td style="padding: 6px 0; color: #0f172a;">{_h(source or "recommended_clinics_flow")}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Създадена в:</td>
                <td style="padding: 6px 0; color: #0f172a;">{_h(created_at) or "—"}</td></tr>
        </table>
        <p style="margin: 18px 0 4px;">
            <a href="{detail_url}" style="color: #0ea5e9; text-decoration: none; font-weight: 500;">Отвори заявката в админ панела →</a>
        </p>
        <p style="margin: 4px 0 0;">
            <a href="{list_url}" style="color: #64748b; text-decoration: none; font-size: 13px;">Виж всички заявки от препоръчани клиники</a>
        </p>
        <p style="color: #94a3b8; font-size: 12px; margin: 18px 0 0;">— Zubite.bg automated internal alert</p>
    </div>
    """
    try:
        return await _send_email(ADMIN_EMAIL, subject, html)
    except Exception as e:
        logging.error(f"send_admin_selected_clinic_request_alert failed: {e}")
        return False


async def send_admin_assisted_choice_request_alert(
    *,
    request_id: str,
    lead_id: str,
    patient_name: str | None,
    patient_phone: str | None,
    patient_city: str | None,
    treatment_interest: str | None,
    patient_message: str | None,
    source: str | None,
    created_at: str | None,
) -> bool:
    """P5 admin alert: a patient asked Zubite to help them choose."""
    if not RESEND_API_KEY or not ADMIN_EMAIL:
        logging.warning(
            "P5 admin alert skipped — RESEND_API_KEY / ADMIN_EMAIL missing"
        )
        return False
    subject = "Нова заявка за помощ при избор — Zubite"
    city_name = CITIES.get((patient_city or "").lower(), patient_city or "—")
    treatment_label = TREATMENT_NAMES.get(
        (treatment_interest or "").lower(), treatment_interest or "—"
    )
    # Spec: truncate patient message to 500 chars in the email body.
    safe_message = _truncate(patient_message, 500)
    queue_url = _admin_url(
        "/admin/consultation-requests?status=needs_zubite_review"
    )
    message_block = (
        f"""<tr><td style="padding: 6px 0; color: #64748b; vertical-align: top;">Съобщение от пациента:</td>
            <td style="padding: 6px 0; color: #0f172a; white-space: pre-wrap;">{_h(safe_message)}</td></tr>"""
        if safe_message else ""
    )
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px 0;">
        <h1 style="font-size: 18px; color: #0f172a; margin: 0 0 8px;">Нова заявка за помощ при избор</h1>
        <p style="color: #475569; font-size: 14px; line-height: 1.55; margin: 0 0 16px;">
            Пациентът поиска помощ от Zubite, за да избере подходяща клиника.
            Изисква преглед от екипа.
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 200px;">Тип заявка:</td>
                <td style="padding: 6px 0; color: #0f172a;">Пациентът поиска помощ от Zubite</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Пациент:</td>
                <td style="padding: 6px 0; color: #0f172a;">{_h(patient_name) or "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Телефон:</td>
                <td style="padding: 6px 0; color: #0f172a;">{_h(patient_phone) or "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Град:</td>
                <td style="padding: 6px 0; color: #0f172a;">{_h(city_name)}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Тип лечение:</td>
                <td style="padding: 6px 0; color: #0f172a;">{_h(treatment_label)}</td></tr>
            {message_block}
            <tr><td style="padding: 6px 0; color: #64748b;">Lead ID:</td>
                <td style="padding: 6px 0; color: #0f172a;"><code>{_h(lead_id)}</code></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Assisted-choice Request ID:</td>
                <td style="padding: 6px 0; color: #0f172a;"><code>{_h(request_id)}</code></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Източник:</td>
                <td style="padding: 6px 0; color: #0f172a;">{_h(source or "assisted_choice_flow")}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Създадена в:</td>
                <td style="padding: 6px 0; color: #0f172a;">{_h(created_at) or "—"}</td></tr>
        </table>
        <p style="margin: 18px 0 4px;">
            <a href="{queue_url}" style="color: #0ea5e9; text-decoration: none; font-weight: 500;">Отвори опашката „Чака преглед" →</a>
        </p>
        <p style="color: #94a3b8; font-size: 12px; margin: 18px 0 0;">— Zubite.bg automated internal alert</p>
    </div>
    """
    try:
        return await _send_email(ADMIN_EMAIL, subject, html)
    except Exception as e:
        logging.error(f"send_admin_assisted_choice_request_alert failed: {e}")
        return False


# ─────────────────────────────────────────────────────────────
# Patient self-service: "Save Care Pass by email"
# ─────────────────────────────────────────────────────────────
#
# Sent ONLY when the patient explicitly opts in on /quiz/success.
#
# Hard copy rules — must stay in sync with
# /app/frontend/lib/manualRecommendationCopy.ts:
#   • No diagnosis language ("диагноза", "лечение", "гарантиран").
#   • Care Pass = oral hygiene product discounts only, AFTER consultation.
#   • Manual Recommendation Mode = Zubite team reviews leads and reaches
#     out manually. No promise of instant clinic matching / booking.
#   • Never include phone numbers, attribution, or quiz answer payloads.

# Friendly band labels for the email — kept distinct from BAND_NAMES
# (which is admin-facing and includes "Висок приоритет" / "Среден
# приоритет" / "Нисък приоритет" — too operational for a patient email).
_PATIENT_BAND_LABELS = {
    "GREEN": "Нисък риск",
    "YELLOW": "Умерен риск",
    "RED": "Висок риск",
}

_PATIENT_BAND_SUMMARIES = {
    "GREEN": (
        "Профилактичен преглед при стоматолог остава добра идея, "
        "за да поддържаш здравето си."
    ),
    "YELLOW": (
        "Има признаци, които заслужават внимание от специалист. "
        "Препоръчваме консултация при стоматолог или ортодонт."
    ),
    "RED": (
        "Комбинация от симптоми, които е важно да се оценят "
        "от специалист. Препоръчваме да насрочиш консултация."
    ),
}


async def send_care_pass_summary_email(
    *,
    to_email: str,
    name: str | None,
    band: str | None,
    city_slug: str | None,
    treatment_type: str | None,
    access_token: str | None = None,
) -> bool:
    """Patient-initiated summary email: quiz outcome + Care Pass
    eligibility text + Manual Recommendation Mode messaging.

    If `access_token` is provided, the email includes a secure magic
    link button back to /patient/orientir/{access_token}. The raw lead
    ID is NEVER included in the URL.

    Best-effort: returns False if Resend is unconfigured or the call
    fails — caller logs and returns a success response either way so
    the patient never sees an internal Resend error."""
    if not RESEND_API_KEY:
        logging.warning(
            "send_care_pass_summary_email skipped — RESEND_API_KEY missing"
        )
        return False

    greeting_name = (name or "").strip()
    greeting = f"Здравей{(' ' + greeting_name) if greeting_name else ''}"

    band_key = (band or "").upper()
    band_label = _PATIENT_BAND_LABELS.get(band_key, "Резултат от ориентира")
    band_summary = _PATIENT_BAND_SUMMARIES.get(
        band_key,
        "Препоръчваме консултация при стоматолог за по-добра оценка.",
    )

    city_name = CITIES.get((city_slug or "").lower(), "")
    treatment_name = TREATMENT_NAMES.get(
        (treatment_type or "").lower(), ""
    )

    context_rows = ""
    if city_name:
        context_rows += (
            f"<tr><td style=\"padding:6px 0;color:#64748b;width:140px;\">Град:</td>"
            f"<td style=\"padding:6px 0;color:#0f172a;font-weight:500;\">{_h(city_name)}</td></tr>"
        )
    if treatment_name:
        context_rows += (
            f"<tr><td style=\"padding:6px 0;color:#64748b;\">Категория:</td>"
            f"<td style=\"padding:6px 0;color:#0f172a;font-weight:500;\">{_h(treatment_name)}</td></tr>"
        )

    subject = "Твоят резултат от Zubite.bg + Care Pass"

    # Optional magic-link block — only rendered when an access token is
    # provided. We use the public PRODUCTION_URL as the canonical base
    # (the email is a long-lived asset that may outlive a preview env).
    magic_link_block = ""
    if access_token:
        from config import PRODUCTION_URL
        base = (PRODUCTION_URL or "https://zubite.bg").rstrip("/")
        magic_url = f"{base}/patient/orientir/{access_token}"
        magic_link_block = f"""
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:22px;margin:0 0 20px;text-align:center;">
            <p style="color:#0f172a;font-size:14px;font-weight:600;margin:0 0 8px;">Запазен достъп до твоя ориентир</p>
            <p style="color:#475569;font-size:13px;line-height:1.55;margin:0 0 16px;">
                Можеш да се върнеш към своя ориентир и обяснението за Zubite Care Pass от този линк.
                Това не е диагноза, а помощ да разбереш каква следваща стъпка има смисъл за твоя случай.
            </p>
            <a href="{_h(magic_url)}" style="display:inline-block;background:#0d9488;background-image:linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%);color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;font-size:14px;">
                Отвори своя ориентир
            </a>
            <p style="color:#94a3b8;font-size:11px;line-height:1.5;margin:14px 0 0;">
                Линкът е личен — не го споделяй публично. Активен е до 90 дни.
            </p>
        </div>
        """

    html = f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;background:#FCFAF8;">
        <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px;font-weight:600;">{_h(greeting)},</h1>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
            Запазваме твоя резултат от ориентира на Zubite.bg, заедно с
            информация за Care Pass. Това е <strong>ориентир, не диагноза</strong>
            и не замества преглед при специалист.
        </p>

        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:0 0 20px;">
            <p style="color:#0f766e;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 8px;font-weight:600;">Твоят ориентир</p>
            <h2 style="color:#0f172a;font-size:18px;margin:0 0 8px;font-weight:600;">{_h(band_label)}</h2>
            <p style="color:#475569;font-size:14px;line-height:1.55;margin:0 0 14px;">{_h(band_summary)}</p>
            {f'<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:10px;">{context_rows}</table>' if context_rows else ''}
        </div>

        {magic_link_block}

        <div style="background:#0E1A24;background-image:linear-gradient(135deg,#0E1A24 0%,#112832 100%);border-radius:12px;padding:22px;margin:0 0 20px;color:#e2e8f0;">
            <p style="color:#5eead4;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;margin:0 0 6px;font-weight:600;">Zubite Care Pass</p>
            <h2 style="color:#ffffff;font-size:18px;margin:0 0 12px;font-weight:600;">След консултацията клиниката ти дава Care Pass.</h2>
            <p style="color:#cbd5e1;font-size:14px;line-height:1.55;margin:0 0 14px;">
                Ако посетиш консултация в партньорска клиника чрез Zubite.bg,
                клиниката ще ти предостави Zubite Care Pass —
                <strong>отстъпки за продукти за орална хигиена</strong>.
            </p>
            <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0;">
                Care Pass не е отстъпка от лечение, не е застраховка и не е абонамент.
            </p>
        </div>

        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:0 0 20px;">
            <p style="color:#0f172a;font-size:14px;font-weight:600;margin:0 0 10px;">Какво следва?</p>
            <p style="color:#475569;font-size:14px;line-height:1.55;margin:0;">
                В момента изграждаме подбрана партньорска мрежа от клиники, затова
                екипът на Zubite.bg преглежда заявките ръчно и се свързва с теб
                с подходящи насоки.
            </p>
        </div>

        <p style="color:#94a3b8;font-size:12px;line-height:1.55;margin:14px 0 0;">
            Получаваш този имейл, защото поиска да го запазиш на страницата с резултата си в Zubite.bg.
            Информацията е ориентировъчна — Zubite не поставя диагноза и не замества преглед при лекар.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">
            — Екипът на <a href="{_h(_admin_url('/'))}" style="color:#0d9488;text-decoration:none;">Zubite.bg</a>
        </p>
    </div>
    """

    try:
        return await _send_email(to_email, subject, html)
    except Exception as e:
        logging.error(f"send_care_pass_summary_email failed: {e}")
        return False
