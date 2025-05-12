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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 font-sans">
      <span className="font-extrabold text-3xl text-white mb-10">Lexa</span>
      <div className="bg-[#18181b] rounded-2xl p-10 w-full max-w-xs flex flex-col items-center" style={{boxShadow:'none', border:'none'}}>
        {user ? (
          <div className="flex items-center gap-3 mb-6">
            <div className="text-base text-white font-semibold">{user.displayName || user.email}</div>
            <button onClick={() => signOut(auth)} className="ml-2 px-4 py-2 bg-black text-cyan-400 rounded-full text-xs border border-cyan-900 hover:bg-[#23232a] transition">Logout</button>
          </div>
        ) : showEmailForm ? (
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 w-full">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="px-4 py-3 rounded-full bg-black border border-gray-800 text-white focus:border-cyan-400 outline-none transition text-base" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="px-4 py-3 rounded-full bg-black border border-gray-800 text-white focus:border-cyan-400 outline-none transition text-base" required />
            {error && <div className="text-xs text-red-400 text-center animate-pulse">{error}</div>}
            <button type="submit" className="w-full py-3 rounded-full bg-white text-black font-semibold text-base hover:bg-cyan-50 transition shadow-none border-none">{isRegister ? "Registrati" : "Login"}</button>
            <button type="button" className="text-xs text-cyan-400 mt-1 hover:underline" onClick={() => setIsRegister(r => !r)}>{isRegister ? "Hai già un account? Login" : "Non hai un account? Registrati"}</button>
            <button type="button" className="text-xs text-gray-500 mt-1 hover:underline" onClick={() => setShowEmailForm(false)}>Annulla</button>
          </form>
        ) : (
          <div className="flex flex-col gap-4 w-full">
            <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full py-3 rounded-full bg-white text-black font-semibold text-base hover:bg-cyan-50 transition shadow-none border-none">Login con Google</button>
            <button onClick={() => setShowEmailForm(true)} className="w-full py-3 rounded-full bg-black text-cyan-400 font-semibold text-base border border-cyan-900 hover:bg-[#23232a] transition">Login/Registrazione Email</button>
          </div>
        )}
        {!user && <div className="mt-8 text-center text-xs text-gray-500">Accedendo accetti i <a href="#" className="text-cyan-400 hover:underline">Termini</a> e la <a href="#" className="text-cyan-400 hover:underline">Privacy</a>.</div>}
      </div>
    </div>
  );
} 