import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from '../process_pdf';
import { processWithMistralChat } from '../process_pdf/mistral';

export const maxDuration = 30; // Ridotto il timeout

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

    // Estrazione testo semplificata - solo i primi 2000 caratteri per velocizzare
    console.log("[API CQS] Estrazione testo semplificata...");
    const contractText = await extractTextFromPDF(contractFile, false);
    const statementText = await extractTextFromPDF(statementFile, false);
    const templateText = await extractTextFromPDF(templateFile, false);

    // Troncamento aggressivo per velocizzare
    const MAX_LENGTH = 2000; // Ridotto drasticamente
    const truncatedContractText = contractText.substring(0, MAX_LENGTH);
    const truncatedStatementText = statementText.substring(0, MAX_LENGTH);
    const truncatedTemplateText = templateText.substring(0, 1000);

    console.log("[API CQS] Testi troncati, invio a Mistral...");

    // Prompt semplificato
    const systemPrompt = "Sei un assistente legale. Genera una lettera di diffida basata sui documenti forniti.";
    const userPrompt = `Genera una lettera di diffida basata su:

CONTRATTO:
${truncatedContractText}

CONTEGGIO:
${truncatedStatementText}

TEMPLATE:
${truncatedTemplateText}

Genera solo la lettera, senza commenti aggiuntivi.`;

    console.log("[API CQS] Invio richiesta a Mistral...");
    const result = await processWithMistralChat(systemPrompt, userPrompt);
    console.log("[API CQS] Risposta ricevuta da Mistral");

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API CQS] Errore:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
      lettera: "Si è verificato un errore durante la generazione della lettera. Riprova più tardi."
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "API CQS è attiva" });
}
