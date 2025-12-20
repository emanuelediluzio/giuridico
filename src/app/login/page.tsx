"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate auth delay
        setTimeout(() => {
            router.push('/');
        }, 1500);
    };

    return (
        <div className="min-h-screen w-full bg-[#111] flex items-center justify-center p-4 relative overflow-hidden font-mono selection:bg-emerald-500 selection:text-white">

            {/* Background Decor */}
            <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] border border-emerald-900/30 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] border border-emerald-900/30 rounded-full blur-[100px]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
            </div>

            <div className="w-full max-w-md z-10 animate-fade-in">

                {/* Header Branding */}
                <div className="mb-8 text-center">
                    <div className="inline-block border border-emerald-500/30 px-3 py-1 bg-emerald-500/5 mb-4 backdrop-blur-sm">
                        <span className="text-[10px] text-emerald-400 uppercase tracking-[0.2em] animate-pulse">System Online</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tighter mb-2">LEXA</h1>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">Legal Extraction & Analysis</p>
                </div>

                {/* Login Card */}
                <div className="bg-[#0c0c0c] border border-[#333] p-8 shadow-2xl relative">

                    {/* Technical Corners */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-emerald-500"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-emerald-500"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-emerald-500"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-emerald-500"></div>

                    <form onSubmit={handleLogin} className="space-y-6">

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-gray-400 block">Identity / Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#111] border border-[#333] text-white p-3 text-sm focus:outline-none focus:border-emerald-500 focus:bg-[#151515] transition-all placeholder:text-gray-700"
                                placeholder="USR-7734"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-gray-400 block">Passcode</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#111] border border-[#333] text-white p-3 text-sm focus:outline-none focus:border-emerald-500 focus:bg-[#151515] transition-all placeholder:text-gray-700"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase tracking-widest py-3 text-xs transition-colors relative overflow-hidden group"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 bg-black rounded-full animate-bounce"></span>
                                    AUTHENTICATING...
                                </span>
                            ) : (
                                <span className="relative z-10 group-hover:tracking-[0.2em] transition-all duration-300">Initialize Session</span>
                            )}
                        </button>

                    </form>

                    <div className="mt-8 pt-6 border-t border-[#222] flex justify-between items-center text-[10px] text-gray-600 uppercase tracking-wider">
                        <span>Secure Connection</span>
                        <span>v2.0.4</span>
                    </div>

                </div>

                <div className="mt-8 text-center text-[10px] text-gray-700 font-mono">
                    <p className="tracking-widest">UNAUTHORIZED ACCESS IS PROHIBITED</p>
                    <p className="opacity-50 mt-1">IP: 127.0.0.1 :: LOCALHOST</p>
                </div>

            </div>
        </div>
    );
}
