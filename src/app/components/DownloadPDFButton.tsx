"use client";
import React from "react";

interface DownloadPDFButtonProps {
  content: string;
  fileName: string;
}

export default function DownloadPDFButton({ content, fileName }: DownloadPDFButtonProps) {
  async function handleDownloadPDF() {
    if (!content) return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFont("helvetica", "");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Margini (in mm)
    const margin = 20;
    const maxLineWidth = pageWidth - margin * 2;
    let currentY = margin;
    const lineHeightFactor = 1.4; // Aumenta per più spazio tra le linee
    const fontSize = 12;
    doc.setFontSize(fontSize);

    // Rimuoviamo il rettangolo bianco, non è necessario se il contenuto riempie la pagina
    // doc.setFillColor(255, 255, 255);
    // doc.rect(0, 0, pageWidth, pageHeight, "F"); 

    const lines = doc.splitTextToSize(content, maxLineWidth);

    lines.forEach((line: string) => {
      // Calcola l'altezza della linea corrente
      const lineHeight = fontSize * lineHeightFactor / doc.internal.scaleFactor; // Altezza effettiva in mm
      
      if (currentY + lineHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin; // Reset Y per la nuova pagina
      }
      doc.text(line, margin, currentY);
      currentY += lineHeight;
    });

    doc.save(fileName);
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