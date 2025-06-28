import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from '../process_pdf';
import { processWithMistralChat } from '../process_pdf/mistral';

export const maxDuration = 60; // Imposto il timeout massimo consentito da Vercel piano hobby

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
    const MAX_LENGTH = 6000; // Ridotto drasticamente per evitare errori API Mistral (limite token)
    const truncatedContractText = contractText.length > MAX_LENGTH 
      ? contractText.substring(0, MAX_LENGTH) + "\n[...testo omesso per limitazioni di dimensione...]\n" + contractText.substring(contractText.length - MAX_LENGTH)
      : contractText;
    
    const truncatedStatementText = statementText.length > MAX_LENGTH
      ? statementText.substring(0, MAX_LENGTH) + "\n[...testo omesso per limitazioni di dimensione...]\n" + statementText.substring(statementText.length - MAX_LENGTH)
      : statementText;

    // Limita anche il template a 2000 caratteri
    const truncatedTemplateText = templateText.length > 2000
      ? templateText.substring(0, 2000) + "\n[...testo omesso per limitazioni di dimensione...]\n"
      : templateText;

    // Debug dei testi troncati
    console.log("[API CQS] --- DEBUG TESTI TRONCATI (input per LLM) ---");
    console.log("[API CQS] Testo Contratto TRONCATO (primi 500 char):", truncatedContractText.substring(0, 500));
    console.log("[API CQS] Testo Contratto TRONCATO (...ultimi 500 char):", truncatedContractText.substring(truncatedContractText.length - 500));
    console.log("[API CQS] Testo Conteggio TRONCATO (primi 500 char):", truncatedStatementText.substring(0, 500));
    console.log("[API CQS] Testo Conteggio TRONCATO (...ultimi 500 char):", truncatedStatementText.substring(truncatedStatementText.length - 500));
    console.log("[API CQS] Testo Template TRONCATO (primi 500 char):", truncatedTemplateText.substring(0, 500));
    console.log("[API CQS] Testo Template TRONCATO (...ultimi 500 char):", truncatedTemplateText.substring(truncatedTemplateText.length - 500));
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
${truncatedTemplateText}
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
