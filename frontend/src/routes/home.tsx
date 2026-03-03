import { useEffect, useState } from 'react';
import { useAuthStore } from '../lib/auth';
import Navbar from '../components/Navbar';
import { Link } from 'react-router';
import ResumeCard from '../components/ResumeCard';
import api from '../lib/api';
import type { Resume } from '../types';

const Home = () => {
    const { isAuthenticated, user, isLoading } = useAuthStore();
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [loadingResumes, setLoadingResumes] = useState(false);

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
    }, [isAuthenticated]);

    if (isLoading) return <div>Loading...</div>;

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <Navbar />
            <section className="main-section">
                <div className="page-heading py-12">
                    <h1>Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋</h1>
                    {resumes.length === 0 ? (
                        <h2>Upload your first resume to get started.</h2>
                    ) : (
                        <h2>Manage your resumes and evaluate them against job descriptions.</h2>
                    )}
                </div>

                {loadingResumes ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                    </div>
                ) : resumes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto px-4 pb-12">
                        {resumes.map((resume) => (
                            <ResumeCard key={resume.id} resume={resume} />
                        ))}
                        {/* Add New Resume Card */}
                        <Link to="/upload" className="block group">
                            <div className="bg-white/40 backdrop-blur-xl rounded-2xl p-6 shadow-sm border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center justify-center min-h-[200px] gap-3">
                                <span className="text-4xl">➕</span>
                                <p className="text-gray-500 font-medium group-hover:text-indigo-600 transition-colors">Upload New Resume</p>
                            </div>
                        </Link>
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-6xl mb-4">📄</p>
                        <p className="text-gray-500 text-lg font-medium mb-6">No resumes uploaded yet</p>
                        <Link to="/upload" className="primary-button text-xl font-semibold px-10">
                            Upload Your Resume
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
};

export default Home;
