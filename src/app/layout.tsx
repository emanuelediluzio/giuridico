import './globals.css';

export const metadata = {
  title: 'CQS Refund Calc',
  description: 'Calcolatore rimborso Cessione del Quinto',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
} 