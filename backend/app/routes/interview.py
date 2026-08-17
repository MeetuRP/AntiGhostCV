"""
AI Voice Interview Prep — Backend Routes
HTTP endpoints + WebSocket STT streaming + Question bank seeding
"""
import asyncio
import json
import random
import base64
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from pydantic import BaseModel
from bson import ObjectId

from ..middleware import get_current_user
from ..models import (
    UserModel, InterviewQuestion, InterviewSessionModel,
    InterviewQuestionBankEntry, SUPPORTED_BANK_ROLES
)
from ..database import get_db, to_object_id
from ..config import settings
from ..services.events import log_event
from ..services.usage import increment_user_usage

from google import genai
from google.genai import types as genai_types

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Gemini Client ────────────────────────────────────────────────────

_gemini_client = None

def get_gemini_client():
    global _gemini_client
    if _gemini_client is None and settings.GEMINI_API_KEY:
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.5

RETRYABLE_PATTERNS = ["503", "unavailable", "overloaded", "high demand", "internal", "deadline", "429", "too many requests", "quota", "resource_exhausted"]

def _is_retryable(error_str: str) -> bool:
    return any(p in error_str for p in RETRYABLE_PATTERNS)


async def _call_gemini_with_retry(contents: str, user_id: Optional[str] = None):
    """Call Gemini API with retry + exponential backoff. Matches existing codebase pattern."""
    client = get_gemini_client()
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    loop = asyncio.get_event_loop()
    last_error = None

    for attempt in range(MAX_RETRIES):
        try:
            def call_gemini():
                return client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=contents,
                    config=genai_types.GenerateContentConfig(
                        response_mime_type="application/json",
                    )
                )

            response = await loop.run_in_executor(None, call_gemini)

            # Track token usage
            if user_id and response.usage_metadata:
                try:
                    from ..services.usage import update_ai_usage
                    input_tokens = response.usage_metadata.prompt_token_count or 0
                    output_tokens = response.usage_metadata.candidates_token_count or 0
                    asyncio.create_task(update_ai_usage(user_id, input_tokens, output_tokens))
                except Exception as track_err:
                    logger.warning(f"Usage tracking error: {track_err}")

            return response

        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            logger.warning(f"Gemini attempt {attempt + 1}/{MAX_RETRIES} failed: {e}")

            if not _is_retryable(error_str):
                raise

            if attempt < MAX_RETRIES - 1:
                delay = RETRY_BASE_DELAY * (2 ** attempt)
                await asyncio.sleep(delay)

    raise last_error


def _parse_json_response(response) -> list:
    """Safely parse Gemini JSON response text into a Python list."""
    text = response.text.strip()
    # Strip markdown fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
    return json.loads(text)


# ── Role-Specific Skill Hints (for seeding context) ─────────────────

ROLE_SKILLS = {
    "Frontend Developer": "React, Vue, Angular, TypeScript, JavaScript, HTML5, CSS3, Webpack, Next.js, Tailwind CSS, Redux, REST APIs, GraphQL, Web Performance, Accessibility",
    "Backend Developer": "Python, Java, Node.js, Go, REST APIs, GraphQL, SQL, PostgreSQL, MongoDB, Redis, Docker, Kubernetes, Microservices, System Design, Authentication",
    "Full Stack Developer": "React, Node.js, Python, TypeScript, SQL, MongoDB, REST APIs, Docker, Git, CI/CD, AWS, System Design, Authentication, Testing, Agile",
    "ML Engineer": "Python, PyTorch, TensorFlow, Scikit-learn, MLOps, Feature Engineering, Model Deployment, Docker, Kubernetes, Data Pipelines, SQL, Statistics, Deep Learning, NLP, Computer Vision",
    "AI Engineer": "Python, LLMs, Prompt Engineering, RAG, LangChain, Vector Databases, Transformers, Fine-tuning, AI Ethics, API Integration, Cloud AI Services, Embeddings, Agents, Evaluation",
    "Data Scientist": "Python, R, Pandas, NumPy, SQL, Statistics, Machine Learning, Data Visualization, Jupyter, A/B Testing, Feature Engineering, Hypothesis Testing, Tableau, Storytelling",
    "DevOps Engineer": "Docker, Kubernetes, Terraform, AWS, Azure, GCP, CI/CD, Jenkins, GitHub Actions, Linux, Bash, Monitoring, Prometheus, Grafana, Infrastructure as Code",
    "UI/UX Designer": "Figma, Sketch, Adobe XD, User Research, Wireframing, Prototyping, Usability Testing, Design Systems, Accessibility, Information Architecture, Interaction Design, Typography, Color Theory",
}


