import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiPhone, FiAlertCircle, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { Link, useNavigate, useLocation } from 'react-router';
import api from '../lib/api';
import { useAuthStore } from '../lib/auth';

const Auth = () => {
    const location = useLocation();
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('mode') === 'signup') {
            setIsSignUp(true);
        }
    }, [location]);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const login = useAuthStore(state => state.login);
    const navigate = useNavigate();

    const handleGoogleLogin = () => {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
        window.location.href = `${apiBase}/auth/google`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const endpoint = isSignUp ? '/auth/register' : '/auth/login';
            const response = await api.post(endpoint, formData);
            
            if (response.data.access_token) {
                login(response.data.access_token);
                
                // Get user info to check onboarding
                const userResponse = await api.get('/auth/me');
                if (userResponse.data.onboarding_completed) {
                    navigate('/dashboard');
                } else {
                    navigate('/onboarding');
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || "An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[url('/images/bg-main.svg')] bg-cover flex items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-indigo-500/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[40rem] h-[30rem] bg-rose-500/5 rounded-full blur-[120px]" />
            </div>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-6xl w-full flex bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-white/60 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] overflow-hidden relative z-10"
            >
                {/* Left Side: Brand Context */}
                <div className="hidden lg:flex flex-1 relative p-16 flex-col justify-between overflow-hidden border-r border-white/40">
                    <Link to="/" className="relative z-10 flex items-center gap-4 group">
                        <div className="h-14 w-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white font-black text-3xl shadow-[0_10px_30px_-5px_rgba(79,70,229,0.3)] group-hover:rotate-6 transition-all duration-500">
                            A
                        </div>
                        <span className="text-3xl font-black tracking-tighter text-slate-900 leading-none">
                            AntiGhost <span className="text-indigo-600">CV</span>
                        </span>
                    </Link>

                    <div className="relative z-10">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isSignUp ? 'signup-txt' : 'signin-txt'}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 30 }}
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <span className="inline-block px-4 py-1.5 bg-indigo-600/5 border border-indigo-600/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6">
                                    {isSignUp ? "Join the AntiGhost Network" : "Secure Authentication"}
                                </span>
                                <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-8">
                                    {isSignUp ? "Get started with" : "Sign in to"} <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">
                                        AntiGhost CV.
                                    </span>
                                </h1>
                                <p className="text-xl text-slate-500 font-bold italic leading-relaxed max-w-sm mb-12">
                                    {isSignUp 
                                        ? "Bypass the recruitment black hole with AI that actually understands engineering value." 
                                        : "Your dashboard is waiting. Sync your progress and dominate the ATS algorithms."}
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Real-time ATS Analysis
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> AI-Augmented achievements
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500" /> One-click optimization
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        <div className="mt-16 flex items-center gap-8 border-t border-slate-950/5 pt-12">
                            <div className="flex -space-x-3">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                                        <img src={`https://i.pravatar.cc/100?u=${i+20}`} alt="user" />
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Joined by <span className="text-slate-900">10k+</span> engineers
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="flex-[1.2] flex flex-col justify-center p-8 md:p-12 lg:p-20 relative bg-white/60 backdrop-blur-3xl">
                    <div className="w-full max-w-xl mx-auto">
                        <motion.div layout className="mb-10">
                            <h2 className="text-4xl font-black tracking-tighter text-slate-900 mb-4">
                                {isSignUp ? "Create Account" : "Welcome Back"}
                            </h2>
                            <div className="flex items-center gap-2">
                                 <p className="text-slate-500 font-bold italic">
                                    {isSignUp ? "Member already?" : "New to AntiGhost?"}
                                 </p>
                                 <button 
                                    onClick={() => setIsSignUp(!isSignUp)}
                                    className="text-indigo-600 font-black text-sm hover:text-indigo-700 transition-colors flex items-center gap-1 group"
                                 >
                                     {isSignUp ? "Sign In" : "Create Account"}
                                     <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                                 </button>
                            </div>
                        </motion.div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-8 p-5 bg-rose-50 border border-rose-100 rounded-[1.5rem] flex items-center gap-3 text-rose-600 text-sm font-bold italic"
                            >
                                <FiAlertCircle className="shrink-0 text-lg" />
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-6">
                            {/* Google Button */}
                            <button 
                                onClick={handleGoogleLogin}
                                className="w-full h-16 flex items-center justify-center gap-4 bg-white border border-slate-200 rounded-[1.25rem] shadow-sm hover:shadow-indigo-500/10 hover:border-indigo-400/50 transition-all group relative overflow-hidden active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/0 via-indigo-50/50 to-indigo-50/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                <FcGoogle className="text-2xl relative z-10" />
                                <span className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-600 group-hover:text-slate-900 relative z-10">
                                    {isSignUp ? "Sign Up" : "Sign In"} with Google
                                </span>
                            </button>

                            <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center px-1">
                                    <div className="w-full border-t border-slate-100"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white/80 px-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 italic">or direct access</span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <AnimatePresence mode="popLayout">
                                    {isSignUp && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="w-full space-y-2 overflow-hidden"
                                        >
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                            <div className="w-full group relative">
                                                <FiUser className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                <input 
                                                    required
                                                    type="text" 
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                    placeholder="Your Full Name"
                                                    className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.25rem] p-5 pl-14 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="w-full space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                        <div className="w-full group relative">
                                            <FiMail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input 
                                                required
                                                type="email" 
                                                value={formData.email}
                                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                placeholder="email@vault.com"
                                                className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.25rem] p-5 pl-14 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    {isSignUp && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="w-full space-y-2 overflow-hidden"
                                        >
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                                            <div className="w-full group relative">
                                                <FiPhone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                <input 
                                                    type="tel" 
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                                    placeholder="+1 (555) 000-0000"
                                                    className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.25rem] p-5 pl-14 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="w-full space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                                        <div className="w-full group relative">
                                            <FiLock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input 
                                                required
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                                placeholder="••••••••"
                                                className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.25rem] p-5 pl-14 pr-14 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                                            >
                                                {showPassword ? <FiEyeOff /> : <FiEye />}
                                            </button>
                                        </div>
                                    </div>
                                </AnimatePresence>

                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-[0_15px_40px_-10px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all mt-6 flex items-center justify-center gap-3 group"
                                >
                                    <AnimatePresence mode="wait">
                                        {loading ? (
                                            <motion.div 
                                                key="loading"
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                className="flex items-center gap-3"
                                            >
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Processing...
                                            </motion.div>
                                        ) : (
                                            <motion.div 
                                                key="ready"
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                className="flex items-center gap-3"
                                            >
                                                {isSignUp ? "Create Account" : "Sign In"}
                                                <FiArrowRight className="text-lg group-hover:translate-x-1 transition-transform" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </button>
                            </form>
                        </div>

                        <p className="mt-12 text-center text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] leading-relaxed">
                            Data protected by <span className="text-slate-900 font-black">AntiGhost Core</span> <br />
                            <Link to="/terms" className="text-indigo-500 hover:text-indigo-700">Terms</Link> • <Link to="/privacy" className="text-indigo-500 hover:text-indigo-700">Privacy</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;
