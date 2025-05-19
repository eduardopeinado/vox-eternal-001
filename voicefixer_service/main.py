import os
import shutil
import uuid
import subprocess
from fastapi import FastAPI, File, UploadFile, Header, HTTPException
from fastapi.responses import FileResponse
from voicefixer import VoiceFixer
from pydub import AudioSegment
from imageio_ffmpeg import get_ffmpeg_exe

# Configuramos pydub para usar el FFmpeg embebido
_ffmpeg_executable = get_ffmpeg_exe()
AudioSegment.converter = _ffmpeg_executable
AudioSegment.ffmpeg = _ffmpeg_executable
AudioSegment.ffprobe = _ffmpeg_executable  # por si fuese necesario

# Función de log a consola
def logprint(*args, **kwargs):
    print(*args, **kwargs)

app = FastAPI()
voicefixer_model = VoiceFixer()

@app.get("/")
async def root():
    return {"status": "ok"}

@app.post("/denoise")
async def denoise_audio(
    file: UploadFile = File(...),
    x_api_key: str = Header(None)
):
    # Validar API KEY
    expected_api_key = os.environ.get("VOICEFIXER_API_KEY")
    if not expected_api_key or x_api_key != expected_api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        logprint("===> Recibido archivo:", file.filename)
        # Guardar archivo temporalmente
        input_ext = os.path.splitext(file.filename)[-1].lower()
        input_id = str(uuid.uuid4())
        input_path = f"/tmp/{input_id}{input_ext}"

        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logprint("===> Archivo guardado en:", input_path, "Tamaño:", os.path.getsize(input_path))

        # Convertir a WAV si no es .wav
        if input_ext == ".wav":
            logprint("===> Entrada es WAV, saltando conversión.")
            input_wav_path = input_path
        else:
            input_wav_path = f"/tmp/{input_id}_input.wav"
            cmd = [
                _ffmpeg_executable, "-y",
                "-i", input_path,
                "-ar", "44100",
                "-ac", "1",
                "-f", "wav",
                input_wav_path
            ]
            logprint("===> Convirtiendo a WAV con:", cmd)
            result = subprocess.run(cmd, capture_output=True, text=True)
            logprint("===> ffmpeg stdout:", result.stdout)
            logprint("===> ffmpeg stderr:", result.stderr)
            logprint("===> ffmpeg returncode:", result.returncode)

            if result.returncode != 0 or not os.path.exists(input_wav_path) or os.path.getsize(input_wav_path) == 0:
                logprint("===> Error: la conversión a WAV falló.")
                return {
                    "error": f"Error al convertir a wav. returncode: {result.returncode}",
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "input_path": input_path,
                    "input_wav_path": input_wav_path,
                    "input_size": os.path.getsize(input_path) if os.path.exists(input_path) else "no existe",
                    "wav_size": os.path.getsize(input_wav_path) if os.path.exists(input_wav_path) else "no existe"
                }

        # Procesar con VoiceFixer
        output_path = f"/tmp/{input_id}_output.wav"
        try:
            logprint("===> Procesando con VoiceFixer...")
            voicefixer_model.restore(input=input_wav_path, output=output_path, cuda=False)
            logprint("===> VoiceFixer terminó. WAV generado en:", output_path)
        except Exception as e:
            logprint("===> Error en VoiceFixer:", str(e))
            return {
                "error": f"Error al procesar el audio: {str(e)}",
                "input_wav_path": input_wav_path,
                "output_path": output_path,
                "input_wav_size": os.path.getsize(input_wav_path) if os.path.exists(input_wav_path) else "no existe",
                "output_wav_size": os.path.getsize(output_path) if os.path.exists(output_path) else "no existe"
            }

        # Verificar WAV de salida
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            logprint("===> Error: el archivo WAV generado está vacío o no existe.")
            return {
                "error": "El archivo WAV de salida está vacío o no existe.",
                "output_path": output_path,
                "output_wav_size": os.path.getsize(output_path) if os.path.exists(output_path) else "no existe"
            }

        # Convertir WAV a MP3 usando pydub
        output_mp3_path = f"/tmp/{input_id}_clean.mp3"
        try:
            logprint("===> Convirtiendo WAV a MP3 usando pydub...")
            audio = AudioSegment.from_wav(output_path)
            audio.export(output_mp3_path, format="mp3", bitrate="192k")
            logprint("===> MP3 exportado con pydub en:", output_mp3_path)
        except Exception as pydub_exc:
            logprint("===> Error al convertir WAV a MP3 con pydub:", str(pydub_exc))
            return {
                "error": f"Error al convertir WAV a MP3 con pydub: {str(pydub_exc)}",
                "output_path": output_path,
                "output_mp3_path": output_mp3_path,
                "output_wav_size": os.path.getsize(output_path) if os.path.exists(output_path) else "no existe",
                "output_mp3_size": os.path.getsize(output_mp3_path) if os.path.exists(output_mp3_path) else "no existe"
            }

        # Verificar MP3 de salida
        if not os.path.exists(output_mp3_path) or os.path.getsize(output_mp3_path) == 0:
            logprint("===> Error: el archivo MP3 generado está vacío o no existe.")
            return {
                "error": "El archivo MP3 de salida está vacío o no existe.",
                "output_mp3_path": output_mp3_path,
                "output_mp3_size": os.path.getsize(output_mp3_path) if os.path.exists(output_mp3_path) else "no existe"
            }

        logprint("===> MP3 generado. Tamaño:", os.path.getsize(output_mp3_path))

        # Limpiar temporales
        try:
            for p in [input_path, input_wav_path, output_path]:
                if os.path.exists(p):
                    os.remove(p)
        except Exception as cleanup_err:
            logprint("===> Error al limpiar archivos temporales:", str(cleanup_err))

        # Devolver MP3 limpio
        return FileResponse(output_mp3_path, media_type="audio/mpeg", filename="cleaned.mp3")

    except Exception as e:
        logprint("===> Excepción inesperada:", str(e))
        return {"error": f"Excepción inesperada: {str(e)}"}
