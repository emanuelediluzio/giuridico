import { NextResponse } from 'next/server';
import { calcolaRimborso, generaLettera } from '@/lib/parsing';

export const runtime = 'nodejs';

async function callOpenRouterAIMultimodal({ prompt, file }: { prompt: string, file?: File }): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return '';
  const formData = new FormData();
  formData.append('model', 'deepseek/deepseek-chat-v3-0324:free');
  formData.append('messages', JSON.stringify([
    { role: 'system', content: 'Sei un assistente legale esperto di cessione del quinto.' },
    { role: 'user', content: prompt }
  ]));
  if (file) {
    formData.append('files', file);
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(request: Request) {
  try {
    // Supporto sia JSON (testo) che multipart/form-data (file)
    let contractText = '', statementText = '', templateText = '';
    let file: File | undefined = undefined;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      contractText = body.contractText;
      statementText = body.statementText;
      templateText = body.templateText;
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      contractText = formData.get('contractText') as string;
      statementText = formData.get('statementText') as string;
      templateText = formData.get('templateText') as string;
      file = formData.get('file') as File;
    }
    // LOG dei dati ricevuti
    console.log('--- API /api/cqs ---');
    console.log('CONTRACT:', contractText);
    console.log('STATEMENT:', statementText);
    console.log('TEMPLATE:', templateText);
    if (!contractText && !file) {
      return NextResponse.json(
        { error: 'Devi fornire almeno testo o un file.' },
        { status: 400 }
      );
    }
    // Calcola il rimborso se c'è testo
    let result = undefined, letter = undefined;
    if (contractText && statementText) {
      result = calcolaRimborso(contractText, statementText);
      letter = generaLettera(
        templateText,
        result.rimborso.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }),
        {
          nomeCliente: result.nomeCliente,
          dataChiusura: result.dataChiusura
        }
      );
    }
    // Chiamata a OpenRouter per suggerimento AI multimodale
    const aiAdvice = await callOpenRouterAIMultimodal({
      prompt: `Contratto: ${contractText}\nEstratto: ${statementText}\nCalcolo rimborso: ${result?.rimborso}\nGenera un breve suggerimento legale o verifica la correttezza del calcolo.`,
      file
    });
    return NextResponse.json({
      ...(result ? { ...result, letter } : {}),
      aiAdvice
    });
  } catch (error) {
    console.error('Errore:', error);
    return NextResponse.json(
      { error: 'Errore durante il calcolo' },
      { status: 500 }
    );
  }
} 