import { NextRequest, NextResponse } from "next/server";
import puter from 'puter';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const contract = formData.get("contract") as File;
    const statement = formData.get("statement") as File;
    const template = formData.get("template") as File;

    if (!contract || !statement || !template) {
      return NextResponse.json({ error: "File mancanti" }, { status: 400 });
    }

    // Leggi i file come buffer e converti in base64
    const [contractBuf, statementBuf, templateBuf] = await Promise.all([
      contract.arrayBuffer(),
      statement.arrayBuffer(),
      template.arrayBuffer(),
    ]);

    const contractBase64 = Buffer.from(contractBuf).toString("base64");
    const statementBase64 = Buffer.from(statementBuf).toString("base64");
    const templateBase64 = Buffer.from(templateBuf).toString("base64");

    const contractDataUrl = `data:application/pdf;base64,${contractBase64}`;
    const statementDataUrl = `data:application/pdf;base64,${statementBase64}`;
    const templateDataUrl = `data:application/pdf;base64,${templateBase64}`;

    // Prompt
    const prompt = "Analizza i seguenti documenti PDF: contratto, conteggio estintivo e template lettera. Compila la lettera di richiesta rimborso secondo il template, usando i dati estratti dagli altri PDF.";

    // Construct messages
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: contractDataUrl } },
          { type: "image_url", image_url: { url: statementDataUrl } },
          { type: "image_url", image_url: { url: templateDataUrl } }
        ]
      }
    ];

    // Chiamata a Puter
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

    return NextResponse.json({ lettera: text });

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore sconosciuto" }, { status: 500 });
  }
} 