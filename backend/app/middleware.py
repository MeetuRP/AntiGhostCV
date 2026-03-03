from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from .config import settings
from .database import get_db
from .models import UserModel
from bson import ObjectId

security = HTTPBearer()

async def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)) -> UserModel:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
        
    user_dict = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user_dict:
        raise credentials_exception
    
    # Return model directly; PyObjectId handles conversion
    return UserModel(**user_dict)
