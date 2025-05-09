"use client";
import React, { useState, ChangeEvent, FormEvent } from 'react';
import ChatBot from './components/ChatBot';

export default function Home() {
  const [contract, setContract] = useState<File | null>(null);
  const [statement, setStatement] = useState<File | null>(null);
  const [template, setTemplate] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!contract || !statement || !template) {
      setError("Tutti i file sono obbligatori.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('contract', contract);
    formData.append('statement', statement);
    formData.append('template', template);
    try {
      const res = await fetch('/api/cqs', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error("Errore durante il calcolo. Riprova.");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Errore durante il calcolo. Riprova.");
    }
    setLoading(false);
  };

  function formatCurrency(val: number) {
    return val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold text-center mb-8">ChatBot Giuridico</h1>
      <ChatBot />
    </main>
  );
}
