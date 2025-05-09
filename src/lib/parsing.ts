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

export function estraiDatiEconomici(testoContratto: string, testoEstratto: string, testoLettera?: string) {
  // Regex flessibile per COSTI TOTALI (CT)
  let totaleCostiMatch = testoContratto.match(/COSTI\s*TOTALI\s*\(?CT\)?[^\d\n]*([\d\.]+,[\d]{2})/i)
    || testoContratto.match(/COSTI\s*TOTALI[^\d\n]*([\d\.]+,[\d]{2})/i)
    || testoContratto.match(/COSTI\s*TOTALI[^\d\n]*([\d\.]+)/i);
  let totaleCosti = totaleCostiMatch ? parseFloat(totaleCostiMatch[1].replace(/\./g, '').replace(/,/g, '.')) : 0;
  // Se non trovato, cerca nella lettera (es. "ha corrisposto complessivi euro 2.593,25")
  if (!totaleCosti && testoLettera) {
    const letteraCostiMatch = testoLettera.match(/corrisposto complessivi euro ([\d\.]+,[\d]{2})/i);
    if (letteraCostiMatch) {
      totaleCosti = parseFloat(letteraCostiMatch[1].replace(/\./g, '').replace(/,/g, '.'));
    }
  }

  // Regex ultra-flessibile per NUMERO RATE (cerca sia in contratto che in estratto)
  const numeroRateMatch =
    testoContratto.match(/NUMERO\s*RATE[^\d\n]*:?\s*([\d]{2,3})/i)
    || testoContratto.match(/NUMERO\s*RATE[^\d\n]*([\d]{2,3})/i)
    || testoContratto.match(/(\d{2,3})\s*RATE/i)
    || testoContratto.match(/RATE[^\d\n]*:?\s*([\d]{2,3})/i)
    || testoEstratto.match(/NUMERO\s*RATE[^\d\n]*:?\s*([\d]{2,3})/i)
    || testoEstratto.match(/NUMERO\s*RATE[^\d\n]*([\d]{2,3})/i)
    || testoEstratto.match(/(\d{2,3})\s*RATE/i)
    || testoEstratto.match(/RATE[^\d\n]*:?\s*([\d]{2,3})/i);
  const numeroRate = numeroRateMatch ? parseInt(numeroRateMatch[1]) : 1;

  // Regex ultra-flessibile per RATE SCADUTE
  const rateScaduteMatch = testoEstratto.match(/RATE\s*SCADUTE[^\d\n]*:?\s*\(?([\d]{1,3})\s*MESI?/i)
    || testoEstratto.match(/(\d{1,3})\s*rate\s*scadute/i)
    || testoEstratto.match(/SCADUTE[^\d\n]*([\d]{1,3})/i);
  const rateScadute = rateScaduteMatch ? parseInt(rateScaduteMatch[1]) : 0;
  let durataResidua = numeroRate - rateScadute;
  let durataTotale = numeroRate;

  // Cerca frasi tipo "residuavano da versare 63 rate delle 120"
  const residuanoMatch = testoLettera?.match(/residu[a-z]* da versare (\d{1,3}) rate (?:delle|su|di) (\d{1,3})/i);
  if (residuanoMatch) {
    durataResidua = parseInt(residuanoMatch[1]);
    durataTotale = parseInt(residuanoMatch[2]);
  }

  // Nome cliente
  const nomeCliente = (testoContratto.match(/COGNOME:?\s*([A-Z]+)/i)?.[1] || testoContratto.match(/cliente[:\s]*([A-Z a-z]+)/i)?.[1] || '').trim();
  // Data chiusura (non sempre presente, fallback vuoto)
  const dataChiusura = testoEstratto.match(/DATA\s*STAMPA:?\s*([\d\/]+)/i)?.[1] || '';

  // Log per debug
  console.log('--- DEBUG ESTRAZIONE ---');
  console.log('Totale costi:', totaleCosti);
  console.log('Numero rate:', numeroRate);
  console.log('Rate scadute:', rateScadute);
  console.log('Durata residua:', durataResidua);

  return {
    totaleCosti,
    durataTotale: durataTotale,
    durataResidua: durataResidua > 0 ? durataResidua : 0,
    storno: 0, // non presente nei tuoi file
    nomeCliente: nomeCliente || 'Cliente',
    dataChiusura: dataChiusura || '',
    dettaglioCosti: [totaleCosti]
  };
}

export function calcolaRimborso(testoContratto: string, testoEstratto: string, testoLettera?: string) {
  const dati = estraiDatiEconomici(testoContratto, testoEstratto, testoLettera);
  const quotaNonGoduta = (dati.totaleCosti / dati.durataTotale) * dati.durataResidua;
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
  return template
    .replace('{{importo_rimborso}}', importoRimborso)
    .replace('{{nome_cliente}}', dettagli.nomeCliente)
    .replace('{{data_chiusura}}', dettagli.dataChiusura);
} 