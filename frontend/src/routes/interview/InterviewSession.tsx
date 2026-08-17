/**
 * InterviewSession — Core voice interview interface.
 * Full-page state machine managing TTS playback, STT recording,
 * WebSocket streaming, amplitude-reactive ring, and live transcript.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiSquare, FiSkipForward } from 'react-icons/fi';

import AnimatedRing, { type RingState } from '../../components/interview/AnimatedRing';
import QuestionCard from '../../components/interview/QuestionCard';
import LiveTranscript from '../../components/interview/LiveTranscript';
import interviewApi from '../../lib/interviewApi';
import { SpeechManager } from '../../lib/speechManager';
import { AudioAnalyzer } from '../../lib/audioAnalyzer';
import { TTSPlayer } from '../../lib/ttsPlayer';
import type { InterviewQuestion, ConfidenceMetrics } from '../../types';
import type { AnswerEntry } from '../../lib/interviewApi';

type SessionPhase =
    | 'LOADING'
    | 'PREFETCHING_AUDIO'
    | 'READY_QUESTION'
    | 'AI_SPEAKING'
    | 'USER_READY'
    | 'USER_RECORDING'
    | 'SUBMITTING'
    | 'NEXT_QUESTION'
    | 'SESSION_COMPLETE';

// Browser compatibility check
function checkBrowserSupport(): string | null {
    if (typeof MediaRecorder === 'undefined') return 'MediaRecorder is not supported in this browser.';
    if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined')
        return 'Web Audio API is not supported in this browser.';
    if (typeof WebSocket === 'undefined') return 'WebSocket is not supported in this browser.';
    return null;
}

const MAX_ANSWER_TIME_S = 90;

const InterviewSession = () => {
    const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const locationState = location.state as {
        questions?: Pick<InterviewQuestion, 'question_id' | 'question_text' | 'category' | 'difficulty'>[];
        sessionId?: string;
        jobRole?: string;
    } | null;

    const sessionId = paramSessionId || locationState?.sessionId || '';
    const jobRole = locationState?.jobRole || '';

    const [phase, setPhase] = useState<SessionPhase>('LOADING');
    const [questions, setQuestions] = useState<Pick<InterviewQuestion, 'question_id' | 'question_text' | 'category' | 'difficulty'>[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [allAnswers, setAllAnswers] = useState<Map<string, string>>(new Map());
    const [amplitude, setAmplitude] = useState(0);
    const [prefetchProgress, setPrefetchProgress] = useState({ done: 0, total: 8 });
    const [countdown, setCountdown] = useState(MAX_ANSWER_TIME_S);
    const [showFallbackInput, setShowFallbackInput] = useState(false);
    const [lowConfidence, setLowConfidence] = useState<{ text: string; alternative: string } | null>(null);
    const [browserError, setBrowserError] = useState<string | null>(null);
    const [micError, setMicError] = useState(false);
    const [allMetrics, setAllMetrics] = useState<ConfidenceMetrics[]>([]);

    // Refs for utilities (persist across renders without causing re-renders)
    const speechManagerRef = useRef<SpeechManager | null>(null);
    const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
    const ttsPlayerRef = useRef<TTSPlayer | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const amplitudeFrameRef = useRef<number | null>(null);

    // Check browser support on mount
    useEffect(() => {
        const err = checkBrowserSupport();
        if (err) setBrowserError(err);
    }, []);

    // Session recovery — save progress to sessionStorage
    useEffect(() => {
        if (sessionId && currentIndex > 0) {
            sessionStorage.setItem(`interview_${sessionId}`, JSON.stringify({ currentIndex }));
        }
    }, [sessionId, currentIndex]);

    // Initialize session
    useEffect(() => {
        if (!sessionId || browserError) return;

        const qs = locationState?.questions;
        if (qs && qs.length > 0) {
            setQuestions(qs);
            // Check for session recovery
            const saved = sessionStorage.getItem(`interview_${sessionId}`);
            if (saved) {
                try {
                    const { currentIndex: savedIdx } = JSON.parse(saved);
                    if (savedIdx > 0 && savedIdx < qs.length) {
                        setCurrentIndex(savedIdx);
                    }
                } catch { /* ignore */ }
            }
            setPhase('PREFETCHING_AUDIO');
        } else {
            // No questions in state — can't proceed
            navigate('/interview', { replace: true });
        }

        return () => {
            // Cleanup on unmount
            speechManagerRef.current?.disconnect();
            audioAnalyzerRef.current?.stop();
            ttsPlayerRef.current?.destroy();
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            if (amplitudeFrameRef.current) cancelAnimationFrame(amplitudeFrameRef.current);
        };
    }, [sessionId]);

    // Phase: PREFETCHING_AUDIO — prefetch all TTS audio
    useEffect(() => {
        if (phase !== 'PREFETCHING_AUDIO' || questions.length === 0) return;

        const player = new TTSPlayer();
        ttsPlayerRef.current = player;

        player.prefetchAll(questions, sessionId, (done, total) => {
            setPrefetchProgress({ done, total });
        }).then(() => {
            setPhase('READY_QUESTION');
        }).catch(() => {
            // Even if all prefetch fails, proceed
            setPhase('READY_QUESTION');
        });
    }, [phase, questions.length]);

    // Phase: READY_QUESTION — auto-play TTS for current question
    useEffect(() => {
        if (phase !== 'READY_QUESTION') return;

        const q = questions[currentIndex];
        if (!q) return;

        setTranscript('');
        setShowFallbackInput(false);
        setLowConfidence(null);
        setCountdown(MAX_ANSWER_TIME_S);

        // Play TTS if cached
        const player = ttsPlayerRef.current;
        if (player?.hasAudio(q.question_id)) {
            setPhase('AI_SPEAKING');
            player.play(q.question_id).then(() => {
                setPhase('USER_READY');
            }).catch(() => {
                setPhase('USER_READY');
            });
        } else {
            // No audio cached — skip directly to USER_READY
            setPhase('USER_READY');
        }
    }, [phase, currentIndex]);

    // Amplitude animation loop during recording
    const startAmplitudeLoop = useCallback(() => {
        const loop = () => {
            if (audioAnalyzerRef.current) {
                setAmplitude(audioAnalyzerRef.current.getAmplitude());
            }
            amplitudeFrameRef.current = requestAnimationFrame(loop);
        };
        amplitudeFrameRef.current = requestAnimationFrame(loop);
    }, []);

    const stopAmplitudeLoop = useCallback(() => {
        if (amplitudeFrameRef.current) {
            cancelAnimationFrame(amplitudeFrameRef.current);
            amplitudeFrameRef.current = null;
        }
        setAmplitude(0);
    }, []);

    // Start recording handler
    const handleStartRecording = async () => {
        const q = questions[currentIndex];
        if (!q) return;

        setMicError(false);
        setShowFallbackInput(false);

        try {
            // Request microphone permission
            const testStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            testStream.getTracks().forEach(t => t.stop());
        } catch {
            setMicError(true);
            return;
        }

        setPhase('USER_RECORDING');
        setTranscript('');

        // Initialize speech manager
        const sm = new SpeechManager();
        speechManagerRef.current = sm;

        sm.onPartialTranscript = (text) => {
            setTranscript(text);
        };
        sm.onFinalTranscript = (text, confidence) => {
            setTranscript(text);
            if (confidence > 0 && confidence < 0.75) {
                setLowConfidence({ text, alternative: text });
            }
        };
        sm.onError = (msg) => {
            console.warn('STT error:', msg);
        };

        const token = localStorage.getItem('token') || '';

        // Extract technical terms from question for speech context
        const techTerms = q.question_text
            .split(/[\s,;.?!]+/)
            .filter(w => w.length > 3 && /^[A-Z]/.test(w));

        try {
            await sm.connect(sessionId, token, q.question_text, techTerms);
            const stream = await sm.startRecording();

            // Start audio analyzer for amplitude tracking
            const analyzer = new AudioAnalyzer();
            audioAnalyzerRef.current = analyzer;
            analyzer.start(stream);
            startAmplitudeLoop();

            // Start countdown timer
            setCountdown(MAX_ANSWER_TIME_S);
            countdownIntervalRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        handleStopRecording();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

        } catch (err) {
            console.error('Failed to start recording:', err);
            setPhase('USER_READY');
            setShowFallbackInput(true);
        }
    };

    // Stop recording handler
    const handleStopRecording = async () => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        stopAmplitudeLoop();
        setPhase('SUBMITTING');

        const sm = speechManagerRef.current;
        const analyzer = audioAnalyzerRef.current;
        let finalText = transcript;

        try {
            if (sm) {
                const result = await sm.stopRecording();
                if (result.text) {
                    finalText = result.text;
                    setTranscript(finalText);
                }
            }
        } catch {
            // Use current transcript
        }

        // Get confidence metrics before stopping analyzer
        if (analyzer && finalText) {
            const metrics = analyzer.getConfidenceMetrics(finalText);
            setAllMetrics(prev => [...prev, metrics]);
        }

        // Cleanup recording resources
        sm?.disconnect();
        analyzer?.stop();
        speechManagerRef.current = null;
        audioAnalyzerRef.current = null;

        // Check for empty transcript
        if (!finalText.trim()) {
            setPhase('USER_READY');
            setShowFallbackInput(true);
            return;
        }

        // Save answer
        const q = questions[currentIndex];
        try {
            await interviewApi.submitAnswer(sessionId, q.question_id, finalText);
        } catch (err) {
            console.error('Failed to submit answer:', err);
        }

        // Store answer locally
        setAllAnswers(prev => new Map(prev).set(q.question_id, finalText));

        // Move to next question or complete
        if (currentIndex < questions.length - 1) {
            setPhase('NEXT_QUESTION');
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setPhase('READY_QUESTION');
            }, 1500);
        } else {
            setPhase('SESSION_COMPLETE');
            handleCompleteSession(new Map(allAnswers).set(q.question_id, finalText));
        }
    };

    // Handle manual text input fallback
    const handleManualInput = (text: string) => {
        setTranscript(text);
        setShowFallbackInput(false);

        // Auto-submit the manual answer
        const q = questions[currentIndex];
        setPhase('SUBMITTING');

        interviewApi.submitAnswer(sessionId, q.question_id, text).catch(() => {});
        setAllAnswers(prev => new Map(prev).set(q.question_id, text));

        if (currentIndex < questions.length - 1) {
            setPhase('NEXT_QUESTION');
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setPhase('READY_QUESTION');
            }, 1500);
        } else {
            setPhase('SESSION_COMPLETE');
            handleCompleteSession(new Map(allAnswers).set(q.question_id, text));
        }
    };

    // Skip question handler
    const handleSkip = () => {
        const q = questions[currentIndex];
        const skipText = '(Question skipped)';
        setAllAnswers(prev => new Map(prev).set(q.question_id, skipText));
        interviewApi.submitAnswer(sessionId, q.question_id, skipText).catch(() => {});

        if (currentIndex < questions.length - 1) {
            setPhase('NEXT_QUESTION');
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setPhase('READY_QUESTION');
            }, 1500);
        } else {
            setPhase('SESSION_COMPLETE');
            handleCompleteSession(new Map(allAnswers).set(q.question_id, skipText));
        }
    };

    // Complete session — call backend with all answers + communication score
    const handleCompleteSession = async (answers: Map<string, string>) => {
        // Compute aggregate communication score
        let communicationScore = 5;
        if (allMetrics.length > 0) {
            const scores = allMetrics.map(m => AudioAnalyzer.computeCommunicationScore(m));
            communicationScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        }

        const answerEntries: AnswerEntry[] = Array.from(answers.entries()).map(([qid, text]) => ({
            question_id: qid,
            answer_transcript: text,
        }));

        try {
            await interviewApi.completeSession(sessionId, communicationScore, answerEntries);
        } catch (err) {
            console.error('Failed to complete session:', err);
        }

        // Clean up session storage
        sessionStorage.removeItem(`interview_${sessionId}`);

        // Navigate to report
        setTimeout(() => {
            navigate(`/interview/report/${sessionId}`, { replace: true });
        }, 1500);
    };

    // Derive ring state from phase
    const getRingState = (): RingState => {
        switch (phase) {
            case 'AI_SPEAKING': return 'ai_speaking';
            case 'USER_RECORDING': return 'user_speaking';
            case 'SUBMITTING':
            case 'SESSION_COMPLETE': return 'processing';
            default: return 'idle';
        }
    };

    // Browser compatibility error
    if (browserError) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                <div className="glass-card p-10 max-w-md text-center">
                    <div className="text-4xl mb-4">🔇</div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">Browser Not Supported</h2>
                    <p className="text-sm text-slate-500 mb-6">{browserError}</p>
                    <p className="text-xs text-slate-400">Please use Chrome or Edge for voice features.</p>
                </div>
            </main>
        );
    }

    // Mic permission error modal
    if (micError) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                <div className="glass-card p-10 max-w-md text-center">
                    <div className="text-4xl mb-4">🎤</div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">Microphone Access Required</h2>
                    <p className="text-sm text-slate-500 mb-4">
                        Please allow microphone access in your browser settings to use the voice interview feature.
                    </p>
                    <p className="text-xs text-slate-400 mb-6">
                        Click the lock icon in your browser's address bar → Site settings → Allow microphone.
                    </p>
                    <button
                        onClick={() => setMicError(false)}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
                    >
                        Try Again
                    </button>
                </div>
            </main>
        );
    }

    const currentQuestion = questions[currentIndex];
    const countdownPercent = (countdown / MAX_ANSWER_TIME_S) * 100;
    const countdownColor = countdown <= 10 ? 'bg-rose-500' : countdown <= 20 ? 'bg-amber-500' : 'bg-indigo-500';

    return (
        <main className="h-screen flex flex-col bg-[url('/images/bg-main.svg')] bg-cover overflow-hidden">
            {/* Header Bar */}
            <nav className="flex items-center justify-between px-6 md:px-10 py-3 bg-white/50 backdrop-blur-xl border-b border-white/40 shrink-0">
                <div className="flex items-center gap-2">
                    <FiMic className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-black text-slate-800 tracking-tight">AI Interview Prep</span>
                </div>

                {/* Progress pills */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        {questions.map((_, i) => (
                            <div
                                key={i}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                    i < currentIndex ? 'bg-indigo-500' :
                                    i === currentIndex ? 'bg-indigo-500 ring-4 ring-indigo-200' :
                                    'bg-slate-200'
                                }`}
                            />
                        ))}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Question {currentIndex + 1} of {questions.length}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {jobRole && (
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100 uppercase tracking-wider">
                            {jobRole}
                        </span>
                    )}
                </div>
            </nav>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto py-4 px-4 gap-4">

                {/* Loading / Prefetching states */}
                {(phase === 'LOADING' || phase === 'PREFETCHING_AUDIO') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <AnimatedRing state="processing" size={120} />
                        <div className="text-center">
                            <p className="text-lg font-black text-slate-700">
                                {phase === 'LOADING' ? 'Loading...' : 'Preparing your interview...'}
                            </p>
                            {phase === 'PREFETCHING_AUDIO' && (
                                <div className="mt-3 w-48 mx-auto">
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-indigo-500 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(prefetchProgress.done / prefetchProgress.total) * 100}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1.5 text-center">
                                        {prefetchProgress.done}/{prefetchProgress.total} audio prepared
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Session complete */}
                {phase === 'SESSION_COMPLETE' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <AnimatedRing state="processing" size={120} />
                        <p className="text-lg font-black text-slate-700">Evaluating your answers...</p>
                        <p className="text-sm text-slate-400">AI is reviewing all {questions.length} responses</p>
                    </motion.div>
                )}

                {/* Active interview UI */}
                {currentQuestion && !['LOADING', 'PREFETCHING_AUDIO', 'SESSION_COMPLETE'].includes(phase) && (
                    <>
                        {/* Question Card */}
                        <AnimatePresence mode="wait">
                            <QuestionCard
                                key={currentIndex}
                                questionIndex={currentIndex}
                                questionText={currentQuestion.question_text}
                                category={currentQuestion.category}
                                difficulty={currentQuestion.difficulty}
                                isSpeaking={phase === 'AI_SPEAKING'}
                            />
                        </AnimatePresence>

                        {/* Animated Ring */}
                        <div className="py-2">
                            <AnimatedRing
                                state={getRingState()}
                                size={220}
                                amplitude={amplitude}
                            />
                        </div>

                        {/* Live Transcript */}
                        <LiveTranscript
                            transcript={transcript}
                            phase={
                                phase === 'AI_SPEAKING' ? 'ai_speaking' :
                                phase === 'USER_READY' ? 'user_ready' :
                                phase === 'USER_RECORDING' ? 'recording' :
                                phase === 'SUBMITTING' ? 'submitting' : 'idle'
                            }
                            lowConfidence={lowConfidence}
                            onAcceptAlternative={(alt) => {
                                setTranscript(alt);
                                setLowConfidence(null);
                            }}
                            onManualInput={handleManualInput}
                            showFallbackInput={showFallbackInput}
                        />

                        {/* Countdown bar (during recording) */}
                        {phase === 'USER_RECORDING' && (
                            <div className="w-full max-w-[680px] mx-auto">
                                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full rounded-full ${countdownColor}`}
                                        style={{ width: `${countdownPercent}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold text-center mt-1">
                                    {countdown}s remaining
                                </p>
                            </div>
                        )}

                        {/* Controls */}
                        <div className="flex items-center gap-4">
                            {/* Main action button */}
                            {phase === 'USER_READY' && (
                                <motion.button
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    onClick={handleStartRecording}
                                    className="w-[72px] h-[72px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-300/40 flex items-center justify-center transition-all active:scale-95"
                                >
                                    <FiMic className="w-6 h-6" />
                                </motion.button>
                            )}

                            {phase === 'USER_RECORDING' && (
                                <motion.button
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    onClick={handleStopRecording}
                                    className="w-[72px] h-[72px] rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-300/40 flex items-center justify-center transition-all active:scale-95"
                                >
                                    <FiSquare className="w-5 h-5" />
                                </motion.button>
                            )}

                            {(phase === 'SUBMITTING' || phase === 'NEXT_QUESTION') && (
                                <div className="w-[72px] h-[72px] rounded-full bg-slate-200 flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}

                            {/* Skip button */}
                            {phase === 'USER_READY' && (
                                <button
                                    onClick={handleSkip}
                                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Skip <FiSkipForward className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Phase label below button */}
                        <p className="text-xs font-medium text-slate-400 text-center">
                            {phase === 'USER_READY' && 'Tap to answer'}
                            {phase === 'USER_RECORDING' && 'Done answering? Click stop.'}
                            {phase === 'SUBMITTING' && 'Saving your answer...'}
                            {phase === 'NEXT_QUESTION' && 'Next question coming up...'}
                        </p>
                    </>
                )}
            </div>
        </main>
    );
};

export default InterviewSession;
