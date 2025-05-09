import { NextResponse } from 'next/server';
import { extractTextFromFile } from '@/lib/parsing';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const contract = formData.get('contract') as File;
    const statement = formData.get('statement') as File;
    const template = formData.get('template') as File;

    if (!contract || !statement || !template) {
      return NextResponse.json(
        { error: 'Tutti i file sono obbligatori' },
        { status: 400 }
      );
    }

    // Converti i file in testo
    const contractText = await extractTextFromFile(contract);
    const statementText = await extractTextFromFile(statement);
    const templateText = await extractTextFromFile(template);

    // Analizza i documenti e calcola il rimborso
    const result = calculateRefund(contractText, statementText, templateText);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Errore:', error);
    return NextResponse.json(
      { error: 'Errore durante il calcolo' },
      { status: 500 }
    );
  }
}

function calculateRefund(contract: string, statement: string, template: string) {
  // Implementazione semplificata per esempio
  const totaleCosti = 5000;
  const durataTotale = 60;
  const durataResidua = 24;
  const storno = 500;
  const quotaNonGoduta = (totaleCosti / durataTotale) * durataResidua;
  const rimborso = quotaNonGoduta - storno;

  // Genera la lettera personalizzata
  const letter = template
    .replace('{{IMPORTO}}', rimborso.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }))
    .replace('{{DATA}}', new Date().toLocaleDateString('it-IT'));

  return {
    rimborso,
    totaleCosti,
    durataTotale,
    durataResidua,
    quotaNonGoduta,
    storno,
    dettaglioCosti: [1000, 2000, 2000],
    letter
  };
} 