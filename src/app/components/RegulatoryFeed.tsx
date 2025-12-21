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
        <div className="border-t border-[#333] p-4">
            <h3 className="text-[10px] text-emerald-500 uppercase tracking-widest mb-3 font-mono">
                Regulatory Monitor
            </h3>

            <div className="space-y-3">
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

            <div className="mt-3 pt-2 text-center border-t border-[#222]">
                <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest">Live Feed Active</span>
                </div>
            </div>
        </div>
    );
}
