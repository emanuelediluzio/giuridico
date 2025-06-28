"use client";
import React, { useState, ChangeEvent, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { extractTextFromPDF } from './components/PDFTextExtractor';
import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";
// Fontsource Montserrat rimosso per problemi di build - utilizziamo Google Fonts tramite globals.css

// import CalculatorIcon from '@/assets/icons/calculator.svg?react';
// import ChatBubbleIcon from '@/assets/icons/chat-bubble.svg?react';

// Import dinamico per ReactQuill per evitare problemi SSR
// Tentativo di import più esplicito del default
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false, 
  loading: () => <p>Caricamento editor...</p> // Aggiungi un fallback di caricamento
});
import 'react-quill-new/dist/quill.snow.css'; // Importa CSS per il tema snow di ReactQuill

const DownloadPDFButton = dynamic(() => import('./components/DownloadPDFButton'), { ssr: false });
const DownloadWordButton = dynamic(() => import('./components/DownloadWordButton'), { ssr: false });

// Interfaccia per i dati del risultato
interface ResultData {
  lettera?: string; // Modificato da letter
  calcoli?: string; // Mantenuto per ora nella struttura dati, ma non visualizzato
  // Campi rimossi: rimborso, quotaNonGoduta, totaleCosti, durataTotale, durataResidua, storno, dettaglioCosti, nomeCliente, dataChiusura, message, pdfProcessingDisabled
}

