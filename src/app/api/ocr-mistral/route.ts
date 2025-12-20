import { NextRequest, NextResponse } from "next/server";
import puter from 'puter';

export async function POST(req: NextRequest) {
  try {
    // 1. Ricevi il file dal form-data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const threshold = Number(formData.get("threshold")) || 50;

    if (!file) return NextResponse.json({ error: "File mancante" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const prompt = `Analizza questa immagine. Estrai l'intero testo visibile. Poi trova la prima percentuale nel testo (formato "42%" o "73 percento").
    Restituisci ESCLUSIVAMENTE un oggetto JSON con il seguente formato, senza markdown o altro testo:
    {
      "ocrText": "tutto il testo estratto dall'immagine",
      "result": {
        "valore": <numero intero trovato o null>,
        "stato": <"OK" se valore >= ${threshold}, altrimenti "NO">
      }
    }`;

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrl } }
        ]
      }
    ];

    const response = await puter.ai.chat(messages, { model: 'gemini-2.5-flash' });

    let content = "";
    if (typeof response === 'string') {
      content = response;
    } else if (typeof response === 'object' && response !== null && 'message' in response) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content = (response as any).message?.content || "";
    } else if (Array.isArray(response) && response.length > 0 && 'message' in response[0]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content = (response as any)[0].message?.content || "";
    } else {
      content = JSON.stringify(response);
    }

    // Try to parse JSON from the response
    // The model might wrap it in ```json ```
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const jsonPart = JSON.parse(jsonMatch[0]);
        return NextResponse.json(jsonPart);
      } catch (e) {
        console.error("Failed to parse JSON from response", e);
      }
    }

    // Fallback if not proper JSON
    return NextResponse.json({
      ocrText: content,
      result: { valore: null, stato: "NO" },
      raw: content
    });

  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}