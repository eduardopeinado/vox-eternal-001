#!/bin/bash

# Script para automatizar pruebas del microservicio VoiceFixer
# Uso:
#   bash automate_voicefixer_test.sh [local|fly] [API_KEY]
# Ejemplo:
#   bash automate_voicefixer_test.sh local MI_API_KEY
#   bash automate_voicefixer_test.sh fly MI_API_KEY

set -e

# Configuración
AUDIO_FILE="/Users/aa/Downloads/AUDIO-2025-04-17-11-33-21.m4a"
OUTPUT_DIR="../../sandbox/test-data"
OUTPUT_FILE="$OUTPUT_DIR/cleaned_test.mp3"
SCRIPT_PATH="sandbox/scripts/test_voicefixer.py"

# Crear carpeta de salida si no existe
mkdir -p "$OUTPUT_DIR"

# Leer modo
MODE=${1:-local}

if [ "$MODE" = "local" ]; then
  URL="http://localhost:8000/denoise"
elif [ "$MODE" = "fly" ]; then
  URL="https://voicefixer-service.fly.dev/denoise"
else
  echo "Modo no reconocido: $MODE. Usa 'local' o 'fly'."
  exit 1
fi

echo "===> Ejecutando prueba VoiceFixer en modo: $MODE"
echo "===> Archivo de entrada: $AUDIO_FILE"
echo "===> Endpoint: $URL"
echo "===> Guardando resultado en: $OUTPUT_FILE"

python3 "$SCRIPT_PATH" --file "$AUDIO_FILE" --url "$URL" --output "$OUTPUT_FILE"
