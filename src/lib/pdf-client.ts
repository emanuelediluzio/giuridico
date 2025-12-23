


// Use a specific version matching the installed package to avoid version mismatch errors
// In a real app, ensure this matches package.json version.
// Using unpkg cdn for the worker.


// Minimal interface for PDF.js item
interface TextItem {
    str: string;
}

export async function extractTextFromPDFClient(file: File): Promise<string> {
    console.log(`[DEBUG] Extracting text from ${file.name}...`);
    try {
        const arrayBuffer = await file.arrayBuffer();

        // Use global pdfjsLib from script tag
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lib = (window as any).pdfjsLib;
        if (!lib) throw new Error("PDF.js library not loaded in window.pdfjsLib");

        // Force correct worker URL from CDN if not set
        if (!lib.GlobalWorkerOptions.workerSrc) {
            console.log("[DEBUG] Setting workerSrc...");
            lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
        }

        // Load the document
        console.log("[DEBUG] pdfjsLib.getDocument called");
        const loadingTask = lib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        console.log(`[DEBUG] PDF Loaded. Pages: ${pdf.numPages}`);

        let fullText = '';

        // Iterate over all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            // console.log(`[DEBUG] Processing page ${i}...`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Extract text items and join them
            const pageText = textContent.items
                .map((item: unknown) => (item as TextItem).str || "")
                .join(' ');

            fullText += pageText + '\n\n';

            // Allow UI breath
            if (i % 5 === 0) await new Promise(r => setTimeout(r, 10));
        }

        console.log("[DEBUG] Extraction finished.");
        return fullText;
    } catch (e) {
        console.error("[DEBUG] Extraction Failed:", e);
        throw e;
    }
}

// Minimal interface for Puter
interface PuterInstance {
    ai: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chat: (prompt: string | any[], options?: any) => Promise<any>;
    };
}

export async function analysisWithPuterClient(text: string, puterInstance: PuterInstance): Promise<{ valore: number | null; stato: string }> {
    // Check global puter availability if instance not provided or invalid
    const finalPuter = puterInstance || window.puter;

    if (!finalPuter) throw new Error("Puter instance not initialized");

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

    // Uses gemini-2.5-flash with simple string prompt to match successful script usage
    console.log(`[DEBUG] Sending text to AI (Length: ${text.length}). Snippet: ${text.substring(0, 100)}...`);

    // Guard Clause: If text is empty or very short, don't waste AI call
    if (!text || text.trim().length < 20) {
        console.warn("[DEBUG] Text is empty or too short. Skipping AI analysis.");
        return { valore: null, stato: 'NO' };
    }

    const response = await finalPuter.ai.chat(prompt, { model: 'gemini-2.5-flash' });

    // Parse response
    let content = "";
    if (typeof response === 'string') content = response;
    else if (response?.message?.content) content = response.message.content;
    else content = JSON.stringify(response);

    console.log("[DEBUG] Raw AI Response:", content);

    try {
        // More robust JSON regex: match { ... } potentially across multiple lines
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            console.log("[DEBUG] JSON Match Found:", jsonMatch[0]);
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e2) {
                console.error("[DEBUG] JSON Parse Failed (inner):", e2);
            }
        } else {
            console.warn("[DEBUG] No JSON found in response");
        }
    } catch (e) {
        console.error("Failed to parse Puter analysis", e);
    }

    return { valore: null, stato: 'NO' };
}
