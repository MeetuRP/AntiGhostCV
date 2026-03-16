

const ResumeHistory = () => {
    const activities = [
        {
            type: "Score Improved",
            target: "Senior Python Developer",
            score: "85%",
            time: "2h ago",
            icon: "🚀"
        },
        {
            type: "JD Scan",
            target: "AWS Architect",
            score: "72%",
            time: "Yesterday",
            icon: "🎯"
        },
        {
            type: "Resume Upload",
            target: "Main_Resume_v2.pdf",
            score: "-",
            time: "3 days ago",
            icon: "📄"
        }
    ];

    return (
        <div className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] p-10 shadow-2xl">
            <div className="mb-8">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Activity Timeline</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Historical Progress</p>
            </div>

            <div className="space-y-6">
                {activities.map((act, i) => (
                    <div key={i} className="flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-6">
                            <div className="h-14 w-14 bg-white rounded-2xl shadow-sm border border-slate-50 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:rotate-3 transition-all">
                                {act.icon}
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800 tracking-wide uppercase">{act.type}</h4>
                                <p className="text-slate-500 text-xs font-bold mt-0.5">{act.target}</p>
                            </div>
                        </div>
                        <div className="text-right flex items-center gap-6">
                            <div>
                                <div className="text-lg font-black text-slate-900">{act.score}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">{act.time}</div>
                            </div>
                            <div className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-colors">
                                ➔
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <button className="w-full mt-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors shadow-lg shadow-slate-900/10">
                View Full Logs
            </button>
        </div>
    );
};

export default ResumeHistory;
