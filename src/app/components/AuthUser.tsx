"use client";
import React, { useEffect, useState } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";

export default function AuthUser({ onAuth }: { onAuth: (user: User|null) => void }) {
  const [user, setUser] = useState<User|null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      onAuth(u);
    });
    return () => unsub();
  }, [onAuth]);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowEmailForm(false);
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Errore di autenticazione");
    }
  }

  return (
    <div className="px-4">
      {user ? (
        <div className="flex items-center gap-2 bg-[#23232a]/80 border border-white/10 rounded-full px-3 py-1.5">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || "User"} className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-full flex items-center justify-center text-white font-semibold text-xs">
              {user.displayName?.[0] || user.email?.[0] || '?'}
            </div>
          )}
          <span className="text-sm text-gray-200 max-w-[150px] truncate">
            {user.displayName || user.email}
          </span>
          <button 
            onClick={() => signOut(auth)} 
            className="ml-1 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Logout"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      ) : showEmailForm ? (
        <div className="bg-[#23232a]/80 backdrop-blur-md border border-white/10 p-4 rounded-lg">
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
            <h3 className="text-center text-white font-medium mb-2">
              {isRegister ? "Crea un account" : "Accedi"}
            </h3>
            
            <div>
              <input 
                type="email" 
                placeholder="Email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="input-lexa text-sm py-2" 
                required 
              />
            </div>
            
            <div>
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="input-lexa text-sm py-2" 
                required 
              />
            </div>
            
            {error && (
              <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-800/40">
                {error}
              </div>
            )}
            
            <div className="flex gap-2 mt-1">
              <button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white text-sm font-medium py-2 rounded hover:from-cyan-500 hover:to-cyan-600 transition-all"
              >
                {isRegister ? "Registrati" : "Accedi"}
              </button>
              
              <button 
                type="button" 
                onClick={() => setShowEmailForm(false)}
                className="px-3 py-2 bg-[#18181b] text-gray-300 text-sm rounded border border-white/10 hover:bg-[#1c1c20] transition-colors"
              >
                Annulla
              </button>
            </div>
            
            <button 
              type="button" 
              className="text-xs text-cyan-400 mt-1 hover:text-cyan-300 transition-colors" 
              onClick={() => setIsRegister(r => !r)}
            >
              {isRegister ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex gap-2">
          <button 
            onClick={() => signInWithPopup(auth, googleProvider)}
            className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 text-sm font-medium px-3 py-1.5 rounded transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </button>
          
          <button 
            onClick={() => setShowEmailForm(true)}
            className="bg-[#23232a]/80 hover:bg-[#2a2a33] text-white text-sm font-medium border border-white/10 px-3 py-1.5 rounded transition-colors"
          >
            Email
          </button>
        </div>
      )}
    </div>
  );
} 