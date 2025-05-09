import { NextResponse } from 'next/server';
import { calcolaRimborso, generaLettera } from '@/lib/parsing';

async function callOpenRouterAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return '';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat-v3-0324:free',
      messages: [
        { role: 'system', content: 'Sei un assistente legale esperto di cessione del quinto.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(request: Request) {
  try {
    const { contractText, statementText, templateText } = await request.json();
    // LOG dei dati ricevuti
    console.log('--- API /api/cqs ---');
    console.log('CONTRACT:', contractText);
    console.log('STATEMENT:', statementText);
    console.log('TEMPLATE:', templateText);
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
    // Chiamata a OpenRouter per suggerimento AI
    const aiAdvice = await callOpenRouterAI(
      `Contratto: ${contractText}\nEstratto: ${statementText}\nCalcolo rimborso: ${result.rimborso}\nGenera un breve suggerimento legale o verifica la correttezza del calcolo.`
    );
    return NextResponse.json({
      ...result,
      letter,
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