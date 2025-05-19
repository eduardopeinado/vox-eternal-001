import { createClient } from '@supabase/supabase-js'

// Leer las variables de entorno
// Asegúrate de que estas variables estén definidas en tu archivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validar que las variables se cargaron
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridas.");
}

// Crear y exportar el cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey) 