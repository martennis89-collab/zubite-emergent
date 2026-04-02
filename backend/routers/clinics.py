from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
import uuid
import secrets
import logging
import resend
import jwt

from database import db
from schemas import (
    ClinicApplicationCreate, ClinicLogin, ClinicUserOut, ClinicTokenResponse,
    ClinicProfileUpdate, ClinicPasswordChange, ClinicLeadStatusUpdate, AdminUser
)
from auth import (
    get_current_user, get_current_clinic, hash_password, verify_password,
    create_clinic_token, security
)
from config import RESEND_API_KEY, SENDER_EMAIL, ADMIN_EMAIL, JWT_SECRET, JWT_ALGORITHM

router = APIRouter()


def _clinic_to_out(clinic: dict) -> ClinicUserOut:
    return ClinicUserOut(
        id=clinic["id"], clinic_name=clinic["clinic_name"], city=clinic["city"],
        email=clinic["email"], phone=clinic["phone"], status=clinic["status"],
        address=clinic.get("address"), website=clinic.get("website"),
        company_name=clinic.get("company_name"), eik=clinic.get("eik"),
        mol=clinic.get("mol"), description=clinic.get("description"),
    )


# ─── Public Application ───────────────────────────────────

@router.post("/clinic-applications")
async def create_clinic_application(application: ClinicApplicationCreate):
    doc = {
        "id": str(uuid.uuid4()),
        **application.model_dump(),
        "status": "pending",
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.clinic_applications.insert_one(doc)

    services = []
    if application.offers_aligners: services.append("Алайнери")
    if application.offers_braces: services.append("Брекети")
    if application.offers_implants: services.append("Импланти")
    treats = []
    if application.treats_adults: treats.append("Възрастни")
    if application.treats_children: treats.append("Деца")

    if RESEND_API_KEY and ADMIN_EMAIL:
        try:
            resend.Emails.send({
                "from": SENDER_EMAIL, "to": ADMIN_EMAIL,
                "subject": f"Нова кандидатура от клиника: {application.clinic_name}",
                "html": f"""
                <h2>Нова кандидатура за партньорство</h2>
                <h3>Клиника</h3>
                <p><strong>Име:</strong> {application.clinic_name}</p>
                <p><strong>Град:</strong> {application.city}</p>
                <p><strong>Адрес:</strong> {application.address}</p>
                <p><strong>Уебсайт:</strong> {application.website or '—'}</p>
                <h3>Контакт</h3>
                <p><strong>Лице:</strong> {application.contact_name}</p>
                <p><strong>Телефон:</strong> {application.phone}</p>
                <p><strong>Имейл:</strong> {application.email}</p>
                <h3>Услуги</h3>
                <p><strong>Предлага:</strong> {', '.join(services) or '—'}</p>
                <p><strong>Третира:</strong> {', '.join(treats) or '—'}</p>
                <h3>Квалификация</h3>
                <p><strong>Години опит:</strong> {application.years_experience or '—'}</p>
                <p><strong>Случаи/месец:</strong> {application.number_of_cases_per_month or '—'}</p>
                <p><strong>Дигитални сканове:</strong> {'Да' if application.do_you_use_digital_scans else 'Не' if application.do_you_use_digital_scans is not None else '—'}</p>
                <h3>Позициониране</h3>
                <p>{application.what_types_of_patients_are_best_for_you or '—'}</p>
                <h3>Операции</h3>
                <p><strong>Средно време за отговор:</strong> {application.average_response_time or '—'}</p>
                """
            })
        except Exception as e:
            logging.error(f"Failed to send clinic application email: {e}")

    return {"status": "ok", "id": doc["id"]}


# ─── Admin Clinic Applications ────────────────────────────

@router.get("/admin/clinic-applications")
async def get_clinic_applications(user: AdminUser = Depends(get_current_user)):
    apps = await db.clinic_applications.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"applications": apps}


