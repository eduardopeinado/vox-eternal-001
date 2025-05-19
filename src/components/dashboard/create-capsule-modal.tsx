'use client';
const markerIcon2x = "/leaflet/marker-icon-2x.png";
const markerIcon = "/leaflet/marker-icon.png";
const markerShadow = "/leaflet/marker-shadow.png";

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import ExifReader from 'exifreader';
import heic2any from 'heic2any';
import { X, UploadCloud, Image as ImageIcon, FileText, Music, Video, Trash2, BrainCircuit, Share2, Heart, FileAudio, FileVideo, FileImage, Loader2, CheckCircle, Edit3, RotateCw, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import CapsuleLocationMapGL from '../../../sandbox/components/CapsuleLocationMapGL';

// Interfaz para describir un archivo en el estado local
interface CapsuleFile {
  id: string;
  file: File; // Guardamos el objeto File original
  name: string;
  type: string;
  preview: string; // URL.createObjectURL
  description: string;
  isUploading: boolean; // Nuevo estado
  uploadProgress?: number; // Futuro: para progreso detallado
  uploadError?: string; // Futuro: para error por archivo
  latitud: number | null;
  longitud: number | null;
  fecha_real: string | null;
  ubicacion_manual: boolean;
  isEditing: boolean; // Para controlar si la tarjeta está en modo edición
}

interface CreateCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Añadimos un callback para notificar al Dashboard que se creó una cápsula
  onCapsuleCreated?: () => void;
}

import { PlanName, canUseMejoraIA, getUpgradeMessage } from "@/lib/planFeatures";
import { useCapsuleUpload } from "@/hooks/useCapsuleUpload";

interface CreateCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapsuleCreated?: () => void;
  initialFiles?: File[]; // Nueva prop para archivos iniciales
  plan?: PlanName | null; // Nuevo: plan del usuario
  mejorasIaUsadas?: number | null; // Nuevo: contador de mejoras IA usadas
}

