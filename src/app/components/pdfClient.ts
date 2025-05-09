"use client";
import { PDFDocument } from 'pdf-lib';

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  let text = '';
  const pages = pdfDoc.getPages();
  for (const [i, page] of pages.entries()) {
    // pdf-lib non supporta estrazione testo nativa, quindi mostriamo solo info pagina
    const { width, height } = page.getSize();
    text += `Pagina ${i + 1} (${width}x${height})\n[Estrazione testo avanzata non supportata]\n`;
  }
  return text;
} 