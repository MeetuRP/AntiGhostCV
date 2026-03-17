from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime, timedelta

from ..database import get_db
from ..models import UserModel
from ..middleware import get_current_user

router = APIRouter()

class UpgradePlanRequest(BaseModel):
    plan: str

# Configured Plan Limits
PLAN_LIMITS = {
    "starter": {"jd_scans": 2, "fix_it_uses": 5, "cover_letters": 0},
    "24_hour_pass": {"jd_scans": 10, "fix_it_uses": 20, "cover_letters": 0},
    "season_pass": {"jd_scans": 50, "fix_it_uses": 100, "cover_letters": 0},
    "premium": {"jd_scans": -1, "fix_it_uses": -1, "cover_letters": -1}
}

@router.post("/upgrade-plan")
async def upgrade_plan(request: UpgradePlanRequest, current_user: UserModel = Depends(get_current_user)):
    db = get_db()
    
    plan_id = request.plan
    if plan_id not in PLAN_LIMITS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan selected"
        )
        
    limits = PLAN_LIMITS[plan_id]
    
    # Reset usage and apply limits
    update_data = {
        "plan": plan_id,
        "plan_limits": limits,
        "usage.jd_scans_used": 0,
        "usage.fix_it_used": 0,
        "usage.cover_letters_generated": 0,
        "plan_start": datetime.utcnow()
    }
    
    if plan_id == "24_hour_pass":
        update_data["plan_expiry"] = datetime.utcnow() + timedelta(days=1)
    elif plan_id == "season_pass":
        update_data["plan_expiry"] = datetime.utcnow() + timedelta(days=90)
    else:
        update_data["plan_expiry"] = None
        
    result = await db.users.update_one(
        {"_id": current_user.id},
        {"$set": update_data}
    )
    
    # Log event
    from ..services.events import log_event
    await log_event("plan_upgraded", user_id=str(current_user.id), metadata={"new_plan": plan_id})
        
    return {"message": "Plan successfully upgraded", "plan": plan_id, "limits": limits}
