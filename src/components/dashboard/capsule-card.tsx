'use client';

import React, { useState, useMemo } from 'react'; // Import useState and useMemo
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, FileImage, FileAudio, FileVideo, Pencil, Trash2, Share2, Pin, Check, X, EyeOff, Eye } from 'lucide-react'; // Import Eye icon
import { supabase, getStoragePublicUrl } from '@/lib/supabase/client';
import { toast } from 'sonner'; // Import toast for notifications

export interface CapsuleCardProps {
  id: string;
  titulo: string;
  descripcion?: string | null; // Add description
  fecha_creacion: string;
  portada_url?: string | null;
  anclada?: boolean;
  is_owner: boolean; // Added ownership flag
  contadores: {
    foto_count: number; // Use new names
    audio_count: number;
    video_count: number;
  };
  onClick: (id: string) => void;
  onPin?: (id: string) => void; // Renamed from onEdit
  onDelete?: (id: string) => void;
  onShare?: (id: string, title: string) => void;
  onUpdateDetails?: (id: string, updates: { titulo?: string; descripcion?: string | null }) => Promise<void>;
  onHide?: () => void; // Simplified: Just trigger refresh
  onUnhide?: (id: string) => Promise<void>; // Unhide handler still needs ID
  isHiddenList?: boolean; // Context flag
  primer_video_url?: string | null; // Add prop for first video URL
  variant?: "slider" | "default";
}

