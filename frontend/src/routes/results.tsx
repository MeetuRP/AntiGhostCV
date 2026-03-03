import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import api from "../lib/api";
import Summary from "../components/Summary";
import ATS from "../components/ATS";
import Details from "../components/Details";
import type { AnalysisResult, UnifiedFeedback } from "../types";

const Results = () => {
    const [searchParams] = useSearchParams();
    const rawAnalysisId = searchParams.get('analysisId');
    const analysisId = (rawAnalysisId && rawAnalysisId !== "undefined" && rawAnalysisId !== "null") ? rawAnalysisId : null;
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await api.get('/analysis/history');
                const history = response.data;
                if (history.length === 0) return;

                // If we have a valid analysisId, find that one; otherwise use the latest
                const item = analysisId
                    ? history.find((h: any) => h.id === analysisId)
                    : history[history.length - 1];

                if (item) setAnalysis(item);
            } catch (err) {
                console.error("Failed to fetch results", err);
            }
        };
        fetchResults();
    }, [analysisId]);

    if (!analysis) return <div className="p-10 text-center">Loading Results...</div>;

    // Transform backend analysis to UnifiedFeedback for UI components
    const feedback: UnifiedFeedback = {
        overallScore: analysis.ats_score,
        ATS: {
            score: analysis.ats_score,
            tips: analysis.suggestions.map(s => ({ type: s.includes('match') ? 'good' : 'improve', tip: s }))
        },
        toneAndStyle: { score: 70, tips: [] }, // Placeholders
        content: { score: 80, tips: [] },
        structure: { score: 85, tips: [] },
        skills: {
            score: analysis.ats_score,
            tips: [
                ...analysis.skills_matched.map(s => ({ type: 'good' as const, tip: `Matches: ${s}` })),
                ...analysis.missing_skills.map(s => ({ type: 'improve' as const, tip: `Missing: ${s}` }))
            ]
        }
    };

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Dashboard</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col items-start justify-center px-10 gap-10 mt-10">
                <section className="w-full lg:w-1/2 flex flex-col gap-8">
                    <h2 className="text-4xl font-bold text-black">Analysis for {analysis.job_title}</h2>
                    <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                        <Summary feedback={feedback} />
                        <ATS score={feedback.ATS.score} suggestions={analysis.suggestions} />
                        <Details feedback={feedback} />
                    </div>
                </section>
            </div>
        </main>
    );
};

export default Results;
