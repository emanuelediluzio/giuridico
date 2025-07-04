import io
import re
import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
from fpdf import FPDF
import json
from huggingface_hub import snapshot_download
import torch
from transformers import AutoProcessor, AutoModel, AutoTokenizer, AutoModelForImageTextToText
from PIL import Image
import cv2
import numpy as np
from tempfile import NamedTemporaryFile
from config import Config

app = FastAPI(
    title="PDF Parser API con Nanonets-OCR-s", 
    version="2.0.0",
    description="API per estrazione testo da PDF con OCR avanzato"
)

# Configurazione CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variabili globali per il modello
model = None
processor = None

# === Nanonets-OCR-s ===
nanonets_model = None
nanonets_processor = None

async def load_pdf_extract_model():
    """Carica il modello PDF-Extract-Kit"""
    global model, processor
    
    if model is None:
        try:
            print("Caricamento modello PDF-Extract-Kit...")
            
            # Scarica il modello se non esiste
            model_path = "./pdf_extract_model"
            if not os.path.exists(model_path):
                print("Download del modello PDF-Extract-Kit...")
                snapshot_download(
                    repo_id='opendatalab/pdf-extract-kit-1.0', 
                    local_dir=model_path, 
                    max_workers=20
                )
            
            # Carica il modello e il processor
            model = AutoModel.from_pretrained(model_path)
            processor = AutoProcessor.from_pretrained(model_path)
            
            print("Modello PDF-Extract-Kit caricato con successo!")
            
        except Exception as e:
            print(f"Errore caricamento modello: {e}")
            # Fallback al metodo tradizionale
            model = None
            processor = None

def load_nanonets_model():
    global nanonets_model, nanonets_processor
    if nanonets_model is None or nanonets_processor is None:
        model_config = Config.get_model_config()
        model_path = model_config["model_path"]
        device = model_config["device"]
        
        print(f"Caricamento modello Nanonets-OCR-s da: {model_path}")
        print(f"Device configurato: {device}")
        
        nanonets_model = AutoModelForImageTextToText.from_pretrained(
            model_path, 
            torch_dtype="auto", 
            device_map=device, 
            attn_implementation="flash_attention_2"
        )
        nanonets_model.eval()
        nanonets_processor = AutoProcessor.from_pretrained(model_path)
        
        print("Modello Nanonets-OCR-s caricato con successo!")

def ocr_page_with_nanonets_s(image_path, max_new_tokens=4096):
    load_nanonets_model()
    prompt = ("Extract the text from the above document as if you were reading it naturally. "
              "Return the tables in html format. Return the equations in LaTeX representation. "
              "If there is an image in the document and image caption is not present, add a small description of the image inside the <img></img> tag; "
              "otherwise, add the image caption inside <img></img>. Watermarks should be wrapped in brackets. "
              "Ex: <watermark>OFFICIAL COPY</watermark>. Page numbers should be wrapped in brackets. "
              "Ex: <page_number>14</page_number> or <page_number>9/22</page_number>. Prefer using ☐ and ☑ for check boxes.")
    image = Image.open(image_path)
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": [
            {"type": "image", "image": f"file://{image_path}"},
            {"type": "text", "text": prompt},
        ]},
    ]
    text = nanonets_processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = nanonets_processor(text=[text], images=[image], padding=True, return_tensors="pt")
    inputs = inputs.to(nanonets_model.device)
    output_ids = nanonets_model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
    generated_ids = [output_ids[len(input_ids):] for input_ids, output_ids in zip(inputs.input_ids, output_ids)]
    output_text = nanonets_processor.batch_decode(generated_ids, skip_special_tokens=True, clean_up_tokenization_spaces=True)
    return output_text[0]

