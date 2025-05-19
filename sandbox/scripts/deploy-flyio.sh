#!/bin/bash

# Script de despliegue automatizado para Fly.io
# Ejecuta: bash sandbox/scripts/deploy-flyio.sh

set -e

APP_NAME="vox-eternal-001"
REGION="mia"

echo "=== 1. Inicializando app en Fly.io (si no existe)..."
flyctl apps list | grep -q "$APP_NAME" || flyctl launch --dockerfile Dockerfile --name "$APP_NAME" --region "$REGION" --no-deploy

echo "=== 2. Configurando variables de entorno..."
flyctl secrets set \
  NEXT_PUBLIC_SUPABASE_URL="https://fyauxlcfktjegtqurffj.supabase.co" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5YXV4bGNma3RqZWd0cXVyZmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyOTAxMjYsImV4cCI6MjA1ODg2NjEyNn0.MCW3eipNe7k8D_XJM0XW7iGBrrLgYHcKU3usDoZ9Wd0" \
  BASE_URL="https://vox-eternal-001.fly.dev" \
  NEXT_PUBLIC_BASE_URL="https://vox-eternal-001.fly.dev"

echo "=== 3. Desplegando la app..."
flyctl deploy

echo "=== 4. Mostrando logs en tiempo real..."
flyctl logs
