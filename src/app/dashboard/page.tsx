"use client";
import React, { useState, ChangeEvent } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import 'react-quill-new/dist/quill.snow.css';
import RegulatoryFeed from '../components/RegulatoryFeed';
import { PERSONAS, PersonaConfig } from '@/types/lexa';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { saveUserHistory, getUserHistory, updateUserHistory, HistoryItem, Message } from '@/lib/firestore';
import { WORKFLOWS, WorkflowConfig } from '@/types/workflows';
import {
    Calculator,
    FileText,
    ShieldCheck
} from 'lucide-react';

// Import dinamico per ReactQuill e Button 
// NOTA: I path sono aggiornati per essere relativi a src/app/dashboard (quindi ../components)
const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <p className="text-gray-500 font-mono text-xs">LOADING EDITOR...</p>
});
const DownloadPDFButton = dynamic(() => import('../components/DownloadPDFButton'), { ssr: false });
const DownloadWordButton = dynamic(() => import('../components/DownloadWordButton'), { ssr: false });



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
        valore: number | null;
        stato: string;
    };
    [key: string]: unknown; // Index signature for Firestore compatibility
}

export default function DashboardPage() {
    const router = useRouter();
    // State
    // Workflow State
    const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowConfig>(WORKFLOWS[0]);
    const [inputFiles, setInputFiles] = useState<Record<string, File | null>>({});

    // Other State
    const [result, setResult] = useState<ResultData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [letterContent, setLetterContent] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [selectedPersona, setSelectedPersona] = useState<PersonaConfig>(PERSONAS[0]);
    const [user, setUser] = useState<User | null>(null);

    // State for Tabs
    const [activeTab, setActiveTab] = useState<'editor' | 'chat'>('editor');

    // Import Chat (Dynamic to avoid SSR issues if any)
    const ChatInterface = dynamic(() => import('../components/ChatInterface'), { ssr: false });

    // History state
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<Message[]>([]);



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

    // Puter Type Definition
    interface PuterInstance {
        auth: {
            signIn: () => Promise<unknown>;
            isSignedIn: () => boolean;
            signOut: () => void;
        };
        ai: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            chat: (messages: string | any[], options?: any) => Promise<any>;
        };
    }

    // Puter Auth State
    const [isPuterAuthenticated, setIsPuterAuthenticated] = useState<boolean>(true); // Default to true to avoid flash, check on mount
    const [puterInstance, setPuterInstance] = useState<PuterInstance | null>(null);

    // Puter Auth Check
    React.useEffect(() => {
        const checkPuter = async () => {
            if (window.puter && window.puter.auth) {
                const isSignedIn = window.puter.auth.isSignedIn();
                setIsPuterAuthenticated(isSignedIn);

                // Set instance for passing to children
                setPuterInstance(window.puter as unknown as PuterInstance);

                if (!isSignedIn) {
                    try {
                        // Attempt silent sign in or just ready state?
                        // window.puter.auth.signIn(); // Don't force sign in on load
                    } catch {
                        console.log("Not signed in");
                    }
                }
            } else {
                // Retry if script taking time
                setTimeout(checkPuter, 500);
            }
        };
        checkPuter();
    }, []);

    const handleConnectPuter = async () => {
        if (!puterInstance) return;
        try {
            await puterInstance.auth.signIn();
            setIsPuterAuthenticated(true);
        } catch (err) {
            console.error("Puter Sign In Failed", err);
            setError("AI CONNECTION FAILED. POPUP BLOCKED?");
        }
    };


    const handleWorkflowChange = (workflow: WorkflowConfig) => {
        setSelectedWorkflow(workflow);
        setInputFiles({}); // Reset files on workflow change
        setError(null);
        setResult(null);
        setLetterContent('');
        setIsEditing(false);
        setCurrentHistoryId(null);
        setChatMessages([]);
    };

    const loadHistoryItem = (item: HistoryItem) => {
        setCurrentHistoryId(item.id || null);
        // Restore Data if available
        if (item.resultData) {
            // Reconstruct ResultData structure from generic record if needed
            // Assuming direct mapping:
            setResult(item.resultData as ResultData);
            setLetterContent(item.resultData.lettera as string || '');
            setIsEditing(false); // Mode view

            // Restore Workflow context (optional, or infer from data?) 
            // For now, we stay on current workflow or switch? 
            // Ideally we should store workflow ID in history too. 
            // For simplicity, we just load the data into the current view.
        }
        // Restore Chat
        setChatMessages(item.chatMessages || []);
        setActiveTab('editor'); // Default back to editor
    };

    const handleChatUpdate = async (newMessages: Message[]) => {
        setChatMessages(newMessages);
        if (user && currentHistoryId) {
            // Save to Firestore (Fire and Forget)
            updateUserHistory(user.uid, currentHistoryId, { chatMessages: newMessages });
        }
    };

    const handleFileChange = (inputId: string) => (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                setError('SOLO PDF ALLOWED');
                return;
            }
            setInputFiles(prev => ({ ...prev, [inputId]: file }));
            setError(null);
        }
    };

    const removeFile = (inputId: string) => {
        setInputFiles(prev => {
            const newFiles = { ...prev };
            delete newFiles[inputId];
            return newFiles;
        });
    };

    const handleSubmit = async () => {
        // Validation: Check if all required inputs are present
        const missingInputs = selectedWorkflow.inputs.filter(input => input.required && !inputFiles[input.id]);
        if (missingInputs.length > 0) {
            setError(`MISSING FILES: ${missingInputs.map(i => i.label).join(', ')}`);
            return;
        }

        if (!isPuterAuthenticated || !puterInstance) {
            setError("AI CONNECTION REQUIRED. Please connect first.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Import client utilities dynamically
            const { extractTextFromPDFClient, analysisWithPuterClient } = await import('@/lib/pdf-client');
            const { parseNanonetsMarkdown } = await import('../lib/nanonets');

            let newResult: ResultData | null = null;
            let generatedLetter = "";

            if (selectedWorkflow.id === 'CESSIONE_QUINTO') {
                const contract = inputFiles['contract'];
                const statement = inputFiles['statement'];
                const template = inputFiles['template'];

                if (!contract || !statement || !template) throw new Error("File Missing");

                // CLIENT SIDE EXTRACTION
                console.log("[DEBUG] Starting PDF Extraction...");
                const [contractText, statementText] = await Promise.all([
                    extractTextFromPDFClient(contract),
                    extractTextFromPDFClient(statement)
                ]);
                console.log("[DEBUG] PDF Extraction Complete.", {
                    contractLen: contractText.length,
                    statementLen: statementText.length
                });

                // CLIENT SIDE ANALYSIS (Puter.js)
                console.log("[DEBUG] Starting Puter AI Analysis...");
                const [contractAnalysis, statementAnalysis] = await Promise.all([
                    analysisWithPuterClient(contractText, puterInstance),
                    analysisWithPuterClient(statementText, puterInstance)
                ]);
                console.log("[DEBUG] Puter Analysis Complete.", { contractAnalysis, statementAnalysis });

                // CLIENT SIDE PARSING (Regex)
                const contractData = parseNanonetsMarkdown(contractText);
                const statementData = parseNanonetsMarkdown(statementText);

                // Unione dati
                const nomeCliente = contractData.nomeCliente || statementData.nomeCliente || '';
                const codiceFiscale = contractData.codiceFiscale || statementData.codiceFiscale || '';
                const dataNascita = contractData.dataNascita || statementData.dataNascita || '';
                const luogoNascita = contractData.luogoNascita || statementData.luogoNascita || '';
                const importoRimborso = statementData.importo || contractData.importo || '';

                // Analisi percentuale
                const analisiPercentuale = (contractAnalysis.valore || 0) > (statementAnalysis.valore || 0)
                    ? contractAnalysis
                    : statementAnalysis;

                // Generazione lettera
                generatedLetter = `Oggetto: Richiesta di rimborso ai sensi dell'Art. 125 sexies T.U.B.\n\nGentile Direzione,\n\nIl sottoscritto/a ${nomeCliente || 'XXXXX'}, codice fiscale ${codiceFiscale || 'XXXXX'}, nato/a a ${luogoNascita || 'XXXXX'} il ${dataNascita || 'XXXXX'},\nrichiede il rimborso delle somme pagate in eccesso in relazione al contratto di cessione del quinto.\n\nDall'analisi dei documenti risulta che sono state pagate rate per un importo superiore a quello dovuto.\n\nSi richiede pertanto il rimborso immediato delle somme pagate in eccesso, pari a ${importoRimborso || '0,00 €'}, unitamente agli interessi di legge.\n\nIn attesa di un vostro riscontro, si porgono distinti saluti.\nAvv. Gabriele Scappaticci`;

                newResult = {
                    lettera: generatedLetter,
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
                };

            } else {
                // Simulate other workflows
                await new Promise(resolve => setTimeout(resolve, 2000));
                const file = Object.values(inputFiles)[0];
                generatedLetter = `Generato report per workflow: ${selectedWorkflow.name}\n\nDocumento: ${file?.name}\n\n... (Simulated content)`;
                newResult = {
                    lettera: generatedLetter,
                    dati: {
                        nomeCliente: 'Demo User',
                        codiceFiscale: 'DEMO',
                        dataNascita: '',
                        luogoNascita: '',
                        importoRimborso: 'N/A',
                        rateResidue: 0,
                        durataTotale: 0,
                        costiTotali: 0
                    },
                    analisiPercentuale: { valore: 0, stato: 'INFO' }
                };
            }

            setLetterContent(generatedLetter);
            setResult(newResult);
            setIsEditing(true);
            setChatMessages([]); // Reset chat for new run
            setCurrentHistoryId(null); // Reset ID until saved

            // Persistence
            if (user && newResult) {
                const file1 = Object.values(inputFiles)[0];
                const baseName = file1 ? file1.name.replace('.pdf', '') : 'Analisi';
                const clientName = newResult.dati?.nomeCliente && newResult.dati?.nomeCliente !== 'XXXXX' ? newResult.dati?.nomeCliente : null;
                const smartName = clientName ? `Analisi ${clientName}` : baseName;
                const count = history.length + 1;
                const docName = `${smartName} #${count}`;

                const docId = await saveUserHistory(user.uid, docName, newResult, []); // Empty chat initially
                if (docId) {
                    setCurrentHistoryId(docId);
                }
                const updatedHistory = await getUserHistory(user.uid);
                setHistory(updatedHistory);
            }


        } catch (err) {
            console.error("Extraction Error:", err);
            setError(err instanceof Error ? err.message : "UNKNOWN ERROR OCCURRED");
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <div className="flex h-screen w-full bg-[#111] overflow-hidden text-white font-sans selection:bg-emerald-500 selection:text-white relative">

            {/* AI CONNECTION OVERLAY */}
            {!isPuterAuthenticated && (
                <div className="absolute inset-0 z-50 bg-[#0c0c0c]/95 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#111] border border-[#333] p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                        {/* Decorative Corners */}
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-emerald-500"></div>
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-emerald-500"></div>
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-emerald-500"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-emerald-500"></div>

                        <div className="mb-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mb-4 animate-pulse">
                                <ShieldCheck size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-white tracking-widest mb-2">AI CORE REQUIRED</h2>
                            <p className="text-gray-400 text-xs font-mono">
                                Lexa requires an active connection to the Neural Engine (Puter.js) to function.
                                Please authorize the connection to proceed.
                            </p>
                        </div>

                        <button
                            onClick={handleConnectPuter}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase tracking-widest py-3 text-xs transition-colors flex items-center justify-center gap-2"
                        >
                            CONNECT AI SERVICES
                        </button>

                        <div className="mt-4 text-[10px] text-gray-600 font-mono uppercase">
                            Secure Handshake Protocol v1.0
                        </div>
                    </div>
                </div>
            )}

            {/* SIDEBAR - SPLIT LAYOUT (50/50) */}
            <aside className="w-[300px] border-r border-[#333] flex flex-col shrink-0 h-full">

                {/* TOP HALF: HISTORY */}
                <div className="h-1/2 flex flex-col border-b border-[#333]">
                    <div className="h-14 flex items-center px-4 border-b border-[#333] shrink-0 bg-[#111]">
                        <span className="font-mono text-xs text-emerald-500 uppercase tracking-widest">History Log</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {history.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => loadHistoryItem(item)}
                                className={`group flex items-center justify-between p-2 rounded-sm cursor-pointer transition-colors ${currentHistoryId === item.id ? 'bg-emerald-900/20 border border-emerald-500/30' : 'hover:bg-[#222] border border-transparent'}`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <IconFile />
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-sm font-medium truncate transition-colors ${currentHistoryId === item.id ? 'text-emerald-400' : 'text-gray-300 group-hover:text-white'}`}>{item.name}</span>
                                        <span className="text-[10px] text-gray-600 font-mono">{item.date}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BOTTOM HALF: REGULATORY MONITOR */}
                <div className="h-1/2 flex flex-col bg-[#0c0c0c]">
                    {/* RegulatoryFeed contains its own header, we just need the container to scroll correctly */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <RegulatoryFeed />
                        {/* Note: RegulatoryFeed component might need adjustment to handle full height or scroll internally if not passed via props. 
                            Currently it is just a div. We wrap it in scrollable area or modify component to scroll. 
                            Looking at RegulatoryFeed code, it just maps items. 
                            We should probably wrap it here in overflow-y-auto. 
                        */}
                    </div>
                    <div className="p-4 border-t border-[#333] shrink-0 bg-[#111]">
                        <div className="text-[10px] text-gray-600 font-mono text-center uppercase tracking-widest">
                            Lexa v2.2 - {selectedPersona.name}
                        </div>
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
                        <span className="text-gray-600">/</span>
                        <span className="text-emerald-500 uppercase">{selectedWorkflow.name}</span>
                        {Object.values(inputFiles)[0] && (
                            <>
                                <span className="text-gray-600">/</span>
                                <span className="text-white truncate max-w-[150px]">{Object.values(inputFiles)[0]?.name}</span>
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
                                <span className="mono-label mb-4 block">Select Job Type</span>
                                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                                    {WORKFLOWS.map((wf) => {
                                        const isActive = selectedWorkflow.id === wf.id;
                                        // Dynamic Icon Rendering based on string ID would be ideal, but for now hardcode mapping or use library if dynamic import
                                        // Simple switch for icon
                                        let Icon = FileText;
                                        if (wf.icon === 'Calculator') Icon = Calculator;
                                        if (wf.icon === 'ShieldCheck') Icon = ShieldCheck;

                                        return (
                                            <button
                                                key={wf.id}
                                                onClick={() => handleWorkflowChange(wf)}
                                                className={`
                                                    flex flex-col items-start p-3 rounded border min-w-[140px] transition-all
                                                    ${isActive
                                                        ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400'
                                                        : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500 hover:text-gray-300'}
                                                `}
                                            >
                                                <Icon size={16} className="mb-2" />
                                                <span className="text-[10px] font-mono uppercase font-bold tracking-widest">{wf.name.split(' ')[0]}</span>
                                                <span className="text-[9px] truncate w-full opacity-60">{wf.name.split(' ').slice(1).join(' ')}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <span className="mono-label">Required Documents</span>
                                <div className="grid gap-4 animate-fade-in">
                                    {selectedWorkflow.inputs.map((inputDef) => {
                                        const file = inputFiles[inputDef.id];
                                        return (
                                            <div key={inputDef.id} className="relative group">
                                                {!file ? (
                                                    <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-[#333] bg-[#1a1a1a] hover:bg-[#222] hover:border-emerald-500/50 cursor-pointer transition-all">
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <IconPlus />
                                                            <p className="mt-2 text-xs text-gray-500 font-mono uppercase tracking-widest text-center px-4">
                                                                UPLOAD {inputDef.label}
                                                                {inputDef.required && <span className="text-rose-500 ml-1">*</span>}
                                                            </p>
                                                        </div>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept={inputDef.accept}
                                                            onChange={handleFileChange(inputDef.id)}
                                                        />
                                                    </label>
                                                ) : (
                                                    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#333] border-l-2 border-l-emerald-500">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <IconFile />
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-xs uppercase text-gray-500 font-mono mb-0.5">{inputDef.label}</span>
                                                                <span className="text-sm font-mono text-gray-300 truncate">{file.name}</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => removeFile(inputDef.id)} className="text-gray-600 hover:text-rose-500 shrink-0"><IconTrash /></button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
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

                    {/* RIGHT PANE - OUTPUT & CHAT */}
                    <section className="flex-[1.5] bg-[#0c0c0c] flex flex-col min-w-[500px]">

                        {/* HEADER WITH TABS */}
                        <div className="h-10 border-b border-[#333] flex items-center px-4 justify-between bg-[#111]">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setActiveTab('editor')}
                                    className={`font-mono text-xs uppercase tracking-widest pb-3 -mb-3.5 border-b-2 transition-colors ${activeTab === 'editor' ? 'text-emerald-500 border-emerald-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                                >
                                    Document Editor
                                </button>
                                <button
                                    onClick={() => setActiveTab('chat')}
                                    className={`font-mono text-xs uppercase tracking-widest pb-3 -mb-3.5 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'chat' ? 'text-emerald-500 border-emerald-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                                >
                                    Lexa Chat
                                    <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-1 rounded">BETA</span>
                                </button>
                            </div>

                            {result?.analisiPercentuale && activeTab === 'editor' && (
                                <span className={`font-mono text-xs px-2 py-0.5 ${result.analisiPercentuale.stato === 'OK' ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                                    AI SCORE: {result.analisiPercentuale.valore !== null ? `${result.analisiPercentuale.valore}%` : 'N/A'} [{result.analisiPercentuale.stato}]
                                </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-hidden relative">

                            {/* EDITOR TAB */}
                            {activeTab === 'editor' && (
                                <div className="h-full flex flex-col overflow-y-auto p-8 items-center justify-center">
                                    {!result && !isLoading && !isLoading && (
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
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 w-full border-b border-[#333] pb-8 shrink-0">
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
                                            <div className="flex-1 bg-white text-black rounded-sm overflow-hidden flex flex-col relative h-full">
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
                                            <div className="mt-4 flex gap-3 justify-end shrink-0">
                                                <DownloadPDFButton content={letterContent} fileName={`diffida_${result.dati?.codiceFiscale || 'output'}.pdf`} />
                                                <DownloadWordButton content={letterContent} fileName={`diffida_${result.dati?.codiceFiscale || 'output'}.docx`} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CHAT TAB */}
                            {activeTab === 'chat' && (
                                <ChatInterface
                                    context={letterContent || "Nessun documento processato ancora."}
                                    initialMessages={chatMessages}
                                    onMessagesUpdate={handleChatUpdate}
                                />
                            )}

                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