# ── Pydantic Request/Response Schemas ────────────────────────────────

class StartSessionRequest(BaseModel):
    job_role: str
    resume_id: str

class SynthesizeSpeechRequest(BaseModel):
    text: str
    session_id: str

class SubmitAnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer_transcript: str

class AnswerEntry(BaseModel):
    question_id: str
    answer_transcript: str

class CompleteSessionRequest(BaseModel):
    session_id: str
    communication_score: float
    answers: List[AnswerEntry]


# ── Question Bank Seeding (called from lifespan) ────────────────────

async def seed_question_bank():
    """Seed the interview_question_bank collection on first startup if empty."""
    db = get_db()
    if db is None:
        logger.warning("[Interview] DB not available for seeding")
        return

    count = await db.interview_question_bank.count_documents({})
    if count > 0:
        logger.info(f"[Interview] Question bank already seeded ({count} questions)")
        return

    logger.info("[Interview] Seeding question bank for all supported roles...")

    for role in SUPPORTED_BANK_ROLES:
        skills = ROLE_SKILLS.get(role, role)
        prompt = (
            f"Generate 30 interview questions for {role} engineers. "
            f"Mix: 8 HR/intro questions about motivation and background, "
            f"16 technical questions ranging from fundamental to advanced covering {skills}, "
            f"6 behavioural STAR-method questions. "
            f"Each question should be distinct and specific. "
            f"Return ONLY JSON array: "
            f"[{{\"question_text\": \"...\", \"category\": \"technical\", \"difficulty\": \"medium\"}}]. "
            f"No duplicates. No preamble."
        )

        try:
            response = await _call_gemini_with_retry(prompt)
            questions = _parse_json_response(response)

            docs = []
            for q in questions:
                docs.append({
                    "job_role": role,
                    "question_text": q.get("question_text", ""),
                    "category": q.get("category", "technical"),
                    "difficulty": q.get("difficulty", "medium"),
                    "created_at": datetime.utcnow(),
                })

            if docs:
                await db.interview_question_bank.insert_many(docs)
                logger.info(f"[Interview] Seeded {len(docs)} questions for {role}")

        except Exception as e:
            logger.error(f"[Interview] Failed to seed questions for {role}: {e}")
            continue

    total = await db.interview_question_bank.count_documents({})
    logger.info(f"[Interview] Question bank seeding complete. Total: {total}")


# ── HTTP Endpoints ───────────────────────────────────────────────────

