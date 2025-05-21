"use client";

// Funzione per attendere che pdfjsLib sia disponibile su window
function waitForPdfjsLib(): Promise<any> {
  return new Promise(resolve => {
    if (typeof window !== 'undefined' && (window as any).pdfjsLib) return resolve((window as any).pdfjsLib);
    const check = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
        clearInterval(check);
        resolve((window as any).pdfjsLib);
      }
    }, 50);
  });
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/build/pdf');
  // @ts-ignore
  const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
  // @ts-ignore
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorker.default || pdfjsWorker;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
} 