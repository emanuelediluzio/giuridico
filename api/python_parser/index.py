import io
import re
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
from fpdf import FPDF
import json

app = FastAPI(title="PDF Parser API", version="1.0.0")

# Configurazione CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def estrai_dati_contratto(file):
    """Estrae i dati dal contratto PDF"""
    try:
        testo = ""
        with pdfplumber.open(file) as pdf:
            for page in pdf.pages:
                testo += page.extract_text() or ""
        
        print(f"Testo contratto (primi 500 char): {testo[:500]}")
        
        dati = {
            "nome": "",
            "cognome": "",
            "codice_fiscale": "",
            "data_nascita": "",
            "luogo_nascita": "",
            "costi_totali": 0.0,
            "numero_rate": 0,
            "durata_mesi": 0
        }
        
        # Estrazione nome e cognome
        nome_match = re.search(r"CLIENTE\s*(?:COGNOME:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?))?\s*(?:NOME:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?))?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)", testo, re.IGNORECASE)
        if nome_match:
            if nome_match.group(1) and nome_match.group(2):
                dati["cognome"] = nome_match.group(1).strip()
                dati["nome"] = nome_match.group(2).strip()
            elif nome_match.group(3):
                parti = nome_match.group(3).strip().split()
                if len(parti) >= 2:
                    dati["cognome"] = parti[0]
                    dati["nome"] = " ".join(parti[1:])
        
        # Fallback per nome
        if not dati["nome"]:
            titolare_match = re.search(r"Titolare:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)(?:\s*CF:|$)", testo, re.IGNORECASE)
            if titolare_match:
                nome_completo = titolare_match.group(1).strip()
                parti = nome_completo.split()
                if len(parti) >= 2:
                    dati["cognome"] = parti[0]
                    dati["nome"] = " ".join(parti[1:])
        
        # Estrazione codice fiscale
        cf_match = re.search(r"C\.?F\.?\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])", testo, re.IGNORECASE)
        if cf_match:
            dati["codice_fiscale"] = cf_match.group(1).upper()
        
        # Estrazione data di nascita
        data_match = re.search(r"nato\s*a\s*[^,]*\s*il\s*(\d{1,2}\/\d{1,2}\/\d{4})", testo, re.IGNORECASE)
        if data_match:
            dati["data_nascita"] = data_match.group(1)
        
        # Estrazione luogo di nascita
        luogo_match = re.search(r"nato\s*a\s*([^,]*?)\s*il", testo, re.IGNORECASE)
        if luogo_match:
            dati["luogo_nascita"] = luogo_match.group(1).strip()
        
        # Estrazione costi totali
        costi_match = re.search(r"CT\s+€\s*([\d.,]+)\s+COSTI TOTALI", testo, re.IGNORECASE)
        if costi_match:
            dati["costi_totali"] = float(costi_match.group(1).replace('.', '').replace(',', '.'))
        
        # Estrazione numero rate
        rate_match = re.search(r"DURATA:\s*(\d+)\s*MESI", testo, re.IGNORECASE)
        if rate_match:
            dati["numero_rate"] = int(rate_match.group(1))
            dati["durata_mesi"] = int(rate_match.group(1))
        
        print(f"Dati estratti dal contratto: {dati}")
        return dati
        
    except Exception as e:
        print(f"Errore estrazione contratto: {e}")
        return {}