@router.post("/start")
async def start_session(req: StartSessionRequest, current_user: UserModel = Depends(get_current_user)):
    """Start a new interview session — generates or samples questions."""
    db = get_db()

    # Plan limit check
    if (current_user.plan_limits.interview_sessions != -1 and
            current_user.usage.interview_sessions_used >= current_user.plan_limits.interview_sessions):
        raise HTTPException(
            status_code=403,
            detail={"message": "Interview session limit reached", "upgrade_required": True}
        )

    # Fetch resume for skill context
    resume_data = await db.resumes.find_one({
        "_id": to_object_id(req.resume_id),
        "user_id": str(current_user.id)
    })
    if not resume_data:
        raise HTTPException(status_code=404, detail="Resume not found")

    extracted = resume_data.get("extracted_data", {})
    skills_list = ", ".join(extracted.get("skills", [])[:25]) or "general programming"
    experience_items = extracted.get("experience", [])
    experience_summary = "; ".join(experience_items[:3]) if experience_items else "entry-level candidate"

    questions: List[dict] = []

    if req.job_role in SUPPORTED_BANK_ROLES:
        # Sample 6 from bank (3 hr/behavioural + 3 technical)
        bank_hr = await db.interview_question_bank.aggregate([
            {"$match": {"job_role": req.job_role, "category": {"$in": ["hr", "behavioural"]}}},
            {"$sample": {"size": 3}}
        ]).to_list(length=3)

        bank_tech = await db.interview_question_bank.aggregate([
            {"$match": {"job_role": req.job_role, "category": "technical"}},
            {"$sample": {"size": 3}}
        ]).to_list(length=3)

        bank_questions = bank_hr + bank_tech
        for idx, bq in enumerate(bank_questions, start=1):
            questions.append({
                "question_id": f"q{idx}",
                "question_text": bq["question_text"],
                "category": bq["category"],
                "difficulty": bq["difficulty"],
                "source": "bank",
            })

        # Generate 2 personalised questions via Gemini
        prompt = (
            f"You are a senior technical recruiter. The candidate is applying for {req.job_role}. "
            f"Their specific resume skills are: {skills_list}. "
            f"Generate exactly 2 highly specific technical interview questions that directly "
            f"reference their listed technologies and would reveal depth of knowledge. "
            f"These should be different from generic {req.job_role} questions. "
            f"Return ONLY JSON array: "
            f"[{{\"question_id\": \"q7\", \"question_text\": \"...\", \"category\": \"technical\", \"difficulty\": \"hard\"}}]. "
            f"No preamble."
        )

        try:
            response = await _call_gemini_with_retry(prompt, user_id=str(current_user.id))
            gemini_qs = _parse_json_response(response)
            for idx, gq in enumerate(gemini_qs[:2], start=len(questions) + 1):
                questions.append({
                    "question_id": f"q{idx}",
                    "question_text": gq.get("question_text", ""),
                    "category": gq.get("category", "technical"),
                    "difficulty": gq.get("difficulty", "hard"),
                    "source": "gemini",
                })
        except Exception as e:
            logger.error(f"Gemini personalised question generation failed: {e}")
            # Pad with bank questions if Gemini fails
            fallback = await db.interview_question_bank.aggregate([
                {"$match": {"job_role": req.job_role}},
                {"$sample": {"size": 2}}
            ]).to_list(length=2)
            for idx, fb in enumerate(fallback, start=len(questions) + 1):
                questions.append({
                    "question_id": f"q{idx}",
                    "question_text": fb["question_text"],
                    "category": fb["category"],
                    "difficulty": fb["difficulty"],
                    "source": "bank",
                })
    else:
        # Unsupported role — generate all 8 via Gemini
        prompt = (
            f"You are a senior technical recruiter and interview coach. "
            f"Generate exactly 8 interview questions for a {req.job_role} candidate. "
            f"Skills: {skills_list}. Experience: {experience_summary}. "
            f"Distribution: 2 introductory HR questions (background, motivation, why this role), "
            f"4 technical questions that specifically test their listed skills (reference actual technologies), "
            f"2 behavioural STAR-method scenario questions. "
            f"Return ONLY a valid JSON array, no markdown: "
            f"[{{\"question_id\": \"q1\", \"question_text\": \"...\", \"category\": \"hr\", \"difficulty\": \"easy\"}}, ...]. "
            f"Categories must be exactly: hr, technical, or behavioural."
        )

        try:
            response = await _call_gemini_with_retry(prompt, user_id=str(current_user.id))
            gemini_qs = _parse_json_response(response)
            for idx, gq in enumerate(gemini_qs[:8], start=1):
                questions.append({
                    "question_id": f"q{idx}",
                    "question_text": gq.get("question_text", ""),
                    "category": gq.get("category", "hr"),
                    "difficulty": gq.get("difficulty", "medium"),
                    "source": "gemini",
                })
        except Exception as e:
            logger.error(f"Gemini full question generation failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate interview questions. Please try again.")

    # Ensure we have exactly 8 questions (pad or trim)
    while len(questions) < 8:
        questions.append({
            "question_id": f"q{len(questions) + 1}",
            "question_text": f"Tell us about a challenging project you've worked on as a {req.job_role}.",
            "category": "behavioural",
            "difficulty": "medium",
            "source": "fallback",
        })
    questions = questions[:8]

    # Re-index question_ids sequentially
    for idx, q in enumerate(questions, start=1):
        q["question_id"] = f"q{idx}"

    # Create session document
    session_doc = {
        "user_id": str(current_user.id),
        "job_role": req.job_role,
        "resume_id": req.resume_id,
        "questions": [
            {**q, "user_answer": None, "ai_score": None, "ai_feedback": None, "ideal_answer": None}
            for q in questions
        ],
        "overall_score": None,
        "technical_score": None,
        "hr_score": None,
        "communication_score": None,
        "completed": False,
        "started_at": datetime.utcnow(),
        "completed_at": None,
    }

    result = await db.interview_sessions.insert_one(session_doc)
    session_id = str(result.inserted_id)

    # Return session — exclude ideal_answers and ai_scores
    return {
        "session_id": session_id,
        "questions": [
            {
                "question_id": q["question_id"],
                "question_text": q["question_text"],
                "category": q["category"],
                "difficulty": q["difficulty"],
            }
            for q in questions
        ],
        "audio_prefetch_required": True,
    }


