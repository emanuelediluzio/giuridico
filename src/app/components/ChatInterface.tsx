"use client";
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

import { Message } from '@/lib/firestore';

interface ChatInterfaceProps {
    context: string; // The text of the document/letter currently being edited
    initialMessages?: Message[];
    onMessagesUpdate?: (messages: Message[]) => void;
}

const DEFAULT_MESSAGE: Message = { role: 'assistant', content: 'Ciao! Sono Lexa Chat. Come posso aiutarti con questo documento?' };

export default function ChatInterface({ context, initialMessages = [], onMessagesUpdate }: ChatInterfaceProps) {

    // Initialize with props or default. 
    // IMPORTANT: If initialMessages changes (e.g. switching history), we must update state.
    const [messages, setMessages] = useState<Message[]>(
        initialMessages.length > 0 ? initialMessages : [DEFAULT_MESSAGE]
    );

    // Sync state when prop changes (loading history)
    useEffect(() => {
        if (initialMessages.length > 0) {
            setMessages(initialMessages);
        } else {
            // If expressly empty (reset), revert to default? Or keep empty? 
            // Usually switching to a new doc might pass empty array.
            setMessages([DEFAULT_MESSAGE]);
        }
    }, [initialMessages]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Notify parent on change
    useEffect(() => {
        if (onMessagesUpdate) {
            onMessagesUpdate(messages);
        }
    }, [messages, onMessagesUpdate]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: 'user', content: input };

        // Optimistic update
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Add system context if provided
            const systemMsg = {
                role: 'system',
                content: `You are Lexa Chat, an advanced AI legal assistant.
                CONTEXT: "${context || "No document loaded."}"
                Answer professionally in Italian.`
            };

            const fullHistory = [systemMsg, ...history, userMsg];

            const response = await puter.ai.chat(fullHistory, {
                model: 'gemini-2.5-flash'
            });

            let text = "";
            if (typeof response === 'string') {
                text = response;
            } else if (typeof response === 'object' && response !== null && 'message' in response) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                text = (response as any).message?.content || JSON.stringify(response);
            } else {
                text = JSON.stringify(response);
            }

            setMessages(prev => [...prev, { role: 'assistant', content: text }]);

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Ops, errore di connessione (Client-side).' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#111] text-white">
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-[85%] rounded-lg p-3 text-sm leading-relaxed
                            ${m.role === 'user'
                                ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-100'
                                : 'bg-[#222] border border-[#333] text-gray-200'}
                        `}>
                            {m.role === 'assistant' ? (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>
                                        {m.content}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                m.content
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-[#222] border border-[#333] rounded-lg p-3 flex gap-2 items-center">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-[#333] bg-[#1a1a1a]">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Chiedi a Lexa..."
                        className="flex-1 bg-[#000] border border-[#333] rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-600"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-xs font-mono uppercase tracking-widest transition-colors disabled:opacity-50"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
