import { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/auth';
import { useNavigate } from 'react-router';
import api from '../../lib/api';
import Navbar from '../../components/Navbar';
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAll();
    }, []);

    useEffect(() => {
        fetchAll();
    }, [period]);

    const fetchAll = async () => {
        setLoading(true);
        setError('');
        try {
            const [statsRes, usersRes, resumesRes, evalsRes, visitorsRes, loginsRes, industryRes, skillsRes, scoreRes, activityRes] =
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
        } catch (err: any) {
            if (err?.response?.status === 403) {
                setError('Access denied. You are not an admin.');
            } else {
                setError('Failed to load admin data.');
            }
        }
        setLoading(false);
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
                            <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Analytics & data management for ResumeBuddy</p>
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

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
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
                        </div>
                    )}

                    {/* =================== USERS TAB =================== */}
                    {activeTab === 'users' && (
                        <div className="card" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>👥 All Users ({users.length})</h3>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>User</th>
                                            <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</th>
                                            <th style={{ textAlign: 'center', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Resumes</th>
                                            <th style={{ textAlign: 'center', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Evaluations</th>
                                            <th style={{ textAlign: 'center', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Role</th>
                                            <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u) => (
                                            <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    {u.profile_image ? (
                                                        <img src={u.profile_image} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                                                    ) : (
                                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                                                            {u.name[0]}
                                                        </div>
                                                    )}
                                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{u.name}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px', color: '#64748b' }}>{u.email}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{u.resume_count}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <span style={{ background: '#f3e8ff', color: '#7c3aed', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{u.evaluation_count}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    {u.is_admin ? <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Admin</span> : <span style={{ color: '#94a3b8', fontSize: 12 }}>User</span>}
                                                </td>
                                                <td style={{ padding: '14px 20px', color: '#94a3b8', fontSize: 12 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
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
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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
