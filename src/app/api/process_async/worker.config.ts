import { startWorker } from './worker';

// Avvia il worker
startWorker().catch(error => {
  console.error('Errore fatale nel worker:', error);
  process.exit(1);
}); 