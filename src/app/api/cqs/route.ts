import { NextResponse, NextRequest } from 'next/server';
import WordExtractor from 'word-extractor';
import mammoth from 'mammoth';
import MistralClient from '@mistralai/mistralai';

export const runtime = 'nodejs';
export const maxDuration = 55; // Manteniamo 55 secondi, ma monitoriamo

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

// Funzione helper per il logging
function logMessage(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] API CQS: ${message}`);
}

// Funzione helper per estrarre testo usando utility locali per DOC, DOCX, TXT
async function extractTextLocally(file: File): Promise<string> {
  logMessage(`extractTextLocally: Inizio estrazione per ${file.name}, tipo ${file.type}`);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    logMessage("extractTextLocally: Parsing DOCX con mammoth...");
    const result = await mammoth.extractRawText({ buffer });
    logMessage(`extractTextLocally: Lunghezza testo estratto da DOCX: ${result.value?.length}`);
    return result.value || "";
  } else if (file.type === 'application/msword') {
    logMessage("extractTextLocally: Parsing DOC con word-extractor...");
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    const body = doc.getBody();
    logMessage(`extractTextLocally: Lunghezza testo estratto da DOC: ${body?.length}`);
    return body || "";
  } else if (file.type === 'text/plain') {
    logMessage("extractTextLocally: Parsing TXT...");
    const text = buffer.toString('utf-8');
    logMessage(`extractTextLocally: Lunghezza testo estratto da TXT: ${text?.length}`);
    return text;
  }
  logMessage(`extractTextLocally: Formato file non gestito localmente: ${file.type}. Restituisco stringa vuota.`);
  return "";
}

// Funzione helper per estrarre testo usando Mistral OCR (attualmente placeholder)
async function extractTextWithMistralOcr(file: File, client: any): Promise<string> { // Modificato client: MistralClient -> client: any
  logMessage(`extractTextWithMistralOcr: Inizio OCR per ${file.name}`);
  try {
    logMessage("extractTextWithMistralOcr: Funzionalità OCR con SDK Mistral non implementata/disponibile in questo helper. Simulo estrazione fallita e restituisco stringa vuota.");
    // In un'implementazione reale, qui ci sarebbe la logica per usare l'API OCR/multimodale di Mistral
    return ""; 
  } catch (error: any) {
    logMessage(`extractTextWithMistralOcr: Errore OCR per ${file.name}: ${error.message}`);
    throw error; 
  }
}

// Funzione principale per estrarre testo, che decide la strategia
async function extractTextFromFile(file: File, client: any): Promise<string> { // Modificato client: MistralClient -> client: any
  logMessage(`extractTextFromFile: Inizio estrazione per ${file.name}, tipo ${file.type}, size ${file.size}`);
  
  if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
    logMessage(`extractTextFromFile: ${file.name} è PDF/Immagine, tento Mistral OCR.`);
    return extractTextWithMistralOcr(file, client);
  } else if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword' ||
    file.type === 'text/plain'
  ) {
    logMessage(`extractTextFromFile: ${file.name} è DOCX/DOC/TXT, uso utility locali.`);
    return extractTextLocally(file);
  } else {
    logMessage(`extractTextFromFile: Formato file ${file.type} (${file.name}) non gestito esplicitamente, tento con Mistral OCR come fallback.`);
    return extractTextWithMistralOcr(file, client);
  }
}

export async function POST(req: NextRequest) {
  logMessage("--- API POST INIZIO ---");

  if (!MISTRAL_API_KEY) {
    logMessage("ERRORE: MISTRAL_API_KEY non configurata.");
    return NextResponse.json({ error: "Configurazione API mancante." }, { status: 500 });
  }
  
  // Tentativo di risolvere il TypeError: h(...) is not a constructor
  // Accediamo a .default se esiste, altrimenti usiamo MistralClient direttamente.
  // Manteniamo 'as any' per sopprimere errori TS durante questa fase di debug runtime.
  const ClientConstructor = (MistralClient as any).default || MistralClient;
  const mistralClient = new (ClientConstructor as any)(MISTRAL_API_KEY);

  try {
    const formData = await req.formData();
    logMessage("FormData ricevuto. Itero sulle entries:");
    const filesMap = new Map<string, File>();
    for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
            logMessage(`FormData entry: key=${key}, file={ name: '${value.name}', size: ${value.size}, type: '${value.type}' }`);
            filesMap.set(key, value);
        } else {
            logMessage(`FormData entry: key=${key}, value='${String(value)}' (Not a File)`);
        }
    }

    const contractFile = filesMap.get('contratto') || null;
    const statementFile = filesMap.get('conteggio') || null;
    const templateFile = filesMap.get('templateFile') || null;

    logMessage(`Contract File (da filesMap): ${contractFile ? `{ name: '${contractFile.name}', type: '${contractFile.type}' }` : 'NON TROVATO'}`);
    logMessage(`Statement File (da filesMap): ${statementFile ? `{ name: '${statementFile.name}', type: '${statementFile.type}' }` : 'NON TROVATO'}`);
    logMessage(`Template File (da filesMap): ${templateFile ? `{ name: '${templateFile.name}', type: '${templateFile.type}' }` : 'NON TROVATO'}`);

    if (!contractFile || !statementFile || !templateFile) {
      logMessage("File mancanti nella richiesta.");
      return NextResponse.json({ error: "File mancanti. Assicurati di caricare contratto, conteggio e template." }, { status: 400 });
    }
    
    logMessage(`File ricevuti: Contratto: ${contractFile.name}, Conteggio: ${statementFile.name}, Template: ${templateFile.name}`);

    let templateTextExtractedPromise: Promise<string>;
    // Il template viene sempre letto localmente come testo, come da istruzioni utente.
    // Non si usa OCR per il template, ma solo estrazione diretta.
    if (templateFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        templateFile.type === 'application/msword' ||
        templateFile.type === 'text/plain') {
        logMessage(`Template (${templateFile.name}) è ${templateFile.type}, uso utility locali.`);
        templateTextExtractedPromise = extractTextLocally(templateFile);
    } else {
        logMessage(`Template (${templateFile.name}) è di tipo ${templateFile.type}, che non è DOC/DOCX/TXT. Tentativo di estrazione come testo semplice fallirà probabilmente o darà risultati inattesi. Procedo comunque con estrazione locale.`);
        // Se il template non è un formato testuale atteso, extractTextLocally potrebbe restituire stringa vuota.
        templateTextExtractedPromise = extractTextLocally(templateFile); 
    }


    const [contractTextExtracted, statementTextExtracted, templateTextExtracted] = await Promise.all([
      extractTextFromFile(contractFile, mistralClient),
      extractTextFromFile(statementFile, mistralClient),
      templateTextExtractedPromise
    ]);
    
    if (templateTextExtracted === "") {
        logMessage(`Testo del template ${templateFile.name} è vuoto dopo estrazione. Il prompt lo userà come "Contenuto non disponibile".`);
    }

    logMessage(`Testi estratti. Lunghezze: Contratto=${contractTextExtracted?.length ?? 0}, Conteggio=${statementTextExtracted?.length ?? 0}, Template=${templateTextExtracted?.length ?? 0}`);
    
    if (contractTextExtracted.length < 10 && (contractFile.type === 'application/pdf' || contractFile.type.startsWith('image/'))) {
        logMessage("Testo estratto dal contratto (OCR) molto corto o assente. Qualità OCR potrebbe essere bassa o OCR non funzionante.");
    }
    if (statementTextExtracted.length < 10 && (statementFile.type === 'application/pdf' || statementFile.type.startsWith('image/'))) {
        logMessage("Testo estratto dal conteggio (OCR) molto corto o assente. Qualità OCR potrebbe essere bassa o OCR non funzionante.");
    }

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

    logMessage("Invio richiesta a Mistral Chat API...");
    const startTime = Date.now();

    // Modificato: mistralClient.chat -> (mistralClient as any).chat
    const chatResponse = await (mistralClient as any).chat({
      model: 'mistral-large-latest', 
      messages: promptMessages,
      response_format: { type: 'json_object' } 
    });
    
    const endTime = Date.now();
    logMessage(`Risposta ricevuta da Mistral Chat API in ${endTime - startTime}ms.`);

    if (!chatResponse.choices || chatResponse.choices.length === 0 || !chatResponse.choices[0].message.content) {
      logMessage("Risposta da Mistral non valida o vuota.");
      throw new Error("Risposta da Mistral non valida o vuota.");
    }

    const responseContent = chatResponse.choices[0].message.content;
    logMessage(`Contenuto grezzo della risposta da Mistral (primi 500 caratteri): ${responseContent.substring(0, 500)}...`);
    
    let structuredResponse;
    try {
      structuredResponse = JSON.parse(responseContent);
    } catch (parseError) {
      logMessage(`Errore nel parsing JSON della risposta di Mistral: ${parseError}`);
      logMessage(`Risposta completa da Mistral (che ha causato errore di parsing): ${responseContent}`);
      throw new Error(`Errore nel parsing della risposta JSON da Mistral. Risposta ricevuta: ${responseContent.substring(0, 200)}...`);
    }

    logMessage("Risposta JSON strutturata da Mistral ricevuta.");
    
    // Adattamento della risposta di Mistral al formato ResultData del frontend { lettera: string, calcoli: string }
    let calcoliContent = "Dettaglio calcoli non disponibile.";
    if (structuredResponse.calcoloRimborso) {
        try {
            calcoliContent = JSON.stringify(structuredResponse.calcoloRimborso, null, 2);
        } catch (stringifyError) {
            logMessage(`Errore durante JSON.stringify di structuredResponse.calcoloRimborso: ${stringifyError}`);
            calcoliContent = "Errore nella formattazione dei dettagli dei calcoli.";
        }
    }

    let letteraGenerata = structuredResponse.letteraGenerata || "";
    
    if (structuredResponse.erroriAnalisi && structuredResponse.erroriAnalisi.length > 0) {
        const erroriMsg = `Errori durante l'analisi AI: ${structuredResponse.erroriAnalisi.join('; ')}`;
        logMessage(erroriMsg);
        // Aggiungiamo gli errori ai calcoli o alla lettera per visibilità nel frontend
        if (calcoliContent === "Dettaglio calcoli non disponibile.") {
            calcoliContent = erroriMsg;
        } else {
            calcoliContent = `${erroriMsg}\n\n${calcoliContent}`;
        }
        if (!letteraGenerata) {
            letteraGenerata = `Generazione lettera fallita a causa di errori nell'analisi: ${structuredResponse.erroriAnalisi.join('; ')}`;
        }
    }
    if (!letteraGenerata) {
        letteraGenerata = "Lettera non generata (nessun contenuto specifico da Mistral).";
    }


    const resultDataForFrontend = {
        lettera: letteraGenerata,
        calcoli: calcoliContent,
    };

    if (!resultDataForFrontend.lettera && !resultDataForFrontend.calcoli.includes("Errori durante l'analisi AI")) {
        logMessage("Rimborso o lettera non presenti o nulli nella risposta mappata di Mistral, senza errori espliciti.");
         // Non sovrascriviamo calcoli se contengono già un errore.
        if (resultDataForFrontend.calcoli === "Dettaglio calcoli non disponibile."){
            resultDataForFrontend.calcoli = (resultDataForFrontend.calcoli || "") + 
            " Attenzione: il rimborso o la lettera potrebbero non essere stati generati o recuperati correttamente.";
        }
    }

    return NextResponse.json(resultDataForFrontend, { status: 200 });

  } catch (error: any) {
    logMessage(`Errore generale nella funzione POST: ${error.stack || error.message || error}`);
    let errorMessage = "Errore interno del server durante l'elaborazione della richiesta.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Controlla se è un errore specifico dell'API Mistral
    if (error.constructor?.name?.includes('Mistral') || error.status) { 
        logMessage(`Errore specifico da API Mistral: Status=${error.status}, Name=${error.name}, Message=${error.message}`);
        errorMessage = `Errore dall'API AI (${error.name || 'MistralError'}): ${error.message || 'Dettagli non disponibili'}`;
        return NextResponse.json({ error: errorMessage, details: error.message }, { status: error.status || 500 });
    }

    return NextResponse.json({ error: errorMessage, details: String(error) }, { status: 500 });
  }
} 