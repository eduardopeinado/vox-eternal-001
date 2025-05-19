import { createClient } from "@supabase/supabase-js";

// Devuelve los datos agregados para el dashboard admin: usuarios, suscripciones y pagos
export async function getAdminUsersWithSubscriptions() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Consulta agregada: usuarios + última suscripción + suma de pagos
  // NOTA: Si hay múltiples suscripciones por usuario, se toma la más reciente (por started_at)
  const { data, error } = await supabase.rpc("admin_dashboard_usuarios_suscripciones");

  if (error) throw error;
  return data;
}
