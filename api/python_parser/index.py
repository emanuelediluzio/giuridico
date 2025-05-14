import fitz  # PyMuPDF
import io
import logging
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs

# Configura il logging di base
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                logger.error("Richiesta POST ricevuta senza corpo (Content-Length è 0 o mancante).")
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Corpo della richiesta mancante o vuoto"}')
                return

            pdf_bytes = self.rfile.read(content_length)
            logger.info(f"Ricevuti {len(pdf_bytes)} bytes di dati PDF.")

            if not pdf_bytes:
                logger.error("I dati PDF ricevuti sono vuoti dopo la lettura.")
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Dati PDF vuoti ricevuti"}')
                return

            text = ""
            try:
                # Apri il PDF dai byte in memoria
                pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
                logger.info(f"PDF aperto con successo. Numero di pagine: {pdf_document.page_count}")
                
                for page_num in range(pdf_document.page_count):
                    page = pdf_document.load_page(page_num)
                    text += page.get_text("text")
                
                pdf_document.close()
                logger.info(f"Testo estratto con successo. Lunghezza: {len(text)} caratteri.")
                if not text.strip(): # Se il testo è vuoto o solo spazi bianchi
                    logger.warning("Il testo estratto dal PDF risulta vuoto o contiene solo spazi bianchi.")

            except Exception as e:
                logger.error(f"Errore durante l'elaborazione del PDF con PyMuPDF: {e}", exc_info=True)
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Errore durante l\'estrazione del testo dal PDF"}')
                return

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            # Assicurati di inviare il testo come parte di un oggetto JSON
            # e che sia correttamente encodato in UTF-8 (default per json.dumps)
            import json
            response_data = {"text": text}
            self.wfile.write(json.dumps(response_data).encode('utf-8'))

        except Exception as e:
            logger.error(f"Errore generico nel gestore POST: {e}", exc_info=True)
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "Errore interno del server Python"}')
        return 