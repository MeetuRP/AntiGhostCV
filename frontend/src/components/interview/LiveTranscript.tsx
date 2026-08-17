/**
 * LiveTranscript — Real-time transcript display with word-by-word fade-in,
 * placeholder states, and text input fallback for STT failures.
 */
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveTranscriptProps {
    transcript: string;
    phase: 'ai_speaking' | 'user_ready' | 'recording' | 'submitting' | 'idle';
    lowConfidence?: { text: string; alternative: string } | null;
    onAcceptAlternative?: (alt: string) => void;
    onManualInput?: (text: string) => void;
    showFallbackInput?: boolean;
}

const LiveTranscript: React.FC<LiveTranscriptProps> = ({
    transcript,
    phase,
    lowConfidence,
    onAcceptAlternative,
    onManualInput,
    showFallbackInput = false,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [manualText, setManualText] = useState('');
    const words = transcript ? transcript.split(' ') : [];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript]);

    const handleManualSubmit = () => {
        if (manualText.trim() && onManualInput) {
            onManualInput(manualText.trim());
            setManualText('');
        }
    };

    return (
        <div className="glass-card max-w-[680px] mx-auto w-full overflow-hidden">
            <div
                ref={scrollRef}
                className="p-5 md:p-6 min-h-[120px] max-h-[200px] overflow-y-auto custom-scrollbar"
            >
                {phase === 'ai_speaking' && (
                    <p className="text-sm text-slate-400 italic font-medium">
                        Question is being read aloud...
                    </p>
                )}

                {phase === 'user_ready' && !transcript && (
                    <p className="text-sm text-slate-400 font-medium">
                        Start speaking when the ring turns violet...
                    </p>
                )}

                {phase === 'idle' && !transcript && (
                    <p className="text-sm text-slate-400 font-medium">
                        Your answer will appear here...
                    </p>
                )}

                {/* Word-by-word transcript display */}
                {(phase === 'recording' || phase === 'submitting' || transcript) && (
                    <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                        <AnimatePresence mode="popLayout">
                            {words.map((word, i) => (
                                <motion.span
                                    key={`${i}-${word}`}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.1 }}
                                    className="text-base text-slate-700 leading-relaxed"
                                >
                                    {word}
                                </motion.span>
                            ))}
                        </AnimatePresence>
                        {phase === 'recording' && (
                            <motion.span
                                className="inline-block w-0.5 h-5 bg-violet-500 ml-0.5"
                                animate={{ opacity: [1, 0, 1] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                            />
                        )}
                    </div>
                )}

                {/* Low confidence alternative */}
                {lowConfidence && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl"
                    >
                        <p className="text-xs text-amber-700 font-medium">
                            Low confidence — did you mean:{' '}
                            <button
                                onClick={() => onAcceptAlternative?.(lowConfidence.alternative)}
                                className="underline font-bold hover:text-amber-900 transition-colors"
                            >
                                "{lowConfidence.alternative}"
                            </button>
                            ?
                        </p>
                    </motion.div>
                )}

                {/* Fallback text input */}
                {showFallbackInput && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 space-y-2"
                    >
                        <p className="text-xs text-rose-500 font-medium">
                            We didn't catch that — please type your answer instead:
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={manualText}
                                onChange={(e) => setManualText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                                placeholder="Type your answer here..."
                                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                            <button
                                onClick={handleManualSubmit}
                                disabled={!manualText.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Submit
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Word count footer */}
            {transcript && (
                <div className="px-5 py-2 border-t border-white/30 flex justify-end">
                    <span className="text-[10px] font-bold text-slate-400">
                        {words.length} words
                    </span>
                </div>
            )}
        </div>
    );
};

export default LiveTranscript;
