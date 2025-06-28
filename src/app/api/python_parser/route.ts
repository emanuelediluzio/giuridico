import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '../process_pdf';
import { calcolaRimborso, generaLettera } from '../../../lib/parsing';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Estrai i file
    const contractFile = formData.get('file_contratto') as File;
    const statementFile = formData.get('file_conteggio') as File;

    if (!contractFile || !statementFile) {
      return NextResponse.json({ error: 'File mancanti' }, { status: 400 });
    }

    console.log("[Python Parser] Estrazione testo...");
    
    // Estrazione testo completa
    const contractText = await extractTextFromPDF(contractFile, false);
    const statementText = await extractTextFromPDF(statementFile, false);

    // Debug dettagliato del testo estratto
    console.log("=== DEBUG TESTO CONTRATTO ===");
    console.log("Lunghezza contratto:", contractText.length);
    console.log("Primi 1000 caratteri contratto:", contractText.substring(0, 1000));
    console.log("=== DEBUG TESTO CONTEGGIO ===");
    console.log("Lunghezza conteggio:", statementText.length);
    console.log("Primi 1000 caratteri conteggio:", statementText.substring(0, 1000));

    // Calcolo rimborso con dati estratti
    console.log("[Python Parser] Calcolo rimborso...");
    const datiRimborso = calcolaRimborso(contractText, statementText);
    
    // Formattazione importo
    const importoFormattato = datiRimborso.rimborso > 0 
      ? `${datiRimborso.rimborso.toFixed(2).replace('.', ',')} €`
      : '0,00 €';

    console.log("[Python Parser] Dati estratti:", {
      nomeCliente: datiRimborso.nomeCliente,
      codiceFiscale: datiRimborso.codiceFiscale,
      dataNascita: datiRimborso.dataNascita,
      luogoNascita: datiRimborso.luogoNascita,
      importoRimborso: importoFormattato,
      dataChiusura: datiRimborso.dataChiusura,
      rateResidue: datiRimborso.durataResidua,
      durataTotale: datiRimborso.durataTotale
    });

    // Genera lettera con template fisso ma dati estratti
    const templateLettera = `Oggetto: Richiesta di rimborso ai sensi dell'Art. 125 sexies T.U.B.

Gentile Direzione,

La sottoscritta {{nome_cliente}}, avvalendosi delle facoltà concesse dall'Art. 125 sexies del Testo Unico Bancario, richiede il rimborso delle somme pagate in eccesso in relazione al contratto di cessione del quinto stipendio.

Dall'analisi del contratto e del conteggio estintivo risulta che sono state pagate rate per un importo superiore a quello dovuto.

Si richiede pertanto il rimborso immediato delle somme pagate in eccesso, pari a {{importo_rimborso}}, unitamente agli interessi di legge.

In attesa di un vostro riscontro, si porgono distinti saluti.

Avv. Gabriele Scappaticci`;

    // Generazione lettera con dati estratti
    console.log("[Python Parser] Generazione lettera...");
    const letteraGenerata = generaLettera(templateLettera, importoFormattato, {
      nomeCliente: datiRimborso.nomeCliente,
      dataChiusura: datiRimborso.dataChiusura,
      codiceFiscale: datiRimborso.codiceFiscale,
      dataNascita: datiRimborso.dataNascita,
      luogoNascita: datiRimborso.luogoNascita
    });

    console.log("[Python Parser] Lettera generata con successo");
    
    // Restituisci la lettera come JSON per ora (invece di PDF)
    return NextResponse.json({ 
      lettera: letteraGenerata,
      dati: {
        nomeCliente: datiRimborso.nomeCliente,
        codiceFiscale: datiRimborso.codiceFiscale,
        dataNascita: datiRimborso.dataNascita,
        luogoNascita: datiRimborso.luogoNascita,
        importoRimborso: importoFormattato,
        dataChiusura: datiRimborso.dataChiusura,
        rateResidue: datiRimborso.durataResidua,
        durataTotale: datiRimborso.durataTotale,
        costiTotali: datiRimborso.totaleCosti
      }
    });

  } catch (error) {
    console.error('Errore API Python Parser:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
      lettera: "Si è verificato un errore durante la generazione della lettera. Riprova più tardi."
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "Python Parser API è attiva",
    endpoints: {
      "POST /api/python_parser": "Genera lettera con dati estratti",
      "GET /api/python_parser": "Test endpoint"
    },
    features: [
      "Estrazione dati da PDF contratto e conteggio",
      "Calcolo rimborso pro rata temporis",
      "Generazione lettera con dati reali",
      "Debug dettagliato dei dati estratti"
    ]
  });
} 