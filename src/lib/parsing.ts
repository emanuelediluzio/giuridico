import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  
  if (file.type === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (file.type === 'text/plain') {
    return new TextDecoder().decode(buffer);
  }
  
  throw new Error('Formato file non supportato');
}

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

export function generaLettera(template: string, importo: string, extra?: any): string {
  let lettera = template;
  if (template.includes('{{IMPORTO}}')) {
    lettera = lettera.replace(/{{IMPORTO}}/g, importo);
  }
  if (extra?.nomeCliente && template.includes('{{NOME_CLIENTE}}')) {
    lettera = lettera.replace(/{{NOME_CLIENTE}}/g, extra.nomeCliente);
  }
  if (extra?.dataChiusura && template.includes('{{DATA}}')) {
    lettera = lettera.replace(/{{DATA}}/g, extra.dataChiusura);
  }
  if (!template.includes('{{IMPORTO}}')) {
    lettera += `\n\nCon la presente si richiede il rimborso di ${importo}, calcolati ai sensi dell'Art. 125 sexies T.U.B., per la chiusura anticipata del contratto.`;
  }
  return lettera;
} 