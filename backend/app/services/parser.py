import pdfplumber
import re
from typing import List, Dict, Optional
from ..models import ExtractedData

# Enhanced skills list with modern tech stack
SKILLS_DB = [
    # Programming Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "C", "SQL", "Go", "Rust", "Swift", "PHP",
    "Kotlin", "Ruby", "Scala", "Perl", "R", "MATLAB", "Dart", "Solidity",
    # AI/ML & Data
    "Machine Learning", "Deep Learning", "LLM", "RAG", "LangChain", "Agentic AI", "NLP",
    "Computer Vision", "Model Deployment", "Data Analysis", "Data Science", "Data Engineering",
    "Vector Databases", "FAISS", "ChromaDB", "Pinecone", "Neural Networks",
    "Reinforcement Learning", "Transfer Learning", "Feature Engineering",
    # Libraries & Frameworks
    "FastAPI", "Flask", "Django", "React", "Next.js", "Vue", "Angular", "Express",
    "Spring Boot", "Node.js", ".NET", "Rails", "Laravel",
    "NumPy", "Pandas", "Matplotlib", "Scikit-learn", "PyTorch", "TensorFlow",
    "Hugging Face", "OpenAI API", "Keras", "OpenCV", "NLTK", "spaCy",
    "Selenium", "Beautiful Soup", "Scrapy",
    # Databases
    "MongoDB", "PostgreSQL", "MySQL", "Redis", "SQLite", "Firebase", "DynamoDB",
    "Cassandra", "Neo4j", "Elasticsearch",
    # Tools & DevOps
    "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Linux", "Nginx",
    "Git", "GitHub", "GitLab", "CI/CD", "Jenkins", "Terraform", "Ansible",
    "Power BI", "Tableau", "Grafana",
    # Web Technologies
    "REST API", "GraphQL", "WebSocket", "gRPC", "Streamlit",
    "HTML", "CSS", "SASS", "Tailwind CSS", "Bootstrap",
    # Mobile
    "React Native", "Flutter", "Android", "iOS", "SwiftUI",
    # Other
    "Agile", "Scrum", "JIRA", "Figma", "Photoshop", "Canva",
    "Blockchain", "Web3", "Microservices", "System Design",
]

# Maps skill clusters to likely job roles
ROLE_MAP = {
    "Frontend Developer": ["React", "Vue", "Angular", "Next.js", "HTML", "CSS", "JavaScript", "TypeScript", "Tailwind CSS"],
    "Backend Developer": ["FastAPI", "Flask", "Django", "Express", "Node.js", "Spring Boot", "REST API", "GraphQL"],
    "Full Stack Developer": ["React", "Node.js", "MongoDB", "Express", "Next.js", "Django", "FastAPI"],
    "Data Scientist": ["Python", "Machine Learning", "Deep Learning", "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch"],
    "Data Engineer": ["SQL", "Python", "Data Engineering", "AWS", "GCP", "Spark", "Kafka", "Airflow"],
    "ML Engineer": ["Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Model Deployment", "Docker", "Kubernetes"],
    "AI Engineer": ["LLM", "RAG", "LangChain", "Agentic AI", "NLP", "OpenAI API", "Hugging Face"],
    "DevOps Engineer": ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Jenkins", "Linux", "Ansible"],
    "Cloud Engineer": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform"],
    "Mobile Developer": ["React Native", "Flutter", "Android", "iOS", "Swift", "Kotlin", "Dart"],
    "Blockchain Developer": ["Solidity", "Web3", "Blockchain", "Ethereum"],
    "UI/UX Designer": ["Figma", "Photoshop", "Canva", "CSS", "Tailwind CSS"],
}


