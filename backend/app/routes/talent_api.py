"""
Talent Intelligence API — query, filter, and sort candidates based on parsed resume data.

Endpoints:
  GET /talent/candidates          — paginated, filterable candidate listing
  GET /talent/candidates/{id}     — full structured resume for one candidate
  GET /talent/roles/summary       — aggregated role counts + top skills
  GET /talent/skills/search       — rank candidates by skill relevance
  GET /talent/categories          — all unique skill categories
"""

from __future__ import annotations

import re
import math
from datetime import datetime
from typing import Any, Dict, List, Optional, Annotated

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..database import get_db, to_object_id
from ..services.date_utils import _parse_experience_years

router = APIRouter(tags=["Talent API"])

# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------

class CandidateLinks(BaseModel):
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL")
    github: Optional[str] = Field(None, description="GitHub profile URL")
    portfolio: Optional[str] = Field(None, description="Personal portfolio URL")

class CandidateSummary(BaseModel):
    """Compact candidate card returned by list / search endpoints."""
    candidate_id: str = Field(..., description="Unique MongoDB ID of the candidate")
    name: Optional[str] = Field(None, description="Candidate's full name")
    email: Optional[str] = Field(None, description="Contact email")
    phone: Optional[str] = Field(None, description="Contact phone number")
    links: CandidateLinks = Field(default_factory=CandidateLinks, description="Social and portfolio links")
    suggested_roles: List[str] = Field(default_factory=list, description="Job roles suggested by the AI parser")
    top_skills: List[str] = Field(default_factory=list, description="Top 10 skills extracted from the resume")
    skill_categories: List[str] = Field(default_factory=list, description="High-level skill categories (e.g., Frontend, AI / ML)")
    total_experience_years: float = Field(0.0, description="Calculated total years of professional experience")
    education_summary: Optional[str] = Field(None, description="One-line summary of highest education")
    last_updated: Optional[datetime] = Field(None, description="When the resume was last uploaded/parsed")
    match_score: float = Field(50.0, description="Relevance score (0-100) based on applied filters")

class CandidateListResponse(BaseModel):
    candidates: List[CandidateSummary] = Field(..., description="List of matching candidates")
    total: int = Field(..., description="Total number of matching candidates across all pages")
    page: int = Field(..., description="Current page number")
    limit: int = Field(..., description="Number of results per page limit")
    total_pages: int = Field(..., description="Total number of pages available")
    message: Optional[str] = Field(None, description="Helpful info when results are empty or filtered")

class RoleCount(BaseModel):
    role: str = Field(..., description="Job role name")
    candidate_count: int = Field(..., description="Number of candidates associated with this role")

class RolesSummaryResponse(BaseModel):
    roles: List[RoleCount] = Field(..., description="List of all roles and their candidate counts")
    total_candidates: int = Field(..., description="Total number of parsed resumes in the system")
    top_skills_overall: List[str] = Field(default_factory=list, description="Top 15 most common skills across all resumes")

class CategoriesResponse(BaseModel):
    categories: List[str] = Field(..., description="All unique skill categories found in the database")
    total: int = Field(..., description="Total number of unique categories")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_skill_categories(srj: dict) -> List[str]:
    """Return unique high-level categories from the structured resume JSON."""
    skills_categorized = srj.get("skills_categorized", {})
    if isinstance(skills_categorized, dict):
        return sorted(list(skills_categorized.keys()))
    return []

def _education_summary(education_entries: List[str]) -> Optional[str]:
    """Return a one-liner from the first education entry."""
    if not education_entries:
        return None
    first = education_entries[0].strip()
    if len(first) > 120:
        first = first[:117] + "..."
    return first

# ── Match score calculation ───────────────────────────────────────────────

def _calculate_match_score(
    *,
    candidate_skills: List[str],
    candidate_roles: List[str],
    candidate_exp_years: float,
    filter_skills: List[str] | None,
    filter_role: str | None,
    filter_min_exp: int | None,
) -> float:
    has_filter = bool(filter_skills or filter_role or filter_min_exp)
    if not has_filter:
        return 50.0

    score = 0.0

    if filter_skills:
        candidate_skills_lower = {s.lower() for s in candidate_skills}
        matched = sum(1 for s in filter_skills if s.lower() in candidate_skills_lower)
        score += (matched / len(filter_skills)) * 50
    else:
        score += 25

    if filter_role:
        role_lower = filter_role.lower()
        candidate_roles_lower = [r.lower() for r in candidate_roles]
        if role_lower in candidate_roles_lower:
            score += 30
        elif any(role_lower in r or r in role_lower for r in candidate_roles_lower):
            score += 15
    else:
        score += 15

    if filter_min_exp is not None and filter_min_exp > 0:
        ratio = min(candidate_exp_years / filter_min_exp, 1.0)
        score += ratio * 20
    else:
        score += 10

    return round(min(score, 100.0), 1)


