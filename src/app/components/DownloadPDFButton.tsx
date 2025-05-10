"use client";
import React from "react";

export default function DownloadPDFButton({ result, formatCurrency }: { result: any, formatCurrency: (val: number) => string }) {
  async function handleDownloadPDF() {
    if (!result) return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFont("helvetica", "");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, "F");
    let y = 20;
    doc.text("Risultato rimborso cessione del quinto", 15, y);
    y += 12;
    doc.setFontSize(12);
    doc.text(`Importo rimborsabile: ${formatCurrency(result.rimborso)}`, 15, y);
    y += 16;
    doc.setFontSize(12);
    doc.text("Lettera generata:", 15, y);
    y += 10;
    const lines = doc.splitTextToSize(result.letter, 180);
    doc.text(lines, 15, y);
    doc.save("rimborso_cqs.pdf");
  }

  return (
    <button onClick={handleDownloadPDF} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
      Scarica PDF
    </button>
  );
} 