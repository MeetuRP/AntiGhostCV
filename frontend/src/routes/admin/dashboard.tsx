import { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/auth';
import { useNavigate } from 'react-router';
import api from '../../lib/api';
import Navbar from '../../components/Navbar';
import ResumeViewer from '../../components/ResumeViewer';
import AdminUsers from '../../pages/admin/AdminUsers';
import APICostWidget from '../../components/admin/APICostWidget';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface Stats {
    totals: {
        users: number;
        resumes: number;
        evaluations: number;
         visits: number;
        logins: number;
        interview_sessions?: number;
        ai: {
            total_calls: number;
            total_input: number;
            total_output: number;
            total_cost: number;
        };
    };
    period: {
        logins: number;
        visits: number;
        resumes: number;
        evaluations: number;
    };
}

interface VisitorRow {
    id: string;
    ip: string;
    user_agent: string;
    timestamp: string | null;
}

interface LoginRow {
    id: string;
    user_name: string;
    user_email: string;
    ip: string;
    timestamp: string | null;
}

interface UserRow {
    id: string;
    name: string;
    email: string;
    profile_image: string | null;
    is_admin: boolean;
    resume_count: number;
    evaluation_count: number;
    bio: string | null;
    social_links: { github?: string; linkedin?: string; website?: string };
    job_preferences: { desired_roles?: string[]; locations?: string[]; min_salary?: number; remote_preferred?: boolean };
    last_parsed_profile: any | null;
    created_at: string | null;
}

interface EvalRow {
    id: string;
    user_name: string;
    user_email: string;
    job_title: string;
    ats_score: number;
    skills_matched: number;
    missing_skills: number;
    missing_skills_list: string[];
    skills_matched_list: string[];
    suggestions: string[];
    created_at: string | null;
}

interface ResumeRow {
    id: string;
    user_name: string;
    user_email: string;
    skills_count: number;
    skills: string[];
    uploaded_at: string | null;
}

interface InterviewRankingRow {
    rank: number;
    user_name: string;
    user_email: string;
    job_roles: string[];
    best_score: number;
    avg_score: number;
    avg_technical: number;
    avg_communication: number;
    sessions_count: number;
    last_session_date: string | null;
}

type Tab = 'dashboard' | 'users' | 'resumes' | 'evaluations' | 'visitors';

const AdminDashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [resumes, setResumes] = useState<ResumeRow[]>([]);
    const [evals, setEvals] = useState<EvalRow[]>([]);
    const [visitors, setVisitors] = useState<VisitorRow[]>([]);
    const [logins, setLogins] = useState<LoginRow[]>([]);
    const [visitorSubTab, setVisitorSubTab] = useState<'traffic' | 'logins'>('traffic');
    const [period, setPeriod] = useState<'today' | '7d' | '30d'>('30d');
    const [industry, setIndustry] = useState<{ role: string; count: number }[]>([]);
    const [skillsReport, setSkillsReport] = useState<{ skill: string; count: number }[]>([]);
    const [scoreDist, setScoreDist] = useState<{ label: string; count: number }[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [rankings, setRankings] = useState<InterviewRankingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEval, setSelectedEval] = useState<EvalRow | null>(null);
    const [showEvalModal, setShowEvalModal] = useState(false);
    const [resumeUrl, setResumeUrl] = useState<string | null>(null);
    const [showResumeModal, setShowResumeModal] = useState(false);

    useEffect(() => {
        fetchAll();
    }, []);

    useEffect(() => {
        if (showResumeModal || showEvalModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            if (resumeUrl && !showResumeModal) {
                URL.revokeObjectURL(resumeUrl);
            }
        };
    }, [showResumeModal, showEvalModal, resumeUrl]);

    useEffect(() => {
        fetchAll();
    }, [period]);

    const fetchAll = async () => {
        setLoading(true);
        setError('');
        try {
            const [statsRes, usersRes, resumesRes, evalsRes, visitorsRes, loginsRes, industryRes, skillsRes, scoreRes, activityRes, rankingsRes] =
                await Promise.all([
                    api.get(`/admin/stats?period=${period}`),
                    api.get('/admin/users'),
                    api.get('/admin/resumes'),
                    api.get('/admin/evaluations'),
                    api.get('/admin/visitors'),
                    api.get('/admin/logins'),
                    api.get('/admin/industry'),
                    api.get('/admin/skills-report'),
                    api.get('/admin/score-distribution'),
                    api.get('/admin/activity'),
                    api.get('/admin/interview-rankings'),
                ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
            setResumes(resumesRes.data);
            setEvals(evalsRes.data);
            setVisitors(visitorsRes.data);
            setLogins(loginsRes.data);
            setIndustry(industryRes.data.roles);
            setSkillsReport(skillsRes.data.skills);
            setScoreDist(scoreRes.data.distribution);
            setActivity(activityRes.data.timeline);
            setRankings(rankingsRes.data);
        } catch (err: any) {
            if (err?.response?.status === 403) {
                setError('Access denied. You are not an admin.');
            } else {
                setError('Failed to load admin data.');
            }
        }
        setLoading(false);
    };

    const handleViewResume = async (resumeId: string) => {
        try {
            const response = await api.get(`/resume/view/${resumeId}`, {
                responseType: 'blob'
            });
            const url = URL.createObjectURL(response.data);
            setResumeUrl(url);
            setShowResumeModal(true);
        } catch (err) {
            console.error('Error viewing resume:', err);
            alert('Failed to load resume. It might have been deleted.');
        }
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <Navbar />
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <p style={{ color: '#64748b', fontSize: 14 }}>Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
                <Navbar />
                <div className="card" style={{ textAlign: 'center', padding: '48px 40px', maxWidth: 420 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Access Restricted</h2>
                    <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 24 }}>{error}</p>
                    <button onClick={() => navigate('/')} className="primary-button" style={{ width: '100%' }}>
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const tabItems: { key: Tab; label: string; icon: string }[] = [
        { key: 'dashboard', label: 'Overview', icon: '📊' },
        { key: 'users', label: 'Users', icon: '👥' },
        { key: 'resumes', label: 'Resumes', icon: '📄' },
        { key: 'evaluations', label: 'Evaluations', icon: '🎯' },
        { key: 'visitors', label: 'Traffic & Logins', icon: '🌐' },
    ];

    const mainStats = [
        { label: 'Total Users', value: stats?.totals.users ?? 0, icon: '👥', gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', tab: 'users' as Tab },
        { label: 'Resumes', value: stats?.period.resumes ?? 0, icon: '📄', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', tab: 'resumes' as Tab },
        { label: 'Evaluations', value: stats?.period.evaluations ?? 0, icon: '🎯', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', tab: 'evaluations' as Tab },
        { label: 'Interviews', value: stats?.totals.interview_sessions ?? 0, icon: '🎤', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', tab: 'dashboard' as Tab },
        { label: 'Logins', value: stats?.period.logins ?? 0, icon: '🔑', gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', tab: 'visitors' as Tab },
        { label: 'Visits', value: stats?.period.visits ?? 0, icon: '🌐', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', tab: 'visitors' as Tab },
    ];

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#475569', font: { size: 12 } } } },
        scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.15)' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.15)' } },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' as const, labels: { color: '#475569', padding: 16, font: { size: 12 } } } },
    };

    const activityChartData = {
        labels: activity.map((a) => a.date.slice(5)),
        datasets: [
            { label: 'Visits', data: activity.map((a) => a.site_visit), borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.1)', fill: true, tension: 0.4 },
            { label: 'Logins', data: activity.map((a) => a.login), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4 },
            { label: 'Uploads', data: activity.map((a) => a.resume_upload), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
            { label: 'Score Checks', data: activity.map((a) => a.score_check), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.4 },
        ],
    };
    const scoreChartData = {
        labels: scoreDist.map((s) => s.label),
        datasets: [{ data: scoreDist.map((s) => s.count), backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'], borderWidth: 0 }],
    };
    const skillsChartData = {
        labels: skillsReport.slice(0, 15).map((s) => s.skill),
        datasets: [{ label: 'Users with skill', data: skillsReport.slice(0, 15).map((s) => s.count), backgroundColor: 'rgba(99,102,241,0.6)', borderRadius: 8 }],
    };
    const industryChartData = {
        labels: industry.map((i) => i.role),
        datasets: [{
            label: 'User count',
            data: industry.map((i) => i.count),
            backgroundColor: ['rgba(99,102,241,0.6)', 'rgba(16,185,129,0.6)', 'rgba(245,158,11,0.6)', 'rgba(239,68,68,0.6)', 'rgba(139,92,246,0.6)', 'rgba(6,182,212,0.6)', 'rgba(236,72,153,0.6)', 'rgba(34,197,94,0.6)', 'rgba(249,115,22,0.6)'],
            borderRadius: 8,
        }],
    };

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <Navbar />

            <section className="main-section">
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 0' }}>
                    {/* Admin Header Content */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <div>
                            <h1 className="text-gradient" style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>🛡️ Admin Panel</h1>
                            <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Analytics & data management for AntiGhost CV</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.08)', padding: '8px 16px', borderRadius: 12 }}>
                            <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>Admin: {user?.email}</span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
                        {tabItems.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    padding: '12px 20px',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    borderBottom: activeTab === tab.key ? '3px solid #6366f1' : '3px solid transparent',
                                    color: activeTab === tab.key ? '#6366f1' : '#94a3b8',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    marginBottom: -2,
                                }}
                            >
                                <span>{tab.icon}</span> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 48px' }}>
                    {/* =================== DASHBOARD TAB =================== */}
                    {activeTab === 'dashboard' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                            {/* Summary Header & Gradient Cards (Exclusive to Overview) */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>📈 Performance Summary</h3>
                                    <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Live activity metrics and trends</p>
                                </div>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.7)', padding: 4, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                        {(['today', '7d', '30d'] as const).map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => setPeriod(p)}
                                                style={{
                                                    padding: '6px 16px',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    borderRadius: 7,
                                                    border: 'none',
                                                    background: period === p ? '#6366f1' : 'transparent',
                                                    color: period === p ? '#fff' : '#64748b',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {p === 'today' ? 'Today' : p === '7d' ? 'Week' : 'Month'}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={fetchAll} className="secondary-button" style={{ height: 36, padding: '0 12px' }}>
                                        🔄
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
                                {mainStats.map((card) => (
                                    <button
                                        key={card.label}
                                        onClick={() => setActiveTab(card.tab)}
                                        style={{
                                            background: card.gradient,
                                            borderRadius: 20,
                                            padding: '28px 24px',
                                            color: '#fff',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'transform 0.2s, box-shadow 0.2s'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.15)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'; }}
                                    >
                                        <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            {card.label}
                                        </div>
                                        <div style={{ fontSize: 36, fontWeight: 800, marginTop: 8 }}>{card.value}</div>
                                        <div style={{ position: 'absolute', right: 20, bottom: 20, fontSize: 44, opacity: 0.15 }}>{card.icon}</div>
                                    </button>
                                ))}
                            </div>

                            {/* AI Infrastructure Cost Widget */}
                            {stats?.totals.ai && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                                    <div className="lg:col-span-1">
                                        <APICostWidget stats={stats.totals.ai} />
                                    </div>
                                    <div className="lg:col-span-2 relative overflow-hidden rounded-[2rem] border border-white/40 bg-white/60 p-10 shadow-2xl backdrop-blur-2xl transition-all duration-500 hover:shadow-indigo-500/5 group">
                                        {/* Decorative accents */}
                                        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/5 blur-[100px] transition-all duration-1000 group-hover:bg-indigo-500/10" />
                                        
                                        <div className="relative z-10 flex flex-col h-full justify-center">
                                            <div className="mb-6 flex items-center gap-4">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 shadow-inner text-2xl">
                                                    🎯
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-900/40">Resource Intel</h4>
                                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">System Performance & Scaling</h3>
                                                </div>
                                            </div>
                                            
                                            <p className="text-lg font-medium text-slate-600 leading-relaxed mb-6">
                                                The AI infrastructure reflects real-time overhead for <span className="text-indigo-600 font-bold underline decoration-indigo-200 decoration-4 underline-offset-4">Gemini-2.5-Flash</span> nodes. 
                                                Track operational expenses across all premium modules including <span className="font-bold text-slate-800">Resume Optimization</span>, <span className="font-bold text-slate-800">Fix-It AI</span>, and <span className="font-bold text-slate-800">JD Matching</span>.
                                            </p>

                                            <div className="flex flex-wrap gap-4 mt-auto">
                                                <div className="bg-white/80 border border-slate-200/50 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
                                                  <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
                                                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Database Sync: OK</span>
                                                </div>
                                                <div className="bg-white/80 border border-slate-200/50 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
                                                  <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"></span>
                                                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">API Status: Active</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Charts Row 1 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                                <div className="card" style={{ padding: 24 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>📈 Activity — Last 30 Days</h3>
                                    <div style={{ height: 240 }}>
                                        <Line data={activityChartData} options={chartOptions} />
                                    </div>
                                </div>
                                <div className="card" style={{ padding: 24 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>🎯 ATS Score Distribution</h3>
                                    <div style={{ height: 240 }}>
                                        <Doughnut data={scoreChartData} options={doughnutOptions} />
                                    </div>
                                </div>
                            </div>

                            {/* Charts Row 2 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div className="card" style={{ padding: 24 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>🔧 Top Skills Across Users</h3>
                                    <div style={{ height: 260 }}>
                                        <Bar data={skillsChartData} options={chartOptions} />
                                    </div>
                                </div>
                                <div className="card" style={{ padding: 24 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>🏢 Industry / Role Distribution</h3>
                                    <div style={{ height: 260 }}>
                                        <Bar data={industryChartData} options={{ ...chartOptions, indexAxis: 'y' as const }} />
                                    </div>
                                </div>
                            </div>

                            {/* Interview Rankings Leaderboard */}
                            <div className="card" style={{ overflow: 'hidden' }}>
                                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>🏆 AI Voice Interview Leaderboard</h3>
                                        <p style={{ color: '#64748b', fontSize: 12, margin: '2px 0 0' }}>Top candidate performers across mock interview sessions</p>
                                    </div>
                                    <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                        {rankings.length} Ranked Candidates
                                    </span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc' }}>
                                                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, width: 60 }}>Rank</th>
                                                <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Candidate</th>
                                                <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</th>
                                                <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Practiced Roles</th>
                                                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Best Score</th>
                                                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg Score</th>
                                                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tech Score</th>
                                                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sessions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rankings.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                                                        No completed interview sessions recorded yet.
                                                    </td>
                                                </tr>
                                            ) : (
                                                rankings.map((rk) => (
                                                    <tr key={rk.rank + rk.user_email} style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800 }}>
                                                            {rk.rank === 1 ? '🥇' : rk.rank === 2 ? '🥈' : rk.rank === 3 ? '🥉' : `#${rk.rank}`}
                                                        </td>
                                                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#1e293b' }}>{rk.user_name}</td>
                                                        <td style={{ padding: '14px 20px', color: '#64748b' }}>{rk.user_email}</td>
                                                        <td style={{ padding: '14px 20px' }}>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                                {rk.job_roles.map((r) => (
                                                                    <span key={r} style={{ background: '#e0e7ff', color: '#4338ca', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{r}</span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                            <span style={{
                                                                background: rk.best_score >= 7 ? '#d1fae5' : rk.best_score >= 4 ? '#fef3c7' : '#fee2e2',
                                                                color: rk.best_score >= 7 ? '#047857' : rk.best_score >= 4 ? '#b45309' : '#b91c1c',
                                                                padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800
                                                            }}>
                                                                {rk.best_score.toFixed(1)}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                                                            {rk.avg_score.toFixed(1)}
                                                        </td>
                                                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#6366f1' }}>
                                                            {rk.avg_technical.toFixed(1)}
                                                        </td>
                                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                                                                {rk.sessions_count}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* =================== USERS TAB =================== */}
                    {activeTab === 'users' && (
                        <AdminUsers users={users as any} onRefresh={fetchAll} />
                    )}

                    {/* =================== RESUMES TAB =================== */}
                    {activeTab === 'resumes' && (
                        <div className="card" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>📄 All Resumes ({resumes.length})</h3>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>User</th>
                                            <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</th>
                                            <th style={{ textAlign: 'center', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Skills</th>
                                            <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Top Skills</th>
                                            <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Uploaded</th>
                                            <th style={{ textAlign: 'center', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {resumes.map((r) => (
                                            <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '14px 20px', fontWeight: 600, color: '#1e293b' }}>{r.user_name}</td>
                                                <td style={{ padding: '14px 20px', color: '#64748b' }}>{r.user_email}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <span style={{ background: '#dbeafe', color: '#2563eb', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{r.skills_count}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        {r.skills.slice(0, 5).map((s) => (
                                                            <span key={s} style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>{s}</span>
                                                        ))}
                                                        {r.skills.length > 5 && <span style={{ color: '#94a3b8', fontSize: 11 }}>+{r.skills.length - 5}</span>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 20px', color: '#94a3b8', fontSize: 12 }}>{r.uploaded_at ? new Date(r.uploaded_at).toLocaleDateString() : '—'}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleViewResume(r.id)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            color: '#6366f1',
                                                            background: 'rgba(99,102,241,0.08)',
                                                            border: '1px solid rgba(99,102,241,0.2)',
                                                            borderRadius: 8,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(ev) => { ev.currentTarget.style.background = '#6366f1'; ev.currentTarget.style.color = '#fff'; }}
                                                        onMouseLeave={(ev) => { ev.currentTarget.style.background = 'rgba(99,102,241,0.08)'; ev.currentTarget.style.color = '#6366f1'; }}
                                                    >
                                                        👁️ View Resume
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* =================== EVALUATIONS TAB =================== */}
                    {activeTab === 'evaluations' && (
                        <div className="card" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>🎯 All Evaluations ({evals.length})</h3>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>User</th>
                                            <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Job Title</th>
                                            <th style={{ textAlign: 'center', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>ATS Score</th>
                                            <th style={{ textAlign: 'center', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Matched</th>
                                            <th style={{ textAlign: 'center', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Missing</th>
                                            <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</th>
                                            <th style={{ textAlign: 'center', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {evals.map((e) => {
                                            const scoreColor = e.ats_score >= 76 ? { bg: '#ecfdf5', text: '#059669' } : e.ats_score >= 51 ? { bg: '#dbeafe', text: '#2563eb' } : e.ats_score >= 26 ? { bg: '#fef3c7', text: '#d97706' } : { bg: '#fef2f2', text: '#dc2626' };
                                            return (
                                                <tr key={e.id} style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.15s' }} onMouseEnter={(ev) => ev.currentTarget.style.background = '#f8fafc'} onMouseLeave={(ev) => ev.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{e.user_name}</div>
                                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{e.user_email}</div>
                                                    </td>
                                                    <td style={{ padding: '14px 20px', color: '#475569' }}>{e.job_title}</td>
                                                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                        <span style={{ background: scoreColor.bg, color: scoreColor.text, padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800 }}>
                                                            {e.ats_score}%
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#059669', fontWeight: 700 }}>{e.skills_matched}</td>
                                                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>{e.missing_skills}</td>
                                                    <td style={{ padding: '14px 20px', color: '#94a3b8', fontSize: 12 }}>{e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}</td>
                                                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => { setSelectedEval(e); setShowEvalModal(true); }}
                                                            style={{
                                                                padding: '6px 12px',
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                color: '#6366f1',
                                                                background: 'rgba(99,102,241,0.08)',
                                                                border: '1px solid rgba(99,102,241,0.2)',
                                                                borderRadius: 8,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseEnter={(ev) => { ev.currentTarget.style.background = '#6366f1'; ev.currentTarget.style.color = '#fff'; }}
                                                            onMouseLeave={(ev) => { ev.currentTarget.style.background = 'rgba(99,102,241,0.08)'; ev.currentTarget.style.color = '#6366f1'; }}
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Evaluation Details Modal */}
                    {showEvalModal && selectedEval && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(15, 23, 42, 0.4)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: 20
                        }} onClick={() => setShowEvalModal(false)}>
                            <div
                                style={{
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    maxWidth: 600,
                                    width: '100%',
                                    borderRadius: 24,
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    maxHeight: '90vh',
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>Evaluation Details</h3>
                                        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Analysis for {selectedEval.job_title}</p>
                                    </div>
                                    <button
                                        onClick={() => setShowEvalModal(false)}
                                        style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 18, fontWeight: 700 }}
                                    >
                                        ×
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    {/* User Info & Score */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99,102,241,0.04)', padding: '16px 20px', borderRadius: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Candidate</div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{selectedEval.user_name}</div>
                                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{selectedEval.user_email}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>ATS Score</div>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#6366f1' }}>{selectedEval.ats_score}%</div>
                                        </div>
                                    </div>

                                    {/* Matched Skills */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                            <span style={{ fontSize: 18 }}>✅</span>
                                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>Matched Skills</h4>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {selectedEval.skills_matched_list && selectedEval.skills_matched_list.length > 0 ? (
                                                selectedEval.skills_matched_list.map((skill) => (
                                                    <span key={skill} style={{ background: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                                                        {skill}
                                                    </span>
                                                ))
                                            ) : (
                                                <div style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '10px 16px', borderRadius: 12, width: '100%' }}>
                                                    ❌ No skills matched for this job description.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Missing Skills */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                            <span style={{ fontSize: 18 }}>⚠️</span>
                                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>Missing Skills</h4>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {selectedEval.missing_skills_list && selectedEval.missing_skills_list.length > 0 ? (
                                                selectedEval.missing_skills_list.map((skill) => (
                                                    <span key={skill} style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                                                        {skill}
                                                    </span>
                                                ))
                                            ) : (
                                                <div style={{ color: '#059669', fontSize: 13, background: '#ecfdf5', padding: '10px 16px', borderRadius: 12, width: '100%' }}>
                                                    ✅ All required skills identified in the job description are present.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* AI Feedback/Suggestions */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                            <span style={{ fontSize: 18 }}>💡</span>
                                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>AI Feedback & Suggestions</h4>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {selectedEval.suggestions && selectedEval.suggestions.length > 0 ? (
                                                selectedEval.suggestions.map((s, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: 12, background: '#f8fafc', padding: '12px 16px', borderRadius: 12 }}>
                                                        <span style={{ color: '#6366f1', fontWeight: 800 }}>•</span>
                                                        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{s}</div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>
                                                    No specific suggestions generated for this evaluation.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div style={{ padding: '20px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setShowEvalModal(false)}
                                        style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700, background: '#1e293b', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}



                    {/* Resume Viewer Modal */}
                    {showResumeModal && resumeUrl && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 20
                        }}>
                            <div style={{
                                background: '#fff', borderRadius: 24, width: '100%', maxWidth: '1000px', height: '94vh',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative', overflow: 'hidden',
                                display: 'flex', flexDirection: 'column'
                            }}>
                                <div style={{ padding: '20px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e293b' }}>📄 Resume Preview</h3>
                                    <button
                                        onClick={() => setShowResumeModal(false)}
                                        style={{ background: '#fff', border: '1px solid #e2e8f0', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 18, fontWeight: 700 }}
                                    >×</button>
                                </div>
                                <div style={{ flex: 1, position: 'relative', background: '#f1f5f9', minHeight: 0 }}>
                                    <ResumeViewer url={resumeUrl} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* =================== VISITORS TAB =================== */}
                    {activeTab === 'visitors' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* Sub-Tabs */}
                            <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.5)', padding: 6, borderRadius: 12, width: 'fit-content' }}>
                                <button
                                    onClick={() => setVisitorSubTab('traffic')}
                                    style={{
                                        padding: '8px 20px',
                                        borderRadius: 8,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: visitorSubTab === 'traffic' ? '#fff' : 'transparent',
                                        color: visitorSubTab === 'traffic' ? '#6366f1' : '#64748b',
                                        boxShadow: visitorSubTab === 'traffic' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    🌐 Site Traffic
                                </button>
                                <button
                                    onClick={() => setVisitorSubTab('logins')}
                                    style={{
                                        padding: '8px 20px',
                                        borderRadius: 8,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: visitorSubTab === 'logins' ? '#fff' : 'transparent',
                                        color: visitorSubTab === 'logins' ? '#6366f1' : '#64748b',
                                        boxShadow: visitorSubTab === 'logins' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    🔑 Authentication
                                </button>
                            </div>

                            {visitorSubTab === 'traffic' ? (
                                <div className="card" style={{ overflow: 'hidden' }}>
                                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>🌐 Recent Site Visitors ({visitors.length})</h3>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc' }}>
                                                    <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>IP Address</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>User Agent</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Visited At</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {visitors.map((v) => (
                                                    <tr key={v.id} style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#1e293b' }}>{v.ip}</td>
                                                        <td style={{ padding: '14px 20px', color: '#64748b', fontSize: 12, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.user_agent}>
                                                            {v.user_agent}
                                                        </td>
                                                        <td style={{ padding: '14px 20px', color: '#94a3b8', fontSize: 12 }}>
                                                            {v.timestamp ? new Date(v.timestamp).toLocaleString() : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="card" style={{ overflow: 'hidden' }}>
                                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>🔑 Recent Logins ({logins.length})</h3>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc' }}>
                                                    <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>User</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>IP Address</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {logins.map((l) => (
                                                    <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                        <td style={{ padding: '14px 20px' }}>
                                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{l.user_name}</div>
                                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{l.user_email}</div>
                                                        </td>
                                                        <td style={{ padding: '14px 20px', color: '#64748b' }}>{l.ip}</td>
                                                        <td style={{ padding: '14px 20px', color: '#94a3b8', fontSize: 12 }}>
                                                            {l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
};

export default AdminDashboard;
