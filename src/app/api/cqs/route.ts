import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { extractTextFromPDF } from '../process_pdf';
import { processWithMistralChat } from '../process_pdf/mistral';

export const maxDuration = 60; // Imposto il timeout massimo consentito da Vercel piano hobby

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
