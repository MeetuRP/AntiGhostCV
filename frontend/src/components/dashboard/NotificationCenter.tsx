

const NotificationCenter = () => {
    const notifications = [
        {
            title: "Optimized Resume Ready",
            desc: "Your 'Python Dev' resume has been optimized with 5 fresh improvements.",
            isNew: true
        },
        {
            title: "Plan Tip",
            desc: "You have 8/10 scans remaining this month.",
            isNew: false
        }
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Notifications</h2>
            
            <div className="space-y-3">
                {notifications.map((note, i) => (
                    <div key={i} className={`p-5 rounded-2xl border transition-all hover:-translate-x-1 ${note.isNew ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white/40 border-slate-100 opacity-60'}`}>
                        <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{note.title}</h4>
                            {note.isNew && <span className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />}
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 leading-normal">{note.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NotificationCenter;