class ResumeParser:
    @staticmethod
    def extract_text(file_path: str) -> str:
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        return text

    @staticmethod
    def extract_links(text: str) -> Dict[str, Optional[str]]:
        """Extract GitHub, LinkedIn, portfolio, and email URLs from resume text."""
        links: Dict[str, Optional[str]] = {
            "github": None,
            "linkedin": None,
            "website": None,
            "email": None,
        }

        # Email
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        if email_match:
            links["email"] = email_match.group(0)

        # Find all URLs in the text
        url_pattern = r'https?://[^\s,)>\]\"\']+|www\.[^\s,)>\]\"\']+' 
        urls = re.findall(url_pattern, text, re.IGNORECASE)

        for url in urls:
            url_lower = url.lower()
            if "github.com" in url_lower and not links["github"]:
                links["github"] = url.strip()
            elif "linkedin.com" in url_lower and not links["linkedin"]:
                links["linkedin"] = url.strip()
            elif not links["website"]:
                # Any other URL could be a portfolio/website
                links["website"] = url.strip()

        # Also check for "github.com/username" patterns without https
        if not links["github"]:
            gh_match = re.search(r'github\.com/([A-Za-z0-9_-]+)', text, re.IGNORECASE)
            if gh_match:
                links["github"] = f"https://github.com/{gh_match.group(1)}"

        if not links["linkedin"]:
            li_match = re.search(r'linkedin\.com/in/([A-Za-z0-9_-]+)', text, re.IGNORECASE)
            if li_match:
                links["linkedin"] = f"https://linkedin.com/in/{li_match.group(1)}"

        return links

    @staticmethod
    def extract_skills(text: str) -> List[str]:
        """Extract skills using keyword matching."""
        found = []
        for skill in SKILLS_DB:
            if re.search(rf'\b{re.escape(skill)}\b', text, re.IGNORECASE):
                found.append(skill)
        return list(set(found))

    @staticmethod
    def suggest_roles(skills: List[str]) -> List[str]:
        """Auto-suggest job roles based on matched skills."""
        role_scores: Dict[str, int] = {}
        skills_lower = {s.lower() for s in skills}

        for role, role_skills in ROLE_MAP.items():
            matched = sum(1 for s in role_skills if s.lower() in skills_lower)
            if matched >= 2:  # Need at least 2 matching skills
                role_scores[role] = matched

        # Sort by match count descending, return top 5
        sorted_roles = sorted(role_scores.items(), key=lambda x: x[1], reverse=True)
        return [role for role, _ in sorted_roles[:5]]

    @staticmethod
    def split_section_entries(section_text: str) -> List[str]:
        """Split a section blob into individual entries using date patterns, bullets, or blank lines."""
        entries: List[str] = []

        # Split by date-like patterns (e.g., "Jan 2023 – Present", "2020 - 2023", "08/2022")
        date_pattern = r'(?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|(?:19|20)\d{2}\s*[-–—])'
        
        # First try splitting by date patterns at line starts
        lines = section_text.split('\n')
        current_entry_lines: List[str] = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                if current_entry_lines:
                    entries.append(' '.join(current_entry_lines))
                    current_entry_lines = []
                continue

            # Check if this line starts a new entry (has a date pattern or looks like a role/title)
            has_date = bool(re.search(date_pattern, stripped, re.IGNORECASE))
            is_bullet = stripped.startswith(('•', '-', '●', '▪', '◦', '*', '–'))

            if has_date and current_entry_lines:
                # Save previous entry and start new one
                entries.append(' '.join(current_entry_lines))
                current_entry_lines = [stripped]
            elif is_bullet:
                current_entry_lines.append(stripped)
            else:
                current_entry_lines.append(stripped)

        if current_entry_lines:
            entries.append(' '.join(current_entry_lines))

        # Filter out very short/empty entries
        entries = [e.strip() for e in entries if len(e.strip()) > 10]

        # If splitting didn't produce multiple entries, return the whole block as one
        if not entries:
            cleaned = section_text.strip()
            if len(cleaned) > 10:
                entries = [cleaned]

        return entries

    @staticmethod
    def extract_sections(text: str) -> Dict[str, List[str]]:
        """Extract content sections (experience, education, projects, certifications) from resume."""
        sections_config = {
            "EXPERIENCE": ["experience", "work experience", "work history", "professional experience", "employment"],
            "EDUCATION": ["education", "academic background", "academic qualifications", "academics"],
            "PROJECTS": ["projects", "technical projects", "personal projects", "key projects", "academic projects"],
            "CERTIFICATIONS": ["certifications", "certificates", "achievements", "awards", "honors", "accomplishments"],
        }

        extracted: Dict[str, List[str]] = {
            "EXPERIENCE": [],
            "EDUCATION": [],
            "PROJECTS": [],
            "CERTIFICATIONS": [],
        }

        # Find header positions
        header_positions: List[tuple] = []
        lower_text = text.lower()

        for section_key, keywords in sections_config.items():
            for keyword in keywords:
                # Match keyword as a standalone header line
                pattern = rf'(?m)^\s*{re.escape(keyword)}\s*$'
                matches = re.finditer(pattern, lower_text, re.IGNORECASE)
                for match in matches:
                    header_positions.append((match.start(), section_key))

        header_positions.sort()

        # Extract content between headers
        for i in range(len(header_positions)):
            start_pos, section_name = header_positions[i]
            s = int(start_pos)
            try:
                e = int(header_positions[i + 1][0])
            except IndexError:
                e = len(text)

            chunk = text[s:e]
            chunk_lines = chunk.split('\n')
            # Remove the header line itself
            content = '\n'.join(chunk_lines[1:])

            if section_name in extracted and len(content.strip()) > 5:
                entries = ResumeParser.split_section_entries(content)
                extracted[section_name].extend(entries)

        # Fallback: if no sections were found, try basic keyword detection
        if not any(extracted.values()):
            if "experience" in lower_text:
                extracted["EXPERIENCE"].append("Experience section detected but could not be parsed structurally.")
            if "education" in lower_text:
                extracted["EDUCATION"].append("Education section detected but could not be parsed structurally.")
            if "project" in lower_text:
                extracted["PROJECTS"].append("Projects section detected but could not be parsed structurally.")

        return extracted

    @staticmethod
    def parse_resume(text: str) -> ExtractedData:
        """Main entry point: parse resume text into structured ExtractedData."""

        # 1. Extract basic contact info
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        email = email_match.group(0) if email_match else None

        phone_match = re.search(r'(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}', text)
        phone = phone_match.group(0) if phone_match else None

        # Name: first non-empty line
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        name = lines[0] if lines else None

        # 2. Extract links
        links = ResumeParser.extract_links(text)

        # 3. Extract skills
        skills = ResumeParser.extract_skills(text)

        # 4. Extract sections
        sections = ResumeParser.extract_sections(text)

        # 5. Suggest roles based on skills
        suggested_roles = ResumeParser.suggest_roles(skills)

        return ExtractedData(
            name=name,
            email=email,
            phone=phone,
            skills=skills,
            experience=sections["EXPERIENCE"],
            education=sections["EDUCATION"],
            projects=sections["PROJECTS"],
            certifications=sections["CERTIFICATIONS"],
            links=links,
            suggested_roles=suggested_roles,
        )
