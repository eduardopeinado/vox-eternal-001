"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useTour } from '@reactour/tour';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import FabButton from '@/components/dashboard/fab-button';
import dynamic from 'next/dynamic';
const CreateCapsuleModal = dynamic(() => import('@/components/dashboard/create-capsule-modal'), { ssr: false });
import OnboardingTour from 'src/components/OnboardingTour';
import CapsuleList from '@/components/dashboard/capsule-list';
import CapsuleCard from '@/components/dashboard/capsule-card';
import CapsulesModal from '@/components/dashboard/capsules-modal';
import MessagesSection from '@/components/dashboard/messages-section';
import FavoritesList from '@/components/dashboard/favorites-list'; // Import FavoritesList
import FavoritesSlider from '@/components/dashboard/favorites-slider';
import AddFavoriteButton from '@/components/dashboard/add-favorite-button'; // Import AddFavoriteButton
import AddFavoriteModal from '@/components/dashboard/add-favorite-modal';
import RecordingModal from '@/components/dashboard/recording-modal';
import FutureRemindersList from '@/components/dashboard/future-reminders-list'; // Import the new list component
import { LogOut, User as UserIcon, Plus, ImageIcon, Loader2, Mic, Video, CalendarDays } from 'lucide-react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getStoragePublicUrl } from "@/lib/supabase/client";
import { toast } from 'sonner';
import { format } from 'date-fns'; // Import format for default title
import { es } from 'date-fns/locale'; // Import locale if needed for format
import { useSubscription } from "@/hooks/useSubscription";
import { getUserActivePlan } from "@/lib/supabase/getUserActivePlan";

// Define the type for capsule data directly here
export type CapsulaData = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  fecha_creacion: string;
  portada_url: string | null;
  usuario_id: string; // Owner ID
  contadores: {
    foto_count: number;
    audio_count: number;
    video_count: number;
  };
  anclada: boolean;
  is_owner: boolean; // Flag if current user owns this capsule
  primer_video_url?: string | null; // Add field for first video URL
};

function DashboardSuccessToast() {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get('success') === '1') {
      // Usar toast para mostrar el mensaje solo una vez
      toast.success('¡Gracias por tu compra! Tu plan premium ya está activo.');
      // Opcional: limpiar el parámetro de la URL para evitar mostrarlo de nuevo al refrescar
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('success');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams]);
  return null;
}

// --- TOUR STEPS ---
import type { StepType } from '@reactour/tour';

