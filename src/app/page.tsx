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
    <div className="min-h-screen bg-gradient-to-b from-black to-[#050715] flex flex-col items-center justify-center px-4 font-sans relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] right-[5%] w-[600px] h-[600px] rounded-full bg-blue-900/20 blur-[180px] animate-pulse-slow"></div>
        <div className="absolute bottom-[5%] left-[5%] w-[500px] h-[500px] rounded-full bg-indigo-800/20 blur-[200px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-cyan-800/10 blur-[150px] animate-pulse-slow" style={{animationDelay: '3.5s'}}></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-[0.15]"></div>
        
        {/* Decorative lines */}
        <div className="absolute top-0 left-[15%] w-px h-[35vh] bg-gradient-to-b from-transparent via-blue-500/30 to-transparent"></div>
        <div className="absolute top-[20%] right-[25%] w-[20vw] h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
        <div className="absolute bottom-[15%] left-[40%] w-[15vw] h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
      </div>
      
      {mainScreen === 'home' && (
        <>
          <header className="w-full flex justify-center mt-16 mb-16 relative z-10">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-indigo-500/20 to-cyan-500/30 blur-lg opacity-70 rounded-full"></div>
              <span className="font-extrabold text-6xl text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-100 tracking-tight relative z-10">Lexa</span>
              <div className="absolute -bottom-4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent"></div>
            </div>
          </header>
          
          <main className="w-full max-w-2xl flex flex-col items-center relative z-10">
            <div className="relative mb-20">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 blur rounded-2xl"></div>
              <p className="text-xl text-gray-300 text-center max-w-lg leading-relaxed p-6 backdrop-blur-sm bg-black/20 rounded-2xl border border-white/10 relative z-10">
                <span className="text-white font-semibold">Calcola rimborsi</span>, genera lettere e chatta con Lexa sui tuoi documenti. 
                <span className="text-blue-400/90 ml-1">L'assistente legale per avvocati esigenti.</span>
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-8 w-full justify-center mb-24">
              <button 
                onClick={() => setMainScreen('rimborso')} 
                className="group relative px-12 py-6 rounded-xl bg-gradient-to-br from-blue-900/40 to-blue-800/20 backdrop-blur-md border border-blue-500/20 hover:border-blue-400/50 text-white overflow-hidden transition-all duration-500 shadow-lg shadow-blue-900/20"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 group-hover:opacity-100 opacity-0 transition-opacity duration-500"></span>
                <span className="absolute -inset-px bg-gradient-to-r from-blue-500/80 to-cyan-500/80 blur-md opacity-0 group-hover:opacity-30 transition-opacity duration-700"></span>
                <span className="relative z-10 font-medium text-lg group-hover:text-blue-200 transition-colors duration-500 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Calcolo Rimborso
                </span>
              </button>
              
              <button 
                onClick={() => setMainScreen('chat')} 
                className="group relative px-12 py-6 rounded-xl bg-gradient-to-br from-indigo-900/40 to-purple-800/20 backdrop-blur-md border border-indigo-500/20 hover:border-indigo-400/50 text-white overflow-hidden transition-all duration-500 shadow-lg shadow-indigo-900/20"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 group-hover:opacity-100 opacity-0 transition-opacity duration-500"></span>
                <span className="absolute -inset-px bg-gradient-to-r from-indigo-500/80 to-purple-500/80 blur-md opacity-0 group-hover:opacity-30 transition-opacity duration-700"></span>
                <span className="relative z-10 font-medium text-lg group-hover:text-indigo-200 transition-colors duration-500 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Chatta con Lexa
                </span>
              </button>
            </div>
            
            {/* Elemento decorativo */}
            <div className="flex items-center gap-4 opacity-80 mb-10">
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
              <div className="text-blue-400 text-xs uppercase tracking-widest font-medium px-4 py-2 rounded-full bg-blue-900/20 border border-blue-800/30 backdrop-blur-sm">AI Powered</div>
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
            </div>
            
            {/* Badges professionali */}
            <div className="mt-6 flex flex-wrap justify-center gap-12 items-center max-w-2xl">
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 to-indigo-500/30 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative px-6 py-4 bg-black/30 border border-white/10 rounded-lg backdrop-blur-sm flex items-center gap-3 transition-all duration-300 group-hover:border-blue-500/30">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-gray-300 text-sm font-medium">Studio Rossi</div>
                </div>
              </div>
              
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative px-6 py-4 bg-black/30 border border-white/10 rounded-lg backdrop-blur-sm flex items-center gap-3 transition-all duration-300 group-hover:border-indigo-500/30">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-gray-300 text-sm font-medium">Avv. Bianchi</div>
                </div>
              </div>
              
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative px-6 py-4 bg-black/30 border border-white/10 rounded-lg backdrop-blur-sm flex items-center gap-3 transition-all duration-300 group-hover:border-cyan-500/30">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                    </svg>
                  </div>
                  <div className="text-gray-300 text-sm font-medium">Legal Pro</div>
                </div>
              </div>
            </div>
          </main>
          
          <footer className="mt-auto py-6 w-full border-t border-white/5 bg-black/30 backdrop-blur-sm text-center relative z-10">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-500">
                  © {new Date().getFullYear()} <span className="text-blue-500">LegalAI Suite</span>
                </div>
                
                <div className="flex items-center gap-6">
                  <a className="text-gray-400 hover:text-blue-400 transition-colors text-sm" href="#">Privacy</a>
                  <a className="text-gray-400 hover:text-blue-400 transition-colors text-sm" href="#">Termini</a>
                  <a className="text-gray-400 hover:text-blue-400 transition-colors text-sm" href="#">Supporto</a>
                  <a className="text-gray-400 hover:text-blue-400 transition-colors text-sm" href="#">Credits</a>
                </div>
              </div>
            </div>
          </footer>
        </>
      )}
      
      {mainScreen === 'rimborso' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl transition-all duration-500 animate-fade-in">
          <div className="relative bg-gradient-to-b from-[#121214] to-[#18181c] p-10 rounded-3xl w-full max-w-xl border border-white/5 shadow-2xl backdrop-blur" style={{boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 40px 0 rgba(6, 182, 212, 0.05)'}}>
            <button onClick={() => setMainScreen('home')} className="absolute top-7 right-7 text-gray-500 hover:text-white transition-colors duration-300 z-10" aria-label="Chiudi">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-r from-cyan-800/10 via-cyan-500/5 to-transparent rounded-t-3xl"></div>
            
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight mt-4">Rimborso CQS</h2>
            <p className="text-gray-400 mb-12 text-sm">Calcolo rimborso Art. 125 sexies T.U.B.</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-1">
                <label htmlFor="contract" className="block text-sm font-medium text-white/70">Contratto di prestito</label>
                <div className="mt-1 relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 to-cyan-700/20 opacity-0 group-hover:opacity-100 rounded-xl blur transition duration-300"></div>
                  <input
                    id="contract"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange(setContract)}
                    required
                    className="relative block w-full px-4 py-4 bg-black/40 border border-gray-800/60 text-white rounded-xl outline-none transition-all duration-300 focus:ring-1 focus:ring-cyan-400/50 focus:border-cyan-400/50 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-cyan-900/20 file:text-cyan-300 hover:file:bg-cyan-900/40 backdrop-blur-sm"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">PDF o DOCX (max 5MB)</p>
              </div>
              
              <div className="space-y-1">
                <label htmlFor="statement" className="block text-sm font-medium text-white/70">Estratto di chiusura/risoluzione</label>
                <div className="mt-1 relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 to-cyan-700/20 opacity-0 group-hover:opacity-100 rounded-xl blur transition duration-300"></div>
                  <input
                    id="statement"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange(setStatement)}
                    required
                    className="relative block w-full px-4 py-4 bg-black/40 border border-gray-800/60 text-white rounded-xl outline-none transition-all duration-300 focus:ring-1 focus:ring-cyan-400/50 focus:border-cyan-400/50 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-cyan-900/20 file:text-cyan-300 hover:file:bg-cyan-900/40 backdrop-blur-sm"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">PDF o DOCX (max 5MB)</p>
              </div>
              
              <div className="space-y-1">
                <label htmlFor="template" className="block text-sm font-medium text-white/70">Modello di lettera</label>
                <div className="mt-1 relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 to-cyan-700/20 opacity-0 group-hover:opacity-100 rounded-xl blur transition duration-300"></div>
                  <input
                    id="template"
                    type="file"
                    accept=".doc,.docx,.txt"
                    onChange={handleFileChange(setTemplate)}
                    required
                    className="relative block w-full px-4 py-4 bg-black/40 border border-gray-800/60 text-white rounded-xl outline-none transition-all duration-300 focus:ring-1 focus:ring-cyan-400/50 focus:border-cyan-400/50 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-cyan-900/20 file:text-cyan-300 hover:file:bg-cyan-900/40 backdrop-blur-sm"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">DOC, DOCX o TXT (max 5MB)</p>
              </div>
              
              {error && (
                <div className="px-5 py-4 rounded-xl bg-red-900/10 border border-red-900/20 text-center backdrop-blur-sm animate-pulse">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}
              
              <div className="relative group inline-block w-full mt-4">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl blur opacity-30 group-hover:opacity-80 transition duration-500"></div>
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full py-4 px-8 bg-black text-white rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white opacity-70" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Calcolo in corso...
                    </span>
                  ) : (
                    'Calcola e genera lettera'
                  )}
                </button>
              </div>
            </form>
            
            {result && (
              <div className="mt-12 rounded-2xl overflow-hidden backdrop-blur-sm animate-fade-in">
                <div className="bg-gradient-to-r from-cyan-900/20 via-cyan-600/10 to-transparent backdrop-blur-lg px-6 py-5 border-b border-cyan-800/20">
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Risultato
                  </h3>
                </div>
                
                <div className="p-6 bg-black/40 border border-gray-800/40 rounded-b-2xl">
                  <div className="mb-8">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Importo rimborsabile:</p>
                    <p className="text-green-400 font-bold text-4xl">{formatCurrency(result.rimborso)}</p>
                  </div>
                  
                  <div className="bg-black/60 rounded-xl p-6 whitespace-pre-wrap text-gray-300 text-sm border border-gray-800/50 backdrop-blur-sm">
                    <p className="text-cyan-300 font-medium mb-3 text-xs uppercase tracking-wider">Lettera generata:</p>
                    <div className="font-light opacity-90 leading-relaxed">
                      {result.letter}
                    </div>
                  </div>
                  
                  <div className="mt-8 flex justify-end">
                    <button onClick={() => {}} className="group relative overflow-hidden rounded-xl bg-cyan-500/5 px-6 py-2 transition-all duration-300 hover:bg-cyan-500/10 border border-cyan-700/20 text-cyan-300 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-opacity-50">
                      <span className="relative z-10 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Scarica PDF
                      </span>
                      <span className="absolute inset-0 translate-y-[100%] bg-gradient-to-r from-cyan-600/10 to-cyan-400/5 transition-transform duration-300 group-hover:translate-y-[0%]"></span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {mainScreen === 'chat' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl transition-all duration-500 animate-fade-in">
          <div className="relative bg-gradient-to-b from-[#121214] to-[#18181c] p-8 rounded-3xl w-full max-w-5xl h-[85vh] border border-white/5 shadow-2xl backdrop-blur" style={{boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 40px 0 rgba(236, 72, 153, 0.05)'}}>
            <button onClick={() => setMainScreen('home')} className="absolute top-7 right-7 text-gray-500 hover:text-white transition-colors duration-300" aria-label="Chiudi">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-r from-fuchsia-800/10 via-pink-500/5 to-transparent rounded-t-3xl"></div>
            
            <div className="flex items-center justify-center mb-8 mt-2">
              <div className="relative">
                <div className="px-5 py-2 bg-gradient-to-r from-fuchsia-500/5 to-pink-500/5 rounded-full border border-fuchsia-500/10 backdrop-blur-sm">
                  <span className="bg-gradient-to-r from-fuchsia-300 via-pink-300 to-rose-300 text-transparent bg-clip-text font-medium">Chat con Lexa AI</span>
                </div>
                <div className="absolute -bottom-2 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent"></div>
              </div>
            </div>
            
            <ChatAI />
          </div>
        </div>
      )}
    </div>
  );
}
