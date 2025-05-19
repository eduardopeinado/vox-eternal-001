# Microservicio de conversión de video (Vox Eternal)

## Objetivo

Convierte videos subidos por usuarios a formato MP4/H.264/AAC, respetando los límites de cada plan (tamaño, cantidad, almacenamiento). Pensado para ejecutarse en Docker y desplegarse en el VPS de Vox Eternal.

---

## Estructura

- `main.py` — API FastAPI: endpoint `/convert` para procesar videos.
- `plan_limits.py` — Lógica de validación de planes (importada de la lógica del monolito).
- `Dockerfile` — Imagen lista para producción, incluye ffmpeg.
- `requirements.txt` — Dependencias Python.
- `README.md` — Esta documentación.

---

## Flujo básico

1. Recibe petición POST con user_id, URL del video y metadatos.
2. Consulta el plan activo del usuario (vía Supabase o API).
3. Valida límites del plan (tamaño, cantidad, almacenamiento).
4. Descarga el video original.
5. Convierte a MP4/H.264/AAC usando ffmpeg.
6. Sube el video convertido a Supabase Storage.
7. Devuelve la URL pública del video convertido o error.

---

## Despliegue rápido

```bash
docker build -t vox-video-converter .
docker run -p 8000:8000 --env-file .env vox-video-converter
```

---

## Variables de entorno

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- (otras según integración)

---

## Automatización: conversión automática tras subida a Supabase Storage

### Paso 1: Configuración del webhook HTTP

1. **Despliegue de función HTTP:**  
   Se desplegó la función `convert-video-http` en Supabase Functions.  
   URL pública:  
   ```
   https://fyauxlcfktjegtqurffj.functions.supabase.co/convert-video-http
   ```

2. **Configurar webhook en Supabase Storage:**  
   - Ingresa al [dashboard de Supabase](https://supabase.com/dashboard/project/fyauxlcfktjegtqurffj/storage/buckets/capsules).
   - Ve a Storage > Buckets > `capsules` (o el bucket donde se suben los videos).
   - Busca la sección "Webhooks" o "Events" (puede estar en la configuración avanzada del bucket).
   - Haz clic en "Add webhook" o "Nuevo webhook".
   - Selecciona el evento: `OBJECT_CREATED`.
   - En "URL de destino", coloca:  
     ```
     https://fyauxlcfktjegtqurffj.functions.supabase.co/convert-video-http
     ```
   - El payload debe incluir al menos:
     - `video_url`: URL pública o ruta del archivo subido (ejemplo: `https://fyauxlcfktjegtqurffj.supabase.co/storage/v1/object/public/{{record.bucket_id}}/{{record.name}}`).
     - `video_size_mb`: Tamaño del archivo en bytes (`{{record.size}}`).
     - `video_format`: Nombre del archivo o extensión (`{{record.name}}`).
   - Guarda el webhook.

   > **Nota:** Si el dashboard no permite personalizar el payload ni enviar metadatos personalizados, la función convert-video-http debe buscar el resto de los datos (user_id, plan, etc.) en la base de datos usando el nombre del archivo como referencia. Este es el flujo recomendado y será implementado.

---

### Estado actual y próximos pasos

**Hecho:**
- Desplegada la función HTTP convert-video-http.
- Documentado y configurado el webhook en Supabase Storage para dispararse al subir un archivo.
- El webhook envía los parámetros básicos (video_url, video_size_mb, video_format) a la función.

**Pendiente (siguiente punto):**
- Adaptar la función convert-video-http para que, al recibir solo el nombre del archivo y el bucket, consulte la base de datos (tabla recuerdos) para obtener user_id, plan y demás datos necesarios antes de llamar al microservicio.
- Probar el flujo extremo a extremo subiendo un video y verificando la conversión automática.
- Documentar el resultado y el flujo final.

Puedes guardar el webhook tal como lo tienes. Avanzaré a la adaptación de la función y te avisaré cuando esté lista para la prueba real.

3. **Flujo esperado:**  
   - Cuando un usuario sube un video, Supabase Storage dispara el webhook.
   - La función HTTP recibe el evento y reenvía los datos al microservicio de conversión.
   - El microservicio procesa el video según el plan y sube el resultado a Storage.

---

## Uso del endpoint `/convert`

### Endpoint local (VPS)

POST http://localhost:8010/convert

### Headers obligatorios

- `Content-Type: application/json`
- `x-auth-token: changeme` (o el valor configurado en la variable de entorno `VIDEO_CONVERTER_AUTH_TOKEN`)

### Body (JSON)

```json
{
  "user_id": "test-user",
  "plan": "Gratis", // Valores válidos: "Gratis", "Básico", "Premium", "Vitalicio"
  "video_url": "https://url-del-video.webm",
  "video_size_mb": 10.0,
  "video_format": "webm",
  "current_video_count": 0,
  "current_storage_mb": 0.0
}
```

### Respuestas

- 200 OK: conversión y subida exitosa, retorna la URL pública del video convertido.
- 400/401: error de validación, límites de plan o token inválido.
- 422: error de validación de campos (por ejemplo, valor de `plan` incorrecto).

### Ejemplo de uso con curl

```bash
curl -X POST http://localhost:8010/convert \
  -H 'Content-Type: application/json' \
  -H 'x-auth-token: changeme' \
  -d '{
    "user_id": "test-user",
    "plan": "Gratis",
    "video_url": "https://fyauxlcfktjegtqurffj.supabase.co/storage/v1/object/public/capsules/bc3a87d9-0d99-4b35-ab4b-7b5f47d4ca68/511a140b-1000-4de6-8e44-a710abe0a0c9/grabacion-1744479065068.webm",
    "video_size_mb": 10.0,
    "video_format": "webm",
    "current_video_count": 0,
    "current_storage_mb": 0.0
  }'
```

---

## Troubleshooting y cambios recientes

- Se agregaron las dependencias `requests` y `supabase` a `requirements.txt` para evitar errores de importación.
- Se reconstruyó la imagen Docker y se reinició el servicio tras cada cambio de dependencias.
- El contenedor expone el puerto 8000 internamente, mapeado al 8010 del host (`localhost:8010` en el VPS).
- Si ves errores de importación, asegúrate de reconstruir la imagen y reiniciar el servicio tras modificar `requirements.txt`.
- El campo `plan` debe ser uno de: `"Gratis"`, `"Básico"`, `"Premium"`, `"Vitalicio"`.

---

## Roadmap

- [ ] Endpoint `/convert` funcional.
- [ ] Validación de límites por plan.
- [ ] Logs y manejo de errores robusto.
- [ ] Endpoint `/status/{id}` (opcional).
- [ ] Seguridad: auth token, IP whitelist.
- [ ] Despliegue en VPS.

---

## Referencias

- [docs/video-conversion-flow.md](../docs/video-conversion-flow.md)
- [src/lib/planFeatures.ts] (lógica de planes)
