import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { extractTextFromPDF } from '../process_pdf';
import { processWithMistralChat } from '../process_pdf/mistral';

export const maxDuration = 300; // Aumento il timeout a 5 minuti

const logMessage = (message: string, data?: any) => {
  // Basic logger, replace with a more robust solution in production
  console.log(`[API CQS] ${message}`, data || ""); 
};

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
function trimDocumentText(text: string, maxLength = 20000): string {
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
1.  **CONTRATTO CQS**: Estrai con la massima precisione:
    *   **Dati Anagrafici Cliente**:
        *   Nome: (es. Massimo) -> \'datiCliente.nome\'
        *   Cognome: (es. Loria) -> \'datiCliente.cognome\'
        *   Data di Nascita: (es. 23/09/1983) -> \'datiCliente.dataDiNascita\'
        *   **Luogo di Nascita**: (es. Tivoli) -> \'datiCliente.luogoDiNascita\'. PRESTA MASSIMA ATTENZIONE A QUESTA ESTRAZIONE.
        *   Codice Fiscale: (es. LROMSM83P23L182W) -> \'datiCliente.codiceFiscale\'
    *   **Dati Istituto Finanziatore**:
        *   Nome completo dell\'istituto. -> \'datiFinanziaria.nome\'
        *   Sede (se disponibile). -> \'datiFinanziaria.sede\'
        *   Codice Fiscale/P.IVA (se disponibili). -> \'datiFinanziaria.codiceFiscale\', \'datiFinanziaria.partitaIVA\'
    *   **Dettagli Finanziamento**:
        *   Importo erogato. -> \'dettagliContratto.importoErogato\'
        *   Numero totale delle rate originarie del contratto. -> \'dettagliContratto.numeroTotaleRate\'
        *   Importo della singola rata. -> \'dettagliContratto.importoSingolaRata\'
        *   TAN (Tasso Annuo Nominale), se esplicitato. -> \'dettagliContratto.TAN\'
        *   TAEG (Tasso Annuo Effettivo Globale), se esplicitato. -> \'dettagliContratto.TAEG\'
    *   **Costi Upfront Rimborsabili**: Devi identificare e quantificare ESCLUSIVAMENTE le seguenti voci di costo dal contratto. Cerca le etichette ESATTE e gli importi numerici associati in euro. Converti gli importi in formato numerico (es. da "€ 1.994,40" a 1994.40). Ignora altre menzioni generiche di costi se non quantificate con queste etichette.
        *   Cerca l\'etichetta "**COSTI DI INTERMEDIAZIONE (CI)**" e estrai l\'importo numerico associato (es. € 1.994,40). Popola \'costiUpfront.costiIntermediazione\' con questo valore. Se non trovi questa etichetta ESATTA e il suo valore, metti 0.
        *   Cerca l\'etichetta "**SPESE DI ISTRUTTORIA PRATICA (SIP)**" e estrai l\'importo numerico associato (es. € 535,00). Popola \'costiUpfront.speseIstruttoriaPratica\' con questo valore. Se non trovi questa etichetta ESATTA e il suo valore, metti 0.
        *   **NON includere "ONERI ERARIALI (TAX)" o imposte di bollo nel calcolo dei costi rimborsabili.** Questi non sono rimborsabili ai fini della nostra lettera. Se vuoi estrarli per completezza, usa un campo separato come \'costiUpfront.oneriErarialiNonRimborsabili\', ma NON devono finire in \'costiUpfront.totaleCostiUpfront\'.
        *   Per i campi \'costiUpfront.commissioniBancarie\' e \'costiUpfront.speseIniziali\', popola con 0 a meno che tu non trovi etichette ESPLICITE e DISTINTE da SIP e CI che giustifichino un valore (sempre escludendo tasse/imposte).
        *   Il campo \'costiUpfront.totaleCostiUpfront\' DEVE essere la SOMMA ESATTA di \'costiUpfront.costiIntermediazione\' e \'costiUpfront.speseIstruttoriaPratica\' (e altre eventuali commissioni rimborsabili esplicitamente identificate, escluse tasse). Se queste voci sono 0, totaleCostiUpfront sarà 0.
    *   **Premi Assicurativi**:
        *   Identifica l\'importo dei premi assicurativi pagati (es. "Premio Unico Polizza Vita", "Premio Polizza Impiego"). Se il contratto menziona polizze ma non esplicita un importo SEPARATO e QUANTIFICATO per i premi nel prospetto dei costi o in una sezione chiaramente dedicata ai costi assicurativi, considera l\'importo come 0 per \'premiAssicurativi.premioAssicurativoVita\' e \'premiAssicurativi.premioAssicurativoImpiego\'.
        *   \'premiAssicurativi.totalePremiAssicurativi\' sarà la loro somma.
2.  **CONTEGGIO ESTINTIVO**: Estrai con precisione:
    *   Data di estinzione anticipata. -> \'dettagliEstinzione.dataEstinzioneAnticipata\'
    *   Numero di rate residue alla data di estinzione. -> \'dettagliEstinzione.numeroRateResidue\'
    *   Debito Residuo alla data di estinzione. -> \'dettagliEstinzione.debitoresiduo\'
    *   Eventuali interessi non maturati stornati dalla banca. -> \'dettagliEstinzione.interessiNonMaturati\'
    *   **Importante - Rimborso Costi da Banca**: Cerca voci specifiche come "**RIDUZIONE COSTO TOTALE DEL CREDITO (ARTICOLO 125 SEXIES TUB)**", "Rimborsi riconosciuti su costi/commissioni", "Storno commissioni/costi" o simili, e il relativo importo (es. € 0,00). Popola \'dettagliEstinzione.riduzioneCostoTotaleCredito\' con questo valore. Se assente o €0,00, significa che la banca NON ha rimborsato costi upfront.
3.  **TEMPLATE LETTERA**: Utilizza il template fornito come base per la struttura generale della lettera di diffida.

OBBIETTIVI PRINCIPALI (in ordine di importanza):
1.  **COMPILARE LA LETTERA DI DIFFIDA**: Utilizza i dati ESTRATTI CORRETTAMENTE (specialmente i costi SIP e CI) e il template. La lettera deve:
    *   Indicare i dati del cliente (INCLUSO IL LUOGO DI NASCITA CORRETTO) e della finanziaria.
    *   Precisare il numero di rate residue.
    *   **Quantificare la SOMMA RICHIESTA A RIMBORSO**. Questa somma deriva dalla quota parte dei COSTI UPFRONT RIMBORSABILI (costiIntermediazione + speseIstruttoriaPratica) e dei PREMI ASSICURATIVI (se estratti > 0) pagati per il periodo non goduto.
        *   La frase "Nello specifico il mio assistito ha corrisposto..." DEVE riflettere la somma dei costi rimborsabili effettivamente estratti (es. "euro 535,00 a titolo di Spese di Istruttoria Pratica e euro 1.994,40 a titolo di Costi di Intermediazione, per un totale di costi accessori pari a euro 2.529,40"). Se hai estratto premi assicurativi, menzionali.
    *   **Calcolare la somma richiesta con il *pro rata temporis***:
        *   \'Somma da Rimborsare per Costi Upfront = (costiUpfront.totaleCostiUpfront / dettagliContratto.numeroTotaleRate) * dettagliEstinzione.numeroRateResidue\'.
        *   \'Somma da Rimborsare per Premi Assicurativi = (premiAssicurativi.totalePremiAssicurativi / dettagliContratto.numeroTotaleRate) * dettagliEstinzione.numeroRateResidue\'.
        *   \'Somma Totale Richiesta per la lettera = Somma da Rimborsare per Costi Upfront + Somma da Rimborsare per Premi Assicurativi\'. ARROTONDA AL SECONDO DECIMALE.
    *   La frase "Di conseguenza - al netto dello storno di euro X applicato..." DEVE usare il valore 'dettagliEstinzione.riduzioneCostoTotaleCredito' (che sarà probabilmente 0.00).
    *   La frase "...spetta la restituzione di complessivi euro Y" DEVE usare la 'Somma Totale Richiesta per la lettera' calcolata.
    *   La frase "Pertanto Vi invito e diffido a restituire... la complessiva somma di euro Y" DEVE usare la stessa 'Somma Totale Richiesta per la lettera'.
    *   Quando indichi la somma totale richiesta (euro Y), NON aggiungere la sua rappresentazione testuale in lettere (es. NON scrivere '(ottocentosessantanove/43)').
    *   Citare l'art. 125-sexies TUB.
    *   Non includere formule di saluto finale (come "Distinti saluti") o la firma dell'avvocato direttamente nel testo principale della lettera che produci per il campo 'corpoLettera'. La firma sarà gestita separatamente.
2.  **DETTAGLIARE I CALCOLI**: Nel campo 'calcoliEffettuati' del JSON, fornisci una descrizione chiara di come sei arrivato alla SOMMA TOTALE RICHIESTA, specificando:
    *   Costi di Intermediazione (CI) considerati: € [valore estratto]
    *   Spese di Istruttoria Pratica (SIP) considerati: € [valore estratto]
    *   Totale Costi Upfront Rimborsabili (CI+SIP): € [somma]
    *   Totale Premi Assicurativi considerati: € [valore estratto]
    *   Numero totale rate da contratto: [valore]
    *   Numero rate residue: [valore]
    *   Formula pro rata temporis applicata e risultato per costi upfront.
    *   Formula pro rata temporis applicata e risultato per premi assicurativi.
    *   Somma Totale Richiesta: € [risultato finale arrotondato]

OUTPUT: Devi restituire un oggetto JSON.
L\'oggetto JSON DEVE contenere OBBLIGATORIAMENTE i seguenti campi di primo livello:
- "letteraDiffidaCompleta": un oggetto con le proprietà OBBLIGATORIE: "oggettoLettera" (stringa), "destinatarioLettera" (stringa), "corpoLettera" (stringa), "firmaLettera" (stringa).
    *   "oggettoLettera": L\'oggetto della lettera (es. "Lettera di diffida per il Sig. Massimo Loria...").
    *   "destinatarioLettera": Nome e indirizzo (se disponibile) dell\'istituto finanziario.
    *   "corpoLettera": Tutto il testo della lettera dalla formula di apertura (es. "Spett.le...") fino alla frase che precede immediatamente i saluti finali. DEVE contenere i valori monetari CORRETTI e NON a zero, basati sui calcoli e sui dati estratti (SIP, CI, etc.).
    *   "firmaLettera": Solo la parte relativa all\'avvocato (es. "Avv. Nome Cognome" o "Avv. Gabriele Scappaticci"). Se il nome dell\'avvocato non è chiaramente identificabile, usa "Avv. [Nome Avvocato]".
- "datiEstratti": un oggetto con i dati chiave estratti dai documenti (datiCliente CON LUOGO DI NASCITA, datiFinanziaria, dettagliContratto, costiUpfront CON VALORI CORRETTI PER SIP E CI, premiAssicurativi, dettagliEstinzione CON riduzioneCostoTotaleCredito, nome avvocato se identificato).
- "calcoliEffettuati": una stringa o un oggetto JSON che dettaglia i calcoli come sopra specificato, arrivando alla somma richiesta corretta.
- "logAnalisi": una breve descrizione testuale del tuo processo di analisi.

PRIORITÀ ASSOLUTA: Estrarre CORRETTAMENTE i costi SIP (€ 535,00 nel caso Loria) e CI (€ 1.994,40 nel caso Loria), il luogo di nascita (Tivoli nel caso Loria), e usarli per popolare \'corpoLettera\' e \'calcoliEffettuati\' con valori REALI e NON a zero. Se i costi SIP e CI non vengono estratti e usati correttamente, la lettera sarà INUTILE.
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

  logMessage("--- DEBUG TESTI TRONCATI (input per LLM) ---");
  logMessage("Testo Contratto TRONCATO (primi 500 char):", trimmedContractText.substring(0,500));
  if (trimmedContractText.length > 500) logMessage("Testo Contratto TRONCATO (...ultimi 500 char):", trimmedContractText.substring(trimmedContractText.length - 500));
  logMessage("--- DEBUG: INIZIO TESTO CONTRATTO TRONCATO COMPLETO (PER LLM) ---");
  logMessage(trimmedContractText);
  logMessage("--- DEBUG: FINE TESTO CONTRATTO TRONCATO COMPLETO (PER LLM) ---");
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

  logMessage("--- DEBUG USERPROMPT COMPLETO (input per LLM) ---");
  logMessage("User Prompt (primi 1000 char):", userPrompt.substring(0,1000));
  if (userPrompt.length > 1000) {
    logMessage("User Prompt (...continuazione... ultimi 500 char):", userPrompt.substring(userPrompt.length - 500));
  }
  logMessage("--- FINE DEBUG USERPROMPT COMPLETO ---");

  const CHAT_API_URL = "https://api.mistral.ai/v1/chat/completions";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    logMessage("Timeout personalizzato per Mistral API raggiunto (50s). Annullamento richiesta...");
    controller.abort();
  }, 50000); // 50 secondi

  try {
    logMessage("Invio richiesta a Mistral Chat API...");
    const mistralResponse = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-medium-latest",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" }, // Assicurati che il modello supporti questo
        // max_tokens: 8000, // Considera se questo è necessario o se può essere ridotto
        // temperature: 0.1, // Valuta se questo è il valore ottimale
      }),
      signal: controller.signal,
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
        error: `Errore API Mistral: ${mistralResponse.status}`,
        errorMessage: `L'API di Mistral ha risposto con un errore. Dettagli: ${errorBody}`,
        details: errorBody,
        filesInfo
      };
    }

    const result = await mistralResponse.json();
    logMessage("Risultato JSON da Mistral Chat API parsato.");
    
    // Inizio aggiunta log risposta completa da Mistral
    if (result && result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
      const contentString = result.choices[0].message.content;
      logMessage("--- DEBUG: INIZIO RISPOSTA JSON COMPLETA DA MISTRAL --- (da result.choices[0].message.content)");
      logMessage(contentString);
      logMessage("--- DEBUG: FINE RISPOSTA JSON COMPLETA DA MISTRAL --- (da result.choices[0].message.content)");

      if (!contentString || contentString.trim() === '') {
        logMessage("Mistral ha restituito una risposta vuota o solo spazi/tab nel contentString");
        return {
          error: "Mistral ha restituito una risposta vuota o malformata.",
          errorMessage: "La risposta contiene solo spazi o è vuota. Prova a ridurre la dimensione dei documenti.",
          details: "Content string from Mistral was empty or whitespace.",
          filesInfo
        };
      }

      logMessage("Primi 100 caratteri del contentString:", contentString.substring(0, 100));

      try {
        const parsedContent = JSON.parse(contentString);
        logMessage("Contenuto del messaggio (contentString) parsato con successo.");

        // --- INIZIO RICALCOLO E SOSTITUZIONE SOMMA RICHIESTA ---
        let sommaCorrettaStringaIt = "";
        let valoreErratoNumericoStringaIt = "";

        try {
          const dati = parsedContent.datiEstratti;
          const totaleCostiUpfront = parseFloat(dati?.costiUpfront?.totaleCostiUpfront) || 0;
          const numeroTotaleRate = parseInt(dati?.dettagliContratto?.numeroTotaleRate) || 0;
          const numeroRateResidue = parseInt(dati?.dettagliEstinzione?.numeroRateResidue) || 0;
          const totalePremiAssicurativi = parseFloat(dati?.premiAssicurativi?.totalePremiAssicurativi) || 0;

          if (numeroTotaleRate > 0) {
            const sommaRimborsabileCostiUpfrontNonArr = (totaleCostiUpfront / numeroTotaleRate) * numeroRateResidue;
            const sommaRimborsabilePremiNonArr = (totalePremiAssicurativi / numeroTotaleRate) * numeroRateResidue;
            
            const sommaCorrettaNumerica = parseFloat((sommaRimborsabileCostiUpfrontNonArr + sommaRimborsabilePremiNonArr).toFixed(2));
            sommaCorrettaStringaIt = sommaCorrettaNumerica.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            // Estrai il valore errato da calcoliEffettuati per la sostituzione nel corpo lettera
            if (parsedContent.calcoliEffettuati && parsedContent.calcoliEffettuati["Somma Totale Richiesta"]) {
              const matchErrato = String(parsedContent.calcoliEffettuati["Somma Totale Richiesta"]).match(/[\d.,]+/);
              if (matchErrato && matchErrato[0]) {
                valoreErratoNumericoStringaIt = matchErrato[0]; // Es. "869,43" o "1.316,68"
              }
            }
            
            logMessage("Ricalcolo Somma:", {
              totaleCostiUpfront, numeroTotaleRate, numeroRateResidue, totalePremiAssicurativi,
              sommaRimborsabileCostiUpfrontNonArr, sommaRimborsabilePremiNonArr,
              sommaCorrettaNumerica, sommaCorrettaStringaIt, valoreErratoOriginaleInCalcoli: valoreErratoNumericoStringaIt
            });

            // Sostituisci nel corpo della lettera
            if (parsedContent.letteraDiffidaCompleta && parsedContent.letteraDiffidaCompleta.corpoLettera && valoreErratoNumericoStringaIt && valoreErratoNumericoStringaIt !== sommaCorrettaStringaIt) {
              let corpoLettera = parsedContent.letteraDiffidaCompleta.corpoLettera;
              const valoreErratoRegExp = new RegExp(escapeRegExp(valoreErratoNumericoStringaIt), 'g');
              
              // Sostituisci specificamente nelle frasi target per evitare sostituzioni errate
              corpoLettera = corpoLettera.replace(new RegExp(`(restituzione di complessivi euro )${escapeRegExp(valoreErratoNumericoStringaIt)}`, 'g'), `$1${sommaCorrettaStringaIt}`);
              corpoLettera = corpoLettera.replace(new RegExp(`(complessiva somma di euro )${escapeRegExp(valoreErratoNumericoStringaIt)}`, 'g'), `$1${sommaCorrettaStringaIt}`);
              
              parsedContent.letteraDiffidaCompleta.corpoLettera = corpoLettera;
              logMessage("Corpo lettera aggiornato con somma corretta.");
            } else {
              logMessage("Non è stato necessario aggiornare il corpo lettera o valore errato non trovato/coincide.", 
                { valoreErrato: valoreErratoNumericoStringaIt, sommaCorretta: sommaCorrettaStringaIt });
            }

            // Aggiorna calcoliEffettuati
            if (parsedContent.calcoliEffettuati) {
              parsedContent.calcoliEffettuati["Somma Totale Richiesta"] = "€ " + sommaCorrettaStringaIt;
              // Aggiorna anche la formula per coerenza, se necessario (opzionale, ma buona pratica)
              parsedContent.calcoliEffettuati["Formula pro rata temporis applicata per costi upfront"] = 
                `(${totaleCostiUpfront.toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:2})} / ${numeroTotaleRate}) * ${numeroRateResidue} = ${sommaRimborsabileCostiUpfrontNonArr.toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:10})}`;
              if (totalePremiAssicurativi > 0) {
                 parsedContent.calcoliEffettuati["Formula pro rata temporis applicata per premi assicurativi"] = 
                  `(${totalePremiAssicurativi.toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:2})} / ${numeroTotaleRate}) * ${numeroRateResidue} = ${sommaRimborsabilePremiNonArr.toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:10})}`;
              }
              logMessage("CalcoliEffettuati aggiornati con somma corretta.");
            }
          } else {
            logMessage("Numero totale rate è 0, impossibile calcolare pro rata.");
          }
        } catch (recalcError) {
          logMessage("Errore durante il ricalcolo della somma richiesta", { error: recalcError });
          // Non bloccare l'esecuzione, continua con i valori di Mistral se il ricalcolo fallisce
        }
        // --- FINE RICALCOLO E SOSTITUZIONE SOMMA RICHIESTA ---

        if (!parsedContent.letteraDiffidaCompleta ||
            typeof parsedContent.letteraDiffidaCompleta !== 'object' ||
            !parsedContent.letteraDiffidaCompleta.corpoLettera ||
            parsedContent.letteraDiffidaCompleta.corpoLettera.trim() === "") {
          logMessage("ATTENZIONE: 'letteraDiffidaCompleta' non è un oggetto valido o 'corpoLettera' è vuoto/mancante. Contenuto grezzo:", contentString);
        }

        const adaptedResponse = {
          lettera: typeof parsedContent.letteraDiffidaCompleta === 'string'
            ? parsedContent.letteraDiffidaCompleta
            : formatLetter(parsedContent.letteraDiffidaCompleta),
          calcoli: `CALCOLI ESTRATTI:\n\n${typeof parsedContent.calcoliEffettuati === 'string'
    ? parsedContent.calcoliEffettuati
    : JSON.stringify(parsedContent.calcoliEffettuati, null, 2)}\n\nDATI ESTRATTI:\n\n${JSON.stringify(parsedContent.datiEstratti || {}, null, 2)}\n\n${parsedContent.logAnalisi ? '\nNOTE ANALISI:\n' + (typeof parsedContent.logAnalisi === 'object' ? JSON.stringify(parsedContent.logAnalisi, null, 2) : parsedContent.logAnalisi) : ''}`,
        };
        return adaptedResponse;
      } catch (e) {
        logMessage("Errore nel parsing del contentString JSON da Mistral", {
          error: e,
          contentPreview: contentString.substring(0, 500) // Log più esteso in caso di errore di parsing
        });
        return {
          error: "Errore nel parsing della risposta JSON da Mistral.",
          errorMessage: "Il formato della risposta dell'IA non è JSON valido.",
          details: e instanceof Error ? e.message : String(e),
          rawResponse: contentString.substring(0,1000), // Includi un pezzo della risposta grezza
          filesInfo
        };
      }
    } else {
      logMessage("Risposta da Mistral non contiene il formato atteso (choices[0].message.content mancante).");
      return {
        error: "Formato risposta Mistral inatteso.",
        errorMessage: "La struttura della risposta dell'IA non è quella prevista.",
        details: JSON.stringify(result), // Logga l'intero risultato per debug
        filesInfo
      };
    }
    // Fine aggiunta log risposta completa da Mistral

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      logMessage("Richiesta a Mistral annullata a causa del timeout personalizzato (50s).");
      return {
        error: "Timeout di elaborazione Mistral (limite client 50s)",
        errorMessage: "La richiesta all'IA per l'analisi dei documenti ha impiegato troppo tempo ed è stata interrotta (50s).",
        details: "Il server non ha risposto entro il tempo limite impostato dal client.",
        filesInfo
      };
    }
    logMessage("Errore generico durante la chiamata a Mistral Chat API", { error });
    return {
      error: "Errore imprevisto durante l'elaborazione con Mistral",
      errorMessage: error instanceof Error ? error.message : String(error),
      details: "Si è verificato un errore non gestito durante la comunicazione con il servizio AI.",
      filesInfo
    };
  }
}

