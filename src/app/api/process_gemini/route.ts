import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    // Leggi i file come buffer
    const [contractBuf, statementBuf, templateBuf] = await Promise.all([
      contract.arrayBuffer(),
      statement.arrayBuffer(),
      template.arrayBuffer(),
    ]);

    // Inizializza Gemini
    const genAI = new GoogleGenerativeAI("AIzaSyC3pH12fuAhqq5itHMxedzOJ1nQ5vw0osQ");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Prompt
    const prompt = "Analizza i seguenti documenti PDF: contratto, conteggio estintivo e template lettera. Compila la lettera di richiesta rimborso secondo il template, usando i dati estratti dagli altri PDF.";

    // Prepara i file per Gemini
    const contractPart = {
      inlineData: {
        data: Buffer.from(contractBuf).toString("base64"),
        mimeType: "application/pdf",
      },
    };
    const statementPart = {
      inlineData: {
        data: Buffer.from(statementBuf).toString("base64"),
        mimeType: "application/pdf",
      },
    };
    const templatePart = {
      inlineData: {
        data: Buffer.from(templateBuf).toString("base64"),
        mimeType: "application/pdf",
      },
    };

    // Chiamata a Gemini
    const result = await model.generateContent([
      prompt,
      contractPart,
      statementPart,
      templatePart,
    ]);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ lettera: text });

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore sconosciuto" }, { status: 500 });
  }
} 