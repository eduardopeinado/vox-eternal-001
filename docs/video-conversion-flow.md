# Flujo de conversión automática de videos para compatibilidad universal (Vox Eternal)

## Objetivo

Permitir que los usuarios graben y suban videos desde cualquier navegador (desktop o móvil, cualquier formato soportado por MediaRecorder), garantizando que todos los videos sean reproducibles en cualquier dispositivo (especialmente iOS/Safari), sin perder la flexibilidad de la grabación nativa.

---

## 1. Subida de video (frontend)

> **¿Por qué no grabar siempre en MP4 desde el navegador?**
>
> - La API MediaRecorder del navegador **no garantiza** que puedas grabar siempre en MP4/H.264.
> - En desktop (Chrome/Firefox), solo se soporta `.webm` (VP8/VP9) por temas de licencias y soporte nativo.
> - En Safari/iOS, MediaRecorder graba en `.mp4` (H.264/AAC), pero la API es menos estándar y no está disponible en todos los navegadores.
> - Intentar forzar MP4 desde el frontend haría que muchos usuarios de desktop no puedan grabar video, o que la grabación falle silenciosamente.
> - Por eso, la única forma universal y robusta es permitir la grabación en el formato nativo del navegador y convertir automáticamente a MP4/H.264 en backend tras la subida.

- El usuario puede grabar o subir cualquier video: `.webm`, `.mp4`, `.mov`, etc.
- El archivo original se almacena tal cual en Supabase Storage (bucket `capsules`).
- Se registra en la base de datos el tipo MIME y extensión original.

---

## 2. Trigger de conversión automática (backend)

- Al detectar la subida de un archivo de video no-MP4, se dispara un proceso backend:
  - **Opciones:** Supabase Edge Function, microservicio Node.js/Python, cron job, etc.
- El proceso debe:
  1. Descargar el archivo original desde Storage.
  2. Usar `ffmpeg` para convertirlo a `.mp4` (H.264/AAC).
  3. Subir el archivo convertido al mismo bucket, con sufijo `_converted.mp4`.
  4. Actualizar la base de datos con la URL del video convertido.
  5. Registrar logs de conversión y errores para trazabilidad.

---

## 3. Lógica de frontend para compatibilidad y fallback

- Al mostrar un video:
  - Si existe el MP4 convertido, mostrarlo siempre.
  - Si solo existe el original y el navegador lo soporta, mostrarlo.
  - Si el navegador no soporta el formato y no hay MP4, mostrar mensaje de "video en proceso de conversión" o "no compatible aún".
- Tras grabar/subir un video no-MP4, mostrar advertencia UX: "Tu video estará disponible en todos los dispositivos tras la conversión automática. Mientras tanto, puede que no se vea en iOS/Safari."

---

## 4. Consideraciones técnicas

- **ffmpeg** debe estar disponible en el entorno backend (Edge Function, VPS, etc).
- El proceso debe ser asíncrono y tolerante a fallos (reintentos, logs).
- El frontend debe consultar el estado de conversión (campo en la base de datos: `conversion_status`, `converted_url`, etc).
- Se recomienda limpiar archivos temporales y manejar cuotas de almacenamiento.

---

## 5. Ejemplo de comando ffmpeg

```bash
ffmpeg -i input.webm -c:v libx264 -c:a aac -movflags +faststart output_converted.mp4
```

---

## 6. Roadmap y mejoras futuras

- Integrar notificaciones al usuario cuando el video convertido esté disponible.
- Permitir descarga del video convertido.
- Extender lógica a otros tipos de media si es necesario.

---

## 7. Referencias

- [Compatibilidad de formatos de video en navegadores](https://developer.mozilla.org/es/docs/Web/Media/Formats/Video_codecs)
- [ffmpeg documentation](https://ffmpeg.org/documentation.html)
- [Supabase Storage triggers](https://supabase.com/docs/guides/storage/triggers)

---

# Microservicio de conversión de video: despliegue, dependencias y pruebas (Vox Eternal)

## Estado y despliegue actual

- El microservicio está desplegado y corriendo en el VPS de Vox Eternal (Hetzner, IP: 116.203.95.246), completamente aislado y sin afectar servicios principales ni voicefixer.
- Utiliza imagen base `python:3.10-slim` y binarios ffmpeg/ffprobe estáticos locales (no depende de mirrors externos).
- El contenedor expone el puerto **8010** y está definido en `docker-compose.yml` como `video_converter_service`.
- Toda la lógica y dependencias están documentadas y el despliegue es 100% reproducible.

## Dependencias y Dockerfile

- `video_converter_service/requirements.txt` contiene solo:
  - `fastapi`
  - `uvicorn`
  - `httpx`
- Dockerfile:
  - Basado en `python:3.10-slim`.
  - Copia binarios ffmpeg/ffprobe estáticos locales.
  - No instala nada por `apt-get`, build 100% offline.

## Pruebas recomendadas

1. **Verificar que el contenedor esté corriendo:**
   ```bash
   docker ps -a | grep video_converter_service
   ```
   El servicio debe estar disponible en el VPS en el puerto 8010.

2. **Probar el endpoint interactivo:**
   - Accede a: [http://116.203.95.246:8010/docs](http://116.203.95.246:8010/docs) (Swagger FastAPI).

3. **Realizar petición POST a `/convert`:**
   - Ejemplo de comando `curl` (ajusta `<TOKEN>` y datos):
     ```bash
     curl -X POST "http://116.203.95.246:8010/convert" \
       -H "x-auth-token: <TOKEN>" \
       -H "Content-Type: application/json" \
       -d '{"user_id": "...", "video_url": "...", "metadatos": {...}}'
     ```
   - El microservicio requiere autenticación por token en el header `x-auth-token`.

4. **Verificar la respuesta:**
   - Debe devolverse la URL pública del video convertido.
   - Confirma que el archivo convertido esté en el bucket de destino en Supabase Storage.

## Notas técnicas

- El microservicio valida límites por plan, descarga el video original, convierte a MP4/H.264/AAC, sube el archivo convertido y devuelve la URL pública.
- Limpia archivos temporales automáticamente.
- Toda la lógica está en `video_converter_service/main.py`.
- Para modificar dependencias, edita `video_converter_service/requirements.txt` y reconstruye el contenedor.
- El despliegue se gestiona vía `docker-compose` y puede reiniciarse con:
  ```bash
  ssh root@116.203.95.246 'cd /srv/vox-eternal && docker-compose restart'
  ```

## Archivos clave

- `video_converter_service/requirements.txt`
- `video_converter_service/Dockerfile`
- `video_converter_service/main.py`
- `video_converter_service/README.md`
- `docs/vox-eternal-changelog.md` (historial de cambios y ejemplos de payload)

---

_Esta sección puede compartirse en chats técnicos o de QA para pruebas, validación y soporte del microservicio._
