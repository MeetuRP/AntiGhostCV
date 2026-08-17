/**
 * Interview API — typed Axios wrapper for /api/interview/* endpoints.
 * Uses existing api instance from lib/api.ts for auth token injection.
 */
import api from './api';
import type { InterviewSession, InterviewSessionSummary, InterviewQuestion } from '../types';

export interface StartSessionResponse {
    session_id: string;
    questions: Pick<InterviewQuestion, 'question_id' | 'question_text' | 'category' | 'difficulty'>[];
    audio_prefetch_required: boolean;
}

export interface SynthesizeResponse {
    audio_base64: string;
    duration_ms: number;
}

export interface SubmitAnswerResponse {
    status: string;
    next_question_index: number;
}

export interface AnswerEntry {
    question_id: string;
    answer_transcript: string;
}

const interviewApi = {
    /** Start a new interview session. Returns session_id + questions (no ideal answers). */
    startSession: async (jobRole: string, resumeId: string): Promise<StartSessionResponse> => {
        const res = await api.post('/interview/start', { job_role: jobRole, resume_id: resumeId });
        return res.data;
    },

    /** Synthesize speech for a question via Google Cloud TTS Neural2-D. */
    synthesizeSpeech: async (text: string, sessionId: string): Promise<SynthesizeResponse> => {
        const res = await api.post('/interview/synthesize', { text, session_id: sessionId });
        return res.data;
    },

    /** Save an individual answer transcript for a question. */
    submitAnswer: async (sessionId: string, questionId: string, answerTranscript: string): Promise<SubmitAnswerResponse> => {
        const res = await api.post('/interview/submit-answer', {
            session_id: sessionId,
            question_id: questionId,
            answer_transcript: answerTranscript,
        });
        return res.data;
    },

    /** Complete the session — triggers batch Gemini evaluation. Returns full session with ideal answers. */
    completeSession: async (
        sessionId: string,
        communicationScore: number,
        answers: AnswerEntry[]
    ): Promise<InterviewSession> => {
        const res = await api.post('/interview/complete', {
            session_id: sessionId,
            communication_score: communicationScore,
            answers,
        });
        return res.data;
    },

    /** Get completed session history for current user. */
    getHistory: async (): Promise<InterviewSessionSummary[]> => {
        const res = await api.get('/interview/history');
        return res.data;
    },

    /** Get full session detail (only completed sessions). */
    getSession: async (sessionId: string): Promise<InterviewSession> => {
        const res = await api.get(`/interview/session/${sessionId}`);
        return res.data;
    },
};

export default interviewApi;
