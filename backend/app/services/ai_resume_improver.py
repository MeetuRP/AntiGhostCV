import os
from pydantic import BaseModel
from typing import List, Optional
import json

class ImprovementResponse(BaseModel):
    improved_text: str
    impact_score: int

class OptimizeResponse(BaseModel):
    summary: str
    bullets: dict

class AIResumeImprover:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if self.api_key:
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(api_key=self.api_key)
        else:
            self.client = None

    async def improve_line(self, text: str, job_description: str, section: str) -> ImprovementResponse:
        """
        Suggests an improvement for a single line (bullet points, summary) and rates the impact.
        Fallback to mock responses if API key is missing.
        """
        if not self.client:
            # Mock behavior based on length or simple keywords
            import random
            score = random.randint(3, 8)
            improved = f"{text} by incorporating measurable impacts and aligned with JD."
            if "developed" in text.lower() or "worked" in text.lower():
                improved = f"Engineered and delivered scalable solutions for {text}, increasing efficiency by 30%."
            
            return ImprovementResponse(improved_text=improved, impact_score=score + 2 if score < 8 else score)

        try:
            prompt = f"""
            You are an expert resume writer and ATS optimizer. 
            Improve the following {section} from a resume to match the given job description. 
            Make it sound professional, action-oriented, and include measurable metrics if vaguely implied.
            
            CRITICAL INSTRUCTION: You are a text replacement tool. Return ONLY the newly optimized sentence. 
            Do not include any conversational filler, labels, or introductory text like 'Optimized experience:' or 'Here is the fix:'. 
            Just return the raw optimized text.
            
            Original Text: "{text}"
            Job Description Snapshot: "{job_description[:500]}"
            
            Respond with JSON containing:
            "improved_text": string (the raw text only)
            "impact_score": int (1-10 rating of the NEW text's strength compared to the old one).
            """
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                response_format={ "type": "json_object" }
            )
            data = json.loads(response.choices[0].message.content)
            return ImprovementResponse(**data)
        except Exception as e:
            # Fallback on error
            print(f"AI Improvement Error: {e}")
            return ImprovementResponse(improved_text=f"Improved: {text}", impact_score=7)

    async def optimize_resume(self, extracted_data: dict, job_description: str) -> OptimizeResponse:
        """
        Suggests a complete rewrite of the summary and improvements to core bullets based on the JD.
        """
        if not self.client:
            return OptimizeResponse(
                summary="Dynamic professional with a proven track record of optimizing systems and driving results, fully aligned with the requirements of this role.",
                bullets={
                    "experience": "Enhanced performance and scalability across key projects.",
                }
            )

        try:
            prompt = f"""
            You are an expert resume writer. Given this resume data and job description, provide:
            1. A highly tailored summary (max 3 sentences).
            2. 2-3 improved bullet points tailored to the JD.
            
            Return JSON:
            "summary": string
            "bullets": dict mapping original text or section to improved text
            """
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                response_format={ "type": "json_object" }
            )
            data = json.loads(response.choices[0].message.content)
            return OptimizeResponse(**data)
        except Exception as e:
            print(f"AI Optimize Error: {e}")
            return OptimizeResponse(summary="Optimized Summary", bullets={})

improver_service = AIResumeImprover()