@router.patch("/admin/clinic-applications/{app_id}")
async def update_clinic_application(app_id: str, body: dict, user: AdminUser = Depends(get_current_user)):
    allowed = {"status", "notes"}
    update_data = {k: v for k, v in body.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    application = await db.clinic_applications.find_one({"id": app_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    await db.clinic_applications.update_one({"id": app_id}, {"$set": update_data})
    response = {"status": "ok"}

    new_status = update_data.get("status")
    if new_status == "approved" and application.get("status") != "approved":
        existing = await db.clinics.find_one({"email": application["email"]})
        if not existing:
            temp_password = secrets.token_urlsafe(10)
            clinic_doc = {
                "id": str(uuid.uuid4()),
                "clinic_name": application["clinic_name"],
                "city": application["city"],
                "email": application["email"],
                "phone": application["phone"],
                "password_hash": hash_password(temp_password),
                "status": "active",
                "application_id": app_id,
                "address": application.get("address", ""),
                "website": application.get("website"),
                "company_name": None, "eik": None, "mol": None, "description": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.clinics.insert_one(clinic_doc)
            response["clinic_account_created"] = True
            response["clinic_credentials"] = {"email": application["email"], "temporary_password": temp_password}

            if RESEND_API_KEY:
                try:
                    resend.Emails.send({
                        "from": SENDER_EMAIL, "to": application["email"],
                        "subject": "Добре дошли в Zubite.bg — Вашият акаунт е одобрен",
                        "html": f"""
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
                            <h1 style="font-size: 22px; color: #0f172a; margin-bottom: 8px;">Добре дошли в Zubite.bg</h1>
                            <p style="color: #64748b; font-size: 15px; margin-bottom: 24px;">Вашата кандидатура за <strong>{application['clinic_name']}</strong> беше одобрена.</p>
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                                <p style="color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px;">Данни за вход</p>
                                <p style="color: #0f172a; font-size: 15px; margin: 0 0 8px;"><strong>Имейл:</strong> {application['email']}</p>
                                <p style="color: #0f172a; font-size: 15px; margin: 0;"><strong>Парола:</strong> <code style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">{temp_password}</code></p>
                            </div>
                            <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Влезте в партньорския портал и сменете паролата си от секция "Профил".</p>
                            <a href="https://zubite.bg/clinic" style="display: inline-block; background: #0ea5e9; color: white; text-decoration: none; padding: 12px 28px; border-radius: 24px; font-weight: 500; font-size: 14px;">Влез в портала</a>
                            <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">С уважение,<br>Екипът на Zubite.bg</p>
                        </div>
                        """
                    })
                    logging.info(f"Welcome email sent to {application['email']}")
                except Exception as e:
                    logging.error(f"Failed to send welcome email: {e}")

    return response


def _send_password_email(clinic: dict, new_password: str, portal_url: str):
    """Helper to send password reset email"""
    if not RESEND_API_KEY or not clinic.get("email"):
        return False
    try:
        resend.Emails.send({
            "from": SENDER_EMAIL, "to": clinic["email"],
            "subject": "Нова парола за Zubite.bg",
            "html": f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
                <h1 style="font-size: 22px; color: #0f172a; margin-bottom: 8px;">Нова парола</h1>
                <p style="color: #64748b; font-size: 15px; margin-bottom: 24px;">Паролата за акаунта на <strong>{clinic['clinic_name']}</strong> беше обновена.</p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <p style="color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px;">Данни за вход</p>
                    <p style="color: #0f172a; font-size: 15px; margin: 0 0 8px;"><strong>Имейл:</strong> {clinic['email']}</p>
                    <p style="color: #0f172a; font-size: 15px; margin: 0;"><strong>Парола:</strong> <code style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">{new_password}</code></p>
                </div>
                <a href="{portal_url}" style="display: inline-block; background: #0ea5e9; color: white; text-decoration: none; padding: 12px 28px; border-radius: 24px; font-weight: 500; font-size: 14px;">Влез в портала</a>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">С уважение,<br>Екипът на Zubite.bg</p>
            </div>
            """
        })
        return True
    except Exception as e:
        logging.error(f"Failed to send password reset email: {e}")
        return False


def _get_portal_url(request: Request) -> str:
    forwarded = request.headers.get('x-forwarded-host') or request.headers.get('host')
    scheme = request.headers.get('x-forwarded-proto', 'https')
    return f"{scheme}://{forwarded}/clinic" if forwarded else "https://zubite.bg/clinic"


@router.post("/admin/clinic-applications/{app_id}/regenerate-password")
async def regenerate_clinic_password_by_app(app_id: str, request: Request, user: AdminUser = Depends(get_current_user)):
    clinic = await db.clinics.find_one({"application_id": app_id}, {"_id": 0})
    if not clinic:
        raise HTTPException(status_code=404, detail="Няма създаден акаунт за тази кандидатура")
    new_password = secrets.token_urlsafe(10)
    await db.clinics.update_one({"id": clinic["id"]}, {"$set": {"password_hash": hash_password(new_password)}})
    email_sent = _send_password_email(clinic, new_password, _get_portal_url(request))
    return {"status": "ok", "credentials": {"email": clinic["email"], "password": new_password}, "email_sent": email_sent}


# ─── Admin Clinic Accounts ────────────────────────────────

@router.get("/admin/clinic-accounts")
async def admin_list_clinic_accounts(user: AdminUser = Depends(get_current_user)):
    clinics = await db.clinics.find({"password_hash": {"$exists": True}}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(100)
    return {"clinics": clinics}


@router.post("/admin/clinic-accounts/{clinic_id}/reset-password")
async def admin_reset_clinic_password(clinic_id: str, request: Request, user: AdminUser = Depends(get_current_user)):
    clinic = await db.clinics.find_one({"id": clinic_id, "password_hash": {"$exists": True}}, {"_id": 0})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic account not found")
    new_password = secrets.token_urlsafe(10)
    await db.clinics.update_one({"id": clinic_id}, {"$set": {"password_hash": hash_password(new_password)}})
    email_sent = _send_password_email(clinic, new_password, _get_portal_url(request))
    return {"status": "ok", "credentials": {"email": clinic["email"], "password": new_password}, "email_sent": email_sent}


# ─── Admin Lead → Clinic Assignment ───────────────────────

@router.patch("/admin/leads/{lead_id}/assign-clinic")
async def admin_assign_lead_to_clinic(lead_id: str, body: dict, user: AdminUser = Depends(get_current_user)):
    clinic_id = body.get("clinic_id")
    if not clinic_id:
        raise HTTPException(status_code=400, detail="clinic_id is required")
    clinic = await db.clinics.find_one({"id": clinic_id, "password_hash": {"$exists": True}}, {"_id": 0, "clinic_name": 1})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic account not found")
    result = await db.leads.update_one({"id": lead_id}, {"$set": {"assigned_clinic_id": clinic_id, "clinic_lead_status": "new"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"status": "ok", "assigned_to": clinic.get("clinic_name")}


# ─── Clinic Auth & Dashboard ──────────────────────────────

@router.post("/clinic/login")
async def clinic_login(data: ClinicLogin):
    email = data.email.strip().lower()
    clinic = await db.clinics.find_one({"email": email}, {"_id": 0})
    if not clinic or not clinic.get("password_hash"):
        raise HTTPException(status_code=401, detail="Невалидни данни за вход")
    if not verify_password(data.password, clinic["password_hash"]):
        raise HTTPException(status_code=401, detail="Невалидни данни за вход")
    if clinic.get("status") == "paused":
        raise HTTPException(status_code=403, detail="Акаунтът е спрян")
    token = create_clinic_token(clinic["id"], clinic["email"])
    return ClinicTokenResponse(access_token=token, user=_clinic_to_out(clinic))


@router.get("/clinic/profile")
async def clinic_profile(clinic=Depends(get_current_clinic)):
    return _clinic_to_out(clinic)


@router.patch("/clinic/profile")
async def update_clinic_profile(data: ClinicProfileUpdate, clinic=Depends(get_current_clinic)):
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.clinics.update_one({"id": clinic["id"]}, {"$set": update_fields})
    updated = await db.clinics.find_one({"id": clinic["id"]}, {"_id": 0, "password_hash": 0})
    return _clinic_to_out(updated)


@router.post("/clinic/change-password")
async def clinic_change_password(data: ClinicPasswordChange, credentials=Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "clinic":
            raise HTTPException(status_code=403, detail="Not a clinic user")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    clinic = await db.clinics.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not clinic:
        raise HTTPException(status_code=401, detail="Clinic not found")
    if not verify_password(data.current_password, clinic["password_hash"]):
        raise HTTPException(status_code=400, detail="Текущата парола е грешна")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Паролата трябва да е поне 6 символа")
    await db.clinics.update_one({"id": clinic["id"]}, {"$set": {"password_hash": hash_password(data.new_password)}})
    return {"status": "ok", "message": "Паролата е променена успешно"}


@router.get("/clinic/dashboard")
async def clinic_dashboard(clinic=Depends(get_current_clinic)):
    clinic_id = clinic["id"]
    total = await db.leads.count_documents({"assigned_clinic_id": clinic_id})
    contacted = await db.leads.count_documents({"assigned_clinic_id": clinic_id, "clinic_lead_status": "contacted"})
    no_response = await db.leads.count_documents({"assigned_clinic_id": clinic_id, "clinic_lead_status": "no_response"})
    return {"total_leads": total, "leads_contacted": contacted, "leads_pending": total - contacted - no_response, "leads_no_response": no_response}


@router.get("/clinic/leads")
async def clinic_leads(clinic=Depends(get_current_clinic)):
    leads = await db.leads.find(
        {"assigned_clinic_id": clinic["id"]},
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1, "treatment_type": 1,
         "clinic_lead_status": 1, "created_at": 1, "city_slug": 1, "band": 1, "score_total": 1}
    ).sort("created_at", -1).to_list(500)
    for lead in leads:
        if not lead.get("clinic_lead_status"):
            lead["clinic_lead_status"] = "new"
    return {"leads": leads}


@router.patch("/clinic/leads/{lead_id}/status")
async def update_clinic_lead_status(lead_id: str, data: ClinicLeadStatusUpdate, clinic=Depends(get_current_clinic)):
    if data.status not in ("new", "contacted", "no_response"):
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.leads.update_one(
        {"id": lead_id, "assigned_clinic_id": clinic["id"]},
        {"$set": {"clinic_lead_status": data.status}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found or not assigned to your clinic")
    return {"status": "ok"}
