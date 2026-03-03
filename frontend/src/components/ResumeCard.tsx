import { Link } from "react-router";
import type { Resume } from "../types";

const ResumeCard = ({ resume: { id, extracted_data, uploaded_at } }: { resume: Resume }) => {
    const skills = extracted_data.skills || [];
    const name = extracted_data.name || "Resume";
    const displaySkills = skills.slice(0, 5);
    const extraCount = skills.length - 5;

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        } catch {
            return "";
        }
    };

    return (
        <Link to={`/evaluate?resumeId=${id}`} className="block group">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/40 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{name}</h2>
                        {extracted_data.email && (
                            <p className="text-sm text-gray-400 mt-0.5">{extracted_data.email}</p>
                        )}
                    </div>
                    <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                        {skills.length} skills
                    </div>
                </div>

                {/* Skills Preview */}
                {displaySkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {displaySkills.map(skill => (
                            <span key={skill} className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                                {skill}
                            </span>
                        ))}
                        {extraCount > 0 && (
                            <span className="bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-lg text-xs font-bold">
                                +{extraCount} more
                            </span>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    {uploaded_at && (
                        <span className="text-xs text-gray-400">{formatDate(uploaded_at)}</span>
                    )}
                    <span className="text-xs text-indigo-600 font-semibold group-hover:underline">Evaluate →</span>
                </div>
            </div>
        </Link>
    );
};

export default ResumeCard;
