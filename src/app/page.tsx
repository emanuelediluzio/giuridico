"use client";
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { extractTextFromPDF } from './components/pdfTextExtractClient';
import dynamic from 'next/dynamic';
import ChatAI from './components/ChatAI';

const DownloadPDFButton = dynamic(() => import('./components/DownloadPDFButton'), { ssr: false });

async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    return extractTextFromPDF(file);
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // Estraggo testo DOCX lato client solo se hai una libreria JS, altrimenti invio il file come base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } else if (file.type === 'text/plain') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  } else {
    throw new Error('Formato file non supportato');
  }
}

export default function Home() {
  const [contract, setContract] = useState<File | null>(null);
  const [statement, setStatement] = useState<File | null>(null);
  const [template, setTemplate] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mainScreen, setMainScreen] = useState<'home' | 'rimborso' | 'chat'>('home');

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
    try {
      // Parsing PDF lato client
      const contractText = await extractTextFromFile(contract);
      const statementText = await extractTextFromFile(statement);
      let templateText: string | undefined = undefined;
      let useBackendForTemplate = false;
      if (template.type === 'application/msword') { // .doc
        useBackendForTemplate = true;
      } else {
        templateText = await extractTextFromFile(template);
      }
      // LOG dei testi estratti
      console.log('--- TESTO ESTRATTO ---');
      console.log('CONTRACT:', contractText);
      console.log('STATEMENT:', statementText);
      console.log('TEMPLATE:', templateText);
      let res;
      if (useBackendForTemplate) {
        // Invio il file template come FormData
        const formData = new FormData();
        formData.append('contractText', contractText);
        formData.append('statementText', statementText);
        formData.append('templateFile', template);
        res = await fetch('/api/cqs', {
        method: 'POST',
        body: formData,
      });
      } else {
        res = await fetch('/api/cqs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractText, statementText, templateText }),
        });
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Errore durante il calcolo. Riprova.");
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  };

  function formatCurrency(val: number) {
    return val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#111]">
      {/* Logo/avatar Lexa */}
      <div className="flex flex-col items-center mt-12 mb-6">
        <img src="/lexa-avatar.png" alt="Lexa" className="w-12 h-12 rounded-full border-2 border-cyan-400 shadow bg-white/80" />
      </div>
      {/* Hero section */}
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center px-4">
        <h1 className="text-5xl md:text-6xl font-extrabold text-white text-center mb-4 tracking-tight leading-tight">AI invisibile per avvocati</h1>
        <p className="text-lg text-gray-300 text-center mb-10 max-w-xl">Tutto quello che ti serve per calcolare rimborsi, generare lettere e chattare con Lexa sui tuoi documenti.</p>
        <div className="flex flex-col md:flex-row gap-6 w-full justify-center mb-12">
          <button onClick={() => setMainScreen('rimborso')} className="flex items-center gap-3 px-8 py-4 rounded-xl border border-white/20 bg-[#18181b] text-white font-semibold text-xl shadow hover:border-cyan-400 hover:text-cyan-300 transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24"><path stroke="#38bdf8" strokeWidth="2" d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5-5 5 5M12 6v12"/></svg>
            Calcolo Rimborso
          </button>
          <button onClick={() => setMainScreen('chat')} className="flex items-center gap-3 px-8 py-4 rounded-xl border border-white/20 bg-[#18181b] text-white font-semibold text-xl shadow hover:border-cyan-400 hover:text-cyan-300 transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24"><path stroke="#38bdf8" strokeWidth="2" d="M7 8h10M7 12h6m-6 4h8"/><path stroke="#38bdf8" strokeWidth="2" d="M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-3.5-.6L3 21l1.6-4.8A7.5 7.5 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            Chatta con Lexa
          </button>
        </div>
      </div>
      <footer className="mt-auto mb-4 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} LegalAI Suite. <span className="text-cyan-400">Privacy</span> · <span className="text-cyan-400">Credits</span>
      </footer>
    </div>
  );
}
