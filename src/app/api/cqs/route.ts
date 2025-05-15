import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";

export const maxDuration = 55; // Vercel Hobby plan max duration

const logMessage = (message: string, data?: any) => {
  // Basic logger, replace with a more robust solution in production
  console.log(`[API CQS] ${message}`, data || ""); 
};

// Helper function to extract text from a PDF using pdf-parse
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    logMessage("Inizio estrazione testo da PDF con pdf-parse", { name: file.name, size: file.size, type: file.type });
    const arrayBuffer = await file.arrayBuffer();
    const data = await pdfParse(Buffer.from(arrayBuffer));
    logMessage("Testo estratto con pdf-parse", { length: data.text.length });
    return data.text;
  } catch (error) {
    logMessage("Errore durante estrazione testo da PDF con pdf-parse", error);
    return ""; // Return empty string or handle error as needed
  }
}

// Updated function to extract text from a PDF using Mistral OCR API
async function extractTextWithMistralOcr(file: File, apiKey: string): Promise<string> {
  if (!file) {
    logMessage("File del contratto non fornito per OCR Mistral.");
      return "";
    }
  if (!apiKey) {
    logMessage("API Key Mistral non fornita per OCR.");
    return "Errore: MISTRAL_API_KEY non configurata.";
  }

  logMessage("Inizio estrazione testo da PDF con Mistral OCR", { name: file.name, size: file.size, type: file.type });

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64Pdf = Buffer.from(arrayBuffer).toString('base64');
    const documentUrl = `data:application/pdf;base64,${base64Pdf}`;

    const OCR_API_URL = "https://api.mistral.ai/v1/ocr";

    const response = await fetch(OCR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: {
          type: "document_url",
          document_url: documentUrl,
        },
        // include_image_base64: false, // Optional, default is likely false
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logMessage(`Errore API OCR Mistral: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Mistral OCR API error: ${response.status} ${errorBody}`);
    }

    const ocrResult = await response.json();
    
    if (ocrResult && ocrResult.pages && Array.isArray(ocrResult.pages)) {
      const markdownText = ocrResult.pages.map((page: any) => page.markdown || "").join("\n\n");
      logMessage("Testo estratto con Mistral OCR", { length: markdownText.length });
      return markdownText;
    } else {
      logMessage("Risposta OCR Mistral non valida o senza pagine.", ocrResult);
      return "";
    }

  } catch (error) {
    logMessage("Errore durante estrazione testo con Mistral OCR", error);
    // Consider returning a specific error message or re-throwing if critical
    return `Errore durante l'OCR del contratto: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Funzione per limitare la dimensione del testo mantenendo le parti più significative
function trimDocumentText(text: string, maxLength = 10000): string {
  if (!text || text.length <= maxLength) return text;
  
  // Prendiamo l'inizio (prime 2/5 del maxLength)
  const startLength = Math.floor(maxLength * 0.4);
  const start = text.substring(0, startLength);
  
  // Prendiamo la parte centrale (1/5 del maxLength)
  const middleStart = Math.floor(text.length / 2) - Math.floor(maxLength * 0.1);
  const middleLength = Math.floor(maxLength * 0.2);
  const middle = text.substring(middleStart, middleStart + middleLength);
  
  // Prendiamo la fine (ultime 2/5 del maxLength)
  const endStart = text.length - Math.floor(maxLength * 0.4);
  const end = text.substring(endStart);
  
  return `${start}\n\n[...testo omesso per limitazioni di dimensione...]\n\n${middle}\n\n[...testo omesso per limitazioni di dimensione...]\n\n${end}`;
}

// Funzione per processare il prompt e chiamare Mistral API
async function processWithMistralChat(contractText: string, statementText: string, templateText: string, MISTRAL_API_KEY: string, filesInfo: any): Promise<any> {
  // Versione più compatta del sistema prompt
  const SYSTEM_PROMPT = `
Sei un assistente legale specializzato in Cessioni del Quinto dello Stipendio (CQS). Analizza tre documenti:
1. CONTRATTO CQS: Estrai dati anagrafici, dettagli finanziamento (importo, rate, TAN, TAEG), info assicurative.
2. CONTEGGIO ESTINTIVO: Estrai data, debito residuo, interessi, commissioni, importo estinzione.
3. TEMPLATE LETTERA: Usa questo template per creare la lettera di diffida.

OBBIETTIVI:
1. Calcola: interessi non goduti, premi assicurativi non goduti, commissioni non maturate, totale rimborso.
2. Compila la lettera di diffida usando il template e i dati estratti.

Output: JSON con "letteraDiffidaCompleta", "datiEstratti", "calcoliEffettuati", "logAnalisi".
`;

  // Limitiamo la dimensione dei testi per ridurre il prompt
  const trimmedContractText = trimDocumentText(contractText, 10000);
  const trimmedStatementText = trimDocumentText(statementText, 10000);
  const trimmedTemplateText = templateText.length > 5000 ? 
    templateText.substring(0, 5000) : templateText;
    
  logMessage("Dimensioni testi ridotte:", {
    contractOriginal: contractText.length,
    contractTrimmed: trimmedContractText.length,
    statementOriginal: statementText.length,
    statementTrimmed: trimmedStatementText.length,
    templateOriginal: templateText.length,
    templateTrimmed: trimmedTemplateText.length
  });

  const userPrompt = `Analizza questi documenti e genera la lettera di diffida:

<contratto_cqs>
${trimmedContractText || "Contenuto non disponibile."}
</contratto_cqs>

<conteggio_estintivo>
${trimmedStatementText || "Contenuto non disponibile."}
</conteggio_estintivo>

<template_lettera>
${trimmedTemplateText || "Contenuto non disponibile."}
</template_lettera>`;

  logMessage("Prompt per Mistral AI:", { 
    system: SYSTEM_PROMPT.length, 
    user: userPrompt.length,
    totale: SYSTEM_PROMPT.length + userPrompt.length
  });
  
  const CHAT_API_URL = "https://api.mistral.ai/v1/chat/completions";

  const apiRequestBody = {
    model: "mistral-medium-latest",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 8000,
    temperature: 0.1
  };

  logMessage("Invio richiesta a Mistral Chat API...");
  // Utilizziamo un timeout più stretto (40 secondi) per lasciare tempo di processare la risposta
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 40000);
  
  try {
    const mistralResponse = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify(apiRequestBody),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    logMessage("Risposta da Mistral Chat API ricevuta", { status: mistralResponse.status });

    if (!mistralResponse.ok) {
      const errorBody = await mistralResponse.text();
      logMessage("Errore dalla Mistral Chat API", {
        status: mistralResponse.status,
        body: errorBody,
      });
      return {
        error: "Errore dalla Mistral API",
        details: errorBody,
        filesInfo
      };
    }

    const result = await mistralResponse.json();
    logMessage("Risultato JSON da Mistral Chat API parsato.");

    const contentString = result.choices[0].message.content;
    
    if (!contentString || contentString.trim() === '') {
      logMessage("Mistral ha restituito una risposta vuota o solo spazi/tab");
      return {
        error: "Mistral ha restituito una risposta vuota o malformata.",
        details: "La risposta contiene solo spazi o è vuota. Prova a ridurre la dimensione dei documenti.",
        filesInfo
      };
    }
    
    logMessage("Primi 100 caratteri della risposta:", contentString.substring(0, 100));
    
    try {
      const parsedContent = JSON.parse(contentString);
      logMessage("Contenuto del messaggio parsato con successo.");
      
      // Adattiamo la risposta al formato che si aspetta il frontend
      const adaptedResponse = {
        lettera: typeof parsedContent.letteraDiffidaCompleta === 'string' 
          ? parsedContent.letteraDiffidaCompleta 
          : formatLetter(parsedContent.letteraDiffidaCompleta),
        calcoli: `CALCOLI ESTRATTI:
        
${typeof parsedContent.calcoliEffettuati === 'string' 
  ? parsedContent.calcoliEffettuati 
  : JSON.stringify(parsedContent.calcoliEffettuati, null, 2)}

DATI ESTRATTI:

${JSON.stringify(parsedContent.datiEstratti || {}, null, 2)}

${parsedContent.logAnalisi ? '\nNOTE ANALISI:\n' + (typeof parsedContent.logAnalisi === 'object' ? JSON.stringify(parsedContent.logAnalisi, null, 2) : parsedContent.logAnalisi) : ''}`,
      };
      
      return adaptedResponse;
    } catch (e) {
      logMessage("Errore nel parsing del contenuto del messaggio JSON da Mistral", { 
        error: e, 
        contentPreview: contentString.substring(0, 200)
      });
      
      return {
        error: "Errore nel parsing della risposta JSON da Mistral.",
        letteraDiffidaCompleta: "Errore nella generazione della lettera. Si prega di riprovare.",
        calcoli: "È stato possibile estrarre correttamente i testi dai documenti:\n" +
                `- Contratto: ${contractText.length} caratteri\n` +
                `- Conteggio estintivo: ${statementText.length} caratteri\n` +
                `- Template: ${templateText.length} caratteri\n\n` +
                "Ma si è verificato un errore nell'elaborazione finale."
      };
    }
  } catch (fetchError: any) {
    clearTimeout(timeoutId);
    logMessage("Errore durante la chiamata a Mistral API", fetchError);
    
    if (fetchError.name === 'AbortError') {
      return {
        error: "Timeout nella richiesta a Mistral API. L'elaborazione richiede troppo tempo.",
        calcoli: "È stato possibile estrarre correttamente i testi dai documenti:\n" +
                `- Contratto: ${contractText.length} caratteri\n` +
                `- Conteggio estintivo: ${statementText.length} caratteri\n` +
                `- Template: ${templateText.length} caratteri\n\n` +
                "Ma l'elaborazione è stata interrotta per timeout. Prova con documenti più piccoli."
      };
    }
    
    return {
      error: "Errore nella chiamata a Mistral API",
      details: fetchError.message,
      filesInfo
    };
  }
}

// Funzione per formattare la lettera quando arriva come oggetto
function formatLetter(letterObj: any): string {
  if (!letterObj) return "Lettera non disponibile";
  
  try {
    // Se è già una stringa, restituiscila
    if (typeof letterObj === 'string') return letterObj;
    
    // Se è un oggetto, formatta le parti
    let formattedLetter = '';
    
    if (letterObj.intestazione) {
      formattedLetter += `${letterObj.intestazione}\n\n`;
    }
    
    if (letterObj.corpo) {
      // Controlliamo se il corpo termina in modo brusco e lo completiamo
      let corpo = letterObj.corpo;
      
      // Se il corpo termina in modo brusco con alcuni pattern comuni, completa la frase
      if (corpo.endsWith(" convertito")) {
        corpo += " in legge, con modificazioni, dalla Legge 10 novembre 2014, n. 162.";
      } else if (corpo.endsWith(" art.") || corpo.endsWith(" Art.")) {
        corpo += " 125-sexies del Testo Unico Bancario.";
      } else if (corpo.endsWith(",") || corpo.endsWith(";") || corpo.endsWith(" e")) {
        corpo += " quanto sopra esposto rappresenta un'evidenza delle violazioni riscontrate.";
      }
      
      formattedLetter += `${corpo}\n\n`;
    }
    
    if (letterObj.firma) {
      formattedLetter += `${letterObj.firma}`;
    } else {
      // Aggiungiamo una firma standard se manca
      formattedLetter += `Distinti saluti,\n\nAvv. _________________\n`;
    }
    
    return formattedLetter;
  } catch (e) {
    // In caso di errore, restituisci il JSON stringificato
    return JSON.stringify(letterObj, null, 2);
  }
}

export async function POST(request: NextRequest) {
  logMessage("Ricevuta richiesta POST");
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

  if (!MISTRAL_API_KEY) {
    logMessage("MISTRAL_API_KEY non configurata.");
    return NextResponse.json(
      { error: "MISTRAL_API_KEY non configurata." },
      { status: 500 }
    );
  }

  let contractText = "";
  let statementText = "";
  let templateText = "";
  let filesInfo: { contract: string; statement: string; template: string } = {
    contract: "NON TROVATO",
    statement: "NON TROVATO",
    template: "NON TROVATO",
  };

  try {
    const formData = await request.formData();
    logMessage("FormData ricevuto");
    
    const contractFile = formData.get("contratto") as File | null;
    const statementFile = formData.get("conteggio") as File | null;
    const templateFile = formData.get("templateFile") as File | null;

    // Fase 1: Estrazione testi (questa è la parte veloce)
    if (contractFile) {
      filesInfo.contract = `${contractFile.name} (${contractFile.size} bytes)`;
      logMessage("API - Contract File Trovato:", filesInfo.contract);
      contractText = await extractTextWithMistralOcr(contractFile, MISTRAL_API_KEY);
      if (!contractText || contractText.startsWith("Errore:")) {
        logMessage("Fallimento estrazione testo contratto con Mistral OCR.", contractText);
      }
    } else {
      logMessage("API - Contract File: NON TROVATO");
    }

    if (statementFile) {
      filesInfo.statement = `${statementFile.name} (${statementFile.size} bytes)`;
      logMessage("API - Statement File Trovato:", filesInfo.statement);
      statementText = await extractTextFromPDF(statementFile);
    } else {
      logMessage("API - Statement File: NON TROVATO");
    }
      
    if (templateFile) {
      filesInfo.template = `${templateFile.name} (${templateFile.size} bytes)`;
      logMessage("API - Template File Trovato:", filesInfo.template);
      templateText = await templateFile.text();
    } else {
      logMessage("API - Template File: NON TROVATO");
    }

    logMessage("Riepilogo estrazione testi:", {
      contractTextLength: contractText.length,
      statementTextLength: statementText.length,
      templateTextLength: templateText.length,
    });

    if (!contractText && !statementText && !templateText) {
      logMessage("Nessun testo estratto dai file forniti.");
      return NextResponse.json(
        {
          error: "Nessun testo è stato estratto dai file. Assicurati di aver caricato i file corretti.",
          filesInfo,
        },
        { status: 400 }
      );
    }
    
    // Fase 2: Elaborazione con Mistral (questa è la parte lenta)
    // Implementiamo un timeout di sicurezza per questa fase
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // Timeout dopo 45 secondi
    
    try {
      logMessage("Inizio elaborazione con Mistral...");
      
      // Usiamo una Promise.race per garantire il timeout
      const result = await Promise.race([
        processWithMistralChat(contractText, statementText, templateText, MISTRAL_API_KEY, filesInfo),
        new Promise<any>((_, reject) => {
          setTimeout(() => reject(new Error("Timeout di elaborazione Mistral")), 45000);
        })
      ]);
      
      clearTimeout(timeoutId);
      
      // Se è un errore, restituisci un messaggio appropriato
      if (result.error) {
        return NextResponse.json(result, { status: 200 });
      }
      
      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      clearTimeout(timeoutId);
      logMessage("Errore durante l'elaborazione con Mistral", error);
      
      return NextResponse.json({
        error: "Si è verificato un timeout durante l'elaborazione.",
        calcoli: "È stato possibile estrarre correttamente i testi dai documenti:\n" +
                `- Contratto: ${contractText.length} caratteri\n` +
                `- Conteggio estintivo: ${statementText.length} caratteri\n` +
                `- Template: ${templateText.length} caratteri\n\n` +
                "Ma l'elaborazione è stata interrotta per timeout. I documenti sono troppo complessi per l'analisi nel tempo disponibile.",
        letteraDiffidaCompleta: "Non è stato possibile generare la lettera a causa del timeout."
      }, { status: 200 });
    }

  } catch (error) {
    logMessage("Errore generico nella funzione POST", error);
    const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json(
      { error: "Errore interno del server.", details: errorMessage, filesInfo },
      { status: 500 }
    );
  }
} 

// GET handler per testare se l'API è raggiungibile
export async function GET() {
  return NextResponse.json({ message: "API CQS è attiva" });
}
