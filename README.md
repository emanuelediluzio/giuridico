Questo progetto ora include una funzionalità di calcolo rimborso Cessione del Quinto (CQS) secondo Art. 125 sexies T.U.B.

La struttura dei file sarà:
- src/app/page.tsx (UI principale)
- src/app/api/cqs/route.ts (API per parsing, calcolo e generazione lettera)
- src/lib/parsing.ts (utility per parsing PDF/DOCX/TXT)

Per avviare: `npm run dev`
