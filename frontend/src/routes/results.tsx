import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import api from "../lib/api";
import Summary from "../components/Summary";
import ATS from "../components/ATS";
import Details from "../components/Details";
import ResumeViewer from "../components/ResumeViewer";
import ResumeTemplateRenderer, { TemplatePicker, type TemplateId, type StructuredResume, TEMPLATES } from "../components/ResumeTemplateRenderer";
import type { AnalysisResult, UnifiedFeedback } from "../types";
import { motion, AnimatePresence } from "framer-motion";

type PanelView = "original" | "template";

const Results = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const rawAnalysisId = searchParams.get('analysisId');
    const analysisId = (rawAnalysisId && rawAnalysisId !== "undefined" && rawAnalysisId !== "null") ? rawAnalysisId : null;
    const rawEvaluationId = searchParams.get('evaluationId');
    const evaluationId = (rawEvaluationId && rawEvaluationId !== "undefined" && rawEvaluationId !== "null") ? rawEvaluationId : null;

    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [resumeUrl, setResumeUrl] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Template State
    const [panelView, setPanelView] = useState<PanelView>("original");
    const [structuredResume, setStructuredResume] = useState<StructuredResume | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("modern-ats");
    const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [loadingStructured, setLoadingStructured] = useState(false);

    // Helper to load resume viewer + template engine for a given resume_id
    const loadResumeAssets = async (resumeId: string) => {
        try {
            const resBlob = await api.get(`/resume/view/${resumeId}`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([resBlob.data], { type: 'application/pdf' }));
            setResumeUrl(url);
        } catch (e) {
            console.error("Failed to load resume blob", e);
        }

        setLoadingStructured(true);
        try {
            const structRes = await api.get(`/resume/structured/${resumeId}`);
            let structured = structRes.data.structured_resume;
            
            // Auto-reparse if skills_categorized is missing or empty (old parser data)
            const needsReparse = !structured || 
                !structured.skills_categorized || 
                Object.keys(structured.skills_categorized).length === 0;
                
            if (needsReparse) {
                try {
                    const reparseRes = await api.post(`/resume/reparse/${resumeId}`);
                    structured = reparseRes.data.structured_resume;
                } catch (e) {
                    console.warn("Auto-reparse failed, using existing data:", e);
                }
            }
            
            setStructuredResume(structured);
            setSelectedTemplate(structRes.data.selected_template || "modern-ats");
        } catch (e) {
            console.error("Structured resume not available:", e);
        } finally {
            setLoadingStructured(false);
        }
    };

    useEffect(() => {
        const fetchResults = async () => {
            try {
                // ── Path 1: Load from evaluation history ────────────
                if (evaluationId) {
                    const evalRes = await api.get(`/evaluations/${evaluationId}`);
                    const ev = evalRes.data;
                    // Map evaluation document to AnalysisResult shape
                    setAnalysis({
                        id: ev.id,
                        user_id: ev.user_id,
                        resume_id: ev.resume_id,
                        job_title: ev.job_title,
                        job_description: ev.job_description,
                        ats_score: ev.ats_score,
                        skills_matched: ev.skills_matched || [],
                        missing_skills: ev.missing_skills || [],
                        summary: ev.summary || "",
                        suggestions: ev.suggestions || [],
                        created_at: ev.created_at,
                    });
                    await loadResumeAssets(ev.resume_id);
                    return;
                }

                // ── Path 2: Load from analysis history (existing) ──
                const response = await api.get('/analysis/history');
                const history = response.data;
                if (history.length === 0) return;

                const item = analysisId
                    ? history.find((h: any) => h.id === analysisId)
                    : history[history.length - 1];

                if (item) {
                    setAnalysis(item);
                    await loadResumeAssets(item.resume_id);
                }
            } catch (err) {
                console.error("Failed to fetch results", err);
            }
        };
        fetchResults();

        return () => { if (resumeUrl) URL.revokeObjectURL(resumeUrl); };
    }, [analysisId, evaluationId]);

    const handleTemplateChange = async (id: TemplateId) => {
        setSelectedTemplate(id);
        setShowTemplatePicker(false);
        if (analysis?.resume_id) {
            try {
                await api.patch(`/resume/template/${analysis.resume_id}`, { template_id: id });
            } catch (e) {
                console.warn("Failed to save template preference:", e);
            }
        }
    };

    const handleExport = async (format: 'pdf' | 'docx') => {
        if (!analysis) return;
        setIsExporting(true);
        try {
            const res = await api.get(`/export/${format}/${analysis.resume_id}?t=${Date.now()}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `resume.${format}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(`Failed to export ${format}`, e);
        } finally {
            setIsExporting(false);
        }
    };

    if (!analysis) return <div className="p-10 text-center text-slate-500">Loading Results...</div>;

    const feedback: UnifiedFeedback = {
        overallScore: analysis.ats_score,
        ATS: {
            score: analysis.ats_score,
            tips: analysis.suggestions.filter(s => !s.toLowerCase().includes('skill')).map(s => ({ type: s.includes('match') || s.includes('Good') ? 'good' : 'improve', tip: s }))
        },
        toneAndStyle: {
            score: 75,
            tips: [{ type: 'good', tip: 'Professional and authoritative tone' }, { type: 'good', tip: 'Consistent active voice usage' }]
        },
        content: {
            score: 82,
            tips: [{ type: 'good', tip: 'Strong action verbs at beginning of bullets' }, { type: 'improve', tip: 'Quantify more achievements with metrics/data' }]
        },
        structure: {
            score: 90,
            tips: [{ type: 'good', tip: 'Standard reverse-chronological layout' }, { type: 'good', tip: 'Clear section headers and separation' }]
        },
        skills: {
            score: analysis.ats_score,
            tips: [...analysis.skills_matched.map(s => ({ type: 'good' as const, tip: `Matches: ${s}` })), ...analysis.missing_skills.map(s => ({ type: 'improve' as const, tip: `Missing: ${s}` }))]
        }
    };

    const activeTemplate = TEMPLATES.find(t => t.id === selectedTemplate);

    return (
        <main className="h-screen flex flex-col bg-[url('/images/bg-main.svg')] bg-cover overflow-hidden">
            {/* Nav */}
            <nav className="flex items-center justify-between px-10 py-4 bg-white/40 backdrop-blur-xl border-b border-white/40 sticky top-0 z-50 gap-4">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-700 hover:text-indigo-600 transition-all font-bold group shrink-0">
                    <div className="w-8 h-8 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-indigo-50 transition-colors border border-white/50">
                        <img src="/icons/back.svg" alt="back" className="w-4 h-4" />
                    </div>
                    <span className="text-sm">Back</span>
                </button>
                <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">
                    Evaluation: <span className="text-indigo-600">{analysis.job_title}</span>
                </h1>
                <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => handleExport('docx')} disabled={isExporting}
                        className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50">
                        {isExporting ? "..." : "Export DOCX"}
                    </button>
                    <button onClick={() => handleExport('pdf')} disabled={isExporting}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50">
                        {isExporting ? "..." : "Export PDF"}
                    </button>
                    <div className="px-3 py-1.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                        Analysis Report
                    </div>
                </div>
            </nav>

            <div className="flex flex-1 overflow-hidden p-5 gap-5 h-full">
                {/* Left Panel – Resume / Template */}
                <section className="w-[48%] h-full flex flex-col gap-3">

                    {/* Upgrade Banner */}
                    <AnimatePresence>
                        {showUpgradeBanner && structuredResume && panelView === "original" && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl px-4 py-3 shadow-lg shadow-indigo-200"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">🚀</span>
                                    <div>
                                        <p className="text-xs font-black">Your resume can be upgraded to a top ATS-friendly format.</p>
                                        <p className="text-[10px] text-white/70">6 premium templates available — ranked up to ATS 98%</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => setPanelView("template")}
                                        className="px-3 py-1.5 bg-white text-indigo-700 rounded-xl text-[11px] font-black hover:bg-indigo-50 transition-all active:scale-95"
                                    >
                                        Preview →
                                    </button>
                                    <button onClick={() => setShowUpgradeBanner(false)} className="text-white/60 hover:text-white text-lg leading-none">×</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2 bg-white/60 backdrop-blur rounded-2xl p-1 border border-white/60 shadow-sm">
                        <button
                            onClick={() => setPanelView("original")}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${panelView === "original" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            📄 Original Resume
                        </button>
                        <button
                            onClick={() => { setPanelView("template"); setShowUpgradeBanner(false); }}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${panelView === "template" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            ✨ ATS Template
                        </button>
                    </div>

                    {/* Panel Content */}
                    <div className="glass-card flex-1 flex flex-col overflow-hidden relative border-white/60 bg-white/30">
                        <AnimatePresence mode="wait">
                            {panelView === "original" ? (
                                <motion.div key="original" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 relative">
                                    <ResumeViewer url={resumeUrl || ""} />
                                </motion.div>
                            ) : (
                                <motion.div key="template" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden">
                                    {/* Template Header Bar */}
                                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/40 bg-white/30 backdrop-blur-sm shrink-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Template</span>
                                            <span className="text-[11px] font-black text-slate-700">{activeTemplate?.name}</span>
                                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[9px] font-black">ATS {activeTemplate?.atsScore}%</span>
                                        </div>
                                        <button
                                            onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-all active:scale-95"
                                        >
                                            Change Theme
                                        </button>
                                    </div>

                                    {/* Template Picker Dropdown */}
                                    <AnimatePresence>
                                        {showTemplatePicker && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden bg-white/80 backdrop-blur border-b border-white/40"
                                            >
                                                <TemplatePicker selectedId={selectedTemplate} onSelect={handleTemplateChange} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Rendered Template */}
                                    <div className="flex-1 overflow-auto">
                                        {loadingStructured ? (
                                            <div className="flex items-center justify-center h-full text-slate-400 text-sm gap-3">
                                                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                                Loading structured resume...
                                            </div>
                                        ) : structuredResume ? (
                                            <ResumeTemplateRenderer
                                                data={structuredResume}
                                                templateId={selectedTemplate}
                                                resumeId={analysis.resume_id}
                                                jobDescription={analysis.job_description}
                                                onDataChange={setStructuredResume}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400">
                                                <div className="text-4xl mb-3">📭</div>
                                                <p className="text-sm font-medium">Structured data not available for this resume.</p>
                                                <p className="text-xs mt-1">Re-upload your resume to enable the template engine.</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                {/* Right Panel – Evaluation */}
                <section className="flex-1 h-full overflow-y-auto pr-1 custom-scrollbar">
                    <div className="space-y-6 pb-12">
                        <div className="glass-card p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
                            <h2 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">Evaluation Results</h2>
                            <p className="text-slate-500 text-base font-medium max-w-2xl">
                                AI analysis complete — matched against <span className="text-indigo-600 font-bold">{analysis.job_title}</span>.
                            </p>
                            <div className="mt-8">
                                <Summary feedback={feedback} />
                            </div>
                        </div>
                        <div className="animate-in slide-in-from-bottom-4 duration-700">
                            <ATS score={feedback.ATS.score} suggestions={feedback.ATS.tips.map(t => t.tip)} />
                        </div>
                        <div className="animate-in slide-in-from-bottom-8 duration-700 delay-150">
                            <Details feedback={feedback} />
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
};

export default Results;
