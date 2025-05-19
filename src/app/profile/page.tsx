"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";
import ProfileEditor from "../../components/profile/ProfileEditor";
import UserSearch from "../../components/profile/UserSearch";
import FriendsList from "../../components/profile/FriendsList";
import FriendRequests from "../../components/profile/FriendRequests";
import { useFriendship, AcceptedFriend } from "../../hooks/useFriendship";
import type { UserProfile } from "../../types/friendship";
import { getUserActivePlan } from "../../lib/supabase/getUserActivePlan";

// Lista de países priorizados por mercado objetivo y poder adquisitivo
const COUNTRIES = [
  // LATINOAMÉRICA
  "Argentina",
  "Bolivia",
  "Brasil",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Cuba",
  "Ecuador",
  "El Salvador",
  "Guatemala",
  "Honduras",
  "México",
  "Nicaragua",
  "Panamá",
  "Paraguay",
  "Perú",
  "Puerto Rico",
  "República Dominicana",
  "Uruguay",
  "Venezuela",

  // EUROPA OCCIDENTAL Y NÓRDICA (idioma local o inglés)
  "Deutschland (Alemania)",
  "France (Francia)",
  "Italia",
  "España",
  "United Kingdom (Reino Unido)",
  "Suisse (Suiza)",
  "Norge (Noruega)",
  "Sverige (Suecia)",
  "Suomi (Finlandia)",
  "Nederland (Países Bajos)",
  "Danmark (Dinamarca)",
  "Österreich (Austria)",
  "België/Belgique (Bélgica)",
  "Ireland (Irlanda)",
  "Luxembourg (Luxemburgo)",

  // NORTEAMÉRICA Y OCEANÍA
  "United States",
  "Canada",
  "Australia",
  "New Zealand",

  // ASIA Y MEDIO ORIENTE
  "日本 (Japón)",
  "대한민국 (Corea del Sur)",
  "Singapore",
  "Hong Kong",
  "ישראל (Israel)",

  // PAÍSES ÁRABES DE ALTO PODER ADQUISITIVO
  "الإمارات العربية المتحدة (Emiratos Árabes Unidos)",
  "المملكة العربية السعودية (Arabia Saudita)",
  "قطر (Qatar)",

  // Otros relevantes
  "Otro"
];

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    pais: "",
    avatar_url: "",
    bio: "",
  });
  const [activePlan, setActivePlan] = useState<string>("free");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Hooks de afinidad
  const {
    friends,
    pendingReceived,
    pendingSent,
    loading: loadingFriends,
    error: errorFriends,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriendship,
    refetch: refetchFriendship,
  } = useFriendship();

  // Cargar perfil de usuario
  useEffect(() => {
    async function fetchProfile() {
      setLoadingProfile(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      // Obtener plan activo real
      const plan = await getUserActivePlan(user.id);
      setActivePlan(plan);

      const { data, error } = await supabase
        .from("usuarios")
        .select("id, email, nombre, apellido, plan, pais, avatar_url, bio, rol")
        .eq("id", user.id)
        .single();

      if (error) {
        setError("Error al cargar el perfil");
        setLoadingProfile(false);
        return;
      }
      // Mapear manualmente para asegurar compatibilidad con UserProfile
      setProfile({
        id: data.id,
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        plan: data.plan,
        pais: data.pais,
        avatar_url: data.avatar_url,
        bio: data.bio,
        rol: data.rol,
      });
      setFormData({
        nombre: data.nombre || "",
        apellido: data.apellido || "",
        pais: data.pais || "",
        avatar_url: data.avatar_url || "",
        bio: data.bio || "",
      });
      setLoadingProfile(false);
    }
    fetchProfile();
  }, [router]);

  function handleInputChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleAvatarUpload(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0 || !profile) {
      return;
    }
    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${profile.id}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    setUploading(true);
    setError(null);

    // Subir imagen a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("capsules")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError("Error al subir la imagen");
      setUploading(false);
      return;
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from("capsules")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
      setError("Error al obtener la URL de la imagen");
      setUploading(false);
      return;
    }

    setFormData((prev) => ({ ...prev, avatar_url: publicUrl }));
    setUploading(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoadingProfile(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const updates = {
      id: user.id,
      email: user.email,
      nombre: formData.nombre,
      apellido: formData.apellido,
      pais: formData.pais,
      avatar_url: formData.avatar_url,
      bio: formData.bio,
    };

    const { error: updateError } = await supabase.from("usuarios").upsert(updates, { onConflict: "id" });

    if (updateError) {
      setError("Error al actualizar el perfil");
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(false);
    router.push("/dashboard");
  }

  // IDs a excluir en búsqueda: usuario actual, amigos, solicitudes pendientes
  const excludeIds = [
    profile?.id,
    ...friends.map((f) => f.amigo.id),
    ...pendingReceived.map((r) => r.usuario?.id),
    ...pendingSent.map((r) => r.amigo?.id),
  ].filter(Boolean) as string[];

  if (loadingProfile) {
    return <div className="p-4">Cargando perfil...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <ProfileEditor
        profile={profile}
        formData={formData}
        loading={loadingProfile}
        uploading={uploading}
        error={error}
        countries={COUNTRIES}
        activePlan={activePlan}
        onInputChange={handleInputChange}
        onAvatarUpload={handleAvatarUpload}
        onSubmit={handleSubmit}
        onBack={() => router.push("/dashboard")}
        onUpgradePlan={() => router.push("/planes")}
      />
      <hr className="my-8" />
      <UserSearch
        excludeIds={excludeIds}
        onSendRequest={async (userId) => {
          await sendFriendRequest(userId);
          refetchFriendship();
        }}
        countries={COUNTRIES}
      />
      <FriendRequests
        received={pendingReceived}
        sent={pendingSent}
        onAccept={async (requestId) => {
          await acceptFriendRequest(requestId);
          refetchFriendship();
        }}
        onReject={async (requestId) => {
          await rejectFriendRequest(requestId);
          refetchFriendship();
        }}
        onCancel={async (requestId) => {
          await removeFriendship(requestId);
          refetchFriendship();
        }}
      />
      <FriendsList
        friends={friends}
        onRemove={async (amistadId) => {
          await removeFriendship(amistadId);
          refetchFriendship();
        }}
      />
      {(loadingFriends || errorFriends) && (
        <div className="mt-4 text-sm text-gray-500">
          {loadingFriends ? "Cargando afinidad..." : errorFriends}
        </div>
      )}
    </div>
  );
}
