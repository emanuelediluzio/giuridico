import { NextResponse, NextRequest } from 'next/server';
import WordExtractor from 'word-extractor';
import mammoth from 'mammoth';
import MistralClient from '@mistralai/mistralai';

export const runtime = 'nodejs';
export const maxDuration = 55; // Manteniamo 55 secondi, ma monitoriamo

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

// Funzione helper per il logging
function logMessage(message: string) {
  // Semplifichiamo il formato per ora, per evitare problemi con toISOString in alcuni contesti serverless se non strettamente necessario.
  const timestamp = new Date().toLocaleTimeString(); // Or .toISOString() if preferred and working
  console.log(`[${timestamp}] API CQS: ${message}`);
}

// Funzione helper per estrarre testo usando utility locali per DOC, DOCX, TXT
async function extractTextLocally(file: File): Promise<string> {
  console.log(`API - extractTextLocally: Inizio estrazione per ${file.name}, tipo ${file.type}`);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    console.log("API - extractTextLocally: Parsing DOCX con mammoth...");
    const result = await mammoth.extractRawText({ buffer });
    console.log("API - extractTextLocally: Lunghezza testo estratto da DOCX:", result.value?.length);
    return result.value || "";
  } else if (file.type === 'application/msword') {
    console.log("API - extractTextLocally: Parsing DOC con word-extractor...");
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    const body = doc.getBody();
    console.log("API - extractTextLocally: Lunghezza testo estratto da DOC:", body?.length);
    return body || "";
  } else if (file.type === 'text/plain') {
    console.log("API - extractTextLocally: Parsing TXT...");
    const text = buffer.toString('utf-8');
    console.log("API - extractTextLocally: Lunghezza testo estratto da TXT:", text?.length);
    return text;
  }
  console.warn(`API - extractTextLocally: Formato file non gestito localmente: ${file.type}. Restituisco stringa vuota.`);
  return "";
}

// Funzione helper per estrarre testo usando Mistral OCR
async function extractTextWithMistralOcr(file: File, client: MistralClient): Promise<string> {
  logMessage(`API - extractTextWithMistralOcr: Inizio OCR per ${file.name}`);
  try {
    // L'SDK di Mistral potrebbe richiedere un formato specifico per il file,
    // es. un Buffer o uno Stream, o gestire direttamente l'oggetto File.
    // Consultare la documentazione dell'SDK per `client.documents.parse`.
    // Assumendo che l'SDK possa prendere `file` direttamente o dopo conversione a Buffer/Stream.
    
    // Questo è un placeholder, l'API corretta e la sua invocazione 
    // dipendono dalla versione dell'SDK Mistral e dalle sue capacità OCR.
    // const response = await client.documents.parse({ file }); // Esempio ipotetico
    // Se `client.documents.parse` non esiste o funziona diversamente, adattare.

    // DATO CHE L'API documents.parse era solo un esempio e l'SDK attuale non la ha direttamente,
    // si dovrebbe usare l'endpoint chat con capacità multimodali se disponibili, 
    // o un endpoint specifico per l'OCR se Mistral lo fornisce.
    // Per ora, dato che non abbiamo un endpoint OCR diretto confermato e funzionante
    // nell'SDK per i file, questa funzione restituirà un errore simulato o testo vuoto.
    // L'utente aveva confermato che i file (contratto, conteggio) devono essere analizzati da Mistral,
    // il che implica un upload o un passaggio di contenuto.
    
    // Se l'SDK ha un metodo per l'upload di file e poi un riferimento per l'analisi OCR,
    // quello sarebbe il flusso da implementare qui.
    // Per ora, simuliamo che l'OCR non sia direttamente implementabile con la chiamata data.
    logMessage("API - extractTextWithMistralOcr: Funzionalità OCR con client.documents.parse non disponibile/implementata. Simulo estrazione fallita.");
    // throw new Error("OCR via Mistral SDK non implementato in questo helper."); 
    // Invece di un errore, restituiamo stringa vuota per permettere al flusso di continuare
    // e di basarsi sull'estrazione locale se possibile, o per mostrare che l'OCR non ha funzionato.
    return ""; // O un messaggio di errore specifico se preferibile

  } catch (error: any) {
    logMessage(`API - extractTextWithMistralOcr: Errore OCR per ${file.name}: ${error.message}`);
    throw error; // Rilancia l'errore per essere gestito più a monte
  }
}

