import { useState } from 'react';
// @ts-ignore
import { AuthService } from '../services/authService.js';

export default function Auth({ onLogin }: any) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setError('');

        if (!isLogin) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!passwordRegex.test(password)) {
                setError("Password must be at least 8 characters, include an uppercase letter, a lowercase letter, and a number.");
                return; // Stop the function from hitting the server
            }
        }
        try {
            let userObj;
            if (isLogin) {
                userObj = await AuthService.login(username, password);
            } else {
                userObj = await AuthService.signup(username, password, email);
            }
            onLogin(userObj);
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        // Premium gradient background matching your reference image
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#4a3b69] to-[#8b4172] font-sans p-4">

            {/* Spacious white card */}
            <div className="bg-white p-10 sm:p-14 rounded-[2rem] shadow-2xl w-full max-w-lg">

                {/* Title */}
                <h2 className="text-4xl font-extrabold text-[#2d334a] mb-10 text-center tracking-tight">
                    {isLogin ? 'Login' : 'Sign Up'}
                </h2>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm border border-red-100 text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col">
                    {/* Username Field */}
                    <div className="mb-6">
                        <label className="block text-lg font-bold text-[#3a415a] mb-3">
                            Username
                        </label>
                        <input
                            type="text"
                            placeholder="Enter your username"
                            required
                            className="w-full p-4 border border-gray-100 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#b47eea] focus:bg-white transition-all text-gray-700"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>

                    {/* Email Field (Signup only) */}
                    {!isLogin && (
                        <div className="mb-6">
                            <label className="block text-lg font-bold text-[#3a415a] mb-3">
                                Email
                            </label>
                            <input
                                type="email"
                                placeholder="Enter your Gmail address"
                                required={!isLogin}
                                className="w-full p-4 border border-gray-100 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#b47eea] focus:bg-white transition-all text-gray-700"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Password Field */}
                    <div className="mb-8">
                        <label className="block text-lg font-bold text-[#3a415a] mb-3">
                            Password
                        </label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            required
                            className="w-full p-4 border border-gray-100 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#b47eea] focus:bg-white transition-all text-gray-700"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    {/* Pill-shaped Gradient Button */}
                    <div className="flex justify-start mb-8">
                        <button
                            type="submit"
                            className="bg-gradient-to-r from-[#d946ef] to-[#a855f7] text-white px-10 py-3 rounded-full font-bold text-lg shadow-md hover:shadow-lg hover:opacity-90 transition-all transform hover:-translate-y-0.5"
                        >
                            {isLogin ? 'Login' : 'Sign Up'}
                        </button>
                    </div>
                </form>

                {/* Footer Toggle Link */}
                <div className="text-center mt-2">
                    <span
                        className="text-[#a855f7] font-bold cursor-pointer hover:text-[#d946ef] transition-colors text-lg"
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
                    </span>
                </div>

            </div>
        </div>
    );
}
