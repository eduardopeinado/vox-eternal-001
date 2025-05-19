'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Calendar as CalendarIcon, Mail, QrCode, Send } from 'lucide-react';
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CapsuleMemorySelector from '@/components/dashboard/capsule-memory-selector';
import type { CapsulaWithRecuerdos, RecuerdoData } from '@/app/dashboard/reminders/new/page'; // Import types from where they are defined

// Register Spanish locale if not already done globally (safe to do again)
registerLocale('es', es);

// --- Props Interface ---
interface ReminderFormProps {
  initialData?: any; // Data for editing (use a more specific type if possible)
  userCapsules: CapsulaWithRecuerdos[]; // Pass capsules from parent
  capsulesLoading: boolean; // Pass loading state from parent
  onSubmit: (formData: any) => Promise<void>; // Function to handle submission
  isEditing?: boolean; // Flag to indicate edit mode
  isSubmitting: boolean; // Pass submitting state from parent
}

const ReminderForm: React.FC<ReminderFormProps> = ({
  initialData,
  userCapsules,
  capsulesLoading,
  onSubmit,
  isEditing = false,
  isSubmitting,
}) => {
  // --- Form State ---
  // Initialize state from initialData if editing, otherwise default values
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialData?.scheduled_delivery_at ? new Date(initialData.scheduled_delivery_at) : undefined
  );
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'qr_code'>(
    initialData?.delivery_method === 'qr_code' ? 'qr_code' : 'email' // Default to email
  );
  const [recipientEmail, setRecipientEmail] = useState(initialData?.recipient_email || '');
  const [recipientName, setRecipientName] = useState(initialData?.recipient_name || '');
  const [reminderTitle, setReminderTitle] = useState(initialData?.title || '');
  const [reminderMessage, setReminderMessage] = useState(initialData?.message || '');

  // State for selection - needs careful initialization for editing
  const [selectedCapsuleIds, setSelectedCapsuleIds] = useState<Set<string>>(new Set());
  const [selectedRecuerdoIds, setSelectedRecuerdoIds] = useState<Set<string>>(new Set());

  // --- Initialize Selections for Editing ---
  useEffect(() => {
    if (isEditing && initialData?.future_reminder_recuerdos) {
        const initialRecuerdoIds = new Set<string>(initialData.future_reminder_recuerdos.map((r: any) => r.recuerdo_id));
        setSelectedRecuerdoIds(initialRecuerdoIds);

        // Determine selected capsules based on selected recuerdos
        const initialCapsuleIds = new Set<string>();
        userCapsules.forEach(capsule => {
            capsule.recuerdos.forEach(recuerdo => {
                if (initialRecuerdoIds.has(recuerdo.id)) {
                    initialCapsuleIds.add(capsule.id);
                }
            });
        });
        setSelectedCapsuleIds(initialCapsuleIds);
        console.log("Initialized selections for editing:", initialCapsuleIds, initialRecuerdoIds);
    }
     // Add dependency on userCapsules to re-run if they load after initialData
  }, [isEditing, initialData, userCapsules]);


  // Handler for the selector component
  const handleSelectionChange = useCallback((newSelectedCapsuleIds: Set<string>, newSelectedRecuerdoIds: Set<string>) => {
    setSelectedCapsuleIds(newSelectedCapsuleIds);
    setSelectedRecuerdoIds(newSelectedRecuerdoIds);
  }, []);

  // --- Form Submission Handler ---
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    // --- Validation ---
    if (!selectedDate) {
      toast.error("Por favor, selecciona una fecha y hora de envío.");
      return;
    }
    // Allow past date only if editing (maybe? Decide requirement) - For now, enforce future date always
    if (selectedDate <= new Date() && !isEditing) { // Allow same date if editing? Let's enforce future for now.
       toast.error("La fecha de envío debe ser en el futuro.");
       return;
    }
     if (isEditing && selectedDate <= new Date()) {
         // Maybe allow editing to keep a past date if it was already past?
         // For now, let's prevent saving if the *edited* date is in the past.
         // Consider if a reminder delivery failed and user wants to reschedule *to the future*.
         const originalDate = initialData?.scheduled_delivery_at ? new Date(initialData.scheduled_delivery_at) : null;
         if (!originalDate || selectedDate.getTime() !== originalDate.getTime()) { // If date changed and is past
             toast.error("La nueva fecha de envío debe ser en el futuro.");
             return;
         }
     }
    if (deliveryMethod === 'email' && !recipientEmail) {
      toast.error("Por favor, ingresa el email del destinatario.");
      return;
    }
    if (selectedRecuerdoIds.size === 0) {
      toast.error("Debes seleccionar al menos un recuerdo para incluir en el recordatorio.");
      return;
    }
    if (deliveryMethod === 'email' && !/\S+@\S+\.\S+/.test(recipientEmail)) {
       toast.error("Por favor, ingresa un email válido.");
       return;
    }

    // --- Prepare Payload ---
    const formData = {
      // Include reminderId only if editing
      ...(isEditing && { reminderId: initialData?.id }),
      recipient_email: deliveryMethod === 'email' ? recipientEmail : undefined,
      recipient_name: recipientName || undefined,
      delivery_method: deliveryMethod,
      scheduled_delivery_at: selectedDate.toISOString(),
      title: reminderTitle || undefined,
      message: reminderMessage || undefined,
      // Send only the capsule IDs that actually contain selected recuerdos
      capsule_ids: Array.from(selectedCapsuleIds), // Might need adjustment based on update function needs
      recuerdo_ids: Array.from(selectedRecuerdoIds),
      file_ids: Array.from(selectedRecuerdoIds), // NUEVO: asociar los mismos recuerdos como archivos multimedia
    };

    // Call the onSubmit prop passed from the parent page
    onSubmit(formData);
  };

  // --- Render Logic ---
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Capsule/Recuerdo Selection & Other Fields */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              {isEditing ? '2.' : ''} Selecciona Cápsulas y Recuerdos*
            </label>
            <CapsuleMemorySelector
              capsules={userCapsules}
              selectedCapsuleIds={selectedCapsuleIds}
              selectedRecuerdoIds={selectedRecuerdoIds}
              onSelectionChange={handleSelectionChange}
              isLoading={capsulesLoading}
            />
            {selectedRecuerdoIds.size > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                {selectedRecuerdoIds.size} recuerdo(s) seleccionado(s) en {selectedCapsuleIds.size} cápsula(s).
              </p>
            )}
          </div>

          {/* Delivery Method */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              {isEditing ? '3.' : ''} Método de Entrega
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setDeliveryMethod('email')}
                className={`flex items-center px-4 py-2 rounded-md border text-sm ${deliveryMethod === 'email' ? 'bg-teal-100 border-teal-400 text-teal-800 font-medium' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <Mail size={16} className="mr-2" /> Email
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMethod('qr_code')}
                className={`flex items-center px-4 py-2 rounded-md border text-sm ${deliveryMethod === 'qr_code' ? 'bg-teal-100 border-teal-400 text-teal-800 font-medium' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <QrCode size={16} className="mr-2" /> Código QR
              </button>
            </div>
          </div>

          {/* Recipient Details (Conditional) */}
          {deliveryMethod === 'email' && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border">
              <h3 className="text-md font-semibold text-gray-700 mb-1">{isEditing ? '4.' : ''} Destinatario (Email)</h3>
              <div>
                <label htmlFor="recipient-email" className="block text-sm font-medium text-gray-700">
                  Email del Destinatario*
                </label>
                <input
                  type="email"
                  id="recipient-email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  placeholder="ejemplo@dominio.com"
                />
              </div>
              <div>
                <label htmlFor="recipient-name" className="block text-sm font-medium text-gray-700">
                  Nombre del Destinatario (Opcional)
                </label>
                <input
                  type="text"
                  id="recipient-name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  placeholder="Juan Pérez"
                />
              </div>
            </div>
          )}
          {deliveryMethod === 'qr_code' && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-md font-semibold text-gray-700 mb-1">{isEditing ? '4.' : ''} Destinatario (QR)</h3>
              <p className="text-sm text-gray-700">
                {isEditing
                  ? "Si cambias a QR, se generará un nuevo código al guardar. El destinatario necesitará el nuevo QR."
                  : "Se generará un Código QR único después de crear el recordatorio. Podrás compartirlo directamente con el destinatario."
                }
              </p>
            </div>
          )}

          {/* Message */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg border">
            <h3 className="text-md font-semibold text-gray-700 mb-1">{isEditing ? '5.' : ''} Mensaje Adicional</h3>
            <div>
              <label htmlFor="reminder-title" className="block text-sm font-medium text-gray-700">
                Título del Recordatorio (Opcional)
              </label>
              <input
                type="text"
                id="reminder-title"
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                maxLength={100}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                placeholder="Un mensaje para tu yo futuro"
              />
            </div>
            <div>
              <label htmlFor="reminder-message" className="block text-sm font-medium text-gray-700">
                Mensaje Personalizado (Opcional)
              </label>
              <textarea
                id="reminder-message"
                rows={4}
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                placeholder="Escribe aquí tu mensaje..."
              />
            </div>
          </div>
        </div>

        {/* Right Column: Date/Time Picker */}
        <div className="lg:col-span-1 space-y-6">
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              {isEditing ? '1.' : ''} Fecha y Hora de Envío*
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => setSelectedDate(date || undefined)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="Pp"
              locale="es"
              minDate={new Date()} // Keep minDate for consistency, validation handles edit logic
              placeholderText="Seleccionar fecha y hora"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
              wrapperClassName="w-full"
              inline
            />
            <p className="text-xs text-gray-600 mt-2">La hora seleccionada está en tu zona horaria local. Se convertirá a UTC para la programación.</p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-6 border-t mt-8">
        <button
          type="submit"
          disabled={isSubmitting || capsulesLoading || selectedRecuerdoIds.size === 0}
          className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-azul-profundo hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-profundo disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> {isEditing ? 'Guardando Cambios...' : 'Programando...'}
            </>
          ) : (
            <>
              <Send size={18} className="mr-2" /> {isEditing ? 'Guardar Cambios' : `Programar Recordatorio (${selectedRecuerdoIds.size} ${selectedRecuerdoIds.size === 1 ? 'recuerdo' : 'recuerdos'})`}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ReminderForm;
