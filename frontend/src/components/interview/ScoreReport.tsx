/**
 * ScoreReport — Per-question report card for the interview report page.
 * Shows question, user answer, AI feedback, and ideal answer.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { FiMic, FiStar, FiZap } from 'react-icons/fi';
import type { InterviewQuestion } from '../../types';

interface ScoreReportProps {
    question: InterviewQuestion;
    index: number;
}

const CATEGORY_BORDER: Record<string, string> = {
    technical: 'border-l-indigo-400',
    hr: 'border-l-violet-400',
    behavioural: 'border-l-amber-400',
};

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    technical: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Technical' },
    hr: { bg: 'bg-violet-50', text: 'text-violet-700', label: 'HR' },
    behavioural: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Behavioural' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
    easy: 'bg-emerald-400',
    medium: 'bg-amber-400',
    hard: 'bg-rose-400',
};

const ScoreReport: React.FC<ScoreReportProps> = ({ question, index }) => {
    const score = question.ai_score ?? 0;
    const borderColor = CATEGORY_BORDER[question.category] || 'border-l-slate-300';
    const catStyle = CATEGORY_STYLES[question.category] || CATEGORY_STYLES.technical;
    const diffColor = DIFFICULTY_COLORS[question.difficulty] || DIFFICULTY_COLORS.medium;

    const scoreColor = score >= 7 ? 'bg-emerald-100 text-emerald-700' : score >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
    const feedbackColor = score >= 7 ? 'text-emerald-700' : score >= 4 ? 'text-amber-700' : 'text-rose-700';

    const wordCount = question.user_answer ? question.user_answer.split(/\s+/).filter(Boolean).length : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.35 }}
            className={`glass-card border-l-[3px] ${borderColor} overflow-hidden`}
        >
            <div className="p-6 md:p-7 space-y-5">
                {/* Top row: badges + score */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                            Q{index + 1}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${catStyle.bg} ${catStyle.text}`}>
                            {catStyle.label}
                        </span>
                        <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${diffColor}`} />
                            <span className="text-[10px] text-slate-400 font-bold capitalize">{question.difficulty}</span>
                        </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-sm font-black ${scoreColor}`}>
                        {score}/10
                    </span>
                </div>

                {/* Question text */}
                <p className="text-base font-semibold text-slate-800 leading-relaxed">
                    {question.question_text}
                </p>

                {/* Your Answer */}
                <div>
                    <div className="flex items-center gap-1.5 mb-2">
                        <FiMic className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Answer</span>
                    </div>
                    <div className="bg-indigo-50/50 border-l-2 border-indigo-300 px-4 py-3 rounded-r-xl">
                        <p className="text-sm text-slate-600 italic leading-relaxed">
                            {question.user_answer || '(No answer provided)'}
                        </p>
                        {wordCount > 0 && (
                            <span className="text-[10px] text-slate-400 font-bold mt-1 block">{wordCount} words</span>
                        )}
                    </div>
                </div>

                {/* AI Feedback */}
                {question.ai_feedback && (
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <FiZap className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quick Feedback</span>
                        </div>
                        <p className={`text-sm leading-relaxed font-medium ${feedbackColor}`}>
                            {question.ai_feedback}
                        </p>
                    </div>
                )}

                {/* Ideal Answer */}
                {question.ideal_answer && (
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <FiStar className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Model Answer</span>
                        </div>
                        <div className="bg-emerald-50/50 border-l-2 border-emerald-400 px-4 py-3 rounded-r-xl">
                            <p className="text-sm text-slate-700 leading-relaxed">
                                {question.ideal_answer}
                            </p>
                            <span className="text-[10px] text-emerald-500 font-medium mt-1 block italic">
                                What a great answer looks like
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom separator */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </motion.div>
    );
};

export default ScoreReport;
