import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import { FiArrowRight, FiCheckCircle, FiUploadCloud, FiCpu, FiUser, FiBriefcase, FiMonitor, FiDatabase, FiLayers, FiSearch, FiFileText, FiX } from 'react-icons/fi';
import api from '../lib/api';
import { useAuthStore } from '../lib/auth';

const steps = [
    { id: 1, title: "Welcome" },
    { id: 2, title: "Target Role" },
    { id: 3, title: "Experience" },
    { id: 4, title: "Initial Scan" },
    { id: 5, title: "AI Analysis" },
    { id: 6, title: "Success" }
];

const INDUSTRY_ROLES = [
    { id: 'se', label: 'Software Engineer', icon: FiMonitor },
    { id: 'backend', label: 'Backend Developer', icon: FiDatabase },
    { id: 'frontend', label: 'Frontend Engineer', icon: FiLayers },
    { id: 'fullstack', label: 'Fullstack Developer', icon: FiCpu },
    { id: 'uiux', label: 'UI/UX Designer', icon: FiMonitor },
    { id: 'product_designer', label: 'Product Designer', icon: FiMonitor },
    { id: 'ds', label: 'Data Scientist', icon: FiLayers },
    { id: 'data_engineer', label: 'Data Engineer', icon: FiDatabase },
    { id: 'ai', label: 'AI/ML Engineer', icon: FiCpu },
    { id: 'devops', label: 'DevOps Engineer', icon: FiDatabase },
    { id: 'sre', label: 'Site Reliability Engineer', icon: FiMonitor },
    { id: 'cloud', label: 'Cloud Architect', icon: FiDatabase },
    { id: 'security', label: 'Security Engineer', icon: FiCpu },
    { id: 'mobile', label: 'Mobile Developer', icon: FiMonitor },
    { id: 'product_manager', label: 'Product Manager', icon: FiBriefcase },
    { id: 'project_manager', label: 'Project Manager', icon: FiBriefcase },
    { id: 'qa', label: 'QA Engineer', icon: FiCheckCircle },
    { id: 'game_dev', label: 'Game Developer', icon: FiMonitor },
    { id: 'blockchain', label: 'Blockchain Developer', icon: FiLayers },
    { id: 'web_dev', label: 'Web Developer', icon: FiMonitor },
    { id: 'tech_writer', label: 'Technical Writer', icon: FiBriefcase },
    { id: 'dba', label: 'Database Administrator', icon: FiDatabase },
    { id: 'network', label: 'Network Engineer', icon: FiMonitor },
    { id: 'sysadmin', label: 'Systems Administrator', icon: FiMonitor },
    { id: 'support', label: 'IT Support Engineer', icon: FiUser },
    { id: 'data_analyst', label: 'Data Analyst', icon: FiLayers },
    { id: 'solutions', label: 'Solutions Architect', icon: FiCpu },
    { id: 'other', label: 'Other Role', icon: FiBriefcase }
];

