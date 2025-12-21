"use client";
import React, { useEffect, useState } from 'react';

interface NewsItem {
    id: string;
    title: string;
    link: string;
    date: string;
    source: string;
}

export default function RegulatoryFeed() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await fetch('/api/feed');
                const data = await res.json();
                if (data.success) {
                    setNews(data.news);
                }
            } catch (err) {
                console.error("Failed to load feed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, []);

    return (
        <div className="flex flex-col h-full bg-[#0c0c0c]">
            <div className="p-4 border-b border-[#333] shrink-0 bg-[#0c0c0c] z-10">
                <h3 className="text-[10px] text-emerald-500 uppercase tracking-widest font-mono">
                    Regulatory Monitor
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-3">
                {loading ? (
                    <div className="text-[10px] text-gray-500 font-mono animate-pulse">Scanning external protocols...</div>
                ) : (
                    news.map((item) => (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" key={item.id} className="block group">
                            <div className="flex justify-between items-start">
                                <span className="text-[9px] text-gray-500 font-mono border border-[#333] px-1 rounded-xs truncate max-w-[80px]">{item.source}</span>
                                <span className="text-[9px] text-gray-600 font-mono">{new Date(item.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
                            </div>
                            <p className="text-xs text-gray-300 mt-1 hover:text-emerald-400 transition-colors line-clamp-2 leading-tight">
                                {item.title}
                            </p>
                        </a>
                    ))
                )}
            </div>

            <div className="p-2 border-t border-[#222] shrink-0 bg-[#0c0c0c]">
                <div className="flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest">Live Feed Active</span>
                </div>
            </div>
        </div>
    );
}
