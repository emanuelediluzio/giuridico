"use client";
import React, { useRef, useState } from "react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export default function ChatAI() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: "Sei un assistente legale AI. Rispondi in modo chiaro e professionale." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function inviaMessaggio(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const nuovoMessaggio: Message = { role: "user", content: input };
    setMessages(msgs => [...msgs, nuovoMessaggio]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, nuovoMessaggio] })
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
    <div className="w-full max-w-2xl mx-auto flex flex-col h-[70vh] bg-[#18181b] border border-[#23232a] rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-[#23232a] to-[#18181b]">
        {messages.filter(m => m.role !== "system").map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "text-right" : "text-left"}>
            <div className={
              "inline-block px-4 py-2 rounded-lg max-w-[80%] " +
              (msg.role === "user"
                ? "bg-cyan-600 text-white ml-auto"
                : "bg-[#23232a] text-gray-100 border border-cyan-700")
            }>
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
  );
} 