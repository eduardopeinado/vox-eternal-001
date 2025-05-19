import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { Database } from '../_shared/database.types.ts'

/**
 * Payload para actualizar un mensaje al futuro.
 * Ahora soporta file_ids: string[] para asociar archivos multimedia (recuerdos) al mensaje.
 */
interface UpdateReminderPayload {
  reminderId: string;
  recipient_name?: string;
  recipient_email?: string;
  scheduled_delivery_at?: string;
  title?: string;
  message?: string;
  delivery_method?: 'email' | 'qr_code';
  capsule_ids?: string[];
  recuerdo_ids?: string[];
  file_ids?: string[]; // NUEVO: Array de IDs de recuerdos a asociar como archivos multimedia
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    const payload = await req.json() as UpdateReminderPayload;
    const { reminderId, capsule_ids, recuerdo_ids, ...updateData } = payload;

    if (!reminderId) {
      return new Response(JSON.stringify({ error: 'Missing reminderId in request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validaciones básicas
    if (updateData.recipient_email && !/\S+@\S+\.\S+/.test(updateData.recipient_email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (updateData.scheduled_delivery_at) {
      try {
        const deliveryDate = new Date(updateData.scheduled_delivery_at);
        if (isNaN(deliveryDate.getTime())) throw new Error('Invalid date format');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (deliveryDate < today) {
          return new Response(JSON.stringify({ error: 'Scheduled delivery date cannot be in the past' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid scheduled_delivery_at format' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const supabaseAdmin = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Autenticación y ownership
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const currentUserId = user.id;

    const { data: existingReminder, error: fetchError } = await supabaseAdmin
      .from('future_reminders')
      .select('creator_user_id, status')
      .eq('id', reminderId)
      .single();

    if (fetchError) {
      console.error('Error fetching reminder for update:', fetchError);
      if (fetchError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Reminder not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error('Failed to fetch reminder');
    }
    if (existingReminder.creator_user_id !== currentUserId) {
      return new Response(JSON.stringify({ error: 'Forbidden: You are not the creator of this reminder' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (existingReminder.status !== 'scheduled') {
      return new Response(JSON.stringify({ error: 'El recordatorio ya fue enviado y no puede ser editado.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Actualizar tabla principal ---
    const validColumnKeys = [
      'recipient_name',
      'recipient_email',
      'scheduled_delivery_at',
      'title',
      'message',
      'delivery_method',
    ] as const;
    const filteredUpdateData: Partial<Database['public']['Tables']['future_reminders']['Update']> = {};
    for (const key of validColumnKeys) {
      if (key in updateData && updateData[key] !== undefined) {
        filteredUpdateData[key] = updateData[key];
      }
    }
    let updatedData = null;
    if (Object.keys(filteredUpdateData).length > 0) {
      const { data, error } = await supabaseAdmin
        .from('future_reminders')
        .update({ ...filteredUpdateData, updated_at: new Date().toISOString() })
        .eq('id', reminderId)
        .select('*')
        .single();
      if (error) {
        console.error('Error updating reminder:', error);
        throw new Error('Failed to update reminder record');
      }
      updatedData = data;
    } else {
      // Si no hay campos principales a actualizar, obtener el recordatorio actual
      const { data, error } = await supabaseAdmin
        .from('future_reminders')
        .select('*')
        .eq('id', reminderId)
        .single();
      if (error || !data) {
        console.error('Error re-fetching reminder after no-op update:', error);
        return new Response(JSON.stringify({ message: 'No changes applied to reminder fields.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      updatedData = data;
    }

    // --- Actualizar asociaciones de cápsulas ---
    if (Array.isArray(capsule_ids)) {
      // Borrar todas las asociaciones previas
      const { error: delError } = await supabaseAdmin
        .from('future_reminder_capsules')
        .delete()
        .eq('reminder_id', reminderId);
      if (delError) {
        console.error('Error deleting old capsule associations:', delError);
        throw new Error('Failed to update capsule associations');
      }
      // Insertar nuevas asociaciones si hay
      if (capsule_ids.length > 0) {
        const inserts = capsule_ids.map(capsule_id => ({ reminder_id: reminderId, capsule_id }));
        const { error: insError } = await supabaseAdmin
          .from('future_reminder_capsules')
          .insert(inserts);
        if (insError) {
          console.error('Error inserting new capsule associations:', insError);
          throw new Error('Failed to update capsule associations');
        }
      }
    }

    // --- Actualizar asociaciones de recuerdos ---
    if (Array.isArray(recuerdo_ids)) {
      const { error: delError } = await supabaseAdmin
        .from('future_reminder_recuerdos')
        .delete()
        .eq('reminder_id', reminderId);
      if (delError) {
        console.error('Error deleting old recuerdo associations:', delError);
        throw new Error('Failed to update recuerdo associations');
      }
      if (recuerdo_ids.length > 0) {
        const inserts = recuerdo_ids.map(recuerdo_id => ({ reminder_id: reminderId, recuerdo_id }));
        const { error: insError } = await supabaseAdmin
          .from('future_reminder_recuerdos')
          .insert(inserts);
        if (insError) {
          console.error('Error inserting new recuerdo associations:', insError);
          throw new Error('Failed to update recuerdo associations');
        }
      }
    }

    // --- Actualizar asociaciones de archivos multimedia ---
    if (Array.isArray(payload.file_ids)) {
      // Borrar todas las asociaciones previas
      const { error: delError } = await supabaseAdmin
        .from('future_reminder_files')
        .delete()
        .eq('future_reminder_id', reminderId);
      if (delError) {
        console.error('Error deleting old file associations:', delError);
        throw new Error('Failed to update file associations');
      }
      // Insertar nuevas asociaciones si hay
      if (payload.file_ids.length > 0) {
        // Validar que los recuerdos existen y pertenecen al usuario
        const { data: ownedFiles, error: filesCheckError } = await supabaseAdmin
          .from('recuerdos')
          .select('id, usuario_id')
          .in('id', payload.file_ids)
          .eq('usuario_id', currentUserId);
        if (filesCheckError) {
          console.error('Error checking file ownership:', filesCheckError);
          throw new Error('Database error during file validation');
        }
        const foundFileIds = ownedFiles?.map(f => f.id) || [];
        const allFilesValid = payload.file_ids.every(id => foundFileIds.includes(id));
        if (!allFilesValid || !ownedFiles || ownedFiles.length !== payload.file_ids.length) {
          const missingIds = payload.file_ids.filter(id => !foundFileIds.includes(id));
          console.warn(`Ownership/Existence check failed for files. User: ${currentUserId}, Provided: ${payload.file_ids}, Found: ${foundFileIds}, Missing/Invalid: ${missingIds}`);
          throw new Error('Uno o más archivos seleccionados no existen o no te pertenecen.');
        }
        const inserts = payload.file_ids.map(file_id => ({
          future_reminder_id: reminderId,
          recuerdo_id: file_id,
        }));
        const { error: insError } = await supabaseAdmin
          .from('future_reminder_files')
          .insert(inserts);
        if (insError) {
          console.error('Error inserting new file associations:', insError);
          throw new Error('Failed to update file associations');
        }
      }
    }

    // --- Respuesta final: recordatorio actualizado + confirmación de asociaciones ---
    // Garantiza que delivery_method sea del tipo correcto
    const validDeliveryMethods = ['qr_code', 'email'] as const;
    const delivery_method = validDeliveryMethods.includes(updatedData?.delivery_method as any)
      ? (updatedData?.delivery_method as 'qr_code' | 'email')
      : undefined;

    return new Response(
      JSON.stringify({
        ...updatedData,
        delivery_method,
        capsule_ids: capsule_ids ?? null,
        recuerdo_ids: recuerdo_ids ?? null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
