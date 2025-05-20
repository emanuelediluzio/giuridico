export async function processFilesDirectly(
  contractFile: File,
  statementFile: File,
  templateFile: File
): Promise<any> {
  try {
    const apiKey = process.env.MIXTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('API key Mistral mancante');
    }

    // Converti i file in base64
    const [contractBase64, statementBase64, templateBase64] = await Promise.all([
      fileToBase64(contractFile),
      fileToBase64(statementFile),
      fileToBase64(templateFile)
    ]);

    // Costruisci il prompt per il modello
    const systemPrompt = `Sei un assistente legale esperto in analisi di contratti di cessione del quinto e calcolo dei rimborsi.
    Analizza i seguenti documenti in formato PDF (forniti in base64) e genera:
    1. Una lettera di richiesta rimborso basata sul template fornito
    2. Un'analisi dettagliata dei calcoli effettuati
    3. Eventuali anomalie o punti di attenzione riscontrati`;

    const userPrompt = `
    Ecco i documenti da analizzare:
    
    CONTRATTO DI FINANZIAMENTO (PDF in base64):
    ${contractBase64}
    
    CONTEGGIO ESTINTIVO (PDF in base64):
    ${statementBase64}
    
    TEMPLATE LETTERA (PDF in base64):
    ${templateBase64}
    
    Per favore, analizza questi documenti e fornisci:
    1. La lettera di richiesta rimborso compilata secondo il template
    2. I calcoli dettagliati che giustificano il rimborso
    3. Eventuali anomalie o punti di attenzione riscontrati
    `;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Errore dettagliato Mistral:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      throw new Error(errorData.error || 'Errore nella comunicazione con il modello');
    }

    const data = await response.json();
    return {
      lettera: data.choices[0].message.content,
      calcoli: null // Per ora manteniamo la stessa struttura della risposta
    };

  } catch (error) {
    console.error('Errore durante l\'elaborazione diretta con Mistral:', error);
    throw error;
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      // Rimuovi il prefisso "data:application/pdf;base64," se presente
      const base64 = base64String.split(',')[1] || base64String;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
} 