<div align="center">

# 🚀 AntiGhost CV

### Stop getting left on 'read' by Workday.

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

**Upload once. Get premium insights forever.**

AntiGhost CV is a state-of-the-art platform that transforms static PDFs into dynamic intelligence. Features a **premium glassmorphic UI**, **animated scoring engines**, and **futuristic feedback categories** (Tone, Content, Structure) — all self-contained with smart extraction algorithms.

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

### 🎯 Futuristic Evaluation Hub
- **ScoreRing Engine** — Premium animated circular progress indicators with dynamic gradients and soft glow effects for overall ATS scoring.
- **Deep-Dive feedback categories**: 
  - **✨ Technical Skills Match** — Precise categorization of "Matches Found" and "Missing Core Skills".
  - **🏗️ Structure & Formatting** — Layout precision analysis for professional readability.
  - **🎭 Tone & Content Evolution** — Evaluates professional authority, bullet impact, and metric usage.
- **Categorized Glass Cards** — Clean, high-contrast feedback modules with success/warning variants for intuitive reading.
- **Unified Background Theme** — A seamless, integrated experience using a consistent project-wide background (`bg-main.svg`).

### 🤖 AI-Powered "Fix-It" Logic
- **Context-Aware Rewrite Core** — Deep structural insights powered natively by Google's Gemini-1.5/2.5-flash LLM architectures.
- **Micro-Optimization** — Improve single bullet points individually to aggressively multiply readability metrics without losing your unique voice.
- **Real-time SaaS Telemetry** — Absolute granular tracking of token expenditures (input vs output). Accurate cost estimation projected straight to your admin dashboard to optimize fleet management.

### 💳 Tiered SaaS Infrastructure
- **Dynamic Usage Capping** — Secure backend interception mechanisms limit JD scans and Fix-It queries based on the user's current SaaS Plan constraints.
- **Integrated Productization Pipeline** — Fully functional `/pricing` interface allowing frictionless plan upgrades with instantaneous reset of metrics.

### 👤 Premium Glassmorphic UI
- **Backdrop-Blur Excellence** — Every container is a frosted glass module (`glass-card`) balancing premium aesthetics with accessibility.
- **Micro-animations** — Smooth entry transitions, hover lifts, and interactive progress bars for a "wow" first impression.
- **Auto-Syncing Profile** — Upload a resume and your profile fills itself: skills, experience, education, projects, certifications, social links, and suggested roles.
- **Editable preferences** — Manually adjust job preferences, social links, and bio with a modern HUD interface.

### 🔐 Authentication & Security
- **Google OAuth 2.0** — Secure sign-in with Google accounts via Authlib.
- **JWT tokens** — Stateless authentication with configurable (7-day) expiration.
- **Protected routes** — Frontend route guards + backend internal middleware for API security.

### 📊 Admin Analytics Dashboard (HUD)
- **Premium Performance HUD** — Vibrant gradient-based dashboard for real-time monitoring of Users, Resumes, Evaluations, and Visits.
- **Traffic Intelligence** — Automated site visit logging with IP and UA capture; 30-day interactive activity charts.
- **Authentication Audit** — Detailed login history tracking for security monitoring.
- **Smart Filtering** — Global time-based filtering (Today, Last 7d, Last 30d) for all performance metrics.

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
│   │   │   ├── analysis.py     # ATS scoring + skill matching
│   │   │   ├── admin.py        # Admin stats, user mgmt, event logs
│   │   │   └── events.py       # Public event tracking (visits)
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
| **Generative SDK** | Google GenAI | Highspeed multimodal LLM queries (Gemini 2.5 Flash) |
| **Auth** | Google OAuth 2.0 + JWT | Authlib + python-jose |
| **Database** | MongoDB + Motor | Async document database tracking history & metrics |
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
git clone https://github.com/MeetuRP/AntiGhostCV.git
cd AntiGhostCV
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

## 🌐 Public Sharing (via ngrok)

You can share your local development environment with colleagues using **ngrok**. The project is optimized to run over a **single tunnel** using Vite's built-in proxy.

### 1. Start Servers
Ensure both your backend (port 8000) and frontend (port 5173) are running locally.

### 2. Start ngrok Tunnel
```bash
ngrok http 5173
```
*Copy the generated `https://...` forwarding URL (e.g., `tempie-undeep-latently.ngrok-free.dev`).*

### 3. Update Configuration
- **Backend (.env)**: Set `FRONTEND_URL` to your ngrok URL.
- **Google Cloud Console**: 
  - Add the ngrok URL to **Authorized JavaScript origins**.
  - Add `{NGROK_URL}/api/auth/google/callback` to **Authorized redirect URIs**.

### 4. Sharing
Share your ngrok URL! Everything (API, OAuth, Analytics) works through that single link.

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
| `POST` | `/api/events/visit` | Log an anonymous site visit |
| `GET` | `/api/admin/stats` | Get overview stats (with period filter) |
| `GET` | `/api/admin/visitors` | Get detailed site traffic log |
| `GET` | `/api/admin/logins` | Get detailed user login history |
| `GET` | `/api/admin/activity` | Get 30-day activity timeline |

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
- [x] ATS scoring engine (Rule-based)
- [x] Premium Glassmorphic UI & ScoreRing
- [x] Futuristic deep-dive evaluation (Tone, Content, Structure)
- [x] SaaS Subscription Tier System (Backend enforcement & Frontend UI)
- [x] Real-time AI Token & Cost Tracking for Fleet Management
- [x] AI-Powered "Fix-It" Mode for bullet-point optimization (Gemini 2.5 Flash)
- [x] Resume re-upload with auto-sync
- [x] Suggested roles from skills
- [x] Analytics dashboard with performance trends
- [x] Visitor and login tracking system
- [ ] Payment Gateway Integration (Stripe/Checkout)

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
