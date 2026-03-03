from app.services.parser import ResumeParser

mock_text = """
Meet Parmar
Github | LinkedIn | Mail | +91-9265509610

SUMMARY
AI/ML Engineer with experience building LLM and RAG-powered systems...

WORK EXPERIENCE
MindSyncX Labs (AI-ML Engineer) Jul 2025 – Present
• AI/ML Engineer at MindSyncX Labs, developing multilingual...

PROJECTS
Voice-Enabled RAG Chatbot (Multilingual) GitHub
• Built a production-ready RAG chatbot...

EDUCATION
Present Master of Computer Applications (MCA), LJ University
2025 Bachelor of Computer Applications (BCA), LJ University

TECHNICAL SKILLS
Programming Languages: Python, Java, JavaScript, SQL
AI / ML: Machine Learning, Deep Learning, LLMs, RAG
"""

result = ResumeParser.parse_resume(mock_text)
print(f"Name: {result.name}")
print(f"Email: {result.email}")
print(f"Phone: {result.phone}")
print(f"Skills: {result.skills}")
print(f"Experience: {result.experience}")
print(f"Education: {result.education}")
print(f"Projects: {result.projects}")
