import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import Navbar from '../components/Navbar';
import api from '../lib/api';
import type { Resume } from '../types';

const Evaluate = () => {
    const [searchParams] = useSearchParams();
    const rawResumeId = searchParams.get('resumeId');
    // Sanitize: treat "undefined" or "null" strings as actual null
    const initialResumeId = (rawResumeId && rawResumeId !== "undefined" && rawResumeId !== "null") ? rawResumeId : null;
    const [resumeId, setResumeId] = useState<string | null>(initialResumeId);
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // Fetch user's resumes so they can pick one if not provided
    useEffect(() => {
        const fetchResumes = async () => {
            try {
                const res = await api.get('/resume/me');
                setResumes(res.data);
                // Auto-select first resume if none provided
                if (!resumeId && res.data.length > 0) {
                    setResumeId(res.data[0].id);
                }
            } catch (err) {
                console.error("Failed to fetch resumes", err);
            }
        };
        fetchResumes();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!resumeId) {
            setError("Please upload a resume first before evaluating.");
            return;
        }

        const formData = new FormData(e.currentTarget);
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        setIsAnalyzing(true);
        setError("");

        try {
            const res = await api.post('/analysis/evaluate', null, {
                params: {
                    resume_id: resumeId,
                    job_title: jobTitle,
                    job_description: jobDescription
                }
            });
            navigate(`/results?analysisId=${res.data.id}`);
        } catch (err: any) {
            console.error("Evaluation failed", err);
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === 'object' ? detail.message : (detail || "Evaluation failed. Please try again.");
            setError(msg);
            setIsAnalyzing(false);
        }
    };

    const selectedResume = resumes.find(r => r.id === resumeId);

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <Navbar />
            <section className="main-section">
                <div className="page-heading py-12">
                    <h1>Evaluate against JD</h1>
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center gap-4 mt-8">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500"></div>
                            <p className="text-gray-500 font-medium text-lg">Analyzing your resume...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-8 w-full max-w-2xl">
                            {/* Resume Selector */}
                            {resumes.length > 1 && (
                                <div className="form-div">
                                    <label>Select Resume</label>
                                    <select
                                        className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 bg-white"
                                        value={resumeId || ""}
                                        onChange={(e) => setResumeId(e.target.value)}
                                    >
                                        {resumes.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.extracted_data?.name || r.extracted_data?.email || "Resume"} — {r.extracted_data?.skills?.length || 0} skills
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Selected resume info */}
                            {selectedResume && (
                                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center gap-3">
                                    <span className="text-indigo-600 font-bold text-sm">📄</span>
                                    <span className="text-sm text-gray-700">
                                        Evaluating: <strong>{selectedResume.extracted_data?.name || "Your Resume"}</strong>
                                        {selectedResume.extracted_data?.skills?.length > 0 && ` (${selectedResume.extracted_data.skills.length} skills detected)`}
                                    </span>
                                </div>
                            )}

                            {!resumeId && resumes.length === 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                                    ⚠️ No resume found. Please upload a resume first.
                                </div>
                            )}

                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name="job-title" placeholder="e.g. Frontend Developer" required />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={8} name="job-description" placeholder="Paste the job description here..." required />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <button className="primary-button text-xl font-bold py-4" type="submit" disabled={!resumeId}>
                                Match Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
};

export default Evaluate;
