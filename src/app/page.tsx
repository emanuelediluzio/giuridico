"use client";
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { extractTextFromPDF } from './components/pdfTextExtractClient';
import dynamic from 'next/dynamic';
import ChatAI from './components/ChatAI';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
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
    <div className="min-h-screen flex flex-col">
      <Navbar currentScreen={mainScreen} onScreenChange={setMainScreen} />
      
      <main className="flex-grow pt-24 pb-8">
        {mainScreen === 'home' && (
          <div className="container-lexa">
            {/* Hero section */}
            <section className="py-16 md:py-20">
              <div className="max-w-3xl mx-auto text-center mb-12">
                <h1 className="text-3xl md:text-4xl lg:text-5xl mb-6 font-bold text-white">
                  L'assistente legale per avvocati
                </h1>
                <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
                  Lexa semplifica il tuo lavoro quotidiano fornendo strumenti avanzati per calcolare rimborsi
                  e rispondere alle tue domande con precisione legale.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button 
                    onClick={() => setMainScreen('rimborso')}
                    className="btn-primary"
                  >
                    Calcola Rimborso
                  </button>
                  <button 
                    onClick={() => setMainScreen('chat')}
                    className="btn-outline"
                  >
                    Chatta con Lexa
                  </button>
                </div>
              </div>
              
              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="feature-card">
                  <div className="feature-icon">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">Calcolo Rimborso</h3>
                  <p className="text-gray-400 mb-4">Determina l'importo da restituire in base all'Art. 125 sexies T.U.B.</p>
                  <button 
                    onClick={() => setMainScreen('rimborso')} 
                    className="btn-secondary btn-small"
                  >
                    Avvia calcolo
                  </button>
                </div>
                
                <div className="feature-card">
                  <div className="feature-icon">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">Assistente AI</h3>
                  <p className="text-gray-400 mb-4">Interagisci con l'intelligenza artificiale legale per domande specifiche.</p>
                  <button 
                    onClick={() => setMainScreen('chat')} 
                    className="btn-secondary btn-small"
                  >
                    Inizia chat
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
        
        {mainScreen === 'rimborso' && (
          <div className="container-lexa max-w-4xl animate-fade-in">
            <div className="card-lexa">
              <h2 className="mb-6 text-center">Calcolo Rimborso Cessione del Quinto</h2>
              {!result ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="contract" className="block text-gray-300 mb-2">Contratto di finanziamento</label>
                    <input 
                      type="file" 
                      id="contract" 
                      accept=".pdf,.docx,.txt" 
                      onChange={handleFileChange(setContract)} 
                      className="input-lexa"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="statement" className="block text-gray-300 mb-2">Conteggio estintivo</label>
                    <input 
                      type="file" 
                      id="statement" 
                      accept=".pdf,.docx,.txt" 
                      onChange={handleFileChange(setStatement)} 
                      className="input-lexa"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="template" className="block text-gray-300 mb-2">Template per la lettera</label>
                    <input 
                      type="file" 
                      id="template" 
                      accept=".pdf,.docx,.txt,.doc" 
                      onChange={handleFileChange(setTemplate)} 
                      className="input-lexa"
                    />
                  </div>
                  
                  {error && (
                    <div className="bg-red-900/30 border border-red-500 text-white px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}
                  
                  <div className="flex justify-center pt-4">
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Elaborazione in corso...
                        </div>
                      ) : (
                        'Calcola Rimborso'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-[#3b82f6] mb-4">Dati estratti</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-gray-400">Data stipula:</p>
                          <p className="text-lg font-medium">{result.contractData.stipulationDate}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Importo finanziato:</p>
                          <p className="text-lg font-medium">{formatCurrency(result.contractData.financedAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Durata (mesi):</p>
                          <p className="text-lg font-medium">{result.contractData.durationMonths}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Data estinzione:</p>
                          <p className="text-lg font-medium">{result.statementData.terminationDate}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Rate pagate:</p>
                          <p className="text-lg font-medium">{result.statementData.installmentsPaid}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-[#60a5fa] mb-4">Risultato Calcolo</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-gray-400">Commissioni bancarie:</p>
                          <p className="text-lg font-medium">{formatCurrency(result.refund.bankFees || 0)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Commissioni intermediazione:</p>
                          <p className="text-lg font-medium">{formatCurrency(result.refund.intermediationFees || 0)}</p>
                        </div>
                        <div className="border-t border-[#374151] pt-3 mt-4">
                          <p className="text-white font-bold">Totale da rimborsare:</p>
                          <p className="text-2xl font-bold text-[#3b82f6]">
                            {formatCurrency(result.refund.totalRefund || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center space-x-4 mt-6">
                    <button 
                      className="btn-secondary"
                      onClick={() => setResult(null)}
                    >
                      Nuovo Calcolo
                    </button>
                    {result.letterContent && (
                      <DownloadPDFButton 
                        content={result.letterContent}
                        fileName={`Lettera_rimborso_${new Date().toISOString().split('T')[0]}.pdf`}
                      />
                    )}
                    {result.letter && !result.letterContent && (
                      <DownloadPDFButton 
                        content={result.letter}
                        fileName={`Lettera_rimborso_${new Date().toISOString().split('T')[0]}.pdf`}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {mainScreen === 'chat' && (
          <div className="container-lexa animate-fade-in mt-4">
            <ChatAI />
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
