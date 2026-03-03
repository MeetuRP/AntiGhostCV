# ResumeBuddy 🚀
AI-Powered Resume Analyzer & ATS Scorer

ResumeBuddy is a modern web application designed to help job seekers optimize their resumes for Applicant Tracking Systems (ATS). Using advanced AI and parsing techniques, it extracts key information from your resume and provides a comprehensive "Me" profile page.

## Key Features
- **Google OAuth**: Fast and secure sign-in.
- **AI Resume Parsing**: Automatically extracts skills, experience, and education.
- **Personalized Dashboard**: View insights and manage multiple resumes.
- **Me Profile Page**: A premium, editable showcase of your professional profile, synced automatically with your latest resume.
- **ATS Scoring**: (Coming Soon) Get detailed match scores against job descriptions.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Vite
- **Backend**: Python (FastAPI), MongoDB
- **AI/NLTK**: Custom parsing logic for skill extraction

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- MongoDB (Running locally on port 27017 or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd resume_buddy
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or .\venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --port 8000 --reload
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Development
Created with ❤️ by the ResumeBuddy Team.
