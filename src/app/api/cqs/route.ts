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
function trimDocumentText(text: string, maxLength = 25000): string {
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
  const SYSTEM_PROMPT = `
Sei un assistente legale esperto, specializzato nell'analisi di contratti di Cessione del Quinto dello Stipendio (CQS) e nella preparazione di lettere di diffida per il recupero di somme indebitamente trattenute, in linea con l'art. 125-sexies del Testo Unico Bancario (TUB) e la giurisprudenza rilevante (es. Sentenza Lexitor).

ANALIZZA TRE DOCUMENTI FORNITI:
1.  **CONTRATTO CQS**: Estrai con precisione:
    *   Dati anagrafici completi del cliente (Nome, Cognome, Data di Nascita, Luogo di Nascita, Codice Fiscale).
    *   Dati dell'istituto finanziatore.
    *   Dettagli del finanziamento: importo erogato, numero totale delle rate, importo della singola rata, TAN, TAEG.
    *   **Costi Upfront**: Identifica e quantifica voci come "COSTI TOTALI (CT)", "Spese di Istruttoria Pratica (SIP)", "Costi di Intermediazione (CI)", "Commissioni Bancarie/Finanziarie", "Spese Iniziali". Presta attenzione a clausole che indicano questi costi come "non rimborsabili" poiché la lettera di diffida contesterà proprio questo. NON includere gli "Oneri Erariali" (tasse, imposte di bollo) in questi costi rimborsabili.
    *   **Premi Assicurativi**: Identifica l'importo dei premi assicurativi pagati (vita e/o impiego).
2.  **CONTEGGIO ESTINTIVO**: Estrai con precisione:
    *   Data di estinzione anticipata del finanziamento.
    *   Numero di rate residue alla data di estinzione.
    *   Debito Residuo.
    *   Interessi non maturati stornati dalla banca.
    *   **Importante**: Cerca una voce specifica tipo "RIDUZIONE COSTO TOTALE DEL CREDITO (ART. 125-SEXIES TUB)", "Rimborsi riconosciuti", "Storno commissioni/costi" o simili. Se questa voce è €0,00 o assente, significa che la banca NON ha rimborsato alcunché a titolo di costi upfront. NON confondere questo con addebiti aggiuntivi (es. "Rate insolute", "Spese varie") che potrebbero essere presenti; questi NON sono rimborsi di costi upfront.
3.  **TEMPLATE LETTERA**: Utilizza questo template come base per generare la lettera di diffida.

OBBIETTIVI PRINCIPALI (in ordine di importanza):
1.  **COMPILARE LA LETTERA DI DIFFIDA**: Utilizza il template e i dati estratti. Questa è la priorità assoluta. La lettera deve:
    *   Indicare chiaramente i dati del cliente e della finanziaria.
    *   Precisare il numero di rate residue al momento dell'estinzione.
    *   **Identificare e quantificare la somma richiesta a rimborso**. Questa somma deriva dalla quota parte dei COSTI UPFRONT (come commissioni di istruttoria, intermediazione, etc., ESCLUSI ONERI ERARIALI) e dei PREMI ASSICURATIVI pagati per il periodo non goduto.
    *   **Basare il calcolo della somma richiesta sul principio del *pro rata temporis***:
        *   'Quota Parte Costi Upfront Rimborsabili = (Totale Costi Upfront Rimborsabili / Numero Totale Rate da Contratto) * Numero Rate Residue'.
        *   'Quota Parte Premi Assicurativi Rimborsabili = (Totale Premi Assicurativi / Numero Totale Rate da Contratto) * Numero Rate Residue'.
        *   'Somma Totale Richiesta = Quota Parte Costi Upfront Rimborsabili + Quota Parte Premi Assicurativi Rimborsabili'.
    *   Indicare che nel conteggio estintivo la banca ha (o non ha) riconosciuto rimborsi per tali costi (basandoti sulla voce "RIDUZIONE COSTO TOTALE DEL CREDITO" o simili nel conteggio estintivo). Se non ha riconosciuto nulla, la lettera lo deve specificare.
    *   Citare l'art. 125-sexies TUB.
2.  **DETTAGLIARE I CALCOLI**: Nel campo 'calcoliEffettuati' del JSON, fornisci una descrizione chiara di come sei arrivato alla somma richiesta, specificando:
    *   Quali voci di costo dal contratto hai incluso nei "Costi Upfront Rimborsabili" e il loro importo totale.
    *   L'importo dei "Premi Assicurativi" considerato.
    *   Il numero totale delle rate da contratto e il numero di rate residue utilizzate nel calcolo.
    *   La formula *pro rata temporis* applicata.

OUTPUT: Devi restituire un oggetto JSON.
L'oggetto JSON DEVE contenere il campo "letteraDiffidaCompleta" con il testo completo della lettera generata.
Includi SEMPRE anche:
- "datiEstratti": un oggetto con i dati chiave estratti dai documenti (dati cliente completi, finanziaria, dettagli contratto, costi upfront identificati, premi assicurativi, dettagli estinzione, importo rimborsato dalla banca se presente).
- "calcoliEffettuati": una stringa o un oggetto JSON che dettaglia i calcoli come sopra specificato.
- "logAnalisi": una breve descrizione testuale del tuo processo di analisi, delle voci di costo identificate come rimborsabili e di come hai interpretato il conteggio estintivo rispetto ai rimborsi già effettuati dalla banca.
Se hai difficoltà a popolare tutti i campi, DAI PRIORITÀ ASSOLUTA ALLA GENERAZIONE DI "letteraDiffidaCompleta", ma cerca di fornire sempre anche "datiEstratti", "calcoliEffettuati" e "logAnalisi" al meglio delle tue capacità.
`;

  // Limitiamo la dimensione dei testi per ridurre il prompt
  const trimmedContractText = trimDocumentText(contractText);
  const trimmedStatementText = trimDocumentText(statementText);
  const trimmedTemplateText = templateText.length > 5000 ? 
    templateText.substring(0, 5000) : templateText;
    
  logMessage("Dimensioni testi ridotte (input per LLM):", {
    contractOriginal: contractText.length,
    contractTrimmed: trimmedContractText.length,
    statementOriginal: statementText.length,
    statementTrimmed: trimmedStatementText.length,
    templateOriginal: templateText.length,
    templateTrimmed: trimmedTemplateText.length
  });

  // LOG AGGIUNTIVI DEI TESTI TRONCATI
  logMessage("--- DEBUG TESTI TRONCATI (input per LLM) ---");
  logMessage("Testo Contratto TRONCATO (primi 500 char):", trimmedContractText.substring(0,500));
  if (trimmedContractText.length > 500) logMessage("Testo Contratto TRONCATO (...ultimi 500 char):", trimmedContractText.substring(trimmedContractText.length - 500));
  logMessage("Testo Conteggio TRONCATO (primi 500 char):", trimmedStatementText.substring(0,500));
  if (trimmedStatementText.length > 500) logMessage("Testo Conteggio TRONCATO (...ultimi 500 char):", trimmedStatementText.substring(trimmedStatementText.length - 500));
  logMessage("Testo Template TRONCATO (primi 500 char):", trimmedTemplateText.substring(0,500));
  if (trimmedTemplateText.length > 500) logMessage("Testo Template TRONCATO (...ultimi 500 char):", trimmedTemplateText.substring(trimmedTemplateText.length - 500));
  logMessage("--- FINE DEBUG TESTI TRONCATI ---");

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

  logMessage("Dimensioni Prompt per Mistral AI:", { 
    system: SYSTEM_PROMPT.length, 
    user: userPrompt.length,
    totale: SYSTEM_PROMPT.length + userPrompt.length
  });
  
  // LOG AGGIUNTIVO USERPROMPT COMPLETO
  logMessage("--- DEBUG USERPROMPT COMPLETO (input per LLM) ---");
  logMessage("User Prompt (primi 1000 char):", userPrompt.substring(0,1000));
  if (userPrompt.length > 1000) {
    logMessage("User Prompt (...continuazione... ultimi 500 char):", userPrompt.substring(userPrompt.length - 500));
  }
  // Per un debug più approfondito, potresti voler loggare l'intero userPrompt, ma attenzione alle dimensioni dei log.
  // Esempio: logMessage("User Prompt COMPLETO:", userPrompt);
  logMessage("--- FINE DEBUG USERPROMPT COMPLETO ---");

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
  // Utilizziamo un timeout più stretto (50 secondi) per lasciare tempo di processare la risposta
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("Timeout interno per Mistral Chat API dopo 50s"), 50000); // Aumentato a 50 secondi
  
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
      // Se l'errore è dovuto a un AbortError (anche se catturato qui come !ok), 
      // il controller.signal.reason potrebbe contenere il messaggio di abort.
      // Tuttavia, mistralResponse.ok sarà false per errori HTTP, non per AbortError pre-request.
      // L'AbortError viene catturato nel blocco catch.
      return {
        error: `Errore dalla Mistral API: ${mistralResponse.status}`,
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
      
      if (!parsedContent.letteraDiffidaCompleta || parsedContent.letteraDiffidaCompleta.trim() === "") {
        logMessage("ATTENZIONE: 'letteraDiffidaCompleta' è vuota o mancante nel JSON parsato. Contenuto grezzo della risposta da Mistral:", contentString);
      }
      
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
  } catch (error: any) {
    clearTimeout(timeoutId); // Assicurati di pulire il timeout
    if (error.name === 'AbortError') {
      logMessage("Chiamata a Mistral Chat API interrotta da AbortController", { reason: controller.signal.reason, error });
      return {
        error: "Timeout durante la comunicazione con l'AI",
        details: controller.signal.reason || "L'elaborazione AI ha richiesto troppo tempo (timeout interno 50s). Prova con documenti più piccoli o riprova.",
        filesInfo
      };
    }
    logMessage("Errore generico durante la chiamata a Mistral Chat API", { error });
    return {
      error: "Errore imprevisto durante la comunicazione con l'AI",
      details: error instanceof Error ? error.message : String(error),
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
      if (templateFile.type === "application/pdf") {
        logMessage("Estrazione testo da template PDF...");
        templateText = await extractTextFromPDF(templateFile);
      } else if (templateFile.name.toLowerCase().endsWith(".doc")) {
        logMessage("Rilevato template .doc (formato Word 97-2003). Questo formato non è direttamente leggibile come testo.");
        templateText = "FORMATO TEMPLATE .DOC NON SUPPORTATO DIRETTAMENTE. Si prega di convertire il template in formato .txt, .md (Markdown), o .pdf e ricaricarlo. Il contenuto del template originale .doc non può essere utilizzato.";
      } else if (templateFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") { // DOCX
        logMessage("Estrazione testo da template DOCX...");
        try {
            templateText = await templateFile.text(); 
            // Controllo euristico per contenuto sospetto/binario (può capitare se un .doc è mascherato da .docx o per encoding strani)
            if (templateText.includes("\uFFFD") || templateText.substring(0,100).replace(/[\x00-\x1F\x7F-\x9F]/g, '').length < 50) {
                logMessage("Lettura template DOCX come testo ha prodotto output sospetto/binario. Placeholder usato.");
                templateText = "Contenuto template DOCX non correttamente leggibile come testo semplice. Provare a salvare come .txt, .md o .pdf.";
            }
        } catch (e) {
            logMessage("Errore lettura template DOCX come testo", e);
            templateText = "Errore lettura template DOCX";
        }
      } else { // Assumiamo .txt, .md o altro formato testuale semplice
        logMessage("Lettura template come testo semplice (es. .txt, .md)...");
        try {
            templateText = await templateFile.text();
        } catch (e) {
            logMessage("Errore lettura template come testo", e);
            templateText = "Errore lettura template";
        }
      }
      if (!templateText) {
        logMessage("Estrazione/Lettura testo template fallita o ha prodotto testo vuoto.");
        templateText = "Template non leggibile o vuoto.";
      }
    } else {
      logMessage("API - Template File: NON TROVATO");
      templateText = "Template file non fornito."; // Placeholder se il file non è proprio arrivato
    }
    logMessage("Testo estratto per il template (primi 200 char):", templateText.substring(0,200));

    // LOG AGGIUNTIVI PRIMA DI PROCESSWITHMISTRALCHAT
    logMessage("--- DEBUG TESTI PRE-TRONCAMENTO (input per processWithMistralChat) ---");
    logMessage("Testo Contratto (primi 500 char):", contractText.substring(0,500));
    if (contractText.length > 500) logMessage("Testo Contratto (...ultimi 500 char):", contractText.substring(contractText.length - 500));
    logMessage("Testo Conteggio (primi 500 char):", statementText.substring(0,500));
    if (statementText.length > 500) logMessage("Testo Conteggio (...ultimi 500 char):", statementText.substring(statementText.length - 500));
    logMessage("Testo Template (primi 500 char):", templateText.substring(0,500));
    if (templateText.length > 500) logMessage("Testo Template (...ultimi 500 char):", templateText.substring(templateText.length - 500));
    logMessage("--- FINE DEBUG TESTI PRE-TRONCAMENTO ---");

    logMessage("Testo estratto per il contratto (primi 200 char):", contractText.substring(0,200));
    logMessage("Testo estratto per il conteggio (primi 200 char):", statementText.substring(0,200));
    // --- FINE SEZIONE CRITICA PER ESTRAZIONE TESTO ---

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