const steps: StepType[] = [
  {
    selector: 'body',
    content: (
      <>
        <strong>Bienvenido a Vox-Eternal 🙌</strong>
        <br />
        Aquí podrás guardar y revivir tus recuerdos más valiosos.
        Te mostraré lo esencial en menos de un minuto.
      </>
    ),
  },
  {
    selector: '.capsules-section',
    content: (
      <>
        <strong>Tus cápsulas</strong>
        <br />
        Desde aquí puedes ver y gestionar todas tus cápsulas.
        Pulsa el botón <strong>+ Nueva</strong> para subir fotos, videos o audios y
        comenzar una cápsula del tiempo.
      </>
    ),
    action: () => {
      document
        .querySelector('.capsules-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  },
  {
    selector: '[data-tour="fab-capsule-btn"]',
    content: (
      <>
        <strong>Crear en cualquier momento</strong>
        <br />
        También puedes usar este botón flotante <strong>(+)</strong>
        para iniciar la creación de cápsulas desde cualquier parte del Dashboard.
      </>
    ),
  },
  {
    selector: '.favorites-carousel',
    content: (
      <>
        <strong>Audios & Videos favoritos</strong>
        <br />
        Tus recuerdos preferidos siempre a mano.
        Reprodúcelos al instante para revivir tus momentos favoritos.
      </>
    ),
  },
  {
    selector: '.reminders-section',
    content: (
      <>
        <strong>Recordatorios futuros</strong>
        <br />
        Programa el envío digital de tus cápsulas y recuerdos al futuro.
        Aquí también verás todas las fechas y alertas que tienes agendadas.
      </>
    ),
  },
  {
    selector: '.notifications-section',
    content: (
      <>
        <strong>Notificaciones y cápsulas ocultas</strong>
        <br />
        En esta sección recibirás avisos importantes y podrás acceder a
        las cápsulas que mantienes privadas.
      </>
    ),
  },
  {
    selector: '[data-tour="profile-btn"]',
    content: (
      <>
        <strong>Completa tu perfil</strong>
        <br />
        Aquí puedes añadir tu Nombre, Apellido, Avatar, país y revisar tu plan de suscripción.
      </>
    ),
  },
  {
    selector: 'body',
    content: (
      <>
        <strong>¡Eso es todo!</strong>
        <br />
        Gracias por recorrer Vox-Eternal. Si quieres volver a ver esta guía,
        ve a <strong>Perfil → Tour de la página</strong>.
      </>
    ),
  },
];

// --- Joyride callback ---

const DashboardPage = () => {
  const router = useRouter();

  // Estado de usuario autenticado
  const [user, setUser] = useState<User | null>(null);

  // Estado para el perfil extendido
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [showTour, setShowTour] = useState(false);

  // Escuchar evento para cerrar el onboarding tour desde Joyride callback
  React.useEffect(() => {
  }, []);

  // Fetch del perfil extendido cuando user esté disponible
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setShowOnboarding(null);
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    supabase
      .from("usuarios")
      .select("id, email, nombre, apellido, show_onboarding, rol, avatar_url, bio, plan, pais")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        setProfile(data);
        setShowOnboarding(data?.show_onboarding ?? false);
        setLoadingProfile(false);
      });
  }, [user]);

  // Si quieres restaurar la lógica original de localStorage, puedes hacerlo aquí si es necesario.

  const handleCloseOnboarding = useCallback(() => {
    setShowOnboarding(false);
    setShowTour(true);
  }, []);

  const handleFinishTour = useCallback(() => {
    setShowTour(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboardingSeen', 'true');
    }
  }, []);
  const [loadingUser, setLoadingUser] = useState(true);
  const { subscription, loading: loadingSubscription } = useSubscription(user?.id ?? null);

  const [planActivo, setPlanActivo] = useState<string>("free");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Estado para el contador de mejoras IA usadas
  const [mejorasIaUsadas, setMejorasIaUsadas] = useState<number | null>(null);

  // Obtener el plan activo del usuario autenticado
  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) {
        setPlanActivo("free");
        return;
      }
      const plan = await getUserActivePlan(user.id);
      setPlanActivo(plan || "free");
    };
    fetchPlan();
  }, [user, refreshTrigger]);
  
  // Consulta el contador de mejoras IA usadas por el usuario
  useEffect(() => {
    const fetchMejorasIaUsadas = async () => {
      if (!user) {
        setMejorasIaUsadas(null);
        return;
      }
      // Consulta robusta: cuenta mejoras IA del usuario en mejoras_ia_log (solo aceptadas)
      const { count, error } = await supabase
        .from('mejoras_ia_log')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .in('resultado', ['aceptada', null]); // Solo mejoras aceptadas o sin resultado explícito

      if (error) {
        setMejorasIaUsadas(null);
        return;
      }
      setMejorasIaUsadas(count ?? 0);

      // Alternativa: contar recuerdos mejorados por IA (si se prefiere por recuerdos únicos)
      // const { count: countRecuerdos, error: errorRecuerdos } = await supabase
      //   .from('recuerdos')
      //   .select('id', { count: 'exact', head: true })
      //   .eq('usuario_id', user.id)
      //   .eq('mejorado_por_ia', true);
      // if (!errorRecuerdos) setMejorasIaUsadas(countRecuerdos ?? 0);
    };
    fetchMejorasIaUsadas();
  }, [user, refreshTrigger]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreateCapsuleModalOpen, setIsCreateCapsuleModalOpen] = useState(false);
  const [filesForNewCapsule, setFilesForNewCapsule] = useState<File[]>([]);
  const [capsuleModalKey, setCapsuleModalKey] = useState<number>(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [visibleCapsules, setVisibleCapsules] = useState<CapsulaData[]>([]);
  const [hiddenCapsules, setHiddenCapsules] = useState<CapsulaData[]>([]);
  const [capsulesLoading, setCapsulesLoading] = useState(true);
  // State for Favorites Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordType, setRecordType] = useState<'audio' | 'video' | null>(null);
  const [favoritesRefreshKey, setFavoritesRefreshKey] = useState(0); // Key to refresh favorites list
  const [isCapsulesModalOpen, setIsCapsulesModalOpen] = useState(false);

  // console.log('[DashboardPage] Renderizando, isUploading:', isUploading); // Removed DEBUG log

  // --- Auth Effect ---
  useEffect(() => {
    // console.log('[DashboardPage] Suscribiéndose a onAuthStateChange...'); // Removed log
    setLoadingUser(true);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        // console.log('[DashboardPage] onAuthStateChange event:', event, 'Session:', session); // Removed log
        const currentUser = session?.user ?? null;
        setUser(currentUser); // Store the whole user object

        if (event === 'SIGNED_OUT') {
          // console.log('[DashboardPage] SIGNED_OUT, redirigiendo...'); // Removed log
          router.push('/login');
        } else if (currentUser && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
          // console.log('[DashboardPage] User session loaded/signed in.'); // Removed log
          setLoadingUser(false);
        } else if (!currentUser && event === 'INITIAL_SESSION') {
           // console.log('[DashboardPage] No initial session, redirecting...'); // Removed log
           setLoadingUser(false); // Stop loading
           router.push('/login'); // Redirect if no user on initial load
        }
      }
    );

    return () => {
      // console.log('[DashboardPage] Desuscribiéndose de onAuthStateChange.'); // Removed log
      authListener?.subscription.unsubscribe();
    };
  }, [router]);
  // --- End Auth Effect ---

  // --- Capsule Data Loading Effect ---
  useEffect(() => {
    const fetchCapsuleData = async () => {
      if (!user) {
        // console.log("[DashboardPage] No user, skipping capsule fetch."); // Removed log
        setCapsulesLoading(false); // Stop loading if no user
        setVisibleCapsules([]);
        setHiddenCapsules([]);
        return;
      }

      // console.log("[DashboardPage] Iniciando fetchCapsuleData for user:", user.id); // Removed log
      setCapsulesLoading(true);
      setVisibleCapsules([]); // Clear previous data
      setHiddenCapsules([]); // Clear previous data

      try {
        const userId = user.id;

        // 1. Fetch contributions (all, visible and hidden)
        const { data: contributorData, error: contributorError } = await supabase
          .from('capsule_contributors')
          .select('capsule_id, is_visible')
          .eq('user_id', userId);

        if (contributorError) throw contributorError;
        // console.log("[DashboardPage] Contributor data fetched:", contributorData); // Removed log

        const contributorMap = new Map<string, { is_visible: boolean }>();
        const contributedCapsuleIds = contributorData?.map(c => {
          contributorMap.set(c.capsule_id, { is_visible: c.is_visible });
          return c.capsule_id;
        }) || [];
        // console.log("[DashboardPage] Contributed capsule IDs:", contributedCapsuleIds); // Removed log

        // 2. Fetch owned capsule IDs (for building the OR query)
        const { data: ownedCapsuleIdsData, error: ownedIdsError } = await supabase
          .from('capsulas')
          .select('id')
          .eq('usuario_id', userId);

        if (ownedIdsError) throw ownedIdsError;
        const ownedCapsuleIds = ownedCapsuleIdsData?.map(c => c.id) || [];
        // console.log("[DashboardPage] Owned capsule IDs:", ownedCapsuleIds); // Removed log

        // Combine unique IDs
        const allRelevantCapsuleIds = Array.from(new Set([...ownedCapsuleIds, ...contributedCapsuleIds]));
        // console.log("[DashboardPage] All relevant capsule IDs:", allRelevantCapsuleIds); // Removed log

        if (allRelevantCapsuleIds.length === 0) {
          // console.log("[DashboardPage] No relevant capsules found."); // Removed log
          setCapsulesLoading(false);
          return; // No need to fetch details or counts
        }

        // 3. Fetch details for all relevant capsules
        const { data: capsulasData, error: capsulasError } = await supabase
          .from('capsulas')
          .select('id, titulo, descripcion, fecha_creacion, portada_url, anclada, usuario_id')
          .in('id', allRelevantCapsuleIds);

        if (capsulasError) throw capsulasError;
        // console.log("[DashboardPage] Capsule details fetched:", capsulasData); // Removed log

        // 4. Fetch recuerdo counts directly for all relevant capsules
        const { data: recuerdoCountsData, error: recuerdoCountsError } = await supabase
          .from('recuerdos')
          .select('capsula_id, tipo', { count: 'exact' }) // Select tipo to count by type
          .in('capsula_id', allRelevantCapsuleIds);

        if (recuerdoCountsError) {
          console.warn('[DashboardPage] Error fetching recuerdo counts directly:', recuerdoCountsError);
          // Continue with potentially inaccurate counts (all zero) if this fails
        }
        // console.log("[DashboardPage] Direct recuerdo counts fetched:", recuerdoCountsData); // Removed log

        // Process the counts data
        const countsMap = new Map<string, { foto_count: number; audio_count: number; video_count: number }>();
        // Initialize counts for all capsules to 0
        allRelevantCapsuleIds.forEach(id => {
          countsMap.set(id, { foto_count: 0, audio_count: 0, video_count: 0 });
        });
        // Aggregate counts from the fetched data
        recuerdoCountsData?.forEach(recuerdo => {
          const currentCounts = countsMap.get(recuerdo.capsula_id);
          if (currentCounts) {
            if (recuerdo.tipo === 'foto') currentCounts.foto_count++;
            else if (recuerdo.tipo === 'audio') currentCounts.audio_count++;
            else if (recuerdo.tipo === 'video') currentCounts.video_count++;
          }
        });
        // console.log("[DashboardPage] Processed countsMap:", countsMap); // Removed log


        // 5. Identify capsules needing video thumbnail
        // 5. Identify capsules needing video thumbnail
        const capsuleIdsNeedingVideoThumb = capsulasData
          ?.filter(capsula => !capsula.portada_url && (countsMap.get(capsula.id)?.video_count ?? 0) > 0)
           .map(capsula => capsula.id) || [];
        // console.log('[DEBUG Dashboard] Capsule IDs needing video thumb:', capsuleIdsNeedingVideoThumb); // REMOVED DEBUG LOG 1

         // 6. Fetch first video URL for those capsules if any
        const primerVideoUrlMap = new Map<string, string>();
        if (capsuleIdsNeedingVideoThumb.length > 0) {
          const { data: videoRecuerdos, error: videoRecuerdosError } = await supabase
            .from('recuerdos')
            .select('capsula_id, url_archivo')
            .in('capsula_id', capsuleIdsNeedingVideoThumb)
            .eq('tipo', 'video')
            .order('fecha_real', { ascending: true }); // CORRECTED AGAIN: Use 'fecha_real' for ordering

          if (videoRecuerdosError) {
            console.warn('[DashboardPage] Error fetching video recuerdos for thumbnails:', videoRecuerdosError);
            // Continue without video thumbnails if this fails
          } else {
            // Process to get only the first video per capsule
            videoRecuerdos?.forEach(recuerdo => {
              if (!primerVideoUrlMap.has(recuerdo.capsula_id)) {
                  primerVideoUrlMap.set(recuerdo.capsula_id, recuerdo.url_archivo);
                }
              });
             // console.log('[DEBUG Dashboard] Raw video recuerdos fetched:', videoRecuerdos); // REMOVED DEBUG LOG 2
             // console.log('[DEBUG Dashboard] Final primerVideoUrlMap:', primerVideoUrlMap); // REMOVED DEBUG LOG 3
            }
          }

        // 7. Combine and filter data
        const finalVisibleCapsules: CapsulaData[] = [];
        const finalHiddenCapsules: CapsulaData[] = [];

        capsulasData?.forEach(capsula => {
          const isOwner = capsula.usuario_id === userId;
          const contributorInfo = contributorMap.get(capsula.id);
          const counts = countsMap.get(capsula.id) || { foto_count: 0, audio_count: 0, video_count: 0 };
          const primerVideoUrl = primerVideoUrlMap.get(capsula.id) || null; // Get from map

          const capsuleEntry: CapsulaData = {
            ...capsula,
            is_owner: isOwner,
            contadores: counts,
             primer_video_url: primerVideoUrl, // Add the video URL
            };
           // REMOVED DEBUG LOG 4
           // console.log(`[DEBUG Dashboard] Processing Capsule Entry for List - ID: ${capsula.id}`, { ... });

           if (isOwner) {
             finalVisibleCapsules.push(capsuleEntry); // Owned are always visible in main list
          } else if (contributorInfo) {
            if (contributorInfo.is_visible) {
              finalVisibleCapsules.push(capsuleEntry); // Contributed and visible
            } else {
              finalHiddenCapsules.push(capsuleEntry); // Contributed and hidden
            }
          }
        });

        // console.log("[DashboardPage] Final Visible Capsules:", finalVisibleCapsules); // Removed log
        // console.log("[DashboardPage] Final Hidden Capsules:", finalHiddenCapsules); // Removed log

        setVisibleCapsules(finalVisibleCapsules);
        setHiddenCapsules(finalHiddenCapsules);

      } catch (error: any) {
        console.error('[DashboardPage] Error fetching capsule data:', error);
        toast.error(`Error al cargar cápsulas: ${error.message}`);
        // Optionally set an error state here
      } finally {
        setCapsulesLoading(false);
        // console.log("[DashboardPage] fetchCapsuleData finalizado."); // Removed log
      }
    };

    fetchCapsuleData();
  }, [user, refreshTrigger]); // Depend on user and refreshTrigger
  // --- End Capsule Data Loading Effect ---

  // --- Modal Handlers ---
  const openAddModal = useCallback(() => setIsAddModalOpen(true), []);
  const closeAddModal = useCallback(() => setIsAddModalOpen(false), []);
  const openRecordModal = useCallback((type: 'audio' | 'video') => {
      setRecordType(type);
      setIsRecordModalOpen(true);
  }, []);
  const closeRecordModal = useCallback(() => {
      setIsRecordModalOpen(false);
      setRecordType(null);
  }, []);
  const handleFavoriteAdded = useCallback(() => {
    setFavoritesRefreshKey(prevKey => prevKey + 1); // Increment key to force re-render/re-fetch in FavoritesList
  }, []);
  // --- End Modal Handlers ---


  const handleLogout = async () => {
    // console.log('[DashboardPage] Iniciando Logout...'); // Removed log
    try {
      await supabase.auth.signOut();
      // No need to push here, onAuthStateChange will handle it
      // console.log('[DashboardPage] Logout iniciado.'); // Removed log
    } catch (err) {
      console.error('Error inesperado al cerrar sesión:', err);
      toast.error('Ocurrió un error inesperado al cerrar sesión.');
    }
  };

  const refreshDashboardData = () => {
    // console.log("[DashboardPage] Refrescando datos del dashboard..."); // Removed log
    setRefreshTrigger(prev => prev + 1); // Incrementa para forzar la recarga de datos
  };
  
  // --- Action Handlers (Passed down to children) ---
  const handleCapsuleClick = (capsuleId: string) => {
    // console.log(`[DashboardPage] Navegando a detalles de cápsula: ${capsuleId}`); // Removed log
    router.push(`/dashboard/capsule/${capsuleId}`);
  };

  const handlePinCapsule = async (capsuleId: string) => {
    // console.log(`[DashboardPage] Anclando/desanclando cápsula: ${capsuleId}`); // Removed log
    try {
      const { data: capsula, error: fetchError } = await supabase
        .from('capsulas')
        .select('anclada') // Only need 'anclada'
        .eq('id', capsuleId)
        .single();

      if (fetchError) throw fetchError;
      if (!capsula) throw new Error("Cápsula no encontrada.");

      const nuevoEstadoAnclada = !capsula.anclada;

      const { error: updateError } = await supabase
        .from('capsulas')
        .update({ anclada: nuevoEstadoAnclada })
        .eq('id', capsuleId);

      if (updateError) throw updateError;

      toast.success(nuevoEstadoAnclada ? "Cápsula anclada." : "Cápsula desanclada.");
      refreshDashboardData(); // Refresh data to reflect pinning change

    } catch (error: any) {
      console.error('Error al anclar/desanclar cápsula:', error);
      // Avoid using 'capsula' here as it might be undefined if fetchError occurred
      toast.error(`Error al anclar/desanclar: ${error.message}`);
    }
  };

  const handleShareCapsule = (capsuleId: string) => {
    // console.log(`[DashboardPage] Compartir cápsula: ${capsuleId}`); // Removed log
    // This function might now just open the modal, passing the ID
    // The actual sharing logic would be within the ShareModal component
    // For now, keep the alert or implement modal opening if ShareModal is ready
    toast.info(`Compartir cápsula ${capsuleId} (funcionalidad próximamente)`);
  };

  const handleDeleteCapsule = async (capsuleId: string) => {
    // console.log(`[handleDeleteCapsule] Intento de eliminación para ID: ${capsuleId}`); // Removed log
    // Ensure user is available from state
    if (!user) {
        toast.error("Usuario no autenticado.");
        return;
    }
    const userId = user.id;

    try {
      // 0. Verify Ownership (already done implicitly if called from owned list, but good practice)
       const { data: capsuleOwnerData, error: ownerCheckError } = await supabase
        .from('capsulas')
        .select('usuario_id') // Select owner ID
        .eq('id', capsuleId)
        .single();

      if (ownerCheckError) throw new Error(`Error al verificar propietario: ${ownerCheckError.message}`);
      // Ensure the current user is the owner before proceeding
      if (!capsuleOwnerData || capsuleOwnerData.usuario_id !== userId) {
        toast.error("No tienes permiso para eliminar esta cápsula.");
        console.warn(`[handleDeleteCapsule] Attempt failed: User ${userId} is not owner of ${capsuleId}.`);
        return;
      }
      // console.log(`[handleDeleteCapsule] Ownership verified for ${capsuleId}.`); // Removed log

      // Confirmation dialog
      if (!window.confirm('¿Estás seguro que deseas eliminar esta cápsula y todos sus recuerdos? Esta acción no se puede deshacer y afectará a todos los colaboradores.')) {
        // console.log(`[handleDeleteCapsule] Deletion cancelled by user.`); // Removed log
        return;
      }
      // console.log(`[handleDeleteCapsule] Deletion confirmed. Proceeding for ID: ${capsuleId}`); // Removed log

      // Call the backend function/RPC to handle deletion (recommended for complex cleanup)
      // For now, keeping the client-side logic, but consider moving this to a Supabase Function
      // TODO: Refactor deletion logic into a Supabase Edge Function for atomicity and security.

      // 1. Get associated file paths
      const { data: recuerdos, error: fetchRecuerdosError } = await supabase
        .from('recuerdos')
        .select('url_archivo')
        .eq('capsula_id', capsuleId);
      if (fetchRecuerdosError) throw new Error(`Error fetching recuerdos: ${fetchRecuerdosError.message}`);
      const filePathsToDelete = recuerdos?.map(r => r.url_archivo).filter((p): p is string => !!p);

      // 2. Delete files from Storage
      if (filePathsToDelete && filePathsToDelete.length > 0) {
        // console.log(`[handleDeleteCapsule] Deleting ${filePathsToDelete.length} files from storage...`); // Removed log
        const { error: storageError } = await supabase.storage.from('capsules').remove(filePathsToDelete);
        if (storageError) throw new Error(`Error deleting storage files: ${storageError.message}`);
        // console.log(`[handleDeleteCapsule] Storage files deleted.`); // Removed log
      } else {
        // console.log('[handleDeleteCapsule] No storage files to delete.'); // Removed log
      }

      // 3. Delete related records (contributors, recuerdos) - Order might matter depending on FK constraints
       // console.log(`[handleDeleteCapsule] Deleting contributors for capsule ${capsuleId}...`); // Removed log
       const { error: contributorsDbError } = await supabase.from('capsule_contributors').delete().eq('capsula_id', capsuleId);
       if (contributorsDbError) console.warn(`[handleDeleteCapsule] Warn deleting contributors:`, contributorsDbError); // Log warning, continue
       // else console.log(`[handleDeleteCapsule] Contributors deleted.`); // Removed log

       // console.log(`[handleDeleteCapsule] Deleting recuerdos for capsule ${capsuleId}...`); // Removed log
       const { error: recuerdosDbError } = await supabase.from('recuerdos').delete().eq('capsula_id', capsuleId);
       if (recuerdosDbError) throw new Error(`Error deleting recuerdos: ${recuerdosDbError.message}`);
       // console.log(`[handleDeleteCapsule] Recuerdos deleted.`); // Removed log

      // 4. Delete the capsule itself
      // console.log(`[handleDeleteCapsule] Deleting capsule ${capsuleId}...`); // Removed log
      const { error: capsulaDbError } = await supabase.from('capsulas').delete().eq('id', capsuleId);
      if (capsulaDbError) throw new Error(`Error deleting capsule: ${capsulaDbError.message}`);
      // console.log(`[handleDeleteCapsule] Capsule deleted.`); // Removed log

      // 5. Refresh and notify
      toast.success('Cápsula eliminada correctamente.');
      refreshDashboardData(); // Refresca la lista de cápsulas
      setFavoritesRefreshKey(prevKey => prevKey + 1); // Refresca la lista de favoritos
      // console.log('[handleDeleteCapsule] Deletion process completed.'); // Removed log

    } catch (error: any) {
      console.error('[handleDeleteCapsule] Error during deletion process:', error);
      toast.error(`Error al eliminar: ${error.message || 'Error desconocido'}`);
      // Siempre refresca la lista aunque haya error para evitar cápsulas fantasma
      refreshDashboardData();
    }
  };

  // --- Handler for updating capsule details from CapsuleCard ---
  const handleUpdateCapsuleDetails = async (
    capsuleId: string,
    updates: { titulo?: string; descripcion?: string | null }
  ) => {
    // console.log(`[DashboardPage] Updating details for capsule ${capsuleId}:`, updates); // Removed log
    try {
      // Add ownership check before allowing update? Or rely on RLS?
      // Assuming RLS handles this for now.
      const { error } = await supabase
        .from('capsulas')
        .update(updates)
        .eq('id', capsuleId);

      if (error) throw error;

      toast.success("Detalles de la cápsula actualizados.");
      refreshDashboardData();

    } catch (error: any) {
      console.error('Error updating capsule details:', error);
      toast.error(`Error al actualizar: ${error.message}`);
      throw error; // Re-throw for potential handling in CapsuleCard
    }
  };
  // --- End handler ---

  // --- Drag and Drop / File Input Logic (Simplified for brevity) ---
  // Assuming handleCreateCapsuleWithFiles exists and works
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => { event.preventDefault(); if (!isUploading) setIsDraggingOver(true); };
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDraggingOver(false); };
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    if (isUploading) return;
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      // Validar archivos antes de abrir el modal
      const { filterValidCapsuleFiles } = require('@/lib/utils');
      const { validFiles, errors } = filterValidCapsuleFiles(
        Array.from(event.dataTransfer.files),
        []
      );
      if (errors.length > 0) {
        errors.forEach(({ file, reason }: { file: File; reason: string }) => {
          toast.error(`${file.name}: ${reason}`);
        });
      }
      if (validFiles.length > 0) {
        setFilesForNewCapsule(validFiles);
        setIsCreateCapsuleModalOpen(true);
      }
      event.dataTransfer.clearData();
    }
  };
  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Validar archivos antes de abrir el modal
      const { filterValidCapsuleFiles } = require('@/lib/utils');
      const { validFiles, errors } = filterValidCapsuleFiles(
        Array.from(files),
        []
      );
      if (errors.length > 0) {
        errors.forEach(({ file, reason }: { file: File; reason: string }) => {
          toast.error(`${file.name}: ${reason}`);
        });
      }
      if (validFiles.length > 0) {
        setFilesForNewCapsule(validFiles);
        setIsCreateCapsuleModalOpen(true);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
  };


  // --- Loading State ---
  if (loadingUser) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-blanco-hueso">
        <Loader2 className="w-8 h-8 mr-2 animate-spin text-azul-profundo" />
        <p className="text-azul-profundo">Cargando tu espacio...</p>
      </div>
    );
  }
  // --- End Loading State ---

  return (
    <OnboardingTour
      run={!!showOnboarding}
      steps={steps}
      onFinish={async () => {
        // Persistir preferencia en Supabase y cerrar tour
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
          await supabase
            .from('usuarios')
            .update({ show_onboarding: false })
            .eq('id', user.id);
        }
        setShowOnboarding(false);
      }}
    >
     <div
       className={`flex flex-col min-h-screen bg-blanco-hueso p-4 sm:p-6 lg:p-8 relative transition-colors duration-200 ${isDraggingOver ? 'bg-teal-50' : ''}`}
       onDragOver={handleDragOver}
       onDragLeave={handleDragLeave}
       onDrop={handleDrop}
     >
       <Suspense fallback={null}>
         <DashboardSuccessToast />
       </Suspense>
       {/* Drag Over Lay */}
       {isDraggingOver && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 bg-black/10">
           <div className="bg-white p-6 rounded-lg shadow-xl border border-teal-400">
             <p className="text-teal-600 font-semibold text-lg">Suelta los archivos para crear una nueva cápsula</p>
           </div>
         </div>
       )}
       {/* Uploading Overlay */}
       {isUploading && (
         <div className="absolute inset-0 flex items-center justify-center z-40 bg-white/80 backdrop-blur-sm">
           <div className="flex flex-col items-center p-6 rounded-lg ">
             <Loader2 className="w-12 h-12 mb-4 animate-spin text-azul-profundo" />
             <p className="text-azul-profundo font-semibold">Creando cápsula y subiendo archivos...</p>
           </div>
         </div>
       )}

       {/* Header */}
       <header className="w-full flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
         <div>
           {/*
             Lógica de displayName: usa nombre y apellido si existen, si no el prefijo del email, si no "Invitado"
           */}
           {(() => {
             // Definir displayName antes del render
             // (esto se puede mover fuera del JSX si prefieres)
             // Se usa función IIFE para mantener el scope aquí
             const displayName =
               [profile?.nombre, profile?.apellido].filter(Boolean).join(' ') ||
               user?.email?.split('@')[0] ||
               'Invitado';
             return (
               <h1
                 className="text-2xl sm:text-3xl font-bold font-serif text-azul-profundo"
                 data-tour="dashboard-header"
               >
                 Hola {displayName}
               </h1>
             );
           })()}
           {/* Mostrar plan y estado de suscripción */}
           {!loadingSubscription && (
             <div className="mt-1 text-sm text-gray-600">
               <span className="font-semibold">Plan:</span>{" "}
               {subscription?.plan ?? "Gratis"}{" "}
               <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold
                 ${!subscription || subscription.status === "active" ? "bg-green-100 text-green-700" :
                   subscription.status === "past_due" ? "bg-yellow-100 text-yellow-700" :
                   subscription.status === "canceled" ? "bg-red-100 text-red-700" :
                   "bg-gray-100 text-gray-700"
                 }`}>
                 {subscription?.status ?? "active"}
               </span>
             </div>
           )}
         </div>
         <div className="flex items-center gap-2">
           <button
             onClick={handleLogout}
             className="flex items-center px-4 py-2 rounded-md text-rojo-alerta border border-rojo-alerta bg-transparent hover:bg-rojo-alerta/10 transition-colors text-sm font-medium shadow-sm"
             aria-label="Cerrar sesión"
           >
             <LogOut size={16} className="mr-2" />
             Cerrar Sesión
           </button>
           <button
             onClick={() => router.push('/profile')}
             className="flex items-center p-2 bg-azul-profundo text-blanco-hueso rounded-md hover:bg-opacity-90 transition-colors shadow"
             aria-label="Perfil"
             title="Perfil"
             data-tour="profile-btn"
           >
             <UserIcon size={20} />
           </button>
         </div>
       </header>

       {/* Main Content */}
       <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Left Column (Capsules & Favorites) */}
         <div className="lg:col-span-2 flex flex-col gap-6">
           {/* Capsules Section */}
           <section className="capsules-section bg-white p-4 rounded-lg shadow-sm border border-gray-200">
             <div className="flex justify-between items-center mb-3">
               <h2 className="text-xl font-semibold font-serif text-azul-profundo">Cápsulas</h2>
               <div className="flex gap-2">
                 <button
                   onClick={() => setIsCapsulesModalOpen(true)}
                   className="px-3 py-1 text-sm font-medium text-dorado-claro bg-transparent rounded-md hover:underline"
                   aria-label="Ver todas las cápsulas"
                 >
                   Ver todas
                 </button>
                 <button
                   onClick={() => {
                     setFilesForNewCapsule([]);
                     setCapsuleModalKey(Date.now());
                     setIsCreateCapsuleModalOpen(true);
                   }}
                   disabled={isUploading}
                   id="tour-new-capsule"
                   className={`new-capsule-button flex items-center px-3 py-1 bg-dorado-claro text-azul-profundo rounded-md transition-colors text-sm font-medium shadow ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-90'}`}
                   aria-label="Añadir archivos a nueva cápsula"
                   data-tour="nueva-capsula-btn"
                 >
                   <Plus size={16} className="mr-1" />
                   Nueva
                 </button>
               </div>
             </div>
             {/* Slider horizontal de cápsulas */}
             <div className="overflow-x-auto scrollbar-hide scrollbar-thin scrollbar-thumb-dorado-claro/60 scrollbar-track-transparent">
               <div className="flex gap-6 pb-2" style={{ minHeight: 240 }}>
                 {capsulesLoading ? (
                   <div className="flex items-center justify-center w-full h-32">
                     <Loader2 className="w-8 h-8 animate-spin text-azul-profundo" />
                   </div>
                 ) : visibleCapsules.length === 0 ? (
                   <div className="flex items-center text-gris-calido italic px-2">No tienes cápsulas aún.</div>
                 ) : (
                   visibleCapsules.map((capsula) => (
                     <div
                       key={capsula.id}
                       className="min-w-[320px] max-w-[380px] flex-shrink-0"
                     >
                       <CapsuleCard
                         id={capsula.id}
                         titulo={capsula.titulo}
                         descripcion={capsula.descripcion}
                         fecha_creacion={capsula.fecha_creacion}
                         portada_url={capsula.portada_url}
                         anclada={capsula.anclada}
                         is_owner={capsula.is_owner}
                         contadores={capsula.contadores}
                         onClick={handleCapsuleClick}
                         onPin={handlePinCapsule}
                         onDelete={handleDeleteCapsule}
                         onShare={handleShareCapsule}
                         onUpdateDetails={handleUpdateCapsuleDetails}
                         onHide={refreshDashboardData}
                         primer_video_url={capsula.primer_video_url}
                         variant="slider"
                       />
                     </div>
                   ))
                 )}
               </div>
             </div>
             {/* Modal expandible para ver todas las cápsulas */}
             <CapsulesModal
               capsules={visibleCapsules}
               isOpen={isCapsulesModalOpen}
               onClose={() => setIsCapsulesModalOpen(false)}
               onCapsuleClick={handleCapsuleClick}
               onPinCapsule={handlePinCapsule}
               onDeleteCapsule={handleDeleteCapsule}
               onShareCapsule={handleShareCapsule}
               onUpdateCapsuleDetails={handleUpdateCapsuleDetails}
               onHideCapsule={refreshDashboardData}
             />
           </section>

            {/* Favorites Section - Integrated */}
            <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 favorites-carousel">
               <div className="flex justify-between items-center mb-3">
                 <h2
                 className="text-xl font-semibold font-serif text-azul-profundo"
                 data-tour="favoritos-section"
               >
                 Audios & Videos Favoritos
               </h2>
                 {/* Action Buttons */}
                 <div className="flex justify-end space-x-2">
                    <button
                       onClick={() => openRecordModal('audio')}
                       className="inline-flex items-center justify-center rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white shadow transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-700 disabled:pointer-events-none disabled:opacity-50"
                       title="Grabar Audio"
                       disabled={!subscription || subscription.plan === "Gratis"}
                       data-tour="grabar-audio-btn"
                    >
                        <Mic className="h-4 w-4" />
                    </button>
                     <button
                       onClick={() => openRecordModal('video')}
                       className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white shadow transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-700 disabled:pointer-events-none disabled:opacity-50"
                       title="Grabar Video"
                       disabled={!subscription || subscription.plan === "Gratis"}
                       data-tour="grabar-video-btn"
                    >
                        <Video className="h-4 w-4" />
                    </button>
                    {/* Use AddFavoriteButton component, passing the handler */}
                    <AddFavoriteButton onOpenModal={openAddModal} />
                 </div>
               </div>
               {/* Render Favorites Slider: SIEMPRE visible para todos los usuarios */}
               <FavoritesSlider />
            </section>
          </div>

         {/* Right Column (Reminders & Messages) */}
         <div className="lg:col-span-1 flex flex-col h-full gap-6 min-h-0">
           {/* Reminders Section */}
           <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 min-h-[320px] max-h-[420px] flex flex-col reminders-section">
             <div className="flex justify-between items-center mb-3">
                 <h2
                   className="text-xl font-semibold font-serif text-azul-profundo"
                   data-tour="recordatorios-section"
                 >
                   Recordatorios Futuros
                 </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push('/dashboard/reminders')}
                    className="px-2 py-1 text-xs font-medium text-dorado-claro bg-transparent rounded-md hover:underline"
                    aria-label="Ver todos los recordatorios"
                  >
                    Ver todos
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/reminders/new')}
                    className="flex items-center px-2 py-1 rounded-md border border-teal-400 bg-teal-400 text-white text-xs font-medium shadow hover:bg-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition-colors"
                    aria-label="Crear recordatorio"
                    title="Crear recordatorio"
                    style={{
                      fontWeight: 600,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                      minWidth: 0,
                    }}
                  >
                    <CalendarDays className="h-6 w-6 mr-1" strokeWidth={2.3} />
                    <span className="text-[11px] font-semibold">Crear recordatorio</span>
                  </button>
                </div>
             </div>
             {/* Scroll vertical interno */}
             <div className="flex-1 overflow-y-auto">
               <FutureRemindersList />
             </div>
           </section>

           {/* Messages Section */}
           <div className="flex-1 min-h-0 flex flex-col notifications-section">
             <MessagesSection
               hiddenCapsules={hiddenCapsules}
               isLoading={capsulesLoading}
               onCapsuleUnhidden={refreshDashboardData}
               onCapsuleClick={handleCapsuleClick}
             />
           </div>
         </div>
       </main>

       {/* Hidden File Input */}
       <input
         type="file"
         ref={fileInputRef}
         onChange={handleFileSelected}
         className="hidden"
         accept="image/*,video/*,audio/*,audio/m4a,.m4a"
         multiple
       />

       {/* FAB Button */}
       <FabButton onClick={() => {
         setFilesForNewCapsule([]);
         fileInputRef.current?.click();
       }} disabled={isUploading} />

{/* Onboarding Tour */}
       {/* Render Modals */}
       <CreateCapsuleModal
         key={capsuleModalKey}
         isOpen={isCreateCapsuleModalOpen}
         onClose={() => {
           setIsCreateCapsuleModalOpen(false);
           setFilesForNewCapsule([]);
           setCapsuleModalKey(Date.now());
         }}
         onCapsuleCreated={refreshDashboardData}
         initialFiles={filesForNewCapsule}
         plan={
           ["Gratis", "Básico", "Premium", "Vitalicio"].includes(planActivo)
             ? (planActivo as import('@/lib/planFeatures').PlanName)
             : "Gratis"
         }
         mejorasIaUsadas={mejorasIaUsadas}
       />
       <AddFavoriteModal
         isOpen={isAddModalOpen}
         onClose={closeAddModal}
         onFavoriteAdded={handleFavoriteAdded}
       />
       <RecordingModal
         isOpen={isRecordModalOpen}
         recordType={recordType}
         onClose={closeRecordModal}
         onRecordingComplete={handleFavoriteAdded}
       />
      {/* Dashboard Tour */}
      {/* <DashboardTour /> */}
    </div>
    </OnboardingTour>
  );
};

export default DashboardPage;
