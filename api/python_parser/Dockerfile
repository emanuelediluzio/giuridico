FROM python:3.10-slim

WORKDIR /app

# Installa le dipendenze di sistema
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copia i file di requirements
COPY requirements.txt .

# Installa le dipendenze Python
RUN pip install --no-cache-dir -r requirements.txt

# Copia il codice dell'applicazione
COPY . .

# Espone la porta
EXPOSE 7860

# Comando di avvio
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"] 