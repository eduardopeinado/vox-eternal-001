"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, QrCode, ArrowLeft, Send, Download, X } from 'lucide-react'; // Removed CalendarIcon (in form), Added Download, X
import type { User } from '@supabase/supabase-js';
import { format } from "date-fns";
import { es } from 'date-fns/locale'; // Import Spanish locale for date formatting
import "react-datepicker/dist/react-datepicker.css";
// Import the new form component
import ReminderForm from '@/components/dashboard/reminder-form';
// Import QR Code component
import { QRCodeCanvas } from 'qrcode.react';
import { useRef } from 'react'; // Import useRef for QR download

// --- Define Detailed Types (and export them) ---
export type RecuerdoData = { // Added export
  id: string;
  titulo_personalizado: string | null;
  nombre_archivo: string | null; // Fallback title
  url_archivo: string; // For thumbnail/icon source
  tipo: 'foto' | 'audio' | 'video' | string; // For icon/thumbnail logic
};

export type CapsulaWithRecuerdos = { // Added export
  id: string;
  titulo: string | null;
  portada_url: string | null;
  primer_video_url?: string | null; // Add field for first video URL
  recuerdos: RecuerdoData[]; // Nested recuerdos
};
// --- End Detailed Types ---

// CapsuleSelectionList component definition removed as it's no longer used directly in this file

const CreateReminderPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userCapsules, setUserCapsules] = useState<CapsulaWithRecuerdos[]>([]);
  const [capsulesLoading, setCapsulesLoading] = useState(true);
  // State for QR Code display
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrAccessToken, setQrAccessToken] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null); // Ref for QR download

  // Remove form state variables, they are managed within ReminderForm now
  // const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  // const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'qr_code'>('email');
  // const [recipientEmail, setRecipientEmail] = useState('');
  // const [recipientName, setRecipientName] = useState('');
  // const [reminderTitle, setReminderTitle] = useState('');
  // const [reminderMessage, setReminderMessage] = useState('');
  // const [selectedCapsuleIds, setSelectedCapsuleIds] = useState<Set<string>>(new Set());
  // const [selectedRecuerdoIds, setSelectedRecuerdoIds] = useState<Set<string>>(new Set());


  // Fetch user and capsules
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingUser(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Debes iniciar sesión para crear recordatorios.");
        router.push('/login');
        return;
      }
      setUser(session.user);
      setLoadingUser(false);

        // Fetch user's capsules and related data
        setCapsulesLoading(true);
        try {
          // 1. Fetch owned capsule IDs first
          const { data: ownedCapsuleIdsData, error: ownedIdsError } = await supabase
            .from('capsulas')
            .select('id')
            .eq('usuario_id', session.user.id);

          if (ownedIdsError) throw ownedIdsError;
          const ownedCapsuleIds = ownedCapsuleIdsData?.map(c => c.id) || [];

          if (ownedCapsuleIds.length === 0) {
            setUserCapsules([]);
            setCapsulesLoading(false);
            return; // No capsules to process
          }

          // 2. Fetch capsule details AND nested recuerdos for owned capsules
          const { data: capsulasConRecuerdos, error: capsulasError } = await supabase
            .from('capsulas')
            .select(`
                id,
                titulo,
                portada_url,
                recuerdos (
                  id,
                  titulo_personalizado,
                  nombre_archivo,
                  url_archivo,
                  tipo
                )
              `)
            .in('id', ownedCapsuleIds); // Fetch details for owned capsules

          if (capsulasError) throw capsulasError;

          // 3. Process fetched data and identify capsules needing video thumbs
          const countsMap = new Map<string, { video_count: number }>();
          const capsuleIdsNeedingVideoThumb: string[] = [];

          const initialProcessedData = (capsulasConRecuerdos || []).map(capsula => {
            const recuerdos = capsula.recuerdos || [];
            const videoCount = recuerdos.filter(r => r.tipo === 'video').length;
            countsMap.set(capsula.id, { video_count: videoCount });

            if (!capsula.portada_url && videoCount > 0) {
              capsuleIdsNeedingVideoThumb.push(capsula.id);
            }
            return {
              ...capsula,
              recuerdos: recuerdos, // Ensure it's an array
            };
          });

          // 4. Fetch first video URL for those capsules if needed
          const primerVideoUrlMap = new Map<string, string>();
          if (capsuleIdsNeedingVideoThumb.length > 0) {
            const { data: videoRecuerdos, error: videoRecuerdosError } = await supabase
              .from('recuerdos')
              .select('capsula_id, url_archivo')
              .in('capsula_id', capsuleIdsNeedingVideoThumb)
              .eq('tipo', 'video')
              .order('fecha_real', { ascending: true }); // Use 'fecha_real'

            if (videoRecuerdosError) {
              console.warn('[RemindersPage] Error fetching video recuerdos for thumbnails:', videoRecuerdosError);
            } else {
              videoRecuerdos?.forEach(recuerdo => {
                if (!primerVideoUrlMap.has(recuerdo.capsula_id)) {
                  primerVideoUrlMap.set(recuerdo.capsula_id, recuerdo.url_archivo);
                }
              });
            }
          }

          // 5. Combine all data into the final structure
          const finalCapsulesData = initialProcessedData.map(capsula => ({
            ...capsula,
            primer_video_url: primerVideoUrlMap.get(capsula.id) || null, // Add the video URL
          }));

          setUserCapsules(finalCapsulesData);

        } catch (error: any) {
          console.error("Error fetching user capsules/recuerdos:", error);
        toast.error("Error al cargar tus cápsulas.");
      } finally {
        setCapsulesLoading(false);
      }
    };
     fetchInitialData();
  }, [router]);

  // Remove handleSelectionChange, it's handled within ReminderForm

  // Rename handleCreateReminder to match the onSubmit prop expected by ReminderForm
  // The function now receives the prepared formData directly from the form component
  const handleFormSubmit = async (formData: any) => {
    // event.preventDefault(); // No longer needed, form handles this
    if (!user || isSubmitting) return;

    // Validation is now handled within ReminderForm's handleSubmit before calling this onSubmit

    setIsSubmitting(true);
    const creationToast = toast.loading("Programando recordatorio...");

    try {
      // formData already contains the necessary payload structure
      const payload = formData;

      console.log("[handleFormSubmit] Calling create-future-reminder with payload:", payload);

      const { data, error } = await supabase.functions.invoke('create-future-reminder', {
        body: payload,
      });

      // Log raw response and error status
      console.log("[handleCreateReminder] Raw function response:", { data, error });

      if (error) {
        // This catches network errors or function invocation failures (e.g., 5xx from gateway)
        console.error("[handleCreateReminder] Function invocation error:", error);
        toast.error(`Error de red o servidor: ${error.message || 'Error desconocido'}`, { id: creationToast });
        setIsSubmitting(false); // Ensure submission state is reset
        return; // Stop execution here
      }

      if (data?.error) {
        // This catches application-level errors returned by the function itself (e.g., validation failure, 4xx/500 with JSON body { error: ... })
        console.error("[handleCreateReminder] Function returned application error:", data.error);
        toast.error(`Error al crear recordatorio: ${data.error}`, { id: creationToast });
        setIsSubmitting(false); // Ensure submission state is reset
        return; // Stop execution here
      }

      // --- Success Path ---
      // If we reach here, 'error' is null/undefined AND 'data.error' is not present.
      // This implies a 2xx response without an application error payload.
      console.log("[handleCreateReminder] Function call successful. Response data:", data);
      toast.success("Recordatorio programado con éxito.", { id: creationToast });

      // Handle QR code display if needed
      if (formData.delivery_method === 'qr_code' && data?.access_token) {
        console.log("[handleFormSubmit] QR Code delivery selected. Access token:", data.access_token);
        setQrAccessToken(data.access_token);
        setShowQrCode(true); // Show QR section instead of redirecting
        // toast.info(`Recordatorio creado. Muestra el QR correspondiente.`); // Toast can be shown with QR
      } else {
         console.log("[handleFormSubmit] Email delivery selected or no access token in response.");
         // Only redirect if it's email delivery
         console.log("[handleFormSubmit] Redirecting to /dashboard...");
         router.push('/dashboard');
      }

    } catch (err: any) {
      // This catch block might catch errors thrown *within* the success path logic (e.g., router issues)
      // or errors explicitly thrown above if not returned early.
      console.error("[handleFormSubmit] Unexpected error during reminder creation process:", err);
      // Update the toast to show the unexpected error message, replacing the loading indicator.
      toast.error(`Error inesperado: ${err.message || 'Error desconocido'}`, { id: creationToast });
    } finally {
      // Ensure isSubmitting is always reset
      setIsSubmitting(false);
    }
  };

  if (loadingUser || capsulesLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-blanco-hueso">
        <Loader2 className="w-8 h-8 mr-2 animate-spin text-azul-profundo" />
        <p className="text-azul-profundo">Cargando...</p>
      </div>
    );
  }

  // --- QR Code Download Logic ---
  const downloadQRCode = () => {
    const canvas = qrRef.current?.querySelector<HTMLCanvasElement>('canvas');
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      // Use reminder title or a default name for the file
      const fileName = `vox-eternal-qr-${qrAccessToken?.substring(0, 8) || 'reminder'}.png`;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } else {
        toast.error("No se pudo encontrar el elemento QR para descargar.");
    }
  };

  // --- Render QR Code Section or Form ---
  if (showQrCode && qrAccessToken) {
    const qrValue = `${window.location.origin}/join/${qrAccessToken}`; // Construct the URL for the QR code

    return (
      <div className="min-h-screen bg-blanco-hueso p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl border border-gray-200 text-center max-w-md w-full">
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-azul-profundo mb-4">
            ¡Recordatorio Programado con QR!
          </h1>
          <p className="text-gray-600 mb-6 text-sm">
            Comparte este código QR con el destinatario. Podrá escanearlo para acceder al mensaje en la fecha programada.
          </p>
          <div ref={qrRef} className="mb-6 inline-block p-2 border bg-white"> {/* Added padding and bg */}
            <QRCodeCanvas
              value={qrValue}
              size={200} // Adjust size as needed
              bgColor={"#ffffff"}
              fgColor={"#0D3D56"} // Azul Profundo
              level={"L"}
              includeMargin={false}
              // Pass undefined if not using image settings to avoid TS error
              imageSettings={undefined}
              /* Optional: Add logo in the center
              imageSettings={{
                src: "/logo-vox.png", // Ensure this path is correct in public folder
                x: undefined,
                // y: undefined,
                // height: 30,
                // width: 30,
                excavate: true,
              }}
              */
            />
          </div>
           <p className="text-xs text-gray-500 mb-6 break-all">URL: {qrValue}</p>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
             <button
               onClick={downloadQRCode}
               className="flex items-center justify-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm font-medium shadow"
             >
               <Download size={16} className="mr-2" />
               Descargar QR
             </button>
             <button
               onClick={() => router.push('/dashboard')} // Navigate to dashboard on close
               className="flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
             >
                <X size={16} className="mr-2" />
                Cerrar y Volver al Dashboard
             </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Form (Default View) ---
  return (
    <div className="min-h-screen bg-blanco-hueso p-4 sm:p-6 lg:p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center text-sm text-azul-profundo hover:underline mb-6"
      >
        <ArrowLeft size={16} className="mr-1" />
        Volver al Dashboard
      </button>

      <h1 className="text-2xl sm:text-3xl font-bold font-serif text-azul-profundo mb-6">
        Crear Recordatorio Futuro
      </h1>

      {/* Use the ReminderForm component */}
      <ReminderForm
        userCapsules={userCapsules}
        capsulesLoading={capsulesLoading}
        onSubmit={handleFormSubmit} // Pass the renamed submit handler
        isSubmitting={isSubmitting}
        isEditing={false} // Explicitly set isEditing to false
      />
    </div>
  );
};

export default CreateReminderPage;
