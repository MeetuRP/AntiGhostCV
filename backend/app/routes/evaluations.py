from fastapi import APIRouter, Depends, HTTPException
from ..middleware import get_current_user
from ..models import UserModel, EvaluationModel
from ..database import get_db, to_object_id
from bson import ObjectId

router = APIRouter()


@router.get("/history")
async def get_evaluation_history(current_user: UserModel = Depends(get_current_user)):
    """
    Returns a summarized list of all evaluations for the current user,
    sorted by newest first.
    """
    db = get_db()
    cursor = db.evaluations.find(
        {"user_id": str(current_user.id)},
        {
            "job_description": 0,  # Exclude heavy fields from listing
            "skills_matched": 0,
            "missing_skills": 0,
            "suggestions": 0,
            "accepted_edits": 0,
            "impact_scores": 0,
        },
    ).sort("created_at", -1)

    history = await cursor.to_list(length=200)
    for h in history:
        h["id"] = str(h["_id"])
        del h["_id"]
    return history


@router.get("/{evaluation_id}")
async def get_evaluation(evaluation_id: str, current_user: UserModel = Depends(get_current_user)):
    """
    Returns the full evaluation document for reopening a past analysis.
    """
    db = get_db()
    evaluation = await db.evaluations.find_one({
        "_id": to_object_id(evaluation_id),
        "user_id": str(current_user.id),
    })

    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    evaluation["id"] = str(evaluation["_id"])
    del evaluation["_id"]
    return evaluation
