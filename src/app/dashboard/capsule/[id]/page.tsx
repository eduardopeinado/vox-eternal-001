'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, getStoragePublicUrl } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, Image as ImageIcon, FileAudio, FileVideo, Calendar, Share2, Pencil, Trash2, Plus, BrainCircuit, Pin, PinOff, Check, X, User, Star, Edit3 } from 'lucide-react'; // Import User and Star icons
import dynamic from 'next/dynamic';
const RecuerdoMetadataEditor = dynamic(() => import('@/components/dashboard/recuerdo-metadata-editor'), { ssr: false });
import { toast } from 'sonner';
import { ReactCompareSlider } from "react-compare-slider";
import Lightbox, { SlideImage, SlideVideo } from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
// Removed incorrect useAuth import

// No longer need ShareModal here
// import ShareModal from '@/components/dashboard/share-modal';

type Recuerdo = {
  id: string;
  usuario_id: string;
  url_archivo: string;
  tipo: string;
  nombre_archivo: string;
  titulo_personalizado?: string | null;
  descripcion?: string | null;
  fecha_real?: string;
  anclado?: boolean;
  es_favorito?: boolean;
  url_mejorado?: string | null;
  mejorado_por_ia?: boolean;
};

type Capsula = {
  id: string;
  usuario_id: string; // Add usuario_id to Capsula type
  titulo: string;
  descripcion?: string | null; // Allow null from DB
  fecha_creacion: string;
  portada_url?: string;
};

interface CapsulePageParams {
  id: string;
}

