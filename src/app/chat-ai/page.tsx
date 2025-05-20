import React from "react";
import ChatAI from "../components/ChatAI";

export const metadata = {
  title: "Chat AI - Lexa",
  description: "Chatta con Lexa, l'assistente legale AI professionale. Fai domande legali e ricevi risposte immediate!"
};

export default function ChatAIPagina() {
  return (
    <main className="min-h-[90vh] flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-sky-100 py-10">
      <div className="w-full max-w-2xl mx-auto mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-700 mb-2 drop-shadow-sm">Chat AI - Lexa</h1>
        <p className="text-lg md:text-xl text-slate-600 mb-4">Fai domande legali e ricevi risposte professionali e immediate dall'assistente AI Lexa.</p>
        <div className="flex justify-center mb-2">
          <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">Powered by Mistral AI</span>
        </div>
      </div>
      <div className="w-full max-w-2xl">
        <ChatAI />
      </div>
    </main>
  );
} 