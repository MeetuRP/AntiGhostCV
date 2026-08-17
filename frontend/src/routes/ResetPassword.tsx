import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiLock, FiAlertCircle, FiCheckCircle, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';
import { Link, useNavigate, useSearchParams } from 'react-router';
import api from '../lib/api';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!token) {
            setError("Invalid or missing password reset token.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match. Please check and try again.");
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/reset-password', {
                token,
                new_password: newPassword,
            });
            setSuccessMessage(response.data.message || "Password updated successfully!");
            setTimeout(() => {
                navigate('/auth');
            }, 2500);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to reset password. The link may have expired.");
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
                            Security Update
                        </span>
                        <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-8">
                            Set your new <br />
                            <span className="text-gradient">account password.</span>
                        </h1>
                        <p className="text-slate-500 text-base font-bold max-w-md leading-relaxed">
                            Choose a strong password with at least 6 characters to secure your AntiGhost CV profile.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-8 text-slate-400 font-bold text-xs">
                        <span>bcrypt Encryption</span>
                        <span>•</span>
                        <span>Token Authentication</span>
                    </div>
                </div>

                {/* Right Side: Reset Password Form */}
                <div className="flex-1 p-8 md:p-16 flex flex-col justify-between bg-white/60">
                    <div className="max-w-md w-full mx-auto my-auto">
                        <div className="mb-10">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Reset Password</h2>
                            <p className="text-slate-500 font-bold text-sm">
                                Enter your new password below.
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
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Password Reset Complete!</h3>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                    {successMessage} Redirecting to sign in...
                                </p>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="w-full space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">New Password</label>
                                    <div className="w-full group relative">
                                        <FiLock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                        <input 
                                            required
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
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

                                <div className="w-full space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm New Password</label>
                                    <div className="w-full group relative">
                                        <FiLock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                        <input 
                                            required
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.25rem] p-5 pl-14 pr-14 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={loading || !newPassword || !confirmPassword}
                                    className="w-full h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-[0_15px_40px_-10px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all mt-6 flex items-center justify-center gap-3 group"
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-3">
                                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Updating Password...
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            Update Password
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

export default ResetPassword;
