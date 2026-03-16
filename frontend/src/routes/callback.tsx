import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuthStore } from '../lib/auth';
import api from '../lib/api';

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);
    const checkAuth = useAuthStore(state => state.checkAuth);

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            login(token);
            
            // After setting token, fetch user details to route appropriately
            api.get('/auth/me')
                .then(response => {
                    // Update the global auth state with the new user
                    checkAuth();
                    
                    if (response.data.onboarding_completed) {
                        navigate('/dashboard');
                    } else {
                        navigate('/onboarding');
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch user state", err);
                    navigate('/auth');
                });
        } else {
            navigate('/auth');
        }
    }, [searchParams, login, checkAuth, navigate]);

    return (
        <main className="flex items-center justify-center min-h-screen bg-slate-950">
            <h1 className="text-white text-2xl font-bold animate-pulse">Authenticating...</h1>
        </main>
    );
};

export default AuthCallback;
