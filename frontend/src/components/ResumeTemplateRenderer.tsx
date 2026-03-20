import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

// Portal: renders directly into document.body, escaping ALL overflow/transform stacking contexts
const PopupPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const el = useRef(document.createElement('div'));
    React.useEffect(() => {
        const node = el.current;
        document.body.appendChild(node);
        return () => { document.body.removeChild(node); };
    }, []);
    return ReactDOM.createPortal(children, el.current);
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StructuredResume {
    name?: string;
    email?: string;
    phone?: string;
    summary?: string;
    links?: {
        github?: string;
        linkedin?: string;
        website?: string;
        email?: string;
        other?: string[];
    };
    hyperlinks?: { text: string; url: string }[];
    skills?: string[];
    skills_categorized?: Record<string, string[]>;
    experience?: string[];
    education?: string[];
    projects?: string[];
    certifications?: string[];
    publications?: string[];
    volunteering?: string[];
    suggested_roles?: string[];
}

export type TemplateId =
    | 'modern-ats'
    | 'minimal-ats'
    | 'technical-ats'
    | 'executive-ats'
    | 'developer-ats'
    | 'creative-ats';

interface TemplateRendererProps {
    data: StructuredResume;
    templateId: TemplateId;
    resumeId?: string;
    jobDescription?: string;
    onDataChange?: (updated: StructuredResume) => void;
}

// ─── Template Metadata ────────────────────────────────────────────────────────

export const TEMPLATES: { id: TemplateId; name: string; tagline: string; atsScore: number; color: string }[] = [
    { id: 'modern-ats', name: 'Modern ATS', tagline: 'Clean & structured — top-ranked by Lever & Greenhouse', atsScore: 98, color: 'indigo' },
    { id: 'minimal-ats', name: 'Minimal ATS', tagline: 'Whitespace-first design trusted by FAANG screeners', atsScore: 97, color: 'slate' },
    { id: 'technical-ats', name: 'Technical ATS', tagline: 'Skill-section-first layout for engineering roles', atsScore: 96, color: 'cyan' },
    { id: 'executive-ats', name: 'Executive ATS', tagline: 'Harvard-inspired layout for senior leadership roles', atsScore: 95, color: 'amber' },
    { id: 'developer-ats', name: 'Developer ATS', tagline: 'GitHub-linked, stack-highlighted for SWE applications', atsScore: 97, color: 'green' },
    { id: 'creative-ats', name: 'Creative ATS', tagline: 'Bold yet machine-readable — best for product & design', atsScore: 94, color: 'rose' },
];

// ─── Grammarly-Style Text Swap Animation ─────────────────────────────────────

const TextSwap: React.FC<{ text: string; isReplacing: boolean; nextText: string; onComplete: () => void }> = ({ text, isReplacing, nextText, onComplete }) => {
    const [phase, setPhase] = useState<'idle' | 'fadeOut' | 'skeleton' | 'typeIn'>('idle');
    const [displayed, setDisplayed] = useState(text);
    const [typedLen, setTypedLen] = useState(0);

    useEffect(() => {
        if (!isReplacing) {
            setPhase('idle');
            setDisplayed(text);
            return;
        }

        // Phase 1: fade out old text
        setPhase('fadeOut');
        const t1 = setTimeout(() => {
            setPhase('skeleton');
            // Phase 2: skeleton shimmer for 600ms
            const t2 = setTimeout(() => {
                setPhase('typeIn');
                setTypedLen(0);
                // Phase 3: type in new text character by character
                let i = 0;
                const interval = setInterval(() => {
                    i += Math.ceil(nextText.length / 40); // ~40 steps
                    setTypedLen(i);
                    if (i >= nextText.length) {
                        clearInterval(interval);
                        setDisplayed(nextText);
                        setPhase('idle');
                        onComplete();
                    }
                }, 18);
            }, 600);
            return () => clearTimeout(t2);
        }, 250);
        return () => clearTimeout(t1);
    }, [isReplacing]);

    if (phase === 'skeleton') {
        return (
            <span className="inline-block relative align-middle" style={{ width: '100%', minHeight: '1em' }}>
                <span className="block rounded h-[1em] animate-pulse" style={{
                    background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1s infinite',
                    width: '85%',
                    display: 'inline-block',
                    borderRadius: 4,
                }} />
            </span>
        );
    }

    if (phase === 'typeIn') {
        return (
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'inline' }}
            >
                {nextText.slice(0, typedLen)}
                <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    style={{ borderRight: '2px solid currentColor', marginLeft: 1 }}
                />
            </motion.span>
        );
    }

    return (
        <motion.span
            animate={phase === 'fadeOut' ? { opacity: 0, x: -4 } : { opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'inline' }}
        >
            {displayed}
        </motion.span>
    );
};

