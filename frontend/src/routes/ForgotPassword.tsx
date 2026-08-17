import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiAlertCircle, FiCheckCircle, FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router';
import api from '../lib/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await api.post('/auth/forgot-password', { email });
            setSuccessMessage(response.data.message || "Password reset link sent to your email!");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to send reset email. Please try again.");
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
                        <span className="inline-block px-4 py-1.5 bg-indigo-600/5 border border-indigo-600/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6">
                            Account Recovery
                        </span>
                        <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-8">
                            Trouble logging in? <br />
                            <span className="text-gradient">We got you covered.</span>
                        </h1>
                        <p className="text-slate-500 text-base font-bold max-w-md leading-relaxed">
                            Enter your registered email address and we'll send you a secure link to reset your password.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-8 text-slate-400 font-bold text-xs">
                        <span>AntiGhost Security v2.4</span>
                        <span>•</span>
                        <span>Encrypted Recovery</span>
                    </div>
                </div>

                {/* Right Side: Forgot Password Form */}
                <div className="flex-1 p-8 md:p-16 flex flex-col justify-between bg-white/60">
                    <div className="max-w-md w-full mx-auto my-auto">
                        <div className="mb-10">
                            <Link to="/auth" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors mb-6">
                                <FiArrowLeft /> Back to Sign In
                            </Link>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Forgot Password</h2>
                            <p className="text-slate-500 font-bold text-sm">
                                Enter your account email to receive a password reset link.
                            </p>
                        </div>

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

                        {successMessage ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-8 bg-emerald-50/80 border border-emerald-200/80 rounded-[2rem] text-center space-y-4"
                            >
                                <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-lg shadow-emerald-500/20">
                                    <FiCheckCircle />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Check Your Inbox</h3>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                    {successMessage}
                                </p>
                                <div className="pt-4">
                                    <Link
                                        to="/auth"
                                        className="inline-block px-8 py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-[1.25rem] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                                    >
                                        Return to Sign In
                                    </Link>
                                </div>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="w-full space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                    <div className="w-full group relative">
                                        <FiMail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                        <input 
                                            required
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="email@vault.com"
                                            className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.25rem] p-5 pl-14 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={loading || !email.trim()}
                                    className="w-full h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-[0_15px_40px_-10px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all mt-6 flex items-center justify-center gap-3 group"
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-3">
                                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending Link...
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            Send Reset Link
                                            <FiArrowRight className="text-lg group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>

                    <p className="mt-12 text-center text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] leading-relaxed">
                        Data protected by <span className="text-slate-900 font-black">AntiGhost Core</span>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
