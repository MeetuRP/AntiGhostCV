
import MarketingLayout from '../../components/marketing/MarketingLayout';

const About = () => (
    <MarketingLayout>
        <div className="pt-40 pb-40 max-w-4xl mx-auto px-6 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-4 block">Our Mission</span>
            <h1 className="text-6xl lg:text-7xl font-black tracking-tighter text-slate-900 mb-12">
                Ending the era of <br />
                <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">Information Ghosting.</span>
            </h1>
            
            <div className="space-y-12 text-left">
                <p className="text-2xl text-slate-500 font-bold leading-relaxed italic">
                    AntiGhost CV was founded by a group of engineers who were tired of seeing qualified friends get rejected by automated systems before a human even saw their name.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12">
                    <div className="p-10 bg-slate-50 rounded-3xl border border-slate-100">
                        <h3 className="text-xl font-black text-slate-900 mb-4">The Problem</h3>
                        <p className="text-sm text-slate-400 font-bold leading-relaxed">
                            Modern ATS like Workday use outdated keyword matching that ignores true potential.
                        </p>
                    </div>
                    <div className="p-10 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-600/20">
                        <h3 className="text-xl font-black text-white mb-4">The Solution</h3>
                        <p className="text-sm text-indigo-100 font-bold leading-relaxed">
                            We use advanced LLMs to bridge the semantic gap between your experience and job descriptions.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </MarketingLayout>
);

export default About;
