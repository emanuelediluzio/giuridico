
import * as pdfjsLib from 'pdfjs-dist';

// Use a specific version matching the installed package to avoid version mismatch errors
// In a real app, ensure this matches package.json version.
// Using unpkg cdn for the worker.
const PDFJS_VERSION = '3.11.174'; // Check your package.json for exact version, using latest stable for now or generic matching
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

// Minimal interface for PDF.js item
interface TextItem {
    str: string;
}

export async function extractTextFromPDFClient(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();

    // Load the document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    // Iterate over all pages
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Extract text items and join them
        const pageText = textContent.items
            .map((item: TextItem | any) => (item as TextItem).str || "") // Fallback for mixed items
            .join(' ');

        fullText += pageText + '\n\n';
    }

    return fullText;
}

// Minimal interface for Puter
interface PuterInstance {
    ai: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chat: (prompt: string | any[], options?: any) => Promise<any>;
    };
}

export async function analysisWithPuterClient(text: string, puterInstance: PuterInstance): Promise<{ valore: number | null; stato: string }> {
    if (!puterInstance) throw new Error("Puter instance not initialized");

    const prompt = `Analizza questo testo estratto da un documento legale (Cessione del Quinto).
    Trova la prima percentuale di cessione/rata (es. "20%", "un quinto", "1/5").
    Se trovi "un quinto" o "1/5", il valore è 20.
    
    Rispondi SOLO con un oggetto JSON valido:
    {
        "valore": <numero intero o null>,
        "stato": <"OK" se specificato, altrimenti "NO">
    }
    Testo:
    ${text.substring(0, 5000)}... (troncato)`;

    const response = await puterInstance.ai.chat(prompt, { model: 'gemini-2.5-flash' });

    // Parse response
    let content = "";
    if (typeof response === 'string') content = response;
    else if (response?.message?.content) content = response.message.content;
    else content = JSON.stringify(response);

    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error("Failed to parse Puter analysis", e);
    }

    return { valore: null, stato: 'NO' };
}
