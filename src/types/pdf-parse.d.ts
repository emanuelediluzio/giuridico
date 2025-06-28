declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    numrender: number;
    info: {
      PDFFormatVersion: string;
      IsAcroFormPresent: boolean;
      IsXFAPresent: boolean;
      [key: string]: unknown;
    };
    metadata: unknown;
    version: string;
  }

  interface PDFOptions {
    pagerender?: (pageData: unknown) => unknown;
    max?: number;
    version?: string;
  }

  function PDFParse(dataBuffer: Buffer | ArrayBuffer, options?: PDFOptions): Promise<PDFData>;
  export = PDFParse;
} 