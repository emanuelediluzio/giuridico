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
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e2156] via-[#2a2e7a] to-[#3b1e5a] relative overflow-hidden">
      {/* Effetto curtain/strisce */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`absolute top-0 left-[${i*8.33}%] w-[8.33%] h-full bg-white/5 ${i%2===0?'':'bg-white/10'} backdrop-blur-[2px]`} />
        ))}
      </div>
      <div className="relative z-10 w-full max-w-2xl mx-auto p-12 rounded-3xl shadow-2xl bg-white/10 backdrop-blur-md border border-white/20 animate-fade-in flex flex-col items-center">
        {mainScreen === 'home' && (
          <>
            <div className="mb-6 text-center">
              <div className="mb-2 text-xs text-blue-200/80 tracking-wide font-semibold">AI Legal Suite 2025</div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-white drop-shadow-xl mb-3">
                <span className="bg-gradient-to-r from-cyan-300 to-blue-500 text-transparent bg-clip-text">AI invisibile</span> per <span className="bg-gradient-to-r from-fuchsia-400 to-pink-500 text-transparent bg-clip-text">avvocati</span>
              </h1>
              <p className="text-lg text-blue-100/90 font-medium max-w-xl mx-auto mt-2">Tutto quello che ti serve per calcolare rimborsi, generare lettere e chattare con l'AI sui tuoi documenti. Scegli una funzione per iniziare.</p>
            </div>
            <div className="flex flex-col gap-6 w-full max-w-md mx-auto mt-8">
              <button onClick={() => setMainScreen('rimborso')} className="w-full py-5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-bold text-xl shadow-xl hover:scale-105 transition-all border-2 border-cyan-300/30">Calcolo Rimborso Cessione del Quinto</button>
              <button onClick={() => setMainScreen('chat')} className="w-full py-5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white font-bold text-xl shadow-xl hover:scale-105 transition-all border-2 border-pink-300/30">Chat Avanzata con Memoria File (DeepHermes 3)</button>
            </div>
            <footer className="mt-12 text-center text-xs text-blue-200/70">
              &copy; {new Date().getFullYear()} LegalAI Suite. Design <span className="text-cyan-300">UX 2025</span>.
            </footer>
          </>
        )}
        {mainScreen === 'rimborso' && (
          <>
            <button onClick={() => setMainScreen('home')} className="mb-4 text-cyan-400 hover:underline">&larr; Torna alla Home</button>
            <h1 style={{letterSpacing: '-1px'}} className="text-2xl md:text-3xl font-bold text-center mb-2">Cessione del Quinto <span style={{background: 'linear-gradient(90deg,#6366f1,#0ea5e9)', WebkitBackgroundClip: 'text', color: 'transparent'}}>Refund 2025</span></h1>
            <p className="text-center mb-6 text-base text-gray-300">Carica i documenti per calcolare il rimborso secondo l'<b>Art. 125 sexies T.U.B.</b> e genera la lettera personalizzata.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="contract">1. Contratto di prestito <span style={{color:'#38bdf8'}}>(PDF o DOCX)</span></label>
                <input id="contract" type="file" accept=".pdf,.docx" onChange={handleFileChange(setContract)} required />
              </div>
              <div>
                <label htmlFor="statement">2. Estratto di chiusura/risoluzione <span style={{color:'#38bdf8'}}>(PDF o DOCX)</span></label>
                <input id="statement" type="file" accept=".pdf,.docx" onChange={handleFileChange(setStatement)} required />
              </div>
              <div>
                <label htmlFor="template">3. Modello di lettera <span style={{color:'#38bdf8'}}>(DOC, DOCX o TXT)</span></label>
                <input id="template" type="file" accept=".doc,.docx,.txt" onChange={handleFileChange(setTemplate)} required />
              </div>
              {error && <div className="text-red-400 text-center font-semibold animate-pulse">{error}</div>}
              <button type="submit" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                    Calcolo in corso...
                  </span>
                ) : (
                  'Calcola e genera lettera'
                )}
              </button>
            </form>
            {result && (
              <>
                <div className="mt-10 p-5 rounded-xl bg-[#18181b] border border-[#333] shadow-lg animate-fade-in max-h-[60vh] overflow-auto">
                  <h2 className="text-lg font-bold text-cyan-400 mb-2 flex items-center gap-2">
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path fill="#38bdf8" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    Risultato
                  </h2>
                  <p className="mb-2 text-base"><span className="font-semibold">Importo rimborsabile:</span> <span className="text-green-400 font-bold text-xl">{formatCurrency(result.rimborso)}</span></p>
                  <div className="bg-[#23232a] p-4 rounded-lg border border-[#333] whitespace-pre-wrap text-gray-100 mt-2 shadow-inner">
                    <span className="font-semibold text-cyan-400">Lettera generata:</span>
                    <br />
                    {result.letter}
                  </div>
                  <DownloadPDFButton result={result} formatCurrency={formatCurrency} />
                </div>
              </>
            )}
            <footer className="mt-8 text-center text-xs">
              &copy; {new Date().getFullYear()} CQS Refund Calc. Design <span style={{color:'#38bdf8'}}>AI 2025</span>.
            </footer>
          </>
        )}
        {mainScreen === 'chat' && (
          <>
            <button onClick={() => setMainScreen('home')} className="mb-4 text-fuchsia-400 hover:underline">&larr; Torna alla Home</button>
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-4 bg-gradient-to-r from-fuchsia-400 to-pink-500 text-transparent bg-clip-text">Chat Avanzata con DeepHermes 3</h1>
            <ChatAI />
            <footer className="mt-8 text-center text-xs text-gray-400">
              &copy; {new Date().getFullYear()} LegalAI Suite. Design <span style={{color:'#f472b6'}}>UX 2025</span>.
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