def estrai_dati_conteggio(file):
    """Estrae i dati dal conteggio estintivo PDF"""
    try:
        testo = ""
        with pdfplumber.open(file) as pdf:
            for page in pdf.pages:
                testo += page.extract_text() or ""
        
        print(f"Testo conteggio (primi 500 char): {testo[:500]}")
        
        dati = {
            "rate_scadute": 0,
            "data_chiusura": "",
            "importo_versato": 0.0
        }
        
        # Estrazione rate scadute
        rate_match = re.search(r"RATE\s*SCADUTE[^\d\n]*:?\s*\(?(\d{1,3})\s*MESI?", testo, re.IGNORECASE)
        if rate_match:
            dati["rate_scadute"] = int(rate_match.group(1))
        
        # Estrazione data chiusura
        data_match = re.search(r"DATA\s*ELABORAZIONE\s*CONTEGGIO\s*ESTINTIVO\s*([\d\/]+)", testo, re.IGNORECASE)
        if data_match:
            dati["data_chiusura"] = data_match.group(1)
        
        # Fallback per data
        if not dati["data_chiusura"]:
            data_fallback = re.search(r"(\d{2}\/\d{2}\/\d{4})", testo)
            if data_fallback:
                dati["data_chiusura"] = data_fallback.group(1)
        
        print(f"Dati estratti dal conteggio: {dati}")
        return dati
        
    except Exception as e:
        print(f"Errore estrazione conteggio: {e}")
        return {}

def esegui_calcoli(dati_contratto, dati_conteggio):
    """Esegue i calcoli del rimborso"""
    try:
        costi_totali = dati_contratto.get("costi_totali", 0)
        durata_totale = dati_contratto.get("durata_mesi", 0)
        rate_scadute = dati_conteggio.get("rate_scadute", 0)
        
        if durata_totale == 0:
            return {"rimborso": 0, "errore": "Durata totale non può essere zero"}
        
        rate_residue = durata_totale - rate_scadute
        quota_non_goduta = (costi_totali / durata_totale) * rate_residue
        rimborso = max(0, quota_non_goduta)
        
        calcoli = {
            "rimborso": round(rimborso, 2),
            "quota_non_goduta": round(quota_non_goduta, 2),
            "rate_residue": rate_residue,
            "durata_totale": durata_totale,
            "rate_scadute": rate_scadute,
            "costi_totali": costi_totali
        }
        
        print(f"Calcoli eseguiti: {calcoli}")
        return calcoli
        
    except Exception as e:
        print(f"Errore calcoli: {e}")
        return {"rimborso": 0, "errore": str(e)}

def crea_pdf_diffida(dati_contratto, dati_conteggio, calcoli):
    """Crea il PDF della lettera di diffida"""
    try:
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        
        # Header
        nome_completo = f"{dati_contratto.get('cognome', '')} {dati_contratto.get('nome', '')}".strip()
        if not nome_completo:
            nome_completo = "Cliente"
        
        codice_fiscale = dati_contratto.get('codice_fiscale', 'Non disponibile')
        data_nascita = dati_contratto.get('data_nascita', 'Non disponibile')
        luogo_nascita = dati_contratto.get('luogo_nascita', 'Non disponibile')
        data_chiusura = dati_conteggio.get('data_chiusura', '')
        importo_rimborso = f"{calcoli.get('rimborso', 0):.2f}".replace('.', ',') + " €"
        
        # Contenuto lettera
        pdf.cell(200, 10, txt=f"Oggetto: Lettera di diffida per il Sig. {nome_completo} e proposta di stipula di convenzione di negoziazione assistita ai sensi degli artt. 2 e 3 del Decreto Legge n. 132/2014", ln=True, align='L')
        pdf.ln(5)
        
        pdf.cell(200, 10, txt=f"Spett.le ______________,", ln=True, align='L')
        pdf.ln(5)
        
        pdf.multi_cell(0, 10, txt=f"scrivo la presente in nome e per conto del Sig. {nome_completo} (C.F. {codice_fiscale}), nato a {luogo_nascita} il {data_nascita}, per rappresentarVi quanto segue.", align='L')
        pdf.ln(5)
        
        pdf.multi_cell(0, 10, txt="Alla luce delle verifiche effettuate sul rapporto contrattuale in oggetto - il quale invero è caratterizzato da una evidente genericità nella formulazione delle voci di costo applicate - è emerso che il Vostro istituto di credito ha illegittimamente trattenuto delle somme non dovute dal mio assistito e compiuto plurime violazioni della normativa di settore.", align='L')
        pdf.ln(5)
        
        pdf.multi_cell(0, 10, txt=f"Difatti, avendo il mio assistito estinto anticipatamente il suindicato contratto di finanziamento quando ancora residuavano da versare {calcoli.get('rate_residue', 0)} rate delle {calcoli.get('durata_totale', 0)} convenute, lo stesso ha diritto, a norma dell'art. 125 sexies T.U.B., alla restituzione della corrispettiva quota delle commissioni, degli oneri, dei premi assicurativi sottoscritti a fronte del finanziamento e delle spese a lui imputate.", align='L')
        pdf.ln(5)
        
        pdf.multi_cell(0, 10, txt=f"Nello specifico il mio assistito ha corrisposto complessivi {importo_rimborso} a titolo di commissioni, oneri, spese e polizze.", align='L')
        pdf.ln(5)
        
        pdf.multi_cell(0, 10, txt=f"Di conseguenza - al netto dello storno di euro 0,00 applicato in sede estintiva, e fatta salva ogni maggior richiesta all'esito dell'analisi tecnico contabile - spetta la restituzione di complessivi {importo_rimborso} calcolati secondo il metodo pro rata temporis.", align='L')
        pdf.ln(5)
        
        pdf.multi_cell(0, 10, txt="Inoltre il rapporto appare viziato anche sotto il profilo della trasparenza delle condizioni praticate e dei tassi applicati, integrando pertanto una condotta evidentemente contraria a buona fede e correttezza.", align='L')
        pdf.ln(5)
        
        pdf.multi_cell(0, 10, txt=f"Pertanto Vi invito e diffido a restituire al mio assistito, entro e non oltre il termine di 15 giorni dal ricevimento della presente, la complessiva somma di {importo_rimborso} oltre interessi dal dì del dovuto sino al soddisfo e spese.", align='L')
        pdf.ln(10)
        
        pdf.cell(200, 10, txt="Avv. Gabriele Scappaticci", ln=True, align='L')
        
        return pdf
        
    except Exception as e:
        print(f"Errore creazione PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Errore creazione PDF: {e}")

