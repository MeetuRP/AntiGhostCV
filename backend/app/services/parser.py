import pdfplumber
import re
from typing import List, Dict, Optional, Any
from ..models import ExtractedData

# Enhanced skills list with modern tech stack
SKILLS_DB = [
    # Programming Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "C", "SQL", "Go", "Rust", "Swift", "PHP",
    "Kotlin", "Ruby", "Scala", "Perl", "R", "MATLAB", "Dart", "Solidity", "Bash", "Shell", "PowerShell",
    # AI/ML & Data
    "Machine Learning", "Deep Learning", "LLM", "RAG", "LangChain", "Agentic AI", "NLP",
    "Computer Vision", "Model Deployment", "Data Analysis", "Data Science", "Data Engineering",
    "Vector Databases", "FAISS", "ChromaDB", "Pinecone", "Neural Networks",
    "Reinforcement Learning", "Transfer Learning", "Feature Engineering", "Prompt Engineering",
    "Fine-tuning", "Embeddings", "OpenCV",
    # Libraries & Frameworks
    "FastAPI", "Flask", "Django", "React", "Next.js", "Vue", "Angular", "Express",
    "Spring Boot", "Node.js", ".NET", "Rails", "Laravel",
    "NumPy", "Pandas", "Matplotlib", "Scikit-learn", "PyTorch", "TensorFlow",
    "Hugging Face", "OpenAI API", "Keras", "NLTK", "spaCy",
    "Selenium", "Beautiful Soup", "Scrapy", "Celery",
    # Databases
    "MongoDB", "PostgreSQL", "MySQL", "Redis", "SQLite", "Firebase", "DynamoDB",
    "Cassandra", "Neo4j", "Elasticsearch", "Supabase",
    # Tools & DevOps
    "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Linux", "Nginx",
    "Git", "GitHub", "GitLab", "CI/CD", "Jenkins", "Terraform", "Ansible",
    "Power BI", "Tableau", "Grafana", "Prometheus",
    # Web Technologies
    "REST API", "GraphQL", "WebSocket", "gRPC", "Streamlit", "Vercel",
    "HTML", "CSS", "SASS", "Tailwind CSS", "Bootstrap",
    # Mobile
    "React Native", "Flutter", "Android", "iOS", "SwiftUI",
    # Other
    "Agile", "Scrum", "JIRA", "Figma", "Photoshop", "Canva",
    "Blockchain", "Web3", "Microservices", "System Design",
    "STT", "TTS", "Speech Recognition", "Text-to-Speech",
]

ROLE_MAP = {
    "Frontend Developer": ["React", "Vue", "Angular", "Next.js", "HTML", "CSS", "JavaScript", "TypeScript", "Tailwind CSS"],
    "Backend Developer": ["FastAPI", "Flask", "Django", "Express", "Node.js", "Spring Boot", "REST API", "GraphQL"],
    "Full Stack Developer": ["React", "Node.js", "MongoDB", "Express", "Next.js", "Django", "FastAPI"],
    "Data Scientist": ["Python", "Machine Learning", "Deep Learning", "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch"],
    "Data Engineer": ["SQL", "Python", "Data Engineering", "AWS", "GCP"],
    "ML Engineer": ["Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Model Deployment", "Docker", "Kubernetes"],
    "AI Engineer": ["LLM", "RAG", "LangChain", "Agentic AI", "NLP", "OpenAI API", "Hugging Face"],
    "DevOps Engineer": ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Jenkins", "Linux", "Ansible"],
    "Cloud Engineer": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform"],
    "Mobile Developer": ["React Native", "Flutter", "Android", "iOS", "Swift", "Kotlin", "Dart"],
    "Blockchain Developer": ["Solidity", "Web3", "Blockchain"],
    "UI/UX Designer": ["Figma", "Photoshop", "Canva", "CSS", "Tailwind CSS"],
}


