/**
 * TTSPlayer — Manages TTS audio playback via Web Audio API.
 * Pre-fetches all question audio at session start for zero-latency playback.
 * Decodes base64 LINEAR16 audio into AudioBuffers.
 */

import interviewApi from './interviewApi';

interface CachedAudio {
    buffer: AudioBuffer;
    durationMs: number;
}

export class TTSPlayer {
    private audioContext: AudioContext | null = null;
    private cache: Map<string, CachedAudio> = new Map();
    private currentSource: AudioBufferSourceNode | null = null;
    private onEndResolve: (() => void) | null = null;

    private getContext(): AudioContext {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new AudioContext();
        }
        return this.audioContext;
    }

    /**
     * Pre-fetch and decode TTS audio for all questions in parallel.
     * Reports progress via onProgress callback (index 1-based).
     * Non-critical: if any individual fetch fails, that question simply won't have audio.
     */
    async prefetchAll(
        questions: { question_id: string; question_text: string }[],
        sessionId: string,
        onProgress?: (completed: number, total: number) => void
    ): Promise<void> {
        const ctx = this.getContext();
        let completed = 0;
        const total = questions.length;

        const promises = questions.map(async (q) => {
            try {
                const response = await interviewApi.synthesizeSpeech(q.question_text, sessionId);
                const binaryString = atob(response.audio_base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
                this.cache.set(q.question_id, {
                    buffer: audioBuffer,
                    durationMs: response.duration_ms,
                });
            } catch (err) {
                console.warn(`[TTS] Failed to prefetch audio for ${q.question_id}:`, err);
                // Non-blocking — question proceeds without audio
            } finally {
                completed++;
                onProgress?.(completed, total);
            }
        });

        await Promise.all(promises);
    }

    /**
     * Play the cached audio for a given question.
     * Returns a Promise that resolves when playback ends.
     */
    async play(questionId: string): Promise<void> {
        const cached = this.cache.get(questionId);
        if (!cached) {
            console.warn(`[TTS] No cached audio for ${questionId}`);
            return;
        }

        const ctx = this.getContext();
        // Resume context if suspended (browser autoplay policy)
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        // Stop any current playback
        this.stopCurrent();

        return new Promise((resolve) => {
            this.onEndResolve = resolve;
            this.currentSource = ctx.createBufferSource();
            this.currentSource.buffer = cached.buffer;
            this.currentSource.connect(ctx.destination);

            this.currentSource.onended = () => {
                this.currentSource = null;
                if (this.onEndResolve) {
                    this.onEndResolve();
                    this.onEndResolve = null;
                }
            };

            this.currentSource.start(0);
        });
    }

    /**
     * Stop current playback if any.
     */
    stop(): void {
        this.stopCurrent();
    }

    private stopCurrent(): void {
        if (this.currentSource) {
            try {
                this.currentSource.stop();
                this.currentSource.disconnect();
            } catch {
                // Already stopped
            }
            this.currentSource = null;
        }
        if (this.onEndResolve) {
            this.onEndResolve();
            this.onEndResolve = null;
        }
    }

    /**
     * Check if audio is cached for a given question.
     */
    hasAudio(questionId: string): boolean {
        return this.cache.has(questionId);
    }

    /**
     * Get the estimated duration in ms for a cached question.
     */
    getDurationMs(questionId: string): number {
        return this.cache.get(questionId)?.durationMs ?? 0;
    }

    /**
     * Clean up all resources.
     */
    destroy(): void {
        this.stopCurrent();
        this.cache.clear();
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(() => {});
        }
        this.audioContext = null;
    }
}
