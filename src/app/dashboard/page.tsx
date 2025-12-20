"use client";
import React, { useState, ChangeEvent } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import 'react-quill-new/dist/quill.snow.css';
import RegulatoryFeed from '../components/RegulatoryFeed';
import { PERSONAS, PersonaConfig } from '@/types/lexa';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { saveUserHistory, getUserHistory, HistoryItem } from '@/lib/firestore';

// Import dinamico per ReactQuill e Button 
// NOTA: I path sono aggiornati per essere relativi a src/app/dashboard (quindi ../components)
const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <p className="text-gray-500 font-mono text-xs">LOADING EDITOR...</p>
});
const DownloadPDFButton = dynamic(() => import('../components/DownloadPDFButton'), { ssr: false });
const DownloadWordButton = dynamic(() => import('../components/DownloadWordButton'), { ssr: false });

import { estraiDatiMistral } from '../lib/nanonets';

// --- ICONS (Lucas Icons style - minimal SVG) ---
const IconPlus = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconFile = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        <polyline points="13 2 13 9 20 9"></polyline>
    </svg>
);

const IconTrash = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);

interface ResultData {
    lettera?: string;
    dati?: {
        nomeCliente: string;
        codiceFiscale: string;
        dataNascita: string;
        luogoNascita: string;
        importoRimborso: string;
        rateResidue: number;
        durataTotale: number;
        costiTotali: number;
    };
    analisiPercentuale?: {
        valore: number;
        stato: string;
    };
}

