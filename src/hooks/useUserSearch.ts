import { useState } from "react";
import { supabase } from "../lib/supabase/client";
import type { UserProfile } from "../types/friendship";

/**
 * Hook para buscar usuarios por nombre o país, excluyendo al usuario actual y amistades existentes.
 */
export function useUserSearch() {
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Buscar usuarios por nombre y/o país.
   * @param query Texto de búsqueda (nombre)
   * @param country País (opcional)
   * @param excludeIds IDs a excluir (usuario actual, amigos, solicitudes)
   */
  async function searchUsers(query: string, country?: string, excludeIds: string[] = []) {
    setLoading(true);
    setError(null);
    try {
      let supa = supabase
        .from("usuarios")
        .select("id, email, nombre, apellido, plan, pais, avatar_url, bio, rol, show_onboarding")
        .neq("id", "") // Para forzar el index

      if (query) {
        supa = supa.ilike("nombre", `%${query}%`);
      }
      if (country) {
        supa = supa.eq("pais", country);
      }
      if (excludeIds.length > 0) {
        supa = supa.not("id", "in", `(${excludeIds.join(",")})`);
      }

      const { data, error } = await supa.limit(20);
      if (error) throw error;
      setResults(data || []);
    } catch (err: any) {
      setError(err.message || "Error al buscar usuarios");
    } finally {
      setLoading(false);
    }
  }

  return {
    results,
    loading,
    error,
    searchUsers,
  };
}
