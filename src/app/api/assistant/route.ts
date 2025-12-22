import { NextResponse } from 'next/server';
import puter from '@heyputer/puter.js';

// Force Node.js runtime to support 'https' module used by puter
export const runtime = 'nodejs';

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



        const response = await puter.ai.chat(fullHistory, {
            model: 'gemini-2.5-flash'
        });

        return NextResponse.json({ message: response });

    } catch (error: unknown) {
        console.error("Chat Helper Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
