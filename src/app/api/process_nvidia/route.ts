import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { contractImg, statementImg, templateImg } = await req.json();

    if (!contractImg || !statementImg || !templateImg) {
      return NextResponse.json({ error: "Immagini mancanti" }, { status: 400 });
    }

    // Prompt minimale per NVIDIA
    const prompt = `Analizza le seguenti immagini di documenti (contratto, conteggio estintivo, template) e genera una lettera formale seguendo il template fornito. La risposta deve essere solo la lettera generata, senza commenti aggiuntivi.`;

    // Prepara le immagini per NVIDIA API (base64 senza header)
    function stripBase64Header(dataUrl: string) {
      return dataUrl.replace(/^data:image\/jpeg;base64,/, "");
    }
    const images = [contractImg, statementImg, templateImg].map(stripBase64Header);

    // Chiamata a NVIDIA API (modello gemma-3-27b-it)
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it",
        messages: [
          {
            role: "system",
            content: "Sei un assistente AI specializzato nella redazione di lettere formali in italiano. La tua risposta deve essere solo la lettera generata, senza commenti aggiuntivi."
          },
          {
            role: "user",
            content: prompt,
            images: images
          }
        ],
        max_tokens: 2048,
        temperature: 0.7
      })
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      const text = await response.text();
      console.error("Risposta non JSON da NVIDIA:", text);
      if (text.includes('timeout') || text.includes('timed out')) {
        return NextResponse.json(
          { error: "Timeout: la generazione ha impiegato troppo tempo. Riprova con documenti più piccoli o riprova più tardi." },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: `Errore NVIDIA: ${text}` },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error("Errore NVIDIA API:", data);
      return NextResponse.json(
        { error: data.error?.message || "Errore nella generazione della lettera" },
        { status: 500 }
      );
    }

    const generatedLetter = data.choices?.[0]?.message?.content;

    if (!generatedLetter) {
      return NextResponse.json(
        { error: "Nessuna risposta generata" },
        { status: 500 }
      );
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