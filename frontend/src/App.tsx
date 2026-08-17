import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useEffect } from 'react';
import { useAuthStore } from './lib/auth';
import Home from './routes/home';
import LandingPage from './routes/LandingPage';
import Features from './routes/public/Features';
import Pricing from './routes/public/Pricing';
import Templates from './routes/public/Templates';
import ResumeExamples from './routes/public/ResumeExamples';
import Blog from './routes/public/Blog';
import About from './routes/public/About';
import Auth from './routes/auth';
import Onboarding from './routes/Onboarding';
import AuthCallback from './routes/callback';
import Upload from './routes/upload';
import Evaluate from './routes/evaluate';
import Results from './routes/results';
import Profile from './routes/profile';
import History from './routes/history';
import AdminDashboard from './routes/admin/dashboard';
import ExportPage from './routes/ExportPage';
import InterviewHome from './routes/interview/InterviewHome';
import InterviewSession from './routes/interview/InterviewSession';
import InterviewReport from './routes/interview/InterviewReport';
import ForgotPassword from './routes/ForgotPassword';
import ResetPassword from './routes/ResetPassword';
import api from './lib/api';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/auth" />;
  
  // If authenticated but onboarding not completed, redirect to onboarding
  // Special case: don't redirect if already on onboarding page
  if (user && !user.onboarding_completed && window.location.pathname !== '/onboarding' && !user.is_admin) {
    return <Navigate to="/onboarding" />;
  }

  return <>{children}</>;
};

function App() {
  const checkAuth = useAuthStore(state => state.checkAuth);

  useEffect(() => {
    checkAuth();
    // Log site visit
    api.post('/events/visit').catch(() => { });
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/resume-examples" element={<ResumeExamples />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/about" element={<About />} />
        <Route path="/resume/export/:evaluationId" element={<ExportPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/evaluate" element={<ProtectedRoute><Evaluate /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
        <Route path="/me" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/interview" element={<ProtectedRoute><InterviewHome /></ProtectedRoute>} />
        <Route path="/interview/session/:sessionId" element={<ProtectedRoute><InterviewSession /></ProtectedRoute>} />
        <Route path="/interview/report/:sessionId" element={<ProtectedRoute><InterviewReport /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
