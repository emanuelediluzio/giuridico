import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
    try {
        const { messages, context } = await req.json();

        // System prompt defining identity and providing context
        const systemMessage = {
            role: 'system',
            content: `You are Lexa Chat, an advanced AI legal assistant created by Lexa.
            
            CONTEXT OF THE CURRENT DOCUMENT:
            """
            ${context || "No document loaded yet."}
            """
            
            Start by briefly acknowledging the document if it's relevant to the question.
            Answer clearly, professionally, and concisely. Use legal terminology appropriate for Italian law.
            If the user asks about the document, refer to the text provided in the context above.
            `
        };

        // Prepend system message
        const fullHistory = [systemMessage, ...messages];

        // Call Puter API (using the global puter instance or fetch)
        // Since we are in Edge/Node, we might need a specific fetch wrapper if puter package isn't fully edge-compatible or if we want to use the same logic as other routes.
        // Assuming 'puter' is globally available or we use fetch. 
        // For consistency with other routes, we'll use the basic fetch to Puter or similar if available, 
        // BUT looking at other routes, they import 'puter'.

        // Let's rely on the same pattern as api/chat but with this specific prompt construction.
        // We will do a dynamic import if needed, or just use the global if setup.
        // Checking api/chat/route.ts, it uses `puter.ai.chat`.

        const puter = (globalThis as any).puter || require('puter');

        const response = await puter.ai.chat(fullHistory, {
            model: 'gemini-2.5-flash',
            stream: false
        });

        return NextResponse.json({ message: response });

    } catch (error: any) {
        console.error("Chat Helper Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
