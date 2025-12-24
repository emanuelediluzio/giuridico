"use client";

import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export interface ChatMessage {
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
}

interface ChatInterfaceProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    onApplyCode: (code: string) => void;
    isProcessing: boolean;
}

export default function ChatInterface({ messages, onSendMessage, onApplyCode, isProcessing }: ChatInterfaceProps) {
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;
        onSendMessage(input);
        setInput("");
    };

    // Helper to extract code blocks from assistant messages
    const renderMessageContent = (msg: ChatMessage) => {
        if (msg.role === 'user') return <div className="text-sm whitespace-pre-wrap">{msg.content}</div>;

        // Assistant: Handle generic text + code blocks
        // We use ReactMarkdown but with custom renderer for code to add "Apply" button
        return (
            <div className="text-sm prose prose-invert max-w-none">
                <ReactMarkdown
                    components={{
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        code({ inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeContent = String(children).replace(/\n$/, '');

                            return !inline ? (
                                <div className="relative group my-2">
                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(codeContent);
                                            }}
                                            className="bg-gray-700 hover:bg-gray-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm border border-[#444]"
                                            title="Copy code"
                                        >
                                            Copy
                                        </button>
                                        <button
                                            onClick={() => onApplyCode(codeContent)}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm"
                                            title="Apply this code to editor"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                    <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={match ? match[1] : 'text'}
                                        PreTag="div"
                                        {...props}
                                    >
                                        {codeContent}
                                    </SyntaxHighlighter>
                                </div>
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            );
                        }
                    }}
                >
                    {msg.content}
                </ReactMarkdown>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#111] border-l border-[#333]">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4 opacity-50">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <div className="text-xs uppercase tracking-widest text-center">
                            Lexa AI<br />
                            <span className="text-[10px] normal-case opacity-75">Chiedimi di modificare, formattare o<br />generare nuovo contenuto.</span>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-lg p-3 ${msg.role === 'user'
                                ? 'bg-[#222] text-white border border-[#333]'
                                : 'bg-transparent text-gray-300 pl-0'
                                }`}>
                                <div className="text-[10px] uppercase tracking-widest font-bold mb-1 opacity-50">
                                    {msg.role === 'user' ? 'Tu' : 'Lexa'}
                                </div>
                                {renderMessageContent(msg)}
                            </div>
                        </div>
                    ))
                )}
                {isProcessing && (
                    <div className="flex justify-start">
                        <div className="max-w-[85%] pl-0">
                            <div className="flex space-x-1 items-center h-6">
                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[#333] bg-[#111]">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Chiedi modifiche al documento..."
                        className="flex-1 bg-[#1a1a1a] border border-[#333] text-white text-sm px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors rounded-none placeholder-gray-600"
                        disabled={isProcessing}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isProcessing}
                        className="bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-white px-4 font-bold uppercase text-xs tracking-wider transition-colors"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
