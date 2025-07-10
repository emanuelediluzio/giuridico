import { NextRequest, NextResponse } from "next/server";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY!;
const BASE_URL = "https://api.mistral.ai/v1";

export async function POST(req: NextRequest) {
  try {
    // 1. Ricevi il file dal form-data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "File mancante" }, { status: 400 });

    // 2. OCR con Mistral
    const ocrResp = await fetch(`${BASE_URL}/vision/ocr`, {
      method: "POST",
      headers: { Authorization: `Bearer ${MISTRAL_API_KEY}` },
      body: (() => {
        const fd = new FormData();
        fd.append("file", file);
        return fd;
      })(),
    });
    if (!ocrResp.ok) throw new Error("Errore OCR Mistral");
    const ocrJson = await ocrResp.json();
    const ocrText = ocrJson.text || ocrJson.data?.text || "";

    // 3. Prompt per Mixtral
    const threshold = Number(formData.get("threshold")) || 50;
    const prompt = `Estratto dal OCR:\n\"\"\"\n${ocrText}\n\"\"\"\nTrova la prima percentuale nel testo (formato “42%” o “73 percento").\nRestituisci JSON con chiavi:\n  - valore: numero intero\n  - stato: 'OK' se valore >= ${threshold}, altrimenti 'NO'\n`;

    // 4. Chiamata Mixtral
    const compResp = await fetch(`${BASE_URL}/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b",
        prompt,
        temperature: 0.0,
        max_tokens: 64,
      }),
    });
    if (!compResp.ok) throw new Error("Errore completions Mistral");
    const compJson = await compResp.json();
    let textResponse = compJson.choices?.[0]?.text?.trim() || "";
    let result: any = null;
    try {
      result = compJson.choices?.[0]?.json;
    } catch {
      // fallback: estrai numero con regex
      const m = textResponse.match(/(\d+)/);
      const val = m ? parseInt(m[1], 10) : null;
      const stato = val !== null && val >= threshold ? "OK" : "NO";
      result = { valore: val, stato };
    }

    return NextResponse.json({ result, ocrText, raw: textResponse });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
} 