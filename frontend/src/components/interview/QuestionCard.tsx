/**
 * QuestionCard — Displays the current interview question with category badge,
 * difficulty indicator, and TTS status. Uses AnimatePresence for slide transitions.
 */
import React from 'react';
import { motion } from 'framer-motion';

interface QuestionCardProps {
    questionIndex: number;
    questionText: string;
    category: 'hr' | 'technical' | 'behavioural';
    difficulty: 'easy' | 'medium' | 'hard';
    isSpeaking: boolean;
}

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

const QuestionCard: React.FC<QuestionCardProps> = ({
    questionIndex,
    questionText,
    category,
    difficulty,
    isSpeaking,
}) => {
    const catStyle = CATEGORY_STYLES[category] || CATEGORY_STYLES.technical;
    const diffColor = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.medium;

    return (
        <motion.div
            key={`q-${questionIndex}`}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="glass-card p-6 md:p-8 max-w-[680px] mx-auto w-full"
        >
            {/* Top row — badges */}
            <div className="flex items-center gap-2 mb-4">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${catStyle.bg} ${catStyle.text}`}>
                    {catStyle.label}
                </span>
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${diffColor}`} />
                    <span className="text-[10px] font-bold text-slate-400 capitalize">{difficulty}</span>
                </div>
                <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Q{questionIndex + 1}
                </span>
            </div>

            {/* Question text */}
            <p className="text-lg md:text-xl font-semibold text-slate-800 leading-relaxed">
                {questionText}
            </p>

            {/* TTS speaking indicator */}
            {isSpeaking && (
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 mt-4"
                >
                    <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="text-xs font-medium text-slate-400 italic">
                        AI is reading the question...
                    </span>
                </motion.div>
            )}
        </motion.div>
    );
};

export default QuestionCard;
