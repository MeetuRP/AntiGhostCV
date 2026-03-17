import type { UnifiedFeedback } from "../types";

const SkillBadge = ({ skill, variant }: { skill: string, variant: 'success' | 'warning' }) => {
    const isSuccess = variant === 'success';
    return (
        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all hover:scale-105 flex items-center gap-1 ${
            isSuccess 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50 shadow-sm shadow-emerald-500/10' 
            : 'bg-amber-50 text-amber-700 border-amber-200/50 shadow-sm shadow-amber-500/10'
        }`}>
            <span className="opacity-60 text-[8px]">{isSuccess ? '✓' : '+'}</span>
            {skill}
        </div>
    );
};

const EvolutionCard = ({ icon, title, items, score, variant }: {
    icon: string,
    title: string,
    items: { type: "good" | "improve"; tip: string }[],
    score?: number,
    variant: 'success' | 'warning'
}) => {
    if (items.length === 0) return null;

    const isSuccess = variant === 'success';

    return (
        <div className="group relative overflow-hidden rounded-[1.5rem] bg-white border border-slate-200/60 p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-0.5 block">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] opacity-20 -mr-16 -mt-16 pointer-events-none transition-opacity group-hover:opacity-40 ${isSuccess ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>

            <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-inner ${isSuccess ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                        {icon}
                    </div>
                    <div>
                        <h4 className="text-base font-black text-slate-900 tracking-tight">{title}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {items.length} Insights Detected
                        </p>
                    </div>
                </div>
                {score !== undefined && (
                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-black tabular-nums tracking-tighter text-slate-900 leading-none">
                            {score}
                            <span className="text-sm text-slate-400 font-bold ml-0.5">%</span>
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Section Score</span>
                    </div>
                )}
            </div>

            <div className="space-y-2 relative z-10">
                {items.map((item, idx) => (
                    <div
                        key={idx}
                        className="group/item flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100/50 transition-all hover:bg-white hover:border-indigo-100 hover:shadow-sm"
                    >
                        <div className={`mt-0.5 h-5 w-5 rounded-lg flex items-center justify-center flex-shrink-0 border shadow-sm ${item.type === 'good' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                            <span className="text-[9px]">{item.type === 'good' ? '✓' : '!'}</span>
                        </div>
                        <p className="text-xs font-bold leading-relaxed text-slate-600 group-hover/item:text-slate-900 transition-colors">
                            {item.tip}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Details = ({ feedback }: { feedback: UnifiedFeedback }) => {
    const matchedSkills = feedback.skills.tips.filter(t => t.type === 'good');
    const missingSkills = feedback.skills.tips.filter(t => t.type === 'improve');

    return (
        <div className="flex flex-col gap-8 w-full pb-20">
            {/* Skills Section */}
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <span className="text-xl">🛠️</span>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Technical Skills Matrix</h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent ml-4"></div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Matched Skills */}
                    <div className="glass-card-sm p-6 relative overflow-hidden transition-all duration-500 hover:shadow-md border border-slate-200/60 rounded-[1.5rem] bg-white">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 blur-[30px] rounded-full -mr-12 -mt-12 pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">✨</span>
                                <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">Matches Found</h4>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg text-[9px] font-black">{matchedSkills.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {matchedSkills.map((s, i) => (
                                <SkillBadge key={i} skill={s.tip.replace('Matches: ', '').replace('Missing: ', '')} variant="success" />
                            ))}
                            {matchedSkills.length === 0 && <span className="text-slate-400 text-xs font-bold italic">No exact matches identified.</span>}
                        </div>
                    </div>

                    {/* Missing Skills */}
                    <div className="glass-card-sm p-6 relative overflow-hidden transition-all duration-500 hover:shadow-md border border-slate-200/60 rounded-[1.5rem] bg-white">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 blur-[30px] rounded-full -mr-12 -mt-12 pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🔍</span>
                                <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">Missing Core Skills</h4>
                            </div>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-lg text-[9px] font-black">{missingSkills.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {missingSkills.map((s, i) => (
                                <SkillBadge key={i} skill={s.tip.replace('Matches: ', '').replace('Missing: ', '')} variant="warning" />
                            ))}
                            {missingSkills.length === 0 && <span className="text-slate-400 text-xs font-bold italic">No missing skills detected!</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Structure & Formatting - Futuristic Evolution */}
            <div className="space-y-5 animate-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-both">
                <div className="flex items-center gap-3">
                    <span className="text-xl">🏗️</span>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Structure Evolution</h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent ml-4"></div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <EvolutionCard
                        icon="📐"
                        title="Layout Precision"
                        items={feedback.structure.tips}
                        score={feedback.structure.score}
                        variant={feedback.structure.score > 70 ? 'success' : 'warning'}
                    />
                </div>
            </div>

            {/* Tone & Content Evolution */}
            <div className="space-y-5 animate-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
                <div className="flex items-center gap-3">
                    <span className="text-xl">🎭</span>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Content Aesthetics</h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent ml-4"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <EvolutionCard
                        icon="🖋️"
                        title="Tone & Context"
                        items={feedback.toneAndStyle.tips}
                        score={feedback.toneAndStyle.score}
                        variant={feedback.toneAndStyle.score > 70 ? 'success' : 'warning'}
                    />
                    <EvolutionCard
                        icon="📊"
                        title="Impact Metrics"
                        items={feedback.content.tips}
                        score={feedback.content.score}
                        variant={feedback.content.score > 70 ? 'success' : 'warning'}
                    />
                </div>
            </div>
        </div>
    );
};

export default Details;
