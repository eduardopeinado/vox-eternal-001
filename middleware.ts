import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Este middleware se ejecuta ANTES de que la solicitud llegue a la página.
export async function middleware(req: NextRequest) {
  console.log(`[Middleware] Running for path: ${req.nextUrl.pathname}`);
  let response = NextResponse.next({ request: { headers: req.headers } });

  // Crear cliente Supabase para el middleware usando las cookies de la request/response
  // Nota: El middleware tiene su propia forma de crear el cliente, no usa los helpers de server.ts
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            response.cookies.set({ name, value, ...options });
          } catch (error) {
            console.warn('[Middleware] Failed to set cookie:', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            response.cookies.set({ name, value: '', ...options });
          } catch (error) {
            console.warn('[Middleware] Failed to remove cookie:', error);
          }
        },
      },
    }
  );

  // Log ANTES de llamar a getUser
  console.log('[Middleware] Attempting to get user...');
  const { data: { user }, error: getUserError } = await supabase.auth.getUser();
  
  // Log DETALLADO del resultado
  if (getUserError) {
      console.error('[Middleware] Error getting user:', getUserError);
  }
  console.log(`[Middleware] Result of getUser: user ${user ? 'FOUND' : 'NOT FOUND'} (ID: ${user?.id ?? 'N/A'})`);

  const { pathname } = req.nextUrl;

  // ---- Lógica de Redirección ----
  if (!user && pathname.startsWith('/dashboard')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    console.log('[Middleware] No user, redirecting from /dashboard to /login');
    return NextResponse.redirect(url);
  }

  if (user && (pathname === '/login' || pathname === '/')) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    console.log(`[Middleware] User found, redirecting from ${pathname} to /dashboard`);
    return NextResponse.redirect(url);
  }

  // Permitir que la solicitud continúe con la response (que puede tener cookies actualizadas)
  console.log(`[Middleware] Allowing request to proceed for path: ${pathname}`);
  return response;
}

// --- Configuración del Middleware ---
// Mantenemos el matcher para que se active en las rutas correctas
export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto las que empiezan por:
     * - api (rutas API)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (archivo favicon)
     * - /privacidad, /terminos, /como-funciona (páginas públicas explícitas)
     * ¡Importante! Necesitamos que se ejecute en '/' para redirigir si ya hay sesión.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|privacidad|terminos|como-funciona).*)',
    // Asegurarse de que se ejecute también en la ruta raíz '/'
     '/',
  ],
}; 