/**
 * InterviewReport — Scrollable report card page showing evaluation results.
 * Fetches full session with ideal answers and displays score breakdown.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import ScoreReport from '../../components/interview/ScoreReport';
import interviewApi from '../../lib/interviewApi';
import type { InterviewSession } from '../../types';

const InterviewReport = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<InterviewSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!sessionId) return;

        const fetchSession = async () => {
            try {
                const data = await interviewApi.getSession(sessionId);
                setSession(data);
            } catch (err: any) {
                if (err.response?.status === 403) {
                    setError('Session not yet completed.');
                } else if (err.response?.status === 404) {
                    setError('Session not found.');
                } else {
                    setError('Failed to load session report.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchSession();
    }, [sessionId]);

    if (loading) {
        return (
            <main className="min-h-screen bg-[url('/images/bg-main.svg')] bg-cover flex items-center justify-center">
                <div className="text-xl font-black text-slate-400 animate-pulse">Loading report...</div>
            </main>
        );
    }

    if (error || !session) {
        return (
            <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="text-5xl mb-4">📭</div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">{error || 'Session Not Found'}</h2>
                <button
                    onClick={() => navigate('/interview')}
                    className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                    Back to Interviews
                </button>
            </main>
        );
    }

    const overall = session.overall_score ?? 0;
    const overallColor = overall >= 7 ? '#059669' : overall >= 4 ? '#d97706' : '#dc2626';
    const overallPercent = (overall / 10) * 100;

    const formatDate = (d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
        });
    };

    const timeTaken = () => {
        if (!session.started_at || !session.completed_at) return '—';
        const start = new Date(session.started_at).getTime();
        const end = new Date(session.completed_at).getTime();
        const mins = Math.round((end - start) / 60000);
        return mins > 0 ? `${mins} min` : '< 1 min';
    };

    // Score ring SVG constants
    const ringSize = 130;
    const ringStroke = 10;
    const ringCenter = ringSize / 2;
    const ringRadius = ringCenter - ringStroke;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference - (overallPercent / 100) * ringCircumference;

    const ScoreBar: React.FC<{ label: string; value: number | null; color: string }> = ({ label, value, color }) => {
        const v = value ?? 0;
        return (
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">{label}</span>
                    <span className="text-xs font-black text-slate-700">{v.toFixed(1)}/10</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full rounded-full ${color}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(v / 10) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    />
                </div>
            </div>
        );
    };

    return (
        <main className="min-h-screen bg-[url('/images/bg-main.svg')] bg-cover pb-20">
            <Navbar />

            <section className="max-w-[800px] mx-auto px-6 py-10 space-y-8">

                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100 uppercase tracking-widest">
                            {session.job_role}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            {formatDate(session.completed_at)}
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">
                        Interview Report
                    </h1>
                </div>

                {/* Hero Scores Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 md:p-8"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                        {/* Left — Score Ring */}
                        <div className="flex flex-col items-center">
                            <div style={{ width: ringSize, height: ringSize }} className="relative flex items-center justify-center">
                                <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
                                    <circle
                                        cx={ringCenter} cy={ringCenter} r={ringRadius}
                                        stroke="#f1f5f9" strokeWidth={ringStroke} fill="transparent"
                                    />
                                    <motion.circle
                                        cx={ringCenter} cy={ringCenter} r={ringRadius}
                                        stroke={overallColor} strokeWidth={ringStroke} fill="transparent"
                                        strokeDasharray={ringCircumference}
                                        strokeLinecap="round"
                                        initial={{ strokeDashoffset: ringCircumference }}
                                        animate={{ strokeDashoffset: ringOffset }}
                                        transition={{ duration: 1.5, ease: 'easeOut' }}
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-3xl font-black text-slate-900">{overall.toFixed(1)}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">/10</span>
                                </div>
                            </div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mt-2">Overall Score</p>
                        </div>

                        {/* Center — Score Bars */}
                        <div className="space-y-3">
                            <ScoreBar label="Technical Score" value={session.technical_score} color="bg-indigo-500" />
                            <ScoreBar label="Communication Score" value={session.communication_score} color="bg-violet-500" />
                            <ScoreBar label="HR Score" value={session.hr_score} color="bg-teal-500" />
                        </div>

                        {/* Right — Summary Stats */}
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-medium">Total Questions</span>
                                <span className="font-black text-slate-700">{session.questions.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-medium">Job Role</span>
                                <span className="font-black text-indigo-600">{session.job_role}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-medium">Date</span>
                                <span className="font-bold text-slate-600">{formatDate(session.completed_at)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-medium">Time Taken</span>
                                <span className="font-bold text-slate-600">{timeTaken()}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Questions Report */}
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-6">
                        Your Interview Report
                    </h2>

                    <div className="space-y-4">
                        {session.questions.map((q, i) => (
                            <ScoreReport key={q.question_id} question={q} index={i} />
                        ))}
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Link
                        to="/interview"
                        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] text-center shadow-lg shadow-indigo-600/20 transition-all"
                    >
                        Practice Again
                    </Link>
                    <Link
                        to="/interview"
                        className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest text-center hover:bg-slate-50 transition-all"
                    >
                        Try Different Role
                    </Link>
                </div>

                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    This session's results have been saved to your profile
                </p>
            </section>
        </main>
    );
};

export default InterviewReport;