class ResumeParser:
    @staticmethod
    def extract_text(file_path: str) -> str:
        """
        Extract raw text from PDF using word-level bbox extraction.
        This reconstructs lines with proper spaces between words based on
        their x-positions, fixing concatenation of words like
        'MindSyncXLabs(AI-MLEngineer)' → 'MindSyncX Labs (AI-ML Engineer)'.
        """
        full_text_lines = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                # Use extract_words() for accurate word spacing
                words = page.extract_words(
                    x_tolerance=3,
                    y_tolerance=3,
                    keep_blank_chars=False,
                    use_text_flow=True,
                ) or []

                if not words:
                    # Fallback to extract_text if no words
                    raw = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
                    full_text_lines.append(raw)
                    continue

                # Group words into lines by their top-y coordinate
                lines: Dict[float, List[Any]] = {}
                for w in words:
                    top = round(w['top'], 1)
                    lines.setdefault(top, []).append(w)

                for top in sorted(lines.keys()):
                    line_words = sorted(lines[top], key=lambda w: w['x0'])
                    # Reconstruct line: join words; insert extra space if gap is wide
                    reconstructed = ""
                    for i, word in enumerate(line_words):
                        if i == 0:
                            reconstructed = word['text']
                        else:
                            prev = line_words[i - 1]
                            gap = word['x0'] - prev['x1']
                            # If gap > 8px, treat as a word space
                            sep = " " if gap > 1 else " "
                            reconstructed += sep + word['text']
                    full_text_lines.append(reconstructed)

                # Page break marker
                full_text_lines.append("")

        return "\n".join(full_text_lines)

    @staticmethod
    def extract_hyperlinks(file_path: str) -> List[Dict[str, str]]:
        """
        Extract all clickable hyperlinks embedded in the PDF annotations.
        These include GitHub, LinkedIn, portfolio links hidden behind icons/text like
        'Github', 'mail', 'LinkedIn', social icons, etc.
        Returns a list of dicts: { "text": displayed_text, "url": href }
        """
        hyperlinks = []
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    # pdfplumber exposes annotations (hyperlinks) via page.annots
                    annots = page.annots or []
                    for annot in annots:
                        uri = annot.get("uri") or annot.get("URI")
                        if uri:
                            # Try to get display text near the annotation rect
                            rect = annot.get("rect") or []
                            display_text = ""
                            if len(rect) == 4:
                                x0, y0, x1, y1 = rect
                                # Crop words near the hyperlink bounding box
                                try:
                                    cropped = page.within_bbox((x0, y0, x1, y1), relative=False)
                                    display_text = (cropped.extract_text() or "").strip()
                                except Exception:
                                    pass
                            hyperlinks.append({
                                "text": display_text or uri,
                                "url": uri.strip()
                            })
        except Exception as e:
            print(f"[Parser] Hyperlink extraction failed: {e}")
        return hyperlinks

    @staticmethod
    def extract_links(text: str, hyperlinks: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        Extract GitHub, LinkedIn, portfolio, email, phone, and all other URLs.
        Merges text-based regex matches with embedded PDF hyperlinks.
        """
        links: Dict[str, Any] = {
            "github": None,
            "linkedin": None,
            "website": None,
            "email": None,
            "phone": None,
            "other": [],
        }

        # Email
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        if email_match:
            links["email"] = email_match.group(0)

        # Phone (international aware)
        phone_match = re.search(r'(\+?[\d\s\-().]{7,20})', text)
        if phone_match:
            candidate = phone_match.group(0).strip()
            # Must have at least 7 digits
            if sum(c.isdigit() for c in candidate) >= 7:
                links["phone"] = candidate

        # URL extraction from text
        url_pattern = r'https?://[^\s,)>\]\"\']+'
        url_pattern2 = r'(?<!\w)www\.[^\s,)>\]\"\']+'
        all_found_urls = re.findall(url_pattern, text, re.IGNORECASE)
        all_found_urls += re.findall(url_pattern2, text, re.IGNORECASE)

        # Also handle bare domains: "github.com/user" without protocol
        gh_bare = re.search(r'(?<!\w)github\.com/([A-Za-z0-9_\-]+)', text, re.IGNORECASE)
        if gh_bare:
            all_found_urls.append(f"https://github.com/{gh_bare.group(1)}")

        li_bare = re.search(r'(?<!\w)linkedin\.com/in/([A-Za-z0-9_\-]+)', text, re.IGNORECASE)
        if li_bare:
            all_found_urls.append(f"https://linkedin.com/in/{li_bare.group(1)}")

        for url in all_found_urls:
            url = url.strip().rstrip('.,;:/)')
            url_lower = url.lower()
            if "github.com" in url_lower and not links["github"]:
                links["github"] = url
            elif "linkedin.com" in url_lower and not links["linkedin"]:
                links["linkedin"] = url
            elif not links["website"]:
                links["website"] = url
            else:
                if url not in links["other"]:
                    links["other"].append(url)

        # Merge embedded PDF hyperlinks — these capture hidden icon/symbol links
        if hyperlinks:
            for h in hyperlinks:
                href = h.get("url", "")
                label = h.get("text", "").lower().strip()
                href_lower = href.lower()

                if "github.com" in href_lower and not links["github"]:
                    links["github"] = href
                elif "linkedin.com" in href_lower and not links["linkedin"]:
                    links["linkedin"] = href
                elif "mailto:" in href_lower and not links["email"]:
                    links["email"] = href.replace("mailto:", "").strip()
                elif not links["website"] and href_lower.startswith("http"):
                    links["website"] = href
                elif href not in links["other"] and href_lower.startswith("http"):
                    links["other"].append(href)

        return links

    @staticmethod
    def extract_skills(text: str) -> List[str]:
        """Extract skills using keyword matching."""
        found = []
        for skill in SKILLS_DB:
            if re.search(rf'\b{re.escape(skill)}\b', text, re.IGNORECASE):
                found.append(skill)
        return list(dict.fromkeys(found))  # preserve order, deduplicate

    @staticmethod
    def suggest_roles(skills: List[str]) -> List[str]:
        """Auto-suggest job roles based on matched skills."""
        role_scores: Dict[str, int] = {}
        skills_lower = {s.lower() for s in skills}

        for role, role_skills in ROLE_MAP.items():
            matched = sum(1 for s in role_skills if s.lower() in skills_lower)
            if matched >= 2:
                role_scores[role] = matched

        sorted_roles = sorted(role_scores.items(), key=lambda x: x[1], reverse=True)
        return [role for role, _ in sorted_roles[:5]]

    @staticmethod
    def extract_summary(text: str, name: Optional[str]) -> Optional[str]:
        """
        Try to extract a professional summary/objective paragraph.
        Looks for common header keywords and grabs the paragraph underneath.
        """
        summary_headers = [
            "summary", "professional summary", "about me", "objective",
            "career objective", "profile", "professional profile"
        ]
        lines = text.split('\n')
        for i, line in enumerate(lines):
            stripped = line.strip().lower()
            if stripped in summary_headers:
                # Grab next 5 non-empty lines as the summary block
                summary_lines = []
                for j in range(i + 1, min(i + 8, len(lines))):
                    content = lines[j].strip()
                    if content and content.lower() not in summary_headers:
                        # Stop if we hit another section header (all caps or known header)
                        if content.isupper() and len(content.split()) <= 4:
                            break
                        summary_lines.append(content)
                if summary_lines:
                    return ' '.join(summary_lines)
        return None

    @staticmethod
    def split_section_entries(section_text: str, section_type: str = "") -> List[str]:
        """
        Split a section blob into individual entries.
        - EDUCATION: each row anchored by a year or 'Present' is its own entry.
        - CERTIFICATIONS: each non-empty line = one entry.
        - PROJECTS/EXPERIENCE: a short non-bullet capitalized line (project title / org name)
          starts a new entry block; URL-only lines attach to current block.
        """
        lines = [l.strip() for l in section_text.split('\n')]
        lines = [l for l in lines if l]

        date_re = re.compile(
            r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[.\s]*\d{4}'
            r'|\d{4}\s*[-\u2013\u2014]\s*(\d{4}|Present|Current|Now)'
            r'|\bPresent\b|\bCurrent\b'
            r'|(19|20)\d{2}',
            re.IGNORECASE
        )
        bullet_re = re.compile(r'^[\u2022\-\u25cf\u25aa\u25e6\*\u2013\u00b7]')
        url_re = re.compile(r'https?://|github\.com|linkedin\.com', re.IGNORECASE)

        stype = section_type.upper()

        # ── EDUCATION: year-row style ───────────────────────────────────────
        if stype == 'EDUCATION':
            entries: List[str] = []
            current: List[str] = []
            for line in lines:
                is_new_row = bool(re.match(r'^(Present|\d{4})', line, re.IGNORECASE)) \
                             or bool(re.search(r'\b(19|20)\d{2}\b', line))
                if is_new_row and current:
                    entries.append(' '.join(current))
                    current = [line]
                else:
                    current.append(line)
            if current:
                entries.append(' '.join(current))
            final = [e.strip() for e in entries if len(e.strip()) > 5]
            return final if final else [' '.join(lines)] if lines else []

        # ── CERTIFICATIONS: each non-empty line ────────────────────────────
        if stype == 'CERTIFICATIONS':
            return [l for l in lines if len(l) > 3]

        # ── PROJECTS / EXPERIENCE: title-block detection ───────────────────
        entries_blocks: List[List[str]] = []
        current_block: List[str] = []

        for line in lines:
            is_bullet = bool(bullet_re.match(line))
            has_date = bool(date_re.search(line))
            is_url_line = bool(url_re.search(line)) and len(line.split()) <= 5

            # A URL-only line belongs to the current block (GitHub/LinkedIn link for project)
            if is_url_line and current_block:
                current_block.append(line)
                continue

            words = line.split()
            # A new "title line" starts a new entry:
            # - Has a date and is not purely a bullet continuation
            # - OR: short non-bullet, starts with capital, no trailing dot → project name / org
            is_title_line = (
                (has_date and not is_bullet)
                or (
                    not is_bullet
                    and not is_url_line
                    and 1 <= len(words) <= 14
                    and not line.endswith('.')
                    and line[0:1].upper() == line[0:1]  # starts with capital
                    and bool(re.search(r'[A-Z]', line))
                    and not re.match(
                        r'^(and|the|in|for|with|of|at|to|is|by|a|an|'
                        r'built|developed|created|led|managed|designed|implemented|achieved)\b',
                        line, re.I
                    )
                )
            )

            if is_title_line and current_block:
                entries_blocks.append(current_block)
                current_block = [line]
            elif is_title_line and not current_block:
                current_block = [line]
            else:
                current_block.append(line)

        if current_block:
            entries_blocks.append(current_block)

        result: List[str] = []
        for block in entries_blocks:
            joined = ' '.join(block)
            if len(joined.strip()) > 10:
                result.append(joined.strip())

        if not result and lines:
            result = [' '.join(lines)]

        return result



    @staticmethod
    def extract_sections(text: str) -> Dict[str, List[str]]:
        """Extract structured sections from any resume layout."""
        sections_config = {
            "EXPERIENCE": [
                "experience", "work experience", "work history", "professional experience",
                "employment history", "employment", "career history", "internship", "internships",
                "work experience", "professional background"
            ],
            "EDUCATION": [
                "education", "academic background", "academic qualifications",
                "academics", "educational qualification", "qualifications", "academic details"
            ],
            "PROJECTS": [
                "projects", "technical projects", "personal projects", "key projects",
                "academic projects", "side projects", "open source", "project work"
            ],
            "CERTIFICATIONS": [
                "certifications", "certificates", "achievements", "awards",
                "honors", "accomplishments", "courses", "training", "licenses"
            ],
            "PUBLICATIONS": [
                "publications", "papers", "research", "research papers", "journal"
            ],
            "VOLUNTEERING": [
                "volunteering", "volunteer", "community service", "extracurricular"
            ],
        }

        extracted: Dict[str, List[str]] = {k: [] for k in sections_config}
        header_positions: List[tuple] = []
        lower_text = text.lower()

        for section_key, keywords in sections_config.items():
            for keyword in keywords:
                # Match standalone header lines (full line match)
                pattern = rf'(?m)^\s*{re.escape(keyword)}\s*$'
                matches = re.finditer(pattern, lower_text, re.IGNORECASE)
                for match in matches:
                    header_positions.append((match.start(), section_key, len(keyword)))

        # Deduplicate: if same position claimed by two keywords, keep the longer/more specific
        seen_pos: Dict[int, tuple] = {}
        for pos, key, length in header_positions:
            if pos not in seen_pos or seen_pos[pos][2] < length:
                seen_pos[pos] = (pos, key, length)
        header_positions = sorted(seen_pos.values(), key=lambda x: x[0])

        for i in range(len(header_positions)):
            start_pos, section_name, _ = header_positions[i]
            s = int(start_pos)
            try:
                e = int(header_positions[i + 1][0])
            except IndexError:
                e = len(text)

            chunk = text[s:e]
            chunk_lines = chunk.split('\n')
            content = '\n'.join(chunk_lines[1:])  # skip the header line itself

            if section_name in extracted and len(content.strip()) > 5:
                entries = ResumeParser.split_section_entries(content, section_type=section_name)
                extracted[section_name].extend(entries)

        # Fallback: minimal detection
        if not any(extracted.values()):
            if "experience" in lower_text:
                extracted["EXPERIENCE"].append("Experience section detected but could not be parsed structurally.")
            if "education" in lower_text:
                extracted["EDUCATION"].append("Education section detected but could not be parsed structurally.")
            if "project" in lower_text:
                extracted["PROJECTS"].append("Projects section detected but could not be parsed structurally.")

        return extracted

    @staticmethod
    def extract_structured_resume(file_path: str) -> Dict[str, Any]:
        """
        Master parser: returns a fully structured, rich JSON dict representing the resume.
        Uses word-bbox extraction for proper word spacing (multi-page aware).
        """
        # Step 1: Extract properly-spaced text using word-bbox method
        text = ResumeParser.extract_text(file_path)

        # Step 2: Extract embedded PDF hyperlinks (hidden behind icons/symbols)
        hyperlinks = ResumeParser.extract_hyperlinks(file_path)

        # Step 3: Parse all fields
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        email = email_match.group(0) if email_match else None

        phone_match = re.search(r'(\+?[\d\s\-().]{7,20})', text)
        phone = None
        if phone_match:
            candidate = phone_match.group(0).strip()
            if sum(c.isdigit() for c in candidate) >= 7:
                phone = candidate

        lines = [line.strip() for line in text.split('\n') if line.strip()]
        name = lines[0] if lines else None

        links = ResumeParser.extract_links(text, hyperlinks)
        skills = ResumeParser.extract_skills(text)
        sections = ResumeParser.extract_sections(text)
        suggested_roles = ResumeParser.suggest_roles(skills)
        summary = ResumeParser.extract_summary(text, name)

        return {
            "name": name,
            "email": email or links.get("email"),
            "phone": phone,
            "summary": summary,
            "links": links,
            "hyperlinks": hyperlinks,
            "skills": skills,
            "experience": sections["EXPERIENCE"],
            "education": sections["EDUCATION"],
            "projects": sections["PROJECTS"],
            "certifications": sections["CERTIFICATIONS"],
            "publications": sections.get("PUBLICATIONS", []),
            "volunteering": sections.get("VOLUNTEERING", []),
            "suggested_roles": suggested_roles,
        }

    @staticmethod
    def parse_resume(text: str) -> ExtractedData:
        """Legacy entry point for backward compat: parse resume text into ExtractedData."""
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        email = email_match.group(0) if email_match else None

        phone_match = re.search(r'(\+?\d{1,3}[\-.\s]?)?(\(?\d{3}\)?[\-.\s]?)?\d{3}[\-.\s]?\d{4}', text)
        phone = phone_match.group(0) if phone_match else None

        lines = [line.strip() for line in text.split('\n') if line.strip()]
        name = lines[0] if lines else None

        links = ResumeParser.extract_links(text)
        skills = ResumeParser.extract_skills(text)
        sections = ResumeParser.extract_sections(text)
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
