/**
 * AudioAnalyzer — Client-side confidence analysis via Web Audio API.
 * Zero backend cost. Computes communication score from:
 *  - Words per minute (speaking pace)
 *  - Pause frequency (silence gaps from amplitude)
 *  - Filler word count in transcript
 *  - Average answer word count
 */

import type { ConfidenceMetrics } from '../types';

const FILLER_REGEX = /\b(um|uh|like|you know|basically|literally|right|so)\b/gi;
const SILENCE_THRESHOLD = 0.01;
const SILENCE_MIN_DURATION_MS = 500;

export class AudioAnalyzer {
    private audioContext: AudioContext | null = null;
    private analyserNode: AnalyserNode | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private animationFrameId: number | null = null;
    private dataArray: Float32Array | null = null;

    // Metrics tracking
    private startTime = 0;
    private totalActiveMs = 0;
    private silenceGaps = 0;
    private currentSilenceStartMs = 0;
    private isInSilence = false;
    private peakAmplitudes: number[] = [];
    private lastCheckTime = 0;

    // Current amplitude (exposed for ring animation)
    private currentAmplitude = 0;

    /**
     * Start analyzing audio from the given MediaStream.
     */
    start(stream: MediaStream): void {
        this.audioContext = new AudioContext();
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 2048;
        this.analyserNode.smoothingTimeConstant = 0.3;

        this.sourceNode = this.audioContext.createMediaStreamSource(stream);
        this.sourceNode.connect(this.analyserNode);

        this.dataArray = new Float32Array(this.analyserNode.fftSize);
        this.startTime = performance.now();
        this.lastCheckTime = this.startTime;
        this.totalActiveMs = 0;
        this.silenceGaps = 0;
        this.currentSilenceStartMs = 0;
        this.isInSilence = false;
        this.peakAmplitudes = [];

        this._analyze();
    }

    private _analyze = (): void => {
        if (!this.analyserNode || !this.dataArray) return;

        this.analyserNode.getFloatTimeDomainData(this.dataArray);

        // Compute RMS amplitude
        let sumOfSquares = 0;
        let peak = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            const val = Math.abs(this.dataArray[i]);
            sumOfSquares += val * val;
            if (val > peak) peak = val;
        }
        const rms = Math.sqrt(sumOfSquares / this.dataArray.length);
        this.currentAmplitude = Math.min(1, rms * 5); // Normalize 0-1 with some amplification

        const now = performance.now();
        const deltaMs = now - this.lastCheckTime;
        this.lastCheckTime = now;

        if (rms >= SILENCE_THRESHOLD) {
            // Active speech
            this.totalActiveMs += deltaMs;
            this.peakAmplitudes.push(peak);

            if (this.isInSilence) {
                // Was in silence, check if it was a gap
                const silenceDuration = now - this.currentSilenceStartMs;
                if (silenceDuration >= SILENCE_MIN_DURATION_MS) {
                    this.silenceGaps++;
                }
                this.isInSilence = false;
            }
        } else {
            // Silence
            if (!this.isInSilence) {
                this.isInSilence = true;
                this.currentSilenceStartMs = now;
            }
        }

        this.animationFrameId = requestAnimationFrame(this._analyze);
    };

    /**
     * Get the current RMS amplitude (0-1) for ring animation.
     */
    getAmplitude(): number {
        return this.currentAmplitude;
    }

    /**
     * Compute confidence metrics from accumulated audio analysis data + transcript.
     */
    getConfidenceMetrics(transcript: string): ConfidenceMetrics {
        const words = transcript.trim().split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        const totalSpeakingSeconds = this.totalActiveMs / 1000;
        const wordsPerMinute = totalSpeakingSeconds > 0
            ? (wordCount / totalSpeakingSeconds) * 60
            : 0;

        const fillerMatches = transcript.match(FILLER_REGEX);
        const fillerWordCount = fillerMatches ? fillerMatches.length : 0;
        const fillerRatio = wordCount > 0 ? fillerWordCount / wordCount : 0;

        const peakAmplitude = this.peakAmplitudes.length > 0
            ? this.peakAmplitudes.reduce((a, b) => a + b, 0) / this.peakAmplitudes.length
            : 0;

        // Check for trailing silence gap
        if (this.isInSilence) {
            const now = performance.now();
            const silenceDuration = now - this.currentSilenceStartMs;
            if (silenceDuration >= SILENCE_MIN_DURATION_MS) {
                this.silenceGaps++;
            }
        }

        return {
            wordsPerMinute: Math.round(wordsPerMinute),
            pauseCount: this.silenceGaps,
            fillerWordCount,
            fillerRatio: Math.round(fillerRatio * 1000) / 1000,
            totalSpeakingSeconds: Math.round(totalSpeakingSeconds * 10) / 10,
            peakAmplitude: Math.round(peakAmplitude * 1000) / 1000,
            wordCount,
        };
    }

    /**
     * Compute communication score (0-10) using the confidence metrics.
     */
    static computeCommunicationScore(metrics: ConfidenceMetrics): number {
        let score = 5;

        // WPM scoring
        if (metrics.wordsPerMinute >= 120 && metrics.wordsPerMinute <= 160) {
            score += 2; // Ideal speaking pace
        } else if (metrics.wordsPerMinute >= 100 && metrics.wordsPerMinute <= 180) {
            score += 1; // Acceptable pace
        } else if (metrics.wordsPerMinute < 80 || metrics.wordsPerMinute > 200) {
            score -= 1; // Too slow or too fast
        }

        // Filler word scoring
        if (metrics.fillerRatio < 0.03) {
            score += 1.5; // Almost no fillers
        } else if (metrics.fillerRatio > 0.08) {
            score -= 1; // Too many fillers
        }

        // Word count scoring (detail depth)
        if (metrics.wordCount > 80) {
            score += 1.5; // Detailed answer
        } else if (metrics.wordCount < 30) {
            score -= 1; // Too brief
        }

        // Fluency scoring (silence gaps)
        if (metrics.pauseCount < 3) {
            score += 1; // Fluent delivery
        }

        // Clamp to 0-10
        return Math.round(Math.max(0, Math.min(10, score)) * 10) / 10;
    }

    /**
     * Stop the analyzer and clean up all audio resources.
     */
    stop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.sourceNode) {
            try {
                this.sourceNode.disconnect();
            } catch {
                // Already disconnected
            }
            this.sourceNode = null;
        }

        if (this.analyserNode) {
            try {
                this.analyserNode.disconnect();
            } catch {
                // Already disconnected
            }
            this.analyserNode = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }

        this.dataArray = null;
        this.currentAmplitude = 0;
    }
}