def extract_data_with_pdf_extract_kit(pdf_file, file_type="contratto"):
    """Estrae dati usando PDF-Extract-Kit"""
    try:
        if model is None or processor is None:
            print("Modello non disponibile, uso fallback")
            return None
            
        # Converti PDF in immagini
        images = convert_pdf_to_images(pdf_file)
        
        extracted_data = {
            "nome": "",
            "cognome": "",
            "codice_fiscale": "",
            "data_nascita": "",
            "luogo_nascita": "",
            "costi_totali": 0.0,
            "numero_rate": 0,
            "durata_mesi": 0,
            "rate_scadute": 0,
            "data_chiusura": ""
        }
        
        for i, image in enumerate(images):
            print(f"Processando pagina {i+1} con PDF-Extract-Kit...")
            
            # Preprocessa l'immagine
            inputs = processor(images=image, return_tensors="pt")
            
            # Esegui l'inferenza
            with torch.no_grad():
                outputs = model(**inputs)
            
            # Estrai i risultati
            results = processor.decode(outputs)
            
            # Analizza i risultati per estrarre i dati
            extracted_data = parse_pdf_extract_results(results, extracted_data, file_type)
            
            # Se abbiamo trovato tutti i dati necessari, fermiamoci
            if all([extracted_data["nome"], extracted_data["codice_fiscale"], extracted_data["costi_totali"] > 0]):
                break
        
        return extracted_data
        
    except Exception as e:
        print(f"Errore PDF-Extract-Kit: {e}")
        return None

def convert_pdf_to_images(pdf_file):
    """Converte PDF in immagini"""
    try:
        images = []
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                # Converti pagina in immagine
                img = page.to_image()
                pil_image = img.original
                images.append(pil_image)
        return images
    except Exception as e:
        print(f"Errore conversione PDF: {e}")
        return []

def parse_pdf_extract_results(results, extracted_data, file_type):
    """Analizza i risultati di PDF-Extract-Kit"""
    try:
        # I risultati contengono testo estratto e strutturato
        # Analizziamo il testo per trovare i pattern specifici
        
        if file_type == "contratto":
            # Estrazione dati dal contratto
            extracted_data = extract_contract_data_from_results(results, extracted_data)
        else:
            # Estrazione dati dal conteggio
            extracted_data = extract_statement_data_from_results(results, extracted_data)
            
        return extracted_data
        
    except Exception as e:
        print(f"Errore parsing risultati: {e}")
        return extracted_data

def extract_contract_data_from_results(results, data):
    """Estrae dati dal contratto usando i risultati di PDF-Extract-Kit"""
    try:
        # Analizza il testo estratto per trovare i pattern
        text = results.get("text", "")
        print(f"🔍 Testo estratto da PDF-Extract-Kit (primi 1000 char): {text[:1000]}")
        
        # Nome e cognome - pattern più flessibili
        nome_patterns = [
            r"COGNOME\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)\s+NOME\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+)",
            r"TITOLARE\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s']+)",
            r"CLIENTE\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s']+)",
            r"([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)\s+CF\s*:?\s*[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]"
        ]
        
        for pattern in nome_patterns:
            nome_match = re.search(pattern, text, re.IGNORECASE)
            if nome_match:
                data["cognome"] = nome_match.group(1).strip()
                data["nome"] = nome_match.group(2).strip()
                print(f"✅ Nome estratto: {data['cognome']} {data['nome']}")
                break
        
        # Codice fiscale - pattern più flessibile
        cf_patterns = [
            r"([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])",
            r"CF\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])",
            r"C\.?F\.?\s*:?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])"
        ]
        
        for pattern in cf_patterns:
            cf_match = re.search(pattern, text, re.IGNORECASE)
            if cf_match:
                data["codice_fiscale"] = cf_match.group(1).upper()
                print(f"✅ Codice fiscale estratto: {data['codice_fiscale']}")
                break
        
        # Data di nascita - pattern più specifici
        data_patterns = [
            r"nato\s*a\s*[^,]*\s*il\s*(\d{1,2}\/\d{1,2}\/\d{4})",
            r"data\s*nascita\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})",
            r"nato\s*il\s*(\d{1,2}\/\d{1,2}\/\d{4})"
        ]
        
        for pattern in data_patterns:
            data_match = re.search(pattern, text, re.IGNORECASE)
            if data_match:
                data["data_nascita"] = data_match.group(1)
                print(f"✅ Data nascita estratta: {data['data_nascita']}")
                break
        
        # Luogo di nascita
        luogo_patterns = [
            r"nato\s*a\s*([^,]*?)\s*il",
            r"luogo\s*nascita\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+)"
        ]
        
        for pattern in luogo_patterns:
            luogo_match = re.search(pattern, text, re.IGNORECASE)
            if luogo_match:
                data["luogo_nascita"] = luogo_match.group(1).strip()
                print(f"✅ Luogo nascita estratto: {data['luogo_nascita']}")
                break
        
        # Costi totali - pattern più flessibili
        costi_patterns = [
            r"CT\s+€\s*([\d.,]+)\s+COSTI TOTALI",
            r"COSTI TOTALI\s*:?\s*€?\s*([\d.,]+)",
            r"TOTALE COSTI\s*:?\s*€?\s*([\d.,]+)",
            r"([\d.,]+)\s*€\s*COSTI TOTALI",
            r"COSTI\s*:?\s*€?\s*([\d.,]+)"
        ]
        
        for pattern in costi_patterns:
            costi_match = re.search(pattern, text, re.IGNORECASE)
            if costi_match:
                try:
                    costi_str = costi_match.group(1).replace('.', '').replace(',', '.')
                    data["costi_totali"] = float(costi_str)
                    print(f"✅ Costi totali estratti: {data['costi_totali']} €")
                    break
                except ValueError:
                    continue
        
        # Durata - pattern più flessibili
        durata_patterns = [
            r"DURATA\s*:?\s*(\d+)\s*MESI",
            r"(\d+)\s*MESI\s*DI\s*DURATA",
            r"DURATA\s*TOTALE\s*:?\s*(\d+)\s*MESI"
        ]
        
        for pattern in durata_patterns:
            durata_match = re.search(pattern, text, re.IGNORECASE)
            if durata_match:
                data["durata_mesi"] = int(durata_match.group(1))
                data["numero_rate"] = int(durata_match.group(1))
                print(f"✅ Durata estratta: {data['durata_mesi']} mesi")
                break
        
        return data
        
    except Exception as e:
        print(f"❌ Errore estrazione dati contratto: {e}")
        return data

