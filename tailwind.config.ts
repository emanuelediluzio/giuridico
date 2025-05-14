import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}', // Percorso comune per i componenti
    // Aggiungi altri percorsi se i tuoi componenti o pagine si trovano altrove
  ],
  theme: {
    extend: {
      // Qui puoi estendere il tema di default di Tailwind
      // Ad esempio, aggiungendo colori personalizzati, font, ecc.
      // colors: {
      //   'brand-blue': '#0070f3',
      // },
    },
  },
  plugins: [
    // Qui puoi aggiungere plugin di Tailwind
    // Esempio: require('@tailwindcss/typography'),
  ],
};
export default config; 