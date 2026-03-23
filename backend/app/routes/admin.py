from fastapi import APIRouter, Depends
from ..middleware import require_admin
from ..models import UserModel, AdminUserUpdate
from ..database import get_db, to_object_id
from bson import ObjectId
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class PlanChangeRequest(BaseModel):
    user_id: str
    plan: str
    expiry: Optional[datetime] = None

@router.get("/stats")
async def get_stats(period: str = "30d", admin: UserModel = Depends(require_admin)):
    """Overview stats with optional period filtering (today, 7d, 30d)."""
    db = get_db()
    
    # Base totals (all time)
    total_users = await db.users.count_documents({})
    total_resumes = await db.resumes.count_documents({})
    total_evaluations = await db.analysis_results.count_documents({})
    total_visits = await db.site_events.count_documents({"event_type": "site_visit"})
    total_logins = await db.site_events.count_documents({"event_type": "login"})

    # Period-specific stats
    now = datetime.utcnow()
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "7d":
        start_date = now - timedelta(days=7)
    else:  # default 30d
        start_date = now - timedelta(days=30)

    period_filter = {"timestamp": {"$gte": start_date}}
    
    p_logins = await db.site_events.count_documents({"event_type": "login", **period_filter})
    p_visits = await db.site_events.count_documents({"event_type": "site_visit", **period_filter})
    p_resumes = await db.resumes.count_documents({"uploaded_at": {"$gte": start_date}})
    p_evals = await db.analysis_results.count_documents({"created_at": {"$gte": start_date}})

    # AI Aggregate Stats
    ai_pipeline = [
        {"$group": {
            "_id": None,
            "total_calls": {"$sum": "$ai_usage.total_api_calls"},
            "total_input": {"$sum": "$ai_usage.total_input_tokens"},
            "total_output": {"$sum": "$ai_usage.total_output_tokens"},
            "total_cost": {"$sum": "$ai_usage.estimated_cost"},
        }}
    ]
    ai_stats_result = await db.users.aggregate(ai_pipeline).to_list(length=1)
    ai_totals = ai_stats_result[0] if ai_stats_result else {
        "total_calls": 0, "total_input": 0, "total_output": 0, "total_cost": 0
    }

    return {
        "totals": {
            "users": total_users,
            "resumes": total_resumes,
            "evaluations": total_evaluations,
            "visits": total_visits,
            "logins": total_logins,
            "ai": ai_totals
        },
        "period": {
            "logins": p_logins,
            "visits": p_visits,
            "resumes": p_resumes,
            "evaluations": p_evals,
        }
    }


@router.get("/users")
async def get_all_users(admin: UserModel = Depends(require_admin)):
    """Full user list with resume and evaluation counts."""
    db = get_db()
    users = await db.users.find().to_list(length=500)

    result = []
    for u in users:
        user_id = str(u["_id"])
        resume_count = await db.resumes.count_documents({"user_id": user_id})
        eval_count = await db.analysis_results.count_documents({"user_id": user_id})

        result.append({
            "id": user_id,
            "name": u.get("name", ""),
            "email": u.get("email", ""),
            "profile_image": u.get("profile_image"),
            "is_admin": u.get("is_admin", False),
            "resume_count": resume_count,
            "evaluation_count": eval_count,
            "bio": u.get("bio"),
            "social_links": u.get("social_links", {}),
            "job_preferences": u.get("job_preferences", {}),
            "last_parsed_profile": u.get("last_parsed_profile"),
            "plan": u.get("plan", "starter"),
            "plan_expiry": u.get("plan_expiry", "").isoformat() if u.get("plan_expiry") else None,
            "usage": u.get("usage", {"resume_evaluations": 0, "jd_scans_used": 0, "fix_it_used": 0}),
            "ai_usage": u.get("ai_usage", {"total_api_calls": 0, "total_input_tokens": 0, "total_output_tokens": 0, "estimated_cost": 0}),
            "plan_limits": u.get("plan_limits", {"jd_scans": 2, "fix_it_uses": 0, "cover_letters": 0}),
            "created_at": u.get("created_at", "").isoformat() if u.get("created_at") else None,
        })

    return result


@router.get("/resumes")
async def get_all_resumes(admin: UserModel = Depends(require_admin)):
    """All resumes with user info."""
    db = get_db()
    resumes = await db.resumes.find().to_list(length=500)

    result = []
    for r in resumes:
        user = await db.users.find_one({"_id": r.get("user_id")}) if r.get("user_id") else None
        # user_id might be stored as string, try lookup
        if not user:
            from bson import ObjectId
            try:
                user = await db.users.find_one({"_id": ObjectId(r.get("user_id", ""))})
            except Exception:
                user = None

        result.append({
            "id": str(r["_id"]),
            "user_name": user.get("name", "Unknown") if user else "Unknown",
            "user_email": user.get("email", "") if user else "",
            "skills_count": len(r.get("extracted_data", {}).get("skills", [])),
            "skills": r.get("extracted_data", {}).get("skills", []),
            "uploaded_at": r.get("uploaded_at", "").isoformat() if r.get("uploaded_at") else None,
        })

    return result


