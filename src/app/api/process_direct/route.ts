import { NextRequest, NextResponse } from "next/server";
import { processFilesDirectly } from "../process_pdf/direct_process";

export const maxDuration = 300; // Aumentiamo il timeout a 5 minuti dato che potrebbe richiedere più tempo

export async function POST(req: NextRequest) {
  console.log("[API Direct Process] Ricevuta richiesta POST");
  
  try {
    const formData = await req.formData();
    console.log("[API Direct Process] FormData ricevuto");

    // Estrazione dei file
    const contractFile = formData.get('contract') as File;
    const statementFile = formData.get('statement') as File;
    const templateFile = formData.get('template') as File;

    if (!contractFile || !statementFile || !templateFile) {
      return NextResponse.json({ error: 'File mancanti' }, { status: 400 });
    }

    // Log dei file ricevuti
    console.log("[API Direct Process] File ricevuti:", {
      contract: { name: contractFile.name, size: contractFile.size, type: contractFile.type },
      statement: { name: statementFile.name, size: statementFile.size, type: statementFile.type },
      template: { name: templateFile.name, size: templateFile.size, type: templateFile.type }
    });

    // Processo diretto dei file con Mistral
    const result = await processFilesDirectly(contractFile, statementFile, templateFile);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error("[API Direct Process] Errore:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
} 