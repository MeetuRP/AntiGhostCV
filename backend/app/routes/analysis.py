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
        matched = [s for s in required_skills if s in resume_skills]
        jd_skills_matched = matched
        jd_missing_skills = [s for s in required_skills if s not in resume_skills]
        
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
    
    # Return a plain dict with string 'id' for frontend
    return {
        "id": str(result.inserted_id),
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
