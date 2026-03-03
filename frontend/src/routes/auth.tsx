import Navbar from "../components/Navbar";

const Auth = () => {
    const handleLogin = () => {
        window.location.href = 'http://localhost:8000/api/auth/google';
    };

    return (
        <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex flex-col">
            <Navbar />
            <div className="flex-1 flex items-center justify-center">
                <div className="gradient-border shadow-lg">
                    <section className="flex flex-col gap-8 bg-white rounded-2xl p-10">
                        <div className="flex flex-col items-center gap-2 text-center">
                            <h1>Welcome</h1>
                            <h2>Log In to Continue Your Job Journey</h2>
                        </div>
                        <button className="auth-button" onClick={handleLogin}>
                            <p>Sign in with Google</p>
                        </button>
                    </section>
                </div>
            </div>
        </main>
    );
};

export default Auth;
