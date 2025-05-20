import { Redis } from '@upstash/redis';
import { processFilesDirectly } from '../process_pdf/direct_process';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

async function processJob(jobId: string) {
  try {
    // Recupera il job da Redis
    const jobData = await redis.get(`job:${jobId}`);
    if (!jobData) {
      console.error(`Job ${jobId} non trovato`);
      return;
    }

    const job = JSON.parse(jobData as string);
    
    // Aggiorna lo stato del job
    job.status = 'processing';
    await redis.set(`job:${jobId}`, JSON.stringify(job));

    // Converti i file base64 in File objects
    const contractFile = base64ToFile(job.files.contract, 'contract.pdf');
    const statementFile = base64ToFile(job.files.statement, 'statement.pdf');
    const templateFile = base64ToFile(job.files.template, 'template.pdf');

    // Elabora i file
    const result = await processFilesDirectly(contractFile, statementFile, templateFile);

    // Aggiorna il job con il risultato
    job.status = 'completed';
    job.result = result;
    job.completedAt = new Date().toISOString();
    await redis.set(`job:${jobId}`, JSON.stringify(job));

  } catch (error) {
    console.error(`Errore durante l'elaborazione del job ${jobId}:`, error);
    
    // Aggiorna il job con l'errore
    const jobData = await redis.get(`job:${jobId}`);
    if (jobData) {
      const job = JSON.parse(jobData as string);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Errore sconosciuto';
      job.failedAt = new Date().toISOString();
      await redis.set(`job:${jobId}`, JSON.stringify(job));
    }
  }
}

function base64ToFile(base64: string, filename: string): File {
  const buffer = Buffer.from(base64, 'base64');
  return new File([buffer], filename, { type: 'application/pdf' });
}

// Funzione principale del worker
export async function startWorker() {
  console.log('Worker avviato');
  
  while (true) {
    try {
      // Prendi il prossimo job dalla coda
      const jobId = await redis.rpop('processing_queue');
      
      if (jobId) {
        console.log(`Elaborazione job ${jobId}`);
        await processJob(jobId as string);
      } else {
        // Se non ci sono job, aspetta un po' prima di riprovare
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Errore nel worker:', error);
      // In caso di errore, aspetta un po' prima di riprovare
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
} 