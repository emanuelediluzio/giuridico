import mammoth from 'mammoth';

// Funzioni solo su testo, nessun import pdfjs-dist

function estraiNumeriMultipli(text: string, regex: RegExp): number[] {
  const matches = [...text.matchAll(regex)];
  return matches.map(match => {
    const num = match[1].replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(num);
  });
}

function estraiNumero(text: string, regex: RegExp): number | null {
  const match = text.match(regex);
  if (match && match[1]) {
    const num = match[1].replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(num);
  }
  return null;
}

export function estraiDatiEconomici(testoContratto: string, testoEstratto: string) {
  let totaleCosti = 0;
  // Nuova Regex specifica per "CT € [valore] COSTI TOTALI (A) + (B)"
  const ctMatch = testoContratto.match(/CT\s+€\s*([\d.,]+)\s+COSTI TOTALI\s*\(A\)\s*\+\s*\(B\)/i);
  if (ctMatch && ctMatch[1]) {
    totaleCosti = parseFloat(ctMatch[1].replace(/\./g, '').replace(/,/g, '.'));
  } else {
    // Fallback alle regex precedenti se la nuova non trova corrispondenze
    const fallbackCostiMatch = testoContratto.match(/COSTI\s*TOTALI\s*\(?CT\)?[^\d\n]*([\d.]+,[\d]{2})/i)
      || testoContratto.match(/COSTI\s*TOTALI[^\d\n]*([\d.]+,[\d]{2})/i)
      || testoContratto.match(/COSTI\s*TOTALI[^\d\n]*([\d.]+)/i);
    if (fallbackCostiMatch && fallbackCostiMatch[1]) {
      totaleCosti = parseFloat(fallbackCostiMatch[1].replace(/\./g, '').replace(/,/g, '.'));
    }
  }

  // Regex per NUMERO RATE (priorità al contratto, poi estratto)
  const numeroRatePatternsContratto = [
    /DURATA:\s*(\d+)\s*MESI/i,
    /NUMERO\s*RATE[^\d\n]*:?\s*(\d{2,3})/i,
    /N\.\s*RATE\s*MENSILI:\s*(\d{2,3})/i,
    // Altre regex esistenti per numeroRate possono essere aggiunte qui se necessario
  ];
  const numeroRatePatternsEstratto = [ // Cercare anche nel conteggio se non trovato prima
    /NUMERO\s*RATE[^\d\n]*:?\s*(\d{2,3})/i,
  ];

  let numeroRateMatch: RegExpMatchArray | null = null;
  for (const regex of numeroRatePatternsContratto) {
    numeroRateMatch = testoContratto.match(regex);
    if (numeroRateMatch) break;
  }
  if (!numeroRateMatch) {
    for (const regex of numeroRatePatternsEstratto) {
      numeroRateMatch = testoEstratto.match(regex);
      if (numeroRateMatch) break;
    }
  }
  const numeroRate = numeroRateMatch && numeroRateMatch[1] ? parseInt(numeroRateMatch[1]) : 1;

  // Regex per RATE SCADUTE (solo da testoEstratto)
  const rateScadutePatterns = [
    /IMPORTO RATE VERSATE ED INCASSATE DALLA BANCA N\.\s*RATE\s*(\d+)/i, // Es: IMPORTO RATE VERSATE ED INCASSATE DALLA BANCA N. RATE 57
    /RATE SCADUTE AL MESE DI COMPETENZA DEL CONTEGGIO ESTINTIVO\s*\((\d+)\s*MESI\)/i, // Es: RATE SCADUTE AL MESE DI COMPETENZA DEL CONTEGGIO ESTINTIVO (57 MESI)
    /RATE\s*SCADUTE[^\d\n]*:?\s*\(?(\d{1,3})\s*MESI?/i, // Generica per "RATE SCADUTE XX MESI"
    /N\.\s*RATE\s*PAGATE\s*(\d+)/i, // Es: N. RATE PAGATE 57
    /(\d{1,3})\s*rate\s*scadute/i,
    /SCADUTE[^\d\n]*(\d{1,3})/i,
  ];
  let rateScaduteMatch: RegExpMatchArray | null = null;
  for (const regex of rateScadutePatterns) {
    rateScaduteMatch = testoEstratto.match(regex);
    if (rateScaduteMatch) break;
  }
  const rateScadute = rateScaduteMatch && rateScaduteMatch[1] ? parseInt(rateScaduteMatch[1]) : 0;

  const durataResidua = numeroRate > 0 && rateScadute >= 0 && numeroRate > rateScadute ? numeroRate - rateScadute : 0;
  const durataTotale = numeroRate > 0 ? numeroRate : 0;


  // Nome cliente: cerca prima nel contratto, poi nell'estratto
  let nomeClienteEstratto = '';
  // Pattern per "CLIENTE COGNOME: LORIA NOME: MASSIMO" o "CLIENTE LORIA MASSIMO"
  const clienteCognomeNomeMatch = testoContratto.match(/CLIENTE\s*(?:COGNOME:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?))?\s*(?:NOME:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?))?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
  if (clienteCognomeNomeMatch) {
      if (clienteCognomeNomeMatch[1] && clienteCognomeNomeMatch[2]) { // COGNOME: X NOME: Y
          nomeClienteEstratto = `${clienteCognomeNomeMatch[1].trim()} ${clienteCognomeNomeMatch[2].trim()}`;
      } else if (clienteCognomeNomeMatch[3]) { // CLIENTE X Y (X Cognome, Y Nome)
          nomeClienteEstratto = clienteCognomeNomeMatch[3].trim();
      }
  }

  if (!nomeClienteEstratto) {
    const titolareMatchContratto = testoContratto.match(/Titolare:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)(?:\s*CF:|$)/i);
    if (titolareMatchContratto && titolareMatchContratto[1]) {
      nomeClienteEstratto = titolareMatchContratto[1].trim();
    }
  }
  
  // Fallback se non trovato nel contratto, cerca nell'estratto
  if (!nomeClienteEstratto) {
    const clienteMatchEstratto = testoEstratto.match(/CLIENTE\s*(?:COGNOME:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?))?\s*(?:NOME:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?))?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
    if (clienteMatchEstratto) {
        if (clienteMatchEstratto[1] && clienteMatchEstratto[2]) {
            nomeClienteEstratto = `${clienteMatchEstratto[1].trim()} ${clienteMatchEstratto[2].trim()}`;
        } else if (clienteMatchEstratto[3]) {
            nomeClienteEstratto = clienteMatchEstratto[3].trim();
        }
    }
  }
  if (!nomeClienteEstratto) {
      const titolareMatchEstratto = testoEstratto.match(/Titolare:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)(?:\s*CF:|$)/i);
      if (titolareMatchEstratto && titolareMatchEstratto[1]) {
          nomeClienteEstratto = titolareMatchEstratto[1].trim();
      }
  }
  const nomeCliente = nomeClienteEstratto || 'Cliente';

  // Data chiusura
  const dataChiusuraPatterns = [
    /DATA ELABORAZIONE CONTEGGIO ESTINTIVO\s*([\d\/]+)/i, // Prioritaria
    /DATA\s*STAMPA:?\s*([\d\/]+)/i,
    /(\d{2}\/\d{2}\/\d{4})/i, // Generica per una data dd/mm/yyyy
  ];
  let dataChiusuraMatch: RegExpMatchArray | null = null;
  for (const regex of dataChiusuraPatterns) {
    dataChiusuraMatch = testoEstratto.match(regex);
    if (dataChiusuraMatch) break;
  }
  const dataChiusura = dataChiusuraMatch && dataChiusuraMatch[1] ? dataChiusuraMatch[1] : '';

  // Log per debug
  console.log('--- DEBUG ESTRAZIONE FINALE ---src/lib/parsing.ts (v3)---');
  console.log('Totale costi estratto (CT A+B):', totaleCosti);
  console.log('Numero Rate Totali Estratto:', numeroRate);
  console.log('Rate Scadute Estratte:', rateScadute);
  console.log('Durata Totale Calcolata (usata per calcolo):', durataTotale);
  console.log('Durata Residua Calcolata (usata per calcolo):', durataResidua);
  console.log('Nome Cliente Estratto:', nomeCliente);
  console.log('Data Chiusura Estratta (da statement):', dataChiusura);

  return {
    totaleCosti,
    durataTotale: durataTotale,
    durataResidua: durataResidua > 0 ? durataResidua : 0,
    storno: 0, // non presente nei tuoi file
    nomeCliente: nomeCliente,
    dataChiusura: dataChiusura,
    dettaglioCosti: [totaleCosti]
  };
}

