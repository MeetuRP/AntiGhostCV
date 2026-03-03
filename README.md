<div align="center">

# 🚀 ResumeBuddy

### AI-Powered Resume Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

**Upload your resume once. Get intelligent insights forever.**

ResumeBuddy parses your resume with smart extraction algorithms, auto-builds a professional profile, matches you against job descriptions with ATS scoring, and suggests the best-fit roles — all without needing an LLM API key.

[Getting Started](#-getting-started) · [Features](#-features) · [Architecture](#-architecture) · [Tech Stack](#%EF%B8%8F-tech-stack)

</div>

---

## ✨ Features

### 🧠 Smart Resume Parser
- **Intelligent section detection** — Identifies Experience, Education, Projects, Certifications using multi-pattern header matching with fallback strategies
- **Per-entry splitting** — Breaks sections into individual entries using date patterns and structural analysis (not a single blob)
- **URL extraction** — Auto-detects GitHub, LinkedIn, portfolio, and email links from resume text
- **Skill recognition** — Matches against an 80+ curated tech skill database covering AI/ML, web dev, cloud, DevOps, mobile, and more
- **Auto role suggestion** — Maps your skills against 12 role clusters to suggest your best-fit job titles

### 🎯 ATS Scoring Engine
- **Skill-based matching** — Extracts required skills from any job description and compares against your resume
- **Match percentage** — Precise ATS compatibility score calculated as `matched_skills / required_skills × 100`
- **Gap analysis** — Identifies missing skills and generates actionable improvement suggestions
- **Persistent history** — All evaluation results stored in MongoDB for tracking progress over time

### 👤 Intelligent Profile Page
- **Auto-populated profile** — Upload a resume and your profile fills itself: skills, experience, education, projects, certifications, social links, and suggested roles
- **Resume re-upload** — Update your resume anytime directly from the profile page; data auto-syncs
- **Editable preferences** — Manually adjust job preferences, social links, and bio
- **Glassmorphic UI** — Premium design with backdrop blur, gradient accents, and smooth animations

### 🔐 Authentication & Security
- **Google OAuth 2.0** — Secure sign-in with Google accounts via Authlib
- **JWT tokens** — Stateless authentication with configurable expiration
- **Protected routes** — Frontend route guards + backend middleware for API security

### 📊 Dashboard
- **Rich resume cards** — Displays name, skill count, skill tags, and upload date
- **Grid layout** — Responsive card-based design with hover effects
- **Quick actions** — Upload new resumes or evaluate existing ones in one click

---

## 🏗️ Architecture

```
resume_analyzer/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── main.py             # App entrypoint, CORS, middleware
│   │   ├── config.py           # Pydantic settings (env vars)
│   │   ├── database.py         # MongoDB async connection (Motor)
│   │   ├── middleware.py       # JWT auth middleware
│   │   ├── models.py           # Pydantic models (User, Resume, Analysis)
│   │   ├── routes/
│   │   │   ├── auth.py         # Google OAuth + JWT + profile CRUD
│   │   │   ├── resume.py       # Upload, parse, auto-sync profile
│   │   │   └── analysis.py     # ATS scoring + skill matching
│   │   └── services/
│   │       └── parser.py       # Smart resume parser engine
│   ├── requirements.txt
│   └── .env                    # Secrets (not committed)
│
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/         # Navbar, ResumeCard, FileUploader, etc.
│   │   ├── routes/             # Home, Profile, Upload, Evaluate, Results
│   │   ├── lib/                # Zustand auth store, Axios API client
│   │   └── types/              # TypeScript interfaces
│   ├── public/                 # Static assets
│   └── package.json
│
├── .gitignore
└── README.md
```

### Data Flow

```
┌──────────┐    PDF Upload    ┌──────────────┐    MongoDB    ┌──────────┐
│ Frontend │ ──────────────►  │  FastAPI API  │ ────────────► │ Database │
│ (React)  │ ◄──────────────  │  (Python)     │ ◄──────────── │ (Mongo)  │
└──────────┘   JSON Response  └──────┬───────┘   Query/Store  └──────────┘
                                     │
                              ┌──────▼───────┐
                              │ Smart Parser │
                              │  - PDFplumber │
                              │  - Regex NLP  │
                              │  - Skill DB   │
                              │  - Role Map   │
                              └──────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, TypeScript, Vite | SPA with fast HMR |
| **Styling** | Tailwind CSS | Utility-first, glassmorphic design |
| **State** | Zustand | Lightweight auth state management |
| **HTTP** | Axios | API client with auth interceptors |
| **Routing** | React Router v7 | Client-side navigation + protected routes |
| **Backend** | FastAPI (Python) | Async REST API with auto-docs |
| **Auth** | Google OAuth 2.0 + JWT | Authlib + python-jose |
| **Database** | MongoDB + Motor | Async document database |
| **Parsing** | pdfplumber + regex | PDF text extraction + NLP |
| **Validation** | Pydantic v2 | Schema validation + serialization |

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|------------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| MongoDB | 6.0+ (local or Atlas) |
| Google Cloud | OAuth 2.0 credentials |

### 1. Clone & Setup

```bash
git clone https://github.com/MeetuRP/ResumeBuddy.git
cd ResumeBuddy
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Variables

Create `backend/.env`:

```env
JWT_SECRET=your_jwt_secret_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_EXPIRATION_DAYS=7
JWT_ALGORITHM=HS256
FRONTEND_URL=http://localhost:5173
```

> 💡 Get Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Set authorized redirect URI to `http://localhost:8000/api/auth/google/callback`.

### 4. Start Backend

```bash
cd backend
.\venv\Scripts\python -m uvicorn app.main:app --port 8000 --reload
```

### 5. Frontend Setup & Start

```bash
cd frontend
npm install
npm run dev
```

### 6. Open App

Navigate to **http://localhost:5173** → Sign in with Google → Upload your resume → Explore!

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/google` | Initiate Google OAuth flow |
| `GET` | `/api/auth/google/callback` | OAuth callback handler |
| `GET` | `/api/auth/me` | Get current user profile |
| `PUT` | `/api/auth/me` | Update user profile |
| `POST` | `/api/resume/upload` | Upload & parse resume (PDF) |
| `GET` | `/api/resume/me` | List user's resumes |
| `POST` | `/api/analysis/evaluate` | Run ATS scoring against JD |
| `GET` | `/api/analysis/history` | Get analysis history |

> 📖 Interactive API docs available at **http://localhost:8000/docs** (Swagger UI)

---

## 🧪 Smart Parser Details

The parser (`backend/app/services/parser.py`) uses a multi-layer extraction pipeline:

```
PDF → Text Extraction (pdfplumber)
    → Contact Info (regex: email, phone, name)
    → URL/Link Detection (GitHub, LinkedIn, portfolio)
    → Skill Matching (80+ skills × word boundary regex)
    → Section Extraction (header detection + content splitting)
    → Per-Entry Splitting (date patterns, bullets, blank lines)
    → Certification Detection (awards, achievements, honors)
    → Role Suggestion (skill clusters → 12 role categories)
```

### Supported Skill Categories
`Languages` · `AI/ML & Data` · `Web Frameworks` · `Databases` · `DevOps & Cloud` · `Mobile` · `Design Tools` · `Methodologies`

### Auto-Suggested Roles
`Frontend Developer` · `Backend Developer` · `Full Stack Developer` · `Data Scientist` · `ML Engineer` · `AI Engineer` · `DevOps Engineer` · `Cloud Engineer` · `Mobile Developer` · `Blockchain Developer` · `UI/UX Designer` · `Data Engineer`

---

## 🗺️ Roadmap

- [x] Google OAuth authentication
- [x] PDF resume parsing with smart extraction
- [x] Auto-populated profile page
- [x] ATS scoring engine (rule-based)
- [x] Resume re-upload with auto-sync
- [x] Suggested roles from skills
- [ ] LLM-powered semantic analysis (OpenAI / Gemini)
- [ ] AI-generated resume improvement suggestions
- [ ] Multi-resume comparison
- [ ] Job board integration
- [ ] Resume template generator
- [ ] Analytics dashboard with score trends

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ by [Meet Parmar](https://github.com/MeetuRP)**

⭐ Star this repo if you found it helpful!

</div>
