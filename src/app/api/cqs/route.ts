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

    // Log all form data entries
    // for (const [key, value] of (formData as any).entries()) {
    //   if (value instanceof File) {
    //     logMessage(`File trovato nel FormData: key=${key}, name=${value.name}, size=${value.size}, type=${value.type}`);
    //   } else {
    //     logMessage(`Valore trovato nel FormData: key=${key}, value=${value}`);
    //   }
    // }
    
    const contractFile = formData.get("contract") as File | null;
    const statementFile = formData.get("statement") as File | null;
    const templateFile = formData.get("template") as File | null;

    if (contractFile) {
      filesInfo.contract = `${contractFile.name} (${contractFile.size} bytes)`;
      logMessage("API - Contract File Trovato:", filesInfo.contract);
      // Utilizza Mistral OCR per il contratto
      contractText = await extractTextWithMistralOcr(contractFile, MISTRAL_API_KEY);
      if (!contractText || contractText.startsWith("Errore:")) {
        logMessage("Fallimento estrazione testo contratto con Mistral OCR.", contractText);
        // Potresti voler restituire un errore qui se l'OCR del contratto è cruciale
      }
    } else {
      logMessage("API - Contract File: NON TROVATO");
    }

    if (statementFile) {
      filesInfo.statement = `${statementFile.name} (${statementFile.size} bytes)`;
      logMessage("API - Statement File Trovato:", filesInfo.statement);
      // Utilizza pdf-parse per il conteggio estintivo
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
    
    if (contractText.startsWith("Errore:") && contractText.includes("MISTRAL_API_KEY non configurata")) {
        return NextResponse.json({ error: contractText }, { status: 500 });
    }

    const SYSTEM_PROMPT = `
Sei un assistente legale altamente qualificato specializzato nell'analisi di documenti finanziari e nella generazione di lettere di diffida per problematiche relative a Cessioni del Quinto dello Stipendio (CQS).

Il tuo compito è analizzare TRE documenti forniti dall'utente:
1.  CONTRATTO CQS: Un file PDF contenente il contratto originale della Cessione del Quinto. Da questo dovrai estrarre i dati anagrafici dell'intestatario, i dettagli del finanziamento (importo erogato, numero rate, importo rata, date, TAN, TAEG), e le informazioni sulla compagnia assicurativa e i costi delle polizze.
2.  CONTEGGIO ESTINTIVO: Un file PDF (o altro formato da cui è stato estratto il testo) contenente il conteggio estintivo fornito dalla banca o finanziaria. Da questo documento dovrai estrarre: la data del conteggio, il debito residuo, i dietimi di interesse, le commissioni, il tasso di interesse applicato per il calcolo degli interessi residui, e l'importo totale da rimborsare per l'estinzione anticipata.
3.  TEMPLATE LETTERA: Un file di testo (.txt o .docx da cui è stato estratto il testo) che funge da modello per la lettera di diffida. Questo template conterrà dei segnaposto (es. {{NOME_CLIENTE}}, {{IMPORTO_RICHIESTO}}, ecc.) che dovrai popolare con i dati estratti dai primi due documenti e con i calcoli che effettuerai.

Il tuo OBBIETTIVO FINALE è duplice:
A. CALCOLI PRECISIONE:
    1.  Determinare l'importo degli INTERESSI NON GODUTI: Basati sul debito residuo e sul TAN originario del contratto CQS, calcola gli interessi che il cliente non pagherà grazie all'estinzione anticipata.
    2.  Determinare i PREMI ASSICURATIVI NON GODUTI: Calcola la quota dei premi assicurativi (vita e impiego) pagati ma non goduti a causa dell'estinzione anticipata. Usa la durata originaria del piano e il numero di rate residue implicite dal conteggio estintivo.
    3.  Determinare le COMMISSIONI NON MATURATE: Se il contratto originale o il conteggio estintivo specificano commissioni (es. commissioni di intermediazione, commissioni di attivazione) che sono state pagate anticipatamente e che sono relative alla durata totale del prestito, calcola la quota non maturata.
    4.  CALCOLARE L'IMPORTO TOTALE DA RIMBORSARE AL CLIENTE: Somma gli interessi non goduti, i premi assicurativi non goduti e le commissioni non maturate. Questo è l'importo che il cliente ha diritto a vedersi rimborsato.

B. COMPILAZIONE LETTERA DI DIFFIDA:
    1.  Utilizza il TEMPLATE LETTERA fornito.
    2.  Sostituisci TUTTI i segnaposto presenti nel template con:
        *   I dati anagrafici e i dettagli del finanziamento estratti dal CONTRATTO CQS.
        *   I dettagli rilevanti estratti dal CONTEGGIO ESTINTIVO.
        *   I risultati dei CALCOLI effettuati (interessi non goduti, premi non goduti, commissioni non maturate, importo totale da rimborsare).
        *   Qualsiasi altra informazione pertinente che ritieni utile per supportare la richiesta del cliente.
    3.  La lettera deve essere formattata professionalmente, chiara, concisa e legalmente solida. Presta attenzione alla grammatica e alla sintassi.

Output Richiesto:
Devi restituire un oggetto JSON con la seguente struttura:
{
  "letteraDiffidaCompleta": "...", // La lettera di diffida compilata come stringa
  "datiEstratti": {
    "contratto": {
      "nomeCliente": "...",
      "codiceFiscale": "...",
      "dataNascita": "...",
      "indirizzo": "...",
      "numeroContratto": "...",
      "dataContratto": "...",
      "importoErogato": "...",
      "numeroRateOriginario": "...",
      "importoRata": "...",
      "tan": "...",
      "taeg": "...",
      "compagniaAssicurativaVita": "...",
      "costoPolizzaVita": "...",
      "compagniaAssicurativaImpiego": "...",
      "costoPolizzaImpiego": "...",
      // ... altri campi rilevanti dal contratto
    },
    "conteggioEstintivo": {
      "dataConteggio": "...",
      "debitoResiduo": "...", // al lordo degli interessi futuri da stornare
      "interessiResiduiDaStornare": "...", // se esplicitati nel conteggio, altrimenti calcolali tu
      "penaleEstinzione": "...", // se presente
      "commissioniResidue": "...", // se presenti
      "importoTotaleEstinzioneNetto": "...", // l'importo effettivamente pagato o da pagare per estinguere
      // ... altri campi rilevanti dal conteggio
    }
  },
  "calcoliEffettuati": {
    "interessiNonGodutiStimato": "...", // Stima basata sul TAN e debito residuo
    "premiAssicurativiNonGodutiStimato": "...",
    "commissioniNonMaturateStimate": "...",
    "totaleRimborsabileStimato": "..." // Somma dei tre precedenti
  },
  "logAnalisi": "Breve log dei passaggi chiave, delle difficoltà incontrate (es. dati mancanti, PDF illeggibili) e delle assunzioni fatte."
}

IMPORTANTE:
*   Se alcuni dati non sono reperibili nei documenti, indicalo chiaramente nel campo 'logAnalisi' e nei campi specifici (es. "Dato non trovato"). NON INVENTARE DATI.
*   Se un PDF è parzialmente illeggibile o il testo estratto è di scarsa qualità, segnalalo nel 'logAnalisi'. Fai del tuo meglio con quello che hai.
*   Presta attenzione alle date per calcolare correttamente le durate residue e le quote non godute.
*   Assicurati che tutti i calcoli siano motivati e, se possibile, fai riferimento ai dati usati per il calcolo.
*   Se il template contiene segnaposto non corrispondenti ai dati che hai, cerca di adattare o segnala la discrepanza nel log.
`;

    const userPrompt = `Analizza i seguenti documenti e genera la lettera di diffida come specificato nelle istruzioni di sistema.

<documento id="contratto_cqs">
<nome_file>${filesInfo.contract}</nome_file>
<contenuto>
${contractText || "Contenuto non disponibile o illeggibile."}
</contenuto>
</documento>

<documento id="conteggio_estintivo">
<nome_file>${filesInfo.statement}</nome_file>
<contenuto>
${statementText || "Contenuto non disponibile o illeggibile."}
</contenuto>
</documento>

<documento id="template_lettera">
<nome_file>${filesInfo.template}</nome_file>
<contenuto>
${templateText || "Contenuto non disponibile o illeggibile."}
</contenuto>
</documento>
`;

    logMessage("Prompt per Mistral AI:", { system: SYSTEM_PROMPT.length, user: userPrompt.length });
    
    const CHAT_API_URL = "https://api.mistral.ai/v1/chat/completions";

    const apiRequestBody = {
      model: "mistral-large-latest", // o un altro modello appropriato
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" }, // Per forzare l'output JSON
    };

    logMessage("Invio richiesta a Mistral Chat API...");
    const mistralResponse = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify(apiRequestBody),
    });

    logMessage("Risposta da Mistral Chat API ricevuta", { status: mistralResponse.status });

    if (!mistralResponse.ok) {
      const errorBody = await mistralResponse.text();
      logMessage("Errore dalla Mistral Chat API", {
        status: mistralResponse.status,
        body: errorBody,
      });
      return NextResponse.json(
        { error: "Errore dalla Mistral API", details: errorBody, filesInfo },
        { status: mistralResponse.status }
      );
    }

    const result = await mistralResponse.json();
    logMessage("Risultato JSON da Mistral Chat API parsato.");

    // Assumendo che 'result.choices[0].message.content' sia la stringa JSON che vogliamo
    // e che il modello rispetti la richiesta di output JSON.
    // Se il modello non restituisce un JSON valido come stringa nel content, 
    // dovremmo adattare questo parsing o la struttura del prompt.
    try {
      const contentString = result.choices[0].message.content;
      const parsedContent = JSON.parse(contentString); // Parsa la stringa JSON
      logMessage("Contenuto del messaggio parsato con successo.");
      return NextResponse.json(parsedContent, { status: 200 });
    } catch (e) {
      logMessage("Errore nel parsing del contenuto del messaggio JSON da Mistral", { error: e, content: result.choices[0].message.content });
      return NextResponse.json(
        { error: "Errore nel parsing della risposta JSON da Mistral.", details: result.choices[0].message.content, filesInfo },
        { status: 500 }
      );
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
