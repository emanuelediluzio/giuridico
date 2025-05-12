"use client";
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { extractTextFromPDF } from './components/pdfTextExtractClient';
import dynamic from 'next/dynamic';
import ChatAI from './components/ChatAI';
import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";

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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 font-sans relative">
      {/* Elemento grafico minimal */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30 z-0">
        <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-cyan-900 blur-[120px]"></div>
        <div className="absolute bottom-[15%] left-[5%] w-[250px] h-[250px] rounded-full bg-cyan-800 blur-[150px]"></div>
      </div>
      
      <header className="w-full flex justify-center mt-16 mb-16 relative z-10">
        <span className="font-extrabold text-4xl text-white tracking-tight">Lexa</span>
      </header>
      
      {mainScreen === 'home' && (
        <main className="w-full max-w-xl flex flex-col items-center relative z-10">
          <p className="text-lg text-gray-300 mb-16 text-center max-w-md leading-relaxed">
            <span className="text-white font-semibold">Calcola rimborsi</span>, genera lettere e chatta con Lexa sui tuoi documenti. Tutto in un'unica piattaforma, senza fronzoli.
          </p>
          
          <div className="flex flex-col md:flex-row gap-6 w-full justify-center">
            <button 
              onClick={() => setMainScreen('rimborso')} 
              className="px-10 py-4 rounded-full bg-white text-black font-semibold text-lg hover:bg-cyan-50 transition-all duration-300 shadow-none border-none transform hover:scale-105"
            >
              Calcolo Rimborso
            </button>
            <button 
              onClick={() => setMainScreen('chat')} 
              className="px-10 py-4 rounded-full bg-black text-white font-semibold text-lg border border-white/10 hover:bg-[#18181b] hover:border-cyan-400 transition-all duration-300 shadow-none transform hover:scale-105"
            >
              Chatta con Lexa
            </button>
          </div>
          
          {/* Badge trust minimal */}
          <div className="mt-24 flex flex-col items-center">
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Utilizzato da</div>
            <div className="flex gap-6 items-center">
              <div className="text-gray-400 text-sm">Studio Rossi</div>
              <div className="h-[12px] w-[1px] bg-gray-800"></div>
              <div className="text-gray-400 text-sm">Avv. Bianchi</div>
              <div className="h-[12px] w-[1px] bg-gray-800"></div>
              <div className="text-gray-400 text-sm">Legal Pro</div>
            </div>
          </div>
        </main>
      )}
      
      {mainScreen === 'rimborso' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm transition-all duration-300 animate-fade-in">
          <div className="bg-[#18181b] p-10 rounded-3xl w-full max-w-xl relative border border-gray-800/30">
            <button onClick={() => setMainScreen('home')} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors" aria-label="Chiudi">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Rimborso CQS</h2>
            <p className="text-gray-300 mb-8">Carica i documenti per calcolare il rimborso Art. 125 sexies T.U.B.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label htmlFor="contract" className="block text-sm font-medium text-gray-200">Contratto di prestito</label>
                <div className="relative mt-1 flex items-center">
                  <input
                    id="contract"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange(setContract)}
                    required
                    className="block w-full px-4 py-3 rounded-xl bg-black border border-gray-800 text-white focus:border-cyan-400 outline-none transition text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-cyan-900/30 file:text-cyan-300 hover:file:bg-cyan-900/40"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">PDF o DOCX (max 5MB)</p>
              </div>
              
              <div className="space-y-1">
                <label htmlFor="statement" className="block text-sm font-medium text-gray-200">Estratto di chiusura/risoluzione</label>
                <div className="relative mt-1 flex items-center">
                  <input
                    id="statement"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange(setStatement)}
                    required
                    className="block w-full px-4 py-3 rounded-xl bg-black border border-gray-800 text-white focus:border-cyan-400 outline-none transition text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-cyan-900/30 file:text-cyan-300 hover:file:bg-cyan-900/40"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">PDF o DOCX (max 5MB)</p>
              </div>
              
              <div className="space-y-1">
                <label htmlFor="template" className="block text-sm font-medium text-gray-200">Modello di lettera</label>
                <div className="relative mt-1 flex items-center">
                  <input
                    id="template"
                    type="file"
                    accept=".doc,.docx,.txt"
                    onChange={handleFileChange(setTemplate)}
                    required
                    className="block w-full px-4 py-3 rounded-xl bg-black border border-gray-800 text-white focus:border-cyan-400 outline-none transition text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-cyan-900/30 file:text-cyan-300 hover:file:bg-cyan-900/40"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">DOC, DOCX o TXT (max 5MB)</p>
              </div>
              
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-900/20 border border-red-800/30 text-center">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-xl bg-cyan-600 text-white font-semibold text-base hover:bg-cyan-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Calcolo in corso...
                  </span>
                ) : (
                  'Calcola e genera lettera'
                )}
              </button>
            </form>
            
            {result && (
              <div className="mt-10 rounded-2xl bg-[#23232a] border border-gray-700/30 overflow-hidden animate-fade-in">
                <div className="bg-gradient-to-r from-cyan-900/40 to-[#23232a] px-6 py-5 border-b border-gray-700/30">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <path fill="#38bdf8" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    Risultato
                  </h3>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <p className="text-gray-400 text-sm mb-1">Importo rimborsabile:</p>
                    <p className="text-green-400 font-bold text-3xl">{formatCurrency(result.rimborso)}</p>
                  </div>
                  
                  <div className="bg-black/30 rounded-xl p-6 whitespace-pre-wrap text-gray-300 text-sm border border-gray-800/50">
                    <p className="text-cyan-300 font-medium mb-2">Lettera generata:</p>
                    {result.letter}
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <DownloadPDFButton result={result} formatCurrency={formatCurrency} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {mainScreen === 'chat' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm transition-all duration-300 animate-fade-in">
          <div className="bg-[#18181b] p-8 rounded-3xl max-w-4xl w-full h-[85vh] relative border border-gray-800/30">
            <button onClick={() => setMainScreen('home')} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors" aria-label="Chiudi">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center justify-center mb-8">
              <div className="px-4 py-2 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-pink-500/10 rounded-full border border-fuchsia-500/20">
                <span className="bg-gradient-to-r from-fuchsia-400 to-pink-500 text-transparent bg-clip-text font-semibold">Chat con Lexa AI</span>
              </div>
            </div>
            <ChatAI />
          </div>
        </div>
      )}
      <footer className="mt-auto mb-8 text-xs text-gray-600 text-center relative z-10">
        © {new Date().getFullYear()} LegalAI Suite. <a className="text-cyan-400 hover:underline" href="#">Privacy</a> · <a className="text-cyan-400 hover:underline" href="#">Credits</a>
      </footer>
    </div>
  );
}
