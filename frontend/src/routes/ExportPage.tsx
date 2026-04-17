/**
 * ExportPage.tsx — Headless-browser-friendly export page.
 * 
 * This page is opened by Playwright on the backend. It:
 * 1. Receives an evaluationId and export_token from URL params
 * 2. Fetches the FINAL merged resume data from a special backend endpoint
 * 3. Renders the EXACT SAME template component used in the main UI
 * 4. Has NO scroll containers, NO animations, NO interactive buttons
 * 5. Uses print-friendly CSS for pixel-perfect PDF generation
 */
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import type { StructuredResume, TemplateId } from '../components/ResumeTemplateRenderer';

// ─── Static Template Components (No AI buttons, No animations) ────────────────
// We import the raw template rendering logic but strip all interactive elements.

const WRAP_STYLE: React.CSSProperties = {
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    overflowX: 'hidden',
    minWidth: 0,
};

const SmartText: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <>
            {parts.map((p, i) => {
                if (p.startsWith('**') && p.endsWith('**')) {
                    return <strong key={i} style={{ fontWeight: 800, color: 'inherit' }}>{p.slice(2, -2)}</strong>;
                }
                return p;
            })}
        </>
    );
};

const ContactLinks: React.FC<{ links?: StructuredResume['links']; hyperlinks?: StructuredResume['hyperlinks']; linkStyle?: React.CSSProperties }> = ({ links, hyperlinks, linkStyle }) => {
    const items: { label: string; url: string; icon: string }[] = [];
    if (links?.email) items.push({ label: links.email, url: `mailto:${links.email}`, icon: '✉' });
    if (links?.linkedin) items.push({ label: 'LinkedIn', url: links.linkedin, icon: '🔗' });
    if (links?.github) items.push({ label: 'GitHub', url: links.github, icon: '⌥' });
    if (links?.website) items.push({ label: 'Portfolio', url: links.website, icon: '🌐' });
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 4, ...(linkStyle || {}) }}>
            {items.map((item, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, opacity: 0.75 }}>
                    <span>{item.icon}</span>
                    <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                </span>
            ))}
        </div>
    );
};

const Sec: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <div style={{ marginTop: 18, marginBottom: 6, ...style }}>{children}</div>
);

