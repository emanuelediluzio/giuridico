import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 15; // Timeout molto breve

export async function POST(req: NextRequest) {
  try {
    const { contractText, statementText, templateText } = await req.json();

    if (!contractText || !statementText || !templateText) {
      return NextResponse.json({ error: 'Testi mancanti' }, { status: 400 });
    }

    // Lettera di esempio generata localmente per test
    const letteraEsempio = `Oggetto: Richiesta di rimborso ai sensi dell'Art. 125 sexies T.U.B.

Gentile Direzione,

La sottoscritta, avvalendosi delle facoltà concesse dall'Art. 125 sexies del Testo Unico Bancario, richiede il rimborso delle somme pagate in eccesso in relazione al contratto di cessione del quinto stipendio.

Dall'analisi del contratto e del conteggio estintivo risulta che sono state pagate rate per un importo superiore a quello dovuto.

Si richiede pertanto il rimborso immediato delle somme pagate in eccesso, unitamente agli interessi di legge.

In attesa di un vostro riscontro, si porgono distinti saluti.

Avv. Gabriele Scappaticci`;

    return NextResponse.json({ 
      lettera: letteraEsempio,
      calcoli: null 
    });

  } catch (error) {
    console.error("Errore API lettera:", error);
    return NextResponse.json({ 
      error: "Errore interno del server",
      lettera: "Si è verificato un errore. Riprova più tardi."
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "API Lettera è attiva" });
}
