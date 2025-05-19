# Despliegue de Vox Eternal con Docker Compose

Este documento resume los pasos esenciales para desplegar toda la plataforma (frontend SSR, microservicios y proxy).

---

## 1. Prerrequisitos

- Acceso SSH como `root` o usuario con permisos a `116.203.95.246`.  
- Docker y Docker Compose instalados en el servidor.  
- Código fuente actualizado en `/srv/vox-eternal`.  
- Archivo de variables `.env.production` y `Caddyfile` en la raíz del proyecto.

---
---
## Requisitos técnicos mínimos para VoiceFixer

- **FFmpeg** debe estar disponible en el `PATH` del sistema operativo dentro del contenedor. Ejemplo típico en Debian: `/usr/bin/ffmpeg`.
- **PyTorch** debe estar instalado en el entorno Python del contenedor.
- Si se cambia la imagen base del contenedor o el método de despliegue, es imprescindible verificar que ambos requisitos (FFmpeg y PyTorch) sigan cumpliéndose.

## 2. Subida de código

Sincroniza cambios desde tu máquina local al servidor (ejemplo con `rsync`):

```bash
rsync -avz --delete   --exclude 'node_modules/'   --exclude '.git/'   --exclude '.next/'   ./ root@116.203.95.246:/srv/vox-eternal/
```

---

## 3. Construcción y arranque

Desde el servidor, en la carpeta `/srv/vox-eternal`:

```bash
docker-compose build
docker-compose up -d
```

Esto:

- Reconstruye **frontend**, **voicefixer_service**, **video_converter_service** y **caddy**.  
- Inicia todos los contenedores en segundo plano.  

---

## 4. Gestión de servicios

- **Ver estado**:  
  ```bash
  docker-compose ps
  ```
- **Ver logs en vivo**:  
  ```bash
  docker-compose logs -f
  ```
- **Reiniciar un servicio** (por ejemplo, Caddy):  
  ```bash
  docker-compose restart caddy
  ```
- **Detener y eliminar**:  
  ```bash
  docker-compose down
  ```

---

## 5. Notas finales

- Asegúrate de que el puerto 80 y 443 estén abiertos al tráfico entrante.  
- Confirma que `Caddyfile` y `.env.production` no se suban a repositorios públicos.  
- Tras certificados TLS renovados, Caddy gestiona automáticamente la renovación.  
- Usa alertas o monitorización (Prometheus, UptimeRobot) para vigilar la disponibilidad.