def extract_statement_data_from_results(results, data):
    """Estrae dati dal conteggio usando i risultati di PDF-Extract-Kit"""
    try:
        text = results.get("text", "")
        print(f"🔍 Testo estratto dal conteggio (primi 1000 char): {text[:1000]}")
        
        # Rate scadute - pattern più flessibili
        rate_patterns = [
            r"RATE\s*SCADUTE[^\d\n]*:?\s*\(?(\d{1,3})\s*MESI?",
            r"(\d{1,3})\s*RATE\s*SCADUTE",
            r"SCADUTE\s*:?\s*(\d{1,3})\s*RATE",
            r"RATE\s*PAGATE\s*:?\s*(\d{1,3})",
            r"(\d{1,3})\s*MESI?\s*SCADUTI"
        ]
        
        for pattern in rate_patterns:
            rate_match = re.search(pattern, text, re.IGNORECASE)
            if rate_match:
                data["rate_scadute"] = int(rate_match.group(1))
                print(f"✅ Rate scadute estratte: {data['rate_scadute']}")
                break
        
        # Data chiusura - pattern più flessibili
        data_patterns = [
            r"DATA\s*ELABORAZIONE\s*CONTEGGIO\s*ESTINTIVO\s*([\d\/]+)",
            r"DATA\s*CHIUSURA\s*:?\s*([\d\/]+)",
            r"ELABORATO\s*IL\s*([\d\/]+)",
            r"DATA\s*:?\s*([\d\/]+)\s*CONTEGGIO"
        ]
        
        for pattern in data_patterns:
            data_match = re.search(pattern, text, re.IGNORECASE)
            if data_match:
                data["data_chiusura"] = data_match.group(1)
                print(f"✅ Data chiusura estratta: {data['data_chiusura']}")
                break
        
        return data
        
    except Exception as e:
        print(f"❌ Errore estrazione dati conteggio: {e}")
        return data

def estrai_dati_contratto(file):
    """Estrae i dati dal contratto PDF - versione migliorata"""
    try:
        # Prima prova con PDF-Extract-Kit
        print("Tentativo estrazione con PDF-Extract-Kit...")
        extracted_data = extract_data_with_pdf_extract_kit(file, "contratto")
        
        if extracted_data and extracted_data["nome"]:
            print("Dati estratti con PDF-Extract-Kit:", extracted_data)
            return extracted_data
        
        # Fallback al metodo tradizionale
        print("Fallback al metodo tradizionale...")
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
        nome_match = re.search(r"COGNOME\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+?)\s+NOME\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s']+)", testo, re.IGNORECASE)
        if nome_match:
            dati["cognome"] = nome_match.group(1).strip()
            dati["nome"] = nome_match.group(2).strip()
        
        # Codice Fiscale
        cf_match = re.search(r"([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])", testo)
        if cf_match:
            dati["codice_fiscale"] = cf_match.group(1).upper()
        
        # Data di nascita
        data_match = re.search(r"(\d{1,2}\/\d{1,2}\/\d{4})", testo)
        if data_match:
            dati["data_nascita"] = data_match.group(1)
        
        # Costi totali
        costi_match = re.search(r"CT\s+€\s*([\d.,]+)\s+COSTI TOTALI", testo, re.IGNORECASE)
        if costi_match:
            dati["costi_totali"] = float(costi_match.group(1).replace('.', '').replace(',', '.'))
        
        # Durata
        durata_match = re.search(r"DURATA:\s*(\d+)\s*MESI", testo, re.IGNORECASE)
        if durata_match:
            dati["durata_mesi"] = int(durata_match.group(1))
            dati["numero_rate"] = int(durata_match.group(1))
        
        print(f"Dati estratti dal contratto: {dati}")
        return dati
        
    except Exception as e:
        print(f"Errore estrazione contratto: {e}")
        return {}

