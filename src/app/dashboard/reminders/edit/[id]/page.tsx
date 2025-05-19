'use client';
// NOTA: Esta página es completamente dinámica y no puede ser exportada como HTML estático.
// La ruta /dashboard/reminders/edit/[id] solo funcionará en modo servidor o como SPA.

import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Download, X } from 'lucide-react'; // Added Download, X
import ReminderForm from '@/components/dashboard/reminder-form';
import type { CapsulaWithRecuerdos } from '@/app/dashboard/reminders/new/page';
import type { User } from '@supabase/supabase-js';
import { QRCodeCanvas } from 'qrcode.react'; // Import QR Code component

const EditReminderPage = () => {
  const router = useRouter();
  const params = useParams();
  const reminderId = params?.id ? String(params.id) : "";

  const [user, setUser] = useState<User | null>(null); // Add user state
  const [reminderData, setReminderData] = useState<any>(null);
  const [userCapsules, setUserCapsules] = useState<CapsulaWithRecuerdos[]>([]); // Add capsules state
  const [loading, setLoading] = useState(true); // Combined loading state
  const [capsulesLoading, setCapsulesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State for QR Code display
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrAccessToken, setQrAccessToken] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null); // Ref for QR download

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setCapsulesLoading(true);
      setError(null);

      if (!reminderId) {
        setError("ID de recordatorio inválido.");
        setLoading(false); // Stop main loading
        setCapsulesLoading(false); // Stop capsules loading
        return;
      }

      try {
        // --- Fetch User ---
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
         if (sessionError || !session?.user) {
            toast.error("Error de autenticación.");
            router.push('/login'); // Redirect if not authenticated
            throw new Error("Usuario no autenticado.");
         }
         const currentUser = session.user;
         setUser(currentUser); // Set user state

        // --- Fetch Reminder Data (including associated recuerdos) ---
        // We need associated recuerdos to initialize the CapsuleMemorySelector correctly
        const { data: reminderResult, error: fetchError } = await supabase
          .from('future_reminders')
          .select(`
            *,
            future_reminder_recuerdos ( recuerdo_id )
          `) // Fetch reminder and IDs of associated recuerdos
          .eq('id', reminderId)
          .eq('creator_user_id', currentUser.id) // Ensure ownership
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            throw new Error("Recordatorio no encontrado o no tienes permiso para editarlo.");
          }
          throw fetchError; // Rethrow other errors
        }
        if (!reminderResult) {
          throw new Error("No se encontraron datos para este recordatorio.");
        }
        setReminderData(reminderResult);
        console.log("Reminder data fetched for edit:", reminderResult);

         // --- Fetch User Capsules (same logic as create page) ---
         // This runs in parallel conceptually but waits here
         const { data: ownedCapsuleIdsData, error: ownedIdsError } = await supabase
            .from('capsulas')
            .select('id')
            .eq('usuario_id', currentUser.id);

          if (ownedIdsError) throw ownedIdsError;
          const ownedCapsuleIds = ownedCapsuleIdsData?.map(c => c.id) || [];

          if (ownedCapsuleIds.length > 0) {
              const { data: capsulasConRecuerdos, error: capsulasError } = await supabase
                .from('capsulas')
                .select(`id, titulo, portada_url, recuerdos (id, titulo_personalizado, nombre_archivo, url_archivo, tipo)`)
                .in('id', ownedCapsuleIds);
              if (capsulasError) throw capsulasError;
              // Basic processing, could reuse logic from create page if complex thumbnail logic needed again
              setUserCapsules(capsulasConRecuerdos || []);
          } else {
              setUserCapsules([]);
          }

      } catch (err: any) {
        console.error("Error fetching data for edit:", err);
        setError(`Error al cargar datos: ${err.message}`);
        toast.error(`Error al cargar datos: ${err.message}`);
      } finally {
        setLoading(false); // Stop main loading
        setCapsulesLoading(false); // Stop capsules loading
      }
    };

    fetchInitialData();
  }, [reminderId, router]);

  // --- Handle Update Submission ---
  const handleUpdateReminder = async (formData: any) => {
    if (!reminderId) return; // Should not happen if page loaded
    setIsSubmitting(true);
    const updateToast = toast.loading("Guardando cambios...");

    try {
        // The formData from ReminderForm already includes reminderId if isEditing is true
        console.log("[handleUpdateReminder] Calling update-future-reminder with payload:", formData);

        const { data, error } = await supabase.functions.invoke('update-future-reminder', {
            body: formData,
        });

        if (error) throw error; // Catch invocation/network errors
        if (data?.error) throw new Error(data.error);

        toast.success("Recordatorio actualizado con éxito!", { id: updateToast });

        // Check delivery method AFTER successful update
        if (data.delivery_method === 'qr_code' && data.access_token) {
            console.log("[handleUpdateReminder] QR Code delivery method. Showing QR.");
            setQrAccessToken(data.access_token); // Use token from updated data
            setShowQrCode(true); // Show QR section
        } else {
            console.log("[handleUpdateReminder] Email delivery or no token. Redirecting.");
            router.push('/dashboard'); // Redirect only if not QR
        }

    } catch (err: any) {
        console.error("Error updating reminder:", err);

        // Manejo avanzado de error para mostrar mensaje personalizado del backend
        let errorMsg = "Error desconocido";
        if (err?.message) {
          errorMsg = err.message;
        }
        // Si es un error de Supabase Functions, intenta extraer el mensaje del body
        if (err?.status && err?.body) {
          try {
            const parsed = typeof err.body === "string" ? JSON.parse(err.body) : err.body;
            if (parsed?.error) {
              errorMsg = parsed.error;
            }
          } catch (e) {
            // ignore parse error
          }
        }
        toast.error(`Error al guardar cambios: ${errorMsg}`, { id: updateToast });
    } finally {
        setIsSubmitting(false);
    }
  };

  // Combined loading state check
  if (loading || capsulesLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 mr-2 animate-spin text-azul-profundo" />
        <p className="text-azul-profundo">Cargando datos...</p>
      </div>
    );
  }

  // Error state check (after loading)
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] text-red-600 p-4">
        <p className="text-center">{error}</p>
        <button onClick={() => router.push('/dashboard')} className="mt-4 text-sm underline text-blue-600 hover:text-blue-800">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  // --- QR Code Download Logic (Copied from CreateReminderPage) ---
  const downloadQRCode = () => {
    const canvas = qrRef.current?.querySelector<HTMLCanvasElement>('canvas');
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      const fileName = `vox-eternal-qr-${qrAccessToken?.substring(0, 8) || reminderId.substring(0, 8)}.png`;
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
    const qrValue = `${window.location.origin}/join/${qrAccessToken}`;

    return (
      <div className="min-h-screen bg-blanco-hueso p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl border border-gray-200 text-center max-w-md w-full">
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-azul-profundo mb-4">
            Recordatorio Actualizado (QR)
          </h1>
          <p className="text-gray-600 mb-6 text-sm">
            El recordatorio se actualizó correctamente. Comparte este código QR con el destinatario.
          </p>
          <div ref={qrRef} className="mb-6 inline-block p-2 border bg-white">
            <QRCodeCanvas
              value={qrValue}
              size={200}
              bgColor={"#ffffff"}
              fgColor={"#0D3D56"}
              level={"L"}
              includeMargin={false}
              imageSettings={undefined} // No logo for now
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
               onClick={() => router.push('/dashboard')}
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

  // Ensure reminderData is loaded before rendering form (if not showing QR)
  if (!reminderData) {
     return <div className="text-center mt-10">No se encontraron datos del recordatorio.</div>;
  }

  // --- Render Form (Default View) ---
  return (
    <div className="min-h-screen bg-blanco-hueso p-4 sm:p-6 lg:p-8">
       <button
        onClick={() => router.back()}
        className="flex items-center text-sm text-azul-profundo hover:underline mb-6"
      >
        <ArrowLeft size={16} className="mr-1" />
        Volver
      </button>
      <h1 className="text-2xl sm:text-3xl font-bold font-serif text-azul-profundo mb-6">
        Editar Recordatorio Futuro
      </h1>

      {/* Render the actual form */}
      <ReminderForm
        initialData={reminderData} // Pass fetched reminder data
        userCapsules={userCapsules}
        capsulesLoading={capsulesLoading}
        onSubmit={handleUpdateReminder} // Pass the update handler
        isEditing={true} // Set isEditing to true
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default EditReminderPage;