// ─── Inline Improve Button ────────────────────────────────────────────────────

interface InlineImproveProps {
    text: string;
    section: string;
    jobDescription: string;
    onApply: (newText: string) => void;
    accentColor?: string;
}

const InlineImprove: React.FC<InlineImproveProps> = ({ text, section, jobDescription, onApply, accentColor = '#4f46e5' }) => {
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState<{ text: string; score: number } | null>(null);
    const [copied, setCopied] = useState(false);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLSpanElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const [popupPos, setPopupPos] = useState<{ top?: number; bottom?: number; left: number; maxW?: number } | null>(null);
    const POPUP_W = 340;
    const btnStyle: React.CSSProperties = { background: accentColor + '22', color: accentColor };

    // Compute fixed popup position from button bbox — keeps it fully inside viewport
    const computePos = () => {
        if (!btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        const margin = 16;

        // Find the resume container to clamp boundaries
        const container = btnRef.current.closest('[data-resume-target]');
        const bounds = container
            ? container.getBoundingClientRect()
            : { left: 0, right: window.innerWidth, width: window.innerWidth };

        const availableW = Math.min(POPUP_W, bounds.width - margin * 2);

        // X: try to align left with button, but clamp inside resume bounds
        let left = r.left;
        if (left + availableW > bounds.right - margin) {
            left = bounds.right - margin - availableW;
        }
        if (left < bounds.left + margin) left = bounds.left + margin;

        // Y: open below if space, else above
        const spaceBelow = window.innerHeight - r.bottom;
        if (spaceBelow >= 260 || spaceBelow >= window.innerHeight - r.top) {
            setPopupPos({ top: r.bottom + 6, left, maxW: availableW });
        } else {
            setPopupPos({ bottom: window.innerHeight - r.top + 6, left, maxW: availableW });
        }
    };


    const handleImprove = async () => {
        setLoading(true);
        setOpen(true);
        try {
            const res = await api.post('/analysis/improve-line', {
                text,
                job_description: jobDescription,
                section,
            });
            setSuggestion({ text: res.data.improved_text, score: res.data.impact_score });
        } catch {
            setSuggestion({ text: text, score: 5 });
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!suggestion) return;
        navigator.clipboard.writeText(suggestion.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const close = () => { setOpen(false); setSuggestion(null); };

    return (
        <span ref={ref} className="group/improve relative inline-block align-middle" style={{ verticalAlign: 'baseline' }}>
            <button
                ref={btnRef}
                onClick={() => { computePos(); handleImprove(); }}
                className="opacity-0 group-hover/improve:opacity-100 ml-1 px-1.5 py-0.5 rounded text-[9px] font-black transition-all active:scale-95"
                title="Improve with AI"
                style={{ lineHeight: 1.2, verticalAlign: 'middle', ...btnStyle }}
            >
                ✨
            </button>

            <AnimatePresence>
                {open && popupPos && (
                    <PopupPortal>
                        <div
                            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                            onClick={close}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: popupPos.top != null ? -6 : 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            style={{
                                position: 'fixed',
                                zIndex: 9999,
                                width: popupPos.maxW ?? POPUP_W,
                                left: popupPos.left,
                                ...(popupPos.top != null
                                    ? { top: popupPos.top }
                                    : { bottom: popupPos.bottom ?? 80 }),
                                background: '#fff',
                                borderRadius: 18,
                                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                                border: '1px solid #f1f5f9',
                                padding: 16,
                                overflowX: 'hidden',
                                maxWidth: 'calc(100vw - 32px)',
                            }}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">✨</span>
                                    <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase">AI Suggestion</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {suggestion && (
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${suggestion.score >= 8 ? 'bg-green-100 text-green-700' : suggestion.score >= 6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                            Impact {suggestion.score}/10
                                        </span>
                                    )}
                                    <button onClick={close} className="text-slate-300 hover:text-slate-500 text-lg leading-none ml-1">×</button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="space-y-2 py-2">
                                    <div className="h-3 bg-slate-100 rounded-full animate-pulse w-full" />
                                    <div className="h-3 bg-slate-100 rounded-full animate-pulse w-5/6" />
                                    <div className="h-3 bg-slate-100 rounded-full animate-pulse w-4/6" />
                                    <p className="text-[10px] text-slate-400 mt-2 text-center">AI is analyzing your text...</p>
                                </div>
                            ) : suggestion ? (
                                <>
                                    <div className="bg-gradient-to-br from-indigo-50 to-slate-50 rounded-xl p-3 mb-3 text-[12px] text-slate-800 font-medium leading-relaxed border border-indigo-100/60">
                                        {suggestion.text}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { onApply(suggestion.text); close(); }}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[11px] font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-200"
                                        >
                                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                            Apply
                                        </button>
                                        <button
                                            onClick={handleCopy}
                                            className={`flex-1 border text-[11px] font-bold py-2 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 ${copied ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            {copied
                                                ? <><svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copied!</>
                                                : <><svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
                                            }
                                        </button>
                                        <button
                                            onClick={close}
                                            className="flex-1 bg-white hover:bg-slate-50 active:scale-95 text-slate-500 border border-slate-200 text-[11px] font-bold py-2 rounded-xl transition-all"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </>
                            ) : null}
                        </motion.div>
                    </PopupPortal>
                )}
            </AnimatePresence>
        </span>
    );
};

// ─── Animated Bullet Item ─────────────────────────────────────────────────────

interface BulletItemProps {
    text: string;
    section: string;
    jobDescription: string;
    onApply: (t: string) => void;
    bulletChar?: string;
    bulletColor?: string;
    textStyle?: React.CSSProperties;
    accentColor?: string;
}

const BulletItem: React.FC<BulletItemProps> = ({
    text, section, jobDescription, onApply, bulletChar = '•', bulletColor, textStyle, accentColor
}) => {
    const [isReplacing, setIsReplacing] = useState(false);
    const [current, setCurrent] = useState(text);
    const [next, setNext] = useState('');

    const handleApply = (newText: string) => {
        setNext(newText);
        setIsReplacing(true);
    };

    const handleComplete = () => {
        setCurrent(next);
        setIsReplacing(false);
        onApply(next);
    };

    return (
        <div className="group/bullet flex items-start gap-2 mb-2" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            <span className="shrink-0 mt-[3px]" style={{ color: bulletColor || 'currentColor', fontSize: '0.8em' }}>
                {bulletChar}
            </span>
            <span style={{ ...textStyle, minWidth: 0, flex: 1, lineHeight: 1.6 }}>
                <TextSwap
                    text={current}
                    isReplacing={isReplacing}
                    nextText={next}
                    onComplete={handleComplete}
                />
                {!isReplacing && (
                    <InlineImprove
                        text={current}
                        section={section}
                        jobDescription={jobDescription}
                        onApply={handleApply}
                        accentColor={accentColor}
                    />
                )}
            </span>
        </div>
    );
};

// ─── Contact Links ─────────────────────────────────────────────────────────────

const ContactLinks: React.FC<{ links?: StructuredResume['links']; hyperlinks?: StructuredResume['hyperlinks']; linkStyle?: React.CSSProperties }> = ({ links, hyperlinks, linkStyle }) => {
    const items: { label: string; url: string; icon: string }[] = [];
    if (links?.email) items.push({ label: links.email, url: `mailto:${links.email}`, icon: '✉' });
    if (links?.linkedin) items.push({ label: 'LinkedIn', url: links.linkedin, icon: '🔗' });
    if (links?.github) items.push({ label: 'GitHub', url: links.github, icon: '⌥' });
    if (links?.website) items.push({ label: 'Portfolio', url: links.website, icon: '🌐' });
    // Add any extra annotation-based links
    if (hyperlinks) {
        for (const h of hyperlinks) {
            if (!items.some(i => i.url === h.url) && h.url.startsWith('http')) {
                items.push({ label: h.text || 'Link', url: h.url, icon: '🔗' });
            }
        }
    }
    if (links?.other) {
        for (const u of links.other) {
            if (!items.some(i => i.url === u)) {
                items.push({ label: u.replace(/^https?:\/\//, ''), url: u, icon: '🔗' });
            }
        }
    }

    if (items.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-3 justify-center mt-1" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
            {items.map((item, i) => (
                <a key={i} href={item.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] hover:underline opacity-75 hover:opacity-100 transition-opacity shrink-0"
                    style={linkStyle}
                >
                    <span>{item.icon}</span>
                    <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                </a>
            ))}
        </div>
    );
};

// ─── Section Title ─────────────────────────────────────────────────────────────

const Sec: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; className?: string }> = ({ children, style, className }) => (
    <div style={{ marginTop: 18, marginBottom: 6, ...style }} className={className}>{children}</div>
);

// ─── Common wrapper styles ─────────────────────────────────────────────────────

const WRAP_STYLE: React.CSSProperties = {
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    overflowX: 'hidden',
    minWidth: 0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 1: Modern ATS
// ═══════════════════════════════════════════════════════════════════════════════

const ModernATS: React.FC<{ data: StructuredResume; jd: string; onApply: (s: string, i: number, t: string) => void }> = ({ data, jd, onApply }) => (
    <div data-resume-target="true" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", color: '#1a1a2e', lineHeight: 1.6, padding: '36px 44px', background: '#fff', ...WRAP_STYLE }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 4, letterSpacing: '0.02em' }}>{data.name || 'Your Name'}</h1>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#555', marginBottom: 4 }}>
            {[data.phone, data.email].filter(Boolean).join('  ·  ')}
        </div>
        <ContactLinks links={data.links} hyperlinks={data.hyperlinks} />
        <hr style={{ border: 'none', borderTop: '2px solid #3730a3', margin: '12px 0 8px' }} />

        {data.summary && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Professional Summary</Sec>
                <p style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 6, ...WRAP_STYLE }}>
                    {data.summary}
                    <InlineImprove text={data.summary} section="summary" jobDescription={jd} onApply={(t) => onApply('summary', 0, t)} />
                </p>
            </>
        )}

        {data.experience && data.experience.length > 0 && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Experience</Sec>
                {data.experience.map((exp, i) => <BulletItem key={i} text={exp} section="experience" jobDescription={jd} onApply={(t) => onApply('experience', i, t)} bulletColor="#3730a3" textStyle={{ fontSize: 12.5 }} />)}
            </>
        )}

        {data.education && data.education.length > 0 && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Education</Sec>
                {data.education.map((edu, i) => <BulletItem key={i} text={edu} section="education" jobDescription={jd} onApply={(t) => onApply('education', i, t)} bulletColor="#3730a3" textStyle={{ fontSize: 12.5 }} />)}
            </>
        )}

        {(data.skills_categorized && Object.keys(data.skills_categorized).length > 0) ? (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Technical Skills</Sec>
                <div style={{ fontSize: 12, lineHeight: 1.9, ...WRAP_STYLE }}>
                    {Object.entries(data.skills_categorized).map(([category, items], i) => (
                        <div key={i} style={{ marginBottom: 3 }}>
                            <span style={{ fontWeight: 700 }}>{category}:</span>{' '}
                            <span>{items.join(', ')}</span>
                        </div>
                    ))}
                </div>
            </>
        ) : data.skills && data.skills.length > 0 ? (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Skills</Sec>
                <p style={{ fontSize: 12, lineHeight: 1.8, ...WRAP_STYLE }}>{data.skills.join(' · ')}</p>
            </>
        ) : null}

        {data.projects && data.projects.length > 0 && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Projects</Sec>
                {data.projects.map((p, i) => <BulletItem key={i} text={p} section="projects" jobDescription={jd} onApply={(t) => onApply('projects', i, t)} bulletColor="#3730a3" textStyle={{ fontSize: 12.5 }} />)}
            </>
        )}

        {data.certifications && data.certifications.length > 0 && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Certifications</Sec>
                <div style={{ fontSize: 12, lineHeight: 1.8, ...WRAP_STYLE }}>
                    {data.certifications.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                            <span style={{ color: '#3730a3', fontSize: '0.7em', flexShrink: 0 }}>■</span>
                            <span style={{ fontWeight: 500 }}>{c}</span>
                        </div>
                    ))}
                </div>
            </>
        )}

        {data.publications && data.publications.length > 0 && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Publications</Sec>
                {data.publications.map((p, i) => <BulletItem key={i} text={p} section="publications" jobDescription={jd} onApply={(t) => onApply('publications', i, t)} bulletColor="#3730a3" textStyle={{ fontSize: 12.5 }} />)}
            </>
        )}

        {data.volunteering && data.volunteering.length > 0 && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Volunteering</Sec>
                {data.volunteering.map((v, i) => <BulletItem key={i} text={v} section="volunteering" jobDescription={jd} onApply={(t) => onApply('volunteering', i, t)} bulletColor="#3730a3" textStyle={{ fontSize: 12.5 }} />)}
            </>
        )}
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2: Minimal ATS
// ═══════════════════════════════════════════════════════════════════════════════

const MinimalATS: React.FC<{ data: StructuredResume; jd: string; onApply: (s: string, i: number, t: string) => void }> = ({ data, jd, onApply }) => (
    <div data-resume-target="true" style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", color: '#111', padding: '40px 48px', background: '#fff', ...WRAP_STYLE }}>
        <h1 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '0.04em', marginBottom: 2 }}>{data.name || 'Your Name'}</h1>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{[data.phone, data.email].filter(Boolean).join('  |  ')}</div>
        <ContactLinks links={data.links} hyperlinks={data.hyperlinks} />
        <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '10px 0' }} />

        {data.summary && (
            <p style={{ fontSize: 12, color: '#444', marginBottom: 14, lineHeight: 1.7, ...WRAP_STYLE }}>
                {data.summary}
                <InlineImprove text={data.summary} section="summary" jobDescription={jd} onApply={(t) => onApply('summary', 0, t)} />
            </p>
        )}

        {(['experience', 'education', 'projects', 'certifications', 'publications', 'volunteering'] as const).map(section => {
            const items = data[section];
            if (!items || items.length === 0) return null;
            return (
                <div key={section} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                    </div>
                    {items.map((item, i) => <BulletItem key={i} text={item} section={section} jobDescription={jd} onApply={(t) => onApply(section, i, t)} textStyle={{ fontSize: 12 }} />)}
                </div>
            );
        })}

        {data.skills && data.skills.length > 0 && (
            <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Skills</div>
                <div style={{ fontSize: 11, color: '#444', lineHeight: 1.9, ...WRAP_STYLE }}>{data.skills.join(', ')}</div>
            </div>
        )}
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3: Technical ATS
// ═══════════════════════════════════════════════════════════════════════════════

const TechnicalATS: React.FC<{ data: StructuredResume; jd: string; onApply: (s: string, i: number, t: string) => void }> = ({ data, jd, onApply }) => (
    <div data-resume-target="true" style={{ fontFamily: "'Courier New', monospace", background: '#0f1117', color: '#e2e8f0', padding: '36px 44px', minHeight: '100%', ...WRAP_STYLE }}>
        <div style={{ color: '#7dd3fc', fontSize: 10, marginBottom: 4, letterSpacing: '0.1em' }}>{'// resume.json'}</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>{data.name || 'Your Name'}</h1>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{[data.phone, data.email].filter(Boolean).join(' · ')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            {data.links?.github && <a href={data.links.github} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc', fontSize: 11 }}>⌥ GitHub</a>}
            {data.links?.linkedin && <a href={data.links.linkedin} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc', fontSize: 11 }}>in LinkedIn</a>}
            {data.links?.website && <a href={data.links.website} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc', fontSize: 11 }}>🌐 Portfolio</a>}
            {(data.hyperlinks || []).map((h, i) => (
                <a key={i} href={h.url} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc', fontSize: 11 }}>🔗 {h.text}</a>
            ))}
        </div>

        {data.skills && data.skills.length > 0 && (
            <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#34d399', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>// Tech Stack</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {data.skills.map((s, i) => (
                        <span key={i} style={{ background: '#1e293b', border: '1px solid #334155', color: '#7dd3fc', fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>{s}</span>
                    ))}
                </div>
            </div>
        )}

        {(['experience', 'projects', 'education', 'certifications', 'publications', 'volunteering'] as const).map(section => {
            const items = data[section];
            if (!items || items.length === 0) return null;
            return (
                <div key={section} style={{ marginBottom: 16 }}>
                    <div style={{ color: '#34d399', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
                        {`// ${section}`}
                    </div>
                    {items.map((item, i) => (
                        <BulletItem key={i} text={item} section={section} jobDescription={jd}
                            onApply={(t) => onApply(section, i, t)}
                            bulletChar="→" bulletColor="#f59e0b"
                            textStyle={{ fontSize: 12, color: '#e2e8f0' }}
                        />
                    ))}
                </div>
            );
        })}
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 4: Executive ATS
// ═══════════════════════════════════════════════════════════════════════════════

const ExecutiveATS: React.FC<{ data: StructuredResume; jd: string; onApply: (s: string, i: number, t: string) => void }> = ({ data, jd, onApply }) => (
    <div data-resume-target="true" style={{ fontFamily: "'Times New Roman', Georgia, serif", color: '#1a1a1a', padding: '44px 52px', background: '#fff', ...WRAP_STYLE }}>
        <h1 style={{ fontSize: 26, fontWeight: 400, textAlign: 'center', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{data.name || 'Your Name'}</h1>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#444', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', padding: '5px 0', margin: '6px 0', ...WRAP_STYLE }}>
            {[data.phone, data.email, data.links?.linkedin, data.links?.website].filter(Boolean).join('  ·  ')}
        </div>
        <ContactLinks links={data.links} hyperlinks={data.hyperlinks} />

        {data.summary && (
            <p style={{ fontSize: 12.5, lineHeight: 1.7, textAlign: 'justify', fontStyle: 'italic', color: '#333', margin: '12px 0', ...WRAP_STYLE }}>
                {data.summary}
                <InlineImprove text={data.summary} section="summary" jobDescription={jd} onApply={(t) => onApply('summary', 0, t)} />
            </p>
        )}

        {(['experience', 'education', 'projects', 'skills', 'certifications', 'publications', 'volunteering'] as const).map(section => {
            const raw = data[section as keyof StructuredResume];
            const items = Array.isArray(raw) ? raw as string[] : [];
            if (!items || items.length === 0) return null;
            return (
                <div key={section} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', borderBottom: '1px solid #1a1a1a', paddingBottom: 2, marginBottom: 8 }}>
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                    </div>
                    {items.map((item, i) => <BulletItem key={i} text={item} section={section} jobDescription={jd} onApply={(t) => onApply(section, i, t)} textStyle={{ fontSize: 12.5 }} />)}
                </div>
            );
        })}
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 5: Developer ATS
// ═══════════════════════════════════════════════════════════════════════════════

const DeveloperATS: React.FC<{ data: StructuredResume; jd: string; onApply: (s: string, i: number, t: string) => void }> = ({ data, jd, onApply }) => (
    <div data-resume-target="true" style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#f8fafc', color: '#0f172a', ...WRAP_STYLE }}>
        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', padding: '28px 44px', ...WRAP_STYLE }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.01em' }}>{data.name || 'Your Name'}</h1>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{[data.phone, data.email].filter(Boolean).join('  ·  ')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                {data.links?.github && <a href={data.links.github} target="_blank" rel="noreferrer" style={{ color: '#c4b5fd', fontSize: 12 }}>⌥ {data.links.github.replace('https://', '')}</a>}
                {data.links?.linkedin && <a href={data.links.linkedin} target="_blank" rel="noreferrer" style={{ color: '#c4b5fd', fontSize: 12 }}>in LinkedIn</a>}
                {data.links?.website && <a href={data.links.website} target="_blank" rel="noreferrer" style={{ color: '#c4b5fd', fontSize: 12 }}>🌐 Portfolio</a>}
                {(data.hyperlinks || []).filter(h => !Object.values(data.links || {}).flat().includes(h.url)).map((h, i) => (
                    <a key={i} href={h.url} target="_blank" rel="noreferrer" style={{ color: '#c4b5fd', fontSize: 12 }}>🔗 {h.text}</a>
                ))}
            </div>
        </div>

        <div style={{ padding: '20px 44px' }}>
            {data.summary && (
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, marginBottom: 16, ...WRAP_STYLE }}>
                    {data.summary}
                    <InlineImprove text={data.summary} section="summary" jobDescription={jd} onApply={(t) => onApply('summary', 0, t)} accentColor="#4f46e5" />
                </p>
            )}

            {data.skills && data.skills.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#4f46e5', textTransform: 'uppercase', marginBottom: 8 }}>Core Skills</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {data.skills.map((s, i) => (
                            <span key={i} style={{ background: '#ede9fe', color: '#4f46e5', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{s}</span>
                        ))}
                    </div>
                </div>
            )}

            {(['experience', 'projects', 'education', 'certifications', 'publications', 'volunteering'] as const).map(section => {
                const items = data[section];
                if (!items || items.length === 0) return null;
                return (
                    <div key={section} style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#4f46e5', textTransform: 'uppercase', marginBottom: 8 }}>
                            {section.charAt(0).toUpperCase() + section.slice(1)}
                        </div>
                        {items.map((item, i) => <BulletItem key={i} text={item} section={section} jobDescription={jd} onApply={(t) => onApply(section, i, t)} bulletColor="#4f46e5" textStyle={{ fontSize: 12.5 }} accentColor="#4f46e5" />)}
                    </div>
                );
            })}
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 6: Creative ATS
// ═══════════════════════════════════════════════════════════════════════════════

const CreativeATS: React.FC<{ data: StructuredResume; jd: string; onApply: (s: string, i: number, t: string) => void }> = ({ data, jd, onApply }) => (
    <div data-resume-target="true" style={{ fontFamily: "'Georgia', serif", background: '#fff', color: '#1a1a2e', ...WRAP_STYLE }}>
        <div style={{ background: '#fff7ed', borderBottom: '3px solid #fb923c', padding: '32px 44px', ...WRAP_STYLE }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#c2410c', margin: 0 }}>{data.name || 'Your Name'}</h1>
            <div style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>{[data.phone, data.email].filter(Boolean).join('  ·  ')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                {data.links?.github && <a href={data.links.github} style={{ color: '#c2410c', fontSize: 12 }} target="_blank" rel="noreferrer">GitHub</a>}
                {data.links?.linkedin && <a href={data.links.linkedin} style={{ color: '#c2410c', fontSize: 12 }} target="_blank" rel="noreferrer">LinkedIn</a>}
                {data.links?.website && <a href={data.links.website} style={{ color: '#c2410c', fontSize: 12 }} target="_blank" rel="noreferrer">Portfolio</a>}
                {(data.hyperlinks || []).map((h, i) => (
                    <a key={i} href={h.url} style={{ color: '#c2410c', fontSize: 12 }} target="_blank" rel="noreferrer">{h.text}</a>
                ))}
            </div>
        </div>

        <div style={{ padding: '20px 44px' }}>
            {data.summary && (
                <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.65, marginBottom: 16, fontStyle: 'italic', ...WRAP_STYLE }}>
                    {data.summary}
                    <InlineImprove text={data.summary} section="summary" jobDescription={jd} onApply={(t) => onApply('summary', 0, t)} accentColor="#c2410c" />
                </p>
            )}

            {(['experience', 'projects', 'education', 'skills', 'certifications', 'publications', 'volunteering'] as const).map(section => {
                const raw = data[section as keyof StructuredResume];
                const items = Array.isArray(raw) ? raw as string[] : [];
                if (!items || items.length === 0) return null;
                return (
                    <div key={section} style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#c2410c', letterSpacing: '0.08em', textTransform: 'uppercase', borderLeft: '3px solid #fb923c', paddingLeft: 10, marginBottom: 8 }}>
                            {section.charAt(0).toUpperCase() + section.slice(1)}
                        </div>
                        {items.map((item, i) => <BulletItem key={i} text={item} section={section} jobDescription={jd} onApply={(t) => onApply(section, i, t)} bulletColor="#fb923c" textStyle={{ fontSize: 12.5 }} accentColor="#c2410c" />)}
                    </div>
                );
            })}
        </div>
    </div>
);

// ─── Template Dispatcher ──────────────────────────────────────────────────────

const TEMPLATE_MAP: Record<TemplateId, React.FC<any>> = {
    'modern-ats': ModernATS,
    'minimal-ats': MinimalATS,
    'technical-ats': TechnicalATS,
    'executive-ats': ExecutiveATS,
    'developer-ats': DeveloperATS,
    'creative-ats': CreativeATS,
};

// ─── Template Picker ──────────────────────────────────────────────────────────

export const TemplatePicker: React.FC<{ selectedId: TemplateId; onSelect: (id: TemplateId) => void }> = ({ selectedId, onSelect }) => {
    const colorMap: Record<string, string> = {
        indigo: 'border-indigo-400 bg-indigo-50',
        slate: 'border-slate-400 bg-slate-50',
        cyan: 'border-cyan-400 bg-cyan-50',
        amber: 'border-amber-400 bg-amber-50',
        green: 'border-green-400 bg-green-50',
        rose: 'border-rose-400 bg-rose-50',
    };
    const badgeMap: Record<string, string> = {
        indigo: 'bg-indigo-100 text-indigo-700',
        slate: 'bg-slate-100 text-slate-700',
        cyan: 'bg-cyan-100 text-cyan-700',
        amber: 'bg-amber-100 text-amber-700',
        green: 'bg-green-100 text-green-700',
        rose: 'bg-rose-100 text-rose-700',
    };

    return (
        <div className="grid grid-cols-3 gap-2 p-2">
            {TEMPLATES.map(tpl => (
                <button
                    key={tpl.id}
                    onClick={() => onSelect(tpl.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all active:scale-95 ${selectedId === tpl.id ? colorMap[tpl.color] : 'border-transparent bg-white/60 hover:bg-white/90'}`}
                >
                    <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-[11px] font-black text-slate-700 leading-tight">{tpl.name}</span>
                        <span className={`text-[9px] font-black rounded-full px-1.5 py-0.5 shrink-0 ${badgeMap[tpl.color]}`}>ATS {tpl.atsScore}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-snug">{tpl.tagline}</p>
                </button>
            ))}
        </div>
    );
};

// ─── Shimmer keyframes injected globally once ─────────────────────────────────

const ShimmerStyle = () => (
    <style>{`
    @keyframes shimmer {
      0% { background-position: 200% 0 }
      100% { background-position: -200% 0 }
    }
  `}</style>
);

// ─── Main Renderer ────────────────────────────────────────────────────────────

const ResumeTemplateRenderer: React.FC<TemplateRendererProps> = ({
    data,
    templateId,
    resumeId,
    jobDescription = '',
    onDataChange,
}) => {
    const [localData, setLocalData] = useState<StructuredResume>(data);

    // Sync when parent data changes (e.g. after fetching structured resume)
    useEffect(() => {
        setLocalData(data);
    }, [data]);

    const handleApply = useCallback(async (section: string, idx: number, newText: string) => {
        setLocalData(prev => {
            const updated = { ...prev };
            const arr = updated[section as keyof StructuredResume] as string[] | undefined;
            if (Array.isArray(arr)) {
                const newArr = [...arr];
                newArr[idx] = newText;
                (updated as any)[section] = newArr;
            } else if (section === 'summary') {
                updated.summary = newText;
            }
            if (onDataChange) onDataChange(updated);
            return updated;
        });

        if (resumeId) {
            try {
                await api.post('/analysis/save-edit', {
                    resume_id: resumeId,
                    original_text: (data[section as keyof StructuredResume] as string[])?.[idx] ?? data.summary,
                    improved_text: newText,
                    action: 'accept',
                });
            } catch (e) { console.warn('Failed to persist edit', e); }
        }
    }, [data, resumeId, onDataChange]);

    const TemplateComponent = TEMPLATE_MAP[templateId] || ModernATS;

    return (
        <div style={{ width: '100%', height: '100%', overflowX: 'hidden', overflowY: 'auto', background: '#fff' }}>
            <ShimmerStyle />
            <TemplateComponent data={localData} jd={jobDescription} onApply={handleApply} />
        </div>
    );
};

export default ResumeTemplateRenderer;
