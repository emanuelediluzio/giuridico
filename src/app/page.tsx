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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 font-sans relative overflow-hidden">
      {/* Elementi grafici avanzati */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[15%] right-[5%] w-[500px] h-[500px] rounded-full bg-cyan-900/30 blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-cyan-800/20 blur-[180px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>
        {/* Linee minimaliste */}
        <div className="absolute top-0 left-[15%] w-px h-[25vh] bg-gradient-to-b from-transparent via-cyan-800/40 to-transparent"></div>
        <div className="absolute top-[30%] right-[20%] w-[15vw] h-px bg-gradient-to-r from-transparent via-cyan-800/30 to-transparent"></div>
      </div>
      
      {mainScreen === 'home' && (
        <>
          <header className="w-full flex justify-center mt-16 mb-24 relative z-10">
            <div className="relative">
              <span className="font-extrabold text-5xl text-white tracking-tight">Lexa</span>
              <div className="absolute -bottom-3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
            </div>
          </header>
          
          <main className="w-full max-w-xl flex flex-col items-center relative z-10">
            <p className="text-xl text-gray-300 mb-24 text-center max-w-md leading-relaxed">
              <span className="text-white font-semibold">Calcola rimborsi</span>, genera lettere e chatta con Lexa sui tuoi documenti. 
              <span className="text-cyan-400/90">L'assistente legale per avvocati esigenti.</span>
            </p>
            
            <div className="flex flex-col md:flex-row gap-8 w-full justify-center mb-32">
              <button 
                onClick={() => setMainScreen('rimborso')} 
                className="group relative px-12 py-5 rounded-full bg-transparent backdrop-blur-md border border-white/10 hover:border-cyan-400/50 text-white overflow-hidden transition-all duration-500"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 group-hover:opacity-100 opacity-0 transition-opacity duration-500"></span>
                <span className="relative z-10 font-medium text-lg group-hover:text-cyan-300 transition-colors duration-500">Calcolo Rimborso</span>
              </button>
              
              <button 
                onClick={() => setMainScreen('chat')} 
                className="group relative px-12 py-5 rounded-full bg-transparent text-white backdrop-blur-md border border-white/10 hover:border-fuchsia-400/50 overflow-hidden transition-all duration-500"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-fuchsia-500/10 to-pink-500/10 group-hover:opacity-100 opacity-0 transition-opacity duration-500"></span>
                <span className="relative z-10 font-medium text-lg group-hover:text-fuchsia-300 transition-colors duration-500">Chatta con Lexa</span>
              </button>
            </div>
            
            {/* Elemento decorativo */}
            <div className="flex items-center gap-3 opacity-70">
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-gray-500 to-transparent"></div>
              <div className="text-gray-500 text-xs uppercase tracking-widest">AI Powered</div>
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-gray-500 to-transparent"></div>
            </div>
            
            {/* Badges minimalisti */}
            <div className="mt-8 flex flex-wrap justify-center gap-10 items-center opacity-60 max-w-lg">
              <div className="h-16 flex items-center">
                <div className="text-gray-400 text-sm font-thin">Studio Rossi</div>
              </div>
              <div className="h-16 flex items-center">
                <div className="text-gray-400 text-sm font-thin">Avv. Bianchi</div>
              </div>
              <div className="h-16 flex items-center">
                <div className="text-gray-400 text-sm font-thin">Legal Pro</div>
              </div>
            </div>
          </main>
          
          <footer className="mt-auto mb-8 text-xs text-gray-600 text-center relative z-10">
            © {new Date().getFullYear()} <span className="text-gray-500">LegalAI Suite</span> <span className="mx-2">•</span> <a className="text-cyan-800 hover:text-cyan-400 transition-colors" href="#">Privacy</a> <span className="mx-2">•</span> <a className="text-cyan-800 hover:text-cyan-400 transition-colors" href="#">Credits</a>
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
