# voicefixer_service/Dockerfile

FROM python:3.10-slim-bullseye

# 1) Prepara certificados para HTTPS
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2) Copia e instala Python deps (incluye imageio-ffmpeg)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3) Copia tu código
COPY . .

EXPOSE 8000

# 4) Arranca FastAPI
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--log-level", "debug", \
     "--timeout-keep-alive", "60"]