@router.post("/synthesize")
async def synthesize_speech(req: SynthesizeSpeechRequest, current_user: UserModel = Depends(get_current_user)):
    """Synthesize text to speech using Google Cloud TTS Neural2-D voice."""
    db = get_db()

    # Validate session belongs to user
    session = await db.interview_sessions.find_one({
        "_id": to_object_id(req.session_id),
        "user_id": str(current_user.id)
    })
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        from google.cloud import texttospeech

        loop = asyncio.get_event_loop()

        def _synthesize():
            client = texttospeech.TextToSpeechClient()
            synthesis_input = texttospeech.SynthesisInput(text=req.text)
            voice = texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name="en-US-Neural2-D",
            )
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.LINEAR16,
                speaking_rate=0.92,
                pitch=0.0,
                effects_profile_id=["headphone-class-device"],
            )
            response = client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config,
            )
            return response.audio_content

        audio_content = await loop.run_in_executor(None, _synthesize)
        audio_base64 = base64.b64encode(audio_content).decode("utf-8")

        # Estimate duration: LINEAR16 at 24000 Hz (Neural2 default), 16-bit = 2 bytes per sample
        # 44-byte WAV header
        audio_bytes = len(audio_content) - 44
        duration_ms = int((audio_bytes / (24000 * 2)) * 1000) if audio_bytes > 0 else 3000

        return {
            "audio_base64": audio_base64,
            "duration_ms": duration_ms,
        }

    except ImportError:
        raise HTTPException(status_code=500, detail="Google Cloud TTS not installed")
    except Exception as e:
        logger.error(f"TTS synthesis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")


