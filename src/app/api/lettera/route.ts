import { NextRequest, NextResponse } from 'next/server';
import { calcolaRimborso, generaLettera } from '../../../lib/parsing';

export const runtime = 'nodejs';
export const maxDuration = 15; // Timeout molto breve

export async function POST(req: NextRequest) {
  try {
    const { contractText, statementText, templateText } = await req.json();

    if (!contractText || !statementText || !templateText) {
      return NextResponse.json({ error: 'Testi mancanti' }, { status: 400 });
    }

    // Calcolo rimborso con dati estratti
    console.log("[API Lettera] Calcolo rimborso...");
    const datiRimborso = calcolaRimborso(contractText, statementText);
    
    // Formattazione importo
    const importoFormattato = datiRimborso.rimborso > 0 
      ? `${datiRimborso.rimborso.toFixed(2).replace('.', ',')} €`
      : '0,00 €';

    // Generazione lettera con dati estratti
    console.log("[API Lettera] Generazione lettera...");
    const letteraGenerata = generaLettera(templateText, importoFormattato, {
      nomeCliente: datiRimborso.nomeCliente,
      dataChiusura: datiRimborso.dataChiusura,
      codiceFiscale: datiRimborso.codiceFiscale,
      dataNascita: datiRimborso.dataNascita,
      luogoNascita: datiRimborso.luogoNascita
    });

    // Se la lettera generata contiene ancora molti placeholder, usa una lettera di esempio
    const placeholderCount = (letteraGenerata.match(/XXXXX|XXXXXX|XXX|____/g) || []).length;
    
    if (placeholderCount > 5) {
      console.log("[API Lettera] Troppi placeholder, uso lettera di esempio...");
      
      const letteraEsempio = `Oggetto: Richiesta di rimborso ai sensi dell'Art. 125 sexies T.U.B.

Gentile Direzione,

La sottoscritta ${datiRimborso.nomeCliente !== 'Cliente' ? datiRimborso.nomeCliente : 'Cliente'}, avvalendosi delle facoltà concesse dall'Art. 125 sexies del Testo Unico Bancario, richiede il rimborso delle somme pagate in eccesso in relazione al contratto di cessione del quinto stipendio.

Dall'analisi del contratto e del conteggio estintivo risulta che sono state pagate rate per un importo superiore a quello dovuto.

Si richiede pertanto il rimborso immediato delle somme pagate in eccesso, pari a ${importoFormattato}, unitamente agli interessi di legge.

In attesa di un vostro riscontro, si porgono distinti saluti.

Avv. Gabriele Scappaticci`;

      return NextResponse.json({ 
        lettera: letteraEsempio,
        dati: {
          nomeCliente: datiRimborso.nomeCliente,
          codiceFiscale: datiRimborso.codiceFiscale,
          dataNascita: datiRimborso.dataNascita,
          luogoNascita: datiRimborso.luogoNascita,
          importoRimborso: importoFormattato,
          dataChiusura: datiRimborso.dataChiusura
        }
      });
    }

    console.log("[API Lettera] Lettera generata con successo");
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
