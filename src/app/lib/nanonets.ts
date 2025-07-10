import { getDocument } from 'pdfjs-dist';

// Funzione per convertire PDF in immagini PNG (una per pagina)
async function pdfToImages(file: File): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const images: Blob[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    // @ts-expect-error: pdfjs-dist usa tipi non standard per il rendering su canvas
    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
    images.push(blob);
  }
  return images;
}

// Funzione OCR con Mistral API (route locale)
export async function estraiTestoNanonetsOCR(file: File, _hfToken: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('threshold', '50'); // Soglia di default per l'analisi percentuale
  
  // Usa la route API locale OCR Mistral
  const response = await fetch('/api/ocr-mistral', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Errore estrazione dati da Mistral OCR: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  if (result && result.ocrText) return result.ocrText;
  return '';
}

/**
 * Estrae i dati chiave (nome, codice fiscale, importo, data/luogo di nascita) dal markdown di Nanonets-OCR-s
 * @param markdown string
 * @returns { nomeCliente, codiceFiscale, importo, dataNascita, luogoNascita }
 */
export function parseNanonetsMarkdown(markdown: string): {
  nomeCliente: string;
  codiceFiscale: string;
  importo: string;
  dataNascita: string;
  luogoNascita: string;
} {
  // Regex e fallback robusti per i vari campi
  let nomeCliente = '';
  let codiceFiscale = '';
  let importo = '';
  let dataNascita = '';
  let luogoNascita = '';

  // Nome: cerca pattern tipo "Nome: ..." o "Intestatario: ..." o "Cliente: ..."
  const nomeMatch = markdown.match(/(?:Nome|Intestatario|Cliente)\s*[:\-]\s*[A-Za-zÀ-ÖØ-öø-ÿ'\s]+/i);
  if (nomeMatch && nomeMatch[0]) nomeCliente = nomeMatch[0].trim();

  // Codice fiscale: cerca pattern classico
  const cfMatch = markdown.match(/([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i);
  if (cfMatch && cfMatch[1]) codiceFiscale = cfMatch[1].toUpperCase();

  // Importo: cerca pattern tipo "Importo: 1.234,56" o "Totale: ..."
  const importoMatch = markdown.match(/(?:Importo|Totale|Rimborso)\s*[:\-]\s*([\d.]+,[\d]{2})/i);
  if (importoMatch && importoMatch[1]) importo = importoMatch[1];

  // Data di nascita: cerca pattern tipo "Data di nascita: ..." o "Nato il ..."
  const dataNascitaMatch = markdown.match(/(?:Data di nascita|Nato il)\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (dataNascitaMatch && dataNascitaMatch[1]) dataNascita = dataNascitaMatch[1];

  // Luogo di nascita: cerca pattern tipo "Luogo di nascita: ..." o "Nato a ..."
  const luogoNascitaMatch = markdown.match(/(?:Luogo di nascita|Nato a)\s*[:\-]?\s*([A-Za-zÀ-ÖØ-öø-ÿ'\s]+)/i);
  if (luogoNascitaMatch && luogoNascitaMatch[1]) luogoNascita = luogoNascitaMatch[1].trim();

  return {
    nomeCliente: nomeCliente || '',
    codiceFiscale: codiceFiscale || '',
    importo: importo || '',
    dataNascita: dataNascita || '',
    luogoNascita: luogoNascita || ''
  };
}

/**
 * Estrae dati strutturati usando l'analisi avanzata di Mistral
 * @param file File da analizzare
 * @returns Dati estratti con analisi percentuale
 */
export async function estraiDatiMistral(file: File): Promise<{
  ocrText: string;
  analisiPercentuale: { valore: number; stato: string };
  datiEstratti: {
    nomeCliente: string;
    codiceFiscale: string;
    importo: string;
    dataNascita: string;
    luogoNascita: string;
  };
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('threshold', '50');
  
  const response = await fetch('/api/ocr-mistral', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Errore analisi Mistral: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  const ocrText = result.ocrText || '';
  const analisiPercentuale = result.result || { valore: 0, stato: 'NO' };
  
  // Estrai dati dal testo OCR usando la funzione esistente
  const datiEstratti = parseNanonetsMarkdown(ocrText);
  
  return {
    ocrText,
    analisiPercentuale,
    datiEstratti
  };
} 