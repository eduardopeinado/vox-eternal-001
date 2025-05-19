import sys
from voicefixer import VoiceFixer

if __name__ == "__main__":
    vf = VoiceFixer()
    print("Modelo VoiceFixer cargado correctamente.")
    input_wav = "test_input.wav"
    output_wav = "test_output.wav"
    try:
        vf.restore(input=input_wav, output=output_wav, cuda=False)
        print("Procesamiento completado.")
    except Exception as e:
        print("Error durante el procesamiento:", str(e))
