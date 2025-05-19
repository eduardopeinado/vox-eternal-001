'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, UploadCloud, AlertCircle, Mic, Video, X as CloseIcon, Info } from 'lucide-react';
import { toast } from 'sonner';

interface AddFavoriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFavoriteAdded: () => void; // Callback to refresh list after adding
}

// Basic Tailwind classes for input elements (can be customized)
const inputClasses = "flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm ring-offset-white dark:ring-offset-gray-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const labelClasses = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300";
const buttonClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white dark:ring-offset-gray-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
const primaryButtonClasses = `${buttonClasses} bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 px-4 py-2`;
const outlineButtonClasses = `${buttonClasses} border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300 px-4 py-2`;

type CapsuleOption = {
  id: string;
  titulo: string | null;
};

export default function AddFavoriteModal({ isOpen, onClose, onFavoriteAdded }: AddFavoriteModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [capsuleSelection, setCapsuleSelection] = useState<'existing' | 'new'>('existing');
  const [selectedCapsuleId, setSelectedCapsuleId] = useState<string>('');
  const [newCapsuleTitle, setNewCapsuleTitle] = useState('');
  const [newCapsuleDescription, setNewCapsuleDescription] = useState('');
  const [markAsFavorite, setMarkAsFavorite] = useState(true);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [realDate, setRealDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCapsules, setUserCapsules] = useState<CapsuleOption[]>([]);
  const [loadingCapsules, setLoadingCapsules] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Fetch user's capsules when the modal opens
  useEffect(() => {
    const fetchUserCapsules = async () => {
      if (!isOpen) return; // Only fetch when modal is open
      setLoadingCapsules(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuario no autenticado");

        const { data, error } = await supabase
          .from('capsulas')
          .select('id, titulo')
          .eq('usuario_id', user.id)
          .order('fecha_creacion', { ascending: false });

        if (error) throw error;
        setUserCapsules(data || []);
        // Automatically select the first capsule if available
        if (data && data.length > 0) {
          setSelectedCapsuleId(data[0].id);
          setCapsuleSelection('existing');
        } else {
          setCapsuleSelection('new'); // Default to new if no capsules exist
        }
      } catch (err: any) {
        console.error("Error fetching user capsules:", err);
        setError("Error al cargar tus cápsulas.");
        setUserCapsules([]);
      } finally {
        setLoadingCapsules(false);
      }
    };

    fetchUserCapsules();
  }, [isOpen, supabase]); // Added supabase to dependency array

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      // Basic validation (can be expanded)
      if (!selectedFile.type.startsWith('audio/') && !selectedFile.type.startsWith('video/')) {
        setError('Por favor, selecciona un archivo de audio o video.');
        setFile(null);
        if(fileInputRef.current) fileInputRef.current.value = ""; // Reset input
      } else {
        setError(null);
        setFile(selectedFile);
      }
    }
  };

  const resetForm = useCallback(() => { // Wrap in useCallback if needed elsewhere
    setFile(null);
    setCapsuleSelection(userCapsules.length > 0 ? 'existing' : 'new');
    setSelectedCapsuleId(userCapsules.length > 0 ? userCapsules[0].id : '');
    setNewCapsuleTitle('');
    setNewCapsuleDescription('');
    setMarkAsFavorite(true);
    setCustomTitle('');
    setCustomDescription('');
    setRealDate('');
    setIsUploading(false);
    setError(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  }, [userCapsules]); // Add dependencies

  const handleClose = useCallback(() => { // Wrap in useCallback
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError('Debes seleccionar un archivo de audio o video.');
      return;
    }
    if (capsuleSelection === 'existing' && !selectedCapsuleId) {
      setError('Debes seleccionar una cápsula existente.');
      return;
    }
    if (capsuleSelection === 'new' && !newCapsuleTitle.trim()) {
      setError('Debes ingresar un título para la nueva cápsula.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("No se pudo obtener la sesión del usuario.");
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('markAsFavorite', String(markAsFavorite));
      if (customTitle.trim()) formData.append('title', customTitle.trim());
      if (customDescription.trim()) formData.append('description', customDescription.trim());
      if (realDate) formData.append('realDate', realDate);

      if (capsuleSelection === 'new') {
        formData.append('capsuleId', 'new');
        formData.append('createCapsuleTitle', newCapsuleTitle.trim());
        if (newCapsuleDescription.trim()) {
          formData.append('createCapsuleDescription', newCapsuleDescription.trim());
        }
      } else {
        formData.append('capsuleId', selectedCapsuleId);
      }

      // Invoke the Edge Function
      const { data, error: invokeError } = await supabase.functions.invoke('add-recuerdo-directo', {
        body: formData,
      });

      if (invokeError) {
        console.error("Function invoke error:", invokeError);
        let message = invokeError.message;
        try {
          const errorJson = JSON.parse(invokeError.context?.responseText || '{}');
          message = errorJson.error || errorJson.details || message;
        } catch (e) { /* Ignore parsing error */ }
        throw new Error(`Error al añadir recuerdo: ${message}`);
      }

      if (data?.error) {
        throw new Error(`Error desde la función: ${data.error} ${data.details || ''}`);
      }

      toast.success('¡Recuerdo favorito añadido exitosamente!');
      onFavoriteAdded();
      handleClose();

    } catch (err: any) {
      console.error('Error submitting favorite:', err);
      setError(err.message || 'Ocurrió un error inesperado.');
      toast.error(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsUploading(false);
    }
  };

  // Simulate Dialog with conditional rendering and fixed position
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" aria-labelledby="dialog-title" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-lg p-6 bg-white dark:bg-gray-900 rounded-lg shadow-xl">
         {/* Close Button */}
         <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Cerrar"
          >
            <CloseIcon className="h-5 w-5" />
          </button>

        {/* Header */}
        <div className="mb-4">
          <h2 id="dialog-title" className="text-xl font-semibold text-gray-900 dark:text-white">Añadir Nuevo Favorito</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Sube o graba un audio/video y añádelo directamente a tus favoritos.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* File Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="file-upload" className={`${labelClasses} text-right`}>
              Archivo
            </label>
            <div className="col-span-3">
              <input
                id="file-upload"
                type="file"
                ref={fileInputRef}
                accept="audio/*,video/*"
                onChange={handleFileChange}
                required
                className={`${inputClasses} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200 dark:hover:file:bg-blue-800`}
              />
              {file && <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Seleccionado: {file.name}</p>}
            </div>
          </div>
          {/* Removed extra closing div here */}

          {/* TODO: Add Recorder Buttons (Mic, Video) here - Future Enhancement */}
          {/* <div className="grid grid-cols-4 items-center gap-4">
             <Label className="text-right">O Grabar</Label>
             <div className="col-span-3 flex space-x-2">
                <Button type="button" variant="outline" size="icon"><Mic className="h-4 w-4" /></Button>
                <Button type="button" variant="outline" size="icon"><Video className="h-4 w-4" /></Button>
             </div>
          </div> */}

          {/* Capsule Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="capsule-select" className={`${labelClasses} text-right`}>
              Cápsula
            </label>
            <div className="col-span-3">
              {/* Standard HTML Select */}
              <select
                id="capsule-select"
                value={capsuleSelection === 'new' ? 'new' : selectedCapsuleId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const value = e.target.value;
                  if (value === 'new') {
                    setCapsuleSelection('new');
                    setSelectedCapsuleId('');
                  } else {
                    setCapsuleSelection('existing');
                    setSelectedCapsuleId(value);
                  }
                }}
                disabled={loadingCapsules}
                className={inputClasses} // Use inputClasses for styling
              >
                <option value="" disabled hidden>{loadingCapsules ? "Cargando cápsulas..." : "Selecciona o crea..."}</option>
                {userCapsules.map((capsule) => (
                  <option key={capsule.id} value={capsule.id}>
                    {capsule.titulo || `Cápsula sin título (${capsule.id.substring(0, 6)}...)`}
                  </option>
                ))}
                <option value="new">-- Crear Nueva Cápsula --</option>
              </select>
            </div>
          </div>
          {/* Removed extra closing div here */}

          {/* New Capsule Fields (Conditional) */}
          {capsuleSelection === 'new' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="new-capsule-title" className={`${labelClasses} text-right`}>
                  Título Nuevo
                </label>
                <input
                  id="new-capsule-title"
                  type="text"
                  value={newCapsuleTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCapsuleTitle(e.target.value)}
                  className={`${inputClasses} col-span-3`}
                  placeholder="Ej: Recuerdos de Verano 2024"
                  required={capsuleSelection === 'new'}
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <label htmlFor="new-capsule-desc" className={`${labelClasses} text-right pt-2`}>
                  Desc. Nueva
                </label>
                <textarea
                  id="new-capsule-desc"
                  value={newCapsuleDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewCapsuleDescription(e.target.value)}
                  className={`${inputClasses} col-span-3`} // Use inputClasses, adjust height if needed
                  placeholder="Descripción opcional para la nueva cápsula"
                  rows={2}
                />
              </div>
            </>
          )}

          {/* Recuerdo Details */}
           <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="custom-title" className={`${labelClasses} text-right`}>
                  Título Rec.
                </label>
                <input
                  id="custom-title"
                  type="text"
                  value={customTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomTitle(e.target.value)}
                  className={`${inputClasses} col-span-3`}
                  placeholder="Título opcional para este recuerdo"
                />
            </div>
             <div className="grid grid-cols-4 items-start gap-4">
                <label htmlFor="custom-description" className={`${labelClasses} text-right pt-2`}>
                  Desc. Rec.
                </label>
                <textarea
                  id="custom-description"
                  value={customDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomDescription(e.target.value)}
                  className={`${inputClasses} col-span-3`}
                  placeholder="Descripción opcional para este recuerdo"
                  rows={2}
                />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="real-date" className={`${labelClasses} text-right`}>
                  Fecha Real
                </label>
                <input
                  id="real-date"
                  type="date"
                  value={realDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRealDate(e.target.value)}
                  className={`${inputClasses} col-span-3`}
                />
            </div>


          {/* Mark as Favorite Checkbox */}
          <div className="grid grid-cols-4 items-center gap-4">
             <div className="col-start-2 col-span-3 flex items-center space-x-2">
                 {/* Standard HTML Checkbox */}
                 <input
                    type="checkbox"
                    id="mark-favorite"
                    checked={markAsFavorite}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMarkAsFavorite(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
                 />
                 <label htmlFor="mark-favorite" className={labelClasses}>
                    Marcar como favorito automáticamente
                 </label>
             </div>
          </div>
          {/* Removed extra closing div here */}

          {/* Error Message */}
          {error && (
            <div className="col-span-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}

          {/* Footer with Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <button type="button" onClick={handleClose} className={outlineButtonClasses}>
              Cancelar
            </button>
            <button type="submit" disabled={isUploading || !file} className={primaryButtonClasses}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Añadiendo...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Añadir Recuerdo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