@router.post("/submit-answer")
async def submit_answer(req: SubmitAnswerRequest, current_user: UserModel = Depends(get_current_user)):
    """Save a user's answer transcript for a specific question."""
    db = get_db()

    session = await db.interview_sessions.find_one({
        "_id": to_object_id(req.session_id),
        "user_id": str(current_user.id),
        "completed": False,
    })
    if not session:
        raise HTTPException(status_code=404, detail="Active session not found")

    # Validate question_id exists
    q_ids = [q["question_id"] for q in session["questions"]]
    if req.question_id not in q_ids:
        raise HTTPException(status_code=400, detail=f"Invalid question_id: {req.question_id}")

    # Update the specific question's user_answer
    await db.interview_sessions.update_one(
        {"_id": to_object_id(req.session_id), "questions.question_id": req.question_id},
        {"$set": {"questions.$.user_answer": req.answer_transcript}}
    )

    # Determine next question index
    current_idx = q_ids.index(req.question_id)
    next_idx = current_idx + 1 if current_idx < len(q_ids) - 1 else -1

    return {"status": "saved", "next_question_index": next_idx}


@router.post("/complete")
async def complete_session(req: CompleteSessionRequest, current_user: UserModel = Depends(get_current_user)):
    """Complete an interview session — batch Gemini evaluation of all answers."""
    db = get_db()

    session = await db.interview_sessions.find_one({
        "_id": to_object_id(req.session_id),
        "user_id": str(current_user.id),
    })
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.get("completed"):
        raise HTTPException(status_code=400, detail="Session already completed")

    # Apply any final answers from the request body
    for answer in req.answers:
        await db.interview_sessions.update_one(
            {"_id": to_object_id(req.session_id), "questions.question_id": answer.question_id},
            {"$set": {"questions.$.user_answer": answer.answer_transcript}}
        )

    # Re-fetch with updated answers
    session = await db.interview_sessions.find_one({"_id": to_object_id(req.session_id)})
    questions = session["questions"]

    # Format Q&A pairs for Gemini
    formatted_qa = []
    for q in questions:
        answer = q.get("user_answer") or "(No answer provided)"
        formatted_qa.append(
            f"Question {q['question_id']} [{q['category']}]: {q['question_text']}\n"
            f"Answer: {answer}"
        )
    formatted_qa_list = "\n\n".join(formatted_qa)

    job_role = session["job_role"]
    prompt = (
        f"You are evaluating a complete {job_role} mock interview. "
        f"Evaluate each answer strictly but fairly on a 0-10 scale: "
        f"0-3 poor or irrelevant, 4-6 adequate but lacking depth, "
        f"7-8 good with minor gaps, 9-10 excellent and comprehensive. "
        f"For each question provide: ai_score (integer 0-10), "
        f"ai_feedback (exactly 2 sentences of specific actionable feedback referencing the actual answer), "
        f"ideal_answer (3-4 sentences showing what a strong answer looks like with specifics). "
        f"Return ONLY valid JSON array, no markdown, no preamble: "
        f"[{{\"question_id\": \"q1\", \"ai_score\": 7, \"ai_feedback\": \"...\", \"ideal_answer\": \"...\"}}]. "
        f"Here are the questions and answers:\n\n{formatted_qa_list}"
    )

    try:
        response = await _call_gemini_with_retry(prompt, user_id=str(current_user.id))
        evaluations = _parse_json_response(response)
    except Exception as e:
        logger.error(f"Gemini evaluation failed: {e}")
        # Fallback scores if Gemini fails
        evaluations = [
            {"question_id": q["question_id"], "ai_score": 5,
             "ai_feedback": "Evaluation temporarily unavailable. Your answer has been saved.",
             "ideal_answer": "A strong answer would include specific examples and technical details."}
            for q in questions
        ]

    # Build evaluation map
    eval_map = {ev["question_id"]: ev for ev in evaluations}

    # Update all questions with evaluation data
    tech_scores = []
    hr_scores = []

    for q in questions:
        ev = eval_map.get(q["question_id"], {})
        ai_score = ev.get("ai_score", 5)
        ai_feedback = ev.get("ai_feedback", "")
        ideal_answer = ev.get("ideal_answer", "")

        await db.interview_sessions.update_one(
            {"_id": to_object_id(req.session_id), "questions.question_id": q["question_id"]},
            {"$set": {
                "questions.$.ai_score": ai_score,
                "questions.$.ai_feedback": ai_feedback,
                "questions.$.ideal_answer": ideal_answer,
            }}
        )

        if q["category"] == "technical":
            tech_scores.append(ai_score)
        else:
            hr_scores.append(ai_score)

    # Calculate aggregate scores
    all_scores = [eval_map.get(q["question_id"], {}).get("ai_score", 5) for q in questions]
    overall_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 5.0
    technical_score = round(sum(tech_scores) / len(tech_scores), 1) if tech_scores else 5.0
    hr_score = round(sum(hr_scores) / len(hr_scores), 1) if hr_scores else 5.0
    communication_score = max(0, min(10, req.communication_score))

    # Mark session as complete
    await db.interview_sessions.update_one(
        {"_id": to_object_id(req.session_id)},
        {"$set": {
            "overall_score": overall_score,
            "technical_score": technical_score,
            "hr_score": hr_score,
            "communication_score": communication_score,
            "completed": True,
            "completed_at": datetime.utcnow(),
        }}
    )

    # Increment user usage
    await increment_user_usage(str(current_user.id), "interview_sessions_used")

    # Log event
    await log_event("interview_completed", user_id=str(current_user.id), metadata={
        "job_role": job_role,
        "overall_score": overall_score,
        "session_id": req.session_id,
    })

    # Return full session with ideal answers (first reveal)
    final_session = await db.interview_sessions.find_one({"_id": to_object_id(req.session_id)})
    final_session["id"] = str(final_session.pop("_id"))

    return final_session


