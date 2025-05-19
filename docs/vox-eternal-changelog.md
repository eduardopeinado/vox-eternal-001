### 2025-05-01

- [NUEVO] Microservicio de conversión de video dockerizado para Vox Eternal:
  - Convierte videos subidos por usuarios a MP4/H.264/AAC usando ffmpeg.
  - Valida límites por plan (tamaño, cantidad, almacenamiento, formato) antes de procesar.
  - Descarga el video original desde Supabase Storage, convierte y sube el archivo convertido al bucket.
  - Seguridad: autenticación por token en el endpoint `/convert`.
  - Limpieza automática de archivos temporales.
  - Documentación y ejemplo de prueba incluidos.
- [DOC] Para probar el microservicio:
  1. Asegúrate de que el contenedor esté corriendo y el endpoint `/convert` disponible en `http://localhost:8000/docs`.
  2. Usa el siguiente payload de ejemplo (ajusta los valores según el usuario real):

```json
{
  "user_id": "bc3a87d9-0d99-4b35-ab4b-7b5f47d4ca68",
  "plan": "Gratis",
  "video_url": "https://fyauxlcfktjegtqurffj.supabase.co/storage/v1/object/public/capsules/bc3a87d9-0d99-4b35-ab4b-7b5f47d4ca68/511a140b-1000-4de6-8e44-a710abe0a0c9/grabacion-1744479065068.webm",
  "video_size_mb": 1.3,
  "video_format": "webm",
  "current_video_count": 0,
  "current_storage_mb": 0
}
```

  3. Llama al endpoint con curl:
```bash
curl -X POST http://localhost:8000/convert \
  -H "Content-Type: application/json" \
  -H "x-auth-token: changeme" \
  -d '{ ...payload... }'
```
  4. El microservicio descargará, convertirá y subirá el video convertido a Supabase, devolviendo la URL pública.
  5. Si ves {"detail":"Not Found"}, revisa que el contenedor esté corriendo y el endpoint `/convert` esté disponible en `/docs`.

- [MEJORA] El microservicio está listo para pruebas y despliegue en el VPS. Documentación técnica y flujo detallado en `docs/video-conversion-flow.md`.

---

### 2025-05-02

- [FIX][CONVERSIÓN VIDEO] Diagnóstico y solución a error 401 en función `convert-video-http`:
  - **Problema:** La función recibía placeholders (`{{record.name}}`) porque el webhook de Supabase Storage estaba configurado para enviar solo parámetros personalizados y no el body completo del evento.
  - **Solución:** Es necesario configurar el webhook para que envíe el evento completo en el body (no solo parámetros personalizados). Así, la función puede extraer correctamente el nombre real del archivo y el bucket desde `body.record` o `body.new`.
  - **Acción:** Ajustar la configuración del webhook en el dashboard de Supabase Storage y probar nuevamente la subida de video.

### 2025-05-09

- [NUEVO][MEJORA AUDIO IA] Integración de microservicio VoiceFixer en VPS: despliegue en http://116.203.95.246:8000/denoise y configuración de secreto VOICEFIXER_URL en Supabase Edge Functions.

### 2025-05-01