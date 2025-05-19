# plan_limits.py
# Lógica de validación de planes para el microservicio de conversión de video Vox Eternal

from typing import Literal, Union

PlanName = Literal['Gratis', 'Básico', 'Premium', 'Vitalicio']

PLAN_FEATURES = {
    "Gratis": {
        "mejorasIA": 2,
        "videos": 1,
        "videos4K": False,
        "recordatorios": 1,
        "fotos": 5,
        "audios": 2,
        "tamanoMaxVideoMB": 30,
        "formatosVideoPermitidos": ["mp4"],
        "almacenamientoMaxMB": 500,
    },
    "Básico": {
        "mejorasIA": 20,
        "videos": 5,
        "videos4K": False,
        "recordatorios": 5,
        "fotos": 20,
        "audios": 10,
        "tamanoMaxVideoMB": 100,
        "formatosVideoPermitidos": ["mp4"],
        "almacenamientoMaxMB": 5000,
    },
    "Premium": {
        "mejorasIA": 150,
        "videos": 25,
        "videos4K": True,
        "recordatorios": 20,
        "fotos": 100,
        "audios": 50,
        "tamanoMaxVideoMB": 500,
        "formatosVideoPermitidos": ["mp4"],
        "almacenamientoMaxMB": 20000,
    },
    "Vitalicio": {
        "mejorasIA": "Ilimitado",
        "videos": "Ilimitado",
        "videos4K": True,
        "recordatorios": "Ilimitado",
        "fotos": "Ilimitado",
        "audios": "Ilimitado",
        "tamanoMaxVideoMB": 1000,
        "formatosVideoPermitidos": ["mp4"],
        "almacenamientoMaxMB": "Ilimitado",
    },
}

def can_upload_video(plan: PlanName, size_mb: float, format: str) -> bool:
    features = PLAN_FEATURES[plan]
    if features["almacenamientoMaxMB"] != "Ilimitado" and size_mb > features["tamanoMaxVideoMB"]:
        return False
    if format.lower() not in features["formatosVideoPermitidos"]:
        return False
    return True

def is_over_limit(plan: PlanName, feature: str, current_count: int) -> bool:
    limite = PLAN_FEATURES[plan][feature]
    if limite == "Ilimitado":
        return False
    return current_count >= int(limite)

def get_limit(plan: PlanName, feature: str) -> Union[int, str]:
    return PLAN_FEATURES[plan][feature]

def get_upgrade_message(feature: str) -> str:
    if feature == "videos":
        return "Actualiza tu plan para subir más videos."
    if feature == "tamanoMaxVideoMB":
        return "El tamaño máximo de video depende de tu plan. Actualiza para subir archivos más grandes."
    if feature == "almacenamientoMaxMB":
        return "Actualiza tu plan para obtener más almacenamiento."
    return "Actualiza tu plan para acceder a esta función."
