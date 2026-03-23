import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

interface FixItOverlayProps {
    items: any[];
    styles: any;
    viewport: any;
    jobDescription: string;
    onAcceptEdit: (original: string, newText: string, score: number) => void;
    onDelete?: (text: string) => void;
}

const FixItOverlay: React.FC<FixItOverlayProps> = ({ items, styles, viewport, jobDescription, onAcceptEdit, onDelete }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
    const [suggestion, setSuggestion] = useState<{ index: number, text: string, score: number, suggestions: string[] } | null>(null);
    const [acceptedEdits, setAcceptedEdits] = useState<Record<number, string>>({});
    const [deletedBlocks, setDeletedBlocks] = useState<Record<number, boolean>>({});
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    // Group items into logical paragraphs based on Y coordinate proximity and font size
    const paragraphs = React.useMemo(() => {
        if (!viewport || !items) return [];
        const enriched = items.map((item, index) => {
            const fontSize = item.transform[0]; // raw font size

            // pdf.js items coordinates are base-level. We must use viewport to transform them to DOM pixels based on current zoom
            const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
            // pdf.js text items are anchored at the baseline (bottom). We offset it to the top.
            const scaledFontSize = fontSize * viewport.scale;
            const top = y - scaledFontSize;
            const left = x;
            const scaledWidth = item.width * viewport.scale;

            // Extract native font family from PDF stylesheet
            const fontObj = styles[item.fontName];
            const fontFamily = fontObj ? fontObj.fontFamily : 'inherit';

            return { item, index, originalText: item.str, top, left, fontSize: scaledFontSize, width: scaledWidth, fontFamily };
        }).filter(i => i.originalText.trim().length > 0);

        // Sort top to bottom, then left to right
        enriched.sort((a, b) => {
            if (Math.abs(a.top - b.top) > 5) return a.top - b.top;
            return a.left - b.left;
        });

        const paras: any[] = [];
        let currentPara: any = null;
        let paraId = 0;

        for (const data of enriched) {
            if (!currentPara) {
                currentPara = {
                    id: paraId++,
                    text: data.originalText.trim(),
                    top: data.top,
                    left: data.left,
                    width: data.width,
                    height: data.fontSize * 1.5,
                    fontSize: data.fontSize,
                    fontFamily: data.fontFamily,
                    items: [data]
                };
            } else {
                const lastData = currentPara.items[currentPara.items.length - 1];
                const yDistance = data.top - lastData.top;

                const isSameLine = Math.abs(yDistance) < 5;
                const isNextLine = yDistance > 0 && yDistance < data.fontSize * 2.5;

                // Prevent merging across columns by checking horizontal gaps
                let isSameBlock = true;
                if (isSameLine) {
                    const hGap = data.left - (lastData.left + lastData.width);
                    if (hGap > 40 * viewport.scale) isSameBlock = false; // Large gap = different column
                } else if (isNextLine) {
                    // Start of next line should be roughly aligned with the paragraph's left edge
                    if (Math.abs(data.left - currentPara.left) > 60 * viewport.scale) isSameBlock = false;

                    // Prevent merging if it's a new bullet point
                    const trimmedText = data.originalText.trim();
                    if (/^[•▪\-–—*·]/.test(trimmedText)) isSameBlock = false;

                    // Prevent merging if there's a significant vertical gap (e.g. new paragraph)
                    if (yDistance > data.fontSize * 1.6) isSameBlock = false;
                }

                // Merge if same paragraph chunk
                if (Math.abs(data.fontSize - currentPara.fontSize) < 3 * viewport.scale && (isSameLine || isNextLine) && isSameBlock) {
                    // Always append with a space, never a hard \n, to allow fluid browser wrapping
                    currentPara.text += " " + data.originalText.trim();
                    currentPara.items.push(data);
                    // Expand bounding box precisely
                    currentPara.left = Math.min(currentPara.left, data.left);
                    currentPara.width = Math.max(currentPara.width, data.left + data.width - currentPara.left);

                    // Height is tricky: we want the total height from top of first line to bottom of last line
                    // Calculate based on the lowest item's top + its font height
                    const currentBottom = currentPara.top + currentPara.height;
                    const newBottom = data.top + (data.fontSize * 1.5);
                    currentPara.height = Math.max(currentBottom, newBottom) - currentPara.top;
                } else {
                    paras.push(currentPara);
                    currentPara = {
                        id: paraId++,
                        text: data.originalText.trim(),
                        top: data.top,
                        left: data.left,
                        width: data.width,
                        height: data.fontSize * 1.5,
                        fontSize: data.fontSize,
                        fontFamily: data.fontFamily,
                        items: [data]
                    };
                }
            }
        }
        if (currentPara) paras.push(currentPara);

        // Filter for substantial paragraphs (e.g. at least 10 words or > 80 chars) to strictly ignore dates/headers
        return paras.filter(p => {
            const wordCount = p.text.split(/\s+/).length;
            return p.text.length > 80 || wordCount >= 10;
        });
    }, [items, viewport]);

    const handleImprove = async (index: number, text: string) => {
        setLoadingIndex(index);
        setSuggestion(null);
        try {
            const res = await api.post('/analysis/improve-line', {
                text,
                job_description: jobDescription || "General optimized resume",
                section: "experience"
            });
            setSuggestion({
                index,
                text: res.data.improved_text,
                score: res.data.impact_score,
                suggestions: res.data.suggestions || []
            });
        } catch (err: any) {
            console.error("Failed to improve line:", err);
            // If it's a plan limit error, don't show a fake suggestion — let the global interceptor handle it
            if (err?.response?.status === 403 && err?.response?.data?.detail?.upgrade_required) {
                // The global 403 interceptor in home.tsx will trigger the UpgradeModal
                return;
            }
            // Generic failure fallback
            setSuggestion({
                index,
                text: "AI generation failed. Please try again.",
                score: 0,
                suggestions: ["Check your internet connection.", "The AI service may be temporarily unavailable."]
            });
        } finally {
            setLoadingIndex(null);
        }
    };

    const handleAccept = (index: number, original_text: string, new_text: string, score: number) => {
        setAcceptedEdits(prev => ({ ...prev, [index]: new_text }));
        setSuggestion(null);
        onAcceptEdit(original_text, new_text, score);
    };

    const handleDeleteLine = (index: number, text: string) => {
        setDeletedBlocks(prev => ({ ...prev, [index]: true }));
        if (onDelete) onDelete(text);
    };

    const handleReject = () => {
        setSuggestion(null);
    };

    const handleCopy = (index: number, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ width: viewport?.width, height: viewport?.height }}>
            <AnimatePresence>
            {paragraphs.map((para) => {
                const idx = para.id;
                if (deletedBlocks[idx]) return null;
                const isHovered = hoveredIndex === idx;
                const isLoading = loadingIndex === idx;
                const activeSuggestion = suggestion?.index === idx ? suggestion : null;
                const currentText = acceptedEdits[idx] || para.text;
                const isEdited = !!acceptedEdits[idx];

                return (
                    <div
                        key={idx}
                        className={`group absolute pointer-events-auto transition-all duration-300 ${isHovered || isEdited || activeSuggestion ? 'z-50' : 'z-10'}`}
                        style={{
                            left: `${para.left}px`,
                            top: `${para.top - (para.fontSize * 0.2)}px`, // Slight offset to cover properly
                            width: `${para.width}px`,
                            minHeight: `${para.height + (para.fontSize * 0.4)}px`, // Cover the entire original paragraph height
                            display: 'flex',
                            alignItems: 'flex-start', // Top align for multiline paragraphs
                        }}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        {/* The readable/editable text layer */}
                        <motion.div
                            initial={false}
                            animate={{
                                backgroundColor: isEdited || activeSuggestion ? '#ffffff' : (isHovered ? 'rgba(99, 102, 241, 0.05)' : 'transparent'),
                                boxShadow: isEdited || activeSuggestion ? `0 0 0 ${2 * viewport.scale}px #ffffff` : 'none', // Subtle expansion
                            }}
                            className={`flex items-start relative overflow-visible rounded-sm`}
                            style={{
                                fontSize: `${para.fontSize}px`,
                                fontFamily: `${para.fontFamily}, Arial, Helvetica, sans-serif`, // Fallback securely, prioritize native font
                                fontWeight: 400,
                                letterSpacing: 'normal',
                                whiteSpace: 'normal', // fluid wrapping
                                lineHeight: '1.5', // slightly looser for better readability
                                width: '100%',
                                marginTop: `-${para.fontSize * 0.15}px`, // Visually align with PDF baseline ascenders
                                paddingLeft: `${2 * viewport.scale}px`,
                                paddingRight: `${2 * viewport.scale}px`,
                                marginLeft: `-${2 * viewport.scale}px`, // Offset padding so text starts strictly where PDF text starts
                                color: isEdited || activeSuggestion ? '#000000' : 'transparent', // Sharp black to match standard PDF text natively
                            }}
                        >
                            <AnimatePresence mode="popLayout">
                                <motion.span
                                    key={currentText}
                                    initial={isEdited ? { y: 15, opacity: 0, color: '#16a34a' } : false}
                                    animate={isEdited ? { y: 0, opacity: 1, color: '#000000' } : {}}
                                    exit={{ y: -15, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                    className="block w-full"
                                >
                                    {isEdited ? currentText : para.text}
                                </motion.span>
                            </AnimatePresence>

                            {/* Flashing underline effect for newly accepted edit */}
                            {isEdited && (
                                <motion.div
                                    initial={{ width: '100%', opacity: 1 }}
                                    animate={{ opacity: 0 }}
                                    transition={{ duration: 1.5, delay: 0.5 }}
                                    className="absolute bottom-0 left-0 h-[2px] bg-green-400"
                                />
                            )}
                        </motion.div>

                        {/* Inline Delete Icon */}
                        <div className="absolute -left-6 top-0 flex flex-col items-center gap-2 cursor-pointer transition-opacity duration-200">
                             {!isEdited && !activeSuggestion && !isLoading && (
                                 <button
                                     onClick={() => handleDeleteLine(idx, para.text)}
                                     className={`w-5 h-5 flex items-center justify-center rounded-full transition-all ${isHovered ? 'opacity-100 text-red-500 hover:scale-110 hover:bg-red-50' : 'opacity-0'}`}
                                     title="Delete Line"
                                 >
                                     <span className="text-[12px] leading-none">🗑</span>
                                 </button>
                             )}
                        </div>

                        {/* AI Trigger Icon */}
                        <div className="absolute -right-8 top-0 flex flex-col items-center gap-2 cursor-pointer transition-opacity duration-200">
                            {!isEdited && !activeSuggestion && !isLoading && (
                                <button
                                    onClick={() => handleImprove(idx, para.text)}
                                    // Make icon perpetually visible, but more prominent on hover
                                    className={`w-6 h-6 flex items-center justify-center rounded-full transition-all shadow-sm ${isHovered
                                        ? 'bg-indigo-600 text-white shadow-md scale-110'
                                        : 'bg-white border border-indigo-100 text-indigo-400 opacity-0 group-hover:opacity-100 sm:opacity-70' // Added responsive opascity so it doesnt clutter but is discoverable
                                        }`}
                                    title="Improve with AI"
                                >
                                    <span className="text-[12px] leading-none">✨</span>
                                </button>
                            )}

                            {isEdited && !activeSuggestion && !isLoading && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-5 h-5 bg-green-100 border border-green-300 text-green-700 rounded-full flex items-center justify-center shadow-sm"
                                    title="Improved by AI"
                                >
                                    <span className="text-[10px]">✓</span>
                                </motion.div>
                            )}

                            {isLoading && (
                                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-md bg-white"></div>
                            )}
                        </div>

                        {/* AI Suggestion Popup positioned below the paragraph */}
                        <AnimatePresence>
                            {activeSuggestion && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="absolute left-0 top-full mt-3 max-w-[500px] bg-white rounded-2xl shadow-2xl border border-indigo-100 p-5 z-[100]"
                                    style={{
                                        filter: "drop-shadow(0 20px 13px rgb(0 0 0 / 0.15))",
                                        minWidth: "320px",
                                        width: `Math.max(320, ${para.width})px`
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl animate-pulse">✨</span>
                                            <span className="text-[11px] font-black tracking-widest text-indigo-500 uppercase">AI Suggestion</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full">
                                            <span className="text-[10px] font-bold">Impact</span>
                                            <span className="text-xs font-black">{activeSuggestion.score}/10</span>
                                        </div>
                                    </div>

                                    <div className="text-sm text-slate-800 mb-4 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <span className="text-green-700">{activeSuggestion.text}</span>
                                    </div>

                                    {activeSuggestion.suggestions && activeSuggestion.suggestions.length > 0 && (
                                        <div className="mb-5">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Why this helps</p>
                                            <ul className="space-y-1.5">
                                                {activeSuggestion.suggestions.map((s, i) => (
                                                    <li key={i} className="flex gap-2 text-[12px] text-slate-600 leading-tight">
                                                        <span className="text-indigo-400 mt-0.5">•</span>
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAccept(idx, para.text, activeSuggestion.text, activeSuggestion.score)}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[11px] font-bold py-2 rounded-xl transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-1.5"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            Apply
                                        </button>

                                        <button
                                            onClick={() => handleCopy(idx, activeSuggestion.text)}
                                            className={`flex-1 hover:bg-slate-50 active:scale-95 border text-[11px] font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${copiedIndex === idx ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-slate-700 border-slate-200'}`}
                                            title="Copy suggestion to clipboard"
                                        >
                                            {copiedIndex === idx ? (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    Copy
                                                </>
                                            )}
                                        </button>

                                        <button
                                            onClick={handleReject}
                                            className="flex-1 bg-white hover:bg-slate-50 active:scale-95 text-slate-600 border border-slate-200 text-[11px] font-bold py-2 rounded-xl transition-all"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
            </AnimatePresence>
        </div>
    );
};

export default FixItOverlay;
