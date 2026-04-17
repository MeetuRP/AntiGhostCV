import os
import json
import asyncio
import time
from typing import List, Optional, Dict
from pydantic import BaseModel
from google import genai
from google.genai import types
from ..config import settings

class ImprovementResponse(BaseModel):
    improved_text: str
    impact_score: int
    suggestions: List[str] = []

class OptimizeResponse(BaseModel):
    summary: str
    bullets: Dict[str, str]

class AIResumeImprover:
    MAX_RETRIES = 3
    RETRY_BASE_DELAY = 1.5  # seconds

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                self.model_name = "gemini-1.5-flash"
            except Exception as e:
                print(f"Gemini Client Initialization Error: {e}")
                self.client = None
        else:
            self.client = None

    def _is_retryable(self, error_str: str) -> bool:
        """Check if an error is transient and worth retrying."""
        retryable_patterns = ["503", "unavailable", "overloaded", "high demand", "internal", "deadline", "429", "too many requests", "quota", "resource_exhausted"]
        return any(p in error_str for p in retryable_patterns)

    async def _call_with_retry(self, model: str, contents: str, user_id: Optional[str] = None):
        """Call Gemini API with automatic retry + exponential backoff for transient errors."""
        loop = asyncio.get_event_loop()
        last_error = None

        for attempt in range(self.MAX_RETRIES):
            try:
                def call_gemini():
                    return self.client.models.generate_content(
                        model=model,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                        )
                    )

                response = await loop.run_in_executor(None, call_gemini)

                # Track Token Usage if user_id is provided
                if user_id and response.usage_metadata:
                    try:
                        from .usage import update_ai_usage
                        input_tokens = response.usage_metadata.prompt_token_count or 0
                        output_tokens = response.usage_metadata.candidates_token_count or 0
                        asyncio.create_task(update_ai_usage(user_id, input_tokens, output_tokens))
                    except Exception as track_err:
                        print(f"Usage Tracking Error: {track_err}")

                return response

            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                print(f"Gemini API attempt {attempt + 1}/{self.MAX_RETRIES} failed: {e}")

                if not self._is_retryable(error_str):
                    raise  # Non-retryable error, propagate immediately

                if attempt < self.MAX_RETRIES - 1:
                    delay = self.RETRY_BASE_DELAY * (2 ** attempt)
                    print(f"  Retrying in {delay:.1f}s...")
                    await asyncio.sleep(delay)

        # All retries exhausted
        raise last_error

    async def generate_resume_improvement(self, section_type: str, content: str, job_description: str, user_id: Optional[str] = None) -> ImprovementResponse:
        """
        Generic wrapper for Gemini-powered resume improvement using the new google-genai SDK.
        Includes automatic retry with exponential backoff for transient 503 errors.
        """
        if not self.client:
            # Fallback mock if API key is missing
            import random
            return ImprovementResponse(
                improved_text=f"{content} (AI improvement mock: aligned with {section_type})",
                impact_score=random.randint(6, 9),
                suggestions=["Add more quantifiable metrics.", "Use stronger action verbs."]
            )

        system_prompt = "You are an expert technical recruiter and resume optimizer. Your job is to improve resumes to maximize ATS ranking and recruiter appeal."
        
        user_prompt = f"""
Improve the following resume section for a professional ATS-friendly resume.

Section Type: {section_type}

Job Description:
{job_description}

Original Content:
{content}

Rules:
* Use strong action verbs
* Add measurable impact when possible
* Highlight technologies and skills
* Keep formatting ATS friendly
* Return concise professional text
* IMPORTANT: Keep the output roughly the same length as the input. Do NOT expand short items into long paragraphs.
* For skills: return ONLY the skill name keywords, never full sentences or project descriptions.

Return JSON (and ONLY JSON) in the following format:
{{
"improved_text": "...",
"impact_score": number,
"suggestions": ["...", "..."]
}}
"""

        full_prompt = f"{system_prompt}\n\n{user_prompt}"

        try:
            response = await self._call_with_retry(self.model_name, full_prompt, user_id)

            data = json.loads(response.text)
            return ImprovementResponse(
                improved_text=data.get("improved_text", content),
                impact_score=data.get("impact_score", 7),
                suggestions=data.get("suggestions", [])
            )
        except Exception as e:
            error_str = str(e).lower()
            print(f"Gemini AI Error (after retries): {e}")
            
            if "429" in error_str or "quota" in error_str or "resource_exhausted" in error_str:
                return ImprovementResponse(
                    improved_text="[QUOTA_EXCEEDED] The AI provider (Google Gemini) is currently busy or you have reached your free-tier API quota. Please wait a minute and try again.",
                    impact_score=0,
                    suggestions=[]
                )

            # If primary model unavailable/overloaded or not found, try fallback model
            should_fallback = (
                "not found" in error_str or "not supported" in error_str
                or "503" in error_str or "unavailable" in error_str
                or "overloaded" in error_str or "high demand" in error_str
            )
            if should_fallback:
                fallback_models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.0-pro"]
                for fb_model in fallback_models:
                    if fb_model == self.model_name:
                        continue
                    try:
                        print(f"Attempting fallback to {fb_model}...")
                        response = await self._call_with_retry(fb_model, full_prompt, user_id)

                        data = json.loads(response.text)
                        return ImprovementResponse(
                            improved_text=data.get("improved_text", content),
                            impact_score=data.get("impact_score", 7),
                            suggestions=data.get("suggestions", [])
                        )
                    except Exception as e2:
                        print(f"Gemini Fallback ({fb_model}) Error: {e2}")
                        if "429" in str(e2).lower() or "quota" in str(e2).lower() or "resource_exhausted" in str(e2).lower():
                            return ImprovementResponse(
                                improved_text="[QUOTA_EXCEEDED] The AI is currently processing too many requests. Please wait a minute.",
                                impact_score=0,
                                suggestions=[]
                            )
                        continue  # Try next fallback model

            return ImprovementResponse(
                improved_text="[QUOTA_EXCEEDED] AI improvement temporarily unavailable. Please try again in 60 seconds.",
                impact_score=0,
                suggestions=[]
            )

    async def improve_line(self, text: str, job_description: str, section: str, user_id: Optional[str] = None) -> ImprovementResponse:
        """
        Suggests an improvement for a single line and rates the impact.
        """
        return await self.generate_resume_improvement(section, text, job_description, user_id)

    async def optimize_resume(self, extracted_data: dict, job_description: str, user_id: Optional[str] = None) -> OptimizeResponse:
        """
        Suggests a complete rewrite of the summary and core bullets.
        """
        # Optimize summary
        summary_res = await self.generate_resume_improvement("Summary", extracted_data.get("summary", ""), job_description, user_id)
        
        # Optimize top bullets (simplified for now)
        exp = extracted_data.get("experience", [])
        bullets = {}
        if exp:
            # Just optimize the first few bullets for the 'optimize' overview
            for item in exp[:2]:
                if isinstance(item, str):
                    imp = await self.generate_resume_improvement("Experience", item, job_description, user_id)
                    bullets[item] = imp.improved_text

        return OptimizeResponse(
            summary=summary_res.improved_text,
            bullets=bullets
        )

improver_service = AIResumeImprover()