// Funzione helper per escapare stringhe per RegExp
function escapeRegExp(string: string): string {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// Funzione per formattare la lettera quando arriva come oggetto
function formatLetter(letterObj: any): string {
  if (!letterObj || typeof letterObj !== 'object') {
    logMessage("formatLetter: letterObj non valido o non è un oggetto", letterObj);
    return "Lettera non disponibile (dati input invalidi per formattazione).";
  }

  try {
    const { oggettoLettera, destinatarioLettera, corpoLettera, firmaLettera } = letterObj;

    // Verifica che i campi essenziali ci siano
    if (!corpoLettera || corpoLettera.trim() === "") {
      logMessage("formatLetter: corpoLettera da Mistral è mancante o vuoto. La lettera potrebbe essere incompleta o errata.", letterObj);
      // Restituisce i dati grezzi o una parte per il debug in questo caso critico
      return `Corpo della lettera mancante o vuoto nella risposta dall'IA. Dati ricevuti: ${JSON.stringify(letterObj, null, 2)}`;
    }
    if (!oggettoLettera) logMessage("formatLetter: oggettoLettera da Mistral è mancante.", letterObj);
    if (!destinatarioLettera) logMessage("formatLetter: destinatarioLettera da Mistral è mancante.", letterObj);

    let finalLetterOutputParts: string[] = [];

    if (oggettoLettera) {
      // Aggiungi "Oggetto: " solo se non è già presente nel valore restituito da Mistral
      if (oggettoLettera.toLowerCase().startsWith("oggetto:")) {
        finalLetterOutputParts.push(oggettoLettera);
      } else {
        finalLetterOutputParts.push(`Oggetto: ${oggettoLettera}`);
      }
    }

    if (destinatarioLettera) {
      finalLetterOutputParts.push(destinatarioLettera);
    }

    let currentCorpo = corpoLettera;
    
    // Tentativo di pulire il corpo se Mistral ha incluso l'oggetto o il destinatario
    // nonostante il prompt chieda di ometterli se forniti separatamente.
    if (oggettoLettera) {
        const oggettoCompletoPattern = new RegExp(`^(${escapeRegExp(`Oggetto: ${oggettoLettera}`)}|${escapeRegExp(oggettoLettera)})\s*`, 'i');
        currentCorpo = currentCorpo.replace(oggettoCompletoPattern, "").trimStart();
    }
    if (destinatarioLettera) {
        const destinatarioPattern = new RegExp(`^${escapeRegExp(destinatarioLettera)}\s*`, 'i');
        currentCorpo = currentCorpo.replace(destinatarioPattern, "").trimStart();
    }
    
    // La logica di "completamento" del corpo, se ancora necessaria, può essere applicata a currentCorpo
    // Esempio:
    // if (currentCorpo.endsWith(" convertito")) {
    //   currentCorpo += " in legge, con modificazioni, dalla Legge 10 novembre 2014, n. 162.";
    // }

    finalLetterOutputParts.push(currentCorpo);

    // Aggiungi saluti e firma
    // Il prompt specifica che corpoLettera non include saluti finali e firmaLettera è solo l'avvocato.
    finalLetterOutputParts.push("Distinti saluti,");

    if (firmaLettera) {
      finalLetterOutputParts.push(firmaLettera.replace(/\s*,$/, "")); // Rimuove virgola e spazio alla fine, se presenti
    } else {
      logMessage("formatLetter: firmaLettera da Mistral è mancante. Uso placeholder.", letterObj);
      finalLetterOutputParts.push("Avv. _________________"); // Placeholder
    }
    
    // Assembla le parti finali
    let result = "";
    if (finalLetterOutputParts.length > 0) result += finalLetterOutputParts[0]; // Oggetto (o primo elemento disponibile)
    if (finalLetterOutputParts.length > 1) result += `\n\n${finalLetterOutputParts[1]}`; // Destinatario
    if (finalLetterOutputParts.length > 2) result += `\n\n${finalLetterOutputParts[2]}`; // Corpo
    if (finalLetterOutputParts.length > 3) result += `\n\n${finalLetterOutputParts[3]}`; // Saluti ("Distinti saluti,")
    if (finalLetterOutputParts.length > 4) result += `\n${finalLetterOutputParts[4]}`; // Firma

    return result.trim();

  } catch (e) {
    logMessage("Errore critico durante formattazione lettera", { error: e, letterObj });
    return `Errore interno durante la formattazione della lettera. Dettagli tecnici: ${e instanceof Error ? e.message : String(e)}\n\nDati grezzi ricevuti:\n${JSON.stringify(letterObj, null, 2)}`;
  }
}

export async function POST(req: NextRequest) {
  console.log("[API CQS] Ricevuta richiesta POST");
  
  try {
    const formData = await req.formData();
    console.log("[API CQS] FormData ricevuto");

    // Estrazione dei file
    const contractFile = formData.get('contract') as File;
    const statementFile = formData.get('statement') as File;
    const templateFile = formData.get('template') as File;

    if (!contractFile || !statementFile || !templateFile) {
      return NextResponse.json({ error: 'File mancanti' }, { status: 400 });
    }

    // Estrazione testo dal contratto con Mistral OCR
    console.log("[API CQS] API - Contract File Trovato:", { 
      name: contractFile.name, 
      size: contractFile.size, 
      type: contractFile.type 
    });
    console.log("[API CQS] Inizio estrazione testo da PDF con Mistral OCR", { 
      name: contractFile.name, 
      size: contractFile.size, 
      type: contractFile.type 
    });
    const contractText = await extractTextFromPDF(contractFile, true);
    console.log("[API CQS] Testo estratto con Mistral OCR", { length: contractText.length });

    // Estrazione testo dal conteggio con pdf-parse
    console.log("[API CQS] API - Statement File Trovato:", { 
      name: statementFile.name, 
      size: statementFile.size, 
      type: statementFile.type 
    });
    console.log("[API CQS] Inizio estrazione testo da PDF con pdf-parse", { 
      name: statementFile.name, 
      size: statementFile.size, 
      type: statementFile.type 
    });
    const statementText = await extractTextFromPDF(statementFile, false);
    console.log("[API CQS] Testo estratto con pdf-parse", { length: statementText.length });

    // Estrazione testo dal template
    console.log("[API CQS] API - Template File Trovato:", {
      name: templateFile.name,
      size: templateFile.size,
      type: templateFile.type
    });
    console.log("[API CQS] Estrazione testo da template PDF...");
    console.log("[API CQS] Inizio estrazione testo da PDF con pdf-parse", {
      name: templateFile.name,
      size: templateFile.size,
      type: templateFile.type
    });
    const templateText = await extractTextFromPDF(templateFile, false);
    console.log("[API CQS] Testo estratto con pdf-parse", { length: templateText.length });
    console.log("[API CQS] Testo estratto per il template (primi 200 char):", templateText.substring(0, 200));

    // Debug dei testi pre-troncamento
    console.log("[API CQS] --- DEBUG TESTI PRE-TRONCAMENTO (input per processWithMistralChat) ---");
    console.log("[API CQS] Testo Contratto (primi 500 char):", contractText.substring(0, 500));
    console.log("[API CQS] Testo Contratto (...ultimi 500 char):", contractText.substring(contractText.length - 500));
    console.log("[API CQS] Testo Conteggio (primi 500 char):", statementText.substring(0, 500));
    console.log("[API CQS] Testo Conteggio (...ultimi 500 char):", statementText.substring(statementText.length - 500));
    console.log("[API CQS] Testo Template (primi 500 char):", templateText.substring(0, 500));
    console.log("[API CQS] Testo Template (...ultimi 500 char):", templateText.substring(templateText.length - 500));
    console.log("[API CQS] --- FINE DEBUG TESTI PRE-TRONCAMENTO ---");

    // Troncamento dei testi per evitare prompt troppo lunghi
    const MAX_LENGTH = 15000; // Ridotto il limite per evitare timeout
    const truncatedContractText = contractText.length > MAX_LENGTH 
      ? contractText.substring(0, MAX_LENGTH) + "\n[...testo omesso per limitazioni di dimensione...]\n" + contractText.substring(contractText.length - MAX_LENGTH)
      : contractText;
    
    const truncatedStatementText = statementText.length > MAX_LENGTH
      ? statementText.substring(0, MAX_LENGTH) + "\n[...testo omesso per limitazioni di dimensione...]\n" + statementText.substring(statementText.length - MAX_LENGTH)
      : statementText;

    // Debug dei testi troncati
    console.log("[API CQS] --- DEBUG TESTI TRONCATI (input per LLM) ---");
    console.log("[API CQS] Testo Contratto TRONCATO (primi 500 char):", truncatedContractText.substring(0, 500));
    console.log("[API CQS] Testo Contratto TRONCATO (...ultimi 500 char):", truncatedContractText.substring(truncatedContractText.length - 500));
    console.log("[API CQS] Testo Conteggio TRONCATO (primi 500 char):", truncatedStatementText.substring(0, 500));
    console.log("[API CQS] Testo Conteggio TRONCATO (...ultimi 500 char):", truncatedStatementText.substring(truncatedStatementText.length - 500));
    console.log("[API CQS] Testo Template TRONCATO (primi 500 char):", templateText.substring(0, 500));
    console.log("[API CQS] Testo Template TRONCATO (...ultimi 500 char):", templateText.substring(templateText.length - 500));
    console.log("[API CQS] --- FINE DEBUG TESTI TRONCATI ---");

    // Calcolo dimensioni del prompt
    const systemPrompt = "Sei un assistente legale esperto in diritto bancario e finanziario. Il tuo compito è analizzare i documenti forniti e generare una lettera di diffida professionale e accurata.";
    const userPrompt = `Analizza questi documenti e genera la lettera di diffida:

<contratto_cqs>
${truncatedContractText}
</contratto_cqs>

<conteggio_estintivo>
${truncatedStatementText}
</conteggio_estintivo>

<template_lettera>
${templateText}
</template_lettera>`;

    console.log("[API CQS] Dimensioni Prompt per Mistral AI:", { 
      system: systemPrompt.length, 
      user: userPrompt.length, 
      totale: systemPrompt.length + userPrompt.length 
    });

    // Debug del prompt completo
    console.log("[API CQS] --- DEBUG USERPROMPT COMPLETO (input per LLM) ---");
    console.log("[API CQS] User Prompt (primi 1000 char):", userPrompt.substring(0, 1000));
    console.log("[API CQS] User Prompt (...continuazione... ultimi 500 char):", userPrompt.substring(userPrompt.length - 500));
    console.log("[API CQS] --- FINE DEBUG USERPROMPT COMPLETO ---");

    console.log("[API CQS] Invio richiesta a Mistral Chat API...");
    const result = await processWithMistralChat(systemPrompt, userPrompt);
    console.log("[API CQS] Risposta ricevuta da Mistral Chat API");

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API CQS] Errore:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Errore sconosciuto' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "API CQS è attiva" });
}
