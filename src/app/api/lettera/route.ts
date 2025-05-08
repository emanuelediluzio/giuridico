import { NextRequest, NextResponse } from 'next/server';
import { parseDocument, calcolaRimborso, generaLettera } from '@/lib/parsing';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const contract = formData.get('contract') as File;
    const statement = formData.get('statement') as File;
    const template = formData.get('template') as File;

    if (!contract || !statement || !template) {
      return NextResponse.json({ error: 'Tutti i file sono obbligatori.' }, { status: 400 });
    }

    // Parsing dei file
    const testoContratto = await parseDocument(contract);
    const testoEstratto = await parseDocument(statement);
    const testoTemplate = await parseDocument(template);

    // Calcolo rimborso
    const rimborsoDettaglio = calcolaRimborso(testoContratto, testoEstratto);
    const importoRimborso = rimborsoDettaglio.rimborso.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

    // Generazione lettera
    const lettera = generaLettera(testoTemplate, importoRimborso, rimborsoDettaglio);

    return NextResponse.json({
      ...rimborsoDettaglio,
      refund_amount: importoRimborso,
      letter: lettera,
    });
  } catch (error: any) {
    console.error('Errore API /api/cqs:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
