"use client";
import React from 'react';
import Link from 'next/link';

// --- ICONS ---
const IconTerminal = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
  </svg>
);

const IconCpu = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
    <rect x="9" y="9" width="6" height="6"></rect>
    <line x1="9" y1="1" x2="9" y2="4"></line>
    <line x1="15" y1="1" x2="15" y2="4"></line>
    <line x1="9" y1="20" x2="9" y2="23"></line>
    <line x1="15" y1="20" x2="15" y2="23"></line>
    <line x1="20" y1="9" x2="23" y2="9"></line>
    <line x1="20" y1="14" x2="23" y2="14"></line>
    <line x1="1" y1="9" x2="4" y2="9"></line>
    <line x1="1" y1="14" x2="4" y2="14"></line>
  </svg>
);

const IconFileText = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#111] text-white font-mono selection:bg-emerald-500 selection:text-white">

      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-[#111]/80 backdrop-blur-md border-b border-[#333]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold tracking-tighter text-xl">LEXA</span>
            <span className="text-[10px] uppercase tracking-widest text-gray-500 border border-[#333] px-2 py-0.5 rounded-full">v2.0 Beta</span>
          </div>
          <Link href="/login" className="btn-secondary hover:text-emerald-400 hover:border-emerald-500 transition-all text-xs">
            System Access
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3333331a_1px,transparent_1px),linear-gradient(to_bottom,#3333331a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 text-emerald-500 bg-emerald-900/10 border border-emerald-900/30 px-3 py-1 rounded-full mb-6">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] uppercase tracking-widest">Neural Engine Online</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
            ADVANCED LEGAL <br />
            <span className="text-white">EXTRACTION & ANALYSIS</span>
          </h1>

          <p className="max-w-2xl mx-auto text-gray-400 text-sm md:text-base leading-relaxed mb-10">
            Automate document processing with Gemini 1.5 Flash. Extract entities, calculate refunds, and generate legal drafts in milliseconds with banking-grade precision.
          </p>

          <Link href="/login" className="btn-primary text-base px-8 py-4 inline-flex items-center gap-3 group">
            <span>Initiate Sequence</span>
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </Link>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-20 px-6 border-t border-[#333] bg-[#0c0c0c]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Feature 1 */}
            <div className="p-8 border border-[#333] bg-[#111] hover:border-emerald-500/50 transition-colors group">
              <div className="w-12 h-12 bg-[#1a1a1a] flex items-center justify-center rounded-sm mb-6 border border-[#333] group-hover:border-emerald-500/30">
                <IconTerminal />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white">OCR Extraction</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Parse scanned PDFs and images using advanced computer vision. Identifies contracts and financial statements with 99% accuracy.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 border border-[#333] bg-[#111] hover:border-emerald-500/50 transition-colors group">
              <div className="w-12 h-12 bg-[#1a1a1a] flex items-center justify-center rounded-sm mb-6 border border-[#333] group-hover:border-emerald-500/30">
                <IconCpu />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white">Math Analysis</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Automatically calculates refund amounts and residual rates based on the extracted financial data.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 border border-[#333] bg-[#111] hover:border-emerald-500/50 transition-colors group">
              <div className="w-12 h-12 bg-[#1a1a1a] flex items-center justify-center rounded-sm mb-6 border border-[#333] group-hover:border-emerald-500/30">
                <IconFileText />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white">Legal Drafting</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Generates formal demand letters (&quot;Diffida&quot;) following standard legal templates, ready for download in PDF or Word.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* TERMINAL EXAMPLE */}
      <section className="py-20 px-6 border-t border-[#333]">
        <div className="max-w-5xl mx-auto">
          <div className="bg-[#050505] border border-[#333] rounded-sm p-4 font-mono text-xs md:text-sm overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-4">
              <div className="flex gap-1.5Hook">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
              </div>
              <span className="text-gray-500 ml-2">lexa_cli — -zsh — 80x24</span>
            </div>

            <div className="space-y-2">
              <p className="text-emerald-500">➜  ~ <span className="text-white">lexa analyze --input contract_001.pdf</span></p>
              <p className="text-gray-400">[info] Initializing Neural Engine...</p>
              <p className="text-gray-400">[info] Uploading to secure enclave...</p>
              <p className="text-gray-400">[processing] OCR Extraction: 100%</p>
              <p className="text-gray-400">[processing] Context Analysis: 100%</p>
              <p className="text-emerald-500 mt-4 success-blink">✔ ANALYSIS COMPLETE</p>

              <div className="pl-4 border-l-2 border-[#333] my-4 text-gray-300">
                <p>Client: <span className="text-white">ROSSI MARIO</span></p>
                <p>DOB: <span className="text-white">12/05/1980</span></p>
                <p>Amount: <span className="text-emerald-400">€ 12.450,00</span></p>
                <p>Confidence: <span className="text-emerald-400">98.5%</span></p>
              </div>

              <p className="text-emerald-500">➜  ~ <span className="text-white animate-pulse">_</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-[#333] bg-[#0c0c0c] text-center">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-mono">
          © 2024 Lexa Systems. All rights reserved. <br />
          Engineered by Legal Tech Division.
        </p>
      </footer>

    </div>
  );
}
