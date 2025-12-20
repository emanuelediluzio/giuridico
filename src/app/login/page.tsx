"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);
        const provider = new GoogleAuthProvider();

        if (!auth) {
            setError("Firebase init failed");
            setIsLoading(false);
            return;
        }

        try {
            await signInWithPopup(auth, provider);
            // Successful login
            router.push('/dashboard');
        } catch (err: unknown) {
            console.error("Login Error:", err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Authentication Failed");
            }
            setIsLoading(false);
        }
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

                    <div className="space-y-6">

                        <div className="text-center mb-6">
                            <p className="text-xs text-gray-400">Authenticate with verified credentials to access the workspace.</p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-900/20 border border-red-500 text-red-500 text-xs text-center mb-4">
                                ERROR: {error}
                            </div>
                        )}

                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase tracking-widest py-4 text-xs transition-colors relative overflow-hidden group flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-2 h-2 bg-black rounded-full animate-bounce"></span>
                                    CONNECTING...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.053-1.133 8.16-3.293 2.133-2.133 2.907-5.133 2.907-8.16 0-.64-.067-1.453-.16-2.16H12.48z"></path></svg>
                                    <span className="relative z-10">Initial Session via Google Identity</span>
                                </>
                            )}
                        </button>

                    </div>

                    <div className="mt-8 pt-6 border-t border-[#222] flex justify-between items-center text-[10px] text-gray-600 uppercase tracking-wider">
                        <span>Secure Connection</span>
                        <span>v2.1.0</span>
                    </div>

                </div>

                <div className="mt-8 text-center text-[10px] text-gray-700 font-mono">
                    <p className="tracking-widest">UNAUTHORIZED ACCESS IS PROHIBITED</p>
                    <p className="opacity-50 mt-1">IP: ::1 LOCALHOST</p>
                </div>

            </div>
        </div>
    );
}