@app.post("/genera-diffida/")
async def genera_diffida(
    file_contratto: UploadFile = File(...),
    file_conteggio: UploadFile = File(...)
):
    """Endpoint principale per generare la lettera di diffida"""
    try:
        print(f"Ricevuti file: contratto={file_contratto.filename}, conteggio={file_conteggio.filename}")
        
        # Estrazione dati
        dati_contratto = estrai_dati_contratto(file_contratto.file)
        dati_conteggio = estrai_dati_conteggio(file_conteggio.file)
        
        # Calcoli
        calcoli = esegui_calcoli(dati_contratto, dati_conteggio)
        
        # Creazione PDF
        pdf_output = crea_pdf_diffida(dati_contratto, dati_conteggio, calcoli)
        
        # Restituzione file
        headers = {'Content-Disposition': 'attachment; filename="diffida_compilata.pdf"'}
        return Response(
            pdf_output.output(dest='S').encode('latin-1'), 
            media_type='application/pdf', 
            headers=headers
        )
        
    except Exception as e:
        print(f"Errore generazione diffida: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/estrai-dati/")
async def estrai_dati(
    file_contratto: UploadFile = File(...),
    file_conteggio: UploadFile = File(...)
):
    """Endpoint per estrarre solo i dati senza generare PDF"""
    try:
        print(f"Estrazione dati da: contratto={file_contratto.filename}, conteggio={file_conteggio.filename}")
        
        dati_contratto = estrai_dati_contratto(file_contratto.file)
        dati_conteggio = estrai_dati_conteggio(file_conteggio.file)
        calcoli = esegui_calcoli(dati_contratto, dati_conteggio)
        
        return {
            "dati_contratto": dati_contratto,
            "dati_conteggio": dati_conteggio,
            "calcoli": calcoli
        }
        
    except Exception as e:
        print(f"Errore estrazione dati: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def home():
    """Endpoint di test"""
    return {"message": "PDF Parser API è attiva", "version": "1.0.0"}

@app.get("/health")
def health():
    """Health check"""
    return {"status": "ok"} 