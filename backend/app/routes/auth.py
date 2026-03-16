from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from ..config import settings
from ..database import get_db
from ..models import UserModel, UserRegister, UserLogin, OnboardingData, UserProfileUpdate
from ..middleware import get_current_user
import bcrypt
import logging

logging.basicConfig(filename='auth_debug.log', level=logging.INFO, force=True)

router = APIRouter()

@router.get("/test_session_set")
async def session_set(request: Request):
    request.session["test_key"] = "test_value"
    return {"message": "session set"}

@router.get("/test_session_get")
async def session_get(request: Request):
    return {"message": request.session.get("test_key")}

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

@router.post("/register")
async def register(user_data: UserRegister):
    db = get_db()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Hash password
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), salt).decode('utf-8')
    
    new_user = UserModel(
        google_id="email_auth",  # Flag for non-google users
        name=user_data.name,
        email=user_data.email,
        password_hash=hashed_password,
        social_links={"linkedin": "", "github": "", "website": ""}, # Initialize defaults
        job_preferences={"desired_roles": [], "locations": [], "min_salary": 0, "remote_preferred": False}
    )
    
    result = await db.users.insert_one(new_user.model_dump(by_alias=True, exclude={"id"}))
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(data={"sub": user_id, "email": user_data.email})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login")
async def login(login_data: UserLogin):
    db = get_db()
    
    user = await db.users.find_one({"email": login_data.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.get("password_hash"):
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account uses Google Login. Please sign in with Google."
        )
    
    # Verify password
    if not bcrypt.checkpw(login_data.password.encode('utf-8'), user["password_hash"].encode('utf-8')):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(data={"sub": str(user["_id"]), "email": user["email"]})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/onboarding")
async def complete_onboarding(
    data: OnboardingData,
    current_user: UserModel = Depends(get_current_user)
):
    db = get_db()
    
    await db.users.update_one(
        {"_id": current_user.id},
        {
            "$set": {
                "target_role": data.target_role,
                "experience_level": data.experience_level,
                "onboarding_completed": True
            }
        }
    )
    
    # Log event
    from ..services.events import log_event
    await log_event("onboarding_completed", user_id=str(current_user.id), metadata=data.model_dump())
    
    return {"status": "success"}

@router.get("/google")
async def google_login(request: Request):
    redirect_uri = request.url_for('google_callback')
    return await oauth.google.authorize_redirect(request, str(redirect_uri))

@router.get("/google/callback")
async def google_callback(request: Request):
    import logging
    logging.info(f"Cookies in callback: {request.cookies}")
    logging.info(f"Headers in callback: {request.headers}")
    logging.info(f"Session in callback: {request.session}")
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

    # Log login event for admin analytics
    from ..services.events import log_event
    await log_event("login", user_id=str(user["_id"]), metadata={"email": user["email"]})
    
    # Redirect to frontend with token
    redirect_url = f"{settings.FRONTEND_URL}/auth/callback?token={access_token}"
    return RedirectResponse(url=redirect_url)



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
    user_dict = normalize_user(current_user)
    
    # Fallsback: if resume_id is missing, try to find the latest uploaded resume
    if not user_dict.get("resume_id"):
        db = get_db()
        from bson import ObjectId
        latest_resume = await db.resumes.find_one(
            {"user_id": user_dict["id"]},
            sort=[("uploaded_at", -1)]
        )
        if latest_resume:
            rid = str(latest_resume["_id"])
            user_dict["resume_id"] = rid
            # Update user doc to avoid repeat lookups
            await db.users.update_one({"_id": ObjectId(user_dict["id"])}, {"$set": {"resume_id": rid}})
            
    return user_dict

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