export default function DashboardPage() {
    const router = useRouter();
    // State
    const [contract, setContract] = useState<File | null>(null);
    const [statement, setStatement] = useState<File | null>(null);
    const [template, setTemplate] = useState<File | null>(null);
    const [result, setResult] = useState<ResultData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [letterContent, setLetterContent] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [selectedPersona, setSelectedPersona] = useState<PersonaConfig>(PERSONAS[0]);
    const [user, setUser] = useState<User | null>(null);

    // History state
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // Auth & History Effect
    React.useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Load history
                const userHistory = await getUserHistory(currentUser.uid);
                setHistory(userHistory);
            } else {
                // Redirect if not logged in
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                setError('SOLO PDF ALLOWED');
                return;
            }
            setter(file);
            setError(null);
        }
    };

    const removeFile = (setter: React.Dispatch<React.SetStateAction<File | null>>) => {
        setter(null);
    };

    const handleSubmit = async () => {
        if (!contract || !statement || !template) {
            setError("UPLOAD ALL REQUIRED DOCUMENTS");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            // Estrazione dati con Mistral OCR e analisi percentuale
            const datiContratto = await estraiDatiMistral(contract);
            const datiConteggio = await estraiDatiMistral(statement);

            // Unione dati: priorità al contratto per anagrafica, al conteggio per importo
            const nomeCliente = datiContratto.datiEstratti.nomeCliente || datiConteggio.datiEstratti.nomeCliente || '';
            const codiceFiscale = datiContratto.datiEstratti.codiceFiscale || datiConteggio.datiEstratti.codiceFiscale || '';
            const dataNascita = datiContratto.datiEstratti.dataNascita || datiConteggio.datiEstratti.dataNascita || '';
            const luogoNascita = datiContratto.datiEstratti.luogoNascita || datiConteggio.datiEstratti.luogoNascita || '';
            const importoRimborso = datiConteggio.datiEstratti.importo || datiContratto.datiEstratti.importo || '';

            // Analisi percentuale (usa il valore più alto tra i due documenti)
            const analisiPercentuale = datiContratto.analisiPercentuale.valore > datiConteggio.analisiPercentuale.valore
                ? datiContratto.analisiPercentuale
                : datiConteggio.analisiPercentuale;

            // Generazione lettera compilata
            const lettera = `Oggetto: Richiesta di rimborso ai sensi dell'Art. 125 sexies T.U.B.\n\nGentile Direzione,\n\nIl sottoscritto/a ${nomeCliente || 'XXXXX'}, codice fiscale ${codiceFiscale || 'XXXXX'}, nato/a a ${luogoNascita || 'XXXXX'} il ${dataNascita || 'XXXXX'},\nrichiede il rimborso delle somme pagate in eccesso in relazione al contratto di cessione del quinto.\n\nDall'analisi dei documenti risulta che sono state pagate rate per un importo superiore a quello dovuto.\n\nSi richiede pertanto il rimborso immediato delle somme pagate in eccesso, pari a ${importoRimborso || '0,00 €'}, unitamente agli interessi di legge.\n\nIn attesa di un vostro riscontro, si porgono distinti saluti.\nAvv. Gabriele Scappaticci`;

            setLetterContent(lettera);
            setResult({
                lettera,
                dati: {
                    nomeCliente,
                    codiceFiscale,
                    dataNascita,
                    luogoNascita,
                    importoRimborso: importoRimborso || '0,00 €',
                    rateResidue: 0,
                    durataTotale: 0,
                    costiTotali: 0
                },
                analisiPercentuale
            });
            setIsEditing(true);

            // Save to Firebase
            if (user) {
                const docName = `extraction_${Date.now()}.pdf`;
                await saveUserHistory(user.uid, docName, {
                    analysis: analisiPercentuale,
                    letter: lettera.substring(0, 100) + "..."
                });
                // Refresh local history
                const updatedHistory = await getUserHistory(user.uid);
                setHistory(updatedHistory);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "UNKNOWN ERROR OCCURRED");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#111] overflow-hidden text-white font-sans selection:bg-emerald-500 selection:text-white">

            {/* SIDEBAR - HISTORY */}
            <aside className="w-[300px] border-r border-[#333] flex flex-col shrink-0">
                <div className="h-14 flex items-center px-4 border-b border-[#333]">
                    <span className="font-mono text-xs text-emerald-500 uppercase tracking-widest">History Log</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {history.map((item) => (
                        <div key={item.id} className="group flex items-center justify-between p-2 rounded-sm hover:bg-[#222] cursor-pointer transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <IconFile />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium truncate text-gray-300 group-hover:text-white transition-colors">{item.name}</span>
                                    <span className="text-[10px] text-gray-600 font-mono">{item.date}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <RegulatoryFeed />
                <div className="p-4 border-t border-[#333]">
                    <div className="text-[10px] text-gray-600 font-mono text-center uppercase tracking-widest">
                        Lexa v2.1 - {selectedPersona.name}
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT Area */}
            <main className="flex-1 flex flex-col min-w-0">

                {/* HEADER */}
                <header className="h-14 border-b border-[#333] flex items-center justify-between px-6 bg-[#111]">
                    <div className="flex items-center gap-2 font-mono text-sm">
                        <span className="text-emerald-500 font-bold tracking-widest">LEXA</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-gray-400">workspace</span>
                        {contract && (
                            <>
                                <span className="text-gray-600">/</span>
                                <span className="text-white">{contract.name}</span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <select
                            value={selectedPersona.id}
                            onChange={(e) => {
                                const p = PERSONAS.find(p => p.id === e.target.value);
                                if (p) setSelectedPersona(p);
                            }}
                            className="bg-[#1a1a1a] border border-[#333] text-xs text-gray-300 rounded px-2 py-1 focus:outline-none focus:border-emerald-500 font-mono"
                        >
                            {PERSONAS.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        <button
                            onClick={() => router.push('/login')}
                            className="text-xs font-mono text-gray-500 hover:text-rose-500 uppercase tracking-widest transition-colors"
                        >
                            Disconnect
                        </button>
                    </div>
                </header>

                {/* WORKSPACE - SPLIT PANE */}
                <div className="flex-1 flex overflow-hidden">

                    {/* LEFT PANE - SOURCE / INPUT */}
                    <section className="flex-1 border-r border-[#333] flex flex-col min-w-[400px]">
                        <div className="p-6 flex flex-col h-full overflow-y-auto">

                            <div className="mb-8">
                                <span className="mono-label">Source Documents</span>

                                <div className="grid gap-4">
                                    {/* Contract Input */}
                                    <div className="relative group">
                                        {!contract ? (
                                            <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-[#333] bg-[#1a1a1a] hover:bg-[#222] hover:border-emerald-500/50 cursor-pointer transition-all">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <IconPlus />
                                                    <p className="mt-2 text-xs text-gray-500 font-mono uppercase tracking-widest">Upload Contract</p>
                                                </div>
                                                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange(setContract)} />
                                            </label>
                                        ) : (
                                            <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#333] border-l-2 border-l-emerald-500">
                                                <div className="flex items-center gap-3">
                                                    <IconFile />
                                                    <span className="text-sm font-mono text-gray-300">{contract.name}</span>
                                                </div>
                                                <button onClick={() => removeFile(setContract)} className="text-gray-600 hover:text-rose-500"><IconTrash /></button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Statement Input */}
                                    <div className="relative group">
                                        {!statement ? (
                                            <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-[#333] bg-[#1a1a1a] hover:bg-[#222] hover:border-emerald-500/50 cursor-pointer transition-all">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <IconPlus />
                                                    <p className="mt-2 text-xs text-gray-500 font-mono uppercase tracking-widest">Upload Statement</p>
                                                </div>
                                                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange(setStatement)} />
                                            </label>
                                        ) : (
                                            <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#333] border-l-2 border-l-emerald-500">
                                                <div className="flex items-center gap-3">
                                                    <IconFile />
                                                    <span className="text-sm font-mono text-gray-300">{statement.name}</span>
                                                </div>
                                                <button onClick={() => removeFile(setStatement)} className="text-gray-600 hover:text-rose-500"><IconTrash /></button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Template Input */}
                                    <div className="relative group">
                                        {!template ? (
                                            <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-[#333] bg-[#1a1a1a] hover:bg-[#222] hover:border-emerald-500/50 cursor-pointer transition-all">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <IconPlus />
                                                    <p className="mt-2 text-xs text-gray-500 font-mono uppercase tracking-widest">Upload Template</p>
                                                </div>
                                                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange(setTemplate)} />
                                            </label>
                                        ) : (
                                            <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#333] border-l-2 border-l-emerald-500">
                                                <div className="flex items-center gap-3">
                                                    <IconFile />
                                                    <span className="text-sm font-mono text-gray-300">{template.name}</span>
                                                </div>
                                                <button onClick={() => removeFile(setTemplate)} className="text-gray-600 hover:text-rose-500"><IconTrash /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="mb-6 p-3 border border-rose-900/50 bg-rose-500/10 text-rose-500 text-xs font-mono uppercase tracking-wide">
                                    Error: {error}
                                </div>
                            )}

                            <div className="mt-auto pt-6 border-t border-[#333]">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className={`w-full btn-primary ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    {isLoading ? 'PROCESSING DATA...' : 'RUN EXTRACTION'}
                                </button>
                            </div>

                        </div>
                    </section>

                    {/* RIGHT PANE - OUTPUT */}
                    <section className="flex-[1.5] bg-[#0c0c0c] flex flex-col min-w-[500px]">
                        <div className="h-10 border-b border-[#333] flex items-center px-4 justify-between bg-[#111]">
                            <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">Output / Editor</span>
                            {result?.analisiPercentuale && (
                                <span className={`font-mono text-xs px-2 py-0.5 ${result.analisiPercentuale.stato === 'OK' ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                                    AI SCORE: {result.analisiPercentuale.valore}% [{result.analisiPercentuale.stato}]
                                </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center relative">
                            {!result && !isLoading && (
                                <div className="text-center opacity-30">
                                    <div className="w-16 h-16 border rounded-full border-gray-600 flex items-center justify-center mx-auto mb-4">
                                        <span className="text-2xl font-mono">?</span>
                                    </div>
                                    <p className="font-mono text-sm uppercase tracking-widest">Waiting for input</p>
                                </div>
                            )}

                            {isLoading && (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="font-mono text-xs text-emerald-500 animate-pulse uppercase tracking-widest">Analyzing Documents via Gemini Flash...</p>
                                </div>
                            )}

                            {result && !isLoading && (
                                <div className="w-full h-full flex flex-col animate-fade-in">

                                    {/* METADATA GRID */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 w-full border-b border-[#333] pb-8">
                                        <div>
                                            <span className="text-[10px] uppercase text-gray-500 font-mono block mb-1">Cliente</span>
                                            <span className="text-sm font-mono text-white">{result.dati?.nomeCliente || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase text-gray-500 font-mono block mb-1">Codice Fiscale</span>
                                            <span className="text-sm font-mono text-white">{result.dati?.codiceFiscale || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase text-gray-500 font-mono block mb-1">Importo</span>
                                            <span className="text-sm font-mono text-emerald-400">{result.dati?.importoRimborso || '0.00'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase text-gray-500 font-mono block mb-1">Data Nascita</span>
                                            <span className="text-sm font-mono text-white">{result.dati?.dataNascita || 'N/A'}</span>
                                        </div>
                                    </div>

                                    {/* EDITOR */}
                                    <div className="flex-1 bg-white text-black rounded-sm overflow-hidden flex flex-col relative">
                                        {isEditing ? (
                                            <ReactQuill
                                                theme="snow"
                                                value={letterContent}
                                                onChange={setLetterContent}
                                                className="h-full"
                                                modules={{
                                                    toolbar: [
                                                        [{ 'header': [1, 2, false] }],
                                                        ['bold', 'italic', 'underline'],
                                                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                        ['clean']
                                                    ],
                                                }}
                                            />
                                        ) : (
                                            <div className="p-8 whitespace-pre-wrap font-serif text-sm leading-relaxed overflow-y-auto h-full">
                                                {letterContent}
                                            </div>
                                        )}

                                        {/* Floating Toggle Edit */}
                                        <button
                                            onClick={() => setIsEditing(!isEditing)}
                                            className="absolute bottom-4 right-4 bg-black text-white p-2 rounded-full shadow-lg hover:bg-emerald-600 transition-colors z-10"
                                            title="Toggle Edit"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                    </div>

                                    {/* ACTIONS */}
                                    <div className="mt-4 flex gap-3 justify-end">
                                        <DownloadPDFButton content={letterContent} fileName={`diffida_${result.dati?.codiceFiscale || 'output'}.pdf`} />
                                        <DownloadWordButton content={letterContent} fileName={`diffida_${result.dati?.codiceFiscale || 'output'}.docx`} />
                                    </div>

                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
