#!/bin/bash

# Script de despliegue automatizado para Voicefixer en Fly.io
# Ejecuta: bash deploy-flyio.sh

set -e

APP_NAME="voicefixer-service"
REGION="mia"

echo "=== 1. Inicializando app Voicefixer en Fly.io (si no existe)..."
flyctl apps list | grep -q "$APP_NAME" || flyctl launch --dockerfile Dockerfile --name "$APP_NAME" --region "$REGION" --no-deploy

echo "=== 2. Configurando variables de entorno (si aplica)..."
# Agrega aquí variables si tu servicio las necesita, por ejemplo:
# flyctl secrets set VAR1=valor1 VAR2=valor2

echo "=== 3. Desplegando el servicio Voicefixer..."
flyctl deploy

echo "=== 4. Mostrando logs en tiempo real..."
flyctl logs
