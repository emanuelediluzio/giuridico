"use client";

export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/build/pdf');
  const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
  // @ts-expect-error - pdfjs-dist types issue
  (pdfjsLib as unknown).GlobalWorkerOptions.workerSrc = pdfjsWorker.default || pdfjsWorker;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= (pdf as { numPages: number }).numPages; i++) {
    const page = await (pdf as { getPage: (num: number) => Promise<unknown> }).getPage(i);
    const textContent = await (page as { getTextContent: () => Promise<{ items: { str: string }[] }> }).getTextContent();
    const pageText = textContent.items.map((item: { str: string }) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
} 