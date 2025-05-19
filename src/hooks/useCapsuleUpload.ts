import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * Hook para subir archivos a Supabase Storage (bucket 'capsules').
 * Devuelve estado de carga, error, urls públicas y función para iniciar la subida.
 */
export interface UploadResult {
  path: string;
  publicUrl: string;
  originalFilename: string;
  fileType: string;
}

interface UseCapsuleUploadReturn {
  uploadFiles: (userId: string, files: File[]) => Promise<UploadResult[]>;
  loading: boolean;
  error: string | null;
  progress: number; // 0-100, promedio si son varios archivos
  reset: () => void;
}

export function useCapsuleUpload(): UseCapsuleUploadReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const reset = () => {
    setLoading(false);
    setError(null);
    setProgress(0);
  };

  /**
   * Sube archivos al bucket 'capsules' bajo la carpeta del usuario.
   * Devuelve array con path y url pública de cada archivo.
   */
  const uploadFiles = async (userId: string, files: File[]): Promise<UploadResult[]> => {
    setLoading(true);
    setError(null);
    setProgress(0);

    const results: UploadResult[] = [];
    let completed = 0;

    for (const file of files) {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || "bin";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Permitir subida de cualquier formato de video grabado desde navegador (webm, mp4, mov, etc).
      // La compatibilidad universal se logrará con conversión automática en backend.

      // Subir archivo
      const { data, error: uploadError } = await supabase.storage
        .from("capsules")
        .upload(filePath, file);

      if (uploadError) {
        setError(`Error subiendo ${file.name}: ${uploadError.message}`);
        setLoading(false);
        throw uploadError;
      }

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from("capsules")
        .getPublicUrl(filePath);

      results.push({
        path: filePath,
        publicUrl: publicUrlData.publicUrl,
        originalFilename: file.name,
        fileType: file.type,
      });

      completed += 1;
      setProgress(Math.round((completed / files.length) * 100));
    }

    setLoading(false);
    setProgress(100);
    return results;
  };

  return { uploadFiles, loading, error, progress, reset };
}
