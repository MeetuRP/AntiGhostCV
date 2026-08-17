/**
 * InterviewPopup — Fixed bottom popup shown on results page.
 * Slides up after 3s delay to encourage interview practice.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import interviewApi from '../lib/interviewApi';

interface InterviewPopupProps {
    jobRole: string;
    resumeId: string;
    onClose: () => void;
}

const InterviewPopup: React.FC<InterviewPopupProps> = ({ jobRole, resumeId, onClose }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleStart = async () => {
        setLoading(true);
        try {
            const data = await interviewApi.startSession(jobRole, resumeId);
            navigate(`/interview/session/${data.session_id}`, {
                state: { questions: data.questions, sessionId: data.session_id, jobRole },
            });
        } catch (err: any) {
            // If 403 upgrade_required, the global interceptor handles it
            if (err.response?.status !== 403) {
                console.error('Failed to start interview session:', err);
            }
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[420px] px-4"
        >
            <div className="relative glass-card p-5 border border-indigo-200/60 shadow-xl shadow-indigo-100/30">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full transition-all"
                >
                    <span className="text-lg leading-none">×</span>
                </button>

                <div className="flex items-center gap-4">
                    {/* Mini ring animation */}
                    <div className="w-[50px] h-[50px] shrink-0 relative flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-300 animate-pulse" />
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-slate-800 tracking-tight">
                            Ready to nail the interview too?
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Practice this exact role with AI
                        </p>
                        <button
                            onClick={handleStart}
                            disabled={loading}
                            className="mt-2.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
                        >
                            {loading && (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            )}
                            Start AI Interview Prep →
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default InterviewPopup;
