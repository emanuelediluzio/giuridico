"use client";
import React from 'react';
import { MOCK_NEWS } from '@/types/lexa';

export default function RegulatoryFeed() {
    return (
        <div className="border-t border-[#333] p-4">
            <h3 className="text-[10px] text-emerald-500 uppercase tracking-widest mb-3 font-mono">
                Regulatory Monitor
            </h3>
            <div className="space-y-3">
                {MOCK_NEWS.map((item) => (
                    <div key={item.id} className="group cursor-pointer">
                        <div className="flex justify-between items-start">
                            <span className="text-[9px] text-gray-500 font-mono border border-[#333] px-1 rounded-xs">{item.source}</span>
                            <span className="text-[9px] text-gray-600 font-mono">{item.date}</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1 hover:text-emerald-400 twitter-tweet transition-colors line-clamp-2">
                            {item.title}
                        </p>
                    </div>
                ))}
            </div>
            <div className="mt-3 pt-2 text-center">
                <button className="text-[9px] text-gray-600 hover:text-white uppercase tracking-widest transition-colors">
                    View All Updates
                </button>
            </div>
        </div>
    );
}
