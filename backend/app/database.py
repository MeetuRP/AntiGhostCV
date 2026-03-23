from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings
from bson import ObjectId
from fastapi import HTTPException

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db.db = db.client[settings.DB_NAME]
    print(f"Connected to MongoDB: {settings.MONGODB_URL}/{settings.DB_NAME}")

async def close_mongo_connection():
    if db.client:
        try:
            db.client.close()
            print("Closed MongoDB connection")
        except Exception:
            pass
        db.client = None
        db.db = None

def get_db():
    return db.db

def to_object_id(id_str: str) -> ObjectId:
    """Safely convert string to ObjectId, raising 400 if invalid."""
    try:
        if not id_str or id_str in ["undefined", "null"]:
            raise ValueError()
        return ObjectId(id_str)
    except (Exception, ValueError):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid ID format: '{id_str}'"
        )
