import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase/client";
import type { UserProfile, FriendRequest } from "../types/friendship";

/**
 * Hook para gestionar la lógica de afinidad y amistades.
 * Permite obtener amigos, solicitudes y realizar acciones sobre ellas.
 */
export interface AcceptedFriend {
  amistadId: string;
  amigo: UserProfile;
}

export function useFriendship() {
  const [friends, setFriends] = useState<AcceptedFriend[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendRequest[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar amigos y solicitudes al montar
  useEffect(() => {
    fetchFriendshipData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchFriendshipData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // 2. Obtener amigos (amistades aceptadas)
      const { data: friendsData, error: friendsError } = await supabase
        .from("amistades")
        .select("id, amigo:amigo_id(id, email, nombre, plan, pais, avatar_url)")
        .eq("usuario_id", user.id)
        .eq("estado", "aceptada");

      if (friendsError) throw friendsError;

      setFriends(
        (friendsData || []).map((row: any) => ({
          amistadId: row.id,
          amigo: row.amigo as UserProfile,
        }))
      );

      // 3. Solicitudes recibidas (pendientes)
      const { data: receivedData, error: receivedError } = await supabase
        .from("amistades")
        .select("*, usuario:usuario_id(id, email, nombre, plan, pais, avatar_url)")
        .eq("amigo_id", user.id)
        .eq("estado", "pendiente");

      if (receivedError) throw receivedError;

      setPendingReceived(receivedData || []);

      // 4. Solicitudes enviadas (pendientes)
      const { data: sentData, error: sentError } = await supabase
        .from("amistades")
        .select("*, amigo:amigo_id(id, email, nombre, plan, pais, avatar_url)")
        .eq("usuario_id", user.id)
        .eq("estado", "pendiente");

      if (sentError) throw sentError;

      setPendingSent(sentData || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar amistades");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Enviar solicitud de amistad a un usuario.
   */
  async function sendFriendRequest(amigoId: string) {
    setError(null);
    try {
      // Llama a la función Edge (RPC) para enviar solicitud
      const { error } = await supabase.functions.invoke("manage-friendship", {
        body: {
          action: "enviar",
          amigo_id: amigoId,
        },
      });
      if (error) throw error;
      await fetchFriendshipData();
    } catch (err: any) {
      setError(err.message || "Error al enviar solicitud");
    }
  }

  /**
   * Aceptar una solicitud de amistad recibida.
   */
  async function acceptFriendRequest(requestId: string) {
    setError(null);
    try {
      const { error } = await supabase.functions.invoke("manage-friendship", {
        body: {
          action: "aceptar",
          amistad_id: requestId,
        },
      });
      if (error) throw error;
      await fetchFriendshipData();
    } catch (err: any) {
      setError(err.message || "Error al aceptar solicitud");
    }
  }

  /**
   * Rechazar una solicitud de amistad recibida.
   */
  async function rejectFriendRequest(requestId: string) {
    setError(null);
    try {
      const { error } = await supabase.functions.invoke("manage-friendship", {
        body: {
          action: "rechazar",
          amistad_id: requestId,
        },
      });
      if (error) throw error;
      await fetchFriendshipData();
    } catch (err: any) {
      setError(err.message || "Error al rechazar solicitud");
    }
  }

  /**
   * Eliminar a un amigo o cancelar una solicitud.
   */
  async function removeFriendship(amistadId: string) {
    setError(null);
    try {
      const { error } = await supabase.functions.invoke("manage-friendship", {
        body: {
          action: "eliminar",
          amistad_id: amistadId,
        },
      });
      if (error) throw error;
      await fetchFriendshipData();
    } catch (err: any) {
      setError(err.message || "Error al eliminar amistad");
    }
  }

  return {
    friends,
    pendingReceived,
    pendingSent,
    loading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriendship,
    refetch: fetchFriendshipData,
  };
}
