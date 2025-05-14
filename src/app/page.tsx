"use client";
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { extractTextFromPDF } from './components/pdfTextExtractClient';
import dynamic from 'next/dynamic';
import ChatAI from './components/ChatAI';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";
// Fontsource Montserrat rimosso per problemi di build - utilizziamo Google Fonts tramite globals.css

import CalculatorIcon from '@/assets/icons/calculator.svg';
import ChatBubbleIcon from '@/assets/icons/chat-bubble.svg';

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
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar currentScreen={mainScreen} onScreenChange={setMainScreen} />
      
      <main className="flex-grow pt-24 pb-8">
        {mainScreen === 'home' && (
          <div className="container-lexa">
            {/* Hero section */}
            <section className="py-16 md:py-20">
              <div className="max-w-3xl mx-auto text-center mb-16">
                <h1 className="text-3xl md:text-4xl lg:text-5xl mb-6 font-bold text-slate-800">
                  L'assistente legale <span className="text-blue-600">per avvocati</span>
                </h1>
                <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div className="feature-card">
                  <div className="feature-icon">
                    <CalculatorIcon className="w-6 h-6" fill="none" stroke="currentColor" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-800">Calcolo Rimborso</h3>
                  <p className="text-slate-600 mb-4">Determina l'importo da restituire in base all'Art. 125 sexies T.U.B. in modo rapido e preciso.</p>
                  <button 
                    onClick={() => setMainScreen('rimborso')} 
                    className="btn-primary btn-small"
                  >
                    Avvia calcolo
                  </button>
                </div>
                
                <div className="feature-card">
                  <div className="feature-icon">
                    <ChatBubbleIcon className="w-6 h-6" fill="none" stroke="currentColor" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-800">Assistente AI</h3>
                  <p className="text-slate-600 mb-4">Interagisci con l'intelligenza artificiale legale per domande specifiche e assistenza immediata.</p>
                  <button 
                    onClick={() => setMainScreen('chat')} 
                    className="btn-primary btn-small"
                  >
                    Inizia chat
                  </button>
                </div>
              </div>
              
              {/* Informazioni aggiuntive */}
              <div className="mt-20 text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Come funziona Lexa</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  <div className="p-6 bg-blue-50 rounded-xl">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="font-bold text-lg">1</span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-slate-800">Carica i documenti</h3>
                    <p className="text-slate-600">Carica contratto, conteggio estintivo e template per la lettera di rimborso.</p>
                  </div>
                  <div className="p-6 bg-blue-50 rounded-xl">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="font-bold text-lg">2</span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-slate-800">Analisi automatica</h3>
                    <p className="text-slate-600">Lexa estrae informazioni rilevanti e calcola il rimborso dovuto.</p>
                  </div>
                  <div className="p-6 bg-blue-50 rounded-xl">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="font-bold text-lg">3</span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-slate-800">Risultato immediato</h3>
                    <p className="text-slate-600">Ottieni importo del rimborso e lettera già pronta in formato PDF.</p>
                  </div>
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
                    <label htmlFor="contract" className="block text-slate-700 font-medium mb-2">Contratto di finanziamento</label>
                    <input 
                      type="file" 
                      id="contract" 
                      accept=".pdf,.docx,.txt" 
                      onChange={handleFileChange(setContract)} 
                      className="input-lexa"
                    />
                    <p className="mt-1 text-sm text-slate-500">Carica il contratto di cessione del quinto</p>
                  </div>
                  
                  <div>
                    <label htmlFor="statement" className="block text-slate-700 font-medium mb-2">Conteggio estintivo</label>
                    <input 
                      type="file" 
                      id="statement" 
                      accept=".pdf,.docx,.txt" 
                      onChange={handleFileChange(setStatement)} 
                      className="input-lexa"
                    />
                    <p className="mt-1 text-sm text-slate-500">Carica il conteggio estintivo rilasciato dalla finanziaria</p>
                  </div>
                  
                  <div>
                    <label htmlFor="template" className="block text-slate-700 font-medium mb-2">Template per la lettera</label>
                    <input 
                      type="file" 
                      id="template" 
                      accept=".pdf,.docx,.txt,.doc" 
                      onChange={handleFileChange(setTemplate)} 
                      className="input-lexa"
                    />
                    <p className="mt-1 text-sm text-slate-500">Carica il template per la lettera di richiesta rimborso</p>
                  </div>
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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
                      <h3 className="text-xl font-bold text-blue-600 mb-4">Dati estratti</h3>
                      <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                        <div>
                          <p className="text-slate-500 text-sm">Data stipula:</p>
                          <p className="text-lg font-medium text-slate-800">{result?.contractData?.stipulationDate}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-sm">Importo finanziato:</p>
                          <p className="text-lg font-medium text-slate-800">{formatCurrency(result?.contractData?.financedAmount || 0)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-sm">Durata (mesi):</p>
                          <p className="text-lg font-medium text-slate-800">{result?.contractData?.durationMonths || 'N/D'}</p>
        </div>
          <div>
                          <p className="text-slate-500 text-sm">Data estinzione:</p>
                          <p className="text-lg font-medium text-slate-800">{result?.statementData?.terminationDate}</p>
          </div>
          <div>
                          <p className="text-slate-500 text-sm">Rate pagate:</p>
                          <p className="text-lg font-medium text-slate-800">{result?.statementData?.installmentsPaid || 0}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-blue-600 mb-4">Risultato Calcolo</h3>
                      <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                        <div>
                          <p className="text-slate-600 text-sm">Commissioni bancarie:</p>
                          <p className="text-lg font-medium text-slate-800">{formatCurrency(result?.refund?.bankFees || 0)}</p>
          </div>
          <div>
                          <p className="text-slate-600 text-sm">Commissioni intermediazione:</p>
                          <p className="text-lg font-medium text-slate-800">{formatCurrency(result?.refund?.intermediationFees || 0)}</p>
                        </div>
                        <div className="border-t border-blue-200 pt-3 mt-4">
                          <p className="text-blue-800 font-bold text-sm">Totale da rimborsare:</p>
                          <p className="text-2xl font-bold text-blue-700">
                            {formatCurrency(result?.refund?.totalRefund || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
          </div>
                  
                  <div className="flex justify-center space-x-4 mt-8">
                    <button 
                      className="btn-secondary"
                      onClick={() => setResult(null)}
                    >
                      Nuovo Calcolo
          </button>
                    {result?.letterContent && (
                      <DownloadPDFButton 
                        content={result.letterContent}
                        fileName={`Lettera_rimborso_${new Date().toISOString().split('T')[0]}.pdf`}
                      />
                    )}
                    {result?.letter && !result?.letterContent && (
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
