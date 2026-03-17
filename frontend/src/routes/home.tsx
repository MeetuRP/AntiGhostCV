import { useEffect, useState } from 'react';
import { useAuthStore } from '../lib/auth';
import Navbar from '../components/Navbar';
import { Link } from 'react-router';
import ResumeCard from '../components/ResumeCard';
import UsageStatsCard from '../components/dashboard/UsageStatsCard';
import ImprovementInsights from '../components/dashboard/ImprovementInsights';
import ResumeHistory from '../components/dashboard/ResumeHistory';
import NotificationCenter from '../components/dashboard/NotificationCenter';
import api from '../lib/api';
import type { Resume } from '../types';
import UpgradeModal from '../components/UpgradeModal';

const Home = () => {
    const { isAuthenticated, user, isLoading } = useAuthStore();
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [loadingResumes, setLoadingResumes] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            const fetchResumes = async () => {
                setLoadingResumes(true);
                try {
                    const response = await api.get('/resume/me');
                    setResumes(response.data);
                } catch (err) {
                    console.error("Failed to fetch resumes", err);
                } finally {
                    setLoadingResumes(false);
                }
            };
            fetchResumes();
        }

        // Setup global API interceptor for this session to catch 403 upgrade exceptions
        const interceptor = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 403 && error.response?.data?.detail?.upgrade_required) {
                    setShowUpgradeModal(true);
                }
                return Promise.reject(error);
            }
        );

        return () => {
            api.interceptors.response.eject(interceptor);
        };
    }, [isAuthenticated]);

    if (isLoading) return <div>Loading...</div>;

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen pb-20">
            <UpgradeModal 
                isOpen={showUpgradeModal} 
                onClose={() => setShowUpgradeModal(false)} 
                title="Plan Limit Reached"
                message="You have exhausted your current plan's usage limits. Upgrade to continue generating AI improvements and scans."
            />
            <Navbar />
            
            <section className="max-w-7xl mx-auto px-6 py-12">
                {/* Header Section */}
                <div className="mb-20">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <span className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em] mb-3 block">User Terminal v4.0</span>
                            <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">
                                Hey, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">{user?.name?.split(' ')[0] || 'Member'}</span>.
                            </h1>
                            <p className="text-slate-400 text-lg font-bold mt-4 tracking-tight">Your career engine is running at peak optimization.</p>
                        </div>
                        <div className="flex gap-4">
                            <Link to="/upload" className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all">
                                New Upload
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                    {/* LEFT PANEL: Overview & Insights */}
                    <div className="xl:col-span-8 space-y-16">
                        
                        {/* Section 1: Resume Overview */}
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">My Resumes</h2>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100 uppercase tracking-widest">
                                    {resumes.length} Active
                                </span>
                            </div>

                            {loadingResumes ? (
                                <div className="h-64 bg-slate-50/50 animate-pulse rounded-[2.5rem] border border-slate-100" />
                            ) : resumes.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {resumes.map((resume) => (
                                        <ResumeCard key={resume.id} resume={resume} />
                                    ))}
                                    <Link to="/upload" className="group h-full">
                                        <div className="h-full min-h-[220px] bg-white/20 hover:bg-white/40 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all duration-500 hover:scale-[1.02] hover:border-indigo-300">
                                            <div className="h-14 w-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl transition-transform group-hover:rotate-12">
                                                ＋
                                            </div>
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-indigo-600 transition-colors">Add Resume</span>
                                        </div>
                                    </Link>
                                </div>
                            ) : (
                                <div className="p-16 bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[3rem] text-center">
                                    <div className="text-6xl mb-6">📎</div>
                                    <h4 className="text-xl font-black text-slate-800 mb-2">No active resumes found</h4>
                                    <p className="text-slate-400 text-sm font-bold mb-8 italic">Upload your core resume to begin optimization.</p>
                                    <Link to="/upload" className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all">
                                        Import Resume
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Section 2: Improvement Insights */}
                        <div className="pt-8">
                            <ImprovementInsights />
                        </div>

                        {/* Section 3: Timeline */}
                        <div className="pt-8">
                            <ResumeHistory />
                        </div>
                    </div>

                    {/* RIGHT PANEL: Stats, Plans, Notifications */}
                    <div className="xl:col-span-4 space-y-16">
                        
                        {/* Section 4: Usage Stats */}
                        <div>
                            <div className="mb-8">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Account Meter</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Resource Overhead</p>
                            </div>
                            {user?.usage && user?.plan_limits && (
                                <UsageStatsCard usage={user.usage} limits={user.plan_limits} aiUsage={user.ai_usage} currentPlan={user.plan} />
                            )}
                        </div>

                        {/* Section 5: Notifications */}
                        <div>
                            <NotificationCenter />
                        </div>

                        {/* Section 6: Plan Usage / Pro Tip */}
                        <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-900 p-10 text-white shadow-2xl group border border-indigo-700">
                            <div className="relative z-10 flex flex-col justify-between h-full min-h-[200px]">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300 mb-4 block">Engine Tip</h4>
                                    <p className="text-xl font-black leading-tight mb-4">
                                        Optimization score is <span className="text-emerald-400 underline decoration-indigo-400/30 underline-offset-4">40% higher</span> with the Fix-It tool.
                                    </p>
                                    <p className="text-xs font-medium text-indigo-300 leading-relaxed">
                                        Use 'Fix-It' on your key achievement bullets for maximum ATS impact.
                                    </p>
                                </div>
                                <div className="mt-10 flex items-center justify-between">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Enterprise Ready</span>
                                    <div className="h-8 w-8 bg-indigo-800 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                        💡
                                    </div>
                                </div>
                            </div>
                            {/* Animated Background Decor */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                        </div>

                    </div>
                </div>
            </section>
        </main>
    );
};

export default Home;
