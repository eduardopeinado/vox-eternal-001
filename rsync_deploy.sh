#!/bin/bash
# Script para sincronizar el proyecto a tu servidor Hetzner usando rsync

# Configura estos valores:
USUARIO=root
IP=116.203.95.246
DESTINO=/srv/vox-eternal

# Ejecuta este script desde la raíz del proyecto local

rsync -avz --delete \
  --exclude 'node_modules/' \
  --exclude '.venv/' \
  --exclude '.env.local' \
  --exclude '.env.production.local' \
  --exclude '.next/' \
  --exclude '.DS_Store' \
  --exclude 'fly.toml' \
  --exclude 'README-DEPLOY-FLYIO.md' \
  --exclude 'voicefixer_service/README-DEPLOY-FLYIO.md' \
  --exclude 'voicefixer_service/deploy-flyio.sh' \
  --exclude 'docs/_legacy/' \
  # -*- Excluir archivos de desarrollo local -*-
  --exclude 'docker-compose.dev.yml' \
  --exclude 'Dockerfile.dev' \
  --exclude 'Caddyfile.dev' \
  ./ $USUARIO@$IP:$DESTINO

echo "✅ Proyecto sincronizado a $USUARIO@$IP:$DESTINO"
echo
echo "Asegúrate de que allí exista tu archivo **.env.production** con las variables de entorno:"
echo "  NODE_ENV=production"
echo "  NEXT_PUBLIC_BASE_URL=https://vox-eternal.com"
echo "  [otras variables necesarias]"
echo
echo "Ahora, en el servidor, ejecuta:"
echo "  cd $DESTINO"
echo "  docker-compose build"
echo "  docker-compose up -d"