def estrai_dati_conteggio(file):
    """Estrae i dati dal conteggio estintivo PDF - versione migliorata"""
    try:
        # Prima prova con PDF-Extract-Kit
        print("Tentativo estrazione con PDF-Extract-Kit...")
        extracted_data = extract_data_with_pdf_extract_kit(file, "conteggio")
        
        if extracted_data and extracted_data["rate_scadute"] > 0:
            print("Dati estratti con PDF-Extract-Kit:", extracted_data)
            return extracted_data
        
        # Fallback al metodo tradizionale
        print("Fallback al metodo tradizionale...")
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

@app.on_event("startup")
async def startup_event():
    """Carica il modello all'avvio"""
    await load_pdf_extract_model()

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
        
        # Formatta i dati per il frontend
        dati_formattati = {
            "nomeCliente": f"{dati_contratto.get('cognome', '')} {dati_contratto.get('nome', '')}".strip() or "Cliente",
            "codiceFiscale": dati_contratto.get('codice_fiscale', 'Non disponibile'),
            "dataNascita": dati_contratto.get('data_nascita', 'Non disponibile'),
            "luogoNascita": dati_contratto.get('luogo_nascita', 'Non disponibile'),
            "importoRimborso": f"{calcoli.get('rimborso', 0):.2f}".replace('.', ',') + " €",
            "rateResidue": calcoli.get('rate_residue', 0),
            "durataTotale": calcoli.get('durata_totale', 0),
            "costiTotali": calcoli.get('costi_totali', 0)
        }
        
        return {
            "success": True,
            "dati_contratto": dati_contratto,
            "dati_conteggio": dati_conteggio,
            "calcoli": calcoli,
            "dati_formattati": dati_formattati
        }
        
    except Exception as e:
        print(f"Errore estrazione dati: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def home():
    """Endpoint di test"""
    return {"message": "PDF Parser API con PDF-Extract-Kit è attiva", "version": "2.0.0"}

@app.get("/health")
def health():
    """Health check endpoint con informazioni dettagliate"""
    import platform
    import datetime
    
    health_info = {
        "status": "ok",
        "timestamp": str(datetime.datetime.now()),
        "version": "2.0.0",
        "model_loaded": model is not None,
        "nanonets_loaded": nanonets_model is not None,
        "system": {
            "python_version": platform.python_version(),
            "platform": platform.platform()
        },
        "config": {
            "model_path": Config.get_model_config()["model_path"],
            "device": Config.get_model_config()["device"],
            "max_file_size": f"{Config.MAX_FILE_SIZE} MB",
            "ocr_timeout": f"{Config.OCR_TIMEOUT} seconds"
        }
    }
    
    return health_info

@app.post("/ocr-nanonets/")
async def ocr_nanonets(file: UploadFile = File(...)):
    """Esegue OCR avanzato con Nanonets-OCR-s su un'immagine o PDF (solo prima pagina)."""
    try:
        # Salva il file temporaneamente
        suffix = os.path.splitext(file.filename)[-1].lower()
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        # Se PDF, estrai la prima pagina come immagine
        if suffix == ".pdf":
            with pdfplumber.open(tmp_path) as pdf:
                page = pdf.pages[0]
                img = page.to_image(resolution=300)
                pil_image = img.original
                img_path = tmp_path + "_page1.jpg"
                pil_image.save(img_path)
        else:
            img_path = tmp_path
        # Esegui OCR
        result = ocr_page_with_nanonets_s(img_path, max_new_tokens=15000)
        # Pulisci file temporanei
        os.remove(tmp_path)
        if suffix == ".pdf":
            os.remove(img_path)
        return {"text": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore OCR Nanonets: {e}") 