// Supabase SSR helpers para Next.js 15+
// Documentación oficial: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Función para crear un cliente Supabase en Server Components
export async function createServerComponentClient() {
  const cookieStore = await cookies();

  // Validar variables de entorno
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing env var SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing env var SUPABASE_SERVICE_ROLE_KEY");
  }

  return createServerClient(
    supabaseUrl,
    serviceRoleKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {},
        remove(name: string, options: CookieOptions) {},
      },
    }
  );
}

// Función para crear un cliente Supabase en Server Actions o Route Handlers
export async function createServerActionClient() {
  const cookieStore = await cookies();

  // Validar variables de entorno
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing env var SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing env var SUPABASE_SERVICE_ROLE_KEY");
  }

  return createServerClient(
    supabaseUrl,
    serviceRoleKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Error si las cabeceras ya se enviaron
            console.error('Error setting cookie in Server Action/Route Handler:', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
             // Error si las cabeceras ya se enviaron
            console.error('Error removing cookie in Server Action/Route Handler:', error);
          }
        },
      },
    }
  );
}

// NOTA: El middleware usa su propia instancia de createServerClient
// porque necesita pasar req/res explícitamente, no usa cookies().
