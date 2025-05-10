"use client";
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { extractTextFromPDF } from './components/pdfTextExtractClient';
import jsPDF from 'jspdf';

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

  // Funzione per generare PDF professionale
  function handleDownloadPDF() {
    if (!result) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', '');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, 'F'); // Sfondo bianco
    let y = 20;
    doc.text('Risultato rimborso cessione del quinto', 15, y);
    y += 12;
    doc.setFontSize(12);
    doc.text(`Importo rimborsabile: ${formatCurrency(result.rimborso)}`, 15, y);
    y += 16;
    doc.setFontSize(12);
    doc.text('Lettera generata:', 15, y);
    y += 10;
    // Gestione testo lungo (lettera)
    const lines = doc.splitTextToSize(result.letter, 180);
    doc.text(lines, 15, y);
    doc.save('rimborso_cqs.pdf');
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#18181b]">
      <div className="main-card">
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
              <button onClick={handleDownloadPDF} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">Scarica PDF</button>
            </div>
          </>
        )}
        <footer className="mt-8 text-center text-xs">
          &copy; {new Date().getFullYear()} CQS Refund Calc. Design <span style={{color:'#38bdf8'}}>AI 2025</span>.
        </footer>
      </div>
    </div>
  );
}
