import os

from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGO_URL, DB_NAME

client = AsyncIOMotorClient(
    MONGO_URL,
    appname="zubite-api",
    serverSelectionTimeoutMS=int(os.environ.get("MONGO_SERVER_SELECTION_TIMEOUT_MS", "15000")),
    connectTimeoutMS=int(os.environ.get("MONGO_CONNECT_TIMEOUT_MS", "10000")),
    maxPoolSize=int(os.environ.get("MONGO_MAX_POOL_SIZE", "50")),
)
db = client[DB_NAME]