export default function CapsuleDetailPage() {
  // --- Estado para mejora IA ---
  const [iaLoadingId, setIaLoadingId] = useState<string | null>(null);
  const [iaError, setIaError] = useState<string | null>(null);
  const [iaOriginalUrl, setIaOriginalUrl] = useState<string | null>(null);
  const [iaMejoradaUrl, setIaMejoradaUrl] = useState<string | null>(null);
  const [iaRecuerdoId, setIaRecuerdoId] = useState<string | null>(null);
  const [iaShowModal, setIaShowModal] = useState(false);

  // --- Función para llamar a la función HTTP de mejora IA ---
  // Estado para modal de restaurar mejora IA
  const [showRestoreIaModal, setShowRestoreIaModal] = useState<{ recuerdo: Recuerdo } | null>(null);

  const handleImproveIA = async (recuerdo: Recuerdo) => {
    if (recuerdo.tipo === "audio") {
      await handleImproveAudioIA(recuerdo);
      return;
    }
    // Si ya existe mejora IA, preguntar si quiere restaurar la original
    if (recuerdo.url_mejorado) {
      setShowRestoreIaModal({ recuerdo });
      return;
    }

    console.log(`[CapsuleDetailPage] Mejorar IA clicked for recuerdo ID: ${recuerdo.id}`);
    setIaError(null);
    setIaLoadingId(recuerdo.id);
    setIaOriginalUrl(getPublicUrl(recuerdo.url_archivo));
    setIaMejoradaUrl(null);
    setIaRecuerdoId(recuerdo.id);

    try {
      // Llamar al nuevo endpoint HTTP
      const { data, error } = await supabase.functions.invoke('improve-media-ia-http', {
        body: {
          img: getPublicUrl(recuerdo.url_archivo),
          usuario_id: recuerdo.usuario_id,
          recuerdo_id: recuerdo.id
        }
      });

      // Si data es string, parsear a objeto
      let parsedData: any = data;
      if (typeof data === "string") {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          setIaError("Error al parsear respuesta de mejora IA");
          setIaLoadingId(null);
          return;
        }
      }

      console.log("[CapsuleDetailPage] Response from improve-media-ia-http:", parsedData, error);

      if (error || !parsedData || !parsedData.improved_img) {
        setIaError(parsedData?.error || error?.message || "Error al mejorar la imagen");
        setIaLoadingId(null);
        return;
      }

      // Mostrar el comparador slider
      setIaMejoradaUrl(parsedData.improved_img);
      setIaShowModal(true);
    } catch (e: any) {
      console.error("[CapsuleDetailPage] Error in handleImproveIA:", e);
      setIaError(e.message || "Error inesperado");
    } finally {
      setIaLoadingId(null);
    }
  };

  const handleImproveAudioIA = async (recuerdo: Recuerdo) => {
    if (recuerdo.url_mejorado) {
      setIaError("Este audio ya fue mejorado por IA. Puedes restaurar el original si lo deseas.");
      setShowRestoreIaModal({ recuerdo });
      return;
    }

    console.log(`[CapsuleDetailPage] Mejorar IA audio clicked for recuerdo ID: ${recuerdo.id}`);
    setIaError(null);
    setIaLoadingId(recuerdo.id);
    setIaOriginalUrl(getPublicUrl(recuerdo.url_archivo));
    setIaMejoradaUrl(null);
    setIaRecuerdoId(recuerdo.id);

    try {
      const { data, error } = await supabase.functions.invoke('improve-audio-ia-http', {
        body: { recuerdo_id: recuerdo.id }
      });

      let parsedData: any = data;
      if (typeof data === "string") {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          setIaError("Error al parsear respuesta de mejora IA audio");
          setIaLoadingId(null);
          return;
        }
      }

      console.log("[CapsuleDetailPage] Response from improve-audio-ia-http:", parsedData, error);

      if (error || !parsedData || !parsedData.url_mejorado) {
        setIaError(parsedData?.error || error?.message || "Error al mejorar el audio");
        setIaLoadingId(null);
        return;
      }

      setIaMejoradaUrl(getPublicUrl(parsedData.url_mejorado));
      setIaShowModal(true);
      toast.success("¡Audio mejorado por IA! Revisa el comparador.");
    } catch (e: any) {
      console.error("[CapsuleDetailPage] Error in handleImproveAudioIA:", e);
      setIaError(e.message || "Error inesperado");
    } finally {
      setIaLoadingId(null);
    }
  };

  // --- Función para guardar la versión elegida ---
  const handleGuardarMejoraIA = async (usarMejorada: boolean, recuerdoId: string) => {
    if (!recuerdoId) return;
    setIaLoadingId(recuerdoId);
    setIaError(null);

    try {
      if (usarMejorada && iaMejoradaUrl) {
        // Solo guardar la referencia al archivo mejorado, NO borrar el original
        // 1. Buscar el recuerdo original para obtener info de carpeta
        const recuerdoOriginal = recuerdos.find(r => r.id === recuerdoId);
        if (!recuerdoOriginal) {
          setIaError("No se encontró el recuerdo original.");
          setIaLoadingId(null);
          return;
        }

        // 2. Guardar la nueva ruta en la base de datos (ya fue subida por la función edge)
        // La URL mejorada ya está en iaMejoradaUrl, pero necesitamos la ruta relativa
        // Extraer la ruta relativa del Storage
        const urlParts = iaMejoradaUrl.split('/storage/v1/object/public/capsules/');
        const storagePath = urlParts[1] || iaMejoradaUrl;

        const { error } = await supabase
          .from('recuerdos')
          .update({
            url_mejorado: storagePath,
            mejorado_por_ia: true,
            fecha_mejora_ia: new Date().toISOString()
          })
          .eq('id', recuerdoId);

        if (error) {
          setIaError("Error al guardar la mejora IA");
        } else {
          setRecuerdos(prev =>
            prev.map(r =>
              r.id === recuerdoId
                ? { ...r, url_mejorado: storagePath, mejorado_por_ia: true }
                : r
            )
          );
        }
      } else if (!usarMejorada) {
        // Volver a la original: borrar url_mejorado y poner mejorado_por_ia en false
        const { error } = await supabase
          .from('recuerdos')
          .update({
            url_mejorado: null,
            mejorado_por_ia: false
          })
          .eq('id', recuerdoId);

        if (error) {
          setIaError("Error al restaurar el audio original");
        } else {
          // Refrescar los recuerdos desde la base de datos para asegurar consistencia (con pequeño delay)
          if (params && typeof params.id === 'string') {
            await new Promise(resolve => setTimeout(resolve, 500));
            const { data: recuerdosData, error: recuerdosError } = await supabase
              .from('recuerdos')
              .select('*, usuario_id, es_favorito')
              .eq('capsula_id', params && typeof params.id === 'string' ? params.id : '')
              .order('anclado', { ascending: false })
              .order('fecha_real', { ascending: false });
            console.log('[DEBUG] Recuerdos tras restaurar:', recuerdosData);
            if (!recuerdosError && recuerdosData) {
              setRecuerdos(recuerdosData);
              router.refresh();
            }
          }
        }
      }
      // Cerrar modal
      setIaShowModal(false);
      setIaRecuerdoId(null);
      setIaMejoradaUrl(null);
      setIaOriginalUrl(null);
    } catch (e: any) {
      setIaError(e.message || "Error inesperado al guardar");
    } finally {
      setIaLoadingId(null);
    }
  };
  const router = useRouter();
  const params = useParams();
  // const { user } = useAuth(); // Removed useAuth
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // State for user ID
  const [capsula, setCapsula] = useState<Capsula | null>(null);
  const [recuerdos, setRecuerdos] = useState<Recuerdo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Estado para contador de mejoras IA ---
  const [iaPlan, setIaPlan] = useState<string>("Gratis");
  const [iaMaxMejoras, setIaMaxMejoras] = useState<number>(2);
  const [iaUsadas, setIaUsadas] = useState<number>(0);

  // --- Consulta plan y mejoras IA usadas ---
  useEffect(() => {
    const fetchIAStatus = async () => {
      if (!currentUserId) return;
      // Obtener plan
      const { data: userData } = await supabase
        .from('usuarios')
        .select('plan')
        .eq('id', currentUserId)
        .single();
      const plan = userData?.plan || "Gratis";
      setIaPlan(plan);

      // Definir límites por plan
      const PLAN_LIMITS: Record<string, number> = {
        "Gratis": 2,
        "Básico": 10,
        "Premium": 100,
        "Vitalicio": 99999
      };
      setIaMaxMejoras(PLAN_LIMITS[plan] ?? 2);

      // Contar mejoras usadas
      const { count } = await supabase
        .from('recuerdos')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', currentUserId)
        .eq('mejorado_por_ia', true);
      setIaUsadas(count ?? 0);
    };
    fetchIAStatus();
  }, [currentUserId, recuerdos]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false); // State for drag-over visual feedback
  const fileInputRef = useRef<HTMLInputElement>(null);
  // State for inline editing (recuerdos)
  const [editingRecuerdoField, setEditingRecuerdoField] = useState<{ id: string; field: 'titulo' | 'descripcion' } | null>(null);
  const [editRecuerdoValue, setEditRecuerdoValue] = useState('');
  // State for inline editing (capsula)
  const [editingCapsulaField, setEditingCapsulaField] = useState<'titulo' | 'descripcion' | null>(null);
  const [editCapsulaValue, setEditCapsulaValue] = useState('');
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  // Share Modal state removed

  // Estado para edición de metadata de recuerdo
  const [editingMetadataId, setEditingMetadataId] = useState<string | null>(null);
  const [editingMetadata, setEditingMetadata] = useState<{ fecha_real: string | null; latitud: number | null; longitud: number | null } | null>(null);
  const [savingMetadata, setSavingMetadata] = useState(false);

  const handleOpenMetadataEditor = (recuerdo: Recuerdo) => {
    setEditingMetadataId(recuerdo.id);
    setEditingMetadata({
      fecha_real: recuerdo.fecha_real || null,
      latitud: (recuerdo as any).latitud ?? null,
      longitud: (recuerdo as any).longitud ?? null,
    });
  };

  const handleCloseMetadataEditor = () => {
    setEditingMetadataId(null);
    setEditingMetadata(null);
  };

  const handleSaveMetadata = async (data: { fecha_real: string | null; latitud: number | null; longitud: number | null }) => {
    if (!editingMetadataId) return;
    setSavingMetadata(true);
    try {
      // Validar y preparar datos para evitar nulls
      const fecha_real = data.fecha_real && data.fecha_real.trim() !== '' ? data.fecha_real : undefined;
      const latitud = data.latitud !== null && !isNaN(data.latitud) ? data.latitud : undefined;
      const longitud = data.longitud !== null && !isNaN(data.longitud) ? data.longitud : undefined;

      console.log('Guardando metadata con valores:', { fecha_real, latitud, longitud });

      const { data: updatedData, error } = await supabase
        .from('recuerdos')
        .update({
          fecha_real,
          latitud,
          longitud,
          ubicacion_manual: true,
        })
        .eq('id', editingMetadataId)
        .select()
        .single();

      if (error) {
        console.error('Error updating metadata:', error);
        toast.error(`Error al actualizar metadata: ${error.message}`);
      } else {
        setRecuerdos(prev =>
          prev.map(r =>
            r.id === editingMetadataId
              ? {
                  ...r,
                  fecha_real: updatedData.fecha_real ?? undefined,
                  latitud: updatedData.latitud ?? undefined,
                  longitud: updatedData.longitud ?? undefined,
                }
              : r
          )
        );
        toast.success('Metadata actualizada');
      }
      handleCloseMetadataEditor();
    } catch (e: any) {
      console.error('Unexpected error saving metadata:', e);
      toast.error(`Error inesperado al guardar metadata: ${e.message || e}`);
    } finally {
      setSavingMetadata(false);
    }
  };

  useEffect(() => {
    const fetchCapsuleData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
           throw new Error('Debes iniciar sesión para ver esta cápsula');
         }
         const userId = user.id;
         setCurrentUserId(userId); // Set the user ID state here
         const capsuleId = params && typeof params.id === 'string' ? params.id : ''; // Safe access, fallback a string vacío
 
         // 1. Fetch capsule data by ID only first
        const { data: capsulaData, error: capsulaError } = await supabase
          .from('capsulas')
          .select('*')
          .eq('id', capsuleId)
          .single();

        if (capsulaError) {
          if (capsulaError.code === 'PGRST116') { // PGRST116 means no rows found
            throw new Error('Cápsula no encontrada.'); // More specific error if not found at all
          }
          throw new Error(`Error al buscar cápsula: ${capsulaError.message}`);
        }

        // 2. Check permissions: Is user the owner OR a contributor?
        const isOwner = capsulaData.usuario_id === userId;
        let isContributor = false;

        if (!isOwner) {
          const { data: contributorData, error: contributorError } = await supabase
            .from('capsule_contributors')
            .select('user_id')
            .eq('capsule_id', capsuleId)
            .eq('user_id', userId)
            .maybeSingle(); // Use maybeSingle as we only need to know if one exists

          if (contributorError) {
            // Log the error but don't necessarily block, maybe treat as no permission
            console.error("Error checking contributor status:", contributorError);
          }
          isContributor = !!contributorData; // True if a record was found
        }

        // 3. If neither owner nor contributor, throw permission error
        if (!isOwner && !isContributor) {
          console.warn(`User ${userId} attempted to access capsule ${capsuleId} without permission.`);
          throw new Error('No tienes permiso para ver esta cápsula.');
        }

        // 4. Permission granted, set capsule state and fetch recuerdos
        console.log(`User ${userId} has permission (Owner: ${isOwner}, Contributor: ${isContributor}) for capsule ${capsuleId}.`);
        // Ensure capsulaData includes usuario_id before setting state
        const completeCapsulaData = { ...capsulaData, usuario_id: capsulaData.usuario_id || null }; // Handle potential missing field if needed
        setCapsula(completeCapsulaData as Capsula); // Cast to ensure type match

const { data: recuerdosData, error: recuerdosError } = await supabase
  .from('recuerdos')
  .select('*, usuario_id, es_favorito, latitud, longitud') // Added latitud and longitud
  .eq('capsula_id', params && typeof params.id === 'string' ? params.id : '')
  .order('anclado', { ascending: false }) // Order by anclado first (true first)
  .order('fecha_real', { ascending: false }); // Then by date

        if (recuerdosError) {
          console.error('Error al cargar recuerdos:', recuerdosError);
          setError(`Error al cargar recuerdos: ${recuerdosError.message}`);
          setRecuerdos([]);
          setLoading(false);
          return;
        }

        setRecuerdos(
          (recuerdosData || []).map(r => ({
            ...r,
            mejorasIA: r.mejorasIA ?? null
          }))
        );
      } catch (err: any) {
        console.error('Error al cargar cápsula:', err);
        setError(err?.message || 'Error al cargar datos de la cápsula');
      } finally {
        setLoading(false);
      }
    };

    if (params && typeof params.id === 'string') {
      fetchCapsuleData();
    }
  }, [params]); // Removed user from dependency array if fetchCapsuleData gets it internally

  const handleBack = () => {
    router.back();
  };

  // Share Modal Handler removed

  const getPublicUrl = (path: string) => {
    if (!path) {
      console.log('Ruta vacía, no se puede generar URL');
      return '';
    }
    // Si es una URL absoluta (http/https), usar tal cual
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    // Si es ruta relativa, pasar por getStoragePublicUrl
    return getStoragePublicUrl('capsules', path);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const filesToUpload = Array.from(event.target.files); // Convert FileList to Array
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset input after selection
      }
      // Upload each file sequentially (can be improved for parallel uploads later)
      filesToUpload.forEach(file => {
        handleUploadRecuerdo(file);
      });
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessary to allow dropping
    event.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };

  const [showCreateCapsuleModal, setShowCreateCapsuleModal] = React.useState(false);
  const [filesForNewCapsule, setFilesForNewCapsule] = React.useState<File[]>([]);

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const filesToUpload = Array.from(event.dataTransfer.files);
      event.dataTransfer.clearData();

      // Guardar los archivos arrastrados en estado para pasarlos al modal
      setFilesForNewCapsule(filesToUpload);

      // Abrir modal de creación de cápsula con archivos pre-cargados
      setShowCreateCapsuleModal(true);
    }
  };
  // --- End Drag and Drop Handlers ---

  // --- Inline Editing Handlers (Recuerdos) ---
  const startEditingRecuerdo = (recuerdo: Recuerdo, field: 'titulo' | 'descripcion') => {
    setEditingRecuerdoField({ id: recuerdo.id, field });
    setEditRecuerdoValue(field === 'titulo' ? (recuerdo.titulo_personalizado || '') : (recuerdo.descripcion || ''));
    setEditingCapsulaField(null); // Cancel capsule editing if starting recuerdo editing
  };

  const cancelEditingRecuerdo = () => {
    setEditingRecuerdoField(null);
    setEditRecuerdoValue('');
  };

  const handleUpdateRecuerdoDetails = async () => {
    if (!editingRecuerdoField) return;

    const { id, field } = editingRecuerdoField;
    const originalRecuerdo = recuerdos.find(r => r.id === id);
    if (!originalRecuerdo) return;

    const updateData: Partial<Recuerdo> = {};
    let originalValue: string | null | undefined = '';

    if (field === 'titulo') {
      updateData.titulo_personalizado = editRecuerdoValue.trim() === '' ? null : editRecuerdoValue.trim(); // Set null if empty
      originalValue = originalRecuerdo.titulo_personalizado;
    } else {
      updateData.descripcion = editRecuerdoValue.trim() === '' ? null : editRecuerdoValue.trim(); // Set null if empty
      originalValue = originalRecuerdo.descripcion;
    }

    // Optimistic UI Update
    setRecuerdos(prev => prev.map(r => r.id === id ? { ...r, ...updateData } : r));
    cancelEditingRecuerdo(); // Exit editing mode immediately

    try {
      const { error } = await supabase
        .from('recuerdos')
        .update(updateData)
        .eq('id', id);

      if (error) {
        toast.error(`Error al actualizar ${field === 'titulo' ? 'el título' : 'la descripción'}.`);
        console.error(`Error updating ${field}:`, error);
        // Revert optimistic update
        setRecuerdos(prev => prev.map(r => r.id === id ? { ...r, [field === 'titulo' ? 'titulo_personalizado' : 'descripcion']: originalValue } : r));
      } else {
        toast.success(`${field === 'titulo' ? 'Título' : 'Descripción'} actualizado.`);
      }
    } catch (err) {
      toast.error(`Error inesperado al actualizar ${field === 'titulo' ? 'el título' : 'la descripción'}.`);
      console.error(`Unexpected error updating ${field}:`, err);
       // Revert optimistic update
       setRecuerdos(prev => prev.map(r => r.id === id ? { ...r, [field === 'titulo' ? 'titulo_personalizado' : 'descripcion']: originalValue } : r));
    }
  };

  const handleRecuerdoEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { // Allow Shift+Enter in textarea
       event.preventDefault();
       handleUpdateRecuerdoDetails();
    } else if (event.key === 'Escape') {
       cancelEditingRecuerdo();
    }
  };
  // --- End Inline Editing Handlers (Recuerdos) ---

  // --- Inline Editing Handlers (Capsula) ---
   const startEditingCapsula = (field: 'titulo' | 'descripcion') => {
     if (!capsula) return;
     setEditingCapsulaField(field);
     setEditCapsulaValue(field === 'titulo' ? (capsula.titulo || '') : (capsula.descripcion || ''));
     setEditingRecuerdoField(null); // Cancel recuerdo editing if starting capsule editing
   };

   const cancelEditingCapsula = () => {
     setEditingCapsulaField(null);
     setEditCapsulaValue('');
   };

   const handleUpdateCapsuleDetails = async () => {
     if (!editingCapsulaField || !capsula) return;

     const field = editingCapsulaField;
     const updateData: Partial<Capsula> = {};
     let originalValue: string | null | undefined; // More precise typing

     if (field === 'titulo') {
       updateData.titulo = editCapsulaValue.trim();
       originalValue = capsula.titulo; // Type is string
       if (!updateData.titulo) {
         toast.error("El título de la cápsula no puede estar vacío.");
         return; // Prevent saving empty title
       }
     } else { // field === 'descripcion'
       updateData.descripcion = editCapsulaValue.trim() === '' ? null : editCapsulaValue.trim(); // Use null for empty description
       originalValue = capsula.descripcion; // Type is string | null | undefined
     }

     // Optimistic UI Update
     setCapsula(prev => prev ? { ...prev, ...updateData } : null);
     cancelEditingCapsula(); // Exit editing mode

     try {
       const { error } = await supabase
         .from('capsulas')
         .update(updateData)
         .eq('id', capsula.id);

       if (error) {
         toast.error(`Error al actualizar ${field}.`);
         console.error(`Error updating capsule ${field}:`, error);
         // Revert optimistic update explicitly
         setCapsula(prev => {
           if (!prev) return null;
           if (field === 'titulo') {
             // originalValue is string here
             return { ...prev, titulo: originalValue as string };
           } else {
             // originalValue is string | null | undefined, matching the updated Capsula type
             return { ...prev, descripcion: originalValue };
           }
         });
       } else {
         toast.success(`Cápsula ${field} actualizada.`);
       }
     } catch (err) {
       toast.error(`Error inesperado al actualizar la cápsula ${field}.`);
       console.error(`Unexpected error updating capsule ${field}:`, err);
       // Revert optimistic update explicitly
       setCapsula(prev => {
         if (!prev) return null;
         if (field === 'titulo') {
            // originalValue is string here
           return { ...prev, titulo: originalValue as string };
         } else {
            // originalValue is string | null | undefined
           return { ...prev, descripcion: originalValue };
         }
       });
     }
   };

   const handleCapsulaEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
     if (event.key === 'Enter' && !(event.shiftKey && editingCapsulaField === 'descripcion')) { // Allow Shift+Enter only for description textarea
       event.preventDefault();
       handleUpdateCapsuleDetails();
     } else if (event.key === 'Escape') {
       cancelEditingCapsula();
     }
   };
  // --- End Inline Editing Handlers (Capsula) ---

  const handleUploadRecuerdo = async (file: File) => {
    setUploadError(null); // Limpiar errores previos
    setIsUploading(true);

    // --- Validaciones Previas --- 
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.id) {
      console.error("Error: Usuario no autenticado o ID de usuario no disponible.");
      setUploadError("No se pudo verificar tu sesión. Por favor, inicia sesión de nuevo.");
      setIsUploading(false);
      return;
    }
    const userId = user.id; // Ahora sabemos que userId es string

    if (!params || typeof params.id !== 'string') {
      console.error("Error: ID de la cápsula no disponible o inválido en los parámetros de la ruta.");
      setUploadError("No se pudo identificar la cápsula actual.");
      setIsUploading(false);
      return;
    }
    const capsuleId = params && typeof params.id === 'string' ? params.id : ''; // Safe access, fallback a string vacío

    // --- Lógica de Subida --- 
    console.log('Iniciando subida para el archivo:', file.name, 'Tipo:', file.type, 'Tamaño:', file.size);

    try {
      const fileExtRaw = file.name.split('.').pop();
      if (typeof fileExtRaw !== 'string' || fileExtRaw.length === 0) {
        console.error("Error: El archivo no tiene una extensión válida.");
        setUploadError("El archivo no tiene una extensión válida.");
        setIsUploading(false);
        return;
      }
      const fileExt = fileExtRaw.toLowerCase(); // Ahora sabemos que fileExt es string

      const randomString = Math.random().toString(36).substring(2, 15);
      const fileName = `${Date.now()}-${randomString}.${fileExt}`;
      const filePath = `${capsuleId}/${fileName}`;
      const uploadedPath = filePath;

      console.log(`Subiendo archivo a Storage: ${filePath} con tipo: ${file.type}`); // Log tipo MIME
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('capsules')
        .upload(filePath, file, { // Añadir opciones de subida
          contentType: file.type // Especificar el tipo MIME correcto
        });

      if (uploadError) {
        console.error('Error al subir archivo a Storage:', uploadError);
        throw new Error(`Error al subir archivo: ${uploadError.message}`);
      }

      const relativePath = uploadData.path;
      console.log('Archivo subido exitosamente a Storage. Ruta Relativa:', relativePath);

      let tipoRecuerdo: string | null = null;
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(fileExt)) {
        tipoRecuerdo = 'foto';
      } else if (['mp4', 'mov', 'avi', 'wmv', 'webm', 'mkv', 'flv'].includes(fileExt)) {
        tipoRecuerdo = 'video';
      } else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(fileExt)) {
        tipoRecuerdo = 'audio';
      }

      if (!tipoRecuerdo) {
        const errorMessage = `Tipo de archivo no soportado: .${fileExt}. Solo se permiten fotos, videos y audios.`;
        console.error(errorMessage);
        setUploadError(errorMessage);
        alert(errorMessage);
        setIsUploading(false);
        return;
      }

      console.log(`Calculated recuerdo type (tipo): ${tipoRecuerdo} for file: ${file.name}`);

      const newRecuerdoData = {
        usuario_id: userId,      // Usar variable verificada
        capsula_id: capsuleId,    // Usar variable verificada
        tipo: tipoRecuerdo,       // Ya verificado que es string antes de este punto
        url_archivo: relativePath,
        nombre_archivo: file.name,
        descripcion: '' // Añadir valor por defecto si es necesario o manejarlo
      };

      console.log("Intentando insertar nuevo recuerdo con datos:", newRecuerdoData);

      const { data: insertedData, error: insertError } = await supabase
        .from('recuerdos')
        .insert([newRecuerdoData])
        .select()
        .single();

      if (insertError) {
        console.error('Error al insertar recuerdo en DB:', insertError);
        console.warn(`Intentando eliminar archivo ${relativePath} de Storage debido a fallo en DB.`);
        await supabase.storage.from('capsules').remove([relativePath]);
        throw new Error(`Error al guardar información del recuerdo: ${insertError.message}`);
      }

      const newDbRecuerdo = insertedData as Recuerdo;
      console.log('Recuerdo insertado en DB exitosamente:', newDbRecuerdo);

      setRecuerdos(prevRecuerdos => [...prevRecuerdos, newDbRecuerdo]);
      alert('¡Recuerdo añadido exitosamente!');
    } catch (err: any) {
      console.error('Error en handleUploadRecuerdo:', err);
      setUploadError(`Error al añadir recuerdo: ${err.message}`);
      alert(`Error al añadir recuerdo: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // --- Function to handle pinning/unpinning ---
  const handleTogglePin = async (recuerdo: Recuerdo) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Debes iniciar sesión para anclar recuerdos.");
      return;
    }

    const newAncladoState = !recuerdo.anclado;
    const originalAncladoState = recuerdo.anclado;

    // Optimistic UI Update
    setRecuerdos(prevRecuerdos => {
      const updatedRecuerdos = prevRecuerdos.map(r =>
        r.id === recuerdo.id ? { ...r, anclado: newAncladoState } : r
      );
      // Re-sort based on new state
      return updatedRecuerdos.sort((a, b) => {
        const pinComparison = (b.anclado ? 1 : 0) - (a.anclado ? 1 : 0);
        if (pinComparison !== 0) return pinComparison;
        // Fallback to date sorting if pin status is the same
        const dateA = a.fecha_real ? new Date(a.fecha_real).getTime() : 0;
        const dateB = b.fecha_real ? new Date(b.fecha_real).getTime() : 0;
        return dateB - dateA;
      });
    });


    try {
      const { error } = await supabase
        .from('recuerdos')
        .update({ anclado: newAncladoState })
        .eq('id', recuerdo.id)
        .eq('usuario_id', user.id); // Ensure user owns the recuerdo

      if (error) {
        console.error('Error updating pin status:', error);
        toast.error(`Error al ${newAncladoState ? 'anclar' : 'desanclar'} el recuerdo.`);
        // Revert optimistic update on error
        setRecuerdos(prevRecuerdos => {
           const revertedRecuerdos = prevRecuerdos.map(r =>
             r.id === recuerdo.id ? { ...r, anclado: originalAncladoState } : r
           );
           // Re-sort again after reverting
           return revertedRecuerdos.sort((a, b) => {
             const pinComparison = (b.anclado ? 1 : 0) - (a.anclado ? 1 : 0);
             if (pinComparison !== 0) return pinComparison;
             const dateA = a.fecha_real ? new Date(a.fecha_real).getTime() : 0;
             const dateB = b.fecha_real ? new Date(b.fecha_real).getTime() : 0;
             return dateB - dateA;
           });
        });
      } else {
        toast.success(`Recuerdo ${newAncladoState ? 'anclado' : 'desanclado'} correctamente.`);
      }
    } catch (err: any) {
      console.error('Error toggling pin:', err);
      toast.error("Ocurrió un error inesperado.");
       // Revert optimistic update on unexpected error
       setRecuerdos(prevRecuerdos => {
         const revertedRecuerdos = prevRecuerdos.map(r =>
           r.id === recuerdo.id ? { ...r, anclado: originalAncladoState } : r
         );
         // Re-sort again after reverting
         return revertedRecuerdos.sort((a, b) => {
           const pinComparison = (b.anclado ? 1 : 0) - (a.anclado ? 1 : 0);
           if (pinComparison !== 0) return pinComparison;
           const dateA = a.fecha_real ? new Date(a.fecha_real).getTime() : 0;
           const dateB = b.fecha_real ? new Date(b.fecha_real).getTime() : 0;
           return dateB - dateA;
         });
       });
    }
  };
  // --- End of Pin function ---

  // --- Function to handle toggling favorite status ---
  const handleToggleFavorite = async (recuerdo: Recuerdo) => {
      if (!currentUserId || currentUserId !== recuerdo.usuario_id) {
          toast.error("Solo el propietario puede marcar/desmarcar como favorito.");
          return;
      }
      if (recuerdo.tipo !== 'audio' && recuerdo.tipo !== 'video') {
          toast.info("Solo los audios y videos pueden ser marcados como favoritos.");
          return;
      }

      const newFavoriteState = !recuerdo.es_favorito;
      const originalFavoriteState = recuerdo.es_favorito;

      // Optimistic UI Update
      setRecuerdos(prevRecuerdos =>
          prevRecuerdos.map(r =>
              r.id === recuerdo.id ? { ...r, es_favorito: newFavoriteState } : r
          )
      );

      try {
          const { error } = await supabase.rpc('toggle_recuerdo_favorito', {
              p_recuerdo_id: recuerdo.id
          });

          if (error) {
              console.error('Error toggling favorite status via RPC:', error);
              toast.error(`Error al ${newFavoriteState ? 'marcar como' : 'desmarcar'} favorito.`);
              // Revert optimistic update on error
              setRecuerdos(prevRecuerdos =>
                  prevRecuerdos.map(r =>
                      r.id === recuerdo.id ? { ...r, es_favorito: originalFavoriteState } : r
                  )
              );
          } else {
              toast.success(`Recuerdo ${newFavoriteState ? 'marcado como' : 'desmarcado de'} favorito.`);
          }
      } catch (err: any) {
          console.error('Error calling toggle favorite RPC:', err);
          toast.error("Ocurrió un error inesperado al cambiar el estado de favorito.");
          // Revert optimistic update on unexpected error
          setRecuerdos(prevRecuerdos =>
              prevRecuerdos.map(r =>
                  r.id === recuerdo.id ? { ...r, es_favorito: originalFavoriteState } : r
              )
          );
      }
  };
  // --- End of Favorite toggle function ---

  const handleDeleteRecuerdo = async (recuerdo: Recuerdo) => {
    // Confirmación
    if (!confirm(`¿Estás seguro de que quieres eliminar el recuerdo "${recuerdo.nombre_archivo || 'sin nombre'}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    // Validar IDs necesarios
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.id) {
      console.error("Error: Usuario no autenticado o ID de usuario no disponible para eliminar.");
      toast.error("Error de autenticación al eliminar.");
      return;
    }
    if (!params || typeof params.id !== 'string') {
      console.error("Error: ID de la cápsula no disponible o inválido para eliminar.");
      toast.error("Error al identificar la cápsula para eliminar.");
      return;
    }
    const capsuleId = params && typeof params.id === 'string' ? params.id : ''; // Safe access, fallback a string vacío

    console.log(`Intentando eliminar recuerdo ID: ${recuerdo.id}, Archivo: ${recuerdo.url_archivo}`);

    try {
      const relativePath = recuerdo.url_archivo;

      const { error: fileError } = await supabase
        .storage
        .from('capsules') 
        .remove([relativePath]); 

      if (fileError) {
        console.warn(`Advertencia al eliminar archivo ${relativePath} del storage (se continuará con DB):`, fileError);
      } else {
        console.log(`Archivo ${relativePath} eliminado del storage exitosamente.`);
      }

      const { error: dbError } = await supabase
        .from('recuerdos')
        .delete()
        .eq('id', recuerdo.id);

      if (dbError) {
        console.error('Error al eliminar recuerdo de la DB:', dbError);
        throw new Error(`Error al eliminar el registro de la base de datos: ${dbError.message}`);
      }

      console.log('Recuerdo eliminado de la DB exitosamente.');

      const { count, error: countError } = await supabase
        .from('recuerdos')
        .select('*', { count: 'exact', head: true }) 
        .eq('capsula_id', capsuleId);

      if (countError) {
        console.warn('No se pudo contar los recuerdos restantes, la portada podría no limpiarse:', countError);
      } else if (count === 0) {
        console.log(`Era el último recuerdo de la cápsula ${capsuleId}. Eliminando la cápsula completa.`);
        const { error: deleteCapsuleError } = await supabase
          .from('capsulas')
          .delete() 
          .eq('id', capsuleId);

        if (deleteCapsuleError) {
          console.error('Error al eliminar la cápsula vacía:', deleteCapsuleError);
          alert(`Se eliminó el último recuerdo, pero hubo un error al intentar eliminar la cápsula automáticamente: ${deleteCapsuleError.message}`);
        } else {
          console.log(`Cápsula ${capsuleId} eliminada exitosamente.`);
          alert('Se eliminó el último recuerdo y la cápsula ha sido eliminada. Serás redirigido al dashboard.'); 
          router.push('/dashboard'); 
          return; 
        }
      }

      setRecuerdos(prev => prev.filter(r => r.id !== recuerdo.id));
      console.log('Estado de recuerdos actualizado en la UI.');
    } catch (error: any) {
      console.error('Error general durante la eliminación del recuerdo:', error);
      alert(`Se produjo un error al intentar eliminar el recuerdo: ${error.message || 'Error desconocido'}`);
    }
  };

  // Prepare slides for the lightbox, filtering only images and videos
  const lightboxSlides = useMemo<(SlideImage | SlideVideo)[]>(() => { // Explicitly type the return array
    return recuerdos
      .filter(r => r.tipo === 'foto' || r.tipo === 'video')
      .map(r => {
        // Usar la imagen mejorada si existe, igual que en el thumbnail/detalle
        const publicUrl = getPublicUrl(r.url_mejorado ? r.url_mejorado : r.url_archivo);
        if (r.tipo === 'foto') {
          // Explicitly cast to SlideImage
          return { type: 'image', src: publicUrl, alt: r.descripcion || r.nombre_archivo } as SlideImage;
        } else { // video
          // Determine MIME type based on file extension
          const fileExtension = r.nombre_archivo?.split('.').pop()?.toLowerCase();
          let mimeType = 'video/mp4'; // Default
          if (fileExtension === 'webm') {
            mimeType = 'video/webm';
          } else if (fileExtension === 'ogg') {
             mimeType = 'video/ogg';
          } // Add more types if needed

          // Explicitly cast to SlideVideo
          return {
            type: 'video',
            sources: [{ src: publicUrl, type: mimeType }], // Use dynamic MIME type
            width: 1920, // Optional: Provide dimensions if known
            height: 1080,
            autoPlay: true, // Autoplay in lightbox
          } as SlideVideo;
        }
      });
  }, [recuerdos]); // Recalculate when recuerdos change

  const openLightbox = (recuerdoId: string) => {
    const index = recuerdos
      .filter(r => r.tipo === 'foto' || r.tipo === 'video')
      .findIndex(r => r.id === recuerdoId);
    if (index !== -1) {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };


  const renderRecuerdoContent = (recuerdo: Recuerdo) => {
    // Mostrar la imagen mejorada si existe, si no la original
    const publicUrl = getPublicUrl(recuerdo.url_mejorado ? recuerdo.url_mejorado : recuerdo.url_archivo);

    switch (recuerdo.tipo) {
      case 'foto':
        return (
          <div className="relative aspect-video bg-gray-50 flex items-center justify-center cursor-pointer" onClick={() => openLightbox(recuerdo.id)}>
            {publicUrl ? (
              <>
                <img
                  src={publicUrl}
                  alt={recuerdo.descripcion || recuerdo.nombre_archivo}
                  className="w-full h-full object-cover rounded-md pointer-events-none" // pointer-events-none to ensure parent div click
                  onError={(e) => {
                    console.error('Error cargando imagen:', publicUrl);
                    // Hide broken image
                    e.currentTarget.style.display = 'none';
                    // Fallback seguro: mostrar un div placeholder si no existe ya
                    const parent = e.currentTarget.parentElement?.parentElement;
                    if (parent && !parent.querySelector('.image-error-fallback')) {
                      const fallbackEl = document.createElement('div');
                      fallbackEl.className = 'image-error-fallback flex flex-col items-center justify-center absolute inset-0 bg-gray-100 pointer-events-none';
                      fallbackEl.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 mb-2">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                          <circle cx="9" cy="9" r="2"></circle>
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                        </svg>
                        <p class="text-xs text-gray-500">Error al cargar imagen</p>
                        <p class="text-xs text-gray-400 mt-1">${recuerdo.nombre_archivo}</p>
                      `;
                      parent.appendChild(fallbackEl);
                    }
                  }}
                />
                {/* Fallback placeholder initially hidden, shown by onError */}
                {/* <div className="image-error-fallback hidden absolute inset-0 flex-col items-center justify-center bg-gray-100 pointer-events-none">
                  <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500">Error al cargar imagen</p>
                  <p className="text-xs text-gray-400 mt-1">{recuerdo.nombre_archivo}</p>
                </div> */}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center pointer-events-none"> {/* Added pointer-events-none */}
                <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-xs text-gray-500">No hay vista previa</p>
              </div>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="p-3 bg-gray-50 rounded-md"> {/* Audio not clickable for lightbox */}
            <audio
              controls
              className="w-full"
              src={publicUrl}
            >
              Tu navegador no soporta el elemento de audio.
            </audio>
          </div>
        );
      case 'video':
        // Restore original rendering using Lightbox
        return (
          <div className="relative aspect-video bg-gray-50 cursor-pointer" onClick={() => openLightbox(recuerdo.id)}>
             {/* Overlay Play Icon */}
             <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="10 8 16 12 10 16 10 8"></polygon>
                </svg>
             </div>
            <video
              // controls removed, rely on lightbox
              preload="metadata"
              // Use h-full object-cover to fill container for preview
              className="w-full h-full object-cover rounded-md pointer-events-none"
              src={publicUrl ? `${publicUrl}#t=1` : undefined} // Añadido #t=1 y chequeo null/undefined
            >
              Tu navegador no soporta el elemento de video.
            </video>
          </div>
        );
      default:
        return (
          <div className="p-3 bg-gray-50 rounded-md flex justify-center items-center"> {/* Other types not clickable */}
            <p className="text-gray-500">Vista previa no disponible</p>
          </div>
        );
    }
  };

  const getRecuerdoIcon = (tipo: string) => {
    switch (tipo) {
      case 'foto':
        return <ImageIcon size={18} className="text-azul-profundo" />;
      case 'audio':
        return <FileAudio size={18} className="text-azul-profundo" />;
      case 'video':
        return <FileVideo size={18} className="text-azul-profundo" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-blanco-hueso p-4 sm:p-6">
        <div className="flex justify-center items-center mt-12">
          <Loader2 className="w-8 h-8 animate-spin text-azul-profundo" />
          <span className="ml-3 text-azul-profundo">Cargando detalles de la cápsula...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-blanco-hueso p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-700 mt-6">
          <p>{error}</p>
          <button 
            onClick={handleBack}
            className="mt-3 text-sm font-medium text-azul-profundo hover:underline flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" /> Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!capsula) {
    return (
      <div className="flex flex-col min-h-screen bg-blanco-hueso p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-yellow-700 mt-6">
          <p>No se encontró la cápsula o no tienes permiso para verla.</p>
          <button 
            onClick={handleBack}
            className="mt-3 text-sm font-medium text-azul-profundo hover:underline flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" /> Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    // Add drag and drop handlers to the main container
    <div
      className={`flex flex-col min-h-screen bg-blanco-hueso p-4 sm:p-6 relative pb-20 transition-colors duration-200 ${isDraggingOver ? 'bg-teal-50 border-2 border-dashed border-teal-400' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Optional: Visual cue for drop zone */}
      {isDraggingOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <p className="text-teal-600 font-semibold text-lg bg-white/80 p-4 rounded-lg shadow">
                  Suelta los archivos aquí para subirlos
              </p>
          </div>
      )}
      <button
        onClick={() => router.push('/dashboard')} // Changed from router.back() to router.push('/dashboard')
        className="mb-4 text-azul-profundo hover:underline flex items-center text-sm font-medium z-20" // Ensure button is clickable over drop zone indicator
      >
        <ArrowLeft size={16} className="mr-1" /> Volver al Dashboard
      </button>

      {/* --- Editable Capsule Title --- */}
      {editingCapsulaField === 'titulo' ? (
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="text"
            value={editCapsulaValue}
            onChange={(e) => setEditCapsulaValue(e.target.value)}
            onKeyDown={handleCapsulaEditKeyDown}
            onBlur={handleUpdateCapsuleDetails}
            className="text-3xl font-bold font-serif text-azul-profundo border border-dorado-claro rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-dorado-claro"
            autoFocus
          />
          <button onClick={handleUpdateCapsuleDetails} className="text-green-600 hover:text-green-800 p-1"><Check size={18} /></button>
          <button onClick={cancelEditingCapsula} className="text-red-600 hover:text-red-800 p-1"><X size={18} /></button>
        </div>
      ) : (
        <div className="flex items-center group cursor-pointer mb-2" onClick={() => startEditingCapsula('titulo')}>
          <h1 className="text-3xl font-bold font-serif text-azul-profundo">{capsula.titulo}</h1>
          <Pencil size={16} className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
         </div>
       )}

       {/* Share Button removed */}

      {/* --- Editable Capsule Description --- */}
       {editingCapsulaField === 'descripcion' ? (
         <div className="flex items-start space-x-2 mb-6">
           <textarea
             value={editCapsulaValue}
             onChange={(e) => setEditCapsulaValue(e.target.value)}
             onKeyDown={handleCapsulaEditKeyDown}
             onBlur={handleUpdateCapsuleDetails}
             className="text-gris-calido border border-dorado-claro rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-dorado-claro resize-none"
             rows={3}
             autoFocus
           />
           <div className="flex flex-col space-y-1">
             <button onClick={handleUpdateCapsuleDetails} className="text-green-600 hover:text-green-800 p-1"><Check size={18} /></button>
             <button onClick={cancelEditingCapsula} className="text-red-600 hover:text-red-800 p-1"><X size={18} /></button>
           </div>
         </div>
       ) : (
         <div className="flex items-start group cursor-pointer mb-6" onClick={() => startEditingCapsula('descripcion')}>
           <p className={`text-gris-calido ${!capsula.descripcion ? 'italic text-gray-400' : ''}`}>
             {capsula.descripcion || 'Añadir descripción a la cápsula...'}
           </p>
           <Pencil size={14} className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
         </div>
       )}


      {uploadError &&
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {uploadError}
        </div>
      }

      {/* Contador de mejoras IA */}
      <div className="mb-2 flex items-center gap-3">
        <span className="text-sm text-purple-700 font-semibold">
          Mejoras IA usadas: {iaUsadas} / {iaMaxMejoras} ({iaPlan})
        </span>
        {iaUsadas >= iaMaxMejoras && (
          <span className="text-xs text-red-600 font-bold">Límite alcanzado</span>
        )}
        {iaUsadas >= iaMaxMejoras && (
          <button
            className="ml-2 px-3 py-1 bg-yellow-400 text-azul-profundo rounded font-semibold text-xs hover:bg-yellow-500"
            onClick={() => window.open('/planes', '_blank')}
          >
            Mejorar plan
          </button>
        )}
      </div>
      <h2 className="text-2xl font-semibold font-serif text-azul-profundo mb-4 border-t border-gray-200 pt-6">Recuerdos Guardados</h2>
      {recuerdos.length > 0 ? (
        <div className="flex overflow-x-auto snap-x snap-mandatory space-x-4 scrollbar-hide sm:grid sm:grid-cols-3 sm:gap-4">
          {recuerdos.map((recuerdo) => (
            <div
              key={recuerdo.id}
              className="flex-shrink-0 w-11/12 sm:w-48 h-auto object-cover rounded snap-center bg-white border border-gray-200 overflow-hidden flex flex-col shadow-sm relative"
            >
              {/* Icono de edición de metadata */}
              <button
                className="absolute top-2 right-2 z-10 p-1 bg-white/80 rounded-full hover:bg-dorado-claro transition-colors"
                title="Editar fecha y ubicación"
                onClick={() => handleOpenMetadataEditor(recuerdo)}
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                <Edit3 size={16} className="text-gray-400 hover:text-azul-profundo" />
              </button>
              {/* Modal de edición de metadata */}
              {editingMetadataId === recuerdo.id && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-2xl md:max-w-3xl min-h-[500px] md:min-h-[700px] flex flex-col justify-center relative">
                    <button
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      onClick={handleCloseMetadataEditor}
                    >
                      <X size={20} />
                    </button>
                    <RecuerdoMetadataEditor
                      recuerdoId={recuerdo.id}
                      fecha_real={editingMetadata?.fecha_real ?? null}
                      latitud={editingMetadata?.latitud ?? null}
                      longitud={editingMetadata?.longitud ?? null}
                      isPortada={
                        capsula?.portada_url ===
                        (recuerdo.url_mejorado || recuerdo.url_archivo)
                      }
                      onSetPortada={async () => {
                        if (!capsula) return;
                        // Usar la versión mejorada si existe, si no la original
                        const nuevaPortada = recuerdo.url_mejorado || recuerdo.url_archivo;
                        if (!nuevaPortada) return;
                        const { error } = await supabase
                          .from('capsulas')
                          .update({ portada_url: nuevaPortada })
                          .eq('id', capsula.id);
                        if (error) {
                          toast.error("Error al actualizar la portada de la cápsula");
                        } else {
                          setCapsula(prev => prev ? { ...prev, portada_url: nuevaPortada } : prev);
                          toast.success("Portada de la cápsula actualizada");
                        }
                      }}
                      onSave={handleSaveMetadata}
                      onCancel={handleCloseMetadataEditor}
                    />
                    {savingMetadata && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
                        <Loader2 className="animate-spin text-azul-profundo" />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex-grow">
                {renderRecuerdoContent(recuerdo)}
              </div>
              <div className="p-3 border-t border-gray-100 bg-white">
                <div className="flex justify-between items-start space-x-2 mb-2"> {/* Added mb-2 */}
                  <div className="min-w-0 flex-1"> {/* Added flex-1 */}
                    {/* --- Editable Title (Recuerdo) --- */}
                    {editingRecuerdoField?.id === recuerdo.id && editingRecuerdoField?.field === 'titulo' ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          value={editRecuerdoValue}
                          onChange={(e) => setEditRecuerdoValue(e.target.value)}
                          onKeyDown={handleRecuerdoEditKeyDown} // Use specific handler
                          onBlur={handleUpdateRecuerdoDetails} // Save on blur
                          className="text-sm font-medium text-azul-profundo border border-dorado-claro rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-dorado-claro"
                          autoFocus
                        />
                        <button onClick={handleUpdateRecuerdoDetails} className="text-green-600 hover:text-green-800 p-0.5"><Check size={14} /></button>
                        <button onClick={cancelEditingRecuerdo} className="text-red-600 hover:text-red-800 p-0.5"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center group cursor-pointer" onClick={() => startEditingRecuerdo(recuerdo, 'titulo')}>
                        {/* Add User icon wrapped in span for tooltip */}
                        {currentUserId === recuerdo.usuario_id && (
                          <span title="Añadido por ti" className="flex-shrink-0 mr-1.5"> {/* Wrapper span with title */}
                            <User size={14} className="text-blue-500" />
                          </span>
                        )}
                        <span className="text-sm font-medium text-azul-profundo truncate" title={recuerdo.titulo_personalizado || recuerdo.nombre_archivo}>
                          {recuerdo.titulo_personalizado || recuerdo.nombre_archivo || `Recuerdo sin título`}
                        </span>
                        {/* Only show edit pencil if user owns the recuerdo */}
                        {currentUserId === recuerdo.usuario_id && (
                           <Pencil size={12} className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    )}
                     {/* --- Original Filename (always visible) --- */}
                     <p className="text-xs text-gris-calido mt-0.5 truncate" title={recuerdo.nombre_archivo}>
                       ({recuerdo.nombre_archivo}) {/* Show original filename for reference */}
                     </p>
                  </div>
                   {/* --- Action Icons --- */}
                  <div className="flex items-center space-x-1 text-gray-400 flex-shrink-0">
                    <button
                      className={`hover:text-purple-500 p-1 ${iaLoadingId === recuerdo.id ? "animate-pulse opacity-60" : ""}`}
                      title="Mejorar con IA"
                      onClick={() => handleImproveIA(recuerdo)}
                      disabled={iaLoadingId !== null}
                    >
                      {iaLoadingId === recuerdo.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <BrainCircuit size={16} />
                      )}
                    </button>
                    <button 
                      className="hover:text-blue-500 p-1" 
                      title="Compartir (Próximamente)"
                      onClick={() => console.log('Share Clicked for:', recuerdo.id)} // Placeholder
                    >
                      <Share2 size={16} />
                    </button>
                    {/* Favorite Button (only for audio/video and owner) */}
                    {(recuerdo.tipo === 'audio' || recuerdo.tipo === 'video') && currentUserId === recuerdo.usuario_id && (
                      <button
                        className={`p-1 ${recuerdo.es_favorito ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                        title={recuerdo.es_favorito ? "Quitar de favoritos" : "Marcar como favorito"}
                        onClick={() => handleToggleFavorite(recuerdo)}
                      >
                        <Star size={16} fill={recuerdo.es_favorito ? "currentColor" : "none"} />
                      </button>
                    )}
                    <button
                      className={`p-1 ${recuerdo.anclado ? 'text-dorado-claro hover:text-yellow-600' : 'text-gray-400 hover:text-dorado-claro'}`}
                      title={recuerdo.anclado ? "Desanclar recuerdo" : "Anclar recuerdo"}
                      onClick={() => handleTogglePin(recuerdo)}
                    >
                      {recuerdo.anclado ? <Pin size={16} fill="currentColor" /> : <Pin size={16} />}
                    </button>
                    <button
                      className={`p-1 text-gray-400 ${
                        currentUserId && capsula && (currentUserId === recuerdo.usuario_id || currentUserId === capsula.usuario_id)
                          ? 'hover:text-red-500' // Enable hover effect if allowed
                          : 'opacity-50 cursor-not-allowed' // Disable if not allowed
                      }`}
                      title={
                        currentUserId && capsula && (currentUserId === recuerdo.usuario_id || currentUserId === capsula.usuario_id)
                          ? "Eliminar recuerdo"
                          : "No puedes eliminar este recuerdo"
                      }
                      onClick={(e) => {
                        e.stopPropagation(); // Always stop propagation
                        if (currentUserId && capsula && (currentUserId === recuerdo.usuario_id || currentUserId === capsula.usuario_id)) {
                          handleDeleteRecuerdo(recuerdo); // Only call delete if allowed
                        }
                      }}
                      disabled={!(currentUserId && capsula && (currentUserId === recuerdo.usuario_id || currentUserId === capsula.usuario_id))} // Explicitly disable button
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                 {/* --- Editable Description (Recuerdo) --- */}
                 <div className="mt-1 group cursor-pointer" onClick={() => editingRecuerdoField?.id !== recuerdo.id && startEditingRecuerdo(recuerdo, 'descripcion')}>
                   {editingRecuerdoField?.id === recuerdo.id && editingRecuerdoField?.field === 'descripcion' ? (
                     <div className="flex items-start space-x-1">
                       <textarea
                         value={editRecuerdoValue}
                         onChange={(e) => setEditRecuerdoValue(e.target.value)}
                         onKeyDown={handleRecuerdoEditKeyDown} // Use specific handler
                         onBlur={handleUpdateRecuerdoDetails} // Save on blur
                         className="text-xs text-gray-600 border border-dorado-claro rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-dorado-claro resize-none"
                         rows={2}
                         autoFocus
                       />
                       <div className="flex flex-col">
                         <button onClick={handleUpdateRecuerdoDetails} className="text-green-600 hover:text-green-800 p-0.5"><Check size={14} /></button>
                         <button onClick={cancelEditingRecuerdo} className="text-red-600 hover:text-red-800 p-0.5"><X size={14} /></button>
                       </div>
                     </div>
                   ) : (
                     <div className="flex items-start">
                       <p className={`text-xs text-gray-600 ${!recuerdo.descripcion ? 'italic text-gray-400' : ''}`}>
                         {recuerdo.descripcion || 'Añadir descripción...'}
                       </p>
                       <Pencil size={12} className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                     </div>
                   )}
                 </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gris-calido">Aún no has añadido ningún recuerdo a esta cápsula. Haz clic en el botón + para empezar.</p>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        multiple // Allow multiple file selection
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={`fixed bottom-6 right-6 bg-dorado-claro hover:bg-yellow-500 text-azul-profundo rounded-full p-4 shadow-lg transition-all duration-300 ${isUploading ? 'opacity-50 cursor-not-allowed scale-90' : 'opacity-100 hover:scale-105'} z-20`} // Ensure button is clickable over drop zone indicator
        aria-label="Añadir Recuerdo"
      >
        {isUploading ? (
          <Loader2 className="animate-spin h-6 w-6" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
      </button>

      {/* Lightbox Component */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxIndex}
        plugins={[Video]}
        video={{ autoPlay: true }} // Ensure videos autoplay in lightbox
      />

      {/* Modal Comparador IA */}
{/* Modal de comparación IA: render condicional según tipo */}
{iaShowModal && iaRecuerdoId && (() => {
  // Buscar el recuerdo actual para obtener el tipo
  const recuerdoActual = recuerdos.find(r => r.id === iaRecuerdoId);
  if (!recuerdoActual) return null;

  if (recuerdoActual.tipo === 'foto') {
    // Modal para imágenes: slider
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-2xl w-full relative font-sans text-azul-profundo">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            onClick={() => setIaShowModal(false)}
          >
            <X size={24} />
          </button>
          <h3 className="text-lg font-bold mb-4">Comparar mejora IA - Imagen</h3>
          {iaError && (
            <div className="mb-2 p-2 bg-red-100 text-red-700 rounded">{iaError}</div>
          )}
          <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-xl">
              {iaOriginalUrl && iaMejoradaUrl ? (
                <ReactCompareSlider
                  itemOne={
                    <img
                      src={iaOriginalUrl}
                      alt="Original"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        borderRadius: 8,
                        background: "#f3f4f6"
                      }}
                    />
                  }
                  itemTwo={
                    <img
                      src={iaMejoradaUrl}
                      alt="Mejorada IA"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        borderRadius: 8,
                        background: "#f3f4f6"
                      }}
                    />
                  }
                  style={{
                    width: "100%",
                    maxWidth: 480,
                    height: 320,
                    borderRadius: 8,
                    boxShadow: "0 2px 8px #0001",
                    background: "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  handle={<div style={{ width: 4, height: "100%", background: "#a855f7", borderRadius: 2 }} />}
                  onlyHandleDraggable
                  position={50}
                />
              ) : (
                <div className="text-gray-400">Cargando imágenes...</div>
              )}
            </div>
            <div className="flex gap-4 mt-4">
              <button
                className="bg-dorado-claro text-azul-profundo px-4 py-2 rounded hover:shadow-md font-semibold"
                onClick={() => handleGuardarMejoraIA(false, iaRecuerdoId!)}
                disabled={iaLoadingId !== null}
              >
                Mantener original
              </button>
              <button
                className="bg-dorado-claro text-azul-profundo px-4 py-2 rounded hover:shadow-md font-semibold"
                onClick={() => handleGuardarMejoraIA(true, iaRecuerdoId!)}
                disabled={iaLoadingId !== null}
              >
                Guardar mejora IA
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (recuerdoActual.tipo === 'audio') {
    // Modal para audio: reproductores
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-2xl w-full relative font-sans text-azul-profundo">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            onClick={() => setIaShowModal(false)}
          >
            <X size={24} />
          </button>
          <h3 className="text-lg font-bold mb-4">Comparar mejora IA - Audio</h3>
          {iaError && (
            <div className="mb-2 p-2 bg-red-100 text-red-700 rounded">{iaError}</div>
          )}
          <div className="flex flex-col items-center gap-6">
            <div className="flex w-full max-w-xl gap-6">
              <div className="flex flex-col items-center bg-blanco-hueso rounded-2xl shadow-sm p-4 flex-1">
                <span className="mb-2 font-semibold">Original</span>
                {iaOriginalUrl ? (
                  <audio
                    controls
                    src={iaOriginalUrl}
                    className="w-full rounded-md"
                  >
                    Tu navegador no soporta el elemento de audio.
                  </audio>
                ) : (
                  <div className="text-gray-400">Cargando audio original...</div>
                )}
              </div>
              <div className="flex flex-col items-center bg-blanco-hueso rounded-2xl shadow-sm p-4 flex-1">
                <span className="mb-2 font-semibold">Mejorado IA</span>
                {iaMejoradaUrl ? (
                  <audio
                    controls
                    src={iaMejoradaUrl}
                    className="w-full rounded-md"
                  >
                    Tu navegador no soporta el elemento de audio.
                  </audio>
                ) : (
                  <div className="text-gray-400">Cargando audio mejorado...</div>
                )}
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                className="bg-dorado-claro text-azul-profundo px-4 py-2 rounded hover:shadow-md font-semibold"
                onClick={() => handleGuardarMejoraIA(false, iaRecuerdoId!)}
                disabled={iaLoadingId !== null}
              >
                Mantener original
              </button>
              <button
                className="bg-dorado-claro text-azul-profundo px-4 py-2 rounded hover:shadow-md font-semibold"
                onClick={() => handleGuardarMejoraIA(true, iaRecuerdoId!)}
                disabled={iaLoadingId !== null}
              >
                Guardar mejora IA
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Otros tipos: fallback
  return null;
})()}

      {/* Modal para restaurar mejora IA */}
      {showRestoreIaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
              onClick={() => setShowRestoreIaModal(null)}
            >
              <X size={24} />
            </button>
            <h3 className="text-lg font-bold mb-4 text-azul-profundo">Imagen ya mejorada</h3>
            <p className="mb-4 text-gray-700">
              Esta imagen ya fue mejorada con IA.<br />
              ¿Quieres restaurar la imagen original?
            </p>
            <div className="flex gap-4 justify-end">
              <button
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 font-semibold"
                onClick={() => setShowRestoreIaModal(null)}
              >
                Cancelar
              </button>
              <button
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-semibold"
                onClick={async () => {
                  setShowRestoreIaModal(null);
                  await handleGuardarMejoraIA(false, showRestoreIaModal.recuerdo.id);
                }}
              >
                Restaurar original
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal rendering removed */}
    </div>
  );
}
