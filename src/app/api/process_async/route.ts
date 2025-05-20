import { NextRequest, NextResponse } from "next/server";
import { Redis } from '@upstash/redis';
import { nanoid } from 'nanoid';

// Inizializza il client Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Estrazione dei file
    const contractFile = formData.get('contract') as File;
    const statementFile = formData.get('statement') as File;
    const templateFile = formData.get('template') as File;

    if (!contractFile || !statementFile || !templateFile) {
      return NextResponse.json({ error: 'File mancanti' }, { status: 400 });
    }

    // Genera un ID univoco per il job
    const jobId = nanoid();

    // Converti i file in base64
    const [contractBase64, statementBase64, templateBase64] = await Promise.all([
      fileToBase64(contractFile),
      fileToBase64(statementFile),
      fileToBase64(templateFile)
    ]);

    // Crea il job
    const job = {
      id: jobId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      files: {
        contract: contractBase64,
        statement: statementBase64,
        template: templateBase64
      }
    };

    // Salva il job in Redis
    await redis.set(`job:${jobId}`, JSON.stringify(job));
    
    // Aggiungi il job alla coda
    await redis.lpush('processing_queue', jobId);

    return NextResponse.json({ 
      jobId,
      status: 'pending',
      message: 'Job creato con successo. Usa /api/process_async/status/[jobId] per controllare lo stato.'
    });

  } catch (error) {
    console.error("[API Process Async] Errore:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
} 