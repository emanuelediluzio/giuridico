declare module 'pdfjs-dist/build/pdf' {
  export const getDocument: (options: { data: ArrayBuffer }) => { promise: Promise<unknown> };
}
declare module 'pdfjs-dist/build/pdf.worker.entry'; 