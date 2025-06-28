// Funzioni solo su testo, nessun import pdfjs-dist

export function estraiDatiEconomici(testoContratto: string, testoEstratto: string) {
  console.log("--- estraiDatiEconomici INIZIO (v4.0) ---");
  console.log("Testo Contratto (primi 200 char):", testoContratto ? testoContratto.substring(0, 200) + "..." : "VUOTO O NON FORNITO");
  console.log("Testo Estratto (primi 200 char):", testoEstratto ? testoEstratto.substring(0, 200) + "..." : "VUOTO O NON FORNITO");

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
  ];
  const numeroRatePatternsEstratto = [
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
    /IMPORTO RATE VERSATE ED INCASSATE DALLA BANCA N\.\s*RATE\s*(\d+)/i,
    /RATE SCADUTE AL MESE DI COMPETENZA DEL CONTEGGIO ESTINTIVO\s*\((\d+)\s*MESI\)/i,
    /RATE\s*SCADUTE[^\d\n]*:?\s*\(?(\d{1,3})\s*MESI?/i,
    /N\.\s*RATE\s*PAGATE\s*(\d+)/i,
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

  // ESTRAZIONE DATI PERSONALI MIGLIORATA
  let nomeClienteEstratto = '';
  let codiceFiscale = '';
  let dataNascita = '';
  let luogoNascita = '';

  console.log('--- DEBUG ESTRAZIONE DATI PERSONALI ---');
  console.log('Testo Contratto (primi 500 char):', testoContratto ? testoContratto.substring(0, 500) : 'VUOTO');
  console.log('Testo Estratto (primi 500 char):', testoEstratto ? testoEstratto.substring(0, 500) : 'VUOTO');

  // Nome cliente: cerca prima nel contratto, poi nell'estratto
  const clienteCognomeNomeMatch = testoContratto.match(/CLIENTE\s*(?:COGNOME:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?))?\s*(?:NOME:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?))?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
  if (clienteCognomeNomeMatch) {
      if (clienteCognomeNomeMatch[1] && clienteCognomeNomeMatch[2]) {
          nomeClienteEstratto = `${clienteCognomeNomeMatch[1].trim()} ${clienteCognomeNomeMatch[2].trim()}`;
      } else if (clienteCognomeNomeMatch[3]) {
          nomeClienteEstratto = clienteCognomeNomeMatch[3].trim();
      }
  }

  if (!nomeClienteEstratto) {
    const titolareMatchContratto = testoContratto.match(/Titolare:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)(?:\s*CF:|$)/i);
    if (titolareMatchContratto && titolareMatchContratto[1]) {
      nomeClienteEstratto = titolareMatchContratto[1].trim();
    }
  }

  // Nuovi pattern per nome cliente
  if (!nomeClienteEstratto) {
    const pattern1 = testoContratto.match(/Intestatario:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)(?:\s*CF:|$)/i);
    if (pattern1 && pattern1[1]) {
      nomeClienteEstratto = pattern1[1].trim();
    }
  }

  if (!nomeClienteEstratto) {
    const pattern2 = testoContratto.match(/Richiedente:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)(?:\s*CF:|$)/i);
    if (pattern2 && pattern2[1]) {
      nomeClienteEstratto = pattern2[1].trim();
    }
  }

  if (!nomeClienteEstratto) {
    const pattern3 = testoContratto.match(/Nominativo:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)(?:\s*CF:|$)/i);
    if (pattern3 && pattern3[1]) {
      nomeClienteEstratto = pattern3[1].trim();
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

  // Codice Fiscale - pattern più ampi
  const cfMatch = testoContratto.match(/C\.?F\.?\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i) 
    || testoEstratto.match(/C\.?F\.?\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i)
    || testoContratto.match(/Codice\s*Fiscale\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i)
    || testoEstratto.match(/Codice\s*Fiscale\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i)
    || testoContratto.match(/CF\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i)
    || testoEstratto.match(/CF\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i)
    || testoContratto.match(/Cod\.\s*Fisc\.\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i)
    || testoEstratto.match(/Cod\.\s*Fisc\.\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i);
  
  if (cfMatch && cfMatch[1]) {
    codiceFiscale = cfMatch[1].toUpperCase();
  }

  // Data di nascita - pattern più ampi
  const dataNascitaMatch = testoContratto.match(/nato\s*a\s*[^,]*\s*il\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    || testoEstratto.match(/nato\s*a\s*[^,]*\s*il\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    || testoContratto.match(/Data\s*di\s*nascita\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    || testoEstratto.match(/Data\s*di\s*nascita\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    || testoContratto.match(/Nato\s*il\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    || testoEstratto.match(/Nato\s*il\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    || testoContratto.match(/Data\s*nascita\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    || testoEstratto.match(/Data\s*nascita\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  
  if (dataNascitaMatch && dataNascitaMatch[1]) {
    dataNascita = dataNascitaMatch[1];
  }

  // Luogo di nascita - pattern più ampi
  const luogoNascitaMatch = testoContratto.match(/nato\s*a\s*([^,]*?)\s*il/i)
    || testoEstratto.match(/nato\s*a\s*([^,]*?)\s*il/i)
    || testoContratto.match(/Luogo\s*di\s*nascita\s*:?\s*([^,\n]+)/i)
    || testoEstratto.match(/Luogo\s*di\s*nascita\s*:?\s*([^,\n]+)/i)
    || testoContratto.match(/Nato\s*a\s*([^,]*?)(?:\s*il|\s*CF|$)/i)
    || testoEstratto.match(/Nato\s*a\s*([^,]*?)(?:\s*il|\s*CF|$)/i)
    || testoContratto.match(/Luogo\s*nascita\s*:?\s*([^,\n]+)/i)
    || testoEstratto.match(/Luogo\s*nascita\s*:?\s*([^,\n]+)/i);
  
  if (luogoNascitaMatch && luogoNascitaMatch[1]) {
    luogoNascita = luogoNascitaMatch[1].trim();
  }

  console.log('--- RISULTATI ESTRAZIONE ---');
  console.log('Nome Cliente trovato:', nomeClienteEstratto);
  console.log('Codice Fiscale trovato:', codiceFiscale);
  console.log('Data Nascita trovata:', dataNascita);
  console.log('Luogo Nascita trovato:', luogoNascita);

  // FALLBACK INTELLIGENTE - cerca pattern più generici se non trovato
  if (!nomeClienteEstratto) {
    console.log('--- FALLBACK NOME CLIENTE ---');
    // Cerca qualsiasi sequenza di 2-3 parole maiuscole che potrebbe essere un nome
    const fallbackMatch = testoContratto.match(/([A-Z][a-z]+)\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?/);
    if (fallbackMatch) {
      nomeClienteEstratto = fallbackMatch.slice(1).filter(Boolean).join(' ');
      console.log('Nome cliente fallback:', nomeClienteEstratto);
    }
  }

  // Pattern ancora più flessibili per nome
  if (!nomeClienteEstratto) {
    console.log('--- FALLBACK NOME CLIENTE AVANZATO ---');
    // Cerca pattern come "COGNOME: XXXX NOME: YYYY" o "COGNOME NOME: XXXX YYYY"
    const patternAvanzato1 = testoContratto.match(/COGNOME\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)\s+NOME\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+)/i);
    if (patternAvanzato1) {
      nomeClienteEstratto = `${patternAvanzato1[1].trim()} ${patternAvanzato1[2].trim()}`;
      console.log('Nome cliente pattern avanzato 1:', nomeClienteEstratto);
    }
  }

  if (!nomeClienteEstratto) {
    // Cerca pattern come "COGNOME NOME: XXXX YYYY"
    const patternAvanzato2 = testoContratto.match(/COGNOME\s+NOME\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+)/i);
    if (patternAvanzato2) {
      nomeClienteEstratto = patternAvanzato2[1].trim();
      console.log('Nome cliente pattern avanzato 2:', nomeClienteEstratto);
    }
  }

  if (!nomeClienteEstratto) {
    // Cerca qualsiasi sequenza di parole che inizia con maiuscola
    const patternAvanzato3 = testoContratto.match(/([A-Z][a-zÀ-ÖØ-öø-ÿ]+)\s+([A-Z][a-zÀ-ÖØ-öø-ÿ]+)(?:\s+([A-Z][a-zÀ-ÖØ-öø-ÿ]+))?/);
    if (patternAvanzato3) {
      nomeClienteEstratto = patternAvanzato3.slice(1).filter(Boolean).join(' ');
      console.log('Nome cliente pattern avanzato 3:', nomeClienteEstratto);
    }
  }

  if (!codiceFiscale) {
    console.log('--- FALLBACK CODICE FISCALE ---');
    // Cerca pattern di codice fiscale più flessibili
    const cfFallback = testoContratto.match(/([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/);
    if (cfFallback) {
      codiceFiscale = cfFallback[1].toUpperCase();
      console.log('Codice fiscale fallback:', codiceFiscale);
    }
  }

  // Pattern più flessibili per codice fiscale
  if (!codiceFiscale) {
    console.log('--- FALLBACK CODICE FISCALE AVANZATO ---');
    // Cerca anche nel testo estratto
    const cfFallback2 = testoEstratto.match(/([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/);
    if (cfFallback2) {
      codiceFiscale = cfFallback2[1].toUpperCase();
      console.log('Codice fiscale fallback 2:', codiceFiscale);
    }
  }

  if (!dataNascita) {
    console.log('--- FALLBACK DATA NASCITA ---');
    // Cerca qualsiasi data nel formato dd/mm/yyyy
    const dataFallback = testoContratto.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (dataFallback) {
      dataNascita = dataFallback[1];
      console.log('Data nascita fallback:', dataNascita);
    }
  }

  // Pattern più flessibili per data nascita
  if (!dataNascita) {
    console.log('--- FALLBACK DATA NASCITA AVANZATO ---');
    // Cerca anche nel testo estratto
    const dataFallback2 = testoEstratto.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (dataFallback2) {
      dataNascita = dataFallback2[1];
      console.log('Data nascita fallback 2:', dataNascita);
    }
  }

  if (!luogoNascita) {
    console.log('--- FALLBACK LUOGO NASCITA ---');
    // Cerca nomi di città comuni
    const cittaComuni = ['Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 'Bologna', 'Firenze', 'Bari', 'Catania'];
    for (const citta of cittaComuni) {
      if (testoContratto.includes(citta)) {
        luogoNascita = citta;
        console.log('Luogo nascita fallback:', luogoNascita);
        break;
      }
    }
  }

  // Pattern più flessibili per luogo nascita
  if (!luogoNascita) {
    console.log('--- FALLBACK LUOGO NASCITA AVANZATO ---');
    // Cerca anche nel testo estratto
    const cittaComuni = ['Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 'Bologna', 'Firenze', 'Bari', 'Catania'];
    for (const citta of cittaComuni) {
      if (testoEstratto.includes(citta)) {
        luogoNascita = citta;
        console.log('Luogo nascita fallback 2:', luogoNascita);
        break;
      }
    }
  }

  const nomeCliente = nomeClienteEstratto || 'Cliente';

  // Data chiusura
  const dataChiusuraPatterns = [
    /DATA ELABORAZIONE CONTEGGIO ESTINTIVO\s*([\d\/]+)/i,
    /DATA\s*STAMPA:?\s*([\d\/]+)/i,
    /(\d{2}\/\d{2}\/\d{4})/i,
  ];
  let dataChiusuraMatch: RegExpMatchArray | null = null;
  for (const regex of dataChiusuraPatterns) {
    dataChiusuraMatch = testoEstratto.match(regex);
    if (dataChiusuraMatch) break;
  }
  const dataChiusura = dataChiusuraMatch && dataChiusuraMatch[1] ? dataChiusuraMatch[1] : '';

  // Log per debug
  console.log('--- DEBUG ESTRAZIONE FINALE (v4.0) ---');
  console.log('Totale costi estratto (CT A+B):', totaleCosti);
  console.log('Numero Rate Totali Estratto:', numeroRate);
  console.log('Rate Scadute Estratte:', rateScadute);
  console.log('Durata Totale Calcolata:', durataTotale);
  console.log('Durata Residua Calcolata:', durataResidua);
  console.log('Nome Cliente Estratto:', nomeCliente);
  console.log('Codice Fiscale Estratto:', codiceFiscale);
  console.log('Data Nascita Estratta:', dataNascita);
  console.log('Luogo Nascita Estratto:', luogoNascita);
  console.log('Data Chiusura Estratta:', dataChiusura);

  return {
    totaleCosti,
    durataTotale: durataTotale,
    durataResidua: durataResidua > 0 ? durataResidua : 0,
    storno: 0,
    nomeCliente: nomeCliente,
    codiceFiscale: codiceFiscale,
    dataNascita: dataNascita,
    luogoNascita: luogoNascita,
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
    codiceFiscale: dati.codiceFiscale,
    dataNascita: dati.dataNascita,
    luogoNascita: dati.luogoNascita,
    dataChiusura: dati.dataChiusura
  };
}

export function generaLettera(template: string, importoRimborso: string, dettagli: { 
  nomeCliente: string, 
  dataChiusura: string,
  codiceFiscale?: string,
  dataNascita?: string,
  luogoNascita?: string
}) {
  let result = template;

  console.log('--- DEBUG GENERAZIONE LETTERA ---');
  console.log('Importo Rimborso:', importoRimborso);
  console.log('Dettagli ricevuti:', dettagli);

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
    
  // Sostituzioni per i nuovi dati estratti
  if (dettagli.codiceFiscale && dettagli.codiceFiscale !== 'Non disponibile') {
    result = result
      .replace(/{{codice_fiscale}}/g, dettagli.codiceFiscale)
      .replace(/XXX_CODICE_FISCALE/g, dettagli.codiceFiscale)
      .replace(/xxx_codice_fiscale/gi, dettagli.codiceFiscale)
      .replace(/\bXXXXXX\b/g, dettagli.codiceFiscale)
      .replace(/\bXXXXX\b/g, dettagli.codiceFiscale)
      .replace(/C\.F\.\s*Non\s*disponibile/gi, `C.F. ${dettagli.codiceFiscale}`)
      .replace(/Codice\s*Fiscale\s*Non\s*disponibile/gi, `Codice Fiscale ${dettagli.codiceFiscale}`);
  }

  if (dettagli.dataNascita && dettagli.dataNascita !== 'Non disponibile') {
    result = result
      .replace(/{{data_nascita}}/g, dettagli.dataNascita)
      .replace(/XXX_DATA_NASCITA/g, dettagli.dataNascita)
      .replace(/xxx_data_nascita/gi, dettagli.dataNascita)
      .replace(/il\s*Non\s*disponibile/gi, `il ${dettagli.dataNascita}`)
      .replace(/data\s*di\s*nascita\s*Non\s*disponibile/gi, `data di nascita ${dettagli.dataNascita}`);
  }

  if (dettagli.luogoNascita && dettagli.luogoNascita !== 'Non disponibile') {
    result = result
      .replace(/{{luogo_nascita}}/g, dettagli.luogoNascita)
      .replace(/XXX_LUOGO_NASCITA/g, dettagli.luogoNascita)
      .replace(/xxx_luogo_nascita/gi, dettagli.luogoNascita)
      .replace(/nato\s*a\s*Non\s*disponibile/gi, `nato a ${dettagli.luogoNascita}`)
      .replace(/residente\s*a\s*Non\s*disponibile/gi, `residente a ${dettagli.luogoNascita}`);
  }

  // Sostituzioni specifiche per template .doc
  if (dettagli.nomeCliente && dettagli.nomeCliente !== 'Cliente') {
    result = result.replace(/Sig\. XXXXXX\b/gi, `Sig. ${dettagli.nomeCliente}`);
    result = result.replace(/Sig\.ra XXXXXX\b/gi, `Sig.ra ${dettagli.nomeCliente}`);
    result = result.replace(/Egr\. XXXXXX\b/gi, `Egr. ${dettagli.nomeCliente}`);
    result = result.replace(/Sig\. Cliente/gi, `Sig. ${dettagli.nomeCliente}`);
    result = result.replace(/Sig\.ra Cliente/gi, `Sig.ra ${dettagli.nomeCliente}`);
    result = result.replace(/Egr\. Cliente/gi, `Egr. ${dettagli.nomeCliente}`);
  }

  // Importo Rimborso - sostituzioni più specifiche
  result = result.replace(/complessivi euro xxxxx(?![xX\w€])/g, `complessivi ${importoRimborso}`);
  result = result.replace(/somma di euro xxxxxxx\s*\([xX]+\/[xX]+\)/gi, `somma di ${importoRimborso}`);
  result = result.replace(/euro xxxxxxx\s*\([xX]+\/[xX]+\)/gi, importoRimborso);
  result = result.replace(/euro xxxxxxx/gi, importoRimborso);
  result = result.replace(/euro xxxxxx/gi, importoRimborso);
  result = result.replace(/euro xxxxx/gi, importoRimborso);
  result = result.replace(/euro 0,00/gi, importoRimborso);
  result = result.replace(/0,00 €/gi, importoRimborso);

  // Sostituzioni per date
  if (dettagli.dataChiusura) {
    result = result.replace(/__\/__\/____/g, dettagli.dataChiusura);
    result = result.replace(/XX\/XX\/XXXX/gi, dettagli.dataChiusura);
    result = result.replace(/xx\/xx\/xxxx/gi, dettagli.dataChiusura);
  }

  // Sostituzioni per luoghi
  if (dettagli.luogoNascita && dettagli.luogoNascita !== 'Non disponibile') {
    result = result.replace(/nato a XXXXXX/gi, `nato a ${dettagli.luogoNascita}`);
    result = result.replace(/residente a XXXXXX/gi, `residente a ${dettagli.luogoNascita}`);
  }

  // Sostituzioni per rate
  result = result.replace(/XXX rate delle XXX convenute/gi, 'le rate convenute');
  result = result.replace(/XXX rate/gi, 'le rate');

  // Gestione generica di XXX (solo se non è già stato sostituito)
  if (dettagli.nomeCliente && dettagli.nomeCliente !== 'Cliente') {
    // Sostituisce XXX solo se non è già stato sostituito da pattern più specifici
    result = result.replace(/\bXXX\b(?!\w)/g, dettagli.nomeCliente);
  }

  console.log('--- RISULTATO FINALE ---');
  console.log('Lettere generate (primi 200 char):', result.substring(0, 200));
  
  return result;
} 