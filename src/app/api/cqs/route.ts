import { NextResponse } from 'next/server';
import { calcolaRimborso, generaLettera } from '@/lib/parsing';

export async function POST(request: Request) {
  try {
    const { contractText, statementText, templateText } = await request.json();
    if (!contractText || !statementText || !templateText) {
      return NextResponse.json(
        { error: 'Tutti i testi sono obbligatori' },
        { status: 400 }
      );
    }
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