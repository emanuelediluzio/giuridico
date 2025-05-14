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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lexa AI'
  }
};

export const viewport = {
  themeColor: '#0f0f11',
  width: 'device-width',
  initialScale: 1.0,
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
          <div className="bg-blur-gradient top-[5%] right-[5%] w-[80vw] h-[60vh] bg-gradient-to-br from-indigo-900/30 via-blue-700/20 to-sky-800/15 animate-pulse-glow"></div>
          <div className="bg-blur-gradient bottom-[5%] left-[5%] w-[70vw] h-[70vh] bg-gradient-to-tr from-blue-800/20 via-cyan-700/15 to-transparent"></div>
          
          {/* Subtle glow effects */}
          <div className="bg-blur-gradient top-[40%] left-[20%] w-[40vw] h-[40vh] bg-gradient-to-r from-purple-700/10 to-pink-500/10"></div>
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-grid opacity-20 mix-blend-overlay"></div>
          
          {/* Decorative lines */}
          <div className="absolute top-0 left-[20%] w-[1px] h-[50vh] bg-gradient-to-b from-transparent via-blue-500/40 to-transparent"></div>
          <div className="absolute bottom-0 right-[30%] w-[1px] h-[40vh] bg-gradient-to-t from-transparent via-sky-500/30 to-transparent"></div>
          <div className="absolute top-[30%] right-[10%] h-[1px] w-[30vw] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
          
          {/* Glowing dots */}
          <div className="absolute top-[15%] left-[15%] w-2 h-2 rounded-full bg-blue-400/50"></div>
          <div className="absolute top-[25%] right-[25%] w-3 h-3 rounded-full bg-indigo-400/40"></div>
          <div className="absolute bottom-[20%] left-[40%] w-2 h-2 rounded-full bg-sky-400/50"></div>
        </div>
        
        {/* Main content */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
} 