from pathlib import Path
from dotenv import load_dotenv
import os
import logging

ROOT_DIR = Path(__file__).parent
STATIC_DIR = ROOT_DIR.parent / 'static'
load_dotenv(ROOT_DIR / '.env')

# Environment detection (canonical: APP_ENV; legacy fallbacks: ENVIRONMENT, NODE_ENV).
# Default 'development' so a missing var never accidentally enables prod guards.
APP_ENV = (
    os.environ.get('APP_ENV')
    or os.environ.get('ENVIRONMENT')
    or os.environ.get('NODE_ENV')
    or 'development'
).lower().strip()
IS_PRODUCTION = APP_ENV == 'production'

# MongoDB
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

# JWT - fail fast if missing or weak
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET or len(JWT_SECRET) < 24:
    raise RuntimeError(
        "JWT_SECRET must be set and at least 24 characters long (≥144 bits of entropy). "
        "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Resend Email
#
# Fails fast in production rather than silently deploying a build where
# every email send is a no-op — that includes patient OTP codes, which are
# the *only* login path for Общност accounts (no password fallback exists).
# A missing key here means patients can never log in, with no visible error
# except a support inbox full of "I never got my code."
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
if IS_PRODUCTION and not RESEND_API_KEY:
    raise RuntimeError(
        "RESEND_API_KEY must be set in production. Patient OTP login "
        "(Общност accounts have no password fallback) and every other "
        "transactional email depend on it."
    )
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
# Zubite admin notification mailbox — single source of truth for any
# "new lead / new booking / Care Pass unlocked" alert sent to the
# Zubite team. Priority order:
#   1. ZUBITE_ADMIN_NOTIFICATION_EMAIL (canonical, added June 2026)
#   2. ADMIN_EMAIL (legacy)
#   3. info@zubite.bg (safe default; never a personal address)
ADMIN_EMAIL = (
    os.environ.get('ZUBITE_ADMIN_NOTIFICATION_EMAIL')
    or os.environ.get('ADMIN_EMAIL')
    or 'info@zubite.bg'
)

# Revalidation for Next.js ISR - fail fast if missing
REVALIDATE_SECRET = os.environ.get('REVALIDATE_SECRET')
if not REVALIDATE_SECRET or len(REVALIDATE_SECRET) < 16:
    if IS_PRODUCTION:
        raise RuntimeError(
            "REVALIDATE_SECRET must be set and at least 16 characters long in production. "
            "Use the same value on Render and Vercel."
        )
    # Keep local development bootable, but make the limitation explicit.
    import secrets as _secrets
    REVALIDATE_SECRET = _secrets.token_urlsafe(32)
    logging.warning(
        "REVALIDATE_SECRET not set - generated an ephemeral development value. "
        "Next.js ISR webhooks require the same configured value in both apps."
    )
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Object Storage — Cloudflare R2 (S3-compatible).
#
# Replaces Emergent's proprietary object store, which was the last
# runtime dependency on the platform we are migrating off. R2 is private:
# objects are never served directly from the bucket, only proxied through
# `GET /api/files/{id}`, so no public bucket or custom domain is needed
# and patient-uploaded files can never be fetched by guessing a URL.
#
# R2_ENDPOINT is the account-level S3 endpoint WITHOUT the bucket, e.g.
# https://<account-id>.r2.cloudflarestorage.com — the bucket is passed
# separately as R2_BUCKET. Cloudflare shows the two joined together in
# the dashboard; `init_storage` splits a trailing bucket back off if it
# is left on, since pasting the dashboard value verbatim is the obvious
# mistake to make.
R2_ENDPOINT = (os.environ.get('R2_ENDPOINT') or '').strip().rstrip('/')
R2_BUCKET = (os.environ.get('R2_BUCKET') or '').strip()
R2_ACCESS_KEY_ID = os.environ.get('R2_ACCESS_KEY_ID')
R2_SECRET_ACCESS_KEY = os.environ.get('R2_SECRET_ACCESS_KEY')
if IS_PRODUCTION and not all((R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)):
    raise RuntimeError(
        "Cloudflare R2 must be fully configured in production: R2_ENDPOINT, "
        "R2_BUCKET, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required."
    )
APP_NAME = "zubite-bg"

# Production URL
PRODUCTION_URL = os.environ.get('PRODUCTION_URL', 'https://zubite.bg')

# Audit logging (Phase 3 — Batch D1)
# Set to "0" to disable writes to admin_audit_logs (kill switch).
# Default is enabled.
AUDIT_LOGS_ENABLED = os.environ.get('AUDIT_LOGS_ENABLED', '1') != '0'

# Web Push (VAPID) — Общност "follow a thread" notifications.
# Optional like RESEND_API_KEY: unset locally is a no-op (push.push_enabled()
# returns False and sends are skipped with a warning), not a hard failure.
# Generate a pair with: python -m scripts.generate_vapid_keys
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_CLAIM_EMAIL = os.environ.get('VAPID_CLAIM_EMAIL', 'info@zubite.bg')

# Public homepage counter. This starting value covers confirmed consultations
# that predate the automated booking collections; live records supersede it.
HOME_TRUST_CONSULTATIONS_BASELINE = max(
    0,
    int(os.environ.get('HOME_TRUST_CONSULTATIONS_BASELINE', '12')),
)

# Auth cookie configuration (P2 — Batch E1)
# httpOnly cookies as an alternative to localStorage Bearer tokens. During E1
# Bearer tokens remain fully supported; cookies are additive.
AUTH_COOKIE_SECURE = os.environ.get('AUTH_COOKIE_SECURE', '1') != '0'
AUTH_COOKIE_SAMESITE = (os.environ.get('AUTH_COOKIE_SAMESITE') or 'lax').strip().lower()
if AUTH_COOKIE_SAMESITE not in {'lax', 'strict', 'none'}:
    AUTH_COOKIE_SAMESITE = 'lax'
AUTH_COOKIE_NAME_ADMIN = os.environ.get('AUTH_COOKIE_NAME_ADMIN', 'zubite_admin_session').strip() or 'zubite_admin_session'
AUTH_COOKIE_NAME_CLINIC = os.environ.get('AUTH_COOKIE_NAME_CLINIC', 'zubite_clinic_session').strip() or 'zubite_clinic_session'
AUTH_COOKIE_NAME_PATIENT = os.environ.get('AUTH_COOKIE_NAME_PATIENT', 'zubite_patient_session').strip() or 'zubite_patient_session'
AUTH_COOKIE_MAX_AGE_SECONDS = JWT_EXPIRATION_HOURS * 3600
# Reserved for E4 — when True, drop Bearer-header support entirely. Not enforced in E1.
AUTH_REQUIRE_COOKIE = os.environ.get('AUTH_REQUIRE_COOKIE', '0') == '1'

# Patient (Общност) sessions get their own, much longer lifetime — 24h
# (the admin/clinic window) is wrong for "come back in a few days and check
# the answer to my question": by then the session would already have
# expired, forcing a fresh OTP round-trip just to view /profile. Patients
# have no elevated access (can't touch other patients' data or admin/clinic
# tooling), so a long-lived "stay logged in" window is the safe default,
# matching how most consumer Q&A/forum products behave.
PATIENT_JWT_EXPIRATION_HOURS = int(os.environ.get('PATIENT_JWT_EXPIRATION_HOURS', 24 * 30))
AUTH_COOKIE_MAX_AGE_SECONDS_PATIENT = PATIENT_JWT_EXPIRATION_HOURS * 3600

# Initialize resend
import resend as _resend
if RESEND_API_KEY:
    _resend.api_key = RESEND_API_KEY

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("zubite")

# City mapping — top 10 Bulgarian cities for lead routing & email labels
CITIES = {
    "sofia": "София",
    "plovdiv": "Пловдив",
    "varna": "Варна",
    "burgas": "Бургас",
    "ruse": "Русе",
    "stara-zagora": "Стара Загора",
    "pleven": "Плевен",
    "sliven": "Сливен",
    "dobrich": "Добрич",
    "shumen": "Шумен",
    "haskovo": "Хасково",
}

# Sofia neighbourhoods only — no other city on the platform is large
# enough to have meaningful sub-city districts. Slug -> Cyrillic label,
# same shape/convention as CITIES above.
SOFIA_DISTRICTS = {
    "lozenets": "Лозенец", "mladost": "Младост", "lyulin": "Люлин",
    "druzhba": "Дружба", "iztok": "Изток", "izgrev": "Изгрев",
    "studentski-grad": "Студентски град", "vitosha": "Витоша",
    "boyana": "Бояна", "center": "Център", "krasno-selo": "Красно село",
    "ovcha-kupel": "Овча купел", "nadezhda": "Надежда", "poduyane": "Подуяне",
}

TREATMENT_NAMES = {
    "invisalign": "Инвизалайн",
    "implants": "Зъбни импланти",
    "full_mouth": "Пълна уста",
    "diagnostic_quiz": "Диагностичен тест",
    "orthodontics": "Ортодонтия",
}

BAND_NAMES = {
    "GREEN": "Зелен (Висок приоритет)",
    "YELLOW": "Жълт (Среден приоритет)",
    "RED": "Червен (Нисък приоритет)"
}
