'use client';
// NOTA: Esta página es completamente dinámica y no puede ser exportada como HTML estático.
// La ruta /join/[token] solo funcionará en modo servidor o como SPA.

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2, AlertTriangle, CheckCircle, User, Box, MessageSquareText, LogIn, UserPlus } from 'lucide-react'; // Added icons
import Link from 'next/link'; // For linking to login/dashboard

// Updated type for the details fetched from the function (now includes names/titles)
interface InvitationDetails {
  inviterName: string;
  capsuleTitle: string;
  message: string | null;
  // We might still need IDs if accept-invitation needs them, but get-details doesn't return them anymore
  // inviterUserId: string; // No longer returned by get-details
  // capsuleId: string;     // No longer returned by get-details
}

export default function JoinCapsulePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  // State Management
  const [loadingDetails, setLoadingDetails] = useState(true); // Combined loading state
  const [loadingAccept, setLoadingAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // State for the full invitation details (including names/titles)
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  // No longer need separate state for resolved names/titles
  // const [inviterName, setInviterName] = useState<string | null>(null);
  // const [capsuleTitle, setCapsuleTitle] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // Keep acceptedCapsuleId if needed for redirect logic after accept
  const [acceptedCapsuleId, setAcceptedCapsuleId] = useState<string | null>(null);

  const shareToken = params?.token && typeof params.token === 'string' ? params.token : null;

  // Effect to fetch invitation details and check auth status on load
  useEffect(() => {
    const fetchDetailsAndCheckAuth = async () => {
      if (!shareToken) {
        setError('Token de invitación inválido o faltante.');
        setLoadingDetails(false);
        return;
      }

      setLoadingDetails(true);
      setError(null);
      setInvitationDetails(null); // Reset details
      // No need to reset separate name/title state
      setIsAuthenticated(null);

      // 1. Fetch Full Invitation Details (including names/titles)
      try {
        const { data: detailsData, error: detailsError } = await supabase.functions.invoke('get-invitation-details', {
          body: { share_token: shareToken },
        });

        if (detailsError) {
          console.error('Get invitation details error:', detailsError);
          let errMsg = detailsError.message;
           if (detailsError.context && typeof detailsError.context.error === 'string') {
               errMsg = detailsError.context.error;
           } else if (typeof detailsData?.error === 'string') {
               errMsg = detailsData.error;
           }
           // Use user-friendly messages from function response if available
           if (errMsg.includes('Invitación no encontrada')) {
               errMsg = 'La invitación no es válida o ya no existe.';
           } else if (errMsg.includes('invitación ya ha sido')) {
               errMsg = `Esta invitación ya ha sido ${detailsData?.error?.split(' ').pop() || 'procesada'}.`; // Extract status
           } else if (errMsg.includes('invitación ha caducado')) {
               errMsg = 'Esta invitación ha caducado.';
           }
          throw new Error(errMsg || 'Error al obtener detalles de la invitación.');
        }

        // Check if we got the expected details
        if (!detailsData || !detailsData.inviterName || !detailsData.capsuleTitle) {
             throw new Error('No se pudieron obtener los detalles completos de la invitación.');
        }

        setInvitationDetails(detailsData as InvitationDetails);
        // Details are now complete, stop loading here (after auth check)

      } catch (err: any) {
        setError(err.message || 'Ocurrió un error inesperado al cargar los detalles.');
        setLoadingDetails(false); // Stop loading on error
        return; // Stop if details fetch fails
      }

      // Authentication check can happen in parallel or after, doesn't block name/title fetching
      // 2. Check Authentication Status (can run concurrently)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error checking session:", sessionError);
        // Don't block showing details, but maybe show a warning?
        // For now, assume not authenticated if error occurs
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(!!session?.user);
      }
      // Finish loading after both details and auth check are done (or failed)
      setLoadingDetails(false);
    };

    fetchDetailsAndCheckAuth();
  }, [shareToken]);

  // REMOVED: Effect to fetch inviter name and capsule title separately
  // useEffect(() => { ... }, [invitationBaseDetails]);
  // Handler to accept the invitation (only called when user is authenticated and clicks button)
  const handleAcceptInvitation = async () => {
     console.log('[handleAcceptInvitation] Clicked!'); // Log entry
     console.log('[handleAcceptInvitation] shareToken:', shareToken); // Log token
     console.log('[handleAcceptInvitation] isAuthenticated:', isAuthenticated); // Log auth status

     if (!shareToken || !isAuthenticated) {
        console.log('[handleAcceptInvitation] Guard clause triggered. Exiting.'); // Log guard clause exit
        return; 
     }

     console.log('[handleAcceptInvitation] Proceeding to invoke function...'); // Log before invoke
     setLoadingAccept(true);
     setError(null);

     try {
       const { data, error: functionError } = await supabase.functions.invoke('accept-invitation', {
         body: { share_token: shareToken },
       });

       if (functionError) {
         console.error('Accept invitation function error:', functionError);
         let errMsg = functionError.message;
          if (functionError.context && typeof functionError.context.error === 'string') {
              errMsg = functionError.context.error;
          } else if (typeof data?.error === 'string') {
              errMsg = data.error;
          }
          // Add specific error messages if needed based on accept-invitation logic/RLS
          if (errMsg.includes('violates row-level security policy')) {
              errMsg = 'No se pudo añadir como contribuyente debido a permisos. Contacta al administrador.';
          }
         throw new Error(errMsg || 'Error al aceptar la invitación.');
       }

       if (!data?.capsule_id) {
         throw new Error('No se pudo obtener el ID de la cápsula tras aceptar la invitación.');
       }

       // Success! Redirect to the capsule page
       setAcceptedCapsuleId(data.capsule_id); // Store for potential success message display
       router.push(`/dashboard/capsule/${data.capsule_id}`);

     } catch (err: any) {
       console.error('Error accepting invitation:', err);
       setError(err.message || 'Ocurrió un error inesperado al aceptar.');
       setLoadingAccept(false); // Stop loading on error
     }
     // No need for finally setLoadingAccept(false) because of redirect on success
  };


  // --- Render Logic ---

  // 1. Loading State (covers both detail fetching steps)
  if (loadingDetails) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-blanco-hueso p-4 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-azul-profundo mb-4" />
        <p className="text-lg text-azul-profundo">Cargando detalles de la invitación...</p>
      </div>
    );
  }

  // 2. Error State (covers errors from fetching details or accepting)
  if (error) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-blanco-hueso p-4 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-semibold text-red-700 mb-2">Error al Unirte</h1>
        <p className="text-gris-calido mb-6">{error}</p>
        <Link href="/dashboard" className="px-4 py-2 bg-dorado-claro text-azul-profundo font-semibold rounded-md shadow hover:bg-yellow-500 transition duration-150">
          Volver al Dashboard
        </Link>
      </div>
    );
  }

   // 3. Details Loaded Successfully - Show Invitation Info and Actions
   if (invitationDetails) {
     // Use details directly from the state
     const displayInviterName = invitationDetails.inviterName;
     const displayCapsuleTitle = invitationDetails.capsuleTitle;
     const displayMessage = invitationDetails.message;

     return (
       <div className="flex flex-col min-h-screen items-center justify-center bg-blanco-hueso p-6 text-center">
         <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 max-w-lg w-full">
           <h1 className="text-2xl font-semibold font-serif text-azul-profundo mb-4">Invitación a Colaborar</h1>

           <div className="text-left space-y-3 mb-6 text-gray-700">
             <p className="flex items-center">
               <User size={16} className="mr-2 text-dorado-claro flex-shrink-0" />
               <span className="font-medium mr-1">{displayInviterName}</span> te ha invitado a colaborar en la cápsula:
             </p>
             <p className="flex items-center font-semibold text-lg text-azul-profundo">
                <Box size={18} className="mr-2 text-dorado-claro flex-shrink-0" />
                {displayCapsuleTitle}
             </p>
             {displayMessage && (
               <div className="border-l-4 border-dorado-claro pl-3 py-2 bg-yellow-50/50">
                  <p className="flex items-start">
                     <MessageSquareText size={16} className="mr-2 text-dorado-claro flex-shrink-0 mt-0.5" />
                     <span className="text-sm italic">"{displayMessage}"</span>
                  </p>
               </div>
             )}
           </div>

           {/* Action Buttons */}
           {isAuthenticated === true && (
             // User is Logged In - Show Accept Button
             <button
               onClick={handleAcceptInvitation}
               disabled={loadingAccept}
               className={`w-full flex justify-center items-center px-4 py-2 bg-dorado-claro text-azul-profundo font-semibold rounded-md shadow hover:bg-yellow-500 transition duration-150 ${loadingAccept ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
               {loadingAccept ? (
                 <>
                   <Loader2 className="animate-spin h-5 w-5 mr-2" />
                   Aceptando...
                 </>
               ) : (
                 'Aceptar Invitación'
               )}
             </button>
           )}

           {isAuthenticated === false && (
              // User is Not Logged In - Show Login/Signup Links
              <>
                <p className="text-sm text-gris-calido mb-4">Para aceptar, por favor inicia sesión o crea una cuenta gratuita.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href={`/login?action=login&redirect=/join/${shareToken}`} className="flex-1 text-center px-4 py-2 bg-azul-profundo text-white font-semibold rounded-md shadow hover:bg-opacity-90 transition duration-150 flex items-center justify-center gap-2">
                     <LogIn size={16} /> Iniciar Sesión
                  </Link>
                  <Link href={`/login?action=signup&redirect=/join/${shareToken}`} className="flex-1 text-center px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-md shadow hover:bg-gray-300 transition duration-150 flex items-center justify-center gap-2">
                     <UserPlus size={16} /> Crear Cuenta
                  </Link>
                </div>
              </>
           )}

            {/* Optional: Cancel/Go Back Button */}
            <Link href="/dashboard" className="block text-center mt-4 text-sm text-gray-500 hover:underline">
                Cancelar y volver al Dashboard
            </Link>

         </div>
       </div>
     );
   }

   // Fallback for unexpected states (should ideally not be reached)
  return (
     <div className="flex flex-col min-h-screen items-center justify-center bg-blanco-hueso p-4 text-center">
        <p className="text-gris-calido">Estado inesperado.</p>
         <Link href="/dashboard" className="mt-4 px-4 py-2 bg-dorado-claro text-azul-profundo font-semibold rounded-md shadow hover:bg-yellow-500 transition duration-150">
           Ir al Dashboard
         </Link>
     </div>
  );
}
