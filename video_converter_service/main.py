# main.py
from fastapi import FastAPI, HTTPException, Header, Request
from pydantic import BaseModel
from plan_limits import can_upload_video, get_limit, is_over_limit, PlanName
import os
import requests
import uuid
import subprocess
from supabase import create_client, Client

app = FastAPI(title="Vox Eternal Video Converter")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "capsules")
API_AUTH_TOKEN = os.getenv("VIDEO_CONVERTER_AUTH_TOKEN", "changeme")

class ConvertRequest(BaseModel):
    user_id: str
    plan: PlanName
    video_url: str
    video_size_mb: float
    video_format: str
    current_video_count: int
    current_storage_mb: float

class ConvertResponse(BaseModel):
    status: str
    message: str
    converted_url: str = None

def download_video(url: str, dest_path: str):
    r = requests.get(url, stream=True)
    r.raise_for_status()
    with open(dest_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)

def upload_to_supabase(local_path: str, user_id: str, original_name: str) -> str:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    ext = os.path.splitext(original_name)[1] or ".mp4"
    new_name = f"{uuid.uuid4().hex}_converted{ext}"
    storage_path = f"{user_id}/{new_name}"
    with open(local_path, "rb") as f:
        res = supabase.storage.from_(SUPABASE_BUCKET).upload(storage_path, f, upsert=True)
    if not res or not res.get("Key"):
        raise Exception("Error subiendo archivo convertido a Supabase Storage")
    public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(storage_path)
    return public_url

@app.post("/convert", response_model=ConvertResponse)
def convert_video(
    req: ConvertRequest,
    x_auth_token: str = Header(None)
):
    # Autenticación por token simple
    if x_auth_token != API_AUTH_TOKEN:
        raise HTTPException(status_code=401, detail="Token de autenticación inválido.")

    # Validación de límites por plan
    if not can_upload_video(req.plan, req.video_size_mb, req.video_format):
        raise HTTPException(
            status_code=400,
            detail=f"Tu plan solo permite videos MP4 de hasta {get_limit(req.plan, 'tamanoMaxVideoMB')}MB."
        )
    if is_over_limit(req.plan, "videos", req.current_video_count):
        raise HTTPException(
            status_code=400,
            detail="Has alcanzado el límite de videos de tu plan."
        )
    storage_limit = get_limit(req.plan, "almacenamientoMaxMB")
    if storage_limit != "Ilimitado" and (req.current_storage_mb + req.video_size_mb) > storage_limit:
        raise HTTPException(
            status_code=400,
            detail=f"Superas el límite de almacenamiento de tu plan ({storage_limit}MB)."
        )

    # 1. Descargar el video original
    tmp_input = f"/tmp/{uuid.uuid4().hex}_input{os.path.splitext(req.video_url)[1]}"
    tmp_output = f"/tmp/{uuid.uuid4().hex}_output.mp4"
    try:
        download_video(req.video_url, tmp_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error descargando video original: {e}")

    # 2. Convertir a MP4/H.264/AAC con ffmpeg
    ffmpeg_cmd = [
        "ffmpeg", "-y", "-i", tmp_input,
        "-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart",
        tmp_output
    ]
    try:
        subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Error en conversión ffmpeg: {e.stderr.decode()}")

    # 3. Subir el video convertido a Supabase Storage
    try:
        converted_url = upload_to_supabase(tmp_output, req.user_id, req.video_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error subiendo video convertido: {e}")

    # 4. Limpiar archivos temporales
    try:
        os.remove(tmp_input)
        os.remove(tmp_output)
    except Exception:
        pass

    return ConvertResponse(
        status="ok",
        message="Conversión y subida exitosa.",
        converted_url=converted_url
    )
