# Deploy su Hugging Face Spaces - Guida Completa

## 🚀 Configurazione Hugging Face Spaces

### Passo 1: Preparazione Account
1. Vai su [Hugging Face](https://huggingface.co) e crea un account
2. Verifica il tuo account (richiesto per Spaces)

### Passo 2: Creazione Space
1. Vai su [Hugging Face Spaces](https://huggingface.co/spaces)
2. Clicca "Create new Space"
3. Configura:
   - **Owner**: Il tuo username
   - **Space name**: `giuridico-pdf-parser` (o nome a tua scelta)
   - **License**: MIT
   - **SDK**: **FastAPI** (importante!)
   - **Python version**: 3.10 (se disponibile)

### Passo 3: Connessione Repository
1. Seleziona "GitHub" come repository
2. Connetti il tuo repository GitHub
3. **IMPORTANTE**: Imposta la **Root directory** su `api/python_parser`
4. Clicca "Create Space"

### Passo 4: Configurazione Build
Il deploy inizierà automaticamente. Potrebbe richiedere 5-10 minuti per:
- Installare le dipendenze Python
- Scaricare il modello Nanonets-OCR-s (circa 8GB)
- Avviare l'API FastAPI

## 🔧 Configurazione Frontend

### Passo 1: Aggiorna Variabili d'Ambiente
Crea un file `.env.local` nel root del progetto:

```bash
# URL del tuo Hugging Face Space
NEXT_PUBLIC_HF_SPACES_URL=https://your-username-giuridico-pdf-parser.hf.space

# Token Hugging Face (opzionale, per Spaces privati)
NEXT_PUBLIC_HF_TOKEN=your_huggingface_token_here
```

### Passo 2: Deploy Frontend su Vercel
1. Pusha le modifiche su GitHub
2. Vercel si aggiornerà automaticamente
3. Il frontend ora chiamerà l'API su Hugging Face Spaces

## 📋 Verifica Funzionamento

### Test API
Una volta deployato, testa l'API:

```bash
# Health check
curl https://your-username-giuridico-pdf-parser.hf.space/health

# OCR test
curl -X POST "https://your-username-giuridico-pdf-parser.hf.space/ocr-nanonets/" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test.pdf"
```

### Test Frontend
1. Vai su Vercel
2. Carica un PDF
3. Verifica che l'OCR funzioni

## 🛠️ Risoluzione Problemi

### Problema: Build Fallisce
- Verifica che la root directory sia `api/python_parser`
- Controlla i log di build su Hugging Face
- Assicurati che `requirements.txt` sia nella directory corretta

### Problema: Modello Non Carica
- Il primo avvio può richiedere 10-15 minuti
- Verifica che ci sia spazio sufficiente (8GB+)
- Controlla i log per errori di download

### Problema: CORS Errors
- L'API è già configurata per CORS
- Verifica che l'URL nel frontend sia corretto
- Controlla che non ci siano errori di rete

### Problema: Timeout
- Il modello può richiedere 30-60 secondi per processare
- Aumenta i timeout nel frontend se necessario

## 📊 Monitoraggio

### Logs Hugging Face Spaces
- Vai su "Settings" del tuo Space
- Sezione "Logs" per vedere errori e performance

### Metrics
- Hugging Face fornisce metriche base
- Monitora l'uso di CPU/RAM
- Verifica i tempi di risposta

## 🔄 Aggiornamenti

### Deploy Nuove Versioni
1. Pusha modifiche su GitHub
2. Hugging Face Spaces si aggiorna automaticamente
3. Vercel si aggiorna automaticamente

### Rollback
- Hugging Face mantiene versioni precedenti
- Puoi tornare a versioni precedenti dalle impostazioni

## 💡 Ottimizzazioni

### Performance
- Il modello è già ottimizzato per Hugging Face Spaces
- Considera caching per risultati frequenti
- Monitora l'uso delle risorse

### Costi
- Hugging Face Spaces è gratuito per uso base
- Per uso intensivo, considera upgrade a Pro

## 🎯 Prossimi Passi

1. **Testa completamente** l'integrazione
2. **Monitora** performance e errori
3. **Ottimizza** se necessario
4. **Documenta** per il team

## 📞 Supporto

- [Hugging Face Spaces Docs](https://huggingface.co/docs/hub/spaces)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Vercel Docs](https://vercel.com/docs) 