// ─── Static Bullet (no hover, no AI, no animation) ────────────────────────────
const StaticBullet: React.FC<{ text: string; bulletColor?: string; textStyle?: React.CSSProperties; bulletChar?: string }> = ({ text, bulletColor, textStyle, bulletChar = '•' }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 2, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        <span style={{ color: bulletColor || 'currentColor', fontSize: '0.8em', flexShrink: 0, marginTop: 3 }}>{bulletChar}</span>
        <span style={{ ...textStyle, minWidth: 0, flex: 1, lineHeight: 1.6 }}><SmartText text={text} /></span>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC TEMPLATES — Exact visual clones of the interactive ones, minus AI UI
// ═══════════════════════════════════════════════════════════════════════════════

const StaticModernATS: React.FC<{ data: StructuredResume }> = ({ data }) => (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", color: '#1a1a2e', lineHeight: 1.6, padding: '36px 44px', background: '#fff', ...WRAP_STYLE }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 4, letterSpacing: '0.02em' }}>{data.name || 'Your Name'}</h1>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#555', marginBottom: 4 }}>
            {[data.phone, data.email].filter(Boolean).join('  ·  ')}
        </div>
        <ContactLinks links={data.links} hyperlinks={data.hyperlinks} />
        <hr style={{ border: 'none', borderTop: '2px solid #3730a3', margin: '12px 0 8px' }} />

        {data.summary && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Professional Summary</Sec>
                <p style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 6, ...WRAP_STYLE }}><SmartText text={data.summary} /></p>
            </>
        )}

        {data.experience && data.experience.length > 0 && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Experience</Sec>
                {data.experience.map((exp, i) => <StaticBullet key={i} text={exp} bulletColor="#3730a3" textStyle={{ fontSize: 12.5 }} />)}
            </>
        )}

        {data.education && data.education.length > 0 && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Education</Sec>
                {data.education.map((edu, i) => <StaticBullet key={i} text={edu} bulletColor="#3730a3" textStyle={{ fontSize: 12.5 }} />)}
            </>
        )}

        {(data.skills_categorized && Object.keys(data.skills_categorized).length > 0) ? (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Technical Skills</Sec>
                <div style={{ fontSize: 12, lineHeight: 1.9, ...WRAP_STYLE }}>
                    {Object.entries(data.skills_categorized).map(([category, items], i) => (
                        <div key={i} style={{ marginBottom: 4, display: 'inline-block', width: '100%' }}>
                            <span style={{ fontWeight: 700, marginRight: '4px' }}>{category}:</span>
                            <span>{items.join(', ')}</span>
                        </div>
                    ))}
                </div>
            </>
        ) : data.skills && data.skills.length > 0 ? (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Skills</Sec>
                <div style={{ fontSize: 12, lineHeight: 1.8, ...WRAP_STYLE }}>{data.skills.join(' · ')}</div>
            </>
        ) : null}

        {data.projects && data.projects.length > 0 && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Projects</Sec>
                {data.projects.map((p, i) => <StaticBullet key={i} text={p} bulletColor="#3730a3" textStyle={{ fontSize: 12.5 }} />)}
            </>
        )}

        {data.certifications && data.certifications.length > 0 && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Certifications</Sec>
                <div style={{ fontSize: 12, lineHeight: 1.8, ...WRAP_STYLE }}>
                    {data.certifications.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                            <span style={{ color: '#3730a3', fontSize: '0.7em', flexShrink: 0 }}>■</span>
                            <span style={{ fontWeight: 500 }}><SmartText text={c} /></span>
                        </div>
                    ))}
                </div>
            </>
        )}

        {data.publications && data.publications.length > 0 && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Publications</Sec>
                {data.publications.map((p, i) => <StaticBullet key={i} text={p} bulletColor="#3730a3" textStyle={{ fontSize: 12.5 }} />)}
            </>
        )}

        {data.volunteering && data.volunteering.length > 0 && (
            <>
                <Sec style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#3730a3', textTransform: 'uppercase' }}>Volunteering</Sec>
                {data.volunteering.map((v, i) => <StaticBullet key={i} text={v} bulletColor="#3730a3" textStyle={{ fontSize: 12.5 }} />)}
            </>
        )}
    </div>
);

