export interface UserProfile {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  plan: string | null;
  pais: string | null;
  avatar_url: string | null;
  bio: string | null;
  rol: string | null;
}

export type FriendshipStatus =
  | "pendiente"
  | "aceptada"
  | "rechazada"
  | "eliminada"
  | "bloqueada";

export interface Friendship {
  id: string;
  usuario_id: string; // Quien envía la solicitud
  amigo_id: string;   // Quien la recibe
  estado: FriendshipStatus;
  creado_en: string;  // ISO date
  actualizado_en: string; // ISO date
}

export interface FriendRequest {
  id: string;
  usuario_id: string;
  amigo_id: string;
  estado: FriendshipStatus;
  creado_en: string;
  actualizado_en: string;
  // Opcional: datos del usuario relacionado para mostrar en UI
  usuario?: UserProfile;
  amigo?: UserProfile;
}
