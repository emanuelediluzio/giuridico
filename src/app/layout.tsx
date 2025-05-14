import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Lexa - Assistente Legale AI',
  description: 'Assistente legale avanzato per professionisti del diritto',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.svg'
  },
  manifest: '/site.webmanifest',
  themeColor: '#0f0f11',
  viewport: 'width=device-width, initial-scale=1.0',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lexa AI'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="scroll-smooth">
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" defer></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js" defer></script>
      </head>
      <body className="min-h-screen bg-[var(--color-bg-primary)]">
        {/* Background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {/* Mesh gradient background */}
          <div className="bg-blur-gradient top-[10%] right-[10%] w-[70vw] h-[70vh] bg-gradient-to-br from-violet-800/30 via-fuchsia-700/20 to-blue-800/10 animate-pulse-glow"></div>
          <div className="bg-blur-gradient bottom-[5%] left-[5%] w-[60vw] h-[60vh] bg-gradient-to-tr from-emerald-800/20 via-cyan-700/15 to-transparent"></div>
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-grid opacity-10 mix-blend-lighten"></div>
          
          {/* Decorative lines */}
          <div className="absolute top-0 left-[20%] w-[1px] h-[40vh] bg-gradient-to-b from-transparent via-fuchsia-500/50 to-transparent"></div>
          <div className="absolute bottom-0 right-[30%] w-[1px] h-[30vh] bg-gradient-to-t from-transparent via-cyan-500/30 to-transparent"></div>
          <div className="absolute top-[30%] right-[5%] h-[1px] w-[20vw] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"></div>
        </div>
        
        {/* Main content */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
} 