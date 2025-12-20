import { NextRequest, NextResponse } from 'next/server';
import puter from 'puter';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'File mancante o non valido' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type || 'image/png'};base64,${base64}`;

    // Esegui OCR con Puter
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: "Estrai tutto il testo da questa immagine." },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ];

    const response = await puter.ai.chat(messages, { model: 'gemini-1.5-flash' });

    let text = "";
    if (typeof response === 'string') {
      text = response;
    } else if (typeof response === 'object' && response !== null && 'message' in response) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      text = (response as any).message?.content || "";
    } else if (Array.isArray(response) && response.length > 0 && 'message' in response[0]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      text = (response as any)[0].message?.content || "";
    } else {
      text = JSON.stringify(response);
    }

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 