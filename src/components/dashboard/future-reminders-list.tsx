'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Edit, XCircle, Send } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Future Reminder Type (Adjusted to match DB columns after migration) ---
interface FutureReminder {
  id: string;
  title: string | null; // DB column name
  recipient_name: string | null; // DB column name
  recipient_email: string | null; // DB column name
  scheduled_delivery_at: string; // DB column name (ISO string date)
  status: 'programado' | 'enviado' | 'fallido' | 'cancelado'; // DB column name (assuming enum values match)
  created_at: string; // DB column name
}

const FutureRemindersList: React.FC = () => {
  const router = useRouter();
  const [reminders, setReminders] = useState<FutureReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Fetching Logic (Direct Query) ---
  const fetchFutureReminders = useCallback(async () => {
    console.log("[FutureRemindersList] Fetching future reminders directly...");
    setLoading(true);
    setError(null);
    try {
      // Obtener sesión de usuario de forma robusta
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError("No se pudo conectar con el servicio de autenticación. Verifica tu conexión e inténtalo de nuevo.");
        setReminders([]);
        setLoading(false);
        return;
      }
      if (!session?.user) {
        router.push('/login');
        return;
      }
      const currentUserId = session.user.id;

      // Fetch directly from the table using Supabase client
      const { data: remindersData, error: fetchError } = await supabase
        .from('future_reminders') // Use the correct table name (after migration)
        .select(`
          id,
          title,
          recipient_name,
          recipient_email,
          scheduled_delivery_at,
          status,
          created_at
        `) // Select necessary fields matching the interface
        .eq('creator_user_id', currentUserId) // Filter by creator
        .eq('status', 'scheduled') // Filter by status
        .order('scheduled_delivery_at', { ascending: true }); // Order

      if (fetchError) {
        console.error("Error fetching reminders directly:", fetchError);
        // Check specifically for the "relation does not exist" error
        if (fetchError.code === '42P01') {
             throw new Error(`Error: La tabla 'future_reminders' no se encontró en la base de datos. Verifica las migraciones.`);
        }
        throw new Error(`Error al consultar recordatorios: ${fetchError.message}`);
      }

      // Data is already the array
      setReminders(remindersData || []);
      console.log("[FutureRemindersList] Future reminders fetched directly:", remindersData);

    } catch (err: any) {
      // Catch block handles errors from getUser or the direct fetch
      console.error("Error fetching future reminders directly:", err);
      setError(`Error al cargar recordatorios: ${err.message || 'Error desconocido'}`);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFutureReminders();
  }, [fetchFutureReminders]);

  // --- Action Handlers (Remain the same, still use Edge Functions for actions) ---
  const handleEditReminder = (reminderId: string) => {
    console.log(`[FutureRemindersList] Edit reminder ${reminderId}`);
    router.push(`/dashboard/reminders/edit/${reminderId}`);
  };

  const handleCancelReminder = async (reminderId: string, reminderTitle: string | null) => {
    const titleOrDefault = reminderTitle || 'Recordatorio sin título';
    console.log(`[FutureRemindersList] Cancel reminder ${reminderId}`);
    if (!window.confirm(`¿Estás seguro de que quieres cancelar el recordatorio "${titleOrDefault}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    const cancelToast = toast.loading("Cancelando recordatorio...");
    try {
      // Still use invoke for the action function
      const { error: invokeError } = await supabase.functions.invoke('cancel-future-reminder', {
        body: { reminderId: reminderId },
      });

      if (invokeError) throw invokeError;

      toast.success(`Recordatorio "${titleOrDefault}" cancelado.`, { id: cancelToast });
      // Refresh the list after cancellation by calling fetch again
      fetchFutureReminders();
    } catch (err: any) {
      console.error("Error cancelling reminder:", err);
      toast.error(`Error al cancelar: ${err.message || 'Error desconocido'}`, { id: cancelToast });
    }
  };

  // --- Render Logic ---
  if (loading) {
    return (
      <div className="flex justify-center items-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-red-600">
        <p className="text-sm">{error}</p>
        <button onClick={fetchFutureReminders} className="mt-2 text-xs underline">Reintentar</button>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <Send size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No tienes recordatorios programados.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3 overflow-y-auto max-h-[400px] pr-1">
      {reminders.map((reminder) => (
        <li key={reminder.id} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm hover:shadow-md transition-shadow duration-150">
          <div className="flex justify-between items-start mb-1">
            {/* Use DB column names */}
            <span className="text-sm font-semibold text-azul-profundo truncate pr-2" title={reminder.title ?? undefined}>
              {reminder.title || 'Recordatorio sin título'}
            </span>
            <div className="flex-shrink-0 flex items-center space-x-1">
              <button
                onClick={() => handleEditReminder(reminder.id)}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Editar Recordatorio"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => handleCancelReminder(reminder.id, reminder.title)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Cancelar Recordatorio"
              >
                <XCircle size={16} />
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-600 space-y-0.5">
             {/* Use DB column names */}
            <p>Para: <span className="font-medium">{reminder.recipient_name || reminder.recipient_email}</span></p>
            <p>Fecha: <span className="font-medium">{format(new Date(reminder.scheduled_delivery_at), 'dd MMM yyyy, HH:mm', { locale: es })}</span></p>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default FutureRemindersList;