export default function Home() {
  const [contract, setContract] = useState<File | null>(null);
  const [statement, setStatement] = useState<File | null>(null);
  const [template, setTemplate] = useState<File | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mainScreen, setMainScreen] = useState<'home' | 'rimborso' | 'chat-ai'>("home");
  const [letterContent, setLetterContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Accetta solo PDF
      if (file.type !== 'application/pdf') {
        setError('Carica solo file PDF');
        return;
      }
      setter(file);
      setError(null);
      setResult(null);
      setLetterContent('');
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (result && result.lettera) {
      let rawLetter = result.lettera || "";
      rawLetter = rawLetter.replace(/\\n/g, "\n"); 

      let finalLetter = rawLetter;
      const signature = "Avv. Gabriele Scappaticci";
      const standardEnding = "in legge, con modificazioni, dalla Legge 10 novembre 2014, n. 162.\n\nDistinti saluti,\n" + signature;
      
      if (rawLetter.trim().endsWith("convertito")) {
        finalLetter = rawLetter.trim() + " " + standardEnding;
      } else if (rawLetter.includes("Avv. _________________")) {
        finalLetter = rawLetter.replace("Avv. _________________", signature);
      } else if (!rawLetter.trim().endsWith(signature.trim())) {
        if (!rawLetter.match(/Distinti saluti,\nAvv\./)) {
             finalLetter = rawLetter.trim() + "\n\nDistinti saluti,\n" + signature;
        }
      }
      
      finalLetter = finalLetter.replace(/\s*,?\s*nato a \[[^/\]]*non specificat[^/\]]*\] il \[[^/\]]*non specificat[^/\]]*\]\s*,?/gi, "");
      finalLetter = finalLetter.replace(/\[[^/\]]*non specificat[^/\]]*\]/gi, ""); 
      finalLetter = finalLetter.replace(/\[[^/\]]*[Nn]on disponibil[^/\]]*\]/gi, "");
      finalLetter = finalLetter.replace(/\[[^/\]]*[Dd]ato [^/\]]*mancan[^/\]]*\]/gi, "");
      finalLetter = finalLetter.replace(/\s*-\s*il\s*\[Data di nascita non specificata\]/gi, "");

      finalLetter = finalLetter.replace(/ ,/g, ",");
      finalLetter = finalLetter.replace(/ \./g, ".");
      finalLetter = finalLetter.replace(/ {2,}/g, " "); 
      finalLetter = finalLetter.replace(/\s+\n/g, "\n"); 
      finalLetter = finalLetter.replace(/\n\s+/g, "\n"); 
      finalLetter = finalLetter.replace(/\n{3,}/g, "\n\n"); 
      finalLetter = finalLetter.replace(/ \)/g, ")");
      finalLetter = finalLetter.replace(/\( /g, "(");
      finalLetter = finalLetter.replace(/Sig\.\s+LORIA\s+MASSIMO/gi, "Sig. Massimo Loria");
      finalLetter = finalLetter.replace(/rappresentar Vi/g, "rappresentarVi");
      setLetterContent(finalLetter.trim());
    }
  }, [result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !statement || !template) {
      setError("Per favore carica tutti i PDF richiesti");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Prima prova l'API CQS
      try {
        const formData = new FormData();
        formData.append('contract', contract);
        formData.append('statement', statement);
        formData.append('template', template);

        const response = await fetch("/api/cqs", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setLetterContent(data.lettera || data.result || "Nessuna lettera generata");
          setIsEditing(true);
          return;
        }
      } catch (cqsError) {
        console.log("API CQS fallita, provo API di fallback:", cqsError);
      }

      // Se CQS fallisce, usa l'API di fallback
      const contractText = await extractTextFromPDF(contract);
      const statementText = await extractTextFromPDF(statement);
      const templateText = await extractTextFromPDF(template);

      const fallbackResponse = await fetch("/api/lettera", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractText: contractText.substring(0, 1000),
          statementText: statementText.substring(0, 1000),
          templateText: templateText.substring(0, 500)
        }),
      });

      if (!fallbackResponse.ok) {
        const errorData = await fallbackResponse.json();
        throw new Error(errorData.error || "Errore nella generazione della lettera");
      }

      const data = await fallbackResponse.json();
      setLetterContent(data.lettera || "Nessuna lettera generata");
      setIsEditing(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto durante l'elaborazione");
    } finally {
      setIsLoading(false);
    }
  };

  const renderLoadingOrResult = () => {
    if (isLoading) {
      return (
        <div className="mt-6 p-4 border border-blue-300 rounded-lg bg-blue-50">
          <p className="text-blue-700 font-semibold">Caricamento in corso...</p>
          <p className="text-blue-600 text-sm">Analisi dei PDF e generazione lettera con Mistral AI...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="mt-6 p-4 border border-red-300 rounded-lg bg-red-50">
          <p className="text-red-700 font-semibold">Errore:</p>
          <pre className="text-red-600 text-sm whitespace-pre-wrap">{error}</pre>
        </div>
      );
    }

    if (letterContent) { // Mostra solo se abbiamo letterContent
      return (
        <div className="mt-8 p-6 border border-gray-300 rounded-lg shadow-lg bg-white">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Lettera di Diffida Proposta</h3>
          
          {isEditing ? (
            <div className="mb-4">
              <ReactQuill 
                theme="snow" 
                value={letterContent} 
                onChange={setLetterContent} 
                modules={{
                  toolbar: [
                    [{ 'header': '1'}, {'header': '2'}, { 'font': [] }],
                    [{size: []}],
                    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                    [{'list': 'ordered'}, {'list': 'bullet'}, 
                     {'indent': '-1'}, {'indent': '+1'}],
                    ['link'],
                    ['clean'],
                    [{ 'align': [] }],
                    [{ 'color': [] }, { 'background': [] }],
                  ],
                }}
                formats={[
                  'header', 'font', 'size',
                  'bold', 'italic', 'underline', 'strike', 'blockquote',
                  'list', 'bullet', 'indent',
                  'link',
                  'align', 'color', 'background'
                ]}
                className="bg-white rounded-xl border border-slate-300 shadow-sm resize-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                style={{ minHeight: '250px', maxHeight: '500px', marginBottom: '0', overflowY: 'auto' }}
              />
            </div>
          ) : (
            <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-600 whitespace-pre-wrap mb-4">
              {letterContent}
            </pre>
          )}
          <div className="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0 mt-4">
            <DownloadPDFButton 
              content={letterContent} 
              fileName="lettera_diffida.pdf" 
            />
            <DownloadWordButton 
              content={letterContent} 
              fileName="lettera_diffida.docx" 
            />
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition duration-150 ease-in-out shadow-sm"
            >
              {isEditing ? 'Termina Modifica' : 'Modifica Lettera'}
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

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
                  L&apos;assistente legale <span className="text-blue-600">per avvocati</span>
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
                </div>
              </div>
              
              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-8 max-w-2xl mx-auto">
                <div className="feature-card">
                  <div className="feature-icon">
                    {/* <CalculatorIcon className="w-6 h-6" fill="none" stroke="currentColor" /> */}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-800">Calcolo Rimborso</h3>
                  <p className="text-slate-600 mb-4">Determina l&apos;importo da restituire in base all&apos;Art. 125 sexies T.U.B. in modo rapido e preciso.</p>
                  <button 
                    onClick={() => setMainScreen('rimborso')} 
                    className="btn-primary btn-small"
                  >
                    Avvia calcolo
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
                    <h3 className="text-lg font-bold mb-2 text-slate-800">Carica i documenti PDF</h3>
                    <p className="text-slate-600">Carica contratto, conteggio estintivo e template PDF.</p>
                  </div>
                  <div className="p-6 bg-blue-50 rounded-xl">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="font-bold text-lg">2</span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-slate-800">Conversione e Analisi</h3>
                    <p className="text-slate-600">I PDF vengono convertiti in immagini e analizzati dall&apos;AI.</p>
                  </div>
                  <div className="p-6 bg-blue-50 rounded-xl">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="font-bold text-lg">3</span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-slate-800">Risultato immediato</h3>
                    <p className="text-slate-600">Ottieni la lettera di diffida generata e pronta per essere modificata.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
        
        {mainScreen === 'rimborso' && (
          <div className="container-lexa max-w-4xl animate-fade-in">
            <div className="card-lexa">
              <h2 className="mb-6 text-center">Genera Lettera di Diffida da PDF</h2>
              {!letterContent && !isLoading && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="contract" className="block text-slate-700 font-medium mb-2">Contratto (PDF)</label>
                    <input 
                      type="file" 
                      id="contract" 
                      accept="application/pdf" 
                      onChange={handleFileChange(setContract)} 
                      className="input-lexa"
                    />
                    <p className="mt-1 text-sm text-slate-500">Carica il contratto di cessione del quinto in formato PDF.</p>
                  </div>
                  
                  <div>
                    <label htmlFor="statement" className="block text-slate-700 font-medium mb-2">Conteggio Estintivo (PDF)</label>
                    <input 
                      type="file" 
                      id="statement" 
                      accept="application/pdf" 
                      onChange={handleFileChange(setStatement)} 
                      className="input-lexa"
                    />
                    <p className="mt-1 text-sm text-slate-500">Carica il conteggio estintivo rilasciato dalla finanziaria in PDF.</p>
                  </div>
                  
                  <div>
                    <label htmlFor="template" className="block text-slate-700 font-medium mb-2">Template Lettera (PDF)</label>
                    <input 
                      type="file" 
                      id="template" 
                      accept="application/pdf" 
                      onChange={handleFileChange(setTemplate)} 
                      className="input-lexa"
                    />
                    <p className="mt-1 text-sm text-slate-500">Carica il template per la lettera di richiesta rimborso in PDF.</p>
                  </div>
                  
                  {error && !isLoading && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}
                  
                  <div className="flex justify-center pt-4">
                    <button 
                      type="submit" 
                      disabled={isLoading} 
                      className="btn-primary w-full"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Elaborazione in corso...
                        </div>
                      ) : 'Genera Lettera'}
                    </button>
                  </div>
                </form>
              )}
              {renderLoadingOrResult()}
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
