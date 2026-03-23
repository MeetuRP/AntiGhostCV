import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface ScorePopupProps {
    score: number;
    delta: number;
    impact?: 'Low' | 'Medium' | 'High';
    onClose: () => void;
}

const ScorePopup: React.FC<ScorePopupProps> = ({ score, delta, impact, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const impactColors = {
        Low: 'text-blue-500',
        Medium: 'text-amber-500',
        High: 'text-emerald-500'
    };

    const impactIcons = {
        Low: '➕',
        Medium: '⚡',
        High: '🔥'
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-8 right-8 z-[100] w-72"
        >
            <div className="relative overflow-hidden p-5 rounded-2xl bg-white/40 border border-white/60 shadow-2xl backdrop-blur-xl">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white/40 rounded-full transition-all"
                >
                    <span className="text-lg leading-none">×</span>
                </button>

                {/* Content */}
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-200">
                        ✨
                    </div>
                    <div className="flex-1">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Score Improved</div>
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-2xl font-black text-slate-800">{score}</span>
                            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                +{delta} Points
                            </span>
                        </div>
                        
                        {impact && (
                            <div className={`text-[11px] font-bold flex items-center gap-1.5 ${impactColors[impact]}`}>
                                {impactIcons[impact]} {impact} Impact Improvement
                            </div>
                        )}
                        <div className="text-[10px] text-slate-500 mt-2 font-medium italic">
                            Your resume is getting stronger!
                        </div>
                    </div>
                </div>

                {/* Progress Timer Line */}
                <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                    className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-indigo-500/30 to-violet-500/30"
                />
            </div>
        </motion.div>
    );
};

export default ScorePopup;
