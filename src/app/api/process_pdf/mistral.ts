export async function processWithMistralChat(systemPrompt: string, userPrompt: string): Promise<{ lettera: string; calcoli: string | null }> {
  try {
    const apiKey = process.env.MIXTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('API key mancante');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 secondi timeout

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
        max_tokens: 1500, // Ridotto per velocizzare
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timeout: la richiesta ha impiegato troppo tempo');
    }
    throw error;
  }
} 