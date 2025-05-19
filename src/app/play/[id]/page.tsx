'use client';

// NOTA: Esta página es completamente dinámica y no puede ser exportada como HTML estático.
// La ruta /play/[id] solo funcionará en modo servidor o como SPA.

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Lock, AlertTriangle } from 'lucide-react';

type Recuerdo = {
  id: string;
  usuario_id: string;
  url_archivo: string;
  tipo: 'audio' | 'video' | 'foto' | string; // Allow other types but only play audio/video
  nombre_archivo: string | null;
  titulo_personalizado?: string | null;
  capsula_id: string; // Needed for potential permission checks later
};

export default function PlayRecuerdoPage() {
  const router = useRouter();
  const params = useParams();
  const recuerdoId = params?.id ? String(params.id) : "";

  const [recuerdo, setRecuerdo] = useState<Recuerdo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = checking, false = no, true = yes

  useEffect(() => {
    const checkAuthAndFetchRecuerdo = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Check Authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          console.log('No active session found, redirecting to login.');
          setIsAuthenticated(false);
          // Option 1: Redirect immediately
          // router.push(`/login?redirect=/play/${recuerdoId}`);
          // Option 2: Show login prompt on page
          setError("Debes iniciar sesión para ver este recuerdo.");
          setLoading(false);
          return;
        }
        const userId = session.user.id;
        setIsAuthenticated(true);
        console.log('User authenticated:', userId);

        // 2. Fetch Recuerdo Data
        const { data: recuerdoData, error: recuerdoError } = await supabase
          .from('recuerdos')
          .select('id, usuario_id, url_archivo, tipo, nombre_archivo, titulo_personalizado, capsula_id')
          .eq('id', recuerdoId)
          .single();

        if (recuerdoError || !recuerdoData) {
          console.error('Error fetching recuerdo or not found:', recuerdoError);
          throw new Error('Recuerdo no encontrado.');
        }

        // 3. Authorization Check (Simple: Owner only for now)
        // TODO: Implement more complex check if needed (e.g., check capsule contributors)
        if (recuerdoData.usuario_id !== userId) {
          console.warn(`Authorization failed: User ${userId} does not own recuerdo ${recuerdoId}`);
          throw new Error('No tienes permiso para ver este recuerdo.');
        }

        // 4. Check if it's playable (audio or video)
        if (recuerdoData.tipo !== 'audio' && recuerdoData.tipo !== 'video') {
             throw new Error('Este tipo de recuerdo no se puede reproducir aquí.');
        }

        console.log('Recuerdo fetched and authorized:', recuerdoData);
        setRecuerdo(recuerdoData as Recuerdo);

      } catch (err: any) {
        console.error('Error in playback page:', err);
        setError(err.message || 'Ocurrió un error.');
        setRecuerdo(null);
      } finally {
        setLoading(false);
      }
    };

    if (recuerdoId) {
      checkAuthAndFetchRecuerdo();
    } else {
      setError("ID de recuerdo inválido.");
      setLoading(false);
    }

  }, [recuerdoId, router]); // Add router to dependencies if used for redirect

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <Loader2 className="h-12 w-12 animate-spin mb-4" />
        <p>Cargando recuerdo...</p>
      </div>
    );
  }

  if (!isAuthenticated && !error) {
     // This state might be brief if redirecting, but handles the case where we show a message instead
     return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-6 text-center">
         <Lock className="h-16 w-16 text-yellow-500 mb-4" />
         <h1 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-white">Acceso Requerido</h1>
         <p className="text-gray-600 dark:text-gray-400 mb-6">Debes iniciar sesión para ver este contenido.</p>
         <button
           onClick={() => router.push(`/login?redirect=/play/${recuerdoId}`)}
           className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
         >
           Iniciar Sesión
         </button>
       </div>
     );
   }


  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-6 text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-white">Error</h1>
        <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
        {/* Optionally add a button to go back or to login */}
         <button
           onClick={() => router.push('/dashboard')}
           className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
         >
           Ir al Dashboard
         </button>
      </div>
    );
  }

  if (!recuerdo) {
    // Should be covered by error state, but as a fallback
    return <div className="flex items-center justify-center min-h-screen">Recuerdo no disponible.</div>;
  }

  // --- Successful Load: Render Player ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 p-4">
       <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden">
         <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate" title={recuerdo.titulo_personalizado || recuerdo.nombre_archivo || 'Recuerdo'}>
              {recuerdo.titulo_personalizado || recuerdo.nombre_archivo || 'Recuerdo'}
            </h1>
         </div>
         <div className="p-4 bg-gray-50 dark:bg-black">
            {recuerdo.tipo === 'audio' && (
              <audio controls autoPlay className="w-full" src={recuerdo.url_archivo}>
                Tu navegador no soporta audio HTML5.
              </audio>
            )}
            {recuerdo.tipo === 'video' && (
              <video controls autoPlay className="w-full max-h-[80vh]" src={recuerdo.url_archivo}>
                Tu navegador no soporta video HTML5.
              </video>
            )}
         </div>
       </div>
        <button
           onClick={() => router.push('/dashboard/favorites')} // Link back to favorites
           className="mt-6 text-sm text-gray-300 hover:text-white hover:underline"
         >
           Volver a Favoritos
         </button>
    </div>
  );
}
