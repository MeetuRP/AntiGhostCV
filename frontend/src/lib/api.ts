import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auto-logout on expired/invalid JWT
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            if (!window.location.pathname.startsWith('/auth')) {
                window.location.href = '/auth';
            }
        }
        if (error.response?.status === 429) {
            alert("🚀 AI Quota Reached: The AI provider (Google Gemini) is currently busy or you have reached your free-tier rate limit. Please wait about 30-60 seconds and try again.");
        }
        return Promise.reject(error);
    }
);

export default api;
