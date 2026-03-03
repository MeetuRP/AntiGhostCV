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
    skills: List[str] = []
    experience: List[str] = []
    education: List[str] = []
    projects: List[str] = []
    certifications: List[str] = []
    links: dict = {}
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
    social_links: SocialLinks = Field(default_factory=SocialLinks)
    job_preferences: JobPreferences = Field(default_factory=JobPreferences)
    last_parsed_profile: Optional[ExtractedData] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    social_links: Optional[SocialLinks] = None
    job_preferences: Optional[JobPreferences] = None

class ResumeModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    file_path: str
    extracted_data: ExtractedData
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
