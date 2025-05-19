# 🚀 Despliegue de Voicefixer en Fly.io

Guía rápida para desplegar el microservicio Voicefixer en Fly.io usando terminal.

---

## 1. Requisitos previos

- Tener la CLI de Fly.io instalada (`flyctl`).
- Haber hecho login:  
  ```bash
  flyctl auth login
  ```

---

## 2. Despliegue automatizado

Desde la carpeta `voicefixer_service/`:

```bash
bash deploy-flyio.sh
```

Este script:
- Inicializa la app en Fly.io (si no existe).
- (Opcional) Configura variables de entorno si las agregas en el script.n
- Despliega el servicio.
- Muestra los logs en tiempo real.

---

## 3. Variables de entorno

Si tu servicio necesita variables, edita el script `deploy-flyio.sh` y descomenta/agrega la línea:
```bash
flyctl secrets set VAR1=valor1 VAR2=valor2
```

---

## 4. Acceso al servicio

Una vez desplegado, tu microservicio estará disponible en:
```
https://voicefixer-service.fly.dev
```
(El subdominio puede cambiar si modificas el nombre de la app.)

---

## 5. Troubleshooting

- Verifica los logs con:
  ```bash
  flyctl logs
  ```
- Si necesitas reiniciar:
  ```bash
  flyctl restart
  ```
- Si quieres abrir una consola en la máquina:
  ```bash
  flyctl ssh console
  ```

---

**Despliegue modular, reproducible y sin errores manuales.**

---

## 6. Pruebas y uso del microservicio

### a) Healthcheck

Comprueba que el servicio responde:

```bash
curl https://voicefixer-service.fly.dev/
```

Debe devolver: `{"status":"ok"}`

### b) Procesamiento de audio (endpoint `/denoise`)

**Requisitos:**
- Archivo de audio de entrada (ejemplo: `AUDIO-2025-04-17-11-33-21.m4a`)
- API KEY configurada en Fly.io como `VOICEFIXER_API_KEY` (o en local como variable de entorno)

**Ejemplo con curl:**

```bash
curl -X POST "https://voicefixer-service.fly.dev/denoise" \
  -H "x_api_key: TU_API_KEY" \
  -F "file=@/ruta/al/audio.m4a" \
  --output cleaned_test.mp3
```

**Ejemplo con script automatizado:**

1. Instala dependencias si es necesario:
   ```bash
   pip install requests
   ```
2. Ejecuta el script:
   ```bash
   python sandbox/scripts/test_voicefixer.py --file /ruta/al/audio.m4a --url https://voicefixer-service.fly.dev/denoise --api-key TU_API_KEY --output cleaned_test.mp3
   ```

- El resultado limpio se guardará como `cleaned_test.mp3`.
- Puedes usar el script también para pruebas locales cambiando la URL a `http://localhost:8000/denoise`.

**Notas:**
- Si la API KEY no es válida o falta, el servicio responderá con error 401.
- El script permite automatizar pruebas y validar despliegues fácilmente.

---
