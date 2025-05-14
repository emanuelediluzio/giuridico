import { NextResponse } from 'next/server';
import { calcolaRimborso, generaLettera } from '@/lib/parsing';
import WordExtractor from 'word-extractor';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';

export const runtime = 'nodejs';

async function extractTextFromApiFile(file: File): Promise<string> {
  console.log(`API - extractTextFromApiFile: Inizio estrazione per ${file.name}, tipo ${file.type}, size ${file.size}`);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(`API - extractTextFromApiFile: Buffer creato, lunghezza ${buffer.length}`);

  if (file.type === 'application/pdf') {
    try {
      console.log("API - extractTextFromApiFile: Tentativo parsing PDF...");
      const data = await pdf(buffer);
      console.log("API - extractTextFromApiFile: Parsing PDF completato.");
      console.log("API - extractTextFromApiFile: Info da pdf-parse:", { numpages: data.numpages, numrender: data.numrender, info: data.info, metadata: data.metadata, version: data.version });
      console.log("API - extractTextFromApiFile: Lunghezza testo estratto da PDF:", data.text?.length);
      console.log("API - extractTextFromApiFile: Testo PDF (primi 300 char):", data.text?.substring(0, 300));
      return data.text || ""; // Assicurati di restituire stringa vuota se data.text è null/undefined
    } catch (pdfError) {
      console.error("API - extractTextFromApiFile: ERRORE durante parsing PDF:", pdfError);
      return ""; // Restituisci stringa vuota in caso di errore
    }
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    console.log("API - extractTextFromApiFile: Tentativo parsing DOCX...");
    const result = await mammoth.extractRawText({ buffer });
    console.log("API - extractTextFromApiFile: Lunghezza testo estratto da DOCX:", result.value?.length);
    return result.value;
  } else if (file.type === 'application/msword') {
    console.log("API - extractTextFromApiFile: Tentativo parsing DOC...");
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    const body = doc.getBody();
    console.log("API - extractTextFromApiFile: Lunghezza testo estratto da DOC:", body?.length);
    return body;
  } else if (file.type === 'text/plain') {
    console.log("API - extractTextFromApiFile: Tentativo parsing TXT...");
    const text = buffer.toString('utf-8');
    console.log("API - extractTextFromApiFile: Lunghezza testo estratto da TXT:", text?.length);
    return text;
  } else {
    console.warn(`API - extractTextFromApiFile: Formato file non supportato direttamente: ${file.type}. Tentativo come testo generico.`);
    try {
      return buffer.toString('utf-8');
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