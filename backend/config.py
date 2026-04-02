from pathlib import Path
from dotenv import load_dotenv
import os
import logging

ROOT_DIR = Path(__file__).parent
STATIC_DIR = ROOT_DIR.parent / 'static'
load_dotenv(ROOT_DIR / '.env')

# MongoDB
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

# JWT
JWT_SECRET = os.environ.get('JWT_SECRET', 'zubite-bg-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Resend Email
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'martennis89@gmail.com')

# Revalidation for Next.js ISR
REVALIDATE_SECRET = os.environ.get('REVALIDATE_SECRET', 'zubite-revalidate-secret-2024')
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

# City mapping
CITIES = {
    "sofia": "София",
    "plovdiv": "Пловдив",
    "varna": "Варна",
    "haskovo": "Хасково"
}

TREATMENT_NAMES = {
    "invisalign": "Инвизалайн",
    "implants": "Зъбни импланти",
    "full_mouth": "Пълна уста"
}

BAND_NAMES = {
    "GREEN": "Зелен (Висок приоритет)",
    "YELLOW": "Жълт (Среден приоритет)",
    "RED": "Червен (Нисък приоритет)"
}
