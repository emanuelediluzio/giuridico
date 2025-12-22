import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from '../process_pdf';
import { processWithGeminiChat } from '../process_pdf/gemini';
import { calcolaRimborso, generaLettera } from '../../../lib/parsing';

export const maxDuration = 30; // Ridotto il timeout

export async function POST(req: NextRequest) {
  console.log("[API CQS] Ricevuta richiesta POST");

  try {
    const formData = await req.formData();
    console.log("[API CQS] FormData ricevuto");

    // Estrazione dei file
    const contractFile = formData.get('contract') as File;
    const statementFile = formData.get('statement') as File;
    const templateFile = formData.get('template') as File;

    if (!contractFile || !statementFile || !templateFile) {
      return NextResponse.json({ error: 'File mancanti' }, { status: 400 });
    }

    // Estrazione testo completa
    console.log("[API CQS] Estrazione testo...");
    const contractText = await extractTextFromPDF(contractFile, false);
    const statementText = await extractTextFromPDF(statementFile, false);
    const templateText = await extractTextFromPDF(templateFile, false);

    // Calcolo rimborso con dati estratti
    console.log("[API CQS] Calcolo rimborso...");
    const datiRimborso = calcolaRimborso(contractText, statementText);

    // Formattazione importo
    const importoFormattato = datiRimborso.rimborso > 0
      ? `${datiRimborso.rimborso.toFixed(2).replace('.', ',')} €`
      : '0,00 €';

    console.log("[API CQS] Dati estratti:", {
      nomeCliente: datiRimborso.nomeCliente,
      codiceFiscale: datiRimborso.codiceFiscale,
      dataNascita: datiRimborso.dataNascita,
      luogoNascita: datiRimborso.luogoNascita,
      importoRimborso: importoFormattato,
      dataChiusura: datiRimborso.dataChiusura
    });

    // Generazione lettera con dati estratti
    console.log("[API CQS] Generazione lettera...");
    const letteraGenerata = generaLettera(templateText, importoFormattato, {
      nomeCliente: datiRimborso.nomeCliente,
      dataChiusura: datiRimborso.dataChiusura,
      codiceFiscale: datiRimborso.codiceFiscale,
      dataNascita: datiRimborso.dataNascita,
      luogoNascita: datiRimborso.luogoNascita
    });

    // Se la lettera generata contiene ancora molti placeholder, usa Mistral come fallback
    const placeholderCount = (letteraGenerata.match(/XXXXX|XXXXXX|XXX|____/g) || []).length;

    if (placeholderCount > 5) {
      console.log("[API CQS] Troppi placeholder, uso Mistral come fallback...");

      const systemPrompt = "Sei un assistente legale. Genera una lettera di diffida basata sui documenti forniti, sostituendo tutti i placeholder con i dati reali.";
      const userPrompt = `Genera una lettera di diffida basata su:

CONTRATTO:
${contractText.substring(0, 3000)}

CONTEGGIO:
${statementText.substring(0, 3000)}

TEMPLATE:
${templateText.substring(0, 2000)}

DATI ESTRATTI:
- Nome Cliente: ${datiRimborso.nomeCliente}
- Codice Fiscale: ${datiRimborso.codiceFiscale || 'Non disponibile'}
- Data Nascita: ${datiRimborso.dataNascita || 'Non disponibile'}
- Luogo Nascita: ${datiRimborso.luogoNascita || 'Non disponibile'}
- Importo Rimborso: ${importoFormattato}
- Data Chiusura: ${datiRimborso.dataChiusura || 'Non disponibile'}

Sostituisci tutti i placeholder (XXXXX, XXXXXX, XXX, ____) con i dati reali forniti. Genera solo la lettera, senza commenti aggiuntivi.`;

      const result = await processWithGeminiChat(systemPrompt, userPrompt);
      return NextResponse.json(result);
    }

    console.log("[API CQS] Lettera generata con successo");
    return NextResponse.json({
      lettera: letteraGenerata,
      dati: {
        nomeCliente: datiRimborso.nomeCliente,
        codiceFiscale: datiRimborso.codiceFiscale,
        dataNascita: datiRimborso.dataNascita,
        luogoNascita: datiRimborso.luogoNascita,
        importoRimborso: importoFormattato,
        dataChiusura: datiRimborso.dataChiusura
      }
    });

  } catch (error) {
    console.error("[API CQS] Errore:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
      lettera: "Si è verificato un errore durante la generazione della lettera. Riprova più tardi."
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "API CQS è attiva" });
}
