import Navbar from "../components/Navbar";
import EvaluationHistory from "../components/EvaluationHistory";
import { Link } from "react-router";

const History = () => {
    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <Navbar />
            <section className="main-section pb-16">
                <div className="max-w-5xl mx-auto px-4 py-8">
                    <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors mb-6 group">
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </Link>
                    <div className="page-heading mb-10">
                        <h1>Evaluation History 📊</h1>
                        <h2>Revisit and continue improving your past resume evaluations.</h2>
                    </div>
                    <EvaluationHistory />
                </div>
            </section>
        </main>
    );
};

export default History;
