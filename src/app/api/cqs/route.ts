import { NextResponse } from 'next/server';
import { calcolaRimborso, generaLettera } from '@/lib/parsing';
import WordExtractor from 'word-extractor';
import mammoth from 'mammoth';

export const runtime = 'nodejs';
export const maxDuration = 30; // Aumentiamo a 30 secondi

// Rimuoviamo la funzione delay se OCR.space non richiede polling esplicito (risposta diretta)
// const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function extractTextFromApiFile(file: File): Promise<string> {
  console.log(`API - extractTextFromApiFile: Inizio estrazione per ${file.name}, tipo ${file.type}, size ${file.size}`);
  const arrayBuffer = await file.arrayBuffer();

  if (file.type === 'application/pdf') {
    console.log("API - extractTextFromApiFile: Utilizzo iLovePDF API per estrazione testo...");

    try {
      // Prepariamo il PDF per l'invio all'API process_pdf
      const buffer = Buffer.from(arrayBuffer);
      
      // Chiamata diretta all'API iLovePDF utilizzando fetch con l'URL completo
      // Questo dovrebbe funzionare correttamente perché stiamo facendo una chiamata diretta da server a server
      const apiBaseUrl = 'https://api.ilovepdf.com/v1';
      const apiKey = process.env.ILOVEPDF_API_KEY;
      
      if (!apiKey) {
        console.error("API - extractTextFromApiFile: ILOVEPDF_API_KEY non configurata");
        return "";
      }
      
      console.log("API - extractTextFromApiFile: Ottengo token JWT da iLovePDF");
      // 1. Autenticazione
      const authResponse = await fetch(`${apiBaseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ public_key: apiKey })
      });
      
      if (!authResponse.ok) {
        console.error(`API - extractTextFromApiFile: Errore autenticazione iLovePDF (${authResponse.status})`);
        return "";
      }
      
      const authData = await authResponse.json();
      const jwtToken = authData.token;
      
      console.log("API - extractTextFromApiFile: Token ottenuto, avvio task OCR");
      // 2. Avvio task OCR
      const startTaskResponse = await fetch(`${apiBaseUrl}/start/pdfocr`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      
      if (!startTaskResponse.ok) {
        console.error(`API - extractTextFromApiFile: Errore avvio task OCR (${startTaskResponse.status})`);
        return "";
      }
      
      const taskData = await startTaskResponse.json();
      const { task, server } = taskData;
      
      console.log(`API - extractTextFromApiFile: Task avviato: ${task}, Server: ${server}`);
      
      // 3. Upload file
      const uploadFormData = new FormData();
      uploadFormData.append('task', task);
      uploadFormData.append('file', new Blob([buffer], { type: 'application/pdf' }), file.name);
      
      const uploadResponse = await fetch(`https://${server}/v1/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        },
        body: uploadFormData
      });
      
      if (!uploadResponse.ok) {
        console.error(`API - extractTextFromApiFile: Errore upload PDF (${uploadResponse.status})`);
        return "";
      }
      
      const uploadData = await uploadResponse.json();
      const serverFilename = uploadData.server_filename;
      
      console.log(`API - extractTextFromApiFile: File caricato, server_filename: ${serverFilename}`);
      
      // 4. Process file
      const processResponse = await fetch(`https://${server}/v1/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task,
          tool: 'pdfocr',
          files: [{ server_filename: serverFilename, filename: file.name }],
          ocr_languages: ['ita']
        })
      });
      
      if (!processResponse.ok) {
        console.error(`API - extractTextFromApiFile: Errore processamento OCR (${processResponse.status})`);
        return "";
      }
      
      console.log("API - extractTextFromApiFile: OCR completato, scarico file processato");
      
      // 5. Download processato
      const downloadResponse = await fetch(`https://${server}/v1/download/${task}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      
      if (!downloadResponse.ok) {
        console.error(`API - extractTextFromApiFile: Errore download file OCR (${downloadResponse.status})`);
        return "";
      }
      
      const pdfOcrBytes = await downloadResponse.arrayBuffer();
      
      // 6. Avvia task per estrazione testo
      console.log("API - extractTextFromApiFile: File OCR scaricato, avvio estrazione testo");
      
      const startExtractResponse = await fetch(`${apiBaseUrl}/start/extract`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      
      if (!startExtractResponse.ok) {
        console.error(`API - extractTextFromApiFile: Errore avvio task estrazione (${startExtractResponse.status})`);
        return "";
      }
      
      const extractTaskData = await startExtractResponse.json();
      const { task: extractTask, server: extractServer } = extractTaskData;
      
      // 7. Upload file OCR per estrazione testo
      const extractUploadFormData = new FormData();
      extractUploadFormData.append('task', extractTask);
      extractUploadFormData.append('file', new Blob([pdfOcrBytes], { type: 'application/pdf' }), "ocr_output.pdf");
      
      const extractUploadResponse = await fetch(`https://${extractServer}/v1/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        },
        body: extractUploadFormData
      });
      
      if (!extractUploadResponse.ok) {
        console.error(`API - extractTextFromApiFile: Errore upload PDF OCR (${extractUploadResponse.status})`);
        return "";
      }
      
      const extractUploadData = await extractUploadResponse.json();
      const extractServerFilename = extractUploadData.server_filename;
      
      // 8. Process extract
      const extractProcessResponse = await fetch(`https://${extractServer}/v1/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task: extractTask,
          tool: 'extract',
          files: [{ server_filename: extractServerFilename, filename: "ocr_output.pdf" }]
        })
      });
      
      if (!extractProcessResponse.ok) {
        console.error(`API - extractTextFromApiFile: Errore processamento estrazione (${extractProcessResponse.status})`);
        return "";
      }
      
      console.log("API - extractTextFromApiFile: Estrazione completata, scarico testo");
      
      // 9. Download testo
      const textDownloadResponse = await fetch(`https://${extractServer}/v1/download/${extractTask}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      
      if (!textDownloadResponse.ok) {
        console.error(`API - extractTextFromApiFile: Errore download testo (${textDownloadResponse.status})`);
        return "";
      }
      
      const textBytes = await textDownloadResponse.arrayBuffer();
      const finalText = new TextDecoder().decode(textBytes);
      
      console.log(`API - extractTextFromApiFile: Testo estratto, lunghezza ${finalText.length} caratteri`);
      console.log("API - extractTextFromApiFile: Primi 300 caratteri:", finalText.substring(0, 300));
      
      return finalText;
    } catch (error) {
      console.error("API - extractTextFromApiFile: ERRORE durante interazione con API iLovePDF:", error);
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
    let pdfUploaded = false;

    // Impostiamo un timeout generale per l'intera funzione
    const timeout = setTimeout(() => {
      console.error("API - TIMEOUT: La funzione ha impiegato troppo tempo");
    }, 25000); // 25 secondi di avviso, prima del timeout effettivo di 30 secondi

    if (contentType.includes("multipart/form-data")) {
      try {
        const formData = await request.formData();
        console.log("API - FormData ricevuto:", Array.from(formData.keys())); // Logga tutte le chiavi

        const contractFile = formData.get("contractFile") as File | null;
        const statementFile = formData.get("statementFile") as File | null;
        const templateFile = formData.get("templateFile") as File | null;

        console.log("API - Contract File:", contractFile ? { name: contractFile.name, size: contractFile.size, type: contractFile.type } : "NON TROVATO");
        console.log("API - Statement File:", statementFile ? { name: statementFile.name, size: statementFile.size, type: statementFile.type } : "NON TROVATO");
        console.log("API - Template File:", templateFile ? { name: templateFile.name, size: templateFile.size, type: templateFile.type } : "NON TROVATO");

        // Verifico se sono stati caricati file PDF
        if (contractFile?.type === 'application/pdf' || statementFile?.type === 'application/pdf') {
          pdfUploaded = true;
        }

        // Utilizziamo Promise.all per processare i file in parallelo
        const results = await Promise.all([
          contractFile ? extractTextFromApiFile(contractFile) : formData.get('contractText') as string || '',
          statementFile ? extractTextFromApiFile(statementFile) : formData.get('statementText') as string || '',
          templateFile ? extractTextFromApiFile(templateFile) : formData.get('templateText') as string || ''
        ]);

        [contractText, statementText, templateText] = results;

      } catch (formError) {
        console.error("API - Errore durante elaborazione FormData:", formError);
        clearTimeout(timeout);
        return NextResponse.json(
          { error: 'Errore durante elaborazione dei file caricati' },
          { status: 400 }
        );
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      contractText = body.contractText || '';
      statementText = body.statementText || '';
      templateText = body.templateText || '';
    }

    // LOG dei dati ricevuti (versione breve)
    console.log('--- API /api/cqs ---');
    console.log('CONTRACT:', contractText.substring(0, 100) + '...');
    console.log('STATEMENT:', statementText.substring(0, 100) + '...');
    console.log('TEMPLATE:', templateText.substring(0, 100) + '...');

    // Se sono stati caricati PDF ma non abbiamo testo estratto, non restituiamo errore
    // ma informiamo l'utente che i PDF non possono essere elaborati dal server
    if (pdfUploaded && (!contractText || !statementText)) {
      clearTimeout(timeout);
      return NextResponse.json({
        message: "I file PDF caricati non possono essere elaborati lato server in questo momento.",
        pdfProcessingDisabled: true,
        templateText: templateText // Restituiamo comunque il template elaborato
      }, { status: 200 });
    }

    if (!contractText && !pdfUploaded) {
      clearTimeout(timeout);
      return NextResponse.json(
        { error: 'Devi fornire almeno testo del contratto.' },
        { status: 400 }
      );
    }

    // Calcola il rimborso se c'è testo
    let result = undefined, letter = undefined;
    if (contractText && statementText) {
      result = calcolaRimborso(contractText, statementText);
      if (templateText) {
        letter = generaLettera(
          templateText,
          result.rimborso.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }),
          {
            nomeCliente: result.nomeCliente,
            dataChiusura: result.dataChiusura
          }
        );
      }
    }

    clearTimeout(timeout);
    return NextResponse.json({
      ...(result ? { ...result, letter } : {}),
      // Inviamo solo i primi 500 caratteri per debug
      debugContractText: contractText.substring(0, 500),
      debugStatementText: statementText.substring(0, 500),
      debugTemplateText: templateText.substring(0, 500) 
    });
  } catch (error) {
    console.error('Errore:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 