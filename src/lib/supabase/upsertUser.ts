import { supabase } from "./client";

/**
 * Upserta el usuario autenticado en la tabla usuarios.
 * Dispara el trigger para crear la suscripción gratuita.
 */
export async function upsertUserProfile(user: { id: string; email: string; nombre?: string }) {
  if (!user?.id || !user?.email) return;

  const { error } = await supabase.from("usuarios").upsert(
    {
      id: user.id,
      email: user.email,
      nombre: user.nombre || null,
      fecha_creacion: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    // Puedes loguear o mostrar el error si es necesario
    console.error("Error upserting usuario:", error);
  }
}
