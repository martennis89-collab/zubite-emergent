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
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'martennis89@gmail.com')

# Revalidation for Next.js ISR - fail fast if missing
REVALIDATE_SECRET = os.environ.get('REVALIDATE_SECRET')
if not REVALIDATE_SECRET or len(REVALIDATE_SECRET) < 16:
    # Generate ephemeral one so server still boots, but log warning so revalidation must be re-configured
    import secrets as _secrets
    REVALIDATE_SECRET = _secrets.token_urlsafe(32)
    logging.warning(
        "REVALIDATE_SECRET not set - generated ephemeral one. "
        "Next.js ISR webhooks will fail until REVALIDATE_SECRET is configured in both backend/.env and frontend/.env"
    )
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Object Storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
APP_NAME = "zubite-bg"

# Twilio / ElevenLabs
TWILIO_PHONE_NUMBER_ID = os.environ.get('ELEVENLABS_TWILIO_PHONE_ID')
CALL_TIMEOUT_MINUTES = 5

# Production URL
PRODUCTION_URL = os.environ.get('PRODUCTION_URL', 'https://zubite.bg')

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
