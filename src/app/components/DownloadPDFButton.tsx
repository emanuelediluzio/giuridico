"use client";
import React from "react";
import html2pdf from 'html2pdf.js';
import MarkdownIt from 'markdown-it';

interface DownloadPDFButtonProps {
  content: string;
  fileName: string;
}

export default function DownloadPDFButton({ content, fileName }: DownloadPDFButtonProps) {
  async function handleDownloadPDF() {
    if (!content) return;

    const md = new MarkdownIt({
      html: true,        // Permette tag HTML nel markdown (se presenti)
      linkify: true,     // Autolink URL
      typographer: true, // Abilita alcune sostituzioni tipografiche intelligenti
      breaks: true       // Converte '\n' in <br> nel testo sorgente
    });

    // Converte il testo semplice (con \n per le nuove righe) in HTML
    const htmlContent = md.render(content);

    // HTML finale con stili inline per il PDF
    const finalStyledHtml = `
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.6;
          text-align: justify;
        }
        p, div { /* Assicura che anche i div generici abbiano questi stili se md.render non wrappa tutto in p */
          margin-bottom: 0.5em; /* Spazio tra "paragrafi" o blocchi di testo */
        }
        /* Puoi aggiungere altri stili CSS qui se necessario */
      </style>
      <div>
        ${htmlContent}
      </div>
    `;

    const options = {
      margin: 20, // Margine uniforme di 20mm (può essere un array [top, left, bottom, right])
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false }, // Aumenta scala per qualità, disabilita logging console
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'avoid-all'] } // Evita interruzioni dentro elementi, rispetta CSS page-break
    };

    html2pdf().from(finalStyledHtml).set(options).save();
  }

  return (
    <button 
      onClick={handleDownloadPDF} 
      className="btn-primary flex items-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Scarica PDF
    </button>
  );
} 