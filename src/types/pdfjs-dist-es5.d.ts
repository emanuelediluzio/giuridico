declare module 'pdfjs-dist/es5/build/pdf.js' {
  export const GlobalWorkerOptions: {
    workerSrc: string | undefined;
  };
  export function getDocument(params: { data: ArrayBuffer }): { promise: Promise<unknown> };
} 