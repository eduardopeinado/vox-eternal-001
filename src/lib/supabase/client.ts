import { createClient } from '@supabase/supabase-js';

// Define una función para crear un cliente Supabase singleton para el navegador.
// Esto evita crear un nuevo cliente en cada renderizado.

// Validar variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env var NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing env var NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Exportar una instancia singleton del cliente del navegador
// La renombramos a 'supabase' para mantener la compatibilidad con AuthForm
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

/**
 * Función para obtener URLs públicas de archivos en Storage
 */
export const getStoragePublicUrl = (bucket: string, path: string): string => {
  if (!path) {
    console.error('getStoragePublicUrl: La ruta del archivo está vacía');
    return '';
  }

  // Check if the path is already a full URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    console.log('URL pública ya completa, devolviendo:', path);
    return path; // Return the path directly if it's already a full URL
  }

  // If not a full URL, proceed with normalization and construction
  // Normalizar la ruta quitando barras iniciales y finales
  let normalizedPath = path.trim();
  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.substring(1);
  }
  if (normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.substring(0, normalizedPath.length - 1);
  }

  // Quitar 'public/' si comienza con eso
  if (normalizedPath.startsWith('public/')) {
    normalizedPath = normalizedPath.substring(7); // 'public/'.length === 7
  }

  // Construir la URL pública en el formato correcto
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fyauxlcfktjegtqurffj.supabase.co';
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${normalizedPath}`;
  
  console.log('URL pública generada:', publicUrl);
  
  return publicUrl;
};
