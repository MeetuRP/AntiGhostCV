import os
import json
import asyncio
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
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                self.model_name = "gemini-2.5-flash"
            except Exception as e:
                print(f"Gemini Client Initialization Error: {e}")
                self.client = None
        else:
            self.client = None

    async def generate_resume_improvement(self, section_type: str, content: str, job_description: str, user_id: Optional[str] = None) -> ImprovementResponse:
        """
        Generic wrapper for Gemini-powered resume improvement using the new google-genai SDK.
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

Return JSON (and ONLY JSON) in the following format:
{{
"improved_text": "...",
"impact_score": number,
"suggestions": ["...", "..."]
}}
"""

        try:
            # The new SDK is synchronous, so we run it in an executor
            def call_gemini():
                return self.client.models.generate_content(
                    model=self.model_name,
                    contents=f"{system_prompt}\n\n{user_prompt}",
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                    )
                )

            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, call_gemini)
            
            # Track Token Usage if user_id is provided
            if user_id and response.usage_metadata:
                try:
                    from .usage import update_ai_usage
                    # The SDK usage metadata structure
                    input_tokens = response.usage_metadata.prompt_token_count or 0
                    output_tokens = response.usage_metadata.candidates_token_count or 0
                    # Run tracking asynchronously without blocking the response
                    asyncio.create_task(update_ai_usage(user_id, input_tokens, output_tokens))
                except Exception as track_err:
                    print(f"Usage Tracking Error: {track_err}")

            data = json.loads(response.text)
            return ImprovementResponse(
                improved_text=data.get("improved_text", content),
                impact_score=data.get("impact_score", 7),
                suggestions=data.get("suggestions", [])
            )
        except Exception as e:
            error_str = str(e).lower()
            print(f"Gemini AI Error: {e}")
            
            # Specific check for quota/rate limit errors
            if "429" in error_str or "quota" in error_str or "resource_exhausted" in error_str:
                return ImprovementResponse(
                    improved_text="QUOTA_EXCEEDED: Daily AI Limit reached. Please try again later.",
                    impact_score=0,
                    suggestions=[]
                )

            # If 2.5-flash fails because it's too new/unavailable, try 2.0-flash or 1.5-flash as fallback to keep app running
            if "not found" in error_str or "not supported" in error_str:
                try:
                    print("Attempting fallback to gemini-2.0-flash...")
                    def call_fallback():
                        return self.client.models.generate_content(
                            model="gemini-2.0-flash",
                            contents=f"{system_prompt}\n\n{user_prompt}",
                            config=types.GenerateContentConfig(
                                response_mime_type="application/json",
                            )
                        )
                    response = await loop.run_in_executor(None, call_fallback)

                    # Track Token Usage for Fallback
                    if user_id and response.usage_metadata:
                        try:
                            from .usage import update_ai_usage
                            input_tokens = response.usage_metadata.prompt_token_count or 0
                            output_tokens = response.usage_metadata.candidates_token_count or 0
                            asyncio.create_task(update_ai_usage(user_id, input_tokens, output_tokens))
                        except: pass

                    data = json.loads(response.text)
                    return ImprovementResponse(
                        improved_text=data.get("improved_text", content),
                        impact_score=data.get("impact_score", 7),
                        suggestions=data.get("suggestions", [])
                    )
                except Exception as e2:
                    print(f"Gemini Fallback Error: {e2}")
                    if "429" in str(e2).lower() or "quota" in str(e2).lower():
                        return ImprovementResponse(
                            improved_text="QUOTA_EXCEEDED: Daily AI Limit reached. Please try again later.",
                            impact_score=0,
                            suggestions=[]
                        )

            return ImprovementResponse(
                improved_text="AI improvement unavailable. Please check your API key and quota.",
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
