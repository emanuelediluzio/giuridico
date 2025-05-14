import { NextResponse } from 'next/server';
import { calcolaRimborso, generaLettera } from '@/lib/parsing';
import WordExtractor from 'word-extractor';
import mammoth from 'mammoth';

export const runtime = 'nodejs';

// Funzione helper per ritardare l'esecuzione
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function extractTextFromApiFile(file: File): Promise<string> {
  console.log(`API - extractTextFromApiFile: Inizio estrazione per ${file.name}, tipo ${file.type}, size ${file.size}`);
  const arrayBuffer = await file.arrayBuffer();

  if (file.type === 'application/pdf') {
    // IMPORTANTE: Spostare questa API key in una variabile d'ambiente (es. DOCUPIPE_API_KEY)
    const apiKey = process.env.DOCUPIPE_API_KEY;

    if (!apiKey) {
      console.error("API - extractTextFromApiFile: DOCUPIPE_API_KEY non configurata.");
      return "";
    }

    console.log("API - extractTextFromApiFile: Tentativo di estrazione testo da PDF tramite API DocuPipe...");

    try {
      // 1. Converti ArrayBuffer in base64
      const buffer = Buffer.from(arrayBuffer);
      const base64Content = buffer.toString('base64');
      console.log("API - extractTextFromApiFile: Contenuto PDF convertito in base64.");

      // 2. POST del documento a DocuPipe
      const postUrl = "https://app.docupipe.ai/document";
      const postPayload = {
        document: {
          file: {
            contents: base64Content,
            filename: file.name,
          },
        },
      };
      const postHeaders = {
        "accept": "application/json",
        "content-type": "application/json",
        "X-API-Key": apiKey,
      };

      console.log(`API - extractTextFromApiFile: Invio POST a DocuPipe: ${postUrl}`);
      const postResponse = await fetch(postUrl, {
        method: 'POST',
        headers: postHeaders,
        body: JSON.stringify(postPayload),
      });

      if (!postResponse.ok) {
        const errorBody = await postResponse.text();
        console.error(`API - extractTextFromApiFile: Errore DocuPipe POST (${postResponse.status}): ${errorBody}`);
        throw new Error(`DocuPipe POST error (${postResponse.status}): ${errorBody}`);
      }

      const postResult = await postResponse.json();
      const documentId = postResult.documentId;
      console.log(`API - extractTextFromApiFile: DocuPipe documentId ricevuto: ${documentId}`);

      if (!documentId) {
        console.error("API - extractTextFromApiFile: DocuPipe non ha restituito un documentId.");
        throw new Error("DocuPipe non ha restituito un documentId.");
      }

      // 3. Polling per il risultato del documento
      const getUrl = `https://app.docupipe.ai/document/${documentId}`;
      const getHeaders = {
        "accept": "application/json",
        "X-API-Key": apiKey,
      };
      let attempts = 0;
      const maxAttempts = 10; // Prova per max 50 secondi (10 tentativi * 5 sec)
      const pollInterval = 5000; // 5 secondi

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`API - extractTextFromApiFile: Tentativo GET ${attempts}/${maxAttempts} per ${documentId} a ${getUrl}`);
        await delay(pollInterval); // Attendi prima di ogni tentativo (tranne il primo se delay è dopo)

        const getResponse = await fetch(getUrl, { headers: getHeaders });

        if (!getResponse.ok) {
          const errorBody = await getResponse.text();
          // Non interrompere per errori 5xx durante il polling, potrebbe essere transitorio
          if (getResponse.status >= 400 && getResponse.status < 500) {
             console.error(`API - extractTextFromApiFile: Errore DocuPipe GET (${getResponse.status}): ${errorBody}`);
             throw new Error(`DocuPipe GET error (${getResponse.status}): ${errorBody}`);
          } else {
            console.warn(`API - extractTextFromApiFile: Avviso DocuPipe GET (${getResponse.status}): ${errorBody}. Riprovo...`);
            continue; // Riprova se è un errore server o non fatale
          }
        }

        const getResult = await getResponse.json();

        if (getResult.status === "completed") {
          console.log("API - extractTextFromApiFile: DocuPipe elaborazione completata.");
          const pagesText = getResult.result?.pagesText;
          if (pagesText && Array.isArray(pagesText)) {
            const extractedText = pagesText.join("\\n\\n"); // Unisci il testo di tutte le pagine
            console.log("API - extractTextFromApiFile: Testo estratto da DocuPipe lunghezza:", extractedText.length);
            console.log("API - extractTextFromApiFile: Testo DocuPipe (primi 300 char):", extractedText.substring(0, 300));
            return extractedText;
          } else {
            console.warn("API - extractTextFromApiFile: DocuPipe ha completato ma pagesText è mancante o non è un array.");
            return "";
          }
        } else if (getResult.status === "processing") {
          console.log(`API - extractTextFromApiFile: DocuPipe ancora in elaborazione per ${documentId} (tentativo ${attempts})...`);
        } else if (getResult.status === "failed") {
            console.error(`API - extractTextFromApiFile: DocuPipe elaborazione fallita per ${documentId}. Dettagli:`, getResult.result || "Nessun dettaglio fornito");
            return ""; // Elaborazione fallita
        } else {
          console.warn(`API - extractTextFromApiFile: Stato DocuPipe sconosciuto o inatteso: ${getResult.status}. Riprovo...`);
        }
      }

      console.error(`API - extractTextFromApiFile: DocuPipe timeout dopo ${maxAttempts} tentativi per ${documentId}.`);
      return ""; // Timeout

    } catch (docuPipeError) {
      console.error("API - extractTextFromApiFile: ERRORE durante interazione con API DocuPipe per PDF:", docuPipeError);
      return ""; 
    }
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    console.log("API - extractTextFromApiFile: Tentativo parsing DOCX...");
    const buffer = Buffer.from(arrayBuffer); 
    const result = await mammoth.extractRawText({ buffer });
    console.log("API - extractTextFromApiFile: Lunghezza testo estratto da DOCX:", result.value?.length);
    return result.value;
  } else if (file.type === 'application/msword') {
    console.log("API - extractTextFromApiFile: Tentativo parsing DOC...");
    const buffer = Buffer.from(arrayBuffer); 
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    const body = doc.getBody();
    console.log("API - extractTextFromApiFile: Lunghezza testo estratto da DOC:", body?.length);
    return body;
  } else if (file.type === 'text/plain') {
    console.log("API - extractTextFromApiFile: Tentativo parsing TXT...");
    const buffer = Buffer.from(arrayBuffer);
    const text = buffer.toString('utf-8');
    console.log("API - extractTextFromApiFile: Lunghezza testo estratto da TXT:", text?.length);
    return text;
  } else {
    console.warn(`API - extractTextFromApiFile: Formato file non supportato direttamente: ${file.type}. Tentativo come testo generico.`);
    try {
      // Per tipi di file non gestiti esplicitamente, proviamo a decodificarli come UTF-8
      const text = new TextDecoder('utf-8').decode(arrayBuffer);
      console.log("API - extractTextFromApiFile: Lunghezza testo estratto da tipo non supportato (come TXT):", text?.length);
      return text;
    } catch (e) {
      console.error(`Errore leggendo file di tipo ${file.type} come testo:`, e)
      return '';
    }
  }
}