def _doc_to_candidate_summary(
    doc: dict,
    *,
    filter_skills: List[str] | None = None,
    filter_role: str | None = None,
    filter_min_exp: int | None = None,
) -> CandidateSummary:
    srj: dict = doc.get("structured_resume_json") or doc.get("extracted_data") or {}

    skills: List[str] = srj.get("skills", [])
    suggested_roles: List[str] = srj.get("suggested_roles", [])
    experience_entries: List[str] = srj.get("experience", [])
    education_entries: List[str] = srj.get("education", [])
    raw_links: dict = srj.get("links", {})

    # Use pre-calculated if available, else calculate
    exp_years = srj.get("calculated_experience_years")
    if exp_years is None:
        exp_years = _parse_experience_years(experience_entries)

    return CandidateSummary(
        candidate_id=str(doc["_id"]),
        name=srj.get("name"),
        email=srj.get("email") or raw_links.get("email"),
        phone=srj.get("phone") or raw_links.get("phone"),
        links=CandidateLinks(
            linkedin=raw_links.get("linkedin"),
            github=raw_links.get("github"),
            portfolio=raw_links.get("website"),
        ),
        suggested_roles=suggested_roles,
        top_skills=skills[:10],
        skill_categories=_get_skill_categories(srj),
        total_experience_years=exp_years,
        education_summary=_education_summary(education_entries),
        last_updated=doc.get("uploaded_at"),
        match_score=_calculate_match_score(
            candidate_skills=skills,
            candidate_roles=suggested_roles,
            candidate_exp_years=exp_years,
            filter_skills=filter_skills,
            filter_role=filter_role,
            filter_min_exp=filter_min_exp,
        ),
    )

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/candidates",
    response_model=CandidateListResponse,
    summary="List Candidates",
    description="Fetch and filter candidates from the parsed resume collection with pagination and sorting."
)
async def list_candidates(
    role: Annotated[Optional[str], Query(description="Filter by job title / suggested role", example="Software Engineer")] = None,
    skills: Annotated[Optional[str], Query(description="Comma-separated skills; candidates must have ALL", example="Python,React")] = None,
    category: Annotated[Optional[str], Query(description="Skill category, e.g. Frontend, Backend", example="Frontend")] = None,
    min_experience_years: Annotated[Optional[int], Query(ge=0, description="Minimum total years of professional experience", example=3)] = None,
    education_level: Annotated[Optional[str], Query(description="bachelor, master, phd, or any", example="bachelor")] = None,
    sort_by: Annotated[Optional[str], Query(description="name | experience_years | skills_count | last_updated", example="last_updated")] = "last_updated",
    sort_order: Annotated[Optional[str], Query(description="asc or desc", example="desc")] = "desc",
    page: Annotated[int, Query(ge=1, description="Page number for pagination")] = 1,
    limit: Annotated[int, Query(ge=1, le=50, description="Results per page")] = 10,
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    match_stage: Dict[str, Any] = {}

    skill_list: List[str] | None = None
    if skills:
        skill_list = [s.strip() for s in skills.split(",") if s.strip()]
        match_stage["structured_resume_json.skills"] = {
            "$all": [re.compile(f"^{re.escape(s)}$", re.IGNORECASE) for s in skill_list]
        }

    if role:
        match_stage["structured_resume_json.suggested_roles"] = {
            "$regex": re.escape(role),
            "$options": "i",
        }

    if category:
        match_stage[f"structured_resume_json.skills_categorized.{category}"] = {
            "$exists": True,
            "$ne": []
        }

    if min_experience_years is not None:
        match_stage["structured_resume_json.calculated_experience_years"] = {"$gte": min_experience_years}

    if education_level and education_level.lower() != "any":
        edu_map = {
            "bachelor": r"(bachelor|b\.?tech|b\.?sc|b\.?a\b|b\.?e\b|b\.?eng|bca|bba|undergraduate)",
            "master": r"(master|m\.?tech|m\.?sc|m\.?a\b|m\.?e\b|m\.?eng|mba|mca|m\.?s\b|postgraduate)",
            "phd": r"(ph\.?d|doctor|doctorate)",
        }
        pattern = edu_map.get(education_level.lower())
        if pattern:
            match_stage["structured_resume_json.education"] = {
                "$elemMatch": {"$regex": pattern, "$options": "i"}
            }

    direction = 1 if sort_order == "asc" else -1
    mongo_sort_key = "uploaded_at"
    if sort_by == "name":
        mongo_sort_key = "structured_resume_json.name"
    elif sort_by == "skills_count":
        mongo_sort_key = "_skills_count"
    elif sort_by == "experience_years":
        mongo_sort_key = "structured_resume_json.calculated_experience_years"

    pipeline: List[Dict[str, Any]] = []

    if match_stage:
        pipeline.append({"$match": match_stage})

    pipeline.append({
        "$addFields": {
            "_skills_count": {
                "$cond": {
                    "if": {"$isArray": "$structured_resume_json.skills"},
                    "then": {"$size": "$structured_resume_json.skills"},
                    "else": 0,
                }
            },
        }
    })

    pipeline.append({
        "$facet": {
            "metadata": [{"$count": "total"}],
            "data": [
                {"$sort": {mongo_sort_key: direction}},
                {"$skip": (page - 1) * limit},
                {"$limit": limit},
            ],
        }
    })

    cursor = db.resumes.aggregate(pipeline)
    results = await cursor.to_list(length=1)

    if not results or not results[0].get("metadata"):
        return CandidateListResponse(
            candidates=[],
            total=0,
            page=page,
            limit=limit,
            total_pages=0,
            message="No candidates found matching your filters. Try broadening your search."
        )

    facet = results[0]
    total = facet["metadata"][0]["total"]
    docs = facet["data"]

    candidates = [
        _doc_to_candidate_summary(
            doc,
            filter_skills=skill_list,
            filter_role=role,
            filter_min_exp=min_experience_years,
        )
        for doc in docs
    ]

    if sort_by == "match_score":
        candidates.sort(key=lambda c: c.match_score, reverse=(sort_order != "asc"))

    total_pages = math.ceil(total / limit) if total > 0 else 0

    message = f"Showing all {total} matching candidates." if len(candidates) < limit and page == 1 else None

    return CandidateListResponse(
        candidates=candidates,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        message=message
    )


# NOTE: /candidates/lookup MUST be registered before /candidates/{candidate_id}
# so FastAPI doesn't treat "lookup" as a candidate_id path parameter.

def _format_candidate_detail(doc: dict) -> dict:
    """Shared helper to build the full candidate detail response dict."""
    srj = doc.get("structured_resume_json") or doc.get("extracted_data") or {}
    exp_years = srj.get("calculated_experience_years")
    if exp_years is None:
        exp_years = _parse_experience_years(srj.get("experience", []))

    return {
        "candidate_id": str(doc["_id"]),
        "user_id": doc.get("user_id"),
        "uploaded_at": doc.get("uploaded_at"),
        "selected_template": doc.get("selected_template"),
        "total_experience_years": exp_years,
        "structured_resume_json": srj,
    }


@router.get(
    "/candidates/lookup",
    summary="Lookup Candidate by ID or Name",
    description=(
        "Flexible candidate lookup — provide either `candidate_id` or `candidate_name` "
        "(at least one is required). Searching by name is case-insensitive and supports "
        "partial matches, returning all matching candidates."
    ),
)
async def lookup_candidate(
    candidate_id: Annotated[Optional[str], Query(description="Exact MongoDB ObjectId of the candidate")] = None,
    candidate_name: Annotated[Optional[str], Query(description="Full or partial candidate name (case-insensitive)", example="Alice")] = None,
):
    if not candidate_id and not candidate_name:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one of 'candidate_id' or 'candidate_name'.",
        )

    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # ── Lookup by ID (exact, returns single result) ───────────────────────
    if candidate_id:
        try:
            oid = to_object_id(candidate_id)
        except Exception:
            raise HTTPException(status_code=422, detail="Invalid candidate ID format")

        doc = await db.resumes.find_one({"_id": oid})
        if not doc:
            raise HTTPException(status_code=404, detail="Candidate not found")

        return _format_candidate_detail(doc)

    # ── Lookup by name (partial, case-insensitive, returns list) ──────────
    name_regex = re.compile(re.escape(candidate_name), re.IGNORECASE)
    docs = await db.resumes.find(
        {"structured_resume_json.name": {"$regex": name_regex}}
    ).to_list(length=50)

    if not docs:
        raise HTTPException(
            status_code=404,
            detail=f"No candidates found with name matching '{candidate_name}'.",
        )

    return {
        "candidates": [_format_candidate_detail(doc) for doc in docs],
        "total": len(docs),
        "message": f"Found {len(docs)} candidate(s) matching '{candidate_name}'.",
    }