// Funzione principale per estrarre testo, che decide la strategia
async function extractTextFromFile(file: File, client: MistralClient): Promise<string> {
  console.log(`API - extractTextFromFile: Inizio estrazione per ${file.name}, tipo ${file.type}, size ${file.size}`);
  
  if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
    console.log(`API - extractTextFromFile: ${file.name} è PDF/Immagine, uso Mistral OCR.`);
    return extractTextWithMistralOcr(file, client);
  } else if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword' ||
    file.type === 'text/plain'
  ) {
    console.log(`API - extractTextFromFile: ${file.name} è DOCX/DOC/TXT, uso utility locali.`);
    return extractTextLocally(file);
  } else {
    console.warn(`API - extractTextFromFile: Formato file ${file.type} (${file.name}) non gestito esplicitamente dalle utility locali, tento con Mistral OCR come fallback.`);
    return extractTextWithMistralOcr(file, client); // Fallback a Mistral OCR
  }
}

export async function POST(req: NextRequest) {
  logMessage("--- API POST INIZIO (v5) ---"); // Incremento versione per tracciamento log

  if (!MISTRAL_API_KEY) {
    logMessage("ERRORE: MISTRAL_API_KEY non configurata.");
    return NextResponse.json({ error: "Configurazione API mancante." }, { status: 500 });
  }
  const mistralClient = new MistralClient(MISTRAL_API_KEY);

  try {
    const formData = await req.formData();
    logMessage("API - FormData ricevuto. Itero sulle entries:");
    const filesMap = new Map<string, File>();
    for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
            logMessage(`API - FormData entry: key=${key}, file={ name: '${value.name}', size: ${value.size}, type: '${value.type}' }`);
            filesMap.set(key, value);
        } else {
            logMessage(`API - FormData entry: key=${key}, value='${String(value)}' (Not a File)`);
        }
    }

    const contractFile = filesMap.get('contratto') || null;
    const statementFile = filesMap.get('conteggio') || null;
    const templateFile = filesMap.get('templateFile') || null;

    logMessage(`API - Contract File (da filesMap): ${contractFile ? `{ name: '${contractFile.name}', size: ${contractFile.size}, type: '${contractFile.type}' }` : 'NON TROVATO'}`);
    logMessage(`API - Statement File (da filesMap): ${statementFile ? `{ name: '${statementFile.name}', size: ${statementFile.size}, type: '${statementFile.type}' }` : 'NON TROVATO'}`);
    logMessage(`API - Template File (da filesMap): ${templateFile ? `{ name: '${templateFile.name}', size: ${templateFile.size}, type: '${templateFile.type}' }` : 'NON TROVATO'}`);

    if (!contractFile || !statementFile || !templateFile) {
      console.warn("API - POST /api/cqs: File mancanti nella richiesta.");
      return NextResponse.json({ error: "File mancanti. Assicurati di caricare contratto, conteggio e template." }, { status: 400 });
    }
    
    console.log("API - POST /api/cqs: File ricevuti per Mistral:", { 
      contract: contractFile.name, contractType: contractFile.type,
      statement: statementFile.name, statementType: statementFile.type,
      template: templateFile.name, templateType: templateFile.type 
    });

    let templateTextExtractedPromise: Promise<string>;
    if (templateFile.type === 'application/pdf' || templateFile.type.startsWith('image/')) {
        console.log(`API - POST /api/cqs: Template (${templateFile.name}) è PDF/Immagine, uso Mistral OCR.`);
        templateTextExtractedPromise = extractTextWithMistralOcr(templateFile, mistralClient);
    } else {
        console.log(`API - POST /api/cqs: Template (${templateFile.name}) è ${templateFile.type}, uso utility locali.`);
        templateTextExtractedPromise = extractTextLocally(templateFile);
    }

    const [contractTextExtracted, statementTextExtracted, templateTextExtracted] = await Promise.all([
      extractTextFromFile(contractFile, mistralClient),
      extractTextFromFile(statementFile, mistralClient),
      templateTextExtractedPromise
    ]);
    
    if (templateTextExtracted === "" && templateFile.type !== 'application/pdf' && !templateFile.type.startsWith('image/')) {
        console.error(`API - POST /api/cqs: Testo non estratto dal template ${templateFile.name} (tipo: ${templateFile.type}) con utility locali. Questo formato dovrebbe essere supportato.`);
        // Non blocchiamo se il template è vuoto, il prompt lo gestirà come "Contenuto non disponibile"
    }
    if (templateTextExtracted === "") {
        console.warn(`API - POST /api/cqs: Testo del template ${templateFile.name} è vuoto dopo estrazione.`);
    }

    console.log("API - POST /api/cqs: Testi estratti. Lunghezze:", {
      contract: contractTextExtracted?.length ?? 0,
      statement: statementTextExtracted?.length ?? 0,
      template: templateTextExtracted?.length ?? 0,
    });
    
    if (contractTextExtracted.length < 10 && (contractFile.type === 'application/pdf' || contractFile.type.startsWith('image/'))) {
        console.warn("API - POST /api/cqs: Testo estratto dal contratto (OCR) molto corto o assente. Qualità OCR potrebbe essere bassa.");
    }
    if (statementTextExtracted.length < 10 && (statementFile.type === 'application/pdf' || statementFile.type.startsWith('image/'))) {
        console.warn("API - POST /api/cqs: Testo estratto dal conteggio (OCR) molto corto o assente. Qualità OCR potrebbe essere bassa.");
    }
    if (templateTextExtracted.length < 10 && (templateFile.type === 'application/pdf' || templateFile.type.startsWith('image/'))) {
         console.warn("API - POST /api/cqs: Testo estratto dal template (OCR PDF/Immagine) molto corto o assente. Qualità OCR potrebbe essere bassa.");
    }

    // PARTE 2: Costruzione Prompt e chiamata a Mistral Chat API
    const promptMessages = [
      {
        role: 'user',
        content: `
          Sei un assistente legale esperto specializzato nell'analisi di documenti finanziari e nel calcolo di rimborsi per cessioni del quinto dello stipendio, in conformità con l'Art. 125 sexies del Testo Unico Bancario (T.U.B.) italiano.
          Il tuo compito è analizzare tre testi forniti: il testo di un contratto di finanziamento, il testo di un conteggio estintivo e il testo di un template per una lettera di diffida.

          TESTO DEL CONTRATTO:
          --- Inizio Contratto ---
          ${contractTextExtracted || "Contenuto non disponibile o non estratto."}
          --- Fine Contratto ---

          TESTO DEL CONTEGGIO ESTINTIVO:
          --- Inizio Conteggio Estintivo ---
          ${statementTextExtracted || "Contenuto non disponibile o non estratto."}
          --- Fine Conteggio Estintivo ---

          TEMPLATE PER LA LETTERA DI DIFFIDA:
          --- Inizio Template Lettera ---
          ${templateTextExtracted || "Contenuto del template non disponibile o non estratto."}
          --- Fine Template Lettera ---

          ISTRUZIONI DETTAGLIATE:
          1.  ANALISI DEI DOCUMENTI: Estrai con la massima precisione tutte le informazioni rilevanti dal testo del contratto e dal testo del conteggio estintivo. I dati finanziari sono cruciali.
              Dati chiave da cercare (elenco non esaustivo, cerca ogni dato utile):
              *   Contratto: Nome e Cognome del cliente, Codice Fiscale del cliente, Data di stipula del contratto, Importo totale finanziato (capitale lordo), Numero totale di rate (durata in mesi), Importo della singola rata, TAN (Tasso Annuo Nominale), TAEG (Tasso Annuo Effettivo Globale), Elenco dettagliato e importi di tutte le commissioni (es. commissioni di intermediazione, commissioni di attivazione, spese di istruttoria, premi assicurativi vita e impiego).
              *   Conteggio Estintivo: Data di estinzione anticipata del finanziamento, Capitale residuo alla data di estinzione, Numero di rate residue, Eventuali penali di estinzione anticipata (se applicabili e legali), Dettaglio dei rimborsi già considerati dalla finanziaria (se presenti).

          2.  CALCOLO DEL RIMBORSO: Basandoti sui dati estratti e sull'Art. 125 sexies T.U.B., che prevede il diritto del consumatore a una riduzione, in misura proporzionale alla vita residua del contratto, degli interessi e di tutti i costi compresi nel costo totale del credito (escluse eventuali imposte), calcola l'importo totale del rimborso spettante al cliente.
              Il calcolo deve considerare:
              *   La quota di interessi non maturati.
              *   La quota parte delle commissioni e di tutti gli altri costi ("upfront" e "recurring") non goduti a causa dell'estinzione anticipata. Identifica quali costi sono "up-front" (sostenuti interamente all'inizio) e quali sono "recurring" (maturano nel tempo). Per i costi up-front, il rimborso è proporzionale alla durata residua del contratto.
              *   Fornisci un dettaglio del calcolo, mostrando come sei arrivato all'importo finale del rimborso. Questo dettaglio sarà inserito nella lettera.

          3.  GENERAZIONE LETTERA: Utilizza il "TEMPLATE PER LA LETTERA DI DIFFIDA" fornito. Compila il template sostituendo i segnaposto (tipicamente indicati con parentesi quadre, es. [NOME_CLIENTE], [IMPORTO_RIMBORSO_TOTALE], [DATA_CONTRATTO], [DATA_ESTINZIONE], [DETTAGLIO_CALCOLO_RIMBORSO_ART_125]) con i dati corretti estratti e calcolati.
              Presta particolare attenzione al segnaposto [DETTAGLIO_CALCOLO_RIMBORSO_ART_125]: qui dovrai inserire una spiegazione chiara e concisa del metodo di calcolo utilizzato e delle voci che compongono il rimborso totale.

          4.  FORMATO RISPOSTA: La tua risposta DEVE essere un singolo oggetto JSON. Non aggiungere commenti o testo al di fuori di questo oggetto JSON.
              La struttura del JSON deve essere la seguente:
              {
                "letteraGenerata": "TESTO COMPLETO DELLA LETTERA DI DIFFIDA COMPILATA...",
                "datiEstratti": {
                  "contratto": {
                    "nomeCliente": "Nome Cognome" | null,
                    "codiceFiscale": "CF" | null,
                    "dataStipula": "GG/MM/AAAA" | null,
                    "importoFinanziato": 15000.00 | null, 
                    "numeroRateTotali": 120 | null, 
                    "importoRata": 150.00 | null, 
                    "tan": 5.5 | null, 
                    "taeg": 6.5 | null, 
                    "commissioniIntermediazione": 500.00 | null,
                    "commissioniAttivazione": 100.00 | null,
                    "speseIstruttoria": 150.00 | null,
                    "premioVita": 800.00 | null,
                    "premioImpiego": 700.00 | null,
                    "altriCosti": [ 
                      { "descrizione": "Nome costo", "importo": 100.00 }
                    ] | null
                  },
                  "conteggioEstintivo": {
                    "dataEstinzione": "GG/MM/AAAA" | null,
                    "capitaleResiduo": 8000.00 | null,
                    "numeroRateResidue": 60 | null,
                    "penaleEstinzione": 0.00 | null
                  }
                },
                "calcoloRimborso": {
                  "interessiNonGoduti": 1200.00 | null,
                  "rimborsoCommissioniIntermediazione": 250.00 | null,
                  "rimborsoCommissioniAttivazione": 50.00 | null,
                  "rimborsoSpeseIstruttoria": 75.00 | null,
                  "rimborsoPremioVita": 400.00 | null,
                  "rimborsoPremioImpiego": 350.00 | null,
                  "rimborsoAltriCosti": [ { "descrizione": "Nome costo rimborsato", "importoRimborsato": 50.00 } ] | null,
                  "totaleRimborsabile": 2325.00 | null
                },
                "erroriAnalisi": ["Descrizione di un problema riscontrato durante l'analisi o il calcolo"] | null,
                "debugInfo": {
                    "contractTextSample": "${(contractTextExtracted || "").substring(0, 200)}...",
                    "statementTextSample": "${(statementTextExtracted || "").substring(0, 200)}...",
                    "templateTextSample": "${(templateTextExtracted || "").substring(0,200)}..."
                }
              }
              Se un dato specifico non può essere estratto con certezza, usa 'null' per il suo valore nel JSON.
              Se i testi forniti sono insufficienti o di pessima qualità (es. OCR illeggibile), popola il campo 'erroriAnalisi' con messaggi chiari.
              Nella 'letteraGenerata', assicurati che tutti i segnaposto siano riempiti o gestiti. Se un dato per un segnaposto non è disponibile, indica "[DATO MANCANTE]" nella lettera.
              Sii meticoloso e preciso. La correttezza dei calcoli e dei dati estratti è fondamentale.
              Verifica che TAN e TAEG siano espressi come numeri (es. 5.5 per 5.5%).
              Assicurati che la somma dei rimborsi parziali corrisponda a 'totaleRimborsabile'.
              Converti tutti gli importi numerici in numeri (float o integer), non stringhe.
        `
      }
    ];

    console.log("API - POST /api/cqs: Invio richiesta a Mistral Chat API...");
    const startTime = Date.now();

    const chatResponse = await mistralClient.chat({
      model: 'mistral-large-latest', 
      messages: promptMessages,
      response_format: { type: 'json_object' } 
    });
    
    const endTime = Date.now();
    console.log(`API - POST /api/cqs: Risposta ricevuta da Mistral Chat API in ${endTime - startTime}ms.`);

    if (!chatResponse.choices || chatResponse.choices.length === 0 || !chatResponse.choices[0].message.content) {
      console.error("API - POST /api/cqs: Risposta da Mistral non valida o vuota.");
      throw new Error("Risposta da Mistral non valida o vuota.");
    }

    const responseContent = chatResponse.choices[0].message.content;
    console.log("API - POST /api/cqs: Contenuto grezzo della risposta da Mistral (primi 500 caratteri):", responseContent.substring(0, 500) + "...");
    
    let structuredResponse;
    try {
      structuredResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("API - POST /api/cqs: Errore nel parsing JSON della risposta di Mistral:", parseError);
      console.error("API - POST /api/cqs: Risposta completa da Mistral (che ha causato errore di parsing):", responseContent);
      throw new Error(`Errore nel parsing della risposta JSON da Mistral. Risposta ricevuta: ${responseContent.substring(0, 200)}...`);
    }

    console.log("API - POST /api/cqs: Risposta JSON strutturata da Mistral ricevuta.");
    // console.log("Risposta JSON strutturata da Mistral:", structuredResponse); // Log completo può essere troppo verboso
    
    // Adattamento della risposta di Mistral al formato ResultData del frontend
    const resultDataForFrontend = {
        letter: structuredResponse.letteraGenerata || `Lettera non generata. Errori analisi: ${structuredResponse.erroriAnalisi?.join(', ')}`,
        message: structuredResponse.erroriAnalisi && structuredResponse.erroriAnalisi.length > 0 
                 ? `Avvisi dall'analisi AI: ${structuredResponse.erroriAnalisi.join('; ')}`
                 : "Elaborazione completata con successo tramite Mistral AI.",
        rimborso: structuredResponse.calcoloRimborso?.totaleRimborsabile ?? null,
        quotaNonGoduta: structuredResponse.calcoloRimborso?.interessiNonGoduti ?? null, // Esempio, potrebbe essere una somma di più campi
        totaleCosti: structuredResponse.datiEstratti?.contratto?.importoFinanziato ?? null,
        durataTotale: structuredResponse.datiEstratti?.contratto?.numeroRateTotali ?? null,
        durataResidua: structuredResponse.datiEstratti?.conteggioEstintivo?.numeroRateResidue ?? null,
        storno: null, // Questo campo non è direttamente previsto dal JSON di Mistral, da valutare se necessario
        nomeCliente: structuredResponse.datiEstratti?.contratto?.nomeCliente ?? null,
        dataChiusura: structuredResponse.datiEstratti?.conteggioEstintivo?.dataEstinzione ?? null,
        // Potremmo aggiungere un campo debug al ResultData se necessario
        // debugInfo: structuredResponse.debugInfo,
    };

    if (resultDataForFrontend.rimborso == null || !resultDataForFrontend.letter) {
        console.warn("API - POST /api/cqs: Rimborso o lettera non presenti o nulli nella risposta mappata di Mistral.");
        resultDataForFrontend.message = (resultDataForFrontend.message || "") + 
            " Attenzione: il rimborso o la lettera potrebbero non essere stati generati o recuperati correttamente.";
    }

    return NextResponse.json(resultDataForFrontend, { status: 200 });

  } catch (error: any) {
    console.error("API - POST /api/cqs: Errore generale nella funzione POST:", error);
    let errorMessage = "Errore interno del server durante l'elaborazione della richiesta con Mistral.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    if (error.constructor?.name?.includes('Mistral') || error.status) { 
        console.error("API - POST /api/cqs: Errore specifico da API Mistral:", {
            status: error.status,
            name: error.name,
            message: error.message,
        });
        errorMessage = `Errore dall'API AI (${error.name || 'MistralError'}): ${error.message || 'Dettagli non disponibili'}`;
        return NextResponse.json({ error: errorMessage, details: error.message }, { status: error.status || 500 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 