export function calcolaRimborso(testoContratto: string, testoEstratto: string) {
  const dati = estraiDatiEconomici(testoContratto, testoEstratto);
  // Assicurarsi che durataTotale non sia 0 per evitare divisione per zero
  const quotaNonGoduta = dati.durataTotale > 0 ? (dati.totaleCosti / dati.durataTotale) * dati.durataResidua : 0;
  const rimborso = quotaNonGoduta - dati.storno;
  return {
    rimborso: rimborso > 0 ? rimborso : 0,
    quotaNonGoduta,
    totaleCosti: dati.totaleCosti,
    durataTotale: dati.durataTotale,
    durataResidua: dati.durataResidua,
    storno: dati.storno,
    dettaglioCosti: dati.dettaglioCosti,
    nomeCliente: dati.nomeCliente,
    dataChiusura: dati.dataChiusura
  };
}

export function generaLettera(template: string, importoRimborso: string, dettagli: { nomeCliente: string, dataChiusura: string }) {
  let result = template; // Inizializza result con il template originale

  // Sostituzioni standard esistenti
  result = result
    .replace(/{{importo_rimborso}}/g, importoRimborso)
    .replace(/{{nome_cliente}}/g, dettagli.nomeCliente)
    .replace(/{{data_chiusura}}/g, dettagli.dataChiusura);
  
  result = result
    .replace(/XXX_IMPORTO_RIMBORSO/g, importoRimborso)
    .replace(/XXX_NOME_CLIENTE/g, dettagli.nomeCliente)
    .replace(/XXX_DATA_CHIUSURA/g, dettagli.dataChiusura);
    
  result = result
    .replace(/xxx_importo_rimborso/gi, importoRimborso)
    .replace(/xxx_nome_cliente/gi, dettagli.nomeCliente)
    .replace(/xxx_data_chiusura/gi, dettagli.dataChiusura);
    
  // Nuove sostituzioni per i placeholder del template .doc specifico
  // Nome Cliente (es. "Sig. XXXXXX")
  // Usiamo \b per assicurarci che XXXXXX sia una parola intera e non parte di una più lunga.
  // Il flag 'g' è per global (sostituisci tutte le occorrenze), 'i' per case-insensitive.
  if (dettagli.nomeCliente && dettagli.nomeCliente !== 'Cliente') {
    result = result.replace(/Sig\. XXXXXX\b/gi, `Sig. ${dettagli.nomeCliente}`);
  }

  // Importo Rimborso
  // Sostituisce "complessivi euro xxxxx" ma non "euro xxxxxxxx" o "euro xxxxxxx"
  // importoRimborso contiene già il simbolo € (es. "1.234,56 €")
  result = result.replace(/complessivi euro xxxxx(?![xX\w€])/g, `complessivi ${importoRimborso}`);
  
  // Sostituisce "somma di euro xxxxxxx (xxxxxx/xx)" con "somma di [importoRimborso]"
  // ATTENZIONE: la parte testuale "(xxxxxx/xx)" viene persa.
  result = result.replace(/somma di euro xxxxxxx\s*\([xX]+\/[xX]+\)/gi, `somma di ${importoRimborso}`);

  // Gestione semplice di XXX generico (spostata alla fine per dare priorità a sostituzioni più specifiche)
  if (dettagli.nomeCliente && dettagli.nomeCliente !== 'Cliente') {
    // Questa regex è molto generica, potrebbe sostituire 'XXX' in posti non voluti se le precedenti non matchano.
    // Valuta se mantenerla o renderla più specifica se causa problemi.
    result = result.replace(/\bXXX\b/g, dettagli.nomeCliente); 
  }
  
  return result;
} 