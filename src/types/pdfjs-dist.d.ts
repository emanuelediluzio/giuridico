declare module 'pdfjs-dist/legacy/build/pdf.js' {
  interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  interface PDFPageProxy {
    getTextContent(): Promise<TextContent>;
  }

  interface TextContent {
    items: TextItem[];
  }

  interface TextItem {
    str: string;
  }

  interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  interface GetDocumentParams {
    data: ArrayBuffer;
  }

  export function getDocument(params: GetDocumentParams): PDFDocumentLoadingTask;

  export const GlobalWorkerOptions: {
    workerSrc: string | undefined;
  };

  export const version: string;
} 