""" 
@router.get(
    "/candidates/{candidate_id}",
    summary="Get Candidate by ID",
    description="Fetch full structured resume data for a single candidate by their MongoDB ID. "
                "For name-based search, use /candidates/lookup instead.",
)
async def get_candidate(candidate_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        oid = to_object_id(candidate_id)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid candidate ID format")

    doc = await db.resumes.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return _format_candidate_detail(doc)
 """

@router.get(
    "/roles/summary",
    response_model=RolesSummaryResponse,
    summary="Roles Summary",
    description="Returns an aggregated summary of all roles and candidate counts across the database."
)
async def roles_summary():
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    pipeline = [
        {"$match": {"structured_resume_json.suggested_roles": {"$exists": True, "$ne": []}}},
        {"$unwind": "$structured_resume_json.suggested_roles"},
        {
            "$group": {
                "_id": "$structured_resume_json.suggested_roles",
                "candidate_count": {"$sum": 1},
            }
        },
        {"$sort": {"candidate_count": -1}},
    ]

    cursor = db.resumes.aggregate(pipeline)
    role_docs = await cursor.to_list(length=500)

    roles = [
        RoleCount(role=r["_id"], candidate_count=r["candidate_count"])
        for r in role_docs
    ]

    total = await db.resumes.count_documents({})

    skills_pipeline = [
        {"$match": {"structured_resume_json.skills": {"$exists": True, "$ne": []}}},
        {"$unwind": "$structured_resume_json.skills"},
        {"$group": {"_id": "$structured_resume_json.skills", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15},
    ]
    skills_cursor = db.resumes.aggregate(skills_pipeline)
    skill_docs = await skills_cursor.to_list(length=15)
    top_skills = [s["_id"] for s in skill_docs]

    return RolesSummaryResponse(
        roles=roles,
        total_candidates=total,
        top_skills_overall=top_skills,
    )


@router.get(
    "/skills/search",
    response_model=CandidateListResponse,
    summary="Skill Relevance Search",
    description="Search candidates by skill relevance ranking, matching 'all' or 'any' skills provided."
)
async def skills_search(
    skills: Annotated[str, Query(description="Comma-separated skills to match", example="Python,React")],
    match_type: Annotated[str, Query(description="'all' = must have all, 'any' = at least one", example="any")] = "any",
    limit: Annotated[int, Query(ge=1, le=50, description="Max results to return")] = 20,
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    skill_list = [s.strip() for s in skills.split(",") if s.strip()]
    if not skill_list:
        raise HTTPException(status_code=422, detail="At least one skill is required")

    regex_list = [re.compile(f"^{re.escape(s)}$", re.IGNORECASE) for s in skill_list]

    if match_type == "all":
        match_filter = {"structured_resume_json.skills": {"$all": regex_list}}
    else:
        match_filter = {"structured_resume_json.skills": {"$in": regex_list}}

    pipeline: List[Dict[str, Any]] = [
        {"$match": match_filter},
        {
            "$addFields": {
                "_match_count": {
                    "$size": {
                        "$filter": {
                            "input": "$structured_resume_json.skills",
                            "as": "sk",
                            "cond": {
                                "$in": [
                                    {"$toLower": "$$sk"},
                                    [s.lower() for s in skill_list],
                                ]
                            },
                        }
                    }
                }
            }
        },
        {"$sort": {"_match_count": -1}},
        {
            "$facet": {
                "metadata": [{"$count": "total"}],
                "data": [{"$limit": limit}],
            }
        },
    ]

    cursor = db.resumes.aggregate(pipeline)
    results = await cursor.to_list(length=1)

    if not results or not results[0].get("metadata"):
        return CandidateListResponse(
            candidates=[],
            total=0,
            page=1,
            limit=limit,
            total_pages=0,
            message="No candidates found matching your filters. Try broadening your search."
        )

    facet = results[0]
    total = facet["metadata"][0]["total"]
    docs = facet["data"]

    candidates = [
        _doc_to_candidate_summary(doc, filter_skills=skill_list)
        for doc in docs
    ]

    candidates.sort(key=lambda c: c.match_score, reverse=True)

    message = f"Showing all {total} matching candidates." if len(candidates) < limit else None

    return CandidateListResponse(
        candidates=candidates,
        total=total,
        page=1,
        limit=limit,
        total_pages=1,
        message=message
    )


@router.get(
    "/categories",
    response_model=CategoriesResponse,
    summary="List Skill Categories",
    description="Returns all unique skill categories found in candidate resumes across the entire database."
)
async def get_categories():
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    pipeline = [
        {"$match": {"structured_resume_json.skills_categorized": {"$exists": True}}},
        {"$project": {"categories": {"$objectToArray": "$structured_resume_json.skills_categorized"}}},
        {"$unwind": "$categories"},
        {"$group": {"_id": "$categories.k"}},
        {"$sort": {"_id": 1}},
    ]

    cursor = db.resumes.aggregate(pipeline)
    docs = await cursor.to_list(length=1000)

    categories = [doc["_id"] for doc in docs]

    return CategoriesResponse(
        categories=categories,
        total=len(categories)
    )
