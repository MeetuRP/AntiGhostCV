import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../lib/auth";
import api from "../lib/api";
import Navbar from "../components/Navbar";
import type { User } from "../types";

const Profile = () => {
    const { user, token } = useAuthStore();
    const [profile, setProfile] = useState<User | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch fresh profile from backend
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get("/auth/me");
                setProfile(res.data);
                useAuthStore.setState({ user: res.data });
            } catch {
                if (user) setProfile(user);
            }
        };
        fetchProfile();
    }, []);

    const handleUpdate = async () => {
        if (!profile) return;
        try {
            const res = await api.put("/auth/me", {
                name: profile.name,
                bio: profile.bio,
                social_links: profile.social_links,
                job_preferences: profile.job_preferences,
            });
            useAuthStore.setState({ user: res.data });
            setProfile(res.data);
            setIsEditing(false);
            showMessage("Profile updated! ✨");
        } catch {
            showMessage("Failed to update. ❌");
        }
    };

    const handleResumeUpload = async (file: File) => {
        setUploading(true);
        showMessage("Uploading & parsing your resume...");
        const formData = new FormData();
        formData.append("file", file);
        try {
            await api.post("/resume/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            // Refresh profile to get auto-filled data
            const res = await api.get("/auth/me");
            setProfile(res.data);
            useAuthStore.setState({ user: res.data });
            showMessage("Resume parsed & profile updated! 🚀");
        } catch {
            showMessage("Failed to process resume. ❌");
        } finally {
            setUploading(false);
        }
    };

    const showMessage = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(""), 4000);
    };

    if (!profile) {
        return (
            <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
                <Navbar />
                <div className="flex items-center justify-center h-[60vh]">
                    <p className="text-gray-400 text-lg">Loading your profile...</p>
                </div>
            </main>
        );
    }

    const p = profile.last_parsed_profile;
    const links = p?.links || profile.social_links || {};
    const socialLinks = profile.social_links || {};

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Toast Message */}
                {message && (
                    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-lg border border-indigo-200 text-indigo-700 px-6 py-3 rounded-2xl shadow-2xl font-medium animate-bounce">
                        {message}
                    </div>
                )}

                {/* =================== HERO CARD =================== */}
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-lg border border-white/40 relative overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-br from-pink-400/15 to-orange-400/15 rounded-full blur-3xl"></div>

                    <div className="relative flex flex-col md:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="w-28 h-28 rounded-full ring-4 ring-indigo-500/20 ring-offset-4 ring-offset-white/50 flex-shrink-0 overflow-hidden">
                            <img
                                src={profile.profile_image || `https://ui-avatars.com/api/?name=${profile.name}&background=6366f1&color=fff&size=128`}
                                alt={profile.name}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Name & Contact */}
                        <div className="flex-grow text-center md:text-left">
                            <h1 className="text-3xl font-extrabold text-gray-900">{profile.name}</h1>
                            <p className="text-indigo-600 font-medium mt-1">{profile.email}</p>
                            {profile.bio && <p className="text-gray-500 mt-2 text-sm">{profile.bio}</p>}

                            {/* Social Badges */}
                            <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                                {(socialLinks.github || (links as any).github) && (
                                    <a href={socialLinks.github || (links as any).github} target="_blank" rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-gray-700 transition-colors">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" /></svg>
                                        GitHub
                                    </a>
                                )}
                                {(socialLinks.linkedin || (links as any).linkedin) && (
                                    <a href={socialLinks.linkedin || (links as any).linkedin} target="_blank" rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-blue-500 transition-colors">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                        LinkedIn
                                    </a>
                                )}
                                {(socialLinks.website || (links as any).website) && (
                                    <a href={socialLinks.website || (links as any).website} target="_blank" rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-emerald-500 transition-colors">
                                        🌐 Portfolio
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 flex-shrink-0">
                            <button onClick={() => setIsEditing(!isEditing)} className="secondary-button text-sm">
                                {isEditing ? "Cancel" : "✏️ Edit Profile"}
                            </button>
                            <input type="file" ref={fileInputRef} accept=".pdf" className="hidden"
                                onChange={(e) => { if (e.target.files?.[0]) handleResumeUpload(e.target.files[0]); }} />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="primary-button text-sm disabled:opacity-50"
                            >
                                {uploading ? "Parsing..." : "📄 Update Resume"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* =================== MAIN GRID =================== */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LEFT SIDEBAR */}
                    <div className="space-y-6">
                        {/* Job Preferences */}
                        <Section title="🎯 Suggested Roles" className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80">
                            {isEditing ? (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Desired Roles (comma-separated)</label>
                                    <input type="text" className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 text-sm"
                                        defaultValue={(profile.job_preferences?.desired_roles || []).join(", ")}
                                        onChange={(e) => setProfile({ ...profile, job_preferences: { ...profile.job_preferences, desired_roles: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })}
                                    />
                                    <label className="text-xs font-bold text-gray-500 uppercase">Locations</label>
                                    <input type="text" className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 text-sm"
                                        defaultValue={(profile.job_preferences?.locations || []).join(", ")}
                                        onChange={(e) => setProfile({ ...profile, job_preferences: { ...profile.job_preferences, locations: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {(profile.job_preferences?.desired_roles?.length || 0) > 0 ? (
                                        profile.job_preferences.desired_roles.map(role => (
                                            <span key={role} className="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-xs font-bold">{role}</span>
                                        ))
                                    ) : (
                                        <p className="text-gray-400 italic text-sm">Upload a resume to auto-detect best roles</p>
                                    )}
                                </div>
                            )}
                        </Section>

                        {/* Socials */}
                        <Section title="🔗 Socials">
                            {isEditing ? (
                                <div className="space-y-3">
                                    {(["github", "linkedin", "website"] as const).map(key => (
                                        <div key={key}>
                                            <label className="text-xs font-bold text-gray-500 uppercase">{key}</label>
                                            <input type="text" className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 text-sm"
                                                value={(profile.social_links as any)?.[key] || ""}
                                                onChange={(e) => setProfile({ ...profile, social_links: { ...profile.social_links, [key]: e.target.value } })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {(["github", "linkedin", "website"] as const).map(key => (
                                        <div key={key} className="flex items-center gap-2">
                                            <span className="font-bold text-xs text-gray-400 uppercase w-16">{key}</span>
                                            {(profile.social_links as any)?.[key] ? (
                                                <a href={(profile.social_links as any)[key]} target="_blank" rel="noreferrer"
                                                    className="text-indigo-600 hover:underline text-sm truncate">{(profile.social_links as any)[key]}</a>
                                            ) : (
                                                <span className="text-gray-300 text-sm italic">Not linked</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Section>

                        {/* Contact Info from Resume */}
                        {p && (
                            <Section title="📞 Contact (from Resume)">
                                <div className="space-y-2 text-sm">
                                    {p.email && <div><span className="font-bold text-gray-400 text-xs">EMAIL</span><p className="text-gray-700">{p.email}</p></div>}
                                    {p.phone && <div><span className="font-bold text-gray-400 text-xs">PHONE</span><p className="text-gray-700">{p.phone}</p></div>}
                                </div>
                            </Section>
                        )}
                    </div>

                    {/* RIGHT CONTENT (2 cols wide) */}
                    <div className="lg:col-span-2 space-y-6">

                        {p ? (
                            <>
                                {/* Skills */}
                                {p.skills?.length > 0 && (
                                    <Section title="💻 Tech Stack & Skills">
                                        <div className="flex flex-wrap gap-2">
                                            {p.skills.map(skill => (
                                                <span key={skill} className="bg-white border border-gray-200 shadow-sm text-gray-800 px-4 py-2 rounded-xl text-sm font-semibold hover:border-indigo-400 hover:shadow-md transition-all cursor-default">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </Section>
                                )}

                                {/* Experience */}
                                {p.experience?.length > 0 && (
                                    <Section title="💼 Work Experience">
                                        <div className="space-y-3">
                                            {p.experience.map((exp, i) => (
                                                <div key={i} className="bg-white/60 p-4 rounded-2xl border border-gray-100 text-gray-700 text-sm leading-relaxed hover:shadow-sm transition-shadow">
                                                    {exp}
                                                </div>
                                            ))}
                                        </div>
                                    </Section>
                                )}

                                {/* Education */}
                                {p.education?.length > 0 && (
                                    <Section title="🎓 Education">
                                        <div className="space-y-3">
                                            {p.education.map((edu, i) => (
                                                <div key={i} className="bg-white/60 p-4 rounded-2xl border border-gray-100 text-gray-700 text-sm leading-relaxed font-medium hover:shadow-sm transition-shadow">
                                                    {edu}
                                                </div>
                                            ))}
                                        </div>
                                    </Section>
                                )}

                                {/* Projects */}
                                {p.projects?.length > 0 && (
                                    <Section title="🚀 Projects">
                                        <div className="space-y-3">
                                            {p.projects.map((proj, i) => (
                                                <div key={i} className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/50 text-gray-800 text-sm leading-relaxed hover:shadow-sm transition-shadow">
                                                    {proj}
                                                </div>
                                            ))}
                                        </div>
                                    </Section>
                                )}

                                {/* Certifications */}
                                {p.certifications?.length > 0 && (
                                    <Section title="🏆 Certifications & Achievements">
                                        <div className="flex flex-wrap gap-2">
                                            {p.certifications.map((cert, i) => (
                                                <span key={i} className="bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2 rounded-xl text-sm font-semibold">
                                                    🏅 {cert}
                                                </span>
                                            ))}
                                        </div>
                                    </Section>
                                )}
                            </>
                        ) : (
                            <Section title="🚀 Resume Insights">
                                <div className="text-center py-16 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <p className="text-5xl mb-4">📄</p>
                                    <p className="text-gray-500 font-medium text-lg">Upload a resume to auto-fill your profile</p>
                                    <p className="text-gray-400 text-sm mt-2">Skills, experience, education, projects, and certifications will appear here</p>
                                    <button onClick={() => fileInputRef.current?.click()} className="primary-button mt-6">
                                        Upload Resume
                                    </button>
                                </div>
                            </Section>
                        )}

                        {/* Save Button */}
                        {isEditing && (
                            <div className="flex justify-end">
                                <button onClick={handleUpdate} className="primary-button px-10 text-lg font-bold">
                                    Save Changes
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
};

// Reusable Section Card
const Section = ({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) => (
    <div className={`bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/40 ${className}`}>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">{title}</h2>
        {children}
    </div>
);

export default Profile;
