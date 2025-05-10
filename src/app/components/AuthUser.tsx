"use client";
import React, { useEffect, useState } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";

export default function AuthUser({ onAuth }: { onAuth: (user: User|null) => void }) {
  const [user, setUser] = useState<User|null>(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      onAuth(u);
    });
    return () => unsub();
  }, [onAuth]);

  return (
    <div className="flex items-center gap-3 mb-4">
      {user ? (
        <>
          {user.photoURL && <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full" />}
          <div className="text-sm text-white">
            <div>{user.displayName || user.email}</div>
            <div className="text-xs text-gray-400">{user.email}</div>
          </div>
          <button onClick={() => signOut(auth)} className="ml-2 px-3 py-1 bg-red-500 text-white rounded text-xs">Logout</button>
        </>
      ) : (
        <button onClick={() => signInWithPopup(auth, googleProvider)} className="px-4 py-2 bg-cyan-500 text-white rounded font-bold">Login con Google</button>
      )}
    </div>
  );
} 