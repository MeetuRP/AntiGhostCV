from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from ..config import settings
from ..database import get_db
from ..models import UserModel

router = APIRouter()

oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.JWT_EXPIRATION_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

@router.get("/google")
async def google_login(request: Request):
    redirect_uri = request.url_for('google_callback')
    return await oauth.google.authorize_redirect(request, str(redirect_uri))

@router.get("/google/callback")
async def google_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Authentication failed: {str(e)}")
    
    user_info = token.get('userinfo')
    if not user_info:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not get user info from Google")

    db = get_db()
    user = await db.users.find_one({"google_id": user_info['sub']})
    
    if not user:
        new_user = UserModel(
            google_id=user_info['sub'],
            name=user_info['name'],
            email=user_info['email'],
            profile_image=user_info.get('picture')
        )
        await db.users.insert_one(new_user.model_dump(by_alias=True, exclude={"id"}))
        user = await db.users.find_one({"google_id": user_info['sub']})

    access_token = create_access_token(data={"sub": str(user["_id"]), "email": user["email"]})
    
    # Redirect to frontend with token (simplest for now, can use cookies or query params)
    redirect_url = f"{settings.FRONTEND_URL}/auth/callback?token={access_token}"
    return RedirectResponse(url=redirect_url)

from ..models import UserModel, UserProfileUpdate
from ..middleware import get_current_user

def normalize_user(user_data):
    """Convert MongoDB _id to id for frontend compatibility."""
    if isinstance(user_data, dict):
        d = dict(user_data)
        if '_id' in d:
            d['id'] = str(d.pop('_id'))
        return d
    # Pydantic model
    d = user_data.model_dump(by_alias=True)
    if '_id' in d:
        d['id'] = str(d.pop('_id'))
    return d

@router.get("/me")
async def get_me(current_user: UserModel = Depends(get_current_user)):
    return normalize_user(current_user)

@router.put("/me")
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: UserModel = Depends(get_current_user)
):
    db = get_db()
    
    update_data = profile_data.model_dump(exclude_unset=True)
    if not update_data:
        return normalize_user(current_user)
        
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"_id": current_user.id})
    return normalize_user(updated_user)
