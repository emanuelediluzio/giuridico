# PDF Parser API con Nanonets-OCR-s

API FastAPI per l'estrazione di testo da PDF utilizzando il modello Nanonets-OCR-s avanzato.

## Funzionalità

- **OCR Avanzato**: Utilizza Nanonets-OCR-s per estrazione testo di alta qualità
- **Elaborazione PDF**: Supporto completo per file PDF
- **Generazione Lettere**: Creazione automatica di lettere di diffida
- **API REST**: Endpoint per upload e processamento file

## Endpoint Disponibili

- `POST /ocr-nanonets/` - OCR avanzato con Nanonets-OCR-s
- `POST /genera-diffida/` - Genera lettera di diffida da contratto e conteggio
- `POST /estrai-dati/` - Estrae dati da PDF
- `GET /health` - Health check
- `GET /` - Homepage

## Tecnologie

- FastAPI
- Nanonets-OCR-s (Hugging Face)
- PyTorch
- PDFPlumber
- FPDF2

## Deploy su Hugging Face Spaces

Questo progetto è configurato per essere deployato automaticamente su Hugging Face Spaces.

### Configurazione Spaces

1. Vai su [Hugging Face Spaces](https://huggingface.co/spaces)
2. Crea un nuovo Space
3. Seleziona "FastAPI" come SDK
4. Imposta la root directory su `api/python_parser`
5. Connetti il repository GitHub

### Variabili d'Ambiente

Nessuna variabile d'ambiente richiesta per il funzionamento base.

## Utilizzo

### OCR con Nanonets

```bash
curl -X POST "https://your-space.hf.space/ocr-nanonets/" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@documento.pdf"
```

### Generazione Diffida

```bash
curl -X POST "https://your-space.hf.space/genera-diffida/" \
  -H "Content-Type: multipart/form-data" \
  -F "file_contratto=@contratto.pdf" \
  -F "file_conteggio=@conteggio.pdf"
```

## Note

- Il primo avvio può richiedere alcuni minuti per il download del modello Nanonets-OCR-s
- Il modello richiede circa 8GB di RAM
- Supporta file PDF fino a 100MB 