const CapsuleCard: React.FC<CapsuleCardProps> = ({
  id,
  titulo,
  fecha_creacion,
  portada_url,
  anclada = false,
  contadores,
  descripcion, // Destructure description
  onClick,
  onPin, // Use renamed prop
  onDelete,
  onShare,
  onUpdateDetails,
  is_owner,
  onHide,
  onUnhide, // Destructure unhide handler
  isHiddenList = false, // Default to false
  primer_video_url, // Destructure the new prop
  variant = "default",
}) => {
  const [isEditing, setIsEditing] = useState<'titulo' | 'descripcion' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [portadaCargada, setPortadaCargada] = useState(true); // State for image loading status

  const handleAction = (
    e: React.MouseEvent,
    // Update the type here to accept either signature
    action: ((id: string) => void) | ((id: string, title: string) => void) | undefined,
    actionName: string
  ) => {
    e.stopPropagation(); // Prevent card click when clicking an action button
    if (action) {
      // Special case for share to pass title as well
      if (actionName === 'compartir') {
        (action as (id: string, title: string) => void)(id, titulo); // Call with id and title
      } else {
        (action as (id: string) => void)(id); // Call other actions with just id
      }
    } else {
      console.log(`Acción ${actionName} no implementada para cápsula ${id}`);
    }
  };

  // --- Hide Handler ---
  const handleHide = async (e: React.MouseEvent) => {
    console.log(`[CapsuleCard] handleHide triggered for capsule ID: ${id}`); // Debug log
    e.stopPropagation();
    if (is_owner) {
      console.log("[CapsuleCard] handleHide stopped: User is owner."); // Debug log
      toast.info("No puedes ocultar una cápsula que te pertenece.");
      return;
    }
    if (!onHide) {
      console.warn("[CapsuleCard] handleHide stopped: onHide function not provided."); // Debug log
      return;
    }
    // Confirmation dialog removed for smoother UX

    console.log("[CapsuleCard] handleHide proceeding without confirmation."); // Debug log

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { // Also check userError
        console.error("[CapsuleCard] handleHide error: Could not get user.", userError); // Debug log
        throw new Error("Usuario no autenticado");
      }
      const userId = user.id;
      console.log(`[CapsuleCard] handleHide: User ID: ${userId}, Capsule ID: ${id}`); // Debug log

      console.log("[CapsuleCard] handleHide: Attempting Supabase RPC call..."); // Debug log
      // Use RPC call instead of direct update
      const { error } = await supabase.rpc('hide_contributor_capsule', {
        p_capsule_id: id
      });

      if (error) {
        console.error("[CapsuleCard] handleHide: Supabase RPC error:", error); // Debug log
        throw error;
      }

      // console.log("[CapsuleCard] handleHide: Supabase update successful.");
      console.log("[CapsuleCard] handleHide: Supabase RPC successful.");
      toast.success("La cápsula está ahora en la sección Cápsulas Ocultas."); // Updated text
      console.log("[CapsuleCard] handleHide: Calling onHide callback (triggering refresh)...");
      // Call the simplified onHide callback
      onHide?.();
      console.log("[CapsuleCard] handleHide: onHide callback called."); // Debug log

    } catch (error: any) {
      console.error("[CapsuleCard] handleHide: Error caught:", error); // Debug log
      toast.error(`Error al ocultar la cápsula: ${error.message}`);
    }
  };
  // --- End Hide Handler ---

  // --- Unhide Handler ---
  const handleUnhide = async (e: React.MouseEvent) => {
    console.log(`[CapsuleCard] handleUnhide triggered for capsule ID: ${id}`);
    e.stopPropagation();
    if (!onUnhide) {
      console.warn("[CapsuleCard] handleUnhide stopped: onUnhide function not provided.");
      return;
    }

    // Optional: Add confirmation if desired
    // if (!confirm("¿Mostrar esta cápsula en tu lista principal?")) {
    //   console.log("[CapsuleCard] handleUnhide stopped: User cancelled.");
    //   return;
    // }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Usuario no autenticado");
      const userId = user.id;

      console.log("[CapsuleCard] handleUnhide: Attempting Supabase direct update...");
      // Try direct update first, as RLS *should* allow setting is_visible=true
      const { error } = await supabase
        .from('capsule_contributors')
        .update({ is_visible: true })
        .eq('capsule_id', id)
        .eq('user_id', userId);

      if (error) {
         // If direct update fails due to RLS (code 42501), consider creating an RPC like unhide_contributor_capsule
         if (error.code === '42501') {
             console.error("[CapsuleCard] handleUnhide: Direct update failed due to RLS. Consider creating an RPC.", error);
             toast.error("Error de permisos al mostrar la cápsula. Contacta soporte si persiste.");
             // Optionally, call a specific RPC here if created:
             // const { error: rpcError } = await supabase.rpc('unhide_contributor_capsule', { p_capsule_id: id });
             // if (rpcError) throw rpcError;
         } else {
            console.error("[CapsuleCard] handleUnhide: Supabase update error:", error);
            throw error; // Throw other errors
         }
      }

      console.log("[CapsuleCard] handleUnhide: Supabase update successful.");
      toast.success("Cápsula restaurada a tu lista principal.");
      console.log("[CapsuleCard] handleUnhide: Calling onUnhide callback (likely refresh)...");
      await onUnhide(id); // Call the callback passed from parent (likely refreshDashboardData)
      console.log("[CapsuleCard] handleUnhide: onUnhide callback called.");

    } catch (error: any) {
      console.error("[CapsuleCard] handleUnhide: Error caught:", error);
      toast.error(`Error al mostrar la cápsula: ${error.message}`);
    }
  };
  // --- End Unhide Handler ---

  // --- Inline Editing Handlers ---
  const startEditing = (field: 'titulo' | 'descripcion') => {
    setIsEditing(field);
    setEditValue(field === 'titulo' ? titulo : (descripcion || ''));
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsEditing(null);
    setEditValue('');
  };

  const handleSave = async (e?: React.MouseEvent | React.FocusEvent) => {
     e?.stopPropagation();
     if (!isEditing || !onUpdateDetails) {
       cancelEditing();
       return;
     }

     const field = isEditing;
     const trimmedValue = editValue.trim();
     const updates: { titulo?: string; descripcion?: string | null } = {};
     let currentValue: string | null | undefined = '';

     if (field === 'titulo') {
       if (!trimmedValue) {
         toast.error("El título no puede estar vacío.");
         // Optionally refocus the input or handle differently
         return; // Don't save empty title
       }
       if (trimmedValue === titulo) {
         cancelEditing(); // No changes made
         return;
       }
       updates.titulo = trimmedValue;
       currentValue = titulo;
     } else { // field === 'descripcion'
       const newValue = trimmedValue === '' ? null : trimmedValue; // Use null for empty description
       if (newValue === (descripcion || null)) { // Compare with null if original was empty/null
         cancelEditing(); // No changes made
         return;
       }
       updates.descripcion = newValue;
       currentValue = descripcion;
     }

     const originalState = { titulo, descripcion }; // Store original state for potential revert
     setIsEditing(null); // Exit editing mode optimistically

     try {
       await onUpdateDetails(id, updates);
       // No need to update state here, assuming parent (`DashboardPage`) handles refresh/state update
     } catch (error) {
       toast.error(`Error al actualizar ${field}.`);
       console.error("Error caught in CapsuleCard during update:", error);
       // If parent doesn't handle revert, we might need to signal it or handle state here
       // For now, rely on parent refresh or potential state management there.
     }
   };

   const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
     if (event.key === 'Enter' && !(event.shiftKey && isEditing === 'descripcion')) {
       event.preventDefault();
       handleSave();
     } else if (event.key === 'Escape') {
       cancelEditing();
     }
   };
  // --- End Inline Editing Handlers ---

  // Formatear fecha a formato legible
  const fechaFormateada = React.useMemo(() => {
    try {
      const date = new Date(fecha_creacion);
      return format(date, "d 'de' MMMM, yyyy", { locale: es });
    } catch (error) {
      return "Fecha desconocida";
    }
  }, [fecha_creacion]);

  // Total de recuerdos & individual counts
  const { foto_count, audio_count, video_count } = contadores; // Use new names
  const totalRecuerdos = foto_count + audio_count + video_count;

  // Obtener URL pública para imagen de portada
  const portadaPublicUrl = React.useMemo(() => {
    if (!portada_url) return null;
    if (portada_url.startsWith("http://") || portada_url.startsWith("https://")) {
      return portada_url;
    }
    return getStoragePublicUrl('capsules', portada_url);
  }, [portada_url]);

  // Effect to reset loading state if portada_url changes
  React.useEffect(() => {
    setPortadaCargada(true);
  }, [portadaPublicUrl]);

  // --- Refactorización: Lógica de renderizado de portada ---
  const portadaElement = useMemo(() => {
    // 1. Prioritize portada_url if it exists and loads correctly
    if (portadaPublicUrl && portadaCargada) {
      return (
        <img
          key={portadaPublicUrl} // Add key to help React diffing if URL changes
          src={portadaPublicUrl} // URL is guaranteed to exist here
          alt={titulo}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setPortadaCargada(false)} // Set state to false on error
        />
      );
    }

    // 2. If no portada_url or it failed, try primer_video_url
    if (primer_video_url) {
      const videoPublicUrl = getStoragePublicUrl('capsules', primer_video_url);
      if (videoPublicUrl) {
        return (
          <video
            key={videoPublicUrl} // Use video URL as key
            src={`${videoPublicUrl}#t=1`} // Show frame at 1 second
            preload="metadata" // Load metadata for thumbnail
            muted // Mute the video
            playsInline // Important for mobile compatibility
            className="w-full h-full object-cover" // Ensure it covers the area
            // Prevent interaction
            controls={false}
            // Optional: Add onError handler for video if needed
            // onError={(e) => console.error("Error loading video thumbnail:", e)}
          />
        );
      }
    }

    // 3. Fallback to placeholder if neither image nor video thumbnail is available
    return (
      <div className="w-full h-full flex items-center justify-center bg-celeste-cielo/10">
        <Calendar className="w-10 h-10 text-azul-profundo/40" />
      </div>
    );
  }, [portadaPublicUrl, portadaCargada, primer_video_url, titulo, id]); // Add primer_video_url to dependencies
  // --- Fin Refactorización ---

  // --- Estilos condicionales para el slider ---
  const cardBase =
    "bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group";
  const cardSlider =
    "min-h-[340px] max-h-[420px] w-[340px] max-w-full flex flex-col";
  const portadaSlider = "relative h-48 bg-gray-100 overflow-hidden";
  const portadaDefault = "relative h-32 bg-gray-100 overflow-hidden";
  const tituloSlider =
    "font-serif font-bold text-azul-profundo text-xl truncate";
  const tituloDefault =
    "font-serif font-semibold text-azul-profundo text-lg truncate";

  return (
    <div
      className={
        variant === "slider"
          ? `${cardBase} ${cardSlider}`
          : cardBase
      }
      onClick={() => onClick(id)}
    >
      {/* Portada con overlay al hover */}
      <div className={variant === "slider" ? portadaSlider : portadaDefault}>
        {portadaElement}
        {/* Indicador de anclada */}
        {anclada && (
          <div className="absolute top-0 right-0 rounded-bl-md bg-amber-400 px-2 py-1 shadow-sm z-10">
            <Pin size={12} className="text-white" />
          </div>
        )}
        {/* Overlay al hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
          <div className="p-4 w-full">
            <p className="text-white text-sm font-medium truncate">Ver cápsula completa</p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1">
          {/* --- Editable Title --- */}
          {isEditing === "titulo" ? (
            <div className="flex-grow mr-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                onClick={(e) => e.stopPropagation()}
                className="font-serif font-semibold text-azul-profundo text-lg border border-dorado-claro rounded px-1 py-0 w-full focus:outline-none focus:ring-1 focus:ring-dorado-claro"
                autoFocus
              />
            </div>
          ) : (
            <div
              className="group cursor-pointer flex-grow mr-2 min-w-0"
              onClick={(e) => {
                e.stopPropagation();
                startEditing("titulo");
              }}
              title={titulo}
            >
              <h3
                className={
                  variant === "slider" ? tituloSlider : tituloDefault
                }
                title={titulo}
              >
                {titulo}
              </h3>
              <Pencil
                size={14}
                className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity inline-block align-middle"
              />
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex space-x-1">
            <button
              onClick={(e) => handleAction(e, onShare, "compartir")}
              className="p-1.5 rounded-full text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
              aria-label="Compartir cápsula"
              title="Compartir cápsula"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={(e) => handleAction(e, onPin, "anclar")}
              className={`p-1.5 rounded-full transition-colors ${
                anclada
                  ? "text-amber-500 bg-amber-50 hover:bg-amber-100"
                  : "text-gray-400 hover:bg-amber-50 hover:text-amber-500"
              }`}
              aria-label={anclada ? "Desanclar cápsula" : "Anclar cápsula"}
              title={anclada ? "Desanclar cápsula" : "Anclar cápsula"}
            >
              <Pin size={16} />
            </button>
            <button
              onClick={(e) => {
                if (is_owner) handleAction(e, onDelete, "eliminar");
                else e.stopPropagation();
              }}
              className={`p-1.5 rounded-full transition-colors ${
                is_owner
                  ? "text-gray-400 hover:bg-red-50 hover:text-red-500"
                  : "text-gray-300 cursor-not-allowed"
              }`}
              aria-label={
                is_owner
                  ? "Eliminar cápsula"
                  : "No puedes eliminar esta cápsula"
              }
              title={
                is_owner
                  ? "Eliminar cápsula"
                  : "Solo el propietario puede eliminar"
              }
              disabled={!is_owner}
            >
              <Trash2 size={16} />
            </button>
            {/* Hide/Unhide Button - Conditional Rendering */}
            {!is_owner &&
              (isHiddenList ? (
                <button
                  onClick={handleUnhide}
                  className="p-1.5 rounded-full text-green-600 hover:bg-green-50 transition-colors"
                  aria-label="Mostrar cápsula en mi lista principal"
                  title="Mostrar cápsula en mi lista principal"
                >
                  <Eye size={16} />
                </button>
              ) : (
                <button
                  onClick={handleHide}
                  className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  aria-label="Ocultar cápsula de mi lista"
                  title="Ocultar cápsula de mi lista"
                >
                  <EyeOff size={16} />
                </button>
              ))}
            {/* --- End Conditional Button --- */}
          </div>
        </div>

        {/* Fecha */}
        <p className="text-xs text-gray-500 mb-2 flex items-center">
          <Calendar size={14} className="mr-1" />
          {fechaFormateada}
        </p>

        {/* --- Editable Description --- */}
        <div className="mb-3 flex-grow min-h-[40px]">
          {isEditing === "descripcion" ? (
            <div className="flex flex-col">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-gray-600 border border-dorado-claro rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-dorado-claro resize-none mb-1"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end space-x-1">
                <button
                  onClick={handleSave}
                  className="text-green-600 hover:text-green-800 p-0.5"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={cancelEditing}
                  className="text-red-600 hover:text-red-800 p-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="group cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                startEditing("descripcion");
              }}
            >
              <p
                className={`text-xs text-gray-600 line-clamp-2 ${
                  !descripcion ? "italic text-gray-400" : ""
                }`}
              >
                {descripcion || "Añadir descripción..."}
              </p>
              <Pencil
                size={12}
                className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity inline-block"
              />
            </div>
          )}
        </div>

        {/* Contadores */}
        <div className="flex items-center space-x-3 text-xs text-gray-600 mt-auto pt-2 border-t border-gray-100">
          {foto_count > 0 && (
            <div
              className="flex items-center"
              title={`${foto_count} foto${foto_count > 1 ? "s" : ""}`}
            >
              <FileImage size={14} className="mr-1 text-azul-profundo/80" />
              <span>{foto_count}</span>
            </div>
          )}
          {audio_count > 0 && (
            <div
              className="flex items-center"
              title={`${audio_count} audio${audio_count > 1 ? "s" : ""}`}
            >
              <FileAudio size={14} className="mr-1 text-azul-profundo/80" />
              <span>{audio_count}</span>
            </div>
          )}
          {video_count > 0 && (
            <div
              className="flex items-center"
              title={`${video_count} video${video_count > 1 ? "s" : ""}`}
            >
              <FileVideo size={14} className="mr-1 text-azul-profundo/80" />
              <span>{video_count}</span>
            </div>
          )}
          {totalRecuerdos === 0 && (
            <span className="text-gray-400 italic">Vacía</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CapsuleCard;
