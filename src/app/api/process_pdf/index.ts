import pdfParse from 'pdf-parse';

export async function extractTextFromPDF(file: File, useMistralOcr: boolean = false): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (useMistralOcr) {
      // Per ora usiamo pdf-parse anche per i file che richiederebbero OCR
      // TODO: Implementare l'OCR con Mistral quando sarà disponibile
      const data = await pdfParse(buffer);
      return data.text;
    } else {
      const data = await pdfParse(buffer);
      return data.text;
    }
  } catch (error) {
    console.error('Errore durante l\'estrazione del testo:', error);
    throw new Error('Errore durante l\'estrazione del testo dal PDF');
  }
} 