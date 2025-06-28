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

  // Codice Fiscale
  const cfMatch = testoContratto.match(/C\.?F\.?\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i) 
    || testoEstratto.match(/C\.?F\.?\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i)
    || testoContratto.match(/Codice\s*Fiscale\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i)
    || testoEstratto.match(/Codice\s*Fiscale\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i);
  
  if (cfMatch && cfMatch[1]) {
    codiceFiscale = cfMatch[1].toUpperCase();
  }

  // Data di nascita
  const dataNascitaMatch = testoContratto.match(/nato\s*a\s*[^,]*\s*il\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    || testoEstratto.match(/nato\s*a\s*[^,]*\s*il\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    || testoContratto.match(/Data\s*di\s*nascita\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    || testoEstratto.match(/Data\s*di\s*nascita\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  
  if (dataNascitaMatch && dataNascitaMatch[1]) {
    dataNascita = dataNascitaMatch[1];
  }

  // Luogo di nascita
  const luogoNascitaMatch = testoContratto.match(/nato\s*a\s*([^,]*?)\s*il/i)
    || testoEstratto.match(/nato\s*a\s*([^,]*?)\s*il/i)
    || testoContratto.match(/Luogo\s*di\s*nascita\s*:?\s*([^,\n]+)/i)
    || testoEstratto.match(/Luogo\s*di\s*nascita\s*:?\s*([^,\n]+)/i);
  
  if (luogoNascitaMatch && luogoNascitaMatch[1]) {
    luogoNascita = luogoNascitaMatch[1].trim();
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
  if (dettagli.codiceFiscale) {
    result = result
      .replace(/{{codice_fiscale}}/g, dettagli.codiceFiscale)
      .replace(/XXX_CODICE_FISCALE/g, dettagli.codiceFiscale)
      .replace(/xxx_codice_fiscale/gi, dettagli.codiceFiscale)
      .replace(/\bXXXXXX\b/g, dettagli.codiceFiscale) // Placeholder generico per CF
      .replace(/\bXXXXX\b/g, dettagli.codiceFiscale); // Placeholder più corto per CF
  }

  if (dettagli.dataNascita) {
    result = result
      .replace(/{{data_nascita}}/g, dettagli.dataNascita)
      .replace(/XXX_DATA_NASCITA/g, dettagli.dataNascita)
      .replace(/xxx_data_nascita/gi, dettagli.dataNascita);
  }

  if (dettagli.luogoNascita) {
    result = result
      .replace(/{{luogo_nascita}}/g, dettagli.luogoNascita)
      .replace(/XXX_LUOGO_NASCITA/g, dettagli.luogoNascita)
      .replace(/xxx_luogo_nascita/gi, dettagli.luogoNascita);
  }

  // Sostituzioni specifiche per template .doc
  if (dettagli.nomeCliente && dettagli.nomeCliente !== 'Cliente') {
    result = result.replace(/Sig\. XXXXXX\b/gi, `Sig. ${dettagli.nomeCliente}`);
    result = result.replace(/Sig\.ra XXXXXX\b/gi, `Sig.ra ${dettagli.nomeCliente}`);
    result = result.replace(/Egr\. XXXXXX\b/gi, `Egr. ${dettagli.nomeCliente}`);
  }

  // Importo Rimborso - sostituzioni più specifiche
  result = result.replace(/complessivi euro xxxxx(?![xX\w€])/g, `complessivi ${importoRimborso}`);
  result = result.replace(/somma di euro xxxxxxx\s*\([xX]+\/[xX]+\)/gi, `somma di ${importoRimborso}`);
  result = result.replace(/euro xxxxxxx\s*\([xX]+\/[xX]+\)/gi, importoRimborso);
  result = result.replace(/euro xxxxxxx/gi, importoRimborso);
  result = result.replace(/euro xxxxxx/gi, importoRimborso);
  result = result.replace(/euro xxxxx/gi, importoRimborso);

  // Sostituzioni per date
  if (dettagli.dataChiusura) {
    result = result.replace(/__\/__\/____/g, dettagli.dataChiusura);
    result = result.replace(/XX\/XX\/XXXX/gi, dettagli.dataChiusura);
    result = result.replace(/xx\/xx\/xxxx/gi, dettagli.dataChiusura);
  }

  // Sostituzioni per luoghi
  if (dettagli.luogoNascita) {
    result = result.replace(/nato a XXXXXX/gi, `nato a ${dettagli.luogoNascita}`);
    result = result.replace(/residente a XXXXXX/gi, `residente a ${dettagli.luogoNascita}`);
  }

  // Gestione generica di XXX (solo se non è già stato sostituito)
  if (dettagli.nomeCliente && dettagli.nomeCliente !== 'Cliente') {
    // Sostituisce XXX solo se non è già stato sostituito da pattern più specifici
    result = result.replace(/\bXXX\b(?!\w)/g, dettagli.nomeCliente);
  }
  
  return result;
} 