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
  // Regex flessibile per COSTI TOTALI (CT)
  const totaleCostiMatch = testoContratto.match(/COSTI\s*TOTALI\s*\(?CT\)?[^\d\n]*([\d\.]+,[\d]{2})/i)
    || testoContratto.match(/COSTI\s*TOTALI[^\d\n]*([\d\.]+,[\d]{2})/i)
    || testoContratto.match(/COSTI\s*TOTALI[^\d\n]*([\d\.]+)/i);
  const totaleCosti = totaleCostiMatch ? parseFloat(totaleCostiMatch[1].replace(/\./g, '').replace(/,/g, '.')) : 0;

  // Regex flessibile per NUMERO RATE
  const numeroRateMatch = testoContratto.match(/NUMERO\s*RATE[^\d\n]*([\d]+)/i)
    || testoContratto.match(/N\.?\s*RATE[^\d\n]*([\d]+)/i)
    || testoContratto.match(/RATE[^\d\n]*([\d]+)/i);
  const numeroRate = numeroRateMatch ? parseInt(numeroRateMatch[1]) : 1;

  // Estrai rate scadute dall'estratto
  const rateScaduteMatch = testoEstratto.match(/([0-9]{1,3})\s*rate\s*scadute/i)
    || testoEstratto.match(/SCADUTE[^\d\n]*([\d]+)/i);
  const rateScadute = rateScaduteMatch ? parseInt(rateScaduteMatch[1]) : 0;
  const durataResidua = numeroRate - rateScadute;

  // Nome cliente
  const nomeCliente = (testoContratto.match(/COGNOME:?\s*([A-Z]+)/i)?.[1] || testoContratto.match(/cliente[:\s]*([A-Z a-z]+)/i)?.[1] || '').trim();
  // Data chiusura (non sempre presente, fallback vuoto)
  const dataChiusura = testoEstratto.match(/DATA\s*STAMPA:?\s*([\d\/]+)/i)?.[1] || '';

  return {
    totaleCosti,
    durataTotale: numeroRate,
    durataResidua: durataResidua > 0 ? durataResidua : 0,
    storno: 0, // non presente nei tuoi file
    nomeCliente: nomeCliente || 'Cliente',
    dataChiusura: dataChiusura || '',
    dettaglioCosti: [totaleCosti]
  };
}

export function calcolaRimborso(testoContratto: string, testoEstratto: string) {
  const dati = estraiDatiEconomici(testoContratto, testoEstratto);
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