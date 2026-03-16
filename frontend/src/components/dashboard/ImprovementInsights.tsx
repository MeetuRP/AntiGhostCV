import { Link } from 'react-router';

const ImprovementInsights = () => {
    const insights = [
        {
            title: "Keywords Missing",
            desc: "Your resume is missing 'Scalable Architectures' which is required for 80% of Java roles you scan.",
            impact: "High Impact",
            icon: "🔑",
            color: "indigo"
        },
        {
            title: "Action Verbs",
            desc: "Using 'Collaborated' too often. Use 'Spearheaded' or 'Orchestrated' for leadership impact.",
            impact: "Medium",
            icon: "📈",
            color: "emerald"
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Improvement Insights</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">AI-Driven Strategy</p>
                </div>
                <Link to="/evaluate" className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <span className="text-xl">➔</span>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((item, i) => (
                    <div key={i} className="group relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/60 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                {item.icon}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-slate-900 text-white rounded-lg">
                                {item.impact}
                            </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-2">{item.title}</h4>
                        <p className="text-slate-500 text-xs font-medium leading-relaxed">
                            {item.desc}
                        </p>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ImprovementInsights;
