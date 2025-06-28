"use client";
import React, { useRef, useState } from "react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export default function ChatAI() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: "Sei Lexa, assistente legale AI professionale e amichevole. Presentati sempre come Lexa e rispondi in modo chiaro, rassicurante e professionale." },
    { role: "assistant", content: "Ciao! Sono Lexa, la tua assistente legale AI. Scrivimi la tua domanda, ti aiuterò subito!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function inviaMessaggio(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    
    const nuovoMessaggio: Message = { role: "user", content: input };
    const msgs = [...messages];
    
    setMessages(msgs => [...msgs, nuovoMessaggio]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...msgs, nuovoMessaggio]
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Errore nella comunicazione con il server');
      }
      
      const data = await res.json();
      const risposta = data.choices?.[0]?.message?.content || "[Nessuna risposta dal modello]";
      setMessages(msgs => [...msgs, { role: "assistant", content: risposta }]);
    } catch (err) {
      console.error('Errore durante la chat:', err);
      setMessages(msgs => [...msgs, { 
        role: "assistant", 
        content: "Mi dispiace, si è verificato un errore durante l&apos;elaborazione della tua richiesta. Riprova tra qualche istante." 
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  return (
    <div className="card-lexa h-[75vh] shadow-md">
      <div className="flex flex-col h-full">
        <div className="mb-6">
          <h2 className="text-center mb-2 text-slate-800">Chat con Lexa</h2>
          <p className="text-center text-slate-500 text-sm mb-4">Consulta l&apos;AI su questioni legali</p>
        </div>
        
        <div className="flex flex-row h-full gap-4">
          {/* Chat area */}
          <div className="flex-grow flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-slate-50">
              {messages.filter(m => m.role !== "system").map((msg, i) => (
                <div key={i} className={`${msg.role === "user" ? "flex justify-end" : "flex justify-start"}`}>
                  <div className={`max-w-[75%] rounded-xl p-3 ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-white text-slate-800 border border-slate-200 shadow-sm"
                  }`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-1 pb-1 border-b border-slate-200">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-[10px] text-blue-600 font-bold">
                          L
                        </div>
                        <span className="font-medium text-blue-600 text-sm">Lexa</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={inviaMessaggio} className="p-2 border-t border-slate-200 bg-white">
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
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
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