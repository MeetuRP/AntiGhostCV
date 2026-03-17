import React from 'react';
import { Link } from 'react-router';
import type { UserUsage, PlanLimits } from '../../types';

interface UsageStatsCardProps {
    usage: UserUsage;
    limits: PlanLimits;
    aiUsage?: any; // Added to support AI tracking
    currentPlan?: string;
}

const UsageStatsCard: React.FC<UsageStatsCardProps> = ({ usage, limits, aiUsage, currentPlan = "starter" }) => {
    const stats = [
        {
            label: "Evaluations",
            used: usage.resume_evaluations || 0,
            limit: "∞",
            icon: "📊",
            accent: "indigo",
            description: "Total AI resume assessments"
        },
        {
            label: "JD Audits",
            used: usage.jd_scans_used || 0,
            limit: limits.jd_scans || 0,
            icon: "🎯",
            accent: "emerald",
            description: "Matches against job descriptions"
        },
        {
            label: "AI Refinements",
            used: usage.fix_it_used || 0,
            limit: limits.fix_it_uses || 0,
            icon: "✨",
            accent: "violet",
            description: "Resume line improvements"
        },
        {
            label: "AI Tokens Used",
            used: aiUsage ? (aiUsage.total_input_tokens + aiUsage.total_output_tokens) : 0,
            limit: "∞",
            icon: "🧠",
            accent: "cyan",
            description: "Total AI bandwidth"
        }
    ];

    const estimatedCost = aiUsage?.estimated_cost ? aiUsage.estimated_cost.toFixed(4) : "0.0000";

    return (
        <div className="group relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-200/60 p-10 shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all duration-500 hover:shadow-[0_40px_80px_rgba(99,102,241,0.08)] hover:-translate-y-1">
            {/* Minimalist Ambient Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            Usage Performance
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Resource Allocation</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Plan Tier</span>
                        <span className="text-sm font-black text-slate-800 uppercase">{currentPlan.replace('_', ' ')} v1.0</span>
                    </div>
                </div>

                <div className="space-y-12">
                    {stats.map((stat, i) => {
                        const isUnlimited = stat.limit === "∞";
                        const percentage = !isUnlimited && typeof stat.limit === 'number' && stat.limit > 0 
                            ? Math.min((stat.used / stat.limit) * 100, 100) 
                            : 0;

                        const colors: Record<string, string> = {
                            indigo: "bg-indigo-600 shadow-indigo-200",
                            emerald: "bg-emerald-500 shadow-emerald-200",
                            violet: "bg-violet-600 shadow-violet-200",
                            cyan: "bg-cyan-500 shadow-cyan-200"
                        };

                        return (
                            <div key={i} className="group/item relative">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-xl shadow-sm transition-all duration-300 group-hover/item:scale-110 group-hover/item:rotate-3 group-hover/item:bg-white group-hover/item:shadow-lg">
                                            {stat.icon}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-[0.05em]">{stat.label}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 max-w-[140px] leading-tight mt-0.5">{stat.description}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-slate-900 tabular-nums leading-none">
                                            {stat.used}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            from {stat.limit}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Advanced Usage Meter */}
                                <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${colors[stat.accent]} shadow-lg`}
                                        style={{ width: isUnlimited ? '100%' : `${percentage}%`, opacity: isUnlimited ? 0.3 : 1 }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                    </div>
                                </div>

                                {percentage > 85 && !isUnlimited && (
                                    <div className="absolute -bottom-5 right-0 flex items-center gap-1">
                                        <span className="h-1 w-1 rounded-full bg-rose-500 animate-ping" />
                                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Nearing Cap</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">💰</span>
                        <div>
                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Est. API Cost</h4>
                            <p className="text-[9px] font-bold text-slate-400">Total generated model cost</p>
                        </div>
                    </div>
                    <div className="text-lg font-black text-slate-900 tabular-nums">
                        ${estimatedCost}
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-white font-black">?</div>
                        <p className="text-[9px] font-bold text-slate-400 leading-tight max-w-[150px]">
                            Limits reset on the 1st of every month automatically.
                        </p>
                    </div>
                    <Link to="/pricing" className="group/btn relative px-8 py-3 bg-slate-900 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest overflow-hidden transition-all hover:pr-10">
                        <span className="relative z-10">Upgrade Plan</span>
                        <span className="absolute right-4 opacity-0 -translate-x-2 transition-all group-hover/btn:opacity-100 group-hover/btn:translate-x-0">→</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default UsageStatsCard;
