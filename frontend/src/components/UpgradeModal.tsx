import React from 'react';
import { useNavigate } from 'react-router';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ 
    isOpen, 
    onClose, 
    title = "Plan Limit Reached", 
    message = "You have reached your usage limit. Upgrade your plan to continue." 
}) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            
            {/* Modal Box */}
            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 overflow-hidden">
                {/* Decorative blob */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mb-6 shadow-inner ring-8 ring-rose-50/50">
                        ⚠️
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
                        {title}
                    </h3>
                    
                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        {message}
                    </p>

                    <div className="w-full flex flex-col gap-3">
                        <button 
                            onClick={() => {
                                onClose();
                                navigate('/pricing');
                            }}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-0.5"
                        >
                            View Plans & Upgrade
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest transition-colors"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
