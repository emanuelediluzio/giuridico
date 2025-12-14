import { NextRequest, NextResponse } from 'next/server';
import puter from 'puter';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Formato messaggi non valido' }, { status: 400 });
    }

    const response = await puter.ai.chat(messages, { model: 'gemini-1.5-pro' });

    return NextResponse.json(response);
  } catch (e: unknown) {
    console.error('Errore server:', e);
    const errorMessage = e instanceof Error ? e.message : 'Errore interno del server';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 