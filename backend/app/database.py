from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db.db = db.client[settings.DB_NAME]
    print(f"Connected to MongoDB: {settings.MONGODB_URL}/{settings.DB_NAME}")

async def close_mongo_connection():
    db.client.close()
    print("Closed MongoDB connection")

def get_db():
    return db.db
