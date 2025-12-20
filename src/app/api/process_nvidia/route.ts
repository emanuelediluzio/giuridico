import { NextRequest, NextResponse } from "next/server";
import puter from 'puter';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { contractImg, statementImg, templateImg } = await req.json();

    if (!contractImg || !statementImg || !templateImg) {
      return NextResponse.json({ error: "Immagini mancanti" }, { status: 400 });
    }

    // Prompt minimale
    const prompt = `Analizza le seguenti immagini di documenti (contratto, conteggio estintivo, template) e genera una lettera formale seguendo il template fornito. La risposta deve essere solo la lettera generata, senza commenti aggiuntivi.`;

    // Construct messages for visual chat
    // Assuming puter.ai.chat supports standard OpenAI-like vision format or accepts an array of content
    const messages = [
      {
        role: "system",
        content: "Sei un assistente AI specializzato nella redazione di lettere formali in italiano. La tua risposta deve essere solo la lettera generata, senza commenti aggiuntivi."
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: contractImg } },
          { type: "image_url", image_url: { url: statementImg } },
          { type: "image_url", image_url: { url: templateImg } }
        ]
      }
    ];

    const response = await puter.ai.chat(messages, { model: 'gemini-2.5-flash' });

    // puter.ai.chat usually returns the message object or content directly. 
    // Based on the previous file implementation, we assume it returns an object similar to { message: { content: ... } } or just the content?
    // Actually in the previous edit I assumed it returns the full response object and I returned it as JSON.
    // Let's assume puter.ai.chat returns a response object compatible with what the client expects OR I should traverse it.
    // The client likely expects { result: "text" } or the full response.
    // In src/app/api/chat/route.ts I returned NextResponse.json(response).
    // Here the client expects { result: generatedLetter }.

    // If puter.ai.chat returns a string (the content), it's simple. 
    // If it returns an object { created: ..., choices: [...] }, I need to extract content.
    // Most 'puter.js' wrapper examples suggest it returns the *content string* or an object. 
    // Safest is to check or handle both.
    // However, looking at my `chat/route.ts` replacement:
    // `const response = await puter.ai.chat(messages); return NextResponse.json(response);`
    // If `puter` returns a string, returning it as json might throw if it's not an object, or just return "string".

    // Let's assume for this specific route, I need to send back { result: text }.
    // I will check if response is object or string.

    let generatedLetter;
    if (typeof response === 'string') {
      generatedLetter = response;
    } else if (typeof response === 'object' && response !== null && 'message' in response) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      generatedLetter = (response as any).message?.content;
    } else if (Array.isArray(response) && response.length > 0 && 'message' in response[0]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      generatedLetter = (response as any)[0].message?.content;
    } else {
      // Fallback: try to stringify or access standard choices
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      generatedLetter = (response as any).choices?.[0]?.message?.content || JSON.stringify(response);
    }

    return NextResponse.json({ result: generatedLetter });

  } catch (error) {
    if ((error as Error).message?.includes('timed out')) {
      return NextResponse.json(
        { error: "Timeout: la generazione ha impiegato troppo tempo. Riprova con documenti più piccoli o riprova più tardi." },
        { status: 504 }
      );
    }
    console.error("Errore:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
} 