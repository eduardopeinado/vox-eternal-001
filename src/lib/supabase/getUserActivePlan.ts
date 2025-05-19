import { supabase } from "./client";

/**
 * Obtiene el plan activo del usuario autenticado.
 * Si no tiene suscripción activa, retorna "free".
 */
export async function getUserActivePlan(userId: string): Promise<string> {
  // Buscar suscripción activa
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error || !data) {
    // No hay suscripción activa, retorna "free"
    return "free";
  }

  return data.plan || "free";
}