async function callOpenRouterAIMultimodal({ prompt, file }: { prompt: string, file?: File }): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return '';
  const formData = new FormData();
  formData.append('model', 'deepseek/deepseek-chat-v3-0324:free');
  formData.append('messages', JSON.stringify([
    { role: 'system', content: 'Sei un assistente legale esperto di cessione del quinto.' },
    { role: 'user', content: prompt }
  ]));
  // Allego solo immagini (jpg/png), MAI PDF
  if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
    formData.append('files', file);
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(request: Request) {
  console.log("--- API POST INIZIO (v3) ---");
  try {
    const contentType = request.headers.get("content-type") || "";
    let contractText = "";
    let statementText = "";
    let templateText = ""; // Usato solo se NON è .doc
    let originalTemplateFileName = "template.txt"; // Default

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      console.log("API - FormData ricevuto:", Array.from(formData.keys())); // Logga tutte le chiavi

      const contractFile = formData.get("contractFile") as File | null;
      const statementFile = formData.get("statementFile") as File | null;
      const templateFile = formData.get("templateFile") as File | null;

      console.log("API - Contract File:", contractFile ? { name: contractFile.name, size: contractFile.size, type: contractFile.type } : "NON TROVATO");
      console.log("API - Statement File:", statementFile ? { name: statementFile.name, size: statementFile.size, type: statementFile.type } : "NON TROVATO");
      console.log("API - Template File:", templateFile ? { name: templateFile.name, size: templateFile.size, type: templateFile.type } : "NON TROVATO");

      if (contractFile) {
        contractText = await extractTextFromApiFile(contractFile);
      } else {
        contractText = formData.get('contractText') as string || '';
      }

      if (statementFile) {
        statementText = await extractTextFromApiFile(statementFile);
      } else {
        statementText = formData.get('statementText') as string || '';
      }
      
      if (templateFile) {
        templateText = await extractTextFromApiFile(templateFile);
      } else {
        templateText = formData.get('templateText') as string || '';
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      contractText = body.contractText || '';
      statementText = body.statementText || '';
      statementText = body.templateText || '';
    }
    // LOG dei dati ricevuti
    console.log('--- API /api/cqs ---');
    console.log('CONTRACT:', contractText);
    console.log('STATEMENT:', statementText);
    console.log('TEMPLATE:', templateText);
    if (!contractText) {
      return NextResponse.json(
        { error: 'Devi fornire almeno testo.' },
        { status: 400 }
      );
    }
    // Calcola il rimborso se c'è testo
    let result = undefined, letter = undefined;
    if (contractText && statementText) {
      result = calcolaRimborso(contractText, statementText);
      letter = generaLettera(
        templateText,
        result.rimborso.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }),
        {
          nomeCliente: result.nomeCliente,
          dataChiusura: result.dataChiusura
        }
      );
    }
    return NextResponse.json({
      ...(result ? { ...result, letter } : {}),
      debugContractText: contractText,
      debugStatementText: statementText,
      debugTemplateText: templateText
    });
  } catch (error) {
    console.error('Errore:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message + (error.stack ? ('\n' + error.stack) : '') : String(error) },
      { status: 500 }
    );
  }
} 