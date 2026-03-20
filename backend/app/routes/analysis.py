from fastapi import APIRouter, Depends, HTTPException
from typing import List
from ..middleware import get_current_user
from ..models import UserModel, AnalysisResultModel, ResumeModel
from ..database import get_db
from bson import ObjectId
import re

router = APIRouter()

@router.post("/evaluate", response_model=AnalysisResultModel)
async def evaluate_resume(
    resume_id: str,
    job_title: str,
    job_description: str,
    current_user: UserModel = Depends(get_current_user)
):
    # Enforce JD Scan limits (-1 means unlimited)
    if current_user.plan_limits.jd_scans != -1 and current_user.usage.jd_scans_used >= current_user.plan_limits.jd_scans:
        raise HTTPException(
            status_code=403, 
            detail={"message": "Your plan limit has been reached", "upgrade_required": True}
        )

    db = get_db()
    
    # Get resume
    resume_data = await db.resumes.find_one({
        "_id": ObjectId(resume_id),
        "user_id": str(current_user.id)
    })
    
    if not resume_data:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume = ResumeModel(**{**resume_data, "_id": str(resume_data["_id"])})
    
    # Basic Analysis Logic (Rule-based for now)
    resume_skills = set(resume.extracted_data.skills)
    
    # Extract potential skills from JD (very simple for now)
    # In a real app, this would use the same skill DB or LLM
    jd_skills_matched = []
    jd_missing_skills = []
    
    # For now, let's just assume we want some keywords from the JD
    # We'll use a simple approach: if a skill in our DB is in the JD, it's a "required" skill
    from ..services.parser import SKILLS_DB
    
    required_skills = []
    for skill in SKILLS_DB:
        if re.search(rf'\b{re.escape(skill)}\b', job_description, re.IGNORECASE):
            required_skills.append(skill)
    
    if not required_skills:
        # Fallback if no skills detected in JD - use some defaults or just compare against all resume skills
        ats_score = 70 # Default base score
    else:
        # Exact matching
        matched_exact = [s for s in required_skills if s in resume_skills]
        
        # Semantic matching for missing skills
        missing_exact = [s for s in required_skills if s not in resume_skills]
        matched_semantic = []
        
        if missing_exact and resume_skills:
            try:
                from sentence_transformers import SentenceTransformer, util
                # Lazy load model (in production this should be cached globally)
                global_st_model = getattr(router, 'st_model', None)
                if global_st_model is None:
                    # Using a tiny, fast model
                    global_st_model = SentenceTransformer('all-MiniLM-L6-v2')
                    router.st_model = global_st_model
                
                # Encode required missing skills and resume skills
                req_embeddings = global_st_model.encode(missing_exact, convert_to_tensor=True)
                res_embeddings = global_st_model.encode(list(resume_skills), convert_to_tensor=True)
                
                # Compute cosine similarities
                cosine_scores = util.cos_sim(req_embeddings, res_embeddings)
                
                for i in range(len(missing_exact)):
                    # Find highest similarity
                    max_score = cosine_scores[i].max().item()
                    if max_score > 0.65: # Threshold for semantic similarity
                        matched_semantic.append(missing_exact[i])
            except Exception as e:
                print(f"Semantic matching failed: {e}")
        
        matched = list(set(matched_exact + matched_semantic))
        jd_skills_matched = matched
        jd_missing_skills = [s for s in required_skills if s not in matched]
        
        # Calculate score based on matched vs required
        ats_score = int((len(matched) / len(required_skills)) * 100)

    # Generate suggestions
    suggestions = []
    if jd_missing_skills:
        suggestions.append(f"Try to add more technical skills mentioned in the JD: {', '.join(jd_missing_skills[:3])}")
    
    if ats_score < 70:
        suggestions.append("Your resume matches less than 70% of the job requirements. Tailor your skills section.")
    else:
        suggestions.append("Strong match! Ensure your experience descriptions highlight these key skills.")

    analysis = AnalysisResultModel(
        user_id=str(current_user.id),
        resume_id=resume_id,
        job_title=job_title,
        job_description=job_description,
        ats_score=ats_score,
        skills_matched=jd_skills_matched,
        missing_skills=jd_missing_skills,
        summary=f"Your resume has a {ats_score}% match with the {job_title} position.",
        suggestions=suggestions
    )
    
    result = await db.analysis_results.insert_one(analysis.model_dump(by_alias=True, exclude={"id"}))

    # ── Auto-save to evaluations collection ──────────────────────────
    resume_name = (
        resume.extracted_data.name
        or resume.extracted_data.email
        or "Untitled Resume"
    )

    from ..models import EvaluationModel
    evaluation = EvaluationModel(
        user_id=str(current_user.id),
        resume_id=resume_id,
        resume_name=resume_name,
        job_title=job_title,
        job_description=job_description,
        ats_score=ats_score,
        skills_matched=jd_skills_matched,
        missing_skills=jd_missing_skills,
        summary=analysis.summary,
        suggestions=suggestions,
        accepted_edits=resume_data.get("accepted_edits", {}),
        impact_scores=resume_data.get("impact_scores", {}),
    )
    eval_result = await db.evaluations.insert_one(
        evaluation.model_dump(by_alias=True, exclude={"id"})
    )

    # Log score check event for admin analytics
    from ..services.events import log_event
    await log_event("score_check", user_id=str(current_user.id), metadata={"job_title": job_title, "ats_score": ats_score})
    
    # Increment usage counters
    from ..services.usage import increment_user_usage
    await increment_user_usage(str(current_user.id), "resume_evaluations")
    await increment_user_usage(str(current_user.id), "jd_scans_used")
    
    # Return a plain dict with string 'id' for frontend
    return {
        "id": str(result.inserted_id),
        "evaluation_id": str(eval_result.inserted_id),
        "user_id": str(current_user.id),
        "resume_id": resume_id,
        "job_title": job_title,
        "job_description": job_description,
        "ats_score": ats_score,
        "skills_matched": jd_skills_matched,
        "missing_skills": jd_missing_skills,
        "summary": analysis.summary,
        "suggestions": suggestions,
    }