const Onboarding = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        target_role: '',
        experience_level: '',
    });
    const [progress, setProgress] = useState(0);
    const [analysisText, setAnalysisText] = useState("Initializing...");
    const [roleSearch, setRoleSearch] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const navigate = useNavigate();
    const { checkAuth } = useAuthStore();

    const nextStep = () => setStep(prev => Math.min(prev + 1, steps.length));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleRoleSelect = (role: string) => {
        setFormData(prev => ({ ...prev, target_role: role }));
        setTimeout(nextStep, 300);
    };

    const handleExpSelect = (exp: string) => {
        setFormData(prev => ({ ...prev, experience_level: exp }));
        setTimeout(nextStep, 300);
    };

    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const startAnalysis = async () => {
        setStep(5);
        setAnalysisText("Uploading resume...");
        setProgress(10);
        
        try {
            // 1. Upload Resume
            const formDataUpload = new FormData();
            if (selectedFile) {
                formDataUpload.append("file", selectedFile);
            }
            
            const uploadRes = await api.post('/resume/upload', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const resumeId = uploadRes.data.id || uploadRes.data._id;
            
            if (!resumeId || resumeId === "undefined") {
                throw new Error("Failed to initialize resume ID. Please try again.");
            }
            
            setProgress(40);
            setAnalysisText("Extracting structure and skills...");
            await new Promise(r => setTimeout(r, 600));

            // 2. Evaluate Resume
            setProgress(60);
            setAnalysisText("Running ATS matching logic...");
            
            // Dynamic Dummy JD to generate a realistic score against the target role
            const roleLower = formData.target_role.toLowerCase();
            let dummyJd = "";
            if (roleLower.includes("design") || roleLower.includes("ux")) {
                dummyJd = `Looking for a ${formData.target_role} with experience as a ${formData.experience_level} designer. Core skills required: Figma, UI/UX, Wireframing, Prototyping, User Research, Adobe Creative Suite.`;
            } else if (roleLower.includes("data") || roleLower.includes("analy")) {
                dummyJd = `Looking for a ${formData.target_role} with experience as a ${formData.experience_level} professional. Core skills required: Python, SQL, Data Analysis, Machine Learning, Tableau, Pandas.`;
            } else if (roleLower.includes("product") || roleLower.includes("manager")) {
                dummyJd = `Looking for a ${formData.target_role} with experience as a ${formData.experience_level} professional. Core skills required: Product Management, Agile, Scrum, Strategy, Leadership, Roadmap Planning.`;
            } else {
                dummyJd = `Looking for a strong ${formData.target_role} with experience as a ${formData.experience_level} engineer. Core skills: React, Node.js, Python, AWS, Docker, Kubernetes, SQL, NoSQL.`;
            }
            
            const evalRes = await api.post(`/analysis/evaluate?resume_id=${resumeId}&job_title=${encodeURIComponent(formData.target_role)}&job_description=${encodeURIComponent(dummyJd)}&is_onboarding=true`);
            setAnalysisResult(evalRes.data);
            
            setProgress(90);
            setAnalysisText("Finalizing profile...");
            
            // 3. Complete Onboarding in DB
            await api.post('/auth/onboarding', formData);
            await checkAuth(); // Refresh user state
            
            setProgress(100);
            setTimeout(() => setStep(6), 500);

        } catch (err: any) {
            console.error("Onboarding failed:", err);
            alert("Failed to process your resume or complete onboarding. Please try again or check the file format.");
            setStep(4);
            setProgress(0);
            setAnalysisText("Upload failed. Please retry.");
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as any } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
    };

    return (
        <div className="min-h-screen bg-[url('/images/bg-main.svg')] bg-cover flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-2xl w-full relative z-10">
                {/* Progress Bar */}
                <div className="mb-12 flex items-center justify-between px-2">
                    {steps.map((s) => (
                        <div key={s.id} className="flex flex-col items-center gap-2 group">
                            <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${
                                step >= s.id ? "bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.3)]" : "bg-slate-200"
                            }`} />
                            <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${
                                step === s.id ? "text-indigo-600" : "text-slate-400"
                            }`}>
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="text-center"
                        >
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600/5 border border-indigo-600/10 rounded-3xl mb-8">
                                <FiUser className="text-4xl text-indigo-600" />
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-6 leading-tight">
                                Welcome to <span className="text-indigo-600">AntiGhost CV.</span>
                            </h1>
                            <p className="text-slate-500 text-lg font-bold mb-12 max-w-md mx-auto leading-relaxed italic">
                                Let's optimize your career path. We'll start by tailoring the AI to your specific goals.
                            </p>
                            <button
                                onClick={nextStep}
                                className="group px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center gap-3 mx-auto"
                            >
                                Get Started <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="text-center"
                        >
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-10">What is your <span className="text-indigo-600">Target Role?</span></h2>
                            
                            <div className="relative mb-8">
                                <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
                                <input 
                                    type="text"
                                    value={roleSearch}
                                    onChange={(e) => setRoleSearch(e.target.value)}
                                    placeholder="Search roles (e.g. Senior Frontend, AI Researcher...)"
                                    className="w-full bg-white border border-slate-200 rounded-2xl p-5 pl-14 text-sm font-bold text-slate-700 shadow-sm focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {INDUSTRY_ROLES.filter(r => r.label.toLowerCase().includes(roleSearch.toLowerCase())).map((role) => (
                                    <button
                                        key={role.id}
                                        onClick={() => handleRoleSelect(role.label)}
                                        className={`p-6 rounded-3xl border text-left transition-all group ${
                                            formData.target_role === role.label 
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)]" 
                                            : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        <role.icon className={`text-2xl mb-4 transition-colors ${
                                            formData.target_role === role.label ? "text-white" : "text-indigo-600 group-hover:scale-110 transition-transform"
                                        }`} />
                                        <span className={`block font-black text-xs uppercase tracking-widest ${
                                            formData.target_role === role.label ? "text-white" : "text-slate-900"
                                        }`}>{role.label}</span>
                                    </button>
                                ))}
                                {roleSearch && INDUSTRY_ROLES.filter(r => r.label.toLowerCase().includes(roleSearch.toLowerCase())).length === 0 && (
                                    <button
                                        key="custom"
                                        onClick={() => handleRoleSelect(roleSearch)}
                                        className={`p-6 rounded-3xl border text-left transition-all group ${
                                            formData.target_role === roleSearch
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg"
                                            : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        <FiUser className="text-2xl mb-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                                        <span className="block font-black text-xs uppercase tracking-widest text-slate-900">
                                            "{roleSearch}"
                                        </span>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="text-center"
                        >
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-10">Your <span className="text-indigo-600">Experience Level?</span></h2>
                            <div className="space-y-4">
                                {[
                                    { id: 'student', label: 'Student / New Grad', desc: 'Starting your journey' },
                                    { id: 'junior', label: '0 - 2 Years', desc: 'Early career talent' },
                                    { id: 'mid', label: '2 - 5 Years', desc: 'Intermediate professional' },
                                    { id: 'senior', label: '5+ Years', desc: 'Senior level expertise' }
                                ].map((exp) => (
                                    <button
                                        key={exp.id}
                                        onClick={() => handleExpSelect(exp.label)}
                                        className={`w-full p-6 rounded-3xl border flex items-center justify-between transition-all group ${
                                            formData.experience_level === exp.label 
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg" 
                                            : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        <div className="text-left">
                                            <span className={`block font-black text-xs uppercase tracking-widest mb-1 ${
                                                formData.experience_level === exp.label ? "text-white" : "text-slate-900"
                                            }`}>{exp.label}</span>
                                            <span className={`text-[10px] font-bold italic ${
                                                formData.experience_level === exp.label ? "text-indigo-100" : "text-slate-500"
                                            }`}>{exp.desc}</span>
                                        </div>
                                        {formData.experience_level === exp.label && <FiCheckCircle className="text-white text-xl" />}
                                    </button>
                                ))}
                            </div>
                            <button onClick={prevStep} className="mt-8 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Go Back</button>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div
                            key="step4"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="text-center"
                        >
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-10">Initialize <span className="text-indigo-600">AI Engine.</span></h2>
                            <p className="text-slate-500 font-bold mb-12 max-w-sm mx-auto italic">Upload your current resume for a baseline audit. We'll find improvements instantly.</p>
                            
                            <div className="space-y-8">
                                <div className="group relative">
                                    <input 
                                        type="file" 
                                        id="resume-upload"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setSelectedFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <label 
                                        htmlFor="resume-upload"
                                        className={`block p-12 rounded-[3rem] border-2 border-dashed transition-all cursor-pointer relative z-10 ${
                                            selectedFile 
                                            ? "bg-emerald-50 border-emerald-200" 
                                            : "bg-white border-slate-200 hover:border-indigo-400 hover:bg-slate-50"
                                        }`}
                                    >
                                        {selectedFile ? (
                                            <div className="text-center">
                                                <FiFileText className="text-6xl text-emerald-500 mx-auto mb-4" />
                                                <span className="block font-black text-xs text-emerald-700 uppercase tracking-widest truncate max-w-[200px] mx-auto">
                                                    {selectedFile.name}
                                                </span>
                                                <button 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setSelectedFile(null);
                                                    }}
                                                    className="mt-4 inline-flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:text-rose-600"
                                                >
                                                    <FiX /> Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <FiUploadCloud className="text-6xl text-slate-300 mx-auto mb-6 group-hover:text-indigo-500 group-hover:scale-110 transition-all duration-500" />
                                                <span className="block font-black text-[10px] uppercase tracking-[0.3em] text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                    Click to select resume
                                                </span>
                                            </div>
                                        )}
                                    </label>
                                </div>

                                {selectedFile && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={startAnalysis}
                                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                    >
                                        Start Analysis <FiArrowRight className="text-lg" />
                                    </motion.button>
                                )}
                            </div>
                            
                            <button onClick={prevStep} className="mt-12 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Wait, I need to go back</button>
                        </motion.div>
                    )}

                    {step === 5 && (
                        <motion.div
                            key="step5"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="text-center"
                        >
                            <div className="mb-12">
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                    className="w-24 h-24 border-b-2 border-indigo-600 rounded-full mx-auto relative mb-8"
                                >
                                    <div className="absolute inset-4 border-t-2 border-rose-500 rounded-full opacity-50" />
                                </motion.div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Analyzing...</h1>
                                <p className="text-indigo-600 font-black text-[10px] uppercase tracking-widest animate-pulse">{analysisText}</p>
                            </div>

                            <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mb-12">
                                <motion.div 
                                    className="h-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                />
                            </div>

                            <div className="space-y-4 opacity-50 blur-[2px]">
                                {[1,2,3].map(i => (
                                    <div key={i} className="h-4 bg-slate-200 rounded-full w-full animate-pulse" />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {step === 6 && (
                        <motion.div
                            key="step6"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="text-center"
                        >
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
                                <FiCheckCircle className="text-5xl text-emerald-400" />
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-6 leading-tight">
                                Analysis <span className="text-emerald-500">Complete.</span>
                            </h1>
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-12 max-w-sm mx-auto">
                                <div className="text-left space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Initial Score</span>
                                        <span className="text-slate-900 text-xl font-black">{analysisResult?.ats_score || 0}/100</span>
                                    </div>
                                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${analysisResult?.ats_score > 70 ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                                            style={{ width: `${analysisResult?.ats_score || 0}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 italic">
                                        {analysisResult?.missing_skills?.length > 0
                                            ? `We've detected ${analysisResult.missing_skills.length} missing key skills for your ${formData.target_role} profile.`
                                            : `Your resume is a strong base for ${formData.target_role} roles.`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black active:scale-[0.98] transition-all flex items-center gap-3 mx-auto"
                            >
                                Start Optimizing <FiArrowRight />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Onboarding;
