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
    <div className="w-full max-w-2xl mx-auto flex flex-col">
      <AuthUser onAuth={setUser} />
      {!user ? (
        <div className="text-center text-gray-400">Effettua il login per usare la chat e caricare file.</div>
      ) : (
        <div className="flex flex-row h-[70vh] bg-[#18181b] border border-[#23232a] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Sidebar file */}
          <div className="w-56 bg-[#23232a] border-r border-[#23232a] p-4 flex flex-col gap-2">
            <div className="font-bold text-cyan-400 mb-2">File caricati</div>
            <label className="block cursor-pointer mb-2">
              <span className="text-xs text-gray-400">Aggiungi file</span>
              <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
              <div className="mt-1 px-2 py-1 bg-cyan-700 text-white rounded text-xs text-center hover:bg-cyan-600 transition cursor-pointer">{uploading ? "Caricamento..." : "Upload"}</div>
            </label>
            <div className="flex-1 overflow-y-auto">
              {files.length === 0 && <div className="text-xs text-gray-500">Nessun file</div>}
              {files.map(f => (
                <div key={f.id} className="mb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="checkbox" checked={f.selected} onChange={() => toggleFile(f.id)} />
                    <span className="truncate" title={f.name}>{f.name}</span>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline ml-1">Scarica</a>
                  </label>
                  <div className="bg-[#18181b] border border-[#333] rounded p-2 mt-1 text-xs text-gray-300 max-h-24 overflow-auto">
                    {/* Preview file */}
                    {f.name.endsWith('.txt') || f.name.endsWith('.md') || f.name.endsWith('.csv') || f.name.endsWith('.json') ? (
                      <FilePreview url={f.url} max={300} />
                    ) : f.name.endsWith('.pdf') ? (
                      <span className="italic text-gray-500">Preview non disponibile (PDF)</span>
                    ) : f.name.endsWith('.docx') ? (
                      <FilePreview url={f.url} max={300} />
                    ) : (
                      <span className="italic text-gray-500">Preview non disponibile</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {uploadError && <div className="text-xs text-red-400 mt-2">{uploadError}</div>}
          </div>
          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-[#23232a] to-[#18181b]">
              {messages.filter(m => m.role !== "system").map((msg, i) => (
                <div key={i} className={msg.role === "user" ? "text-right" : "text-left flex items-start gap-2"}>
                  <div className={
                    "inline-block px-4 py-2 rounded-lg max-w-[80%] " +
                    (msg.role === "user"
                      ? "bg-cyan-600 text-white ml-auto"
                      : "bg-[#23232a] text-gray-100 border border-cyan-700")
                  }>
                    {msg.role === "assistant" && <div className="font-bold text-cyan-300 mb-1">Lexa</div>}
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={inviaMessaggio} className="flex gap-2 p-4 bg-[#23232a] border-t border-[#23232a]">
              <input
                className="flex-1 rounded-lg px-4 py-2 bg-[#18181b] text-white border border-[#333] focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Scrivi un messaggio..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-6 py-2 rounded-lg transition"
                disabled={loading || !input.trim()}
              >
                {loading ? "..." : "Invia"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FilePreview({ url, max }: { url: string, max: number }) {
  const [text, setText] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetch(url).then(r => r.text()).then(t => setText(t.slice(0, max))).catch(() => setText(null));
  }, [url, max]);
  if (text === null) return <span className="italic text-gray-500">Caricamento preview...</span>;
  return <span>{text}{text.length === max ? '…' : ''}</span>;
} 