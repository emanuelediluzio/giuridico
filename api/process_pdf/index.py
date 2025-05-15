import os
import logging
import tempfile
import requests # Per chiamare iLovePDF API
import json 
from http.server import BaseHTTPRequestHandler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ILOVEPDF_API_KEY = os.environ.get('ILOVEPDF_API_KEY')
ILOVEPDF_API_URL_V1 = "https://api.ilovepdf.com/v1"
DEFAULT_COMPRESSION_LEVEL = 'recommended'
DEFAULT_OCR_LANGUAGE = 'ita' # iLovePDF usa codici a 3 lettere, 'ita' per italiano

class ILovePdfApiHelper:
    def __init__(self, public_key, api_url_v1):
        self.public_key = public_key
        self.api_url_v1 = api_url_v1
        self.jwt_token = None
        self._authenticate()

    def _authenticate(self):
        if not self.public_key:
            raise ValueError("ILOVEPDF_API_KEY (public_key) non fornita.")
        
        auth_url = f"{self.api_url_v1}/auth"
        # La documentazione API di iLovePDF menziona che per l'autenticazione si invia la public_key
        # per ottenere un token JWT. Alcune librerie client potrebbero richiedere public_key e secret_key.
        # Se ILOVEPDF_API_KEY è solo la public_key, l'autenticazione avviene tramite un endpoint specifico
        # o passando la public_key e la libreria/server genera/firma il JWT con la secret_key associata.
        # Per chiamate dirette senza una loro libreria SDK completa, il modo più comune è:
        # 1. Richiedere un token JWT a /auth usando la public_key (se è così che funziona il loro /auth)
        # 2. Oppure, se la public_key è usata come Bearer token per /auth per ottenere un JWT firmato con la secret
        # Il loro esempio di auth server-side suggerisce che la chiave segreta è usata per firmare un JWT.
        # Quello client-side richiede un token a /auth.
        # Data la variabile ILOVEPDF_API_KEY, la tratto come la chiave pubblica del progetto.
        # Per le chiamate API, useremo questa per ottenere un token JWT temporaneo.
        
        # Tentativo di ottenere il token JWT. Questo è il metodo "Request signed token from our authentication server"
        # citato nella loro documentazione API (developer.ilovepdf.com/docs/api-reference#authentication)
        # che usa la public_key.
        
        # NOTA BENE: La documentazione di iLovePDF dice:
        # "When you send a request to the /auth resource, you will receive the token to use in your
        # `Authorization: Bearer {signed_token}` that you'll send in every request (/start, /upload, /process, /download)."
        # E per la richiesta a /auth: payload `public_key: string`
        # Quindi inviamo la public_key come data, non come Bearer token per /auth.

        headers_auth = {'Content-Type': 'application/json'}
        payload_auth = {'public_key': self.public_key} # Assumendo che si aspetti JSON

        # Dovremmo controllare cosa si aspetta esattamente /auth: JSON o form-data.
        # Dalla loro collezione Postman (linkata nella doc), /auth sembra aspettarsi la public_key nel corpo.
        # Proverò con un POST JSON.
        try:
            # logger.info(f"Tentativo di autenticazione a iLovePDF con public_key: {self.public_key[:10]}...") # Non loggare la chiave
            logger.info(f"Tentativo di autenticazione a iLovePDF /auth...")
            response = requests.post(auth_url, json=payload_auth, headers=headers_auth) # Usare json=payload se /auth aspetta JSON
            # Se /auth si aspetta form data: response = requests.post(auth_url, data=payload_auth)
            response.raise_for_status()
            self.jwt_token = response.json()['token']
            logger.info("Autenticazione iLovePDF riuscita, token JWT ottenuto.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Errore durante l'autenticazione con iLovePDF /auth: {e.response.text if e.response else e}", exc_info=True)
            raise ValueError(f"Autenticazione iLovePDF fallita: {e.response.text if e.response else e}")
        except KeyError:
            logger.error(f"Risposta JSON da /auth non contiene 'token'. Risposta: {response.text}", exc_info=True)
            raise ValueError("Token non trovato nella risposta di autenticazione iLovePDF.")


    def _get_auth_headers(self):
        if not self.jwt_token:
            self._authenticate() # Riprova autenticazione se il token non c'è
        return {'Authorization': f'Bearer {self.jwt_token}'}

    def start_task(self, tool_name):
        logger.info(f"Avvio task iLovePDF: {tool_name}")
        start_url = f"{self.api_url_v1}/start/{tool_name}"
        response = requests.get(start_url, headers=self._get_auth_headers())
        response.raise_for_status()
        task_data = response.json()
        logger.info(f"Task {tool_name} avviato: ID {task_data.get('task')}, Server {task_data.get('server')}")
        return task_data['task'], task_data['server']

    def upload_file(self, server_url, task_id, file_bytes, filename="file.pdf"):
        logger.info(f"Upload file a iLovePDF: task {task_id}, server {server_url}, filename {filename}, size {len(file_bytes)} bytes")
        upload_url = f"https://{server_url}/v1/upload" # L'URL completo è https://{server}/v1/upload
        files_to_upload = {'file': (filename, file_bytes, 'application/pdf')}
        data_payload = {'task': task_id}
        response = requests.post(upload_url, headers=self._get_auth_headers(), data=data_payload, files=files_to_upload)
        response.raise_for_status()
        upload_data = response.json()
        logger.info(f"File uploaded, server_filename: {upload_data.get('server_filename')}")
        return upload_data['server_filename']

    def process_file(self, server_url, task_id, tool_name, server_filename, original_filename="file.pdf", params=None):
        logger.info(f"Processamento file iLovePDF: task {task_id}, tool {tool_name}, server_filename {server_filename}")
        process_url = f"https://{server_url}/v1/process"
        payload = {
            'task': task_id,
            'tool': tool_name,
            'files': [{'server_filename': server_filename, 'filename': original_filename}]
        }
        if params:
            payload.update(params)
        
        response = requests.post(process_url, headers=self._get_auth_headers(), json=payload)
        response.raise_for_status()
        logger.info(f"File processato con {tool_name}. Status: {response.status_code}")
        # La risposta al process di solito è solo uno status 200 OK se va a buon fine,
        # non necessariamente contiene dati utili oltre a confermare l'avvio/completamento.
        # Il download è un passaggio separato.
        return response # o response.json() se contiene dati utili

    def download_file(self, server_url, task_id):
        logger.info(f"Download file da iLovePDF: task {task_id}, server {server_url}")
        download_url = f"https://{server_url}/v1/download/{task_id}"
        response = requests.get(download_url, headers=self._get_auth_headers(), stream=True)
        response.raise_for_status()
        
        file_bytes_list = []
        for chunk in response.iter_content(chunk_size=8192):
            file_bytes_list.append(chunk)
        final_bytes = b''.join(file_bytes_list)
        logger.info(f"File scaricato, dimensione: {len(final_bytes)} bytes.")
        return final_bytes

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        original_file_path_temp = None
        pdf_bytes_current_step = None

        try:
            if not ILOVEPDF_API_KEY:
                self._send_error_response(500, "Configurazione server errata: ILOVEPDF_API_KEY mancante")
                return

            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self._send_error_response(400, "Corpo della richiesta mancante")
                return

            original_pdf_bytes = self.rfile.read(content_length)
            logger.info(f"Ricevuti {len(original_pdf_bytes)} bytes di dati PDF originali.")
            if not original_pdf_bytes:
                self._send_error_response(400, "Dati PDF originali vuoti")
                return
            
            pdf_bytes_current_step = original_pdf_bytes
            current_filename = "input.pdf"

            # Inizializza helper API iLovePDF
            try:
                ilovepdf_helper = ILovePdfApiHelper(ILOVEPDF_API_KEY, ILOVEPDF_API_URL_V1)
            except ValueError as auth_err: # Cattura specificamente l'errore di autenticazione
                 logger.error(f"Errore inizializzazione ILovePdfApiHelper (Autenticazione): {auth_err}", exc_info=True)
                 self._send_error_response(500, f"Errore autenticazione iLovePDF: {auth_err}")
                 return


            # --- 1. Compressione (Opzionale ma consigliato) ---
            try:
                logger.info("Avvio fase di COMPRESSIONE con iLovePDF...")
                task_id_compress, server_compress = ilovepdf_helper.start_task('compress')
                s_filename_compress = ilovepdf_helper.upload_file(server_compress, task_id_compress, pdf_bytes_current_step, current_filename)
                ilovepdf_helper.process_file(
                    server_compress, task_id_compress, 'compress', s_filename_compress, current_filename,
                    {'compression_level': DEFAULT_COMPRESSION_LEVEL}
                )
                compressed_pdf_bytes = ilovepdf_helper.download_file(server_compress, task_id_compress)
                logger.info(f"PDF compresso con successo. Dimensione originale: {len(pdf_bytes_current_step)}, Compressa: {len(compressed_pdf_bytes)}")
                pdf_bytes_current_step = compressed_pdf_bytes
                current_filename = "compressed.pdf"
            except Exception as e_compress:
                logger.error(f"Errore durante la compressione PDF con iLovePDF: {e_compress}", exc_info=True)
                logger.warning("Compressione fallita. Procedo con il file precedente per l'OCR.")
                # pdf_bytes_current_step rimane quello prima della compressione

            # --- 2. OCR (per rendere PDF ricercabile) ---
            try:
                logger.info("Avvio fase OCR (pdfocr) con iLovePDF...")
                task_id_ocr, server_ocr = ilovepdf_helper.start_task('pdfocr')
                s_filename_ocr = ilovepdf_helper.upload_file(server_ocr, task_id_ocr, pdf_bytes_current_step, current_filename)
                # Il parametro per la lingua in pdfocr è 'ocr_languages' (array di stringhe)
                ilovepdf_helper.process_file(
                    server_ocr, task_id_ocr, 'pdfocr', s_filename_ocr, current_filename,
                    {'ocr_languages': [DEFAULT_OCR_LANGUAGE]} 
                )
                ocr_output_pdf_bytes = ilovepdf_helper.download_file(server_ocr, task_id_ocr)
                logger.info(f"PDF processato con OCR (pdfocr). Dimensione output: {len(ocr_output_pdf_bytes)}")
                pdf_bytes_current_step = ocr_output_pdf_bytes
                current_filename = "ocr_output.pdf" # Questo è un PDF ricercabile
            except Exception as e_ocr:
                logger.error(f"Errore durante OCR (pdfocr) con iLovePDF: {e_ocr}", exc_info=True)
                # Se l'OCR fallisce, non possiamo procedere all'estrazione del testo in modo affidabile
                self._send_error_response(500, f"Errore durante la fase OCR con iLovePDF: {e_ocr}")
                return

            # --- 3. Estrazione Testo (dal PDF ricercabile) ---
            try:
                logger.info("Avvio fase ESTRAZIONE TESTO (extract) con iLovePDF...")
                task_id_extract, server_extract = ilovepdf_helper.start_task('extract')
                s_filename_extract = ilovepdf_helper.upload_file(server_extract, task_id_extract, pdf_bytes_current_step, current_filename)
                # Il task 'extract' non ha parametri specifici oltre al file, detailed=false di default
                ilovepdf_helper.process_file(server_extract, task_id_extract, 'extract', s_filename_extract, current_filename)
                
                # Il download del task 'extract' dovrebbe restituire i byte di un file .txt
                extracted_text_bytes = ilovepdf_helper.download_file(server_extract, task_id_extract)
                # Decodifica i bytes in stringa (UTF-8 è una codifica comune per il testo)
                final_text = extracted_text_bytes.decode('utf-8')
                logger.info(f"Testo estratto con successo da iLovePDF. Lunghezza testo: {len(final_text)}")
                
                self._send_success_response(final_text.strip())

            except Exception as e_extract:
                logger.error(f"Errore durante estrazione testo (extract) con iLovePDF: {e_extract}", exc_info=True)
                self._send_error_response(500, f"Errore durante estrazione testo con iLovePDF: {e_extract}")
                return

        except requests.exceptions.HTTPError as http_err:
            # Cattura specificamente errori HTTP da chiamate API per loggare meglio
            error_content = "N/A"
            if http_err.response is not None:
                try:
                    error_content = http_err.response.json() # o .text se non è JSON
                except json.JSONDecodeError:
                    error_content = http_err.response.text
            logger.error(f"Errore HTTP durante comunicazione con iLovePDF: {http_err.response.status_code if http_err.response else 'N/A'} - {error_content}", exc_info=True)
            self._send_error_response(500, f"Errore API iLovePDF ({http_err.response.status_code if http_err.response else 'N/A'}): {error_content}")

        except Exception as e:
            logger.error(f"Errore generico nel gestore POST: {e}", exc_info=True)
            self._send_error_response(500, f"Errore interno del server Python: {str(e)}")
        
        finally:
            # Non stiamo più scrivendo file temporanei su disco in questo flusso,
            # quindi non c'è original_file_path_temp da rimuovere.
            pass


    def _send_success_response(self, text_content):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response_data = {"text": text_content}
        self.wfile.write(json.dumps(response_data).encode('utf-8'))

    def _send_error_response(self, status_code, message):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        error_data = {"error": message}
        self.wfile.write(json.dumps(error_data).encode('utf-8')) 