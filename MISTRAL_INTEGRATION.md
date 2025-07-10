# Integrazione Mistral OCR

## Modifiche Implementate

### 1. Nuova Route API: `/api/ocr-mistral`
- **File**: `src/app/api/ocr-mistral/route.ts`
- **Funzionalità**: 
  - Riceve file PDF/JPG/PNG via POST
  - Esegue OCR tramite API Mistral
  - Analizza la prima percentuale trovata con Mixtral
  - Restituisce JSON con `{ valore, stato }`

### 2. Aggiornamento Frontend
- **File**: `src/app/lib/nanonets.ts`
  - Sostituita funzione `estraiTestoNanonetsOCR` per usare route locale
  - Aggiunta funzione `estraiDatiMistral` per analisi avanzata
- **File**: `src/app/page.tsx`
  - Aggiornata logica per usare Mistral OCR
  - Aggiunta visualizzazione analisi percentuale
  - Rimosso dipendenza da Hugging Face Spaces

### 3. Funzionalità Aggiunte
- **OCR Avanzato**: Estrazione testo da PDF/immagini
- **Analisi Percentuale**: Trova e valuta percentuali nei documenti
- **Visualizzazione Risultati**: Mostra percentuale trovata e stato OK/NO
- **Compatibilità**: Mantiene tutte le funzionalità esistenti

## Configurazione Vercel

### 1. Variabile d'Ambiente
Aggiungi su Vercel (Project Settings → Environment Variables):
```
MISTRAL_API_KEY=la_tua_chiave_api_mistral
```

### 2. Deploy
1. Commit e push delle modifiche
2. Vercel rileverà automaticamente la nuova route
3. Il deploy funzionerà senza backend Python

## Struttura API

### Endpoint: `/api/ocr-mistral`
**Method**: POST  
**Content-Type**: multipart/form-data

**Parametri**:
- `file`: File PDF/JPG/PNG da analizzare
- `threshold`: (opzionale) Soglia percentuale per stato OK/NO (default: 50)

**Risposta**:
```json
{
  "result": {
    "valore": 75,
    "stato": "OK"
  },
  "ocrText": "testo estratto dal documento",
  "raw": "risposta raw di Mixtral"
}
```

## Vantaggi

1. **Nessun Backend Python**: Tutto gira su Vercel
2. **OCR Avanzato**: Mistral OCR più preciso di soluzioni locali
3. **Analisi Intelligente**: Mixtral analizza e trova percentuali automaticamente
4. **Scalabilità**: API Mistral gestisce il carico
5. **Semplicità**: Un solo endpoint per OCR + analisi

## Test

1. Carica un PDF con percentuali
2. Il sistema estrae il testo
3. Mixtral trova la prima percentuale
4. Viene mostrata con stato OK/NO
5. I dati vengono usati per generare la lettera

## Troubleshooting

- **Errore 500**: Verifica che `MISTRAL_API_KEY` sia impostata
- **Errore OCR**: Controlla che il file sia valido (PDF/JPG/PNG)
- **Timeout**: Le API Mistral hanno limiti di tempo, file troppo grandi potrebbero fallire 