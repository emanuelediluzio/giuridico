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
      <span className="font-extrabold text-2xl text-white mb-8">Lexa</span>
      <div className="bg-[#18181b] rounded-2xl shadow-xl p-8 w-full max-w-xs">
        {user ? (
          <div className="flex items-center gap-3 mb-4">
            {user.photoURL && <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full" />}
            <div className="text-sm text-white">
              <div>{user.displayName || user.email}</div>
              <div className="text-xs text-gray-400">{user.email}</div>
            </div>
            <button onClick={() => signOut(auth)} className="ml-2 px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition">Logout</button>
          </div>
        ) : showEmailForm ? (
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="px-4 py-3 rounded-lg bg-black border border-gray-700 text-white focus:border-cyan-400 outline-none transition" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="px-4 py-3 rounded-lg bg-black border border-gray-700 text-white focus:border-cyan-400 outline-none transition" required />
            {error && <div className="text-xs text-red-400 text-center">{error}</div>}
            <button type="submit" className="w-full py-3 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition">{isRegister ? "Registrati" : "Login"}</button>
            <button type="button" className="text-xs text-cyan-400 mt-1 hover:underline" onClick={() => setIsRegister(r => !r)}>{isRegister ? "Hai già un account? Login" : "Non hai un account? Registrati"}</button>
            <button type="button" className="text-xs text-gray-400 mt-1 hover:underline" onClick={() => setShowEmailForm(false)}>Annulla</button>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full py-3 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition">Login con Google</button>
            <button onClick={() => setShowEmailForm(true)} className="w-full py-3 rounded-lg border border-cyan-700 bg-black text-cyan-400 font-bold hover:border-cyan-400 hover:bg-gray-900 transition">Login/Registrazione Email</button>
          </div>
        )}
        {!user && <div className="mt-6 text-center text-xs text-gray-400">Accedendo accetti i <a href="#" className="text-cyan-400 hover:underline">Termini</a> e la <a href="#" className="text-cyan-400 hover:underline">Privacy</a>.</div>}
      </div>
    </div>
  );
} 