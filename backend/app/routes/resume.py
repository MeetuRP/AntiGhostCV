from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from typing import List
import os
import shutil
from ..middleware import get_current_user
from ..models import UserModel, ResumeModel, ExtractedData, SocialLinks
from ..services.parser import ResumeParser
from ..database import get_db
from bson import ObjectId
from pydantic import BaseModel

router = APIRouter()

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload", response_model=ResumeModel)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Save file
    file_id = str(ObjectId())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Parse resume (legacy for backward compat)
    try:
        text = ResumeParser.extract_text(file_path)
        extracted_data = ResumeParser.parse_resume(text)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error parsing resume: {str(e)}")

    # NEW: Deep structured parsing (captures hyperlinks, summary, symbols, etc.)
    try:
        structured_json = ResumeParser.extract_structured_resume(file_path)
    except Exception as e:
        print(f"[Warning] Deep parser failed, falling back: {e}")
        structured_json = extracted_data.model_dump()

    # Store resume in DB
    db = get_db()
    resume = ResumeModel(
        user_id=str(current_user.id),
        file_path=file_path,
        extracted_data=extracted_data,
        structured_resume_json=structured_json,
        optimized_resume_json=structured_json,  # starts as a copy; AI edits applied later
    )

    result = await db.resumes.insert_one(resume.model_dump(by_alias=True, exclude={"id"}))

    # Log upload event for admin analytics
    from ..services.events import log_event
    await log_event("resume_upload", user_id=str(current_user.id))

    # ============================================================
    # AUTO-SYNC: Populate user profile from parsed resume data
    # ============================================================
    update_fields: dict = {
        "last_parsed_profile": extracted_data.model_dump(),
        "resume_id": str(result.inserted_id)
    }

    # Auto-fill social_links from extracted URLs
    parsed_links = extracted_data.links or {}
    social_update = {}
    if parsed_links.get("github"):
        social_update["social_links.github"] = parsed_links["github"]
    if parsed_links.get("linkedin"):
        social_update["social_links.linkedin"] = parsed_links["linkedin"]
    if parsed_links.get("website"):
        social_update["social_links.website"] = parsed_links["website"]

    if social_update:
        update_fields.update(social_update)

    # Auto-fill job preferences from suggested roles
    if extracted_data.suggested_roles:
        update_fields["job_preferences.desired_roles"] = extracted_data.suggested_roles

    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": update_fields}
    )

    # Return plain dict with string 'id' for frontend
    return {
        "id": str(result.inserted_id),
        "user_id": str(current_user.id),
        "file_path": file_path,
        "extracted_data": extracted_data.model_dump(),
        "structured_resume_json": structured_json,
    }

@router.get("/me")
async def get_my_resumes(current_user: UserModel = Depends(get_current_user)):
    db = get_db()
    cursor = db.resumes.find({"user_id": str(current_user.id)})
    resumes = await cursor.to_list(length=100)
    for r in resumes:
        r['id'] = str(r['_id'])
        del r['_id']
    return resumes


@router.get("/view/{resume_id}")
async def view_resume(resume_id: str, current_user: UserModel = Depends(get_current_user)):
    db = get_db()
    resume = await db.resumes.find_one({
        "_id": ObjectId(resume_id),
        "user_id": str(current_user.id)
    })
    
    if not resume:
        # Check if user is admin (admin can view any resume)
        if current_user.is_admin:
            resume = await db.resumes.find_one({"_id": ObjectId(resume_id)})
            
        if not resume:
            # SELF-HEALING: If specific resume_id is missing, fallback to latest
            resume = await db.resumes.find_one(
                {"user_id": str(current_user.id)},
                sort=[("uploaded_at", -1)]
            )
            
            if not resume:
                raise HTTPException(status_code=404, detail="Resume not found")

    file_path = resume.get("file_path")
    if not os.path.exists(file_path):
        # If specific file is missing, try fallback one more time for safety
        latest_resume = await db.resumes.find_one(
            {"user_id": str(current_user.id)},
            sort=[("uploaded_at", -1)]
        )
        if latest_resume and os.path.exists(latest_resume.get("file_path")):
            file_path = latest_resume.get("file_path")
        else:
            raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        file_path, 
        media_type="application/pdf",
        filename=os.path.basename(file_path)
    )


class TemplateUpdate(BaseModel):
    template_id: str


@router.get("/structured/{resume_id}")
async def get_structured_resume(resume_id: str, current_user: UserModel = Depends(get_current_user)):
    """Returns the structured JSON used to render ATS templates. Falls back to extracted_data for legacy resumes."""
    db = get_db()
    resume = await db.resumes.find_one({
        "_id": ObjectId(resume_id),
        "user_id": str(current_user.id)
    })
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    structured = (
        resume.get("optimized_resume_json")
        or resume.get("structured_resume_json")
        or resume.get("extracted_data", {})
    )
    return {
        "resume_id": resume_id,
        "selected_template": resume.get("selected_template", "modern-ats"),
        "structured_resume": structured,
    }


@router.patch("/template/{resume_id}")
async def update_template(resume_id: str, body: TemplateUpdate, current_user: UserModel = Depends(get_current_user)):
    """Update the selected ATS template for a resume."""
    db = get_db()
    result = await db.resumes.update_one(
        {"_id": ObjectId(resume_id), "user_id": str(current_user.id)},
        {"$set": {"selected_template": body.template_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"status": "success", "selected_template": body.template_id}


@router.post("/reparse/{resume_id}")
async def reparse_resume(resume_id: str, current_user: UserModel = Depends(get_current_user)):
    """Re-run the parser on an existing resume PDF to update structured data with latest parser improvements."""
    db = get_db()
    resume = await db.resumes.find_one({
        "_id": ObjectId(resume_id),
        "user_id": str(current_user.id)
    })
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    file_path = resume.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Resume file not found on server")
    
    try:
        structured_json = ResumeParser.extract_structured_resume(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Re-parse failed: {str(e)}")
    
    await db.resumes.update_one(
        {"_id": ObjectId(resume_id)},
        {"$set": {
            "structured_resume_json": structured_json,
            "optimized_resume_json": structured_json,
        }}
    )
    
    return {"status": "success", "structured_resume": structured_json}