@router.get("/history")
async def get_analysis_history(current_user: UserModel = Depends(get_current_user)):
    db = get_db()
    cursor = db.analysis_results.find({"user_id": str(current_user.id)})
    history = await cursor.to_list(length=100)
    for h in history:
        h['id'] = str(h['_id'])
        del h['_id']
    return history

from pydantic import BaseModel

class ImproveLineRequest(BaseModel):
    text: str
    job_description: str
    section: str

@router.post("/improve-line")
async def improve_line(req: ImproveLineRequest, current_user: UserModel = Depends(get_current_user)):
    # Enforce Fix-It uses limits (-1 means unlimited)
    if current_user.plan_limits.fix_it_uses != -1 and current_user.usage.fix_it_used >= current_user.plan_limits.fix_it_uses:
        raise HTTPException(
            status_code=403, 
            detail={"message": "Your plan limit has been reached", "upgrade_required": True}
        )

    from ..services.ai_resume_improver import improver_service
    res = await improver_service.improve_line(req.text, req.job_description, req.section, user_id=str(current_user.id))
    
    # Increment usage counter
    from ..services.usage import increment_user_usage
    await increment_user_usage(str(current_user.id), "fix_it_used")
    
    return res

class OptimizeResumeRequest(BaseModel):
    resume_id: str
    job_description: str

@router.post("/optimize-resume")
async def optimize_resume(req: OptimizeResumeRequest, current_user: UserModel = Depends(get_current_user)):
    # Enforce Fix-It uses limits (-1 means unlimited)
    if current_user.plan_limits.fix_it_uses != -1 and current_user.usage.fix_it_used >= current_user.plan_limits.fix_it_uses:
        raise HTTPException(
            status_code=403, 
            detail={"message": "Your plan limit has been reached", "upgrade_required": True}
        )

    from ..services.ai_resume_improver import improver_service
    db = get_db()
    
    resume_data = await db.resumes.find_one({
        "_id": ObjectId(req.resume_id),
        "user_id": str(current_user.id)
    })
    
    if not resume_data:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    res = await improver_service.optimize_resume(resume_data.get("extracted_data", {}), req.job_description, user_id=str(current_user.id))
    
    # Increment usage counter
    from ..services.usage import increment_user_usage
    await increment_user_usage(str(current_user.id), "fix_it_used")
    
    return res

class SaveEditRequest(BaseModel):
    resume_id: str
    original_text: str
    improved_text: str
    action: str  # "accept" or "reject"

@router.post("/save-edit")
async def save_edit(req: SaveEditRequest, current_user: UserModel = Depends(get_current_user)):
    import hashlib
    db = get_db()
    
    if req.action == "accept":
        # Hash text to bypass MongoDB's strict restrictions against periods (.) in dictionary keys
        safe_key = hashlib.md5(req.original_text.encode('utf-8')).hexdigest()
        
        await db.resumes.update_one(
            {"_id": ObjectId(req.resume_id), "user_id": str(current_user.id)},
            {"$set": {f"accepted_edits.{safe_key}": {
                "original": req.original_text,
                "improved": req.improved_text
            }}}
        )
    elif req.action == "reject":
        await db.resumes.update_one(
            {"_id": ObjectId(req.resume_id), "user_id": str(current_user.id)},
            {"$push": {"rejected_edits": req.original_text}}
        )
    return {"status": "success"}
