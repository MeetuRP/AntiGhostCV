/**
 * InterviewHome — Landing page for AI Interview Prep.
 * Hero section with animated ring, start modal, and session history grid.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../lib/auth';
import Navbar from '../../components/Navbar';
import AnimatedRing from '../../components/interview/AnimatedRing';
import InterviewSessionCard from '../../components/interview/InterviewSessionCard';
import UpgradeModal from '../../components/UpgradeModal';
import interviewApi from '../../lib/interviewApi';
import api from '../../lib/api';
import type { InterviewSessionSummary, Resume } from '../../types';

const SUPPORTED_ROLES = [
    'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'ML Engineer', 'AI Engineer', 'Data Scientist', 'DevOps Engineer', 'UI/UX Designer',
    'Other',
];

const InterviewHome = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<InterviewSessionSummary[]>([]);
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);

    // Modal form state
    const [selectedRole, setSelectedRole] = useState(SUPPORTED_ROLES[0]);
    const [customRole, setCustomRole] = useState('');
    const [selectedResumeId, setSelectedResumeId] = useState('');
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [historyRes, resumesRes] = await Promise.all([
                    interviewApi.getHistory(),
                    api.get('/resume/me'),
                ]);
                setSessions(historyRes);
                setResumes(resumesRes.data);
                if (resumesRes.data.length > 0) {
                    setSelectedResumeId(resumesRes.data[0].id);
                }
            } catch (err) {
                console.error('Failed to fetch interview data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleStartSession = async () => {
        const role = selectedRole === 'Other' ? customRole.trim() : selectedRole;
        if (!role || !selectedResumeId) return;

        setStarting(true);
        try {
            const data = await interviewApi.startSession(role, selectedResumeId);
            setShowModal(false);
            navigate(`/interview/session/${data.session_id}`, {
                state: { questions: data.questions, sessionId: data.session_id, jobRole: role },
            });
        } catch (err: any) {
            if (err.response?.status === 403 && err.response?.data?.detail?.upgrade_required) {
                setShowModal(false);
                setShowUpgrade(true);
            } else {
                console.error('Failed to start session:', err);
            }
        } finally {
            setStarting(false);
        }
    };

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen pb-20">
            <UpgradeModal
                isOpen={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                title="Interview Limit Reached"
                message="You've used all your interview sessions on the current plan. Upgrade to continue practicing."
            />
            <Navbar />

            <section className="max-w-5xl mx-auto px-6 py-12">
                {/* Hero Section */}
                <div className="flex flex-col items-center text-center mb-16">
                    <AnimatedRing state="idle" size={180} />

                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mt-6">
                        AI Interview Prep
                    </h1>
                    <p className="text-slate-500 font-bold mt-3 max-w-md">
                        Practice with AI. Build confidence. Get hired.
                    </p>

                    <button
                        onClick={() => setShowModal(true)}
                        className="mt-8 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        Start New Interview
                    </button>
                </div>

                {/* Session History */}
                <div>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Your Interview Journey</h2>
                        {sessions.length > 0 && (
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100 uppercase tracking-widest">
                                {sessions.length} Completed
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="h-48 bg-slate-50/50 animate-pulse rounded-[2rem]" />
                    ) : sessions.length === 0 ? (
                        <div className="p-12 bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] text-center">
                            <div className="flex justify-center mb-4">
                                <AnimatedRing state="idle" size={60} />
                            </div>
                            <h4 className="text-lg font-black text-slate-800 mb-1">No sessions yet</h4>
                            <p className="text-slate-400 text-sm font-medium italic">
                                Build interview confidence beyond your resume.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {sessions.map((session) => (
                                <InterviewSessionCard key={session.session_id} session={session} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Start Session Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => !starting && setShowModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md glass-card p-8"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            <div className="relative z-10">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">
                                    Start Interview Session
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                                            Target Role
                                        </label>
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                        >
                                            {SUPPORTED_ROLES.map((role) => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                        {selectedRole === 'Other' && (
                                            <input
                                                type="text"
                                                value={customRole}
                                                onChange={(e) => setCustomRole(e.target.value)}
                                                placeholder="Enter your target role..."
                                                className="w-full mt-2 px-4 py-3 bg-white/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            />
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                                            Resume
                                        </label>
                                        {resumes.length === 0 ? (
                                            <p className="text-sm text-rose-500 font-medium">
                                                No resumes uploaded. <a href="/upload" className="underline">Upload one first.</a>
                                            </p>
                                        ) : (
                                            <select
                                                value={selectedResumeId}
                                                onChange={(e) => setSelectedResumeId(e.target.value)}
                                                className="w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            >
                                                {resumes.map((r) => (
                                                    <option key={r.id} value={r.id}>
                                                        {r.extracted_data?.name || r.extracted_data?.email || 'Resume'} — {r.extracted_data?.skills?.slice(0, 3).join(', ') || 'No skills'}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        disabled={starting}
                                        className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleStartSession}
                                        disabled={starting || !selectedResumeId || (selectedRole === 'Other' && !customRole.trim())}
                                        className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-[0.15em] shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {starting && (
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        )}
                                        {starting ? 'Preparing...' : 'Begin Interview'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
};

export default InterviewHome;
