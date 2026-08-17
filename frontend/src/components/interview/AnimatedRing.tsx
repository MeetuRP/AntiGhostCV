/**
 * AnimatedRing — Centerpiece SVG ring with 4 visual states.
 * Built with Framer Motion for smooth state transitions.
 * Reacts to microphone amplitude during user_speaking state.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { FiMic, FiVolume2, FiLoader } from 'react-icons/fi';

export type RingState = 'idle' | 'ai_speaking' | 'user_speaking' | 'processing';

interface AnimatedRingProps {
    state: RingState;
    size?: number;
    amplitude?: number; // 0-1 from AudioAnalyzer
}

const AnimatedRing: React.FC<AnimatedRingProps> = ({ state, size = 300, amplitude = 0 }) => {
    const center = size / 2;
    const outerR = size * 0.467;  // ~140 at 300px
    const middleR = size * 0.367; // ~110 at 300px
    const innerR = size * 0.24;   // ~72 at 300px
    const iconSize = size * 0.107;

    // Color schemes per state
    const colors = {
        idle: {
            outer: '#c7d2fe',     // indigo-200
            middle: '#e0e7ff',    // indigo-100
            middleStroke: '#a5b4fc', // indigo-300
            inner: '#6366f1',     // indigo-500
        },
        ai_speaking: {
            outer: '#818cf8',     // indigo-400
            middle: '#e0e7ff',    // indigo-100
            middleStroke: '#6366f1', // indigo-500
            inner: '#4f46e5',     // indigo-600
        },
        user_speaking: {
            outer: '#a78bfa',     // violet-400
            middle: '#ede9fe',    // violet-50
            middleStroke: '#a78bfa', // violet-400
            inner: '#7c3aed',    // violet-600
        },
        processing: {
            outer: '#cbd5e1',     // slate-300
            middle: '#f8fafc',    // slate-50
            middleStroke: '#e2e8f0', // slate-200
            inner: '#94a3b8',     // slate-400
        },
    };

    const c = colors[state];

    // Outer ring stroke width reacts to amplitude in user_speaking mode
    const outerStrokeWidth = state === 'user_speaking'
        ? 1.5 + amplitude * 3.5
        : 1.5;

    const outerOpacity = state === 'idle' ? 0.4 : 0.6;

    // Animation variants per state
    const outerAnimation = {
        idle: { scale: [1, 1.03, 1], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
        ai_speaking: { scale: [1, 1.08, 1], transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } },
        user_speaking: { scale: 1 + amplitude * 0.05 },
        processing: { rotate: 360, transition: { duration: 1.5, repeat: Infinity, ease: 'linear' } },
    };

    const middleAnimation = {
        idle: {},
        ai_speaking: { opacity: [0.8, 1, 0.8], transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } },
        user_speaking: {},
        processing: {},
    };

    const stateLabel = {
        idle: 'Listening quietly...',
        ai_speaking: 'Speaking...',
        user_speaking: 'Your turn to answer...',
        processing: 'Reviewing your answer...',
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div style={{ width: size, height: size }} className="relative">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* AI Speaking — ripple ghost rings */}
                    {state === 'ai_speaking' && (
                        <>
                            <motion.circle
                                cx={center} cy={center} r={outerR + 5}
                                fill="none" stroke={c.outer} strokeWidth={0.8}
                                initial={{ opacity: 0.3, scale: 1 }}
                                animate={{ opacity: 0, scale: 1.15 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                                style={{ transformOrigin: `${center}px ${center}px` }}
                            />
                            <motion.circle
                                cx={center} cy={center} r={outerR + 12}
                                fill="none" stroke={c.outer} strokeWidth={0.5}
                                initial={{ opacity: 0.2, scale: 1 }}
                                animate={{ opacity: 0, scale: 1.2 }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                                style={{ transformOrigin: `${center}px ${center}px` }}
                            />
                        </>
                    )}

                    {/* Outer ring */}
                    <motion.circle
                        cx={center} cy={center} r={outerR}
                        fill="none"
                        stroke={c.outer}
                        strokeWidth={outerStrokeWidth}
                        opacity={outerOpacity}
                        animate={outerAnimation[state]}
                        style={{ transformOrigin: `${center}px ${center}px` }}
                    />

                    {/* Middle ring */}
                    <motion.circle
                        cx={center} cy={center} r={middleR}
                        fill={c.middle}
                        stroke={c.middleStroke}
                        strokeWidth={3}
                        animate={middleAnimation[state]}
                    />

                    {/* Inner filled circle */}
                    <motion.circle
                        cx={center} cy={center} r={innerR}
                        fill={c.inner}
                        animate={{ scale: state === 'user_speaking' ? 1 + amplitude * 0.08 : 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        style={{ transformOrigin: `${center}px ${center}px` }}
                    />
                </svg>

                {/* Center icon */}
                <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ pointerEvents: 'none' }}
                >
                    {state === 'idle' && (
                        <FiMic className="text-white" style={{ width: iconSize, height: iconSize }} />
                    )}
                    {state === 'ai_speaking' && (
                        <div className="flex items-end gap-[3px]">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="bg-white rounded-full"
                                    style={{ width: size * 0.017, minWidth: 3 }}
                                    animate={{ height: [size * 0.04, size * 0.08, size * 0.04] }}
                                    transition={{
                                        duration: 0.6,
                                        repeat: Infinity,
                                        delay: i * 0.15,
                                        ease: 'easeInOut',
                                    }}
                                />
                            ))}
                        </div>
                    )}
                    {state === 'user_speaking' && (
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                        >
                            <FiMic className="text-white" style={{ width: iconSize, height: iconSize }} />
                        </motion.div>
                    )}
                    {state === 'processing' && (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        >
                            <FiLoader className="text-white" style={{ width: iconSize, height: iconSize }} />
                        </motion.div>
                    )}
                </div>
            </div>

            {/* State label */}
            <p
                className="text-slate-500 italic font-medium"
                style={{ fontSize: size * 0.047, minFontSize: 12 }}
            >
                {stateLabel[state]}
            </p>
        </div>
    );
};

export default AnimatedRing;
