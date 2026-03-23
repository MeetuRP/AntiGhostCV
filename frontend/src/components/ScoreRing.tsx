import React, { useEffect, useState } from 'react';

interface ScoreRingProps {
    score: number;
    size?: number;
    strokeWidth?: number;
}

const ScoreRing: React.FC<ScoreRingProps> = ({ score, size = 160, strokeWidth = 12 }) => {
    const [displayScore, setDisplayScore] = useState(score);
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    useEffect(() => {
        let startValue = displayScore;
        const endValue = score;
        if (startValue === endValue) return;

        const duration = 1000; // 1 second
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out function
            const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
            const currentDisplay = Math.round(startValue + (endValue - startValue) * easeOut(progress));
            
            setDisplayScore(currentDisplay);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [score]);

    const getScoreColor = (s: number) => {
        if (s >= 75) return '#059669'; // Emerald-600
        if (s >= 50) return '#2563eb'; // Blue-600
        if (s >= 25) return '#d97706'; // Amber-600
        return '#dc2626'; // Red-600
    };

    const getGlowColor = (s: number) => {
        if (s >= 75) return 'rgba(16, 185, 129, 0.3)';
        if (s >= 50) return 'rgba(59, 130, 246, 0.3)';
        if (s >= 25) return 'rgba(245, 158, 11, 0.3)';
        return 'rgba(239, 68, 68, 0.3)';
    };

    const color = getScoreColor(score);
    const glow = getGlowColor(score);

    return (
        <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* Shadow Ring */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#f1f5f9"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Glow Effect */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={glow}
                    strokeWidth={strokeWidth + 4}
                    fill="transparent"
                    strokeDasharray={circumference}
                    style={{
                        strokeDashoffset: offset,
                        transition: 'stroke-dashoffset 1.5s ease-in-out',
                        filter: 'blur(8px)',
                    }}
                />
                {/* Progress Ring */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                    style={{
                        strokeDashoffset: offset,
                        transition: 'stroke-dashoffset 1.5s ease-in-out',
                    }}
                />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="animate-in zoom-in-50 duration-300" style={{ fontSize: size * 0.22, fontWeight: 900, color: '#1e293b' }}>{displayScore}%</span>
                <span style={{ fontSize: size * 0.07, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Score</span>
            </div>
        </div>
    );
};

export default ScoreRing;