const StaticMinimalATS: React.FC<{ data: StructuredResume }> = ({ data }) => (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", color: '#111', padding: '40px 48px', background: '#fff', ...WRAP_STYLE }}>
        <h1 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '0.04em', marginBottom: 2 }}>{data.name || 'Your Name'}</h1>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{[data.phone, data.email].filter(Boolean).join('  |  ')}</div>
        <ContactLinks links={data.links} hyperlinks={data.hyperlinks} />
        <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '10px 0' }} />
        {data.summary && <p style={{ fontSize: 12, color: '#444', marginBottom: 14, lineHeight: 1.7, ...WRAP_STYLE }}><SmartText text={data.summary} /></p>}
        {(['experience', 'education', 'projects', 'certifications', 'publications', 'volunteering'] as const).map(section => {
            const items = data[section];
            if (!items || items.length === 0) return null;
            return (
                <div key={section} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                    </div>
                    {items.map((item, i) => <StaticBullet key={i} text={item} textStyle={{ fontSize: 12 }} />)}
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

const StaticTechnicalATS: React.FC<{ data: StructuredResume }> = ({ data }) => (
    <div style={{ fontFamily: "'Courier New', monospace", background: '#0f1117', color: '#e2e8f0', padding: '36px 44px', minHeight: '100%', ...WRAP_STYLE }}>
        <div style={{ color: '#7dd3fc', fontSize: 10, marginBottom: 4, letterSpacing: '0.1em' }}>{'// resume.json'}</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>{data.name || 'Your Name'}</h1>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{[data.phone, data.email].filter(Boolean).join(' · ')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            {data.links?.github && <span style={{ color: '#7dd3fc', fontSize: 11 }}>⌥ GitHub</span>}
            {data.links?.linkedin && <span style={{ color: '#7dd3fc', fontSize: 11 }}>in LinkedIn</span>}
            {data.links?.website && <span style={{ color: '#7dd3fc', fontSize: 11 }}>🌐 Portfolio</span>}
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
                    <div style={{ color: '#34d399', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{`// ${section}`}</div>
                    {items.map((item, i) => <StaticBullet key={i} text={item} bulletChar="→" bulletColor="#f59e0b" textStyle={{ fontSize: 12, color: '#e2e8f0' }} />)}
                </div>
            );
        })}
    </div>
);

const StaticExecutiveATS: React.FC<{ data: StructuredResume }> = ({ data }) => (
    <div style={{ fontFamily: "'Times New Roman', Georgia, serif", color: '#1a1a1a', padding: '44px 52px', background: '#fff', ...WRAP_STYLE }}>
        <h1 style={{ fontSize: 26, fontWeight: 400, textAlign: 'center', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{data.name || 'Your Name'}</h1>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#444', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', padding: '5px 0', margin: '6px 0', ...WRAP_STYLE }}>
            {[data.phone, data.email, data.links?.linkedin, data.links?.website].filter(Boolean).join('  ·  ')}
        </div>
        {data.summary && <p style={{ fontSize: 12.5, lineHeight: 1.7, textAlign: 'justify', fontStyle: 'italic', color: '#333', margin: '12px 0', ...WRAP_STYLE }}><SmartText text={data.summary} /></p>}
        {(['experience', 'education', 'projects', 'skills', 'certifications', 'publications', 'volunteering'] as const).map(section => {
            const raw = data[section as keyof StructuredResume];
            const items = Array.isArray(raw) ? raw as string[] : [];
            if (!items || items.length === 0) return null;
            return (
                <div key={section} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', borderBottom: '1px solid #1a1a1a', paddingBottom: 2, marginBottom: 8 }}>
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                    </div>
                    {items.map((item, i) => <StaticBullet key={i} text={item} textStyle={{ fontSize: 12.5 }} />)}
                </div>
            );
        })}
    </div>
);

const StaticDeveloperATS: React.FC<{ data: StructuredResume }> = ({ data }) => (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#f8fafc', color: '#0f172a', ...WRAP_STYLE }}>
        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', padding: '28px 44px', ...WRAP_STYLE }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.01em' }}>{data.name || 'Your Name'}</h1>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{[data.phone, data.email].filter(Boolean).join('  ·  ')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                {data.links?.github && <span style={{ color: '#c4b5fd', fontSize: 12 }}>⌥ {data.links.github.replace('https://', '')}</span>}
                {data.links?.linkedin && <span style={{ color: '#c4b5fd', fontSize: 12 }}>in LinkedIn</span>}
                {data.links?.website && <span style={{ color: '#c4b5fd', fontSize: 12 }}>🌐 Portfolio</span>}
            </div>
        </div>
        <div style={{ padding: '20px 44px' }}>
            {data.summary && <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, marginBottom: 16, ...WRAP_STYLE }}><SmartText text={data.summary} /></p>}
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
                        {items.map((item, i) => <StaticBullet key={i} text={item} bulletColor="#4f46e5" textStyle={{ fontSize: 12.5 }} />)}
                    </div>
                );
            })}
        </div>
    </div>
);

