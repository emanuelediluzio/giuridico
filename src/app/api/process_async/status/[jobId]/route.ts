import { NextRequest, NextResponse } from "next/server";
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    // Estrai jobId dall'URL
    const urlParts = req.nextUrl.pathname.split('/');
    const jobId = urlParts[urlParts.length - 1];
    
    // Recupera il job da Redis
    const jobData = await redis.get(`job:${jobId}`);
    
    if (!jobData) {
      return NextResponse.json(
        { error: 'Job non trovato' },
        { status: 404 }
      );
    }

    // Se è già un oggetto, usalo direttamente, altrimenti fai il parse
    const job = typeof jobData === "string" ? JSON.parse(jobData) : jobData;
    
    return NextResponse.json(job);

  } catch (error) {
    console.error("[API Process Async Status] Errore:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
} 