@router.get("/evaluations")
async def get_all_evaluations(admin: UserModel = Depends(require_admin)):
    """All evaluations with user info and scores."""
    db = get_db()
    evals = await db.analysis_results.find().to_list(length=500)

    result = []
    for e in evals:
        from bson import ObjectId
        user = None
        try:
            user = await db.users.find_one({"_id": ObjectId(e.get("user_id", ""))})
        except Exception:
            pass

        result.append({
            "id": str(e["_id"]),
            "user_name": user.get("name", "Unknown") if user else "Unknown",
            "user_email": user.get("email", "") if user else "",
            "job_title": e.get("job_title", ""),
            "ats_score": e.get("ats_score", 0),
            "skills_matched": len(e.get("skills_matched", [])),
            "missing_skills": len(e.get("missing_skills", [])),
            "missing_skills_list": e.get("missing_skills", []),
            "skills_matched_list": e.get("skills_matched", []),
            "suggestions": e.get("suggestions", []),
            "created_at": e.get("created_at", "").isoformat() if e.get("created_at") else None,
        })

    return result


@router.get("/industry")
async def get_industry_report(admin: UserModel = Depends(require_admin)):
    """Role/industry breakdown from suggested_roles across all resumes."""
    db = get_db()
    resumes = await db.resumes.find().to_list(length=500)

    role_counts: dict = {}
    for r in resumes:
        roles = r.get("extracted_data", {}).get("suggested_roles", [])
        for role in roles:
            role_counts[role] = role_counts.get(role, 0) + 1

    # Also count from user job preferences
    users = await db.users.find().to_list(length=500)
    for u in users:
        roles = u.get("job_preferences", {}).get("desired_roles", [])
        for role in roles:
            role_counts[role] = role_counts.get(role, 0) + 1

    # Sort by count descending
    sorted_roles = sorted(role_counts.items(), key=lambda x: x[1], reverse=True)

    return {
        "roles": [{"role": r, "count": c} for r, c in sorted_roles],
        "total_users": await db.users.count_documents({}),
    }


@router.get("/skills-report")
async def get_skills_report(admin: UserModel = Depends(require_admin)):
    """Most common skills across all resumes."""
    db = get_db()
    resumes = await db.resumes.find().to_list(length=500)

    skill_counts: dict = {}
    for r in resumes:
        skills = r.get("extracted_data", {}).get("skills", [])
        for skill in skills:
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

    sorted_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)

    return {
        "skills": [{"skill": s, "count": c} for s, c in sorted_skills[:30]],
        "total_unique_skills": len(skill_counts),
    }


@router.get("/score-distribution")
async def get_score_distribution(admin: UserModel = Depends(require_admin)):
    """ATS score distribution in ranges."""
    db = get_db()

    ranges = [
        {"label": "0-25%", "min": 0, "max": 25},
        {"label": "26-50%", "min": 26, "max": 50},
        {"label": "51-75%", "min": 51, "max": 75},
        {"label": "76-100%", "min": 76, "max": 100},
    ]

    distribution = []
    for r in ranges:
        count = await db.analysis_results.count_documents({
            "ats_score": {"$gte": r["min"], "$lte": r["max"]}
        })
        distribution.append({"label": r["label"], "count": count})

    return {"distribution": distribution}


@router.get("/activity")
async def get_activity_timeline(admin: UserModel = Depends(require_admin)):
    """Daily activity counts for the last 30 days (including today)."""
    db = get_db()
    # Use today at midnight as the end of the 30-day window
    today_end = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999)
    start_date = (today_end - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)

    events = await db.site_events.find({
        "timestamp": {"$gte": start_date}
    }).to_list(length=20000)

    # Group by day and event_type
    daily: dict = {}
    for e in events:
        ts = e.get("timestamp")
        if not ts:
            continue
        day = ts.strftime("%Y-%m-%d")
        etype = e.get("event_type", "unknown")

        if day not in daily:
            daily[day] = {"login": 0, "resume_upload": 0, "score_check": 0, "site_visit": 0}
        if etype in daily[day]:
            daily[day][etype] += 1

    # Fill in all 31 days (30 days ago to today)
    result = []
    for i in range(31):
        day = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        entry = daily.get(day, {"login": 0, "resume_upload": 0, "score_check": 0, "site_visit": 0})
        result.append({"date": day, **entry})

    return {"timeline": result}


