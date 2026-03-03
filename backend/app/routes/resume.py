from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from typing import List
import os
import shutil
from ..middleware import get_current_user
from ..models import UserModel, ResumeModel, ExtractedData, SocialLinks
from ..services.parser import ResumeParser
from ..database import get_db
from bson import ObjectId

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

    # Parse resume
    try:
        text = ResumeParser.extract_text(file_path)
        extracted_data = ResumeParser.parse_resume(text)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error parsing resume: {str(e)}")

    # Store resume in DB
    db = get_db()
    resume = ResumeModel(
        user_id=str(current_user.id),
        file_path=file_path,
        extracted_data=extracted_data
    )

    result = await db.resumes.insert_one(resume.model_dump(by_alias=True, exclude={"id"}))

    # ============================================================
    # AUTO-SYNC: Populate user profile from parsed resume data
    # ============================================================
    update_fields: dict = {
        "last_parsed_profile": extracted_data.model_dump()
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
