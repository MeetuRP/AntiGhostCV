/**
 * SpeechManager — WebSocket STT connection lifecycle manager.
 * Handles MediaRecorder capture, WebSocket streaming to backend,
 * and real-time partial/final transcript events.
 *
 * Audio chunks are ephemeral — streamed to STT, never stored.
 */

export type TranscriptCallback = (text: string) => void;
export type FinalTranscriptCallback = (text: string, confidence: number) => void;
export type ErrorCallback = (message: string) => void;

export class SpeechManager {
    private ws: WebSocket | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private stream: MediaStream | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectDelay = 500;
    private isRecording = false;
    private sessionId: string = '';
    private token: string = '';
    private questionText: string = '';
    private technicalTerms: string[] = [];

    // Callbacks
    public onPartialTranscript: TranscriptCallback = () => {};
    public onFinalTranscript: FinalTranscriptCallback = () => {};
    public onError: ErrorCallback = () => {};

    private finalTranscriptResolve: ((value: { text: string; confidence: number }) => void) | null = null;

    /**
     * Open WebSocket connection to the STT backend.
     */
    async connect(
        sessionId: string,
        jwtToken: string,
        questionText: string,
        technicalTerms: string[]
    ): Promise<void> {
        this.sessionId = sessionId;
        this.token = jwtToken;
        this.questionText = questionText;
        this.technicalTerms = technicalTerms;
        this.reconnectAttempts = 0;

        return this._openWebSocket();
    }

    private _openWebSocket(): Promise<void> {
        return new Promise((resolve, reject) => {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}//localhost:8000`;
            const url = `${wsHost}/ws/interview/transcribe/${this.sessionId}?token=${this.token}`;

            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                // Send context message with technical terms for speech recognition boosting
                this.ws?.send(JSON.stringify({
                    type: 'context',
                    phrases: this.technicalTerms,
                    question_text: this.questionText,
                }));
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'partial') {
                        this.onPartialTranscript(data.transcript);
                    } else if (data.type === 'final') {
                        this.onFinalTranscript(data.transcript, data.confidence || 0);
                        // Resolve the stop recording promise if waiting
                        if (this.finalTranscriptResolve) {
                            this.finalTranscriptResolve({
                                text: data.transcript,
                                confidence: data.confidence || 0,
                            });
                            this.finalTranscriptResolve = null;
                        }
                    } else if (data.type === 'error') {
                        this.onError(data.message);
                    }
                } catch {
                    // Non-JSON message — ignore
                }
            };

            this.ws.onerror = () => {
                this.onError('WebSocket connection error');
            };

            this.ws.onclose = (event) => {
                if (this.isRecording && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => {
                        this._openWebSocket().catch(() => {});
                    }, this.reconnectDelay * this.reconnectAttempts);
                }
            };
        });
    }

    /**
     * Start recording audio from user's microphone and stream to WebSocket.
     */
    async startRecording(): Promise<MediaStream> {
        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 16000,
            },
            video: false,
        });

        this.isRecording = true;

        // Use a supported MIME type
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';

        this.mediaRecorder = new MediaRecorder(this.stream, {
            mimeType,
            audioBitsPerSecond: 16000,
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
                // Audio chunks are ephemeral — streamed to STT, never stored
                this.ws.send(event.data);
            }
        };

        // Send chunks every 250ms for real-time streaming
        this.mediaRecorder.start(250);

        return this.stream;
    }

    /**
     * Stop recording and wait for final transcript from WebSocket.
     * Returns a Promise that resolves with the final transcript.
     */
    async stopRecording(): Promise<{ text: string; confidence: number }> {
        this.isRecording = false;

        return new Promise((resolve) => {
            // Set up a resolver for when we get the final transcript
            this.finalTranscriptResolve = resolve;

            // Stop the MediaRecorder
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }

            // Signal backend to finalize
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'stop' }));
            }

            // Timeout fallback — resolve after 5s if no final transcript received
            setTimeout(() => {
                if (this.finalTranscriptResolve) {
                    this.finalTranscriptResolve({ text: '', confidence: 0 });
                    this.finalTranscriptResolve = null;
                }
            }, 5000);
        });
    }

    /**
     * Cleanly disconnect WebSocket and stop all audio tracks.
     */
    disconnect(): void {
        this.isRecording = false;

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            try {
                this.mediaRecorder.stop();
            } catch {
                // Already stopped
            }
        }

        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
        }

        if (this.ws) {
            try {
                this.ws.close(1000, 'Client disconnect');
            } catch {
                // Already closed
            }
            this.ws = null;
        }

        this.mediaRecorder = null;
        this.finalTranscriptResolve = null;
    }

    /**
     * Check if currently recording.
     */
    get recording(): boolean {
        return this.isRecording;
    }
}
