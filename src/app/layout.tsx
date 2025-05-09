import './globals.css';
import React from 'react';

export const metadata = {
  title: 'CQS Refund Calc',
  description: 'Calcolatore rimborso Cessione del Quinto',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" defer></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js" defer></script>
      </head>
      <body>{children}</body>
    </html>
  );
} 