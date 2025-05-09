export async function queryHuggingFace(prompt: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_HUGGINGFACE_API_URL}mistralai/Mistral-7B-Instruct-v0.2`,
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.7,
          top_p: 0.95,
          repetition_penalty: 1.15,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Errore nella chiamata API');
  }

  const result = await response.json();
  return result[0].generated_text;
} 