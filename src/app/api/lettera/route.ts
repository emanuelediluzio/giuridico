import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile, calcolaRimborso, generaLettera } from '@/lib/parsing';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
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

    // Calcola il rimborso
    const result = calcolaRimborso(contractText, statementText);

    // Genera la lettera
    const letter = generaLettera(
      templateText,
      result.rimborso.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }),
      {
        nomeCliente: result.nomeCliente,
        dataChiusura: result.dataChiusura
      }
    );

    return NextResponse.json({
      ...result,
      letter
    });
  } catch (error) {
    console.error('Errore:', error);
    return NextResponse.json(
      { error: 'Errore durante il calcolo' },
      { status: 500 }
    );
  }
}
