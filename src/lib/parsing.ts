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
  // Somma tutte le voci di costo (commissioni, spese, assicurazione, ecc.)
  const vociRegex = [
    /commissioni(?:\s+totali)?[:\s]*([\d\.,]+)/gi,
    /spese(?:\s+istruttoria)?[:\s]*([\d\.,]+)/gi,
    /spese\s+incasso[:\s]*([\d\.,]+)/gi,
    /spese\s+assicurative?[:\s]*([\d\.,]+)/gi,
    /assicurazione[:\s]*([\d\.,]+)/gi,
    /costi(?:\s+ricorrenti)?[:\s]*([\d\.,]+)/gi
  ];
  let vociCosti: number[] = [];
  vociRegex.forEach(r => {
    vociCosti = vociCosti.concat(estraiNumeriMultipli(testoContratto, r));
  });
  const totaleCosti = vociCosti.reduce((a, b) => a + b, 0);

  // Durata totale (mesi)
  const durataTotale = estraiNumero(testoContratto, /durata totale[:\s]*([\d]+)/i) || estraiNumero(testoContratto, /durata[:\s]*([\d]+)/i);
  // Durata residua (mesi)
  const durataResidua = estraiNumero(testoEstratto, /rate residue[:\s]*([\d]+)/i) || estraiNumero(testoEstratto, /rate mancanti[:\s]*([\d]+)/i);
  // Storno banca
  const storno = estraiNumero(testoEstratto, /storno[:\s\-]*([\d\.,]+)/i) || estraiNumero(testoEstratto, /rimborso banca[:\s]*([\d\.,]+)/i) || 0;
  // Nome cliente
  const nomeCliente = (testoContratto.match(/intestatario[:\s]*([A-Z a-z]+)/i)?.[1] || testoContratto.match(/cliente[:\s]*([A-Z a-z]+)/i)?.[1] || '').trim();
  // Data chiusura
  const dataChiusura = testoEstratto.match(/data chiusura[:\s]*([\d\/\-]+)/i)?.[1] || '';

  return {
    totaleCosti,
    durataTotale: durataTotale || 1,
    durataResidua: durataResidua || 0,
    storno,
    nomeCliente: nomeCliente || 'Cliente',
    dataChiusura: dataChiusura || '',
    dettaglioCosti: vociCosti
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