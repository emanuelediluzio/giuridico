"use client";
import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { extractTextFromPDF } from './components/pdfTextExtractClient';
import dynamic from 'next/dynamic';
import ChatAI from './components/ChatAI';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";
// Fontsource Montserrat rimosso per problemi di build - utilizziamo Google Fonts tramite globals.css

// import CalculatorIcon from '@/assets/icons/calculator.svg?react';
// import ChatBubbleIcon from '@/assets/icons/chat-bubble.svg?react';

const DownloadPDFButton = dynamic(() => import('./components/DownloadPDFButton'), { ssr: false });

// Interfaccia per i dati del risultato
interface ResultData {
  lettera?: string; // Modificato da letter
  calcoli?: string; // Aggiunto per i calcoli da Mistral
  // Campi rimossi: rimborso, quotaNonGoduta, totaleCosti, durataTotale, durataResidua, storno, dettaglioCosti, nomeCliente, dataChiusura, message, pdfProcessingDisabled
}

/* Commentiamo questa funzione per ora, il backend gestisce l'estrazione
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
*/

export default function Home() {
  const [contract, setContract] = useState<File | null>(null);
  const [statement, setStatement] = useState<File | null>(null);
  const [template, setTemplate] = useState<File | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [mainScreen, setMainScreen] = useState<'home' | 'rimborso'>('home');

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
      setError(null); // Pulisce l'errore quando un file viene cambiato/aggiunto
      setResult(null); // Pulisce i risultati precedenti
    }
  };

  useEffect(() => {
    // Rimuoviamo l'incremento graduale del progresso, lo gestiremo diversamente
    // let timer: NodeJS.Timeout;
    // if (isLoading && progress < 90) {
    //   timer = setTimeout(() => {
    //     setProgress(prevProgress => Math.min(prevProgress + 10, 90));
    //   }, 500);
    // }
    // return () => clearTimeout(timer);
  }, [isLoading, progress]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!contract || !statement || !template) {
      setError("Assicurati di aver caricato tutti e tre i file.");
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('contratto', contract); // Nome corretto per il backend
      formData.append('conteggio', statement); // Nome corretto per il backend
      formData.append('templateFile', template);
      
      console.log("PAGE.TSX - Contratto prima di append:", { name: contract.name, size: contract.size, type: contract.type });
      console.log("PAGE.TSX - Conteggio prima di append:", { name: statement.name, size: statement.size, type: statement.type });
      console.log("PAGE.TSX - Template prima di append:", { name: template.name, size: template.size, type: template.type });
      console.log("PAGE.TSX - FormData pronto per invio:", formData.has('contratto'), formData.has('conteggio'), formData.has('templateFile'));

      setProgress(10); // Inizio invio
      const res = await fetch('/api/cqs', {
        method: 'POST',
        body: formData,
      });
      
      setProgress(50); // Risposta ricevuta, in attesa di parsing

      if (!res.ok) {
        let errorData;
        const resClone = res.clone(); // Clona la risposta per poterla leggere più volte
        try {
          errorData = await res.json(); // Primo tentativo di lettura del corpo
        } catch (jsonError) {
          try {
            const errorText = await resClone.text(); // Secondo tentativo sul clone
            throw new Error(errorText || `Errore dal server: ${res.status} ${res.statusText}`);
          } catch (textError) {
            // Se entrambi i tentativi di lettura del corpo falliscono, solleva un errore generico
            throw new Error(`Errore dal server: ${res.status} ${res.statusText}. Impossibile leggere il corpo della risposta.`);
          }
        }
        // Se res.json() ha avuto successo, ma errorData.error non è definito, usa un messaggio generico.
        throw new Error(errorData?.error || `Errore durante l'elaborazione della richiesta: ${res.status} ${res.statusText}`);
      }

      const data: ResultData = await res.json();
      setResult(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };

  function formatCurrency(val: number) {
    return val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  }

  const renderLoadingOrResult = () => {
    if (isLoading) {
      return (
        <div className="mt-6 p-4 border border-blue-300 rounded-lg bg-blue-50">
          <p className="text-blue-700 font-semibold">Caricamento in corso...</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-sm text-blue-600 mt-1">{progress}%</p>
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

    if (result) {
      return (
        <div className="mt-8 p-6 border border-gray-300 rounded-lg shadow-lg bg-white">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Risultati Elaborazione</h3>
          
          {result.calcoli && (
            <div className="mb-6">
              <h4 className="text-xl font-semibold text-gray-700 mb-3">Calcoli Estratti:</h4>
              <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-600 whitespace-pre-wrap">
                {result.calcoli}
              </pre>
            </div>
          )}
          
          {result.lettera && (
            <div>
              <h4 className="text-xl font-semibold text-gray-700 mb-3">Lettera di Diffida Proposta:</h4>
              <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-600 whitespace-pre-wrap mb-4">
                {(() => {
                  // Ottieni la lettera con completamento se necessario
                  let rawLetter = result.lettera || "";

                  // Normalizza i ritorni a capo (es. \n -> \n)
                  rawLetter = rawLetter.replace(/\\n/g, "\n");

                  let finalLetter = rawLetter;

                  // Logica per la firma e la conclusione
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
                  
                  // Rimuovi i dati mancanti tra parentesi quadre in modo più generico
                  finalLetter = finalLetter.replace(/\s*,?\s*nato a \[[^\/\]]*non specificat[^\/\]]*\] il \[[^\/\]]*non specificat[^\/\]]*\]\s*,?/gi, "");
                  finalLetter = finalLetter.replace(/\[[^\/\]]*non specificat[^\/\]]*\]/gi, ""); // Deve essere case-insensitive per prendere "non specificato" e "Non specificato"
                  finalLetter = finalLetter.replace(/\[[^\/\]]*[Nn]on disponibil[^\/\]]*\]/gi, "");
                  finalLetter = finalLetter.replace(/\[[^\/\]]*[Dd]ato [^\/\]]*mancan[^\/\]]*\]/gi, "");
                  finalLetter = finalLetter.replace(/\s*\-\s*il\s*\[Data di nascita non specificata\]/gi, "");


                  // Correggi la punteggiatura e gli spazi
                  finalLetter = finalLetter.replace(/ ,/g, ",");
                  finalLetter = finalLetter.replace(/ \./g, ".");
                  finalLetter = finalLetter.replace(/ {2,}/g, " "); // Rimuove spazi multipli
                  finalLetter = finalLetter.replace(/\s+\n/g, "\n"); // Rimuove spazi prima di un a capo
                  finalLetter = finalLetter.replace(/\n\s+/g, "\n"); // Rimuove spazi dopo un a capo
                  finalLetter = finalLetter.replace(/\n{3,}/g, "\n\n"); // Limita a un massimo di due a capo consecutivi
                  finalLetter = finalLetter.replace(/ \)/g, ")");
                  finalLetter = finalLetter.replace(/\( /g, "(");
                  finalLetter = finalLetter.replace(/Sig\.\s+LORIA\s+MASSIMO/gi, "Sig. Massimo Loria");


                  return finalLetter.trim();
                })()}
              </pre>
              <div className="flex space-x-4">
                <DownloadPDFButton 
                  content={(() => {
                    // Prepara lo stesso testo pulito anche per il PDF
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
                    
                    // Rimuovi i dati mancanti tra parentesi quadre
                    finalLetter = finalLetter.replace(/\s*,?\s*nato a \[[^\/\]]*non specificat[^\/\]]*\] il \[[^\/\]]*non specificat[^\/\]]*\]\s*,?/gi, "");
                    finalLetter = finalLetter.replace(/\[[^\/\]]*non specificat[^\/\]]*\]/gi, "");
                    finalLetter = finalLetter.replace(/\[[^\/\]]*[Nn]on disponibil[^\/\]]*\]/gi, "");
                    finalLetter = finalLetter.replace(/\[[^\/\]]*[Dd]ato [^\/\]]*mancan[^\/\]]*\]/gi, "");
                    finalLetter = finalLetter.replace(/\s*\-\s*il\s*\[Data di nascita non specificata\]/gi, "");
                    
                    // Correggi la punteggiatura e gli spazi
                    finalLetter = finalLetter.replace(/ ,/g, ",");
                    finalLetter = finalLetter.replace(/ \./g, ".");
                    finalLetter = finalLetter.replace(/ {2,}/g, " ");
                    finalLetter = finalLetter.replace(/\s+\n/g, "\n"); 
                    finalLetter = finalLetter.replace(/\n\s+/g, "\n"); 
                    finalLetter = finalLetter.replace(/\n{3,}/g, "\n\n"); 
                    finalLetter = finalLetter.replace(/ \)/g, ")");
                    finalLetter = finalLetter.replace(/\( /g, "(");
                    finalLetter = finalLetter.replace(/Sig\.\s+LORIA\s+MASSIMO/gi, "Sig. Massimo Loria");
                    
                    return finalLetter.trim();
                  })()} 
                  fileName="lettera_diffida.pdf" 
                />
              </div>
            </div>
          )}
          {!result.calcoli && !result.lettera && (
            <p className="text-gray-600">Nessun risultato specifico da visualizzare, ma l'elaborazione è terminata.</p>
          )}
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
                </div>
              </div>
              
              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-8 max-w-2xl mx-auto">
                <div className="feature-card">
                  <div className="feature-icon">
                    {/* <CalculatorIcon className="w-6 h-6" fill="none" stroke="currentColor" /> */}
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
                      disabled={isLoading} 
                      className="btn-primary w-full"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Calcolo in corso...
                        </div>
                      ) : 'Calcola Rimborso'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="animate-fade-in">
                  {renderLoadingOrResult()}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