@router.get("/history")
async def get_history(current_user: UserModel = Depends(get_current_user)):
    """Return list of user's completed interview sessions."""
    db = get_db()

    sessions = await db.interview_sessions.find(
        {"user_id": str(current_user.id), "completed": True},
        sort=[("completed_at", -1)]
    ).to_list(length=100)

    result = []
    for s in sessions:
        result.append({
            "session_id": str(s["_id"]),
            "job_role": s.get("job_role", ""),
            "overall_score": s.get("overall_score"),
            "communication_score": s.get("communication_score"),
            "technical_score": s.get("technical_score"),
            "hr_score": s.get("hr_score"),
            "completed_at": s.get("completed_at", "").isoformat() if s.get("completed_at") else None,
            "total_questions": len(s.get("questions", [])),
            "started_at": s.get("started_at", "").isoformat() if s.get("started_at") else None,
        })

    return result


@router.get("/session/{session_id}")
async def get_session(session_id: str, current_user: UserModel = Depends(get_current_user)):
    """Return full session detail — only for completed sessions."""
    db = get_db()

    session = await db.interview_sessions.find_one({
        "_id": to_object_id(session_id),
        "user_id": str(current_user.id),
    })
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.get("completed"):
        raise HTTPException(status_code=403, detail="Session not yet completed")

    session["id"] = str(session.pop("_id"))
    return session


# ── WebSocket STT Streaming ─────────────────────────────────────────

