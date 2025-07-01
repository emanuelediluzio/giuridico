import { NextRequest, NextResponse } from 'next/server';
import { pipeline } from '@xenova/transformers';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'File mancante o non valido' }, { status: 400 });
    }

    // Carica la pipeline OCR (TrOCR base)
    const ocr = await pipeline('image-to-text', 'Xenova/trocr-base-handwritten');

    // Leggi il file come buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Esegui OCR
    const result = await ocr(buffer);
    return NextResponse.json({ text: result[0]?.generated_text || '' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 