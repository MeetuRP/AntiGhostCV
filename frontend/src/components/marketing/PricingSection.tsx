import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../lib/auth';
import api from '../../lib/api';
import { useState } from 'react';

const PricingSection = () => {
    const { isAuthenticated, checkAuth } = useAuthStore();
    const navigate = useNavigate();
    const [isUpgrading, setIsUpgrading] = useState(false);
    const plans = [
        {
            id: "starter",
            name: "Starter",
            price: "Free",
            features: [
                "2 Resume Scans",
                "5 Fix-It AI Uses",
                "Community Templates",
                "Score History"
            ],
            cta: "Get Started",
            highlight: false
        },
        {
            id: "24_hour_pass",
            name: "24 Hour Pass",
            price: "₹99",
            features: [
                "10 Resume Scans",
                "20 Fix-It AI Uses",
                "All Templates",
                "Valid for 24 Hours"
            ],
            cta: "Secure Pass",
            highlight: false
        },
        {
            id: "season_pass",
            name: "Season Pass",
            price: "₹299",
            features: [
                "50 Resume Scans",
                "100 Fix-It AI Uses",
                "Priority Support",
                "Valid for 90 Days"
            ],
            cta: "Best Value",
            highlight: true
        },
        {
            id: "premium",
            name: "Premium",
            price: "₹749",
            features: [
                "Unlimited everything",
                "Lifetime Access",
                "Early beta features",
                "Dedicated career coaching"
            ],
            cta: "Go Unlimited",
            highlight: false
        }
    ];

    const handleUpgrade = async (planId: string) => {
        if (!isAuthenticated) {
            navigate('/auth?mode=signup');
            return;
        }

        setIsUpgrading(true);
        try {
            await api.post('/user/upgrade-plan', { plan: planId });
            await checkAuth();
            alert("Your plan has been upgraded successfully!");
            navigate('/dashboard');
        } catch (error) {
            console.error("Upgrade failed:", error);
            alert("Failed to upgrade plan. Please try again.");
        } finally {
            setIsUpgrading(false);
        }
    };

    return (
        <section id="pricing" className="py-32 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-24">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-4 block">Pricing Plans</span>
                    <h2 className="text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 mb-6">
                        Invest in your <span className="text-indigo-600">career future.</span>
                    </h2>
                    <p className="text-xl text-slate-400 font-bold italic">Pay once, optimize forever. No hidden subscriptions.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {plans.map((plan, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: idx * 0.1 }}
                            className={`relative p-10 rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl ${
                                plan.highlight 
                                ? "bg-slate-900 text-white border-slate-800 scale-105 z-10 shadow-2xl shadow-slate-900/30" 
                                : "bg-white text-slate-900 border-slate-100 hover:border-indigo-100 shadow-sm"
                            }`}
                        >
                            {plan.highlight && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                                    Recommended
                                </div>
                            )}
                            
                            <h3 className="text-xl font-black mb-2 tracking-tight">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-4xl font-black">{plan.price}</span>
                                {plan.price !== "Free" && <span className="text-[10px] font-bold uppercase opacity-50 tracking-widest">/ flat</span>}
                            </div>

                            <ul className="space-y-4 mb-10">
                                {plan.features.map((feature, fidx) => (
                                    <li key={fidx} className="flex items-center gap-3">
                                        <div className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] ${
                                            plan.highlight ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600"
                                        }`}>
                                            ✔
                                        </div>
                                        <span className={`text-[11px] font-bold ${plan.highlight ? "text-slate-300" : "text-slate-500"}`}>
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <button 
                                onClick={() => handleUpgrade(plan.id)}
                                disabled={isUpgrading}
                                className={`w-full block text-center py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
                                    plan.highlight 
                                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-700" 
                                    : "bg-slate-900 text-white hover:bg-slate-800"
                                } ${isUpgrading ? "opacity-70 cursor-not-allowed" : ""}`}
                            >
                                {isUpgrading ? "Processing..." : isAuthenticated ? "Select Plan" : plan.cta}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default PricingSection;
