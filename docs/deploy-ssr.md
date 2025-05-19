# Guía de Despliegue SSR para Vox Eternal (Docker Compose + Caddy)

Esta guía describe cómo preparar, construir y desplegar la aplicación Next.js en modo SSR usando Docker Compose y Caddy como proxy inverso y manejador de HTTPS.

---

## 1. Variables de entorno

Crea un archivo `.env.production` en la raíz del proyecto (`/srv/vox-eternal/.env.production`) con al menos:

```env
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://vox-eternal.com
# Añade aquí cualquier otra variable de entorno requerida por tu aplicación
```

**⚠️ Importante:** Nunca comites tu `.env.production` en repositorios públicos. Manténlo seguro en el servidor.

---

## 2. Construcción y despliegue con Docker Compose

1. Desde la raíz del proyecto, instala dependencias y construye la imagen del frontend:
   ```bash
   docker-compose build frontend
   ```
2. Levanta (o reinicia) únicamente el servicio del frontend:
   ```bash
   docker-compose up -d frontend
   ```
3. Para recargar Caddy tras cualquier cambio en la configuración:
   ```bash
   docker-compose restart caddy
   ```

---

## 3. Configuración de Caddy

Coloca un archivo `Caddyfile` en la raíz de tu proyecto (`/srv/vox-eternal/Caddyfile`) con este contenido mínimo:

```caddyfile
# Redirige todo HTTP a HTTPS
http://vox-eternal.com {
    redir https://{host}{uri} permanent
}

# Sitio HTTPS con TLS automático
https://vox-eternal.com {
    encode gzip

    # Rutas de APIs
    reverse_proxy /api/voicefixer/*     http://voicefixer_service:8000
    reverse_proxy /api/video-converter/* http://video_converter_service:8010

    # Todo lo demás al frontend Next.js
    reverse_proxy /*                    http://frontend:3000
}
```

- **`http://…`** asegura que todo tráfico HTTP quede redirigido a HTTPS.  
- **`https://…`** habilita automáticamente certificados Let’s Encrypt y sirve tu app y APIs.

---

## 4. Verificación

- Comprueba que Next.js responda internamente:
  ```bash
  docker-compose exec frontend curl -I http://localhost:3000
  ```
  Debe devolver `HTTP/1.1 200 OK`.
- Valida la configuración de Caddy:
  ```bash
  docker-compose exec caddy caddy validate --config /etc/caddy/Caddyfile
  ```
- Revisa logs en vivo:
  ```bash
  docker-compose logs -f frontend caddy
  ```

---

## 5. Buenas prácticas

- Usa Node.js LTS (v18+).  
- Mantén tus imágenes Docker actualizadas (`docker image prune`).  
- Aísla variables sensibles en `.env.production`.  
- Protege rutas dinámicas y APIs con autenticación.  
- Monitoriza contenedores y certificados TLS para renovaciones automáticas.  
