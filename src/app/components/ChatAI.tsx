"use client";
import React, { useRef, useState, useEffect } from "react";

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
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: "Sei Lexa, assistente legale AI professionale e amichevole. Presentati sempre come Lexa e rispondi in modo chiaro, rassicurante e professionale." },
    { role: "assistant", content: "Ciao! Sono Lexa, la tua assistente legale AI. Scrivimi la tua domanda, ti aiuterò subito!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileMem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function inviaMessaggio(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    
    const nuovoMessaggio: Message = { role: "user", content: input };
    let msgs = [...messages];
    
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
          <p className="text-center text-gray-400 text-sm mb-4">Consulta l'AI su questioni legali</p>
        </div>
        
        <div className="flex flex-row h-full gap-4">
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
      </div>
    </div>
  );
} 