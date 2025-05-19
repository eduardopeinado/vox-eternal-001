# Vox Eternal Video Converter Microservice
# Imagen base Python 3.10 + ffmpeg binario estático (aislado, no afecta otros servicios)
FROM python:3.10-slim

WORKDIR /app

# Copia binarios ffmpeg y ffprobe estáticos (descargados previamente)
COPY ffmpeg /usr/local/bin/ffmpeg
COPY ffprobe /usr/local/bin/ffprobe
RUN chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe

# Copia requirements y código fuente
COPY requirements.txt .
COPY main.py .
COPY plan_limits.py .

# Instala dependencias Python
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
