import puter from '@heyputer/puter.js';

export async function processWithGeminiChat(systemPrompt: string, userPrompt: string): Promise<{ lettera: string; calcoli: string | null }> {
  try {
    // Timeout of 25 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: la richiesta ha impiegato troppo tempo')), 25000);
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // Race between puter call and timeout
    const response = await Promise.race([
      puter.ai.chat(messages, { model: 'gemini-2.5-flash' }),
      timeoutPromise
    ]);

    let content = "";
    if (typeof response === 'string') {
      content = response;
    } else if (typeof response === 'object' && response !== null && 'message' in response) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content = (response as any).message?.content || "";
    } else if (Array.isArray(response) && response.length > 0 && 'message' in response[0]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content = (response as any)[0].message?.content || "";
    } else {
      content = JSON.stringify(response);
    }

    return {
      lettera: content,
      calcoli: null
    };

  } catch (error) {
    console.error('Errore durante l\'elaborazione con Puter:', error);
    throw error;
  }
} 