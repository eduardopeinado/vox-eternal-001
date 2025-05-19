#!/usr/bin/env python3
"""
Script de test para el microservicio VoiceFixer.
Permite enviar un archivo de audio al endpoint /denoise y guardar el resultado MP3.
Uso:
  python test_voicefixer.py --file /ruta/al/audio.m4a [--url http://localhost:8000/denoise] [--api-key TU_API_KEY] [--output cleaned_test.mp3]
"""

import argparse
import os
import sys
import requests

def main():
    parser = argparse.ArgumentParser(description="Test VoiceFixer /denoise endpoint")
    parser.add_argument('--file', required=True, help='Ruta al archivo de audio de entrada')
    parser.add_argument('--url', default='http://localhost:8000/denoiser', help='URL del endpoint /denoiser')
    parser.add_argument('--output', default='cleaned_test.mp3', help='Ruta de salida para el MP3 limpio')
    args = parser.parse_args()
    if not os.path.isfile(args.file):
        print(f"ERROR: El archivo de entrada no existe: {args.file}")
        sys.exit(1)

    print(f"Enviando {args.file} a {args.url} ...")
    with open(args.file, 'rb') as f:
        files = {'file': (os.path.basename(args.file), f)}
        try:
            resp = requests.post(args.url, files=files, timeout=120)
        except Exception as e:
            print(f"ERROR: Fallo la petición: {e}")
            sys.exit(1)

    if resp.status_code == 200 and resp.headers.get('content-type', '').startswith('audio/'):
        with open(args.output, 'wb') as out:
            out.write(resp.content)
        print(f"OK: MP3 limpio guardado en {args.output} ({os.path.getsize(args.output)} bytes)")
    else:
        print(f"ERROR: Status {resp.status_code}")
        try:
            print("Respuesta:", resp.json())
        except Exception:
            print("Respuesta:", resp.text)

if __name__ == "__main__":
    main()