@router.get("/visitors")
async def get_visitors_report(admin: UserModel = Depends(require_admin)):
    """Detailed report of recent site visits."""
    db = get_db()
    visits = await db.site_events.find(
        {"event_type": "site_visit"}
    ).sort("timestamp", -1).limit(500).to_list(length=500)

    result = []
    for v in visits:
        result.append({
            "id": str(v["_id"]),
            "ip": v.get("metadata", {}).get("ip", "unknown"),
            "user_agent": v.get("metadata", {}).get("user_agent", "unknown"),
            "timestamp": v.get("timestamp").isoformat() if v.get("timestamp") else None
        })

    return result


@router.get("/logins")
async def get_logins_report(admin: UserModel = Depends(require_admin)):
    """Detailed report of recent logins."""
    db = get_db()
    logins = await db.site_events.find(
        {"event_type": "login"}
    ).sort("timestamp", -1).limit(500).to_list(length=500)

    result = []
    for l in logins:
        from bson import ObjectId
        user = None
        try:
            user = await db.users.find_one({"_id": ObjectId(l.get("user_id", ""))})
        except Exception:
            pass

        result.append({
            "id": str(l["_id"]),
            "user_name": user.get("name", "Unknown") if user else "Unknown",
            "user_email": user.get("email", "Unknown") if user else "Unknown",
            "ip": l.get("metadata", {}).get("ip", "unknown"),
            "timestamp": l.get("timestamp").isoformat() if l.get("timestamp") else None
        })

    return result


@router.patch("/users/{user_id}")
async def update_user(user_id: str, update_data: AdminUserUpdate, admin: UserModel = Depends(require_admin)):
    """Update user core details and admin status."""
    db = get_db()
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        return {"message": "No fields to update"}
        
    try:
        oid = to_object_id(user_id)
        result = await db.users.update_one({"_id": oid}, {"$set": update_dict})
        if result.matched_count == 0:
            return {"error": "User not found"}
        return {"message": "User updated successfully"}
    except HTTPException as e:
        return {"error": e.detail}
    except Exception as e:
        return {"error": str(e)}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: UserModel = Depends(require_admin)):
    """Delete user and all their associated data."""
    db = get_db()
    try:
        oid = to_object_id(user_id)
        
        # 1. Delete user record
        user_result = await db.users.delete_one({"_id": oid})
        if user_result.deleted_count == 0:
            return {"error": "User not found"}
            
        # 2. Delete associated data
        # user_id is stored as string in resumes/evaluations
        await db.resumes.delete_many({"user_id": user_id})
        await db.analysis_results.delete_many({"user_id": user_id})
        
        return {"message": "User and all associated data deleted"}
    except HTTPException as e:
        return {"error": e.detail}
    except Exception as e:
        return {"error": str(e)}

@router.post("/change-plan")
async def change_user_plan(req: PlanChangeRequest, admin: UserModel = Depends(require_admin)):
    """Change a user's plan, update limits, and reset usage."""
    db = get_db()
    
    # Define limits based on plan type
    # For now, assigning arbitrary generous limits for paid passes, and defaults for starter
    plan_limits = {
        "jd_scans": 2,
        "fix_it_uses": 0,
        "cover_letters": 0
    }
    
    if req.plan == "24_hour_pass":
        plan_limits = {"jd_scans": 50, "fix_it_uses": 50, "cover_letters": 10}
        if not req.expiry:
            req.expiry = datetime.utcnow() + timedelta(days=1)
    elif req.plan == "season_pass":
        plan_limits = {"jd_scans": 500, "fix_it_uses": 500, "cover_letters": 100}
        if not req.expiry:
            req.expiry = datetime.utcnow() + timedelta(days=90)
    elif req.plan == "premium":
        plan_limits = {"jd_scans": 9999, "fix_it_uses": 9999, "cover_letters": 9999}
        if not req.expiry:
            req.expiry = datetime.utcnow() + timedelta(days=365*10)
            
    try:
        oid = to_object_id(req.user_id)
        update_data = {
            "plan": req.plan,
            "plan_start": datetime.utcnow(),
            "plan_expiry": req.expiry,
            "plan_limits": plan_limits,
            "usage": {
                "resume_evaluations": 0,
                "jd_scans_used": 0,
                "fix_it_used": 0
            }
        }
        
        result = await db.users.update_one({"_id": oid}, {"$set": update_data})
        if result.matched_count == 0:
            return {"error": "User not found"}
        return {"message": "Plan changed successfully and usage reset", "new_plan": req.plan}
    except HTTPException as e:
        return {"error": e.detail}
    except Exception as e:
        return {"error": str(e)}

