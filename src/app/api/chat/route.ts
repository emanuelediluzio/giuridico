import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Formato messaggi non valido' }, { status: 400 });
    }

    const apiKey = process.env.MIXTRAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key mancante' }, { status: 500 });
    }

    const res = await fetch('https://api.mixtral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-instruct',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
      console.error('Errore API:', errorData);
      return NextResponse.json({ error: errorData.error || 'Errore nella comunicazione con il modello' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('Errore server:', e);
    return NextResponse.json({ error: e.message || 'Errore interno del server' }, { status: 500 });
  }
} 