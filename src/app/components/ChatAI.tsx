"use client";
import React, { useRef, useState, useEffect } from "react";
import { storage, db } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import AuthUser from './AuthUser';
import { User } from 'firebase/auth';

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface FileMem {
  id: string;
  name: string;
  url: string;
  selected: boolean;
}

const MOCK_USER_ID = "user-demo-1";

export default function ChatAI() {
  const [user, setUser] = useState<User|null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: "Sei Lexa, assistente legale AI professionale e amichevole. Presentati sempre come Lexa e rispondi in modo chiaro, rassicurante e professionale." },
    { role: "assistant", content: "Ciao! Sono Lexa, la tua assistente legale AI. Carica un documento o scrivimi la tua domanda, ti aiuterò subito!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileMem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carica lista file da Firestore
  async function fetchFiles(uid: string) {
    const q = query(
      collection(db, "files"),
      where("userId", "==", uid),
      orderBy("timestampCaricamento", "desc")
    );
    const snap = await getDocs(q);
    setFiles(
      snap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().nomeOriginale,
        url: doc.data().urlDownload,
        selected: true
      }))
    );
  }

  useEffect(() => {
    if (user?.uid) fetchFiles(user.uid);
    // eslint-disable-next-line
  }, [user]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user) return;
    setUploadError(null);
    const fileList = e.target.files;
    if (!fileList) return;
    if (files.length + fileList.length > 5) {
      setUploadError("Puoi caricare al massimo 5 file.");
      return;
    }
    setUploading(true);
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > 2 * 1024 * 1024) {
        setUploadError(`Il file ${file.name} supera il limite di 2MB.`);
        setUploading(false);
        return;
      }
      const storageRef = ref(storage, `files/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "files"), {
        fileId: storageRef.name,
        userId: user.uid,
        nomeOriginale: file.name,
        urlDownload: url,
        timestampCaricamento: Timestamp.now(),
        mimeType: file.type
      });
    }
    setUploading(false);
    fetchFiles(user.uid);
    e.target.value = "";
  }

  function toggleFile(id: string) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
  }

  async function inviaMessaggio(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    // Prepara la memoria file (scarica testo dai file selezionati)
    let memory = "";
    for (const f of files.filter(f => f.selected)) {
      try {
        const res = await fetch(f.url);
        const text = await res.text();
        memory += `[${f.name}]: ${text.slice(0, 10000)}\n\n`;
      } catch {}
    }
    const nuovoMessaggio: Message = { role: "user", content: input };
    let msgs = [...messages];
    if (memory) {
      msgs = [
        { role: "system", content: `Sei un assistente legale AI. Hai accesso ai seguenti file caricati dall'utente. Memory:\n${memory}` },
        ...messages.filter(m => m.role !== "system")
      ];
    }
    setMessages(msgs => [...msgs, nuovoMessaggio]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...msgs, nuovoMessaggio] })
      });
      const data = await res.json();
      const risposta = data.choices?.[0]?.message?.content || "[Nessuna risposta dal modello]";
      setMessages(msgs => [...msgs, { role: "assistant", content: risposta }]);
    } catch (err) {
      setMessages(msgs => [...msgs, { role: "assistant", content: "[Errore di rete o server]" }]);
    }
    setLoading(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  return (
    <div className="card-lexa h-[75vh]">
      <div className="flex flex-col h-full">
        <div className="mb-6">
          <h2 className="text-center mb-2">Chat con Lexa</h2>
          <p className="text-center text-gray-400 text-sm mb-4">Consulta l'AI su questioni legali o carica documenti per analisi</p>
          
          <div className="w-full flex justify-center mb-2">
            <AuthUser onAuth={setUser} />
          </div>
        </div>
        
        {!user ? (
          <div className="flex-grow flex items-center justify-center text-center text-gray-400 p-6 border border-dashed border-white/10 rounded-lg">
            Effettua il login per accedere alla chat e caricare documenti per l'analisi
          </div>
        ) : (
          <div className="flex flex-row h-full gap-4">
            {/* Sidebar file */}
            <div className="w-64 shrink-0 flex flex-col bg-[#18181b]/70 rounded-lg border border-white/5 overflow-hidden">
              <div className="p-3 border-b border-white/10 bg-[#23232a]">
                <h3 className="text-sm font-medium text-cyan-400 mb-1">File caricati</h3>
                <label className="block cursor-pointer">
                  <div className={`px-3 py-2 rounded text-sm text-center ${uploading 
                    ? "bg-gray-700 text-gray-300 cursor-not-allowed" 
                    : "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white hover:from-cyan-500 hover:to-cyan-600 transition-all"
                  }`}>
                    {uploading ? "Caricamento..." : "Carica file"}
                  </div>
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                {uploadError && (
                  <div className="mt-2 text-xs text-red-400 bg-red-900/20 rounded p-2 border border-red-800/40">
                    {uploadError}
                  </div>
                )}
              </div>
              
              <div className="flex-grow p-2 overflow-y-auto">
                {files.length === 0 && (
                  <div className="text-center text-gray-500 text-sm p-4">
                    Nessun file caricato
                  </div>
                )}
                
                {files.map(file => (
                  <div key={file.id} className="mb-2">
                    <div className="flex items-center justify-between p-2 bg-[#23232a]/50 rounded">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input 
                          type="checkbox" 
                          checked={file.selected} 
                          onChange={() => toggleFile(file.id)}
                          className="rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="truncate max-w-[120px]" title={file.name}>
                          {file.name}
                        </span>
                      </label>
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    </div>
                    
                    {/* Preview */}
                    <div className="text-xs bg-[#18181b] border border-white/5 rounded mt-1 p-2 text-gray-400 max-h-20 overflow-auto">
                      {file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv') || file.name.endsWith('.json') ? (
                        <FilePreview url={file.url} max={200} />
                      ) : file.name.endsWith('.pdf') ? (
                        <span className="italic text-gray-500">Preview PDF non disponibile</span>
                      ) : (
                        <span className="italic text-gray-500">Preview non disponibile</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Chat area */}
            <div className="flex-grow flex flex-col border border-white/10 rounded-lg overflow-hidden bg-gradient-to-b from-[#23232a]/70 to-[#18181b]">
              <div className="flex-grow overflow-y-auto p-5 space-y-4">
                {messages.filter(m => m.role !== "system").map((msg, i) => (
                  <div key={i} className={`${msg.role === "user" ? "flex justify-end" : "flex justify-start"}`}>
                    <div className={`max-w-[75%] rounded-xl p-3 ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-cyan-800/70 to-cyan-700/50 text-white border border-cyan-600/30"
                        : "bg-[#23232a] text-gray-100 border border-white/5"
                    }`}>
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-1 pb-1 border-b border-white/10">
                          <div className="w-6 h-6 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                            L
                          </div>
                          <span className="font-medium text-cyan-400 text-sm">Lexa</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              <form onSubmit={inviaMessaggio} className="p-2 border-t border-white/10 bg-[#23232a]">
                <div className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Scrivi un messaggio..."
                    className="input-lexa pr-24"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className={`absolute right-1 top-1 bottom-1 px-4 rounded-lg transition-all ${
                      !input.trim() || loading
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white hover:from-cyan-500 hover:to-cyan-600"
                    }`}
                  >
                    {loading ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <span>Invia</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilePreview({ url, max }: { url: string, max: number }) {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function fetchText() {
      try {
        const res = await fetch(url);
        const fullText = await res.text();
        setText(fullText.slice(0, max));
        setLoading(false);
      } catch (err) {
        setError("Errore nel caricamento");
        setLoading(false);
      }
    }
    fetchText();
  }, [url, max]);

  if (loading) return <span>Caricamento...</span>;
  if (error) return <span className="text-red-400">{error}</span>;
  return <span>{text}{text.length >= max && "..."}</span>;
} 