const CreateCapsuleModal: React.FC<CreateCapsuleModalProps> = ({
  isOpen,
  onClose,
  onCapsuleCreated,
  initialFiles = [],
  plan = null,
  mejorasIaUsadas = null,
}) => {
  const [title, setTitle] = useState('');

  // Configuración de íconos de Leaflet SOLO en cliente y solo una vez
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIcon2x,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
      });
    }
  }, []);
  // Usar el tipo CapsuleFile para el estado
  const [files, setFiles] = useState<CapsuleFile[]>([]);

  // Al abrir el modal, inicializar los archivos con los iniciales si los hay
  useEffect(() => {
    if (isOpen && initialFiles.length > 0) {
      // Mapear initialFiles a CapsuleFile
      Promise.all(initialFiles.map(async (file) => {
        if (!(file instanceof File)) {
          // eslint-disable-next-line no-console
          console.warn('[CapsuleModal] Archivo ignorado: no es instancia de File', file);
          return null;
        }
        // Validación extra: nunca aceptar un objeto como preview
        if (file.type === "image/svg+xml") {
          // eslint-disable-next-line no-console
          console.warn('[CapsuleModal] Archivo SVG ignorado para previsualización:', file.name);
          return null;
        }
        const exifData = await extractExifData(file);
        let preview = "";
        if (typeof window !== "undefined") {
          // Siempre usar una URL local para previsualización antes de la subida. Nunca usar una URL pública aquí.
          preview = URL.createObjectURL(file);
        }
        // Validación estricta: preview debe ser string y no debe contener "[object"
        if (
          typeof preview !== "string" ||
          preview.startsWith("[object") ||
          preview === "" ||
          preview === undefined
        ) {
          // eslint-disable-next-line no-console
          console.warn('[CapsuleModal] Preview inválido, se ignora archivo:', file, preview);
          return null;
        }
        return {
          id: Math.random().toString(36).substring(7),
          file: file,
          name: file.name,
          type: file.type,
          preview,
          description: '',
          isUploading: false,
          latitud: exifData.latitud ?? null,
          longitud: exifData.longitud ?? null,
          fecha_real: exifData.fecha_real ?? null,
          ubicacion_manual: false,
          isEditing: false,
        };
      })).then(mappedFiles => {
        setFiles(mappedFiles.filter(item => item !== null) as CapsuleFile[]);
      });
    }
  }, [isOpen, initialFiles]);
  const [creationStatus, setCreationStatus] = useState<'idle' | 'uploading' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hook de subida modular
  const { uploadFiles, loading: uploadLoading, error: uploadError, progress: uploadProgress, reset: resetUpload } = useCapsuleUpload();

  // Resetear estado complejo al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => { // Delay para permitir animación de salida antes del reset
        setTitle('');
        files.forEach(file => URL.revokeObjectURL(file.preview));
        setFiles([]);
        setCreationStatus('idle');
        setErrorMessage(null);
      }, 300); // Coincidir con duración de animación
    }
    // Limpieza al desmontar (igual que antes)
    return () => {
      files.forEach(file => URL.revokeObjectURL(file.preview));
    };
  // Solo depender de isOpen para el reset principal
  // El estado interno de files se maneja en su propio ciclo
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [isOpen]);

  const extractExifData = async (file: File): Promise<{ latitud: number | null, longitud: number | null, fecha_real: string | null }> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const tags = ExifReader.load(arrayBuffer);
      let latitud: number | null = null;
      let longitud: number | null = null;
      let fecha_real: string | null = null;

      if (tags.GPSLatitude && tags.GPSLongitude) {
        const toDecimal = (gpsData: any) => {
          const [deg, min, sec] = gpsData.description.split(' ').map((v: string) => parseFloat(v));
          return deg + min / 60 + sec / 3600;
        };
        latitud = toDecimal(tags.GPSLatitude);
        longitud = toDecimal(tags.GPSLongitude);
      }

      if (tags.DateTimeOriginal) {
        fecha_real = tags.DateTimeOriginal.description.replace(/:/g, '-').replace(' ', 'T');
      }

      return { latitud, longitud, fecha_real };
    } catch (error) {
      console.warn('Error extrayendo metadata EXIF:', error);
      return { latitud: null, longitud: null, fecha_real: null };
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      // Validar archivos antes de agregarlos
      const { filterValidCapsuleFiles } = require('@/lib/utils');
      let inputFiles = Array.from(event.target.files);

      // 1. Convertir archivos .heic/.heif a jpg usando heic2any
      const convertedFiles: File[] = [];
      for (const file of inputFiles) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'heic' || ext === 'heif') {
          try {
            const jpgBlob = await heic2any({
              blob: file,
              toType: "image/jpeg",
              quality: 0.92
            });
            // heic2any puede devolver un Blob o un array de Blobs
            const jpgBlobFinal = Array.isArray(jpgBlob) ? jpgBlob[0] : jpgBlob;
            const jpgFile = new File(
              [jpgBlobFinal],
              file.name.replace(/\.(heic|heif)$/i, '.jpg'),
              { type: "image/jpeg" }
            );
            convertedFiles.push(jpgFile);
          } catch (err) {
            toast.error(`Error al convertir ${file.name} a JPG: ${err instanceof Error ? err.message : 'desconocido'}`);
          }
        } else {
          convertedFiles.push(file);
        }
      }

      const { validFiles, errors } = filterValidCapsuleFiles(
        convertedFiles,
        files.map(f => f.file)
      );
      if (errors.length > 0) {
        errors.forEach(({ file, reason }: { file: File; reason: string }) => {
          toast.error(`${file.name}: ${reason}`);
        });
      }
      if (validFiles.length > 0) {
        // Mapear los archivos válidos al formato CapsuleFile
        const newFiles: CapsuleFile[] = await Promise.all(validFiles.map(async (file: File) => {
          if (!(file instanceof File)) {
            // eslint-disable-next-line no-console
            console.warn('[CapsuleModal] Archivo ignorado: no es instancia de File', file);
            return null;
          }
          if (file.type === "image/svg+xml") {
            // eslint-disable-next-line no-console
            console.warn('[CapsuleModal] Archivo SVG ignorado para previsualización:', file.name);
            return null;
          }
          const exifData = await extractExifData(file);
          let preview = "";
          if (typeof window !== "undefined") {
            // Siempre usar una URL local para previsualización antes de la subida. Nunca usar una URL pública aquí.
            preview = URL.createObjectURL(file);
          }
          if (typeof preview !== "string") {
            // eslint-disable-next-line no-console
            console.warn('[CapsuleModal] Preview inválido, se ignora archivo:', file);
            return null;
          }
          return {
            id: Math.random().toString(36).substring(7),
            file: file,
            name: file.name,
            type: file.type,
            preview,
            description: '',
            isUploading: false,
            latitud: exifData.latitud ?? null,
            longitud: exifData.longitud ?? null,
            fecha_real: exifData.fecha_real ?? null,
            ubicacion_manual: false,
            isEditing: false,
          };
        }));
        setFiles(prevFiles => [...prevFiles, ...(newFiles.filter(item => item !== null) as CapsuleFile[])]);
      }
      // Limpiar el valor del input para permitir seleccionar el mismo archivo de nuevo
      event.target.value = "";
    }
  };

  const handleDescriptionChange = (fileId: string, description: string) => {
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === fileId ? { ...file, description } : file
      )
    );
  };

  const handleRemoveFile = (fileId: string) => {
     // Encontrar el archivo a eliminar para revocar su URL
     const fileToRemove = files.find(file => file.id === fileId);
     if (fileToRemove) {
       URL.revokeObjectURL(fileToRemove.preview);
     }
     // Filtrar el archivo del estado
     setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  };

  const handleCreateCapsule = async () => {
    if (!title || files.length === 0 || creationStatus !== 'idle') return;
    
    setCreationStatus('uploading');
    setErrorMessage(null);

    let userId: string | undefined;
    let uploadedFilesData: { path: string; description: string; original_filename: string; file_type: string }[] = [];

    try {
      // 1. Obtener User ID (con logs de diagnóstico)
      console.log('[handleCreateCapsule] Intentando obtener usuario...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // Log detallado del resultado
      console.log('[handleCreateCapsule] Resultado de getUser:', { user, userError }); 

      if (userError || !user) {
         // Si hay error o no hay usuario, lanzar el error
         console.error('[handleCreateCapsule] Error al obtener usuario o usuario nulo.');
        throw new Error(userError?.message || 'Auth session missing!'); // Mantenemos el error claro
      }
      userId = user.id;
      console.log('[handleCreateCapsule] Usuario obtenido con ID:', userId);

      // 2. Subir Archivos a Storage usando el hook modular
      console.log(`[handleCreateCapsule] Iniciando subida para ${files.length} archivos...`);
      try {
        const uploadResults = await uploadFiles(userId, files.map(f => f.file));
        // Mapear resultados a la estructura esperada para la base de datos
        uploadedFilesData = uploadResults.map((result, idx) => ({
          path: result.path,
          description: files[idx]?.description || "",
          original_filename: result.originalFilename,
          file_type: result.fileType,
        }));
      } catch (uploadErr: any) {
        setErrorMessage(uploadErr.message || "Error al subir archivos.");
        setCreationStatus("error");
        setFiles(prev => prev.map(f => ({ ...f, isUploading: false })));
        return;
      }
      console.log('[handleCreateCapsule] Subida a Storage completada.');

      // 3. Guardar en Base de Datos
      setCreationStatus('saving');
      console.log('[handleCreateCapsule] Guardando en Base de Datos...');

      // 3.1 Insertar en 'capsulas'
      const { data: newCapsule, error: capsuleError } = await supabase
        .from('capsulas')
        .insert({
          usuario_id: userId,
          titulo: title,
          // Asignar la primera imagen como portada si hay al menos una foto
          portada_url: uploadedFilesData.find(item => item.file_type.startsWith('image/'))?.path || null,
          // tipo: 'default', // Asignar tipo si es necesario
          // descripcion: 'Alguna descripción general?',
          // publica: false, // Por defecto privada?
        })
        .select()
        .single(); // Pedimos que devuelva la fila creada

      if (capsuleError || !newCapsule) {
        throw new Error(capsuleError?.message || 'Error al crear la entrada de la cápsula en la base de datos.');
      }
      console.log('[handleCreateCapsule] Cápsula creada en DB:', newCapsule);
      const newCapsuleId = newCapsule.id;

      // 3.2 Preparar datos para 'recuerdos'
      const recuerdosToInsert = uploadedFilesData.map(item => {
        // Convertir el MIME type a uno de los valores permitidos: 'foto', 'audio', 'video'
        let tipoNormalizado = 'foto'; // Default
        if (item.file_type.startsWith('image/')) {
          tipoNormalizado = 'foto';
        } else if (item.file_type.startsWith('audio/')) {
          tipoNormalizado = 'audio';
        } else if (item.file_type.startsWith('video/')) {
          tipoNormalizado = 'video';
        }
        
        return {
          usuario_id: userId,
          capsula_id: newCapsuleId,
          url_archivo: item.path, // La ruta devuelta por Storage
          descripcion: item.description, // La descripción que puso el usuario
          nombre_archivo: item.original_filename,
          tipo: tipoNormalizado, // Ahora usamos los valores normalizados ('foto', 'audio', 'video')
          // Otros campos de la tabla 'recuerdos' si son necesarios
        };
      });

      // 3.3 Insertar en 'recuerdos'
      const { error: recuerdosError } = await supabase
        .from('recuerdos')
        .insert(recuerdosToInsert);

      if (recuerdosError) {
        // Aquí podríamos intentar borrar la cápsula creada si falla la inserción de recuerdos (rollback manual)
        console.error('[handleCreateCapsule] Error al guardar los items de la cápsula (recuerdos):', recuerdosError);
        throw new Error(recuerdosError.message || 'Error al guardar los detalles de los archivos en la base de datos.');
      }
      console.log('[handleCreateCapsule] Recuerdos guardados en DB.');

      // 4. Éxito Total
      setCreationStatus('success');
      console.log('[handleCreateCapsule] ¡Cápsula creada exitosamente!');

      // Notificar al componente padre (Dashboard) si se proporcionó el callback
      if (onCapsuleCreated) {
         onCapsuleCreated();
      }

      // Mostrar mensaje de éxito y cerrar después de un delay
      await new Promise(resolve => setTimeout(resolve, 1200)); // Tiempo para ver el mensaje de éxito
      onClose();

    } catch (error: any) {
      console.error('[handleCreateCapsule] Error final:', error);
      setErrorMessage(error.message || 'Ocurrió un error inesperado.');
      setCreationStatus('error');
      // Asegurarse de que todos los estados de subida individual se reseteen si hubo error general
      setFiles(prev => prev.map(f => ({ ...f, isUploading: false })));
    }
    // Nota: No ponemos setIsCreating(false) aquí porque el estado ahora es creationStatus
  };

  // Determinar icono según tipo de archivo (simplificado)
  const getFileIcon = (fileType: string, fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (fileType.startsWith('image/') && extension !== 'heic' && extension !== 'heif') {
      return null; // Usar img tag
    }
    if (extension === 'heic' || extension === 'heif') return <FileImage className="w-10 h-10 text-gray-500" />;
    if (extension === 'bmp') return <FileImage className="w-10 h-10 text-gray-500" />;
    
    if (fileType.startsWith('video/') || extension === 'avi') return <FileVideo className="w-10 h-10 text-gray-500" />;
    
    if (fileType.startsWith('audio/') || extension === 'mp3' || extension === 'm4a' || extension === 'ogg' || extension === 'opus') {
      return <FileAudio className="w-10 h-10 text-gray-500" />;
    }
    
    return <FileText className="w-10 h-10 text-gray-500" />;
  };

  if (!isOpen) return null;

  // Determinar estado y texto del botón principal
  const getButtonState = () => {
      const isDisabled = !title || files.length === 0 || creationStatus === 'uploading' || creationStatus === 'saving' || creationStatus === 'success';
      let buttonText = 'Crear Cápsula';
      let Icon = null;

      if (creationStatus === 'uploading') {
          buttonText = 'Subiendo...';
          Icon = <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />;
      } else if (creationStatus === 'saving') {
          buttonText = 'Guardando...';
           Icon = <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />;
      } else if (creationStatus === 'success') {
          buttonText = '¡Éxito!';
          Icon = <CheckCircle className="-ml-1 mr-2 h-5 w-5" />;
      }
      
      return { isDisabled, buttonText, Icon };
  }
  const { isDisabled, buttonText, Icon: ButtonIcon } = getButtonState();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
      onClick={onClose} 
      aria-labelledby="create-capsule-title"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out transform scale-95 opacity-0 animate-scale-in"
        onClick={(e) => e.stopPropagation()} 
      >
         {/* Header del Modal */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 id="create-capsule-title" className="text-xl font-semibold font-serif text-azul-profundo">Crear Nueva Cápsula</h2>
          <button onClick={onClose} aria-label="Cerrar modal" className="p-1 rounded-full text-gris-calido hover:bg-gray-200 hover:text-azul-profundo transition-colors" disabled={creationStatus === 'uploading' || creationStatus === 'saving'}><X size={24} /></button>
        </div>

        {/* Contenido del Modal (Scrollable) */}
        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          {/* Mostrar error general */}
          {errorMessage && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
              <strong>Error:</strong> {errorMessage}
            </div>
          )}

          {/* Título de la Cápsula */}
          <div>
            <label htmlFor="capsule-title" className="block text-sm font-medium text-azul-profundo mb-1">Título de tu cápsula *</label>
            <input
              type="text"
              id="capsule-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Vacaciones Verano 2024, Notas para mi yo futuro"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-dorado-claro focus:border-dorado-claro"
              required
              disabled={creationStatus !== 'idle'}
            />
          </div>

          {/* Zona de Carga de Archivos */}
          <div>
             <label htmlFor="file-upload" className="block text-sm font-medium text-azul-profundo mb-1">Añade tus recuerdos</label>
            <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md transition-colors ${creationStatus === 'idle' ? 'hover:border-dorado-claro cursor-pointer' : 'bg-gray-100 cursor-not-allowed'}`}>
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className={`relative rounded-md font-medium ${creationStatus === 'idle' ? 'text-dorado-claro hover:text-dorado-claro/80 cursor-pointer bg-white focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-dorado-claro' : 'text-gray-500 cursor-not-allowed'}`}>
                    <span>Haz clic para seleccionar</span>
<input 
  id="file-upload" 
  name="file-upload" 
  type="file" 
  className="sr-only" 
  multiple 
  onChange={handleFileSelect} 
  accept="image/png, image/jpeg, image/gif, image/bmp, image/heic, image/heif, video/mp4, video/quicktime, video/x-msvideo, audio/mpeg, audio/mp4, audio/ogg, audio/opus, audio/aac, audio/wav, audio/m4a, .m4a"
  disabled={creationStatus !== 'idle'}
/>
                  </label>
                  <p className="pl-1">o arrastra y suelta (próximamente)</p>
                </div>
                <p className="text-xs text-gray-500">Fotos, Videos, Audios comunes</p>
              </div>
            </div>
          </div>

          {/* Lista de Archivos Seleccionados/Subidos */}
          {files.length > 0 && (
            <div className="flex overflow-x-auto snap-x snap-mandatory sm:grid sm:grid-cols-3 gap-4">
               <h3 className="text-sm font-medium text-azul-profundo">Archivos añadidos:</h3>
               {(() => {
                 // Log defensivo para detectar elementos undefined o mal formados
                 console.log('[DEBUG] files array:', files);
                 files.forEach((f, idx) => {
                   if (!f) {
                     console.warn(`[DEBUG] files[${idx}] es undefined o null`, f);
                   } else if (typeof f !== 'object' || !('file' in f) || !('name' in f)) {
                     console.warn(`[DEBUG] files[${idx}] estructura inesperada:`, f);
                   }
                 });
                 return null;
               })()}
                 {files.map((capsuleFile) => {
                const FileIcon = getFileIcon(capsuleFile.type, capsuleFile.name);

                // Función para actualizar metadata
                const handleMetaChange = (field: keyof CapsuleFile, value: any) => {
                  setFiles(prevFiles =>
                    prevFiles.map(file =>
                      file.id === capsuleFile.id
                        ? { ...file, [field]: value, ubicacion_manual: field === 'latitud' || field === 'longitud' ? true : file.ubicacion_manual }
                        : file
                    )
                  );
                };

                // Componente para el mapa interactivo
                const LocationMap = ({ lat, lng }: { lat: number; lng: number }) => {
                  const [position, setPosition] = useState<[number, number]>([lat, lng]);
                  const map = useMapEvents({
                    click(e) {
                      setPosition([e.latlng.lat, e.latlng.lng]);
                      handleMetaChange('latitud', e.latlng.lat);
                      handleMetaChange('longitud', e.latlng.lng);
                    }
                  });
                  useEffect(() => {
                    if (lat && lng) {
                      map.setView([lat, lng], 13);
                    }
                  }, [lat, lng, map]);
                  return (
                    <Marker position={position}>
                      <Popup>
                        Arrastra el pin o haz click en el mapa para ajustar la ubicación.
                      </Popup>
                    </Marker>
                  );
                };

                // Tarjeta giratoria
                return (
                  <div
                    key={capsuleFile.id}
                    className="relative"
                    style={{ perspective: 1000 }}
                  >
                    <div
                      className={`transition-transform duration-500 ${capsuleFile.isEditing ? 'rotate-y-180' : ''}`}
                      style={{
                        transformStyle: 'preserve-3d',
                        minHeight: '120px'
                      }}
                    >
                      {/* Cara frontal */}
                      <div
                        className={`flex items-center space-x-3 bg-gray-50 p-3 rounded-md border relative ${capsuleFile.isEditing ? 'invisible' : 'visible'}`}
                        style={{
                          backfaceVisibility: 'hidden',
                          position: 'absolute',
                          width: '100%'
                        }}
                      >
                        {capsuleFile.isUploading && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-md z-10">
                            <Loader2 className="w-6 h-6 text-azul-profundo animate-spin" />
                          </div>
                        )}
                        <div className="flex-shrink-0">
                          {(() => {
                            // Log defensivo para depuración
                            // eslint-disable-next-line no-console
                            console.log(
                              '[DEBUG preview render]',
                              capsuleFile.name,
                              'type:', capsuleFile.type,
                              'preview:', capsuleFile.preview,
                              'typeof preview:', typeof capsuleFile.preview
                            );
                            // Solo renderizar previsualización si el tipo es soportado y la URL es string
                            if (
                              typeof capsuleFile.preview === "string" &&
                              capsuleFile.type.startsWith('image/')
                            ) {
                              return (
                                <img src={capsuleFile.preview} alt={`Previsualización de ${capsuleFile.name}`} className="w-14 h-14 rounded object-cover" />
                              );
                            } else if (
                              typeof capsuleFile.preview === "string" &&
                              capsuleFile.type.startsWith('audio/')
                            ) {
                              return (
                                <audio controls src={capsuleFile.preview} className="w-14 h-14">
                                  Tu navegador no soporta el elemento de audio.
                                </audio>
                              );
                            } else if (
                              typeof capsuleFile.preview === "string" &&
                              capsuleFile.type.startsWith('video/')
                            ) {
                              return (
                                <video controls src={capsuleFile.preview} className="w-14 h-14 object-cover rounded">
                                  Tu navegador no soporta el elemento de video.
                                </video>
                              );
                            } else if (React.isValidElement(FileIcon)) {
                              return FileIcon;
                            } else {
                              return (
                                <FileText className="w-10 h-10 text-gray-500" />
                              );
                            }
                          })()}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate" title={capsuleFile.name}>{capsuleFile.name}</p>
                          <input
                            type="text"
                            value={capsuleFile.description}
                            onChange={(e) => handleDescriptionChange(capsuleFile.id, e.target.value)}
                            placeholder="Añade una descripción (opcional)"
                            className="mt-1 w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-dorado-claro focus:border-dorado-claro"
                            disabled={capsuleFile.isUploading || creationStatus !== 'idle'}
                          />
                        </div>
                        <div className="flex-shrink-0 flex items-center space-x-2">
                          <button
                            onClick={() => setFiles(prevFiles => prevFiles.map(file => file.id === capsuleFile.id ? { ...file, isEditing: true } : file))}
                            title="Editar metadata"
                            className="p-1 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
                            disabled={capsuleFile.isUploading || creationStatus !== 'idle'}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                !plan ||
                                mejorasIaUsadas == null ||
                                !canUseMejoraIA(plan, mejorasIaUsadas)
                              ) {
                                toast.error(getUpgradeMessage("mejorasIA"));
                                return;
                              }
                              // Aquí va la lógica real de mejora IA
                              alert("IA para: " + capsuleFile.name);
                            }}
                            title="Procesar con IA"
                            className={`p-1 text-gray-500 rounded-full hover:bg-gray-200 transition-colors ${
                              capsuleFile.isUploading ||
                              creationStatus !== "idle" ||
                              !plan ||
                              mejorasIaUsadas == null ||
                              !canUseMejoraIA(plan, mejorasIaUsadas)
                                ? "cursor-not-allowed opacity-50"
                                : "hover:text-azul-profundo"
                            }`}
                            disabled={
                              capsuleFile.isUploading ||
                              creationStatus !== "idle" ||
                              !plan ||
                              mejorasIaUsadas == null ||
                              !canUseMejoraIA(plan, mejorasIaUsadas)
                            }
                          >
                            <BrainCircuit size={16} />
                          </button>
                          <button onClick={() => alert('Compartir: ' + capsuleFile.name)} title="Compartir" className={`p-1 text-gray-500 rounded-full hover:bg-gray-200 transition-colors ${capsuleFile.isUploading || creationStatus !== 'idle' ? 'cursor-not-allowed opacity-50' : 'hover:text-blue-600'}`} disabled={capsuleFile.isUploading || creationStatus !== 'idle'}><Share2 size={16} /></button>
                          <button onClick={() => alert('Favorito: ' + capsuleFile.name)} title="Marcar como favorito" className={`p-1 text-gray-500 rounded-full hover:bg-gray-200 transition-colors ${capsuleFile.isUploading || creationStatus !== 'idle' ? 'cursor-not-allowed opacity-50' : 'hover:text-red-600'}`} disabled={capsuleFile.isUploading || creationStatus !== 'idle'}><Heart size={16} /></button>
                          <button onClick={() => handleRemoveFile(capsuleFile.id)} title="Eliminar archivo" className={`p-1 text-gray-500 rounded-full hover:bg-gray-200 transition-colors ${capsuleFile.isUploading || creationStatus !== 'idle' ? 'cursor-not-allowed opacity-50' : 'hover:text-red-700'}`} disabled={capsuleFile.isUploading || creationStatus !== 'idle'}><Trash2 size={16} /></button>
                        </div>
                      </div>
                      {/* Cara trasera */}
                      <div
                        className={`absolute top-0 left-0 w-full flex flex-col items-center justify-center bg-gray-50 p-3 rounded-md border z-20 ${capsuleFile.isEditing ? 'visible' : 'invisible'}`}
                        style={{
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          minHeight: '120px'
                        }}
                      >
                        <div className="w-full flex justify-between items-center mb-2">
                          <span className="text-xs text-azul-profundo font-semibold">Editar datos</span>
                          <button
                            onClick={() => setFiles(prevFiles => prevFiles.map(file => file.id === capsuleFile.id ? { ...file, isEditing: false } : file))}
                            className="p-1 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
                            title="Volver"
                          >
                            <RotateCw size={16} />
                          </button>
                        </div>
                        <div className="w-full flex flex-col gap-2">
                          <label className="text-xs text-gray-700">Fecha real:</label>
                          <input
                            type="date"
                            value={capsuleFile.fecha_real ? capsuleFile.fecha_real.substring(0, 10) : ''}
                            onChange={e => handleMetaChange('fecha_real', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                          />
                          <label className="text-xs text-gray-700 mt-2">Ubicación:</label>
                          <div className="w-full h-40 rounded border border-gray-200 overflow-hidden">
                            {/* Nuevo subcomponente robusto para el mapa */}
                            <CapsuleLocationMapGL
                              lat={capsuleFile.latitud ?? 0}
                              lng={capsuleFile.longitud ?? 0}
                              onLocationChange={(lat: number, lng: number) => {
                                setFiles(prevFiles =>
                                  prevFiles.map(file =>
                                    file.id === capsuleFile.id
                                      ? { ...file, latitud: lat, longitud: lng, ubicacion_manual: true }
                                      : file
                                  )
                                );
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer del Modal (Botones) */}
        <div className="pt-4 border-t mt-4 flex justify-end space-x-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
            disabled={creationStatus === 'uploading' || creationStatus === 'saving'}
          >
            Cancelar
          </button>
          <button 
            onClick={handleCreateCapsule} 
            className={`px-4 py-2 rounded-md transition-colors text-sm font-medium flex items-center min-w-[130px] justify-center ${isDisabled || creationStatus === 'success' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-dorado-claro text-azul-profundo hover:bg-opacity-90'} ${creationStatus === 'success' ? 'bg-green-500 text-white' : ''}`}
            disabled={isDisabled}
          >
            {ButtonIcon}
            {buttonText}
          </button>
        </div>

      </div>
      
      {/* Animación CSS para entrada */}
      <style jsx>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scaleIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CreateCapsuleModal;
