"use client";
import React, { useEffect, useState } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

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
    <div className="flex flex-col items-center gap-3 mb-4">
      {user ? (
        <div className="flex items-center gap-3">
          {user.photoURL && <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full" />}
          <div className="text-sm text-white">
            <div>{user.displayName || user.email}</div>
            <div className="text-xs text-gray-400">{user.email}</div>
          </div>
          <button onClick={() => signOut(auth)} className="ml-2 px-3 py-1 bg-red-500 text-white rounded text-xs">Logout</button>
        </div>
      ) : showEmailForm ? (
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-2 bg-[#23232a] p-4 rounded-xl border border-[#333] w-72">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="rounded px-3 py-2 bg-[#18181b] text-white border border-[#333]" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="rounded px-3 py-2 bg-[#18181b] text-white border border-[#333]" required />
          {error && <div className="text-xs text-red-400">{error}</div>}
          <button type="submit" className="bg-cyan-500 text-white rounded py-2 font-bold mt-2">{isRegister ? "Registrati" : "Login"}</button>
          <button type="button" className="text-xs text-cyan-400 mt-1" onClick={() => setIsRegister(r => !r)}>{isRegister ? "Hai già un account? Login" : "Non hai un account? Registrati"}</button>
          <button type="button" className="text-xs text-gray-400 mt-1" onClick={() => setShowEmailForm(false)}>Annulla</button>
        </form>
      ) : (
        <div className="flex flex-col gap-2 w-72">
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="px-4 py-2 bg-cyan-500 text-white rounded font-bold">Login con Google</button>
          <button onClick={() => setShowEmailForm(true)} className="px-4 py-2 bg-[#23232a] text-cyan-400 rounded font-bold border border-cyan-700">Login/Registrazione Email</button>
        </div>
      )}
    </div>
  );
} 