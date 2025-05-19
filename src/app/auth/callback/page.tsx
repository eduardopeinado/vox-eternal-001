"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Utilidad para extraer parámetros del hash de la URL
function getHashParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.substring(1);
  return hash.split("&").reduce((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key] = decodeURIComponent(value);
    return acc;
  }, {} as Record<string, string>);
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = getHashParams();
    const access_token = params["access_token"];
    const refresh_token = params["refresh_token"];
    // Solo permitir redirecciones internas (rutas que empiezan con "/")
    let redirectTo = params["redirect"] || "/dashboard";
    if (!redirectTo.startsWith("/") || redirectTo.startsWith("//") || redirectTo.includes("://")) {
      redirectTo = "/dashboard";
    }

    if (access_token && refresh_token) {
      // Propagar sesión al SSR (mantener si es necesario)
      fetch("/api/auth/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token, refresh_token }),
        credentials: "include",
      })
        .then(async () => {
          // Obtener el user_id desde Supabase con el access_token
         const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fyauxlcfktjegtqurffj.supabase.co";
         const { user } = await fetch(`${supabaseUrl}/auth/v1/user`, {
           headers: {
              Authorization: `Bearer ${access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            },
          })
            .then((res) => res.json())
            .catch(() => ({}));
          if (user && user.id) {
            // Registrar la IP en el backend
            await fetch("/api/auth/set-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: user.id }),
              credentials: "include",
            });
          }
          router.replace(redirectTo);
        })
        .catch(() => {
          router.replace("/login?error=callback");
        });
    } else {
      // Si no hay tokens, redirigir a login
      router.replace("/login?error=missing_tokens");
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-xl font-bold mb-4">Procesando autenticación...</h1>
      <p>Un momento por favor.</p>
    </div>
  );
}
