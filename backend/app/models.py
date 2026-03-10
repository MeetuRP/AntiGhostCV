from pydantic import BaseModel, EmailStr, Field, ConfigDict, BeforeValidator, PlainSerializer
from typing import List, Optional, Any, Annotated
from datetime import datetime
from bson import ObjectId

def validate_object_id(v: Any) -> ObjectId:
    if isinstance(v, ObjectId):
        return v
    if isinstance(v, str) and ObjectId.is_valid(v):
        return ObjectId(v)
    raise ValueError("Invalid ObjectId")

PyObjectId = Annotated[
    ObjectId,
    BeforeValidator(validate_object_id),
    PlainSerializer(lambda v: str(v), return_type=str),
]

class SocialLinks(BaseModel):
    github: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None

class JobPreferences(BaseModel):
    desired_roles: List[str] = []
    locations: List[str] = []
    min_salary: Optional[int] = None
    remote_preferred: bool = False

class ExtractedData(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    summary: Optional[str] = None
    skills: List[str] = []
    experience: List[str] = []
    education: List[str] = []
    projects: List[str] = []
    certifications: List[str] = []
    publications: List[str] = []
    volunteering: List[str] = []
    links: dict = {}
    hyperlinks: List[dict] = []  # embedded PDF annotation links
    suggested_roles: List[str] = []

class UserModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    google_id: str
    name: str
    email: EmailStr
    profile_image: Optional[str] = None
    bio: Optional[str] = None
    is_admin: bool = False
    social_links: SocialLinks = Field(default_factory=SocialLinks)
    job_preferences: JobPreferences = Field(default_factory=JobPreferences)
    last_parsed_profile: Optional[ExtractedData] = None
    resume_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    social_links: Optional[SocialLinks] = None
    job_preferences: Optional[JobPreferences] = None

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_admin: Optional[bool] = None

class ResumeModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    file_path: str
    extracted_data: ExtractedData
    # New: Rich structured JSON used by the template engine
    structured_resume_json: dict = Field(default_factory=dict)
    # New: AI-edited version of the resume JSON (accepted edits applied)
    optimized_resume_json: dict = Field(default_factory=dict)
    # New: The template ID selected by the user
    selected_template: str = "modern-ats"
    # Existing: accepted/rejected inline edits
    accepted_edits: dict = Field(default_factory=dict)
    rejected_edits: List[str] = Field(default_factory=list)
    # New: AI impact scores per bullet text
    impact_scores: dict = Field(default_factory=dict)
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

class AnalysisResultModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    resume_id: str
    job_title: str
    job_description: str
    ats_score: int
    skills_matched: List[str] = []
    missing_skills: List[str] = []
    summary: str
    suggestions: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
