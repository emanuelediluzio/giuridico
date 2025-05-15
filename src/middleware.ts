import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Gestiamo solo le richieste per site.webmanifest
  if (request.nextUrl.pathname === '/site.webmanifest') {
    // Otteniamo il manifest dal public folder
    const response = NextResponse.next();
    
    // Aggiungiamo gli header necessari
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET');
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    response.headers.set('Content-Type', 'application/manifest+json');
    
    return response;
  }
  
  return NextResponse.next();
}

// Configurazione per quale percorso applicare il middleware
export const config = {
  matcher: ['/site.webmanifest']
}; 