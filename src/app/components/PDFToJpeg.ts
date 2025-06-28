"use client";

export async function pdfToSingleJpegBase64(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/build/pdf');
  const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
  // @ts-expect-error - pdfjs-dist types issue
  (pdfjsLib as unknown).GlobalWorkerOptions.workerSrc = pdfjsWorker.default || pdfjsWorker;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCanvases: HTMLCanvasElement[] = [];
  let totalHeight = 0;
  let maxWidth = 0;

  for (let i = 1; i <= (pdf as { numPages: number }).numPages; i++) {
    const page = await (pdf as { getPage: (num: number) => Promise<unknown> }).getPage(i);
    const viewport = (page as { getViewport: (opts: { scale: number }) => { width: number; height: number } }).getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    await (page as { render: (opts: { canvasContext: CanvasRenderingContext2D, viewport: { width: number, height: number } }) => { promise: Promise<void> } }).render({ canvasContext: context!, viewport }).promise;
    pageCanvases.push(canvas);
    totalHeight += canvas.height;
    maxWidth = Math.max(maxWidth, canvas.width);
  }

  // Crea un canvas unico per tutte le pagine
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = maxWidth;
  finalCanvas.height = totalHeight;
  const finalCtx = finalCanvas.getContext('2d');

  let y = 0;
  for (const canvas of pageCanvases) {
    finalCtx!.drawImage(canvas, 0, y);
    y += canvas.height;
  }

  // Esporta come JPEG base64
  return finalCanvas.toDataURL('image/jpeg', 0.92); // 92% qualità
} 