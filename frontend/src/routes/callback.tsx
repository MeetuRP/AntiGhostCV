import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuthStore } from '../lib/auth';

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            login(token);
            navigate('/');
        } else {
            navigate('/auth');
        }
    }, [searchParams, login, navigate]);

    return (
        <main className="flex items-center justify-center">
            <h1>Authenticating...</h1>
        </main>
    );
};

export default AuthCallback;