const StaticCreativeATS: React.FC<{ data: StructuredResume }> = ({ data }) => (
    <div style={{ fontFamily: "'Georgia', serif", background: '#fff', color: '#1a1a2e', ...WRAP_STYLE }}>
        <div style={{ background: '#fff7ed', borderBottom: '3px solid #fb923c', padding: '32px 44px', ...WRAP_STYLE }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#c2410c', margin: 0 }}>{data.name || 'Your Name'}</h1>
            <div style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>{[data.phone, data.email].filter(Boolean).join('  ·  ')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                {data.links?.github && <span style={{ color: '#c2410c', fontSize: 12 }}>GitHub</span>}
                {data.links?.linkedin && <span style={{ color: '#c2410c', fontSize: 12 }}>LinkedIn</span>}
                {data.links?.website && <span style={{ color: '#c2410c', fontSize: 12 }}>Portfolio</span>}
            </div>
        </div>
        <div style={{ padding: '20px 44px' }}>
            {data.summary && <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.65, marginBottom: 16, fontStyle: 'italic', ...WRAP_STYLE }}><SmartText text={data.summary} /></p>}
            {(['experience', 'projects', 'education', 'skills', 'certifications', 'publications', 'volunteering'] as const).map(section => {
                const raw = data[section as keyof StructuredResume];
                const items = Array.isArray(raw) ? raw as string[] : [];
                if (!items || items.length === 0) return null;
                return (
                    <div key={section} style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#c2410c', letterSpacing: '0.08em', textTransform: 'uppercase', borderLeft: '3px solid #fb923c', paddingLeft: 10, marginBottom: 8 }}>
                            {section.charAt(0).toUpperCase() + section.slice(1)}
                        </div>
                        {items.map((item, i) => <StaticBullet key={i} text={item} bulletColor="#fb923c" textStyle={{ fontSize: 12.5 }} />)}
                    </div>
                );
            })}
        </div>
    </div>
);

const STATIC_TEMPLATE_MAP: Record<TemplateId, React.FC<{ data: StructuredResume }>> = {
    'modern-ats': StaticModernATS,
    'minimal-ats': StaticMinimalATS,
    'technical-ats': StaticTechnicalATS,
    'executive-ats': StaticExecutiveATS,
    'developer-ats': StaticDeveloperATS,
    'creative-ats': StaticCreativeATS,
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT PAGE — The actual route component
// ═══════════════════════════════════════════════════════════════════════════════

const ExportPage = () => {
    const { evaluationId } = useParams<{ evaluationId: string }>();
    const [searchParams] = useSearchParams();
    const exportToken = searchParams.get('export_token');

    const [data, setData] = useState<StructuredResume | null>(null);
    const [templateId, setTemplateId] = useState<TemplateId>('modern-ats');
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
                const res = await fetch(
                    `${apiBase}/export/render-data/${evaluationId}?export_token=${exportToken}`
                );
                if (!res.ok) {
                    throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
                }
                const json = await res.json();
                setData(json.structured_resume);
                setTemplateId(json.template_id || 'modern-ats');

                // Signal to Playwright that we're ready after a paint cycle
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setReady(true);
                    });
                });
            } catch (e: any) {
                console.error('Export page fetch error:', e);
                setError(e.message);
            }
        };

        if (evaluationId && exportToken) {
            fetchData();
        } else {
            setError('Missing evaluationId or export_token');
        }
    }, [evaluationId, exportToken]);

    if (error) {
        return <div id="export-error" style={{ padding: 40, color: 'red', fontFamily: 'monospace' }}>Export Error: {error}</div>;
    }

    if (!data) {
        return <div id="export-loading" style={{ padding: 40, fontFamily: 'sans-serif', color: '#999' }}>Loading resume data...</div>;
    }

    const TemplateComponent = STATIC_TEMPLATE_MAP[templateId] || StaticModernATS;

    return (
        <>
            <style>{`
                @page {
                    size: A4;
                    margin: 0;
                }
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 210mm;
                    background: #fff;
                }
                body {
                    font-family: 'Georgia', 'Times New Roman', serif;
                }
                #export-root {
                    width: 210mm;
                    min-height: 297mm;
                    background: #fff;
                }
            `}</style>
            <div id="export-root" data-ready={ready ? 'true' : 'false'}>
                <TemplateComponent data={data} />
            </div>
        </>
    );
};

export default ExportPage;
