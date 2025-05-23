export async function processWithMistralChat(systemPrompt: string, userPrompt: string): Promise<any> {
  try {
    const apiKey = process.env.MIXTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('API key mancante');
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
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
      calcoli: null // Per ora non restituiamo calcoli
    };
  } catch (error) {
    console.error('Errore durante l\'elaborazione con Mistral:', error);
    throw error;
  }
} 