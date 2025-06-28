import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Invia i file al backend Python
    const pythonApiUrl = process.env.PYTHON_API_URL || 'https://your-python-api.vercel.app';
    
    const response = await fetch(`${pythonApiUrl}/genera-diffida/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Errore backend Python:', errorText);
      throw new Error(`Errore backend Python: ${response.status}`);
    }

    // Restituisci il PDF generato
    const pdfBuffer = await response.arrayBuffer();
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="diffida_compilata.pdf"',
      },
    });

  } catch (error) {
    console.error('Errore API Python Parser:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
      lettera: "Si è verificato un errore durante la generazione della lettera. Riprova più tardi."
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Python Parser API è attiva" });
} 