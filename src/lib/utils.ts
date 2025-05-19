import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Unifica la validación de archivos para cápsulas.
 * - Filtra archivos duplicados (por nombre y tamaño).
 * - Solo permite tipos soportados (imágenes, videos, audios comunes, incluyendo m4a).
 * - Devuelve archivos válidos y errores detallados.
 */
const SUPPORTED_MIME_REGEX = /^(image\/(png|jpeg|gif|bmp|heic|heif)|video\/(mp4|quicktime|x-msvideo)|audio\/(mpeg|mp4|ogg|opus|aac|wav|m4a))$/i;
const SUPPORTED_EXTENSIONS = [
  "png", "jpg", "jpeg", "gif", "bmp", "heic", "heif",
  "mp4", "mov", "avi",
  "mp3", "m4a", "ogg", "opus", "aac", "wav"
];

export function filterValidCapsuleFiles(
  newFiles: File[],
  existingFiles: File[]
): {
  validFiles: File[];
  errors: { file: File; reason: string }[];
} {
  const existingSet = new Set(
    existingFiles.map(f => `${f.name.toLowerCase()}-${f.size}`)
  );
  const validFiles: File[] = [];
  const errors: { file: File; reason: string }[] = [];

  for (const file of newFiles) {
    const key = `${file.name.toLowerCase()}-${file.size}`;
    const ext = file.name.split('.').pop()?.toLowerCase() || "";
    const isSupported =
      SUPPORTED_MIME_REGEX.test(file.type) ||
      SUPPORTED_EXTENSIONS.includes(ext);

    if (!isSupported) {
      errors.push({ file, reason: "Tipo de archivo no soportado" });
      continue;
    }
    if (existingSet.has(key) || validFiles.some(f => `${f.name.toLowerCase()}-${f.size}` === key)) {
      errors.push({ file, reason: "Archivo duplicado" });
      continue;
    }
    validFiles.push(file);
  }
  return { validFiles, errors };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
