import { NextRequest, NextResponse } from "next/server";
import * as pdfjs from "pdfjs-dist";

export const maxDuration = 60;

async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;
  let fullText = "";
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }
  
  return fullText;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const contract = formData.get("contract") as File;
    const statement = formData.get("statement") as File;
    const template = formData.get("template") as File;

    if (!contract || !statement || !template) {
      return NextResponse.json({ error: "File mancanti" }, { status: 400 });
    }

    // Leggi i file come buffer
    const [contractBuf, statementBuf, templateBuf] = await Promise.all([
      contract.arrayBuffer(),
      statement.arrayBuffer(),
      template.arrayBuffer(),
    ]);

    // Estrai il testo dai PDF
    const [contractText, statementText, templateText] = await Promise.all([
      extractTextFromPDF(contractBuf),
      extractTextFromPDF(statementBuf),
      extractTextFromPDF(templateBuf),
    ]);

    // Costruisci il prompt per NVIDIA
    const prompt = `Analizza i seguenti documenti e genera una lettera formale basata sul template fornito:

CONTRATTO:
${contractText}

DICHIARAZIONE:
${statementText}

TEMPLATE:
${templateText}

Genera una lettera formale in italiano che:
1. Segua il formato del template
2. Includa le informazioni rilevanti dal contratto e dalla dichiarazione
3. Mantenga un tono professionale e formale
4. Sia grammaticalmente corretta e ben strutturata`;

    // Chiamata a NVIDIA API
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta/llama-4-maverick-17b-128e-instruct",
        messages: [
          { 
            role: "system", 
            content: "Sei un assistente AI specializzato nella redazione di lettere formali in italiano. La tua risposta deve essere solo la lettera generata, senza commenti aggiuntivi."
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        max_tokens: 2048,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Errore NVIDIA API:", error);
      return NextResponse.json(
        { error: "Errore nella generazione della lettera" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const generatedLetter = data.choices?.[0]?.message?.content;

    if (!generatedLetter) {
      return NextResponse.json(
        { error: "Nessuna risposta generata" },
        { status: 500 }
      );
    }

    return NextResponse.json({ result: generatedLetter });

  } catch (error) {
    console.error("Errore:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
} 