async def websocket_transcribe(websocket: WebSocket, session_id: str, token: str = Query(None)):
    """
    WebSocket endpoint for real-time speech-to-text streaming.
    Uses Google Cloud Speech-to-Text v2 Chirp model.
    Audio chunks are ephemeral — streamed to STT, never stored.
    """
    from jose import JWTError, jwt as jose_jwt

    # Authenticate via query param token
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    try:
        payload = jose_jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except JWTError:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Validate session
    db = get_db()
    session = await db.interview_sessions.find_one({
        "_id": to_object_id(session_id),
        "user_id": user_id,
    })
    if not session:
        await websocket.close(code=4004, reason="Session not found")
        return

    await websocket.accept()

    speech_context_phrases = []
    current_question_text = ""

    try:
        from google.cloud import speech

        # Wait for first message — context message with technical terms
        first_msg = await websocket.receive_text()
        try:
            context_data = json.loads(first_msg)
            if context_data.get("type") == "context":
                speech_context_phrases = context_data.get("phrases", [])
                current_question_text = context_data.get("question_text", "")
        except (json.JSONDecodeError, KeyError):
            pass

        # Build streaming config with Chirp model
        speech_client = speech.SpeechClient()

        recognition_config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=16000,
            language_code="en-US",
            model="chirp",
            use_enhanced=True,
            enable_automatic_punctuation=True,
            enable_word_time_offsets=True,
            speech_contexts=[
                speech.SpeechContext(
                    phrases=speech_context_phrases[:100],
                    boost=20.0,
                )
            ] if speech_context_phrases else [],
        )

        streaming_config = speech.StreamingRecognitionConfig(
            config=recognition_config,
            interim_results=True,
            single_utterance=False,
        )

        # Audio chunk generator
        audio_queue = asyncio.Queue()
        stop_event = asyncio.Event()

        async def audio_generator():
            """Generates StreamingRecognizeRequest from WebSocket audio chunks."""
            # First request must contain only config
            yield speech.StreamingRecognizeRequest(streaming_config=streaming_config)

            while not stop_event.is_set():
                try:
                    chunk = await asyncio.wait_for(audio_queue.get(), timeout=1.0)
                    if chunk is None:
                        break
                    yield speech.StreamingRecognizeRequest(audio_content=chunk)
                except asyncio.TimeoutError:
                    continue

        async def receive_audio():
            """Receive audio chunks from WebSocket and enqueue them."""
            try:
                while not stop_event.is_set():
                    message = await websocket.receive()
                    if message.get("type") == "websocket.disconnect":
                        break
                    if "bytes" in message:
                        # Audio chunks are ephemeral — streamed to STT, never stored
                        await audio_queue.put(message["bytes"])
                    elif "text" in message:
                        try:
                            data = json.loads(message["text"])
                            if data.get("type") == "stop":
                                break
                        except json.JSONDecodeError:
                            pass
            except WebSocketDisconnect:
                pass
            finally:
                stop_event.set()
                await audio_queue.put(None)

        async def process_responses():
            """Process STT responses and send transcripts back via WebSocket."""
            loop = asyncio.get_event_loop()

            try:
                def get_responses():
                    return speech_client.streaming_recognize(
                        requests=_sync_gen_from_async(audio_generator(), loop),
                        timeout=300,
                    )

                responses = await loop.run_in_executor(None, get_responses)

                for response in responses:
                    if stop_event.is_set():
                        break
                    for result in response.results:
                        transcript = result.alternatives[0].transcript if result.alternatives else ""
                        confidence = result.alternatives[0].confidence if result.alternatives else 0.0

                        if result.is_final:
                            await websocket.send_json({
                                "type": "final",
                                "transcript": transcript,
                                "confidence": confidence,
                            })
                        else:
                            await websocket.send_json({
                                "type": "partial",
                                "transcript": transcript,
                            })
            except Exception as e:
                logger.error(f"STT processing error: {e}")
                if not stop_event.is_set():
                    try:
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Transcription error: {str(e)}"
                        })
                    except Exception:
                        pass

        # Run audio reception and STT processing concurrently
        receive_task = asyncio.create_task(receive_audio())
        process_task = asyncio.create_task(process_responses())

        await asyncio.gather(receive_task, process_task, return_exceptions=True)

    except ImportError:
        await websocket.send_json({
            "type": "error",
            "message": "Google Cloud Speech not installed"
        })
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


def _sync_gen_from_async(async_gen, loop):
    """Helper to bridge async generator to sync generator for Google Cloud Speech client."""
    import concurrent.futures

    def sync_generator():
        try:
            while True:
                future = asyncio.run_coroutine_threadsafe(async_gen.__anext__(), loop)
                try:
                    yield future.result(timeout=5.0)
                except concurrent.futures.TimeoutError:
                    continue
        except StopAsyncIteration:
            return

    return sync_generator()
