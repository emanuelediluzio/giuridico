declare module 'html2pdf.js' {
  const html2pdf: (element: HTMLElement, options?: unknown) => Promise<void>;
  export default html2pdf;
} 