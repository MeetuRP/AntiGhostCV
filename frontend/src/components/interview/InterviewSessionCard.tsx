/**
 * InterviewSessionCard — Compact card for session history display.
 * Shows job role, date, overall score badge, and sub-score bars.
 */
import React from 'react';
import { Link } from 'react-router';
import type { InterviewSessionSummary } from '../../types';

interface InterviewSessionCardProps {
    session: InterviewSessionSummary;
    compact?: boolean;
}

const InterviewSessionCard: React.FC<InterviewSessionCardProps> = ({ session, compact = false }) => {
    const score = session.overall_score ?? 0;
    const scoreColor = score >= 7 ? 'bg-emerald-100 text-emerald-700' : score >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const ScoreBar: React.FC<{ label: string; value: number | null; color: string }> = ({ label, value, color }) => (
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 w-[62px] shrink-0 uppercase tracking-wider">{label}</span>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${color}`}
                    style={{ width: `${((value ?? 0) / 10) * 100}%` }}
                />
            </div>
            <span className="text-[10px] font-black text-slate-500 w-[28px] text-right">{value?.toFixed(1) ?? '—'}</span>
        </div>
    );

    return (
        <div className={`glass-card ${compact ? 'p-4' : 'p-5 md:p-6'}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h4 className={`font-black text-slate-800 tracking-tight ${compact ? 'text-sm' : 'text-base'}`}>
                        {session.job_role}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {formatDate(session.completed_at)}
                    </p>
                </div>
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${scoreColor}`}>
                    {score.toFixed(1)}/10
                </span>
            </div>

            <div className="space-y-1.5 mb-4">
                <ScoreBar label="Tech" value={session.technical_score} color="bg-indigo-500" />
                <ScoreBar label="HR" value={session.hr_score} color="bg-violet-500" />
                <ScoreBar label="Comm" value={session.communication_score} color="bg-teal-500" />
            </div>

            <Link
                to={`/interview/report/${session.session_id}`}
                className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest"
            >
                View Report →
            </Link>
        </div>
    );
};

export default InterviewSessionCard;
