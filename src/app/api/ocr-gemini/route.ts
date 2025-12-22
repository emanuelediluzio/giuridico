import { NextRequest, NextResponse } from "next/server";
import puter from '@heyputer/puter.js';

// Force Node.js runtime for puter compatibility
export const runtime = 'nodejs';

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

    const prompt = `You are a precise OCR and Data Extraction engine. 
    1. Extract ALL visible text from the image (Italian).
    2. Find the first assignment percentage (e.g. "20%", "un quinto", "1/5"). If it's "un quinto", the value is 20.
    
    Return ONLY a valid JSON object. Do NOT use Markdown code blocks. Do NOT output any other text.
    Format:
    {
      "ocrText": "FULL_EXTRACTED_TEXT",
      "result": {
        "valore": <integer_percentage_found_or_null>,
        "stato": <"OK" if valore >= ${threshold} else "NO">
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

    console.log("[OCR-GEMINI] Sending request to Puter...");
    const response = await puter.ai.chat(messages, { model: 'gemini-2.5-flash' });
    console.log("[OCR-GEMINI] Response received (type):", typeof response);

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

    console.log("[OCR-GEMINI] Content extracted:", content.substring(0, 100) + "...");

    // Try to parse JSON from the response
    // Clean up potential markdown code blocks
    let jsonString = content.replace(/```json\n?|\n?```/g, "").trim();

    // Fallback: look for the first '{' and last '}'
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      try {
        const jsonPart = JSON.parse(jsonString);
        return NextResponse.json(jsonPart);
      } catch (e) {
        console.error("Failed to parse JSON from response", e);
        console.error("Raw content was:", content);
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