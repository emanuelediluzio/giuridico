import os
from typing import Optional

class Config:
    """Configurazione per l'applicazione FastAPI su Hugging Face Spaces"""
    
    # Configurazione CORS
    CORS_ORIGINS = [
        "http://localhost:3000",
        "https://localhost:3000",
        "https://*.vercel.app",
        "https://*.hf.space",
        "*"  # Per sviluppo, rimuovi in produzione
    ]
    
    # Configurazione modello
    MODEL_PATH = os.getenv("MODEL_PATH", "nanonets/Nanonets-OCR-s")
    DEVICE = os.getenv("DEVICE", "auto")
    
    # Configurazione server
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "7860"))
    
    # Configurazione file
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "100"))  # MB
    ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
    
    # Configurazione timeout
    OCR_TIMEOUT = int(os.getenv("OCR_TIMEOUT", "300"))  # secondi
    
    # Debug mode
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    
    @classmethod
    def get_cors_origins(cls) -> list:
        """Restituisce le origini CORS configurate"""
        return cls.CORS_ORIGINS
    
    @classmethod
    def is_allowed_file(cls, filename: str) -> bool:
        """Verifica se l'estensione del file è permessa"""
        return any(filename.lower().endswith(ext) for ext in cls.ALLOWED_EXTENSIONS)
    
    @classmethod
    def get_model_config(cls) -> dict:
        """Restituisce la configurazione del modello"""
        return {
            "model_path": cls.MODEL_PATH,
            "device": cls.DEVICE,
            "timeout": cls.OCR_TIMEOUT
        } 