"use client";
import React, { useState, ChangeEvent, FormEvent } from 'react';

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
    const formData = new FormData();
    formData.append('contract', contract);
    formData.append('statement', statement);
    formData.append('template', template);
    try {
      const res = await fetch('/api/cqs', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error("Errore durante il calcolo. Riprova.");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Errore durante il calcolo. Riprova.");
    }
    setLoading(false);
  };

  function formatCurrency(val: number) {
    return val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] font-sans">
      <div className="w-full max-w-lg bg-white/90 shadow-2xl rounded-3xl p-10 backdrop-blur-md border border-gray-200 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-full p-3 mb-2 shadow-lg animate-bounce-slow">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 text-center tracking-tight mb-2">Cessione del Quinto <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">Refund 2025</span></h1>
          <p className="text-gray-600 text-center text-lg">Carica i documenti per calcolare il rimborso secondo l'<b>Art. 125 sexies T.U.B.</b> e genera la lettera personalizzata.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-semibold text-gray-800 mb-1" htmlFor="contract">1. Contratto di prestito <span className="text-blue-600">(PDF o DOCX)</span></label>
            <input id="contract" type="file" accept=".pdf,.docx" onChange={handleFileChange(setContract)} required className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition" title="Carica il contratto di prestito" />
          </div>
          <div>
            <label className="block font-semibold text-gray-800 mb-1" htmlFor="statement">2. Estratto di chiusura/risoluzione <span className="text-blue-600">(PDF o DOCX)</span></label>
            <input id="statement" type="file" accept=".pdf,.docx" onChange={handleFileChange(setStatement)} required className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition" title="Carica l'estratto di chiusura" />
          </div>
          <div>
            <label className="block font-semibold text-gray-800 mb-1" htmlFor="template">3. Modello di lettera <span className="text-blue-600">(DOC, DOCX o TXT)</span></label>
            <input id="template" type="file" accept=".doc,.docx,.txt" onChange={handleFileChange(setTemplate)} required className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 transition" title="Carica il modello di lettera" />
          </div>
          {error && <div className="text-red-600 text-center font-semibold animate-pulse">{error}</div>}
          <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-bold text-lg shadow-lg hover:scale-105 hover:from-cyan-400 hover:to-blue-600 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed" disabled={loading}>
            {loading && <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>}
            {loading ? 'Calcolo in corso...' : 'Calcola e genera lettera'}
          </button>
        </form>
        {result && (
          <div className="mt-10 p-6 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-100 border border-blue-200 shadow-xl animate-fade-in">
            <h2 className="text-xl font-bold text-blue-700 mb-2 flex items-center gap-2"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="#38bdf8" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>Risultato</h2>
            <p className="mb-2 text-lg"><span className="font-semibold">Importo rimborsabile:</span> <span className="text-green-600 font-bold text-xl">{formatCurrency(result.rimborso)}</span></p>
            <div className="bg-white/80 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap text-gray-800 mt-2 shadow-inner">
              <span className="font-semibold text-blue-700">Lettera generata:</span>
              <br />
              {result.letter}
            </div>
            <div className="mt-6 p-4 bg-white/70 rounded-lg border border-cyan-200 text-sm text-gray-700">
              <div className="font-bold text-cyan-700 mb-2">Dettaglio calcolo rimborso</div>
              <ul className="mb-2">
                <li>Totale costi sommati: <b>{formatCurrency(result.totaleCosti)}</b></li>
                <li>Voci di costo trovate: {result.dettaglioCosti && result.dettaglioCosti.length > 0 ? result.dettaglioCosti.map((v: number, i: number) => <span key={i}>{formatCurrency(v)}{i < result.dettaglioCosti.length - 1 ? ', ' : ''}</span>) : 'Nessuna voce trovata'}</li>
                <li>Durata totale: <b>{result.durataTotale}</b> mesi</li>
                <li>Rate residue: <b>{result.durataResidua}</b></li>
                <li>Quota non goduta: <b>{formatCurrency(result.quotaNonGoduta)}</b></li>
                <li>Storno banca: <b className="text-red-600">{formatCurrency(result.storno)}</b></li>
              </ul>
              <div className="text-xs text-gray-500 mt-2">Formula: (Totale costi / Durata totale) x Rate residue - Storno banca</div>
            </div>
          </div>
        )}
        <div className="mt-8 text-center text-xs text-gray-400">&copy; {new Date().getFullYear()} CQS Refund Calc. Design <span className="text-blue-400">AI 2025</span>.</div>
      </div>
    </div>
  );
}
