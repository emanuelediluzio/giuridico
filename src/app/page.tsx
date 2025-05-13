"use client";
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { extractTextFromPDF } from './components/pdfTextExtractClient';
import dynamic from 'next/dynamic';
import ChatAI from './components/ChatAI';
import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-grotesk/700.css";

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
    <div className="min-h-screen bg-[#0F0F11] flex flex-col items-center justify-center font-sans relative overflow-hidden">
      {/* Elementi grafici moderni 2025 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {/* Mesh gradient background */}
        <div className="absolute top-[10%] right-[10%] w-[70vw] h-[70vh] rounded-full bg-gradient-to-br from-violet-800/30 via-fuchsia-700/20 to-blue-800/10 blur-[120px] opacity-60"></div>
        <div className="absolute bottom-[5%] left-[5%] w-[60vw] h-[60vh] rounded-full bg-gradient-to-tr from-emerald-800/20 via-cyan-700/15 to-transparent blur-[150px] opacity-40"></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 mix-blend-lighten"></div>
        
        {/* Decorative lines */}
        <div className="absolute top-0 left-[20%] w-[1px] h-[40vh] bg-gradient-to-b from-transparent via-fuchsia-500/50 to-transparent"></div>
        <div className="absolute bottom-0 right-[30%] w-[1px] h-[30vh] bg-gradient-to-t from-transparent via-cyan-500/30 to-transparent"></div>
        <div className="absolute top-[30%] right-[5%] h-[1px] w-[20vw] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"></div>
      </div>
      
      {mainScreen === 'home' && (
        <>
          <header className="w-full flex justify-center mt-14 mb-16 relative z-10 px-4">
            <div className="relative">
              {/* Neobrutalism style logo */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-600 to-cyan-600 rounded opacity-70 blur-sm"></div>
                <div className="relative bg-[#0F0F11] px-6 py-3 border-[3px] border-white shadow-[5px_5px_0px_0px_rgba(255,255,255,0.8)] rounded-lg">
                  <span className="font-['Space_Grotesk'] font-bold text-6xl text-white">LEXA</span>
                </div>
              </div>
            </div>
          </header>
          
          <main className="w-full max-w-3xl flex flex-col items-center relative z-10 px-4">
            {/* Modern glassmorphism card for hero text */}
            <div className="relative w-full max-w-2xl mb-20">
              <div className="backdrop-blur-md bg-white/5 border border-white/20 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-fuchsia-600/20 to-cyan-500/20 blur-2xl rounded-full"></div>
                <h1 className="font-['Space_Grotesk'] font-bold text-4xl text-white mb-4 tracking-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
                    L'assistente legale
                  </span> per avvocati esigenti
                </h1>
                <p className="text-xl text-gray-300">
                  Calcola rimborsi, genera lettere e chatta con Lexa sui tuoi documenti.
                </p>
                <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-fuchsia-500 to-cyan-500"></div>
              </div>
            </div>
            
            {/* Neobrutalism service cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-16">
              <button 
                onClick={() => setMainScreen('rimborso')} 
                className="group relative p-1 bg-white rounded-xl transition-all duration-300 hover:-translate-y-1 hover:rotate-1"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-blue-600 opacity-80 rounded-xl blur"></div>
                <div className="bg-[#131517] border-2 border-white rounded-lg p-6 relative h-full flex flex-col">
                  <div className="mb-4">
                    <div className="p-3 bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 inline-block rounded-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="font-['Space_Grotesk'] text-3xl font-bold text-white mb-3">Calcolo Rimborso</h2>
                  <p className="text-gray-400 flex-grow">Determina rapidamente l'importo che deve essere restituito in base all'Art. 125 sexies T.U.B.</p>
                  <div className="mt-4 flex items-center text-fuchsia-400">
                    <span className="font-medium">Avvia calcolo</span>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => setMainScreen('chat')} 
                className="group relative p-1 bg-white rounded-xl transition-all duration-300 hover:-translate-y-1 hover:rotate-1"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-emerald-600 opacity-80 rounded-xl blur"></div>
                <div className="bg-[#131517] border-2 border-white rounded-lg p-6 relative h-full flex flex-col">
                  <div className="mb-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-500 to-cyan-700 inline-block rounded-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="font-['Space_Grotesk'] text-3xl font-bold text-white mb-3">Chatta con Lexa</h2>
                  <p className="text-gray-400 flex-grow">Interagisci con l'intelligenza artificiale specializzata in tematiche legali.</p>
                  <div className="mt-4 flex items-center text-cyan-400">
                    <span className="font-medium">Inizia la chat</span>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Elemento decorativo */}
            <div className="mb-12 relative">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full flex items-center gap-2">
                <div className="h-2 w-2 bg-fuchsia-500 rounded-full animate-pulse"></div>
                <div className="text-white text-xs uppercase tracking-widest font-medium">AI Powered</div>
                <div className="h-2 w-2 bg-cyan-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            
            {/* Partner logos - Modern Style */}
            <div className="w-full max-w-2xl">
              <p className="text-gray-500 text-xs uppercase text-center mb-4 tracking-wider">UTILIZZATO DA</p>
              <div className="flex flex-wrap justify-center gap-6 items-center">
                <div className="p-4 bg-white/5 backdrop-blur-sm border border-white/5 rounded-lg shadow-sm">
                  <div className="text-center">
                    <div className="text-white font-medium text-sm">Studio Rossi</div>
                    <div className="text-gray-500 text-xs mt-1">Partner dal 2023</div>
                  </div>
                </div>
                <div className="p-4 bg-white/5 backdrop-blur-sm border border-white/5 rounded-lg shadow-sm">
                  <div className="text-center">
                    <div className="text-white font-medium text-sm">Avv. Bianchi</div>
                    <div className="text-gray-500 text-xs mt-1">Partner dal 2024</div>
                  </div>
                </div>
                <div className="p-4 bg-white/5 backdrop-blur-sm border border-white/5 rounded-lg shadow-sm">
                  <div className="text-center">
                    <div className="text-white font-medium text-sm">Legal Pro</div>
                    <div className="text-gray-500 text-xs mt-1">Partner dal 2025</div>
                  </div>
                </div>
              </div>
            </div>
          </main>
          
          <footer className="mt-auto py-8 w-full border-t border-white/10 bg-black/30 backdrop-blur-md text-center relative z-10">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-500">
                  © {new Date().getFullYear()} <span className="bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-transparent bg-clip-text">LegalAI Suite</span>
                </div>
                
                <div className="flex items-center gap-6">
                  <a className="text-gray-400 hover:text-fuchsia-400 transition-colors text-sm" href="#">Privacy</a>
                  <a className="text-gray-400 hover:text-fuchsia-400 transition-colors text-sm" href="#">Termini</a>
                  <a className="text-gray-400 hover:text-fuchsia-400 transition-colors text-sm" href="#">Supporto</a>
                  <a className="text-gray-400 hover:text-fuchsia-400 transition-colors text-sm" href="#">Credits</a>
                </div>
              </div>
            </div>
          </footer>
        </>
      )}
      
      {mainScreen === 'rimborso' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl transition-all duration-500 animate-fade-in">
          <div className="relative bg-gradient-to-b from-[#13131a] to-[#0d0d12] p-10 rounded-3xl w-full max-w-xl border-2 border-white/10 shadow-2xl backdrop-blur" style={{boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 40px 0 rgba(146, 82, 234, 0.2)'}}>
            <button onClick={() => setMainScreen('home')} className="absolute top-7 right-7 text-gray-500 hover:text-white transition-colors duration-300 z-10" aria-label="Chiudi">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-fuchsia-600 to-blue-600 rounded-t-3xl"></div>
            
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-fuchsia-500/20 rounded-lg">
                <svg className="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-['Space_Grotesk'] font-bold text-white tracking-tight">Rimborso CQS</h2>
                <p className="text-gray-400 text-sm">Calcolo rimborso Art. 125 sexies T.U.B.</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-1">
                <label htmlFor="contract" className="block text-sm font-medium text-white/80">Contratto di prestito</label>
                <div className="mt-1 relative group">
                  <input
                    id="contract"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange(setContract)}
                    required
                    className="relative block w-full px-4 py-4 bg-white/5 border-2 border-white/20 text-white rounded-xl outline-none transition-all duration-300 focus:ring-1 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-fuchsia-600 file:text-white hover:file:bg-fuchsia-700 backdrop-blur-sm"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">PDF o DOCX (max 5MB)</p>
              </div>
              
              <div className="space-y-1">
                <label htmlFor="statement" className="block text-sm font-medium text-white/80">Estratto di chiusura/risoluzione</label>
                <div className="mt-1 relative group">
                  <input
                    id="statement"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange(setStatement)}
                    required
                    className="relative block w-full px-4 py-4 bg-white/5 border-2 border-white/20 text-white rounded-xl outline-none transition-all duration-300 focus:ring-1 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-fuchsia-600 file:text-white hover:file:bg-fuchsia-700 backdrop-blur-sm"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">PDF o DOCX (max 5MB)</p>
              </div>
              
              <div className="space-y-1">
                <label htmlFor="template" className="block text-sm font-medium text-white/80">Modello di lettera</label>
                <div className="mt-1 relative group">
                  <input
                    id="template"
                    type="file"
                    accept=".doc,.docx,.txt"
                    onChange={handleFileChange(setTemplate)}
                    required
                    className="relative block w-full px-4 py-4 bg-white/5 border-2 border-white/20 text-white rounded-xl outline-none transition-all duration-300 focus:ring-1 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-fuchsia-600 file:text-white hover:file:bg-fuchsia-700 backdrop-blur-sm"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">DOC, DOCX o TXT (max 5MB)</p>
              </div>
              
              {error && (
                <div className="px-5 py-4 rounded-xl bg-red-900/20 border-2 border-red-900/40 text-center animate-pulse">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              
              <div className="relative mt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full py-4 px-8 bg-gradient-to-r from-fuchsia-600 to-blue-600 text-white rounded-xl font-medium text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-fuchsia-600/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:ring-opacity-50"
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
                <div className="bg-gradient-to-r from-fuchsia-900/30 to-blue-900/20 backdrop-blur-lg px-6 py-5 border-b-2 border-fuchsia-800/30 flex items-center gap-3">
                  <svg className="w-5 h-5 text-fuchsia-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-lg font-bold text-white">Risultato</h3>
                </div>
                
                <div className="p-6 bg-white/5 backdrop-blur-md border-2 border-white/10 rounded-b-2xl">
                  <div className="p-5 bg-white/5 rounded-xl border border-white/10 mb-8">
                    <p className="text-fuchsia-400 text-xs uppercase tracking-wider mb-1 font-medium">Importo rimborsabile:</p>
                    <p className="text-emerald-400 font-bold text-4xl font-['Space_Grotesk']">{formatCurrency(result.rimborso)}</p>
                  </div>
                  
                  <div className="bg-white/5 rounded-xl p-6 whitespace-pre-wrap text-gray-300 text-sm border border-white/10 backdrop-blur-sm">
                    <p className="text-fuchsia-400 font-medium mb-3 text-xs uppercase tracking-wider">Lettera generata:</p>
                    <div className="font-light opacity-90 leading-relaxed">
                      {result.letter}
                    </div>
                  </div>
                  
                  <div className="mt-8 flex justify-end">
                    <button className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-fuchsia-600/20 to-blue-600/20 px-6 py-3 transition-all duration-300 hover:bg-fuchsia-600/20 border border-fuchsia-600/30 text-fuchsia-300 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500 focus:ring-opacity-50">
                      <span className="relative z-10 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Scarica PDF
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {mainScreen === 'chat' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl transition-all duration-500 animate-fade-in">
          <div className="relative bg-gradient-to-b from-[#13131a] to-[#0d0d12] p-8 rounded-3xl w-full max-w-5xl h-[85vh] border-2 border-white/10 shadow-2xl backdrop-blur" style={{boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 40px 0 rgba(80, 200, 220, 0.2)'}}>
            <button onClick={() => setMainScreen('home')} className="absolute top-7 right-7 text-gray-500 hover:text-white transition-colors duration-300" aria-label="Chiudi">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-600 to-emerald-600 rounded-t-3xl"></div>
            
            <div className="flex items-center justify-center mb-8 mt-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-['Space_Grotesk'] font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 text-transparent bg-clip-text">Chat con Lexa AI</h2>
              </div>
            </div>
            
            <ChatAI />
          </div>
        </div>
      )}
    </div>
  );
}
