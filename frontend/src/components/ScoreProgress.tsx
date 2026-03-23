import React from 'react';
import { motion } from 'framer-motion';

interface ScoreProgressProps {
    initialScore: number;
    currentScore: number;
    history: number[];
}

const ScoreProgress: React.FC<ScoreProgressProps> = ({ initialScore, currentScore, history }) => {
    return (
        <div className="w-full bg-white/40 backdrop-blur-sm border border-white/60 rounded-3xl p-6 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between mb-5">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progression Journey</span>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight">ATS Optimization Growth</h3>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-black text-emerald-600/70 uppercase">Total Gain</span>
                    <span className="text-sm font-black text-emerald-600">+{currentScore - initialScore}</span>
                </div>
            </div>

            <div className="relative h-28 mt-4 mb-2">
                {/* 1. Track Layer (Standardizes 100% width) */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full relative overflow-hidden">
                        {/* 1a. Growth Highlight Layer (Subtle area between Start and Current) */}
                        <motion.div
                            initial={{ left: `${initialScore}%`, width: 0 }}
                            animate={{ left: `${initialScore}%`, width: `${currentScore - initialScore}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className="absolute h-full bg-violet-600/10 z-10"
                        />
                        
                        {/* 1b. Main Progress Fill */}
                        <motion.div
                            initial={{ width: `${initialScore}%` }}
                            animate={{ width: `${currentScore}%` }}
                            transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full relative z-20 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                        />
                    </div>
                </div>

                {/* 2. Interactive Markers Layer (Shares same X-system) */}
                <div className="absolute inset-0 z-30 pointer-events-none">
                    {/* Initial Marker - Below */}
                    <div className="absolute top-1/2" style={{ left: `${initialScore}%` }}>
                       <div className="flex flex-col items-center -translate-x-1/2">
                            <div className="w-px h-10 border-l border-dashed border-slate-300 mt-2 opacity-60" />
                            <div className="mt-1 flex flex-col items-center">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Start</span>
                                <span className="text-[11px] font-black text-slate-500">{initialScore}</span>
                            </div>
                       </div>
                    </div>

                    {/* Current Marker - Above */}
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
                        className="absolute bottom-1/2" 
                        style={{ left: `${currentScore}%` }}
                    >
                       <div className="flex flex-col items-center -translate-x-1/2">
                            <div className="bg-violet-600 text-white min-w-[34px] px-2 h-7 flex items-center justify-center rounded-lg text-[12px] font-black shadow-lg shadow-violet-200 border border-violet-500">{currentScore}</div>
                            <span className="text-[8px] font-black text-violet-600 uppercase tracking-widest mt-1">Current</span>
                            <div className="w-px h-10 border-l border-dashed border-violet-400 mt-2 opacity-60" />
                       </div>
                    </motion.div>
                    
                    {/* Intermediate dots */}
                    {history.map((step, idx) => {
                        if (step <= initialScore || step >= currentScore) return null;
                        return (
                            <div key={idx} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white border border-indigo-400 shadow-sm" style={{ left: `${step}%` }} />
                        );
                    })}
                </div>
            </div>
            
            <div className="mt-6 flex items-center justify-center gap-10 text-[9px] font-black text-slate-400/70 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span>Reference</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white border border-indigo-400" />
                    <span>Improvement</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-600 shadow-[0_0_5px_rgba(124,58,237,0.4)]" />
                    <span>Current</span>
                </div>
            </div>
        </div>
    );
};

export default ScoreProgress;
