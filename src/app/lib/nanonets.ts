// getDocument removed


// Funzione OCR con Mistral API (route locale)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function estraiTestoNanonetsOCR(file: File, _hfToken: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('threshold', '50'); // Soglia di default per l'analisi percentuale

  // Usa la route API locale OCR Gemini
  const response = await fetch('/api/ocr-gemini', {
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

  const response = await fetch('/api/ocr-gemini', {
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