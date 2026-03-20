import { Link } from "react-router";
import { useAuthStore } from "../lib/auth";

const Navbar = () => {
    const { isAuthenticated, logout } = useAuthStore();

    return (
        <nav className="navbar">
            <Link to={isAuthenticated ? "/dashboard" : "/"}>
                <p className="text-2xl font-bold text-gradient uppercase tracking-widest">AntiGhost CV</p>
            </Link>
            <div className="flex items-center gap-4">
                {isAuthenticated ? (
                    <>
                        <Link to="/upload" className="primary-button w-fit text-sm">
                            New Upload
                        </Link>
                        <Link to="/history" className="text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors">
                            History
                        </Link>
                        <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
                            <Link to="/me" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden shadow-sm">
                                    {useAuthStore.getState().user?.profile_image ? (
                                        <img src={useAuthStore.getState().user?.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        useAuthStore.getState().user?.name?.[0] || 'U'
                                    )}
                                </div>
                                <span className="text-sm font-medium text-gray-700 hidden md:block">Me</span>
                            </Link>
                            {useAuthStore.getState().user?.is_admin && (
                                <Link to="/admin" className="text-gray-500 hover:text-indigo-600 transition-colors" title="Admin Panel">
                                    🛡️
                                </Link>
                            )}
                            <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" title="Logout">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-6">
                        <Link to="/auth" className="text-sm font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">
                            Sign In
                        </Link>
                        <Link to="/auth?mode=signup" className="primary-button w-fit px-8 py-3">
                            Try Free
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
